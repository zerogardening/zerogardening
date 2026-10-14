/* 08r-주문실적자료 — 주문실적 집계 (21단계 설계 §3). 화면이 없다. document 를 만지지 않는다.
   저장소는 맨 아래 읽어모으기() 한 곳에서만 읽는다 — 모으기() 는 받은 줄만 보고 계산한다(시험이 직접 부른다).
   마켓 색·순서표의 원본이다 — 08b 마켓칩과 08s·08t 그림이 모두 여기서 색을 받는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 마켓순서 = ['카페24', '쿠팡', '스마트스토어', 'G마켓', '11번가', '롯데ON', '심폴', '당근', '문자'];
  var 색표 = {
    카페24: '#1C7ED6', 쿠팡: '#E03131', 스마트스토어: '#2F9E44', G마켓: '#7048E8', '11번가': '#F76707',
    롯데ON: '#D6336C', 심폴: '#1098AD', 당근: '#F2B705', 문자: '#868E96'
  };
  var 요일 = ['일', '월', '화', '수', '목', '금', '토'];

  function 마켓색(이름) { return 색표[이름] || '#ADB5BD'; }
  function 마켓이름(r) { return String(r.판매처 || '').trim() || '기타'; }

  /* 고정 아홉을 앞에, 나머지는 받은 순서 그대로 뒤에 */
  function 마켓정렬(이름들) {
    var 앞 = 마켓순서.filter(function (m) { return 이름들.indexOf(m) >= 0; });
    return 앞.concat(이름들.filter(function (m) { return 마켓순서.indexOf(m) < 0; }));
  }

  /* ── 날짜 — 🔴 문자열을 Date 로 바로 파싱하지 않는다(UTC 로 읽혀 하루 밀린다). 늘 new Date(y, m-1, d) ── */
  function 날(글) { var p = String(글).split('-'); return new Date(+p[0], +p[1] - 1, +p[2]); }
  function 글로(d) {
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') + '-' + String(d.getDate()).padStart(2, '0');
  }
  function 더하기(글, 일) { var d = 날(글); return 글로(new Date(d.getFullYear(), d.getMonth(), d.getDate() + 일)); }
  function 짧게(글) { var d = 날(글); return (d.getMonth() + 1) + '/' + d.getDate(); }

  /* ── 칸 — 빈 날도 다 만든다. 주는 일~토(08b 「이번 주」와 같은 시작), 첫·끝 칸은 기간에서 자른다 ── */
  function 칸들(부터, 까지, 단위) {
    var 것들 = [];
    if (!부터 || !까지 || 부터 > 까지) return 것들;
    var 해넘김 = 부터.slice(0, 4) !== 까지.slice(0, 4);
    var 지금 = 부터;
    while (지금 <= 까지) {
      var d = 날(지금), 끝;
      if (단위 === '주') 끝 = 더하기(지금, 6 - d.getDay());
      else if (단위 === '월') 끝 = 글로(new Date(d.getFullYear(), d.getMonth() + 1, 0));
      else 끝 = 지금;
      if (끝 > 까지) 끝 = 까지;
      var 이름 = 단위 === '주' ? 짧게(지금) + '~' + 짧게(끝)
               : 단위 === '월' ? (해넘김 ? 지금.slice(2, 4) + '.' : '') + (d.getMonth() + 1) + '월'
               : 짧게(지금);
      것들.push({ 열쇠: 지금, 이름: 이름, 부터: 지금, 까지: 끝, 요일: 요일[d.getDay()], 일요일: 단위 === '일' && d.getDay() === 0 });
      지금 = 더하기(끝, 1);
    }
    return 것들;
  }

  /* ── 매출 줄 판정 — 금액·수량·건수가 모두 같은 대상을 본다 ── */
  function 취소인가(r) {
    var s = String(r.카페24상태 || '');
    return /취소|반품|환불/.test(s) || /^[CR]\d/.test(s);   // 상태글이 없으면 edge 가 order_status 코드를 넣는다
  }

  function 빈셈() { return { 매출: 0, 수량: 0, 건수: 0, 건: Object.create(null) }; }
  function 더함(셈, 금, 수, 건키) {
    셈.매출 += 금; 셈.수량 += 수;
    if (!셈.건[건키]) { 셈.건[건키] = 1; 셈.건수++; }
  }

  /* 조건 = { 부터, 까지, 단위, 이름표? } — 이름표는 접두 → 마스터 유통명 (읽어모으기가 채운다) */
  function 모으기(줄들, 조건) {
    var 자 = ZG.주문자료;
    var 칸 = 칸들(조건.부터, 조건.까지, 조건.단위 || '일');
    var 칸자리 = Object.create(null);
    칸.forEach(function (c, i) {
      c.매출 = 0; c.건수 = 0; c.마켓 = {}; c._건 = Object.create(null);
      for (var 지금 = c.부터; 지금 <= c.까지; 지금 = 더하기(지금, 1)) 칸자리[지금] = i;
    });

    var 합 = 빈셈(), 뺀줄 = { 서비스: 0, 취소: 0, 날짜: 0 };
    var 마켓표 = Object.create(null), 상품표 = Object.create(null), 상품순 = [];
    var 이름표 = 조건.이름표 || {};

    (줄들 || []).forEach(function (r) {
      var 그날 = 자.날짜정규화(r.주문일);
      if (!그날) { 뺀줄.날짜++; return; }
      var i = 칸자리[그날];
      if (i == null) return;                                   // 기간 밖
      if (r.서비스 === true) { 뺀줄.서비스++; return; }        // 단가가 찍혀 있어도 무료 출고다
      if (취소인가(r)) { 뺀줄.취소++; return; }

      var 금 = Number(자.금액(r)) || 0, 수 = Number(자.수량(r)) || 0, m = 마켓이름(r);
      // 한 건 = 같은 날 · 같은 마켓 · 같은 묶음키. 날과 마켓을 넣어야 일→주→월, 마켓→합계가 더하기로 맞는다
      var 건키 = 그날 + '|' + m + '|' + (r.묶음키 || 자.묶음키(r));

      더함(합, 금, 수, 건키);
      var c = 칸[i];
      c.매출 += 금;
      if (!c._건[건키]) { c._건[건키] = 1; c.건수++; }
      var cm = c.마켓[m] = c.마켓[m] || { 매출: 0, 건수: 0, _건: Object.create(null) };
      cm.매출 += 금;
      if (!cm._건[건키]) { cm._건[건키] = 1; cm.건수++; }
      더함(마켓표[m] = 마켓표[m] || 빈셈(), 금, 수, 건키);

      var 코드 = String(r.품목코드 || '');
      var 접두 = 코드 ? 코드.slice(0, 5) : '?' + (r.원본코드 || r.유통명 || '');
      var p = 상품표[접두];
      if (!p) {
        p = 상품표[접두] = { 접두: 접두, 코드: 코드 ? 접두 : '—', 이름: 이름표[접두] || r.유통명 || r.원본코드 || '(품목 없음)',
          셈: 빈셈(), 마켓: Object.create(null), 규격: Object.create(null), 규격순: [],
          추이: 칸.map(function () { return 0; }), 추이건: 칸.map(function () { return 0; }), _칸건: Object.create(null) };
        상품순.push(p);
      }
      더함(p.셈, 금, 수, 건키);
      더함(p.마켓[m] = p.마켓[m] || 빈셈(), 금, 수, 건키);
      var 규키 = 코드 || '—';
      if (!p.규격[규키]) { p.규격[규키] = 빈셈(); p.규격[규키].품목코드 = 규키; p.규격[규키].규격 = r.규격 || ''; p.규격순.push(규키); }
      더함(p.규격[규키], 금, 수, 건키);
      p.추이[i] += 금;
      if (!p._칸건[건키]) { p._칸건[건키] = 1; p.추이건[i]++; }
    });

    칸.forEach(function (c) {
      delete c._건;
      Object.keys(c.마켓).forEach(function (m) { delete c.마켓[m]._건; });
    });

    var 마켓들 = Object.keys(마켓표).map(function (m) {
      var s = 마켓표[m];
      return { 이름: m, 색: 마켓색(m), 매출: s.매출, 건수: s.건수, 수량: s.수량, 비중: 합.매출 ? s.매출 / 합.매출 : 0 };
    }).sort(function (a, b) { return b.매출 - a.매출 || b.건수 - a.건수; });

    var 상품들 = 상품순.map(function (p) {
      var 마켓 = {};
      마켓정렬(Object.keys(p.마켓)).forEach(function (m) {
        var s = p.마켓[m];
        마켓[m] = { 매출: s.매출, 수량: s.수량, 건수: s.건수, 비중: p.셈.매출 ? s.매출 / p.셈.매출 : 0 };
      });
      return {
        접두: p.접두, 코드: p.코드, 이름: p.이름, 매출: p.셈.매출, 수량: p.셈.수량, 건수: p.셈.건수, 마켓: 마켓,
        규격들: p.규격순.map(function (k) {
          var s = p.규격[k];
          return { 품목코드: s.품목코드, 규격: s.규격, 매출: s.매출, 수량: s.수량, 건수: s.건수 };
        }).sort(function (a, b) { return b.매출 - a.매출; }),
        추이: p.추이, 추이건: p.추이건
      };
    }).sort(function (a, b) { return b.매출 - a.매출 || b.수량 - a.수량; });

    return { 합계: { 매출: 합.매출, 건수: 합.건수, 수량: 합.수량 }, 뺀줄: 뺀줄, 칸들: 칸, 마켓들: 마켓들, 상품들: 상품들 };
  }

  /* 화면이 부르는 얇은 껍데기. 08a.읽기 는 올린날로 거르므로 안 쓴다 — 실적은 「언제 팔렸나」(주문일)다 */
  function 읽어모으기(조건) {
    var 저 = ZG.저장소, 이름표 = {};
    저.품목들().forEach(function (p) {
      var k = String(p.품목코드 || '').slice(0, 5);
      if (k && !이름표[k] && p.유통명) 이름표[k] = p.유통명;
    });
    return 모으기(저.읽기(저.키.주문), Object.assign({}, 조건, { 이름표: 이름표 }));
  }

  /* 이번 주·이번 달·올해는 오늘에서 끊는다 — 오지 않은 날이 0 으로 그려지면 매출이 꺾인 것처럼 보인다 */
  function 기간칩(이름, 오늘) {
    var d = 날(오늘);
    if (이름 === '이번 주') return { 부터: 더하기(오늘, -d.getDay()), 까지: 오늘 };
    if (이름 === '이번 달') return { 부터: 오늘.slice(0, 8) + '01', 까지: 오늘 };
    if (이름 === '지난달') {
      return { 부터: 글로(new Date(d.getFullYear(), d.getMonth() - 1, 1)), 까지: 글로(new Date(d.getFullYear(), d.getMonth(), 0)) };
    }
    if (이름 === '올해') return { 부터: 오늘.slice(0, 4) + '-01-01', 까지: 오늘 };
    return { 부터: 더하기(오늘, -29), 까지: 오늘 };   // 최근 30일 — 오늘 포함
  }

  ZG.주문실적 = {
    마켓순서: 마켓순서, 마켓색: 마켓색, 마켓이름: 마켓이름, 마켓정렬: 마켓정렬,
    칸들: 칸들, 취소인가: 취소인가, 모으기: 모으기, 읽어모으기: 읽어모으기, 기간칩: 기간칩,
    기간칩이름들: ['이번 주', '이번 달', '지난달', '최근 30일', '올해']
  };
})(window.ZG);
