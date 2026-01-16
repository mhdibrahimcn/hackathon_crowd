import { useState } from 'react'
import { Outlet, Link, useLocation, useNavigate } from 'react-router-dom'
import useSOSNotifications from '../../hooks/useSOSNotifications'
import SOSAlert from '../../components/SOS/SOSAlert'
import './AdminLayout.css'

function AdminLayout() {
  const location = useLocation()
  const navigate = useNavigate()
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false)
  const [currentEvent, setCurrentEvent] = useState(null)
  
  // Get event ID from URL or use current event
  const eventId = location.pathname.match(/\/admin\/events\/(\d+)/)?.[1] || currentEvent?.id
  
  // Use SOS notifications
  const { 
    latestAlert, 
    dismissAlert, 
    respondToAlert, 
    stopSound,
    unreadCount 
  } = useSOSNotifications(eventId, !!eventId)
  
  const isActive = (path) => {
    if (path === '/admin' && location.pathname === '/admin') return true
    if (path !== '/admin' && location.pathname.startsWith(path)) return true
    return false
  }
  
  const handleEventSelect = (event) => {
    setCurrentEvent(event)
  }
  
  const handleSOSRespond = async (alertId, response) => {
    const success = await respondToAlert(alertId, response)
    if (success && response === 'view_map') {
      // Navigate to event dashboard to see location
      if (eventId) {
        navigate(`/admin/events/${eventId}`)
      }
    }
  }
  
  const handleSOSDismiss = (alertId) => {
    dismissAlert(alertId)
  }
  
  return (
    <div className="admin-layout">
      {/* SOS Alert Popup */}
      {latestAlert && (
        <SOSAlert
          alert={latestAlert}
          onDismiss={handleSOSDismiss}
          onRespond={handleSOSRespond}
        />
      )}
      
      {/* Sidebar */}
      <aside className={`admin-sidebar ${sidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-header">
          <h2>Admin Panel</h2>
          <button 
            className="collapse-btn"
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          >
            {sidebarCollapsed ? '→' : '←'}
          </button>
        </div>
        
        {!sidebarCollapsed && (
          <>
            <nav className="sidebar-nav">
              <Link 
                to="/admin" 
                className={`nav-item ${isActive('/admin') && location.pathname === '/admin' ? 'active' : ''}`}
              >
                <span className="nav-icon">📋</span>
                <span className="nav-text">Events</span>
              </Link>
              
              <Link 
                to="/admin/events/create" 
                className={`nav-item ${isActive('/admin/events/create') ? 'active' : ''}`}
              >
                <span className="nav-icon">+</span>
                <span className="nav-text">Create Event</span>
              </Link>
              
              {eventId && (
                <Link 
                  to={`/admin/events/${eventId}/alerts`}
                  className={`nav-item ${isActive('/admin/events/') && location.pathname.includes('/alerts') ? 'active' : ''}`}
                >
                  <span className="nav-icon">🚨</span>
                  <span className="nav-text">
                    Alerts
                    {unreadCount > 0 && (
                      <span className="alert-badge">{unreadCount}</span>
                    )}
                  </span>
                </Link>
              )}
            </nav>
            
            {currentEvent && (
              <div className="current-event">
                <h4>Current Event</h4>
                <p className="event-name">{currentEvent.name}</p>
                <div className="event-actions">
                  <Link to={`/admin/events/${currentEvent.id}`} className="action-link">
                    Dashboard
                  </Link>
                  <Link to={`/admin/events/${currentEvent.id}/participants`} className="action-link">
                    Participants
                  </Link>
                  <Link to={`/admin/events/${currentEvent.id}/poi`} className="action-link">
                    POI
                  </Link>
                  <Link to={`/admin/events/${currentEvent.id}/alerts`} className="action-link">
                    Alerts
                    {unreadCount > 0 && (
                      <span className="action-badge">{unreadCount}</span>
                    )}
                  </Link>
                </div>
              </div>
            )}
            
            <div className="sidebar-footer">
              <Link to="/" className="back-link">
                ← Back to Home
              </Link>
            </div>
          </>
        )}
      </aside>
      
      {/* Main Content */}
      <main className="admin-main">
        <Outlet context={{ currentEvent, setCurrentEvent }} />
      </main>
    </div>
  )
}

export default AdminLayout
