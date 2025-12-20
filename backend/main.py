from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel

app = FastAPI(title="Kuzco", version="0.1.0")

# Allow CORS (adjust origins in production if necessary)
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

class HealthResponse(BaseModel):
    status: str
    version: str

@app.get("/api/health", response_model=HealthResponse)
async def health_check():
    """
    Simple health check endpoint to verify backend is running.
    """
    return HealthResponse(status="ok", version="0.1.0")

@app.get("/")
async def root():
    """
    Redirect root to docs or return a message. 
    Since Nginx handles the frontend, this might only be hit 
    if accessing port 8001 directly.
    """
    return {"message": "Kuzco API is running. Access via Nginx for frontend."}