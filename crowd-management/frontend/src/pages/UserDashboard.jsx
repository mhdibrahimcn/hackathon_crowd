import { useState, useEffect, useRef } from 'react'
import { useSearchParams, useNavigate } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import axios from 'axios'
import './UserDashboard.css'

const API = 'http://localhost:8000/api'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom marker icons
const myLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

const otherUserIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gray.png',
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
      
      const heatPoints = points.map(p => [p.lat, p.lng, 0.6])
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

function UserDashboard() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const [event, setEvent] = useState(null)
  const [userId, setUserId] = useState('')
  const [userName, setUserName] = useState('')
  const [userLocation, setUserLocation] = useState(null)
  const [mapCenter, setMapCenter] = useState([40.7128, -74.0060])
  const [eventUsers, setEventUsers] = useState([])
  const [userLocations, setUserLocations] = useState([])
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [locationStatus, setLocationStatus] = useState('detecting')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  
  useEffect(() => {
    // Get event and user from URL params
    const eventId = searchParams.get('event')
    const uid = searchParams.get('user')
    
    if (!eventId || !uid) {
      navigate('/')
      return
    }
    
    setUserId(uid)
    loadEvent(eventId)
  }, [searchParams])
  
  // Location tracking
  useEffect(() => {
    if (!event || !userId) return
    
    // Initial location
    getUserLocation()
    
    // Periodic location updates
    const locationInterval = setInterval(() => {
      sendLocation()
    }, 10000) // Every 10 seconds
    
    // Periodic data updates
    const dataInterval = setInterval(() => {
      loadEventUsers(event.id)
      loadUserLocations(event.id)
    }, 3000)
    
    return () => {
      clearInterval(locationInterval)
      clearInterval(dataInterval)
    }
  }, [event, userId])
  
  const getUserLocation = () => {
    setLocationStatus('detecting')
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setMapCenter([loc.lat, loc.lng])
        setLocationStatus('on')
        sendLocation()
        loadEventUsers(event?.id)
        loadUserLocations(event?.id)
      },
      (error) => {
        console.log('Location error:', error)
        setLocationStatus('off')
        // Try anyway with default location
        setUserLocation({ lat: 40.7128, lng: -74.0060 })
        sendLocation()
      },
      { enableHighAccuracy: true, timeout: 10000, maximumAge: 30000 }
    )
  }
  
  const sendLocation = async () => {
    if (!userLocation || !event || !userId) return
    
    try {
      await axios.post(`${API}/events/${event.id}/heartbeat`, {
        user_id: userId,
        lat: userLocation.lat,
        lng: userLocation.lng
      })
    } catch (e) {
      console.log('Error sending location:', e)
    }
  }
  
  const loadEvent = async (eventId) => {
    try {
      const res = await axios.get(`${API}/events/${eventId}`)
      setEvent(res.data)
      
      // Try to get user name from localStorage
      const savedName = localStorage.getItem(`user_name_${eventId}_${searchParams.get('user')}`)
      if (savedName) {
        setUserName(savedName)
      }
    } catch (e) {
      console.log('Error loading event:', e)
      navigate('/')
    }
  }
  
  const loadEventUsers = async (eventId) => {
    try {
      const res = await axios.get(`${API}/events/${eventId}/users`)
      setEventUsers(res.data)
      
      // Find and set user name if not set
      const me = res.data.find(u => u.id === userId)
      if (me && !userName) {
        setUserName(me.name)
        localStorage.setItem(`user_name_${eventId}_${userId}`, me.name)
      }
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
  
  const goToMyLocation = () => {
    if (userLocation) {
      setMapCenter([userLocation.lat, userLocation.lng])
    } else {
      getUserLocation()
    }
  }
  
  const getLocationStatusColor = () => {
    switch (locationStatus) {
      case 'on': return '#00ff88'
      case 'detecting': return '#ffff00'
      default: return '#ff6b6b'
    }
  }
  
  // Count nearby users (within 100m)
  const nearbyCount = userLocations.filter(loc => {
    if (!userLocation || loc.user_id === userId) return false
    const dist = Math.sqrt(
      Math.pow(loc.lat - userLocation.lat, 2) + 
      Math.pow(loc.lng - userLocation.lng, 2)
    )
    // Rough approximation: 0.001 degrees ≈ 100 meters
    return dist < 0.001
  }).length
  
  if (!event) {
    return (
      <div className="user-dashboard loading">
        <div className="loading-spinner">Loading...</div>
      </div>
    )
  }
  
  return (
    <div className="user-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            ← Back
          </button>
          <div className="event-info">
            <h1>{event.name}</h1>
            <span className="user-greeting">Hello, {userName || 'User'}</span>
          </div>
        </div>
        <div className="header-right">
          <span className="location-status" style={{ color: getLocationStatusColor() }}>
            GPS: {locationStatus.toUpperCase()}
          </span>
          <button className="locate-btn" onClick={goToMyLocation}>
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
                <h3>Event Info</h3>
                <div className="event-details">
                  <p><strong>{event.name}</strong></p>
                  {event.description && <p>{event.description}</p>}
                  {event.date && <p className="event-date">{event.date}</p>}
                </div>
              </div>
              
              <div className="panel-section">
                <h3>Crowd Stats</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-value">{eventUsers.length}</span>
                    <span className="stat-label">Total</span>
                  </div>
                  <div className="stat-card nearby">
                    <span className="stat-value">{nearbyCount}</span>
                    <span className="stat-label">Nearby</span>
                  </div>
                  <div className="stat-card online">
                    <span className="stat-value">{userLocations.length}</span>
                    <span className="stat-label">Online</span>
                  </div>
                </div>
              </div>
              
              <div className="panel-section">
                <h3>Map Options</h3>
                <label className="heatmap-toggle">
                  <input 
                    type="checkbox" 
                    checked={showHeatmap} 
                    onChange={(e) => setShowHeatmap(e.target.checked)}
                  />
                  Show Heatmap
                </label>
              </div>
              
              <div className="panel-section actions">
                <button className="sos-btn">
                  🚨 SOS Alert
                </button>
                <button className="chat-btn">
                  💬 Chat
                </button>
              </div>
            </>
          )}
        </aside>
        
        {/* Map Area */}
        <div className="map-area">
          <MapContainer center={mapCenter} zoom={15} className="user-map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController center={mapCenter} />
            
            {/* My location marker */}
            {userLocation && (
              <Marker 
                position={[userLocation.lat, userLocation.lng]}
                icon={myLocationIcon}
              >
                <Popup>You are here</Popup>
              </Marker>
            )}
            
            {/* Other user markers */}
            {userLocations.map((loc, idx) => {
              if (loc.user_id === userId) return null
              return (
                <Marker 
                  key={loc.user_id || idx}
                  position={[loc.lat, loc.lng]}
                  icon={otherUserIcon}
                >
                  <Popup>
                    {eventUsers.find(u => u.id === loc.user_id)?.name || 'User'}
                  </Popup>
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
    </div>
  )
}

export default UserDashboard
