import { useEffect, useState, FormEvent, useRef } from "react";
import QRCode from "qrcode";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";

interface Produto {
  id: string;
  nome: string;
  valorPitadas: string;
  ativo: boolean;
}

interface ItemCarrinho {
  produtoId: string;
  quantidade: number;
}

type StatusVenda = "montando" | "pendente" | "concluida" | "expirada";

export default function NovaVenda() {
  const { usuario } = useAuth();
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carrinho, setCarrinho] = useState<ItemCarrinho[]>([]);
  const [status, setStatus] = useState<StatusVenda>("montando");
  const [qrDataUrl, setQrDataUrl] = useState<string | null>(null);
  const [valorTotal, setValorTotal] = useState(0);
  const [erro, setErro] = useState<string | null>(null);
  const [gerando, setGerando] = useState(false);
  const intervaloRef = useRef<ReturnType<typeof setInterval> | null>(null);

  useEffect(() => {
    api<Produto[]>("/produtos")
      .then((lista) => setProdutos(lista.filter((p) => p.ativo)))
      .catch(() => setErro("Não foi possível carregar seus produtos."));
    return () => {
      if (intervaloRef.current) clearInterval(intervaloRef.current);
    };
  }, []);

  function alterarQuantidade(produtoId: string, quantidade: number) {
    setCarrinho((atual) => {
      const semEsse = atual.filter((item) => item.produtoId !== produtoId);
      if (quantidade <= 0) return semEsse;
      return [...semEsse, { produtoId, quantidade }];
    });
  }

  async function gerarQrCode(evento: FormEvent) {
    evento.preventDefault();
    if (carrinho.length === 0) {
      setErro("Adicione ao menos um produto ao carrinho.");
      return;
    }
    setErro(null);
    setGerando(true);
    try {
      const venda = await api<{ codigo: string; valor: number }>("/vendas", {
        method: "POST",
        body: JSON.stringify({ itens: carrinho }),
      });
      setValorTotal(venda.valor);
      const url = `${window.location.origin}/p/${venda.codigo}`;
      setQrDataUrl(await QRCode.toDataURL(url, { width: 280 }));
      setStatus("pendente");

      intervaloRef.current = setInterval(async () => {
        try {
          const statusAtual = await api<{ status: StatusVenda }>(`/vendas/${venda.codigo}`);
          if (statusAtual.status !== "pendente") {
            setStatus(statusAtual.status);
            if (intervaloRef.current) clearInterval(intervaloRef.current);
          }
        } catch {
          // Falha isolada de uma checagem não interrompe o polling.
        }
      }, 2000);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível gerar o QR code.");
    } finally {
      setGerando(false);
    }
  }

  function novaVenda() {
    setStatus("montando");
    setCarrinho([]);
    setQrDataUrl(null);
    setErro(null);
  }

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
      <p className="subtitulo">Nova venda</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}

      {status === "montando" && (
        <form onSubmit={gerarQrCode}>
          {produtos.length === 0 && <p className="subtitulo">Nenhum produto ativo cadastrado.</p>}
          {produtos.map((produto) => (
            <div key={produto.id} className="campo">
              <label htmlFor={`qtd-${produto.id}`}>
                {produto.nome} — {produto.valorPitadas} Pitadas
              </label>
              <input
                id={`qtd-${produto.id}`}
                type="number"
                min="0"
                defaultValue={0}
                onChange={(e) => alterarQuantidade(produto.id, Number(e.target.value))}
              />
            </div>
          ))}
          <button className="botao-principal" type="submit" disabled={gerando}>
            {gerando ? "Gerando..." : "Gerar QR code de pagamento"}
          </button>
        </form>
      )}

      {status === "pendente" && qrDataUrl && (
        <>
          <p className="subtitulo">
            Total: <strong>{valorTotal} Pitadas</strong>
          </p>
          <img src={qrDataUrl} alt="QR code de pagamento" style={{ width: "100%", maxWidth: 280, margin: "1rem 0" }} />
          <p className="link-secundario">Aguardando o cliente ler e confirmar o pagamento (válido por 1 minuto)...</p>
        </>
      )}

      {status === "concluida" && (
        <>
          <div className="mensagem-sucesso">Pagamento confirmado! Total: {valorTotal} Pitadas</div>
          <button className="botao-principal" onClick={novaVenda}>
            Nova venda
          </button>
        </>
      )}

      {status === "expirada" && (
        <>
          <div className="mensagem-erro">O tempo para pagamento acabou. Gere um novo QR code.</div>
          <button className="botao-principal" onClick={novaVenda}>
            Nova venda
          </button>
        </>
      )}
    </div>
  );
}
