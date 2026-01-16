import { useState, useEffect } from 'react'
import { useNavigate, useOutletContext } from 'react-router-dom'
import axios from 'axios'
import LocationPicker from '../../components/LocationPicker'
import POIManager from '../../components/POIManager'
import './CreateEvent.css'

const API = 'http://localhost:8000/api'

function CreateEvent() {
  const navigate = useNavigate()
  const { setCurrentEvent } = useOutletContext()
  
  const [activeTab, setActiveTab] = useState('details') // 'details' | 'location'
  
  const [formData, setFormData] = useState({
    name: '',
    description: '',
    city: '',
    start_date: '',
    end_date: '',
    max_capacity: 1000,
    lat: null,
    lng: null
  })
  
  const [pois, setPois] = useState([])
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({
      ...prev,
      [name]: value
    }))
  }
  
  const handleLocationSelect = (location) => {
    setFormData(prev => ({
      ...prev,
      lat: location.lat,
      lng: location.lng
    }))
  }
  
  const handlePoisChange = (newPois) => {
    setPois(newPois)
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      setError('Event name is required')
      setActiveTab('details')
      return
    }
    
    if (!formData.lat || !formData.lng) {
      setError('Please select a location on the map')
      setActiveTab('location')
      return
    }
    
    setLoading(true)
    setError('')
    
    try {
      const res = await axios.post(`${API}/admin/events`, {
        name: formData.name,
        description: formData.description,
        city: formData.city,
        start_date: formData.start_date,
        end_date: formData.end_date,
        max_capacity: formData.max_capacity,
        lat: formData.lat,
        lng: formData.lng
      })
      
      const eventId = res.data.id
      
      // Create POIs for the event
      if (pois.length > 0) {
        for (const poi of pois) {
          try {
            await axios.post(`${API}/admin/events/${eventId}/pois`, {
              type: poi.type,
              lat: poi.lat,
              lng: poi.lng,
              name: poi.name,
              description: poi.description
            })
          } catch (poiError) {
            console.log('Error creating POI:', poiError)
          }
        }
      }
      
      setCurrentEvent(res.data)
      navigate(`/admin/events/${eventId}`)
    } catch (e) {
      setError('Failed to create event. Please try again.')
      console.error('Error creating event:', e)
    } finally {
      setLoading(false)
    }
  }
  
  return (
    <div className="create-event-page">
      <header className="page-header">
        <h1>Create New Event</h1>
      </header>
      
      <form className="create-event-form" onSubmit={handleSubmit}>
        {error && (
          <div className="error-message">
            {error}
          </div>
        )}
        
        {/* Tab Navigation */}
        <div className="tab-navigation">
          <button
            type="button"
            className={`tab-btn ${activeTab === 'details' ? 'active' : ''}`}
            onClick={() => setActiveTab('details')}
          >
            Event Details
          </button>
          <button
            type="button"
            className={`tab-btn ${activeTab === 'location' ? 'active' : ''}`}
            onClick={() => setActiveTab('location')}
          >
            Location & POIs
          </button>
        </div>
        
        {/* Event Details Tab */}
        <div className={`tab-content ${activeTab === 'details' ? 'active' : ''}`}>
          <div className="form-section">
            <h3>Basic Information</h3>
            
            <div className="form-group">
              <label>Event Name *</label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleInputChange}
                placeholder="e.g., Republic Day Celebration 2026"
                required
              />
            </div>
            
            <div className="form-group">
              <label>Description</label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                placeholder="Describe the event..."
                rows={3}
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  name="city"
                  value={formData.city}
                  onChange={handleInputChange}
                  placeholder="e.g., New Delhi"
                />
              </div>
              
              <div className="form-group">
                <label>Max Capacity</label>
                <input
                  type="number"
                  name="max_capacity"
                  value={formData.max_capacity}
                  onChange={handleInputChange}
                  min="1"
                  max="100000"
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  name="start_date"
                  value={formData.start_date}
                  onChange={handleInputChange}
                />
              </div>
              
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  name="end_date"
                  value={formData.end_date}
                  onChange={handleInputChange}
                />
              </div>
            </div>
          </div>
        </div>
        
        {/* Location & POIs Tab */}
        <div className={`tab-content ${activeTab === 'location' ? 'active' : ''}`}>
          <div className="form-section">
            <h3>Event Location *</h3>
            <p className="section-hint">
              Click on the map to set the event center point. This is where the event will take place.
            </p>
            
            <LocationPicker
              onLocationSelect={handleLocationSelect}
              initialLat={formData.lat}
              initialLng={formData.lng}
              height="300px"
            />
          </div>
          
          <div className="form-section">
            <h3>Points of Interest</h3>
            <p className="section-hint">
              Add exit points, food stalls, medical stations, and parking areas to help attendees navigate.
            </p>
            
            <POIManager
              initialPois={pois}
              centerLat={formData.lat || 28.6139}
              centerLng={formData.lng || 77.2090}
              onPoisChange={handlePoisChange}
              height="400px"
            />
          </div>
        </div>
        
        <div className="form-actions">
          <button
            type="button"
            className="btn-cancel"
            onClick={() => navigate('/admin')}
          >
            Cancel
          </button>
          <button
            type="submit"
            className="btn-submit"
            disabled={loading}
          >
            {loading ? 'Creating...' : 'Create Event'}
          </button>
        </div>
      </form>
    </div>
  )
}

export default CreateEvent
