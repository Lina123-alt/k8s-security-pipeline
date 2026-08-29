from fastapi import Depends, HTTPException, status
from app.auth.security import verify_token


def require_roles(*required_roles: str):
    def role_checker(payload: dict = Depends(verify_token)):
        user_role = payload.get("role")

        if user_role not in required_roles:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Insufficient permissions"
            )

        return payload

    return role_checker
