export function formatPhoneDisplay(input: string | null | undefined): string {
  const digits = String(input || "").replace(/\D/g, "").slice(0, 10);
  if (!digits) return "—";
  if (digits.length < 4) return digits;
  if (digits.length < 7) return `(${digits.slice(0, 3)}) ${digits.slice(3)}`;
  return `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`;
}

export const formatPhoneUs = formatPhoneDisplay;
export const formatUsPhone = formatPhoneDisplay;

export function normalizeEmail(email: string | null | undefined): string {
  return String(email || "").trim().toLowerCase();
}

export function isValidEmail(email: string): boolean {
  return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(normalizeEmail(email));
}

export function monthKey(input: string | Date): string {
  const d = input instanceof Date ? input : new Date(String(input || ""));
  if (Number.isNaN(d.getTime())) return "";
  return `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, "0")}`;
}

export function inferMonthlyProfit(revenue: number): number {
  const value = Number.isFinite(revenue) ? revenue : 0;
  return Math.max(0, Math.round(value * 0.7));
}
