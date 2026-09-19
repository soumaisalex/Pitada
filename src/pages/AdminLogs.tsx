import { useEffect, useState } from "react";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";

interface LogAuditoria {
  id: string;
  adminId: string | null;
  acao: string;
  entidade: string;
  entidadeId: string | null;
  detalhes: unknown;
  criadoEm: string;
}

export default function AdminLogs() {
  const { usuario } = useAuth();
  const [lista, setLista] = useState<LogAuditoria[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario?.isAdmin) return;
    api<LogAuditoria[]>("/admin/logs")
      .then(setLista)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar os logs."))
      .finally(() => setCarregando(false));
  }, [usuario]);

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
      <p className="subtitulo">Admin — Logs de auditoria</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}
      {carregando && <p className="subtitulo">Carregando...</p>}
      {!carregando && lista.length === 0 && <p className="subtitulo">Nenhum log ainda.</p>}

      {lista.map((log) => (
        <div key={log.id} style={{ marginBottom: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(244,240,228,0.1)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>{log.acao}</p>
          <p className="subtitulo" style={{ margin: 0, fontSize: "0.8rem" }}>
            {log.entidade}
            {log.entidadeId ? ` · ${log.entidadeId}` : ""} ·{" "}
            {new Date(log.criadoEm).toLocaleString("pt-BR", { dateStyle: "short", timeStyle: "short" })}
          </p>
          {log.detalhes != null && (
            <p className="subtitulo" style={{ margin: 0, fontSize: "0.75rem", wordBreak: "break-word" }}>
              {JSON.stringify(log.detalhes)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
