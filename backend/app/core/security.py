import os
import hashlib
import hmac
from datetime import datetime, timedelta, timezone
from typing import Any, List, Optional, Union
from jose import jwt, JWTError
from fastapi import Depends, HTTPException, status
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from backend.app.core.config import settings

security_bearer = HTTPBearer(auto_error=False)

def get_password_hash(password: str) -> str:
    """Hash password using PBKDF2-HMAC-SHA256 with dynamic salt"""
    salt = os.urandom(16).hex()
    pwd_bytes = password.encode('utf-8')
    key = hashlib.pbkdf2_hmac('sha256', pwd_bytes, salt.encode('utf-8'), 100000)
    return f"{salt}${key.hex()}"

def verify_password(plain_password: str, hashed_password: str) -> bool:
    """Verify PBKDF2 hashed password"""
    try:
        salt, key_hex = hashed_password.split('$')
        pwd_bytes = plain_password.encode('utf-8')
        new_key = hashlib.pbkdf2_hmac('sha256', pwd_bytes, salt.encode('utf-8'), 100000)
        return hmac.compare_digest(new_key.hex(), key_hex)
    except Exception:
        return False

def create_access_token(subject: Union[str, Any], role: str, org_id: Optional[str] = None, expires_delta: Optional[timedelta] = None) -> str:
    if expires_delta:
        expire = datetime.now(timezone.utc) + expires_delta
    else:
        expire = datetime.now(timezone.utc) + timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    
    to_encode = {
        "exp": expire,
        "sub": str(subject),
        "role": role,
        "org_id": org_id
    }
    encoded_jwt = jwt.encode(to_encode, settings.SECRET_KEY, algorithm=settings.ALGORITHM)
    return encoded_jwt

def decode_access_token(token: str) -> dict:
    try:
        payload = jwt.decode(token, settings.SECRET_KEY, algorithms=[settings.ALGORITHM])
        return payload
    except JWTError:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials or token expired",
            headers={"WWW-Authenticate": "Bearer"},
        )

class RoleChecker:
    def __init__(self, allowed_roles: List[str]):
        self.allowed_roles = allowed_roles

    def __call__(self, auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> dict:
        if not auth:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Authentication required",
                headers={"WWW-Authenticate": "Bearer"},
            )
        payload = decode_access_token(auth.credentials)
        user_role = payload.get("role")
        if not user_role or (self.allowed_roles and user_role not in self.allowed_roles and "ADMIN" != user_role):
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail=f"Operation not permitted. Required roles: {self.allowed_roles}, your role: {user_role}",
            )
        return payload

def get_current_user_payload(auth: Optional[HTTPAuthorizationCredentials] = Depends(security_bearer)) -> dict:
    if not auth:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Authentication required",
            headers={"WWW-Authenticate": "Bearer"},
        )
    return decode_access_token(auth.credentials)
