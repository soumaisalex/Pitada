import { eq } from "drizzle-orm";
import { getDb } from "../../db/client";
import { configuracoes } from "../../db/schema";

export async function obterConfiguracao(
  databaseUrl: string,
  chave: string,
  valorPadrao: string
): Promise<string> {
  const db = getDb(databaseUrl);
  const [config] = await db.select().from(configuracoes).where(eq(configuracoes.chave, chave)).limit(1);
  return config?.valor ?? valorPadrao;
}

export async function obterConfiguracaoNumerica(
  databaseUrl: string,
  chave: string,
  valorPadrao: number
): Promise<number> {
  const valor = await obterConfiguracao(databaseUrl, chave, String(valorPadrao));
  const numero = Number(valor);
  return Number.isFinite(numero) ? numero : valorPadrao;
}
