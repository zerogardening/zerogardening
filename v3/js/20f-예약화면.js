/* 20f-예약화면 — 예약칩 · 펼친 판 예약칸 · 날짜판 · 예약 갈래 두 구역 (18단계 설계 §3-3 · 시안 18b ①②).
   목록 한 줄(폰카드·PC줄)은 20c 것을 받아 쓴다 — 줄 모양이 두 벌로 갈라지지 않게. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 요일 = ['일', '월', '화', '수', '목', '금', '토'];
  function 자() { return ZG.문자주문자료; }
  function 예() { return ZG.예약자료; }

  function 두자리(n) { return (n < 10 ? '0' : '') + n; }
  function 날글(날) {
    var d = new Date(Number(날.slice(0, 4)), Number(날.slice(5, 7)) - 1, Number(날.slice(8, 10)));
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + 요일[d.getDay()] + ')';
  }
  function 짧은날(날) { return Number(날.slice(5, 7)) + '/' + Number(날.slice(8, 10)); }
  function 달옮기기(달, 걸음) {
    var 해 = Number(달.slice(0, 4)), 월 = Number(달.slice(5, 7)) + 걸음;
    해 += Math.floor((월 - 1) / 12);
    월 = ((월 - 1) % 12 + 12) % 12 + 1;
    return 해 + '-' + 두자리(월);
  }
  function 단추(글, 결, 누름) {
    var b = 만들기('button', { class: 결 || '', type: 'button', text: 글 });
    b.addEventListener('click', function (e) { e.stopPropagation(); 누름(); });
    return b;
  }

  /* ── 칩 ── */
  function 예약칩(r, PC칸) {
    if (!r.예약일) return 만들기('span', { class: 'st resv 미정', text: PC칸 ? '날짜 미정' : '예약 · 날짜 미정' });
    return 만들기('span', { class: 'st resv' + (예().때됨(r.예약일) ? ' due' : ''), text: '예약 ' + 짧은날(r.예약일) });
  }
  function D칸(r) {
    if (!r.예약일) return null;
    return 만들기('span', { class: 'dn' + (예().때됨(r.예약일) ? ' due' : ''), text: 예().D글(r.예약일) });
  }

  /* ── 날짜판 — 지난 날은 못 고른다(오늘은 된다) ── */
  function 날짜판(판, 값, 고름) {
    var 상자 = 만들기('div', { class: '날짜판' });
    상자.addEventListener('click', function (e) { e.stopPropagation(); });
    function 그리기() {
      u.비우기(상자);
      var 머리 = 만들기('div', { class: 'calhd' }, [
        단추('‹', '', function () { 판.달 = 달옮기기(판.달, -1); 그리기(); }),
        만들기('div', { class: 'm', text: Number(판.달.slice(0, 4)) + '년 ' + Number(판.달.slice(5, 7)) + '월' }),
        단추('›', '', function () { 판.달 = 달옮기기(판.달, 1); 그리기(); })
      ]);
      var 표 = 만들기('div', { class: 'cal' }), 오늘 = u.오늘문자();
      요일.forEach(function (요, i) { 표.appendChild(만들기('div', { class: 'wd' + (i === 0 ? ' sun' : ''), text: 요 })); });
      var 해 = Number(판.달.slice(0, 4)), 월 = Number(판.달.slice(5, 7));
      var 첫 = new Date(해, 월 - 1, 1).getDay(), 끝 = new Date(해, 월, 0).getDate();
      for (var b = 0; b < 첫; b++) 표.appendChild(만들기('div', { class: 'd off' }));
      for (var n = 1; n <= 끝; n++) {
        var 날 = 판.달 + '-' + 두자리(n), 지난 = 날 < 오늘;
        var 칸 = 만들기('button', {
          type: 'button', text: String(n), 'aria-label': 날글(날),
          class: 'd' + ((첫 + n - 1) % 7 === 0 ? ' sun' : '') + (지난 ? ' 지난' : '') + (날 === 오늘 ? ' today' : '') + (날 === 값 ? ' on' : '')
        });
        if (지난) 칸.disabled = true;
        else 칸.addEventListener('click', (function (날) { return function () { 고름(날); }; })(날));
        표.appendChild(칸);
      }
      상자.appendChild(머리); 상자.appendChild(표);
    }
    그리기();
    return 상자;
  }

  /* 예약고름 [📅 예약일 정하기 | 날짜 미정] — 판.정하기 는 날을 아직 안 고른 「정하는 중」 */
  function 고름줄(판, 사본, 다시) {
    var 정함 = !!(사본.예약 && 사본.예약일) || !!판.정하기;
    return 만들기('div', { class: '예약고름' }, [
      단추('📅 예약일 정하기', 정함 ? 'on' : '', function () {
        판.정하기 = true; 판.열림 = true;
        if (!판.달) 판.달 = (사본.예약일 || u.오늘문자()).slice(0, 7);
        다시();
      }),
      단추('날짜 미정', !정함 && 사본.예약 ? 'on' : '', function () {
        사본.예약 = true; 사본.예약일 = ''; 판.정하기 = false; 판.열림 = false; 다시();
      })
    ]);
  }
  function 날짜칸(판, 사본, 다시) {
    var e = 만들기('input', { class: 'inp' + (판.열림 ? ' 고름' : 사본.예약일 ? ' 정함' : ''), type: 'text', readonly: 'readonly',
      placeholder: '예약일', value: 사본.예약일 ? 날글(사본.예약일) : '' });
    e.addEventListener('click', function (ev) {
      ev.stopPropagation();
      판.열림 = !판.열림;
      if (!판.달) 판.달 = (사본.예약일 || u.오늘문자()).slice(0, 7);
      다시();
    });
    return 만들기('div', { class: '날짜칸' }, [e]);
  }

  /* 펼친 판 예약칸 — 🔴 이 칸만 다시 그린다. 사람칸을 갈면 치던 글과 한글 조합이 날아간다 (§3-3)
     판 = 상태.열린.예약판 — 남이 저장해 판 전체가 다시 그려져도 열림·달이 남는다 */
  function 예약칸(사본, 폰, 판, 바뀜) {
    var 칸 = 만들기('div', { class: '예약필드' + (폰 ? '' : ' 가로') });
    function 다시() {
      u.비우기(칸);
      var 정하는중 = !!(사본.예약 && 사본.예약일) || !!판.정하기;
      var 줄 = [고름줄(판, 사본, 다시)];
      if (사본.예약) 줄.push(단추('예약 해제', 'btn' + (폰 ? '' : ' sm'), function () {
        사본.예약 = false; 사본.예약일 = ''; 판.정하기 = false; 판.열림 = false; 다시();
      }));
      var 밭 = 만들기('div', { class: 'field' }, [
        만들기('label', { html: '예약 <span class="auto">선택</span>' }),
        만들기('div', { class: '예약줄' }, 줄),
        정하는중 ? 날짜칸(판, 사본, 다시) : null
      ]);
      칸.appendChild(밭);
      if (정하는중 && 판.열림) {
        var 판칸 = 날짜판(판, 사본.예약일, function (날) {
          사본.예약 = true; 사본.예약일 = 날; 판.정하기 = false; 판.열림 = false; 다시();
        });
        칸.appendChild(폰 ? 판칸 : 만들기('div', { class: '판자리' }, [판칸]));
      }
      if (바뀜) 바뀜();
    }
    다시();
    return 칸;
  }

  /* 주문올리기 단추 잠금 — 접힌 줄·펼친 판이 같은 모양으로 잠근다 */
  function 잠그기(b, r) {
    var 됨 = 자().올릴수있나(r);
    b.disabled = !됨.된다;
    b.classList.toggle('잠김', !됨.된다);
    b.textContent = 됨.된다 ? '주문올리기' : '🔒 주문올리기';
    b.title = 됨.된다 ? '' : 됨.까닭;
  }

  /* ── 갈래 칩 [오늘 n] [예약 n ●] ── */
  function 갈래칩(갈래, 오늘수, 고름) {
    var 목 = 예().예약목록(), 예약들 = 목.지정.concat(목.미정);
    var 점 = 목.지정.some(function (r) { return 예().때됨(r.예약일); });
    var 오 = 만들기('button', { type: 'button', class: 'fchip' + (갈래 === '예약' ? '' : ' on'), html: '오늘<span class="n">' + 오늘수 + '</span>' });
    var 약 = 만들기('button', { type: 'button', class: 'fchip 예약' + (갈래 === '예약' ? ' on' : ''),
      html: '예약<span class="n">' + 예약들.length + '</span>' + (점 ? '<span class="점"></span>' : '') });
    오.addEventListener('click', function () { 고름('오늘'); });
    약.addEventListener('click', function () { 고름('예약'); });
    return 만들기('div', { class: 'fchips' }, [오, 약]);
  }

  function 합(목록) { return 목록.reduce(function (a, r) { return a + 자().합계(r).합; }, 0); }
  function 셈글(목록) { return '<b>' + 목록.length + '</b>건 · <b>' + u.콤마(합(목록)) + '</b>원'; }
  /* 같은 열쇠끼리 차례를 지키며 묶는다 — 목록이 이미 그 열쇠로 정렬돼 있다 */
  function 묶기(목록, 열쇠) {
    var 무리 = [];
    목록.forEach(function (r) {
      var k = 열쇠(r), 끝 = 무리[무리.length - 1];
      if (끝 && 끝.k === k) 끝.줄들.push(r); else 무리.push({ k: k, 줄들: [r] });
    });
    return 무리;
  }

  /* ── 폰 — 위 예약일 지정 / 아래 날짜 미정. 빈 구역은 통째로 안 그린다 ── */
  function 폰구역(칸, 카드) {
    var 목 = 예().예약목록(), 줄들 = [];
    function 넣기(e) { 칸.appendChild(e); 줄들.push(e); }
    if (목.지정.length) {
      넣기(만들기('div', { class: '구역머리', html: '📅 예약일 지정<span class="r">' + 셈글(목.지정) + '</span>' }));
      묶기(목.지정, function (r) { return r.예약일; }).forEach(function (g) {
        var 됨 = 예().때됨(g.k);
        넣기(만들기('div', { class: '예약머리' + (됨 ? ' 때됨' : ''),
          html: 날글(g.k) + '<span class="dn' + (됨 ? ' due' : '') + '">' + 예().D글(g.k) + '</span><span class="r">' + 셈글(g.줄들) + '</span>' }));
        g.줄들.forEach(function (r) { 넣기(카드(r)); });
      });
    }
    if (목.미정.length) {
      if (목.지정.length) 넣기(만들기('div', { class: '구역사이' }));
      넣기(만들기('div', { class: '구역머리 미정', html: '날짜 미정<span class="r">' + 셈글(목.미정) + '</span>' }));
      묶기(목.미정, function (r) { return String(r.날짜); }).forEach(function (g) {
        넣기(만들기('div', { class: '예약머리 받은머리',
          html: 날글(g.k) + ' 받음<span class="ago">' + 예().지난글(g.k) + '</span><span class="r">' + 셈글(g.줄들) + '</span>' }));
        g.줄들.forEach(function (r) { 넣기(카드(r)); });
      });
    }
    return 줄들;
  }

  /* ── PC — 시안 18b ② 마크업 순서 그대로 ── */
  function PC구역(칸, 줄) {
    var 목 = 예().예약목록(), 줄들 = [];
    function 넣기(e) { 칸.appendChild(e); 줄들.push(e); }
    function 한칸(결, html) { return 만들기('tr', { class: 결 }, [만들기('td', { colspan: '6', html: html || '' })]); }
    if (목.지정.length) {
      넣기(한칸('구역줄', '📅 예약일 지정<span class="r">' + 목.지정.length + '건 · ' + u.콤마(합(목.지정)) + '원</span>'));
      넣기(한칸('틈2'));
      묶기(목.지정, function (r) { return r.예약일; }).forEach(function (g) {
        var 됨 = 예().때됨(g.k);
        넣기(한칸('묶음' + (됨 ? ' 때됨' : ''), 날글(g.k) + ' <span class="dn' + (됨 ? ' due' : '') + '">' + 예().D글(g.k) + '</span>' +
          '<span class="r">' + 셈글(g.줄들) + '</span>'));
        g.줄들.forEach(function (r) { 줄(r).forEach(넣기); });
      });
    }
    if (목.미정.length) {
      if (목.지정.length) { 넣기(한칸('틈')); 넣기(한칸('틈2')); }
      넣기(한칸('구역줄 미정', '날짜 미정<span class="r">' + 목.미정.length + '건 · ' + u.콤마(합(목.미정)) + '원</span>'));
      넣기(한칸('틈2'));
      묶기(목.미정, function (r) { return String(r.날짜); }).forEach(function (g) {
        넣기(한칸('묶음', 날글(g.k) + ' 받음 <span class="ago">' + 예().지난글(g.k) + '</span><span class="r">' + 셈글(g.줄들) + '</span>'));
        g.줄들.forEach(function (r) { 줄(r).forEach(넣기); });
      });
    }
    return 줄들;
  }

  /* 폰 카드 둘째 줄 밑 — 품목 요약 · 배송비 */
  function 품글(r) {
    var 셈 = 자().합계(r);
    return (r.품목 || []).map(function (p) { return p.유통명 + ' ' + u.콤마(p.수량); })
      .concat(셈.배송비 ? ['배송비 ' + u.콤마(셈.배송비)] : []).join(' · ');
  }

  ZG.예약화면 = {
    날글: 날글, 예약칩: 예약칩, D칸: D칸, 날짜판: 날짜판, 예약칸: 예약칸, 잠그기: 잠그기,
    갈래칩: 갈래칩, 폰구역: 폰구역, PC구역: PC구역, 품글: 품글
  };
})(window.ZG);
