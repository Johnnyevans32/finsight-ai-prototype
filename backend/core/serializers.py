from django.contrib.auth import get_user_model
from rest_framework import serializers

from .models import (
    Budget,
    BudgetCategory,
    Category,
    FinancialAccount,
    SavingsGoal,
    Transaction,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# User
# ---------------------------------------------------------------------------

class UserSerializer(serializers.ModelSerializer):
    class Meta:
        model = User
        fields = ("id", "email", "full_name", "locale", "date_joined")
        read_only_fields = ("id", "date_joined")


class RegisterSerializer(serializers.ModelSerializer):
    """Used for the /auth/register/ endpoint."""

    password = serializers.CharField(write_only=True, min_length=8)

    class Meta:
        model = User
        fields = ("email", "full_name", "locale", "password")

    def create(self, validated_data):
        password = validated_data.pop("password")
        user = User(**validated_data)
        user.set_password(password)
        user.save()
        return user


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

class CategorySerializer(serializers.ModelSerializer):
    class Meta:
        model = Category
        fields = ("id", "name", "kind", "is_system")
        read_only_fields = ("id", "is_system")

    def create(self, validated_data):
        # Automatically assign the logged-in user as the category owner
        request = self.context.get("request")
        validated_data["user"] = request.user if request else None
        validated_data["is_system"] = False
        return super().create(validated_data)


# ---------------------------------------------------------------------------
# Financial Account
# ---------------------------------------------------------------------------

class FinancialAccountSerializer(serializers.ModelSerializer):
    class Meta:
        model = FinancialAccount
        fields = (
            "id",
            "institution_name",
            "account_type",
            "currency",
            "balance_current_minor",
            "balance_available_minor",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at")


# ---------------------------------------------------------------------------
# Transaction
# ---------------------------------------------------------------------------

class TransactionSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)
    account_name = serializers.CharField(source="account.institution_name", read_only=True)

    class Meta:
        model = Transaction
        fields = (
            "id",
            "account",
            "account_name",
            "category",
            "category_name",
            "merchant_name",
            "description",
            "amount_minor",
            "currency",
            "status",
            "booked_at",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "category_name", "account_name")

    def validate_account(self, account):
        """Ensure the account belongs to the requesting user."""
        request = self.context.get("request")
        if request and account.user != request.user:
            raise serializers.ValidationError("You do not own this account.")
        return account


# ---------------------------------------------------------------------------
# Budget
# ---------------------------------------------------------------------------

class BudgetCategorySerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source="category.name", read_only=True)

    class Meta:
        model = BudgetCategory
        fields = ("id", "category", "category_name", "limit_minor")
        read_only_fields = ("id", "category_name")


class BudgetSerializer(serializers.ModelSerializer):
    budget_categories = BudgetCategorySerializer(
        source="budgetcategory_set", many=True, read_only=True
    )

    class Meta:
        model = Budget
        fields = (
            "id",
            "period_start",
            "period_end",
            "currency",
            "total_limit_minor",
            "budget_categories",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "created_at", "updated_at", "budget_categories")


# ---------------------------------------------------------------------------
# Savings Goal
# ---------------------------------------------------------------------------

class SavingsGoalSerializer(serializers.ModelSerializer):
    progress_percent = serializers.SerializerMethodField()

    class Meta:
        model = SavingsGoal
        fields = (
            "id",
            "name",
            "target_minor",
            "current_minor",
            "currency",
            "due_date",
            "status",
            "progress_percent",
            "created_at",
            "updated_at",
        )
        read_only_fields = ("id", "progress_percent", "created_at", "updated_at")

    def get_progress_percent(self, obj):
        if obj.target_minor == 0:
            return 0
        return round((obj.current_minor / obj.target_minor) * 100, 2)
