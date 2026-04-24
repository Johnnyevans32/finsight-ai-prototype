from django.contrib import admin
from django.contrib.auth.admin import UserAdmin as BaseUserAdmin

from .models import (
    Budget,
    BudgetCategory,
    Category,
    FinancialAccount,
    SavingsGoal,
    Transaction,
    User,
)


@admin.register(User)
class UserAdmin(BaseUserAdmin):
    """Custom User admin that works with email-based login."""

    fieldsets = BaseUserAdmin.fieldsets + (
        ("Profile", {"fields": ("full_name", "locale")}),
    )
    list_display = ("email", "full_name", "is_staff", "is_active", "date_joined")
    search_fields = ("email", "full_name")
    ordering = ("email",)


@admin.register(Category)
class CategoryAdmin(admin.ModelAdmin):
    list_display = ("name", "kind", "is_system", "user")
    list_filter = ("kind", "is_system")
    search_fields = ("name",)


@admin.register(FinancialAccount)
class FinancialAccountAdmin(admin.ModelAdmin):
    list_display = (
        "institution_name",
        "account_type",
        "currency",
        "balance_current_minor",
        "user",
        "created_at",
    )
    list_filter = ("account_type", "currency")
    search_fields = ("institution_name", "user__email")
    readonly_fields = ("created_at", "updated_at")


@admin.register(Transaction)
class TransactionAdmin(admin.ModelAdmin):
    list_display = (
        "merchant_name",
        "amount_minor",
        "currency",
        "status",
        "booked_at",
        "user",
        "account",
        "category",
    )
    list_filter = ("status", "currency", "category__kind")
    search_fields = ("merchant_name", "description", "user__email")
    readonly_fields = ("created_at", "updated_at")
    date_hierarchy = "booked_at"


class BudgetCategoryInline(admin.TabularInline):
    model = BudgetCategory
    extra = 1


@admin.register(Budget)
class BudgetAdmin(admin.ModelAdmin):
    list_display = ("user", "period_start", "period_end", "currency", "total_limit_minor")
    list_filter = ("currency",)
    search_fields = ("user__email",)
    readonly_fields = ("created_at", "updated_at")
    inlines = [BudgetCategoryInline]


@admin.register(SavingsGoal)
class SavingsGoalAdmin(admin.ModelAdmin):
    list_display = ("name", "user", "target_minor", "current_minor", "currency", "status", "due_date")
    list_filter = ("status", "currency")
    search_fields = ("name", "user__email")
    readonly_fields = ("created_at", "updated_at")
