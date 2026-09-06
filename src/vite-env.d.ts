/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_SUPABASE_URL: string;
  readonly VITE_SUPABASE_ANON_KEY: string;
  readonly VITE_EMAIL_FROM: string;
  readonly VITE_ADMIN_EMAIL_1: string;
  readonly VITE_ADMIN_EMAIL_2: string;
  readonly VITE_SUPPORT_WHATSAPP: string;
  readonly VITE_PAYMENT_NUMBER: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
