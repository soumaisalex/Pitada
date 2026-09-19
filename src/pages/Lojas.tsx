import { useEffect, useState } from "react";
import { Link } from "react-router-dom";
import { Star } from "lucide-react";
import { ApiError } from "../context/AuthContext";
import { api } from "../lib/api";

interface Loja {
  id: string;
  nomeLoja: string;
  logoUrl: string | null;
  mediaAvaliacao: number | null;
  totalAvaliacoes: number;
}

export default function Lojas() {
  const [lista, setLista] = useState<Loja[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  useEffect(() => {
    api<Loja[]>("/lojas/publicas")
      .then(setLista)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar as lojas."))
      .finally(() => setCarregando(false));
  }, []);

  return (
    <div className="tela tela-com-navegacao">
      <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
      <p className="subtitulo">Lojas da feirinha</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}
      {carregando && <p className="subtitulo">Carregando...</p>}
      {!carregando && lista.length === 0 && <p className="subtitulo">Nenhuma loja aprovada ainda.</p>}

      {lista.map((loja) => (
        <Link
          key={loja.id}
          to={`/loja/${loja.id}`}
          style={{ display: "flex", alignItems: "center", gap: "0.75rem", textDecoration: "none", marginBottom: "1rem" }}
        >
          {loja.logoUrl && (
            <img
              src={loja.logoUrl}
              alt={loja.nomeLoja}
              style={{ width: 48, height: 48, borderRadius: 6, objectFit: "cover" }}
            />
          )}
          <div>
            <p style={{ margin: 0, color: "var(--cor-texto)", fontWeight: 600 }}>{loja.nomeLoja}</p>
            {loja.totalAvaliacoes > 0 ? (
              <p className="subtitulo" style={{ margin: 0, display: "flex", alignItems: "center", gap: "0.25rem" }}>
                <Star size={14} color="var(--cor-destaque)" fill="var(--cor-destaque)" />
                {loja.mediaAvaliacao?.toFixed(1)} ({loja.totalAvaliacoes})
              </p>
            ) : (
              <p className="subtitulo" style={{ margin: 0 }}>Sem avaliações ainda</p>
            )}
          </div>
        </Link>
      ))}
    </div>
  );
}
