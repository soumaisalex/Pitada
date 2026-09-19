import QRCode from "qrcode";

const TAMANHO_CELULA_MM = 30; // 3cm x 3cm, como combinado
const ESPACO_ENTRE_MM = 5;
const MARGEM_MM = 10;
const ALTURA_CABECALHO_MM = 20;

export async function gerarPdfQrEstatico(params: {
  nomeLoja: string;
  nomeProduto: string;
  valorPitadas: string;
  codigoEstatico: string;
  quantidade: number;
}) {
  const { nomeLoja, nomeProduto, valorPitadas, codigoEstatico, quantidade } = params;

  // Import dinâmico: jsPDF só é baixado quando essa função é realmente usada,
  // não pesa o carregamento inicial do site pra quem não é lojista.
  const { jsPDF } = await import("jspdf");

  const url = `${window.location.origin}/p/${codigoEstatico}`;
  const qrDataUrl = await QRCode.toDataURL(url, { width: 300, margin: 1 });

  const doc = new jsPDF({ unit: "mm", format: "a4" });
  const larguraPagina = doc.internal.pageSize.getWidth();
  const alturaPagina = doc.internal.pageSize.getHeight();

  const larguraUtil = larguraPagina - MARGEM_MM * 2;
  const alturaUtil = alturaPagina - MARGEM_MM * 2 - ALTURA_CABECALHO_MM;
  const passo = TAMANHO_CELULA_MM + ESPACO_ENTRE_MM;

  const colunas = Math.max(1, Math.floor((larguraUtil + ESPACO_ENTRE_MM) / passo));
  const linhas = Math.max(1, Math.floor((alturaUtil + ESPACO_ENTRE_MM) / passo));
  const porPagina = colunas * linhas;

  const totalPaginas = Math.max(1, Math.ceil(quantidade / porPagina));

  for (let pagina = 0; pagina < totalPaginas; pagina++) {
    if (pagina > 0) doc.addPage();

    doc.setFontSize(11);
    doc.text(`${nomeLoja} — ${nomeProduto} — ${valorPitadas} Pitadas`, MARGEM_MM, MARGEM_MM + 5);

    const restantes = quantidade - pagina * porPagina;
    const nestaPagina = Math.min(porPagina, restantes);

    for (let i = 0; i < nestaPagina; i++) {
      const coluna = i % colunas;
      const linha = Math.floor(i / colunas);
      const x = MARGEM_MM + coluna * passo;
      const y = MARGEM_MM + ALTURA_CABECALHO_MM + linha * passo;
      doc.addImage(qrDataUrl, "PNG", x, y, TAMANHO_CELULA_MM, TAMANHO_CELULA_MM);
    }
  }

  doc.save(`qr-${nomeProduto.replace(/\s+/g, "-").toLowerCase()}.pdf`);
}
