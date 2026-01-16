import { useState, useEffect, useRef } from 'react'
import { MapContainer, TileLayer, Marker, Popup, useMap } from 'react-leaflet'
import L from 'leaflet'
import './LocationPicker.css'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

// Custom marker for selection
const selectionIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-green.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [30, 46],
  iconAnchor: [15, 46],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

// Current location icon
const currentIcon = new L.Icon({
  iconUrl: 'https://raw.githubusercontent.com/pointhi/leaflet-color-markers/master/img/marker-icon-2x-blue.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
  iconSize: [25, 41],
  iconAnchor: [12, 41],
  popupAnchor: [1, -34],
  shadowSize: [41, 41],
})

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

function LocationPicker({ 
  onLocationSelect, 
  initialLat, 
  initialLng,
  height = "400px"
}) {
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [currentLocation, setCurrentLocation] = useState(null)
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090]) // Default to Delhi
  const [address, setAddress] = useState('')
  const [zoom, setZoom] = useState(15)
  
  // Load initial location
  useEffect(() => {
    if (initialLat && initialLng) {
      const loc = { lat: initialLat, lng: initialLng }
      setSelectedLocation(loc)
      setMapCenter([initialLat, initialLng])
    }
  }, [initialLat, initialLng])
  
  // Get current location on mount
  useEffect(() => {
    getCurrentLocation()
  }, [])
  
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
        
        // If no location selected, use current location
        if (!selectedLocation) {
          setMapCenter([loc.lat, loc.lng])
        }
      },
      (error) => {
        console.log('Error getting location:', error)
      },
      { enableHighAccuracy: true, timeout: 10000 }
    )
  }
  
  const handleMapClick = (e) => {
    const loc = { lat: e.latlng.lat, lng: e.latlng.lng }
    setSelectedLocation(loc)
    onLocationSelect?.(loc)
  }
  
  const handleUseCurrentLocation = () => {
    if (currentLocation) {
      setSelectedLocation(currentLocation)
      setMapCenter([currentLocation.lat, currentLocation.lng])
      onLocationSelect?.(currentLocation)
    } else {
      getCurrentLocation()
    }
  }
  
  const handleLatLngChange = (e) => {
    const { name, value } = e.target
    const newLocation = { ...selectedLocation }
    newLocation[name] = parseFloat(value) || 0
    setSelectedLocation(newLocation)
    setMapCenter([newLocation.lat, newLocation.lng])
  }
  
  return (
    <div className="location-picker">
      <div className="picker-header">
        <h4>Select Location</h4>
        <button 
          type="button"
          className="current-loc-btn"
          onClick={handleUseCurrentLocation}
        >
          📍 Use My Location
        </button>
      </div>
      
      <MapContainer 
        center={mapCenter} 
        zoom={zoom}
        className="picker-map"
        style={{ height }}
        onClick={handleMapClick}
      >
        <TileLayer
          url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          attribution='&copy; OpenStreetMap contributors'
        />
        <MapController center={selectedLocation || mapCenter} />
        
        {/* Current location marker */}
        {currentLocation && (
          <Marker 
            position={[currentLocation.lat, currentLocation.lng]}
            icon={currentIcon}
          >
            <Popup>Your Current Location</Popup>
          </Marker>
        )}
        
        {/* Selected location marker */}
        {selectedLocation && (
          <Marker 
            position={[selectedLocation.lat, selectedLocation.lng]}
            icon={selectionIcon}
          >
            <Popup>
              <strong>Selected Location</strong><br/>
              Lat: {selectedLocation.lat.toFixed(6)}<br/>
              Lng: {selectedLocation.lng.toFixed(6)}
            </Popup>
          </Marker>
        )}
      </MapContainer>
      
      <div className="picker-footer">
        <div className="latlng-inputs">
          <div className="input-group">
            <label>Latitude</label>
            <input
              type="number"
              name="lat"
              value={selectedLocation?.lat?.toFixed(6) || ''}
              onChange={handleLatLngChange}
              step="0.000001"
              placeholder="e.g., 28.6139"
            />
          </div>
          <div className="input-group">
            <label>Longitude</label>
            <input
              type="number"
              name="lng"
              value={selectedLocation?.lng?.toFixed(6) || ''}
              onChange={handleLatLngChange}
              step="0.000001"
              placeholder="e.g., 77.2090"
            />
          </div>
        </div>
        
        {selectedLocation && (
          <div className="selection-status">
            <span className="status-icon">✓</span>
            Location selected
          </div>
        )}
      </div>
      
      <p className="picker-hint">
        Click on the map to select the event location, or use your current location
      </p>
    </div>
  )
}

export default LocationPicker
