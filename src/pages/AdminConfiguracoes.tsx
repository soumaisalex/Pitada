import { useEffect, useState } from "react";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";

interface Configuracao {
  chave: string;
  valor: string;
  descricao: string | null;
}

export default function AdminConfiguracoes() {
  const { usuario } = useAuth();
  const [lista, setLista] = useState<Configuracao[]>([]);
  const [valores, setValores] = useState<Record<string, string>>({});
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);
  const [mensagem, setMensagem] = useState<string | null>(null);
  const [salvandoChave, setSalvandoChave] = useState<string | null>(null);

  useEffect(() => {
    if (!usuario?.isAdmin) return;
    api<Configuracao[]>("/admin/configuracoes")
      .then((lista) => {
        setLista(lista);
        setValores(Object.fromEntries(lista.map((c) => [c.chave, c.valor])));
      })
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as configurações."))
      .finally(() => setCarregando(false));
  }, [usuario]);

  async function salvar(chave: string) {
    setErro(null);
    setMensagem(null);
    setSalvandoChave(chave);
    try {
      await api(`/admin/configuracoes/${chave}`, {
        method: "PATCH",
        body: JSON.stringify({ valor: valores[chave] }),
      });
      setMensagem(`"${chave}" atualizado.`);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível salvar.");
    } finally {
      setSalvandoChave(null);
    }
  }

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
      <p className="subtitulo">Admin — Configurações</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}
      {mensagem && <div className="mensagem-sucesso">{mensagem}</div>}
      {carregando && <p className="subtitulo">Carregando...</p>}

      {lista.map((config) => (
        <div key={config.chave} className="campo">
          <label htmlFor={config.chave}>
            {config.chave}
            {config.descricao && (
              <>
                <br />
                <span style={{ fontSize: "0.8rem" }}>{config.descricao}</span>
              </>
            )}
          </label>
          <div style={{ display: "flex", gap: "0.5rem" }}>
            <input
              id={config.chave}
              value={valores[config.chave] ?? ""}
              onChange={(e) => setValores((atual) => ({ ...atual, [config.chave]: e.target.value }))}
            />
            <button
              className="botao-texto"
              style={{ border: "1px solid var(--cor-destaque)", borderRadius: 4, padding: "0.4rem 0.8rem" }}
              onClick={() => salvar(config.chave)}
              disabled={salvandoChave === config.chave}
            >
              {salvandoChave === config.chave ? "Salvando..." : "Salvar"}
            </button>
          </div>
        </div>
      ))}
    </div>
  );
}
