/* 08o-운임손질 — 로젠 박스운임 손질값 (10단계 설계 §3)
   손질 하나 = 행 하나. 한 덩어리 JSON 을 만들지 않는다.

   🔴 합계(단가 × 박스수)는 저장하지 않는다 — 파생값이라 두 벌이 되면 반드시 어긋난다.
      J열은 08i 가 읽을 때 곱한다.
   🔴 id 앞머리가 회차(묶음id)다. 그래서 손질은 「그 회차에만」 붙는다.
   🔴 차수 1 = 원래 묶음 · 2↑ = 「송장 한 장 더」(§6). 박스수와는 아무 상관이 없다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  function 키() { return ZG.저장소.키.운임손질; }
  function 글(v) { return String(v == null ? '' : v); }
  function 정수(v) { var n = Math.floor(Number(v)); return isFinite(n) ? n : 0; }

  function 행id(묶음id, 열쇠, 차수) {
    var n = 정수(차수) || 1;
    return 글(묶음id) + '#' + 글(열쇠) + (n > 1 ? '#' + n : '');
  }

  function 목록(묶음id) {
    if (!묶음id) return [];
    return ZG.저장소.읽기(키()).filter(function (r) { return r && r.묶음id === 묶음id; });
  }

  /* 08i 가 한 번만 읽어 쓰는 맵 — { 본: {열쇠:행}, 더: {열쇠:[행…차수순]} } */
  function 표(묶음id) {
    var 본 = {}, 더 = {};
    목록(묶음id).forEach(function (r) {
      var 차 = 정수(r.차수) || 1;
      if (차 <= 1) 본[r.묶음열쇠] = r;
      else (더[r.묶음열쇠] = 더[r.묶음열쇠] || []).push(r);
    });
    Object.keys(더).forEach(function (k) {
      더[k].sort(function (a, b) { return (정수(a.차수) - 정수(b.차수)); });
    });
    return { 본: 본, 더: 더 };
  }

  function 찾기(묶음id, 열쇠, 차수) {
    var id = 행id(묶음id, 열쇠, 차수);
    return 목록(묶음id).filter(function (r) { return r.id === id; })[0] || null;
  }

  function 다음차수(묶음id, 열쇠) {
    var 최대 = 1;
    목록(묶음id).forEach(function (r) {
      if (r.묶음열쇠 !== 열쇠) return;
      var n = 정수(r.차수) || 1;
      if (n > 최대) 최대 = n;
    });
    return 최대 + 1;
  }

  /* 단가 0 = 「아직 안 정함」 — 08i 가 자동값을 그대로 쓴다(확인요망도 그대로 나간다) */
  function 저장(묶음id, 열쇠, 차수, 값) {
    var 저 = ZG.저장소, 때 = Date.now();
    var n = 정수(차수) || 1;
    var id = 행id(묶음id, 열쇠, n);
    var 몸 = {
      묶음id: 묶음id, 묶음열쇠: 열쇠, 차수: n,
      수령인: 글(값.수령인),
      단가: Math.max(0, 정수(값.단가)),
      박스수: Math.min(9, Math.max(1, 정수(값.박스수) || 1)),
      자동값: 글(값.자동값), 고친때: 때
    };
    if (찾기(묶음id, 열쇠, n)) return 저.바꾸기(키(), id, 몸);
    몸.id = id; 몸.만든때 = 때;
    return 저.덧붙이기(키(), 몸);
  }

  function 지우기(묶음id, 열쇠, 차수) {
    return ZG.저장소.지우기(키(), 행id(묶음id, 열쇠, 차수));
  }

  ZG.운임손질 = {
    행id: 행id, 목록: 목록, 표: 표, 찾기: 찾기,
    다음차수: 다음차수, 저장: 저장, 지우기: 지우기
  };
})(window.ZG);
