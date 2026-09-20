import { useEffect, useRef, useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import jsQR from "jsqr";

export default function Scanner() {
  const navigate = useNavigate();
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const quadroRef = useRef<number | null>(null);
  const [erro, setErro] = useState<string | null>(null);
  const [encontrado, setEncontrado] = useState(false);

  useEffect(() => {
    let ativo = true;

    async function iniciar() {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: { facingMode: "environment" },
        });
        if (!ativo) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play();
          procurarCodigo();
        }
      } catch {
        setErro("Não foi possível acessar a câmera. Verifique a permissão do navegador.");
      }
    }

    function procurarCodigo() {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      if (!video || !canvas || encontrado) return;

      if (video.readyState === video.HAVE_ENOUGH_DATA) {
        canvas.width = video.videoWidth;
        canvas.height = video.videoHeight;
        const contexto = canvas.getContext("2d");
        if (contexto) {
          contexto.drawImage(video, 0, 0, canvas.width, canvas.height);
          const imagem = contexto.getImageData(0, 0, canvas.width, canvas.height);
          const resultado = jsQR(imagem.data, imagem.width, imagem.height);
          if (resultado?.data) {
            aoLerCodigo(resultado.data);
            return;
          }
        }
      }
      quadroRef.current = requestAnimationFrame(procurarCodigo);
    }

    function aoLerCodigo(textoLido: string) {
      setEncontrado(true);
      streamRef.current?.getTracks().forEach((t) => t.stop());

      // O QR carrega uma URL (.../p/{codigo}) — extrai só o código do final.
      const partes = textoLido.split("/").filter(Boolean);
      const codigo = partes[partes.length - 1];

      if (!codigo) {
        setErro("QR code não reconhecido.");
        setEncontrado(false);
        procurarCodigo();
        return;
      }
      navigate(`/p/${codigo}`);
    }

    iniciar();

    return () => {
      ativo = false;
      if (quadroRef.current) cancelAnimationFrame(quadroRef.current);
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="tela tela-com-navegacao" style={{ padding: 0, maxWidth: "100%" }}>
      <div className="barra-topo-scanner">Aponte para o QR code</div>

      <div style={{ position: "relative", width: "100%", aspectRatio: "3 / 4", background: "#000", overflow: "hidden" }}>
        <video ref={videoRef} style={{ width: "100%", height: "100%", objectFit: "cover" }} muted playsInline />
        <canvas ref={canvasRef} style={{ display: "none" }} />
      </div>

      <div style={{ padding: "1.5rem" }}>
        {erro && <div className="mensagem-erro">{erro}</div>}
        <p className="link-secundario">
          <Link to="/perfil">Cancelar</Link>
        </p>
      </div>
    </div>
  );
}
