/* 08t-주문실적차트 — 꺾은선 · 누적막대 · 추이선 (21단계 설계 §4)
   🔴 차트 라이브러리를 들이지 않는다 — 오프라인에서도 떠야 하고(sw.js 는 ?v= 붙은 자기 파일만 낸다),
      주문 탭 첫 그림은 실는 파일 크기에 비례해 늦어진다(9/2). 필요한 모양이 선·막대 둘뿐이다.
   상태를 모른다. 값만 받아 요소를 돌려준다. 색은 08r 마켓표에서 받는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var NS = 'http://www.w3.org/2000/svg';
  var 선색 = '#2F9E44', 바닥색 = '#ECECF0', 글색 = '#86868B', 띠색 = '#F5F5F7';

  function 그(태그, 속성) {
    var e = document.createElementNS(NS, 태그);
    Object.keys(속성 || {}).forEach(function (k) { e.setAttribute(k, 속성[k]); });
    return e;
  }
  function 콤마(n) { return (Number(n) || 0).toLocaleString('ko-KR'); }

  /* 눈금 — 다섯 칸. 1·2·5 계열로 반올림해 「20만 · 40만」처럼 떨어지게 */
  function 눈금폭(최대) {
    if (최대 <= 0) return 1;
    var 날 = 최대 / 5, 자리 = Math.pow(10, Math.floor(Math.log10(날)));
    var 배 = [1, 2, 2.5, 5, 10].filter(function (b) { return b * 자리 >= 날; })[0];
    return Math.max(1, 배 * 자리);
  }
  function 눈금글(v, 돈) {
    if (!돈 || v < 10000) return 콤마(v);
    var 만 = v / 10000;
    return (만 % 1 ? 만.toFixed(1) : 만) + '만';
  }

  /* 선 그림 공통. 값들·이름들은 같은 길이. 옵션 { 폭, 높이, 돈, 일요일들, 굵기, 글크기, 이름 } */
  function 선그림(값들, 이름들, 옵) {
    var W = 옵.폭 || 816, H = 옵.높이 || 280, 글 = 옵.글크기 || 11;
    var 왼 = 글 * 4.4, 오 = 14, 위 = 10, 아래 = 글 + 17;
    var 바닥 = H - 아래, n = 값들.length;
    var 최대 = Math.max.apply(null, [0].concat(값들));
    var 칸폭 = 눈금폭(최대), 꼭대기 = 칸폭 * Math.max(1, Math.ceil(최대 / 칸폭));
    var 안폭 = W - 왼 - 오;
    function X(i) { return n <= 1 ? 왼 + 안폭 / 2 : 왼 + 안폭 * i / (n - 1); }
    function Y(v) { return 바닥 - (바닥 - 위) * (v / 꼭대기); }

    var svg = 그('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 옵.이름 || '추이' });
    svg.style.display = 'block';
    var 칸너비 = n > 1 ? 안폭 / (n - 1) : 안폭;

    (옵.일요일들 || []).forEach(function (일, i) {
      if (일) svg.appendChild(그('rect', { x: (X(i) - 칸너비 / 2).toFixed(1), y: 위, width: 칸너비.toFixed(1), height: 바닥 - 위, fill: 띠색 }));
    });
    for (var v = 0; v <= 꼭대기 + 0.5; v += 칸폭) {
      var y = Y(v).toFixed(1);
      svg.appendChild(그('line', { x1: 왼, x2: W - 오, y1: y, y2: y, stroke: 바닥색, 'stroke-width': 1 }));
      var t = 그('text', { x: 왼 - 7, y: (+y + 3.5).toFixed(1), 'text-anchor': 'end', 'font-size': 글, fill: 글색 });
      t.textContent = 눈금글(v, 옵.돈);
      svg.appendChild(t);
    }

    // x 이름은 겹치지 않게 솎는다. 마지막 칸은 늘 보인다
    var 최대수 = Math.max(2, Math.floor(안폭 / (글 * 5))), 걸음 = Math.max(1, Math.ceil(n / 최대수));
    for (var i = 0; i < n; i++) {
      var 끝 = i === n - 1, 보임 = i % 걸음 === 0 && !(n - 1 - i < 걸음 / 2 && !끝 && n > 1);
      if (!보임 && !끝) continue;
      var x = 그('text', { x: X(i).toFixed(1), y: H - 6, 'text-anchor': 'middle', 'font-size': 글, fill: 글색 });
      x.textContent = 이름들[i] || '';
      svg.appendChild(x);
    }

    if (n && 최대 > 0) {             // 0건 기간은 바닥선만
      svg.appendChild(그('polyline', {
        points: 값들.map(function (v, i) { return X(i).toFixed(1) + ',' + Y(v).toFixed(1); }).join(' '),
        fill: 'none', stroke: 선색, 'stroke-width': 옵.굵기 || 2.4, 'stroke-linejoin': 'round', 'stroke-linecap': 'round'
      }));
    }
    svg._점 = 값들.map(function (v, i) { return { x: X(i), y: Y(v) }; });
    svg._틀 = { W: W, H: H, 위: 위, 바닥: 바닥, 칸너비: 칸너비 };
    return svg;
  }

  /* 합계 한 줄. 칸들 = 08r 칸, 지표 '매출'|'건수'. 옵션 { 폭, 높이, 글크기, 일요일띠, 이름 } */
  function 꺾은선(칸들, 지표, 옵) {
    옵 = 옵 || {};
    var 돈 = 지표 !== '건수';
    var svg = 선그림(칸들.map(function (c) { return 돈 ? c.매출 : c.건수; }), 칸들.map(function (c) { return c.이름; }),
      Object.assign({}, 옵, { 돈: 돈, 일요일들: 옵.일요일띠 ? 칸들.map(function (c) { return c.일요일; }) : null }));
    // 칸마다 투명한 기둥 — 점이 작아 손가락으로 못 누른다
    var 틀 = svg._틀;
    svg._점.forEach(function (p, i) {
      svg.appendChild(그('rect', { x: (p.x - 틀.칸너비 / 2).toFixed(1), y: 0, width: Math.max(틀.칸너비, 4).toFixed(1), height: 틀.H, fill: 'transparent', 'data-i': i }));
    });
    return svg;
  }

  /* 월간 — 마켓별 누적막대 (우람님 10/14 「월간은 막대, 누적으로 매출처별」).
     칸들 = 08r 칸(c.마켓[m].매출·건수), 옵션 { 폭, 높이, 글크기, 이름, 순서(마켓 이름들), 색(이름→색) } */
  function 누적기둥(칸들, 지표, 옵) {
    옵 = 옵 || {};
    var 돈 = 지표 !== '건수', 열 = 돈 ? '매출' : '건수';
    var W = 옵.폭 || 816, H = 옵.높이 || 280, 글 = 옵.글크기 || 11;
    var 왼 = 글 * 4.4, 오 = 14, 위 = 10, 아래 = 글 + 17, 바닥 = H - 아래, n = 칸들.length;
    var 합들 = 칸들.map(function (c) { return 돈 ? c.매출 : c.건수; });
    var 최대 = Math.max.apply(null, [0].concat(합들));
    var 칸폭 = 눈금폭(최대), 꼭대기 = 칸폭 * Math.max(1, Math.ceil(최대 / 칸폭));
    var 안폭 = W - 왼 - 오, 칸너비 = 안폭 / Math.max(1, n), 기둥 = Math.min(56, 칸너비 * 0.62);
    function X(i) { return 왼 + 칸너비 * (i + 0.5); }
    function Y(v) { return 바닥 - (바닥 - 위) * (v / 꼭대기); }

    var svg = 그('svg', { viewBox: '0 0 ' + W + ' ' + H, width: '100%', role: 'img', 'aria-label': 옵.이름 || '추이' });
    svg.style.display = 'block';
    for (var v = 0; v <= 꼭대기 + 0.5; v += 칸폭) {
      var y = Y(v).toFixed(1);
      svg.appendChild(그('line', { x1: 왼, x2: W - 오, y1: y, y2: y, stroke: 바닥색, 'stroke-width': 1 }));
      var t = 그('text', { x: 왼 - 7, y: (+y + 3.5).toFixed(1), 'text-anchor': 'end', 'font-size': 글, fill: 글색 });
      t.textContent = 눈금글(v, 돈);
      svg.appendChild(t);
    }
    var 순서 = 옵.순서 || [], 색 = 옵.색 || function () { return 선색; };
    칸들.forEach(function (c, i) {
      var 쌓 = 0;
      순서.forEach(function (m) {
        var 값 = (c.마켓[m] && c.마켓[m][열]) || 0;
        if (!값) return;
        var y1 = Y(쌓), y2 = Y(쌓 + 값);
        svg.appendChild(그('rect', { x: (X(i) - 기둥 / 2).toFixed(1), y: y2.toFixed(1), width: 기둥.toFixed(1),
          height: Math.max(0.5, y1 - y2).toFixed(1), fill: 색(m), 'pointer-events': 'none' }));
        쌓 += 값;
      });
      var x = 그('text', { x: X(i).toFixed(1), y: H - 6, 'text-anchor': 'middle', 'font-size': 글, fill: 글색 });
      x.textContent = c.이름 || '';
      svg.appendChild(x);
    });
    svg._막대 = true;
    svg._점 = 합들.map(function (v, i) { return { x: X(i), y: Y(v) }; });
    svg._틀 = { W: W, H: H, 위: 위, 바닥: 바닥, 칸너비: 칸너비 };
    svg._점.forEach(function (p, i) {
      svg.appendChild(그('rect', { x: (p.x - 칸너비 / 2).toFixed(1), y: 0, width: 칸너비.toFixed(1), height: H, fill: 'transparent', 'data-i': i }));
    });
    return svg;
  }

  /* i 번째 점을 짚어 보인다 — 점선 기둥 + 동그라미. 돌려주는 x·y 는 0~1 비율(말풍선 자리) */
  function 짚기(svg, i) {
    [].slice.call(svg.querySelectorAll('.짚음')).forEach(function (e) { e.remove(); });
    var p = svg._점 && svg._점[i];
    if (!p) return null;
    var 틀 = svg._틀;
    var 선 = 그('line', { class: '짚음', x1: p.x.toFixed(1), x2: p.x.toFixed(1), y1: 틀.위, y2: 틀.바닥, stroke: '#A1A1A6', 'stroke-dasharray': '3 3', 'pointer-events': 'none' });
    var 점 = 그('circle', { class: '짚음', cx: p.x.toFixed(1), cy: p.y.toFixed(1), r: 4, fill: '#fff', stroke: 선색, 'stroke-width': 2.2, 'pointer-events': 'none' });
    svg.appendChild(선);
    if (!svg._막대) svg.appendChild(점);
    return { x: p.x / 틀.W, y: p.y / 틀.H };
  }
  function 짚기풀기(svg) { [].slice.call(svg.querySelectorAll('.짚음')).forEach(function (e) { e.remove(); }); }

  /* 누적막대 한 줄 — 조각들 [{색, 값}], 너비 0~1(가장 큰 줄 대비). 시안처럼 div 띠다 */
  function 누적막대(조각들, 너비, 높이) {
    var 합 = 조각들.reduce(function (a, c) { return a + (c.값 || 0); }, 0);
    var 띠 = document.createElement('div');
    띠.className = 'stk';
    띠.style.height = (높이 || 10) + 'px';
    if (너비 != null) 띠.style.width = (Math.max(0, Math.min(1, 너비)) * 100).toFixed(1) + '%';
    if (!합) return 띠;
    조각들.forEach(function (c) {
      if (!c.값) return;
      var i = document.createElement('i');
      i.style.width = (c.값 / 합 * 100).toFixed(2) + '%';
      i.style.background = c.색;
      띠.appendChild(i);
    });
    return 띠;
  }

  /* 상품 하나의 추이 — 작은 선 하나 */
  function 추이선(값들, 칸들, 옵) {
    옵 = 옵 || {};
    return 선그림(값들, 칸들.map(function (c) { return c.이름; }), {
      폭: 옵.폭 || 270, 높이: 옵.높이 || 150, 글크기: 10, 굵기: 2, 돈: 옵.돈 !== false, 이름: 옵.이름,
      일요일들: 옵.일요일띠 ? 칸들.map(function (c) { return c.일요일; }) : null
    });
  }

  ZG.주문실적차트 = { 꺾은선: 꺾은선, 누적기둥: 누적기둥, 짚기: 짚기, 짚기풀기: 짚기풀기, 누적막대: 누적막대, 추이선: 추이선, 눈금폭: 눈금폭 };
})(window.ZG);
