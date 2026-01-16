import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import axios from 'axios'
import './AdminDashboard.css'

const API = 'http://localhost:8000/api'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom marker icons
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const eventIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Heatmap layer component
function HeatmapLayer({ points }) {
  const map = useMap()
  const heatLayerRef = useRef(null)
  
  useEffect(() => {
    if (!map || !points || points.length === 0) return
    
    import('leaflet.heat').then((heat) => {
      if (heatLayerRef.current) {
        heatLayerRef.current.remove()
      }
      
      const heatPoints = points.map(p => [p.lat, p.lng, 0.5])
      heatLayerRef.current = L.heatLayer(heatPoints, {
        radius: 25,
        blur: 15,
        maxZoom: 17,
        gradient: {
          0.4: '#00d4ff',
          0.6: '#00ff88',
          0.8: '#ffff00',
          1.0: '#ff0000'
        }
      }).addTo(map)
    })
    
    return () => {
      if (heatLayerRef.current) {
        heatLayerRef.current.remove()
      }
    }
  }, [map, points])
  
  return null
}

// Map controller for centering
function MapController({ center }) {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15)
    }
  }, [map, center])
  
  return null
}

function AdminDashboard() {
  const [searchParams, setSearchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [events, setEvents] = useState([])
  const [selectedEvent, setSelectedEvent] = useState(null)
  const [eventUsers, setEventUsers] = useState([])
  const [userLocations, setUserLocations] = useState([])
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showHeatmap, setShowHeatmap] = useState(true)
  
  // Create event form
  const [eventName, setEventName] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [eventDate, setEventDate] = useState('')
  const [eventLat, setEventLat] = useState('')
  const [eventLng, setEventLng] = useState('')
  
  // Map center
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060])
  const [userLocation, setUserLocation] = useState(null)
  
  useEffect(() => {
    loadEvents()
    getUserLocation()
    
    // Check for event in URL
    const eventId = searchParams.get('event')
    if (eventId) {
      selectEventById(eventId)
    }
  }, [searchParams])
  
  // Polling for updates
  useEffect(() => {
    if (!selectedEvent) return
    
    const interval = setInterval(() => {
      loadEventUsers(selectedEvent.id)
      loadUserLocations(selectedEvent.id)
    }, 3000)
    
    return () => clearInterval(interval)
  }, [selectedEvent])
  
  const getUserLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setMapCenter([loc.lat, loc.lng])
        setEventLat(pos.coords.latitude.toFixed(6))
        setEventLng(pos.coords.longitude.toFixed(6))
      },
      () => {
        setEventLat('40.7128')
        setEventLng('-74.0060')
      }
    )
  }
  
  const loadEvents = async () => {
    try {
      const res = await axios.get(`${API}/events`)
      setEvents(res.data)
    } catch (e) {
      console.log('Error loading events:', e)
    }
  }
  
  const loadEventUsers = async (eventId) => {
    try {
      const res = await axios.get(`${API}/events/${eventId}/users`)
      setEventUsers(res.data)
    } catch (e) {
      console.log('Error loading users:', e)
    }
  }
  
  const loadUserLocations = async (eventId) => {
    try {
      const res = await axios.get(`${API}/events/${eventId}/locations`)
      setUserLocations(res.data)
    } catch (e) {
      console.log('Error loading locations:', e)
    }
  }
  
  const selectEventById = async (eventId) => {
    try {
      const res = await axios.get(`${API}/events/${eventId}`)
      setSelectedEvent(res.data)
      if (res.data.lat && res.data.lng) {
        setMapCenter([res.data.lat, res.data.lng])
      }
      loadEventUsers(eventId)
      loadUserLocations(eventId)
    } catch (e) {
      console.log('Error loading event:', e)
    }
  }
  
  const createEvent = async () => {
    if (!eventName.trim()) return alert('Event name is required')
    
    try {
      const res = await axios.post(`${API}/events`, {
        name: eventName,
        description: eventDesc,
        date: eventDate,
        lat: eventLat ? parseFloat(eventLat) : null,
        lng: eventLng ? parseFloat(eventLng) : null
      })
      
      setShowCreateModal(false)
      resetCreateForm()
      loadEvents()
      selectEventById(res.data.id)
    } catch (e) {
      alert('Error creating event')
    }
  }
  
  const deleteEvent = async (eventId) => {
    if (!confirm('Are you sure you want to delete this event?')) return
    
    try {
      await axios.delete(`${API}/events/${eventId}`)
      if (selectedEvent && selectedEvent.id === eventId) {
        setSelectedEvent(null)
        setEventUsers([])
        setUserLocations([])
      }
      loadEvents()
    } catch (e) {
      alert('Error deleting event')
    }
  }
  
  const resetCreateForm = () => {
    setEventName('')
    setEventDesc('')
    setEventDate('')
    getUserLocation()
  }
  
  const goToLocation = () => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng])
    }
  }
  
  return (
    <div className="admin-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            ← Back
          </button>
          <h1>Crowd Management Admin</h1>
        </div>
        <div className="header-right">
          <span className="event-selector">
            {selectedEvent ? selectedEvent.name : 'Select an Event'}
          </span>
          <button className="locate-btn" onClick={goToLocation}>
            📍 Where Am I
          </button>
        </div>
      </header>
      
      <div className="dashboard-content">
        {/* Side Panel */}
        <aside className={`side-panel ${sidebarCollapsed ? 'collapsed' : ''}`}>
          <button 
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
          
          {!sidebarCollapsed && (
            <>
              <div className="panel-section">
                <div className="section-header">
                  <h3>Events</h3>
                  <button 
                    className="create-btn"
                    onClick={() => setShowCreateModal(true)}
                  >
                    +
                  </button>
                </div>
                
                <div className="events-list-panel">
                  {events.map(event => (
                    <div 
                      key={event.id}
                      className={`event-item ${selectedEvent?.id === event.id ? 'active' : ''}`}
                      onClick={() => selectEventById(event.id)}
                    >
                      <div className="event-info">
                        <span className="event-name">{event.name}</span>
                        <span className="event-count">{event.active_users} users</span>
                      </div>
                      <button 
                        className="delete-event-btn"
                        onClick={(e) => {
                          e.stopPropagation()
                          deleteEvent(event.id)
                        }}
                      >
                        ×
                      </button>
                    </div>
                  ))}
                  
                  {events.length === 0 && (
                    <p className="no-events">No events yet. Create one!</p>
                  )}
                </div>
              </div>
              
              {selectedEvent && (
                <div className="panel-section">
                  <div className="section-header">
                    <h3>Selected Event</h3>
                  </div>
                  <div className="selected-event-info">
                    <p><strong>{selectedEvent.name}</strong></p>
                    {selectedEvent.description && <p>{selectedEvent.description}</p>}
                    <div className="event-stats">
                      <div className="stat">
                        <span className="stat-value">{eventUsers.length}</span>
                        <span className="stat-label">Users</span>
                      </div>
                      <div className="stat">
                        <span className="stat-value">{userLocations.length}</span>
                        <span className="stat-label">Online</span>
                      </div>
                    </div>
                  </div>
                </div>
              )}
              
              <div className="panel-section">
                <div className="section-header">
                  <h3>Map Options</h3>
                </div>
                <label className="heatmap-toggle">
                  <input 
                    type="checkbox" 
                    checked={showHeatmap} 
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                  />
                  Show Heatmap
                </label>
              </div>
            </>
          )}
        </aside>
        
        {/* Map Area */}
        <div className="map-area">
          <MapContainer center={mapCenter} zoom={15} className="admin-map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController center={mapCenter} />
            
            {/* Event location marker */}
            {selectedEvent?.lat && selectedEvent?.lng && (
              <Marker 
                position={[selectedEvent.lat, selectedEvent.lng]}
                icon={eventIcon}
              >
                <Popup>Event Center: {selectedEvent.name}</Popup>
              </Marker>
            )}
            
            {/* User location markers */}
            {userLocations.map((loc, idx) => {
              const user = eventUsers.find(u => u.id === loc.user_id)
              return (
                <Marker 
                  key={loc.user_id || idx}
                  position={[loc.lat, loc.lng]}
                  icon={userIcon}
                >
                  <Popup>{user?.name || 'User'} - Active Now</Popup>
                </Marker>
              )
            })}
            
            {/* Heatmap */}
            {showHeatmap && userLocations.length > 0 && (
              <HeatmapLayer points={userLocations} />
            )}
          </MapContainer>
        </div>
      </div>
      
      {/* Create Event Modal */}
      {showCreateModal && (
        <div className="modal-overlay" onClick={() => setShowCreateModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Create New Event</h2>
            
            <div className="form-group">
              <label>Event Name *</label>
              <input
                type="text"
                value={eventName}
                onChange={e => setEventName(e.target.value)}
                placeholder="Tech Conference 2026"
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                value={eventDesc}
                onChange={e => setEventDesc(e.target.value)}
                placeholder="Event description..."
              />
            </div>
            
            <div className="form-group">
              <label>Date</label>
              <input
                type="date"
                value={eventDate}
                onChange={e => setEventDate(e.target.value)}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Latitude</label>
                <input
                  type="text"
                  value={eventLat}
                  onChange={e => setEventLat(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Longitude</label>
                <input
                  type="text"
                  value={eventLng}
                  onChange={e => setEventLng(e.target.value)}
                />
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowCreateModal(false)}>
                Cancel
              </button>
              <button className="btn-primary" onClick={createEvent}>
                Create Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default AdminDashboard
