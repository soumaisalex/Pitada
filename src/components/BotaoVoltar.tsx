import { useNavigate } from "react-router-dom";
import { ArrowLeft } from "lucide-react";

export default function BotaoVoltar({ aoClicar }: { aoClicar?: () => void } = {}) {
  const navigate = useNavigate();

  function voltar() {
    if (aoClicar) {
      aoClicar();
      return;
    }
    navigate(-1);
  }

  return (
    <button
      type="button"
      onClick={voltar}
      aria-label="Voltar"
      className="botao-voltar"
    >
      <ArrowLeft size={20} />
    </button>
  );
}
