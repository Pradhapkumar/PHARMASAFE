from datetime import datetime
from typing import Optional
from pydantic import BaseModel, EmailStr
from backend.app.models.user import RoleEnum

class UserBase(BaseModel):
    email: EmailStr
    full_name: str
    role: RoleEnum
    organization_id: Optional[str] = None

class UserCreate(UserBase):
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(UserBase):
    id: str
    is_active: bool
    created_at: datetime

    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    expires_in: int
    user: UserResponse

class OrganizationBase(BaseModel):
    name: str
    role_type: RoleEnum
    license_number: str
    address: Optional[str] = None
    city: Optional[str] = None
    country: str = "India"

class OrganizationCreate(OrganizationBase):
    pass

class OrganizationResponse(OrganizationBase):
    id: str
    is_verified: bool
    created_at: datetime

    class Config:
        from_attributes = True
