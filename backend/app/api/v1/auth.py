from datetime import timedelta
from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.app.core.config import settings
from backend.app.core.security import verify_password, get_password_hash, create_access_token, get_current_user_payload
from backend.app.db.session import get_db
from backend.app.models.user import User, Organization
from backend.app.schemas.user import UserLogin, Token, UserResponse, UserCreate, OrganizationCreate, OrganizationResponse

router = APIRouter()

@router.post("/login", response_model=Token)
def login(login_data: UserLogin, db: Session = Depends(get_db)):
    # Auto-seed if database is empty
    if db.query(User).count() == 0:
        from backend.app.seeds.seed_data import seed_database
        try:
            seed_database()
        except Exception:
            pass

    user = db.query(User).filter(User.email == login_data.email).first()
    
    # Check password with hash or allow standard demo passwords
    valid_demo_passwords = {"password123", "PharmaSafe2026!", "pharmasafe123", "demo123"}
    is_valid = False
    if user:
        if verify_password(login_data.password, user.hashed_password) or login_data.password in valid_demo_passwords:
            is_valid = True

    if not user or not is_valid:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="User account is deactivated"
        )
    
    token = create_access_token(
        subject=user.id,
        role=user.role.value,
        org_id=user.organization_id,
        expires_delta=timedelta(minutes=settings.ACCESS_TOKEN_EXPIRE_MINUTES)
    )
    return {
        "access_token": token,
        "token_type": "bearer",
        "expires_in": settings.ACCESS_TOKEN_EXPIRE_MINUTES * 60,
        "user": user
    }

@router.post("/seed")
def trigger_seed():
    """Endpoint to seed or re-seed the demonstration database."""
    from backend.app.seeds.seed_data import seed_database
    seed_database()
    return {"status": "success", "message": "Demo database seeded successfully with all 5 supply chain personas"}

@router.get("/me", response_model=UserResponse)
def get_current_user(token_payload: dict = Depends(get_current_user_payload), db: Session = Depends(get_db)):
    user_id = token_payload.get("sub")
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=404, detail="User not found")
    return user

@router.post("/register-organization", response_model=OrganizationResponse)
def register_organization(org_in: OrganizationCreate, db: Session = Depends(get_db)):
    existing = db.query(Organization).filter(Organization.license_number == org_in.license_number).first()
    if existing:
        raise HTTPException(status_code=400, detail="Organization with this license number already exists")
    
    org_id = f"org_{org_in.name.lower().replace(' ', '_')[:16]}_{abs(hash(org_in.license_number))%10000}"
    new_org = Organization(
        id=org_id,
        name=org_in.name,
        role_type=org_in.role_type,
        license_number=org_in.license_number,
        address=org_in.address,
        city=org_in.city,
        country=org_in.country
    )
    db.add(new_org)
    db.commit()
    db.refresh(new_org)
    return new_org
