import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Perfil from "./pages/Perfil";
import MinhaLoja from "./pages/MinhaLoja";
import Eventos from "./pages/Eventos";
import AdminLojas from "./pages/AdminLojas";
import AdminTransacoes from "./pages/AdminTransacoes";
import AdminUsuarios from "./pages/AdminUsuarios";
import AdminConfiguracoes from "./pages/AdminConfiguracoes";
import AdminLogs from "./pages/AdminLogs";
import Admin from "./pages/Admin";
import AdicionarCredito from "./pages/AdicionarCredito";
import Sacar from "./pages/Sacar";
import NovaVenda from "./pages/NovaVenda";
import FeedVendas from "./pages/FeedVendas";
import Pagar from "./pages/Pagar";
import Transacoes from "./pages/Transacoes";
import Scanner from "./pages/Scanner";
import Pix from "./pages/Pix";
import Lojas from "./pages/Lojas";
import LojaPublica from "./pages/LojaPublica";
import BottomNav from "./components/BottomNav";
import AvaliacaoPendente from "./components/AvaliacaoPendente";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/minha-loja" element={<MinhaLoja />} />
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/admin" element={<Admin />} />
        <Route path="/admin/lojas" element={<AdminLojas />} />
        <Route path="/admin/transacoes" element={<AdminTransacoes />} />
        <Route path="/admin/usuarios" element={<AdminUsuarios />} />
        <Route path="/admin/configuracoes" element={<AdminConfiguracoes />} />
        <Route path="/admin/logs" element={<AdminLogs />} />
        <Route path="/adicionar-credito" element={<AdicionarCredito />} />
        <Route path="/sacar" element={<Sacar />} />
        <Route path="/nova-venda" element={<NovaVenda />} />
        <Route path="/vendas-ao-vivo" element={<FeedVendas />} />
        <Route path="/p/:codigo" element={<Pagar />} />
        <Route path="/transacoes" element={<Transacoes />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/pix" element={<Pix />} />
        <Route path="/lojas" element={<Lojas />} />
        <Route path="/loja/:id" element={<LojaPublica />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <BottomNav />
      <AvaliacaoPendente />
    </>
  );
}
