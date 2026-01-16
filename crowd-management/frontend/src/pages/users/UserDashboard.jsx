import { useState, useEffect, useRef } from 'react'
import { useParams, useSearchParams, useNavigate } from 'react-router-dom'
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

// Icons
const myLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [32, 48],
  iconAnchor: [16, 48],
  popupAnchor: [1, -34],
})

const otherUserIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-gray.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

function HeatmapLayer({ points }) {
  const map = useMap()
  const heatLayerRef = useRef(null)
  
  useEffect(() => {
    if (!map || !points || points.length === 0) return
    
    import('leaflet.heat').then((heat) => {
      if (heatLayerRef.current) {
        heatLayerRef.current.remove()
      }
      
      const heatPoints = points.map(p => [p.lat, p.lng, p.intensity || 0.5])
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

function MapController({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, 15)
  }, [map, center])
  return null
}

function UserDashboard() {
  const { eventId } = useParams()
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  
  const userId = searchParams.get('user')
  const userName = searchParams.get('name') || 'User'
  
  const [event, setEvent] = useState(null)
  const [userLocation, setUserLocation] = useState(null)
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090])
  const [userLocations, setUserLocations] = useState([])
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [locationStatus, setLocationStatus] = useState('detecting')
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [showSOSModal, setShowSOSModal] = useState(false)
  const [sosReason, setSosReason] = useState('')
  const [sendingSOS, setSendingSOS] = useState(false)
  
  useEffect(() => {
    if (!eventId || !userId) {
      navigate('/users/join')
      return
    }
    
    loadEvent()
  }, [eventId, userId])
  
  useEffect(() => {
    if (!event || !userId) return
    
    getUserLocation()
    const locInterval = setInterval(sendLocation, 10000)
    const dataInterval = setInterval(loadUserLocations, 5000)
    
    return () => {
      clearInterval(locInterval)
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
        sendLocation(loc)
        loadUserLocations()
      },
      (error) => {
        console.log('Location error:', error)
        setLocationStatus('off')
        setUserLocation({ lat: 40.7128, lng: -74.0060 })
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }
  
  const sendLocation = async (loc = userLocation) => {
    if (!loc || !event || !userId) return
    
    try {
      await axios.post(`${API}/events/${eventId}/heartbeat`, {
        user_id: userId,
        lat: loc.lat,
        lng: loc.lng
      })
    } catch (e) {
      console.log('Error sending location:', e)
    }
  }
  
  const loadEvent = async () => {
    try {
      const res = await axios.get(`${API}/admin/events/${eventId}`)
      setEvent(res.data)
      if (res.data.lat && res.data.lng) {
        setMapCenter([res.data.lat, res.data.lng])
      }
    } catch (e) {
      console.log('Error loading event:', e)
      navigate('/users/join')
    }
  }
  
  const loadUserLocations = async () => {
    try {
      const res = await axios.get(`${API}/events/${eventId}/locations`)
      setUserLocations(res.data.points || [])
    } catch (e) {
      console.log('Error loading locations:', e)
    }
  }
  
  const triggerSOS = async () => {
    if (!userLocation) {
      alert('Location not available. Please enable GPS.')
      return
    }
    
    setSendingSOS(true)
    try {
      await axios.post(`${API}/events/${eventId}/sos`, {
        user_id: userId,
        user_name: userName,
        lat: userLocation.lat,
        lng: userLocation.lng,
        description: sosReason || 'Emergency SOS alert'
      })
      
      setShowSOSModal(false)
      setSosReason('')
      alert('SOS alert sent! Help is on the way.')
    } catch (e) {
      console.log('Error sending SOS:', e)
      alert('Failed to send SOS. Please try again.')
    } finally {
      setSendingSOS(false)
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
  
  // Count nearby users
  const nearbyCount = userLocations.filter(loc => {
    if (!userLocation || loc.user_id === userId) return false
    const dist = Math.sqrt(
      Math.pow(loc.lat - userLocation.lat, 2) + 
      Math.pow(loc.lng - userLocation.lng, 2)
    )
    return dist < 0.001
  }).length
  
  if (!event) {
    return <div className="user-dashboard loading">Loading...</div>
  }
  
  return (
    <div className="user-dashboard">
      {/* Header */}
      <header className="dashboard-header">
        <div className="header-left">
          <button className="back-btn" onClick={() => navigate('/')}>
            ←
          </button>
          <div className="event-info">
            <h1>{event.name}</h1>
            <span>Hello, {decodeURIComponent(userName)}</span>
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
                <h3>Crowd Stats</h3>
                <div className="stats-grid">
                  <div className="stat-card">
                    <span className="stat-value">{userLocations.length}</span>
                    <span className="stat-label">Nearby</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{nearbyCount}</span>
                    <span className="stat-label">Very Close</span>
                  </div>
                  <div className="stat-card">
                    <span className="stat-value">{event.max_capacity || 1000}</span>
                    <span className="stat-label">Capacity</span>
                  </div>
                </div>
              </div>
              
              <div className="panel-section">
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
                <button className="sos-btn" onClick={() => setShowSOSModal(true)}>
                  🚨 SOS Alert
                </button>
                <button className="chat-btn">
                  💬 Chat
                </button>
              </div>
            </>
          )}
        </aside>
        
        {/* Map */}
        <div className="map-area">
          <MapContainer center={mapCenter} zoom={15} className="user-map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController center={mapCenter} />
            
            {userLocation && (
              <Marker position={[userLocation.lat, userLocation.lng]} icon={myLocationIcon}>
                <Popup>You are here</Popup>
              </Marker>
            )}
            
            {userLocations.map((loc, idx) => {
              if (loc.user_id === userId) return null
              return (
                <Marker 
                  key={loc.user_id || idx}
                  position={[loc.lat, loc.lng]}
                  icon={otherUserIcon}
                >
                  <Popup>Participant</Popup>
                </Marker>
              )
            })}
            
            {showHeatmap && userLocations.length > 0 && (
              <HeatmapLayer points={userLocations} />
            )}
          </MapContainer>
        </div>
      </div>
      
      {/* SOS Modal */}
      {showSOSModal && (
        <div className="modal-overlay" onClick={() => setShowSOSModal(false)}>
          <div className="sos-modal" onClick={e => e.stopPropagation()}>
            <h2>🚨 Send SOS Alert</h2>
            <p>This will notify event organizers of your emergency.</p>
            
            <div className="form-group">
              <label>Reason (optional)</label>
              <textarea
                value={sosReason}
                onChange={(e) => setSosReason(e.target.value)}
                placeholder="Describe the emergency..."
              />
            </div>
            
            <div className="sos-location">
              📍 Sending location: {userLocation ? 
                `${userLocation.lat.toFixed(6)}, ${userLocation.lng.toFixed(6)}` : 
                'Getting location...'}
            </div>
            
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowSOSModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-sos" 
                onClick={triggerSOS}
                disabled={!userLocation || sendingSOS}
              >
                {sendingSOS ? 'Sending...' : '🚨 Send SOS'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default UserDashboard
