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
 * 🔴 **심폴 상품목록 화면은 UTF-8 이다** (2026-09-18 실측). 주문 쪽(order_list·order_excel)만
 *    EUC-KR 이다. edge-심폴수집/발송의 `한글로()` 를 여기 복사해 쓰면 글자가 통째로 깨진다.
 *
 * 🔴 오픈마켓(쿠팡·스마트스토어…)은 여기서 안 건드린다 — 마켓플러스를 따로 밀어야 한다
 *    (우람님 9/18). 그 길은 아직 안 뚫렸다. **부르는 쪽이 「오픈마켓은 아직」을 사람에게 보여준다.**
 *
 * 🔴 `order-collect`·`shipment-push`·`simpol-collect`·`simpol-ship` 은 한 바이트도 안 건드렸다.
 *    이 함수가 죽어도 주문수집·발송은 돌아야 한다.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MALL = Deno.env.get("CAFE24_MALL_ID")!;
const CID = Deno.env.get("CAFE24_CLIENT_ID")!;
const SECRET = Deno.env.get("CAFE24_CLIENT_SECRET")!;
const API_VER = "2026-03-01";          // 🔴 앱에 설정된 버전. 다르면 400

const 심폴터 = "https://www.simpol.co.kr";   // 🔴 www 를 빼면 301 로 튄다

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const 글 = (v: unknown) => v == null ? "" : String(v);
const 다듬기 = (v: unknown) => 글(v).trim();
const 벗기기 = (v: unknown) => 글(v).replace(/\s/g, "");   // 이름 맞출 때는 띄어쓰기를 무시한다

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

/* ══ 심폴 ══ 상품 API 가 없어 상점관리자 화면을 그대로 쓴다 */

async function 심폴로그인(): Promise<string> {
  const id = 다듬기(Deno.env.get("SIMPOL_ID"));
  const pw = 글(Deno.env.get("SIMPOL_PW"));
  if (!id || !pw) throw new Error("SIMPOL_ID·SIMPOL_PW 가 없습니다");

  const res = await fetch(심폴터 + "/vender/loginproc.php", {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id, passwd: pw }),
  });
  const 쿠키 = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  /* 🔴 로그인에 실패해도 200 이 온다. 그냥 진행하면 목록이 비어 「없는 상품」으로 조용히 끝난다 */
  const 본문 = new TextDecoder("euc-kr").decode(await res.arrayBuffer());
  if (!/main\.php/.test(본문)) throw new Error("심폴 로그인 실패 — 아이디·비밀번호를 확인해 주세요");
  if (!쿠키) throw new Error("심폴 로그인 쿠키를 못 받았습니다");
  return 쿠키;
}

/* 🔴 이 화면만 UTF-8 이다 (실측 2026-09-18). 주문 화면은 EUC-KR — 섞지 않는다 */
async function 심폴목록(쿠키: string): Promise<string> {
  const res = await fetch(심폴터 + "/vender/product_list.php", {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cookie": 쿠키 },
    body: new URLSearchParams({ paging_cnt: "500" }),
  });
  if (res.status >= 400) throw new Error(`심폴 상품목록 → ${res.status}`);
  return new TextDecoder("utf-8").decode(await res.arrayBuffer());
}

/* 목록 화면에서 (상품코드, 상품명) 짝을 뽑는다.
   🔴 상품명은 글자가 아니라 `up_productname[]` 의 value 에 들어 있다 (상품/_도구/심폴보내기.py:776) */
function 심폴상품들(html: string): { 코드: string; 이름: string }[] {
  const 코드들 = [...html.matchAll(/name="up_productcode\[\]"[^>]*value="([^"]*)"/g)].map((m) => m[1]);
  const 이름들 = [...html.matchAll(/name="up_productname\[\]"[^>]*value="([^"]*)"/g)].map((m) => m[1]);
  const 것들: { 코드: string; 이름: string }[] = [];
  for (let i = 0; i < 코드들.length; i++) {
    것들.push({ 코드: 다듬기(코드들[i]), 이름: 다듬기(이름들[i] ?? "") });
  }
  return 것들.filter((x) => x.코드);
}

/* 심폴 업체번호. 🔴 박아 두지 않고 화면에서 읽는다 — 바뀌어도 따라간다 */
function 심폴업체(html: string): string {
  const m = html.match(/var\s+vender\s*=\s*parseInt\(\s*['"](\d+)['"]/);
  if (!m) throw new Error("심폴 화면에서 업체번호(vender)를 못 찾았습니다");
  return m[1];
}

/* 품목코드 → 심폴 상품코드.
   ① 짝표(v3_심폴짝)가 먼저다. 사람이 손으로 맺은 것이라 가장 믿을 만하다.
      🔴 짝표에는 심폴 아닌 판매처 코드도 섞여 있다(08j-심폴.js:5). **18자리만 심폴이다** —
         심폴 화면의 `change_display` 도 `code.length==18` 로 가른다.
   ② 짝이 없으면 카페24 상품명으로 찾는다 — `상품/_도구/심폴보내기.py:790 이미있나()` 와 같은 규칙
      (심폴 이름은 「제로가드닝 …」 + 부연설명이 붙어 카페24 이름을 **품고 있다**).
      🔴 **정확히 하나만 걸릴 때만** 쓴다. 여럿이면 멈춘다 — 엉뚱한 상품을 품절시키면 팔리던 게 멈춘다. */
async function 심폴코드찾기(품목코드: string, 카페24상품명: string, 것들: { 코드: string; 이름: string }[]) {
  const { data } = await db.from("v3_심폴짝").select("id,내용,삭제됨");
  const 짝 = (data ?? []).find((r: any) =>
    !r.삭제됨 && 글(r.id).length === 18 && 다듬기(r.내용?.붙인품목코드) === 품목코드
  );
  if (짝) {
    if (것들.some((x) => x.코드 === 짝.id)) return { 코드: 글(짝.id), 어떻게: "짝표", 사유: "" };
    return { 코드: "", 어떻게: "", 사유: `짝표의 심폴 상품(${짝.id})이 지금 목록에 없습니다` };
  }

  const 벗 = 벗기기(카페24상품명);
  if (!벗) return { 코드: "", 어떻게: "", 사유: "심폴 짝이 없고 카페24 상품명도 비었습니다" };
  const 걸린 = 것들.filter((x) => 벗기기(x.이름).includes(벗));
  if (!걸린.length) return { 코드: "", 어떻게: "", 사유: `심폴에 「${카페24상품명}」 이(가) 없습니다` };
  if (걸린.length > 1) {
    return { 코드: "", 어떻게: "", 사유: `심폴에 비슷한 이름이 ${걸린.length}개입니다 — 주문화면에서 짝을 지어 주세요` };
  }
  return { 코드: 걸린[0].코드, 어떻게: "이름", 사유: "" };
}

/* 🔴 수량 종류 — 실측 2026-09-18 (심폴 상품목록 `slt_quantity[]`)
      F = 무제한 · C = 수량(숫자를 같이 보내야 한다) · E = 품절
   🔴 되돌릴 때는 F(무제한)로 되돌린다. 심폴 상품은 애초에 무제한으로 올라가 있다
      (`상품/_도구/심폴보내기.py:22` — 우람님 2026-09-14 「수량은 우선 무제한」). */
async function 심폴밀기(품목코드: string, 카페24상품명: string, 품절: boolean, 시험: boolean) {
  const 쿠키 = await 심폴로그인();
  const html = await 심폴목록(쿠키);
  const 것들 = 심폴상품들(html);
  if (!것들.length) return { 됨: false, 사유: "심폴 상품목록을 못 읽었습니다" };

  const { 코드, 어떻게, 사유 } = await 심폴코드찾기(품목코드, 카페24상품명, 것들);
  if (!코드) return { 됨: false, 사유 };

  const check = 품절 ? "E" : "F";
  if (시험) return { 됨: true, 사유: `시험 — ${코드}(${어떻게}) 를 check=${check} 로 바꿀 참이었습니다`, 코드 };

  const res = await fetch(심폴터 + "/vender/ajax_quantity_change.php", {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cookie": 쿠키 },
    body: new URLSearchParams({
      vidx: 심폴업체(html), code: 코드, check, cnt: "", domain2: "", vender2: "", code2: "",
    }),
  });
  const 답 = 다듬기(new TextDecoder("utf-8").decode(await res.arrayBuffer()));
  /* 🔴 심폴은 실패해도 200 을 준다. 본문이 'SUCCESS' 인지로만 판정한다 */
  if (!/SUCCESS/.test(답)) return { 됨: false, 사유: `심폴이 거절했습니다: ${답.slice(0, 100) || "빈 답"}`, 코드 };
  return { 됨: true, 사유: "", 코드 };
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

    /* 🔴 카페24가 죽어도 심폴은 민다 — 한쪽만 되는 게 둘 다 안 되는 것보다 낫다.
       다만 이름으로 찾으려면 카페24 상품명이 필요해서, 못 읽었으면 짝표에만 기댄다 */
    let 심 = { 됨: false, 사유: "" } as any;
    try { 심 = await 심폴밀기(품목코드, 카.상품명 || "", 품절, 시험); }
    catch (e) { 심 = { 됨: false, 사유: String((e as Error).message).slice(0, 200) }; }

    return new Response(JSON.stringify({
      ok: true, 품목코드, 품절, 시험, 카페24: 카, 심폴: 심,
    }), { headers: 머리 });
  } catch (e) {
    return new Response(JSON.stringify({ ok: false, 오류: String((e as Error).message) }),
      { status: 400, headers: 머리 });
  }
});
