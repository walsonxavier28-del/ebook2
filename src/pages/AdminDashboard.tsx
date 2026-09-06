import { useEffect, useState } from "react";
import { Check, X, Users as UsersIcon, ShieldCheck, Image as ImageIcon } from "lucide-react";
import { supabase, Product, Profile, Transaction, WithdrawalRequest } from "../lib/supabase";
import { sendPurchaseConfirmationEmail, sendProducerSaleNotification, sendAffiliateCommissionEmail } from "../lib/emailService";
import { creditWalletFromPayment } from "../lib/walletService";

interface AdminDashboardProps {
  activeTab: string;
  profile: Profile;
}

export default function AdminDashboard({ activeTab, profile }: AdminDashboardProps) {
  if (activeTab === "accounts") return <AccountsPanel currentAdmin={profile} />;
  if (activeTab === "deposits") return <DepositsPanel />;
  if (activeTab === "withdrawals") return <WithdrawalsPanel />;
  return <ProductReviewPanel />;
}

function ProductReviewPanel() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [rejectingId, setRejectingId] = useState<string | null>(null);
  const [reason, setReason] = useState("");
  const [filter, setFilter] = useState<"pending_review" | "active">("pending_review");

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-products")
      .on("postgres_changes", { event: "*", schema: "public", table: "products" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [filter]);

  async function load() {
    setLoading(true);
    const { data } = await supabase
      .from("products")
      .select("*")
      .eq("status", filter)
      .order("created_at", { ascending: filter === "pending_review" ? true : false });
    setProducts((data as Product[]) || []);
    setLoading(false);
  }

  async function approve(id: string) {
    await supabase.from("products").update({ status: "active", rejection_reason: null }).eq("id", id);
    load();
  }

  async function reject(id: string) {
    await supabase.from("products").update({ status: "rejected", rejection_reason: reason }).eq("id", id);
    setRejectingId(null);
    setReason("");
    load();
  }

  async function deactivate(id: string) {
    if (!window.confirm("Tem a certeza que deseja desativar este produto? Ele deixará de estar disponível para novas compras.")) return;
    await supabase.from("products").update({ status: "inactive" }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <h1 className="font-display text-2xl font-bold text-white">Gestão de Produtos</h1>
        <div className="flex rounded-full bg-white/5 p-1">
          <button
            onClick={() => setFilter("pending_review")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === "pending_review" ? "bg-electric text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Pendentes
          </button>
          <button
            onClick={() => setFilter("active")}
            className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
              filter === "active" ? "bg-electric text-white" : "text-white/60 hover:text-white"
            }`}
          >
            Ativos
          </button>
        </div>
      </div>

      {loading && <p className="text-sm text-white/50">A carregar...</p>}
      {!loading && products.length === 0 && (
        <p className="text-sm text-white/50">
          {filter === "pending_review" ? "Não há produtos pendentes de análise." : "Não há produtos ativos."}
        </p>
      )}

      <div className="space-y-4">
        {products.map((product) => (
          <div key={product.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex gap-4">
                <img
                  src={product.cover_image_url}
                  alt={product.title}
                  className="h-20 w-16 rounded-md object-cover"
                />
                <div>
                  <p className="font-medium text-white">{product.title}</p>
                  <p className="mt-1 max-w-md text-sm text-white/50">{product.description}</p>
                  <p className="mt-1 text-sm font-semibold text-electric-soft">
                    {Number(product.price).toLocaleString("pt-MZ")} MT
                  </p>
                </div>
              </div>

              <div className="flex shrink-0 gap-2">
                {filter === "pending_review" ? (
                  <>
                    <button
                      onClick={() => approve(product.id)}
                      className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/25"
                    >
                      <Check size={16} /> Aprovar
                    </button>
                    <button
                      onClick={() => setRejectingId(product.id)}
                      className="flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/25"
                    >
                      <X size={16} /> Rejeitar
                    </button>
                  </>
                ) : (
                  <button
                    onClick={() => deactivate(product.id)}
                    className="flex items-center gap-1 rounded-lg bg-amber-500/15 px-3 py-2 text-sm text-amber-300 transition hover:bg-amber-500/25"
                  >
                    <X size={16} /> Desativar
                  </button>
                )}
              </div>
            </div>

            {rejectingId === product.id && filter === "pending_review" && (
              <div className="mt-4 flex gap-2">
                <input
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  placeholder="Motivo da rejeição"
                  className="flex-1 rounded-lg border border-white/10 bg-white/5 px-3 py-2 text-sm text-white outline-none focus:border-electric-soft"
                />
                <button
                  onClick={() => reject(product.id)}
                  className="rounded-lg bg-red-500 px-4 py-2 text-sm font-medium text-white"
                >
                  Confirmar
                </button>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}

function AccountsPanel({ currentAdmin }: { currentAdmin: Profile }) {
  const [accounts, setAccounts] = useState<Profile[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
  }, []);

  async function load() {
    setLoading(true);
    const { data } = await supabase.from("profiles").select("*").order("created_at", { ascending: false });
    setAccounts((data as Profile[]) || []);
    setLoading(false);
  }

  async function toggleBlock(id: string, currentlyBlocked: boolean) {
    if (!window.confirm(`Tem a certeza que deseja ${currentlyBlocked ? "ativar" : "suspender"} esta conta?`)) return;
    await supabase.from("profiles").update({ is_blocked: !currentlyBlocked }).eq("id", id);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Gerenciamento de Contas</h1>

      <div className="overflow-hidden rounded-xl border border-white/10">
        <table className="w-full text-left text-sm">
          <thead className="bg-white/[0.03] text-white/50">
            <tr>
              <th className="px-4 py-3 font-medium">Nome</th>
              <th className="px-4 py-3 font-medium">E-mail</th>
              <th className="px-4 py-3 font-medium">Telemóvel</th>
              <th className="px-4 py-3 font-medium">Perfil</th>
              <th className="px-4 py-3 font-medium text-right">Ações</th>
            </tr>
          </thead>
          <tbody>
            {loading ? (
              <tr>
                <td className="px-4 py-6 text-white/50" colSpan={4}>
                  A carregar...
                </td>
              </tr>
            ) : (
              accounts.map((acc) => (
                <tr key={acc.id} className="border-t border-white/5">
                  <td className="px-4 py-3 text-white">{acc.full_name}</td>
                  <td className="px-4 py-3 text-white/70">{acc.email}</td>
                  <td className="px-4 py-3 text-white/70">{acc.phone_number}</td>
                  <td className="px-4 py-3">
                    <div className="flex gap-2">
                      {acc.is_super_admin ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-electric/15 px-3 py-1 text-xs text-electric-soft">
                          <ShieldCheck size={12} /> Admin
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-white/5 px-3 py-1 text-xs text-white/60">
                          <UsersIcon size={12} /> Utilizador
                        </span>
                      )}
                      {acc.is_blocked && (
                        <span className="inline-flex items-center gap-1 rounded-full bg-red-500/15 px-3 py-1 text-xs text-red-300">
                          <X size={12} /> Suspenso
                        </span>
                      )}
                    </div>
                  </td>
                  <td className="px-4 py-3 text-right">
                    {/* Não permitir que admin normal bloqueie super admin, nem bloquear a si próprio */}
                    {acc.id !== currentAdmin.id && (!acc.is_super_admin || currentAdmin.is_super_admin) && (
                      <button
                        onClick={() => toggleBlock(acc.id, acc.is_blocked)}
                        className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                          acc.is_blocked
                            ? "bg-emerald-500/15 text-emerald-300 hover:bg-emerald-500/25"
                            : "bg-red-500/15 text-red-300 hover:bg-red-500/25"
                        }`}
                      >
                        {acc.is_blocked ? "Ativar" : "Suspender"}
                      </button>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function DepositsPanel() {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [products, setProducts] = useState<Record<string, Product>>({});
  const [affiliates, setAffiliates] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-transactions")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function load() {
    setLoading(true);
    const { data: txs } = await supabase
      .from("transactions")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    const list = (txs as Transaction[]) || [];
    setTransactions(list);

    if (list.length > 0) {
      const ids = [...new Set(list.map((t) => t.product_id))];
      const { data: prods } = await supabase.from("products").select("*").in("id", ids);
      const map: Record<string, Product> = {};
      (prods as Product[] | null)?.forEach((p) => (map[p.id] = p));
      setProducts(map);

      const affIds = [...new Set(list.map((t) => t.affiliate_id).filter(Boolean))];
      if (affIds.length > 0) {
        const { data: affs } = await supabase.from("profiles").select("id, full_name").in("id", affIds);
        const affMap: Record<string, string> = {};
        (affs as any[] | null)?.forEach((a) => (affMap[a.id] = a.full_name));
        setAffiliates(affMap);
      }
    }
    setLoading(false);
  }

  async function approveDeposit(tx: Transaction) {
    await supabase.from("transactions").update({ status: "completed" }).eq("id", tx.id);
    
    try {
      await creditWalletFromPayment(tx.id);
    } catch (e) {
      console.error("Failed to credit wallet:", e);
    }

    const product = products[tx.product_id];
    if (product) {
      try {
        await sendPurchaseConfirmationEmail({
          to: tx.buyer_email,
          buyerName: tx.buyer_name,
          productTitle: product.title,
          downloadUrl: product.file_url,
        });

        // 2. Notificar Produtor
        const { data: prodProfile } = await supabase.from("profiles").select("email, full_name").eq("id", product.producer_id).maybeSingle();
        if (prodProfile) {
          const netAmount = Number(tx.amount) - Number(tx.affiliate_commission_amount || 0);
          await sendProducerSaleNotification({
            to: prodProfile.email,
            producerName: prodProfile.full_name,
            productTitle: product.title,
            netAmount,
          });
        }

        // 3. Notificar Afiliado
        if (tx.affiliate_id && tx.affiliate_commission_amount) {
          const { data: affProfile } = await supabase.from("profiles").select("email, full_name").eq("id", tx.affiliate_id).maybeSingle();
          if (affProfile) {
            await sendAffiliateCommissionEmail({
              to: affProfile.email,
              affiliateName: affProfile.full_name,
              productTitle: product.title,
              commissionAmount: Number(tx.affiliate_commission_amount),
            });
          }
        }
      } catch {
        // O depósito já foi aprovado; o e-mail pode ser reenviado manualmente se falhar.
      }
    }
    load();
  }

  async function rejectDeposit(tx: Transaction) {
    await supabase.from("transactions").update({ status: "failed" }).eq("id", tx.id);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Validar Depósitos</h1>
      <p className="text-sm text-white/50">
        Confirme os pagamentos recebidos directamente pelos produtores.
      </p>

      {loading && <p className="text-sm text-white/50">A carregar...</p>}
      {!loading && transactions.length === 0 && (
        <p className="text-sm text-white/50">Não há depósitos pendentes.</p>
      )}

      <div className="space-y-4">
        {transactions.map((tx) => {
          const product = products[tx.product_id];
          return (
            <div key={tx.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
              <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-white">{product?.title || "Produto"}</p>
                <p className="text-sm text-white/50">
                  {tx.buyer_name} · {tx.buyer_phone} · {tx.payment_method.toUpperCase()}
                </p>
                {tx.proof_code && tx.proof_code !== "foto_comprovativo" && (
                  <p className="text-sm text-white/50">Código: {tx.proof_code}</p>
                )}
                <p className="mt-1 text-sm font-semibold text-electric-soft">
                  {Number(tx.amount).toLocaleString("pt-MZ")} MT
                </p>
                {tx.affiliate_id && affiliates[tx.affiliate_id] && (
                  <span className="mt-2 inline-block rounded-md bg-white/10 px-2 py-1 text-xs text-white/70">
                    Via afiliado: {affiliates[tx.affiliate_id]}
                  </span>
                )}
              </div>
              <div className="flex gap-2">
                <button
                  onClick={() => approveDeposit(tx)}
                  className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/25"
                >
                  <Check size={16} /> Aprovar
                </button>
                <button
                  onClick={() => rejectDeposit(tx)}
                  className="flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/25"
                >
                  <X size={16} /> Rejeitar
                </button>
              </div>
              </div>

              {/* Foto do comprovativo */}
              {tx.proof_image_url && (
                <div className="mt-4 border-t border-white/5 pt-4">
                  <p className="mb-2 flex items-center gap-2 text-xs text-white/50">
                    <ImageIcon size={14} /> Comprovativo enviado:
                  </p>
                  <a href={tx.proof_image_url} target="_blank" rel="noreferrer">
                    <img
                      src={tx.proof_image_url}
                      alt="Comprovativo"
                      className="max-h-48 rounded-lg border border-white/10 object-contain transition hover:opacity-80"
                    />
                  </a>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WithdrawalsPanel() {
  const [requests, setRequests] = useState<WithdrawalRequest[]>([]);
  const [profiles, setProfiles] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("admin-withdrawals")
      .on("postgres_changes", { event: "*", schema: "public", table: "withdrawal_requests" }, load)
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, []);

  async function load() {
    setLoading(true);
    const { data: reqs } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    const list = (reqs as WithdrawalRequest[]) || [];
    setRequests(list);

    if (list.length > 0) {
      const ids = [...new Set(list.map((r) => r.profile_id))];
      const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", ids);
      const map: Record<string, string> = {};
      (profs as any[] | null)?.forEach((p) => (map[p.id] = p.full_name));
      setProfiles(map);
    }
    setLoading(false);
  }

  async function approve(req: WithdrawalRequest) {
    await supabase
      .from("withdrawal_requests")
      .update({ status: "completed", processed_at: new Date().toISOString() })
      .eq("id", req.id);
    load();
  }

  async function reject(req: WithdrawalRequest) {
    await supabase.from("withdrawal_requests").update({ status: "failed" }).eq("id", req.id);
    
    // Devolve o saldo ao utilizador via wallet_ledger
    await supabase.from("wallet_ledger").insert({
      profile_id: req.profile_id,
      amount: req.requested_amount,
      type: "adjustment",
      reference_withdrawal_id: req.id,
      description: "Estorno de pedido de saque rejeitado",
    });

    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Saques Pendentes</h1>
      
      {loading && <p className="text-sm text-white/50">A carregar...</p>}
      {!loading && requests.length === 0 && (
        <p className="text-sm text-white/50">Não há saques pendentes.</p>
      )}

      <div className="space-y-4">
        {requests.map((req) => (
          <div key={req.id} className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
            <div className="flex items-start justify-between gap-4">
              <div className="flex-1">
                <p className="font-medium text-white">{profiles[req.profile_id] || "Utilizador"}</p>
                <p className="text-sm text-white/50">
                  {req.payout_method.toUpperCase()}: {req.payout_number}
                </p>
                <div className="mt-2 text-sm">
                  <p className="text-white/60">Valor Solicitado: {Number(req.requested_amount).toLocaleString("pt-MZ")} MT</p>
                  <p className="text-white/60">Taxa: -{Number(req.fee_amount).toLocaleString("pt-MZ")} MT</p>
                  <p className="mt-1 font-semibold text-electric-soft">
                    Valor a Enviar: {Number(req.net_amount).toLocaleString("pt-MZ")} MT
                  </p>
                </div>
              </div>
              <div className="flex flex-col gap-2 sm:flex-row">
                <button
                  onClick={() => approve(req)}
                  className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/25"
                >
                  <Check size={16} /> Marcar como Pago
                </button>
                <button
                  onClick={() => reject(req)}
                  className="flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/25"
                >
                  <X size={16} /> Rejeitar
                </button>
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
