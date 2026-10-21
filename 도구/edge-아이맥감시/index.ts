/* 아이맥 감시 — 아이맥이 15분 넘게 「살아있음」을 안 찍으면 폰에 알린다 (31단계).
 * 슬러그 `imac-watch`. 부르는 곳 — pg_cron 5분마다(31단계-아이맥감시.sql).
 *
 * 10/21 10:45 아이맥이 메모리 부족으로 멈춰 재시동 → FileVault 로그인 화면에서 22:54 까지
 * 섰는데 아무도 몰랐다. 아이맥은 죽으면 스스로 못 알리므로 서버가 본다.
 *
 * 🔴 여기엔 푸시 비밀열쇠가 없다. 아이맥(도구/살아있음.py)이 5분마다 꺼짐 알림을 미리 봉해
 *    `v3_공유설정` id='아이맥' 의 `짐` 에 얹는다 — 여기선 그대로 POST 만 한다.
 * 🔴 처음 끊기면 1번, 그 뒤 1시간마다. 「다시 살아남」은 아이맥이 보낸다(여기선 못 봉한다).
 * 🔴 verify_jwt 를 끈다 — cron 이 열쇠 없이 부르려고. 보통 부름은 서버 줄만 보고 상태가
 *    바뀔 때만 쏘므로 아무나 불러도 알림이 늘지 않는다. `시험:"푸시"` 는
 *    v3_지시 의 구독 주소로만 쏜다 — 우리 열쇠로 봉한 짐이 아니면 푸시 서버가 거절한다.
 */
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const db = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!);
const 끊김분 = 15, 다시분 = 60;

type 짐 = { 끝주소: string; 출입: string; 살: string };

const 한국때 = (iso: string) => {
  const d = new Date(Date.parse(iso) + 9 * 3600e3);
  const 두 = (n: number) => String(n).padStart(2, "0");
  return `${두(d.getUTCMonth() + 1)}/${두(d.getUTCDate())} ${두(d.getUTCHours())}:${두(d.getUTCMinutes())}`;
};

/* 판정 — 저장·발송 없이 「쏠까·새 상태」만. 시험이 이것만 부른다 */
export function 판정(지금: number, 아이맥: any, 알림: any) {
  if (!아이맥?.시각) return { 보낼: false, 까닭: "아이맥 줄 없음", 알림 };
  const 지난분 = Math.round((지금 - Date.parse(아이맥.시각)) / 60000);
  if (지난분 <= 끊김분) return { 보낼: false, 까닭: `살아있음 ${지난분}분 전`, 지난분, 알림 };
  const 이제 = new Date(지금).toISOString();
  if (!알림?.꺼짐) {
    return { 보낼: true, 까닭: `첫 끊김 ${지난분}분`, 지난분,
      알림: { 꺼짐: true, 끊긴때: 한국때(아이맥.시각), 첫알림: 이제, 마지막알림: 이제, 횟수: 1 } };
  }
  const 지난알림분 = Math.round((지금 - Date.parse(알림.마지막알림 || "1970-01-01T00:00:00Z")) / 60000);
  if (지난알림분 < 다시분) return { 보낼: false, 까닭: `알린 지 ${지난알림분}분`, 지난분, 알림 };
  return { 보낼: true, 까닭: `다시 알림 ${지난분}분`, 지난분,
    알림: { ...알림, 마지막알림: 이제, 횟수: (알림.횟수 || 1) + 1 } };
}

const 풀기 = (s: string) => Uint8Array.from(atob(s.replace(/-/g, "+").replace(/_/g, "/")), (c) => c.charCodeAt(0));

async function 쏘기(짐들: 짐[]) {
  const 결과: string[] = [];
  for (const j of 짐들 || []) {
    try {
      const r = await fetch(j.끝주소, { method: "POST", body: 풀기(j.살), headers: {
        Authorization: j.출입, "Content-Encoding": "aes128gcm",
        "Content-Type": "application/octet-stream", TTL: "86400", Urgency: "high" } });
      결과.push(`${r.status}`);
      if (!r.ok) console.error("푸시", r.status, (await r.text()).slice(0, 200));
    } catch (e) {
      결과.push("오류");
      console.error("푸시", e);
    }
  }
  return 결과;
}

async function 줄(id: string) {
  const { data, error } = await db.from("v3_공유설정").select("내용").eq("id", id).maybeSingle();
  if (error) throw error;
  return data?.내용 || {};
}

Deno.serve(async (req) => {
  const cors = { "Content-Type": "application/json; charset=utf-8" };
  try {
    const 몸 = req.method === "POST" ? await req.json().catch(() => ({})) : {};
    if (몸.시험 === "푸시") {
      const { data, error } = await db.from("v3_지시").select("내용").eq("내용->>갈래", "구독");
      if (error) throw error;
      const 우리 = new Set((data || []).map((r: any) => r.내용?.끝주소));
      const 짐들 = ((몸.짐 || []) as 짐[]).filter((j) => 우리.has(j.끝주소));
      return new Response(JSON.stringify({ ok: true, 쏨: await 쏘기(짐들) }), { headers: cors });
    }
    /* 🔴 `시험:true` — 저장·발송 없이 판정만. 아이맥·알림·지금을 주면 그걸로(가짜 줄 시험) */
    const 시험 = 몸.시험 === true;
    const 아이맥 = 시험 && 몸.아이맥 ? 몸.아이맥 : await 줄("아이맥");
    const 알림 = 시험 && 몸.알림 ? 몸.알림 : await 줄("아이맥알림");
    const 지금 = 시험 && 몸.지금 ? Date.parse(몸.지금) : Date.now();
    const 답 = 판정(지금, 아이맥, 알림);
    let 쏨: string[] = [];
    if (!시험 && 답.보낼) {
      쏨 = await 쏘기(아이맥.짐);
      const { error } = await db.from("v3_공유설정")
        .upsert([{ id: "아이맥알림", 내용: 답.알림, 삭제됨: false }], { onConflict: "id" });
      if (error) throw error;
    }
    return new Response(JSON.stringify({ ok: true, 시험, ...답, 쏨 }), { headers: cors });
  } catch (e) {
    console.error(e);
    return new Response(JSON.stringify({ ok: false, 오류: String((e as any)?.message ?? e) }),
      { status: 500, headers: cors });
  }
});
