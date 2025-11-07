"""
Encryption utilities for API keys
Uses Fernet (symmetric encryption) for encrypting exchange API keys
"""

import os
import base64
import secrets
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

# Get encryption key from environment
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "")

def get_encryption_key() -> bytes:
    """Get encryption key from environment variable.
    
    In production, ENCRYPTION_KEY must be set as a valid Fernet key (32-byte base64 URL-safe).
    For security, keys should be generated using: Fernet.generate_key()
    """
    if not ENCRYPTION_KEY:
        raise ValueError(
            "ENCRYPTION_KEY environment variable is required. "
            "Generate a key using: from cryptography.fernet import Fernet; Fernet.generate_key()"
        )
    
    # Try to use as Fernet key directly (base64 URL-safe)
    try:
        # Validate it's a valid Fernet key
        Fernet(ENCRYPTION_KEY.encode())
        return ENCRYPTION_KEY.encode()
    except Exception:
        # If not a valid Fernet key, raise error instead of deriving
        # This prevents using weak keys derived from passwords
        raise ValueError(
            "ENCRYPTION_KEY must be a valid Fernet key (32-byte base64 URL-safe). "
            "Generate one using: from cryptography.fernet import Fernet; Fernet.generate_key()"
        )

def encrypt_value(value: str) -> str:
    """Encrypt a string value"""
    if not value:
        return ""
    
    key = get_encryption_key()
    f = Fernet(key)
    encrypted = f.encrypt(value.encode())
    return base64.b64encode(encrypted).decode('utf-8')

def decrypt_value(encrypted_value: str) -> str:
    """Decrypt a string value"""
    if not encrypted_value:
        return ""
    
    try:
        key = get_encryption_key()
        f = Fernet(key)
        encrypted_bytes = base64.b64decode(encrypted_value.encode('utf-8'))
        decrypted = f.decrypt(encrypted_bytes)
        return decrypted.decode('utf-8')
    except Exception as e:
        print(f"Decryption error: {e}")
        raise ValueError(f"Failed to decrypt value: {e}")

