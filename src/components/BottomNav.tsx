import { NavLink, useLocation } from "react-router-dom";
import { User, Receipt, ScanLine, CalendarDays, Store, PlusCircle, Wallet } from "lucide-react";
import { useAuth } from "../context/AuthContext";

const ROTAS_SEM_NAVEGACAO = ["/login", "/cadastro", "/scanner"];

export default function BottomNav() {
  const { usuario } = useAuth();
  const localizacao = useLocation();

  if (!usuario) return null;
  if (ROTAS_SEM_NAVEGACAO.some((rota) => localizacao.pathname.startsWith(rota))) return null;

  const emTelaDeLoja = localizacao.pathname.startsWith("/minha-loja") || localizacao.pathname.startsWith("/nova-venda");
  const botaoCentral =
    usuario.isLojista && emTelaDeLoja
      ? { to: "/nova-venda", rotulo: "Vender", Icone: PlusCircle }
      : { to: "/scanner", rotulo: "Pagar", Icone: ScanLine };

  return (
    <nav className="navegacao-inferior">
      <NavLink to="/perfil" className="item-navegacao">
        <User size={20} />
        <span>Perfil</span>
      </NavLink>
      <NavLink to="/transacoes" className="item-navegacao">
        <Receipt size={20} />
        <span>Transações</span>
      </NavLink>

      <NavLink to={botaoCentral.to} className="item-navegacao item-navegacao-central" aria-label={botaoCentral.rotulo}>
        <span className="botao-pagar-flutuante">
          <botaoCentral.Icone size={24} />
        </span>
        <span>{botaoCentral.rotulo}</span>
      </NavLink>

      <NavLink to="/eventos" className="item-navegacao">
        <CalendarDays size={20} />
        <span>Eventos</span>
      </NavLink>

      {usuario.isLojista ? (
        <NavLink to="/minha-loja" className="item-navegacao">
          <Store size={20} />
          <span>Loja</span>
        </NavLink>
      ) : (
        <NavLink to="/pix" className="item-navegacao">
          <Wallet size={20} />
          <span>Pix</span>
        </NavLink>
      )}
    </nav>
  );
}
