// Utilities for computing attendance-derived strings and ranges

export function buildActivityText({ late = 0, absent = 0 }) {
  if ((late || 0) === 0 && (absent || 0) === 0) {
    return 'No late arrivals or absences recorded during this period.';
  }
  const lateText = `${late} ${late === 1 ? 'late arrival' : 'late arrivals'}`;
  const absentText = `${absent} ${absent === 1 ? 'absence' : 'absences'}`;
  return `${lateText} and ${absentText} recorded during this period.`;
}

export function computeMonthRange(month, period) {
  if (!month) return null;
  const months = [
    'January','February','March','April','May','June',
    'July','August','September','October','November','December'
  ];
  const monthIndex = months.indexOf(month);
  if (monthIndex === -1) return null;
  const year = new Date().getFullYear();
  const lastDay = new Date(year, monthIndex + 1, 0).getDate();
  if (period === 'first') return `1 ${month} - 15 ${month}`;
  if (period === 'second') return `16 ${month} - ${lastDay} ${month}`;
  return `1 ${month} - ${lastDay} ${month}`;
}
