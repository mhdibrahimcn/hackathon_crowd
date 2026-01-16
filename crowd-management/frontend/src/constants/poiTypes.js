// POI Types Configuration
// Used for Points of Interest management in the admin panel

export const POI_TYPES = {
  entrance: { color: '#00ff88', icon: '🚪' },
  exit: { color: '#ff6b6b', icon: '🚪' },
  medical: { color: '#ff0000', icon: '🏥' },
  security: { color: '#ffa500', icon: '👮' },
  food: { color: '#ffff00', icon: '🍔' },
  toilet: { color: '#00d4ff', icon: '🚽' },
  info: { color: '#7b2cbf', icon: 'ℹ️' },
  parking: { color: '#888888', icon: '🅿️' },
  stage: { color: '#ff00ff', icon: '🎤' },
  first_aid: { color: '#ff3333', icon: '⛑️' }
}

export const getPOITypeOptions = () => {
  return Object.entries(POI_TYPES).map(([key, val]) => ({
    value: key,
    label: `${val.icon} ${key.charAt(0).toUpperCase() + key.slice(1)}`,
    color: val.color
  }))
}
