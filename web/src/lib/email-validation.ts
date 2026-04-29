/** Practical strict email validation (avoids naive `@` checks). */
export const STRICT_EMAIL_REGEX =
  /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)+$/;

export function normalizeCustomerEmail(email: string): string {
  return String(email || "")
    .trim()
    .toLowerCase()
    .replace(/\s+/g, "");
}

export function isStrictEmail(email: string): boolean {
  const n = normalizeCustomerEmail(email);
  return n.length > 5 && STRICT_EMAIL_REGEX.test(n);
}
