import { Routes, Route, Navigate } from "react-router-dom";
import Login from "./pages/Login";
import Cadastro from "./pages/Cadastro";
import Perfil from "./pages/Perfil";
import MinhaLoja from "./pages/MinhaLoja";
import Eventos from "./pages/Eventos";
import AdminLojas from "./pages/AdminLojas";
import AdicionarCredito from "./pages/AdicionarCredito";

export default function App() {
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/cadastro" element={<Cadastro />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/minha-loja" element={<MinhaLoja />} />
      <Route path="/eventos" element={<Eventos />} />
      <Route path="/admin/lojas" element={<AdminLojas />} />
      <Route path="/adicionar-credito" element={<AdicionarCredito />} />
      <Route path="*" element={<Navigate to="/login" replace />} />
    </Routes>
  );
}
