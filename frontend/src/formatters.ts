/**
 * Shared Clinical and Financial Formatters for Heal Your Heart EHR
 */

/**
 * Formats a monetary value into Indian Rupee format (₹) with standard Indian comma grouping (lakhs/crores).
 * e.g., 150000 -> "₹1,50,000.00"
 */
export function formatCurrencyINR(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === "") {
    return "₹0.00";
  }

  const num = typeof amount === "string" ? parseFloat(amount) : amount;
  if (isNaN(num)) {
    return "₹0.00";
  }

  // Format with en-IN locale
  return new Intl.NumberFormat("en-IN", {
    style: "currency",
    currency: "INR",
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(num);
}

/**
 * Formats a date string or Date object into clinical DD MMM YYYY format.
 * e.g., "2026-10-26" -> "26 Oct 2026"
 */
export function formatClinicalDate(dateInput: string | Date | null | undefined): string {
  if (!dateInput) return "—";

  try {
    const d = typeof dateInput === "string" ? new Date(dateInput) : dateInput;
    if (isNaN(d.getTime())) {
      // If date parsing fails, return raw string fallback
      return String(dateInput);
    }

    const day = String(d.getDate()).padStart(2, "0");
    const months = [
      "Jan", "Feb", "Mar", "Apr", "May", "Jun",
      "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"
    ];
    const month = months[d.getMonth()];
    const year = d.getFullYear();

    return `${day} ${month} ${year}`;
  } catch {
    return String(dateInput);
  }
}
