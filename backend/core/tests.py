from django.test import TestCase, Client
from django.contrib.auth import get_user_model
from django.urls import reverse
from rest_framework.test import APITestCase, APIClient
from rest_framework import status
from datetime import datetime, timezone
from decimal import Decimal
from .models import (
    FinancialAccount,
    Transaction,
    Category,
    Budget,
    SavingsGoal,
    BudgetCategory
)
from .serializers import (
    UserSerializer,
    FinancialAccountSerializer,
    TransactionSerializer,
    CategorySerializer
)

User = get_user_model()


class UserModelTestCase(TestCase):
    """Test User model"""

    def setUp(self):
        self.user_data = {
            'email': 'test@example.com',
            'full_name': 'Test User',
            'password': 'testpass123'
        }

    def test_create_user(self):
        """Test creating a new user with email"""
        user = User.objects.create_user(**self.user_data)

        self.assertEqual(user.email, self.user_data['email'])
        self.assertEqual(user.full_name, self.user_data['full_name'])
        self.assertTrue(user.check_password(self.user_data['password']))
        self.assertFalse(user.is_staff)
        self.assertTrue(user.is_active)

    def test_create_superuser(self):
        """Test creating a new superuser"""
        admin_user = User.objects.create_superuser(
            email='admin@example.com',
            full_name='Admin User',
            password='adminpass123'
        )

        self.assertTrue(admin_user.is_superuser)
        self.assertTrue(admin_user.is_staff)

    def test_user_str_method(self):
        """Test the user string representation"""
        user = User.objects.create_user(**self.user_data)
        self.assertEqual(str(user), self.user_data['email'])


class CategoryModelTestCase(TestCase):
    """Test Category model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            full_name='Test User',
            password='testpass123'
        )

    def test_create_category(self):
        """Test creating a category"""
        category = Category.objects.create(
            user=self.user,
            name='Food & Dining',
            kind='expense'
        )

        self.assertEqual(category.name, 'Food & Dining')
        self.assertEqual(category.kind, 'expense')
        self.assertFalse(category.is_system)

    def test_create_system_category(self):
        """Test creating a system-wide category"""
        category = Category.objects.create(
            name='Salary',
            kind='income',
            is_system=True
        )

        self.assertIsNone(category.user)
        self.assertTrue(category.is_system)


class FinancialAccountModelTestCase(TestCase):
    """Test FinancialAccount model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            full_name='Test User',
            password='testpass123'
        )

    def test_create_financial_account(self):
        """Test creating a financial account"""
        account = FinancialAccount.objects.create(
            user=self.user,
            institution_name='Test Bank',
            account_type='savings',
            currency='NGN',
            balance_current_minor=100000,
            balance_available_minor=95000,
            mono_account_id='test_account_123'
        )

        self.assertEqual(account.institution_name, 'Test Bank')
        self.assertEqual(account.balance_current_minor, 100000)
        self.assertEqual(account.account_type, 'savings')


class TransactionModelTestCase(TestCase):
    """Test Transaction model"""

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            full_name='Test User',
            password='testpass123'
        )
        self.account = FinancialAccount.objects.create(
            user=self.user,
            institution_name='Test Bank',
            account_type='savings',
            currency='NGN',
            balance_current_minor=100000
        )
        self.category = Category.objects.create(
            user=self.user,
            name='Groceries',
            kind='expense'
        )

    def test_create_transaction(self):
        """Test creating a transaction"""
        transaction = Transaction.objects.create(
            user=self.user,
            account=self.account,
            category=self.category,
            merchant_name='Shoprite',
            description='Monthly groceries',
            amount_minor=-15000,
            currency='NGN',
            status='completed',
            booked_at=datetime.now(timezone.utc)
        )

        self.assertEqual(transaction.merchant_name, 'Shoprite')
        self.assertEqual(transaction.amount_minor, -15000)
        self.assertEqual(transaction.status, 'completed')


class AuthenticationAPITestCase(APITestCase):
    """Test authentication endpoints"""

    def setUp(self):
        self.client = APIClient()

    def test_user_registration(self):
        """Test user registration endpoint"""
        url = reverse('register')
        data = {
            'email': 'newuser@example.com',
            'full_name': 'New User',
            'password': 'newpass123',
            'password_confirm': 'newpass123'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertTrue(User.objects.filter(email='newuser@example.com').exists())

    def test_user_login(self):
        """Test user login endpoint"""
        # Create user first
        user = User.objects.create_user(
            email='test@example.com',
            full_name='Test User',
            password='testpass123'
        )

        url = reverse('login')
        data = {
            'email': 'test@example.com',
            'password': 'testpass123'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertIn('id', response.data)
        self.assertEqual(response.data['email'], 'test@example.com')

    def test_invalid_login(self):
        """Test login with invalid credentials"""
        url = reverse('login')
        data = {
            'email': 'wrong@example.com',
            'password': 'wrongpass'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_401_UNAUTHORIZED)

    def test_logout(self):
        """Test user logout"""
        # Create and login user
        user = User.objects.create_user(
            email='test@example.com',
            full_name='Test User',
            password='testpass123'
        )
        self.client.force_authenticate(user=user)

        url = reverse('logout')
        response = self.client.post(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)


class TransactionAPITestCase(APITestCase):
    """Test transaction endpoints"""

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            full_name='Test User',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.account = FinancialAccount.objects.create(
            user=self.user,
            institution_name='Test Bank',
            account_type='savings',
            currency='NGN',
            balance_current_minor=100000
        )

        self.category = Category.objects.create(
            user=self.user,
            name='Food',
            kind='expense'
        )

    def test_create_transaction(self):
        """Test creating a transaction via API"""
        url = reverse('transaction-list')
        data = {
            'account': str(self.account.id),
            'category': str(self.category.id),
            'merchant_name': 'Restaurant',
            'description': 'Lunch',
            'amount_minor': -2500,
            'currency': 'NGN',
            'booked_at': datetime.now(timezone.utc).isoformat()
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Transaction.objects.count(), 1)

    def test_list_transactions(self):
        """Test listing user transactions"""
        # Create some transactions
        Transaction.objects.create(
            user=self.user,
            account=self.account,
            category=self.category,
            merchant_name='Store 1',
            amount_minor=-1000,
            currency='NGN',
            booked_at=datetime.now(timezone.utc)
        )
        Transaction.objects.create(
            user=self.user,
            account=self.account,
            category=self.category,
            merchant_name='Store 2',
            amount_minor=-2000,
            currency='NGN',
            booked_at=datetime.now(timezone.utc)
        )

        url = reverse('transaction-list')
        response = self.client.get(url)

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 2)

    def test_transaction_filtering(self):
        """Test filtering transactions by account"""
        # Create another account
        other_account = FinancialAccount.objects.create(
            user=self.user,
            institution_name='Other Bank',
            account_type='current',
            currency='NGN',
            balance_current_minor=50000
        )

        # Create transactions for both accounts
        Transaction.objects.create(
            user=self.user,
            account=self.account,
            merchant_name='Store 1',
            amount_minor=-1000,
            currency='NGN',
            booked_at=datetime.now(timezone.utc)
        )
        Transaction.objects.create(
            user=self.user,
            account=other_account,
            merchant_name='Store 2',
            amount_minor=-2000,
            currency='NGN',
            booked_at=datetime.now(timezone.utc)
        )

        url = reverse('transaction-list')
        response = self.client.get(url, {'account': str(self.account.id)})

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        self.assertEqual(len(response.data['results']), 1)
        self.assertEqual(response.data['results'][0]['merchant_name'], 'Store 1')


class BudgetAPITestCase(APITestCase):
    """Test budget endpoints"""

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            full_name='Test User',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

        self.category = Category.objects.create(
            user=self.user,
            name='Entertainment',
            kind='expense'
        )

    def test_create_budget(self):
        """Test creating a budget"""
        url = reverse('budget-list')
        data = {
            'period_start': '2026-01-01',
            'period_end': '2026-01-31',
            'currency': 'NGN',
            'total_limit_minor': 100000,
            'categories': [
                {
                    'category': str(self.category.id),
                    'limit_minor': 20000
                }
            ]
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(Budget.objects.count(), 1)
        self.assertEqual(BudgetCategory.objects.count(), 1)


class SavingsGoalAPITestCase(APITestCase):
    """Test savings goal endpoints"""

    def setUp(self):
        self.user = User.objects.create_user(
            email='test@example.com',
            full_name='Test User',
            password='testpass123'
        )
        self.client = APIClient()
        self.client.force_authenticate(user=self.user)

    def test_create_savings_goal(self):
        """Test creating a savings goal"""
        url = reverse('savingsgoal-list')
        data = {
            'name': 'Emergency Fund',
            'target_minor': 500000,
            'current_minor': 50000,
            'currency': 'NGN',
            'due_date': '2026-12-31',
            'status': 'active'
        }

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_201_CREATED)
        self.assertEqual(SavingsGoal.objects.count(), 1)

    def test_deposit_to_savings_goal(self):
        """Test depositing to a savings goal"""
        goal = SavingsGoal.objects.create(
            user=self.user,
            name='Vacation Fund',
            target_minor=200000,
            current_minor=50000,
            currency='NGN'
        )

        url = reverse('savingsgoal-deposit', kwargs={'pk': goal.id})
        data = {'amount_minor': 25000}

        response = self.client.post(url, data, format='json')

        self.assertEqual(response.status_code, status.HTTP_200_OK)
        goal.refresh_from_db()
        self.assertEqual(goal.current_minor, 75000)