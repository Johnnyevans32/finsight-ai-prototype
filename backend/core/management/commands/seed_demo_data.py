from django.core.management.base import BaseCommand
from django.contrib.auth import get_user_model
from core.models import FinancialAccount, Transaction, Category
from datetime import datetime, timedelta
from django.utils import timezone
import random

User = get_user_model()


class Command(BaseCommand):
    help = 'Seed demo financial data for testing'

    def add_arguments(self, parser):
        parser.add_argument(
            '--email',
            type=str,
            default='testcat@example.com',
            help='Email of the user to add demo data for'
        )

    def handle(self, *args, **options):
        email = options['email']

        try:
            user = User.objects.get(email=email)
        except User.DoesNotExist:
            self.stdout.write(self.style.ERROR(f'User with email {email} does not exist'))
            return

        # Create a demo financial account if it doesn't exist
        account, created = FinancialAccount.objects.get_or_create(
            user=user,
            institution_name='Demo Bank',
            defaults={
                'account_type': 'checking',
                'currency': 'NGN',
                'balance_current_minor': 150000000,  # ₦1,500,000
                'balance_available_minor': 150000000,
            }
        )

        if created:
            self.stdout.write(self.style.SUCCESS(f'Created demo account for {email}'))

        # Sample Nigerian transactions
        demo_transactions = [
            # Food & Dining
            ('Chicken Republic', 'Chicken and chips', -350000, 'expense'),
            ('Sweet Sensation', 'Lunch meal', -250000, 'expense'),
            ('Dominos Pizza', 'Pizza delivery', -800000, 'expense'),
            ('Coldstone Creamery', 'Ice cream', -300000, 'expense'),
            ('Bukka Hut', 'Nigerian food', -450000, 'expense'),

            # Transportation
            ('Uber', 'Ride to Victoria Island', -250000, 'expense'),
            ('Bolt', 'Trip to Lekki', -180000, 'expense'),
            ('Total Filling Station', 'Fuel purchase', -1000000, 'expense'),

            # Shopping
            ('Shoprite', 'Grocery shopping', -2500000, 'expense'),
            ('Jumia', 'Online shopping', -1500000, 'expense'),
            ('Game Stores', 'Electronics', -5000000, 'expense'),

            # Utilities
            ('IKEDC', 'Electricity bill payment', -1500000, 'expense'),
            ('MTN', 'Data subscription', -500000, 'expense'),
            ('DSTV', 'Cable TV subscription', -900000, 'expense'),
            ('Lagos Water Corporation', 'Water bill', -300000, 'expense'),

            # Entertainment
            ('Genesis Cinemas', 'Movie tickets', -600000, 'expense'),
            ('Filmhouse IMAX', 'Movie night', -700000, 'expense'),

            # Healthcare
            ('MedPlus Pharmacy', 'Medicine purchase', -850000, 'expense'),
            ('St. Nicholas Hospital', 'Medical consultation', -2000000, 'expense'),

            # Income
            ('ABC Company Ltd', 'Salary payment', 25000000, 'income'),
            ('Freelance Client', 'Project payment', 5000000, 'income'),

            # Uncategorized
            ('POS Transaction', 'Cash withdrawal', -1000000, 'expense'),
            ('Bank Transfer', 'Transfer to John', -500000, 'expense'),
            ('ATM Withdrawal', 'Cash withdrawal', -2000000, 'expense'),
        ]

        # Create transactions
        created_count = 0
        now = timezone.now()

        for merchant, description, amount, status in demo_transactions:
            # Check if similar transaction exists
            exists = Transaction.objects.filter(
                user=user,
                merchant_name=merchant,
                amount_minor=amount
            ).exists()

            if not exists:
                # Random date within last 30 days
                days_ago = random.randint(1, 30)
                transaction_date = now - timedelta(days=days_ago)

                Transaction.objects.create(
                    user=user,
                    account=account,
                    merchant_name=merchant,
                    description=description,
                    amount_minor=amount,
                    currency='NGN',
                    status=status,
                    booked_at=transaction_date,
                )
                created_count += 1

        self.stdout.write(
            self.style.SUCCESS(
                f'Created {created_count} demo transactions for {email}'
            )
        )

        # Display summary
        total_transactions = Transaction.objects.filter(user=user).count()
        uncategorized = Transaction.objects.filter(
            user=user,
            category__isnull=True
        ).count()

        self.stdout.write(f'\nSummary for {email}:')
        self.stdout.write(f'  Total transactions: {total_transactions}')
        self.stdout.write(f'  Uncategorized: {uncategorized}')
        self.stdout.write('\nYou can now test the categorization features!')