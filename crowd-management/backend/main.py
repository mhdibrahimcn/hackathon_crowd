from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import os
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Import routers
from routes.admin import router as admin_router
from routes.user import router as user_router
from routes.sos import router as sos_router
from routes.chat import router as chat_router
from routes.events import router as events_router
import storage

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize in-memory storage on startup"""
    storage.storage.init_storage()
    yield
    # Cleanup on shutdown (if needed)

app = FastAPI(title="Crowd Management API", lifespan=lifespan)

# CORS Configuration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[os.getenv("CORS_ORIGIN", "http://localhost:5173")],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Include routers
app.include_router(admin_router, prefix="/api")
app.include_router(user_router, prefix="/api")
app.include_router(sos_router, prefix="/api")
app.include_router(chat_router, prefix="/api")
app.include_router(events_router, prefix="/api")

@app.get("/")
async def root():
    return {"message": "Crowd Management API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
