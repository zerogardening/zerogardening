/* 주문수집 — 카페24에서 「배송준비중」 주문을 받아 v3_주문 에 바로 넣는다.
 *
 * 부르는 곳 둘 —  ① v3 주문화면의 「주문수집」 버튼   ② Cron (08:00·12:00·15:00 KST)
 *
 * 🔴 변환 규칙은 08h-주문올리기.js 를 그대로 옮긴 것이다. 여기서 새로 정하지 않는다.
 *    바꿀 일이 생기면 08h 와 여기를 같이 고친다 — 한쪽만 고치면 손업로드와 자동수집이 어긋난다.
 * 🔴 카페24 27칸 원본을 줄에 같이 저장한다(`원본`). 08i-로젠파일.js 가 이걸 있어야 파일을 만든다.
 *    손업로드(08h)는 메모리에만 두지만, 자동수집은 화면이 없으므로 저장해야 한다.
 * 🔴 아래 「옵션 풀이·짝 찾기·입수 정하기·시각 만들기」는 v3/js/08j-심폴.js(옵션풀이·줄풀이·짝찾기·입수정하기)와
 *    08h(시각만들기)를 그대로 옮긴 것이다 (21단계 옵션품목 설계 · 21단계 주문실적 설계 §8).
 *    한쪽만 고치면 열쇠가 어긋나 손으로 지은 짝을 자동수집이 못 알아본다 — 08j 와 여기를 같이 고친다.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const MALL = Deno.env.get("CAFE24_MALL_ID")!;
const CID = Deno.env.get("CAFE24_CLIENT_ID")!;
const SECRET = Deno.env.get("CAFE24_CLIENT_SECRET")!;
const API_VER = "2026-03-01";        // 🔴 앱에 설정된 버전. 다르면 400

const db = createClient(
  Deno.env.get("SUPABASE_URL")!,
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/* ══ 카페24 출입증 — 표에 두고 스스로 갱신한다 ══ */

/* 🔴 카페24가 주는 `2026-08-08T20:42:07.000` 은 **한국시각인데 표시가 없다.**
   그대로 new Date() 하면 서버(UTC)가 UTC 로 읽어 9시간 뒤로 착각하고, 만료된 출입증을
   「아직 두 시간 남았다」고 판단해 갱신을 건너뛴다 → 카페24가 401 (8/8 겪음). */
function 때(문자: string): number {
  const s = 글(문자);
  return Date.parse(/[Z+]|-\d\d:\d\d$/.test(s) ? s : s + "+09:00");
}

async function 출입증(강제?: boolean): Promise<string> {
  const { data, error } = await db.from("카페24토큰").select("내용").eq("id", "현재").single();
  if (error) throw new Error("출입증을 못 읽었습니다: " + error.message);
  const tok = data!.내용;

  // 만료 5분 전부터 미리 바꾼다 — 받아오는 중에 만료되면 통째로 실패한다
  const 남음 = 때(tok.expires_at) - Date.now();
  if (!강제 && 남음 > 5 * 60 * 1000) return tok.access_token;

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

/* 🔴 401 이 오면 한 번만 새 출입증을 받아 다시 부른다 — 만료시각 계산이 어긋나도 살아남는다.
   상품쪽 `카페24.py` 도 같은 방식이다 */
async function 카페24(경로: string, token: string, 다시?: boolean): Promise<any> {
  const res = await fetch(`https://${MALL}.cafe24api.com/api/v2/admin/${경로}`, {
    headers: {
      "Authorization": `Bearer ${token}`,
      "Content-Type": "application/json",
      "X-Cafe24-Api-Version": API_VER,
    },
  });
  if (res.status === 401 && !다시) {
    return await 카페24(경로, await 출입증(true), true);
  }
  if (!res.ok) throw new Error(`카페24 ${경로} → ${res.status}: ${await res.text()}`);
  return await res.json();
}

/* ══ 카페24 응답 → 27칸 (통합관리/도구/주문받기.py 와 같은 규칙. 실물 CSV 54칸 대조 통과) ══ */

const 칸이름 = [
  "쇼핑몰", "쇼핑몰번호", "주문번호", "발주일", "주문상품명", "상품번호", "옵션", "자체품목코드",
  "결제수단", "결제업체", "결제정보", "판매가", "수량", "수령인", "우편번호", "주소",
  "수령지전화", "전화번호", "핸드폰", "비고", "주문자", "주문자우편번호", "주문자주소",
  "주문자전화번호", "주문자핸드폰", "옵션추가 가격", "배송비 정보",
];
const 자리: Record<string, number> = {};
칸이름.forEach((n, i) => 자리[n] = i);

const 글 = (v: unknown) => v == null ? "" : String(v);
const 다듬기 = (v: unknown) => 글(v).trim();
const 돈글 = (v: unknown) => {
  const n = Number(v ?? 0);
  return isFinite(n) ? n.toFixed(2) : 글(v);
};

function 원본27(주문: any, 품목: any, 수령인: any, 주문자: any): string[] {
  const o = new Array(27).fill("");
  const 배송비 = Number((주문.initial_order_amount ?? {}).shipping_fee ?? 0);
  const 옵션추가 = Number(품목.option_price ?? 0);
  o[자리["쇼핑몰"]] = "한국어 쇼핑몰";      // 실물이 마켓주문에도 늘 이 값이다
  o[자리["쇼핑몰번호"]] = 글(주문.shop_no);
  o[자리["주문번호"]] = 글(주문.order_id);
  o[자리["발주일"]] = 글(주문.order_date).slice(0, 10);
  o[자리["주문상품명"]] = 글(품목.product_name);
  o[자리["상품번호"]] = 글(품목.product_no);
  o[자리["옵션"]] = 글(품목.option_value);
  o[자리["자체품목코드"]] = 글(품목.custom_product_code);
  o[자리["결제수단"]] = 글((주문.payment_method_name ?? [""])[0]);
  o[자리["판매가"]] = 돈글(품목.product_price ?? 0);
  o[자리["수량"]] = 글(품목.quantity);
  o[자리["수령인"]] = 글(수령인.name);
  o[자리["우편번호"]] = 글(수령인.zipcode);
  o[자리["주소"]] = 글(수령인.address_full);
  o[자리["전화번호"]] = 글(수령인.phone);
  o[자리["핸드폰"]] = 글(수령인.cellphone);
  o[자리["비고"]] = 글(수령인.shipping_message);
  o[자리["주문자"]] = 글(주문.billing_name);
  o[자리["주문자우편번호"]] = 글(주문자.buyer_zipcode);
  o[자리["주문자주소"]] = (글(주문자.buyer_address1) + " " + 글(주문자.buyer_address2)).trim();
  o[자리["주문자전화번호"]] = 글(주문자.phone);
  o[자리["주문자핸드폰"]] = 글(주문자.cellphone);
  o[자리["옵션추가 가격"]] = 옵션추가 === 0 ? "" : 돈글(옵션추가);
  o[자리["배송비 정보"]] = 배송비 === 0 ? "무료" : 돈글(배송비);
  return o;
}

/* ══ 27칸 → v3 주문줄 (08h-주문올리기.js §값 정규화 · §주문줄 만들기 그대로) ══ */

const 숫자 = (v: unknown) => {
  const n = Number(글(v).replace(/,/g, "").trim());
  return isFinite(n) ? n : 0;
};

/* 🔴 CSV 는 앞 0 이 살아 오지만 숫자로 오면 04524 가 4524 가 된다 */
function 우편정규화(v: unknown): string {
  const s = 글(v).replace(/\D/g, "");
  if (!s) return "";
  return s.length <= 5 ? s.padStart(5, "0") : s;
}

/* `ech01-10` · `ERB01-10(2)` → { 코드:'ECH01-10', 꼬리:2 }. 못 알아보면 코드 '' */
function 코드정규화(원문: unknown): { 코드: string; 꼬리: number } {
  let s = 글(원문).replace(/\s/g, "").toUpperCase();
  let 꼬리 = 0;
  const m = s.match(/^(.*?)\((\d+)\)$/);
  if (m) { s = m[1]; 꼬리 = Number(m[2]) || 0; }
  const c = s.match(/^([A-Z]{3}\d{2})-?(\d{1,3})$/);
  return { 코드: c ? `${c[1]}-${Number(c[2])}` : "", 꼬리 };
}

/* 🔴 하나만 곱한다. 옵션 `수량=N개` 우선, 없을 때만 코드 꼬리 `(N)`.
   둘 다 적용하면 4개입 × 2 = 8배가 되고 그 숫자가 08f 의 재고 차감까지 간다 (08h 옛옵션입수) */
function 옛옵션입수(옵션원문: unknown, 꼬리: number): number {
  const m = 글(옵션원문).match(/수량\s*=\s*(\d+)\s*개/);
  if (m) return Number(m[1]) || 1;
  return 꼬리 > 0 ? 꼬리 : 1;
}

/* ══ 옵션이 품목인 상품 — 08j-심폴.js 옵션풀이·줄풀이·짝찾기·입수정하기 그대로 (21단계 설계 §1~§4) ══
   「수량=3개」처럼 개수만 다른 옵션은 한 품목이라 원본코드가 열쇠다. 「색상=3.휴케라 라임리키」처럼
   옵션이 곧 다른 식물이면 열쇠가 `원본코드§옵션값` 이다. */
const 개수꼴 = [
  /^\d+\s*(개|주|구|포기|묶음|세트|팩)?$/,
  /^(단일상품|단품|기본)$/,
  /^\d+(\.\d+)?\s*(cm|mm|센치)?\s*(화분|포트)?$/i,
];

function 옵션풀이(원본코드: unknown, 옵션원문: unknown) {
  const 원 = 다듬기(옵션원문);
  const 축들 = 원 ? 원.split(/\s*,\s*(?=[^,=]+=)/) : [];
  const 품목축: { 이름: string; 값: string; 알: string }[] = [];
  let 수량입수 = 0, 꼬리입수 = 0, 개수입수 = 0;
  for (const 축 of 축들) {
    const m = 축.match(/^\s*([^=]*?)\s*=\s*(.*)$/);
    const 이름 = m ? m[1] : "";
    const 값 = 다듬기(m ? m[2] : 축);
    const t = 값.match(/\s*[(（]\s*(\d+)\s*개\s*[)）]\s*$/);
    const 알 = (t ? 값.slice(0, t.index) : 값).replace(/\s+/g, " ").trim();
    const 수량축 = 이름.replace(/\s/g, "") === "수량";
    if (t && !꼬리입수) 꼬리입수 = Number(t[1]) || 0;
    const n = 값.match(/^(\d+)\s*개/);   // `수량=3개입` 도 3
    if (수량축 && n && !수량입수) 수량입수 = Number(n[1]) || 0;
    const 개수 = 수량축 || !알 || 개수꼴.some((re) => re.test(알));
    if (개수) {
      const k = 알.match(/^(\d+)\s*개$/);
      if (k && !개수입수) 개수입수 = Number(k[1]) || 0;
      continue;
    }
    품목축.push({ 이름, 값, 알 });
  }
  const 코드 = 다듬기(원본코드) ? 글(원본코드) : "";
  const 품목옵션 = 품목축.length > 0;
  const 옵션값 = 품목축.map((x) => x.알).join(" / ");
  return {
    열쇠: !코드 ? "" : (품목옵션 ? 코드 + "§" + 옵션값 : 코드),
    품목옵션,
    입수: 수량입수 || 꼬리입수 || 개수입수 || 0,
  };
}

/* 🔴 원본코드가 v3 마스터에 곧장 맞으면 옵션과 상관없이 그 품목이다 (옵션마다 자체품목코드를 따로 단
   `HEL01-15`+「색상=3.휴케라 라임리키」). 옵션 열쇠는 마스터에 없는 코드(`GGM01-0`·쿠팡 `HEU01`)에만 쓴다 */
function 줄풀이(원본코드: unknown, 옵션원문: unknown, 마스터: Record<string, any>) {
  const 풀 = 옵션풀이(원본코드, 옵션원문);
  if (!풀.품목옵션) return 풀;
  const 꼴 = 코드정규화(원본코드).코드;
  if (!꼴 || !마스터[꼴]) return 풀;
  return { ...풀, 품목옵션: false, 열쇠: 글(원본코드) };
}

/* 🔴 옵션이 품목인 줄은 옛 짝(id=원본코드)을 쓰지 않는다 — 그게 라임리키가 골든제브라로 붙은 길이다.
   「옵션 구분 없이 하나로」(옵션무시) 로 지은 짝만 상품 전체를 덮는다. 색인 = id → 짝 레코드(내용) */
function 짝찾기(원본코드: unknown, 풀: { 열쇠: string; 품목옵션: boolean }, 색인: Record<string, any>): any {
  if (!풀.열쇠) return null;
  if (!풀.품목옵션) return 색인[풀.열쇠] || null;
  const 옛 = 색인[글(원본코드)];
  if (옛 && 옛.옵션무시) return 옛;
  return 색인[풀.열쇠] || null;
}

/* 짝이 붙은 뒤의 옵션입수 (설계 §4). 🔴 곱하지 않는다 — 판매단위 5 · 「(5개)」 가 25가 되면
   재고 차감까지 다섯 배로 간다. 쿠팡은 쿠팡단위 방식이라 옵션 쪽(짝 전 값)을 그대로 둔다 */
function 입수정하기(판매처글: string, 짝전입수: number, 품목: any, 풀: { 품목옵션: boolean; 입수: number }): number {
  if (!품목 || 판매처글 === "쿠팡") return 짝전입수;
  const 단위 = Number(품목.판매단위) || 1;
  if (!풀.품목옵션) return 단위;
  return Math.max(단위, 풀.입수 || 1);
}

/* 08h.시각만들기 — `2026-08-08T20:42:07+09:00` → `20:42`. 날짜만 있으면 '' (칸을 안 만든다).
   🔴 카페24 값은 한국시각이다. 표시 없음·`+09:00` 은 글자에서 바로 뗀다(new Date 로 읽으면 서버가 UTC 라 9시간 밀린다).
   다른 시차(`Z` 등)가 오면 한국시각으로 바꿔서 뗀다 */
function 시각만들기(v: unknown): string {
  const s = 글(v).trim();
  const m = s.match(/^\d{4}[-.\/]\d{1,2}[-.\/]\d{1,2}[ T]+(\d{1,2}):(\d{2})(.*)$/);
  if (!m) return "";
  const 둘 = (n: number) => String(n).padStart(2, "0");
  const 꼬리 = m[3].trim();
  const 시차 = 꼬리.match(/(Z|[+-]\d{2}:?\d{2})$/);
  if (시차 && !/^\+09:?00$/.test(시차[1])) {
    const t = Date.parse(s.replace(" ", "T"));
    if (!isFinite(t)) return "";
    const k = new Date(t + 9 * 3600 * 1000);
    return 둘(k.getUTCHours()) + ":" + 둘(k.getUTCMinutes());
  }
  if (+m[1] >= 24 || +m[2] >= 60) return "";
  return 둘(+m[1]) + ":" + m[2];
}

/* 🔴 카페24는 허브다 — 쿠팡·스마트스토어·11번가·G마켓 주문이 다 여기로 들어온다.
   `쇼핑몰` 칸은 마켓 주문에도 늘 「한국어 쇼핑몰」이라 어디서 온 주문인지 안 나온다(실물 CSV 확인).
   주문의 `order_place_id` 가 진짜 유입처다. 모르는 값이면 카페24가 준 이름을 그대로 쓴다. */
const 유입처: Record<string, string> = {
  cafe24: "카페24", mobile: "카페24", mobile_d: "카페24", NCHECKOUT: "네이버페이",
  coupang: "쿠팡", shopn: "스마트스토어", sk11st: "11번가", gmarket: "G마켓",
  auction: "옥션", inpark: "인터파크",
};
function 판매처(주문: any): string {
  const id = 다듬기(주문.order_place_id);
  return 유입처[id] || 다듬기(주문.order_place_name) || "카페24";
}

/* 08a.날짜정규화 — `YYYY-MM-DD` 만 받는다. 못 읽으면 '' 이고 그 줄은 저장하지 않는다 */
function 날짜만들기(v: unknown): string {
  const m = 글(v).trim().match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
  if (!m) return "";
  const [y, mo, d] = [Number(m[1]), Number(m[2]), Number(m[3])];
  if (mo < 1 || mo > 12 || d < 1 || d > 31) return "";
  const t = new Date(y, mo - 1, d);
  if (t.getMonth() !== mo - 1 || t.getDate() !== d) return "";
  return `${y}-${String(mo).padStart(2, "0")}-${String(d).padStart(2, "0")}`;
}

const 전화숫자 = (v: unknown) => 글(v).replace(/\D/g, "");
/* 🔴 심폴 전화칸은 세 토막(`XX-XXXX-XXXX`)을 하이픈으로 이어 보낸다.
   안 채운 칸도 지역번호 기본값만 남아 「02--」로 온다 — 빈칸이 아니라 빈 칸이다.
   비어있지 않다는 이유로 고르면 뒤 칸의 진짜 번호가 묻힌다 → 자릿수로 고른다.
   못 고르면 빈칸으로 둔다. 「02--」가 송장에 찍히는 것보다 비어 보이는 게 낫다(2026-09-21) */
const 쓸만한전화 = (v: unknown) => 전화숫자(v).length >= 9;

/* 🔴 08i-로젠파일.js 는 이 27칸을 그대로 송장에 찍는다 — 「02--」를 여기서 지우지 않으면
   수령인전화를 아무리 잘 골라도 송장에는 「02--」가 나간다(2026-09-21) */
/* 🔴 로젠은 「이름＋연락처＋주소」가 같은 줄만 한 송장으로 묶는다(08i 덧줄 주석).
   심폴은 수령지전화 칸이 늘 비고 핸드폰 칸엔 「02--」가 와서 연락처가 성립하지 않았다 —
   v3 는 제대로 묶었는데 로젠에서 품목마다 송장이 따로 뽑혔다(2026-09-21 우람님 신고).
   그래서 지우기만 하지 않고 쓸 수 있는 번호를 골라 세워 준다. 줄마다 같은 값이 된다 */
const 전화세우기 = (o: string[]) => {
  const 좋은 = ["핸드폰", "전화번호", "수령지전화", "주문자핸드폰", "주문자전화번호"]
    .map((이름) => 다듬기(o[자리[이름]])).find(쓸만한전화) || "";
  /* 전화번호(둘째 칸)는 보조번호라 비우기만 한다. 로젠이 보는 두 칸에만 고른 번호를 세운다 */
  for (const 이름 of ["수령지전화", "전화번호", "핸드폰"]) {
    const i = 자리[이름];
    if (!쓸만한전화(o[i])) o[i] = 이름 === "전화번호" ? "" : 좋은;
  }
  return 좋은;
};
const 주소압축 = (v: unknown) => 글(v).replace(/[\s-]/g, "");

/* 08a.묶음키 — 이름·전화·주소가 모두 같으면 화면에서 한 건이다 */
const 묶음키 = (줄: any) =>
  `${다듬기(줄.수령인)}|${전화숫자(줄.수령인전화)}|${주소압축(줄.수령인주소)}`;

/* 🔴 08h.중복키 — 업무규칙의 `주문번호+품목코드+수령인` 을 글자대로 쓰면 안 된다.
   실물 2줄 중 1줄이 품목코드 빈칸이라 한 주문의 둘째 상품이 조용히 사라진다 */
const 중복키 = (줄: any) =>
  `${글(줄.주문번호)}|${줄.원본코드 || (글(줄.유통명) + "§" + 글(줄.옵션원문))}|${다듬기(줄.수령인)}`;

/* 짝표로 붙은 줄 표시 — 저장하는 줄에는 칸을 만들지 않고 시험 숫자에만 쓴다 */
const 짝붙은줄 = new WeakSet<object>();

function 줄만들기(o: string[], 마스터: Record<string, any>, 판매처글: string, 짝색인: Record<string, any>, 주문일시: unknown) {
  const 주문번호 = 다듬기(o[자리["주문번호"]]);
  if (!주문번호) return null;

  const 연락처 = 전화세우기(o);   // 🔴 원본 27칸이 로젠 송장으로 그대로 나간다

  const 원본코드 = 다듬기(o[자리["자체품목코드"]]);
  const 옵션원문 = 다듬기(o[자리["옵션"]]);
  const 상품명 = 다듬기(o[자리["주문상품명"]]);
  const 코드 = 코드정규화(원본코드);
  const 판매처값 = 판매처글 || "카페24";
  /* 원본코드가 마스터에 곧장 맞으면 옵션과 상관없이 그 품목. 안 맞는 품목 옵션 줄만 옵션 열쇠로 짝표를 본다 (08j 줄풀이) */
  const 풀 = 줄풀이(원본코드, 옵션원문, 마스터);
  const 곧장 = (코드.코드 && !풀.품목옵션) ? 마스터[코드.코드] : null;
  const 짝 = 곧장 ? null : 짝찾기(원본코드, 풀, 짝색인);
  const 짝품목 = 짝 ? (마스터[다듬기(짝.붙인품목코드)] ?? null) : null;
  const 품목 = 곧장 ?? 짝품목;
  /* 🔴 하나만 곱한다 — 짝 전 입수는 08h 와 같다: 옵션 개수 → 코드 꼬리 → 1 */
  const 짝전입수 = 풀.입수 || 코드.꼬리 || 1;

  const 줄: any = {
    묶음id: "", 주문번호, 주문일: 날짜만들기(o[자리["발주일"]]),
    판매처: 판매처값,
    /* 못 찾아도 막지 않는다 — 원본코드를 남겨 두고 주문 화면에서 나중에 지정하신다 */
    품목코드: 품목 ? 품목.품목코드 : "", 원본코드,
    유통명: 품목 ? 품목.유통명 : 상품명, 학명: 품목 ? 품목.학명 : "", 규격: 품목 ? 품목.규격 : "",
    주문수량: 숫자(o[자리["수량"]]),
    /* 🔴 쿠팡만 빼고 전부 「판매단위 × 주문갯수」다 — 쿠팡은 쿠팡단위/규격 방식을 따로 쓴다
       (우람님 확인 9/28). 짝 전이면 예전 방식(옵션 텍스트·코드 꼬리)으로 버틴다 */
    옵션입수: 곧장
      ? (판매처값 !== "쿠팡" ? (Number(곧장.판매단위) || 1) : 옛옵션입수(옵션원문, 코드.꼬리))
      : (짝품목 ? 입수정하기(판매처값, 짝전입수, 짝품목, 풀) : 짝전입수),
    옵션원문,
    단가: 숫자(o[자리["판매가"]]),
    수령인: 다듬기(o[자리["수령인"]]),
    수령인전화: 연락처,
    수령인주소: 다듬기(o[자리["주소"]]), 우편번호: 우편정규화(o[자리["우편번호"]]),
    배송메모: 다듬기(o[자리["비고"]]),
    묶음키: "", 출처: "자동수집",
    원본: o,                       // 🔴 08i-로젠파일.js 가 이걸 쓴다
    카페24상태: "", 상태확인: "",   // 아래 수집()에서 채운다
  };
  줄.묶음키 = 묶음키(줄);
  if (짝품목) 짝붙은줄.add(줄);
  /* 🔴 시각이 없으면 칸을 만들지 않는다 — 빈 문자열도 안 박는다(08h 와 같다) */
  const 시각 = 시각만들기(주문일시);
  if (시각) 줄.주문시각 = 시각;
  return 줄;
}

/* ══ 본체 ══ */

const 오늘문자 = () =>
  new Date(Date.now() + 9 * 3600 * 1000).toISOString().slice(0, 10);   // KST
const 새id = () =>
  "od_" + Date.now().toString(36) + "_" + Math.random().toString(36).slice(2, 7);

/* 🔴 PostgREST 는 한 번에 1,000줄까지만 준다 (Supabase 기본 max-rows).
   2026-08-11 중복 사고의 뿌리 — 주문이 1,300건을 넘으면서 **최근 주문이 잘려 나갔고**,
   함수가 그걸 「처음 보는 주문」으로 착각해 다시 넣었다. 누를 때마다 한 벌씩 쌓였다.
   끝까지 읽는다. 마지막 덩이가 1,000줄보다 짧으면 다 온 것이다.
   🔴 품목·주문묶음도 같이 고친다 — 품목이 1,000개를 넘으면 마스터가 빠져 매칭이 조용히 실패한다. */
async function 전부읽기(표: string, 칸: string): Promise<any[]> {
  const 덩이 = 1000;
  const 나온것: any[] = [];
  for (let 시작 = 0; ; 시작 += 덩이) {
    const { data, error } = await db.from(표).select(칸)
      .not("삭제됨", "is", true)
      .range(시작, 시작 + 덩이 - 1);
    /* 🔴 읽기가 깨지면 던진다. 빈 배열로 넘기면 「기존 주문이 하나도 없다」가 되어
       그 회차에 받은 주문을 통째로 다시 넣는다 — 조용한 실패가 곧 중복이다 */
    if (error) throw new Error(`${표} 읽기 실패: ${error.message}`);
    나온것.push(...(data ?? []));
    if (!data || data.length < 덩이) return 나온것;
  }
}

async function 수집(일수: number, 시험: boolean) {
  const token = await 출입증();
  const 끝 = 오늘문자();
  const 시작 = new Date(Date.parse(끝) - 일수 * 86400000).toISOString().slice(0, 10);

  /* 🔴 상태로 거르지 않고 기간 전체를 받는다 — 이유는 둘이다.
     ① 새로 넣는 건 「배송준비중」뿐이지만(아래 새것판정)
     ② 이미 넣어둔 주문은 카페24에서 상태가 바뀌었을 수 있다. 우람님이 카페24에서 직접
        발송처리하실 수도 있으므로 **카페24 상태가 진실**이고, 그걸 매번 따라 적어야 한다.
        N20 만 받으면 「발송된 것」이 아예 안 와서 v3 는 영영 배송준비중으로 남는다 */
  const 받음 = await 카페24(
    `orders?limit=100&start_date=${시작}&end_date=${끝}&embed=items,receivers,buyer`,
    token,
  );

  const [품목들, 기존줄, 묶음들, 짝줄들] = await Promise.all([
    전부읽기("v3_품목", "내용"),
    전부읽기("v3_주문", "id,내용"),   // 🔴 id 를 빼면 상태 갱신이 조용히 안 먹는다
    전부읽기("v3_주문묶음", "id,내용"),
    전부읽기("v3_심폴짝", "id,내용"),   // 짝표 — 읽기만 한다. 못 읽으면 던진다(빈 표로 넘기면 짝 있는 줄이 전부 빈칸으로 저장된다)
  ]);

  /* 짝 색인 — id(`원본코드` 또는 `원본코드§옵션값`) → 짝 레코드. 08j 짝색인과 같다 */
  const 짝색인: Record<string, any> = {};
  (짝줄들 ?? []).forEach((r: any) => {
    const 키 = 다듬기(r.내용?.id ?? r.id);
    if (키 && 다듬기(r.내용?.붙인품목코드)) 짝색인[키] = r.내용;
  });

  const 마스터: Record<string, any> = {};
  (품목들 ?? []).forEach((r: any) => { if (r.내용?.품목코드) 마스터[r.내용.품목코드] = r.내용; });

  /* 기존 표를 한 번만 만든다 — 줄마다 훑으면 1,300건을 매번 다시 읽는다.
     같은 키가 여러 줄일 수 있어(합포장) 들어온 순서대로 담아 둔다 */
  const 기존들: Record<string, any[]> = {};
  (기존줄 ?? []).forEach((r: any) => {
    const k = 중복키(r.내용 ?? {});
    (기존들[k] = 기존들[k] ?? []).push(r);
  });

  const 센수: Record<string, number> = {};
  const 유입처센: Record<string, number> = {};   // 🔴 `시험:true` 로 어디서 온 주문인지 눈으로 본다
  const 새줄들: any[] = [];
  const 고칠들: any[] = [];
  const 지금 = new Date().toISOString();
  let 이미 = 0, 날짜오류 = 0, 안받음 = 0, 시각채움 = 0, 짝으로붙음 = 0;

  for (const 주문 of (받음.orders ?? [])) {
    const 곳 = 판매처(주문);
    유입처센[곳] = (유입처센[곳] ?? 0) + 1;
    const 수령인들 = 주문.receivers ?? [{}];
    const 주문자 = 주문.buyer ?? {};
    for (const 품목 of (주문.items ?? [])) {
      // 품목마다 배송지가 다를 수 있다(복수배송). shipping_code 로 짝을 찾는다
      const 수령인 = 수령인들.find((r: any) => r.shipping_code === 품목.shipping_code) ?? 수령인들[0];
      const 줄 = 줄만들기(원본27(주문, 품목, 수령인, 주문자), 마스터, 판매처(주문), 짝색인, 주문.order_date);
      if (!줄) continue;
      /* 🔴 금액은 v3 가 계산하지 않는다 — 카페24 품목의 결제금액(payment_amount)을 그대로 둔다 (우람님 9/30).
         product_price 는 묶음 한 세트 값이라 옵션입수를 곱하면 부풀었다. 못 받으면 칸을 안 만들고
         08a.금액() 이 주문수량 × 단가로 낸다. 0 은 「안 옴」으로 본다(마켓 주문이 0 으로 올 수 있다) */
      const 결제 = Number(품목.payment_amount);
      if (품목.payment_amount != null && isFinite(결제) && 결제 > 0) 줄.결제금액 = 결제;
      const 상태 = 글(품목.status_text) || 글(품목.order_status);
      줄.카페24상태 = 상태;
      줄.상태확인 = 지금;

      const k = 중복키(줄);
      센수[k] = (센수[k] ?? 0) + 1;
      const 있던 = (기존들[k] ?? [])[센수[k] - 1];

      if (있던) {
        이미++;
        /* 🔴 상태만 갈아끼운다. 나머지 칸은 손대지 않는다 —
           우람님이 주문화면에서 품목코드를 지정하셨을 수 있고, 그걸 덮으면 그 손질이 사라진다 */
        /* 🔴 판매처는 「카페24」·빈칸일 때만 덮는다 — 심폴이나 손으로 고치신 값을 지우면 안 된다 */
        const 옛곳 = 다듬기(있던.내용?.판매처);
        const 곳고침 = (!옛곳 || 옛곳 === "카페24") && 줄.판매처 !== 옛곳;
        /* 🔴 주문시각은 비어 있을 때만 채운다 — 이 기능 전에 들어간 줄은 날짜만 있다. 있는 값은 덮지 않는다 */
        const 시각채울 = !!줄.주문시각 && !다듬기(있던.내용?.주문시각);
        if (있던.내용?.카페24상태 !== 상태 || 곳고침 || 시각채울) {
          if (시각채울) 시각채움++;
          고칠들.push({ id: 있던.id, 내용: {
            ...있던.내용, 카페24상태: 상태, 상태확인: 지금,
            ...(곳고침 ? { 판매처: 줄.판매처 } : {}),
            ...(시각채울 ? { 주문시각: 줄.주문시각 } : {}),
          } });
        }
        continue;
      }

      /* 🔴 새로 넣는 건 「배송준비중」뿐이다. 이미 나간 옛 주문을 뒤늦게 새 주문으로 넣지 않는다 */
      if (품목.order_status !== "N20") { 안받음++; continue; }
      if (!줄.주문일) { 날짜오류++; continue; }
      if (짝붙은줄.has(줄)) 짝으로붙음++;
      새줄들.push(줄);
    }
  }

  /* 상태 갱신은 새 줄이 없어도 한다 — 발송처리만 하신 날에도 화면이 따라와야 한다 */
  let 고침실패 = 0;
  if (고칠들.length && !시험) {
    for (const r of 고칠들) {
      if (!r.id) { 고침실패++; continue; }          // id 없이 update 하면 아무 줄도 안 맞고 조용히 지나간다
      const { error } = await db.from("v3_주문").update({ 내용: r.내용 }).eq("id", r.id);
      if (error) { 고침실패++; console.error("상태 갱신 실패", r.id, error.message); }
    }
  }

  const 미리 = 새줄들.map((r) => ({
    주문번호: r.주문번호, 주문일: r.주문일, 수령인: r.수령인, 품목코드: r.품목코드 || `(못찾음:${r.원본코드})`,
    판매처: r.판매처, 유통명: r.유통명, 수량: r.주문수량 * r.옵션입수, 단가: r.단가,
    주문수량: r.주문수량, 옵션입수: r.옵션입수, 주문시각: r.주문시각 ?? null, 원본코드: r.원본코드, 옵션원문: r.옵션원문,
    결제금액: r.결제금액 ?? null,   // 🔴 시험:true 로 payment_amount 가 줄 전체값인지 대 본다
  }));

  if (!새줄들.length || 시험) {
    return { 시험, 새것: 새줄들.length, 이미, 날짜오류, 안받음, 시각채움, 짝으로붙음, 짝표줄수: (짝줄들 ?? []).length, 상태고침: 고칠들.length, 고침실패, 유입처센,
      읽은기존줄: (기존줄 ?? []).length,   // 🔴 1,000 에서 딱 멈춰 있으면 또 잘린 것이다
             묶음id: null, 받은주문: (받음.orders ?? []).length, 미리보기: 미리 };
  }

  /* 🔴 회차는 하루에 하나다 — 08·12·15시가 같은 묶음에 이어붙는다.
     받을 때마다 새 회차를 만들면 회차 칩이 하루 세 개로 늘어난다(우람님 지적) */
  const 그날 = (묶음들 ?? []).filter((b: any) => b.내용?.올린날 === 끝);
  let 묶음 = 그날.find((b: any) => b.내용?.출처 === "자동수집");
  const 때 = Date.now();
  const 시각 = new Date(때 + 9 * 3600 * 1000).toISOString().slice(11, 16);

  let 묶음id: string, 묶음내용: any;
  if (묶음) {
    묶음id = 묶음.id;
    묶음내용 = { ...묶음.내용, 줄수: (묶음.내용.줄수 ?? 0) + 새줄들.length, 마지막수집: 시각 };
  } else {
    const 회차 = 그날.length + 1;
    묶음id = 끝.replace(/-/g, "").slice(2) + "-" + String(회차).padStart(2, "0");
    묶음내용 = {
      id: 묶음id, 올린날: 끝, 올린시각: 시각, 회차, 파일명: "",
      줄수: 새줄들.length, 건너뛴수: 0, 등록일시: 때, 출처: "자동수집", 마지막수집: 시각,
    };
  }

  새줄들.forEach((r) => { r.id = 새id(); r.묶음id = 묶음id; r.등록일시 = 때; });

  const { error: e1 } = await db.from("v3_주문묶음")
    .upsert({ id: 묶음id, 내용: 묶음내용 }, { onConflict: "id" });
  if (e1) throw new Error("묶음 저장 실패: " + e1.message);

  const { error: e2 } = await db.from("v3_주문")
    .insert(새줄들.map((r) => ({ id: r.id, 내용: r })));
  if (e2) throw new Error("주문 저장 실패: " + e2.message);

  return { 새것: 새줄들.length, 이미, 날짜오류, 안받음, 시각채움, 짝으로붙음, 상태고침: 고칠들.length, 고침실패, 유입처센, 묶음id,
           받은주문: (받음.orders ?? []).length, 미리보기: 미리 };
}

Deno.serve(async (req) => {
  const cors = {
    "Access-Control-Allow-Origin": "*",
    /* 🔴 supabase-js 는 `x-client-info`(그리고 새 키에선 `x-supabase-api-version`)를 같이 보낸다.
       하나라도 빠지면 브라우저가 프리플라이트에서 막고 화면엔 그냥 「실패」만 뜬다 (8/8 겪음) */
    "Access-Control-Allow-Headers":
      "authorization, content-type, apikey, x-client-info, x-supabase-api-version",
    "Content-Type": "application/json; charset=utf-8",
  };
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  try {
    const 몸 = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    /* 🔴 `시험:true` 면 한 글자도 저장하지 않는다. 뭐가 들어갈지만 돌려준다 */
    const 결과 = await 수집(Number(몸.일수) || 14, 몸.시험 === true);
    return new Response(JSON.stringify({ ok: true, ...결과 }), { headers: cors });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, 오류: String(e?.message ?? e) }),
      { status: 500, headers: cors });
  }
});
