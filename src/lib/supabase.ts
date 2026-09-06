import { createClient } from "@supabase/supabase-js";

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL as string;
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY as string;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Variáveis VITE_SUPABASE_URL e VITE_SUPABASE_ANON_KEY em falta. Configure o ficheiro .env.local a partir do .env.example."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
  },
});

export const ADMIN_EMAILS = [
  import.meta.env.VITE_ADMIN_EMAIL_1 as string,
  import.meta.env.VITE_ADMIN_EMAIL_2 as string,
].filter(Boolean);

export function isAdminEmail(email?: string | null) {
  if (!email) return false;
  return ADMIN_EMAILS.map((e) => e.toLowerCase()).includes(email.toLowerCase());
}

export interface Profile {
  id: string;
  full_name: string;
  email: string;
  phone_number: string;
  is_super_admin: boolean;
  payout_mpesa: string | null;
  payout_emola: string | null;
  payout_mkesh: string | null;
  mobile_money_name: string | null;
  contact_whatsapp: string | null;
  affiliate_code: string | null;
  wallet_balance: number;
  is_blocked: boolean;
  created_at: string;
}

export interface WalletLedgerEntry {
  id: string;
  profile_id: string;
  amount: number;
  type: "sale_earning" | "affiliate_commission" | "withdrawal" | "withdrawal_fee" | "adjustment";
  reference_transaction_id: string | null;
  reference_withdrawal_id: string | null;
  description: string | null;
  created_at: string;
}

export interface WithdrawalRequest {
  id: string;
  profile_id: string;
  requested_amount: number;
  fee_amount: number;
  net_amount: number;
  payout_method: "mpesa" | "emola" | "mkesh";
  payout_number: string;
  status: "pending" | "completed" | "failed";
  created_at: string;
  processed_at: string | null;
}

export interface Product {
  id: string;
  title: string;
  description: string;
  price: number;
  cover_image_url: string;
  file_url: string;
  producer_id: string;
  checkout_slug: string;
  status: "pending_review" | "active" | "rejected" | "inactive";
  rejection_reason: string | null;
  affiliate_commission_percent: number;
  created_at: string;
}

export interface Transaction {
  id: string;
  product_id: string;
  buyer_name: string;
  buyer_email: string;
  buyer_phone: string;
  payment_method: "mpesa" | "emola" | "mkesh";
  amount: number;
  proof_code: string;
  proof_image_url: string | null;
  status: "pending" | "completed" | "failed";
  affiliate_id: string | null;
  affiliate_commission_amount: number | null;
  buyer_id: string | null;
  created_at: string;
}
