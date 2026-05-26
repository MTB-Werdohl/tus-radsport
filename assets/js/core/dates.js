function formatDateLong(dateString) {

  if (!dateString) {
    return '';
  }

  return new Date(dateString)
    .toLocaleDateString('de-DE', {
      day: '2-digit',
      month: 'long',
      year: 'numeric'
    });

}
