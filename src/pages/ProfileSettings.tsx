import { FormEvent, useEffect, useState } from "react";
import { Settings, Save, CheckCircle2 } from "lucide-react";
import { supabase, Profile } from "../lib/supabase";

interface ProfileSettingsProps {
  profile: Profile;
}

export default function ProfileSettings({ profile }: ProfileSettingsProps) {
  const [mobileMoneyName, setMobileMoneyName] = useState(profile.mobile_money_name || "");
  const [payoutMpesa, setPayoutMpesa] = useState(profile.payout_mpesa || "");
  const [payoutEmola, setPayoutEmola] = useState(profile.payout_emola || "");
  const [payoutMkesh, setPayoutMkesh] = useState(profile.payout_mkesh || "");
  const [contactWhatsapp, setContactWhatsapp] = useState(profile.contact_whatsapp || "");
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSave(e: FormEvent) {
    e.preventDefault();
    setSaving(true);
    setError(null);
    setSaved(false);

    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        mobile_money_name: mobileMoneyName || null,
        payout_mpesa: payoutMpesa || null,
        payout_emola: payoutEmola || null,
        payout_mkesh: payoutMkesh || null,
        contact_whatsapp: contactWhatsapp || null,
      })
      .eq("id", profile.id);

    setSaving(false);

    if (updateError) {
      setError("Erro ao guardar. Tente novamente.");
      return;
    }

    setSaved(true);
    setTimeout(() => setSaved(false), 3000);
  }

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Definições da Conta</h1>

      <form onSubmit={handleSave} className="space-y-6 rounded-xl border border-white/10 bg-white/[0.02] p-6">
        {/* Informações pessoais (só leitura) */}
        <div>
          <p className="px-1 pb-3 text-xs font-medium uppercase tracking-wide text-white/40">
            Informações Pessoais
          </p>
          <div className="grid gap-4 sm:grid-cols-2">
            <div>
              <label className="mb-1 block text-sm text-white/70">Nome completo</label>
              <input
                readOnly
                value={profile.full_name}
                className="w-full rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm text-white/50 outline-none"
              />
            </div>
            <div>
              <label className="mb-1 block text-sm text-white/70">E-mail</label>
              <input
                readOnly
                value={profile.email}
                className="w-full rounded-lg border border-white/5 bg-white/[0.02] px-4 py-2.5 text-sm text-white/50 outline-none"
              />
            </div>
          </div>
        </div>

        {/* Dados de recebimento */}
        <div>
          <p className="px-1 pb-3 text-xs font-medium uppercase tracking-wide text-white/40">
            Dados de Recebimento (Mobile Money)
          </p>
          <p className="mb-4 text-xs text-white/50">
            Os compradores enviarão pagamentos diretamente para estes números. Configure pelo menos um.
          </p>
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-white/70">Nome registado na conta</label>
              <input
                value={mobileMoneyName}
                onChange={(e) => setMobileMoneyName(e.target.value)}
                placeholder="Ex: João Silva"
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-electric-soft"
              />
              <p className="mt-1 text-xs text-white/40">Este nome aparecerá no checkout para o comprador confirmar o destinatário.</p>
            </div>

            <div className="grid gap-4 sm:grid-cols-3">
              <div>
                <label className="mb-1 block text-sm text-white/70">M-Pesa (84/85)</label>
                <input
                  value={payoutMpesa}
                  onChange={(e) => setPayoutMpesa(e.target.value)}
                  placeholder="84XXXXXXX"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-electric-soft"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/70">e-Mola (86/87)</label>
                <input
                  value={payoutEmola}
                  onChange={(e) => setPayoutEmola(e.target.value)}
                  placeholder="86XXXXXXX"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-electric-soft"
                />
              </div>
              <div>
                <label className="mb-1 block text-sm text-white/70">mKesh (82/83)</label>
                <input
                  value={payoutMkesh}
                  onChange={(e) => setPayoutMkesh(e.target.value)}
                  placeholder="82XXXXXXX"
                  className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-electric-soft"
                />
              </div>
            </div>
          </div>
        </div>

        {/* Contacto */}
        <div>
          <p className="px-1 pb-3 text-xs font-medium uppercase tracking-wide text-white/40">
            Suporte ao Comprador
          </p>
          <div>
            <label className="mb-1 block text-sm text-white/70">WhatsApp para contacto</label>
            <input
              value={contactWhatsapp}
              onChange={(e) => setContactWhatsapp(e.target.value)}
              placeholder="Ex: 258841234567"
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/30 outline-none focus:border-electric-soft"
            />
            <p className="mt-1 text-xs text-white/40">Os compradores poderão enviar-lhe mensagem diretamente em caso de dúvidas.</p>
          </div>
        </div>

        {error && <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>}

        {saved && (
          <p className="flex items-center gap-2 rounded-lg bg-emerald-500/10 px-3 py-2 text-sm text-emerald-300">
            <CheckCircle2 size={16} /> Definições guardadas com sucesso!
          </p>
        )}

        <button
          type="submit"
          disabled={saving}
          className="flex w-full items-center justify-center gap-2 rounded-lg bg-electric py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft disabled:opacity-60"
        >
          <Save size={16} />
          {saving ? "A guardar..." : "Guardar definições"}
        </button>
      </form>
    </div>
  );
}
