import { useState, useEffect, useRef } from 'react'
import { useParams } from 'react-router-dom'
import { MapContainer, TileLayer, Marker, useMap } from 'react-leaflet'
import L from 'leaflet'
import axios from 'axios'
import { POI_TYPES, getPOITypeOptions } from '../../constants/poiTypes'
import './POIManagement.css'

const API = 'http://localhost:8000/api'

// Fix Leaflet icons
delete L.Icon.Default.prototype._getIconUrl
L.Icon.Default.mergeOptions({
  iconRetinaUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon-2x.png',
  iconUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-icon.png',
  shadowUrl: 'https://cdnjs.cloudflare.com/ajax/libs/leaflet/1.7.1/images/marker-shadow.png',
})

function MapController({ center }) {
  const map = useMap()
  useEffect(() => {
    if (center) map.setView(center, 15)
  }, [map, center])
  return null
}

function POIManagement() {
  const { eventId } = useParams()
  const [pois, setPois] = useState([])
  const [loading, setLoading] = useState(true)
  const [showAddModal, setShowAddModal] = useState(false)
  const [selectedLocation, setSelectedLocation] = useState(null)
  const [formData, setFormData] = useState({ name: '', type: 'entrance' })
  const [mapCenter, setMapCenter] = useState([28.6139, 77.2090])
  
  useEffect(() => {
    loadPois()
    getEventLocation()
  }, [eventId])
  
  const getEventLocation = () => {
    axios.get(`${API}/admin/events/${eventId}`).then(res => {
      if (res.data.lat && res.data.lng) {
        setMapCenter([res.data.lat, res.data.lng])
      }
    })
  }
  
  const loadPois = async () => {
    try {
      const res = await axios.get(`${API}/admin/events/${eventId}/poi`)
      setPois(res.data || [])
    } catch (e) {
      console.log('Error loading POIs:', e)
    } finally {
      setLoading(false)
    }
  }
  
  const handleMapClick = (e) => {
    if (showAddModal) {
      setSelectedLocation({ lat: e.latlng.lat, lng: e.latlng.lng })
    }
  }
  
  const handleAddPOI = async () => {
    if (!formData.name || !selectedLocation) {
      alert('Please fill in all fields')
      return
    }
    
    try {
      await axios.post(`${API}/admin/events/${eventId}/poi`, {
        name: formData.name,
        type: formData.type,
        lat: selectedLocation.lat,
        lng: selectedLocation.lng
      })
      setShowAddModal(false)
      setFormData({ name: '', type: 'entrance' })
      setSelectedLocation(null)
      loadPois()
    } catch (e) {
      console.log('Error adding POI:', e)
    }
  }
  
  const handleDeletePOI = async (poiId) => {
    if (!confirm('Delete this POI?')) return
    try {
      await axios.delete(`${API}/admin/events/${eventId}/poi/${poiId}`)
      loadPois()
    } catch (e) {
      console.log('Error deleting POI:', e)
    }
  }
  
  const poiTypeOptions = getPOITypeOptions()
  
  if (loading) return <div className="poi-page loading">Loading...</div>
  
  return (
    <div className="poi-page">
      <div className="page-header">
        <h2>Points of Interest</h2>
        <button className="add-btn" onClick={() => setShowAddModal(true)}>
          + Add POI
        </button>
      </div>
      
      <div className="poi-content">
        <div className="poi-map-container">
          <MapContainer center={mapCenter} zoom={15} className="poi-map" onClick={handleMapClick}>
            <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
            <MapController center={mapCenter} />
            
            {pois.map(poi => {
              const typeInfo = POI_TYPES[poi.type] || { color: '#888888', icon: '📍' }
              return (
                <Marker 
                  key={poi.id} 
                  position={[poi.lat, poi.lng]}
                  eventHandlers={{
                    click: () => setSelectedLocation({ lat: poi.lat, lng: poi.lng })
                  }}
                >
                  <Popup>
                    <strong>{typeInfo.icon} {poi.name}</strong><br/>
                    {poi.type}
                  </Popup>
                </Marker>
              )
            })}
          </MapContainer>
        </div>
        
        <div className="poi-list">
          <h3>All POIs ({pois.length})</h3>
          {pois.length === 0 ? (
            <p className="empty">No POIs added yet</p>
          ) : (
            pois.map(poi => {
              const typeInfo = POI_TYPES[poi.type] || { color: '#888888', icon: '📍' }
              return (
                <div key={poi.id} className="poi-item">
                  <div className="poi-icon" style={{ background: typeInfo.color }}>
                    {typeInfo.icon}
                  </div>
                  <div className="poi-info">
                    <h4>{poi.name}</h4>
                    <p>{poi.type}</p>
                  </div>
                  <button className="delete-btn" onClick={() => handleDeletePOI(poi.id)}>
                    ×
                  </button>
                </div>
              )
            })
          )}
        </div>
      </div>
      
      {/* Add POI Modal */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h3>Add New POI</h3>
            
            <div className="form-group">
              <label>Name</label>
              <input
                type="text"
                value={formData.name}
                onChange={e => setFormData(prev => ({ ...prev, name: e.target.value }))}
                placeholder="e.g., Main Entrance"
              />
            </div>
            
            <div className="form-group">
              <label>Type</label>
              <select
                value={formData.type}
                onChange={e => setFormData(prev => ({ ...prev, type: e.target.value }))}
              >
                {poiTypeOptions.map(opt => (
                  <option key={opt.value} value={opt.value}>{opt.label}</option>
                ))}
              </select>
            </div>
            
            <div className="form-group">
              <label>Click on map to set location</label>
              <div className="selected-coords">
                {selectedLocation ? (
                  <span>
                    📍 {selectedLocation.lat.toFixed(6)}, {selectedLocation.lng.toFixed(6)}
                  </span>
                ) : (
                  <span className="placeholder">Click map to select location</span>
                )}
              </div>
            </div>
            
            <div className="modal-actions">
              <button className="btn-cancel" onClick={() => setShowAddModal(false)}>Cancel</button>
              <button className="btn-add" onClick={handleAddPOI} disabled={!selectedLocation}>
                Add POI
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default POIManagement
