import { useEffect, useState, FormEvent } from "react";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";

interface Loja {
  id: string;
  nomeLoja: string;
  logoUrl: string | null;
  status: "pendente" | "aprovada" | "reprovada" | "suspensa";
}

interface Categoria {
  id: number;
  nome: string;
}

interface Produto {
  id: string;
  nome: string;
  valorPitadas: string;
  ativo: boolean;
  codigoEstatico: string | null;
}

const RETRATO_STATUS: Record<Loja["status"], string> = {
  pendente: "Aguardando aprovação do administrador",
  aprovada: "Aprovada — você já pode cadastrar produtos",
  reprovada: "Cadastro reprovado pelo administrador",
  suspensa: "Loja suspensa — vendas indisponíveis",
};

export default function MinhaLoja() {
  const { usuario } = useAuth();
  const [loja, setLoja] = useState<Loja | null>(null);
  const [categorias, setCategorias] = useState<Categoria[]>([]);
  const [produtos, setProdutos] = useState<Produto[]>([]);
  const [carregando, setCarregando] = useState(true);
  const [erro, setErro] = useState<string | null>(null);

  // Formulário de cadastro de loja
  const [nomeLoja, setNomeLoja] = useState("");
  const [logoUrl, setLogoUrl] = useState("");

  // Formulário de cadastro de produto
  const [nomeProduto, setNomeProduto] = useState("");
  const [descricaoProduto, setDescricaoProduto] = useState("");
  const [valorProduto, setValorProduto] = useState("");
  const [fotoProduto, setFotoProduto] = useState("");
  const [categoriaId, setCategoriaId] = useState("");
  const [enviando, setEnviando] = useState(false);

  async function carregarTudo() {
    setCarregando(true);
    try {
      const [minhaLoja, listaCategorias] = await Promise.all([
        api<Loja | null>("/lojas"),
        api<Categoria[]>("/categorias"),
      ]);
      setLoja(minhaLoja);
      setCategorias(listaCategorias);
      if (minhaLoja?.status === "aprovada") {
        setProdutos(await api<Produto[]>("/produtos"));
      }
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível carregar sua loja.");
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    carregarTudo();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function cadastrarLoja(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const novaLoja = await api<Loja>("/lojas", {
        method: "POST",
        body: JSON.stringify({ nomeLoja, logoUrl }),
      });
      setLoja(novaLoja);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível cadastrar a loja.");
    } finally {
      setEnviando(false);
    }
  }

  async function cadastrarProduto(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      const novoProduto = await api<Produto>("/produtos", {
        method: "POST",
        body: JSON.stringify({
          nome: nomeProduto,
          descricao: descricaoProduto,
          valorPitadas: valorProduto,
          fotoUrl: fotoProduto,
          categoriaId: Number(categoriaId),
        }),
      });
      setProdutos((atual) => [...atual, novoProduto]);
      setNomeProduto("");
      setDescricaoProduto("");
      setValorProduto("");
      setFotoProduto("");
      setCategoriaId("");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível cadastrar o produto.");
    } finally {
      setEnviando(false);
    }
  }

  if (!usuario?.isLojista) {
    return (
      <div className="tela">
        <h1 className="marca">Pitada</h1>
        <p className="subtitulo">
          Essa área é só para quem também vende na feirinha. Ative essa opção no seu perfil se quiser abrir uma
          lojinha.
        </p>
      </div>
    );
  }

  if (carregando) return <div className="tela">Carregando...</div>;

  return (
    <div className="tela">
      <h1 className="marca">Pitada</h1>
      <p className="subtitulo">Minha loja</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}

      {!loja && (
        <form onSubmit={cadastrarLoja}>
          <p className="subtitulo">Você ainda não tem uma loja. Cadastre agora:</p>
          <div className="campo">
            <label htmlFor="nomeLoja">Nome da loja</label>
            <input id="nomeLoja" value={nomeLoja} onChange={(e) => setNomeLoja(e.target.value)} required />
          </div>
          <div className="campo">
            <label htmlFor="logoUrl">URL da logo/imagem (para identificação física na feira)</label>
            <input id="logoUrl" value={logoUrl} onChange={(e) => setLogoUrl(e.target.value)} required />
          </div>
          <button className="botao-principal" type="submit" disabled={enviando}>
            {enviando ? "Cadastrando..." : "Cadastrar loja"}
          </button>
        </form>
      )}

      {loja && (
        <>
          <h2 className="rotulo-secao">{loja.nomeLoja}</h2>
          <p className="subtitulo">{RETRATO_STATUS[loja.status]}</p>

          {loja.status === "aprovada" && (
            <>
              <hr className="divisor" />
              <h2 className="rotulo-secao">Meus produtos</h2>

              {produtos.length === 0 && <p className="subtitulo">Nenhum produto cadastrado ainda.</p>}
              {produtos.map((produto) => (
                <p key={produto.id} className="subtitulo" style={{ marginBottom: "0.5rem" }}>
                  {produto.nome} — {produto.valorPitadas} Pitadas
                  {produto.codigoEstatico ? ` — código ${produto.codigoEstatico}` : ""}
                </p>
              ))}

              <hr className="divisor" />
              <h2 className="rotulo-secao">Cadastrar produto</h2>
              <form onSubmit={cadastrarProduto}>
                <div className="campo">
                  <label htmlFor="nomeProduto">Nome</label>
                  <input
                    id="nomeProduto"
                    value={nomeProduto}
                    onChange={(e) => setNomeProduto(e.target.value)}
                    required
                  />
                </div>
                <div className="campo">
                  <label htmlFor="descricaoProduto">Descrição breve</label>
                  <input
                    id="descricaoProduto"
                    value={descricaoProduto}
                    onChange={(e) => setDescricaoProduto(e.target.value)}
                  />
                </div>
                <div className="campo">
                  <label htmlFor="valorProduto">Valor (em Pitadas)</label>
                  <input
                    id="valorProduto"
                    type="number"
                    step="0.01"
                    min="0"
                    value={valorProduto}
                    onChange={(e) => setValorProduto(e.target.value)}
                    required
                  />
                </div>
                <div className="campo">
                  <label htmlFor="fotoProduto">URL da foto</label>
                  <input id="fotoProduto" value={fotoProduto} onChange={(e) => setFotoProduto(e.target.value)} />
                </div>
                <div className="campo">
                  <label htmlFor="categoriaId">Categoria</label>
                  <select
                    id="categoriaId"
                    value={categoriaId}
                    onChange={(e) => setCategoriaId(e.target.value)}
                    required
                    style={{
                      background: "var(--cor-fundo-alt)",
                      border: "1px solid rgba(244,240,228,0.2)",
                      borderRadius: 4,
                      padding: "0.8rem 0.9rem",
                      color: "var(--cor-texto)",
                      fontFamily: "var(--fonte-corpo)",
                    }}
                  >
                    <option value="">Selecione...</option>
                    {categorias.map((categoria) => (
                      <option key={categoria.id} value={categoria.id}>
                        {categoria.nome}
                      </option>
                    ))}
                  </select>
                </div>
                <button className="botao-principal" type="submit" disabled={enviando}>
                  {enviando ? "Cadastrando..." : "Cadastrar produto"}
                </button>
              </form>
            </>
          )}
        </>
      )}
    </div>
  );
}
