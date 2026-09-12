from pydantic import BaseModel, Field


class OrderCreate(BaseModel):
    product: str
    quantity: int = Field(gt=0)


class OrderStatusUpdate(BaseModel):
    status: str
