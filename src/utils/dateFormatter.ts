/**
 * Date Formatting Utilities
 * Ensures dates are always displayed with Western numerals (0-9)
 * regardless of user's language selection
 */

/**
 * Format date with normal numbers (0-9)
 * @param dateString - ISO date string or Date object
 * @returns Formatted date as DD/MM/YYYY
 */
export const formatDate = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    return `${day}/${month}/${year}`;
  } catch {
    return String(dateString);
  }
};

/**
 * Format date with time
 * @param dateString - ISO date string or Date object
 * @returns Formatted date and time as DD/MM/YYYY HH:mm
 */
export const formatDateTime = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    const day = String(date.getDate()).padStart(2, '0');
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const year = date.getFullYear();
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${day}/${month}/${year} ${hours}:${minutes}`;
  } catch {
    return String(dateString);
  }
};

/**
 * Format date as long format
 * @param dateString - ISO date string or Date object
 * @returns Formatted date as "Jan 15, 2026"
 */
export const formatDateLong = (dateString: string | Date): string => {
  try {
    const date = new Date(dateString);
    const options: Intl.DateTimeFormatOptions = {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    };
    // Use en-US locale to ensure English month names with Western numerals
    return date.toLocaleDateString('en-US', options);
  } catch {
    return String(dateString);
  }
};

/**
 * Get today's date in YYYY-MM-DD format
 * @returns Today's date string
 */
export const getTodayISO = (): string => {
  return new Date().toISOString().split('T')[0];
};
