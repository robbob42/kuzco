from pydantic import BaseModel
from typing import Optional
from datetime import date

# --- User Schemas ---
class UserBase(BaseModel):
    email: str
    display_name: str
    is_active: bool = True

class UserCreate(UserBase):
    pass

class UserRead(UserBase):
    id: int

    class Config:
        from_attributes = True

# --- Availability Schemas ---
class AvailabilityBase(BaseModel):
    date: date

class AvailabilityCreate(AvailabilityBase):
    available: bool # Used for the toggle logic in the API

class AvailabilityRead(AvailabilityBase):
    user_id: int

    class Config:
        from_attributes = True