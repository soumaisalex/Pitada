import { limparCookieSessao } from "../../_lib/auth";

export const onRequestPost: PagesFunction = async () => {
  return new Response(JSON.stringify({ ok: true }), {
    headers: {
      "content-type": "application/json",
      "Set-Cookie": limparCookieSessao(),
    },
  });
};
