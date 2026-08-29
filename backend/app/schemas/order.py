from pydantic import BaseModel, Field


class OrderCreate(BaseModel):
    product: str = Field(min_length=1, max_length=255)
    quantity: int = Field(gt=0)
    total_price: float = Field(gt=0)
