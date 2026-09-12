from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.database.database import SessionLocal
from app.auth.models import User
from app.auth.schemas import UserCreate
from app.auth.security import hash_password, verify_password, create_access_token
from app.auth.rbac import require_roles

router = APIRouter(prefix="/auth", tags=["Authentication"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/register")
def register(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()

    if existing_user:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Cet email est déjà utilisé"
        )

    hashed_password = hash_password(user.password)

    new_user = User(
        email=user.email,
        hashed_password=hashed_password,
    )

    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    return {
        "message": "User created successfully",
        "email": new_user.email,
    }

@router.post("/login")
def login(user: UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(User).filter(User.email == user.email).first()

    if not existing_user:
        return {"message": "Invalid email or password"}

    if not verify_password(user.password, existing_user.hashed_password):
        return {"message": "Invalid email or password"}

    access_token = create_access_token(
        data={
            "sub": str(existing_user.id),
            "email": existing_user.email,
            "role": existing_user.role,
        }
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": existing_user.role,
        "email": existing_user.email,
    }

@router.get("/admin-only")
def admin_only(payload: dict = Depends(require_roles("admin"))):
    return {
        "message": "Welcome Admin",
        "user": payload,
    }
