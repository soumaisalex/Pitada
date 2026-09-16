import { useEffect, useState, FormEvent } from "react";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";

interface Evento {
  id: string;
  nome: string;
  dataInicio: string;
  dataFim: string;
  status: "agendado" | "em_andamento" | "encerrado";
}

function formatarData(data: string): string {
  return new Date(data).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" });
}

export default function Eventos() {
  const { usuario } = useAuth();
  const [eventos, setEventos] = useState<Evento[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [confirmandoId, setConfirmandoId] = useState<string | null>(null);

  // Formulário de criação de evento (admin)
  const [nome, setNome] = useState("");
  const [dataInicio, setDataInicio] = useState("");
  const [dataFim, setDataFim] = useState("");
  const [criando, setCriando] = useState(false);

  async function carregar() {
    setCarregando(true);
    try {
      setEventos(await api<Evento[]>("/eventos"));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível carregar os eventos.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function confirmarPresenca(eventoId: string) {
    setErro(null);
    setMensagem(null);
    setConfirmandoId(eventoId);
    try {
      await api(`/eventos/${eventoId}/participar`, { method: "POST" });
      setMensagem("Presença confirmada!");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível confirmar presença.");
    } finally {
      setConfirmandoId(null);
    }
  }

  async function criarEvento(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setCriando(true);
    try {
      const novoEvento = await api<Evento>("/eventos", {
        method: "POST",
        body: JSON.stringify({ nome, dataInicio, dataFim }),
      });
      setEventos((atual) => [...atual, novoEvento]);
      setNome("");
      setDataInicio("");
      setDataFim("");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível criar o evento.");
    } finally {
      setCriando(false);
    }
  }

  return (
    <div className="tela">
      <h1 className="marca">Pitada</h1>
      <p className="subtitulo">Eventos da feirinha</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}
      {mensagem && <div className="mensagem-sucesso">{mensagem}</div>}

      {carregando && <p className="subtitulo">Carregando...</p>}

      {!carregando && eventos.length === 0 && <p className="subtitulo">Nenhum evento agendado ainda.</p>}

      {eventos.map((evento) => (
        <div key={evento.id} style={{ marginBottom: "1.5rem" }}>
          <h2 className="rotulo-secao">{evento.nome}</h2>
          <p className="subtitulo" style={{ marginBottom: "0.75rem" }}>
            {formatarData(evento.dataInicio)} até {formatarData(evento.dataFim)}
          </p>
          {usuario?.isLojista && (
            <button
              className="botao-principal"
              onClick={() => confirmarPresenca(evento.id)}
              disabled={confirmandoId === evento.id}
            >
              {confirmandoId === evento.id ? "Confirmando..." : "Confirmar presença da minha loja"}
            </button>
          )}
        </div>
      ))}

      {usuario?.isAdmin && (
        <>
          <hr className="divisor" />
          <h2 className="rotulo-secao">Criar novo evento</h2>
          <form onSubmit={criarEvento}>
            <div className="campo">
              <label htmlFor="nomeEvento">Nome</label>
              <input id="nomeEvento" value={nome} onChange={(e) => setNome(e.target.value)} required />
            </div>
            <div className="campo">
              <label htmlFor="dataInicio">Início</label>
              <input
                id="dataInicio"
                type="datetime-local"
                value={dataInicio}
                onChange={(e) => setDataInicio(e.target.value)}
                required
              />
            </div>
            <div className="campo">
              <label htmlFor="dataFim">Fim</label>
              <input
                id="dataFim"
                type="datetime-local"
                value={dataFim}
                onChange={(e) => setDataFim(e.target.value)}
                required
              />
            </div>
            <button className="botao-principal" type="submit" disabled={criando}>
              {criando ? "Criando..." : "Criar evento"}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
