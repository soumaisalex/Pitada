import { useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { Star } from "lucide-react";
import { ApiError } from "../context/AuthContext";
import { api } from "../lib/api";

interface Comentario {
  nota: number;
  comentario: string | null;
  apelidoExibido: string;
  criadoEm: string;
}

interface Produto {
  id: string;
  nome: string;
  descricao: string | null;
  valorPitadas: string;
  fotoUrl: string | null;
  mediaAvaliacao: number | null;
  totalAvaliacoes: number;
}

interface LojaPublica {
  id: string;
  nomeLoja: string;
  logoUrl: string | null;
  mediaAvaliacao: number | null;
  totalAvaliacoes: number;
  comentarios: Comentario[];
  produtos: Produto[];
}

function Nota({ valor }: { valor: number | null }) {
  if (valor === null) return <span className="subtitulo">Sem avaliações ainda</span>;
  return (
    <span style={{ display: "inline-flex", alignItems: "center", gap: "0.25rem" }}>
      <Star size={14} color="var(--cor-destaque)" fill="var(--cor-destaque)" />
      {valor.toFixed(1)}
    </span>
  );
}

export default function LojaPublica() {
  const { id } = useParams();
  const [loja, setLoja] = useState<LojaPublica | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);

  useEffect(() => {
    api<LojaPublica>(`/lojas/${id}/publico`)
      .then(setLoja)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar essa loja."))
      .finally(() => setCarregando(false));
  }, [id]);

  if (carregando) return <div className="tela tela-com-navegacao">Carregando...</div>;

  return (
    <div className="tela tela-com-navegacao">
      <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />

      {erro && <div className="mensagem-erro">{erro}</div>}

      {loja && (
        <>
          {loja.logoUrl && (
            <img
              src={loja.logoUrl}
              alt={loja.nomeLoja}
              style={{ width: 72, height: 72, borderRadius: 8, objectFit: "cover", marginBottom: "0.75rem" }}
            />
          )}
          <h1 className="rotulo-secao" style={{ fontSize: "1.5rem" }}>
            {loja.nomeLoja}
          </h1>
          <p className="subtitulo">
            <Nota valor={loja.mediaAvaliacao} /> {loja.totalAvaliacoes > 0 && `(${loja.totalAvaliacoes} avaliações)`}
          </p>

          <hr className="divisor" />
          <h2 className="rotulo-secao">Produtos</h2>
          {loja.produtos.length === 0 && <p className="subtitulo">Nenhum produto ativo no momento.</p>}
          {loja.produtos.map((produto) => (
            <div key={produto.id} style={{ display: "flex", gap: "0.75rem", marginBottom: "1rem" }}>
              {produto.fotoUrl && (
                <img
                  src={produto.fotoUrl}
                  alt={produto.nome}
                  style={{ width: 64, height: 64, borderRadius: 6, objectFit: "cover", flexShrink: 0 }}
                />
              )}
              <div>
                <p style={{ margin: 0, color: "var(--cor-texto)", fontWeight: 600 }}>
                  {produto.nome} — {produto.valorPitadas} Pitadas
                </p>
                {produto.descricao && (
                  <p className="subtitulo" style={{ margin: 0 }}>
                    {produto.descricao}
                  </p>
                )}
                <p className="subtitulo" style={{ margin: 0 }}>
                  <Nota valor={produto.mediaAvaliacao} />{" "}
                  {produto.totalAvaliacoes > 0 && `(${produto.totalAvaliacoes})`}
                </p>
              </div>
            </div>
          ))}

          <hr className="divisor" />
          <h2 className="rotulo-secao">Comentários</h2>
          {loja.comentarios.length === 0 && <p className="subtitulo">Nenhum comentário ainda.</p>}
          {loja.comentarios.map((c, i) => (
            <div key={i} style={{ marginBottom: "0.75rem" }}>
              <p style={{ margin: 0 }}>
                <Nota valor={c.nota} /> — <strong>{c.apelidoExibido}</strong>
              </p>
              {c.comentario && (
                <p className="subtitulo" style={{ margin: 0 }}>
                  "{c.comentario}"
                </p>
              )}
            </div>
          ))}
        </>
      )}
    </div>
  );
}
