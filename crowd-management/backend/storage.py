import uuid
from datetime import datetime, timedelta
from typing import Dict, List

# In-memory storage for hackathon - event-aware structure
class Storage:
    def __init__(self):
        # Original structure (for backward compatibility)
        self.admin_location = None
        self.exit_points = []
        self.active_users = {}
        self.sos_alerts = []
        self.chat_messages = []
        
        # New event-aware structure
        self.events = {}  # event_id -> Event dict
        self.event_users = {}  # event_id -> {user_id -> User dict}
        self.event_locations = {}  # event_id -> {user_id -> {lat, lng, timestamp}}
        self.event_pois = {}  # event_id -> {poi_id -> POI dict}
        self.event_alerts = {}  # event_id -> [Alert dict]

    def init_storage(self):
        """Initialize storage with default values"""
        self.admin_location = None
        self.exit_points = []
        self.active_users = {}
        self.sos_alerts = []
        self.chat_messages = []
        self.events = {}
        self.event_users = {}
        self.event_locations = {}
        self.event_pois = {}
        self.event_alerts = {}
        print("Storage initialized")

# Create a single instance of Storage
storage = Storage()
