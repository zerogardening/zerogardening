/* 08s-주문실적화면 — 주문 화면의 「주문실적」 탭 (21단계 설계 §4 · 시안 21-주문실적-macA)
   15d 가 탭을 달고 그리기(본문) 을 부른다. 상태는 메모리로만 — 새로고침하면 최근 30일로 돌아온다.
   기간·단위를 바꾸면 통째로 다시 모으고, 지표·정렬·펼침·찾기는 그 칸만 다시 채운다(찾는칸 한글 조합을 지킨다). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기, 콤마 = u.콤마;
  function 실() { return ZG.주문실적; }
  function 차() { return ZG.주문실적차트; }

  var 상태 = { 뷰: '목록', 기간칩: '최근 30일', 부터: '', 까지: '', 단위: '일', 지표: '매출', 정렬: '매출', 글: '', 폈다: {}, 쪽: 1, 보일수: 20 };
  var 결 = null, 칸 = {};
  var PC쪽크기 = 10, 폰한번 = 20;

  function 다시() { ZG.주문.다시그리기(); }
  function 값(c) { return 상태.지표 === '건수' ? c.건수 : c.매출; }
  function 짧은날(글) { return Number(글.slice(5, 7)) + '/' + Number(글.slice(8, 10)); }
  function 기간글() { return 짧은날(상태.부터) + ' ~ ' + 짧은날(상태.까지); }
  function 단위글() { return { 일: '일간', 주: '주간', 월: '월간' }[상태.단위]; }
  function 칸이름(c) { return c.이름 + (상태.단위 === '일' ? ' ' + c.요일 : ''); }
  function 점(색) { return 만들기('i', { class: 'md', style: 'background:' + 색 }); }
  function 객단가() { return 결.합계.건수 ? Math.round(결.합계.매출 / 결.합계.건수) : 0; }

  /* ── 상태 바꾸기 ── */
  function 기간칩으로(이름) {
    var 기 = 실().기간칩(이름, u.오늘문자());
    상태.기간칩 = 이름; 상태.부터 = 기.부터; 상태.까지 = 기.까지; 상태.쪽 = 1; 상태.보일수 = 폰한번;
    다시();
  }
  function 토글(목록, 지금, 바꿈) {
    return 만들기('span', { class: 'mini-tg', role: 'group' }, 목록.map(function (쌍) {
      var b = 만들기('button', { type: 'button', class: 지금 === 쌍[0] ? 'on' : '', text: 쌍[1], 'aria-pressed': 지금 === 쌍[0] ? 'true' : 'false' });
      b.addEventListener('click', function () { if (지금 !== 쌍[0]) 바꿈(쌍[0]); });
      return b;
    }));
  }
  function 단위토글() {
    return 토글([['일', '일간'], ['주', '주간'], ['월', '월간']], 상태.단위, function (v) { 상태.단위 = v; 다시(); });
  }
  function 지표토글() {
    return 토글([['매출', '매출'], ['건수', '건수']], 상태.지표, function (v) {
      상태.지표 = v; 추이채우기(); 마켓채우기(); 상품채우기();
    });
  }
  function 기간칩단추들() {
    return 실().기간칩이름들.map(function (이름) {
      var b = 만들기('button', { type: 'button', class: 'fchip' + (상태.기간칩 === 이름 ? ' on' : ''), text: 이름 });
      b.addEventListener('click', function () { 기간칩으로(이름); });
      return b;
    });
  }

  /* ══ 그리기 ══ */
  function 그리기(본문) {
    본문.classList.add('주문실적');
    if (!상태.부터) { var 기 = 실().기간칩(상태.기간칩, u.오늘문자()); 상태.부터 = 기.부터; 상태.까지 = 기.까지; }
    결 = 실().읽어모으기({ 부터: 상태.부터, 까지: 상태.까지, 단위: 상태.단위 });
    칸 = { 폰: u.폰인가() };
    if (칸.폰) 폰(본문); else PC(본문);
    추이채우기(); 마켓채우기(); 상품채우기();
  }

  function PC(본문) {
    var 날칸 = function (어느) {
      var i = 만들기('input', { class: 'inp', type: 'date', value: 상태[어느], style: 'width:138px; height:var(--h-btn-sm); font-size:var(--font-sm); text-align:center' });
      i.addEventListener('change', function () {
        if (!i.value) return;
        상태[어느] = i.value; 상태.기간칩 = '';
        if (상태.부터 > 상태.까지) { var t = 상태.부터; 상태.부터 = 상태.까지; 상태.까지 = t; }
        상태.쪽 = 1; 다시();
      });
      return i;
    };
    var 단 = 단위토글(); 단.style.marginLeft = 'auto';
    본문.appendChild(만들기('div', { class: 'fchips 기간줄' }, [
      만들기('span', { class: 'lab', text: '기간' }), 날칸('부터'), 만들기('span', { class: 'tilde', text: '~' }), 날칸('까지')
    ].concat(기간칩단추들(), [단])));
    본문.appendChild(만들기('div', { class: 'stat' }, [
      만들기('div', { html: '<div class="k">매출</div><div class="v">' + 콤마(결.합계.매출) + '<small>원</small></div>' }),
      만들기('div', { html: '<div class="k">주문</div><div class="v 검">' + 콤마(결.합계.건수) + '<small>건</small></div>' }),
      만들기('div', { html: '<div class="k">객단가</div><div class="v 검">' + 콤마(객단가()) + '<small>원</small></div>' })
    ]));
    칸.추이 = 본문.appendChild(만들기('div', { class: 'ccard 추이' }));
    칸.마켓 = 본문.appendChild(만들기('div', { class: 'card table-card 마켓표' }));
    칸.상품 = 본문.appendChild(만들기('div', { class: 'card table-card 상품표' }));
  }

  function 폰(본문) {
    본문.appendChild(만들기('div', { class: 'hscroll' }, 기간칩단추들()));
    본문.appendChild(만들기('div', { class: '단위줄' }, [단위토글()]));
    본문.appendChild(만들기('div', { class: 'sumcard', html:
      '<div class="k">매출 · ' + 기간글() + '</div><div class="big">' + 콤마(결.합계.매출) + '<small>원</small></div>' +
      '<div class="two"><div><div class="k">주문</div><div class="v">' + 콤마(결.합계.건수) + '<small>건</small></div></div>' +
      '<div><div class="k">객단가</div><div class="v">' + 콤마(객단가()) + '<small>원</small></div></div></div>' }));
    칸.추이 = 본문.appendChild(만들기('div', { class: 'ccard 추이' }));
    칸.마켓 = 본문.appendChild(만들기('div', { class: 'ccard 마켓표' }));
    칸.상품 = 본문.appendChild(만들기('div', { class: '상품칸' }));
  }

  /* ══ 추이 ══ */
  function 추이채우기() {
    var 카드 = 칸.추이;
    u.비우기(카드);
    카드.appendChild(만들기('div', { class: 'chd' }, [
      만들기('h4', { text: 상태.지표 === '건수' ? '주문 추이' : '매출 추이' }), 만들기('span', { class: 'right' }, [지표토글()])
    ]));
    var 폭 = Math.max(260, 카드.clientWidth - 32);
    var 옵 = {
      폭: 폭, 높이: 칸.폰 ? 190 : 280, 글크기: 칸.폰 ? 10 : 11, 일요일띠: 상태.단위 === '일',
      이름: (상태.지표 === '건수' ? '주문 ' : '매출 ') + 기간글() + ' 합계 ' + 콤마(값(결.합계))
    };
    /* 일·주·월 모두 마켓별 누적막대 (우람님 10/14 「그래프 다 막대로」) */
    var 있는 = {};
    결.칸들.forEach(function (c) { Object.keys(c.마켓).forEach(function (m) { 있는[m] = 1; }); });
    var 순서 = 실().마켓정렬(Object.keys(있는));
    var svg = 차().누적기둥(결.칸들, 상태.지표, Object.assign(옵, {
      순서: 순서, 색: 실().마켓색, 일요일들: 상태.단위 === '일' ? 결.칸들.map(function (c) { return c.일요일; }) : null
    }));
    카드.appendChild(svg);
    if (순서.length) {
      카드.appendChild(만들기('div', { class: 'legend' }, 순서.map(function (m) {
        return 만들기('span', { class: 'mall 범례' }, [점(실().마켓색(m)), document.createTextNode(m)]);
      })));
    }
    var 풍선 = 만들기('div', { class: 'tip', hidden: 'hidden' });
    카드.appendChild(풍선);

    function 보이기(i) {
      var 자리 = 차().짚기(svg, i), c = 결.칸들[i];
      if (!자리 || !c) return;
      풍선.innerHTML = 풍선글(c);
      풍선.hidden = false;
      // SVG 에는 offsetLeft 가 없다 — 카드 기준 자리는 상자끼리 빼서 얻는다
      var 판 = svg.getBoundingClientRect(), 틀 = 카드.getBoundingClientRect();
      var x = 판.left - 틀.left + 자리.x * 판.width, y = 판.top - 틀.top + 자리.y * 판.height;
      var 왼 = x + 12;
      if (왼 + 풍선.offsetWidth > 카드.clientWidth - 8) 왼 = x - 12 - 풍선.offsetWidth;
      풍선.style.left = Math.max(4, 왼) + 'px';
      풍선.style.top = Math.max(4, Math.min(y - 24, 카드.clientHeight - 풍선.offsetHeight - 4)) + 'px';
    }
    function 숨기기() { 풍선.hidden = true; 차().짚기풀기(svg); }
    svg.addEventListener('mouseover', function (e) { var i = e.target.getAttribute('data-i'); if (i != null) 보이기(+i); });
    svg.addEventListener('click', function (e) { var i = e.target.getAttribute('data-i'); if (i != null) 보이기(+i); });
    svg.addEventListener('mouseleave', function () { if (!칸.폰) 숨기기(); });
  }

  function 풍선글(c) {
    var 머리 = 상태.단위 === '일' ? c.이름 + ' (' + c.요일 + ')' : c.이름;
    var 줄 = '<div class="h">' + u.안전(머리) + '</div><div class="l">주문<b>' + 콤마(c.건수) + '건</b></div>';
    실().마켓정렬(Object.keys(c.마켓)).forEach(function (m) {
      줄 += '<div class="l"><i class="md" style="background:' + 실().마켓색(m) + '"></i>' + u.안전(m) + '<b>' + 콤마(c.마켓[m].매출) +
            (c.매출 ? ' <span class="pct">' + 비중글(c.마켓[m].매출, c.매출) + '</span>' : '') + '</b></div>';
    });
    return 줄 + '<div class="l tot">합계<b>' + 콤마(c.매출) + '</b></div>';
  }

  /* 1% 미만은 0% 대신 「1% 미만」으로 — 팔린 마켓이 0% 로 보이면 안 팔린 것과 헷갈린다 */
  function 비중글(v, 전체) {
    var p = v / 전체 * 100;
    return p > 0 && p < 1 ? '<1%' : Math.round(p) + '%';
  }

  /* ══ 마켓별 — 줄 = 칸(최근이 위), 칸 = 그 기간에 값이 있는 마켓 ══ */
  function 조각(셈들) {
    return 결.마켓들.map(function (m) { var s = 셈들[m.이름]; return { 색: m.색, 값: s ? 값(s) : 0 }; });
  }
  function 마켓채우기() {
    u.비우기(칸.마켓);
    var 줄들 = 결.칸들.slice().reverse();
    var 최대 = Math.max.apply(null, [1].concat(줄들.map(값)));
    if (칸.폰) 폰마켓(줄들, 최대); else PC마켓(줄들, 최대);
  }

  function PC마켓(줄들, 최대) {
    var 카드 = 칸.마켓, 마켓들 = 결.마켓들, 합 = 결.합계;
    카드.appendChild(만들기('h3', { html: '마켓별 ' + (상태.지표 === '건수' ? '주문' : '매출') + ' <span class="hint">' + 단위글() + ' · 최근 순</span>' }));
    var 첫폭 = 상태.단위 === '주' ? 92 : 62;
    function 틀() {
      var t = 만들기('table');
      t.style.minWidth = (첫폭 + 74 + 44 + 140 + 마켓들.length * 64) + 'px';
      t.innerHTML = '<colgroup><col style="width:' + 첫폭 + 'px"><col style="width:74px"><col style="width:44px"><col>' +
        마켓들.map(function () { return '<col style="width:76px">'; }).join('') + '</colgroup>';
      return t;
    }
    function 칸줄(이름, 셈, 마켓셈, 너비, 줄class) {
      var tr = 만들기('tr', { class: 줄class || '' }, [
        만들기('td', { class: 'pd', text: 이름 }),
        만들기('td', { class: 'r b', text: 콤마(셈.매출) }),
        만들기('td', { class: 'r dim', text: 콤마(셈.건수) }),
        만들기('td', {}, [차().누적막대(조각(마켓셈), 너비, 10)])
      ]);
      /* 칸마다 그 기간 전체 중 몇 % (우람님 10/14) — 합계 줄은 아래 비중 줄이 맡는다 */
      var 전 = 값(셈);
      마켓들.forEach(function (m) {
        var s = 마켓셈[m.이름], v = s ? 값(s) : 0;
        var td = 만들기('td', { class: 'r' + (v ? '' : ' z'), text: v ? 콤마(v) : '-' });
        if (v && 전 && 줄class !== 'ttot') td.appendChild(만들기('span', { class: 'pct', text: 비중글(v, 전) }));
        tr.appendChild(td);
      });
      return tr;
    }
    var 머리 = 틀();
    머리.appendChild(만들기('tr', {}, [만들기('th', { text: '기간' }), 만들기('th', { class: 'r', text: '매출' }),
      만들기('th', { class: 'r', text: '건수' }), 만들기('th', { text: '마켓 구성' })].concat(마켓들.map(function (m) {
      return 만들기('th', { class: 'r mh' }, [점(m.색), document.createTextNode(m.이름)]);
    }))));
    var 마켓합 = {};
    마켓들.forEach(function (m) { 마켓합[m.이름] = m; });
    머리.appendChild(칸줄('합계', 합, 마켓합, null, 'ttot'));
    var 비중 = 만들기('tr', { class: 'ttot 비중' }, [만들기('td', { text: '비중' }), 만들기('td'), 만들기('td'), 만들기('td')]);
    var 전체 = 값(합);
    마켓들.forEach(function (m) {
      비중.appendChild(만들기('td', { class: 'r', text: 전체 ? 비중글(값(m), 전체) : '-' }));
    });
    머리.appendChild(비중);
    var 몸 = 틀();
    줄들.forEach(function (c) { 몸.appendChild(칸줄(칸이름(c), c, c.마켓, 값(c) / 최대, c.일요일 ? 'sun' : '')); });
    카드.appendChild(만들기('div', { class: 'ptab' }, [머리, 만들기('div', { class: 'ptbody' }, [몸])]));
  }

  function 폰마켓(줄들, 최대) {
    var 카드 = 칸.마켓, 합 = 결.합계, 돈 = 상태.지표 !== '건수';
    function 수(v) { return 돈 ? 콤마(v) : 콤마(v) + '건'; }
    카드.appendChild(만들기('div', { class: 'chd' }, [
      만들기('h4', { text: 돈 ? '마켓별 매출' : '마켓별 주문' }), 만들기('span', { class: 'right 단위글', text: 단위글() })
    ]));
    var 마켓합 = {};
    결.마켓들.forEach(function (m) { 마켓합[m.이름] = m; });
    카드.appendChild(만들기('div', { class: 'prow2 tot' }, [
      만들기('div', { class: 'a', html: '<span class="dd">합계</span><span class="am">' + 수(값(합)) + '</span>' }),
      차().누적막대(조각(마켓합), null, 10)
    ]));
    카드.appendChild(만들기('div', { class: 'mleg' }, 결.마켓들.map(function (m) {
      return 만들기('span', {}, [점(m.색), document.createTextNode(m.이름), 만들기('b', { text: 수(값(m)) }),
        만들기('span', { class: 'pct', text: 값(합) ? 비중글(값(m), 값(합)) : '' })]);
    })));
    카드.appendChild(만들기('div', { class: 'pscroll' }, 줄들.map(function (c) {
      return 만들기('div', { class: 'prow2' + (c.일요일 ? ' sun' : '') }, [
        만들기('div', { class: 'a', html: '<span class="dd">' + u.안전(칸이름(c)) + '</span><span class="am">' + 수(값(c)) + '</span>' }),
        차().누적막대(조각(c.마켓), 값(c) / 최대, 8)
      ]);
    })));
  }

  /* ══ 상품별 ══ */
  function 걸린상품() {
    var 키 = 상태.글.toLowerCase().replace(/\s/g, '');
    var 것들 = 결.상품들.filter(function (p) {
      if (!키 || 칸.폰) return true;
      var 밭 = (p.이름 + '|' + p.접두 + '|' + p.규격들.map(function (g) { return g.품목코드; }).join('|')).toLowerCase().replace(/\s/g, '');
      return 밭.indexOf(키) >= 0;
    });
    var k = 상태.정렬;
    return 것들.slice().sort(function (a, b) { return b[k] - a[k] || b.매출 - a.매출; });
  }
  function 상품조각(p) {
    return 실().마켓정렬(Object.keys(p.마켓)).map(function (m) { return { 색: 실().마켓색(m), 값: p.마켓[m].매출 }; });
  }
  function 범례() {
    return 만들기('div', { class: 'legend' }, 실().마켓정렬(결.마켓들.map(function (m) { return m.이름; })).map(function (m) {
      return 만들기('span', { class: 'mall 범례' }, [점(실().마켓색(m)), document.createTextNode(m)]);
    }));
  }
  function 펴기(p) { 상태.폈다[p.접두] = !상태.폈다[p.접두]; 상품채우기(); }

  function 상품채우기() {
    if (칸.폰) 폰상품(); else PC상품();
  }

  function PC상품() {
    var 카드 = 칸.상품;
    if (!칸.상품머리) {
      var 입력 = u.손대야열림(만들기('input', { class: 'inp', type: 'search', placeholder: '상품명 · 품목코드', value: 상태.글 }));
      u.조합안전입력(입력, function (v) { if (v === 상태.글) return; 상태.글 = v; 상태.쪽 = 1; PC상품(); }, 220);
      칸.상품힌트 = 만들기('span', { class: 'hint' });
      칸.상품머리 = 만들기('h3', {}, [document.createTextNode('상품별 매출 '), 칸.상품힌트,
        만들기('span', { class: 'right' }, [만들기('span', { class: 'search' }, [만들기('span', { class: 'mag', text: '🔍' }), 입력])])]);
      칸.상품몸 = 만들기('div');
      카드.appendChild(칸.상품머리); 카드.appendChild(범례()); 카드.appendChild(칸.상품몸);
    }
    var 것들 = 걸린상품(), 총쪽 = Math.max(1, Math.ceil(것들.length / PC쪽크기));
    if (상태.쪽 > 총쪽) 상태.쪽 = 총쪽;
    칸.상품힌트.textContent = 기간글() + ' · 상품 ' + 것들.length + '개';
    var 몸 = 칸.상품몸;
    u.비우기(몸);
    var 표 = 만들기('table');
    표.innerHTML = '<colgroup><col style="width:40px"><col style="width:76px"><col style="width:178px"><col>' +
      '<col style="width:96px"><col style="width:58px"><col style="width:54px"><col style="width:30px"></colgroup>';
    var 머리 = 만들기('tr', {}, [만들기('th', { class: 'c', text: '#' }), 만들기('th', { text: '품목코드' }),
      만들기('th', { text: '상품' }), 만들기('th', { text: '마켓별 매출' })]);
    ['매출', '수량', '건수'].forEach(function (k) {
      var th = 만들기('th', { class: 'r' + (상태.정렬 === k ? ' sortable' : ''), text: k + (상태.정렬 === k ? ' ▾' : ''), role: 'button', tabindex: '0' });
      th.addEventListener('click', function () { 상태.정렬 = k; 상태.쪽 = 1; PC상품(); });
      머리.appendChild(th);
    });
    머리.appendChild(만들기('th'));
    표.appendChild(머리);
    if (!것들.length) {
      표.appendChild(만들기('tr', {}, [만들기('td', { colspan: '8', class: 'dim', text: 결.상품들.length ? '찾는 상품이 없습니다.' : '이 기간 주문이 없습니다.' })]));
    }
    var 시작 = (상태.쪽 - 1) * PC쪽크기;
    것들.slice(시작, 시작 + PC쪽크기).forEach(function (p, n) {
      var 폈 = !!상태.폈다[p.접두];
      var tr = 만들기('tr', { class: 'prow' + (폈 ? ' open' : ''), tabindex: '0' }, [
        만들기('td', { class: 'rk', text: String(시작 + n + 1) }), 만들기('td', { class: 'code', text: p.코드 }),
        만들기('td', { class: 'pn', text: p.이름 }), 만들기('td', {}, [차().누적막대(상품조각(p), null, 12)]),
        만들기('td', { class: 'r', text: 콤마(p.매출) }), 만들기('td', { class: 'r', text: 콤마(p.수량) }),
        만들기('td', { class: 'r', text: 콤마(p.건수) }), 만들기('td', { class: 'chevc', text: 폈 ? '⌃' : '›' })
      ]);
      tr.addEventListener('click', function () { 펴기(p); });
      tr.addEventListener('keydown', function (e) { if (e.key === 'Enter') 펴기(p); });
      표.appendChild(tr);
      if (폈) 표.appendChild(만들기('tr', { class: 'det' }, [만들기('td', { colspan: '8' }, [PC펼침(p)])]));
    });
    몸.appendChild(표);
    몸.appendChild(쪽줄(총쪽, 것들.length));
  }

  function 펼침표(머리글, 줄들) {
    var t = 만들기('table', { class: 'vtab' });
    t.innerHTML = '<colgroup><col style="width:112px"><col><col style="width:82px"><col style="width:48px"><col style="width:48px"><col style="width:44px"><col style="width:74px"></colgroup>';
    t.appendChild(만들기('tr', {}, [만들기('th', { text: 머리글 }), 만들기('th')].concat(['매출', '비중', '수량', '건수', '개당 매출'].map(function (h) {
      return 만들기('th', { class: 'r', text: h });
    }))));
    줄들.forEach(function (z) {
      t.appendChild(만들기('tr', {}, [z.첫, z.둘].concat([콤마(z.매출), z.비중, 콤마(z.수량), 콤마(z.건수), z.수량 ? 콤마(Math.round(z.매출 / z.수량)) : '-'].map(function (v) {
        return 만들기('td', { class: 'r', text: v });
      }))));
    });
    return t;
  }
  function 퍼센트(a, b) { return b ? Math.round(a / b * 100) + '%' : '-'; }

  function PC펼침(p) {
    var 규 = 펼침표('규격', p.규격들.map(function (g) {
      return Object.assign({}, g, { 첫: 만들기('td', { class: 'code', text: g.품목코드 }), 둘: 만들기('td', { text: g.규격 }), 비중: 퍼센트(g.매출, p.매출) });
    }));
    var 마 = 펼침표('마켓', Object.keys(p.마켓).map(function (m) {
      var s = p.마켓[m];
      return Object.assign({}, s, {
        첫: 만들기('td', {}, [만들기('span', { class: 'mall' }, [점(실().마켓색(m)), document.createTextNode(m)])]),
        둘: 만들기('td', {}, [만들기('div', { class: 'bar' }, [만들기('i', { style: 'width:' + (s.비중 * 100).toFixed(1) + '%; background:' + 실().마켓색(m) })])]),
        비중: Math.round(s.비중 * 100) + '%'
      });
    }).sort(function (a, b) { return b.매출 - a.매출; }));
    var 돈 = 상태.지표 !== '건수';
    var 선 = 차().추이선(돈 ? p.추이 : p.추이건, 결.칸들, { 돈: 돈, 일요일띠: 상태.단위 === '일', 이름: p.이름 + ' 추이' });
    return 만들기('div', { class: 'dgrid' }, [
      만들기('div', { class: 'dtab' }, [규, 마]),
      만들기('div', { class: 'dchart' }, [만들기('div', { class: 'k', text: (돈 ? '매출' : '주문') + ' 추이 · ' + 단위글() }), 선])
    ]);
  }

  function 쪽줄(총쪽, 모두) {
    var 줄 = 만들기('div', { class: 'pager' });
    function 단추(글, 쪽, 막힘) {
      var b = 만들기('button', { type: 'button', text: 글, disabled: 막힘 ? 'disabled' : null });
      b.addEventListener('click', function () { 상태.쪽 = 쪽; PC상품(); });
      return b;
    }
    줄.appendChild(단추('‹', Math.max(1, 상태.쪽 - 1), 상태.쪽 <= 1));
    var 앞 = 0;
    for (var i = 1; i <= 총쪽; i++) {
      if (총쪽 > 7 && i > 2 && i < 총쪽 - 1 && Math.abs(i - 상태.쪽) > 1) { if (앞 !== -1) 줄.appendChild(만들기('i', { text: '…' })); 앞 = -1; continue; }
      앞 = i;
      줄.appendChild(i === 상태.쪽 ? 만들기('b', { text: String(i) }) : 단추(String(i), i, false));
    }
    줄.appendChild(단추('›', Math.min(총쪽, 상태.쪽 + 1), 상태.쪽 >= 총쪽));
    줄.appendChild(만들기('span', { text: '상품 ' + 모두 + '개', style: 'margin-left:var(--space-md)' }));
    return 줄;
  }

  function 폰상품() {
    var 칸상 = 칸.상품;
    u.비우기(칸상);
    var 것들 = 걸린상품();
    칸상.appendChild(만들기('div', { class: 'ph-sec', html: '상품별 매출<span class="r">상품 ' + 것들.length + '개</span>' }));
    칸상.appendChild(만들기('div', { class: 'fchips' }, [['매출', '매출순'], ['수량', '수량순'], ['건수', '건수순']].map(function (쌍) {
      var b = 만들기('button', { type: 'button', class: 'fchip' + (상태.정렬 === 쌍[0] ? ' on' : ''), text: 쌍[1] });
      b.addEventListener('click', function () { 상태.정렬 = 쌍[0]; 상태.보일수 = 폰한번; 폰상품(); });
      return b;
    })));
    칸상.appendChild(범례());
    var 목록 = 만들기('div', { class: 'ph-list' });
    if (!것들.length) 목록.appendChild(만들기('div', { class: 'ph-card', text: '이 기간 주문이 없습니다.' }));
    것들.slice(0, 상태.보일수).forEach(function (p, n) { 목록.appendChild(상품카드(p, n + 1)); });
    칸상.appendChild(목록);
    if (것들.length > 상태.보일수) {
      var 더 = 만들기('button', { type: 'button', class: 'btn 더보기', text: '더 보기 (' + (것들.length - 상태.보일수) + '개 남음)' });
      더.addEventListener('click', function () { 상태.보일수 += 폰한번; 폰상품(); });
      칸상.appendChild(더);
    }
  }

  function 상품카드(p, 순위) {
    var 폈 = !!상태.폈다[p.접두];
    var 카드 = 만들기('div', { class: 'pcard' + (폈 ? ' open' : ''), role: 'button', tabindex: '0', 'aria-expanded': 폈 ? 'true' : 'false' }, [
      만들기('div', { class: 't1' }, [만들기('span', { class: 'rk', text: String(순위) }), 만들기('span', { class: 'nm', text: p.이름 }),
        만들기('span', { class: 'cd', text: p.코드 }), 만들기('span', { class: 'amt', text: 콤마(p.매출) })]),
      차().누적막대(상품조각(p), null, 10),
      만들기('div', { class: 't2', html: '<span><b>' + 콤마(p.수량) + '</b>개</span><span><b>' + 콤마(p.건수) + '</b>건</span><span class="chev">' + (폈 ? '⌃' : '›') + '</span>' })
    ]);
    카드.addEventListener('click', function () { 펴기(p); });
    카드.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); 펴기(p); } });
    if (!폈) return 카드;
    var 펼 = 만들기('div', { class: 'det' });
    p.규격들.forEach(function (g) {
      펼.appendChild(만들기('div', { class: 'vrow' }, [만들기('span', { class: 'vc', text: g.품목코드 }), 만들기('span', { class: 'vg', text: g.규격 }),
        만들기('span', { class: 'amt', text: 콤마(g.매출) }), 만들기('span', { class: 'c', text: 콤마(g.수량) + '개' })]));
    });
    Object.keys(p.마켓).sort(function (a, b) { return p.마켓[b].매출 - p.마켓[a].매출; }).forEach(function (m) {
      var s = p.마켓[m], 색 = 실().마켓색(m);
      펼.appendChild(만들기('div', { class: 'mrow' }, [만들기('span', { class: 'nm' }, [점(색), document.createTextNode(m)]),
        만들기('span', { class: 'bar' }, [만들기('i', { style: 'width:' + (s.비중 * 100).toFixed(1) + '%; background:' + 색 })]),
        만들기('span', { class: 'amt', text: 콤마(s.매출) }), 만들기('span', { class: 'c', text: 콤마(s.수량) + '개' })]));
    });
    카드.appendChild(펼);
    return 카드;
  }

  function 제목() { return '주문'; }
  function 요약() { return { 왼: '', 오: '' }; }
  function 목록으로() { 다시(); }

  ZG.주문실적화면 = { 그리기: 그리기, 상태: 상태, 제목: 제목, 요약: 요약, 목록으로: 목록으로 };
})(window.ZG);
