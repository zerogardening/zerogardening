/* 01-저장소 — localStorage 읽기/쓰기 (설계 §3)
   표마다 키 하나. 한 덩어리 JSON 은 만들지 않는다.
   쓰기는 언제나 「다시 읽기 → 한 건만 손대기 → 쓰기」다.
   다른 탭이 그 사이에 넣은 것을 지우지 않기 위해서다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 키 = {
    품목:     'zg.v3.품목',
    입고:     'zg.v3.입고',
    출고:     'zg.v3.출고',
    재고조정: 'zg.v3.재고조정',
    업체:     'zg.v3.업체',
    주문:     'zg.v3.주문',
    주문묶음: 'zg.v3.주문묶음',
    설정:     'zg.v3.설정',
    동봉카드설정: 'zg.v3.동봉카드설정'   // 카드 문구·글자수 상한. 표가 아니라 객체 하나다
  };
  var 스키마버전 = 3;   // 3 — 목데이터에 식물 특성 추가(동봉카드가 빈 채로 뜨던 것). 올리면 기존 목데이터를 지우고 다시 심는다

  function 객체키인가(k) { return k === 키.설정 || k === 키.동봉카드설정; }

  function 읽기(k) {
    var 빈값 = 객체키인가(k) ? {} : [];
    var 원문;
    try { 원문 = localStorage.getItem(k); } catch (e) { console.warn('저장소를 못 읽었습니다', k, e); return 빈값; }
    if (원문 == null) return 빈값;
    try {
      var 값 = JSON.parse(원문);
      if (객체키인가(k)) return (값 && typeof 값 === 'object') ? 값 : {};
      return Array.isArray(값) ? 값 : [];
    } catch (e) {
      console.warn('저장소 값이 깨졌습니다 — 빈 값으로 봅니다', k, e);
      return 빈값;
    }
  }

  function 쓰기(k, 값) {
    try { localStorage.setItem(k, JSON.stringify(값)); }
    catch (e) { console.warn('저장소에 못 썼습니다', k, e); }
  }

  function 덧붙이기(k, 레코드) {
    var 목록 = 읽기(k);
    목록.push(레코드);
    쓰기(k, 목록);
    return 레코드;
  }

  function 바꾸기(k, id, 변경) {
    var 목록 = 읽기(k);
    var 대상 = 목록.find(function (r) { return (r.id || r.품목코드) === id; });
    if (!대상) return null;
    Object.assign(대상, 변경);
    쓰기(k, 목록);
    return 대상;
  }

  /* 원본 레코드를 실제로 지운다. 상쇄 레코드를 따로 만들지 않는다 —
     현재고가 입고 합산으로 계산되므로 지운 만큼 저절로 빠진다 (설계 §16-1) */
  function 지우기(k, id) {
    var 목록 = 읽기(k);
    var 자리 = 목록.findIndex(function (r) { return (r.id || r.품목코드) === id; });
    if (자리 < 0) return false;
    목록.splice(자리, 1);
    쓰기(k, 목록);
    return true;
  }

  function 설정읽기() { return 읽기(키.설정); }

  function 설정쓰기(변경) {
    var s = 설정읽기();
    Object.assign(s, 변경);
    쓰기(키.설정, s);
    return s;
  }

  function 동봉카드설정읽기() { return 읽기(키.동봉카드설정); }

  function 동봉카드설정쓰기(변경) {
    var s = 동봉카드설정읽기();
    Object.assign(s, 변경);
    쓰기(키.동봉카드설정, s);
    return s;
  }

  function 전부지우기() {
    Object.keys(키).forEach(function (이름) {
      try { localStorage.removeItem(키[이름]); } catch (e) { console.warn(e); }
    });
  }

  function 부팅() {
    var 초기화요청 = /[?&]reset=1\b/.test(location.search);
    if (초기화요청) 전부지우기();

    var 설정 = 설정읽기();
    if (초기화요청 || 설정.스키마버전 !== 스키마버전 || 설정.시드완료 !== true) {
      ZG.시드.심기();
      설정쓰기({ 스키마버전: 스키마버전, 시드완료: true, 마지막입고업체: '한아름농원' });
    }
  }

  ZG.저장소 = {
    키: 키,
    스키마버전: 스키마버전,
    읽기: 읽기,
    덧붙이기: 덧붙이기,
    바꾸기: 바꾸기,
    지우기: 지우기,
    전체쓰기: 쓰기,
    설정읽기: 설정읽기,
    설정쓰기: 설정쓰기,
    동봉카드설정읽기: 동봉카드설정읽기,
    동봉카드설정쓰기: 동봉카드설정쓰기,
    전부지우기: 전부지우기,
    부팅: 부팅
  };
})(window.ZG);
