/* 02-품목코드 — 학명 정규화 · 앞3자 · 일련번호 · 중복판정 · 규격 (설계 §6) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  // 실데이터에 따옴표가 세 종류 섞여 있다. 정규화 없이는 같은 식물을 다른 식물로 본다
  function 학명정규화(원문) {
    var s = String(원문 == null ? '' : 원문);
    s = s.replace(/[‘’´`]/g, "'");
    // × 는 앞뒤 공백째로, ASCII x 는 홀로 선 것만 — "Salix alba" 가 망가지면 안 된다
    s = s.replace(/\s*×\s*/g, ' x ');
    s = s.replace(/\s+x\s+/g, ' x ');
    s = s.normalize('NFD').replace(/[̀-ͯ]/g, '');
    s = s.replace(/\s+/g, ' ').trim();
    return s;
  }

  function 학명키(원문) { return 학명정규화(원문).toLowerCase(); }

  function 학명3자(학명) {
    var s = 학명정규화(학명);
    var 품종맞음 = s.match(/'([^']+)'/);
    var 품종 = 품종맞음 ? 품종맞음[1].trim() : '';
    var 속명 = (s.split(' ')[0] || '').replace(/[^A-Za-z]/g, '');

    var 코드;
    if (품종 && /^[A-Za-z]/.test(품종)) 코드 = 속명.slice(0, 2) + 품종.charAt(0);
    else 코드 = 속명.slice(0, 3);

    코드 = 코드.toUpperCase();
    while (코드.length < 3) 코드 += 'X';   // 속명이 2자 미만인 이상값 방어
    return 코드;
  }

  var 치환표 = { 4: 10, 5: 15, 6: 18, 7: 21, 9: 27 };

  function 규격정규화(입력) {
    var 원문 = String(입력 == null ? '' : 입력).trim();

    // 부분 추출은 「1년생」·「15.5」·「abc12」를 통과시킨다. 전체일치만 받는다 (설계 §6-4)
    var 치맞음 = 원문.match(/^(\d{1,3})\s*치$/);
    if (치맞음) {
      var 치수 = parseInt(치맞음[1], 10);
      var 치cm = 치환표[치수];
      if (!치cm) return { 오류: 치수 + '치는 알 수 없는 규격입니다 — cm 로 넣어주세요' };
      return { 규격cm: 치cm, 규격: 치cm + 'cm 포트' };
    }

    // 이 함수가 내놓은 「10cm 포트」를 다시 넣어도 그대로 통과해야 한다 (재고수정 칸이 되먹인다)
    var 숫자맞음 = 원문.match(/^(\d{1,3})(?:\s*cm(?:\s*포트)?)?$/);
    if (!숫자맞음) return { 오류: '규격은 숫자만 넣어주세요 — 10 · 15 처럼 cm 숫자로 넣어주세요' };

    var cm = parseInt(숫자맞음[1], 10);
    if (!(cm >= 1 && cm <= 999)) return { 오류: '규격은 1~999cm 사이여야 합니다' };
    return { 규격cm: cm, 규격: cm + 'cm 포트' };
  }

  function 다음번호(같은3자) {
    var 최대 = 0;
    같은3자.forEach(function (p) {
      var n = parseInt(p.일련번호, 10);
      if (!isNaN(n) && n > 최대) 최대 = n;
    });
    if (최대 >= 99) return null;              // 꽉 찼다
    return String(최대 + 1).padStart(2, '0');
  }

  /* 코드계산 — 이 화면의 핵심 로직 (설계 §6-5)
     반환 상태: "새것" | "이미있음" | "확인필요" | "오류" */
  function 코드계산(학명, 규격cm, 품목목록) {
    var 세자 = 학명3자(학명);
    var 키 = 학명키(학명);
    var 같은3자 = 품목목록.filter(function (p) { return p.학명3 === 세자; });
    var 같은식물 = 같은3자.filter(function (p) { return p.학명키 === 키; });

    // 갈래 A — 같은 식물이 이미 있다
    if (같은식물.length) {
      var 번호 = 같은식물[0].일련번호;
      var 코드 = 세자 + 번호 + '-' + 규격cm;
      var 기존 = 같은식물.find(function (p) { return p.규격cm === 규격cm; });
      if (기존) return { 상태: '이미있음', 코드: 코드, 기존품목: 기존 };

      var 다음 = 다음번호(같은3자);
      if (!다음) return { 상태: '오류', 메시지: 세자 + ' 의 일련번호가 꽉 찼습니다' };
      return {
        상태: '확인필요', 확정코드: 코드, 대안코드: 세자 + 다음 + '-' + 규격cm,
        충돌: 같은식물, 접두: 세자 + 번호, 기본선택: '같은식물',
        번호같음: 번호, 번호다름: 다음
      };
    }

    // 갈래 B — 앞 3자만 같고 학명이 다르다. 반드시 물어본다
    if (같은3자.length) {
      var 번호목록 = 같은3자.map(function (p) { return p.일련번호; })
        .sort().filter(function (v, i, a) { return a.indexOf(v) === i; });
      var 마지막 = 번호목록[번호목록.length - 1];
      var 다음B = 다음번호(같은3자);
      if (!다음B) return { 상태: '오류', 메시지: 세자 + ' 의 일련번호가 꽉 찼습니다' };
      return {
        상태: '확인필요', 확정코드: 세자 + 마지막 + '-' + 규격cm, 대안코드: 세자 + 다음B + '-' + 규격cm,
        충돌: 같은3자, 접두: 세자 + 마지막, 기본선택: null,
        번호같음: 마지막, 번호다름: 다음B
      };
    }

    // 갈래 C — 완전히 새 식물
    return { 상태: '새것', 코드: 세자 + '01-' + 규격cm };
  }

  ZG.품목코드 = {
    학명정규화: 학명정규화,
    학명키: 학명키,
    학명3자: 학명3자,
    규격정규화: 규격정규화,
    다음번호: 다음번호,
    코드계산: 코드계산
  };
})(window.ZG);
