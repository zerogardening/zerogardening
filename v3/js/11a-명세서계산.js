/* 11a-명세서계산 — 단가·할인·단위정리·합계·NO (3단계 설계 §4). 화면은 없다.
   식은 업무규칙 §3 「명세서 단가」와 app.html calcDiscountedPrice 그대로다. 한 글자도 바꾸지 않는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  function 할인율자르기(값) {
    return Math.max(-200, Math.min(99, Number(값) || 0));
  }

  /* 단가 = (매입단가 × 2) × (1 − 할인율/100) → 100원 반올림.
     매입단가가 0이면 계산하지 않는다 — 사용자가 직접 넣는다 */
  function 단가(매입단가, 할인율) {
    var 매 = Number(매입단가) || 0;
    if (!매) return 0;
    var d = 할인율자르기(할인율);
    return Math.round((매 * 2 * (1 - d / 100)) / 100) * 100;
  }

  /* 할인율을 바꿨을 때 이미 들어간 줄을 다시 매긴다.
     매입단가가 없는 줄(직접 입력·미등록)은 옛 할인 대비 비율로 환산한다 */
  function 할인다시(줄들, 옛할인, 새할인) {
    var 옛배 = 1 - (Number(옛할인) || 0) / 100;
    var 새배 = 1 - (Number(새할인) || 0) / 100;
    var 비율됨 = 옛배 !== 0 && isFinite(새배 / 옛배);
    줄들.forEach(function (줄) {
      if (줄.매입단가 > 0) {
        줄.단가 = 단가(줄.매입단가, 새할인);
      } else if (비율됨) {
        var 조정 = (Number(줄.단가) || 0) * (새배 / 옛배);
        줄.단가 = Math.max(0, Math.round(조정 / 100) * 100);
      }
    });
  }

  function 단위맞추기(값, 단위, 방식) {
    var v = Number(값) || 0, u = Number(단위) || 1;
    if (u <= 0) return v;
    if (방식 === '올림') return Math.ceil(v / u) * u;
    if (방식 === '내림') return Math.floor(v / u) * u;
    return Math.round(v / u) * u;
  }

  function 단위정리(줄들, 단위, 방식) {
    줄들.forEach(function (줄) { 줄.단가 = 단위맞추기(줄.단가, 단위, 방식); });
  }

  /* 면세는 언제나 세액 0이다 */
  function 줄세액(줄) {
    var 공급 = (Number(줄.수량) || 0) * (Number(줄.단가) || 0);
    return 줄.과세구분 === '과세' ? Math.round(공급 * 0.1) : 0;
  }

  function 합계(줄들) {
    var 수량 = 0, 공급가액 = 0, 세액 = 0;
    (줄들 || []).forEach(function (줄) {
      수량 += Number(줄.수량) || 0;
      공급가액 += (Number(줄.수량) || 0) * (Number(줄.단가) || 0);
      세액 += 줄세액(줄);
    });
    return { 수량: 수량, 공급가액: 공급가액, 세액: 세액, 합계: 공급가액 + 세액 };
  }

  /* NO = YYYYMMDD-HHmm (발행 시각) */
  function 번호만들기() {
    var d = new Date();
    function 두자리(n) { return String(n).padStart(2, '0'); }
    return d.getFullYear() + 두자리(d.getMonth() + 1) + 두자리(d.getDate()) +
      '-' + 두자리(d.getHours()) + 두자리(d.getMinutes());
  }

  /* 인쇄 파일명 = YYYY-MM-DD_업체명_NN (같은 날 같은 업체로 이미 저장된 건수 + 1) */
  function 인쇄파일명(작성일, 업체명) {
    var 날 = 작성일 || ZG.ui.오늘문자();
    var 이름 = String(업체명 || '').trim() || '미정';
    var 안전이름 = 이름.replace(/[\\/:*?"<>|]/g, '_').replace(/\s+/g, ' ').trim();
    var 이미 = ZG.업체자료.명세서목록().filter(function (s) {
      return (s.작성일 || '') === 날 && String((s.받는곳 && s.받는곳.이름) || '').trim() === 이름;
    }).length;
    return 날 + '_' + 안전이름 + '_' + String(이미 + 1).padStart(2, '0');
  }

  ZG.명세서계산 = {
    할인율자르기: 할인율자르기, 단가: 단가, 할인다시: 할인다시,
    단위맞추기: 단위맞추기, 단위정리: 단위정리,
    줄세액: 줄세액, 합계: 합계, 번호만들기: 번호만들기, 인쇄파일명: 인쇄파일명
  };
})(window.ZG);
