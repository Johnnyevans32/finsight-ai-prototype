"""
Cache utility functions for Finsight AI
"""
from django.core.cache import cache
from django.conf import settings
import hashlib
import json
import logging

logger = logging.getLogger(__name__)


def make_cache_key(prefix, *args):
    """
    Create a consistent cache key from prefix and arguments
    """
    key_parts = [str(arg) for arg in args]
    key_string = f"{prefix}:{':'.join(key_parts)}"
    return hashlib.md5(key_string.encode()).hexdigest()


def cache_user_transactions(user_id, transactions_data, timeout=300):
    """
    Cache user transactions data
    """
    cache_key = make_cache_key('transactions', user_id)
    try:
        cache.set(cache_key, transactions_data, timeout)
        logger.debug(f"Cached transactions for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to cache transactions: {e}")
        return False


def get_cached_transactions(user_id):
    """
    Get cached transactions for a user
    """
    cache_key = make_cache_key('transactions', user_id)
    try:
        data = cache.get(cache_key)
        if data:
            logger.debug(f"Cache hit for user {user_id} transactions")
        return data
    except Exception as e:
        logger.error(f"Failed to get cached transactions: {e}")
        return None


def cache_ai_response(question, response, timeout=3600):
    """
    Cache AI responses to avoid repeated API calls
    """
    cache_key = make_cache_key('ai_response', question)
    try:
        cache.set(cache_key, response, timeout)
        logger.info(f"Cached AI response for question: {question[:50]}...")
        return True
    except Exception as e:
        logger.error(f"Failed to cache AI response: {e}")
        return False


def get_cached_ai_response(question):
    """
    Get cached AI response
    """
    cache_key = make_cache_key('ai_response', question)
    try:
        data = cache.get(cache_key)
        if data:
            logger.info("Using cached AI response")
        return data
    except Exception as e:
        logger.error(f"Failed to get cached AI response: {e}")
        return None


def cache_financial_summary(user_id, summary_data, timeout=600):
    """
    Cache user's financial summary (dashboard data)
    """
    cache_key = make_cache_key('financial_summary', user_id)
    try:
        cache.set(cache_key, summary_data, timeout)
        logger.info(f"Cached financial summary for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to cache financial summary: {e}")
        return False


def get_cached_financial_summary(user_id):
    """
    Get cached financial summary
    """
    cache_key = make_cache_key('financial_summary', user_id)
    try:
        data = cache.get(cache_key)
        if data:
            logger.info(f"Cache hit for financial summary of user {user_id}")
        return data
    except Exception as e:
        logger.error(f"Failed to get cached financial summary: {e}")
        return None


def invalidate_user_cache(user_id):
    """
    Invalidate all cached data for a user (when data changes)
    """
    try:
        # Clear transactions cache
        transactions_key = make_cache_key('transactions', user_id)
        cache.delete(transactions_key)

        # Clear financial summary cache
        summary_key = make_cache_key('financial_summary', user_id)
        cache.delete(summary_key)

        logger.info(f"Invalidated cache for user {user_id}")
        return True
    except Exception as e:
        logger.error(f"Failed to invalidate cache: {e}")
        return False