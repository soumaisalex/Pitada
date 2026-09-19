import { Link } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Pix() {
  const { usuario } = useAuth();

  return (
    <div className="tela tela-com-navegacao">
      <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
      <p className="subtitulo">Pix</p>
      <hr className="divisor" />

      <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0, fontSize: "0.9rem" }}>Seu saldo</p>
      <p className="saldo">{usuario?.saldoPitadas} Pitadas</p>

      <Link
        to="/adicionar-credito"
        className="botao-principal"
        style={{ display: "block", textAlign: "center", textDecoration: "none", marginBottom: "1rem" }}
      >
        Adicionar crédito
      </Link>

      <Link
        to="/sacar"
        className="botao-principal"
        style={{ display: "block", textAlign: "center", textDecoration: "none", background: "transparent", border: "1px solid var(--cor-destaque)", color: "var(--cor-destaque)" }}
      >
        Sacar saldo
      </Link>
    </div>
  );
}
