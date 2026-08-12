/* 배송등록 — 로젠 운송장번호를 카페24에 올려 발송처리한다.
 *
 * 부르는 곳 — v3 「🚚 배송완료」에서 로젠 출력완료 파일을 올릴 때 (08f 가 짝을 넘긴다)
 *
 * 🔴 이건 **손님에게 발송 알림이 나가는 동작**이다. 되돌리려면 카페24 관리자에서 손으로 지워야 한다.
 *    그래서 기본이 `시험` 이고, 진짜로 올리려면 `{"진짜":true}` 를 명시해야 한다.
 * 🔴 배송준비중(N20)인 품목만 올린다 — 이미 발송된 걸 또 올리면 송장이 덮어써진다.
 */
const MALL = Deno.env.get("CAFE24_MALL_ID")!;
const CID = Deno.env.get("CAFE24_CLIENT_ID")!;
const SECRET = Deno.env.get("CAFE24_CLIENT_SECRET")!;
const API_VER = "2026-03-01";
const 로젠 = "0004";        // 🔴 실제 발송된 주문 4건에서 읽은 값이다(8/8 확인)

import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const 글 = (v: unknown) => v == null ? "" : String(v);

/* 🔴 카페24의 시각은 한국시각인데 표시가 없다 — 그대로 읽으면 UTC 서버가 9시간 뒤로 본다 */
function 때(s: string): number {
  const t = 글(s);
  return Date.parse(/[Z+]|-\d\d:\d\d$/.test(t) ? t : t + "+09:00");
}

async function 출입증(강제?: boolean): Promise<string> {
  const { data, error } = await db.from("카페24토큰").select("내용").eq("id", "현재").single();
  if (error) throw new Error("출입증을 못 읽었습니다: " + error.message);
  const tok = data!.내용;
  if (!강제 && 때(tok.expires_at) - Date.now() > 5 * 60 * 1000) return tok.access_token;

  const res = await fetch(`https://${MALL}.cafe24api.com/api/v2/oauth/token`, {
    method: "POST",
    headers: {
      "Authorization": "Basic " + btoa(`${CID}:${SECRET}`),
      "Content-Type": "application/x-www-form-urlencoded",
    },
    body: new URLSearchParams({ grant_type: "refresh_token", refresh_token: tok.refresh_token }),
  });
  if (!res.ok) throw new Error(`출입증 갱신 실패 ${res.status}: ${await res.text()}`);
  const 새것 = await res.json();
  await db.from("카페24토큰").update({ 내용: 새것, 수정시각: new Date().toISOString() }).eq("id", "현재");
  return 새것.access_token;
}

async function 카페24(방법: string, 경로: string, token: string, 몸?: unknown, 다시?: boolean): Promise<any> {
  const res = await fetch(`https://${MALL}.cafe24api.com/api/v2/admin/${경로}`, {
    method: 방법,
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Cafe24-Api-Version": API_VER,
    },
    body: 몸 === undefined ? undefined : JSON.stringify(몸),
  });
  if (res.status === 401 && !다시) return await 카페24(방법, 경로, await 출입증(true), 몸, true);
  const 글자 = await res.text();
  if (!res.ok) throw new Error(`${res.status} ${글자.slice(0, 200)}`);
  return 글자 ? JSON.parse(글자) : {};
}

async function 올리기(짝들: any[], 진짜: boolean) {
  const token = await 출입증();
  const 결과: any[] = [];

  for (const 짝 of 짝들) {
    const 주문번호 = 글(짝.주문번호).trim();
    const 운송장 = 글(짝.운송장번호).replace(/\D/g, "");
    if (!주문번호 || !운송장) {
      결과.push({ 주문번호, 운송장, 됨: false, 사유: "주문번호나 운송장번호가 비었습니다" });
      continue;
    }

    try {
      let d: any;
      try {
        d = await 카페24("GET", `orders/${주문번호}?embed=items`, token);
      } catch (e) {
        /* 없는 주문번호면 카페24가 404 「No API found」를 준다 — 그대로 보여주면 무슨 말인지 모른다 */
        const m = String((e as Error).message);
        throw new Error(m.startsWith("404") ? "카페24에 없는 주문번호입니다" : m);
      }
      const 주문 = d.order ?? (d.orders ?? [])[0];
      if (!주문) { 결과.push({ 주문번호, 운송장, 됨: false, 사유: "카페24에 없는 주문번호입니다" }); continue; }

      /* 🔴 배송준비중인 품목만. 이미 나간 걸 또 올리면 남의 송장으로 덮어쓴다 */
      const 올릴 = (주문.items ?? [])
        .filter((it: any) => it.order_status === "N20")
        .map((it: any) => it.order_item_code);

      if (!올릴.length) {
        결과.push({
          주문번호, 운송장, 됨: false,
          사유: "이미 발송처리된 주문입니다 (" +
                ((주문.items ?? [])[0]?.status_text || "상태 모름") + ")",
        });
        continue;
      }

      const 몸 = {
        shop_no: 1,
        request: {
          tracking_no: 운송장,
          shipping_company_code: 로젠,
          status: "shipping",   // 🔴 "shipped"(배송완료)는 422 — N20 품목은 배송중으로만 넘길 수 있다 (8/11 실패 5건)
          order_item_code: 올릴,
        },
      };

      if (!진짜) {
        결과.push({ 주문번호, 운송장, 됨: true, 시험: true, 품목수: 올릴.length, 보낼것: 몸.request });
        continue;
      }

      await 카페24("POST", `orders/${주문번호}/shipments`, token, 몸);
      결과.push({ 주문번호, 운송장, 됨: true, 품목수: 올릴.length });
    } catch (e) {
      결과.push({ 주문번호, 운송장, 됨: false, 사유: String((e as Error).message).slice(0, 160) });
    }
  }

  return {
    진짜, 보낸수: 결과.filter((r) => r.됨).length,
    실패수: 결과.filter((r) => !r.됨).length, 결과,
  };
}

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    /* 🔴 supabase-js 가 같이 보내는 헤더를 다 적는다 — 하나만 빠져도 브라우저가 막는다 */
    "Access-Control-Allow-Headers":
      "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
    "Content-Type": "application/json; charset=utf-8",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const 몸 = await req.json().catch(() => ({}));
    const 짝들 = Array.isArray(몸.짝들) ? 몸.짝들 : [];
    if (!짝들.length) throw new Error("올릴 짝이 없습니다 (짝들: [{주문번호, 운송장번호}])");
    /* 🔴 기본은 시험이다. 손님에게 알림이 나가는 동작이라 명시해야만 진짜로 올린다 */
    const 결과 = await 올리기(짝들, 몸.진짜 === true);
    return new Response(JSON.stringify({ ok: true, ...결과 }), { headers: cors });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, 오류: String((e as Error).message ?? e) }),
      { status: 500, headers: cors });
  }
});
