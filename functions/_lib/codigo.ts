// Alfabeto sem caracteres visualmente ambíguos: sem 0/O, 1/I/L.
const ALFABETO = "23456789ABCDEFGHJKMNPQRSTUVWXYZ";

export function gerarCodigo(tamanho = 6): string {
  let codigo = "";
  const valores = crypto.getRandomValues(new Uint32Array(tamanho));
  for (let i = 0; i < tamanho; i++) {
    codigo += ALFABETO[valores[i] % ALFABETO.length];
  }
  return codigo;
}

// Gera um código com prefixo de tipo na 1ª posição (ex.: "P" para produto estático,
// "T" para sessão de transação), preenchendo o restante com o alfabeto seguro.
export function gerarCodigoComPrefixo(prefixo: string, tamanhoTotal = 6): string {
  return prefixo + gerarCodigo(tamanhoTotal - prefixo.length);
}
