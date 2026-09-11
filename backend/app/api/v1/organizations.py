import uuid
from typing import List, Optional
from datetime import datetime, timezone
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session
from pydantic import BaseModel, Field

from backend.app.core.security import RoleChecker, get_current_user_payload
from backend.app.db.session import get_db
from backend.app.models.user import Organization, RoleEnum
from backend.app.schemas.user import OrganizationResponse, OrganizationCreate

router = APIRouter()


@router.get("", response_model=List[OrganizationResponse])
def list_organizations(
    role_type: Optional[RoleEnum] = None,
    limit: int = Query(100, le=200),
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    """List all organizations. Accessible to authenticated users."""
    query = db.query(Organization)
    if role_type:
        query = query.filter(Organization.role_type == role_type)
    return query.limit(limit).all()


@router.get("/{org_id}", response_model=OrganizationResponse)
def get_organization(
    org_id: str,
    user_payload: dict = Depends(get_current_user_payload),
    db: Session = Depends(get_db),
):
    org = db.query(Organization).filter(Organization.id == org_id).first()
    if not org:
        raise HTTPException(status_code=404, detail="Organization not found")
    return org


@router.post("", response_model=OrganizationResponse, status_code=status.HTTP_201_CREATED)
def create_organization(
    org_in: OrganizationCreate,
    user_payload: dict = Depends(RoleChecker(["ADMIN"])),
    db: Session = Depends(get_db),
):
    """Create a new organization. Admin only."""
    existing = db.query(Organization).filter(
        Organization.license_number == org_in.license_number
    ).first()
    if existing:
        raise HTTPException(
            status_code=400,
            detail="Organization with this license number already exists"
        )
    org_id = f"org_{uuid.uuid4().hex[:16]}"
    new_org = Organization(
        id=org_id,
        name=org_in.name,
        role_type=org_in.role_type,
        license_number=org_in.license_number,
        address=org_in.address,
        city=org_in.city,
        country=org_in.country or "India",
    )
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    return new_org
