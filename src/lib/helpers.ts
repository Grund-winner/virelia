export function formatTime(datetime: string): string {
  if (!datetime) return '';
  try {
    const d = new Date(datetime);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

export function formatDate(datetime: string): string {
  if (!datetime) return '-';
  try {
    const d = new Date(datetime);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(now.getTime() - 86400000);
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long' });
  } catch {
    return datetime;
  }
}

export function formatDateFull(datetime: string): string {
  if (!datetime) return '';
  try {
    const d = new Date(datetime);
    const now = new Date();
    if (d.toDateString() === now.toDateString()) return "Aujourd'hui";
    const yesterday = new Date(now.getTime() - 86400000);
    if (d.toDateString() === yesterday.toDateString()) return 'Hier';
    return d.toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' });
  } catch {
    return datetime;
  }
}

export function formatTimeShort(datetime: string): string {
  if (!datetime) return '';
  try {
    const d = new Date(datetime);
    return d.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', hour12: false });
  } catch {
    return '';
  }
}

export function escapeHtml(text: string): string {
  if (!text) return '';
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}
