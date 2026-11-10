/* 입금 알림 받는 곳 — 폰 수집기가 은행 문자·은행 앱 알림 글을 그대로 POST 한다 (34단계).
 * 슬러그 `deposit-in`. 입구는 폰마다 다르고 여기는 하나다:
 *   아이폰 = 단축어 「메시지」 자동화(문자만 · 앱 알림은 못 받음) · 갤럭시 = 도우미 앱 알림 읽기(문자 알림·은행 앱 알림)
 *   몸 `{"text": 글, "입구": "아이폰단축어"|"안드로이드알림", "보낸곳": 발신번호나 앱 이름(없어도 됨)}`
 * 🔴 verify_jwt 끔 — 수집기엔 로그인이 없다. 주소 끝 `?k=` 가 비밀값 DEPOSIT_TOKEN 과 같아야 저장(넣기만 됨).
 * 🔴 남기는 것은 이름·금액·시각·은행·입구뿐. 잔액·계좌번호·원문 버림. 30일 지난 줄은 받을 때마다 지운다.
 * 🔴 새 표 없이 `v3_공유설정` 에 한 건 한 줄(id `입금:…`). 앱(01b)은 설정행이 아닌 줄을 그냥 넘긴다.
 * `{"시험":true,"text":…}` — 읽기만, 저장 안 함(열쇠 없이 됨).
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const 보관일 = 30;

/* 은행별 읽기 규칙 — 새 은행은 실제 글 1통 보고 한 줄 더한다. 금액·「월/일 시:분」·이름 자리 */
const 규칙 = [
  { 은행: "농협", 알아봄: /농협\s*입금/,
    금액: /입금\s*([\d,]+)\s*원/, 때이름: /(\d{1,2})\/(\d{1,2})\s+(\d{1,2}):(\d{2})\s+\S+\s+(.+?)\s*(?:잔액|$)/m },
];

/* 「농협 입금30,000원 / 11/10 09:29 351-****-0000-00 홍길동 잔액1,000,000원」 → {은행, 이름, 금액, 시각} · 아니면 null */
export function 읽기(글: string, 지금: number) {
  if (/출금/.test(글)) return null;
  const r = 규칙.find((x) => x.알아봄.test(글));
  const 금 = r && r.금액.exec(글), 때 = r && r.때이름.exec(글);
  if (!r || !금 || !때) return null;
  const 금액 = Number(금[1].replace(/,/g, "")), 이름 = 때[5].trim();
  if (!금액 || !이름) return null;
  const 한국 = new Date(지금 + 9 * 3600e3);
  const 해 = 한국.getUTCFullYear() - (Number(때[1]) > 한국.getUTCMonth() + 1 ? 1 : 0);   // 1월에 받은 12월 글
  const 두 = (s: string) => s.padStart(2, "0");
  return { 은행: r.은행, 이름, 금액, 시각: `${해}-${두(때[1])}-${두(때[2])}T${두(때[3])}:${때[4]}:00+09:00` };
}

Deno.serve(async (req) => {
  const 머리 = { "Content-Type": "application/json; charset=utf-8" };
  const 답 = (o: unknown, status = 200) => new Response(JSON.stringify(o), { status, headers: 머리 });
  try {
    const 몸 = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    const 글 = String(몸.text ?? "");
    const 뜻 = 읽기(글, Date.now());
    if (몸.시험 === true) return 답({ ok: true, 시험: true, 뜻 });
    // 열쇠 지문(sha256)만 둔다 — 배포 토큰에 비밀값 권한이 없어서(11/10). 원본 열쇠는 제로가드닝/.env.deposit(깃 제외)
    const 지문 = Array.from(new Uint8Array(await crypto.subtle.digest("SHA-256",
      new TextEncoder().encode(new URL(req.url).searchParams.get("k") ?? "")))).map((b) => b.toString(16).padStart(2, "0")).join("");
    if (지문 !== "b8fae579245d30f9283fd0d7707a492f68e36eece543101e8710ecd8c680be4a") return 답({ ok: false, 오류: "열쇠" }, 401);
    if (!뜻) return 답({ ok: true, 저장: false, 까닭: "입금 글 아님" });
    // 같은 입금이 문자·앱 알림 두 길로 와도, 단축어가 두 번 돌아도 한 줄 — 원문이 아니라 시각·금액·이름으로
    const id = `입금:${뜻.시각.slice(0, 16)}:${뜻.금액}:${뜻.이름}`;
    const { error } = await db.from("v3_공유설정").upsert([{ id, 삭제됨: false,
      내용: { ...뜻, 입구: String(몸.입구 ?? "").slice(0, 20), 받은시각: new Date().toISOString() } }], { onConflict: "id" });
    if (error) throw error;
    const 옛날 = new Date(Date.now() - 보관일 * 864e5).toISOString();
    await db.from("v3_공유설정").delete().like("id", "입금:%").lt("수정시각", 옛날);
    return 답({ ok: true, 저장: true, id });
  } catch (e) {
    console.error(e);
    return 답({ ok: false, 오류: String((e as any)?.message ?? e) }, 500);
  }
});
