import { useEffect, useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { supabase, isAdminEmail, Profile } from "./lib/supabase";
import Navbar from "./components/Navbar";
import Sidebar from "./components/Sidebar";
import AnimatedLogo from "./components/AnimatedLogo";
import Auth from "./pages/Auth";
import ProducerDashboard from "./pages/ProducerDashboard";
import AdminDashboard from "./pages/AdminDashboard";
import Checkout from "./pages/Checkout";
import AffiliatePanel from "./pages/AffiliatePanel";
import Marketplace from "./pages/Marketplace";
import ProfileSettings from "./pages/ProfileSettings";
import MyPurchases from "./pages/MyPurchases";

import { BookOpen, Smartphone, ShieldCheck, TrendingUp, ArrowRight, MessageCircle, Sparkles } from "lucide-react";

function Landing() {
  return (
    <div className="min-h-screen text-white">
      {/* Hero Section */}
      <section className="relative overflow-hidden pt-12 pb-20 px-4">
        {/* Subtle background glow, no harsh neon */}
        <div className="pointer-events-none absolute top-0 left-1/2 -translate-x-1/2 w-[600px] h-[350px] bg-electric/10 rounded-full blur-3xl -z-10" />

        <div className="max-w-5xl mx-auto flex flex-col items-center text-center">
          {/* Official Logo Display */}
          <div className="mb-6">
            <AnimatedLogo size="lg" showTagline={false} />
          </div>

          <div className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-4 py-1.5 text-xs font-semibold text-electric-soft mb-6">
            <Sparkles size={14} />
            Marketplace de E-books em Moçambique
          </div>

          <h1 className="font-display text-4xl sm:text-5xl lg:text-6xl font-extrabold tracking-tight max-w-3xl leading-tight">
            Conhecimento que <span className="bg-gradient-to-r from-white via-electric-soft to-blue-200 bg-clip-text text-transparent">transforma</span> a sua vida
          </h1>

          <p className="mt-6 max-w-2xl text-base sm:text-lg text-white/70 leading-relaxed font-normal">
            A plataforma líder para comprar e vender e-books e infoprodutos em Moçambique.
            Compre em Meticais e pague na hora com <strong className="text-white">M-Pesa</strong> ou <strong className="text-white">e-Mola</strong>.
          </p>

          <div className="mt-8 flex flex-wrap items-center justify-center gap-4">
            <a
              href="#catalogo"
              className="flex items-center gap-2 rounded-full bg-electric px-7 py-3.5 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft"
            >
              <BookOpen size={18} />
              Explorar Catálogo
            </a>
            <a
              href="/auth"
              className="flex items-center gap-2 rounded-full border border-white/15 bg-white/5 px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-white/10 hover:border-white/25"
            >
              Começar a Vender
              <ArrowRight size={16} />
            </a>
          </div>

          {/* Quick stats / trust signals */}
          <div className="mt-14 grid grid-cols-2 sm:grid-cols-3 gap-6 max-w-2xl w-full border-t border-white/10 pt-8 text-center">
            <div>
              <p className="font-display text-2xl font-bold text-white">M-Pesa & e-Mola</p>
              <p className="text-xs text-white/50 mt-1">Pagamento 100% Local</p>
            </div>
            <div>
              <p className="font-display text-2xl font-bold text-white">Instantâneo</p>
              <p className="text-xs text-white/50 mt-1">Envio direto ao e-mail</p>
            </div>
            <div className="col-span-2 sm:col-span-1">
              <p className="font-display text-2xl font-bold text-white">Afiliados</p>
              <p className="text-xs text-white/50 mt-1">Comissões automáticas</p>
            </div>
          </div>
        </div>
      </section>

      {/* Showcase / Marketplace Section */}
      <section id="catalogo" className="py-16 px-6 max-w-7xl mx-auto border-t border-white/5">
        <div className="mb-10 text-center max-w-2xl mx-auto">
          <h2 className="font-display text-3xl font-bold text-white tracking-tight">
            Catálogo de E-books
          </h2>
          <p className="mt-2 text-sm text-white/60">
            Descubra os melhores títulos de autores e produtores moçambicanos
          </p>
        </div>

        <Marketplace />
      </section>

      {/* Como Funciona */}
      <section className="py-16 px-6 bg-night-soft/50 border-t border-white/5">
        <div className="max-w-6xl mx-auto">
          <div className="text-center max-w-xl mx-auto mb-12">
            <h2 className="font-display text-3xl font-bold text-white">
              Como funciona o eBookly
            </h2>
            <p className="mt-2 text-sm text-white/60">
              Simples, seguro e pensado para Moçambique
            </p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center transition hover:border-electric/30">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-electric/10 text-electric-soft mb-6">
                <BookOpen size={28} />
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2">1. Escolha o E-book</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Navegue pelo nosso catálogo e selecione o conhecimento que você quer dominar hoje.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center transition hover:border-electric/30">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-electric/10 text-electric-soft mb-6">
                <Smartphone size={28} />
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2">2. Pague com Mobile Money</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Pague diretamente do seu telemóvel por M-Pesa ou e-Mola em Meticais, sem cartão internacional.
              </p>
            </div>

            <div className="rounded-2xl border border-white/10 bg-white/[0.02] p-8 text-center transition hover:border-electric/30">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-2xl bg-electric/10 text-electric-soft mb-6">
                <ShieldCheck size={28} />
              </div>
              <h3 className="font-display text-lg font-bold text-white mb-2">3. Receba no E-mail</h3>
              <p className="text-sm text-white/60 leading-relaxed">
                Acesso imediato! O e-book chega com link seguro diretamente na sua caixa de entrada.
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Seção Produtores e Afiliados */}
      <section className="py-20 px-6 max-w-6xl mx-auto">
        <div className="rounded-3xl border border-white/10 bg-gradient-to-br from-night-soft to-[#0c1324] p-8 md:p-12">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
            <div>
              <div className="inline-flex items-center gap-2 rounded-full border border-electric/30 bg-electric/10 px-3.5 py-1 text-xs font-semibold text-electric-soft mb-4">
                <TrendingUp size={14} />
                Para Produtores & Afiliados
              </div>
              <h2 className="font-display text-3xl sm:text-4xl font-bold text-white tracking-tight">
                Venda o seu conhecimento para todo o país
              </h2>
              <p className="mt-4 text-white/70 leading-relaxed text-sm sm:text-base">
                Tem um e-book, manual ou curso? Cadastre-se no eBookly em 2 minutos. Nós cuidamos do checkout, dos pagamentos via M-Pesa e e-Mola, e da entrega automática aos seus clientes.
              </p>
              <div className="mt-6 flex gap-4">
                <a
                  href="/auth"
                  className="rounded-full bg-electric px-6 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft"
                >
                  Criar Conta Gratuita
                </a>
              </div>
            </div>

            <div className="relative overflow-hidden rounded-2xl border border-white/10 shadow-2xl">
              <img
                src="/slide-dashboard.png"
                alt="Painel eBookly"
                className="w-full h-auto object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="border-t border-white/5 py-12 px-6 bg-night">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-6">
          <div className="flex items-center gap-3">
            <img src="/logo.png" alt="eBookly" className="h-8 w-8 rounded-xl object-cover" />
            <span className="font-display text-lg font-extrabold text-white">
              eBook<span className="text-electric-soft">ly</span>
            </span>
          </div>
          <p className="text-xs text-white/50 text-center">
            © {new Date().getFullYear()} eBookly. Todos os direitos reservados.
          </p>
          <a
            href={import.meta.env.VITE_SUPPORT_WHATSAPP || "https://wa.me/258871524419"}
            target="_blank"
            rel="noreferrer"
            className="flex items-center gap-2 text-xs text-white/70 hover:text-white transition"
          >
            <MessageCircle size={15} className="text-[#25D366]" />
            Suporte WhatsApp
          </a>
        </div>
      </footer>
    </div>
  );
}

function PainelRoute({ profile }: { profile: Profile | null }) {
  const [activeTab, setActiveTab] = useState("store");

  if (!profile) return <Navigate to="/auth" replace />;

  const isAdmin = profile.is_super_admin || isAdminEmail(profile.email);

  return (
    <div className="flex min-h-[calc(100vh-73px)] flex-col md:flex-row">
      <Sidebar isAdmin={isAdmin} activeTab={activeTab} onTabChange={setActiveTab} />
      <main className="flex-1 p-6 md:p-10">
        {["product-review", "accounts", "deposits", "withdrawals"].includes(activeTab) && isAdmin ? (
          <AdminDashboard activeTab={activeTab} profile={profile} />
        ) : activeTab === "store" ? (
          <Marketplace />
        ) : activeTab === "my-purchases" ? (
          <MyPurchases />
        ) : activeTab === "settings" ? (
          <ProfileSettings profile={profile} />
        ) : activeTab === "affiliates" ? (
          <AffiliatePanel profile={profile} />
        ) : (
          <ProducerDashboard profile={profile} activeTab={activeTab} />
        )}
      </main>
    </div>
  );
}

export default function App() {
  const [profile, setProfile] = useState<Profile | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    let mounted = true;

    async function loadSession() {
      const { data: sessionData } = await supabase.auth.getSession();
      const userId = sessionData.session?.user.id;

      if (userId) {
        const { data: profileData } = await supabase.from("profiles").select("*").eq("id", userId).single();
        if (profileData?.is_blocked) {
          await supabase.auth.signOut();
          if (mounted) setProfile(null);
        } else {
          if (mounted) setProfile((profileData as Profile) || null);
        }
      }
      if (mounted) setLoading(false);
    }

    loadSession();

    const { data: listener } = supabase.auth.onAuthStateChange(async (_event, session) => {
      if (session?.user) {
        const { data: profileData } = await supabase
          .from("profiles")
          .select("*")
          .eq("id", session.user.id)
          .single();
        if (profileData?.is_blocked) {
          await supabase.auth.signOut();
          setProfile(null);
        } else {
          setProfile((profileData as Profile) || null);
        }
      } else {
        setProfile(null);
      }
    });

    return () => {
      mounted = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <AnimatedLogo size="sm" showTagline={false} />
      </div>
    );
  }

  return (
    <Routes>
      <Route path="/checkout/:slug" element={<Checkout />} />
      <Route
        path="*"
        element={
          <>
            <Navbar profile={profile} />
            <Routes>
              <Route path="/" element={<Landing />} />
              <Route path="/auth" element={profile ? <Navigate to="/painel" replace /> : <Auth />} />
              <Route path="/painel" element={<PainelRoute profile={profile} />} />
            </Routes>
          </>
        }
      />
    </Routes>
  );
}
