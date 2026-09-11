"""Thin repository layer for Organization DB queries."""
from typing import List, Optional
from sqlalchemy.orm import Session
from backend.app.models.user import Organization, RoleEnum


def get_org_by_id(db: Session, org_id: str) -> Optional[Organization]:
    return db.query(Organization).filter(Organization.id == org_id).first()


def list_organizations(
    db: Session,
    role_type: Optional[RoleEnum] = None,
    limit: int = 100,
    offset: int = 0,
) -> List[Organization]:
    query = db.query(Organization)
    if role_type:
        query = query.filter(Organization.role_type == role_type)
    return query.offset(offset).limit(limit).all()
