import { useEffect, useState } from "react";
import { ShoppingCart } from "lucide-react";
import { supabase, Product } from "../lib/supabase";
import { Link } from "react-router-dom";

export default function Marketplace() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    async function loadProducts() {
      const { data } = await supabase
        .from("products")
        .select("*")
        .eq("status", "active")
        .order("created_at", { ascending: false });

      setProducts((data as Product[]) || []);
      setLoading(false);
    }
    loadProducts();
  }, []);

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
              <div className="aspect-[4/5] w-full overflow-hidden bg-black/40">
                <img
                  src={p.cover_image_url}
                  alt={p.title}
                  className="h-full w-full object-cover transition duration-300 group-hover:scale-105"
                />
              </div>
              <div className="flex flex-1 flex-col p-4">
                <h3 className="mb-1 font-medium leading-tight text-white line-clamp-2" title={p.title}>
                  {p.title}
                </h3>
                <p className="mt-2 font-display text-lg font-bold text-electric-soft">
                  {Number(p.price).toLocaleString("pt-MZ")} MT
                </p>
                <div className="mt-auto pt-4">
                  <Link
                    to={`/checkout/${p.checkout_slug}`}
                    className="flex w-full items-center justify-center gap-2 rounded-lg bg-electric py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft"
                  >
                    <ShoppingCart size={16} />
                    Comprar
                  </Link>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
