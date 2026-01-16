import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import axios from 'axios'
import './Landing.css'

const API = 'http://localhost:8000/api'

function Landing() {
  const navigate = useNavigate()
  const [events, setEvents] = useState([])
  const [userLocation, setUserLocation] = useState(null)
  const [searchTerm, setSearchTerm] = useState('')
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [showJoinModal, setShowJoinModal] = useState(false)
  const [selectedEventForJoin, setSelectedEventForJoin] = useState(null)
  
  // Create event form
  const [eventName, setEventName] = useState('')
  const [eventDesc, setEventDesc] = useState('')
  const [eventCity, setEventCity] = useState('')
  const [eventStartDate, setEventStartDate] = useState('')
  const [eventEndDate, setEventEndDate] = useState('')
  const [eventLat, setEventLat] = useState('')
  const [eventLng, setEventLng] = useState('')
  const [maxCapacity, setMaxCapacity] = useState(1000)
  
  // Join event form
  const [userName, setUserName] = useState('')
  const [userPhone, setUserPhone] = useState('')
  const [agreed, setAgreed] = useState(false)
  
  useEffect(() => {
    loadEvents()
    getUserLocation()
  }, [])
  
  const getUserLocation = () => {
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        const loc = { lat: pos.coords.latitude, lng: pos.coords.longitude }
        setUserLocation(loc)
        setEventLat(pos.coords.latitude.toFixed(6))
        setEventLng(pos.coords.longitude.toFixed(6))
      },
      () => {
        setEventLat('28.6139')
        setEventLng('77.2090')
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
  
  // Calculate distance between user and event
  const calculateDistance = (eventLat, eventLng) => {
    if (!userLocation || !eventLat || !eventLng) return null
    
    const R = 6371 // Earth's radius in km
    const lat1 = userLocation.lat * Math.PI / 180
    const lat2 = eventLat * Math.PI / 180
    const deltaLat = (eventLat - userLocation.lat) * Math.PI / 180
    const deltaLng = (eventLng - userLocation.lng) * Math.PI / 180
    
    const a = Math.sin(deltaLat/2) * Math.sin(deltaLat/2) +
              Math.cos(lat1) * Math.cos(lat2) *
              Math.sin(deltaLng/2) * Math.sin(deltaLng/2)
    const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1-a))
    
    return R * c
  }
  
  // Sort and filter events
  const sortedEvents = useMemo(() => {
    const filtered = events.filter(event => 
      event.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      (event.city && event.city.toLowerCase().includes(searchTerm.toLowerCase()))
    )
    
    return filtered.map(event => ({
      ...event,
      distance: calculateDistance(event.lat, event.lng)
    })).sort((a, b) => {
      // Sort by distance if both have valid distances
      if (a.distance !== null && b.distance !== null) {
        return a.distance - b.distance
      }
      // Events with distance come first
      if (a.distance !== null) return -1
      if (b.distance !== null) return 1
      // Fallback to name
      return a.name.localeCompare(b.name)
    })
  }, [events, searchTerm, userLocation])
  
  const formatDistance = (distance) => {
    if (distance === null) return ''
    if (distance < 1) return `${Math.round(distance * 1000)}m away`
    return `${distance.toFixed(1)}km away`
  }
  
  const createEvent = async () => {
    if (!eventName.trim()) return alert('Event name is required')
    if (!eventLat || !eventLng) return alert('Location is required')
    
    try {
      const res = await axios.post(`${API}/admin/events`, {
        name: eventName,
        description: eventDesc,
        city: eventCity,
        start_date: eventStartDate,
        end_date: eventEndDate,
        max_capacity: maxCapacity,
        lat: parseFloat(eventLat),
        lng: parseFloat(eventLng)
      })
      
      setShowCreateModal(false)
      resetCreateForm()
      loadEvents()
      
      // Navigate to admin panel for this event
      navigate(`/admin/events/${res.data.id}`)
    } catch (e) {
      console.error('Error creating event:', e)
      alert('Error creating event. Please try again.')
    }
  }
  
  const joinEvent = async () => {
    if (!userName.trim()) return alert('Please enter your name')
    if (!agreed) return alert('Please agree to share your location')
    
    try {
      const res = await axios.post(`${API}/events/${selectedEventForJoin}/join`, {
        user_name: userName,
        phone: userPhone
      })
      
      setShowJoinModal(false)
      setUserName('')
      setUserPhone('')
      setAgreed(false)
      setSelectedEventForJoin(null)
      
      // Navigate to user dashboard with new routing
      navigate(`/users/event/${selectedEventForJoin}?user=${res.data.user_id}&name=${encodeURIComponent(userName)}`)
    } catch (e) {
      console.error('Error joining event:', e)
      alert('Error joining event. Please try again.')
    }
  }
  
  const resetCreateForm = () => {
    setEventName('')
    setEventDesc('')
    setEventCity('')
    setEventStartDate('')
    setEventEndDate('')
    setMaxCapacity(1000)
    getUserLocation()
  }
  
  const openJoinModal = (eventId) => {
    setSelectedEventForJoin(eventId)
    setShowJoinModal(true)
  }
  
  const formatDate = (dateStr) => {
    if (!dateStr) return ''
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short'
    })
  }
  
  return (
    <div className="landing">
      {/* Header */}
      <header className="landing-header">
        <h1>Public Safety & Crowd Management</h1>
        <p>Real-time monitoring, control, and communication for safer public events</p>
      </header>
      
      {/* Split Layout */}
      <div className="split-container">
        {/* Admin Card */}
        <div className="split-card admin-card">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <rect x="3" y="3" width="18" height="18" rx="2" ry="2"/>
              <line x1="3" y1="9" x2="21" y2="9"/>
              <line x1="9" y1="21" x2="9" y2="9"/>
            </svg>
          </div>
          <h2>Admin Panel</h2>
          <p>Create and manage events, monitor crowd density, view real-time analytics, and manage POIs and alerts.</p>
          <button className="card-btn admin-btn" onClick={() => navigate('/admin')}>
            Enter Admin Panel
          </button>
          <button className="card-btn secondary-btn" onClick={() => setShowCreateModal(true)}>
            + Create Event
          </button>
        </div>
        
        {/* User Card */}
        <div className="split-card user-card">
          <div className="card-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M17 21v-2a4 4 0 0 0-4-4H5a4 4 0 0 0-4 4v2"/>
              <circle cx="9" cy="7" r="4"/>
              <path d="M23 21v-2a4 4 0 0 0-3-3.87"/>
              <path d="M16 3.13a4 4 0 0 1 0 7.75"/>
            </svg>
          </div>
          <h2>Join Events</h2>
          <p>Find events near you, join to participate, and access your personal dashboard with live map.</p>
          
          {/* Search Input */}
          <div className="search-container">
            <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <circle cx="11" cy="11" r="8"/>
              <line x1="21" y1="21" x2="16.65" y2="16.65"/>
            </svg>
            <input
              type="text"
              className="search-input"
              placeholder="Search events by name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
            />
          </div>
          
          {/* Nearby Events List */}
          <div className="nearby-events">
            <h3>Nearby Events</h3>
            {sortedEvents.length === 0 ? (
              <div className="no-events">
                <p>No events found</p>
                <button className="card-btn primary-btn" onClick={() => setShowCreateModal(true)}>
                  Create an Event
                </button>
              </div>
            ) : (
              <div className="events-list">
                {sortedEvents.map(event => (
                  <div key={event.id} className="nearby-event-card">
                    <div className="event-info">
                      <div className="event-name-row">
                        <h4>{event.name}</h4>
                        {event.distance !== null && (
                          <span className="distance-badge">{formatDistance(event.distance)}</span>
                        )}
                      </div>
                      <div className="event-meta">
                        {event.city && <span className="meta-item">📍 {event.city}</span>}
                        {event.start_date && <span className="meta-item">📅 {formatDate(event.start_date)}</span>}
                      </div>
                      <div className="event-stats">
                        <span className="attendees">👥 {event.active_users || 0} attending</span>
                        <span className="capacity">Max: {event.max_capacity || 1000}</span>
                      </div>
                    </div>
                    <button 
                      className="join-btn"
                      onClick={() => openJoinModal(event.id)}
                    >
                      Join
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
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
                placeholder="Describe the event..."
              />
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>City</label>
                <input
                  type="text"
                  value={eventCity}
                  onChange={e => setEventCity(e.target.value)}
                  placeholder="New Delhi"
                />
              </div>
              <div className="form-group">
                <label>Max Capacity</label>
                <input
                  type="number"
                  value={maxCapacity}
                  onChange={e => setMaxCapacity(parseInt(e.target.value) || 1000)}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Start Date</label>
                <input
                  type="date"
                  value={eventStartDate}
                  onChange={e => setEventStartDate(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>End Date</label>
                <input
                  type="date"
                  value={eventEndDate}
                  onChange={e => setEventEndDate(e.target.value)}
                />
              </div>
            </div>
            
            <div className="form-row">
              <div className="form-group">
                <label>Latitude *</label>
                <input
                  type="text"
                  value={eventLat}
                  onChange={e => setEventLat(e.target.value)}
                />
              </div>
              <div className="form-group">
                <label>Longitude *</label>
                <input
                  type="text"
                  value={eventLng}
                  onChange={e => setEventLng(e.target.value)}
                />
              </div>
            </div>
            
            <p className="hint">Location will be used as event center on map</p>
            
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
      
      {/* Join Event Modal */}
      {showJoinModal && (
        <div className="modal-overlay" onClick={() => setShowJoinModal(false)}>
          <div className="modal" onClick={e => e.stopPropagation()}>
            <h2>Join Event</h2>
            
            <div className="form-group">
              <label>Your Name *</label>
              <input
                type="text"
                value={userName}
                onChange={e => setUserName(e.target.value)}
                placeholder="Enter your name"
              />
            </div>
            
            <div className="form-group">
              <label>Phone Number</label>
              <input
                type="tel"
                value={userPhone}
                onChange={e => setUserPhone(e.target.value)}
                placeholder="+91 xxxxx xxxxx"
              />
            </div>
            
            <div className="terms-notice">
              <label className="agree-checkbox">
                <input
                  type="checkbox"
                  checked={agreed}
                  onChange={e => setAgreed(e.target.checked)}
                />
                I agree to share my location for safety purposes
              </label>
            </div>
            
            <div className="modal-actions">
              <button className="btn-secondary" onClick={() => setShowJoinModal(false)}>
                Cancel
              </button>
              <button 
                className="btn-primary" 
                onClick={joinEvent}
                disabled={!agreed}
              >
                Join Event
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default Landing
