import { useState, useEffect, useCallback, useRef } from 'react'
import axios from 'axios'
import sosAudio from '../utils/SOSAudio'

const API = 'http://localhost:8000/api'

function useSOSNotifications(eventId, enabled = true) {
  const [alerts, setAlerts] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [latestAlert, setLatestAlert] = useState(null)
  const [isPolling, setIsPolling] = useState(false)
  const previousAlertsRef = useRef([])
  const audioPlayedRef = useRef(new Set())

  const fetchAlerts = useCallback(async () => {
    if (!eventId || !enabled) return

    try {
      const res = await axios.get(`${API}/admin/events/${eventId}/alerts`)
      const newAlerts = res.data || []
      
      // Check for new SOS alerts
      const previousAlerts = previousAlertsRef.current
      const newAlertIds = new Set(newAlerts.map(a => a.id))
      
      // Find newly added SOS alerts
      const newSOSAlerts = newAlerts.filter(newAlert => {
        const isNew = !previousAlerts.some(prev => prev.id === newAlert.id)
        const isSOS = newAlert.alert_type?.toLowerCase() === 'sos'
        return isNew && isSOS
      })

      // Play sound for new SOS alerts
      if (newSOSAlerts.length > 0) {
        newSOSAlerts.forEach(alert => {
          if (!audioPlayedRef.current.has(alert.id)) {
            audioPlayedRef.current.add(alert.id)
            setLatestAlert(alert)
            sosAudio.playWarningSound(5000)
          }
        })
      }

      // Update state
      setAlerts(newAlerts)
      setUnreadCount(newAlerts.filter(a => a.status === 'active').length)
      previousAlertsRef.current = newAlerts

    } catch (error) {
      console.error('Error fetching SOS alerts:', error)
    }
  }, [eventId, enabled])

  // Start polling for alerts
  useEffect(() => {
    if (!enabled || !eventId) return

    // Initial fetch
    fetchAlerts()

    // Set up polling interval (every 2 seconds)
    const intervalId = setInterval(fetchAlerts, 2000)

    return () => {
      clearInterval(intervalId)
      sosAudio.stop()
    }
  }, [eventId, enabled, fetchAlerts])

  // Mark alert as read/dismissed
  const dismissAlert = useCallback((alertId) => {
    setLatestAlert(null)
    audioPlayedRef.current.delete(alertId)
    sosAudio.stop()
  }, [])

  // Send response to alert
  const respondToAlert = useCallback(async (alertId, response) => {
    try {
      await axios.put(`${API}/admin/alerts/${alertId}/resolve`, { 
        status: 'resolved',
        response: response
      })
      
      // Stop sound and dismiss
      dismissAlert(alertId)
      
      // Refresh alerts
      fetchAlerts()
      
      return true
    } catch (error) {
      console.error('Error responding to alert:', error)
      return false
    }
  }, [fetchAlerts, dismissAlert])

  // Manually stop sound
  const stopSound = useCallback(() => {
    sosAudio.stop()
    setLatestAlert(null)
  }, [])

  // Clear audio played tracking (e.g., when viewing alerts page)
  const clearAudioTracking = useCallback(() => {
    audioPlayedRef.current.clear()
  }, [])

  return {
    alerts,
    unreadCount,
    latestAlert,
    isPolling,
    dismissAlert,
    respondToAlert,
    stopSound,
    clearAudioTracking,
    refreshAlerts: fetchAlerts
  }
}

export default useSOSNotifications
