import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Perfil from "./pages/Perfil";
import MinhaLoja from "./pages/MinhaLoja";
import Eventos from "./pages/Eventos";
import AdminLojas from "./pages/AdminLojas";
import AdminTransacoes from "./pages/AdminTransacoes";
import AdicionarCredito from "./pages/AdicionarCredito";
import Sacar from "./pages/Sacar";
import NovaVenda from "./pages/NovaVenda";
import Pagar from "./pages/Pagar";
import Transacoes from "./pages/Transacoes";
import Scanner from "./pages/Scanner";
import Pix from "./pages/Pix";
import BottomNav from "./components/BottomNav";

export default function App() {
  return (
    <>
      <Routes>
        <Route path="/login" element={<Login />} />
        <Route path="/cadastro" element={<Cadastro />} />
        <Route path="/perfil" element={<Perfil />} />
        <Route path="/minha-loja" element={<MinhaLoja />} />
        <Route path="/eventos" element={<Eventos />} />
        <Route path="/admin/lojas" element={<AdminLojas />} />
        <Route path="/admin/transacoes" element={<AdminTransacoes />} />
        <Route path="/adicionar-credito" element={<AdicionarCredito />} />
        <Route path="/sacar" element={<Sacar />} />
        <Route path="/nova-venda" element={<NovaVenda />} />
        <Route path="/p/:codigo" element={<Pagar />} />
        <Route path="/transacoes" element={<Transacoes />} />
        <Route path="/scanner" element={<Scanner />} />
        <Route path="/pix" element={<Pix />} />
        <Route path="*" element={<Navigate to="/login" replace />} />
      </Routes>
      <BottomNav />
    </>
  );
}
