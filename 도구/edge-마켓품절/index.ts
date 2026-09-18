/* 마켓 품절 — v3 재고화면에서 찍은 품절/판매중을 카페24·심폴에 밀어 넣는다. 슬러그 `market-soldout`.
 *
 * 부르는 곳 — v3 재고 상세(06c)에서 「품절」·「판매중」을 누르고 팝업에서 확인했을 때 (06k).
 *
 * 🔴 **카페24는 `selling` 으로 품절을 만든다. 수량이 아니다** (2026-09-18 실측).
 *    141번(추명국 핑크터치)이 `use_inventory:"F"` · `quantity:0` 인데도 그대로 팔리고 있었다.
 *    재고관리가 꺼져 있어 카페24가 수량을 안 본다. `selling:"F"` 를 거니 자사몰에 SOLD OUT 이 떴다.
 *    🔴 재고관리(`use_inventory`)를 켜지 않는다 — `상품/카페24-등록-메모.md:46`,
 *       켜면 마켓플러스의 쿠팡 수량옵션 매칭이 어긋난다.
 *    🔴 `display`(진열)는 건드리지 않는다. 진열을 끄면 상품 페이지가 통째로 사라져
 *       손님이 품절인지도 모른다. 우람님 「자사몰은 품절 상태로 올라와 있었으면 좋겠다」(9/18).
 *
 * 🔴 **심폴은 여기서 안 한다** (우람님 2026-09-18). HTTP 로 하면 **부를 때마다 새로 로그인**해서
 *    몇 번 부르면 심폴이 응답을 끊는다(그날 세 번 두드렸더니 로그인이 타임아웃 났다).
 *    심폴은 맥이 `상품/_도구/심폴품절.py` 로 한다 — 전용 크롬이 **로그인한 채로 살아 있다.**
 *    🔴 심폴을 여기에 되살리지 마라. 두 군데서 로그인하면 계정이 잠긴다.
 *
 * 🔴 오픈마켓(쿠팡·스마트스토어…)도 여기서 안 건드린다 — 맥이 `마켓플러스품절.py` 로 민다.
 *    그래서 **이 함수는 카페24 하나만 한다.** 즉시 나가야 하는 것이 그것뿐이라서다.
 *
 * 🔴 `order-collect`·`shipment-push`·`simpol-collect`·`simpol-ship` 은 한 바이트도 안 건드렸다.
 *    이 함수가 죽어도 주문수집·발송은 돌아야 한다.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MALL = Deno.env.get("CAFE24_MALL_ID")!;
const CID = Deno.env.get("CAFE24_CLIENT_ID")!;
const SECRET = Deno.env.get("CAFE24_CLIENT_SECRET")!;
const API_VER = "2026-03-01";          // 🔴 앱에 설정된 버전. 다르면 400

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const 글 = (v: unknown) => v == null ? "" : String(v);
const 다듬기 = (v: unknown) => 글(v).trim();

/* ══ 카페24 ══ (edge-배송등록/index.ts 의 출입증·호출기를 그대로 옮겼다. 규칙이 갈리면 표가 둘로 갈린다) */

/* 🔴 카페24가 주는 `2026-08-08T20:42:07.000` 은 한국시각인데 표시가 없다. 그대로 읽으면 9시간 어긋난다 */
function 때(문자: string): number {
  const s = 글(문자);
  return Date.parse(/[Z+]|-\d\d:\d\d$/.test(s) ? s : s + "+09:00");
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
  // 🔴 refresh_token 은 쓸 때마다 바뀐다. 안 덮어쓰면 다음 번에 못 들어간다
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

/* 품목코드로 카페24 상품 하나를 집는다.
   🔴 **카페24의 `custom_product_code` 검색은 부분일치다** (실측 2026-09-18 — `ANP01` 로 넣으니 `ANP01-15` 가 나왔다).
      품목코드에는 `HEB01` 과 `HEB01-15` 처럼 짧은 것과 긴 것이 섞여 있어서, 받은 것을 그대로 믿으면
      **엉뚱한 상품을 품절시킨다.** 그래서 `custom_product_code` 를 같이 받아 **완전히 같은 것만** 남긴다.
   🔴 그러고도 여럿이면 고르지 않는다 — 잘못 내리는 것보다 멈추는 게 낫다. */
async function 카페24상품(품목코드: string, token: string) {
  const d = await 카페24(
    "GET",
    `products?custom_product_code=${encodeURIComponent(품목코드)}` +
      `&fields=product_no,product_name,custom_product_code,selling`,
    token,
  );
  const 들 = (d.products ?? []).filter((p: any) => 다듬기(p.custom_product_code) === 품목코드);
  if (!들.length) return { 것: null, 사유: `카페24에 품목코드 ${품목코드} 가 없습니다` };
  if (들.length > 1) return { 것: null, 사유: `카페24에 품목코드 ${품목코드} 가 ${들.length}개입니다 — 손으로 봐 주세요` };
  return { 것: 들[0], 사유: "" };
}

async function 카페24밀기(품목코드: string, 품절: boolean, 시험: boolean) {
  const token = await 출입증();
  const { 것, 사유 } = await 카페24상품(품목코드, token);
  if (!것) return { 됨: false, 사유, 상품명: "" };

  const 상품명 = 다듬기(것.product_name);
  const 되어야 = 품절 ? "F" : "T";
  if (글(것.selling) === 되어야) return { 됨: true, 사유: "이미 그 상태였습니다", 상품명, 번호: 것.product_no };
  if (시험) return { 됨: true, 사유: `시험 — ${것.product_no}번을 selling=${되어야} 로 바꿀 참이었습니다`, 상품명, 번호: 것.product_no };

  await 카페24("PUT", `products/${것.product_no}`, token, { request: { shop_no: 1, selling: 되어야 } });
  return { 됨: true, 사유: "", 상품명, 번호: 것.product_no };
}

/* ══ 들어오는 문 ══ */

const 머리 = {
  "Content-Type": "application/json",
  "Access-Control-Allow-Origin": "*",
  /* 🔴 supabase-js 는 x-client-info·x-supabase-api-version 을 같이 보낸다.
     하나라도 빠지면 브라우저가 프리플라이트에서 막고 화면엔 그냥 「실패」만 뜬다 (edge-주문수집:385) */
  "Access-Control-Allow-Headers":
    "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
};

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: 머리 });
  try {
    const 몸 = await req.json().catch(() => ({}));
    const 품목코드 = 다듬기(몸.품목코드);
    if (!품목코드) throw new Error("품목코드가 없습니다");
    const 품절 = 몸.품절 !== false;          // 기본이 품절. 되돌릴 때만 false 를 준다
    const 시험 = 몸.시험 === true;            // 🔴 시험이면 조회만 하고 아무것도 안 바꾼다

    let 카 = { 됨: false, 사유: "", 상품명: "" } as any;
    try { 카 = await 카페24밀기(품목코드, 품절, 시험); }
    catch (e) { 카 = { 됨: false, 사유: String((e as Error).message).slice(0, 200), 상품명: "" }; }

    /* 🔴 심폴·오픈마켓은 맥이 한다. 여기서 부르지 않는다 — 위 머리주석을 본다 */
    return new Response(JSON.stringify({
      ok: true, 품목코드, 품절, 시험, 카페24: 카,
      심폴: { 맥이한다: true }, 오픈마켓: { 맥이한다: true },
    }), { headers: 머리 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, 오류: String((e as Error).message) }),
      { status: 400, headers: 머리 });
  }
});
