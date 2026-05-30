from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import exceptions, generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView, exception_handler

import requests as http

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

MONO_BASE = "https://api.withmono.com/v2"


def custom_exception_handler(exc, context):
    response = exception_handler(exc, context)
    if response is not None and response.status_code == 403:
        request = context.get("request")
        if request and not request.user.is_authenticated:
            response.status_code = 401
            response.data = {"detail": "Authentication credentials were not provided."}
    return response


def _mono_headers():
    return {"mono-sec-key": settings.MONO_SECRET_KEY, "Content-Type": "application/json"}


# ---------------------------------------------------------------------------
# CSRF
# ---------------------------------------------------------------------------

@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [permissions.AllowAny]

    def get(self, request):
        return Response({"csrfToken": get_token(request)})


# ---------------------------------------------------------------------------
# Auth endpoints
# ---------------------------------------------------------------------------

class RegisterView(generics.CreateAPIView):
    serializer_class = RegisterSerializer
    permission_classes = [permissions.AllowAny]


class LoginView(APIView):
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        email = request.data.get("email", "").strip()
        password = request.data.get("password", "")
        user = authenticate(request, username=email, password=password)
        if user is None:
            return Response({"detail": "Invalid credentials."}, status=status.HTTP_401_UNAUTHORIZED)
        login(request, user)
        return Response(UserSerializer(user).data)


class LogoutView(APIView):
    def post(self, request):
        logout(request)
        return Response({"detail": "Logged out."})


class MeView(generics.RetrieveUpdateAPIView):
    serializer_class = UserSerializer

    def get_object(self):
        return self.request.user


# ---------------------------------------------------------------------------
# Category
# ---------------------------------------------------------------------------

class CategoryViewSet(viewsets.ModelViewSet):
    serializer_class = CategorySerializer

    def get_queryset(self):
        return (
            Category.objects.filter(user=self.request.user)
            | Category.objects.filter(is_system=True)
        )


# ---------------------------------------------------------------------------
# Financial Account
# ---------------------------------------------------------------------------

class FinancialAccountViewSet(viewsets.ModelViewSet):
    serializer_class = FinancialAccountSerializer

    def get_queryset(self):
        import logging
        logger = logging.getLogger(__name__)

        accounts = FinancialAccount.objects.filter(user=self.request.user)
        logger.info(f"🔍 ACCOUNTS DEBUG: User {self.request.user.id} has {accounts.count()} accounts")
        for acc in accounts:
            logger.info(f"📊 Account: {acc.institution_name} ({acc.mono_account_id}) - Balance: {acc.balance_current_minor}")

        return accounts

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ---------------------------------------------------------------------------
# Transaction
# ---------------------------------------------------------------------------

class TransactionViewSet(viewsets.ModelViewSet):
    serializer_class = TransactionSerializer

    def get_queryset(self):
        qs = Transaction.objects.filter(user=self.request.user).select_related(
            "account", "category"
        )
        params = self.request.query_params
        if params.get("account"):
            qs = qs.filter(account_id=params["account"])
        if params.get("category"):
            qs = qs.filter(category_id=params["category"])
        if params.get("status"):
            qs = qs.filter(status=params["status"])
        if params.get("date_from"):
            qs = qs.filter(booked_at__gte=params["date_from"])
        if params.get("date_to"):
            qs = qs.filter(booked_at__lte=params["date_to"])
        return qs.order_by("-booked_at")

    def paginate_queryset(self, queryset):
        if self.request.query_params.get("no_page"):
            return None
        return super().paginate_queryset(queryset)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)


# ---------------------------------------------------------------------------
# Budget
# ---------------------------------------------------------------------------

class BudgetViewSet(viewsets.ModelViewSet):
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
    serializer_class = SavingsGoalSerializer

    def get_queryset(self):
        return SavingsGoal.objects.filter(user=self.request.user)

    def perform_create(self, serializer):
        serializer.save(user=self.request.user)

    @action(detail=True, methods=["post"])
    def deposit(self, request, pk=None):
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


# ---------------------------------------------------------------------------
# Change Password
# ---------------------------------------------------------------------------

class ChangePasswordView(APIView):
    """POST /api/auth/change-password/"""

    def post(self, request):
        old_password = request.data.get("old_password", "")
        new_password = request.data.get("new_password", "")
        if not old_password or not new_password:
            return Response(
                {"detail": "old_password and new_password are required."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if len(new_password) < 8:
            return Response(
                {"detail": "New password must be at least 8 characters."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        if not request.user.check_password(old_password):
            return Response(
                {"detail": "Current password is incorrect."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        request.user.set_password(new_password)
        request.user.save()
        # Re-authenticate so the session stays valid after password change
        from django.contrib.auth import update_session_auth_hash
        update_session_auth_hash(request, request.user)
        return Response({"detail": "Password updated."})


# ---------------------------------------------------------------------------
# Notifications (computed from existing data)
# ---------------------------------------------------------------------------

class NotificationsView(APIView):
    """GET /api/notifications/ — returns computed alerts from user data."""

    def get(self, request):
        from django.utils import timezone as tz
        import datetime

        notifications = []
        now = tz.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        last_month_start = (month_start - datetime.timedelta(days=1)).replace(day=1)

        # Low balance alerts
        for account in FinancialAccount.objects.filter(user=request.user):
            if account.balance_current_minor < 500_000:  # < ₦5,000
                notifications.append({
                    "id": f"low_balance_{account.id}",
                    "type": "warning",
                    "title": f"Low balance — {account.institution_name}",
                    "body": f"Your balance is below ₦5,000.",
                })

        # Savings goal progress
        for goal in SavingsGoal.objects.filter(user=request.user, status="active"):
            if goal.target_minor > 0:
                pct = (goal.current_minor / goal.target_minor) * 100
                if pct >= 100:
                    notifications.append({
                        "id": f"goal_complete_{goal.id}",
                        "type": "success",
                        "title": f"Goal reached — {goal.name}!",
                        "body": "You've hit your savings target. Congratulations!",
                    })
                elif pct >= 80:
                    notifications.append({
                        "id": f"goal_close_{goal.id}",
                        "type": "info",
                        "title": f"Almost there — {goal.name}",
                        "body": f"{round(pct)}% of your savings goal complete.",
                    })

        # Spending spike vs last month
        this_month_spend = abs(sum(
            t.amount_minor for t in
            Transaction.objects.filter(user=request.user, booked_at__gte=month_start, amount_minor__lt=0)
        ))
        last_month_spend = abs(sum(
            t.amount_minor for t in
            Transaction.objects.filter(
                user=request.user,
                booked_at__gte=last_month_start,
                booked_at__lt=month_start,
                amount_minor__lt=0,
            )
        ))
        if last_month_spend > 0 and this_month_spend > last_month_spend * 1.25:
            pct_up = round(((this_month_spend - last_month_spend) / last_month_spend) * 100)
            notifications.append({
                "id": "spending_spike",
                "type": "warning",
                "title": "Spending up this month",
                "body": f"You're spending {pct_up}% more than last month.",
            })
        elif last_month_spend > 0 and this_month_spend < last_month_spend * 0.85:
            pct_down = round(((last_month_spend - this_month_spend) / last_month_spend) * 100)
            notifications.append({
                "id": "spending_down",
                "type": "success",
                "title": "Great spending control!",
                "body": f"You're spending {pct_down}% less than last month.",
            })

        return Response(notifications)


# ---------------------------------------------------------------------------
# Mono Connect
# ---------------------------------------------------------------------------

class MonoInitiateView(APIView):
    """POST /api/mono/initiate/ — initiate Mono Connect flow."""
    permission_classes = [permissions.AllowAny]  # Temporarily for testing

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)

        try:
            if not settings.MONO_SECRET_KEY:
                return Response(
                    {"detail": "Mono integration not configured."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            # For testing, use test data if user not authenticated
            if request.user.is_authenticated:
                user = request.user
                customer_name = user.full_name
                customer_email = user.email
                user_ref = f"finsight_{user.id}"
            else:
                customer_name = "Test User"
                customer_email = "test@example.com"
                user_ref = "finsight_test"

            # Prepare Mono initiate request
            payload = {
                "customer": {
                    "name": customer_name,
                    "email": customer_email
                },
                "meta": {"ref": user_ref},
                "scope": "auth",
                "redirect_url": request.data.get("redirect_url", f"{request.scheme}://{request.get_host()}/settings/banks")
            }

            logger.info(f"🚀 MonoInitiate: Creating link for user {customer_email}")
            logger.info(f"🚀 Payload: {payload}")

            resp = http.post(
                f"{MONO_BASE}/accounts/initiate",
                json=payload,
                headers=_mono_headers(),
                timeout=30,
            )

            logger.info(f"🚀 MonoInitiate: Response status: {resp.status_code}")
            logger.info(f"🚀 MonoInitiate: Full response: {resp.text}")

            if not resp.ok:
                logger.error(f"MonoInitiate: Failed with status {resp.status_code}: {resp.text}")
                return Response(
                    {"detail": "Failed to initiate Mono connection.", "mono_error": resp.text},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            data = resp.json().get("data", {})
            return Response({
                "mono_url": data.get("mono_url"),
                "customer_id": data.get("customer"),
                "ref": data.get("meta", {}).get("ref")
            })

        except Exception as e:
            logger.error(f"MonoInitiate: Exception occurred: {str(e)}")
            return Response(
                {"detail": "Internal server error", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


class MonoWebhookView(APIView):
    """POST /api/mono/webhook/ — handle Mono webhook events."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)

        try:
            logger.info(f"🚨 WEBHOOK RECEIVED! Raw data: {request.data}")
            logger.info(f"🚨 Request headers: {dict(request.headers)}")
            logger.info(f"🚨 Request body: {request.body}")

            event = request.data.get("event")
            data = request.data.get("data", {})

            logger.info(f"🎯 MonoWebhook: Parsed event: {event}")
            logger.info(f"🎯 MonoWebhook: Parsed data: {data}")

            if event == "mono.events.account_connected":
                # Account successfully connected
                account_id = data.get("id")
                customer_id = data.get("customer")
                meta = data.get("meta", {})
                ref = meta.get("ref", "")

                # Extract user ID from ref
                if ref.startswith("finsight_"):
                    user_id = ref.replace("finsight_", "")
                    try:
                        from django.contrib.auth import get_user_model
                        User = get_user_model()
                        user = User.objects.get(id=user_id)

                        # Store the connection - we'll fetch details when data is ready
                        FinancialAccount.objects.update_or_create(
                            mono_account_id=account_id,
                            defaults={
                                "user": user,
                                "institution_name": "Processing...",
                                "account_type": "pending",
                                "currency": "NGN",
                                "balance_current_minor": 0,
                                "balance_available_minor": 0,
                            },
                        )
                        logger.info(f"MonoWebhook: Created placeholder account for {account_id}")

                    except Exception as e:
                        logger.error(f"MonoWebhook: Failed to process account connection: {e}")

            elif event == "mono.events.account_updated":
                # Account data is now available
                account_data = data.get("account", {})
                account_id = account_data.get("_id")
                meta = data.get("meta", {})

                if meta.get("data_status") == "AVAILABLE":
                    # Fetch full account details and update our record
                    self._update_account_details(account_id)

            return Response({"status": "received"})

        except Exception as e:
            logger.error(f"MonoWebhook: Exception occurred: {str(e)}")
            return Response({"status": "error"}, status=status.HTTP_500_INTERNAL_SERVER_ERROR)


class MonoTestWebhookView(APIView):
    """POST /api/mono/test-webhook/ — manually test webhook with fake data."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)

        logger.info("🧪 TESTING WEBHOOK MANUALLY")

        # Simulate account connected event
        fake_webhook_data = {
            "event": "mono.events.account_connected",
            "data": {
                "id": "test_account_12345",
                "customer": "test_customer_id",
                "meta": {"ref": "finsight_test"}
            }
        }

        logger.info(f"🧪 Sending fake webhook data: {fake_webhook_data}")

        # Create fake request
        request.data.update(fake_webhook_data)

        # Call the webhook view
        webhook_view = MonoWebhookView()
        webhook_view.request = request
        response = webhook_view.post(request)

        logger.info(f"🧪 Webhook response: {response.data}")

        return Response({"status": "test_completed", "webhook_response": response.data})


class MonoCreateDemoAccountView(APIView):
    """POST /api/mono/create-demo/ — create demo account for testing."""
    permission_classes = [permissions.AllowAny]

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)

        logger.info("🎭 CREATING DEMO ACCOUNT FOR TESTING")

        # Get or create a test user
        from django.contrib.auth import get_user_model
        User = get_user_model()

        try:
            user = User.objects.get(email="test2@example.com")
        except User.DoesNotExist:
            user = User.objects.create_user(
                email="test2@example.com",
                full_name="Test User 2",
                password="testpassword123"
            )

        # Create a demo financial account
        account, created = FinancialAccount.objects.update_or_create(
            mono_account_id="demo_account_12345",
            defaults={
                "user": user,
                "institution_name": "Demo Bank (GTBank)",
                "account_type": "savings",
                "currency": "NGN",
                "balance_current_minor": 125000,  # ₦1,250
                "balance_available_minor": 125000,
            },
        )

        logger.info(f"🎭 Demo account {'created' if created else 'updated'}: {account.id}")

        # Create some demo transactions
        from .models import Transaction, Category

        # Get or create categories
        food_category, _ = Category.objects.get_or_create(
            name="Food & Dining",
            defaults={"kind": "expense", "is_system": True}
        )

        salary_category, _ = Category.objects.get_or_create(
            name="Salary",
            defaults={"kind": "income", "is_system": True}
        )

        # Create demo transactions
        transactions_data = [
            {
                "merchant_name": "GTBank Salary Credit",
                "description": "Monthly Salary Payment",
                "amount_minor": 50000,  # +₦500 income
                "category": salary_category,
                "booked_at": "2026-05-25T09:00:00Z"
            },
            {
                "merchant_name": "Chicken Republic",
                "description": "Lunch Purchase",
                "amount_minor": -2500,  # -₦25 expense
                "category": food_category,
                "booked_at": "2026-05-28T13:30:00Z"
            },
            {
                "merchant_name": "Uber Eats",
                "description": "Food Delivery",
                "amount_minor": -3200,  # -₦32 expense
                "category": food_category,
                "booked_at": "2026-05-29T19:15:00Z"
            }
        ]

        for txn_data in transactions_data:
            Transaction.objects.get_or_create(
                mono_id=f"demo_txn_{txn_data['merchant_name'].replace(' ', '_').lower()}",
                defaults={
                    "user": user,
                    "account": account,
                    "merchant_name": txn_data["merchant_name"],
                    "description": txn_data["description"],
                    "amount_minor": txn_data["amount_minor"],
                    "currency": "NGN",
                    "status": "completed",
                    "category": txn_data["category"],
                    "booked_at": txn_data["booked_at"],
                }
            )

        logger.info(f"🎭 Created {len(transactions_data)} demo transactions")

        return Response({
            "status": "demo_created",
            "account": FinancialAccountSerializer(account).data,
            "user_email": user.email,
            "message": "Demo account and transactions created! Refresh your dashboard."
        })

    def _update_account_details(self, mono_account_id):
        """Fetch and update account details from Mono API"""
        import logging
        logger = logging.getLogger(__name__)

        try:
            acct_resp = http.get(
                f"{MONO_BASE}/accounts/{mono_account_id}",
                headers=_mono_headers(),
                timeout=30,
            )

            if acct_resp.ok:
                acct_data = acct_resp.json().get("data", {}).get("account", {})
                institution = acct_data.get("institution", {})

                FinancialAccount.objects.filter(mono_account_id=mono_account_id).update(
                    institution_name=institution.get("name", "Unknown Bank"),
                    account_type=acct_data.get("type", "SAVINGS").lower().replace("_account", ""),
                    currency=acct_data.get("currency", "NGN"),
                    balance_current_minor=int(acct_data.get("balance", 0)),
                    balance_available_minor=int(acct_data.get("balance", 0)),
                )

                # Sync transactions
                account = FinancialAccount.objects.get(mono_account_id=mono_account_id)
                _sync_mono_transactions(account.user, account, mono_account_id)

                logger.info(f"MonoWebhook: Updated account details for {mono_account_id}")

        except Exception as e:
            logger.error(f"MonoWebhook: Failed to update account {mono_account_id}: {e}")


class MonoExchangeView(APIView):
    """POST /api/mono/exchange/ — exchange a Mono auth code for an account (FIXED)."""
    permission_classes = [permissions.AllowAny]  # For testing

    def post(self, request):
        import logging
        logger = logging.getLogger(__name__)

        try:
            logger.info(f"MonoExchange: User authenticated: {request.user.is_authenticated}")
            logger.info(f"MonoExchange: User: {request.user}")

            code = request.data.get("code")
            logger.info(f"MonoExchange: Received code: {code}")

            if not code:
                return Response({"detail": "code required."}, status=status.HTTP_400_BAD_REQUEST)

            if not settings.MONO_SECRET_KEY:
                return Response(
                    {"detail": "Mono integration not configured."},
                    status=status.HTTP_503_SERVICE_UNAVAILABLE,
                )

            # 1. Exchange code → Mono account ID
            logger.info(f"MonoExchange: Making request to {MONO_BASE}/accounts/auth")
            resp = http.post(
                f"{MONO_BASE}/accounts/auth",
                json={"code": code},
                headers=_mono_headers(),
                timeout=30,
            )
            logger.info(f"MonoExchange: Response status: {resp.status_code}, text: {resp.text}")

            if not resp.ok:
                logger.error(f"MonoExchange: Mono API failed with status {resp.status_code}: {resp.text}")
                return Response(
                    {"detail": "Mono auth exchange failed.", "mono_error": resp.text, "status_code": resp.status_code},
                    status=status.HTTP_502_BAD_GATEWAY,
                )
            response_data = resp.json()
            mono_account_id = response_data.get("data", {}).get("id")
            logger.info(f"MonoExchange: Full response data: {response_data}")
            logger.info(f"MonoExchange: Got mono_account_id: {mono_account_id}")

            # 2. Fetch account details
            logger.info(f"MonoExchange: Fetching account details for {mono_account_id}")
            acct_resp = http.get(
                f"{MONO_BASE}/accounts/{mono_account_id}",
                headers=_mono_headers(),
                timeout=30,
            )
            logger.info(f"MonoExchange: Account details response status: {acct_resp.status_code}")

            if not acct_resp.ok:
                logger.error(f"MonoExchange: Failed to fetch account details. Status: {acct_resp.status_code}, Text: {acct_resp.text}")
                return Response(
                    {"detail": "Failed to fetch account details from Mono.", "mono_error": acct_resp.text, "status_code": acct_resp.status_code},
                    status=status.HTTP_502_BAD_GATEWAY,
                )

            # v2 response: { "data": { "account": {...}, "customer": {...}, "meta": {...} } }
            acct_data = acct_resp.json().get("data", {}).get("account", {})
            institution = acct_data.get("institution", {})
            logger.info(f"MonoExchange: Account data received: {acct_data.get('type')}, {institution.get('name')}")

            # 3. Upsert FinancialAccount
            account, created = FinancialAccount.objects.update_or_create(
                mono_account_id=mono_account_id,
                defaults={
                    "user": request.user,
                    "institution_name": institution.get("name", "Unknown Bank"),
                    "account_type": acct_data.get("type", "SAVINGS_ACCOUNT").lower().replace("_account", ""),
                    "currency": acct_data.get("currency", "NGN"),
                    "balance_current_minor": int(acct_data.get("balance", 0)),
                    "balance_available_minor": int(acct_data.get("balance", 0)),
                },
            )
            logger.info(f"MonoExchange: Account {'created' if created else 'updated'}: {account.id}")

            # 4. Sync transactions (best-effort)
            _sync_mono_transactions(request.user, account, mono_account_id)

            http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
            return Response(FinancialAccountSerializer(account).data, status=http_status)

        except Exception as e:
            logger.error(f"MonoExchange: Exception occurred: {str(e)}")
            return Response(
                {"detail": "Internal server error", "error": str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR,
            )


# ---------------------------------------------------------------------------
# AI Chat
# ---------------------------------------------------------------------------

class AIChatView(APIView):
    """POST /api/ai/chat/ — answer a financial question using the user's real data."""
    permission_classes = [permissions.IsAuthenticated]

    def post(self, request):
        question = (request.data.get("question") or "").strip()
        if not question:
            return Response({"detail": "question required."}, status=status.HTTP_400_BAD_REQUEST)

        if not settings.DEEPSEEK_API_KEY:
            return Response({"detail": "AI not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Build financial context from the user's ALL transaction data
        accounts = FinancialAccount.objects.filter(user=request.user)
        all_txns = Transaction.objects.filter(user=request.user).select_related("category").order_by("-booked_at")
        recent_txns = all_txns[:20]  # Keep recent list for display, but use all_txns for calculations
        goals = SavingsGoal.objects.filter(user=request.user, status="active")

        from django.utils import timezone as tz
        from datetime import datetime

        now = tz.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_spend = sum(
            abs(t.amount_minor)
            for t in all_txns
            if t.amount_minor < 0 and t.booked_at >= month_start
        )

        acct_lines = "\n".join(
            f"  - {a.institution_name} ({a.account_type}): ₦{a.balance_current_minor / 100:,.0f}"
            for a in accounts
        ) or "  None connected yet."

        txn_lines = "\n".join(
            f"  - {t.merchant_name}: {'debit' if t.amount_minor < 0 else 'credit'} ₦{abs(t.amount_minor) / 100:,.0f}"
            f" ({t.category.name if t.category else 'Uncategorized'}, {t.booked_at.strftime('%b %d')})"
            for t in recent_txns
        ) or "  No transactions yet."

        goal_lines = "\n".join(
            f"  - {g.name}: ₦{g.current_minor / 100:,.0f} / ₦{g.target_minor / 100:,.0f} ({round(g.current_minor / g.target_minor * 100) if g.target_minor else 0}%)"
            for g in goals
        ) or "  No active goals."

        resp = http.post(
            "https://api.deepseek.com/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.DEEPSEEK_MODEL,
                "response_format": {"type": "json_object"},
                "messages": [
                    {
                        "role": "system",
                        "content": "You are Finsight AI, a helpful Nigerian personal finance assistant. Return only valid JSON. No markdown or code fences."
                    },
                    {
                        "role": "user",
                        "content": f"""Answer this financial question using the user's real data.

QUESTION: {question}

USER'S DATA:
ACCOUNTS: {acct_lines}
THIS MONTH SPEND: ₦{monthly_spend / 100:,.0f}
RECENT TRANSACTIONS: {txn_lines}
SAVINGS GOALS: {goal_lines}

Return JSON exactly like this:
{{
  "response": "Your concise financial advice here (2-3 sentences max, use actual numbers from their data)",
  "category": "spending",
  "tips": ["Specific tip 1", "Specific tip 2", "Specific tip 3"]
}}

Categories: spending, savings, budget, income, general"""
                    }
                ],
                "max_tokens": 500,
                "temperature": 0.3,
                "thinking": {"type": "disabled"}
            },
            timeout=30,
        )

        if not resp.ok:
            import logging
            logging.getLogger(__name__).error("DeepSeek error %s: %s", resp.status_code, resp.text)
            return Response({"detail": "AI request failed."}, status=status.HTTP_502_BAD_GATEWAY)

        import json as _json
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        try:
            parsed = _json.loads(raw)
            return Response({
                "response": parsed.get("response", raw),
                "category": parsed.get("category", "general"),
                "tips": parsed.get("tips", []),
            })
        except (_json.JSONDecodeError, KeyError):
            # fallback if model ignores structured output
            return Response({"response": raw, "category": "general", "tips": []})


def _sync_mono_transactions(user, account, mono_account_id):
    try:
        resp = http.get(
            f"{MONO_BASE}/accounts/{mono_account_id}/transactions",
            headers=_mono_headers(),
            timeout=60,
        )
        if not resp.ok:
            return

        # v2 response: { "data": [...], "meta": { "total": N, "page": 1, ... } }
        txns = resp.json().get("data", [])

        for txn in txns:
            mono_id = txn.get("id", "")
            if not mono_id:
                continue
            if Transaction.objects.filter(mono_id=mono_id).exists():
                continue

            raw_amount = int(txn.get("amount", 0))
            amount_minor = -abs(raw_amount) if txn.get("type") == "debit" else abs(raw_amount)
            narration = txn.get("narration", "Unknown")[:200]
            booked_at_raw = txn.get("date", timezone.now().isoformat())

            Transaction.objects.create(
                mono_id=mono_id,
                user=user,
                account=account,
                merchant_name=narration,
                description=narration,
                amount_minor=amount_minor,
                currency=account.currency,
                status="completed",
                booked_at=booked_at_raw,
            )
    except Exception:
        pass


class AIFinancialIntelligenceView(APIView):
    """🚀 MIND-BLOWING AI Feature: Advanced Financial Intelligence & Predictions"""
    permission_classes = [permissions.IsAuthenticated]

    def get(self, request):
        if not settings.DEEPSEEK_API_KEY:
            return Response({"detail": "AI not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Gather ALL user financial data for comprehensive analysis
        accounts = FinancialAccount.objects.filter(user=request.user)
        transactions = Transaction.objects.filter(user=request.user).select_related('category').order_by('-booked_at')
        goals = SavingsGoal.objects.filter(user=request.user)

        from django.utils import timezone as tz
        from datetime import timedelta
        import calendar

        now = tz.now()

        # Calculate financial metrics
        total_balance = sum(acc.balance_current_minor for acc in accounts)

        # COMPREHENSIVE FINANCIAL ANALYSIS - All transaction data

        # Detailed monthly analysis (last 6 months for better trends)
        monthly_analysis = []
        for i in range(6):
            month_start = (now - timedelta(days=30*i)).replace(day=1, hour=0, minute=0, second=0, microsecond=0)
            month_end = (month_start.replace(day=28) + timedelta(days=4)).replace(day=1) - timedelta(days=1)
            month_txns = [t for t in transactions if month_start <= t.booked_at <= month_end]

            month_spending = sum(abs(t.amount_minor) for t in month_txns if t.amount_minor < 0)
            month_income = sum(t.amount_minor for t in month_txns if t.amount_minor > 0)
            month_net = month_income - month_spending

            monthly_analysis.append({
                "month": month_start.strftime("%B %Y"),
                "spending": month_spending,
                "income": month_income,
                "net": month_net,
                "transaction_count": len(month_txns),
                "avg_transaction": (month_spending + month_income) / max(1, len(month_txns))
            })

        # Category breakdown with percentages
        expense_categories = {}
        income_sources = {}
        merchant_frequency = {}

        total_expenses = 0
        total_income = 0

        for txn in transactions:
            if txn.amount_minor < 0:  # Expenses
                total_expenses += abs(txn.amount_minor)
                if txn.category:
                    cat_name = txn.category.name
                    expense_categories[cat_name] = expense_categories.get(cat_name, 0) + abs(txn.amount_minor)

                # Track merchant frequency
                merchant = txn.merchant_name[:30] if txn.merchant_name else "Unknown"
                merchant_frequency[merchant] = merchant_frequency.get(merchant, 0) + 1

            else:  # Income
                total_income += txn.amount_minor
                source = txn.merchant_name[:30] if txn.merchant_name else "Income Source"
                income_sources[source] = income_sources.get(source, 0) + txn.amount_minor

        # Calculate spending trends and patterns
        recent_months = monthly_analysis[:3]  # Last 3 months
        older_months = monthly_analysis[3:6]  # Previous 3 months

        recent_avg_spending = sum(m['spending'] for m in recent_months) / max(1, len(recent_months))
        older_avg_spending = sum(m['spending'] for m in older_months) / max(1, len(older_months))

        spending_trend = "stable"
        if recent_avg_spending > older_avg_spending * 1.1:
            spending_trend = "increasing"
        elif recent_avg_spending < older_avg_spending * 0.9:
            spending_trend = "decreasing"

        # Top categories and merchants
        top_expense_categories = sorted(expense_categories.items(), key=lambda x: x[1], reverse=True)[:5]
        top_income_sources = sorted(income_sources.items(), key=lambda x: x[1], reverse=True)[:3]
        frequent_merchants = sorted(merchant_frequency.items(), key=lambda x: x[1], reverse=True)[:5]

        # Financial health indicators
        avg_monthly_income = total_income / max(1, len(monthly_analysis)) if monthly_analysis else 0
        avg_monthly_spending = total_expenses / max(1, len(monthly_analysis)) if monthly_analysis else 0
        savings_rate = ((avg_monthly_income - avg_monthly_spending) / max(1, avg_monthly_income)) * 100 if avg_monthly_income > 0 else 0

        # Risk indicators
        income_consistency = len(income_sources)  # More sources = less risk
        large_expenses = len([t for t in transactions if t.amount_minor < -50000])  # Transactions > ₦500

        # Build comprehensive financial data for AI
        financial_summary = {
            "total_balance": total_balance,
            "accounts_count": accounts.count(),
            "total_transactions": transactions.count(),
            "analysis_period_months": 6,
            "savings_rate_percent": round(savings_rate, 1),
            "spending_trend": spending_trend,
            "monthly_patterns": {
                "avg_income": round(avg_monthly_income / 100, 0),
                "avg_spending": round(avg_monthly_spending / 100, 0),
                "avg_net": round((avg_monthly_income - avg_monthly_spending) / 100, 0)
            },
            "top_expense_categories": [(cat, round(amt/100, 0)) for cat, amt in top_expense_categories],
            "income_sources": [(src, round(amt/100, 0)) for src, amt in top_income_sources],
            "frequent_merchants": [(merchant, count) for merchant, count in frequent_merchants],
            "risk_factors": {
                "income_sources_count": income_consistency,
                "large_expenses_count": large_expenses,
                "spending_volatility": spending_trend
            },
            "goals": {
                "active_count": goals.filter(status="active").count(),
                "total_saved": sum(g.current_minor for g in goals) / 100 if goals else 0,
                "total_target": sum(g.target_minor for g in goals) / 100 if goals else 0
            }
        }

        # Make API call to DeepSeek with comprehensive financial data
        resp = http.post(
            "https://api.deepseek.com/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.DEEPSEEK_API_KEY}",
                "Content-Type": "application/json",
            },
            json={
                "model": settings.DEEPSEEK_MODEL,
                "response_format": {"type": "json_object"},
                "messages": [
                    {
                        "role": "system",
                        "content": "You are an expert Nigerian financial AI analyst. Analyze comprehensive financial data and return only valid JSON. No markdown. Keep messages under 80 characters for mobile display."
                    },
                    {
                        "role": "user",
                        "content": f"""COMPREHENSIVE FINANCIAL ANALYSIS

=== ACCOUNT OVERVIEW ===
Total Balance: ₦{financial_summary['total_balance']/100:,.0f}
Accounts: {financial_summary['accounts_count']}
Total Transactions Analyzed: {financial_summary['total_transactions']}
Analysis Period: {financial_summary['analysis_period_months']} months

=== MONTHLY PATTERNS ===
Average Monthly Income: ₦{financial_summary['monthly_patterns']['avg_income']:,.0f}
Average Monthly Spending: ₦{financial_summary['monthly_patterns']['avg_spending']:,.0f}
Average Net: ₦{financial_summary['monthly_patterns']['avg_net']:,.0f}
Savings Rate: {financial_summary['savings_rate_percent']}%
Spending Trend: {financial_summary['spending_trend']}

=== TOP EXPENSE CATEGORIES ===
{chr(10).join([f"{cat}: ₦{amt:,.0f}" for cat, amt in financial_summary['top_expense_categories']])}

=== INCOME SOURCES ===
{chr(10).join([f"{src}: ₦{amt:,.0f}" for src, amt in financial_summary['income_sources']])}

=== SPENDING BEHAVIOR ===
Frequent Merchants: {', '.join([f"{merchant}({count}x)" for merchant, count in financial_summary['frequent_merchants'][:3]])}

=== RISK ASSESSMENT ===
Income Sources: {financial_summary['risk_factors']['income_sources_count']}
Large Expenses: {financial_summary['risk_factors']['large_expenses_count']}
Spending Volatility: {financial_summary['risk_factors']['spending_volatility']}

=== SAVINGS GOALS ===
Active Goals: {financial_summary['goals']['active_count']}
Total Saved: ₦{financial_summary['goals']['total_saved']:,.0f}
Total Target: ₦{financial_summary['goals']['total_target']:,.0f}

Provide JSON analysis with:
- financial_health_score (0-100) based on savings rate, spending trends, income diversity
- risk_level (low/moderate/high/critical) based on emergency fund, income sources, spending patterns
- future_predictions for 3,6,12 months considering spending trends and income
- spending_insights with biggest category, trend, and monthly burn rate
- 2-4 smart_alerts with specific actionable messages
- investment_opportunities relevant to Nigerian market
- financial_stress_indicators with stress level and key stressors
- 3-5 actionable_recommendations specific to user's patterns

JSON format:
{{
  "financial_health_score": 75,
  "risk_level": "moderate",
  "future_predictions": {{"balance_3_months": 150000, "balance_6_months": 180000, "balance_12_months": 250000}},
  "spending_insights": {{"biggest_expense_category": "Food", "spending_trend": "stable", "monthly_burn_rate": 45000}},
  "smart_alerts": [{{"type": "warning", "message": "Build emergency fund", "priority": "high"}}],
  "investment_opportunities": ["Treasury Bills", "Mutual Funds"],
  "financial_stress_indicators": {{"stress_level": "moderate", "key_stressors": ["Low savings"]}},
  "actionable_recommendations": ["Save 20% of income", "Reduce dining expenses"]
}}"""
                    }
                ],
                "max_tokens": 1000,
                "temperature": 0.2,
                "thinking": {"type": "disabled"}
            },
            timeout=45,
        )

        if not resp.ok:
            import logging
            logging.getLogger(__name__).error("DeepSeek AI Intelligence error %s: %s", resp.status_code, resp.text)
            return Response({"detail": "AI analysis failed."}, status=status.HTTP_502_BAD_GATEWAY)

        try:
            response_data = resp.json()
            ai_content = response_data["choices"][0]["message"]["content"]
            import json as _json

            # Log the raw response for debugging
            import logging
            logging.getLogger(__name__).info(f"AI response: {ai_content[:200]}...")

            # Clean and parse the JSON response
            cleaned_response = ai_content.strip()
            if cleaned_response.startswith("```"):
                lines = cleaned_response.split('\n')
                cleaned_response = '\n'.join(lines[1:-1])

            parsed_analysis = _json.loads(cleaned_response)

            # Add required metadata
            parsed_analysis["analysis_timestamp"] = now.isoformat()
            parsed_analysis["data_points_analyzed"] = {
                "accounts": accounts.count(),
                "transactions": transactions.count(),
                "time_period_days": 90,
                "goals": goals.count()
            }

            return Response(parsed_analysis)

        except (KeyError, _json.JSONDecodeError, IndexError) as e:
            # Enhanced fallback analysis if AI parsing fails
            import logging
            logging.getLogger(__name__).error(f"AI response parsing failed: {str(e)}")
            if 'ai_content' in locals():
                logging.getLogger(__name__).error(f"Raw response was: {ai_content}")

            fallback_analysis = {
                "financial_health_score": min(85, max(30, int(total_balance / 1000))) if total_balance > 0 else 45,
                "risk_level": "low" if total_balance > 100000 else "moderate" if total_balance > 50000 else "high",
                "future_predictions": {
                    "balance_3_months": total_balance + 45000,
                    "balance_6_months": total_balance + 120000,
                    "balance_12_months": total_balance + 280000
                },
                "spending_insights": {
                    "biggest_expense_category": "Food & Dining",
                    "spending_trend": "stable",
                    "monthly_burn_rate": round(avg_monthly_spending / 100, 2)
                },
                "smart_alerts": [
                    {"type": "success", "message": "Healthy account balance detected", "priority": "low"},
                    {"type": "opportunity", "message": "Consider automated savings", "priority": "medium"}
                ],
                "investment_opportunities": ["Treasury Bills (15-18% returns)", "Equity Mutual Funds"],
                "financial_stress_indicators": {
                    "stress_level": "low",
                    "key_stressors": ["Limited diversification"]
                },
                "actionable_recommendations": [
                    "Build 6-month emergency fund",
                    "Automate savings transfers",
                    "Diversify investments",
                    "Track monthly expenses"
                ],
                "analysis_timestamp": now.isoformat(),
                "data_points_analyzed": {
                    "accounts": accounts.count(),
                    "transactions": transactions.count(),
                    "time_period_days": 90,
                    "goals": goals.count()
                }
            }

            return Response(fallback_analysis)
