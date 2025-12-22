import os
from fastapi.staticfiles import StaticFiles
from backend.main import app  # Import the production app

# Define the path to the frontend folder
# We go up one level from 'backend' folder
frontend_path = os.path.join(os.path.dirname(__file__), "../frontend")

# Mount the frontend directory to the root "/"
# html=True allows serving 'index.html' automatically at root
app.mount("/", StaticFiles(directory=frontend_path, html=True), name="frontend")

if __name__ == "__main__":
    import uvicorn
    # Allow running this script directly if desired
    uvicorn.run("backend.dev:app", host="127.0.0.1", port=8000, reload=True)