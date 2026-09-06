import { FormEvent, useEffect, useState } from "react";
import { Wallet, TrendingUp, BookOpen, UploadCloud, Link as LinkIcon, Copy, ArrowRight, ArrowDownCircle, Check, X, Image as ImageIcon } from "lucide-react";
import { supabase, Product, Profile, WithdrawalRequest, Transaction } from "../lib/supabase";
import { sendPurchaseConfirmationEmail } from "../lib/emailService";
import { creditWalletFromPayment } from "../lib/walletService";

interface ProducerDashboardProps {
  profile: Profile;
  activeTab: string;
}

function slugify(text: string) {
  return (
    text
      .toLowerCase()
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/(^-|-$)/g, "") + "-" + Math.random().toString(36).slice(2, 7)
  );
}

export default function ProducerDashboard({ profile, activeTab }: ProducerDashboardProps) {
  const [products, setProducts] = useState<Product[]>([]);
  const [withdrawals, setWithdrawals] = useState<WithdrawalRequest[]>([]);
  const [loadingProducts, setLoadingProducts] = useState(true);

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [price, setPrice] = useState("");
  const [commissionPercent, setCommissionPercent] = useState("20");
  const [coverFile, setCoverFile] = useState<File | null>(null);
  const [pdfFile, setPdfFile] = useState<File | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [formMessage, setFormMessage] = useState<string | null>(null);
  const [createdProductSlug, setCreatedProductSlug] = useState<string | null>(null);
  
  // Withdrawal Form State
  const [showWithdrawForm, setShowWithdrawForm] = useState(false);

  useEffect(() => {
    loadProducts();
    loadWithdrawals();

    const channel = supabase
      .channel("producer-products")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "products", filter: `producer_id=eq.${profile.id}` },
        () => loadProducts()
      )
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "withdrawal_requests", filter: `profile_id=eq.${profile.id}` },
        () => loadWithdrawals()
      )
      .subscribe();

    return () => {
      supabase.removeChannel(channel);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id]);

  async function loadProducts() {
    setLoadingProducts(true);
    const { data: prodsData } = await supabase
      .from("products")
      .select("*")
      .eq("producer_id", profile.id)
      .order("created_at", { ascending: false });

    setProducts((prodsData as Product[]) || []);
    setLoadingProducts(false);
  }

  async function loadWithdrawals() {
    const { data } = await supabase
      .from("withdrawal_requests")
      .select("*")
      .eq("profile_id", profile.id)
      .order("created_at", { ascending: false })
      .limit(10);
    setWithdrawals((data as WithdrawalRequest[]) || []);
  }

  const activeProducts = products.filter((p) => p.status === "active");

  async function handleCreateProduct(e: FormEvent) {
    e.preventDefault();
    if (!coverFile || !pdfFile) {
      setFormMessage("Selecione a capa e o ficheiro PDF do e-book.");
      return;
    }

    setSubmitting(true);
    setFormMessage(null);
    setCreatedProductSlug(null);

    try {
      const slug = slugify(title);

      const coverPath = `covers/${profile.id}/${Date.now()}-${coverFile.name}`;
      const { error: coverErr } = await supabase.storage
        .from("product-assets")
        .upload(coverPath, coverFile);
      if (coverErr) throw coverErr;

      const filePath = `ebooks/${profile.id}/${Date.now()}-${pdfFile.name}`;
      const { error: fileErr } = await supabase.storage
        .from("product-assets")
        .upload(filePath, pdfFile);
      if (fileErr) throw fileErr;

      const { data: coverUrlData } = supabase.storage.from("product-assets").getPublicUrl(coverPath);
      const { data: fileUrlData } = supabase.storage.from("product-assets").getPublicUrl(filePath);

      const { error: insertErr } = await supabase.from("products").insert({
        title,
        description,
        price: Number(price),
        affiliate_commission_percent: Number(commissionPercent),
        cover_image_url: coverUrlData.publicUrl,
        file_url: fileUrlData.publicUrl,
        producer_id: profile.id,
        checkout_slug: slug,
        status: "pending_review",
      });

      if (insertErr) throw insertErr;

      setFormMessage("Produto enviado para análise com sucesso!");
      setCreatedProductSlug(slug);
      setTitle("");
      setDescription("");
      setPrice("");
      setCommissionPercent("20");
      setCoverFile(null);
      setPdfFile(null);
      loadProducts();
    } catch (err) {
      setFormMessage(err instanceof Error ? err.message : "Erro ao cadastrar produto.");
    } finally {
      setSubmitting(false);
    }
  }

  if (activeTab === "dashboard") {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-white">Dashboard</h1>
        
        {/* Wallet Section */}
        <div className="flex flex-col gap-4 rounded-xl border border-electric/20 bg-electric/10 p-6 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-sm font-medium text-electric-soft">Saldo Disponível (Carteira)</p>
            <p className="font-display text-4xl font-bold text-white">
              {Number(profile.wallet_balance || 0).toLocaleString("pt-MZ")} MT
            </p>
          </div>
          <button
            onClick={() => setShowWithdrawForm(!showWithdrawForm)}
            className="flex items-center justify-center gap-2 rounded-lg bg-electric px-6 py-3 font-semibold text-white shadow-glow transition hover:bg-electric-soft"
          >
            Sacar <ArrowRight size={18} />
          </button>
        </div>

        {showWithdrawForm && (
          <WithdrawForm 
            profile={profile} 
            onClose={() => setShowWithdrawForm(false)} 
            onSuccess={() => {
              setShowWithdrawForm(false);
              loadWithdrawals();
              // A actualização do saldo vem do supabase realtime se implementado no _app, mas forçaremos um refresh se necessário.
              window.location.reload(); 
            }} 
          />
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <StatCard icon={BookOpen} label="Produtos ativos" value={String(activeProducts.length)} />
          <StatCard icon={TrendingUp} label="Total de produtos" value={String(products.length)} />
        </div>

        {/* Withdrawal History */}
        {withdrawals.length > 0 && (
          <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
            <h2 className="mb-4 flex items-center gap-2 font-display text-lg font-semibold text-white">
              <ArrowDownCircle size={20} className="text-electric-soft" /> Histórico de Saques
            </h2>
            <div className="space-y-3">
              {withdrawals.map((w) => (
                <div key={w.id} className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 p-4">
                  <div>
                    <p className="font-medium text-white">{w.payout_method.toUpperCase()}: {w.payout_number}</p>
                    <p className="text-sm text-white/50">{new Date(w.created_at).toLocaleDateString("pt-MZ")}</p>
                  </div>
                  <div className="text-right">
                    <p className="font-semibold text-white">{Number(w.requested_amount).toLocaleString("pt-MZ")} MT</p>
                    <span className={`inline-block rounded-md px-2 py-1 text-xs font-medium ${
                      w.status === 'completed' ? 'bg-emerald-500/15 text-emerald-300' : 
                      w.status === 'failed' ? 'bg-red-500/15 text-red-300' : 'bg-amber-500/15 text-amber-300'
                    }`}>
                      {w.status === 'completed' ? 'Pago' : w.status === 'failed' ? 'Rejeitado' : 'Pendente'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        <div className="rounded-xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">Produtos recentes</h2>
          <ProductList products={products.slice(0, 5)} loading={loadingProducts} />
        </div>
      </div>
    );
  }

  if (activeTab === "my-products") {
    return (
      <div className="space-y-6">
        <h1 className="font-display text-2xl font-bold text-white">Meus Produtos</h1>
        <ProductList products={products} loading={loadingProducts} />
      </div>
    );
  }

  if (activeTab === "producer-payments") {
    return <ProducerPaymentsPanel profile={profile} products={products} />;
  }

  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;

  return (
    <div className="max-w-xl space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Cadastrar Produto</h1>

      {createdProductSlug && (
        <div className="rounded-xl border border-electric/30 bg-electric/10 p-5">
          <h2 className="mb-2 font-display text-lg font-semibold text-white">Produto criado!</h2>
          <p className="mb-4 text-sm text-white/70">
            O produto foi enviado para análise. Assim que aprovado, este será o link oficial de vendas:
          </p>
          <CheckoutLink url={`${siteUrl}/checkout/${createdProductSlug}`} />
          <p className="mt-3 text-xs text-white/50">
            Este é o link que você também pode passar a afiliados, adicionando <code className="font-mono text-electric-soft">?ref=CODIGO</code> no fim.
          </p>
        </div>
      )}

      <form onSubmit={handleCreateProduct} className="space-y-4 rounded-xl border border-white/10 bg-white/[0.02] p-6">
        <div>
          <label className="mb-1 block text-sm text-white/70">Título do e-book</label>
          <input
            required
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-electric-soft"
          />
        </div>

        <div>
          <label className="mb-1 block text-sm text-white/70">Descrição</label>
          <textarea
            required
            rows={4}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-electric-soft"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-white/70">Preço (MT)</label>
            <input
              required
              type="number"
              min="1"
              value={price}
              onChange={(e) => setPrice(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-electric-soft"
            />
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">Comissão Afiliado (%)</label>
            <input
              required
              type="number"
              min="0"
              max="100"
              value={commissionPercent}
              onChange={(e) => setCommissionPercent(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white outline-none focus:border-electric-soft"
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <FileField label="Capa (imagem)" accept="image/*" file={coverFile} onChange={setCoverFile} />
          <FileField label="E-book (PDF)" accept="application/pdf" file={pdfFile} onChange={setPdfFile} />
        </div>

        {formMessage && (
          <p className="rounded-lg bg-electric/10 px-3 py-2 text-sm text-electric-soft">{formMessage}</p>
        )}

        <button
          type="submit"
          disabled={submitting}
          className="w-full rounded-lg bg-electric py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft disabled:opacity-60"
        >
          {submitting ? "A enviar..." : "Enviar para análise"}
        </button>
      </form>
    </div>
  );
}

// --- Componentes Auxiliares ---

function WithdrawForm({ profile, onClose, onSuccess }: { profile: Profile; onClose: () => void; onSuccess: () => void }) {
  const [amount, setAmount] = useState("");
  const [method, setMethod] = useState<"mpesa" | "emola" | "mkesh">("mpesa");
  const [payoutNumber, setPayoutNumber] = useState(profile.payout_mpesa || "");
  const [fee, setFee] = useState(0);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    // Auto fill number based on method
    if (method === "mpesa") setPayoutNumber(profile.payout_mpesa || "");
    if (method === "emola") setPayoutNumber(profile.payout_emola || "");
    if (method === "mkesh") setPayoutNumber(profile.payout_mkesh || "");
  }, [method, profile]);

  useEffect(() => {
    const val = Number(amount);
    if (!isNaN(val) && val > 0) {
      supabase.rpc('calculate_withdrawal_fee', { amount: val }).then(({ data, error }) => {
        if (!error && data !== null) {
          setFee(Number(data));
        }
      });
    } else {
      setFee(0);
    }
  }, [amount]);

  const netAmount = Number(amount) - fee;

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    const val = Number(amount);
    if (val <= 0) {
      setError("Insira um valor válido.");
      return;
    }
    if (val > profile.wallet_balance) {
      setError("Saldo insuficiente.");
      return;
    }
    if (netAmount <= 0) {
      setError("O valor a sacar deve ser superior à taxa.");
      return;
    }
    if (!payoutNumber || payoutNumber.trim().length < 9) {
      setError("Insira um número de telemóvel válido.");
      return;
    }

    setLoading(true);
    
    try {
      // 1. Criar pedido de saque
      const { data: reqData, error: reqError } = await supabase
        .from("withdrawal_requests")
        .insert({
          profile_id: profile.id,
          requested_amount: val,
          fee_amount: fee,
          net_amount: netAmount,
          payout_method: method,
          payout_number: payoutNumber
        })
        .select("id")
        .single();
      
      if (reqError) throw reqError;

      // 2. Deduzir o saldo imediatamente no ledger
      const { error: ledgerError } = await supabase
        .from("wallet_ledger")
        .insert([
          {
            profile_id: profile.id,
            amount: -val,
            type: "withdrawal",
            reference_withdrawal_id: reqData.id,
            description: `Saque para ${method.toUpperCase()}`,
          },
          {
            profile_id: profile.id,
            amount: 0,
            type: "withdrawal_fee",
            reference_withdrawal_id: reqData.id,
            description: `Taxa de saque: ${fee} MT`,
          }
        ]);
      
      if (ledgerError) throw ledgerError;

      onSuccess();
    } catch (err: any) {
      setError(err.message || "Ocorreu um erro ao processar o saque.");
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.03] p-6">
      <div className="mb-4 flex items-center justify-between">
        <h3 className="font-display text-lg font-semibold text-white">Levantar Saldo</h3>
        <button onClick={onClose} className="text-white/40 hover:text-white">Cancelar</button>
      </div>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="mb-1 block text-sm text-white/70">Valor a levantar (MT)</label>
          <input
            type="number"
            required
            min="10"
            max={profile.wallet_balance}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-electric-soft"
            placeholder="Ex: 1500"
          />
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className="mb-1 block text-sm text-white/70">Método</label>
            <select
              value={method}
              onChange={(e) => setMethod(e.target.value as any)}
              className="w-full rounded-lg border border-white/10 bg-night-soft px-4 py-2.5 text-white outline-none focus:border-electric-soft"
            >
              <option value="mpesa">M-Pesa</option>
              <option value="emola">e-Mola</option>
              <option value="mkesh">mKesh</option>
            </select>
          </div>
          <div>
            <label className="mb-1 block text-sm text-white/70">Número da Conta</label>
            <input
              type="tel"
              required
              value={payoutNumber}
              onChange={(e) => setPayoutNumber(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-white outline-none focus:border-electric-soft"
            />
          </div>
        </div>

        {amount && !isNaN(Number(amount)) && (
          <div className="rounded-lg bg-black/20 p-4 text-sm">
            <div className="flex justify-between text-white/60">
              <span>Valor solicitado:</span>
              <span>{Number(amount).toLocaleString("pt-MZ")} MT</span>
            </div>
            <div className="flex justify-between text-white/60">
              <span>Taxa de saque:</span>
              <span className="text-red-300">-{fee.toLocaleString("pt-MZ")} MT</span>
            </div>
            <div className="mt-2 border-t border-white/10 pt-2 flex justify-between font-semibold text-white">
              <span>Total a receber:</span>
              <span className="text-emerald-400">{netAmount.toLocaleString("pt-MZ")} MT</span>
            </div>
          </div>
        )}

        {error && <p className="text-sm text-red-400">{error}</p>}

        <button
          type="submit"
          disabled={loading || netAmount <= 0}
          className="w-full rounded-lg bg-electric py-3 font-semibold text-white transition hover:bg-electric-soft disabled:opacity-50"
        >
          {loading ? "A processar..." : "Confirmar Saque"}
        </button>
      </form>
    </div>
  );
}

function StatCard({ icon: Icon, label, value }: { icon: typeof Wallet; label: string; value: string }) {
  return (
    <div className="rounded-xl border border-white/10 bg-white/[0.02] p-5">
      <Icon className="mb-3 text-electric-soft" size={22} />
      <p className="text-xs text-white/50">{label}</p>
      <p className="mt-1 font-display text-xl font-bold text-white">{value}</p>
    </div>
  );
}

function ProductList({ products, loading }: { products: Product[]; loading: boolean }) {
  const siteUrl = import.meta.env.VITE_SITE_URL || window.location.origin;

  if (loading) return <p className="text-sm text-white/50">A carregar...</p>;
  if (products.length === 0) return <p className="text-sm text-white/50">Nenhum produto ainda.</p>;

  return (
    <div className="space-y-4">
      {products.map((p) => (
        <div
          key={p.id}
          className="rounded-lg border border-white/5 bg-white/[0.02] p-5"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="font-medium text-white">{p.title}</p>
              <p className="text-sm text-white/50">{Number(p.price).toLocaleString("pt-MZ")} MT</p>
            </div>
            <div className="flex flex-col items-end gap-2">
              <StatusBadge status={p.status} />
              {p.status === "active" && (
                <button
                  onClick={async () => {
                    if (window.confirm("Desativar este produto? Ele deixará de ser vendido.")) {
                      await supabase.from("products").update({ status: "inactive" }).eq("id", p.id);
                    }
                  }}
                  className="text-xs font-semibold text-amber-400/80 hover:text-amber-400"
                >
                  Desativar produto
                </button>
              )}
              {p.status === "inactive" && (
                <button
                  onClick={async () => {
                    if (window.confirm("Reativar este produto? Ele voltará a estar disponível para compra.")) {
                      await supabase.from("products").update({ status: "active" }).eq("id", p.id);
                    }
                  }}
                  className="text-xs font-semibold text-emerald-400/80 hover:text-emerald-400"
                >
                  Reativar produto
                </button>
              )}
            </div>
          </div>

          {p.status !== "rejected" && p.status !== "inactive" && (
            <div className="mt-4 border-t border-white/5 pt-4">
              <p className="mb-2 text-xs text-white/50">
                Link de checkout {p.status === "pending_review" && <span className="text-amber-400/80">(fica ativo após aprovação)</span>}
              </p>
              <CheckoutLink url={`${siteUrl}/checkout/${p.checkout_slug}`} />
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CheckoutLink({ url }: { url: string }) {
  const [copied, setCopied] = useState(false);

  function handleCopy() {
    navigator.clipboard.writeText(url);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <div className="flex items-center gap-2">
      <div className="flex w-full items-center gap-2 rounded-lg border border-white/10 bg-black/20 px-3 py-2">
        <LinkIcon size={14} className="shrink-0 text-white/40" />
        <input
          readOnly
          value={url}
          className="w-full bg-transparent font-mono text-sm text-white/70 outline-none"
        />
      </div>
      <button
        type="button"
        onClick={handleCopy}
        className="flex shrink-0 items-center gap-2 rounded-lg bg-white/10 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/20"
      >
        <Copy size={16} />
        {copied ? "Copiado!" : "Copiar"}
      </button>
    </div>
  );
}

function StatusBadge({ status }: { status: Product["status"] }) {
  const styles = {
    pending_review: "bg-amber-500/15 text-amber-300",
    active: "bg-emerald-500/15 text-emerald-300",
    rejected: "bg-red-500/15 text-red-300",
    inactive: "bg-zinc-500/15 text-zinc-300",
  };
  const labels = {
    pending_review: "Em Análise",
    active: "Ativo",
    rejected: "Rejeitado",
    inactive: "Inativo",
  };
  return (
    <span className={`rounded-full px-3 py-1 text-xs font-medium ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}

function FileField({
  label,
  accept,
  file,
  onChange,
}: {
  label: string;
  accept: string;
  file: File | null;
  onChange: (f: File | null) => void;
}) {
  return (
    <div>
      <label className="mb-1 block text-sm text-white/70">{label}</label>
      <label className="flex cursor-pointer items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/5 px-4 py-4 text-xs text-white/60 transition hover:border-electric-soft">
        <UploadCloud size={16} />
        {file ? file.name : "Escolher ficheiro"}
        <input
          type="file"
          accept={accept}
          className="hidden"
          onChange={(e) => onChange(e.target.files?.[0] ?? null)}
        />
      </label>
    </div>
  );
}

// ─── Painel: Pagamentos a Confirmar (produtor) ────────────────────────────────

function ProducerPaymentsPanel({ profile, products }: { profile: Profile; products: Product[] }) {
  const [transactions, setTransactions] = useState<Transaction[]>([]);
  const [productMap, setProductMap] = useState<Record<string, Product>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    load();
    const channel = supabase
      .channel("producer-payments")
      .on("postgres_changes", { event: "*", schema: "public", table: "transactions" }, load)
      .subscribe();
    return () => { supabase.removeChannel(channel); };
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile.id, products]);

  async function load() {
    setLoading(true);
    if (products.length === 0) {
      setTransactions([]);
      setLoading(false);
      return;
    }
    const productIds = products.map((p) => p.id);
    const { data: txs } = await supabase
      .from("transactions")
      .select("*")
      .in("product_id", productIds)
      .eq("status", "pending")
      .order("created_at", { ascending: true });

    setTransactions((txs as Transaction[]) || []);

    const map: Record<string, Product> = {};
    products.forEach((p) => (map[p.id] = p));
    setProductMap(map);
    setLoading(false);
  }

  async function approve(tx: Transaction) {
    await supabase.from("transactions").update({ status: "completed" }).eq("id", tx.id);

    try {
      await creditWalletFromPayment(tx.id);
    } catch (e) {
      console.error("Wallet credit failed:", e);
    }

    const product = productMap[tx.product_id];
    if (product) {
      try {
        await sendPurchaseConfirmationEmail({
          to: tx.buyer_email,
          buyerName: tx.buyer_name,
          productTitle: product.title,
          downloadUrl: product.file_url,
        });
      } catch {
        /* e-mail falhou mas a aprovação já foi feita */
      }
    }
    load();
  }

  async function reject(tx: Transaction) {
    await supabase.from("transactions").update({ status: "failed" }).eq("id", tx.id);
    load();
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Pagamentos a Confirmar</h1>
      <p className="text-sm text-white/50">
        Verifique os pagamentos dos seus produtos e aprove-os após confirmar a transferência.
      </p>

      {loading && <p className="text-sm text-white/50">A carregar...</p>}
      {!loading && transactions.length === 0 && (
        <p className="text-sm text-white/50">Não há pagamentos pendentes de confirmação.</p>
      )}

      <div className="space-y-4">
        {transactions.map((tx) => {
          const product = productMap[tx.product_id];
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
                </div>
                <div className="flex gap-2">
                  <button
                    onClick={() => approve(tx)}
                    className="flex items-center gap-1 rounded-lg bg-emerald-500/15 px-3 py-2 text-sm text-emerald-300 transition hover:bg-emerald-500/25"
                  >
                    <Check size={16} /> Aprovar
                  </button>
                  <button
                    onClick={() => reject(tx)}
                    className="flex items-center gap-1 rounded-lg bg-red-500/15 px-3 py-2 text-sm text-red-300 transition hover:bg-red-500/25"
                  >
                    <X size={16} /> Rejeitar
                  </button>
                </div>
              </div>

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
