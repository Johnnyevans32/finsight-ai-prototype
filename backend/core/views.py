from django.conf import settings
from django.contrib.auth import authenticate, get_user_model, login, logout
from django.middleware.csrf import get_token
from django.utils import timezone
from django.utils.decorators import method_decorator
from django.views.decorators.csrf import ensure_csrf_cookie
from rest_framework import generics, permissions, status, viewsets
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.views import APIView

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
        return FinancialAccount.objects.filter(user=self.request.user)

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

class MonoExchangeView(APIView):
    """POST /api/mono/exchange/ — exchange a Mono auth code for an account."""

    def post(self, request):
        code = request.data.get("code")
        if not code:
            return Response({"detail": "code required."}, status=status.HTTP_400_BAD_REQUEST)

        if not settings.MONO_SECRET_KEY:
            return Response(
                {"detail": "Mono integration not configured."},
                status=status.HTTP_503_SERVICE_UNAVAILABLE,
            )

        # 1. Exchange code → Mono account ID
        resp = http.post(
            f"{MONO_BASE}/accounts/auth",
            json={"code": code},
            headers=_mono_headers(),
            timeout=30,
        )
        if not resp.ok:
            return Response(
                {"detail": "Mono auth exchange failed.", "mono_error": resp.text},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        mono_account_id = resp.json().get("id")

        # 2. Fetch account details
        acct_resp = http.get(
            f"{MONO_BASE}/accounts/{mono_account_id}",
            headers=_mono_headers(),
            timeout=30,
        )
        if not acct_resp.ok:
            return Response(
                {"detail": "Failed to fetch account details from Mono."},
                status=status.HTTP_502_BAD_GATEWAY,
            )
        # v2 response: { "data": { "account": {...}, "customer": {...}, "meta": {...} } }
        acct_data = acct_resp.json().get("data", {}).get("account", {})
        institution = acct_data.get("institution", {})

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

        # 4. Sync transactions (best-effort)
        _sync_mono_transactions(request.user, account, mono_account_id)

        http_status = status.HTTP_201_CREATED if created else status.HTTP_200_OK
        return Response(FinancialAccountSerializer(account).data, status=http_status)


# ---------------------------------------------------------------------------
# AI Chat
# ---------------------------------------------------------------------------

class AIChatView(APIView):
    """POST /api/ai/chat/ — answer a financial question using the user's real data."""

    def post(self, request):
        question = (request.data.get("question") or "").strip()
        if not question:
            return Response({"detail": "question required."}, status=status.HTTP_400_BAD_REQUEST)

        if not settings.OPENROUTER_API_KEY:
            return Response({"detail": "AI not configured."}, status=status.HTTP_503_SERVICE_UNAVAILABLE)

        # Build financial context from the user's real data
        accounts = FinancialAccount.objects.filter(user=request.user)
        recent_txns = (
            Transaction.objects.filter(user=request.user)
            .select_related("category")
            .order_by("-booked_at")[:20]
        )
        goals = SavingsGoal.objects.filter(user=request.user, status="active")

        from django.utils import timezone as tz
        from datetime import datetime

        now = tz.now()
        month_start = now.replace(day=1, hour=0, minute=0, second=0, microsecond=0)
        monthly_spend = sum(
            abs(t.amount_minor)
            for t in recent_txns
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

        system_prompt = f"""You are Finsight AI, a helpful personal finance assistant for Nigerian users.
You have access to the user's real financial data below. Answer their question concisely (2-3 sentences max).
Always use ₦ (Naira) for currency amounts. Be specific and reference their actual numbers when relevant.

ACCOUNTS:
{acct_lines}

THIS MONTH'S TOTAL SPEND: ₦{monthly_spend / 100:,.0f}

RECENT TRANSACTIONS (last 20):
{txn_lines}

SAVINGS GOALS:
{goal_lines}"""

        resp = http.post(
            "https://openrouter.ai/api/v1/chat/completions",
            headers={
                "Authorization": f"Bearer {settings.OPENROUTER_API_KEY}",
                "HTTP-Referer": "http://localhost:3000",
                "X-Title": "Finsight AI",
            },
            json={
                "model": settings.OPENROUTER_MODEL,
                "messages": [
                    {"role": "system", "content": system_prompt},
                    {"role": "user", "content": question},
                ],
                "max_tokens": 400,
                "response_format": {
                    "type": "json_schema",
                    "json_schema": {
                        "name": "finance_response",
                        "strict": True,
                        "schema": {
                            "type": "object",
                            "properties": {
                                "answer": {
                                    "type": "string",
                                    "description": "Main response to the user's financial question, 2-3 sentences",
                                },
                                "category": {
                                    "type": "string",
                                    "description": "Question category",
                                    "enum": ["spending", "savings", "budget", "income", "general"],
                                },
                                "tips": {
                                    "type": "array",
                                    "description": "1-3 short actionable financial tips based on the user's real data",
                                    "items": {"type": "string"},
                                },
                            },
                            "required": ["answer", "category", "tips"],
                            "additionalProperties": False,
                        },
                    },
                },
            },
            timeout=30,
        )

        if not resp.ok:
            return Response({"detail": "AI request failed."}, status=status.HTTP_502_BAD_GATEWAY)

        import json as _json
        raw = resp.json()["choices"][0]["message"]["content"].strip()
        try:
            parsed = _json.loads(raw)
            return Response({
                "response": parsed.get("answer", raw),
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
