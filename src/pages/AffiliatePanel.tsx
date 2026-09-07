import { useEffect, useState } from "react";
import { Copy, CheckCircle, TrendingUp, DollarSign, Check, X, Users2 } from "lucide-react";
import { supabase, Profile, Product, Transaction, Affiliation } from "../lib/supabase";

interface ApprovedAffiliate extends Affiliation {
  product?: Product;
}

interface ManagedAffiliation extends Affiliation {
  affiliate?: Profile;
  product?: Product;
}

export default function AffiliatePanel({ profile }: { profile: Profile }) {
  const [approvedAffiliations, setApprovedAffiliations] = useState<ApprovedAffiliate[]>([]);
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [producerProducts, setProducerProducts] = useState<Product[]>([]);
  const [managedAffiliations, setManagedAffiliations] = useState<ManagedAffiliation[]>([]);
  const [loading, setLoading] = useState(true);
  const [copiedId, setCopiedId] = useState<string | null>(null);

  useEffect(() => {
    loadData();

    const channel = supabase
      .channel("affiliate-transactions-v2")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "transactions", filter: `affiliate_id=eq.${profile.id}` },
        () => loadTransactions()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "affiliations", filter: `affiliate_id=eq.${profile.id}` },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "affiliations", filter: `producer_id=eq.${profile.id}` },
        () => loadData()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `producer_id=eq.${profile.id}` },
        () => loadProducerData()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  async function loadData() {
    await Promise.all([loadAffiliations(), loadTransactions(), loadProducerData()]);
    setLoading(false);
  }

  async function loadProducerData() {
    const [{ data: products }, { data: affiliations }] = await Promise.all([
      supabase.from("products").select("*").eq("producer_id", profile.id).order("created_at", { ascending: false }),
      supabase.from("affiliations").select("*, affiliate:profiles(*)").eq("producer_id", profile.id).order("created_at", { ascending: false }),
    ]);

    setProducerProducts((products as Product[]) || []);
    setManagedAffiliations((affiliations as ManagedAffiliation[]) || []);
  }

  async function loadAffiliations() {
    const { data } = await supabase
      .from("affiliations")
      .select("*, product:products(*)")
      .eq("affiliate_id", profile.id)
      .eq("status", "approved");

    if (data) {
      setApprovedAffiliations(data as ApprovedAffiliate[]);
    }
  }

  async function loadTransactions() {
    const { data } = await supabase
      .from("transactions")
      .select("*")
      .eq("affiliate_id", profile.id)
      .order("created_at", { ascending: false });

    setTransactions((data as Transaction[]) || []);
  }

  const siteUrl = (import.meta.env.VITE_SITE_URL || window.location.origin).replace(/\/$/, "");

  function getAffiliateLink(slug: string) {
    return `${siteUrl}/checkout/${encodeURIComponent(slug)}?ref=${encodeURIComponent(profile.affiliate_code || "")}`;
  }

  async function updateAffiliation(id: string, status: "approved" | "rejected") {
    await supabase.from("affiliations").update({ status }).eq("id", id).eq("producer_id", profile.id);
    await loadProducerData();
  }

  async function toggleAffiliateAccess(product: Product) {
    await supabase.from("products").update({ affiliate_enabled: !product.affiliate_enabled }).eq("id", product.id).eq("producer_id", profile.id);
    await loadProducerData();
  }

  function handleCopy(slug: string) {
    const link = getAffiliateLink(slug);
    navigator.clipboard.writeText(link);
    setCopiedId(slug);
    setTimeout(() => setCopiedId(null), 2000);
  }

  const completedTransactions = transactions.filter(t => t.status === "completed");
  const totalCommissions = completedTransactions.reduce(
    (acc, t) => acc + Number(t.affiliate_commission_amount || 0),
    0
  );

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Afiliados</h1>

      {/* Stats */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <TrendingUp className="mb-3 text-electric-soft" size={22} />
          <p className="text-xs text-white/50">Vendas geradas</p>
          <p className="mt-1 font-display text-xl font-bold text-white">{completedTransactions.length}</p>
        </div>
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
          <DollarSign className="mb-3 text-emerald-400" size={22} />
          <p className="text-xs text-white/50">Comissões ganhas</p>
          <p className="mt-1 font-display text-xl font-bold text-emerald-400">
            {totalCommissions.toLocaleString("pt-MZ")} MT
          </p>
        </div>
      </div>

      <div className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <div>
          <h2 className="font-display text-lg font-semibold text-white">Meus produtos e afiliados</h2>
          <p className="mt-1 text-sm text-white/50">Decida se cada produto aceita afiliados e aprove os pedidos recebidos.</p>
        </div>

        {producerProducts.filter((product) => product.status === "active").map((product) => (
          <div key={product.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 bg-white/5 p-4">
            <div>
              <p className="font-medium text-white">{product.title}</p>
              <p className="text-xs text-white/50">Comissão: {Number(product.affiliate_commission_percent)}%</p>
            </div>
            <button
              type="button"
              onClick={() => toggleAffiliateAccess(product)}
              className={`rounded-lg px-3 py-2 text-xs font-semibold ${product.affiliate_enabled ? "bg-emerald-500/15 text-emerald-300" : "bg-white/10 text-white/50"}`}
            >
              {product.affiliate_enabled ? "Afiliados permitidos" : "Afiliados bloqueados"}
            </button>
          </div>
        ))}

        {managedAffiliations.length > 0 && (
          <div className="space-y-3 border-t border-white/10 pt-4">
            <h3 className="flex items-center gap-2 text-sm font-semibold text-white"><Users2 size={16} /> Pedidos recebidos</h3>
            {managedAffiliations.map((affiliation) => (
              <div key={affiliation.id} className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/5 p-3">
                <div>
                  <p className="text-sm text-white">{affiliation.affiliate?.full_name || "Utilizador"}</p>
                  <p className="text-xs text-white/50">{affiliation.product?.title || producerProducts.find((p) => p.id === affiliation.product_id)?.title || "Produto"}</p>
                </div>
                {affiliation.status === "pending" ? (
                  <div className="flex gap-2">
                    <button type="button" onClick={() => updateAffiliation(affiliation.id, "approved")} className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-xs text-emerald-300"><Check size={14} /> Aprovar</button>
                    <button type="button" onClick={() => updateAffiliation(affiliation.id, "rejected")} className="flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-2 text-xs text-red-300"><X size={14} /> Rejeitar</button>
                  </div>
                ) : (
                  <span className="text-xs text-white/50">{affiliation.status === "approved" ? "Aprovado" : "Rejeitado"}</span>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Approved Products / Affiliate Links */}
      <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <h2 className="mb-4 font-display text-lg font-semibold text-white">Produtos Afiliados</h2>

        {loading ? (
          <p className="text-sm text-white/50">A carregar...</p>
        ) : approvedAffiliations.length === 0 ? (
          <div className="rounded-lg border border-white/5 bg-white/5 p-6 text-center">
            <p className="text-sm text-white/50">
              Não tem afiliações aprovadas ainda.
            </p>
            <p className="mt-1 text-xs text-white/30">
              Vá à Loja e clique em "Pedir Afiliação" nos produtos que quer promover.
            </p>
          </div>
        ) : (
          <div className="space-y-4">
            {approvedAffiliations.map((aff) => {
              const product = aff.product;
              if (!product) return null;
              const slug = product.checkout_slug;
              const link = getAffiliateLink(slug);
              const isCopied = copiedId === slug;

              return (
                <div key={aff.id} className="rounded-lg border border-white/5 bg-white/5 p-4">
                  <div className="mb-3 flex items-start justify-between gap-2">
                    <div>
                      <p className="font-medium text-white">{product.title}</p>
                      <p className="text-xs text-white/50">
                        {Number(product.price).toLocaleString("pt-MZ")} MT · Comissão: {Number(product.affiliate_commission_percent)}%
                      </p>
                    </div>
                    <CheckCircle size={18} className="shrink-0 text-emerald-400" />
                  </div>

                  <p className="mb-2 text-xs text-white/40">O seu link exclusivo:</p>
                  <div className="flex items-center gap-2">
                    <input
                      readOnly
                      value={link}
                      className="w-full rounded-lg border border-white/10 bg-black/20 px-3 py-2 font-mono text-xs text-white/60 outline-none"
                    />
                    <button
                      onClick={() => handleCopy(slug)}
                      className="flex shrink-0 items-center gap-2 rounded-lg bg-electric px-4 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft"
                    >
                      <Copy size={14} />
                      {isCopied ? "Copiado!" : "Copiar"}
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Recent Sales */}
      {transactions.length > 0 && (
        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">Últimas Vendas</h2>
          <div className="space-y-3">
            {transactions.slice(0, 10).map(t => (
              <div key={t.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4">
                <div>
                  <p className="font-medium text-white">{t.buyer_name}</p>
                  <p className="text-sm text-white/50">
                    Comissão: <span className="font-semibold text-emerald-400">{Number(t.affiliate_commission_amount || 0).toLocaleString("pt-MZ")} MT</span>
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
        </div>
      )}
    </div>
  );
}
