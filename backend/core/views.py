from django.contrib.auth import authenticate, get_user_model, login, logout
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

from .models import Budget, Category, FinancialAccount, SavingsGoal, Transaction
from .serializers import (
    BudgetSerializer,
    CategorySerializer,
    FinancialAccountSerializer,
    RegisterSerializer,
    SavingsGoalSerializer,
    TransactionSerializer,
    UserSerializer,
)

User = get_user_model()


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    """POST /api/auth/register/ — create a new account."""

    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(APIView):
    """POST /api/auth/login/ — session-based login."""

    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response(
                {"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED
            )
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    """POST /api/auth/logout/ — destroy the session."""

    def post(self, request):
        logout(request)
        return Response({"detail": "Logged out."})


class MeView(generics.RetrieveUpdateAPIView):
    """GET / PATCH /api/auth/me/ — view or update the current user's profile."""

    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

class CategoryViewSet(viewsets.ModelViewSet):
    """
    /api/categories/
    Returns both system categories and the requesting user's own categories.
    """

    serializer_class = CategorySerializer

    def get_queryset(self):
        # System categories (user=null) + the current user's own categories
        return Category.objects.filter(
            user=self.request.user
        ) | Category.objects.filter(is_system=True)


# ---------------------------------------------------------------------------
# Financial Account
# ---------------------------------------------------------------------------

class FinancialAccountViewSet(viewsets.ModelViewSet):
    """CRUD for /api/accounts/ — scoped to the logged-in user."""

    serializer_class = FinancialAccountSerializer

    def get_queryset(self):
        return FinancialAccount.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ---------------------------------------------------------------------------
# Transaction
# ---------------------------------------------------------------------------

class TransactionViewSet(viewsets.ModelViewSet):
    """
    CRUD for /api/transactions/ — scoped to the logged-in user.
    Supports ?account=<id>&category=<id>&status=<value> query filters.
    """

    serializer_class = TransactionSerializer

    def get_queryset(self):
        qs = Transaction.objects.filter(user=self.request.user).select_related(
            "account", "category"
        )
        account_id = self.request.query_params.get("account")
        category_id = self.request.query_params.get("category")
        txn_status = self.request.query_params.get("status")
        if account_id:
            qs = qs.filter(account_id=account_id)
        if category_id:
            qs = qs.filter(category_id=category_id)
        if txn_status:
            qs = qs.filter(status=txn_status)
        return qs.order_by("-booked_at")

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ---------------------------------------------------------------------------
# Budget
# ---------------------------------------------------------------------------

class BudgetViewSet(viewsets.ModelViewSet):
    """CRUD for /api/budgets/ — scoped to the logged-in user."""

    serializer_class = BudgetSerializer

    def get_queryset(self):
        return Budget.objects.filter(user=self.request.user).prefetch_related(
            "budgetcategory_set__category"
        )

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ---------------------------------------------------------------------------
# Savings Goal
# ---------------------------------------------------------------------------

class SavingsGoalViewSet(viewsets.ModelViewSet):
    """
    CRUD for /api/goals/
    Extra action: POST /api/goals/{id}/deposit/ to add funds.
    """

    serializer_class = SavingsGoalSerializer

    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def deposit(self, request, pk=None):
        """POST /api/goals/{id}/deposit/ — add amount_minor to current_minor."""
        goal = self.get_object()
        amount = request.data.get("amount_minor")
        if amount is None or not str(amount).lstrip("-").isdigit():
            return Response(
                {"detail": "Provide a valid integer amount_minor."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        goal.current_minor += int(amount)
        if goal.current_minor >= goal.target_minor:
            goal.status = "completed"
        goal.save()
        return Response(SavingsGoalSerializer(goal).data)
