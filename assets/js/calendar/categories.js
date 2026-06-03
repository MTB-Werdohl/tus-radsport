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

const TERMIN_CATEGORY_LABELS = {

  training: 'Training',
  vereinsleben: 'Vereinsleben',
  race: 'Rennen',
  flex: 'Flex-Tour',
  event: 'Event'

};

const DEFAULT_TERMIN_CATEGORY = {
  color: '#3498db',
  icon: '📍'
};

function getTerminCategory(key) {

  return TERMIN_CATEGORIES[key] || DEFAULT_TERMIN_CATEGORY;

}

function getTerminCategoryLabel(key) {

  return TERMIN_CATEGORY_LABELS[key] || key;

}

function populateTerminCategorySelect(
  selectElement,
  selectedValue = ''
) {

  if (!selectElement) {
    return;
  }

  selectElement.innerHTML = '';

  const placeholder =
    document.createElement('option');

  placeholder.value = '';
  placeholder.textContent =
    'Kategorie wählen…';

  selectElement.appendChild(placeholder);

  Object.keys(TERMIN_CATEGORIES).forEach((key) => {

    const category =
      TERMIN_CATEGORIES[key];

    const option =
      document.createElement('option');

    option.value = key;
    option.textContent =
      `${category.icon} ${getTerminCategoryLabel(key)}`;

    selectElement.appendChild(option);

  });

  if (
    selectedValue
    && !TERMIN_CATEGORIES[selectedValue]
  ) {

    const legacy =
      document.createElement('option');

    legacy.value = selectedValue;
    legacy.textContent =
      `${selectedValue} (bestehend)`;

    selectElement.appendChild(legacy);

  }

  selectElement.value =
    selectedValue || '';

}
