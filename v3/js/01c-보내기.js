/* 01c-보내기 — 보낼것 큐 · upsert 전송 · 재시도 · 온라인 감지 (7단계 설계 §4-1·§6)
   쓰기는 언제나 localStorage 부터 들어간다. 여기는 그 뒤다 — 끊겨도 입력한 것은 남는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 큐키 = 'zg.v3.보낼것';
  var 큐 = {};   // '표|id' → {표, id, 값 또는 삭제}. 같은 줄은 마지막 것 하나로 합친다
  try { 큐 = JSON.parse(localStorage.getItem(큐키) || '{}') || {}; } catch (e) { 큐 = {}; }

  var 예약 = null, 보내는중 = false, 보내기시작 = 0;
  var 굳음한계 = 60000;   // 보내기가 이만큼 지나도 안 끝나면 죽은 것으로 보고 다시 건다

  var 큐못씀 = false;   // 큐도 못 쓰면 새로고침에 못 보낸 것까지 사라진다 — 서버 경고 줄에 같이 남긴다
  function 큐저장() {
    var 전 = 큐못씀;
    try { localStorage.setItem(큐키, JSON.stringify(큐)); 큐못씀 = false; }
    catch (e) { 큐못씀 = true; console.warn('큐를 못 썼습니다', e); }
    if (전 !== 큐못씀) 표시();
  }
  function 표이름(k) { return String(k).replace('zg.v3.', ''); }

  function 담기(항목) {
    큐[항목.표 + '|' + 항목.id] = 항목;
    큐저장();
    if (예약) return;
    예약 = setTimeout(function () { 예약 = null; 보내기(); }, 300);
  }

  /* 키는 표마다 다르다(품목=품목코드 · 즐겨찾기=키워드 · 분류폴더=이름). 01-저장소가 한 곳에서 정한다 */
  function 줄(k, 레코드) {
    var 표 = 표이름(k);
    var id = ZG.저장소.레코드키(표, 레코드);
    if (!id) { console.warn('키가 없어 서버로 못 보냅니다', 표, ZG.저장소.키필드(표), 레코드); return; }
    담기({ 표: 표, id: id, 값: 레코드, 시각: Date.now() });
  }
  function 삭제(k, id) {
    if (!id) return;
    담기({ 표: 표이름(k), id: String(id), 삭제: true, 시각: Date.now() });
  }
  function 설정(k, 값) {
    담기({ 표: '공유설정', id: 표이름(k), 값: 값, 시각: Date.now() });
  }

  /* 🔴 navigator.onLine 을 문지기로 쓰지 않는다 (8/19 우람님 맥).
     인터넷이 멀쩡한데 크롬이 false 를 물고 있는 일이 실제로 있다 —
     그날 콘솔에서 onLine 은 false 인데 같은 자리 upsert 는 201 OK 였다.
     그 값을 믿고 막았더니 8/9부터 24건이 아무 표시 없이 쌓였다.
     끊겼으면 upsert 가 실패하고 큐에 남으므로, 미리 막을 필요가 없다. */
  function 보낼수있나() {
    return ZG.서버 && ZG.서버.켜짐 && ZG.서버.클라이언트;
  }

  function 보내기() {
    /* 🔴 「보내는중」이 켜진 채 굳으면 그 탭은 새로고침 전까지 영영 안 보낸다.
       요청 하나가 응답도 실패도 없이 매달려 있으면 실제로 그렇게 된다 —
       한계를 넘기면 죽은 것으로 보고 새로 건다 (옛 요청이 늦게 성공해도 큐에서 빼기만 한다) */
    if (보내는중 && Date.now() - 보내기시작 < 굳음한계) return Promise.resolve();
    if (!보낼수있나()) return Promise.resolve();
    var 열쇠들 = Object.keys(큐).slice(0, 100);
    if (!열쇠들.length) { 표시(); return Promise.resolve(); }
    보내는중 = true; 보내기시작 = Date.now();

    var 표별 = {};
    열쇠들.forEach(function (열쇠) {
      var it = 큐[열쇠];
      (표별[it.표] = 표별[it.표] || []).push({ 열쇠: 열쇠, it: it });
    });

    var supa = ZG.서버.클라이언트;
    var 일 = Object.keys(표별).map(function (표) {
      var 묶음 = 표별[표];
      var 행들 = 묶음.map(function (m) {
        // 메아리는 받는 쪽에서 「로컬과 같은가」로 거른다 — 보낸 값을 따로 적어 둘 필요가 없다
        return { id: m.it.id, 내용: m.it.삭제 ? { id: m.it.id } : m.it.값, 삭제됨: !!m.it.삭제 };
      });
      return supa.from('v3_' + 표).upsert(행들, { onConflict: 'id' }).then(function (r) {
        if (r.error) throw r.error;
        묶음.forEach(function (m) { delete 큐[m.열쇠]; });   // 성공한 것만 큐에서 뺀다
      }).catch(function (e) {
        console.warn('서버로 못 보냈습니다 — 큐에 남겨 둡니다', 표, e.message || e);
      });
    });

    function 끝냄() {
      보내는중 = false;
      큐저장();
      표시();
      if (Object.keys(큐).length && 열쇠들.length === 100) 담기0();
    }
    return Promise.all(일).then(끝냄, 끝냄);
  }

  // 100건씩 끊어 보내므로 남은 게 있으면 곧바로 이어서 한 번 더
  function 담기0() { setTimeout(보내기, 100); }

  /* ── 못 올린 것 · 못 쓴 것 · 끊김 · 수집 실패 — 화면엔 안 띄우고 서버에 조용히 한 줄 (11/10 우람님 「빨간 경고 없애고 보고서로」) ──
     예전엔 맨 위 빨간 띠였다(8/19 · 10/17 · 10/21 사고 — 아무 표시 없이 쌓이고 사라졌던 것). 이제 v3_공유설정 「경고:<기기>」
     { 글, 건수, 처음, 마지막, 기기 } 를 허브가 아침보고·매시 점검에서 읽는다. 글이 바뀔 때만 쓰고, 다 풀리면 그 줄을 비운다(삭제됨).
     서버와 끊긴 동안은 못 쓰니 끊긴 시각을 이 기기에 적어 두었다가 다시 이어지면 「끊겼던 시각~」을 24시간 남긴다 */
  function 밀린건수() {
    var 이제 = Date.now(), n = 0;
    Object.keys(큐).forEach(function (열쇠) { if (이제 - (큐[열쇠].시각 || 0) > 60000) n++; });
    return n;
  }
  // 연결 부품(supabase-js)을 못 받아 01b 가 로컬 전용으로 도는 것 (10/7 타르다)
  function 끊김() { return !!(ZG.서버 && ZG.서버.로그인됨 && !ZG.서버.켜짐); }
  function 읽기(k, 빈) { try { return JSON.parse(localStorage.getItem(k) || 'null') || 빈; } catch (e) { return 빈; } }
  function 쓰기(k, v) { try { localStorage.setItem(k, JSON.stringify(v)); } catch (e) { /* 무시 */ } }
  // 주문 수집 실패 — 다음에 받을 때까지 이 기기에 남긴다(심폴 10/17~21 나흘 멈춤 · 10/21)
  var 수집키 = 'zg.v3.수집실패', 수집 = 읽기(수집키, {});
  function 수집결과(이름, 실패글) {
    if (실패글) 수집[이름] = String(실패글).slice(0, 40); else delete 수집[이름];
    쓰기(수집키, 수집);
    살피기();
  }
  var 받기경고들 = [];   // 01b — 표를 못 받음 · 서버에 아직 한 번도 안 올림
  function 받기경고(글들) { 받기경고들 = (글들 || []).slice(); 살피기(); }

  var 기기키 = 'zg.v3.기기', 기기 = 읽기(기기키, '');
  if (!기기) {
    기기 = (/iPhone|iPad/.test(navigator.userAgent) ? '아이폰' : /Android/.test(navigator.userAgent) ? '안드로이드' : /Mac/.test(navigator.userAgent) ? '맥' : '기기') +
      '-' + Math.random().toString(36).slice(2, 6);
    쓰기(기기키, 기기);
  }
  var 끊김키 = 'zg.v3.끊김기록', 상태키 = 'zg.v3.경고상태';
  function 때(ms) { var d = new Date(ms), 두 = function (n) { return (n < 10 ? '0' : '') + n; }; return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + 두(d.getHours()) + ':' + 두(d.getMinutes()); }
  function 경고글() {
    var n = 밀린건수(), 못씀 = 큐못씀 || (ZG.저장소 && ZG.저장소.저장실패 && ZG.저장소.저장실패() > 0);
    var 끊 = 읽기(끊김키, null);
    var 지난끊김 = 끊 && 끊.풀림 && Date.now() - 끊.풀림 < 864e5 ? '서버 연결 끊겼었음 ' + 때(끊.처음) + '~' + 때(끊.마지막) : '';
    return { 글: [못씀 ? '이 기기에 저장 실패' : '', n ? '서버에 못 올라간 기록 ' + n + '건' : '']
      .concat(Object.keys(수집).map(function (k) { return k + ' 주문 수집 실패 — ' + 수집[k]; }), 받기경고들, [지난끊김])
      .filter(Boolean).join(' · '), 건수: n };
  }
  var 쓰는중 = false;
  function 살피기() {
    if (끊김()) {   // 못 쓴다 — 시각만 적어 둔다
      var 끊 = 읽기(끊김키, null), 이제 = Date.now();
      if (!끊 || 끊.풀림) 끊 = { 처음: 이제 };
      끊.마지막 = 이제; 쓰기(끊김키, 끊);
      return;
    }
    var 끊2 = 읽기(끊김키, null);
    if (끊2 && !끊2.풀림 && ZG.서버 && ZG.서버.켜짐) { 끊2.풀림 = Date.now(); 쓰기(끊김키, 끊2); }
    var supa = ZG.서버 && ZG.서버.켜짐 && ZG.서버.클라이언트;
    if (!supa || 쓰는중) return;
    var 지금 = 경고글(), 전 = 읽기(상태키, { 글: '' });
    if (지금.글 === 전.글) return;   // 바뀔 때만 쓴다
    var 이제 = Date.now(), 새 = { 글: 지금.글, 건수: 지금.건수, 처음: 전.글 && 지금.글 ? 전.처음 : 이제, 마지막: 이제, 기기: 기기 };
    쓰는중 = true;
    supa.from('v3_공유설정').upsert([{ id: '경고:' + 기기, 내용: 지금.글 ? 새 : {}, 삭제됨: !지금.글 }])
      .then(function (r) { 쓰는중 = false; if (!r || !r.error) 쓰기(상태키, 새); },
            function () { 쓰는중 = false; });   // 못 쓰면 다음 살피기 때 다시
  }
  var 표시 = 살피기;   // 01-저장소가 저장 실패가 바뀔 때 부른다

  function 깨우기() { return 보내기(); }
  function 건수() { return Object.keys(큐).length; }
  function 비우기() { 큐 = {}; 큐저장(); 살피기(); }

  window.addEventListener('online', 깨우기);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) 깨우기(); });
  setInterval(깨우기, 30000);
  setInterval(살피기, 15000);   // 15초마다 「살피기만」 — 서버엔 글이 바뀔 때만 쓴다
  setTimeout(살피기, 3000);

  ZG.보내기 = { 줄: 줄, 삭제: 삭제, 설정: 설정, 깨우기: 깨우기, 건수: 건수, 비우기: 비우기, 표시: 표시, 수집결과: 수집결과, 받기경고: 받기경고, 경고글: 경고글, 기기: function () { return 기기; } };
})(window.ZG);
