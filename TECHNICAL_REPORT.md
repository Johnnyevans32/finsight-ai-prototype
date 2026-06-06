# Finsight AI - Technical Report

**Course**: Web Technology in Business + Web Application Development
**Student**: Evans Eburu Chukwuebuka
**Group**: RIM-150960
**Date**: June 2026

---

## 1. Introduction

### 1.1 Project Goals
Develop a secure, scalable full-stack web application that addresses personal finance management challenges for Nigerian users through AI-powered insights and bank account integration.

### 1.2 Business Use Case
Nigerian young professionals and students face challenges in managing their finances due to:
- Lack of consolidated view of multiple bank accounts
- Difficulty tracking spending patterns
- Absence of personalized financial advice
- Limited financial literacy tools

### 1.3 Problem Statement
The project solves the gap in financial management tools tailored for the Nigerian market by providing:
- Real-time bank account synchronization via Mono API
- AI-powered financial intelligence using DeepSeek
- Automated expense categorization
- Personalized budget recommendations

---

## 2. System Design

### 2.1 Functional Architecture

```
┌─────────────────────────────────────────────────────────────┐
│                         Frontend (Next.js)                   │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │Dashboard │ │ AI Chat  │ │ Settings │ │  Auth    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      │ HTTPS (Port 3000)
                      ▼
┌─────────────────────────────────────────────────────────────┐
│                    Backend (Django REST)                     │
│  ┌──────────┐ ┌──────────┐ ┌──────────┐ ┌──────────┐      │
│  │   Auth   │ │   Core   │ │    AI    │ │   Mono   │      │
│  │  Views   │ │  Models  │ │ Service  │ │   API    │      │
│  └──────────┘ └──────────┘ └──────────┘ └──────────┘      │
└─────────────────────┬───────────────────────────────────────┘
                      │ Port 8000
         ┌────────────┴────────────┬──────────────┐
         ▼                         ▼              ▼
┌──────────────┐         ┌──────────────┐ ┌──────────────┐
│   SQLite     │         │   Mono API   │ │  DeepSeek    │
│   Database   │         │   (Banking)  │ │     AI       │
└──────────────┘         └──────────────┘ └──────────────┘
```

### 2.2 Key Features Implemented

1. **Authentication & Authorization**
   - User registration with email/password
   - Session-based authentication
   - Role-based access control (admin/user)
   - Password reset functionality

2. **Financial Account Management**
   - Secure bank connection via Mono Connect
   - Real-time balance updates
   - Multi-account support
   - Transaction synchronization

3. **AI-Powered Intelligence**
   - Natural language financial queries
   - 85+ financial metrics analysis
   - Predictive spending insights
   - Risk assessment and recommendations

4. **Dashboard & Analytics**
   - Real-time financial overview
   - Spending categorization
   - Budget tracking
   - Savings goals monitoring

### 2.3 Use Cases

| Use Case | Actor | Description |
|----------|-------|-------------|
| Register Account | User | Create new account with email verification |
| Connect Bank | User | Link Nigerian bank via Mono API |
| View Dashboard | User | See consolidated financial overview |
| Chat with AI | User | Ask financial questions in natural language |
| Set Budget | User | Create monthly spending limits by category |
| Track Goals | User | Monitor savings progress |
| Export Data | User | Download transaction history |

---

## 3. Implementation

### 3.1 Technology Stack

**Frontend**
- Framework: Next.js 14.2.35 (React 19)
- Language: TypeScript 5.x
- Styling: Tailwind CSS 4.1.9
- UI Components: Radix UI
- State Management: React Hooks
- API Client: Native Fetch API

**Backend**
- Framework: Django 6.0.4
- API: Django REST Framework
- Database: SQLite (development)
- Authentication: Django Sessions
- Python: 3.14

**External Services**
- Banking API: Mono (Nigerian banks)
- AI Service: DeepSeek V4 Flash
- Deployment: Docker & Docker Compose

### 3.2 Database Schema

```python
# Core Models (Django ORM)

User (Custom)
├── id: UUID (PK)
├── email: EmailField (unique)
├── full_name: CharField
└── locale: CharField

FinancialAccount
├── id: UUID (PK)
├── user: ForeignKey(User)
├── mono_account_id: CharField
├── institution_name: CharField
├── account_type: CharField
├── currency: CharField
├── balance_current_minor: BigIntegerField
└── balance_available_minor: BigIntegerField

Transaction
├── id: UUID (PK)
├── user: ForeignKey(User)
├── account: ForeignKey(FinancialAccount)
├── category: ForeignKey(Category)
├── merchant_name: CharField
├── amount_minor: BigIntegerField
├── currency: CharField
├── status: CharField(choices)
└── booked_at: DateTimeField

Category
├── id: UUID (PK)
├── user: ForeignKey(User, null=True)
├── name: CharField
├── kind: CharField(choices: income/expense/transfer)
└── is_system: BooleanField
```

### 3.3 Key Implementation Details

**Security Implementation**
```python
# CSRF Protection
@method_decorator(ensure_csrf_cookie, name="dispatch")
class CsrfView(APIView):
    permission_classes = [permissions.AllowAny]

# Environment Variables
SECRET_KEY = os.environ.get('SECRET_KEY')
MONO_SECRET_KEY = os.environ.get('MONO_SECRET_KEY')
DEEPSEEK_API_KEY = os.environ.get('DEEPSEEK_API_KEY')
```

**AI Integration**
```python
# DeepSeek Integration for Financial Intelligence
class AIFinancialIntelligenceView(APIView):
    def get(self, request):
        # Analyze 90 days of transaction data
        # Calculate 85+ financial metrics
        # Return predictions and recommendations
```

**Bank Integration**
```python
# Mono API Integration
class MonoExchangeView(APIView):
    def post(self, request):
        # Exchange auth code for account
        # Fetch account details
        # Sync transactions
```

---

## 4. Testing & Deployment

### 4.1 Docker Configuration

**Multi-Service Architecture**
```yaml
services:
  backend:
    build: ./backend
    ports: ["8000:8000"]
    env_file: ./backend/.env

  frontend:
    build: ./frontend
    ports: ["3000:3000"]
    environment:
      - NEXT_PUBLIC_API_BASE_URL=http://localhost:8000
```

### 4.2 Security Measures

- **XSS Protection**: Django templates auto-escape
- **CSRF Protection**: Django middleware + tokens
- **SQL Injection**: ORM parameterized queries
- **Environment Variables**: .env file with .gitignore
- **Password Security**: Django's PBKDF2 hashing
- **CORS Configuration**: Whitelist allowed origins

### 4.3 Current Testing Status

**Implemented**:
- Manual integration testing
- API endpoint verification
- Frontend component testing (manual)

**To Be Implemented**:
- Unit tests for models and views
- Integration tests for API endpoints
- Frontend automated tests
- Performance testing

---

## 5. Conclusion

### 5.1 Achievements

1. **Full-Stack Implementation**: Successfully built a working full-stack application
2. **AI Integration**: Implemented advanced financial intelligence with 85+ metrics
3. **Bank Integration**: Connected to Nigerian banks via Mono API
4. **Security**: Implemented authentication, authorization, and security best practices
5. **Deployment**: Dockerized application for easy deployment

### 5.2 Challenges Faced

1. **Mono API Integration**: Initial webhook configuration issues resolved through debugging
2. **AI Response Formatting**: Structured JSON responses required careful prompt engineering
3. **State Management**: Complex financial data required careful state synchronization
4. **Docker Optimization**: Multi-stage builds needed for production optimization

### 5.3 Lessons Learned

1. **API Design**: RESTful principles crucial for maintainable code
2. **Security First**: Environment variables and authentication must be implemented early
3. **Documentation**: Clear documentation saves development time
4. **Testing Importance**: Early testing prevents complex debugging later

### 5.4 Future Work

1. **Production Deployment**: Add Nginx, Gunicorn, PostgreSQL
2. **Enhanced Testing**: Implement comprehensive test suite
3. **Caching Layer**: Add Redis for performance optimization
4. **Mobile App**: React Native version for mobile users
5. **Advanced Features**: Investment tracking, bill payments, peer-to-peer transfers

---

## 6. References

1. Django Documentation. (2024). Django REST Framework. https://www.django-rest-framework.org/
2. Next.js Documentation. (2024). Next.js by Vercel. https://nextjs.org/docs
3. Mono API Documentation. (2024). Connect to African Banks. https://docs.mono.co/
4. DeepSeek Documentation. (2024). AI API Reference. https://api.deepseek.com/
5. Docker Documentation. (2024). Compose File Reference. https://docs.docker.com/compose/
6. OWASP. (2024). Web Security Testing Guide. https://owasp.org/

---

**Repository**: https://github.com/yourusername/finsight-ai-prototype
**Live Demo**: [To be deployed]
**Test Credentials**: test2@example.com / testpassword123