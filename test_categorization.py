#!/usr/bin/env python3
"""Test categorization API endpoints"""

import requests
import json
import sys

# API base URL
BASE_URL = "http://localhost:8000/api"

# Test credentials (adjust as needed)
EMAIL = "testcat@example.com"
PASSWORD = "testpass123"
FULL_NAME = "Test Category User"

# Session for maintaining cookies
session = requests.Session()


def test_auth():
    """Login or register a test user"""
    print("Testing authentication...")

    # First, get CSRF token
    csrf_response = session.get(f"{BASE_URL}/csrf/")
    if csrf_response.status_code != 200:
        print("✗ Failed to get CSRF token")
        return False

    csrf = csrf_response.json()["csrfToken"]

    # Try to register first (will fail if user exists)
    print("Attempting registration...")
    response = session.post(f"{BASE_URL}/auth/register/",
                           json={
                               "email": EMAIL,
                               "full_name": FULL_NAME,
                               "password": PASSWORD,
                               "locale": "en-NG"
                           },
                           headers={"X-CSRFToken": csrf})

    if response.status_code in [200, 201]:
        print("✓ Registered and logged in successfully")
        return True
    elif "already exists" in response.text:
        print("User already exists, attempting login...")

        # User exists, try login
        response = session.post(f"{BASE_URL}/auth/login/",
                               json={
                                   "email": EMAIL,
                                   "password": PASSWORD
                               },
                               headers={"X-CSRFToken": csrf})

        if response.status_code == 200:
            print("✓ Logged in successfully")
            return True
        else:
            print(f"✗ Login failed: {response.text}")
            print(f"  Note: Default password should be {PASSWORD}")
            return False

    print(f"✗ Registration failed: {response.text}")
    return False


def get_csrf_token():
    """Get CSRF token"""
    response = session.get(f"{BASE_URL}/csrf/")
    if response.status_code == 200:
        return response.json()["csrfToken"]
    return None


def test_categories():
    """Test category endpoints"""
    print("\nTesting category endpoints...")

    csrf = get_csrf_token()
    response = session.get(f"{BASE_URL}/categories/", headers={"X-CSRFToken": csrf})

    if response.status_code == 200:
        data = response.json()
        categories = data.get("results", data) if isinstance(data, dict) else data
        print(f"✓ Found {len(categories)} categories")
        return categories
    else:
        print(f"✗ Failed to fetch categories: {response.text}")
        return []


def test_transactions():
    """Test transaction endpoints"""
    print("\nTesting transaction endpoints...")

    csrf = get_csrf_token()
    response = session.get(f"{BASE_URL}/transactions/?no_page=1", headers={"X-CSRFToken": csrf})

    if response.status_code == 200:
        transactions = response.json()
        print(f"✓ Found {len(transactions)} transactions")
        return transactions
    else:
        print(f"✗ Failed to fetch transactions: {response.text}")
        return []


def test_suggest_categories(transaction_id):
    """Test category suggestion endpoint"""
    print(f"\nTesting category suggestions for transaction {transaction_id}...")

    csrf = get_csrf_token()
    url = f"{BASE_URL}/transactions/{transaction_id}/suggest_categories/"
    response = session.get(url, headers={"X-CSRFToken": csrf})

    if response.status_code == 200:
        suggestions = response.json()
        print(f"✓ Got {len(suggestions)} category suggestions:")
        for cat in suggestions:
            print(f"  - {cat['name']} ({cat['kind']})")
        return suggestions
    else:
        print(f"✗ Failed to get suggestions: {response.status_code} - {response.text}")
        return []


def test_categorize_transaction(transaction_id, category_id):
    """Test transaction categorization endpoint"""
    print(f"\nCategorizing transaction {transaction_id} with category {category_id}...")

    csrf = get_csrf_token()
    url = f"{BASE_URL}/transactions/{transaction_id}/categorize/"
    response = session.patch(url,
                           json={"category_id": category_id},
                           headers={"X-CSRFToken": csrf})

    if response.status_code == 200:
        txn = response.json()
        cat_name = txn.get('category_name') or 'None'
        print(f"✓ Transaction categorized as: {cat_name}")
        return txn
    else:
        print(f"✗ Failed to categorize: {response.status_code} - {response.text}")
        return None


def test_auto_categorize():
    """Test bulk auto-categorization"""
    print("\nTesting bulk auto-categorization...")

    csrf = get_csrf_token()
    url = f"{BASE_URL}/transactions/auto_categorize/"
    response = session.post(url, json={}, headers={"X-CSRFToken": csrf})

    if response.status_code == 200:
        result = response.json()
        print(f"✓ {result['message']}")
        return result
    else:
        print(f"✗ Failed to auto-categorize: {response.status_code} - {response.text}")
        return None


def main():
    """Run all tests"""
    print("=" * 60)
    print("CATEGORIZATION API TEST SUITE")
    print("=" * 60)

    # 1. Authenticate
    if not test_auth():
        print("\n❌ Authentication failed. Cannot proceed with tests.")
        sys.exit(1)

    # 2. Get categories
    categories = test_categories()

    # 3. Get transactions
    transactions = test_transactions()

    if not transactions:
        print("\n⚠️  No transactions found. Creating demo transaction...")
        # Would need to create a demo transaction here
        print("Please connect a bank account or create demo data first.")
    else:
        # 4. Test category suggestions for first transaction
        first_txn = transactions[0]
        print(f"\nTesting with transaction: {first_txn['merchant_name']} ({first_txn['amount_minor']/100:.2f})")

        suggestions = test_suggest_categories(first_txn['id'])

        # 5. Test manual categorization if we have suggestions
        if suggestions and categories:
            test_categorize_transaction(first_txn['id'], suggestions[0]['id'])

        # 6. Test bulk auto-categorization
        test_auto_categorize()

    print("\n" + "=" * 60)
    print("TEST SUITE COMPLETE")
    print("=" * 60)


if __name__ == "__main__":
    main()