import { Link, useNavigate } from "react-router-dom";
import { LogOut, MessageCircle } from "lucide-react";
import { supabase, Profile } from "../lib/supabase";

interface NavbarProps {
  profile: Profile | null;
}

export default function Navbar({ profile }: NavbarProps) {
  const navigate = useNavigate();

  async function handleLogout() {
    await supabase.auth.signOut();
    navigate("/auth");
  }

  return (
    <header className="sticky top-0 z-40 border-b border-white/5 bg-night/80 backdrop-blur-md">
      <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
        <Link to="/" className="flex items-center gap-3 font-display text-xl font-extrabold text-white">
          <img
            src="/logo.png"
            alt="eBookly"
            width={36}
            height={36}
            style={{ width: 36, height: 36 }}
            className="rounded-xl object-cover shadow-sm"
          />
          <span>eBook<span className="text-electric-soft">ly</span></span>
        </Link>

        <div className="flex items-center gap-4">
          <a
            href={import.meta.env.VITE_SUPPORT_WHATSAPP || "https://wa.me/258871524419"}
            target="_blank"
            rel="noreferrer"
            className="hidden items-center gap-2 rounded-full border border-white/10 px-4 py-2 text-sm text-white/80 transition hover:border-electric-soft hover:text-white sm:flex"
          >
            <MessageCircle size={16} className="text-electric-soft" />
            Suporte
          </a>

          {profile ? (
            <div className="flex items-center gap-3">
              <span className="hidden text-sm text-white/70 sm:inline">
                Olá, {profile.full_name.split(" ")[0]}
              </span>
              <button
                onClick={handleLogout}
                className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-sm text-white transition hover:bg-white/10"
              >
                <LogOut size={16} />
                Sair
              </button>
            </div>
          ) : (
            <Link
              to="/auth"
              className="rounded-full bg-electric px-5 py-2 text-sm font-semibold text-white shadow-glow transition hover:bg-electric-soft"
            >
              Entrar
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
