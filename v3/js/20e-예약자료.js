/* 20e-예약자료 — 예약주문 판정·묶기 (18단계 설계 §3-2). 화면은 없다.
   예약은 v3_문자주문 한 줄의 칸(예약·예약일)이다 — 새 표가 없다. r.날짜(받은 날)는 건드리지 않는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui;
  function 자() { return ZG.문자주문자료; }

  function 날로(날) { return new Date(Number(날.slice(0, 4)), Number(날.slice(5, 7)) - 1, Number(날.slice(8, 10))); }
  // 서머타임이 없어 반올림이면 하루 길이가 어긋나지 않는다
  function 날수(날) { return Math.round((날로(날) - 날로(u.오늘문자())) / 86400000); }
  function 때됨(날) { return !!날 && 날 <= u.오늘문자(); }
  function D글(날) {
    var n = 날수(날);
    return n === 0 ? '오늘' : n > 0 ? 'D-' + n : 'D+' + (-n);
  }
  function 지난글(날) {
    var n = -날수(날);
    return n <= 0 ? '오늘' : n === 1 ? '어제' : n + '일 전';
  }

  function 순(가, 나) { return 가 < 나 ? -1 : 가 > 나 ? 1 : 0; }
  /* 날짜로 거르지 않는다 — 예약은 받은 날과 상관없이 한 곳에 모인다 */
  function 예약목록() {
    var 예약들 = 자().전부().filter(자().예약중);
    function 등록순(a, b) { return (a.등록일시 || 0) - (b.등록일시 || 0); }
    return {
      지정: 예약들.filter(function (r) { return r.예약일; })
        .sort(function (a, b) { return 순(a.예약일, b.예약일) || 등록순(a, b); }),
      미정: 예약들.filter(function (r) { return !r.예약일; })
        .sort(function (a, b) { return 순(String(a.날짜), String(b.날짜)) || 등록순(a, b); })
    };
  }
  function 예약점표(달) {
    var 표 = {};
    자().전부().forEach(function (r) {
      if (자().예약중(r) && r.예약일 && r.예약일.slice(0, 7) === 달) 표[r.예약일] = true;
    });
    return 표;
  }

  ZG.예약자료 = { 날수: 날수, 때됨: 때됨, D글: D글, 지난글: 지난글, 예약목록: 예약목록, 예약점표: 예약점표 };
})(window.ZG);
