const TERMIN_CATEGORIES = {

  training: {
    color: '#2e8b57',
    icon: '🚵'
  },

  vereinsleben: {
    color: '#f1c40f',
    icon: '🎉'
  },

  race: {
    color: '#e74c3c',
    icon: '🏁'
  },

  flex: {
    color: '#3498db',
    icon: '🔄'
  },

  event: {
    color: '#9b59b6',
    icon: '📅'
  }

};

const DEFAULT_TERMIN_CATEGORY = {
  color: '#3498db',
  icon: '📍'
};

function getTerminCategory(key) {

  return TERMIN_CATEGORIES[key] || DEFAULT_TERMIN_CATEGORY;

}
