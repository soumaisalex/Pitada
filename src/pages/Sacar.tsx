import { useState, useEffect, useRef, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";

type StatusSaque = "formulario" | "pendente" | "concluida" | "cancelada";

export default function Sacar() {
  const { usuario, recarregar } = useAuth();
  const [valor, setValor] = useState("");
  const [senhaAtual, setSenhaAtual] = useState("");
  const [status, setStatus] = useState<StatusSaque>("formulario");
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  async function solicitarSaque(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const dados = await api<{ id: string }>("/saques", {
        method: "POST",
        body: JSON.stringify({ valor: Number(valor), senhaAtual }),
      });
      setStatus("pendente");
      await recarregar(); // saldo já foi debitado no momento da solicitação

      intervaloRef.current = setInterval(async () => {
        try {
          const statusAtual = await api<{ status: StatusSaque }>(`/saques/${dados.id}`);
          if (statusAtual.status !== "pendente") {
            setStatus(statusAtual.status);
            if (intervaloRef.current) clearInterval(intervaloRef.current);
            await recarregar();
          }
        } catch {
          // Falha isolada de uma checagem não interrompe o polling.
        }
      }, 3000);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível solicitar o saque.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela tela-com-navegacao">
      <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
      <p className="subtitulo">Sacar saldo</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}

      {status === "formulario" && (
        <>
          <p className="subtitulo">
            Saldo atual: <strong>{usuario?.saldoPitadas} Pitadas</strong>
            {usuario?.chavePix ? (
              <> — vai para a chave <strong>{usuario.chavePix}</strong></>
            ) : (
              <> — você ainda não tem uma chave Pix cadastrada no perfil</>
            )}
          </p>
          <form onSubmit={solicitarSaque}>
            <div className="campo">
              <label htmlFor="valor">Quanto você quer sacar (em Pitadas)?</label>
              <input
                id="valor"
                type="number"
                min="0.01"
                step="0.01"
                value={valor}
                onChange={(e) => setValor(e.target.value)}
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
              {enviando ? "Enviando..." : "Sacar"}
            </button>
          </form>
        </>
      )}

      {status === "pendente" && <p className="link-secundario">Processando o envio do Pix...</p>}

      {status === "concluida" && (
        <>
          <div className="mensagem-sucesso">Saque enviado com sucesso!</div>
          <p className="link-secundario">
            <Link to="/perfil">Voltar ao perfil</Link>
          </p>
        </>
      )}

      {status === "cancelada" && (
        <>
          <div className="mensagem-erro">
            O envio não foi concluído e seu saldo já foi estornado. Tente novamente.
          </div>
          <p className="link-secundario">
            <Link to="/perfil">Voltar ao perfil</Link>
          </p>
        </>
      )}
    </div>
  );
}
