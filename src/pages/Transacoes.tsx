import { useEffect, useState } from "react";
import { ApiError } from "../context/AuthContext";
import { api } from "../lib/api";
import FormularioCancelamento from "../components/FormularioCancelamento";

interface Transacao {
  id: string;
  codigo: string;
  tipo: "credito_pix" | "compra" | "saque" | "cancelamento";
  valor: string;
  status: string;
  criadoEm: string;
  direcao: "entrada" | "saida";
}

interface ItemVendido {
  nome: string;
  quantidade: number;
  valorUnitario: string;
  fotoUrl: string | null;
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
  const [expandidoId, setExpandidoId] = useState<string | null>(null);
  const [itensPorTransacao, setItensPorTransacao] = useState<Record<string, ItemVendido[]>>({});
  const [carregandoItensId, setCarregandoItensId] = useState<string | null>(null);

  function carregar() {
    api<Transacao[]>("/transacoes")
      .then(setLista)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar suas transações."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    carregar();
  }, []);

  async function alternarExpansao(transacaoId: string) {
    if (expandidoId === transacaoId) {
      setExpandidoId(null);
      return;
    }
    setExpandidoId(transacaoId);
    if (!itensPorTransacao[transacaoId]) {
      setCarregandoItensId(transacaoId);
      try {
        const itens = await api<ItemVendido[]>(`/transacoes/${transacaoId}/itens`);
        setItensPorTransacao((atual) => ({ ...atual, [transacaoId]: itens }));
      } catch {
        // Falha ao carregar os itens não impede o resto da tela de funcionar.
      } finally {
        setCarregandoItensId(null);
      }
    }
  }

  return (
    <div className="tela tela-com-navegacao">
      <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
      <p className="subtitulo-cabecalho">Transações</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}
      {carregando && <p className="subtitulo">Carregando...</p>}
      {!carregando && lista.length === 0 && <p className="subtitulo">Nenhuma transação ainda.</p>}

      {lista.map((t) => {
        const clicavel = t.tipo === "compra";
        return (
          <div key={t.id} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(244,240,228,0.1)" }}>
            <div
              onClick={clicavel ? () => alternarExpansao(t.id) : undefined}
              style={clicavel ? { cursor: "pointer" } : undefined}
            >
              <p style={{ margin: 0, fontWeight: 600 }}>
                {t.direcao === "entrada" ? "+ " : "− "}
                {t.valor} Pitadas
              </p>
              <p className="subtitulo" style={{ margin: 0 }}>
                {RETRATO_TIPO[t.tipo]} · {RETRATO_STATUS[t.status] ?? t.status} · {formatarData(t.criadoEm)}
              </p>
              <p className="subtitulo" style={{ margin: 0, fontSize: "0.8rem" }}>
                Código: {t.codigo}
                {clicavel && (expandidoId === t.id ? " · ocultar itens ▲" : " · ver itens ▼")}
              </p>
            </div>

            {clicavel && expandidoId === t.id && (
              <div style={{ marginTop: "0.5rem", paddingLeft: "0.5rem" }}>
                {carregandoItensId === t.id && <p className="subtitulo">Carregando itens...</p>}
                {itensPorTransacao[t.id]?.map((item, i) => (
                  <p key={i} className="subtitulo" style={{ margin: 0 }}>
                    {item.quantidade}x {item.nome} — {item.valorUnitario} Pitadas cada
                  </p>
                ))}
              </div>
            )}

            {t.tipo === "compra" && t.direcao === "entrada" && t.status === "concluida" && (
              <FormularioCancelamento transacaoId={t.id} aoCancelar={carregar} />
            )}
          </div>
        );
      })}
    </div>
  );
}
