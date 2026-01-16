import { useState, useEffect, useRef } from 'react'
import './SOSAlert.css'
import sosAudio from '../../utils/SOSAudio'

function SOSAlert({ alert, onDismiss, onRespond }) {
  const [sliderValue, setSliderValue] = useState(0)
  const [isResponding, setIsResponding] = useState(false)
  const [showSlider, setShowSlider] = useState(false)
  const alertRef = useRef(null)
  const pulseRef = useRef(null)

  // Play sound when alert appears
  useEffect(() => {
    if (alert) {
      sosAudio.playWarningSound(5000)
      
      // Pulse animation
      if (pulseRef.current) {
        pulseRef.current.classList.add('pulsing')
      }
    }
    
    return () => {
      sosAudio.stop()
    }
  }, [alert])

  // Auto-show slider after initial display
  useEffect(() => {
    if (alert) {
      const timer = setTimeout(() => {
        setShowSlider(true)
      }, 1500)
      return () => clearTimeout(timer)
    }
  }, [alert])

  // Handle slider drag
  const handleSliderChange = (e) => {
    const value = parseInt(e.target.value)
    setSliderValue(value)
    
    // Auto-respond when slider reaches 100%
    if (value >= 100) {
      handleResponse()
    }
  }

  const handleResponse = () => {
    setIsResponding(true)
    sosAudio.stop()
    
    setTimeout(() => {
      onRespond?.(alert.id, sliderValue)
    }, 500)
  }

  const handleDismiss = () => {
    sosAudio.stop()
    onDismiss?.(alert.id)
  }

  const formatTime = (timeStr) => {
    if (!timeStr) return ''
    const date = new Date(timeStr)
    return date.toLocaleTimeString('en-IN', { 
      hour: '2-digit', 
      minute: '2-digit',
      second: '2-digit'
    })
  }

  if (!alert) return null

  const alertTypeColors = {
    'sos': { bg: 'linear-gradient(135deg, #ff6b6b, #ee5a24)', icon: '🚨' },
    'help': { bg: 'linear-gradient(135deg, #ffa502, #f39c12)', icon: '🆘' },
    'warning': { bg: 'linear-gradient(135deg, #ffdd59, #f1c40f)', icon: '⚠️' },
    'info': { bg: 'linear-gradient(135deg, #00d4ff, #0984e3)', icon: 'ℹ️' }
  }

  const colors = alertTypeColors[alert.alert_type?.toLowerCase()] || alertTypeColors['sos']

  return (
    <div className="sos-overlay" onClick={handleDismiss}>
      <div 
        className="sos-alert-container"
        ref={alertRef}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Pulse Effect */}
        <div className="sos-pulse" ref={pulseRef} style={{ background: colors.bg }} />
        
        {/* Main Alert Card */}
        <div className="sos-alert-card" style={{ background: colors.bg }}>
          {/* Header */}
          <div className="sos-header">
            <div className="sos-icon-container">
              <span className="sos-icon">{colors.icon}</span>
            </div>
            <div className="sos-title-section">
              <h2 className="sos-title">SOS ALERT</h2>
              <span className="sos-time">{formatTime(alert.created_at)}</span>
            </div>
            <button className="sos-close" onClick={handleDismiss}>
              ✕
            </button>
          </div>

          {/* Alert Content */}
          <div className="sos-content">
            <div className="sos-user-info">
              <div className="sos-avatar">
                {alert.user_name?.charAt(0).toUpperCase() || 'U'}
              </div>
              <div className="sos-user-details">
                <span className="sos-user-name">{alert.user_name || 'Unknown User'}</span>
                <span className="sos-user-id">ID: {alert.user_id}</span>
              </div>
            </div>

            {alert.description && (
              <div className="sos-description">
                <p>"{alert.description}"</p>
              </div>
            )}

            <div className="sos-location">
              <span className="location-icon">📍</span>
              <span className="location-text">
                {alert.lat?.toFixed(6)}, {alert.lng?.toFixed(6)}
              </span>
            </div>

            {/* Action Buttons */}
            <div className="sos-actions">
              <button 
                className="sos-btn view-map"
                onClick={() => onRespond?.(alert.id, 'view_map')}
              >
                <span>🗺</span> View on Map
              </button>
              
              <button 
                className="sos-btn call"
                onClick={() => onRespond?.(alert.id, 'call')}
              >
                <span>📞</span> Call
              </button>
            </div>

            {/* Slider Response */}
            {showSlider && (
              <div className={`sos-slider-container ${isResponding ? 'responding' : ''}`}>
                <div className="slider-header">
                  <span>Slide to Respond</span>
                  <span className="slider-percentage">{sliderValue}%</span>
                </div>
                
                <div className="slider-track">
                  <div 
                    className="slider-fill"
                    style={{ width: `${sliderValue}%` }}
                  />
                  <input
                    type="range"
                    min="0"
                    max="100"
                    value={sliderValue}
                    onChange={handleSliderChange}
                    className="slider-input"
                    disabled={isResponding}
                  />
                  <div className="slider-thumb">
                    {isResponding ? '✓' : '→'}
                  </div>
                </div>
                
                {isResponding && (
                  <div className="response-status">
                    <span className="status-icon">✓</span>
                    <span>Response Sent!</span>
                  </div>
                )}
              </div>
            )}

            {/* Quick Response Options */}
            {!showSlider && !isResponding && (
              <div className="quick-responses">
                <button 
                  className="quick-response"
                  onClick={() => onRespond?.(alert.id, 'acknowledged')}
                >
                  ✓ Acknowledged
                </button>
                <button 
                  className="quick-response"
                  onClick={() => onRespond?.(alert.id, 'dispatching_help')}
                  style={{ background: 'rgba(255,255,255,0.2)' }}
                >
                  🚑 Dispatch Help
                </button>
              </div>
            )}
          </div>

          {/* Alert Type Badge */}
          <div className="sos-type-badge">
            {alert.alert_type?.toUpperCase() || 'SOS'}
          </div>
        </div>

        {/* Status Bar */}
        <div className="sos-status-bar">
          <div className="status-item">
            <span className="status-dot active"></span>
            <span>Live Alert</span>
          </div>
          <div className="status-item">
            <span className="status-icon">📡</span>
            <span>Tracking Location</span>
          </div>
        </div>
      </div>
    </div>
  )
}

export default SOSAlert
