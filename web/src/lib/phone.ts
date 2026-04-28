export function normalizePhone(input: string): string {
  return String(input || "").replace(/\D/g, "").slice(0, 15);
}

export function formatSharePath(phone: string): string {
  const n = normalizePhone(phone);
  return n ? `/share/${n}` : "";
}
