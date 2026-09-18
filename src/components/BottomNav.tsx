import { NavLink } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function BottomNav() {
  const { usuario } = useAuth();
  if (!usuario) return null;

  return (
    <nav className="navegacao-inferior">
      <NavLink to="/perfil" className="item-navegacao">
        Perfil
      </NavLink>
      <NavLink to="/transacoes" className="item-navegacao">
        Transações
      </NavLink>
      <NavLink to="/scanner" className="botao-pagar-flutuante" aria-label="Pagar">
        Pagar
      </NavLink>
      <NavLink to="/eventos" className="item-navegacao">
        Eventos
      </NavLink>
      {usuario.isLojista && (
        <NavLink to="/minha-loja" className="item-navegacao">
          Loja
        </NavLink>
      )}
    </nav>
  );
}
