import { format, parseISO, isAfter, isBefore, addDays } from 'date-fns';

export const formatDate = (dateStr) => {
  if (!dateStr) return '';
  try {
    return format(parseISO(dateStr.includes('T') ? dateStr : dateStr + 'T00:00:00'), 'MMM d, yyyy');
  } catch {
    return dateStr;
  }
};

export const isOverdue = (dateStr) => {
  if (!dateStr) return false;
  try {
    const due = parseISO(dateStr.includes('T') ? dateStr : dateStr + 'T23:59:59');
    return isBefore(due, new Date());
  } catch { return false; }
};

export const isDueSoon = (dateStr) => {
  if (!dateStr) return false;
  try {
    const due = parseISO(dateStr.includes('T') ? dateStr : dateStr + 'T23:59:59');
    const soon = addDays(new Date(), 3);
    return !isBefore(due, new Date()) && isBefore(due, soon);
  } catch { return false; }
};

export const getPriorityColor = (priority) => ({
  urgent: 'var(--red)',
  high: 'var(--orange)',
  medium: 'var(--blue)',
  low: 'var(--text-3)',
}[priority] || 'var(--text-3)');
