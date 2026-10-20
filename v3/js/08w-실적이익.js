/* 08w-실적이익 — 주문실적 「이익」 계산 (27단계 설계 §1·§2). 화면이 없다. document 를 만지지 않는다.
   값·규칙(수수료율·박스비·부자재비·택배비·11번가 고침)은 아래 기본값 한 곳에 둔다 — 우람님이 나중에 바꾸신다.
   셈() 은 08r 모으기() 가 넘겨 준 줄만 계산한다. 저장소는 맨 아래 조건읽기() 한 곳에서만 읽는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 직거래이름 = '문자·당근·전화';
  var 기본값 = {
    // 순서 = 수수료율 창 순서. 확정이 아닌 줄은 화면에 「추정」 — 공개 자료 기준이라 정산서로 고쳐야 한다(조사 §2)
    수수료: [
      { 마켓: '쿠팡', 판매: 11.4, 배송비: 3.3, 확인: 'WING 확인 필요', 급: 'y' },
      { 마켓: '스마트스토어', 판매: 6.36, 배송비: 3.63, 판매글: '판매 2.73 + 페이 3.63', 배송비글: '페이만', 확인: '매출구간 따라 더 낮을 수 있음', 급: 'y' },
      { 마켓: 'G마켓', 판매: 13, 배송비: 3.3, 확인: 'ESM 확인 필요', 급: 'r' },
      { 마켓: '11번가', 판매: 13, 배송비: 3.3, 확인: '확인 필요', 급: 'r' },
      { 마켓: '롯데ON', 판매: 12, 배송비: 0, 판매글: '임시', 배송비글: '별도 부과 없음', 확인: '확인 필요', 급: 'r' },
      { 마켓: '카페24', 판매: 3.3, 배송비: 3.3, 판매글: 'PG', 배송비글: 'PG', 확인: '영세 우대면 1.6~2.3', 급: 'y' },
      { 마켓: '심폴', 판매: 10, 배송비: null, 배송비글: '배송비 미상', 확정: true },   // 우람님 10/21
      { 마켓: 직거래이름, 판매: 0, 배송비: 0, 판매글: '직거래', 확정: true }
    ],
    박스비: [[2750, 770], [3300, 1220], [Infinity, 1500]],   // [송장 한 장 운임 이하, 박스비] — 2,750 · 3,300 · 4,000 (우람님 10/21)
    부자재비: 200,                                    // 판매 단위(주문수량) 1개당
    택배비: { 기본: 2750, 큰: 3300, 큰점수: 9 },     // 08i 재기() 와 같은 식 — ≥12 「확인요망」도 큰 값으로 친다
    배송비고침: { '11번가': { '45000': 4500 } },     // 원본[26] 자리 밀림 (우람님 10/21)
    직거래: ['당근', '문자', '전화주문']
  };

  /* 저장된 값(바꾼 것만)을 기본값 위에 얹는다 */
  function 설정(저장) {
    저장 = 저장 || {};
    var 바꾼 = 저장.수수료 || {};
    var s = {
      수수료: 기본값.수수료.map(function (d) {
        var b = 바꾼[d.마켓] || {};
        return Object.assign({}, d, {
          판매: 수(b.판매) != null ? 수(b.판매) : d.판매,
          배송비: d.배송비 == null ? null : (수(b.배송비) != null ? 수(b.배송비) : d.배송비)
        });
      })
    };
    ['박스비', '부자재비', '택배비', '배송비고침', '직거래'].forEach(function (k) { s[k] = 저장[k] != null ? 저장[k] : 기본값[k]; });
    s.율 = {};
    s.수수료.forEach(function (d) { s.율[d.마켓] = d; });
    return s;
  }
  function 수(v) { if (v == null || v === '') return null; var n = Number(v); return isFinite(n) ? n : null; }

  function 이익마켓(m, s) { return (s || 기본값).직거래.indexOf(m) >= 0 ? 직거래이름 : m; }
  function 색(m) { return m === 직거래이름 ? ZG.주문실적.마켓색('당근') : ZG.주문실적.마켓색(m); }

  /* 받은 배송비 — null 이면 모른다(미상). 주문 하나에 한 번만 센다(열쇠는 부르는 쪽)
     🔴 쿠팡은 택배비가 상품가에 녹아 있어 늘 0 이다 (우람님 10/21) — 8월 전 주문은 원본 칸이 없고 7,000 찍힌 줄도 있다 */
  function 받은값(r, 마켓, 조) {
    if (마켓 === '쿠팡') return 0;
    if (r.문자주문id) { var v = 조.문자배송비[r.문자주문id]; return v == null ? null : Number(v) || 0; }
    var 글 = String(r.원본 && r.원본[26] != null ? r.원본[26] : '').trim();
    if (!글) return null;
    if (글 === '무료') return 0;
    var n = Number(글.replace(/,/g, ''));
    if (!isFinite(n)) return null;
    var 고침 = (조.설정.배송비고침[마켓] || {})[String(n)];
    return 고침 != null ? 고침 : n;
  }
  function 주문열쇠(r, i) {
    return r.문자주문id ? '문' + r.문자주문id : (r.주문번호 ? '번' + r.주문번호 : '줄' + i);
  }

  /* 낸 택배비 — 송장 장마다의 운임 목록. 운임손질이 있으면 그 값 × 박스수, 없으면 한 장 */
  function 장들(g, 조, 쓴행) {
    var 택 = 조.설정.택배비, 자 = ZG.주문자료, 로 = ZG.로젠파일, 점 = 0;
    g.줄들.concat(g.덤).forEach(function (r) { 점 += 로.점수(로.cm뽑기(r.품목코드)) * (자.수량(r) || 0); });
    var 자동 = 점 >= 택.큰점수 ? 택.큰 : 택.기본;
    var 본 = [], 더 = [], 손 = ZG.운임손질;
    if (손 && 손.앞머리들) {
      g.줄들.forEach(function (r) {
        var 앞 = 손.앞머리들(r);
        (조.손질[r.묶음id] || []).forEach(function (h) {
          var 열 = String(h.묶음열쇠 || '');
          if (쓴행[h.id] || (열.indexOf(앞[0]) !== 0 && 열.indexOf(앞[1]) !== 0)) return;
          쓴행[h.id] = 1;   // 한 송장이 08r 에서 두 건(마켓 둘)으로 갈려도 손질 행은 한 번만
          ((Number(h.차수) || 1) <= 1 ? 본 : 더).push(h);
        });
      });
    }
    var 목록 = 본.length ? [] : [자동];
    본.concat(더).forEach(function (h) {
      var 값 = Number(h.단가) > 0 ? Math.floor(Number(h.단가)) : 자동;
      for (var k = Math.min(9, Math.max(1, Number(h.박스수) | 0 || 1)); k > 0; k--) 목록.push(값);
    });
    return 목록;
  }

  function 박스값(운임, s) {
    var 표 = (s || 기본값).박스비;
    for (var i = 0; i < 표.length; i++) if (운임 <= 표[i][0]) return 표[i][1];
    return 표[표.length - 1][1];
  }

  function 송장셈(g, 조, 쓴행) {
    var s = 조.설정, 율 = s.율[g.마켓] || { 판매: 0, 배송비: 0 }, 자 = ZG.주문자료;
    var 매입 = 0, 없음 = false, 받은 = 0, 미상 = false, 본주문 = {}, 판매단위 = 0;
    g.줄들.forEach(function (r, i) {
      var 단 = Number(조.단가표[r.품목코드]) || 0;
      if (단 > 0) 매입 += 단 * (자.수량(r) || 0); else 없음 = true;
      판매단위 += Number(r.주문수량) || 0;
      var k = 주문열쇠(r, i);
      if (본주문[k]) return;
      본주문[k] = 1;
      var v = 받은값(r, g.원마켓, 조);
      if (v == null) 미상 = true; else 받은 += v;
    });
    var 장 = 장들(g, 조, 쓴행);
    var 낸 = 장.reduce(function (a, v) { return a + v; }, 0);
    var 박스 = 장.reduce(function (a, v) { return a + 박스값(v, s); }, 0);
    var 수수료 = Math.round(g.매출 * 율.판매 / 100 + 받은 * (율.배송비 || 0) / 100);
    var 부자재 = 판매단위 * s.부자재비;
    return { 매입: 매입, 없음: 없음, 받은: 받은, 미상: 미상, 낸: 낸, 박스: 박스, 부자재: 부자재, 수수료: 수수료,
             이익: g.매출 - 매입 - 수수료 + 받은 - 낸 - 박스 - 부자재 };
  }

  var 칸이름 = ['매출', '이익매출', '매입', '수수료', '받은', '낸', '박스', '부자재', '이익', '없음건', '없음매출', '미상건', '건수', '미상전체', '받은전체'];
  function 빈합() { var o = {}; 칸이름.forEach(function (k) { o[k] = 0; }); return o; }
  function 마무리(o) {
    o.포장비 = o.박스 + o.부자재;
    o.차액 = o.받은 - o.낸;
    o.이익률 = o.이익매출 ? o.이익 / o.이익매출 : null;
    o.원가율 = o.이익매출 ? o.매입 / o.이익매출 : null;
    return o;
  }

  /* 08r 모으기() 가 한 번 훑으며 부른다. 조 = 조건읽기() 꼴 { 설정, 단가표, 문자배송비, 손질 } */
  function 셈(조) {
    조 = Object.assign({ 단가표: {}, 문자배송비: {}, 손질: {} }, 조);
    조.설정 = 조.설정 && 조.설정.율 ? 조.설정 : 설정(조.설정);
    var 건표 = Object.create(null), 건순 = [], 덤표 = Object.create(null);
    function 건(키, m) {
      var g = 건표[키];
      if (!g) { g = 건표[키] = { 마켓: 이익마켓(m, 조.설정), 원마켓: m, 줄들: [], 금들: [], 접두들: [], 매출: 0, 덤: [] }; 건순.push(g); }
      return g;
    }
    return {
      덤: function (키, r) { (덤표[키] = 덤표[키] || []).push(r); },   // 서비스 줄 — 매출은 아니지만 상자에는 들어간다
      넣기: function (키, r, m, 금, 접두) {
        var g = 건(키, m);
        g.줄들.push(r); g.금들.push(금); g.접두들.push(접두); g.매출 += 금; g.키 = 키;
      },
      끝: function (이름표) {
        var 합 = 빈합(), 마켓표 = Object.create(null), 상품표 = Object.create(null), 상품순 = [], 쓴행 = {};
        건순.forEach(function (g) {
          g.덤 = 덤표[g.키] || [];
          var c = 송장셈(g, 조, 쓴행);
          var mk = 마켓표[g.마켓] = 마켓표[g.마켓] || 빈합();
          [합, mk].forEach(function (o) {
            o.매출 += g.매출; o.건수++;
            if (c.미상) o.미상전체++; else o.받은전체 += c.받은;
            if (c.없음) { o.없음건++; o.없음매출 += g.매출; return; }
            o.이익매출 += g.매출; o.매입 += c.매입; o.수수료 += c.수수료; o.받은 += c.받은; o.낸 += c.낸;
            o.박스 += c.박스; o.부자재 += c.부자재; o.이익 += c.이익;
            if (c.미상) o.미상건++;
          });
          var 단가표 = 조.단가표, 자 = ZG.주문자료;
          g.줄들.forEach(function (r, i) {
            var 접 = g.접두들[i], p = 상품표[접];
            if (!p) { p = 상품표[접] = Object.assign(빈합(), { 접두: 접 }); 상품순.push(p); }
            p.매출 += g.금들[i];
            if (c.없음) return;
            p.이익매출 += g.금들[i];
            p.매입 += (Number(단가표[r.품목코드]) || 0) * (자.수량(r) || 0);
            // 송장 이익을 판매가 비율로 나눈다(몇 원 차이 OK, 우람님 10/21). 판매가가 다 0 이면 줄 수로
            p.이익 += c.이익 * (g.매출 ? g.금들[i] / g.매출 : 1 / g.줄들.length);
          });
        });
        var 마켓들 = Object.keys(마켓표).map(function (m) {
          var o = 마무리(마켓표[m]);
          o.이름 = m; o.색 = 색(m);
          o.갈래 = o.미상전체 === o.건수 ? '미상' : (o.받은전체 > 0 ? '불포함' : '포함');
          return o;
        });
        마켓들 = ZG.주문실적.마켓정렬(마켓들.map(function (o) { return o.이름; }), function (m) {
          return 마켓표[m].이익;
        }).map(function (m) { return 마켓들.filter(function (o) { return o.이름 === m; })[0]; });
        합 = 마무리(합);
        합.미상마켓 = 마켓들.filter(function (o) { return o.미상건; }).map(function (o) { return o.이름; });
        var 상품들 = 상품순.map(function (p) {
          p.이익 = Math.round(p.이익);
          var 이 = (이름표 || {})[p.접두] || {};
          p.코드 = 이.코드 || p.접두; p.이름 = 이.이름 || p.접두;
          p.없음 = !p.이익매출;
          return 마무리(p);
        });
        return { 합계: 합, 마켓들: 마켓들, 상품들: 상품들 };
      }
    };
  }

  /* 화면이 부르는 얇은 껍데기 — 08r 읽어모으기() 만 부른다 */
  function 조건읽기() {
    var 저 = ZG.저장소, 단가표 = {}, 문자배송비 = {}, 손질 = {};
    저.품목들().forEach(function (p) { if (p.품목코드) 단가표[p.품목코드] = Number(p.매입단가) || 0; });
    저.읽기(저.키.문자주문).forEach(function (o) { if (o && o.id) 문자배송비[o.id] = Math.max(0, Number(o.배송비) || 0); });
    저.읽기(저.키.운임손질).forEach(function (h) { if (h && h.묶음id) (손질[h.묶음id] = 손질[h.묶음id] || []).push(h); });
    return { 설정: 설정(저.읽기(저.키.실적이익설정)), 단가표: 단가표, 문자배송비: 문자배송비, 손질: 손질 };
  }

  ZG.실적이익 = { 기본값: 기본값, 설정: 설정, 이익마켓: 이익마켓, 셈: 셈, 조건읽기: 조건읽기, 박스값: 박스값 };
})(window.ZG);
