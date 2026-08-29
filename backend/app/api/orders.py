from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from app.auth.security import verify_token

from app.database.database import SessionLocal
from app.models.order import Order
from app.schemas.order import OrderCreate
from app.auth.rbac import require_roles

router = APIRouter(prefix="/orders", tags=["Orders"])


def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()


@router.post("/")
def create_order(
    order: OrderCreate,
    db: Session = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    new_order = Order(
        customer_email=payload["email"],
        product=order.product,
        quantity=order.quantity,
        total_price=order.total_price,
    )

    db.add(new_order)
    db.commit()
    db.refresh(new_order)

    return new_order


@router.get("/{order_id}")
def get_order(
    order_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(verify_token)
):
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    user_role = payload["role"]
    user_email = payload["email"]

    if user_role not in ["operator", "admin"]:
        if order.customer_email != user_email:
            raise HTTPException(
                status_code=403,
                detail="You are not allowed to access this order"
            )

    return order


@router.delete("/{order_id}")
def delete_order(
    order_id: int,
    db: Session = Depends(get_db),
    payload: dict = Depends(require_roles("operator", "admin"))
):
    order = db.query(Order).filter(Order.id == order_id).first()

    if not order:
        raise HTTPException(
            status_code=404,
            detail="Order not found"
        )

    db.delete(order)
    db.commit()

    return {
        "message": "Order deleted successfully",
        "order_id": order_id,
        "deleted_by": payload["email"],
        "role": payload["role"]
    }
