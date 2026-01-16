import { useState, useEffect } from 'react'
import { useParams } from 'react-router-dom'
import axios from 'axios'
import './Alerts.css'

const API = 'http://localhost:8000/api'

function Alerts() {
  const { eventId } = useParams()
  const [alerts, setAlerts] = useState([])
  const [loading, setLoading] = useState(true)
  
  useEffect(() => {
    loadAlerts()
    const interval = setInterval(loadAlerts, 5000)
    return () => clearInterval(interval)
  }, [eventId])
  
  const loadAlerts = async () => {
    try {
      const res = await axios.get(`${API}/admin/events/${eventId}/alerts`)
      setAlerts(res.data || [])
    } catch (e) {
      console.log('Error loading alerts:', e)
    } finally {
      setLoading(false)
    }
  }
  
  const handleResolve = async (alertId) => {
    try {
      await axios.put(`${API}/admin/alerts/${alertId}/resolve`, { status: 'resolved' })
      loadAlerts()
    } catch (e) {
      console.log('Error resolving alert:', e)
    }
  }
  
  const handleDelete = async (alertId) => {
    if (!confirm('Delete this alert?')) return
    try {
      await axios.delete(`${API}/admin/alerts/${alertId}`)
      loadAlerts()
    } catch (e) {
      console.log('Error deleting alert:', e)
    }
  }
  
  const formatTime = (timeStr) => {
    if (!timeStr) return '-'
    const date = new Date(timeStr)
    const now = new Date()
    const diff = now - date
    
    if (diff < 60000) return 'Just now'
    if (diff < 3600000) return `${Math.floor(diff / 60000)}m ago`
    if (diff < 86400000) return `${Math.floor(diff / 3600000)}h ago`
    return date.toLocaleDateString()
  }
  
  const activeAlerts = alerts.filter(a => a.status === 'active')
  const resolvedAlerts = alerts.filter(a => a.status === 'resolved')
  
  if (loading) return <div className="alerts-page loading">Loading...</div>
  
  return (
    <div className="alerts-page">
      <div className="page-header">
        <h2>Alert Management</h2>
        <div className="alert-summary">
          <span className="active-count">{activeAlerts.length} Active</span>
          <span className="resolved-count">{resolvedAlerts.length} Resolved</span>
        </div>
      </div>
      
      <div className="alerts-sections">
        <section className="alert-section">
          <h3>🚨 Active Alerts ({activeAlerts.length})</h3>
          {activeAlerts.length === 0 ? (
            <p className="empty-message">No active alerts</p>
          ) : (
            <div className="alerts-list">
              {activeAlerts.map(alert => (
                <div key={alert.id} className="alert-card active">
                  <div className="alert-header">
                    <span className="alert-type">{alert.alert_type.toUpperCase()}</span>
                    <span className="alert-time">{formatTime(alert.created_at)}</span>
                  </div>
                  <div className="alert-body">
                    <p className="alert-user">From: {alert.user_name}</p>
                    {alert.description && <p className="alert-desc">{alert.description}</p>}
                    <p className="alert-coords">
                      📍 {alert.lat.toFixed(4)}, {alert.lng.toFixed(4)}
                    </p>
                  </div>
                  <div className="alert-actions">
                    <button className="resolve-btn" onClick={() => handleResolve(alert.id)}>
                      ✓ Resolve
                    </button>
                    <button className="delete-btn" onClick={() => handleDelete(alert.id)}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
        
        <section className="alert-section">
          <h3>✅ Resolved Alerts ({resolvedAlerts.length})</h3>
          {resolvedAlerts.length === 0 ? (
            <p className="empty-message">No resolved alerts</p>
          ) : (
            <div className="alerts-list">
              {resolvedAlerts.map(alert => (
                <div key={alert.id} className="alert-card resolved">
                  <div className="alert-header">
                    <span className="alert-type">{alert.alert_type.toUpperCase()}</span>
                    <span className="alert-time">{formatTime(alert.created_at)}</span>
                  </div>
                  <div className="alert-body">
                    <p className="alert-user">From: {alert.user_name}</p>
                  </div>
                  <div className="alert-actions">
                    <button className="delete-btn" onClick={() => handleDelete(alert.id)}>
                      🗑
                    </button>
                  </div>
                </div>
              ))}
            </div>
          )}
        </section>
      </div>
    </div>
  )
}

export default Alerts
