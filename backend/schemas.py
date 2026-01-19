from pydantic import BaseModel
from typing import Optional, List
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
    available: bool # True = Create record, False = Delete record

class AvailabilityRead(AvailabilityBase):
    user_id: int

    class Config:
        from_attributes = True

class AvailabilityAggregate(BaseModel):
    date: date
    count: int
    total_active_users: int
    available_users: List[str] # Added list of names