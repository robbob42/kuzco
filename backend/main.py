from fastapi import FastAPI, Depends
from fastapi.middleware.cors import CORSMiddleware
from backend import models, database, auth, schemas

# Initialize DB Tables on startup (ensure they exist)
models.Base.metadata.create_all(bind=database.engine)

app = FastAPI(title="Kuzco", version="0.2.0")

# CORS Setup
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/api/health")
async def health_check():
    return {"status": "ok", "version": "0.2.0"}

# Protected Route Example
@app.get("/api/users/me", response_model=schemas.UserRead)
async def read_users_me(current_user: models.User = Depends(auth.get_current_user)):
    """
    Returns the currently authenticated user.
    In Dev: Returns Kronk (Dev)
    In Prod: Returns Cloudflare User
    """
    return current_user