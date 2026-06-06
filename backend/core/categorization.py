"""
Auto-categorization logic for transactions
"""
import re
from typing import Optional
import logging

logger = logging.getLogger(__name__)

# Keyword mappings for Nigerian transaction patterns
CATEGORY_PATTERNS = {
    'Food & Dining': [
        r'restaurant', r'eatery', r'chicken republic', r'mr biggs', r'kfc',
        r'dominos', r'pizza', r'food', r'lunch', r'dinner', r'breakfast',
        r'cafe', r'coffee', r'tantalizers', r'sweet sensation', r'bukka',
        r'mama put', r'suya', r'shawarma', r'coldstone', r'shoprite.*food',
        r'uber.*eats', r'jumia.*food', r'glovo'
    ],
    'Transportation': [
        r'uber', r'bolt', r'taxify', r'transport', r'fuel', r'petrol',
        r'diesel', r'car.*maintenance', r'mechanic', r'parking', r'toll',
        r'danfo', r'keke', r'okada', r'brt', r'lag.*ferry', r'motor.*park'
    ],
    'Shopping': [
        r'shoprite', r'spar', r'game', r'jumia', r'konga', r'mall',
        r'market', r'store', r'shop', r'supermarket', r'boutique',
        r'balogun', r'computer.*village', r'yaba', r'tejuosho'
    ],
    'Utilities': [
        r'nepa', r'phcn', r'electricity', r'ikeja.*electric', r'eko.*electric',
        r'water', r'gas', r'internet', r'mtn', r'glo', r'airtel', r'9mobile',
        r'data', r'airtime', r'recharge', r'subscription', r'dstv', r'gotv',
        r'netflix', r'showmax', r'starlink'
    ],
    'Entertainment': [
        r'cinema', r'movie', r'concert', r'show', r'event', r'ticket',
        r'genesis', r'filmhouse', r'silverbird', r'beach', r'club',
        r'lounge', r'bar', r'games', r'bowling', r'swimming', r'gym'
    ],
    'Healthcare': [
        r'hospital', r'clinic', r'pharmacy', r'doctor', r'medical',
        r'health', r'drug', r'medicine', r'laboratory', r'test',
        r'dental', r'optical', r'wellness', r'vaccination'
    ],
    'Education': [
        r'school', r'university', r'tuition', r'fees', r'books',
        r'stationery', r'course', r'training', r'exam', r'jamb',
        r'waec', r'neco', r'library', r'tutorial'
    ],
    'Rent & Housing': [
        r'rent', r'landlord', r'accommodation', r'housing', r'estate',
        r'property', r'maintenance', r'repairs', r'plumber', r'electrician',
        r'carpenter', r'painting'
    ],
    'Salary & Income': [
        r'salary', r'wage', r'payment', r'income', r'allowance', r'bonus',
        r'commission', r'dividend', r'interest', r'credit.*alert'
    ],
    'Transfer': [
        r'transfer', r'send.*money', r'receive.*money', r'withdrawal',
        r'deposit', r'atm', r'pos', r'bank.*charge', r'stamp.*duty'
    ],
    'Savings & Investment': [
        r'savings', r'investment', r'fixed.*deposit', r'mutual.*fund',
        r'stocks', r'shares', r'contribution', r'cooperative', r'ajo',
        r'esusu', r'piggybank', r'cowrywise', r'piggyvest'
    ],
    'Loan & Debt': [
        r'loan', r'debt', r'repayment', r'interest', r'borrowing',
        r'credit', r'overdraft', r'mortgage'
    ],
    'Charity & Gifts': [
        r'donation', r'charity', r'gift', r'tithe', r'offering',
        r'contribution', r'support', r'help'
    ],
    'Insurance': [
        r'insurance', r'premium', r'policy', r'claim', r'cover'
    ],
    'Travel': [
        r'flight', r'airline', r'hotel', r'booking', r'visa', r'passport',
        r'vacation', r'trip', r'tourism', r'airport'
    ]
}


def auto_categorize_transaction(description: str, merchant_name: str, amount: int) -> Optional[str]:
    """
    Automatically categorize a transaction based on description and merchant name

    Args:
        description: Transaction description
        merchant_name: Merchant/vendor name
        amount: Transaction amount (negative for debits, positive for credits)

    Returns:
        Category name or None if no match found
    """
    # Combine description and merchant name for better matching
    text_to_match = f"{description} {merchant_name}".lower()

    # First check if it's income (positive amount)
    if amount > 0:
        # Check for salary/income patterns
        for pattern in CATEGORY_PATTERNS.get('Salary & Income', []):
            if re.search(pattern, text_to_match, re.IGNORECASE):
                return 'Salary & Income'
        # Default positive transactions to income
        return 'Salary & Income'

    # For expenses (negative amounts), check all categories
    for category, patterns in CATEGORY_PATTERNS.items():
        if category == 'Salary & Income':  # Skip income for negative amounts
            continue

        for pattern in patterns:
            if re.search(pattern, text_to_match, re.IGNORECASE):
                logger.info(f"Auto-categorized '{merchant_name}' as '{category}' (pattern: {pattern})")
                return category

    # Default category for uncategorized expenses
    if amount < 0:
        return 'Uncategorized Expense'

    return 'Uncategorized'


def bulk_categorize_transactions(transactions):
    """
    Categorize multiple transactions
    """
    categorized = []
    for txn in transactions:
        if not txn.category:  # Only categorize if no category exists
            category_name = auto_categorize_transaction(
                txn.description or '',
                txn.merchant_name or '',
                txn.amount_minor
            )
            if category_name:
                # Get or create the category
                from .models import Category
                category, created = Category.objects.get_or_create(
                    name=category_name,
                    defaults={
                        'kind': 'income' if txn.amount_minor > 0 else 'expense',
                        'is_system': True
                    }
                )
                txn.category = category
                txn.save()
                categorized.append(txn)
                logger.info(f"Categorized transaction {txn.id} as {category_name}")

    return categorized


def get_category_suggestions(description: str, merchant_name: str, amount: int, limit: int = 3):
    """
    Get top category suggestions for a transaction
    """
    text_to_match = f"{description} {merchant_name}".lower()
    scores = {}

    for category, patterns in CATEGORY_PATTERNS.items():
        score = 0
        for pattern in patterns:
            if re.search(pattern, text_to_match, re.IGNORECASE):
                score += 1
        if score > 0:
            scores[category] = score

    # Sort by score and return top suggestions
    sorted_categories = sorted(scores.items(), key=lambda x: x[1], reverse=True)
    suggestions = [cat for cat, score in sorted_categories[:limit]]

    # Add default suggestion based on amount
    if amount > 0 and 'Salary & Income' not in suggestions:
        suggestions.append('Salary & Income')
    elif amount < 0 and len(suggestions) < limit:
        suggestions.append('Uncategorized Expense')

    return suggestions