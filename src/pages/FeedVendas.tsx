import { useEffect, useRef, useState } from "react";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";
import { tocarSomVenda } from "../lib/som";

interface Transacao {
  id: string;
  codigo: string;
  tipo: string;
  valor: string;
  status: string;
  criadoEm: string;
  direcao: "entrada" | "saida";
}

function formatarData(data: string): string {
  return new Date(data).toLocaleTimeString("pt-BR", { timeStyle: "short" });
}

export default function FeedVendas() {
  const { usuario } = useAuth();
  const [vendas, setVendas] = useState<Transacao[]>([]);
  const [erro, setErro] = useState<string | null>(null);
  const ultimoVistoRef = useRef<string | null>(null);
  const primeiraCargaRef = useRef(true);

  useEffect(() => {
    async function checar() {
      try {
        const lista = await api<Transacao[]>("/transacoes");
        const vendasRecebidas = lista.filter(
          (t) => t.tipo === "compra" && t.direcao === "entrada" && t.status === "concluida"
        );
        setVendas(vendasRecebidas);

        if (vendasRecebidas.length > 0) {
          const maisRecente = vendasRecebidas[0].criadoEm;
          if (!primeiraCargaRef.current && maisRecente !== ultimoVistoRef.current) {
            tocarSomVenda();
          }
          ultimoVistoRef.current = maisRecente;
        }
        primeiraCargaRef.current = false;
      } catch (e) {
        setErro(e instanceof ApiError ? e.message : "Não foi possível carregar o feed.");
      }
    }

    checar();
    const intervalo = setInterval(checar, 4000);
    return () => clearInterval(intervalo);
  }, []);

  if (!usuario?.isLojista) {
    return (
      <div className="tela tela-com-navegacao">
        <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
        <p className="subtitulo">Essa área é só para lojistas.</p>
      </div>
    );
  }

  return (
    <div className="tela tela-com-navegacao">
      <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
      <p className="subtitulo">Vendas ao vivo</p>
      <p className="link-secundario">
        Deixe esta aba aberta durante o evento para ouvir o som a cada nova venda. Se instalar como app na tela
        inicial, você também recebe um aviso mesmo com o app fechado (com o som padrão do celular).
      </p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}
      {vendas.length === 0 && <p className="subtitulo">Nenhuma venda ainda.</p>}

      {vendas.map((v) => (
        <div key={v.id} style={{ marginBottom: "0.75rem", paddingBottom: "0.75rem", borderBottom: "1px solid rgba(244,240,228,0.1)" }}>
          <p style={{ margin: 0, fontWeight: 600 }}>+ {v.valor} Pitadas</p>
          <p className="subtitulo" style={{ margin: 0 }}>
            {formatarData(v.criadoEm)} · Código: {v.codigo}
          </p>
        </div>
      ))}
    </div>
  );
}
