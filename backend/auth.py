import os
from fastapi import Header, Depends, HTTPException, status
from sqlalchemy.orm import Session
from backend.database import get_db
from backend import models

# Configurable via environment variable (default to dev for safety)
ENVIRONMENT = os.getenv("ENVIRONMENT", "dev")

def get_current_user(
    # Cloudflare passes the authenticated email in this header
    cf_access_authenticated_user_email: str | None = Header(default=None),
    db: Session = Depends(get_db)
) -> models.User:
    """
    Dependency that returns the current authenticated user.
    1. Checks Cloudflare Header (Production).
    2. Falls back to Mock User (Development).
    3. Raises 401/403 if unauthorized.
    """
    
    email = cf_access_authenticated_user_email
    
    # --- STRATEGY 1: Production (Cloudflare Header) ---
    if email:
        user = db.query(models.User).filter(models.User.email == email).first()
        if not user:
            # Policy: Only allow users that exist in the DB (seeded users).
            # This prevents random people with valid Cloudflare access from using the app
            # unless we explicitly add them.
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN, 
                detail=f"User {email} is not authorized to use Kuzco."
            )
        return user

    # --- STRATEGY 2: Development (Mock User) ---
    if ENVIRONMENT == "dev":
        # We assume the Seed script has run and created this user
        mock_email = "kronk@dev.local"
        user = db.query(models.User).filter(models.User.email == mock_email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_500_INTERNAL_SERVER_ERROR, 
                detail="Dev environment detected, but 'kronk@dev.local' user is missing. Please run 'pipenv run python -m backend.seed'."
            )
        return user
    
    # --- STRATEGY 3: Unauthorized ---
    raise HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED, 
        detail="Missing Authentication Header"
    )