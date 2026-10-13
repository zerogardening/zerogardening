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

  /* 🔴 08i 19·20행과 같은 글자여야 열쇠 앞머리가 맞는다 (08i 는 고치지 않는다) */
  function 이름키(v) { return 글(v).normalize('NFC').replace(/\s/g, ''); }
  function 주소압축(v) { return 글(v).normalize('NFC').replace(/[\s-]/g, ''); }
  function 숫자만(v) { return 글(v).replace(/\D/g, ''); }

  function 앞머리들(줄) {
    var 우 = 숫자만(줄.우편번호) || (주소압축(줄.수령인주소) && '주소#' + 주소압축(줄.수령인주소));
    return [이름키(줄.수령인) + '|' + 우 + '|', '홀로#' + 글(줄.주문번호) + '#'];
  }

  /* 주문조회 합계용 박스 수 — 읽기만 한다. 08b 건 ≠ 08i 송장 묶음이라 근사값이다.
     전화는 안 본다: 원본의 세 전화 중 무엇이 열쇠에 쓰였는지 주문 줄로는 못 가린다.
     🔴 한 송장이 08b 에서 두 건으로 갈릴 수 있어 같은 손질 행은 한 번만 센다 */
  function 박스세기(건들) {
    var 본행 = {}, 행들 = {}, 합 = 0;
    (건들 || []).forEach(function (g) {
      var 본합 = 0, 본있음 = false, 더합 = 0;
      (g.줄들 || []).forEach(function (줄) {
        if (!줄.묶음id) return;
        var 앞 = 앞머리들(줄);
        var 행 = 행들[줄.묶음id] || (행들[줄.묶음id] = 목록(줄.묶음id));
        행.forEach(function (r) {
          if (본행[r.id]) return;
          var 열 = 글(r.묶음열쇠);
          if (열.indexOf(앞[0]) !== 0 && 열.indexOf(앞[1]) !== 0) return;
          본행[r.id] = true;
          var n = Math.min(9, Math.max(1, 정수(r.박스수) || 1));
          if ((정수(r.차수) || 1) <= 1) { 본있음 = true; 본합 += n; } else 더합 += n;
        });
      });
      합 += (본있음 ? 본합 : 1) + 더합;
    });
    return 합;
  }

  ZG.운임손질 = {
    행id: 행id, 목록: 목록, 표: 표, 찾기: 찾기,
    다음차수: 다음차수, 저장: 저장, 지우기: 지우기, 박스세기: 박스세기
  };
})(window.ZG);
