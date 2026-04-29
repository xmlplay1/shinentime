import { format } from "date-fns";

type QuoteEmailInput = {
  customerName: string;
  customerEmail?: string | null;
  phone: string;
  carMakeModel: string;
  vehicleType: "sedan" | "suv";
  servicePackage: string;
  preferredDate: string;
  preferredTime: string;
  estimatedPrice: number;
};

const timeLabel: Record<string, string> = {
  morning: "Morning (8am - 12pm)",
  afternoon: "Afternoon (12pm - 4pm)",
  evening: "Evening (4pm - 8pm)"
};

function prettifyPackage(v: string): string {
  const s = String(v || "").toLowerCase();
  if (s === "silver") return "Silver";
  if (s === "gold") return "Gold";
  if (s === "platinum") return "Platinum";
  return v;
}

export function quoteReceiptHtml(input: QuoteEmailInput): string {
  const date = format(new Date(`${input.preferredDate}T12:00:00`), "PPP");
  const pkg = prettifyPackage(input.servicePackage);
  const size = input.vehicleType === "suv" ? "SUV / truck / van" : "Sedan / coupe";
  const window = timeLabel[input.preferredTime] || input.preferredTime;

  return `
  <div style="font-family: Inter, Arial, sans-serif; background:#0b0b0b; color:#f8fafc; padding:24px;">
    <div style="max-width:640px; margin:0 auto; background:#111827; border:1px solid rgba(255,255,255,0.12); border-radius:16px; padding:24px;">
      <p style="font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#fbbf24; margin:0 0 10px;">Shine N Time</p>
      <h1 style="margin:0 0 10px; font-size:24px;">Thank you for your quote request</h1>
      <p style="margin:0 0 16px; color:#cbd5e1;">Hi ${input.customerName}, we received your request and will text you shortly to confirm details.</p>

      <div style="background:#0b1220; border:1px solid rgba(251,191,36,0.35); border-radius:12px; padding:16px; margin:14px 0;">
        <p style="margin:0 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:0.16em; color:#fcd34d;">Summary</p>
        <p style="margin:4px 0;"><strong>Vehicle:</strong> ${input.carMakeModel}</p>
        <p style="margin:4px 0;"><strong>Package:</strong> ${pkg} (${size})</p>
        <p style="margin:4px 0;"><strong>Preferred:</strong> ${date} · ${window}</p>
        <p style="margin:8px 0 0; font-size:18px;"><strong>Estimated Quote:</strong> $${input.estimatedPrice}</p>
      </div>

      <div style="margin-top:14px; background:#0f172a; border:1px solid rgba(255,255,255,0.12); border-radius:12px; padding:14px;">
        <p style="margin:0 0 8px; font-size:11px; text-transform:uppercase; letter-spacing:0.16em; color:#93c5fd;">Prep requirements</p>
        <ul style="margin:0; padding-left:18px; color:#cbd5e1;">
          <li>Driveway access with room to work</li>
          <li>Water access with ~50ft hose reach</li>
          <li>Keys ready at appointment time</li>
        </ul>
      </div>

      <p style="margin-top:18px; color:#94a3b8; font-size:13px;">Questions? Reply to this email and we’ll help right away.</p>
    </div>
  </div>
  `;
}

export function quoteReceiptText(input: QuoteEmailInput): string {
  const date = format(new Date(`${input.preferredDate}T12:00:00`), "PPP");
  const pkg = prettifyPackage(input.servicePackage);
  const size = input.vehicleType === "suv" ? "SUV / truck / van" : "Sedan / coupe";
  const window = timeLabel[input.preferredTime] || input.preferredTime;
  return [
    `Hi ${input.customerName},`,
    "",
    "Thank you for your quote request. We received it and will text you shortly.",
    "",
    `Vehicle: ${input.carMakeModel}`,
    `Package: ${pkg} (${size})`,
    `Preferred: ${date} · ${window}`,
    `Estimated quote: $${input.estimatedPrice}`,
    "",
    "Prep requirements:",
    "- Driveway access",
    "- Water access (~50ft hose reach)",
    "- Keys ready",
    "",
    "— Shine N Time"
  ].join("\n");
}

export function adminNewQuoteText(input: QuoteEmailInput): string {
  return [
    "New quote submitted",
    `Name: ${input.customerName}`,
    `Email: ${input.customerEmail || "N/A"}`,
    `Phone: ${input.phone}`,
    `Vehicle: ${input.carMakeModel}`,
    `Package: ${input.servicePackage}`,
    `Size: ${input.vehicleType}`,
    `Preferred: ${input.preferredDate} ${input.preferredTime}`,
    `Estimate: $${input.estimatedPrice}`
  ].join("\n");
}

export function reviewRequestHtml(name: string, reviewLink: string): string {
  return `
  <div style="font-family: Inter, Arial, sans-serif; background:#0b0b0b; color:#f8fafc; padding:24px;">
    <div style="max-width:640px; margin:0 auto; background:#111827; border:1px solid rgba(255,255,255,0.12); border-radius:16px; padding:24px;">
      <p style="font-size:11px; letter-spacing:0.18em; text-transform:uppercase; color:#fbbf24; margin:0 0 10px;">Shine N Time</p>
      <h1 style="margin:0 0 10px; font-size:24px;">How did we do?</h1>
      <p style="margin:0 0 16px; color:#cbd5e1;">Hi ${name}, thanks again for trusting Shine N Time. If you have 30 seconds, we’d really appreciate your review.</p>
      <a href="${reviewLink}" style="display:inline-block; background:#2563eb; color:#fff; text-decoration:none; padding:12px 18px; border-radius:10px; font-weight:700;">
        Leave a Review
      </a>
      <p style="margin-top:16px; color:#94a3b8; font-size:13px;">Your feedback helps local customers find us.</p>
    </div>
  </div>
  `;
}

export function reviewRequestText(name: string, reviewLink: string): string {
  return `Hi ${name}, thanks for choosing Shine N Time. We'd appreciate your review: ${reviewLink}`;
}
