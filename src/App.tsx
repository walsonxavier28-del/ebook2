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

function Landing() {
  return (
    <div className="flex min-h-[70vh] flex-col items-center justify-center px-4 text-center">
      <AnimatedLogo />
      <p className="mt-8 max-w-lg text-white/60">
        O marketplace moçambicano de e-books e infoprodutos. Crie a sua conta para vender ou
        comprar conhecimento, com pagamento por M-Pesa e e-Mola.
      </p>
      <a
        href="/auth"
        className="mt-6 rounded-full bg-electric px-8 py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft"
      >
        Começar agora
      </a>
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
