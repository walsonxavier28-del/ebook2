import { FormEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, User, Phone, MessageCircle, ChevronLeft, ChevronRight } from "lucide-react";
import { supabase } from "../lib/supabase";
import { sendWelcomeEmail } from "../lib/emailService";
import AnimatedLogo from "../components/AnimatedLogo";

function normalizeMozPhone(raw: string): string | null {
  const digits = raw.replace(/\D/g, "");
  const local = digits.startsWith("258") ? digits.slice(3) : digits;

  const validPrefixes = ["84", "85", "86", "87", "82", "83"];
  if (local.length !== 9 || !validPrefixes.includes(local.slice(0, 2))) {
    return null;
  }
  return `+258${local}`;
}

const slides = [
  {
    image: "/slide-dashboard.png",
    title: "O seu painel completo",
    description:
      "Acompanhe vendas, saldo e produtos num dashboard profissional. Tudo o que precisa para gerir o seu negócio digital num único lugar.",
  },
  {
    image: "/slide-payment.png",
    title: "Pagamentos via Mobile Money",
    description:
      "Os seus clientes pagam diretamente para o seu M-Pesa, e-Mola ou mKesh. Sem intermediários, sem complicações — receba na hora.",
  },
  {
    image: "/slide-affiliate.png",
    title: "Ganhe com afiliados",
    description:
      "Partilhe links de afiliado e ganhe comissões automáticas em cada venda. Quanto mais partilhar, mais ganha — sem limites.",
  },
];

function OnboardingCarousel() {
  const [current, setCurrent] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrent((prev) => (prev + 1) % slides.length);
    }, 5000);
    return () => clearInterval(interval);
  }, []);

  return (
    <div className="relative flex h-full flex-col items-center justify-center p-8">
      {/* Slide image */}
      <div className="relative mb-8 w-full max-w-sm overflow-hidden rounded-2xl shadow-2xl shadow-electric/20">
        {slides.map((slide, i) => (
          <img
            key={i}
            src={slide.image}
            alt={slide.title}
            className={`w-full rounded-2xl object-cover transition-all duration-700 ${
              i === current ? "opacity-100" : "absolute inset-0 opacity-0"
            }`}
          />
        ))}
      </div>

      {/* Text */}
      <div className="text-center">
        <h3 className="mb-2 font-display text-xl font-bold text-white">
          {slides[current].title}
        </h3>
        <p className="mx-auto max-w-xs text-sm leading-relaxed text-white/60">
          {slides[current].description}
        </p>
      </div>

      {/* Navigation dots + arrows */}
      <div className="mt-8 flex items-center gap-4">
        <button
          onClick={() => setCurrent((prev) => (prev - 1 + slides.length) % slides.length)}
          className="rounded-full bg-white/10 p-2 text-white/60 transition hover:bg-white/20 hover:text-white"
        >
          <ChevronLeft size={18} />
        </button>
        <div className="flex gap-2">
          {slides.map((_, i) => (
            <button
              key={i}
              onClick={() => setCurrent(i)}
              className={`h-2 rounded-full transition-all duration-300 ${
                i === current ? "w-6 bg-electric" : "w-2 bg-white/20"
              }`}
            />
          ))}
        </div>
        <button
          onClick={() => setCurrent((prev) => (prev + 1) % slides.length)}
          className="rounded-full bg-white/10 p-2 text-white/60 transition hover:bg-white/20 hover:text-white"
        >
          <ChevronRight size={18} />
        </button>
      </div>
    </div>
  );
}

export default function Auth() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<"login" | "signup">("signup");
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function handleSubmit(e: FormEvent) {
    e.preventDefault();
    setError(null);

    if (mode === "signup") {
      const normalizedPhone = normalizeMozPhone(phone);
      if (!normalizedPhone) {
        setError("Introduza um número moçambicano válido (ex: 82/83/84/85/86/87 XXX XXXX).");
        return;
      }

      setLoading(true);
      const { data, error: signUpError } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
            phone_number: normalizedPhone,
          },
        },
      });

      if (signUpError) {
        setError(signUpError.message);
        setLoading(false);
        return;
      }

      if (data.user) {
        try {
          await sendWelcomeEmail(email, fullName);
        } catch {
          // Não bloqueia o cadastro se o e-mail falhar — apenas regista o erro.
        }
      }

      setLoading(false);
      navigate("/painel");
      return;
    }

    setLoading(true);
    const { data: authData, error: loginError } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    setLoading(false);

    if (loginError) {
      setError(loginError.message);
      return;
    }

    if (authData.user) {
      const { data: profile } = await supabase.from("profiles").select("is_blocked").eq("id", authData.user.id).single();
      if (profile?.is_blocked) {
        await supabase.auth.signOut();
        setError("A sua conta foi suspensa por um administrador.");
        return;
      }
    }

    navigate("/painel");
  }

  return (
    <div className="relative flex min-h-screen overflow-hidden">
      {/* Lado esquerdo — Carrossel (só aparece em ecrãs maiores) */}
      <div className="hidden w-1/2 border-r border-white/5 bg-gradient-to-br from-night-soft via-[#0B0F19] to-[#0d1427] lg:flex">
        <OnboardingCarousel />
      </div>

      {/* Lado direito — Formulário */}
      <div className="flex w-full flex-col items-center justify-center px-4 py-12 lg:w-1/2">
        <div className="pointer-events-none absolute -top-32 left-1/2 h-96 w-96 -translate-x-1/2 rounded-full bg-electric/20 blur-3xl lg:left-3/4" />

        <div className="relative z-10 w-full max-w-md">
          <div className="mb-8">
            <AnimatedLogo />
          </div>

          <div className="rounded-2xl border border-white/10 bg-night-soft/70 p-8 shadow-xl backdrop-blur">
            <div className="mb-6 flex rounded-full bg-white/5 p-1">
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                  mode === "signup" ? "bg-electric text-white" : "text-white/60"
                }`}
              >
                Criar conta
              </button>
              <button
                onClick={() => setMode("login")}
                className={`flex-1 rounded-full py-2 text-sm font-medium transition ${
                  mode === "login" ? "bg-electric text-white" : "text-white/60"
                }`}
              >
                Entrar
              </button>
            </div>

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === "signup" && (
                <div className="relative">
                  <User size={18} className="absolute left-3 top-3.5 text-white/40" />
                  <input
                    required
                    type="text"
                    placeholder="Nome completo"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    autoComplete="name"
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 outline-none transition focus:border-electric-soft"
                  />
                </div>
              )}

              <div className="relative">
                <Mail size={18} className="absolute left-3 top-3.5 text-white/40" />
                <input
                  required
                  type="email"
                  placeholder="Digite o seu e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  autoComplete="off"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 outline-none transition focus:border-electric-soft"
                />
              </div>

              {mode === "signup" && (
                <div className="relative">
                  <Phone size={18} className="absolute left-3 top-3.5 text-white/40" />
                  <input
                    required
                    type="tel"
                    placeholder="Telemóvel (ex: 84 123 4567)"
                    value={phone}
                    onChange={(e) => setPhone(e.target.value)}
                    autoComplete="off"
                    className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 outline-none transition focus:border-electric-soft"
                  />
                </div>
              )}

              <div className="relative">
                <Lock size={18} className="absolute left-3 top-3.5 text-white/40" />
                <input
                  required
                  minLength={6}
                  type="password"
                  placeholder="Palavra-passe"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  autoComplete="new-password"
                  className="w-full rounded-lg border border-white/10 bg-white/5 py-3 pl-10 pr-4 text-sm text-white placeholder-white/40 outline-none transition focus:border-electric-soft"
                />
              </div>

              {error && (
                <p className="rounded-lg bg-red-500/10 px-3 py-2 text-sm text-red-300">{error}</p>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-electric py-3 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft disabled:opacity-60"
              >
                {loading ? "A processar..." : mode === "signup" ? "Criar a minha conta" : "Entrar"}
              </button>
            </form>
          </div>

          {/* Carrossel em telemóvel (abaixo do formulário) */}
          <div className="mt-8 lg:hidden">
            <OnboardingCarousel />
          </div>

          <section className="mt-10 rounded-2xl border border-white/5 bg-white/[0.02] p-6 text-sm text-white/70">
            <h2 className="mb-2 font-display text-base font-semibold text-white">Quem somos</h2>
            <p className="leading-relaxed">
              A eBookly é o marketplace moçambicano de e-books e infoprodutos. Ligamos criadores
              de conteúdo a leitores em todo o país, com pagamento simples via M-Pesa, e-Mola e mKesh —
              sem cartão de crédito, sem complicações.
            </p>
          </section>
        </div>

        <a
          href={import.meta.env.VITE_SUPPORT_WHATSAPP || "https://wa.me/258871524419"}
          target="_blank"
          rel="noreferrer"
          className="fixed bottom-6 right-6 z-20 flex h-14 w-14 items-center justify-center rounded-full bg-[#25D366] shadow-lg transition hover:scale-105"
          aria-label="Suporte via WhatsApp"
        >
          <MessageCircle className="text-white" size={26} />
        </a>
      </div>
    </div>
  );
}
