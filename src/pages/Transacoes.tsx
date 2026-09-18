import { useEffect, useState } from "react";
import { ApiError } from "../context/AuthContext";
import { api } from "../lib/api";

interface Transacao {
  id: string;
  codigo: string;
  tipo: "credito_pix" | "compra" | "saque" | "cancelamento";
  valor: string;
  status: string;
  criadoEm: string;
  direcao: "entrada" | "saida";
}

const RETRATO_TIPO: Record<Transacao["tipo"], string> = {
  credito_pix: "Crédito via Pix",
  compra: "Compra na feirinha",
  saque: "Saque",
  cancelamento: "Cancelamento",
};

const RETRATO_STATUS: Record<string, string> = {
  pendente: "Pendente",
  concluida: "Concluída",
  cancelada: "Cancelada",
  expirada: "Expirada",
};

function formatarData(data: string): string {
  return new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Transacoes() {
  const [lista, setLista] = useState<Transacao[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api<Transacao[]>("/transacoes")
      .then(setLista)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar suas transações."))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="tela tela-com-navegacao">
      <h1 className="marca">Pitada</h1>
      <p className="subtitulo">Transações</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}
      {carregando && <p className="subtitulo">Carregando...</p>}
      {!carregando && lista.length === 0 && <p className="subtitulo">Nenhuma transação ainda.</p>}

      {lista.map((t) => (
        <div key={t.id} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(244,240,228,0.1)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {t.direcao === "entrada" ? "+ " : "− "}
            {t.valor} Pitadas
          </p>
          <p className="subtitulo" style={{ margin: 0 }}>
            {RETRATO_TIPO[t.tipo]} · {RETRATO_STATUS[t.status] ?? t.status} · {formatarData(t.criadoEm)}
          </p>
          <p className="subtitulo" style={{ margin: 0, fontSize: "0.8rem" }}>
            Código: {t.codigo}
          </p>
        </div>
      ))}
    </div>
  );
}
