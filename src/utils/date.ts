export function getTodayDateString(): string {
  const now = new Date();
  // Format as YYYYMMDD in US Eastern Time (NBA official standard)
  try {
    const formatter = new Intl.DateTimeFormat('en-US', {
      timeZone: 'America/New_York',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
    const parts = formatter.formatToParts(now);
    const year = parts.find(p => p.type === 'year')?.value || `${now.getFullYear()}`;
    const month = parts.find(p => p.type === 'month')?.value || `${now.getMonth() + 1}`.padStart(2, '0');
    const day = parts.find(p => p.type === 'day')?.value || `${now.getDate()}`.padStart(2, '0');
    return `${year}${month}${day}`;
  } catch {
    const y = now.getFullYear();
    const m = String(now.getMonth() + 1).padStart(2, '0');
    const d = String(now.getDate()).padStart(2, '0');
    return `${y}${m}${d}`;
  }
}
