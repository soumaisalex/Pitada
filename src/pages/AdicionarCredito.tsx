import { useState, useEffect, useRef, FormEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";

interface Cobranca {
  id: string;
  valor: number;
  taxa: number;
  valorTotalCobranca: number;
  copiaECola: string;
  imagemQrCodeBase64: string;
}

export default function AdicionarCredito() {
  const { recarregar } = useAuth();
  const [valor, setValor] = useState("");
  const [cobranca, setCobranca] = useState<Cobranca | null>(null);
  const [statusPagamento, setStatusPagamento] = useState<"pendente" | "concluida">("pendente");
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  async function gerarCobranca(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setGerando(true);
    try {
      const dados = await api<Cobranca>("/creditos", {
        method: "POST",
        body: JSON.stringify({ valor: Number(valor) }),
      });
      setCobranca(dados);
      setStatusPagamento("pendente");

      intervaloRef.current = setInterval(async () => {
        try {
          const statusAtual = await api<{ status: string }>(`/creditos/${dados.id}`);
          if (statusAtual.status === "concluida") {
            setStatusPagamento("concluida");
            if (intervaloRef.current) clearInterval(intervaloRef.current);
            await recarregar();
          }
        } catch {
          // Falha isolada de uma checagem não interrompe o polling — tenta de novo no próximo ciclo.
        }
      }, 3000);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível gerar a cobrança.");
    } finally {
      setGerando(false);
    }
  }

  function copiarCodigo() {
    if (cobranca) navigator.clipboard.writeText(cobranca.copiaECola);
  }

  return (
    <div className="tela tela-com-navegacao">
      <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
      <p className="subtitulo">Adicionar crédito</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}

      {!cobranca && (
        <form onSubmit={gerarCobranca}>
          <div className="campo">
            <label htmlFor="valor">Quanto você quer adicionar (em Pitadas)?</label>
            <input
              id="valor"
              type="number"
              min="1"
              step="0.01"
              value={valor}
              onChange={(e) => setValor(e.target.value)}
              required
            />
          </div>
          <button className="botao-principal" type="submit" disabled={gerando}>
            {gerando ? "Gerando cobrança..." : "Gerar QR code Pix"}
          </button>
        </form>
      )}

      {cobranca && statusPagamento === "pendente" && (
        <>
          <p className="subtitulo">
            Total a pagar: <strong>R$ {cobranca.valorTotalCobranca.toFixed(2)}</strong> (inclui R${" "}
            {cobranca.taxa.toFixed(2)} de taxa Pix) — você recebe {cobranca.valor} Pitadas
          </p>
          <img
            src={cobranca.imagemQrCodeBase64}
            alt="QR code Pix"
            style={{ width: "100%", maxWidth: 260, margin: "1rem 0" }}
          />
          <button className="botao-principal" onClick={copiarCodigo}>
            Copiar código Pix Copia e Cola
          </button>
          <p className="link-secundario">Aguardando confirmação do pagamento...</p>
        </>
      )}

      {statusPagamento === "concluida" && (
        <>
          <div className="mensagem-sucesso">Pagamento confirmado! Seu saldo já foi atualizado.</div>
          <p className="link-secundario">
            <Link to="/perfil">Voltar ao perfil</Link>
          </p>
        </>
      )}
    </div>
  );
}
