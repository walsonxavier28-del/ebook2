import { NavLink } from "react-router-dom";
import { LayoutDashboard, BookPlus, Library, ShieldCheck, Users, Users2, Wallet, Store, Settings, ShoppingBag, CheckCircle, TrendingUp } from "lucide-react";

interface SidebarProps {
  isAdmin: boolean;
  activeTab: string;
  onTabChange: (tab: string) => void;
}

const producerTabs = [
  { id: "store", label: "Loja", icon: Store },
  { id: "my-purchases", label: "Produtos Comprados", icon: ShoppingBag },
  { id: "dashboard", label: "Dashboard", icon: LayoutDashboard },
  { id: "new-product", label: "Cadastrar Produto", icon: BookPlus },
  { id: "my-products", label: "Meus Produtos", icon: Library },
  { id: "producer-payments", label: "Validar Vendas", icon: CheckCircle },
  { id: "producer-affiliates", label: "Meus Afiliados", icon: Users2 },
  { id: "affiliates", label: "Painel de Afiliado", icon: TrendingUp },
  { id: "settings", label: "Definições", icon: Settings },
];

const adminTabs = [
  { id: "product-review", label: "Validação de Produtos", icon: ShieldCheck },
  { id: "accounts", label: "Gerenciamento de Contas", icon: Users },
  { id: "deposits", label: "Validar Depósitos", icon: Wallet },
  { id: "withdrawals", label: "Saques Pendentes", icon: Wallet },
];

export default function Sidebar({ isAdmin, activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="w-full shrink-0 border-r border-white/5 bg-night-soft/60 md:w-64">
      <nav className="flex flex-col gap-1 p-4">
        <p className="px-3 pb-2 pt-1 text-xs font-medium uppercase tracking-wide text-white/40">
          Menu Principal
        </p>
        {producerTabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
              activeTab === tab.id
                ? "bg-electric/15 text-electric-soft"
                : "text-white/70 hover:bg-white/5 hover:text-white"
            }`}
          >
            <tab.icon size={18} />
            {tab.label}
          </button>
        ))}

        {isAdmin && (
          <>
            <p className="px-3 pb-2 pt-5 text-xs font-medium uppercase tracking-wide text-white/40">
              Administração
            </p>
            {adminTabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => onTabChange(tab.id)}
                className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-left text-sm transition ${
                  activeTab === tab.id
                    ? "bg-electric/15 text-electric-soft"
                    : "text-white/70 hover:bg-white/5 hover:text-white"
                }`}
              >
                <tab.icon size={18} />
                {tab.label}
              </button>
            ))}
          </>
        )}
      </nav>
    </aside>
  );
}
