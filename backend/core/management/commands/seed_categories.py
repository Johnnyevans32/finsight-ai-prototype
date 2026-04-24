"""
Management command: python manage.py seed_categories

Populates the database with a standard set of system-wide transaction
categories so that new users have a useful starting point.
"""

from django.core.management.base import BaseCommand

from core.models import Category, CategoryKind


SYSTEM_CATEGORIES = [
    # --- Income ---
    ("Salary", CategoryKind.INCOME),
    ("Freelance", CategoryKind.INCOME),
    ("Investment Returns", CategoryKind.INCOME),
    ("Other Income", CategoryKind.INCOME),
    # --- Expense ---
    ("Food & Dining", CategoryKind.EXPENSE),
    ("Groceries", CategoryKind.EXPENSE),
    ("Transport", CategoryKind.EXPENSE),
    ("Utilities", CategoryKind.EXPENSE),
    ("Rent / Mortgage", CategoryKind.EXPENSE),
    ("Healthcare", CategoryKind.EXPENSE),
    ("Entertainment", CategoryKind.EXPENSE),
    ("Shopping", CategoryKind.EXPENSE),
    ("Education", CategoryKind.EXPENSE),
    ("Travel", CategoryKind.EXPENSE),
    ("Subscriptions", CategoryKind.EXPENSE),
    ("Other Expense", CategoryKind.EXPENSE),
    # --- Transfer ---
    ("Transfer", CategoryKind.TRANSFER),
]


class Command(BaseCommand):
    help = "Seed the database with system-wide transaction categories."

    def handle(self, *args, **options):
        created = 0
        for name, kind in SYSTEM_CATEGORIES:
            _, was_created = Category.objects.get_or_create(
                name=name,
                user=None,
                defaults={"kind": kind, "is_system": True},
            )
            if was_created:
                created += 1

        self.stdout.write(
            self.style.SUCCESS(
                f"Done. {created} new system categories created "
                f"({len(SYSTEM_CATEGORIES) - created} already existed)."
            )
        )
