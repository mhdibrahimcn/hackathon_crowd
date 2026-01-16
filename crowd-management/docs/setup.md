# Crowd Management App - Project Setup Guide

This document outlines the complete project structure and setup instructions for the Crowd Management App, built with React (Frontend) and FastAPI (Backend).

## Project Overview

**Stack:** React + FastAPI  
**Location:** `/Users/mac/Documents/cn/hackathon/crowd-management/`  
**Approach:** Phase-by-phase implementation with in-memory storage for rapid development

---

## Directory Structure

```
crowd-management/
├── backend/                    # FastAPI Backend
│   ├── main.py                # Main FastAPI application
│   ├── requirements.txt       # Python dependencies
│   ├── models.py              # In-memory data models
│   ├── routes/                # API route handlers
│   │   ├── admin.py          # Admin location/exit endpoints
│   │   ├── user.py           # User heartbeat/nearest exit endpoints
│   │   ├── sos.py            # SOS alert endpoints
│   │   └── chat.py           # Chat message endpoints
│   ├── utils/                 # Utility functions
│   │   └── geo.py            # Geographic calculations (Haversine)
│   └── tests/                 # Backend tests
│       └── test_api.py
├── frontend/                  # React Frontend
│   ├── public/
│   │   └── index.html
│   ├── src/
│   │   ├── components/
│   │   │   ├── Map/
│   │   │   │   ├── MapComponent.jsx
│   │   │   │   ├── LocationMarker.jsx
│   │   │   │   └── ExitMarker.jsx
│   │   │   ├── Admin/
│   │   │   │   ├── AdminPanel.jsx
│   │   │   │   └── LocationSetter.jsx
│   │   │   ├── User/
│   │   │   │   ├── UserView.jsx
│   │   │   │   └── NearestExitDisplay.jsx
│   │   │   ├── SOS/
│   │   │   │   ├── SOSButton.jsx
│   │   │   │   └── SOSAlerts.jsx
│   │   │   └── Chat/
│   │   │       └── ChatWindow.jsx
│   │   ├── hooks/
│   │   │   ├── useGeolocation.js
│   │   │   ├── useHeartbeat.js
│   │   │   └── usePolling.js
│   │   ├── services/
│   │   │   └── api.js        # API service layer
│   │   ├── utils/
│   │   │   └── geo.js        # Geographic calculations
│   │   ├── App.jsx
│   │   ├── App.css
│   │   ├── index.js
│   │   └── index.css
│   ├── package.json
│   └── vite.config.js
├── docs/
│   └── setup.md              # This file
├── README.md                  # Project documentation
└── .env                       # Environment variables (create from template)
```

---

## Environment Configuration

Create a `.env` file in the project root with the following variables:

```env
# Backend Configuration
BACKEND_HOST=0.0.0.0
BACKEND_PORT=8000
CORS_ORIGIN=http://localhost:5173

# Frontend Configuration
VITE_API_BASE_URL=http://localhost:8000/api
VITE_MAP_CENTER_LAT=40.7128
VITE_MAP_CENTER_LNG=-74.0060
```

---

## Backend Setup

### Python Dependencies

Create `backend/requirements.txt`:

```txt
fastapi==0.109.0
uvicorn[standard]==0.27.0
python-multipart==0.0.6
python-dotenv==1.0.0
requests==2.31.0
httpx==0.26.0
pytest==7.4.4
pytest-asyncio==0.23.3
```

### Initializing Backend

```bash
cd crowd-management
python3 -m venv backend/venv
source backend/venv/bin/activate
pip install -r backend/requirements.txt
```

### Backend File Structure

#### `backend/main.py` (Main Application)

```python
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
from models import init_storage

@asynccontextmanager
async def lifespan(app: FastAPI):
    """Initialize in-memory storage on startup"""
    init_storage()
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

@app.get("/")
async def root():
    return {"message": "Crowd Management API", "status": "running"}

@app.get("/health")
async def health_check():
    return {"status": "healthy"}
```

#### `backend/models.py` (In-Memory Storage)

```python
from datetime import datetime, timedelta
from typing import Dict, List, Optional

# In-memory storage for hackathon (replace with database in production)
admin_location: Optional[Dict] = None
exit_points: List[Dict] = []
active_users: Dict[str, Dict] = {}
sos_alerts: List[Dict] = []
chat_messages: List[Dict] = []

def init_storage():
    """Initialize storage with default values"""
    global admin_location, exit_points, active_users, sos_alerts, chat_messages
    admin_location = None
    exit_points = []
    active_users = {}
    sos_alerts = []
    chat_messages = []
    print("In-memory storage initialized")

def cleanup_stale_users(max_age_seconds: int = 30):
    """Remove users who haven't sent heartbeat recently"""
    global active_users
    cutoff = datetime.now() - timedelta(seconds=max_age_seconds)
    stale_users = [
        user_id for user_id, data in active_users.items()
        if data.get("timestamp", datetime.min) < cutoff
    ]
    for user_id in stale_users:
        del active_users[user_id]
    return stale_users
```

---

## Frontend Setup

### React Dependencies

Create `frontend/package.json`:

```json
{
  "name": "crowd-management-frontend",
  "private": true,
  "version": "1.0.0",
  "type": "module",
  "scripts": {
    "dev": "vite",
    "build": "vite build",
    "preview": "vite preview",
    "test": "vitest"
  },
  "dependencies": {
    "react": "^18.2.0",
    "react-dom": "^18.2.0",
    "leaflet": "^1.9.4",
    "react-leaflet": "^4.2.1",
    "leaflet.heat": "^0.2.0",
    "react-leaflet-heatmap-layer": "^2.0.0",
    "uuid": "^9.0.1",
    "axios": "^1.6.5"
  },
  "devDependencies": {
    "@types/react": "^18.2.48",
    "@types/react-dom": "^18.2.18",
    "@vitejs/plugin-react": "^4.2.1",
    "vite": "^5.0.12",
    "vitest": "^1.2.1"
  }
}
```

### Initializing Frontend

```bash
cd crowd-management/frontend
npm install
```

### Frontend Configuration

Create `frontend/vite.config.js`:

```javascript
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:8000',
        changeOrigin: true
      }
    }
  }
})
```

### Core Frontend Components

#### `frontend/src/App.jsx` (Main Application)

```javascript
import React, { useState, useEffect } from 'react'
import MapComponent from './components/Map/MapComponent'
import AdminPanel from './components/Admin/AdminPanel'
import UserView from './components/User/UserView'
import SOSButton from './components/SOS/SOSButton'
import SOSAlerts from './components/SOS/SOSAlerts'
import ChatWindow from './components/Chat/ChatWindow'
import { v4 as uuidv4 } from 'uuid'
import './App.css'

function App() {
  const [mode, setMode] = useState('user') // 'admin' or 'user'
  const [userId] = useState(() => uuidv4())
  const [location, setLocation] = useState(null)
  const [showChat, setShowChat] = useState(false)
  const [chatPartner, setChatPartner] = useState(null)

  return (
    <div className="app">
      <header className="header">
        <h1>Crowd Management</h1>
        <div className="mode-toggle">
          <button 
            className={mode === 'admin' ? 'active' : ''}
            onClick={() => setMode('admin')}
          >
            Admin Mode
          </button>
          <button 
            className={mode === 'user' ? 'active' : ''}
            onClick={() => setMode('user')}
          >
            User Mode
          </button>
        </div>
      </header>

      <main className="main-content">
        <div className="map-container">
          <MapComponent 
            mode={mode}
            userId={userId}
            location={location}
            setLocation={setLocation}
          />
        </div>

        {mode === 'admin' && (
          <AdminPanel 
            onChatWithUser={(partnerId) => {
              setChatPartner(partnerId)
              setShowChat(true)
            }}
          />
        )}

        {mode === 'user' && (
          <UserView location={location} />
        )}

        {mode === 'user' && (
          <SOSButton 
            userId={userId} 
            location={location} 
          />
        )}

        {mode === 'admin' && (
          <SOSAlerts 
            onChatWithUser={(partnerId) => {
              setChatPartner(partnerId)
              setShowChat(true)
            }}
          />
        )}
      </main>

      {showChat && (
        <ChatWindow 
          userId={userId}
          partnerId={chatPartner}
          onClose={() => {
            setShowChat(false)
            setChatPartner(null)
          }}
        />
      )}
    </div>
  )
}

export default App
```

---

## Phase-by-Phase Implementation

### Phase 1: Core Map & Basic Admin Setup

**Backend Endpoints:**
- `POST /api/admin/location` - Store admin location
- `POST /api/admin/exits` - Store exit points
- `GET /api/locations` - Get all locations

**Frontend Components:**
- MapComponent with Leaflet
- Click handlers for placing markers
- Admin location setter
- Exit point setter

### Phase 2: User View & Nearest Exit

**Backend Endpoints:**
- `POST /api/nearest-exit` - Calculate nearest exit

**Frontend Components:**
- User geolocation hook
- Distance calculation (Haversine formula)
- Nearest exit highlighter
- Admin/User mode toggle

### Phase 3: Crowd Density Heatmap

**Backend Endpoints:**
- `POST /api/user/heartbeat` - Store user location
- `GET /api/heatmap` - Get active user locations

**Frontend Components:**
- Heartbeat hook (sends location every 10s)
- Heatmap layer component
- Heatmap update interval

### Phase 4: SOS Alert System

**Backend Endpoints:**
- `POST /api/sos/trigger` - Trigger SOS alert
- `GET /api/sos/active` - Get active SOS alerts

**Frontend Components:**
- SOS button (big red button)
- Admin SOS dashboard
- SOS marker with animation
- Audio notification

### Phase 5: Quick Chat

**Backend Endpoints:**
- `POST /api/chat/send` - Send message
- `GET /api/chat/messages` - Get message history

**Frontend Components:**
- Chat modal window
- Message display
- Message input and send button
- Unread message badge

---

## API Endpoints Summary

### Admin Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/admin/location | Set admin location (lat, lng) |
| POST | /api/admin/exits | Set exit points (array of lat/lng) |
| GET | /api/locations | Get admin location and exits |

### User Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/user/heartbeat | Send user location |
| POST | /api/nearest-exit | Get nearest exit from location |

### SOS Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/sos/trigger | Trigger SOS alert |
| GET | /api/sos/active | Get active SOS alerts |

### Chat Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | /api/chat/send | Send chat message |
| GET | /api/chat/messages | Get message history |

---

## Running the Application

### Start Backend

```bash
cd crowd-management/backend
source venv/bin/activate
uvicorn main:app --host 0.0.0.0 --port 8000 --reload
```

### Start Frontend

```bash
cd crowd-management/frontend
npm run dev
```

### Access Application

- Frontend: http://localhost:5173
- Backend API: http://localhost:8000
- API Documentation: http://localhost:8000/docs

---

## Testing Commands

### Backend Tests

```bash
cd crowd-management/backend
pytest tests/ -v
```

### Frontend Tests

```bash
cd crowd-management/frontend
npm test
```

---

## Project Features

### Core Features
- Interactive map with Leaflet.js
- Admin location and exit point management
- User mode with nearest exit calculation
- Real-time crowd density heatmap
- SOS emergency alert system
- Quick chat between admin and users

### Technical Features
- RESTful API with FastAPI
- React 18 with Vite
- In-memory storage (no database required)
- CORS enabled for local development
- Polling-based real-time updates

---

## Notes

- All data is stored in-memory and will be lost on server restart
- For hackathon: prioritize working features over perfect code
- Use environment variables for configuration
- CORS is configured for local development only
- Geolocation requires HTTPS in production (or localhost for development)

---

## Troubleshooting

### Common Issues

1. **CORS Errors**: Ensure CORS_ORIGIN matches your frontend URL
2. **Geolocation Denied**: Users must grant location permission
3. **Map Not Loading**: Check Leaflet CSS/JS imports
4. **API Not Responding**: Verify backend is running on correct port

### Debug Commands

```bash
# Check backend status
curl http://localhost:8000/health

# Check API endpoints
curl http://localhost:8000/docs

# Check frontend is running
curl http://localhost:5173
```
