/* 01d-지시구독 — v3_지시 가 바뀌면 바뀐 줄만 알려 준다 (10/23 · 19 지시함 · 06l 품절이 듣는다).
   🔴 10/23 Supabase 무료 전송량(5GB/월)을 넘어 앱이 멈췄다 — 지시함은 5초마다 200줄(230KB), 품절은 15초마다
      통째로 다시 받고 있었다. 이제 Realtime(채널 v3-지시)으로 바뀐 줄만 받는다.
   🔴 Realtime 이 안 붙으면(표가 publication 에 없음·끊김) 15초마다 「수정시각 뒤에 바뀐 줄만」 받는다.
      붙어 있어도 5분마다 한 번 따라잡는다(끊긴 사이 놓친 줄). 화면이 숨으면 쉰다.
   01b 의 v3-전체 채널에 넣지 않는다 — 한 표가 말썽이면 그 채널이 통째로 죽는다(01b 따로표). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 칸 = 'id,내용,삭제됨,수정시각';
  var 짧은초 = 15, 긴초 = 300, 겹침초 = 60, 모음ms = 1500;
  var 듣는이 = [], 마지막 = '', 실시간 = false, 켬 = false, 읽는중 = false, 지난따라잡기 = 0;
  var 모음 = [], 모음타이머 = null;

  function 클() {
    var 서 = ZG.서버;
    return 서 && 서.켜짐 && 서.클라이언트 ? 서.클라이언트 : null;
  }

  /* 맥이 답장(v3_지시)과 머리줄(v3_원고)을 잇달아 쓴다 — 잠깐 모았다가 한 번에 알린다 */
  function 알리기(줄들) {
    if (!줄들.length) return;
    모음 = 모음.concat(줄들);
    clearTimeout(모음타이머);
    모음타이머 = setTimeout(function () {
      var 것 = 모음; 모음 = [];
      듣는이.forEach(function (f) { try { f(것); } catch (e) { console.error(e); } });
    }, 모음ms);
  }

  function 시각(v) { return new Date(String(v || '').replace(' ', 'T')).getTime() || 0; }

  /* 수정시각 뒤에 바뀐 줄만 — 평소엔 [] (몇 바이트) */
  function 따라잡기() {
    var c = 클();
    if (!c || 읽는중 || document.hidden) return;
    읽는중 = true; 지난따라잡기 = Date.now();
    var q;
    try {
      q = c.from('v3_지시').select(마지막 ? 칸 : '수정시각');
      q = 마지막
        ? q.gt('수정시각', new Date(시각(마지막) - 겹침초 * 1000).toISOString()).order('수정시각').limit(500)
        : q.order('수정시각', { ascending: false }).limit(1);       // 처음엔 기준 시각만 잡는다
    } catch (e) { 읽는중 = false; return; }
    Promise.resolve(q).then(function (답) {
      읽는중 = false;
      if (!답 || 답.error || !답.data) return;
      var 처음 = !마지막;
      답.data.forEach(function (r) { if (시각(r.수정시각) > 시각(마지막)) 마지막 = r.수정시각; });
      if (!처음) 알리기(답.data);
    }, function () { 읽는중 = false; });
  }

  function 구독() {
    var ch = 클().channel('v3-지시');
    ch.on('postgres_changes', { event: '*', schema: 'public', table: 'v3_지시' }, function (p) {
      var 행 = p['new'] && p['new'].id ? p['new'] : p.old;
      if (!행 || !행.id) return;
      알리기([p.eventType === 'DELETE' ? { id: 행.id, 삭제됨: true } : 행]);
    });
    // 「Subscribed to PostgreSQL」(ok) 가 와야 진짜 붙은 것이다 — SUBSCRIBED 만으로는 표가 없어도 온다
    ch.on('system', {}, function (m) {
      if (m && m.extension === 'postgres_changes') {
        var 붙음 = m.status === 'ok';
        if (붙음 && !실시간) 따라잡기();           // 끊긴 사이 놓친 줄
        실시간 = 붙음;
      }
    });
    ch.subscribe(function (s) { if (s !== 'SUBSCRIBED') 실시간 = false; });
  }

  function 켜기() {
    if (켬) return;
    if (!클()) { setTimeout(켜기, 짧은초 * 1000); return; }   // CDN 이 늦게 열리면 다시
    켬 = true;
    try { 구독(); } catch (e) { 실시간 = false; }           // 실시간이 안 되면 15초 「바뀐 줄만」으로 돈다
    따라잡기();
    setInterval(function () {
      if (Date.now() - 지난따라잡기 >= (실시간 ? 긴초 : 짧은초) * 1000 - 500) 따라잡기();
    }, 짧은초 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) 따라잡기(); });
  }

  ZG.지시구독 = {
    /* f(줄들) — 줄들 = [{id, 내용, 삭제됨, 수정시각}] (DELETE 는 {id, 삭제됨:true}) */
    듣기: function (f) {
      듣는이.push(f);
      ((ZG.서버 && ZG.서버.준비) || Promise.resolve()).then(켜기, 켜기);
    },
    상태: function () { return { 실시간: 실시간, 마지막: 마지막, 켬: 켬 }; }
  };
})(window.ZG);
