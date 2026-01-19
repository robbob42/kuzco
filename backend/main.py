from typing import List
from datetime import date
from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import func
from backend import models, database, auth, schemas

# Initialize DB Tables on startup
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Kuzco", version="0.4.0")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# --- Utilities ---
@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.4.0"}

# --- User Endpoints ---
@app.get("/api/users/me", response_model=schemas.UserRead)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    """
    Returns the currently authenticated user.
    """
    return current_user

# --- Availability Endpoints ---

@app.get("/api/availability/me", response_model=List[date])
async def get_my_availability(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Returns a list of dates where the current user is marked available.
    """
    results = db.query(models.Availability.date)\
        .filter(models.Availability.user_id == current_user.id)\
        .all()
    
    return [r.date for r in results]

@app.post("/api/availability")
async def toggle_availability(
    payload: schemas.AvailabilityCreate,
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Sparse Logic:
    - If payload.available is True -> INSERT row (if not exists).
    - If payload.available is False -> DELETE row (if exists).
    """
    existing_record = db.query(models.Availability).filter(
        models.Availability.user_id == current_user.id,
        models.Availability.date == payload.date
    ).first()

    if payload.available:
        if not existing_record:
            new_record = models.Availability(user_id=current_user.id, date=payload.date)
            db.add(new_record)
            db.commit()
    else:
        if existing_record:
            db.delete(existing_record)
            db.commit()
    
    return {"status": "success", "date": payload.date, "available": payload.available}

@app.get("/api/availability/aggregate", response_model=List[schemas.AvailabilityAggregate])
async def get_aggregate_availability(
    current_user: models.User = Depends(auth.get_current_user),
    db: Session = Depends(database.get_db)
):
    """
    Returns the 'Heatmap' data with user names.
    - Only counts Active users.
    - Returns [ {date, count, total_active_users, available_users}, ... ]
    """
    # 1. Get Total Active Users
    total_active = db.query(models.User).filter(models.User.is_active == True).count()

    # 2. Fetch raw data: Date + Display Name
    # We join availability with users to get the names
    raw_results = db.query(models.Availability.date, models.User.display_name)\
        .join(models.User)\
        .filter(models.User.is_active == True)\
        .all()

    # 3. Process in Python (Group by Date)
    # Structure: { date_obj: ["Rob", "Shane"], ... }
    agg_map = {}
    for r in raw_results:
        if r.date not in agg_map:
            agg_map[r.date] = []
        agg_map[r.date].append(r.display_name)

    # 4. Build Response List
    response = []
    for date_key, names in agg_map.items():
        response.append(schemas.AvailabilityAggregate(
            date=date_key,
            count=len(names),
            total_active_users=total_active,
            available_users=names
        ))

    return response