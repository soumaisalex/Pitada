import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Admin() {
  const { usuario } = useAuth();

  if (!usuario?.isAdmin) {
    return (
      <div className="tela tela-com-navegacao">
        <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
        <p className="subtitulo">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  return (
    <div className="tela tela-com-navegacao">
      <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
      <p className="subtitulo">Painel administrativo</p>
      <hr className="divisor" />

      <p className="link-secundario">
        <Link to="/admin/usuarios">Usuários</Link>
      </p>
      <p className="link-secundario">
        <Link to="/admin/lojas">Lojas</Link>
      </p>
      <p className="link-secundario">
        <Link to="/eventos">Eventos</Link>
      </p>
      <p className="link-secundario">
        <Link to="/admin/transacoes">Buscar transação</Link>
      </p>
      <p className="link-secundario">
        <Link to="/admin/configuracoes">Configurações</Link>
      </p>
      <p className="link-secundario">
        <Link to="/admin/logs">Logs de auditoria</Link>
      </p>
    </div>
  );
}
