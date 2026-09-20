import { useEffect, useState } from "react";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";
import BotaoVoltar from "../components/BotaoVoltar";

interface Loja {
  id: string;
  nomeLoja: string;
  logoUrl: string | null;
  status: "pendente" | "aprovada" | "reprovada" | "suspensa";
}

export default function AdminLojas() {
  const { usuario } = useAuth();
  const [lojas, setLojas] = useState<Loja[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [atualizandoId, setAtualizandoId] = useState<string | null>(null);

  async function carregar() {
    setCarregando(true);
    try {
      setLojas(await api<Loja[]>("/admin/lojas"));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as lojas.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    if (usuario?.isAdmin) carregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  async function alterarStatus(lojaId: string, novoStatus: Loja["status"]) {
    setErro(null);
    setAtualizandoId(lojaId);
    try {
      const atualizada = await api<Loja>(`/admin/lojas/${lojaId}`, {
        method: "PATCH",
        body: JSON.stringify({ status: novoStatus }),
      });
      setLojas((atual) => atual.map((l) => (l.id === lojaId ? atualizada : l)));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível atualizar a loja.");
    } finally {
      setAtualizandoId(null);
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
      <p className="subtitulo-cabecalho">Admin — Lojas</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}
      {carregando && <p className="subtitulo">Carregando...</p>}

      {!carregando && lojas.length === 0 && <p className="subtitulo">Nenhuma loja cadastrada ainda.</p>}

      {lojas.map((loja) => (
        <div key={loja.id} style={{ marginBottom: "1.5rem" }}>
          <h2 className="rotulo-secao">{loja.nomeLoja}</h2>
          <p className="subtitulo">Status atual: {loja.status}</p>
          <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
            {(["aprovada", "reprovada", "suspensa"] as const)
              .filter((status) => status !== loja.status)
              .map((status) => (
                <button
                  key={status}
                  className="botao-texto"
                  onClick={() => alterarStatus(loja.id, status)}
                  disabled={atualizandoId === loja.id}
                  style={{ border: "1px solid var(--cor-destaque)", borderRadius: 4, padding: "0.4rem 0.7rem" }}
                >
                  {status === "aprovada" ? "Aprovar" : status === "reprovada" ? "Reprovar" : "Suspender"}
                </button>
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}
