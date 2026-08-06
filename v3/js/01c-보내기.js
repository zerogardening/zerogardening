/* 01c-보내기 — 보낼것 큐 · upsert 전송 · 재시도 · 온라인 감지 (7단계 설계 §4-1·§6)
   쓰기는 언제나 localStorage 부터 들어간다. 여기는 그 뒤다 — 끊겨도 입력한 것은 남는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 큐키 = 'zg.v3.보낼것';
  var 큐 = {};   // '표|id' → {표, id, 값 또는 삭제}. 같은 줄은 마지막 것 하나로 합친다
  try { 큐 = JSON.parse(localStorage.getItem(큐키) || '{}') || {}; } catch (e) { 큐 = {}; }

  var 예약 = null, 보내는중 = false;

  function 큐저장() {
    try { localStorage.setItem(큐키, JSON.stringify(큐)); } catch (e) { console.warn('큐를 못 썼습니다', e); }
  }
  function 표이름(k) { return String(k).replace('zg.v3.', ''); }

  function 담기(항목) {
    큐[항목.표 + '|' + 항목.id] = 항목;
    큐저장();
    if (예약) return;
    예약 = setTimeout(function () { 예약 = null; 보내기(); }, 300);
  }

  function 줄(k, 레코드) {
    var id = 레코드 && (레코드.id || 레코드.품목코드);
    if (!id) return;
    담기({ 표: 표이름(k), id: String(id), 값: 레코드, 시각: Date.now() });
  }
  function 삭제(k, id) {
    if (!id) return;
    담기({ 표: 표이름(k), id: String(id), 삭제: true, 시각: Date.now() });
  }
  function 설정(k, 값) {
    담기({ 표: '공유설정', id: 표이름(k), 값: 값, 시각: Date.now() });
  }

  function 보낼수있나() {
    return ZG.서버 && ZG.서버.켜짐 && ZG.서버.클라이언트 && navigator.onLine !== false;
  }

  function 보내기() {
    if (보내는중 || !보낼수있나()) return Promise.resolve();
    var 열쇠들 = Object.keys(큐).slice(0, 100);
    if (!열쇠들.length) return Promise.resolve();
    보내는중 = true;

    var 표별 = {};
    열쇠들.forEach(function (열쇠) {
      var it = 큐[열쇠];
      (표별[it.표] = 표별[it.표] || []).push({ 열쇠: 열쇠, it: it });
    });

    var supa = ZG.서버.클라이언트;
    var 일 = Object.keys(표별).map(function (표) {
      var 묶음 = 표별[표];
      var 행들 = 묶음.map(function (m) {
        ZG.서버.에코등록(표, m.it.id);
        return { id: m.it.id, 내용: m.it.삭제 ? { id: m.it.id } : m.it.값, 삭제됨: !!m.it.삭제 };
      });
      return supa.from('v3_' + 표).upsert(행들, { onConflict: 'id' }).then(function (r) {
        if (r.error) throw r.error;
        묶음.forEach(function (m) { delete 큐[m.열쇠]; });   // 성공한 것만 큐에서 뺀다
      }).catch(function (e) {
        console.warn('서버로 못 보냈습니다 — 큐에 남겨 둡니다', 표, e.message || e);
      });
    });

    return Promise.all(일).then(function () {
      보내는중 = false;
      큐저장();
      if (Object.keys(큐).length && 열쇠들.length === 100) 담기0();
    });
  }

  // 100건씩 끊어 보내므로 남은 게 있으면 곧바로 이어서 한 번 더
  function 담기0() { setTimeout(보내기, 100); }

  function 깨우기() { return 보내기(); }
  function 건수() { return Object.keys(큐).length; }
  function 비우기() { 큐 = {}; 큐저장(); }

  window.addEventListener('online', 깨우기);
  document.addEventListener('visibilitychange', function () { if (!document.hidden) 깨우기(); });
  setInterval(깨우기, 30000);

  ZG.보내기 = { 줄: 줄, 삭제: 삭제, 설정: 설정, 깨우기: 깨우기, 건수: 건수, 비우기: 비우기 };
})(window.ZG);
