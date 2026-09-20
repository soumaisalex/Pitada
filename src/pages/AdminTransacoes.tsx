import { useState, FormEvent } from "react";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";
import FormularioCancelamento from "../components/FormularioCancelamento";
import BotaoVoltar from "../components/BotaoVoltar";

interface Transacao {
  id: string;
  codigo: string;
  tipo: string;
  valor: string;
  status: string;
  criadoEm: string;
}

export default function AdminTransacoes() {
  const { usuario } = useAuth();
  const [codigo, setCodigo] = useState("");
  const [transacao, setTransacao] = useState<Transacao | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [buscando, setBuscando] = useState(false);

  async function buscar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setTransacao(null);
    setBuscando(true);
    try {
      const resultado = await api<Transacao>(`/admin/transacoes/${codigo.trim().toUpperCase()}`);
      setTransacao(resultado);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível buscar essa transação.");
    } finally {
      setBuscando(false);
    }
  }

  if (!usuario?.isAdmin) {
    return (
      <div className="tela tela-com-navegacao">
      <BotaoVoltar />
        <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
        <p className="subtitulo">Acesso restrito ao administrador.</p>
      </div>
    );
  }

  return (
    <div className="tela tela-com-navegacao">
      <BotaoVoltar />
      <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
      <p className="subtitulo-cabecalho">Admin — Buscar transação</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}

      <form onSubmit={buscar}>
        <div className="campo">
          <label htmlFor="codigo">Código da transação</label>
          <input
            id="codigo"
            value={codigo}
            onChange={(e) => setCodigo(e.target.value)}
            placeholder="Ex: V4K7XP"
            required
          />
        </div>
        <button className="botao-principal" type="submit" disabled={buscando}>
          {buscando ? "Buscando..." : "Buscar"}
        </button>
      </form>

      {transacao && (
        <div style={{ marginTop: "1.5rem" }}>
          <h2 className="rotulo-secao">Código: {transacao.codigo}</h2>
          <p className="subtitulo">Tipo: {transacao.tipo}</p>
          <p className="subtitulo">Valor: {transacao.valor} Pitadas</p>
          <p className="subtitulo">Status: {transacao.status}</p>
          <p className="subtitulo">
            Data: {new Date(transacao.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </p>

          {transacao.tipo === "compra" && transacao.status === "concluida" && (
            <FormularioCancelamento
              transacaoId={transacao.id}
              aoCancelar={() => setTransacao({ ...transacao, status: "cancelada" })}
            />
          )}
        </div>
      )}
    </div>
  );
}
