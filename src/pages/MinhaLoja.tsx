import { useEffect, useState, FormEvent, ChangeEvent } from "react";
import { Link } from "react-router-dom";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";
import { enviarImagem } from "../lib/upload";
import { gerarPdfQrEstatico } from "../lib/gerarPdfQr";

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
  const [quantidadesPdf, setQuantidadesPdf] = useState<Record<string, number>>({});
  const [gerandoPdfId, setGerandoPdfId] = useState<string | null>(null);

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

  async function baixarPdfQr(produto: Produto) {
    if (!loja || !produto.codigoEstatico) return;
    const quantidade = quantidadesPdf[produto.id] || 12;
    setGerandoPdfId(produto.id);
    try {
      await gerarPdfQrEstatico({
        nomeLoja: loja.nomeLoja,
        nomeProduto: produto.nome,
        valorPitadas: produto.valorPitadas,
        codigoEstatico: produto.codigoEstatico,
        quantidade,
      });
    } catch {
      setErro("Não foi possível gerar o PDF.");
    } finally {
      setGerandoPdfId(null);
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
        <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
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
      <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
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
                <div key={produto.id} style={{ marginBottom: "1rem" }}>
                  <p className="subtitulo" style={{ marginBottom: "0.35rem" }}>
                    {produto.nome} — {produto.valorPitadas} Pitadas
                    {produto.codigoEstatico ? ` — código ${produto.codigoEstatico}` : ""}
                  </p>
                  {produto.codigoEstatico && (
                    <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
                      <input
                        type="number"
                        min="1"
                        style={{ width: "4.5rem" }}
                        value={quantidadesPdf[produto.id] ?? 12}
                        onChange={(e) =>
                          setQuantidadesPdf((atual) => ({ ...atual, [produto.id]: Number(e.target.value) }))
                        }
                        aria-label={`Quantidade de cópias do QR de ${produto.nome}`}
                      />
                      <button
                        className="botao-texto"
                        style={{ border: "1px solid var(--cor-destaque)", borderRadius: 4, padding: "0.4rem 0.7rem" }}
                        onClick={() => baixarPdfQr(produto)}
                        disabled={gerandoPdfId === produto.id}
                      >
                        {gerandoPdfId === produto.id ? "Gerando PDF..." : "Baixar PDF de QR codes"}
                      </button>
                    </div>
                  )}
                </div>
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
