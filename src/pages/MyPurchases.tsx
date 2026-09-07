import { useEffect, useState } from "react";
import { ShoppingBag, Download, Store } from "lucide-react";
import { supabase, Product, Transaction } from "../lib/supabase";

interface PurchaseWithProduct {
  transaction: Transaction;
  product: Product | null;
}

export default function MyPurchases() {
  const [purchases, setPurchases] = useState<PurchaseWithProduct[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    (async () => {
      const { data: txs } = await supabase
        .from("transactions")
        .select("*")
        .eq("status", "completed")
        .order("created_at", { ascending: false });

      if (!txs || txs.length === 0) {
        setLoading(false);
        return;
      }

      const list = txs as Transaction[];
      const productIds = [...new Set(list.map((t) => t.product_id))];
      const { data: prods } = await supabase
        .from("products")
        .select("*")
        .in("id", productIds);

      const productMap: Record<string, Product> = {};
      (prods as Product[] | null)?.forEach((p) => (productMap[p.id] = p));

      setPurchases(
        list.map((t) => ({ transaction: t, product: productMap[t.product_id] || null }))
      );
      setLoading(false);
    })();
  }, []);

  if (loading) {
    return <p className="text-sm text-white/50">A carregar as suas compras...</p>;
  }

  if (purchases.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 text-center">
        <ShoppingBag size={48} className="mb-4 text-white/20" />
        <h2 className="mb-2 font-display text-xl font-semibold text-white">
          Ainda não tens nenhuma compra aprovada.
        </h2>
        <p className="mb-6 text-sm text-white/50">
          Compre um e-book e, após o produtor aprovar o pagamento, ele aparecerá aqui.
        </p>
        <a
          href="/painel"
          className="flex items-center gap-2 rounded-full bg-electric px-6 py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft"
        >
          <Store size={16} /> Explorar a Loja
        </a>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <h1 className="font-display text-2xl font-bold text-white">Produtos Comprados</h1>
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
        {purchases.map(({ transaction, product }) =>
          product ? (
            <div
              key={transaction.id}
              className="flex flex-col overflow-hidden rounded-xl border border-white/10 bg-white/[0.02]"
            >
              <div className="flex aspect-[3/4] w-full items-center justify-center overflow-hidden bg-black/30 p-3">
                <img
                  src={product.cover_image_url}
                  alt={product.title}
                  className="h-full w-full rounded-lg object-contain"
                />
              </div>
              <div className="flex flex-1 flex-col gap-3 p-5">
                <div>
                  <p className="font-display font-semibold text-white">{product.title}</p>
                  <p className="mt-1 text-xs text-white/50">
                    Comprado em{" "}
                    {new Date(transaction.created_at).toLocaleDateString("pt-MZ", {
                      day: "2-digit",
                      month: "short",
                      year: "numeric",
                    })}
                  </p>
                </div>
                <a
                  href={product.file_url}
                  download
                  target="_blank"
                  rel="noreferrer"
                  className="mt-auto flex items-center justify-center gap-2 rounded-lg bg-electric py-2.5 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft"
                >
                  <Download size={16} /> Baixar E-book
                </a>
              </div>
            </div>
          ) : null
        )}
      </div>
    </div>
  );
}
