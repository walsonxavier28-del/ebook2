import { useEffect, useState } from "react";
import { ShoppingCart, Handshake, CheckCircle, Clock } from "lucide-react";
import { supabase, Product, Profile, Affiliation } from "../lib/supabase";
import { Link, useNavigate } from "react-router-dom";

export default function Marketplace({ profile }: { profile: Profile | null }) {
  const [products, setProducts] = useState<Product[]>([]);
  const [affiliations, setAffiliations] = useState<Record<string, Affiliation>>({});
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      const { data: prodData } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setProducts((prodData as Product[]) || []);

      if (profile) {
        const { data: affData } = await supabase
          .from("affiliations")
          .select("*")
          .eq("affiliate_id", profile.id);
        
        const affMap: Record<string, Affiliation> = {};
        if (affData) {
          (affData as Affiliation[]).forEach(a => affMap[a.product_id] = a);
        }
        setAffiliations(affMap);
      }

      setLoading(false);
    }
    loadData();
  }, [profile]);

  async function requestAffiliation(product: Product) {
    if (!profile) {
      navigate("/auth");
      return;
    }
    
    // Optimistic UI update
    setAffiliations(prev => ({
      ...prev,
      [product.id]: {
        id: "temp",
        product_id: product.id,
        affiliate_id: profile.id,
        producer_id: product.producer_id,
        status: "pending",
        created_at: new Date().toISOString()
      }
    }));

    await supabase.from("affiliations").insert({
      product_id: product.id,
      affiliate_id: profile.id,
      producer_id: product.producer_id,
      status: "pending"
    });
  }

  return (
    <div className="space-y-6 max-w-7xl">
      <h1 className="font-display text-2xl font-bold text-white">Todos os E-books</h1>

      {loading ? (
        <p className="text-white/50">A carregar e-books...</p>
      ) : products.length === 0 ? (
        <div className="rounded-xl border border-white/5 bg-white/[0.02] p-10 text-center">
          <p className="text-white/70">Ainda não há e-books disponíveis.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
          {products.map((p) => (
            <div
              key={p.id}
              className="group flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] transition hover:border-electric/30 hover:bg-white/[0.04]"
            >
              <div className="h-36 w-full overflow-hidden bg-black/40 p-2 sm:aspect-[3/4] sm:h-auto sm:p-3">
                <img
                  src={p.cover_image_url}
                  alt={p.title}
                  className="h-full w-full rounded-lg object-contain transition duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-1 font-medium leading-tight text-white line-clamp-2" title={p.title}>
                  {p.title}
                </h3>
                <p className="mt-2 font-display text-lg font-bold text-electric-soft">
                  {Number(p.price).toLocaleString("pt-MZ")} MT
                </p>
                <div className="mt-auto pt-4 space-y-2">
                  <Link
                    to={`/checkout/${encodeURIComponent(p.checkout_slug)}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-electric py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft"
                  >
                    <ShoppingCart size={16} />
                    Comprar
                  </Link>

                  {p.affiliate_enabled && (!profile || p.producer_id !== profile.id) && (
                    <>
                      {affiliations[p.id] ? (
                        affiliations[p.id].status === "approved" ? (
                          <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-emerald-500/30 bg-emerald-500/10 py-2 text-xs font-semibold text-emerald-400">
                            <CheckCircle size={14} /> Já é afiliado
                          </div>
                        ) : affiliations[p.id].status === "pending" ? (
                          <div className="flex w-full items-center justify-center gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 py-2 text-xs font-semibold text-amber-400">
                            <Clock size={14} /> Afiliação Pendente
                          </div>
                        ) : null
                      ) : (
                        <button
                          onClick={() => requestAffiliation(p)}
                          className="flex w-full items-center justify-center gap-2 rounded-lg border border-white/10 bg-transparent py-2 text-xs font-semibold text-white/70 transition hover:bg-white/5 hover:text-white"
                        >
                          <Handshake size={14} /> Pedir Afiliação
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
