/* 08y-재구매자료 — 주문실적 「재구매」 집계 (30단계 설계). 화면이 없다. document 를 만지지 않는다.
   🔴 누적이다 — 기간 칩과 상관없이 첫 주문부터 지금까지(우람님 10/21).
   🔴 손님·산 날 규칙은 08a 손님키·산줄인가 한 곳 — 송장 ★와 같은 숫자여야 한다.
   모으기() 는 받은 줄만 본다(시험이 직접 부른다). 저장소는 맨 아래 읽어모으기() 한 곳. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  function 마켓(r) { return ZG.실적이익.이익마켓(ZG.주문실적.마켓이름(r)); }
  function 마켓색(m) { return ZG.주문실적.마켓색(m === '문자·당근·전화' ? '당근' : m); }
  function 늦은순(a, b) {
    return a.날 < b.날 ? -1 : a.날 > b.날 ? 1 :
      String(a.r.주문시각 || '') < String(b.r.주문시각 || '') ? -1 : String(a.r.주문시각 || '') > String(b.r.주문시각 || '') ? 1 :
      (a.r.등록일시 || 0) - (b.r.등록일시 || 0);
  }

  /* 이익조건 = 08w 조건읽기() 꼴 — 주면 27단계 송장 이익을 손님별로 더한다 */
  function 모으기(줄들, 이익조건) {
    var 자 = ZG.주문자료, 표 = Object.create(null), 손순 = [], 못셈 = 0;
    var 산 = [];
    (줄들 || []).forEach(function (r) {
      if (!자.산줄인가(r)) return;
      var 날 = 자.날짜정규화(r.주문일), 키 = 자.손님키(r);
      if (!날 || !키) { 못셈++; return; }
      산.push({ r: r, 날: 날, 키: 키 });
    });
    산.sort(늦은순).forEach(function (x) {
      var 손 = 표[x.키], m = 마켓(x.r);
      if (!손) {
        손 = 표[x.키] = { 키: x.키, 첫날: x.날, 첫마켓: m, 날들: {}, 마켓날: {}, 뒤마켓: {}, 매출: 0, 이익: 0, 이익있음: false, 잠정: false };
        손순.push(손);
      }
      손.날들[x.날] = 1;
      (손.마켓날[m] = 손.마켓날[m] || {})[x.날] = 1;
      if (x.날 > 손.첫날) 손.뒤마켓[m] = 1;
      손.매출 += Number(자.금액(x.r)) || 0;
      손.이름 = String(x.r.수령인 || '').trim(); 손.주소 = String(x.r.수령인주소 || '').trim(); 손.최근 = x.날;   // 마지막 수령지
    });

    if (이익조건 && 산.length) 이익더하기(줄들, 이익조건, 표, 산[0].날, 산[산.length - 1].날);

    var 분포 = [0, 0, 0, 0, 0], 마표 = Object.create(null);
    function 칸(m) { return 마표[m] = 마표[m] || { 이름: m, 색: 마켓색(m), 첫: 0, 재: 0, 같은: 0, 나감: 0, 들어옴: 0 }; }
    손순.forEach(function (손) {
      손.회차 = Object.keys(손.날들).length;
      분포[Math.min(손.회차, 5) - 1]++;
      손.주로 = Object.keys(손.마켓날).sort(function (a, b) {
        return Object.keys(손.마켓날[b]).length - Object.keys(손.마켓날[a]).length;
      })[0];
      손.주로색 = 마켓색(손.주로);
      var c = 칸(손.첫마켓), 딴데 = Object.keys(손.뒤마켓).filter(function (m) { return m !== 손.첫마켓; });
      c.첫++;
      if (손.회차 >= 2) { c.재++; if (딴데.length) c.나감++; else c.같은++; }
      딴데.forEach(function (m) { 칸(m).들어옴++; });
    });
    var 마켓들 = Object.keys(마표).map(function (m) { var c = 마표[m]; c.율 = c.첫 ? c.재 / c.첫 : null; return c; });
    마켓들 = ZG.주문실적.마켓정렬(마켓들.map(function (c) { return c.이름; }), function (m) { return 마표[m].첫; })
      .map(function (m) { return 마표[m]; });
    var 합 = { 첫: 손순.length, 재: 0, 같은: 0, 나감: 0, 들어옴: 0 };
    마켓들.forEach(function (c) { ['재', '같은', '나감', '들어옴'].forEach(function (k) { 합[k] += c[k]; }); });
    합.율 = 합.첫 ? 합.재 / 합.첫 : null;

    return {
      손님수: 손순.length, 재구매수: 합.재, 율: 합.율, 분포: 분포, 못셈: 못셈, 마켓들: 마켓들, 합: 합,
      손님들: 손순.filter(function (손) { return 손.회차 >= 2; })
    };
  }

  /* 27단계 이익은 송장(08r 건) 단위다 — 송장마다 손님을 찾아 더한다. 매입가 없는 송장은 빼고 「잠정」, 심폴 미상도 「잠정」 */
  function 이익더하기(줄들, 이익조건, 표, 부터, 까지) {
    var 결 = ZG.주문실적.모으기(줄들, { 부터: 부터, 까지: 까지, 단위: '월', 이익: 이익조건 });
    (결.이익 && 결.이익.건들 || []).forEach(function (g) {
      var 손 = 표[ZG.주문자료.손님키(g.줄들[0])], c = g.셈;
      if (!손 || !c) return;
      if (c.없음 || c.미상) 손.잠정 = true;
      if (c.없음) return;
      손.이익 += c.이익; 손.이익있음 = true;
    });
  }

  function 읽어모으기() {
    var 저 = ZG.저장소;
    return 모으기(저.읽기(저.키.주문), ZG.실적이익 ? ZG.실적이익.조건읽기() : null);
  }

  ZG.재구매 = { 모으기: 모으기, 읽어모으기: 읽어모으기 };
})(window.ZG);
