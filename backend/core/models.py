import uuid

from django.conf import settings
from django.contrib.auth.models import AbstractUser
from django.db import models


class User(AbstractUser):
    """Custom user model with UUID primary key and email-based auth."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    full_name = models.CharField(max_length=200)
    email = models.EmailField(unique=True)
    locale = models.CharField(max_length=16, default="en-NG")

    # Use email as the login identifier instead of username
    USERNAME_FIELD = "email"
    REQUIRED_FIELDS = []  # username is no longer required

    def __str__(self):
        return self.email


class TimestampedModel(models.Model):
    """Abstract base that adds created_at / updated_at to every child model."""

    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

class CategoryKind(models.TextChoices):
    INCOME = "income", "Income"
    EXPENSE = "expense", "Expense"
    TRANSFER = "transfer", "Transfer"


class Category(models.Model):
    """
    A transaction category.

    System categories (is_system=True) have user=None and are available to all
    users.  User-defined categories are scoped to a single user.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        null=True,
        blank=True,
        related_name="categories",
    )
    name = models.CharField(max_length=100)
    kind = models.CharField(max_length=16, choices=CategoryKind.choices)
    is_system = models.BooleanField(default=False)

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["user", "name"], name="uniq_user_category_name"
            ),
        ]

    def __str__(self):
        return f"{self.name} ({self.kind})"


# ---------------------------------------------------------------------------
# Financial Account
# ---------------------------------------------------------------------------

class FinancialAccount(TimestampedModel):
    """
    A bank / wallet account linked to a user.

    Balances are stored in minor units (kobo / cents) as BigIntegers to avoid
    floating-point rounding errors.
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="financial_accounts",
    )
    institution_name = models.CharField(max_length=200)
    account_type = models.CharField(max_length=32)  # e.g. "checking", "savings"
    currency = models.CharField(max_length=3)        # ISO 4217 e.g. "NGN"
    balance_current_minor = models.BigIntegerField(default=0)
    balance_available_minor = models.BigIntegerField(null=True, blank=True)

    def __str__(self):
        return f"{self.institution_name} – {self.user.email}"


# ---------------------------------------------------------------------------
# Transaction
# ---------------------------------------------------------------------------

class TransactionStatus(models.TextChoices):
    PENDING = "pending", "Pending"
    COMPLETED = "completed", "Completed"
    REVERSED = "reversed", "Reversed"


class Transaction(TimestampedModel):
    """
    A financial transaction posted to an account.

    amount_minor stores the signed value in minor units (negative = debit).
    """

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="transactions",
    )
    account = models.ForeignKey(
        FinancialAccount, on_delete=models.CASCADE, related_name="transactions"
    )
    category = models.ForeignKey(
        Category,
        on_delete=models.SET_NULL,
        null=True,
        blank=True,
        related_name="transactions",
    )
    merchant_name = models.CharField(max_length=200)
    description = models.TextField(blank=True)
    amount_minor = models.BigIntegerField()  # signed; negative = debit
    currency = models.CharField(max_length=3)
    status = models.CharField(
        max_length=16,
        choices=TransactionStatus.choices,
        default=TransactionStatus.COMPLETED,
    )
    booked_at = models.DateTimeField()

    class Meta:
        indexes = [
            models.Index(fields=["user", "-booked_at"]),
            models.Index(fields=["user", "category", "booked_at"]),
            models.Index(fields=["account", "booked_at"]),
        ]

    def __str__(self):
        return f"{self.merchant_name} {self.amount_minor} {self.currency}"


# ---------------------------------------------------------------------------
# Budget & BudgetCategory
# ---------------------------------------------------------------------------

class Budget(TimestampedModel):
    """A spending budget for a given time period."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="budgets",
    )
    period_start = models.DateField()
    period_end = models.DateField()
    currency = models.CharField(max_length=3)
    total_limit_minor = models.BigIntegerField(null=True, blank=True)
    categories = models.ManyToManyField(
        Category, through="BudgetCategory", related_name="budgets"
    )

    def __str__(self):
        return f"Budget {self.period_start} – {self.period_end} ({self.user.email})"


class BudgetCategory(models.Model):
    """Through-table that adds a per-category spending limit to a budget."""

    budget = models.ForeignKey(Budget, on_delete=models.CASCADE)
    category = models.ForeignKey(Category, on_delete=models.CASCADE)
    limit_minor = models.BigIntegerField()

    class Meta:
        constraints = [
            models.UniqueConstraint(
                fields=["budget", "category"], name="uniq_budget_category"
            ),
        ]

    def __str__(self):
        return f"{self.budget} / {self.category}"


# ---------------------------------------------------------------------------
# Savings Goal
# ---------------------------------------------------------------------------

class SavingsGoalStatus(models.TextChoices):
    ACTIVE = "active", "Active"
    COMPLETED = "completed", "Completed"
    PAUSED = "paused", "Paused"


class SavingsGoal(TimestampedModel):
    """A user's savings target (e.g. emergency fund, holiday)."""

    id = models.UUIDField(primary_key=True, default=uuid.uuid4, editable=False)
    user = models.ForeignKey(
        settings.AUTH_USER_MODEL,
        on_delete=models.CASCADE,
        related_name="savings_goals",
    )
    name = models.CharField(max_length=120)
    target_minor = models.BigIntegerField()
    current_minor = models.BigIntegerField(default=0)
    currency = models.CharField(max_length=3)
    due_date = models.DateField(null=True, blank=True)
    status = models.CharField(
        max_length=16,
        choices=SavingsGoalStatus.choices,
        default=SavingsGoalStatus.ACTIVE,
    )

    def __str__(self):
        return f"{self.name} ({self.user.email})"
