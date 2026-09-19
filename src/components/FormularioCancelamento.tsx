import { useState, FormEvent } from "react";
import { ApiError } from "../context/AuthContext";
import { api } from "../lib/api";

const MOTIVOS = [
  "Cliente desistiu",
  "Erro no pedido",
  "Produto indisponível",
  "Pagamento em duplicidade",
  "Outro",
];

export default function FormularioCancelamento({
  transacaoId,
  aoCancelar,
}: {
  transacaoId: string;
  aoCancelar: () => void;
}) {
  const [aberto, setAberto] = useState(false);
  const [motivo, setMotivo] = useState(MOTIVOS[0]);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function confirmar(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await api(`/transacoes/${transacaoId}/cancelar`, {
        method: "POST",
        body: JSON.stringify({ motivo, senhaAtual }),
      });
      aoCancelar();
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível cancelar.");
    } finally {
      setEnviando(false);
    }
  }

  if (!aberto) {
    return (
      <button
        className="botao-texto"
        style={{ fontSize: "0.8rem", border: "1px solid var(--cor-erro)", borderRadius: 4, padding: "0.3rem 0.6rem", color: "#f3c9c5" }}
        onClick={() => setAberto(true)}
      >
        Cancelar venda
      </button>
    );
  }

  return (
    <form onSubmit={confirmar} style={{ marginTop: "0.5rem", padding: "0.75rem", border: "1px solid var(--cor-erro)", borderRadius: 4 }}>
      {erro && <div className="mensagem-erro">{erro}</div>}
      <div className="campo">
        <label htmlFor={`motivo-${transacaoId}`}>Motivo</label>
        <select
          id={`motivo-${transacaoId}`}
          value={motivo}
          onChange={(e) => setMotivo(e.target.value)}
          style={{
            background: "var(--cor-fundo-alt)",
            border: "1px solid rgba(244,240,228,0.2)",
            borderRadius: 4,
            padding: "0.7rem 0.8rem",
            color: "var(--cor-texto)",
            fontFamily: "var(--fonte-corpo)",
          }}
        >
          {MOTIVOS.map((m) => (
            <option key={m} value={m}>
              {m}
            </option>
          ))}
        </select>
      </div>
      <div className="campo">
        <label htmlFor={`senha-${transacaoId}`}>Confirme sua senha</label>
        <input
          id={`senha-${transacaoId}`}
          type="password"
          value={senhaAtual}
          onChange={(e) => setSenhaAtual(e.target.value)}
          required
          autoComplete="current-password"
        />
      </div>
      <div style={{ display: "flex", gap: "0.5rem" }}>
        <button className="botao-principal" type="submit" disabled={enviando}>
          {enviando ? "Cancelando..." : "Confirmar cancelamento"}
        </button>
        <button type="button" className="botao-texto" onClick={() => setAberto(false)}>
          Voltar
        </button>
      </div>
    </form>
  );
}
