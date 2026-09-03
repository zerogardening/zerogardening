/* 08q-당근 — 당근마켓 주문내역 파일 자료층. 화면 없다. 08j-심폴 과 같은 수를 쓴다.
   당근 14칸을 카페24 27칸으로 세워 주면 08h·08i 가 지금 길 그대로 돈다.

   🔴 당근 파일에는 **수량 칸이 아예 없다.** 14칸 어디에도 없어 전부 1개로 넣는다.
      상품명의 「3개」는 게시글 이름(3포기 한 묶음)이지 주문 개수가 아니다.
   🔴 상품코드도 없다. 그래서 짝(ZG.짝)의 열쇠를 **상품명**으로 쓴다 —
      당근 게시글 제목이 곧 원본코드다. 제목을 고치시면 짝이 풀리고 다시 지으셔야 한다.
   🔴 자동 매칭은 안 한다(08j 와 같은 이유) — 유통명이 같은 품목이 여럿이라 엉뚱한 게 나간다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  function 글(v) { return String(v == null ? '' : v); }
  function 다듬기(v) { return 글(v).trim(); }

  /* 「당근 닉네임(유저 id)」·「현관 출입 방법」처럼 공백과 괄호 설명이 붙는다 — 떼고 본다 */
  function 당근키(v) { return 글(v).replace(/\s/g, '').replace(/\(.*$/, ''); }

  var 당근필수 = ['주문번호', '주문일시', '상품명', '주문자명', '배송주소'];

  /* 카페24 27칸 ← 당근 칸. null 은 빈 칸으로 둔다 */
  var 지도 = [
    '@당근', null, '주문번호', '@일자', '상품명', '@상품명키', '@빈', '@상품명키',
    null, null, '주문상태', '가격', '@하나', '주문자명', '우편번호', '배송주소',
    null, null, '@연락처', '@요청', '주문자명', null, null,
    null, '@연락처', null, null
  ];

  function 감지(머리행) {
    var 자리 = {};
    (머리행 || []).forEach(function (v, i) {
      var 이름 = 당근키(v);
      if (이름 && 자리[이름] == null) 자리[이름] = i;
    });
    var 없는 = 당근필수.filter(function (k) { return 자리[k] == null; });
    return 없는.length ? null : { 자리: 자리 };
  }

  /* 「2026-09-02 17:22」 — 08h.날짜만들기 가 그대로 받는 모양이다. 날짜만 떼어 넘긴다 */
  function 날짜글(v) {
    if (v instanceof Date) return v;
    var m = 다듬기(v).match(/^(\d{4})[-.\/](\d{1,2})[-.\/](\d{1,2})/);
    if (!m) return 다듬기(v);   // 못 알아보면 그대로 — 08h 가 「날짜오류」 갈래로 걸러 보여준다
    return m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0');
  }

  /* 실물은 글자로 온다. 혹시 숫자로 읽히면 앞 0 이 날아가므로 되살린다 */
  function 전화글(v) {
    if (typeof v === 'number') return String(v).padStart(11, '0');
    return 다듬기(v);
  }

  function 바꾸기(행들, 당) {
    var 자리 = 당.자리;
    function 값(행, 이름) {
      var i = 자리[이름];
      var v = i == null ? '' : ((행 || [])[i] == null ? '' : 행[i]);
      return typeof v === 'string' ? v.trim() : v;
    }
    var 새행들 = [[]];   // 0번은 빈 머리행 — 08h 의 `for (i = 1; …)` 에 자리를 맞춘다
    for (var i = 1; i < 행들.length; i++) {
      var 행 = 행들[i] || [];
      /* 🔴 빈 줄은 빈 줄로 넘긴다 — 0번 칸에 '당근'을 박으면 08h.빈행인가 를 못 지나간다 */
      if (행.every(function (c) { return 다듬기(c) === ''; })) { 새행들.push([]); continue; }
      var 상품명 = 다듬기(값(행, '상품명'));
      var 요청 = [다듬기(값(행, '요청사항')), 다듬기(값(행, '현관출입방법'))]
        .filter(function (s) { return s; }).join(' / ');
      새행들.push(지도.map(function (열) {
        if (열 == null || 열 === '@빈') return '';
        if (열 === '@당근') return '당근';
        if (열 === '@하나') return 1;
        if (열 === '@일자') return 날짜글(값(행, '주문일시'));
        if (열 === '@상품명키') return 상품명;
        if (열 === '@연락처') return 전화글(값(행, '연락처'));
        if (열 === '@요청') return 요청;
        return 값(행, 열);
      }));
    }
    /* 27칸을 표준 순서로 세웠으므로 자리표는 항등표다 — 08h 의 원본27()·칸글() 이 그대로 돈다 */
    var 항등 = {};
    ZG.주문올리기.칸이름들().forEach(function (이름, n) { if (항등[이름] == null) 항등[이름] = n; });
    return { 행들: 새행들, 자리: 항등 };
  }

  ZG.당근 = { 감지: 감지, 바꾸기: 바꾸기, 날짜글: 날짜글 };
})(window.ZG);
