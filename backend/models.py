from sqlalchemy import Column, Integer, String, Boolean, Date, ForeignKey, UniqueConstraint
from sqlalchemy.orm import relationship
from backend.database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    email = Column(String, unique=True, index=True, nullable=False)
    display_name = Column(String, nullable=False)
    is_active = Column(Boolean, default=True)

    # Relationship to Availability
    availabilities = relationship("Availability", back_populates="owner", cascade="all, delete-orphan")

class Availability(Base):
    __tablename__ = "availability"

    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"), nullable=False)
    date = Column(Date, nullable=False)

    owner = relationship("User", back_populates="availabilities")

    # Sparse Model Constraint: A user can only have ONE entry per date.
    # If the row exists, they are available. If not, they are unavailable.
    __table_args__ = (UniqueConstraint('user_id', 'date', name='_user_date_uc'),)