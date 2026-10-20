/* 08x-실적이익화면 — 주문실적 탭 위쪽 「이익」 (27단계 설계 §3 · 시안 27-실적이익-macA)
   08s 그리기() 가 결(08r 모으기 결과, 결.이익 포함)을 넘겨 부른다. 상태는 메모리로만.
   토글·정렬·찾기·쪽은 그 카드만 다시 채운다(찾는칸 한글 조합을 지킨다). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기, 콤마 = u.콤마;
  var 상태 = { 거름: '전체', 정렬: '원가낮', 글: '', 쪽: 1, 보일수: 20 };
  var 결 = null, 이 = null, 칸 = {}, 기간 = '';
  var PC쪽크기 = 10, 폰한번 = 20;
  var 갈래글 = { 포함: '배송비 포함', 불포함: '불포함', 미상: '미상' };
  var 갈래꼴 = { 포함: 'in', 불포함: 'ex', 미상: 'un' };
  var 정렬들 = [['매출', '매출순'], ['이익', '이익순'], ['원가낮', '원가율 낮은순'], ['원가높', '원가율 높은순']];

  function 점(색) { return 만들기('i', { class: 'md', style: 'background:' + 색 }); }
  function 부호(n) { return n > 0 ? '+' + 콤마(n) : n < 0 ? '−' + 콤마(-n) : '0'; }
  function 퍼(v) { return v == null ? '—' : (v * 100).toFixed(1) + '%'; }
  function 잠(o) { return o.미상건 ? '≈ ' : ''; }
  function 딱(꼴, 글) { return 만들기('span', { class: 'xt ' + 꼴, text: 글 }); }
  function 차액꼴(o) { return o.차액 > 0 ? 'pos' : o.차액 < 0 ? 'neg' : ''; }

  /* ══ 들어오는 곳 — 08s 가 부른다 ══ */
  function 위(본문, 받은결, 폰, 기간글) {
    결 = 받은결; 이 = 결.이익; 기간 = 기간글; 칸 = { 폰: 폰 };
    if (!이) return;
    if (폰) 폰요약(본문); else PC요약(본문);
    칸.마켓 = 본문.appendChild(만들기('div', { class: (폰 ? 'ccard' : 'card table-card') + ' 이익마켓' }));
    칸.상품 = 본문.appendChild(만들기('div', { class: 폰 ? '이익상품칸' : 'card table-card 이익상품' }));
    마켓채우기(); 상품채우기();
  }
  function 기어(꼴) {
    var b = 만들기('button', { type: 'button', class: 꼴 + ' gear', text: '⚙ 수수료율' });
    b.addEventListener('click', 설정창);
    return b;
  }

  /* ══ 요약 ══ */
  function 객단가() { return 결.합계.건수 ? Math.round(결.합계.매출 / 결.합계.건수) : 0; }
  function 칸하나(k, v, sub, 꼴, 꼬리) {
    return 만들기('div', { html: '<div class="k">' + k + (꼬리 || '') + '</div><div class="v ' + (꼴 || '') + '">' + v + '</div>' +
      (sub ? '<div class="sub">' + sub + '</div>' : '') });
  }
  function PC요약(본문) {
    var h = 이.합계, 잠정 = h.미상건 ? ' <span class="tg">잠정</span>' : '';
    본문.appendChild(만들기('div', { class: 'stat five' }, [
      칸하나('매출', 콤마(결.합계.매출) + '<small>원</small>', '주문 ' + 콤마(결.합계.건수) + '건 · 객단가 ' + 콤마(객단가()) + '원', '검'),
      칸하나('이익', 콤마(h.이익) + '<small>원</small>', '매입가 있는 건 기준', 'pf' + (h.이익 < 0 ? ' neg' : ''), 잠정),
      칸하나('이익률', h.이익률 == null ? '—' : (h.이익률 * 100).toFixed(1) + '<small>%</small>', '이익 ÷ 매입가 있는 건 매출', 'pf' + (h.이익 < 0 ? ' neg' : '')),
      칸하나('배송비 차액', 부호(h.차액) + '<small>원</small>', '받은 ' + 콤마(h.받은) + ' − 낸 ' + 콤마(h.낸), 'pf' + (h.차액 < 0 ? ' neg' : ''))
    ]));
    var 항 = [['매출', 콤마(h.이익매출), ''], '−', ['매입', 콤마(h.매입), 'r'], '−', ['판매·배송비 수수료', 콤마(h.수수료), 'r'],
      '±', ['배송비 차액 (받은 − 낸)', 부호(h.차액), h.차액 < 0 ? 'r' : 'g'], '−', ['포장비', 콤마(h.포장비), 'r'], '=', ['이익', 콤마(h.이익), h.이익 < 0 ? 'r' : 'g', '결과']];
    본문.appendChild(만들기('div', { class: 'eq' }, 항.map(function (x) {
      return typeof x === 'string' ? 만들기('div', { class: 'op', text: x })
        : 만들기('div', { class: 'it ' + (x[3] || '') }, [만들기('div', { class: 'k', text: x[0] }), 만들기('div', { class: 'v ' + x[2], text: x[1] })]);
    })));
    var 예 = 예외들();
    if (예.length) 본문.appendChild(만들기('div', { class: 'exrow' }, 예.map(function (e) {
      return 만들기('div', { class: 'exc ' + e.꼴, html: '<span>' + e.표 + '</span>' + e.이름 + ' <b>' + 콤마(e.수) + '건</b><span class="r">' + u.안전(e.덧) + '</span>' });
    })));
  }
  function 예외들() {
    var h = 이.합계, 것들 = [];
    if (h.없음건) 것들.push({ 꼴: 'no', 표: '⚠', 이름: '매입가 없음', 수: h.없음건, 덧: '이익에서 제외 · 매출 ' + 콤마(h.없음매출) + '원', 폰덧: '제외' });
    if (h.미상건) 것들.push({ 꼴: 'un', 표: 'ⓘ', 이름: '배송비 미상', 수: h.미상건, 덧: h.미상마켓.join('·') + ' · 이익 잠정', 폰덧: '잠정', 폰이름: '배송비 미상 (' + h.미상마켓.join('·') + ')' });
    return 것들;
  }

  function 폰요약(본문) {
    var h = 이.합계;
    var 줄 = function (k, v, 꼴) { return '<div>' + k + '<b class="' + (꼴 || '') + '">' + v + '</b></div>'; };
    본문.appendChild(만들기('div', { class: 'sumcard 이익', html:
      '<div class="head"><div class="k">이익 · ' + 기간 + '</div>' + (h.미상건 ? '<span class="tg">잠정</span>' : '') +
      '<span class="rate">' + 퍼(h.이익률) + '</span></div>' +
      '<div class="big' + (h.이익 < 0 ? ' neg' : '') + '">' + 콤마(h.이익) + '<small>원</small></div>' +
      '<div class="two"><div><div class="k">매출</div><div class="v">' + 콤마(결.합계.매출) + '<small>원</small></div></div>' +
      '<div><div class="k">주문</div><div class="v">' + 콤마(결.합계.건수) + '<small>건</small></div></div></div>' +
      '<div class="bd2">' + 줄('매출 (매입가 있는 건)', 콤마(h.이익매출)) + 줄('− 매입', 콤마(h.매입), 'r') + 줄('− 수수료', 콤마(h.수수료), 'r') +
      줄('± 배송비 차액', 부호(h.차액), h.차액 < 0 ? 'r' : 'g') +
      '<div class="sp">받은 ' + 콤마(h.받은) + ' − 낸 택배비 ' + 콤마(h.낸) + '</div>' + 줄('− 포장비', 콤마(h.포장비), 'r') + '</div>' }));
    var 예 = 예외들();
    if (예.length) 본문.appendChild(만들기('div', { class: 'excs' }, 예.map(function (e) {
      return 만들기('div', { class: 'exc ' + e.꼴, html: '<span>' + u.안전(e.폰이름 || e.이름) + '</span><span><b>' + 콤마(e.수) + '</b>건 · ' + e.폰덧 + '</span>' });
    })));
  }

  /* ══ 마켓별 ══ */
  function 거른마켓() {
    return 이.마켓들.filter(function (m) { return 상태.거름 === '전체' || m.갈래 === 상태.거름; });
  }
  function 합치기(목록) {
    if (상태.거름 === '전체') return 이.합계;
    var o = { 매출: 0, 이익매출: 0, 매입: 0, 수수료: 0, 박스: 0, 부자재: 0, 받은: 0, 낸: 0, 이익: 0, 없음건: 0, 미상건: 0 };
    목록.forEach(function (m) { Object.keys(o).forEach(function (k) { o[k] += m[k]; }); });
    o.포장비 = o.박스 + o.부자재; o.차액 = o.받은 - o.낸; o.이익률 = o.이익매출 ? o.이익 / o.이익매출 : null;
    return o;
  }
  function 거름토글(목록) {
    return 만들기('span', { class: 'mini-tg', role: 'group' }, 목록.map(function (쌍) {
      var 켬 = 상태.거름 === 쌍[0];
      var b = 만들기('button', { type: 'button', class: 켬 ? 'on' : '', text: 쌍[1], 'aria-pressed': 켬 ? 'true' : 'false' });
      b.addEventListener('click', function () { if (!켬) { 상태.거름 = 쌍[0]; 마켓채우기(); } });
      return b;
    }));
  }
  function 마켓채우기() {
    u.비우기(칸.마켓);
    if (칸.폰) 폰마켓(); else PC마켓();
  }
  function 예외딱지(o) {
    var 것 = [];
    if (o.없음건) 것.push(딱('no', '매입가 없음 ' + o.없음건 + '건'));
    if (o.미상건) 것.push(딱('un', '배송비 미상 ' + o.미상건 + '건'));
    return 것.length ? 것 : [만들기('span', { class: '없음표', text: '—' })];
  }
  function 차액칸(o, 갈래) {
    var 위 = 갈래 === '미상' ? 만들기('span', { class: 'dv un', text: '미상' }) : 만들기('span', { class: 'dv ' + 차액꼴(o), text: 부호(o.차액) });
    var 아래 = 갈래 === '미상' ? '낸 ' + 콤마(o.낸) : 갈래 === '포함' ? '포함 · 낸 ' + 콤마(o.낸) : '받 ' + 콤마(o.받은) + ' − 낸 ' + 콤마(o.낸);
    return 만들기('td', { class: 'r' }, [위, 만들기('div', { class: 'ds2', text: 아래 })]);
  }
  function 이익칸(o, 합계줄) {
    if (!o.이익매출) return [만들기('td', { class: 'r pf 흐림', text: '—' }), 만들기('td', { class: 'r 흐림', text: '—' })];
    var 앞 = 합계줄 ? '' : 잠(o);   // 합계 줄은 「배송비 미상」 딱지가 대신 말한다(시안)
    return [만들기('td', { class: 'r pf' + (o.미상건 && !합계줄 ? ' prov' : '') + (o.이익 < 0 ? ' neg' : ''), text: 앞 + 콤마(o.이익) }),
            만들기('td', { class: 'r', text: 앞 + 퍼(o.이익률) })];
  }
  function PC마켓() {
    var 카드 = 칸.마켓, 목록 = 거른마켓(), 합 = 합치기(목록);
    카드.appendChild(만들기('h3', {}, [document.createTextNode('마켓별 이익 '), 만들기('span', { class: 'hint', text: 기간 }),
      만들기('span', { class: 'right' }, [거름토글([['전체', '전체'], ['포함', '배송비 포함'], ['불포함', '배송비 불포함']])])]));
    var 표 = 만들기('table', { class: '이익표' });
    표.innerHTML = '<colgroup><col style="width:128px"><col style="width:90px"><col style="width:84px"><col style="width:78px">' +
      '<col style="width:72px"><col style="width:130px"><col style="width:96px"><col style="width:72px"><col></colgroup>';
    표.appendChild(만들기('tr', {}, ['마켓', '매출', '매입', '수수료', '포장비', '배송비 차액', '이익', '이익률', '예외'].map(function (h, i) {
      return 만들기('th', { class: i && i < 8 ? 'r' : '', text: h });
    })));
    if (!목록.length) 표.appendChild(만들기('tr', {}, [만들기('td', { colspan: '9', class: 'dim', text: '이 기간 주문이 없습니다.' })]));
    목록.forEach(function (m) {
      표.appendChild(만들기('tr', {}, [
        만들기('td', {}, [만들기('div', { class: 'mn' }, [점(m.색), document.createTextNode(m.이름)]), 만들기('span', { class: 'kt ' + 갈래꼴[m.갈래], text: 갈래글[m.갈래] })]),
        만들기('td', { class: 'r', text: 콤마(m.매출) }), 만들기('td', { class: 'r dim', text: 콤마(m.매입) }),
        만들기('td', { class: 'r dim', text: 콤마(m.수수료) }), 만들기('td', { class: 'r dim', text: 콤마(m.포장비) }),
        차액칸(m, m.갈래)
      ].concat(이익칸(m), [만들기('td', {}, 예외딱지(m))])));
    });
    if (목록.length) {
      표.appendChild(만들기('tr', { class: 'tot' }, [만들기('td', { text: '합계' }), 만들기('td', { class: 'r', text: 콤마(합.매출) }),
        만들기('td', { class: 'r', text: 콤마(합.매입) }), 만들기('td', { class: 'r', text: 콤마(합.수수료) }), 만들기('td', { class: 'r', text: 콤마(합.포장비) }),
        차액칸(합, '불포함')].concat(이익칸(합, true), [만들기('td', {}, 예외딱지(합))])));
    }
    카드.appendChild(만들기('div', { class: 'ptab2' }, [표]));
  }
  function 폰마켓() {
    var 카드 = 칸.마켓;
    카드.appendChild(만들기('div', { class: 'chd' }, [만들기('h4', { text: '마켓별 이익' }),
      만들기('span', { class: 'right' }, [거름토글([['전체', '전체'], ['포함', '포함'], ['불포함', '불포함']])])]));
    var 목록 = 거른마켓();
    if (!목록.length) 카드.appendChild(만들기('div', { class: 'mr dim', text: '이 기간 주문이 없습니다.' }));
    목록.forEach(function (m) {
      var 아래 = [document.createTextNode('매출 ' + 콤마(m.매출) + ' · ')];
      if (m.갈래 === '미상') 아래.push(딱('un', '배송비 미상'));
      else 아래.push(document.createTextNode('배송비 '), 만들기('span', { class: 'dv ' + 차액꼴(m), text: 부호(m.차액) }));
      if (m.없음건) 아래.push(딱('no', '매입가 없음 ' + m.없음건 + '건'));
      카드.appendChild(만들기('div', { class: 'mr' }, [
        만들기('div', { class: 'a' }, [만들기('span', { class: 'nm' }, [점(m.색), document.createTextNode(m.이름)]),
          만들기('span', { class: 'pf' + (m.미상건 ? ' prov' : '') + (m.이익 < 0 ? ' neg' : ''), text: m.이익매출 ? 잠(m) + 콤마(m.이익) : '—' }),
          만들기('span', { class: 'pc2', text: m.이익매출 ? 잠(m) + 퍼(m.이익률) : '—' })]),
        만들기('div', { class: 'b' }, 아래)
      ]));
    });
  }

  /* ══ 상품별 — 매입가 없는 상품은 늘 맨 아래 ══ */
  function 걸린상품() {
    var 키 = 상태.글.toLowerCase().replace(/\s/g, '');
    var 것들 = 이.상품들.filter(function (p) {
      return !키 || 칸.폰 || (p.이름 + '|' + p.접두).toLowerCase().replace(/\s/g, '').indexOf(키) >= 0;
    });
    var 값 = {
      매출: function (p) { return -p.매출; }, 이익: function (p) { return -p.이익; },
      원가낮: function (p) { return p.원가율; }, 원가높: function (p) { return -p.원가율; }
    }[상태.정렬];
    return 것들.slice().sort(function (a, b) {
      if (a.없음 !== b.없음) return a.없음 ? 1 : -1;
      if (a.없음) return b.매출 - a.매출;
      return 값(a) - 값(b) || b.매출 - a.매출;
    });
  }
  function 화살() { return 상태.정렬 === '원가낮' ? ' ▴' : 상태.정렬 === '원가높' ? ' ▾' : ''; }
  function 정렬바꿈(k) { 상태.정렬 = k; 상태.쪽 = 1; 상태.보일수 = 폰한번; 상품채우기(); }
  function 원가막대(p) {
    return 만들기('div', { class: 'cbar' }, [만들기('i', { style: 'width:' + Math.min(100, p.원가율 * 130).toFixed(1) + '%' }),
      만들기('b', { text: Math.round(p.원가율 * 100) + '%' })]);
  }
  function 상품채우기() { if (칸.폰) 폰상품(); else PC상품(); }

  function PC상품() {
    var 카드 = 칸.상품;
    if (!칸.상품머리) {
      var 입력 = u.손대야열림(만들기('input', { class: 'inp', type: 'search', placeholder: '상품명 · 품목코드', value: 상태.글 }));
      u.조합안전입력(입력, function (v) { if (v === 상태.글) return; 상태.글 = v; 상태.쪽 = 1; PC상품(); }, 220);
      칸.상품힌트 = 만들기('span', { class: 'hint' });
      칸.정렬칸 = 만들기('span');
      칸.상품머리 = 카드.appendChild(만들기('h3', {}, [document.createTextNode('상품별 이익 '), 칸.상품힌트,
        만들기('span', { class: 'right' }, [칸.정렬칸, 만들기('span', { class: 'search' }, [입력])])]));
      칸.상품몸 = 카드.appendChild(만들기('div'));
    }
    u.비우기(칸.정렬칸);
    칸.정렬칸.appendChild(만들기('span', { class: 'mini-tg', role: 'group' }, 정렬들.map(function (쌍) {
      var 켬 = 상태.정렬 === 쌍[0];
      var b = 만들기('button', { type: 'button', class: 켬 ? 'on' : '', text: 쌍[1] + (켬 && 쌍[0].indexOf('원가') === 0 ? 화살() : ''), 'aria-pressed': 켬 ? 'true' : 'false' });
      b.addEventListener('click', function () { if (!켬) 정렬바꿈(쌍[0]); });
      return b;
    })));
    var 것들 = 걸린상품(), 총쪽 = Math.max(1, Math.ceil(것들.length / PC쪽크기));
    if (상태.쪽 > 총쪽) 상태.쪽 = 총쪽;
    칸.상품힌트.textContent = '상품 ' + 것들.length + '개';
    var 몸 = 칸.상품몸;
    u.비우기(몸);
    var 표 = 만들기('table', { class: '이익표' });
    표.innerHTML = '<colgroup><col style="width:40px"><col style="width:76px"><col><col style="width:100px"><col style="width:160px"><col style="width:100px"><col style="width:72px"></colgroup>';
    var 원가 = 상태.정렬.indexOf('원가') === 0;
    표.appendChild(만들기('tr', {}, [만들기('th', { class: 'c', text: '#' }), 만들기('th', { text: '품목코드' }), 만들기('th', { text: '상품' }),
      만들기('th', { class: 'r', text: '매출' }), 만들기('th', { class: 원가 ? 'sortbtn' : '', text: '원가율' + 화살() }),
      만들기('th', { class: 'r', text: '이익' }), 만들기('th', { class: 'r', text: '이익률' })]));
    if (!것들.length) 표.appendChild(만들기('tr', {}, [만들기('td', { colspan: '7', class: 'dim', text: 이.상품들.length ? '찾는 상품이 없습니다.' : '이 기간 주문이 없습니다.' })]));
    var 시작 = (상태.쪽 - 1) * PC쪽크기;
    것들.slice(시작, 시작 + PC쪽크기).forEach(function (p, n) {
      표.appendChild(만들기('tr', { class: p.없음 ? 'nocost' : '' }, [
        만들기('td', { class: 'rk', text: p.없음 ? '—' : String(시작 + n + 1) }), 만들기('td', { class: 'code', text: p.코드 }),
        만들기('td', { class: 'pn', text: p.이름 }), 만들기('td', { class: 'r', text: 콤마(p.매출) }),
        만들기('td', {}, [p.없음 ? 딱('no', '매입가 없음') : 원가막대(p)]),
        만들기('td', { class: 'r pf' + (p.없음 ? ' 흐림' : '') + (p.이익 < 0 ? ' neg' : ''), text: p.없음 ? '—' : 콤마(p.이익) }),
        만들기('td', { class: 'r' + (p.없음 ? ' 흐림' : ''), text: p.없음 ? '—' : 퍼(p.이익률) })
      ]));
    });
    몸.appendChild(표);
    if (총쪽 > 1) 몸.appendChild(ZG.주문실적화면.쪽줄(총쪽, 것들.length, 상태.쪽, function (쪽) { 상태.쪽 = 쪽; PC상품(); }));
  }

  function 폰상품() {
    var 칸상 = 칸.상품;
    u.비우기(칸상);
    var 것들 = 걸린상품();
    칸상.appendChild(만들기('div', { class: 'chd' }, [만들기('h4', { text: '상품별 이익' }), 만들기('span', { class: 'n', text: '상품 ' + 것들.length + '개' })]));
    칸상.appendChild(만들기('div', { class: 'hscroll' }, 정렬들.map(function (쌍) {
      var 켬 = 상태.정렬 === 쌍[0];
      var b = 만들기('button', { type: 'button', class: 'fchip' + (켬 ? ' on' : ''), text: 쌍[1] + (켬 && 쌍[0].indexOf('원가') === 0 ? 화살() : '') });
      b.addEventListener('click', function () { if (!켬) 정렬바꿈(쌍[0]); });
      return b;
    })));
    if (!것들.length) 칸상.appendChild(만들기('div', { class: 'pk', text: '이 기간 주문이 없습니다.' }));
    것들.slice(0, 상태.보일수).forEach(function (p) {
      칸상.appendChild(만들기('div', { class: 'pk' + (p.없음 ? ' nocost' : '') }, [
        만들기('div', { class: 't1' }, [만들기('span', { class: 'nm', text: p.이름 }), 만들기('span', { class: 'cd', text: p.코드 }),
          만들기('span', { class: 'pf' + (p.없음 ? ' 흐림' : '') + (p.이익 < 0 ? ' neg' : ''), text: p.없음 ? '—' : 콤마(p.이익) })]),
        만들기('div', { class: 't2' }, p.없음
          ? [document.createTextNode('매출 '), 만들기('b', { text: 콤마(p.매출) }), 딱('no', '매입가 없음')]
          : [document.createTextNode('매출 '), 만들기('b', { text: 콤마(p.매출) }), 만들기('span', { text: '원가율' }), 원가막대(p),
             만들기('span', {}, [document.createTextNode('이익률 '), 만들기('b', { text: 퍼(p.이익률) })])])
      ]));
    });
    if (것들.length > 상태.보일수) {
      var 더 = 만들기('button', { type: 'button', class: 'btn 더보기', text: '더 보기 (' + (것들.length - 상태.보일수) + '개 남음)' });
      더.addEventListener('click', function () { 상태.보일수 += 폰한번; 폰상품(); });
      칸상.appendChild(더);
    }
  }

  /* ══ ⚙ 수수료율 창 — PC 가운데 창 · 폰 온 화면. 저장 전까지는 입력칸만 바뀐다 ══ */
  function 설정창() {
    var 저 = ZG.저장소, 익 = ZG.실적이익, 폰 = u.폰인가();
    var 옛 = 저.읽기(저.키.실적이익설정) || {}, s = 익.설정(옛), 칸들 = {};
    var 막 = document.body.appendChild(만들기('div', { class: 'pcscrim' }));
    var 창 = 만들기('div', { class: 'pcsheet 이익설정' + (폰 ? ' 폰' : ''), role: 'dialog', 'aria-modal': 'true', 'aria-label': '마켓별 수수료율' });
    function 닫기() { u.탈출풀기(); 막.remove(); 창.remove(); }
    막.addEventListener('click', 닫기);

    function 수칸(d, k) {
      var 막힘 = d[k] == null && k === '배송비';
      var i = 만들기('input', { class: 'inp num sin', type: 'text', inputmode: 'decimal', value: 막힘 ? '—' : String(d[k]), 'aria-label': d.마켓 + ' ' + (k === '판매' ? '판매' : '배송비') + ' 수수료' });
      if (막힘) i.disabled = true; else (칸들[d.마켓] = 칸들[d.마켓] || {})[k] = i;
      var 추 = 막힘 ? null : 만들기('span', { class: 'est' + (d.확정 ? ' fix' : ''), text: d.확정 ? '확정' : '추정' });
      return [i, 만들기('span', { class: 'u', text: '%' }), 추];
    }
    function 이름(d) { return 만들기('div', { class: 'mn' }, [점(d.마켓 === '문자·당근·전화' ? ZG.주문실적.마켓색('당근') : ZG.주문실적.마켓색(d.마켓)), document.createTextNode(d.마켓)]); }
    var 본 = 폰 ? 폰판(s.수수료, 수칸, 이름) : PC판(s.수수료, 수칸, 이름);

    function 기본으로() {
      익.기본값.수수료.forEach(function (d) {
        var c = 칸들[d.마켓] || {};
        if (c.판매) c.판매.value = String(d.판매);
        if (c.배송비) c.배송비.value = String(d.배송비);
      });
    }
    function 저장() {
      var 바꾼 = {}, 틀림 = null;
      익.기본값.수수료.forEach(function (d) {
        var c = 칸들[d.마켓] || {};
        ['판매', '배송비'].forEach(function (k) {
          if (!c[k]) return;
          var v = Number(String(c[k].value).replace(/[%\s]/g, ''));
          if (!isFinite(v) || v < 0 || v > 100) { 틀림 = 틀림 || c[k]; return; }
          if (v !== d[k]) (바꾼[d.마켓] = 바꾼[d.마켓] || {})[k] = v;
        });
      });
      if (틀림) { u.흔들기(틀림); 틀림.focus(); return; }
      저.전체쓰기(저.키.실적이익설정, Object.assign({}, 옛, { 수수료: 바꾼 }));
      닫기();
      u.토스트('수수료율을 저장했습니다.');
      ZG.주문.다시그리기();
    }
    var 기본단추 = 만들기('button', { type: 'button', class: 'btn', text: 폰 ? '기본값' : '기본값으로' });
    기본단추.addEventListener('click', 기본으로);
    var 저장단추 = 만들기('button', { type: 'button', class: 'btn main', text: '저장' });
    저장단추.addEventListener('click', 저장);
    var 닫기단추 = 만들기('button', { type: 'button', class: 폰 ? 'pill' : 'x', text: 폰 ? '닫기' : '✕', 'aria-label': '닫기' });
    닫기단추.addEventListener('click', 닫기);

    if (폰) {
      창.appendChild(만들기('div', { class: 'top' }, [만들기('h2', { text: '수수료율' }), 닫기단추]));
      창.appendChild(본);
      창.appendChild(만들기('div', { class: 'sbar' }, [기본단추, 저장단추]));
    } else {
      var 취소 = 만들기('button', { type: 'button', class: 'btn', text: '취소' });
      취소.addEventListener('click', 닫기);
      기본단추.classList.add('l');
      창.appendChild(만들기('h3', {}, [document.createTextNode('마켓별 수수료율'), 만들기('span', { class: 'est', text: '전부 추정' }), 닫기단추]));
      창.appendChild(본);
      창.appendChild(만들기('div', { class: 'btnrow' }, [기본단추, 취소, 저장단추]));
    }
    document.body.appendChild(창);
    u.탈출걸기(닫기);
  }
  function PC판(줄들, 수칸, 이름) {
    var 표 = 만들기('table');
    표.innerHTML = '<colgroup><col style="width:150px"><col style="width:190px"><col style="width:190px"><col></colgroup>';
    표.appendChild(만들기('tr', {}, ['마켓', '판매 수수료', '배송비 수수료', '확인 상태'].map(function (h) { return 만들기('th', { text: h }); })));
    줄들.forEach(function (d) {
      var 칸 = function (k, 글) { return 만들기('td', {}, [만들기('div', { class: 'sw2' }, 수칸(d, k)), 만들기('div', { class: 'ds2l', text: 글 || '' })]); };
      표.appendChild(만들기('tr', {}, [만들기('td', {}, [이름(d)]), 칸('판매', d.판매글), 칸('배송비', d.배송비글),
        만들기('td', {}, [d.확인 ? 만들기('span', { class: 'lv ' + (d.급 || 'y'), text: d.확인 }) : 만들기('span', { class: '없음표', text: '—' })])]));
    });
    return 만들기('div', { class: 'tb' }, [표]);
  }
  function 폰판(줄들, 수칸, 이름) {
    var 판 = 만들기('div', { class: '판' }, [만들기('div', { class: 'sh' }, [만들기('span', { class: 'h1', text: '마켓' }),
      만들기('span', { class: 'h2', text: '판매 수수료' }), 만들기('span', { class: 'h3', text: '배송비 수수료' })])]);
    줄들.forEach(function (d) {
      var 판매 = 수칸(d, '판매'), 배 = 수칸(d, '배송비');
      var 덧 = [판매[2]].concat(d.판매글 ? [document.createTextNode(' · ' + d.판매글)] : []);
      판.appendChild(만들기('div', { class: 'sk' }, [
        만들기('div', { class: 'l' }, [이름(d), 만들기('div', { class: 's' }, 덧)]),
        만들기('div', { class: 'f' }, [판매[0], 판매[1]]),
        만들기('div', { class: 'f f2' }, d.배송비 == null ? [만들기('span', { class: 'colh', text: '미상' })] : [배[0], 배[1]])
      ]));
    });
    return 판;
  }

  ZG.실적이익화면 = { 위: 위, 기어: 기어, 상태: 상태, 설정창: 설정창 };
})(window.ZG);
