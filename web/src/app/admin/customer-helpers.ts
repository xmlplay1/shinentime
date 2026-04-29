import type { SupabaseClient } from "@supabase/supabase-js";
import { normalizeCustomerEmail } from "@/lib/email-validation";

export type CustomerJobRow = {
  id: number;
  car_make_model: string | null;
  service_package: string | null;
  status: string | null;
  preferred_date: string | null;
  price: number | null;
  estimated_price: number | null;
  final_price: number | null;
  created_at: string | null;
};

export type CustomerSummary = {
  id: string;
  email: string;
  full_name: string | null;
  phone: string | null;
  referral_code: string;
};

const PACKAGE_BASE: Record<string, number> = { silver: 37, gold: 99, platinum: 129 };

function inferJobPrice(job: CustomerJobRow): number {
  const candidates = [job.final_price, job.price, job.estimated_price];
  for (const value of candidates) {
    if (typeof value === "number" && Number.isFinite(value) && value > 0) return Number(value);
  }
  return PACKAGE_BASE[String(job.service_package || "").toLowerCase()] || 0;
}

export function computeLifetimeValue(jobs: CustomerJobRow[]): number {
  return jobs
    .filter((j) => String(j.status || "").toLowerCase() === "completed")
    .reduce((sum, j) => sum + inferJobPrice(j), 0);
}

export async function listJobImagePublicUrls(
  supabase: SupabaseClient,
  jobId: number
): Promise<{ name: string; url: string }[]> {
  const folder = `job-${jobId}`;
  const { data, error } = await supabase.storage.from("job-images").list(folder, { limit: 100 });
  if (error || !data?.length) return [];
  const out: { name: string; url: string }[] = [];
  for (const file of data) {
    if (!file.name) continue;
    const { data: pub } = supabase.storage.from("job-images").getPublicUrl(`${folder}/${file.name}`);
    if (pub?.publicUrl) out.push({ name: file.name, url: pub.publicUrl });
  }
  return out;
}

export async function fetchCustomerByEmail(
  supabase: SupabaseClient,
  emailRaw: string
): Promise<{ customer: CustomerSummary; jobs: CustomerJobRow[] } | null> {
  const email = normalizeCustomerEmail(emailRaw);
  if (!email) return null;

  const { data: customer } = await supabase.from("customers").select("id,email,full_name,phone,referral_code").eq("email", email).maybeSingle();
  if (!customer?.id) return null;

  const selectCols = "id,car_make_model,service_package,status,preferred_date,price,estimated_price,final_price,created_at";

  const [{ data: byLink }, { data: byEmail }] = await Promise.all([
    supabase.from("jobs").select(selectCols).eq("customer_id", customer.id).order("created_at", { ascending: false }),
    supabase.from("jobs").select(selectCols).eq("email", email).order("created_at", { ascending: false })
  ]);

  const map = new Map<number, CustomerJobRow>();
  for (const row of [...(byLink || []), ...(byEmail || [])]) {
    const j = row as CustomerJobRow;
    if (!map.has(j.id)) map.set(j.id, j);
  }
  const jobs = Array.from(map.values()).sort(
    (a, b) => new Date(b.created_at || "").getTime() - new Date(a.created_at || "").getTime()
  );

  return {
    customer: customer as CustomerSummary,
    jobs
  };
}

export async function searchCustomersQuery(
  supabase: SupabaseClient,
  q: string
): Promise<CustomerSummary[]> {
  const term = q.trim().replace(/%/g, "").replace(/_/g, "");
  if (term.length < 2) return [];

  const wild = `%${term}%`;

  const { data } = await supabase
    .from("customers")
    .select("id,email,full_name,phone,referral_code")
    .or(`email.ilike.${wild},full_name.ilike.${wild}`)
    .order("created_at", { ascending: false })
    .limit(40);

  return (data || []) as CustomerSummary[];
}
