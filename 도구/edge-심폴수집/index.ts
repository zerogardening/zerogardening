/* 심폴 주문수집 — 심폴(simpol.co.kr) 「배송요청」 주문을 v3_주문 에 바로 넣는다.
 * 슬러그 `simpol-collect`. 부르는 곳 둘 — ① v3 주문화면 「📥 주문수집」 ② Cron(08·12·15시 +2분)
 *
 * 🔴 아래 지도(27칸)·날짜글·상품코드글은 v3/js/08j-심폴.js 를 그대로 옮긴 것이다.
 *    여기서 새로 정하지 않는다. 바꿀 일이 생기면 08j 와 여기를 같이 고친다 —
 *    한쪽만 고치면 손업로드와 자동수집이 어긋난다.
 * 🔴 줄만들기·중복키·묶음키·우편정규화·옵션입수는 도구/edge-주문수집/index.ts 를 그대로 옮긴 것이다.
 *    같은 규칙이다. 한쪽만 고치면 카페24 주문과 심폴 주문이 서로 다른 잣대로 저장된다.
 *
 * 🔴 이 파일은 발송(배송완료)을 하지 않는다. 발송은 도구/edge-심폴발송 하나뿐이다.
 *    수집이 실수로 손님에게 문자를 보낼 길을 아예 없앤다 — 설계 §4-3.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const 터 = "https://www.simpol.co.kr";   // 🔴 www 를 빼면 301 로 튄다

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const 글 = (v: unknown) => v == null ? "" : String(v);
const 다듬기 = (v: unknown) => 글(v).trim();
const 두자 = (v: unknown) => String(v).padStart(2, "0");

/* ══ 심폴 출입 ══ */

/* 🔴 심폴 응답은 EUC-KR 이다. res.text() 를 쓰면 한글이 통째로 깨진다 */
const 한글로 = (buf: ArrayBuffer) => new TextDecoder("euc-kr").decode(buf);

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
  /* 🔴 getSetCookie() 로 읽는다. get('set-cookie') 는 여러 줄을 콤마로 이어붙여 파싱이 깨진다 */
  const 쿠키 = res.headers.getSetCookie().map((c) => c.split(";")[0]).join("; ");
  const 본문 = 한글로(await res.arrayBuffer());
  /* 🔴 실패해도 200 이 온다. 그대로 진행하면 order_list 가 로그인 화면을 주고
     거래번호 0개가 나와 「받을 것이 없다」로 조용히 끝난다 — 반드시 던진다 */
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

/* ══ 31칸 → 27칸 (08j-심폴.js 그대로) ══ */

/* 심폴 머리글은 「전화번호(XX-XXXX-XXXX)」처럼 괄호 설명이 붙는다 — 공백과 괄호 이하를 뗀다 */
const 심폴키 = (v: unknown) => 글(v).replace(/\s/g, "").replace(/\(.*$/, "");

const 심폴필수 = ["일자", "받는사람", "거래번호", "상품코드", "갯수", "상품가격"];

const 지도: (string | null)[] = [
  "@심폴", null, "거래번호", "@일자", "상품명", "@상품코드", "@빈", "@상품코드",
  null, null, "결제상태", "상품가격", "갯수", "받는사람", "우편번호", "주소",
  null, "비상전화", "전화번호", "전달사항", "주문자", null, null,
  null, "주문자전화", null, null,
];

function 자리찾기(머리행: string[]): Record<string, number> {
  const 자리: Record<string, number> = {};
  (머리행 || []).forEach((v, i) => {
    const 이름 = 심폴키(v);
    if (이름 && 자리[이름] == null) 자리[이름] = i;
  });
  const 없는 = 심폴필수.filter((k) => 자리[k] == null);
  if (없는.length) throw new Error("심폴 CSV 머리글을 못 읽었습니다 — 없는 칸: " + 없는.join(", "));
  return 자리;
}

/* 🔴 20260916 을 그대로 넘기면 08a 가 ms 로 읽어 1970년이 된다 */
function 날짜글(v: unknown): string {
  const s = 다듬기(v);
  let m = s.match(/^(\d{4})(\d{2})(\d{2})$/);
  if (m) return `${m[1]}-${m[2]}-${m[3]}`;
  m = s.match(/^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/);
  if (m) return `${m[1]}-${두자(m[2])}-${두자(m[3])}`;
  return s;
}

/* 🔴 CSV 는 `="005017000000081207"` 꼴로 온다 — 엑셀 수식 껍데기를 벗기고 앞 0 을 살린다(18자리) */
function 상품코드글(v: unknown): string {
  let s = 다듬기(v);
  const m = s.match(/^="?(.*?)"?$/);
  if (m) s = m[1];
  s = s.replace(/^"|"$/g, "").trim();
  return /^\d+$/.test(s) && s.length < 18 ? s.padStart(18, "0") : s;
}

/* 심폴은 「28181 」처럼 꼬리 공백을 실어 보낸다 — 여기서 떼어야 로젠 파일에 그대로 안 실린다 */
function 스물일곱(행: string[], 자리: Record<string, number>): string[] | null {
  if (행.every((c) => 다듬기(c) === "")) return null;
  const 값 = (이름: string) => {
    const i = 자리[이름];
    return i == null ? "" : 다듬기(행[i]);
  };
  const 코드 = 상품코드글(행[자리["상품코드"]]);
  return 지도.map((열) => {
    if (열 == null || 열 === "@빈") return "";
    if (열 === "@심폴") return "심폴";
    if (열 === "@일자") return 날짜글(행[자리["일자"]]);
    if (열 === "@상품코드") return 코드;
    return 값(열);
  });
}

/* ══ 27칸 → v3 주문줄 (edge-주문수집/index.ts 그대로) ══ */

const 칸이름 = [
  "쇼핑몰", "쇼핑몰번호", "주문번호", "발주일", "주문상품명", "상품번호", "옵션", "자체품목코드",
  "결제수단", "결제업체", "결제정보", "판매가", "수량", "수령인", "우편번호", "주소",
  "수령지전화", "전화번호", "핸드폰", "비고", "주문자", "주문자우편번호", "주문자주소",
  "주문자전화번호", "주문자핸드폰", "옵션추가 가격", "배송비 정보",
];
const 자리: Record<string, number> = {};
칸이름.forEach((n, i) => 자리[n] = i);

const 숫자 = (v: unknown) => {
  const n = Number(글(v).replace(/,/g, "").trim());
  return isFinite(n) ? n : 0;
};

function 우편정규화(v: unknown): string {
  const s = 글(v).replace(/\D/g, "");
  if (!s) return "";
  return s.length <= 5 ? s.padStart(5, "0") : s;
}

/* 🔴 「옵션(특징포함)」은 상품 설명문이라 27칸의 옵션은 언제나 빈 문자열이다(설계 §7-7).
   그래서 여기 옵션입수는 늘 1 이다 — 카페24와 같은 함수를 같은 자리에서 부른다 */
function 옵션입수(옵션원문: unknown, 꼬리: number): number {
  const m = 글(옵션원문).match(/수량\s*=\s*(\d+)\s*개/);
  if (m) return Number(m[1]) || 1;
  return 꼬리 > 0 ? 꼬리 : 1;
}

function 날짜만들기(v: unknown): string {
  const m = 글(v).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return "";
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  const t = new Date(y, mo - 1, d);
  if (t.getMonth() !== mo - 1 || t.getDate() !== d) return "";
  return `${y}-${두자(mo)}-${두자(d)}`;
}

const 전화숫자 = (v: unknown) => 글(v).replace(/\D/g, "");
const 주소압축 = (v: unknown) => 글(v).replace(/[\s-]/g, "");

const 묶음키 = (줄: any) =>
  `${다듬기(줄.수령인)}|${전화숫자(줄.수령인전화)}|${주소압축(줄.수령인주소)}`;

/* 🔴 손으로 올리신 심폴 건(08h)과 글자까지 같아야 두 번 안 들어간다 */
const 중복키 = (줄: any) =>
  `${글(줄.주문번호)}|${줄.원본코드 || (글(줄.유통명) + "§" + 글(줄.옵션원문))}|${다듬기(줄.수령인)}`;

/* 🔴 이름 매칭은 하지 않는다 — 유통명이 같은 품목이 여럿이라 엉뚱한 상품이 손님에게 나간다.
   짝표(v3_심폴짝) 열쇠 하나로만 붙인다. 못 붙으면 품목코드 빈칸으로 그대로 저장하고
   그 줄은 08b.짝못붙은수() 대기열에 자동으로 들어간다 */
function 줄만들기(o: string[], 마스터: Record<string, any>, 짝표: Record<string, string>) {
  const 주문번호 = 다듬기(o[자리["주문번호"]]);
  if (!주문번호) return null;

  const 원본코드 = 다듬기(o[자리["자체품목코드"]]);
  const 옵션원문 = 다듬기(o[자리["옵션"]]);
  const 상품명 = 다듬기(o[자리["주문상품명"]]);
  const 품목 = 마스터[짝표[원본코드] ?? ""] ?? null;

  const 줄: any = {
    묶음id: "", 주문번호, 주문일: 날짜만들기(o[자리["발주일"]]),
    판매처: "심폴",
    품목코드: 품목 ? 품목.품목코드 : "", 원본코드,
    유통명: 품목 ? 품목.유통명 : 상품명,   // 못 찾으면 심폴 상품명 (로젠 E열이 이걸 쓴다)
    학명: 품목 ? 품목.학명 : "", 규격: 품목 ? 품목.규격 : "",
    주문수량: 숫자(o[자리["수량"]]), 옵션입수: 옵션입수(옵션원문, 0), 옵션원문,
    단가: 숫자(o[자리["판매가"]]),
    수령인: 다듬기(o[자리["수령인"]]),
    수령인전화: 다듬기(o[자리["핸드폰"]]) || 다듬기(o[자리["전화번호"]]) || 다듬기(o[자리["수령지전화"]]),
    수령인주소: 다듬기(o[자리["주소"]]), 우편번호: 우편정규화(o[자리["우편번호"]]),
    배송메모: 다듬기(o[자리["비고"]]),
    묶음키: "", 출처: "심폴수집",
    원본: o,                 // 🔴 08i-로젠파일.js 가 이걸 있어야 파일을 만든다
    카페24상태: "",          // 심폴은 카페24에 없다 — 08b 가 출고 기록으로 판정한다
  };
  줄.묶음키 = 묶음키(줄);
  return 줄;
}

/* ══ 본체 ══ */

const 오늘문자 = () => new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);   // KST
const 새id = () => "od_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);

/* 🔴 PostgREST 는 한 번에 1,000줄까지만 준다. 잘린 것을 「처음 보는 주문」으로 착각하면
   누를 때마다 한 벌씩 쌓인다(8/11 사고). edge-주문수집의 전부읽기() 그대로 */
async function 전부읽기(표: string, 칸: string): Promise<any[]> {
  const 덩이 = 1000;
  const 나온것: any[] = [];
  for (let 시작 = 0; ; 시작 += 덩이) {
    const { data, error } = await db.from(표).select(칸)
      .not("삭제됨", "is", true)
      .range(시작, 시작 + 덩이 - 1);
    if (error) throw new Error(`${표} 읽기 실패: ${error.message}`);
    나온것.push(...(data ?? []));
    if (!data || data.length < 덩이) return 나온것;
  }
}

const 목록수 = 500;

async function 거래번호들(쿠키: string, 시작: string, 끝: string) {
  const html = await 심폴("/vender/order_list.php", 쿠키, {
    sdate: 시작, edate: 끝, deli_gbn: "X", listnum: String(목록수),   // deli_gbn=X(배송요청) 말고는 안 본다
  });
  const 코드들: string[] = [];
  const 봤나: Record<string, number> = {};
  for (const m of html.matchAll(/name="chkordercode"[^>]*value="([^"]+)"/g)) {
    const c = 다듬기(m[1]);
    if (c && !봤나[c]) { 봤나[c] = 1; 코드들.push(c); }
  }
  return 코드들;
}

async function 표받기(쿠키: string, 코드들: string[]): Promise<string[][]> {
  const 행들: string[][] = [];
  let 자리표: Record<string, number> | null = null;
  for (let i = 0; i < 코드들.length; i += 100) {
    const 덩이 = 코드들.slice(i, i + 100);
    /* 🔴 끝에도 콤마를 붙인다 */
    const csv = await 심폴("/vender/order_excel.php", 쿠키, { ordercodes: 덩이.join(",") + "," });
    const 줄들 = CSV파싱(csv);
    if (!줄들.length) continue;
    자리표 = 자리찾기(줄들[0]);
    for (let n = 1; n < 줄들.length; n++) {
      const o = 스물일곱(줄들[n], 자리표);
      if (o) 행들.push(o);
    }
  }
  return 행들;
}

async function 수집(일수: number, 시험: boolean) {
  const 쿠키 = await 로그인();
  const 끝 = 오늘문자();
  const 시작 = new Date(Date.parse(끝) - 일수 * 86400000).toISOString().slice(0, 10);

  const 코드들 = await 거래번호들(쿠키, 시작, 끝);
  const 경고: string[] = [];
  /* 🔴 목록이 listnum 에서 딱 멈췄으면 잘린 것이다 — 기간을 줄이셔야 한다 */
  if (코드들.length >= 목록수) {
    경고.push(`심폴 배송요청 목록이 ${목록수}건에서 잘렸습니다 — 일수를 줄여 다시 받아 주세요`);
  }

  const 스물일곱행들 = 코드들.length ? await 표받기(쿠키, 코드들) : [];

  const [품목들, 기존줄, 묶음들, 짝줄들] = await Promise.all([
    전부읽기("v3_품목", "내용"),
    전부읽기("v3_주문", "id,내용"),
    전부읽기("v3_주문묶음", "id,내용"),
    전부읽기("v3_심폴짝", "id,내용"),
  ]);

  const 마스터: Record<string, any> = {};
  (품목들 ?? []).forEach((r: any) => { if (r.내용?.품목코드) 마스터[r.내용.품목코드] = r.내용; });

  const 짝표: Record<string, string> = {};
  (짝줄들 ?? []).forEach((r: any) => {
    const 키 = 다듬기(r.내용?.id ?? r.id);
    const 값 = 다듬기(r.내용?.붙인품목코드);
    if (키 && 값) 짝표[키] = 값;
  });

  const 기존들: Record<string, number> = {};
  (기존줄 ?? []).forEach((r: any) => {
    const k = 중복키(r.내용 ?? {});
    기존들[k] = (기존들[k] ?? 0) + 1;
  });

  const 센수: Record<string, number> = {};
  const 새줄들: any[] = [];
  let 이미 = 0, 날짜오류 = 0;

  for (const o of 스물일곱행들) {
    const 줄 = 줄만들기(o, 마스터, 짝표);
    if (!줄) continue;
    const k = 중복키(줄);
    센수[k] = (센수[k] ?? 0) + 1;
    if (센수[k] <= (기존들[k] ?? 0)) { 이미++; continue; }
    if (!줄.주문일) { 날짜오류++; continue; }
    새줄들.push(줄);
  }

  /* 짝 못 지은 상품 — 새 화면을 만들지 않는다. 08b.짝짓기창(08k) 대기열이 곧 보류함이다 */
  const 짝없음표: Record<string, { 상품코드: string; 상품명: string; 줄수: number }> = {};
  새줄들.forEach((r) => {
    if (r.품목코드 || !r.원본코드) return;
    const 것 = 짝없음표[r.원본코드] ?? (짝없음표[r.원본코드] = { 상품코드: r.원본코드, 상품명: r.유통명, 줄수: 0 });
    것.줄수++;
  });
  const 짝없음 = Object.values(짝없음표);

  const 미리 = 새줄들.map((r) => ({
    주문번호: r.주문번호, 주문일: r.주문일, 수령인: r.수령인,
    품목코드: r.품목코드 || `(짝없음:${r.원본코드})`,
    판매처: r.판매처, 유통명: r.유통명, 수량: r.주문수량 * r.옵션입수, 단가: r.단가,
    칸수: (r.원본 ?? []).length,
  }));

  const 공통 = {
    시험, 이미, 날짜오류, 짝없음, 경고,
    읽은기존줄: (기존줄 ?? []).length,
    받은주문: 코드들.length, 받은줄: 스물일곱행들.length,
    미리보기: 미리,
  };

  if (!새줄들.length || 시험) {
    return { ...공통, 새것: 새줄들.length, 묶음id: null };
  }

  /* 🔴 하루에 심폴 묶음 하나. id 를 `-S1` 로 지어 카페24의 `-01`·`-02` 와 절대 안 겹치게 한다 */
  const 그날 = (묶음들 ?? []).filter((b: any) => b.내용?.올린날 === 끝);
  const 묶음 = 그날.find((b: any) => b.내용?.출처 === "심폴수집");
  const 때 = Date.now();
  const 시각 = new Date(때 + 9 * 3600 * 1000).toISOString().slice(11, 16);

  let 묶음id: string, 묶음내용: any;
  if (묶음) {
    묶음id = 묶음.id;
    묶음내용 = { ...묶음.내용, 줄수: (묶음.내용.줄수 ?? 0) + 새줄들.length, 마지막수집: 시각 };
  } else {
    const 회차 = 그날.length + 1;
    묶음id = 끝.replace(/-/g, "").slice(2) + "-S1";
    묶음내용 = {
      id: 묶음id, 올린날: 끝, 올린시각: 시각, 회차, 파일명: "",
      줄수: 새줄들.length, 건너뛴수: 0, 등록일시: 때, 출처: "심폴수집", 마지막수집: 시각,
    };
  }

  새줄들.forEach((r) => { r.id = 새id(); r.묶음id = 묶음id; r.등록일시 = 때; });

  const { error: e1 } = await db.from("v3_주문묶음")
    .upsert({ id: 묶음id, 내용: 묶음내용 }, { onConflict: "id" });
  if (e1) throw new Error("묶음 저장 실패: " + e1.message);

  const { error: e2 } = await db.from("v3_주문")
    .insert(새줄들.map((r) => ({ id: r.id, 내용: r })));
  if (e2) throw new Error("주문 저장 실패: " + e2.message);

  return { ...공통, 새것: 새줄들.length, 묶음id };
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
    /* 🔴 `시험:true` 면 한 글자도 저장하지 않는다 */
    const 결과 = await 수집(Number(몸.일수) || 30, 몸.시험 === true);
    return new Response(JSON.stringify({ ok: true, ...결과 }), { headers: cors });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, 오류: String((e as any)?.message ?? e) }),
      { status: 500, headers: cors });
  }
});
