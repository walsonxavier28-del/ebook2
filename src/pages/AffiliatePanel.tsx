import { useEffect, useState } from "react";
import { Link, Copy } from "lucide-react";
import { supabase, Profile, Product, Transaction } from "../lib/supabase";

export default function AffiliatePanel({ profile }: { profile: Profile }) {
  const [activeProducts, setActiveProducts] = useState<Product[]>([]);
  const [selectedProductSlug, setSelectedProductSlug] = useState<string>("");
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [loading, setLoading] = useState(true);
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    async function loadData() {
      // 1. Load active products
      const { data: productsData } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active");
      
      const prods = (productsData as Product[]) || [];
      setActiveProducts(prods);
      if (prods.length > 0) {
        setSelectedProductSlug(prods[0].checkout_slug);
      }

      // 2. Load affiliate transactions
      await loadTransactions();
      setLoading(false);
    }
    
    loadData();

    // 3. Realtime updates for transactions
    const channel = supabase
      .channel("affiliate-transactions")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `affiliate_id=eq.${profile.id}` },
        () => loadTransactions()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  async function loadTransactions() {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("affiliate_id", profile.id)
      .order("created_at", { ascending: false });
    
    setTransactions((data as Transaction[]) || []);
  }

  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;
  const generatedLink =
    selectedProductSlug && profile?.affiliate_code
      ? `${siteUrl}/checkout/${selectedProductSlug}?ref=${profile.affiliate_code}`
      : "";

  function handleCopy() {
    if (!generatedLink) return;
    navigator.clipboard.writeText(generatedLink);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  const completedTransactions = transactions.filter(t => t.status === "completed");
  const totalCommissions = completedTransactions.reduce((acc, t) => acc + Number(t.affiliate_commission_amount || 0), 0);

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Painel de Afiliado</h1>

      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs text-white/50">Vendas geradas</p>
          <p className="mt-1 font-display text-xl font-bold text-white">{completedTransactions.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <p className="text-xs text-white/50">Comissões ganhas</p>
          <p className="mt-1 font-display text-xl font-bold text-emerald-400">
            {totalCommissions.toLocaleString("pt-MZ")} MT
          </p>
        </div>
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Gerar Link de Afiliado</h2>
        
        {loading ? (
          <p className="text-sm text-white/50">A carregar produtos...</p>
        ) : activeProducts.length === 0 ? (
          <p className="text-sm text-white/50">Não há produtos ativos para afiliar no momento.</p>
        ) : (
          <div className="space-y-4">
            <div>
              <label className="mb-1 block text-sm text-white/70">Escolha o produto</label>
              <select
                value={selectedProductSlug}
                onChange={(e) => setSelectedProductSlug(e.target.value)}
                className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-electric-soft"
              >
                {activeProducts.map((p) => (
                  <option key={p.id} value={p.checkout_slug} className="bg-night text-white">
                    {p.title} - {Number(p.price).toLocaleString("pt-MZ")} MT ({Number(p.affiliate_commission_percent)}%)
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="mb-1 block text-sm text-white/70">O seu link exclusivo</label>
              <div className="flex items-center gap-2">
                <input
                  readOnly
                  value={generatedLink}
                  className="w-full rounded-lg border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white/60 outline-none"
                />
                <button
                  onClick={handleCopy}
                  className="flex shrink-0 items-center gap-2 rounded-lg bg-electric px-4 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft"
                >
                  <Copy size={16} />
                  {copied ? "Copiado!" : "Copiar"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Últimas Vendas</h2>
        
        {loading ? (
          <p className="text-sm text-white/50">A carregar...</p>
        ) : transactions.length === 0 ? (
          <p className="text-sm text-white/50">Você ainda não gerou nenhuma venda.</p>
        ) : (
          <div className="space-y-3">
            {transactions.map(t => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4">
                <div>
                  <p className="font-medium text-white">{t.buyer_name}</p>
                  <p className="text-sm text-white/50">
                    Comissão: <span className="font-semibold text-emerald-400">{Number(t.affiliate_commission_amount).toLocaleString("pt-MZ")} MT</span>
                  </p>
                </div>
                <div>
                  {t.status === "completed" ? (
                    <span className="rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-300">Concluído</span>
                  ) : t.status === "pending" ? (
                    <span className="rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-300">Pendente</span>
                  ) : (
                    <span className="rounded-full bg-red-500/15 px-3 py-1 text-xs font-medium text-red-300">Falhou</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
