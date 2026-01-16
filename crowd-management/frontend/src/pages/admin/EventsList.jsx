import { useState, useEffect } from 'react'
import { Link, useOutletContext } from 'react-router-dom'
import axios from 'axios'
import './EventsList.css'

const API = 'http://localhost:8000/api'

function EventsList() {
  const { setCurrentEvent } = useOutletContext()
  const [events, setEvents] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadEvents()
  }, [])
  
  const loadEvents = async () => {
    try {
      const res = await axios.get(`${API}/admin/events`)
      setEvents(res.data)
    } catch (e) {
      console.log('Error loading events:', e)
    } finally {
      setLoading(false)
    }
  }
  
  const handleSelectEvent = (event) => {
    setCurrentEvent(event)
  }
  
  const formatDate = (dateStr) => {
    if (!dateStr) return 'No date'
    return new Date(dateStr).toLocaleDateString('en-IN', {
      day: 'numeric',
      month: 'short',
      year: 'numeric'
    })
  }
  
  const getCapacityColor = (current, max) => {
    const ratio = current / max
    if (ratio >= 0.9) return '#ff6b6b'
    if (ratio >= 0.7) return '#ffff00'
    return '#00ff88'
  }
  
  if (loading) {
    return (
      <div className="events-list-page loading">
        <div className="loading-spinner">Loading events...</div>
      </div>
    )
  }
  
  return (
    <div className="events-list-page">
      <header className="page-header">
        <h1>Event Management</h1>
        <Link to="/admin/events/create" className="create-btn">
          + Create Event
        </Link>
      </header>
      
      <div className="events-grid">
        {events.length === 0 ? (
          <div className="empty-state">
            <div className="empty-icon">📅</div>
            <h3>No Events Yet</h3>
            <p>Create your first event to get started</p>
            <Link to="/admin/events/create" className="create-link">
              Create Event
            </Link>
          </div>
        ) : (
          events.map(event => (
            <div 
              key={event.id} 
              className="event-card"
              onClick={() => handleSelectEvent(event)}
            >
              <div className="event-header">
                <h3>{event.name}</h3>
                <span className="event-id">#{event.id}</span>
              </div>
              
              {event.description && (
                <p className="event-description">{event.description}</p>
              )}
              
              <div className="event-meta">
                {event.city && (
                  <span className="meta-item">
                    📍 {event.city}
                  </span>
                )}
                {event.start_date && (
                  <span className="meta-item">
                    📅 {formatDate(event.start_date)}
                  </span>
                )}
              </div>
              
              <div className="event-stats">
                <div className="stat">
                  <span className="stat-value">{event.active_users}</span>
                  <span className="stat-label">Participants</span>
                </div>
                <div className="stat capacity">
                  <div className="capacity-bar">
                    <div 
                      className="capacity-fill"
                      style={{ 
                        width: `${Math.min(100, (event.active_users / (event.max_capacity || 1000)) * 100)}%`,
                        backgroundColor: getCapacityColor(event.active_users, event.max_capacity || 1000)
                      }}
                    />
                  </div>
                  <span className="capacity-text">
                    {event.max_capacity || 1000} capacity
                  </span>
                </div>
              </div>
              
              <div className="event-actions">
                <Link 
                  to={`/admin/events/${event.id}`}
                  className="action-btn primary"
                  onClick={(e) => e.stopPropagation()}
                >
                  Open Dashboard
                </Link>
                <Link 
                  to={`/admin/events/${event.id}/participants`}
                  className="action-btn secondary"
                  onClick={(e) => e.stopPropagation()}
                >
                  Participants
                </Link>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default EventsList
