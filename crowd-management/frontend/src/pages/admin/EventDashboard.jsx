import { useState, useEffect, useRef } from 'react'
import { useParams, Link, Outlet, useOutletContext } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import axios from 'axios'
import './EventDashboard.css'

const API = 'http://localhost:8000/api'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom icons
const userIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

const eventIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -34],
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

// Map controller
function MapController({ center }) {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15)
    }
  }, [map, center])
  
  return null
}

function EventDashboard() {
  const { eventId } = useParams()
  const { setCurrentEvent } = useOutletContext()
  
  const [event, setEvent] = useState(null)
  const [userLocations, setUserLocations] = useState([])
  const [pois, setPois] = useState([])
  const [activeAlerts, setActiveAlerts] = useState([])
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090])
  const [showHeatmap, setShowHeatmap] = useState(true)
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadEvent()
    loadPois()
    loadAlerts()
  }, [eventId])
  
  // Polling for updates
  useEffect(() => {
    if (!event) return
    
    const interval = setInterval(() => {
      loadUserLocations()
    }, 5000)
    
    return () => clearInterval(interval)
  }, [event])
  
  const loadEvent = async () => {
    try {
      const res = await axios.get(`${API}/admin/events/${eventId}`)
      setEvent(res.data)
      setCurrentEvent(res.data)
      
      if (res.data.lat && res.data.lng) {
        setMapCenter([res.data.lat, res.data.lng])
      }
    } catch (e) {
      console.log('Error loading event:', e)
    } finally {
      setLoading(false)
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
  
  const loadPois = async () => {
    try {
      const res = await axios.get(`${API}/admin/events/${eventId}/poi`)
      setPois(res.data || [])
    } catch (e) {
      console.log('Error loading POIs:', e)
    }
  }
  
  const loadAlerts = async () => {
    try {
      const res = await axios.get(`${API}/admin/events/${eventId}/alerts/active`)
      setActiveAlerts(res.data || [])
    } catch (e) {
      console.log('Error loading alerts:', e)
    }
  }
  
  const goToMyLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setMapCenter([pos.coords.latitude, pos.coords.longitude])
      }
    )
  }
  
  if (loading) {
    return (
      <div className="event-dashboard loading">
        <div className="loading-spinner">Loading event...</div>
      </div>
    )
  }
  
  if (!event) {
    return (
      <div className="event-dashboard error">
        <h2>Event not found</h2>
        <Link to="/admin">Back to Events</Link>
      </div>
    )
  }
  
  const tabItems = [
    { path: `/admin/events/${eventId}`, label: 'Overview', exact: true },
    { path: `/admin/events/${eventId}/participants`, label: 'Participants' },
    { path: `/admin/events/${eventId}/poi`, label: 'POI' },
    { path: `/admin/events/${eventId}/alerts`, label: `Alerts${activeAlerts.length > 0 ? ` (${activeAlerts.length})` : ''}` },
  ]
  
  return (
    <div className="event-dashboard">
      <header className="dashboard-header">
        <div className="header-left">
          <Link to="/admin" className="back-btn">←</Link>
          <div className="event-info">
            <h1>{event.name}</h1>
            <span className="event-meta">
              {event.city && `${event.city} • `}
              {event.active_users} participants
            </span>
          </div>
        </div>
        <div className="header-right">
          {activeAlerts.length > 0 && (
            <div className="alert-badge">
              🚨 {activeAlerts.length} Active Alerts
            </div>
          )}
          <button className="locate-btn" onClick={goToMyLocation}>
            📍 Where Am I
          </button>
        </div>
      </header>
      
      {/* Tabs */}
      <div className="dashboard-tabs">
        {tabItems.map(tab => (
          <Link
            key={tab.path}
            to={tab.path}
            end={tab.exact}
            className="tab-item"
          >
            {tab.label}
          </Link>
        ))}
      </div>
      
      {/* Tab Content */}
      <div className="dashboard-content">
        <div className="map-section">
          <div className="map-controls">
            <label className="heatmap-toggle">
              <input
                type="checkbox"
                checked={showHeatmap}
                onChange={(e) => setShowHeatmap(e.target.checked)}
              />
              Show Heatmap
            </label>
          </div>
          
          <MapContainer center={mapCenter} zoom={15} className="dashboard-map">
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController center={mapCenter} />
            
            {/* Event center */}
            {event.lat && event.lng && (
              <Marker position={[event.lat, event.lng]} icon={eventIcon}>
                <Popup>
                  <strong>Event Center</strong><br/>
                  {event.name}
                </Popup>
              </Marker>
            )}
            
            {/* User markers */}
            {userLocations.map((loc, idx) => (
              <Marker key={loc.user_id || idx} position={[loc.lat, loc.lng]} icon={userIcon}>
                <Popup>User</Popup>
              </Marker>
            ))}
            
            {/* POI markers */}
            {pois.map(poi => (
              <Marker key={poi.id} position={[poi.lat, poi.lng]}>
                <Popup>
                  <strong>{poi.icon} {poi.name}</strong><br/>
                  {poi.type}
                </Popup>
              </Marker>
            ))}
            
            {/* Heatmap */}
            {showHeatmap && userLocations.length > 0 && (
              <HeatmapLayer points={userLocations} />
            )}
          </MapContainer>
        </div>
        
        {/* Stats Panel */}
        <aside className="stats-panel">
          <h3>Live Stats</h3>
          
          <div className="stat-cards">
            <div className="stat-card">
              <span className="stat-icon">👥</span>
              <div className="stat-content">
                <span className="stat-value">{userLocations.length}</span>
                <span className="stat-label">Online Now</span>
              </div>
            </div>
            
            <div className="stat-card">
              <span className="stat-icon">📍</span>
              <div className="stat-content">
                <span className="stat-value">{pois.length}</span>
                <span className="stat-label">POI Markers</span>
              </div>
            </div>
            
            <div className="stat-card">
              <span className="stat-icon">⚠️</span>
              <div className="stat-content">
                <span className="stat-value">{activeAlerts.length}</span>
                <span className="stat-label">Active Alerts</span>
              </div>
            </div>
            
            <div className="stat-card">
              <span className="stat-icon">📊</span>
              <div className="stat-content">
                <span className="stat-value">{event.max_capacity || 1000}</span>
                <span className="stat-label">Max Capacity</span>
              </div>
            </div>
          </div>
          
          {activeAlerts.length > 0 && (
            <div className="recent-alerts">
              <h4>Recent Alerts</h4>
              {activeAlerts.slice(0, 3).map(alert => (
                <div key={alert.id} className="alert-item">
                  <span className="alert-type">{alert.alert_type}</span>
                  <span className="alert-user">{alert.user_name}</span>
                </div>
              ))}
            </div>
          )}
        </aside>
      </div>
      
      {/* Outlet for nested routes */}
      <Outlet />
    </div>
  )
}

export default EventDashboard
