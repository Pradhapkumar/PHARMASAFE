import enum
from datetime import datetime, timezone
from sqlalchemy import Column, String, Boolean, DateTime, Enum, ForeignKey, Text
from sqlalchemy.orm import relationship
from backend.app.db.base import Base

class RoleEnum(str, enum.Enum):
    ADMIN = "ADMIN"
    MANUFACTURER = "MANUFACTURER"
    DISTRIBUTOR = "DISTRIBUTOR"
    PHARMACY = "PHARMACY"
    DISPOSAL_FACILITY = "DISPOSAL_FACILITY"
    REGULATOR_AUDITOR = "REGULATOR_AUDITOR"

class Organization(Base):
    __tablename__ = "organizations"

    id = Column(String(64), primary_key=True, index=True)
    name = Column(String(255), nullable=False)
    role_type = Column(Enum(RoleEnum), nullable=False)
    license_number = Column(String(128), unique=True, nullable=False)
    address = Column(Text, nullable=True)
    city = Column(String(128), nullable=True)
    country = Column(String(128), default="India")
    is_verified = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    users = relationship("User", back_populates="organization")
    batches = relationship("Batch", foreign_keys="[Batch.manufacturer_id]", back_populates="manufacturer_org")

class User(Base):
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    email = Column(String(255), unique=True, index=True, nullable=False)
    hashed_password = Column(String(255), nullable=False)
    full_name = Column(String(255), nullable=False)
    role = Column(Enum(RoleEnum), nullable=False)
    organization_id = Column(String(64), ForeignKey("organizations.id"), nullable=True)
    is_active = Column(Boolean, default=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    organization = relationship("Organization", back_populates="users")
