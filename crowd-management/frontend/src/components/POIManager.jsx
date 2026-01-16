import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap, Circle } from 'react-leaflet'
import L from 'leaflet'
import axios from 'axios'
import './POIManager.css'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom colored markers for POI types
const poiIcons = {
  exit: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-red.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [30, 46],
    iconAnchor: [15, 46],
    popupAnchor: [1, -34],
  }),
  food: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-orange.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [30, 46],
    iconAnchor: [15, 46],
    popupAnchor: [1, -34],
  }),
  medical: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [30, 46],
    iconAnchor: [15, 46],
    popupAnchor: [1, -34],
  }),
  parking: new L.Icon({
    iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
    shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
    iconSize: [30, 46],
    iconAnchor: [15, 46],
    popupAnchor: [1, -34],
  }),
}

// Event center icon (purple)
const eventCenterIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-violet.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [35, 51],
  iconAnchor: [17, 51],
  popupAnchor: [1, -34],
})

// Admin/current location icon (cyan)
const currentLocationIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-cyan.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
})

const poiTypes = [
  { id: 'exit', label: 'Exit Point', icon: '🚪', color: '#ff6b6b' },
  { id: 'food', label: 'Food & Beverages', icon: '🍔', color: '#ffa502' },
  { id: 'medical', label: 'Medical Station', icon: '🚑', color: '#00ff88' },
  { id: 'parking', label: 'Parking Area', icon: '🅿️', color: '#00d4ff' },
]

const API = 'http://localhost:8000/api'

// Map controller for programmatic updates
function MapController({ center }) {
  const map = useMap()
  
  useEffect(() => {
    if (center) {
      map.setView(center, 15)
    }
  }, [map, center])
  
  return null
}

function POIManager({ 
  eventId = null, 
  initialPois = [], 
  centerLat = 28.6139, 
  centerLng = 77.2090,
  eventRadius = 1000,
  onPoisChange,
  height = "500px"
}) {
  const [pois, setPois] = useState([])
  const [selectedType, setSelectedType] = useState('exit')
  const [mapCenter, setMapCenter] = useState([centerLat, centerLng])
  const [eventCenter, setEventCenter] = useState([centerLat, centerLng])
  const [currentLocation, setCurrentLocation] = useState(null)
  const [editingPoi, setEditingPoi] = useState(null)
  const [showForm, setShowForm] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [searchResults, setSearchResults] = useState([])
  const [isSearching, setIsSearching] = useState(false)
  const [newPoiForm, setNewPoiForm] = useState({
    name: '',
    description: ''
  })
  const [editForm, setEditForm] = useState({
    name: '',
    description: ''
  })
  
  const mapRef = useRef(null)
  
  // Initialize with event center
  useEffect(() => {
    setEventCenter([centerLat, centerLng])
    setMapCenter([centerLat, centerLng])
  }, [centerLat, centerLng])
  
  // Load existing POIs
  useEffect(() => {
    if (initialPois && initialPois.length > 0) {
      setPois(initialPois)
    } else if (eventId) {
      loadPois()
    }
  }, [initialPois, eventId])
  
  // Get admin's current location on mount
  useEffect(() => {
    getCurrentLocation()
  }, [])
  
  const loadPois = async () => {
    try {
      const res = await axios.get(`${API}/admin/events/${eventId}/pois`)
      if (res.data.pois) {
        setPois(res.data.pois)
        onPoisChange?.(res.data.pois)
      }
    } catch (e) {
      console.log('Error loading POIs:', e)
    }
  }
  
  const getCurrentLocation = () => {
    if (!navigator.geolocation) {
      console.log('Geolocation not supported')
      return
    }
    
    navigator.geolocation.getCurrentPosition(
      (position) => {
        const loc = {
          lat: position.coords.latitude,
          lng: position.coords.longitude
        }
        setCurrentLocation(loc)
        // Don't automatically move map, let user click button
      },
      (error) => {
        console.log('Error getting location:', error)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }
  
  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setMapCenter([currentLocation.lat, currentLocation.lng])
      // Zoom to current location
      if (mapRef.current) {
        mapRef.current.setView([currentLocation.lat, currentLocation.lng], 16)
      }
    } else {
      getCurrentLocation()
    }
  }
  
  const handleMapClick = (e) => {
    const { lat, lng } = e.latlng
    
    setNewPoiForm({
      name: '',
      description: ''
    })
    setShowForm(true)
    setEditingPoi(null)
    setMapCenter([lat, lng])
  }
  
  const handleSearch = async () => {
    if (!searchQuery.trim() || searchQuery.length < 3) return
    
    setIsSearching(true)
    try {
      const res = await axios.post(`${API}/admin/location/search`, {
        query: searchQuery.trim(),
        limit: 5
      })
      setSearchResults(res.data.results || [])
    } catch (e) {
      console.log('Error searching location:', e)
      setSearchResults([])
    } finally {
      setIsSearching(false)
    }
  }
  
  const handleSelectSearchResult = (result) => {
    const loc = [parseFloat(result.lat), parseFloat(result.lng)]
    setMapCenter(loc)
    setEventCenter(loc) // Also update event center
    setSearchResults([])
    setSearchQuery('')
    
    if (mapRef.current) {
      mapRef.current.setView(loc, 15)
    }
  }
  
  const handleAddPoi = () => {
    const newPoi = {
      id: `temp-${Date.now()}`,
      type: selectedType,
      lat: mapCenter[0],
      lng: mapCenter[1],
      name: newPoiForm.name || `${poiTypes.find(t => t.id === selectedType).label} ${pois.length + 1}`,
      description: newPoiForm.description
    }
    
    const updatedPois = [...pois, newPoi]
    setPois(updatedPois)
    onPoisChange?.(updatedPois)
    setShowForm(false)
  }
  
  const handleEditPoi = (poi) => {
    setEditForm({
      name: poi.name,
      description: poi.description
    })
    setEditingPoi(poi)
    setShowForm(true)
    setMapCenter([poi.lat, poi.lng])
  }
  
  const handleUpdatePoi = () => {
    const updatedPois = pois.map(p => 
      p.id === editingPoi.id 
        ? { ...p, name: editForm.name, description: editForm.description }
        : p
    )
    setPois(updatedPois)
    onPoisChange?.(updatedPois)
    setShowForm(false)
    setEditingPoi(null)
  }
  
  const handleDeletePoi = (poiId) => {
    const updatedPois = pois.filter(p => p.id !== poiId)
    setPois(updatedPois)
    onPoisChange?.(updatedPois)
  }
  
  const handleCancel = () => {
    setShowForm(false)
    setEditingPoi(null)
    setNewPoiForm({ name: '', description: '' })
    setEditForm({ name: '', description: '' })
  }
  
  const handleSelectType = (typeId) => {
    setSelectedType(typeId)
    setShowForm(false)
    setEditingPoi(null)
  }
  
  const getPoiTypeInfo = (type) => {
    return poiTypes.find(t => t.id === type) || poiTypes[0]
  }
  
  return (
    <div className="poi-manager">
      <div className="poi-header">
        <h4>Points of Interest</h4>
        <p className="poi-hint">Add exit points, food stalls, medical stations, and parking areas</p>
      </div>
      
      {/* Search and Location Controls */}
      <div className="poi-controls">
        <div className="search-container">
          <input
            type="text"
            className="search-input"
            placeholder="Search location..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
          />
          <button 
            className="search-btn"
            onClick={handleSearch}
            disabled={isSearching}
          >
            {isSearching ? '...' : '🔍'}
          </button>
        </div>
        
        <button 
          className="location-btn"
          onClick={handleUseCurrentLocation}
        >
          📍 Use My Location
        </button>
      </div>
      
      {/* Search Results */}
      {searchResults.length > 0 && (
        <div className="search-results">
          {searchResults.map((result, idx) => (
            <div 
              key={idx} 
              className="search-result-item"
              onClick={() => handleSelectSearchResult(result)}
            >
              <span className="result-icon">📍</span>
              <span className="result-name">
                {result.display_name?.split(',')[0] || 'Location'}
              </span>
            </div>
          ))}
          <button 
            className="clear-search"
            onClick={() => { setSearchResults([]); setSearchQuery('') }}
          >
            ✕ Clear
          </button>
        </div>
      )}
      
      {/* POI Type Selector */}
      <div className="poi-type-selector">
        {poiTypes.map(type => (
          <button
            key={type.id}
            className={`poi-type-btn ${selectedType === type.id ? 'active' : ''}`}
            style={{ 
              '--type-color': type.color,
              borderColor: selectedType === type.id ? type.color : 'rgba(255,255,255,0.1)'
            }}
            onClick={() => handleSelectType(type.id)}
          >
            <span className="poi-type-icon">{type.icon}</span>
            <span className="poi-type-label">{type.label}</span>
          </button>
        ))}
      </div>
      
      {/* Map */}
      <div className="poi-map-container">
        <MapContainer
          ref={mapRef}
          center={mapCenter}
          zoom={15}
          className="poi-map"
          style={{ height }}
          onClick={handleMapClick}
        >
          <TileLayer
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
            attribution='&copy; OpenStreetMap contributors'
          />
          <MapController center={mapCenter} />
          
          {/* Event Center Marker */}
          {eventCenter && (
            <Marker
              position={eventCenter}
              icon={eventCenterIcon}
            >
              <Popup>
                <div className="center-popup">
                  <strong>🎯 Event Center</strong>
                  <p>Lat: {eventCenter[0].toFixed(6)}</p>
                  <p>Lng: {eventCenter[1].toFixed(6)}</p>
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* Event Boundary Circle */}
          {eventCenter && (
            <Circle
              center={eventCenter}
              radius={eventRadius}
              pathOptions={{
                color: '#7b2cbf',
                fillColor: '#7b2cbf',
                fillOpacity: 0.1,
                weight: 2
              }}
            />
          )}
          
          {/* Admin's Current Location */}
          {currentLocation && (
            <Marker
              position={[currentLocation.lat, currentLocation.lng]}
              icon={currentLocationIcon}
            >
              <Popup>
                <div className="current-loc-popup">
                  <strong>📍 Your Location</strong>
                  <p>Lat: {currentLocation.lat.toFixed(6)}</p>
                  <p>Lng: {currentLocation.lng.toFixed(6)}</p>
                </div>
              </Popup>
            </Marker>
          )}
          
          {/* POI Markers */}
          {pois.map(poi => {
            const typeInfo = getPoiTypeInfo(poi.type)
            return (
              <Marker
                key={poi.id}
                position={[poi.lat, poi.lng]}
                icon={poiIcons[poi.type]}
                eventHandlers={{
                  click: () => {
                    setMapCenter([poi.lat, poi.lng])
                  }
                }}
              >
                <Popup>
                  <div className="poi-popup">
                    <strong>{typeInfo.icon} {poi.name}</strong>
                    {poi.description && <p>{poi.description}</p>}
                    <p className="poi-coords">
                      {poi.lat.toFixed(6)}, {poi.lng.toFixed(6)}
                    </p>
                    <div className="poi-popup-actions">
                      <button 
                        className="popup-btn edit"
                        onClick={() => handleEditPoi(poi)}
                      >
                        Edit
                      </button>
                      <button 
                        className="popup-btn delete"
                        onClick={() => handleDeletePoi(poi.id)}
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                </Popup>
              </Marker>
            )
          })}
          
          {/* New POI Preview Marker */}
          {showForm && (
            <Marker
              position={mapCenter}
              icon={poiIcons[selectedType]}
            >
              <Popup>
                <strong>{getPoiTypeInfo(selectedType).icon} New Location</strong>
                <p>Lat: {mapCenter[0].toFixed(6)}</p>
                <p>Lng: {mapCenter[1].toFixed(6)}</p>
              </Popup>
            </Marker>
          )}
        </MapContainer>
        
        {/* Click Hint */}
        <div className="map-hint">
          <span>👆 Click on the map to place a POI marker</span>
        </div>
        
        {/* Add POI Form */}
        {showForm && (
          <div className="poi-form-overlay">
            <div className="poi-form">
              <h5>
                {editingPoi ? 'Edit POI' : `Add ${getPoiTypeInfo(selectedType).label}`}
              </h5>
              
              <div className="form-coords">
                📍 {mapCenter[0].toFixed(6)}, {mapCenter[1].toFixed(6)}
              </div>
              
              <div className="form-group">
                <label>Name</label>
                <input
                  type="text"
                  value={editingPoi ? editForm.name : newPoiForm.name}
                  onChange={(e) => {
                    if (editingPoi) {
                      setEditForm({ ...editForm, name: e.target.value })
                    } else {
                      setNewPoiForm({ ...newPoiForm, name: e.target.value })
                    }
                  }}
                  placeholder={getPoiTypeInfo(selectedType).label}
                  autoFocus
                />
              </div>
              
              <div className="form-group">
                <label>Description (optional)</label>
                <textarea
                  value={editingPoi ? editForm.description : newPoiForm.description}
                  onChange={(e) => {
                    if (editingPoi) {
                      setEditForm({ ...editForm, description: e.target.value })
                    } else {
                      setNewPoiForm({ ...newPoiForm, description: e.target.value })
                    }
                  }}
                  placeholder="Add details about this location..."
                  rows={2}
                />
              </div>
              
              <div className="form-actions">
                <button className="btn-cancel" onClick={handleCancel}>
                  Cancel
                </button>
                <button 
                  className="btn-save"
                  style={{ background: getPoiTypeInfo(selectedType).color }}
                  onClick={editingPoi ? handleUpdatePoi : handleAddPoi}
                >
                  {editingPoi ? 'Update' : 'Add POI'}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      
      {/* POI List */}
      {pois.length > 0 && (
        <div className="poi-list">
          <h5>Added Points ({pois.length})</h5>
          <div className="poi-items">
            {pois.map(poi => {
              const typeInfo = getPoiTypeInfo(poi.type)
              return (
                <div key={poi.id} className="poi-item" onClick={() => {
                  setMapCenter([poi.lat, poi.lng])
                  if (mapRef.current) {
                    mapRef.current.setView([poi.lat, poi.lng], 17)
                  }
                }}>
                  <div className="poi-item-header">
                    <span 
                      className="poi-item-color"
                      style={{ background: typeInfo.color }}
                    />
                    <span className="poi-item-icon">{typeInfo.icon}</span>
                    <div className="poi-item-info">
                      <span className="poi-item-name">{poi.name}</span>
                      <span className="poi-item-coords">
                        {poi.lat.toFixed(4)}, {poi.lng.toFixed(4)}
                      </span>
                    </div>
                  </div>
                  <div className="poi-item-actions">
                    <button 
                      className="item-btn edit"
                      onClick={(e) => { e.stopPropagation(); handleEditPoi(poi) }}
                    >
                      Edit
                    </button>
                    <button 
                      className="item-btn delete"
                      onClick={(e) => { e.stopPropagation(); handleDeletePoi(poi.id) }}
                    >
                      Delete
                    </button>
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
      
      {/* Legend */}
      <div className="poi-legend">
        <div className="legend-item">
          <span className="legend-marker" style={{ background: '#7b2cbf' }} />
          <span className="legend-label">🎯 Event Center</span>
        </div>
        <div className="legend-item">
          <span className="legend-marker" style={{ background: '#00d4ff' }} />
          <span className="legend-label">📍 Your Location</span>
        </div>
        {poiTypes.map(type => (
          <div key={type.id} className="legend-item">
            <span className="legend-marker" style={{ background: type.color }} />
            <span className="legend-label">{type.icon} {type.label}</span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default POIManager
