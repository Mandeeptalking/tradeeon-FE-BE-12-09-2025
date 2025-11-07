"""
Standard error handling for Tradeeon API
Provides consistent error responses across all endpoints
"""

from fastapi import HTTPException, status
from typing import Optional, Dict, Any
import logging

logger = logging.getLogger(__name__)


class TradeeonError(Exception):
    """Base exception for Tradeeon API errors"""
    
    def __init__(
        self,
        message: str,
        code: str,
        status_code: int = status.HTTP_500_INTERNAL_SERVER_ERROR,
        details: Optional[Dict[str, Any]] = None
    ):
        self.message = message
        self.code = code
        self.status_code = status_code
        self.details = details or {}
        super().__init__(self.message)


class ValidationError(TradeeonError):
    """Validation error (400 Bad Request)"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="VALIDATION_ERROR",
            status_code=status.HTTP_400_BAD_REQUEST,
            details=details
        )


class AuthenticationError(TradeeonError):
    """Authentication error (401 Unauthorized)"""
    
    def __init__(self, message: str = "Authentication required"):
        super().__init__(
            message=message,
            code="AUTHENTICATION_ERROR",
            status_code=status.HTTP_401_UNAUTHORIZED
        )


class AuthorizationError(TradeeonError):
    """Authorization error (403 Forbidden)"""
    
    def __init__(self, message: str = "Insufficient permissions"):
        super().__init__(
            message=message,
            code="AUTHORIZATION_ERROR",
            status_code=status.HTTP_403_FORBIDDEN
        )


class NotFoundError(TradeeonError):
    """Resource not found error (404 Not Found)"""
    
    def __init__(self, resource: str, identifier: Optional[str] = None):
        message = f"{resource} not found"
        if identifier:
            message = f"{resource} with id '{identifier}' not found"
        super().__init__(
            message=message,
            code="NOT_FOUND",
            status_code=status.HTTP_404_NOT_FOUND,
            details={"resource": resource, "identifier": identifier}
        )


class ConflictError(TradeeonError):
    """Resource conflict error (409 Conflict)"""
    
    def __init__(self, message: str, details: Optional[Dict[str, Any]] = None):
        super().__init__(
            message=message,
            code="CONFLICT",
            status_code=status.HTTP_409_CONFLICT,
            details=details
        )


class RateLimitError(TradeeonError):
    """Rate limit exceeded error (429 Too Many Requests)"""
    
    def __init__(self, message: str = "Rate limit exceeded", retry_after: Optional[int] = None):
        details = {}
        if retry_after:
            details["retry_after"] = retry_after
        super().__init__(
            message=message,
            code="RATE_LIMIT_EXCEEDED",
            status_code=status.HTTP_429_TOO_MANY_REQUESTS,
            details=details
        )


class ExternalServiceError(TradeeonError):
    """External service error (502 Bad Gateway)"""
    
    def __init__(self, service: str, message: str):
        super().__init__(
            message=f"External service error: {message}",
            code="EXTERNAL_SERVICE_ERROR",
            status_code=status.HTTP_502_BAD_GATEWAY,
            details={"service": service}
        )


class DatabaseError(TradeeonError):
    """Database error (503 Service Unavailable)"""
    
    def __init__(self, message: str = "Database operation failed"):
        super().__init__(
            message=message,
            code="DATABASE_ERROR",
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE
        )


def create_error_response(error: TradeeonError) -> Dict[str, Any]:
    """Create standardized error response"""
    response = {
        "success": False,
        "error": {
            "code": error.code,
            "message": error.message
        },
        "timestamp": None  # Will be set by middleware
    }
    
    if error.details:
        response["error"]["details"] = error.details
    
    return response


def create_success_response(data: Any = None, message: Optional[str] = None) -> Dict[str, Any]:
    """Create standardized success response"""
    response = {
        "success": True,
        "data": data,
        "timestamp": None  # Will be set by middleware
    }
    
    if message:
        response["message"] = message
    
    return response

