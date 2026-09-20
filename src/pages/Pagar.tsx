import { useEffect, useState, FormEvent } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useAuth, ApiError } from "../context/AuthContext";
import { api } from "../lib/api";
import BotaoVoltar from "../components/BotaoVoltar";

interface ItemResumo {
  nome: string;
  quantidade: number;
  valorUnitario: string;
  fotoUrl: string | null;
}

interface Resumo {
  tipo: "produto" | "sessao";
  lojaNome: string;
  itens: ItemResumo[];
  valorTotal: number;
  expiraEm?: string;
}

export default function Pagar() {
  const { codigo } = useParams();
  const { usuario, carregando: carregandoAuth } = useAuth();
  const navigate = useNavigate();
  const [resumo, setResumo] = useState<Resumo | null>(null);
  const [senhaAtual, setSenhaAtual] = useState("");
  const [erro, setErro] = useState<string | null>(null);
  const [carregando, setCarregando] = useState(true);
  const [confirmando, setConfirmando] = useState(false);
  const [pago, setPago] = useState(false);

  useEffect(() => {
    if (carregandoAuth) return;
    if (!usuario) {
      navigate(`/login?depois=/p/${codigo}`);
      return;
    }
    api<Resumo>(`/pagamentos/${codigo}`)
      .then(setResumo)
      .catch((e) => setErro(e instanceof ApiError ? e.message : "Não foi possível carregar essa cobrança."))
      .finally(() => setCarregando(false));
  }, [codigo, usuario, carregandoAuth, navigate]);

  async function confirmarPagamento(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setConfirmando(true);
    try {
      await api(`/pagamentos/${codigo}/confirmar`, {
        method: "POST",
        body: JSON.stringify({ senhaAtual }),
      });
      setPago(true);
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível confirmar o pagamento.");
    } finally {
      setConfirmando(false);
    }
  }

  if (carregandoAuth || carregando) return <div className="tela tela-com-navegacao">Carregando...</div>;

  if (pago) {
    return (
      <div className="tela tela-com-navegacao">
      <BotaoVoltar />
        <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
        <div className="mensagem-sucesso">Pagamento confirmado!</div>
        <p className="link-secundario">
          <Link to="/perfil">Voltar ao perfil</Link>
        </p>
      </div>
    );
  }

  return (
    <div className="tela tela-com-navegacao">
      <BotaoVoltar />
      <img src="/pitada-mark.png" alt="Pitada" className="logo-marca" />
      <p className="subtitulo-cabecalho">Confirmar pagamento</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}

      {resumo && (
        <>
          <h2 className="rotulo-secao">{resumo.lojaNome}</h2>
          <div className="grade-itens-pagamento">
            {resumo.itens.map((item, i) =>
              item.fotoUrl ? (
                <div key={i}>
                  <img src={item.fotoUrl} alt={item.nome} className="item-pagamento-imagem" />
                  <p className="item-pagamento-legenda">
                    {item.nome} ({item.quantidade}x)
                  </p>
                </div>
              ) : (
                <div key={i}>
                  <div className="item-pagamento-imagem-placeholder">{item.nome}</div>
                  <p className="item-pagamento-legenda">
                    {item.nome} ({item.quantidade}x)
                  </p>
                </div>
              )
            )}
          </div>
          <p className="saldo" style={{ fontSize: "2rem" }}>
            Total: {resumo.valorTotal} Pitadas
          </p>

          <form onSubmit={confirmarPagamento}>
            <div className="campo">
              <label htmlFor="senhaAtual">Confirme sua senha para pagar</label>
              <input
                id="senhaAtual"
                type="password"
                value={senhaAtual}
                onChange={(e) => setSenhaAtual(e.target.value)}
                required
                autoComplete="current-password"
              />
            </div>
            <button className="botao-principal" type="submit" disabled={confirmando}>
              {confirmando ? "Confirmando..." : `Pagar ${resumo.valorTotal} Pitadas`}
            </button>
          </form>
        </>
      )}
    </div>
  );
}
