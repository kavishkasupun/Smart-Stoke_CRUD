/**
 * Format a number as Sri Lankan Rupee currency.
 * @param {number} amount
 * @returns {string}
 */
export function formatCurrency(amount) {
  if (amount == null || isNaN(amount)) return 'Rs. 0.00';
  return `Rs. ${Number(amount).toLocaleString('en-LK', {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  })}`;
}

/**
 * Format a date string or Date object to a readable format.
 * @param {string|Date} date
 * @param {object} options
 * @param {boolean} [options.includeTime=false]
 * @returns {string}
 */
export function formatDate(date, { includeTime = false } = {}) {
  if (!date) return '—';
  
  // Handle Firestore Timestamp
  let d;
  if (typeof date === 'object' && date.seconds !== undefined) {
    d = new Date(date.seconds * 1000);
  } else {
    d = new Date(date);
  }

  if (isNaN(d.getTime())) return '—';

  const dateStr = d.toLocaleDateString('en-GB', {
    day: '2-digit',
    month: 'short',
    year: 'numeric',
  });

  if (!includeTime) return dateStr;

  const timeStr = d.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  });

  return `${dateStr}, ${timeStr}`;
}

/**
 * Format a number with thousands separators.
 * @param {number} num
 * @returns {string}
 */
export function formatNumber(num) {
  if (num == null || isNaN(num)) return '0';
  return Number(num).toLocaleString('en-LK');
}

/**
 * Truncate a string to a max length with ellipsis.
 * @param {string} str
 * @param {number} maxLength
 * @returns {string}
 */
export function truncate(str, maxLength = 30) {
  if (!str) return '';
  if (str.length <= maxLength) return str;
  return str.slice(0, maxLength) + '…';
}

/**
 * Generate a simple unique ID (not for database use).
 * @param {string} prefix
 * @returns {string}
 */
export function generateId(prefix = 'id') {
  return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2, 9)}`;
}
