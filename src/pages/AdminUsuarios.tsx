import { useEffect, useState } from "react";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";
import BotaoVoltar from "../components/BotaoVoltar";

interface Usuario {
  id: string;
  nome: string;
  primeiroNome: string;
  email: string;
  isLojista: boolean;
  isAdmin: boolean;
  status: "ativo" | "suspenso";
  saldoPitadas: string;
}

const FILTROS = [
  { valor: "todos", rotulo: "Todos" },
  { valor: "cliente", rotulo: "Clientes" },
  { valor: "lojista", rotulo: "Lojistas" },
  { valor: "admin", rotulo: "Admins" },
] as const;

export default function AdminUsuarios() {
  const { usuario: usuarioLogado } = useAuth();
  const [lista, setLista] = useState<Usuario[]>([]);
  const [filtro, setFiltro] = useState<(typeof FILTROS)[number]["valor"]>("todos");
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  function carregar() {
    setCarregando(true);
    api<Usuario[]>(`/admin/usuarios?papel=${filtro}`)
      .then(setLista)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar os usuários."))
      .finally(() => setCarregando(false));
  }

  useEffect(() => {
    if (usuarioLogado?.isAdmin) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuarioLogado, filtro]);

  async function alternarStatus(alvo: Usuario) {
    const novoStatus = alvo.status === "ativo" ? "suspenso" : "ativo";
    setErro(null);
    setAtualizandoId(alvo.id);
    try {
      await api(`/admin/usuarios/${alvo.id}`, {
        method: "PATCH",
        body: JSON.stringify({ status: novoStatus }),
      });
      setLista((atual) => atual.map((u) => (u.id === alvo.id ? { ...u, status: novoStatus } : u)));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível atualizar o usuário.");
    } finally {
      setAtualizandoId(null);
    }
  }

  if (!usuarioLogado?.isAdmin) {
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
      <p className="subtitulo-cabecalho">Admin — Usuários</p>
      <hr className="divisor" />

      <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap", marginBottom: "1.5rem" }}>
        {FILTROS.map((f) => (
          <button
            key={f.valor}
            className="botao-texto"
            onClick={() => setFiltro(f.valor)}
            style={{
              border: "1px solid var(--cor-destaque)",
              borderRadius: 4,
              padding: "0.3rem 0.7rem",
              opacity: filtro === f.valor ? 1 : 0.5,
            }}
          >
            {f.rotulo}
          </button>
        ))}
      </div>

      {erro && <div className="mensagem-erro">{erro}</div>}
      {carregando && <p className="subtitulo">Carregando...</p>}
      {!carregando && lista.length === 0 && <p className="subtitulo">Nenhum usuário encontrado.</p>}

      {lista.map((u) => (
        <div key={u.id} style={{ marginBottom: "1rem", paddingBottom: "1rem", borderBottom: "1px solid rgba(244,240,228,0.1)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>
            {u.nome} {u.isLojista && "🏪"} {u.isAdmin && "⭐"}
          </p>
          <p className="subtitulo" style={{ margin: 0 }}>
            {u.email} · {u.saldoPitadas} Pitadas · {u.status}
          </p>
          {u.id !== usuarioLogado.id && (
            <button
              className="botao-texto"
              style={{ border: "1px solid var(--cor-destaque)", borderRadius: 4, padding: "0.3rem 0.6rem", marginTop: "0.4rem" }}
              onClick={() => alternarStatus(u)}
              disabled={atualizandoId === u.id}
            >
              {u.status === "ativo" ? "Suspender" : "Reativar"}
            </button>
          )}
        </div>
      ))}
    </div>
  );
}
