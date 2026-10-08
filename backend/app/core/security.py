import base64
import hmac
import hashlib
import json
import time
from datetime import datetime, timedelta
from typing import Any, Union, Optional
from app.core.config import settings

def get_password_hash(password: str) -> str:
    """Secure PBKDF2-HMAC-SHA256 password hashing (Python stdlib, crash-free)."""
    salt = settings.SECRET_KEY.encode('utf-8')
    return hashlib.pbkdf2_hmac('sha256', password.encode('utf-8'), salt, 100000).hex()

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify password match using constant-time comparison."""
    computed = get_password_hash(plain_password)
    return hmac.compare_digest(computed, hashed_password)

def create_access_token(subject: Union[str, Any], expires_delta: Optional[timedelta] = None) -> str:
    """Standard JWT token encoder."""
    if expires_delta:
        expire_dt = datetime.utcnow() + expires_delta
    else:
        expire_dt = datetime.utcnow() + timedelta(minutes=settings.JWT_EXPIRE_MINUTES)
    
    header = {"alg": "HS256", "typ": "JWT"}
    payload = {"sub": str(subject), "exp": int(expire_dt.timestamp())}
    
    def b64url(data: bytes) -> str:
        return base64.urlsafe_b64encode(data).rstrip(b'=').decode('utf-8')
    
    hdr_b64 = b64url(json.dumps(header).encode('utf-8'))
    pay_b64 = b64url(json.dumps(payload).encode('utf-8'))
    sig_input = f"{hdr_b64}.{pay_b64}".encode('utf-8')
    
    signature = hmac.new(settings.SECRET_KEY.encode('utf-8'), sig_input, hashlib.sha256).digest()
    sig_b64 = b64url(signature)
    
    return f"{hdr_b64}.{pay_b64}.{sig_b64}"
