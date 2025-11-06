"""
Encryption utilities for API keys
Uses Fernet (symmetric encryption) for encrypting exchange API keys
"""

import os
import base64
from cryptography.fernet import Fernet
from cryptography.hazmat.primitives import hashes
from cryptography.hazmat.primitives.kdf.pbkdf2 import PBKDF2HMAC
from cryptography.hazmat.backends import default_backend

# Get encryption key from environment or generate one
ENCRYPTION_KEY = os.getenv("ENCRYPTION_KEY", "")

def get_encryption_key() -> bytes:
    """Get or generate encryption key"""
    if ENCRYPTION_KEY:
        # Try to use as Fernet key directly (base64 URL-safe)
        try:
            # If it's already a valid Fernet key, use it
            Fernet(ENCRYPTION_KEY.encode())
            return ENCRYPTION_KEY.encode()
        except:
            # If not, derive a key from the string
            kdf = PBKDF2HMAC(
                algorithm=hashes.SHA256(),
                length=32,
                salt=b'tradeeon_salt',  # In production, use random salt per user
                iterations=100000,
                backend=default_backend()
            )
            key = base64.urlsafe_b64encode(kdf.derive(ENCRYPTION_KEY.encode()))
            return key
    else:
        # Generate a key (for development only - should be set in production)
        # WARNING: This will generate a new key each time if ENCRYPTION_KEY is not set
        # In production, ENCRYPTION_KEY must be set as environment variable
        key = Fernet.generate_key()
        print("WARNING: Generated new encryption key. Set ENCRYPTION_KEY env var for production!")
        print(f"Generated key (save this): {key.decode()}")
        return key

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

