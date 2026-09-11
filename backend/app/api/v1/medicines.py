import uuid
from typing import List, Optional
from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from backend.app.core.security import RoleChecker, get_current_user_payload
from backend.app.db.session import get_db
from backend.app.models.medicine import Medicine
from backend.app.schemas.batch import MedicineCreate, MedicineResponse

router = APIRouter()


@router.get("", response_model=List[MedicineResponse])
def list_medicines(
    search: Optional[str] = None,
    limit: int = Query(100, le=200),
    offset: int = 0,
    db: Session = Depends(get_db),
):
    """List all medicines in the system. Filterable by search term. Public-accessible for verification."""
    query = db.query(Medicine)
    if search:
        search_term = f"%{search.strip()}%"
        query = query.filter(
            (Medicine.brand_name.ilike(search_term)) |
            (Medicine.generic_name.ilike(search_term)) |
            (Medicine.strength.ilike(search_term)) |
            (Medicine.dosage_form.ilike(search_term))
        )
    return query.order_by(Medicine.brand_name.asc()).offset(offset).limit(limit).all()


@router.get("/{medicine_id}", response_model=MedicineResponse)
def get_medicine(medicine_id: str, db: Session = Depends(get_db)):
    med = db.query(Medicine).filter(Medicine.id == medicine_id).first()
    if not med:
        raise HTTPException(status_code=404, detail="Medicine not found")
    return med


@router.post("", response_model=MedicineResponse, status_code=status.HTTP_201_CREATED)
def create_medicine(
    med_in: MedicineCreate,
    user_payload: dict = Depends(RoleChecker(["MANUFACTURER", "ADMIN"])),
    db: Session = Depends(get_db),
):
    """Register a new medicine. Manufacturer or Admin only."""
    user_role = user_payload.get("role")
    user_org_id = user_payload.get("org_id")

    # If manufacturer, enforce their organization
    manufacturer_id = user_org_id if user_role == "MANUFACTURER" and user_org_id else (med_in.manufacturer_id or "org_pfizer_india")

    # Check for duplicate
    existing = db.query(Medicine).filter(
        Medicine.brand_name.ilike(med_in.brand_name.strip()),
        Medicine.strength.ilike(med_in.strength.strip()),
        Medicine.dosage_form.ilike(med_in.dosage_form.strip()),
        Medicine.manufacturer_id == manufacturer_id
    ).first()
    if existing:
        return existing

    med_id = f"med_{uuid.uuid4().hex[:12]}"
    new_med = Medicine(
        id=med_id,
        brand_name=med_in.brand_name.strip(),
        generic_name=med_in.generic_name.strip(),
        composition=med_in.composition,
        dosage_form=med_in.dosage_form.strip(),
        strength=med_in.strength.strip(),
        storage_temp_min=med_in.storage_temp_min,
        storage_temp_max=med_in.storage_temp_max,
        manufacturer_id=manufacturer_id,
    )
    db.add(new_med)
    db.commit()
    db.refresh(new_med)
    return new_med
