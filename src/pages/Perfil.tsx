import { useState, FormEvent, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";

export default function Perfil() {
  const { usuario, carregando, logout, recarregar } = useAuth();
  const navigate = useNavigate();
  const [novaChavePix, setNovaChavePix] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  useEffect(() => {
    if (!carregando && !usuario) navigate("/login");
  }, [carregando, usuario, navigate]);

  async function salvarChavePix(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setMensagem(null);
    setEnviando(true);
    try {
      await api("/perfil/chave-pix", {
        method: "PATCH",
        body: JSON.stringify({ novaChavePix, senhaAtual }),
      });
      setMensagem("Chave Pix atualizada.");
      setNovaChavePix("");
      setSenhaAtual("");
      await recarregar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível atualizar a chave Pix.");
    } finally {
      setEnviando(false);
    }
  }

  async function sair() {
    await logout();
    navigate("/login");
  }

  if (carregando || !usuario) {
    return <div className="tela tela-com-navegacao">Carregando...</div>;
  }

  return (
    <div className="tela tela-com-navegacao">
      <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
      <p className="subtitulo-cabecalho">Olá, {usuario.primeiroNome}</p>
      <hr className="divisor" />

      <p style={{ color: "var(--cor-texto-suave)", marginBottom: 0, fontSize: "0.9rem" }}>Seu saldo</p>
      <p className="saldo">{usuario.saldoPitadas} Pitadas</p>

      <Link to="/adicionar-credito" className="botao-principal" style={{ display: "block", textAlign: "center", textDecoration: "none" }}>
        Adicionar crédito
      </Link>

      <p className="link-secundario">
        <Link to="/sacar">Sacar saldo</Link>
      </p>

      <p className="link-secundario">
        <Link to="/transacoes">Ver histórico de transações</Link>
      </p>

      <hr className="divisor" style={{ marginTop: "1rem" }} />

      <p className="link-secundario">
        <Link to="/eventos">Ver eventos da feirinha</Link>
      </p>
      {usuario.isLojista && (
        <p className="link-secundario">
          <Link to="/minha-loja">Minha loja</Link>
        </p>
      )}
      {usuario.isAdmin && (
        <p className="link-secundario">
          <Link to="/admin">Painel administrativo</Link>
        </p>
      )}

      <hr className="divisor" style={{ marginTop: "1rem" }} />

      <h2 className="rotulo-secao">Chave Pix</h2>
      <p className="subtitulo">
        {usuario.chavePix ? `Cadastrada: ${usuario.chavePix}` : "Você ainda não cadastrou uma chave Pix."}
      </p>

      {erro && <div className="mensagem-erro">{erro}</div>}
      {mensagem && <div className="mensagem-sucesso">{mensagem}</div>}

      <form onSubmit={salvarChavePix}>
        <div className="campo">
          <label htmlFor="novaChavePix">Nova chave Pix</label>
          <input
            id="novaChavePix"
            value={novaChavePix}
            onChange={(e) => setNovaChavePix(e.target.value)}
            required
          />
        </div>
        <div className="campo">
          <label htmlFor="senhaAtual">Confirme sua senha</label>
          <input
            id="senhaAtual"
            type="password"
            value={senhaAtual}
            onChange={(e) => setSenhaAtual(e.target.value)}
            required
            autoComplete="current-password"
          />
        </div>
        <button className="botao-principal" type="submit" disabled={enviando}>
          {enviando ? "Salvando..." : "Salvar chave Pix"}
        </button>
      </form>

      <p className="link-secundario">
        <button className="botao-texto" onClick={sair}>
          Sair da conta
        </button>
      </p>
    </div>
  );
}
