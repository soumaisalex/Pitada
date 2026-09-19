import { useEffect, useState, FormEvent } from "react";
import { Star } from "lucide-react";
import { useAuth } from "../context/AuthContext";
import { api, ApiError } from "../lib/api";

interface ItemPendente {
  produtoId: string;
  nome: string;
}

interface Pendencia {
  transacaoId: string;
  lojaNome: string;
  itensPendentes: ItemPendente[];
  lojaPendente: boolean;
}

function SeletorEstrelas({ valor, aoMudar }: { valor: number; aoMudar: (nota: number) => void }) {
  return (
    <div style={{ display: "flex", gap: "0.15rem", flexWrap: "wrap", marginBottom: "1rem" }}>
      {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
        <button
          key={n}
          type="button"
          onClick={() => aoMudar(n)}
          aria-label={`${n} estrelas`}
          style={{ background: "none", border: "none", padding: 2, cursor: "pointer" }}
        >
          <Star size={22} color="var(--cor-destaque)" fill={n <= valor ? "var(--cor-destaque)" : "none"} />
        </button>
      ))}
    </div>
  );
}

export default function AvaliacaoPendente() {
  const { usuario } = useAuth();
  const [pendencia, setPendencia] = useState<Pendencia | null>(null);
  const [indiceItemAtual, setIndiceItemAtual] = useState(0);
  const [avaliandoLoja, setAvaliandoLoja] = useState(false);
  const [nota, setNota] = useState(0);
  const [comentario, setComentario] = useState("");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [dispensada, setDispensada] = useState(false);

  async function buscarPendencia() {
    try {
      const resultado = await api<Pendencia | null>("/avaliacoes/pendentes");
      setPendencia(resultado);
      setIndiceItemAtual(0);
      setAvaliandoLoja(resultado ? resultado.itensPendentes.length === 0 : false);
      setNota(0);
      setComentario("");
    } catch {
      // Falha silenciosa — não é crítico, tenta de novo na próxima montagem.
    }
  }

  useEffect(() => {
    if (usuario) buscarPendencia();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [usuario]);

  if (!usuario || !pendencia || dispensada) return null;

  const itemAtual = pendencia.itensPendentes[indiceItemAtual];
  const etapaAtual = !avaliandoLoja && itemAtual ? "produto" : "loja";

  async function enviarAvaliacao(evento: FormEvent) {
    evento.preventDefault();
    if (nota === 0) {
      setErro("Escolha uma nota de 1 a 10.");
      return;
    }
    setErro(null);
    setEnviando(true);
    try {
      await api("/avaliacoes", {
        method: "POST",
        body: JSON.stringify({
          transacaoId: pendencia!.transacaoId,
          tipo: etapaAtual,
          produtoId: etapaAtual === "produto" ? itemAtual.produtoId : undefined,
          nota,
          comentario: comentario.trim() || undefined,
        }),
      });

      setNota(0);
      setComentario("");

      if (etapaAtual === "produto" && indiceItemAtual + 1 < pendencia!.itensPendentes.length) {
        setIndiceItemAtual((i) => i + 1);
      } else if (etapaAtual === "produto" && pendencia!.lojaPendente) {
        setAvaliandoLoja(true);
      } else {
        // Terminou tudo — busca de novo, pode haver outra compra pendente.
        await buscarPendencia();
      }
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível enviar sua avaliação.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="sobreposicao-avaliacao">
      <div className="cartao-avaliacao">
        <h2 className="rotulo-secao">
          {etapaAtual === "produto" ? `Como estava: ${itemAtual.nome}?` : `Como foi comprar na ${pendencia.lojaNome}?`}
        </h2>

        {erro && <div className="mensagem-erro">{erro}</div>}

        <form onSubmit={enviarAvaliacao}>
          <SeletorEstrelas valor={nota} aoMudar={setNota} />
          <div className="campo">
            <label htmlFor="comentarioAvaliacao">Comentário (opcional, até 50 caracteres)</label>
            <input
              id="comentarioAvaliacao"
              value={comentario}
              maxLength={50}
              onChange={(e) => setComentario(e.target.value)}
            />
          </div>
          <button className="botao-principal" type="submit" disabled={enviando}>
            {enviando ? "Enviando..." : "Enviar avaliação"}
          </button>
        </form>

        <p className="link-secundario">
          <button type="button" className="botao-texto" onClick={() => setDispensada(true)}>
            Agora não
          </button>
        </p>
      </div>
    </div>
  );
}
