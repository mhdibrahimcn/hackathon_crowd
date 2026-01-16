import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import axios from 'axios'
import './UserJoin.css'

const API = 'http://localhost:8000/api'

function UserJoin() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [events, setEvents] = useState([])
  const [formData, setFormData] = useState({
    name: '',
    phone: '',
    event_id: searchParams.get('event') || ''
  })
  const [loading, setLoading] = useState(true)
  const [submitting, setSubmitting] = useState(false)
  const [agreed, setAgreed] = useState(false)
  
  useEffect(() => {
    loadEvents()
  }, [])
  
  const loadEvents = async () => {
    try {
      const res = await axios.get(`${API}/events`)
      setEvents(res.data)
    } catch (e) {
      console.log('Error loading events:', e)
    } finally {
      setLoading(false)
    }
  }
  
  const handleInputChange = (e) => {
    const { name, value } = e.target
    setFormData(prev => ({ ...prev, [name]: value }))
  }
  
  const handleSubmit = async (e) => {
    e.preventDefault()
    
    if (!formData.name.trim()) {
      alert('Please enter your name')
      return
    }
    
    if (!formData.event_id) {
      alert('Please select an event')
      return
    }
    
    if (!agreed) {
      alert('Please agree to the terms to continue')
      return
    }
    
    setSubmitting(true)
    
    try {
      const res = await axios.post(`${API}/events/${formData.event_id}/join`, {
        user_name: formData.name,
        phone: formData.phone
      })
      
      navigate(`/users/event/${formData.event_id}?user=${res.data.user_id}&name=${encodeURIComponent(formData.name)}`)
    } catch (e) {
      console.log('Error joining event:', e)
      alert('Failed to join event. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }
  
  if (loading) {
    return (
      <div className="user-join-page loading">
        <div className="loading-spinner">Loading events...</div>
      </div>
    )
  }
  
  return (
    <div className="user-join-page">
      <div className="join-container">
        <div className="join-header">
          <h1>Join Event</h1>
          <p>Enter your details to participate in the event</p>
        </div>
        
        <form className="join-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Your Name *</label>
            <input
              type="text"
              name="name"
              value={formData.name}
              onChange={handleInputChange}
              placeholder="Enter your full name"
              required
            />
          </div>
          
          <div className="form-group">
            <label>Phone Number</label>
            <input
              type="tel"
              name="phone"
              value={formData.phone}
              onChange={handleInputChange}
              placeholder="+91 xxxxx xxxxx"
            />
          </div>
          
          <div className="form-group">
            <label>Select Event *</label>
            <select
              name="event_id"
              value={formData.event_id}
              onChange={handleInputChange}
              required
            >
              <option value="">Choose an event...</option>
              {events.map(event => (
                <option key={event.id} value={event.id}>
                  {event.name} {event.city ? `(${event.city})` : ''} - {event.active_users} attending
                </option>
              ))}
            </select>
          </div>
          
          <div className="terms-notice">
            <p>
              By joining this event, you agree to share your location with the 
              event organizers for safety and crowd management purposes.
            </p>
            <label className="agree-checkbox">
              <input
                type="checkbox"
                checked={agreed}
                onChange={(e) => setAgreed(e.target.checked)}
              />
              I agree to share my location and understand I can opt-out anytime
            </label>
          </div>
          
          <button 
            type="submit" 
            className="submit-btn"
            disabled={submitting || !agreed}
          >
            {submitting ? 'Joining...' : 'Join Event'}
          </button>
        </form>
        
        <div className="back-link">
          <a href="/">← Back to Home</a>
        </div>
      </div>
    </div>
  )
}

export default UserJoin
