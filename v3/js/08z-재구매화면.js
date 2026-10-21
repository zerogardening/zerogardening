/* 08z-재구매화면 — 주문실적 탭 「재구매」 (30단계 설계 · 시안 28-재구매-macA)
   08s 가 이익(08x) 바로 아래에서 위(본문, 폰) 을 부른다. 숫자는 누적이라 기간 칩과 상관없다.
   정렬·쪽·폰 펼침은 메모리로만 — 그 칸만 다시 채운다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기, 콤마 = u.콤마;
  var 상태 = { 정렬: '회차', 쪽: 1, 보일수: 20, 폈다: {} };
  var 자 = null, 칸 = {};
  var PC쪽크기 = 12, 폰한번 = 20;
  var 정렬들 = [['회차', '구매횟수순'], ['매출', '누적매출순'], ['최근', '최근구매순'], ['이익', '이익순']];

  function 점(색) { return 만들기('i', { class: 'md', style: 'background:' + 색 }); }
  function 퍼(v) { return v == null ? '—' : (v * 100).toFixed(1) + '%'; }
  function 누적() { return '<span class="tg">누적</span>'; }
  function 못셈딱지() { return 자.못셈 ? 만들기('span', { class: 'xt no', text: '못 세는 줄 ' + 자.못셈 }) : null; }
  function 마켓이름(m) { return 만들기('div', { class: 'mn' }, [점(m.색), document.createTextNode(m.이름)]); }
  function 이익글(손) { return 손.이익있음 ? (손.잠정 ? '≈ ' : '') + 콤마(Math.round(손.이익)) : '—'; }
  function 이익꼴(손) { return !손.이익있음 ? ' 흐림' : (손.잠정 ? ' prov' : '') + (손.이익 < 0 ? ' neg' : ''); }

  /* ══ 들어오는 곳 ══ */
  function 위(본문, 폰) {
    if (!ZG.재구매) return;
    자 = ZG.재구매.읽어모으기(); 칸 = { 폰: 폰 };
    if (폰) return 폰판(본문);
    var 넷 = 본문.querySelector('.stat.five');   // 08x 요약 줄 끝에 다섯째 칸
    if (넷) 넷.appendChild(만들기('div', { html: '<div class="k">재구매율' + 누적() + '</div><div class="v pf">' +
      (자.율 == null ? '—' : (자.율 * 100).toFixed(1) + '<small>%</small>') + '</div><div class="sub">재구매 ' + 콤마(자.재구매수) +
      '명 ÷ 손님 ' + 콤마(자.손님수) + '명</div>' }));
    PC요약(본문); PC마켓(본문);
    칸.손님 = 본문.appendChild(만들기('div', { class: 'card table-card 재구매손님' }));
    손님채우기();
  }

  function 분포줄(i) {
    var n = 자.분포[i], 비 = 자.손님수 ? n / 자.손님수 : 0;
    return 만들기('div', { class: 'dr' + (i ? '' : ' 한번') }, [만들기('span', { class: 'l', text: i === 4 ? '5회 이상' : (i + 1) + '회' }),
      만들기('div', { class: 'dbar' }, [만들기('i', { style: 'width:' + (비 * 100).toFixed(1) + '%' })]),
      만들기('b', { html: 콤마(n) + '<small>명</small>' }), 만들기('span', { class: 'p', text: 퍼(비) })]);
  }
  function 분포들() { return [0, 1, 2, 3, 4].map(분포줄); }

  /* ══ PC ══ */
  function PC요약(본문) {
    var 큰 = function (k, v, 꼴) { return 만들기('div', { html: '<div class="k">' + k + '</div><div class="v ' + (꼴 || '') + '">' + v + '</div>' }); };
    본문.appendChild(만들기('div', { class: 'card 재구매' }, [
      만들기('h3', { html: '재구매' + 누적() }, [만들기('span', { class: 'right' }, [못셈딱지()])]),
      만들기('div', { class: 'sumrow' }, [
        만들기('div', { class: 'big3' }, [큰('전체 손님', 콤마(자.손님수) + '<small>명</small>'), 큰('재구매 손님', 콤마(자.재구매수) + '<small>명</small>', 'pf'),
          큰('재구매율', 자.율 == null ? '—' : (자.율 * 100).toFixed(1) + '<small>%</small>', 'pf')]),
        만들기('div', { class: 'dist' }, [만들기('div', { class: 'dh', text: '구매 횟수별 손님' })].concat(분포들()))
      ])
    ]));
  }

  function 마켓줄(m, 합계) {
    var 율 = 만들기('div', { class: 'cbar' }, [합계 ? null : 만들기('span', { class: '율막대' }, [만들기('i', { style: 'width:' + Math.min(100, (m.율 || 0) * 400).toFixed(1) + '%' })]),
      만들기('b', { text: 퍼(m.율) })]);
    var 수 = function (v) { return 만들기('td', { class: 'r', text: 콤마(v) }); };
    return 만들기('tr', { class: 합계 ? 'tot' : '' }, [만들기('td', {}, [합계 ? document.createTextNode('합계') : 마켓이름(m)]),
      만들기('td', { class: 'r', text: 콤마(m.첫) }), 만들기('td', { class: 'r pf', text: 콤마(m.재) }), 만들기('td', {}, [율]),
      수(m.같은), 수(m.나감), 수(m.들어옴)]);
  }
  function PC마켓(본문) {
    var 표 = 만들기('table', { class: '이익표' });
    표.innerHTML = '<colgroup><col style="width:150px"><col style="width:100px"><col style="width:90px"><col><col style="width:90px"><col style="width:120px"><col style="width:120px"></colgroup>';
    표.appendChild(만들기('tr', {}, ['마켓', '첫 구매 손님', '재구매 손님', '재구매율', '같은 마켓', '다른 마켓으로 ↗', '다른 마켓에서 ↙'].map(function (h, i) {
      return 만들기('th', { class: i && i !== 3 ? 'r' : '', text: h });
    })));
    자.마켓들.forEach(function (m) { 표.appendChild(마켓줄(m)); });
    표.appendChild(마켓줄(자.합, true));
    본문.appendChild(만들기('div', { class: 'card table-card 재구매마켓' }, [
      만들기('h3', { html: '마켓별 재구매율 <span class="hint">첫 구매 마켓 기준</span>' }), 만들기('div', { class: 'ptab2' }, [표])]));
  }

  /* ══ 재구매 손님 ══ */
  function 줄세운손님() {
    var 값 = {
      회차: function (a, b) { return b.회차 - a.회차 || b.매출 - a.매출; },
      매출: function (a, b) { return b.매출 - a.매출; },
      최근: function (a, b) { return a.최근 < b.최근 ? 1 : a.최근 > b.최근 ? -1 : b.회차 - a.회차; },
      이익: function (a, b) { return (b.이익있음 - a.이익있음) || b.이익 - a.이익; }
    }[상태.정렬];
    return 자.손님들.slice().sort(값);
  }
  function 정렬바꿈(k) { 상태.정렬 = k; 상태.쪽 = 1; 상태.보일수 = 폰한번; 손님채우기(); }
  function 정렬단추(쌍, 꼴) {
    var 켬 = 상태.정렬 === 쌍[0];
    var b = 만들기('button', { type: 'button', class: (꼴 || '') + (켬 ? ' on' : ''), text: 쌍[1], 'aria-pressed': 켬 ? 'true' : 'false' });
    b.addEventListener('click', function () { if (!켬) 정렬바꿈(쌍[0]); });
    return b;
  }
  function 손님채우기() { u.비우기(칸.손님); if (칸.폰) 폰손님(); else PC손님(); }

  function PC손님() {
    var 것들 = 줄세운손님(), 총쪽 = Math.max(1, Math.ceil(것들.length / PC쪽크기));
    if (상태.쪽 > 총쪽) 상태.쪽 = 총쪽;
    칸.손님.appendChild(만들기('h3', { html: '재구매 손님 <span class="hint">' + 콤마(것들.length) + '명</span>' }, [
      만들기('span', { class: 'right' }, [만들기('span', { class: 'mini-tg', role: 'group' }, 정렬들.map(function (쌍) { return 정렬단추(쌍); }))])]));
    var 표 = 만들기('table', { class: '이익표' });
    표.innerHTML = '<colgroup><col style="width:40px"><col style="width:110px"><col><col style="width:84px"><col style="width:110px"><col style="width:110px"><col style="width:130px"><col style="width:110px"></colgroup>';
    표.appendChild(만들기('tr', {}, [만들기('th', { class: 'c', text: '#' })].concat(['이름', '주소', '구매 횟수', '누적 매출', '최근 구매일', '주로 산 마켓', '이익'].map(function (h, i) {
      return 만들기('th', { class: i >= 2 && i <= 4 || i === 6 ? 'r' : '', text: h });
    }))));
    if (!것들.length) 표.appendChild(만들기('tr', {}, [만들기('td', { colspan: '8', class: 'dim', text: '재구매 손님이 없습니다.' })]));
    var 시작 = (상태.쪽 - 1) * PC쪽크기;
    것들.slice(시작, 시작 + PC쪽크기).forEach(function (손, n) {
      표.appendChild(만들기('tr', {}, [만들기('td', { class: 'rk', text: String(시작 + n + 1) }), 만들기('td', { class: 'pn', text: 손.이름 }),
        만들기('td', { class: 'addr', text: 손.주소, title: 손.주소 }), 만들기('td', { class: 'r' }, [만들기('b', { class: 'cnt', text: 손.회차 + '회' })]),
        만들기('td', { class: 'r', text: 콤마(손.매출) }), 만들기('td', { class: 'r dim', text: 손.최근 }),
        만들기('td', {}, [마켓이름({ 이름: 손.주로, 색: 손.주로색 })]),
        만들기('td', { class: 'r pf' + 이익꼴(손), text: 이익글(손) })]));
    });
    칸.손님.appendChild(만들기('div', { class: 'ptab2' }, [표]));
    if (총쪽 > 1) 칸.손님.appendChild(ZG.주문실적화면.쪽줄(총쪽, 것들.length, 상태.쪽, function (쪽) { 상태.쪽 = 쪽; 손님채우기(); }, '손님 ' + 콤마(것들.length) + '명'));
  }

  /* ══ 폰 — 요약·횟수는 펴 두고, 마켓·손님은 접어 둔다(시안) ══ */
  function 폰판(본문) {
    본문.appendChild(만들기('div', { class: 'sumcard 재구매' }, [
      만들기('div', { class: 'head', html: '<div class="k">재구매</div>' + 누적() + '<span class="rate">' + 퍼(자.율) + '</span>' }),
      만들기('div', { class: 'two', html: '<div><div class="k">전체 손님</div><div class="v">' + 콤마(자.손님수) + '<small>명</small></div></div>' +
        '<div><div class="k">재구매 손님</div><div class="v pf">' + 콤마(자.재구매수) + '<small>명</small></div></div>' }),
      자.못셈 ? 만들기('div', { class: '딱지줄' }, [못셈딱지()]) : null
    ]));
    본문.appendChild(만들기('div', { class: 'ccard 재구매횟수' }, [만들기('div', { class: 'chd' }, [만들기('h4', { text: '구매 횟수별 손님' })])].concat(분포들())));
    var 마 = 만들기('div', { class: 'ccard 재구매마켓' });
    자.마켓들.concat([자.합]).forEach(function (m, i, 다) {
      var 합계 = i === 다.length - 1;
      마.appendChild(만들기('div', { class: 'mr' }, [
        만들기('div', { class: 'a' }, [만들기('span', { class: 'nm' }, 합계 ? [document.createTextNode('합계')] : [점(m.색), document.createTextNode(m.이름)]),
          만들기('span', { class: 'pf', text: 퍼(m.율) })]),
        만들기('div', { class: 'b', html: '<span>' + (합계 ? '손님 ' : '첫 구매 ') + 콤마(m.첫) + '명 · 재구매 <b>' + 콤마(m.재) + '</b>명 · 같은 ' + m.같은 +
          ' · 나감 ' + m.나감 + ' · 들어옴 ' + m.들어옴 + '</span>' })]));
    });
    접기(본문, '마켓', '마켓별 재구매율', '', 마);
    칸.손님 = 만들기('div', { class: '재구매손님칸' });
    접기(본문, '손님', '재구매 손님', 콤마(자.재구매수) + '명', 칸.손님);
    손님채우기();
  }
  function 접기(본문, 열쇠, 제목, 덧, 속) {
    var 몸 = 만들기('div', { class: 'foldbody' + (상태.폈다[열쇠] ? ' open' : '') }, [만들기('div', {}, [속])]);
    var 머리 = 만들기('button', { type: 'button', class: 'fold 재구매접기', 'aria-expanded': 상태.폈다[열쇠] ? 'true' : 'false' }, [
      점('var(--color-accent)'), document.createTextNode(제목), 덧 ? 만들기('span', { class: 's', text: 덧 }) : null, 만들기('span', { class: 'r', text: '▾' })]);
    머리.addEventListener('click', function () {
      상태.폈다[열쇠] = 몸.classList.toggle('open');
      머리.setAttribute('aria-expanded', 상태.폈다[열쇠] ? 'true' : 'false');
    });
    본문.appendChild(머리); 본문.appendChild(몸);
  }
  function 폰손님() {
    var 것들 = 줄세운손님();
    칸.손님.appendChild(만들기('div', { class: 'hscroll' }, 정렬들.map(function (쌍) { return 정렬단추(쌍, 'fchip'); })));
    if (!것들.length) 칸.손님.appendChild(만들기('div', { class: 'pk', text: '재구매 손님이 없습니다.' }));
    것들.slice(0, 상태.보일수).forEach(function (손) {
      칸.손님.appendChild(만들기('div', { class: 'pk' }, [
        만들기('div', { class: 't1' }, [만들기('span', { class: 'nm', text: 손.이름 }), 만들기('span', { class: 'cnt', text: 손.회차 + '회' }),
          만들기('span', { class: 'pf 검', text: 콤마(손.매출) })]),
        만들기('div', { class: 't2' }, [만들기('span', {}, [document.createTextNode('최근 '), 만들기('b', { text: 손.최근.slice(5) })]),
          만들기('span', { class: 'mn' }, [점(손.주로색), document.createTextNode(손.주로)]),
          만들기('span', { class: '이익' }, [document.createTextNode('이익 '), 만들기('b', { class: 이익꼴(손), text: 이익글(손) })])]),
        만들기('div', { class: 't3', text: 손.주소 })
      ]));
    });
    if (것들.length > 상태.보일수) {
      var 더 = 만들기('button', { type: 'button', class: 'btn 더보기', text: '더 보기 (' + (것들.length - 상태.보일수) + '명 남음)' });
      더.addEventListener('click', function () { 상태.보일수 += 폰한번; 손님채우기(); });
      칸.손님.appendChild(더);
    }
  }

  ZG.재구매화면 = { 위: 위, 상태: 상태 };
})(window.ZG);
