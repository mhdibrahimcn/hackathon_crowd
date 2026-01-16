import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import './Participants.css'

const API = 'http://localhost:8000/api'

function Participants() {
  const { eventId } = useParams()
  const [participants, setParticipants] = useState([])
  const [loading, setLoading] = useState(true)
  const [search, setSearch] = useState('')
  
  useEffect(() => {
    loadParticipants()
  }, [eventId])
  
  const loadParticipants = async () => {
    try {
      const res = await axios.get(`${API}/admin/events/${eventId}/participants`)
      setParticipants(res.data)
    } catch (e) {
      console.log('Error loading participants:', e)
    } finally {
      setLoading(false)
    }
  }
  
  const handleCheckIn = async (userId) => {
    try {
      await axios.put(`${API}/admin/events/${eventId}/participants/${userId}/checkin`)
      loadParticipants()
    } catch (e) {
      console.log('Error checking in:', e)
    }
  }
  
  const handleCheckOut = async (userId) => {
    try {
      await axios.put(`${API}/admin/events/${eventId}/participants/${userId}/checkout`)
      loadParticipants()
    } catch (e) {
      console.log('Error checking out:', e)
    }
  }
  
  const filteredParticipants = participants.filter(p => 
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    (p.phone && p.phone.includes(search))
  )
  
  const formatTime = (timeStr) => {
    if (!timeStr) return '-'
    return new Date(timeStr).toLocaleTimeString('en-IN', {
      hour: '2-digit',
      minute: '2-digit'
    })
  }
  
  if (loading) {
    return <div className="participants-page loading">Loading...</div>
  }
  
  return (
    <div className="participants-page">
      <div className="page-header">
        <h2>Participants</h2>
        <div className="search-box">
          <input
            type="text"
            placeholder="Search by name or phone..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
      </div>
      
      <div className="participants-stats">
        <div className="stat">
          <span className="value">{participants.length}</span>
          <span className="label">Total</span>
        </div>
        <div className="stat">
          <span className="value">{participants.filter(p => p.status === 'checked_in').length}</span>
          <span className="label">Checked In</span>
        </div>
        <div className="stat">
          <span className="value">{participants.filter(p => p.status === 'active').length}</span>
          <span className="label">Active</span>
        </div>
      </div>
      
      <div className="participants-list">
        {filteredParticipants.length === 0 ? (
          <div className="empty">No participants found</div>
        ) : (
          filteredParticipants.map(p => (
            <div key={p.id} className="participant-card">
              <div className="participant-info">
                <div className="participant-avatar">{p.name[0]}</div>
                <div className="participant-details">
                  <h4>{p.name}</h4>
                  <p>{p.phone || 'No phone'}</p>
                </div>
              </div>
              <div className="participant-status">
                <span className={`status-badge ${p.status}`}>
                  {p.status}
                </span>
              </div>
              <div className="participant-times">
                <span>Check-in: {formatTime(p.check_in_time)}</span>
                <span>Check-out: {formatTime(p.check_out_time)}</span>
              </div>
              <div className="participant-actions">
                {p.status !== 'checked_in' ? (
                  <button onClick={() => handleCheckIn(p.id)}>Check In</button>
                ) : (
                  <button onClick={() => handleCheckOut(p.id)}>Check Out</button>
                )}
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  )
}

export default Participants
