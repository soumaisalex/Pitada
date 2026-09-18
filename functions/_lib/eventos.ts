import { and, eq, lte, gte } from "drizzle-orm";
import { getDb } from "../../db/client";
import { eventos, participacoesEvento } from "../../db/schema";

export async function obterEventoAtivoParaLoja(databaseUrl: string, lojaId: string) {
  const db = getDb(databaseUrl);
  const agora = new Date();

  const linhas = await db
    .select({ evento: eventos })
    .from(eventos)
    .innerJoin(
      participacoesEvento,
      and(eq(participacoesEvento.eventoId, eventos.id), eq(participacoesEvento.lojaId, lojaId))
    )
    .where(
      and(
        lte(eventos.dataInicio, agora),
        gte(eventos.dataFim, agora),
        eq(participacoesEvento.status, "confirmado")
      )
    )
    .limit(1);

  return linhas[0]?.evento ?? null;
}
