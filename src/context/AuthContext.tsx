import { createContext, useContext, useEffect, useState, ReactNode } from "react";
import { api, ApiError } from "../lib/api";

export interface Usuario {
  id: string;
  nome: string;
  primeiroNome: string;
  email: string;
  telefone?: string | null;
  chavePix?: string | null;
  isLojista: boolean;
  saldoPitadas: string;
}

interface DadosCadastro {
  nome: string;
  primeiroNome: string;
  email: string;
  senha: string;
  telefone?: string;
  chavePix?: string;
  isLojista?: boolean;
}

interface ValorContexto {
  usuario: Usuario | null;
  carregando: boolean;
  login: (email: string, senha: string) => Promise<void>;
  cadastrar: (dados: DadosCadastro) => Promise<void>;
  logout: () => Promise<void>;
  recarregar: () => Promise<void>;
}

const AuthContext = createContext<ValorContexto | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [usuario, setUsuario] = useState<Usuario | null>(null);
  const [carregando, setCarregando] = useState(true);

  async function recarregar() {
    try {
      const dados = await api<Usuario>("/perfil");
      setUsuario(dados);
    } catch {
      setUsuario(null);
    } finally {
      setCarregando(false);
    }
  }

  useEffect(() => {
    recarregar();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function login(email: string, senha: string) {
    const dados = await api<Usuario>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, senha }),
    });
    setUsuario(dados);
  }

  async function cadastrar(dadosCadastro: DadosCadastro) {
    const dados = await api<Usuario>("/auth/cadastro", {
      method: "POST",
      body: JSON.stringify(dadosCadastro),
    });
    setUsuario(dados);
  }

  async function logout() {
    await api("/auth/logout", { method: "POST" });
    setUsuario(null);
  }

  return (
    <AuthContext.Provider value={{ usuario, carregando, login, cadastrar, logout, recarregar }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth(): ValorContexto {
  const contexto = useContext(AuthContext);
  if (!contexto) throw new Error("useAuth precisa ser usado dentro de um AuthProvider.");
  return contexto;
}

export { ApiError };
