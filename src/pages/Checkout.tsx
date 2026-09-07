import { FormEvent, useEffect, useState } from "react";
import { useParams, useSearchParams } from "react-router-dom";
import { Smartphone, CheckCircle2, Upload, MessageCircle, User, AlertTriangle } from "lucide-react";
import { supabase, Product, Profile } from "../lib/supabase";

type PaymentMethod = "mpesa" | "emola" | "mkesh";

const methodLabels: Record<PaymentMethod, string> = {
  mpesa: "M-Pesa",
  emola: "e-Mola",
  mkesh: "mKesh",
};

export default function Checkout() {
  const { slug } = useParams();
  const [searchParams] = useSearchParams();
  const [product, setProduct] = useState<Product | null>(null);
  const [producer, setProducer] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);
  const [notFound, setNotFound] = useState(false);

  const [buyerName, setBuyerName] = useState("");
  const [buyerEmail, setBuyerEmail] = useState("");
  const [buyerPhone, setBuyerPhone] = useState("");
  const [method, setMethod] = useState<PaymentMethod>("mpesa");
  const [proofCode, setProofCode] = useState("");
  const [proofImage, setProofImage] = useState<File | null>(null);
  const [proofImagePreview, setProofImagePreview] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);

  useEffect(() => {
    (async () => {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("checkout_slug", slug)
        .eq("status", "active")
        .maybeSingle();

      if (!data) {
        setNotFound(true);
      } else {
        setProduct(data as Product);

        // Load producer profile for payment details
        const { data: producerData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", (data as Product).producer_id)
          .maybeSingle();

        if (producerData) {
          setProducer(producerData as Profile);
        }

        // Process affiliate reference
        const ref = searchParams.get("ref");
        if (ref && slug) {
          const { data: affData } = await supabase
            .from("profiles")
            .select("id")
            .eq("affiliate_code", ref)
            .maybeSingle();
          if (affData) {
            sessionStorage.setItem(`affiliate_${slug}`, affData.id);
          }
        }
      }
      setLoading(false);
    })();

    // Capturar utilizador logado para buyer_id
    supabase.auth.getUser().then(({ data }) => {
      setCurrentUserId(data.user?.id || null);
    });
  }, [slug]);

  function getProducerNumber(): string {
    if (!producer) return "";
    if (method === "mpesa" && producer.payout_mpesa) return producer.payout_mpesa;
    if (method === "emola" && producer.payout_emola) return producer.payout_emola;
    if (method === "mkesh" && producer.payout_mkesh) return producer.payout_mkesh;
    return "";
  }

  function getAvailableMethods(): PaymentMethod[] {
    if (!producer) return ["mpesa", "emola", "mkesh"];
    const methods: PaymentMethod[] = [];
    if (producer.payout_mpesa) methods.push("mpesa");
    if (producer.payout_emola) methods.push("emola");
    if (producer.payout_mkesh) methods.push("mkesh");
    return methods.length > 0 ? methods : ["mpesa", "emola", "mkesh"];
  }

  function handleImageChange(file: File | null) {
    setProofImage(file);
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setProofImagePreview(e.target?.result as string);
      reader.readAsDataURL(file);
    } else {
      setProofImagePreview(null);
    }
  }

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    if (!product) return;

    setSubmitting(true);
    setError(null);

    try {
      let proofImageUrl: string | null = null;

      // Upload proof image if provided
      if (proofImage) {
        const ext = proofImage.name.split(".").pop();
        const filePath = `receipts/${Date.now()}-${Math.random().toString(36).slice(2)}.${ext}`;
        const { error: uploadErr } = await supabase.storage
          .from("receipts")
          .upload(filePath, proofImage);

        if (uploadErr) throw new Error("Falha ao enviar a foto do comprovativo.");

        const { data: urlData } = supabase.storage.from("receipts").getPublicUrl(filePath);
        proofImageUrl = urlData.publicUrl;
      }

      const affiliateId = slug ? sessionStorage.getItem(`affiliate_${slug}`) : null;
      const commissionAmount =
        affiliateId && product.affiliate_commission_percent
          ? (Number(product.price) * Number(product.affiliate_commission_percent)) / 100
          : null;

      const { error: insertError } = await supabase.from("transactions").insert({
        product_id: product.id,
        buyer_name: buyerName,
        buyer_email: buyerEmail,
        buyer_phone: buyerPhone,
        payment_method: method,
        amount: product.price,
        proof_code: proofCode || "foto_comprovativo",
        proof_image_url: proofImageUrl,
        status: "pending",
        affiliate_id: affiliateId,
        affiliate_commission_amount: commissionAmount,
        buyer_id: currentUserId,
      });

      if (insertError) throw insertError;

      if (slug) sessionStorage.removeItem(`affiliate_${slug}`);
      setSubmitted(true);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Não foi possível registar a compra. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  if (loading) {
    return <div className="flex min-h-screen items-center justify-center text-white/50">A carregar...</div>;
  }

  if (notFound || !product) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div>
          <p className="text-white/70">Este produto ainda não está disponível para venda.</p>
          <p className="mt-2 text-sm text-white/40">O checkout fica disponível depois da validação do produto.</p>
        </div>
      </div>
    );
  }

  if (submitted) {
    return (
      <div className="flex min-h-screen items-center justify-center px-4 text-center">
        <div className="max-w-md rounded-2xl border border-white/10 bg-night-soft/70 p-8">
          <CheckCircle2 className="mx-auto mb-4 text-electric-soft" size={48} />
          <h1 className="mb-2 font-display text-xl font-bold text-white">Comprovativo enviado!</h1>
          <p className="mb-6 text-sm text-white/60">
            O produtor vai validar o seu pagamento em breve. Assim que for aprovado, o e-book estará 
            disponível para download na sua área de <strong>Produtos Comprados</strong> no painel (além 
            de receber uma cópia no e-mail: <strong>{buyerEmail}</strong>).
          </p>
          <a
            href="/painel"
            className="inline-block rounded-lg bg-electric px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft"
          >
            Ir para o Painel
          </a>
        </div>
      </div>
    );
  }

  const producerNumber = getProducerNumber();
  const availableMethods = getAvailableMethods();

  return (
    <div className="min-h-screen px-4 py-8 md:py-12">
      <div className="mx-auto grid max-w-4xl gap-8 md:grid-cols-2">
        {/* Coluna Esquerda — Produto */}
        <div>
          <img
            src={product.cover_image_url}
            alt={product.title}
            className="mb-6 aspect-[3/4] w-full rounded-xl object-cover shadow-glow"
          />
          <h1 className="font-display text-2xl font-bold text-white">{product.title}</h1>
          <p className="mt-2 text-sm leading-relaxed text-white/60">{product.description}</p>
          <p className="mt-4 font-display text-3xl font-extrabold text-electric-soft">
            {Number(product.price).toLocaleString("pt-MZ")} MT
          </p>
          {/* Contacto direto com o produtor ou suporte */}
          <a
            href={`https://wa.me/${(producer?.contact_whatsapp || "258871524419").replace(/\D/g, "")}`}
            target="_blank"
            rel="noreferrer"
            className="mt-4 flex items-center gap-2 rounded-lg border border-[#25D366]/30 bg-[#25D366]/10 px-4 py-3 text-sm text-white/80 transition hover:bg-[#25D366]/20"
          >
            <MessageCircle size={18} className="text-[#25D366]" />
            <span>
              Tem dúvidas? Fale {producer?.contact_whatsapp ? "com o produtor" : "com o suporte"} via WhatsApp
            </span>
          </a>
        </div>

        {/* Coluna Direita — Formulário */}
        <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-6">
          <h2 className="mb-4 font-display text-lg font-semibold text-white">Finalizar compra</h2>

          {/* Instruções de pagamento */}
          <div className="mb-5 rounded-lg border border-electric/30 bg-electric/10 p-4 text-sm text-white/80">
            <p className="mb-1 flex items-center gap-2 font-medium text-white">
              <Smartphone size={16} className="text-electric-soft" /> Instruções de pagamento
            </p>
            <p>
              Transfira <strong>{Number(product.price).toLocaleString("pt-MZ")} MT</strong> via{" "}
              {methodLabels[method]} para o número:
            </p>
            {producerNumber ? (
              <div className="mt-2 rounded-md bg-black/30 p-3">
                <p className="font-mono text-lg font-bold text-electric-soft">{producerNumber}</p>
                {producer?.mobile_money_name && (
                  <p className="mt-1 flex items-center gap-1 text-xs text-white/50">
                    <User size={12} /> Titular: {producer.mobile_money_name}
                  </p>
                )}
              </div>
            ) : (
              <p className="mt-2 text-xs text-amber-400">
                O produtor ainda não configurou o número de {methodLabels[method]}. Experimente outro método de pagamento.
              </p>
            )}
            <p className="mt-2 text-xs text-white/50">
              Depois de transferir, cole o código da transação e/ou envie a foto do comprovativo abaixo.
            </p>
          </div>

          <form onSubmit={handleSubmit} className="space-y-4">
            <input
              required
              placeholder="Nome completo"
              value={buyerName}
              onChange={(e) => setBuyerName(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-electric-soft"
            />
            <input
              required
              type="email"
              placeholder="E-mail"
              value={buyerEmail}
              onChange={(e) => setBuyerEmail(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-electric-soft"
            />
            <input
              required
              type="tel"
              placeholder="Telemóvel (+258)"
              value={buyerPhone}
              onChange={(e) => setBuyerPhone(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-electric-soft"
            />

            {/* Métodos de pagamento */}
            <div className="flex gap-2">
              {availableMethods.map((m) => (
                <button
                  key={m}
                  type="button"
                  onClick={() => setMethod(m)}
                  className={`flex-1 rounded-lg border py-2.5 text-sm font-medium transition ${
                    method === m
                      ? "border-electric bg-electric/15 text-electric-soft"
                      : "border-white/10 text-white/60 hover:border-white/20"
                  }`}
                >
                  {methodLabels[m]}
                </button>
              ))}
            </div>

            {/* Aviso de taxa entre operadoras diferentes */}
            {(() => {
              const cleanPhone = buyerPhone.replace(/\D/g, "");
              let prefix = "";
              if (cleanPhone.startsWith("258") && cleanPhone.length >= 5) prefix = cleanPhone.substring(3, 5);
              else if (cleanPhone.length >= 2) prefix = cleanPhone.substring(0, 2);
              
              const isCrossOperator = 
                (method === "mpesa" && ["86", "87", "82", "83"].includes(prefix)) ||
                (method === "emola" && ["84", "85", "82", "83"].includes(prefix)) ||
                (method === "mkesh" && ["84", "85", "86", "87"].includes(prefix));

              if (!isCrossOperator) return null;

              return (
                <div className="flex items-start gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 p-3 text-xs text-amber-300">
                  <AlertTriangle size={16} className="mt-0.5 shrink-0 text-amber-400" />
                  <span>
                    Está a pagar a partir de uma operadora diferente da do produtor. Transferências entre
                    operadoras diferentes podem ter uma taxa extra cobrada pela sua operadora.
                  </span>
                </div>
              );
            })()}

            {/* Código de transação */}
            <input
              placeholder="Código de transação (opcional se enviar foto)"
              value={proofCode}
              onChange={(e) => setProofCode(e.target.value)}
              className="w-full rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white placeholder-white/40 outline-none focus:border-electric-soft"
            />

            {/* Upload de comprovativo */}
            <div>
              <label className="flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border border-dashed border-white/15 bg-white/5 px-4 py-5 text-center transition hover:border-electric-soft">
                <Upload size={20} className="text-white/40" />
                <span className="text-xs text-white/60">
                  {proofImage ? proofImage.name : "Enviar foto do comprovativo (clique aqui)"}
                </span>
                <input
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => handleImageChange(e.target.files?.[0] ?? null)}
                />
              </label>
              {proofImagePreview && (
                <div className="mt-3 overflow-hidden rounded-lg border border-white/10">
                  <img src={proofImagePreview} alt="Comprovativo" className="h-40 w-full object-contain bg-black/20" />
                </div>
              )}
            </div>

            {error && <p className="text-sm text-red-300">{error}</p>}

            <button
              type="submit"
              disabled={submitting || (!proofCode && !proofImage)}
              className="w-full rounded-lg bg-electric py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft disabled:opacity-60"
            >
              {submitting ? "A enviar..." : "Confirmar pagamento"}
            </button>
            <p className="text-center text-xs text-white/40">
              O comprovativo será validado pelo produtor. O download será enviado por e-mail.
            </p>
          </form>
        </div>
      </div>
    </div>
  );
}
