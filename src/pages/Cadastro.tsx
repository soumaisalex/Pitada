import { useState, FormEvent } from "react";
import { Link, useNavigate } from "react-router-dom";
import { useAuth, ApiError } from "../context/AuthContext";

export default function Cadastro() {
  const { cadastrar } = useAuth();
  const navigate = useNavigate();
  const [nome, setNome] = useState("");
  const [primeiroNome, setPrimeiroNome] = useState("");
  const [email, setEmail] = useState("");
  const [telefone, setTelefone] = useState("");
  const [chavePix, setChavePix] = useState("");
  const [senha, setSenha] = useState("");
  const [isLojista, setIsLojista] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [enviando, setEnviando] = useState(false);

  async function aoSubmeter(evento: FormEvent) {
    evento.preventDefault();
    setErro(null);
    setEnviando(true);
    try {
      await cadastrar({ nome, primeiroNome, email, senha, telefone, chavePix, isLojista });
      navigate("/perfil");
    } catch (e) {
      setErro(e instanceof ApiError ? e.message : "Não foi possível criar sua conta.");
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="tela">
      <h1 className="marca">Pitada</h1>
      <p className="subtitulo">Crie sua conta para comprar ou vender na feirinha.</p>
      <hr className="divisor" />

      {erro && <div className="mensagem-erro">{erro}</div>}

      <form onSubmit={aoSubmeter}>
        <div className="campo">
          <label htmlFor="nome">Nome completo</label>
          <input id="nome" value={nome} onChange={(e) => setNome(e.target.value)} required />
        </div>
        <div className="campo">
          <label htmlFor="primeiroNome">Como quer ser chamado (aparece nas suas avaliações)</label>
          <input
            id="primeiroNome"
            value={primeiroNome}
            onChange={(e) => setPrimeiroNome(e.target.value)}
            required
          />
        </div>
        <div className="campo">
          <label htmlFor="email">E-mail</label>
          <input
            id="email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
            autoComplete="email"
          />
        </div>
        <div className="campo">
          <label htmlFor="telefone">Telefone</label>
          <input id="telefone" value={telefone} onChange={(e) => setTelefone(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="chavePix">Chave Pix (pode informar depois, mas vai precisar dela pra sacar)</label>
          <input id="chavePix" value={chavePix} onChange={(e) => setChavePix(e.target.value)} />
        </div>
        <div className="campo">
          <label htmlFor="senha">Senha (mínimo 8 caracteres)</label>
          <input
            id="senha"
            type="password"
            value={senha}
            onChange={(e) => setSenha(e.target.value)}
            required
            minLength={8}
            autoComplete="new-password"
          />
        </div>
        <label className="campo-checkbox" htmlFor="isLojista">
          <input
            id="isLojista"
            type="checkbox"
            checked={isLojista}
            onChange={(e) => setIsLojista(e.target.checked)}
          />
          Também quero vender na feirinha
        </label>
        <button className="botao-principal" type="submit" disabled={enviando}>
          {enviando ? "Criando conta..." : "Criar conta"}
        </button>
      </form>

      <p className="link-secundario">
        Já tem conta? <Link to="/login">Entrar</Link>
      </p>
    </div>
  );
}
