/* 20k-번호장부 — 문자주문·예약 주문번호를 서버 장부(v3_주문번호)에서 잡고 올린다 (35단계 · 11/10 조춘성=현진희 같은 261110-01).
   기기 목록만 보고 오늘 최대+1 을 주면 목록이 밀린 기기·같은 순간의 두 기기가 같은 번호를 준다.
   장부 id = 번호라 같은 번호 insert 는 서버가 거절 → 다음 번호. 문자주문id 도 하나뿐 → 같은 주문은 어느 기기에서든 같은 번호.
   🔴 서버에 못 닿으면 올리지 않는다 — 번호가 겹치는 것보다 멈추는 게 낫다. 서버 없는 로컬 전용(시험)만 예전처럼 기기가 짓는다 */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 표 = 'v3_주문번호', 끊김 = '인터넷 연결 후 다시 올려 주세요';
  var 기기 = 'k_' + Math.random().toString(36).slice(2, 8);
  var 도는중 = {};   // 같은 줄 두 번 누름·자동 올리기 겹침
  function 자() { return ZG.문자주문자료; }
  function 손() { var 서 = ZG.서버; return 서 && 서.켜짐 && 서.클라이언트; }
  function 답(r) { if (!r || r.error) throw (r && r.error) || new Error('서버 답 없음'); return r.data || []; }
  function 부름(q) { return ZG.ui.제때(q).then(답); }

  function 내번호(id) {
    return 부름(손().from(표).select('id').eq('문자주문id', id)).then(function (d) { return d[0] ? d[0].id : ''; });
  }
  function 넣기(번호, id) {
    return ZG.ui.제때(손().from(표).insert({ id: 번호, 문자주문id: id, 내용: { 때: Date.now(), 기기: 기기 } })).then(function (r) {
      if (r && !r.error) return 번호;
      if (r && r.error && r.error.code === '23505') return 내번호(id);   // 남이 그 번호를 가졌다('') · 또는 이 주문을 남이 먼저 잡았다(그 번호)
      throw (r && r.error) || new Error('서버 답 없음');
    });
  }
  function 다음(날짜, 주문들, id, 남은) {
    var 앞 = 날짜.slice(2, 4) + 날짜.slice(5, 7) + 날짜.slice(8, 10);
    return 부름(손().from(표).select('id').like('id', 앞 + '-%')).then(function (d) {
      var 후보 = 자().새주문번호(날짜, 주문들.concat(d.map(function (x) { return { 주문번호: x.id }; })));
      return 넣기(후보, id).then(function (번호) {
        if (번호) return 번호;
        if (남은 <= 0) throw new Error('번호를 못 잡았습니다');
        return 다음(날짜, 주문들, id, 남은 - 1);
      });
    });
  }
  /* 돌려주는 값: Promise 번호 — 이 주문이 이미 가진 번호 › 바라는 번호(끊겼던 줄·예약 원번호) › 오늘 다음 번호 */
  function 잡기(id, 날짜, 바람, 주문들) {
    return 내번호(id).then(function (있) {
      if (있) return 있;
      return (바람 ? 넣기(바람, id) : Promise.resolve('')).then(function (번호) {
        return 번호 || 다음(날짜, 주문들, id, 5);
      });
    });
  }

  /* 이 주문이 이미 쓰던 번호 — 중간에 끊겨 주문 줄만 남은 것 · 예약 원본의 번호 */
  function 바람(r, 주문들) {
    var 원 = {};
    (r.원본줄들 || []).forEach(function (o) { 원[o.id] = 1; });
    var 이미 = 주문들.find(function (o) { return o.문자주문id === r.id || 원[o.id]; });
    if (이미) return String(이미.주문번호 || '').trim();
    var 첫 = (r.원본줄들 || []).find(function (o) { return String(o.주문번호 || '').trim(); });
    return 첫 ? String(첫.주문번호).trim() : '';
  }

  /* 돌려주는 값: Promise { 번호 } | { 오류 } — 손으로 누름·입금 자동 올리기·예약 자동 올리기가 다 여기로 */
  function 올리기(id, 사람) {
    var r = 자().하나(id);
    var 먼저 = 자().올리기검사(r, 사람);
    if (먼저) return Promise.resolve({ 오류: 먼저 });
    function 쓰기(번호) { return r.원본줄들 ? ZG.예약자료.되살리기(id, 번호) : 자().주문올리기(id, 사람, 번호); }
    if (!손()) return Promise.resolve(쓰기(null));
    if (도는중[id]) return Promise.resolve({ 오류: '올리는 중입니다' });
    도는중[id] = true;
    var 주문들 = ZG.저장소.읽기(ZG.저장소.키.주문);
    // 🔴 한 주문은 한 번만 — 밀린 기기가 남이 올린 줄을 또 올렸다(11/09 문수근·이옥희)
    return ZG.예약자료.서버읽기([id]).then(function (서표) {
      var 서 = 서표 && 서표[id];
      if (서 && 서.상태 === '올림') return { 오류: '이미 다른 기기에서 올린 주문입니다 — ' + (서.올린주문번호 || '') };
      return 잡기(id, ZG.ui.오늘문자(), 바람(r, 주문들), 주문들).then(쓰기);
    }).catch(function (e) {
      console.warn('주문번호를 못 잡았습니다', e);
      return { 오류: 끊김 };
    }).then(function (결) { delete 도는중[id]; return 결; });
  }

  ZG.번호장부 = { 올리기: 올리기, 잡기: 잡기 };
})(window.ZG);
