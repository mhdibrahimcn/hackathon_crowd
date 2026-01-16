// SOS Alert Audio Utility
// Uses Web Audio API to generate warning sounds

class SOSAudio {
  constructor() {
    this.audioContext = null
    this.isPlaying = false
    this.oscillator = null
    this.gainNode = null
  }

  initAudio() {
    if (!this.audioContext) {
      this.audioContext = new (window.AudioContext || window.webkitAudioContext)()
    }
    return this.audioContext
  }

  playWarningSound(duration = 3000) {
    try {
      const ctx = this.initAudio()
      
      // Stop any existing sound
      this.stop()
      
      this.isPlaying = true
      
      // Create oscillators for alarm sound
      const oscillator1 = ctx.createOscillator()
      const oscillator2 = ctx.createOscillator()
      const gainNode = ctx.gainNode
      
      // Configure oscillators for siren effect
      oscillator1.type = 'sine'
      oscillator1.frequency.setValueAtTime(800, ctx.currentTime)
      
      oscillator2.type = 'sine'
      oscillator2.frequency.setValueAtTime(600, ctx.currentTime)
      
      // Create gain for volume control
      gainNode.gain.setValueAtTime(0.5, ctx.currentTime)
      
      // Connect to destination
      oscillator1.connect(gainNode)
      oscillator2.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      // Siren frequency sweep
      const now = ctx.currentTime
      const endTime = now + (duration / 1000)
      
      // Frequency modulation for siren effect
      oscillator1.frequency.exponentialRampToValueAtTime(1200, now + 0.5)
      oscillator1.frequency.exponentialRampToValueAtTime(800, now + 1.0)
      oscillator1.frequency.exponentialRampToValueAtTime(1200, now + 1.5)
      oscillator1.frequency.exponentialRampToValueAtTime(800, now + 2.0)
      oscillator1.frequency.exponentialRampToValueAtTime(1200, now + 2.5)
      oscillator1.frequency.exponentialRampToValueAtTime(800, now + 3.0)
      
      oscillator2.frequency.exponentialRampToValueAtTime(400, now + 0.5)
      oscillator2.frequency.exponentialRampToValueAtTime(600, now + 1.0)
      oscillator2.frequency.exponentialRampToValueAtTime(400, now + 1.5)
      oscillator2.frequency.exponentialRampToValueAtTime(600, now + 2.0)
      oscillator2.frequency.exponentialRampToValueAtTime(400, now + 2.5)
      oscillator2.frequency.exponentialRampToValueAtTime(600, now + 3.0)
      
      // Volume envelope
      gainNode.gain.setValueAtTime(0.5, now)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.25)
      gainNode.gain.linearRampToValueAtTime(0.5, now + 0.5)
      gainNode.gain.linearRampToValueAtTime(0.3, now + 0.75)
      gainNode.gain.linearRampToValueAtTime(0.5, now + 1.0)
      
      // Start and stop
      oscillator1.start(now)
      oscillator2.start(now)
      oscillator1.stop(endTime)
      oscillator2.stop(endTime)
      
      // Store references for stopping
      this.oscillator = oscillator1
      this.gainNode = gainNode
      
      // Auto-stop flag
      setTimeout(() => {
        this.isPlaying = false
      }, duration)
      
    } catch (error) {
      console.error('Error playing SOS sound:', error)
    }
  }

  playNotificationSound() {
    try {
      const ctx = this.initAudio()
      
      const oscillator = ctx.createOscillator()
      const gainNode = ctx.gainNode
      
      oscillator.type = 'sine'
      oscillator.frequency.setValueAtTime(440, ctx.currentTime)
      oscillator.frequency.exponentialRampToValueAtTime(880, ctx.currentTime + 0.1)
      
      gainNode.gain.setValueAtTime(0.3, ctx.currentTime)
      gainNode.gain.exponentialRampToValueAtTime(0.01, ctx.currentTime + 0.3)
      
      oscillator.connect(gainNode)
      gainNode.connect(ctx.destination)
      
      oscillator.start(ctx.currentTime)
      oscillator.stop(ctx.currentTime + 0.3)
      
    } catch (error) {
      console.error('Error playing notification sound:', error)
    }
  }

  stop() {
    try {
      if (this.oscillator) {
        this.oscillator.stop()
        this.oscillator = null
      }
      if (this.gainNode) {
        this.gainNode.disconnect()
        this.gainNode = null
      }
      this.isPlaying = false
    } catch (error) {
      console.error('Error stopping sound:', error)
    }
  }

  isSoundPlaying() {
    return this.isPlaying
  }
}

// Export singleton instance
const sosAudio = new SOSAudio()
export default sosAudio

// Export class for custom instances
export { SOSAudio }
