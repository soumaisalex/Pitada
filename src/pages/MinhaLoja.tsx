import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";
import { enviarImagem } from "../lib/upload";

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
  const [enviandoLogo, setEnviandoLogo] = useState(false);

  // Formulário de cadastro de produto
  const [nomeProduto, setNomeProduto] = useState("");
  const [descricaoProduto, setDescricaoProduto] = useState("");
  const [valorProduto, setValorProduto] = useState("");
  const [fotoProduto, setFotoProduto] = useState("");
  const [enviandoFoto, setEnviandoFoto] = useState(false);
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

  async function selecionarLogo(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    setEnviandoLogo(true);
    try {
      setLogoUrl(await enviarImagem(arquivo));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível enviar a logo.");
    } finally {
      setEnviandoLogo(false);
    }
  }

  async function selecionarFotoProduto(evento: ChangeEvent<HTMLInputElement>) {
    const arquivo = evento.target.files?.[0];
    if (!arquivo) return;
    setErro(null);
    setEnviandoFoto(true);
    try {
      setFotoProduto(await enviarImagem(arquivo));
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível enviar a foto.");
    } finally {
      setEnviandoFoto(false);
    }
  }

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
      <div className="tela tela-com-navegacao">
        <h1 className="marca">Pitada</h1>
        <p className="subtitulo">
          Essa área é só para quem também vende na feirinha. Ative essa opção no seu perfil se quiser abrir uma
          lojinha.
        </p>
      </div>
    );
  }

  if (carregando) return <div className="tela tela-com-navegacao">Carregando...</div>;

  return (
    <div className="tela tela-com-navegacao">
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
            <label htmlFor="logoArquivo">Logo/imagem da loja (para identificação física na feira)</label>
            <input
              id="logoArquivo"
              type="file"
              accept="image/jpeg,image/png,image/webp"
              onChange={selecionarLogo}
              required={!logoUrl}
            />
            {enviandoLogo && <span className="subtitulo">Enviando imagem...</span>}
            {logoUrl && !enviandoLogo && (
              <img src={logoUrl} alt="Pré-visualização da logo" style={{ width: 96, borderRadius: 4, marginTop: "0.5rem" }} />
            )}
          </div>
          <button className="botao-principal" type="submit" disabled={enviando || enviandoLogo || !logoUrl}>
            {enviando ? "Cadastrando..." : "Cadastrar loja"}
          </button>
        </form>
      )}

      {loja && (
        <>
          <h2 className="rotulo-secao">{loja.nomeLoja}</h2>
          <p className="subtitulo">{RETRATO_STATUS[loja.status]}</p>

          {loja.status === "aprovada" && (
            <p className="link-secundario">
              <Link to="/nova-venda">Registrar nova venda</Link>
            </p>
          )}

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
                  <label htmlFor="fotoArquivo">Foto do produto</label>
                  <input
                    id="fotoArquivo"
                    type="file"
                    accept="image/jpeg,image/png,image/webp"
                    onChange={selecionarFotoProduto}
                  />
                  {enviandoFoto && <span className="subtitulo">Enviando imagem...</span>}
                  {fotoProduto && !enviandoFoto && (
                    <img
                      src={fotoProduto}
                      alt="Pré-visualização do produto"
                      style={{ width: 96, borderRadius: 4, marginTop: "0.5rem" }}
                    />
                  )}
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
                <button className="botao-principal" type="submit" disabled={enviando || enviandoFoto}>
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
