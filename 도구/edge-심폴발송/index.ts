/* 심폴 발송처리 — 로젠 송장번호를 심폴에 올린다. 슬러그 `simpol-ship`.
 *
 * 🔴🔴 심폴은 발송처리하는 순간 **손님에게 문자·이메일이 자동으로 나가고 되돌릴 수 없다.**
 *      그래서 이 파일 하나만 발송한다. 수집(edge-심폴수집)에는 발송 코드가 한 글자도 없다.
 *
 * 🔴 열쇠 이름이 `모드` 다. 카페24 쪽(shipment-push)의 `진짜:true` 와 **일부러 다르게 지었다** —
 *    카페24 시험 몸통을 복사해 붙여도 심폴은 조회만 하고 끝난다.
 *      { 짝들:[{주문번호, 운송장번호}], 모드:"조회" }   ← 기본값. 아무것도 안 나간다
 *      🔴 실제로 쏘는 모드 값은 아래 Deno.serve 에서 한 번만 비교한다. 여기 예시로 적지 않는다 —
 *         복사해 붙일 수 있는 자리에 두면 시험 삼아 한 번 눌러 보게 된다. 손님에게 문자가 나간다.
 *
 * 중복발송 막는 층 셋 (설계 §4-1). 🔴 진실은 심폴이다 — L2·L3 가 최종 판정이다.
 *   L1 우리 기록   : 브라우저 08l 이 `심폴상태==='배송완료'` 줄의 체크를 끈다
 *   L2 심폴 목록   : order_list deli_gbn=X 에 그 거래번호가 있나
 *   L3 심폴 송장칸 : order_excel CSV 의 `상품별 송장번호` 가 비었나 — **쏘기 직전에** 본다
 */

const 터 = "https://www.simpol.co.kr";   // 🔴 www 를 빼면 301 로 튄다
const 로젠 = "9";                        // 택배사코드 — 로젠택배(실측)
const 묶음크기 = 50;

/* 🔴 이 상수를 쓰는 함수는 발송쏘기() 하나다 */
const 발송모드 = "deliinfoup2";

const 글 = (v: unknown) => v == null ? "" : String(v);
const 다듬기 = (v: unknown) => 글(v).trim();
const 한글로 = (buf: ArrayBuffer) => new TextDecoder("euc-kr").decode(buf);

/* ══ 심폴 출입 (edge-심폴수집과 같은 규칙. 함수를 합치지 않는다 — 수집에 발송 코드를 들이지 않으려고) ══ */

async function 로그인(): Promise<string> {
  const id = 다듬기(Deno.env.get("SIMPOL_ID"));
  const pw = 글(Deno.env.get("SIMPOL_PW"));
  if (!id) throw new Error("SIMPOL_ID 가 없습니다");
  if (!pw) throw new Error("SIMPOL_PW 가 없습니다");

  const res = await fetch(터 + "/vender/loginproc.php", {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ id, passwd: pw }),
  });
  const 쿠키 = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const 본문 = 한글로(await res.arrayBuffer());
  /* 🔴 실패해도 200 이 온다. 그냥 진행하면 목록이 비어 「보낼 것이 없다」로 조용히 끝난다 */
  if (!/main\.php/.test(본문)) throw new Error("심폴 로그인 실패 — 아이디·비밀번호를 확인해 주세요");
  if (!쿠키) throw new Error("심폴 로그인 쿠키를 못 받았습니다");
  return 쿠키;
}

async function 심폴(경로: string, 쿠키: string, 몸: Record<string, string>): Promise<string> {
  const res = await fetch(터 + 경로, {
    method: "POST",
    redirect: "manual",
    headers: { "Content-Type": "application/x-www-form-urlencoded", "Cookie": 쿠키 },
    body: new URLSearchParams(몸),
  });
  if (res.status >= 400) throw new Error(`심폴 ${경로} → ${res.status}`);
  return 한글로(await res.arrayBuffer());
}

/* ══ CSV — 🔴 split(',') 금지. 주소·전달사항에 콤마·따옴표·줄바꿈이 들어온다 ══ */

function CSV파싱(글자: string): string[][] {
  const 줄들: string[][] = [];
  let 행: string[] = [], 칸 = "", 따옴 = false;
  for (let i = 0; i < 글자.length; i++) {
    const c = 글자[i];
    if (따옴) {
      if (c === '"') {
        if (글자[i + 1] === '"') { 칸 += '"'; i++; } else 따옴 = false;
      } else 칸 += c;
      continue;
    }
    if (c === '"') { 따옴 = true; continue; }
    if (c === ",") { 행.push(칸); 칸 = ""; continue; }
    if (c === "\r") continue;
    if (c === "\n") { 행.push(칸); 줄들.push(행); 행 = []; 칸 = ""; continue; }
    칸 += c;
  }
  행.push(칸);
  if (행.length > 1 || 다듬기(행[0])) 줄들.push(행);
  return 줄들;
}

/* 머리글은 「상품별 송장번호」처럼 공백이 섞여 온다 — 08j.심폴키와 같게 본다 */
const 심폴키 = (v: unknown) => 글(v).replace(/\s/g, "").replace(/\(.*$/, "");

function 자리찾기(머리행: string[]): Record<string, number> {
  const 자리: Record<string, number> = {};
  (머리행 || []).forEach((v, i) => {
    const 이름 = 심폴키(v);
    if (이름 && 자리[이름] == null) 자리[이름] = i;
  });
  if (자리["거래번호"] == null) throw new Error("심폴 CSV 에 거래번호 칸이 없습니다");
  return 자리;
}

/* ══ L2 — 배송요청 목록 ══ */

async function 배송요청목록(쿠키: string, 일수: number): Promise<Record<string, 1>> {
  const 끝 = new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);
  const 시작 = new Date(Date.parse(끝) - 일수 * 86400000).toISOString().slice(0, 10);
  const html = await 심폴("/vender/order_list.php", 쿠키, {
    sdate: 시작, edate: 끝, deli_gbn: "X", listnum: "500",
  });
  const 있다: Record<string, 1> = {};
  for (const m of html.matchAll(/name="chkordercode"[^>]*value="([^"]+)"/g)) {
    const c = 다듬기(m[1]);
    if (c) 있다[c] = 1;
  }
  return 있다;
}

/* ══ L3 — 쏘기 직전 송장칸 확인 ══
   🔴 한 거래번호에 상품이 여럿이면 「하나라도 송장이 차 있으면 통째로 안 보낸다」.
      deliinfoup2 는 거래번호 단위로 먹어 부분발송을 표현할 방법이 없다 */
async function 송장칸보기(쿠키: string, 코드들: string[]) {
  const csv = await 심폴("/vender/order_excel.php", 쿠키, { ordercodes: 코드들.join(",") + "," });
  const 줄들 = CSV파싱(csv);
  const 본것: Record<string, { 송장: string; 배송요청: boolean; 봤나: boolean }> = {};
  if (!줄들.length) return 본것;
  const 자리 = 자리찾기(줄들[0]);
  for (let n = 1; n < 줄들.length; n++) {
    const 행 = 줄들[n];
    const 번호 = 다듬기(행[자리["거래번호"]]);
    if (!번호) continue;
    const 송장 = 자리["상품별송장번호"] == null ? "" : 다듬기(행[자리["상품별송장번호"]]);
    const 처리 = 자리["상품별처리여부"] == null ? "" : 다듬기(행[자리["상품별처리여부"]]);
    const 것 = 본것[번호] ?? (본것[번호] = { 송장: "", 배송요청: true, 봤나: true });
    if (송장 && !것.송장) 것.송장 = 송장;
    if (처리 !== "배송요청") 것.배송요청 = false;
  }
  return 본것;
}

/* ══ 실발송 — 🔴 이 함수 하나만 심폴에 쏜다 ══ */

async function 발송쏘기(쿠키: string, 묶음: { 주문번호: string; 운송장번호: string }[], 모드: string) {
  if (모드 !== "발송") throw new Error("발송 모드가 아니다");
  await 심폴("/vender/order_list.php", 쿠키, {
    mode: 발송모드,
    /* 🔴 셋 다 끝에 콤마를 붙인다 */
    ordercodes: 묶음.map((p) => p.주문번호).join(",") + ",",
    delicoms: 묶음.map(() => 로젠).join(",") + ",",
    delinums: 묶음.map((p) => p.운송장번호).join(",") + ",",
  });
}

/* ══ 본체 ══ */

async function 발송(짝들원: any[], 모드: string, 일수: number) {
  const 결과: any[] = [];
  const 쿠키 = await 로그인();
  const 목록 = await 배송요청목록(쿠키, 일수);   // order_list 는 한 번만

  /* 같은 거래번호가 두 번 오면 첫 줄만 남긴다 — 두 번 쏘면 문자가 두 번 나간다 */
  const 봤나: Record<string, 1> = {};
  const 갈것: { 주문번호: string; 운송장번호: string }[] = [];

  for (const p of (짝들원 ?? [])) {
    const 주문번호 = 다듬기(p?.주문번호);
    const 운송장번호 = 다듬기(p?.운송장번호).replace(/\D/g, "");
    if (!주문번호) continue;
    if (봤나[주문번호]) { 결과.push({ 주문번호, 됨: false, 판정: "같은 거래번호", 사유: "앞줄과 함께 나갑니다", 심폴송장: "" }); continue; }
    봤나[주문번호] = 1;
    if (!운송장번호) { 결과.push({ 주문번호, 됨: false, 판정: "운송장 없음", 사유: "운송장번호가 비어 있습니다", 심폴송장: "" }); continue; }
    if (!목록[주문번호]) { 결과.push({ 주문번호, 됨: false, 판정: "배송요청이 아님", 사유: "심폴 배송요청 목록에 없습니다", 심폴송장: "" }); continue; }
    갈것.push({ 주문번호, 운송장번호 });
  }

  /* 🔴 50건씩 끊어 묶음마다 ①조회 → ②거르기 → ③쏘기. 화면에 미리 받아 둔 판정을 믿고 쏘지 않는다.
     송장칸이 걸린 줄은 그 줄만 빠지고 나머지는 계속 간다 */
  for (let i = 0; i < 갈것.length; i += 묶음크기) {
    const 이번 = 갈것.slice(i, i + 묶음크기);
    let 본것: Record<string, { 송장: string; 배송요청: boolean; 봤나: boolean }> = {};
    try {
      본것 = await 송장칸보기(쿠키, 이번.map((p) => p.주문번호));
    } catch (e) {
      const 말 = "심폴 조회 실패 — " + String((e as any)?.message ?? e).slice(0, 120);
      이번.forEach((p) => 결과.push({ 주문번호: p.주문번호, 됨: false, 판정: "확인 실패", 사유: 말, 심폴송장: "" }));
      continue;
    }

    const 쏠것: typeof 이번 = [];
    for (const p of 이번) {
      const 것 = 본것[p.주문번호];
      if (!것) { 결과.push({ 주문번호: p.주문번호, 됨: false, 판정: "배송요청이 아님", 사유: "심폴에서 그 거래번호를 못 찾았습니다", 심폴송장: "" }); continue; }
      if (것.송장) { 결과.push({ 주문번호: p.주문번호, 됨: false, 판정: "이미 송장 있음", 사유: "심폴에 송장이 이미 등록돼 있습니다", 심폴송장: 것.송장 }); continue; }
      if (!것.배송요청) { 결과.push({ 주문번호: p.주문번호, 됨: false, 판정: "배송요청이 아님", 사유: "상품별 처리여부가 배송요청이 아닙니다", 심폴송장: "" }); continue; }
      쏠것.push(p);
    }
    if (!쏠것.length) continue;

    if (모드 !== "발송") {
      쏠것.forEach((p) => 결과.push({ 주문번호: p.주문번호, 됨: false, 판정: "보낼 수 있음", 사유: "조회만 했습니다 — 아무것도 보내지 않았습니다", 심폴송장: "" }));
      continue;
    }

    try {
      await 발송쏘기(쿠키, 쏠것, 모드);
      쏠것.forEach((p) => 결과.push({ 주문번호: p.주문번호, 됨: true, 판정: "발송됨", 사유: "", 심폴송장: p.운송장번호 }));
    } catch (e) {
      const 말 = "심폴 발송 실패 — " + String((e as any)?.message ?? e).slice(0, 120);
      쏠것.forEach((p) => 결과.push({ 주문번호: p.주문번호, 됨: false, 판정: "발송 실패", 사유: 말, 심폴송장: "" }));
    }
  }

  const 보낸수 = 결과.filter((r) => r.됨).length;
  return { 모드, 보낸수, 막힌수: 결과.length - 보낸수, 결과 };
}

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers":
      "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
    "Content-Type": "application/json; charset=utf-8",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const 몸 = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    /* 🔴 기본값은 조회다. 「발송」이라고 또박또박 적어 보내야만 심폴에 쏜다 */
    const 모드 = 몸.모드 === "발송" ? "발송" : "조회";
    const 결과 = await 발송(몸.짝들 ?? [], 모드, Number(몸.일수) || 30);
    return new Response(JSON.stringify({ ok: true, ...결과 }), { headers: cors });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, 오류: String((e as any)?.message ?? e) }),
      { status: 500, headers: cors });
  }
});
