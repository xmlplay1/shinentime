const BASE36 = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZ";

function randomSuffix(len: number): string {
  let s = "";
  for (let i = 0; i < len; i++) s += BASE36[Math.floor(Math.random() * 36)];
  return s;
}

/** Human-friendly code like FIRST12 — unique collision handled server-side via retry. */
export function suggestReferralCodeFromName(fullName: string): string {
  const raw = fullName.normalize("NFKD").replace(/[^\w\s]/g, "");
  const first = raw.split(/\s+/).filter(Boolean)[0] || "SHINE";
  const slug = first.replace(/[^a-z]/gi, "").toUpperCase().slice(0, 8) || "SHINE";
  return `${slug}${randomSuffix(4)}`;
}
