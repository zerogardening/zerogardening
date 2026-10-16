/* 06m-품절화면 — 상품 › 품절 탭 (23단계 설계 §3-6 · 시안 23-품절탭-macA.html)
   자료는 06l(ZG.품절자료). 여기는 폰 카드 / PC 행만 그린다.
   🔴 css 는 전부 `.품절탭` 아래 — `.bar .st .why .mrow .dot` 가 주문·메모·업체 css 에 이미 있다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 칩 = '전체', 검색글 = '', 열림 = {};
  var 뿌리 = null, 칩자리 = null, 목록자리 = null;

  var 글 = { ok: '완료', fail: '실패', none: '없음', wait: '대기', run: '진행중', unk: '기록 없음' };
  // 방식은 저장하지 않고 화면이 정한다 — 도구가 하는 일이 마켓마다 정해져 있다
  function 방식(마켓, 다시) {
    if (다시) return { 카페24: '재고 되살림', 심폴: '무제한', 스마트스토어: '재고 9999' }[마켓] || '판매중';
    return /카페24|심폴|스마트스토어/.test(마켓) ? '재고 0' : '판매중지';
  }

  function 두(n) { return (n < 10 ? '0' : '') + n; }
  function 시각(ms) { if (!ms) return ''; var d = new Date(ms); return 두(d.getHours()) + ':' + 두(d.getMinutes()); }
  function 날시(ms) { var d = new Date(ms); return 두(d.getMonth() + 1) + '/' + 두(d.getDate()) + ' ' + 시각(ms); }
  function 납작(v) { return String(v == null ? '' : v).toLowerCase().replace(/\s/g, ''); }
  var 안 = u.안전;

  function 걸러() {
    var 찾 = 납작(검색글);
    return ZG.품절자료.카드들().filter(function (c) {
      return !찾 || 납작(c.품목코드 + c.이름 + c.학명).indexOf(찾) >= 0;
    });
  }

  /* ── 조각 ── */
  function 꼬리표(c) { return '<span class="ktag' + (c.다시판매 ? ' back' : '') + '">' + (c.다시판매 ? '다시 판매' : '품절') + '</span>'; }
  function 분수(c) {
    if (c.옛줄) return '<span class="frac 옛">기록 없음</span>';
    var 결 = c.무리 === '실패' ? ' bad' : c.무리 === '완료' ? ' done' : '';
    return '<span class="frac' + 결 + '"><b>' + c.완료수 + '</b>/' + c.분모 + '</span>';
  }
  function 실패칩(c) { return c.무리 === '실패' && c.실패수 ? '<span class="fn">실패 ' + c.실패수 + '</span>' : ''; }
  // 옛 줄도 펼치면 마켓 7줄 — 답장 글을 통째로 뿌리지 않는다 (23단계 후속 · 우람님)
  function 폰속(c) {
    return '<div class="mlist">' + c.칸.map(function (k) {
      return '<div class="mrow ' + k.값 + '"><span class="dot"></span><span class="mk">' + 안(k.마켓) + '</span>' +
        '<span class="how">' + 방식(k.마켓, c.다시판매) + '</span><span class="st ' + k.값 + '">' + 글[k.값] + '</span>' +
        '<span class="tm">' + 시각(k.때) + '</span></div>' +
        (k.사유 && k.값 === 'fail' ? '<div class="why">' + 안(k.사유) + '</div>' : '');
    }).join('') + '</div>';
  }

  function PC속(c) {
    return '<table class="mt"><colgroup><col style="width:150px"><col style="width:110px"><col style="width:110px">' +
      '<col style="width:90px"><col></colgroup><tr><th>마켓</th><th>방식</th><th>상태</th><th>시각</th><th>사유</th></tr>' +
      c.칸.map(function (k) {
        return '<tr class="' + k.값 + '"><td class="mk">' + 안(k.마켓) + '</td><td class="dim">' + 방식(k.마켓, c.다시판매) +
          '</td><td><span class="st ' + k.값 + '">' + 글[k.값] + '</span></td><td class="dim">' + 시각(k.때) +
          '</td><td class="why' + (k.값 === 'fail' ? '' : ' 회색') + '">' + 안(k.사유) + '</td></tr>';
      }).join('') + '</table>';
  }

  /* 누르면 그 자리에서 접고 편다 — 통째로 다시 그리지 않아야 펼침 애니메이션이 산다 */
  function 접기걸기(칸, 손잡이, c) {
    손잡이.setAttribute('role', 'button');
    손잡이.setAttribute('tabindex', '0');
    손잡이.setAttribute('aria-expanded', 열림[c.품목코드] ? 'true' : 'false');
    function 바꾸기() {
      var 열 = !열림[c.품목코드];
      if (열) 열림[c.품목코드] = true; else delete 열림[c.품목코드];
      칸.classList.toggle('open', 열);
      칸.querySelector('.foldbody').classList.toggle('open', 열);
      칸.querySelector('.chev').textContent = 열 ? '⌃' : '⌄';
      손잡이.setAttribute('aria-expanded', 열 ? 'true' : 'false');
    }
    손잡이.addEventListener('click', 바꾸기);
    손잡이.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); 바꾸기(); }
    });
  }

  /* 펼친 칸 맨 아래 「다시 보내기」 — 안 된 것 같으면 같은 지시를 한 번 더 쌓는다 (우람님 2026-10-16).
     🔴 다시판매→품절로 껐다 켜면 그 사이 마켓이 판매중으로 열린다 — 상태는 그대로 두고 지시만 다시 낸다.
     🔴 진행중이면 안 보인다 — 맥이 집기 전에 두 번 쌓이면 같은 일을 두 번 한다. */
  function 다시단추(c) {
    if (c.무리 === '진행중') return '';
    return '<div class="redo"><button type="button" class="btn sm ' + (c.다시판매 ? 'main' : 'warn') + '">' +
      (c.다시판매 ? '판매 다시 보내기' : '품절 다시 보내기') + '</button></div>';
  }
  function 다시걸기(칸, c) {
    var b = 칸.querySelector('.redo button');
    if (!b) return;
    b.addEventListener('click', function (e) {
      e.stopPropagation();
      var 품절 = !c.다시판매;
      u.확인({
        제목: c.이름 + (품절 ? ' — 품절 처리를 다시 보냅니다' : ' — 판매 재개를 다시 보냅니다'),
        본문: '자사몰 · 심폴 · 오픈마켓에 같은 지시를 한 번 더 냅니다.<br>이미 그 상태인 마켓은 건드리지 않습니다.',
        확인글: '다시 보낸다', 위험: 품절
      }, function (예) {
        if (!예) return;
        b.disabled = true;
        var 품목 = (ZG.저장소.읽기(ZG.저장소.키.품목) || []).filter(function (p) { return p.품목코드 === c.품목코드; })[0] ||
          { 품목코드: c.품목코드, 유통명: c.이름 };
        ZG.마켓품절.밀기(품목, 품절);
      });
    });
  }

  function 결(c) { return c.무리 === '실패' ? ' bad' : c.무리 === '완료' ? ' done' : ''; }

  function 폰카드(c) {
    var 열 = !!열림[c.품목코드];
    var 칸 = 만들기('div', { class: 'sc' + 결(c) + (열 ? ' open' : '') });
    칸.innerHTML =
      '<div class="r1">' + 꼬리표(c) + '<span class="nm">' + 안(c.이름) + '</span>' + 분수(c) + '</div>' +
      '<div class="r2"><span class="cd">' + 안(c.품목코드) + '</span><span class="tt">' + 날시(c.보낸때) + '</span>' +
      실패칩(c) + '<span class="chev">' + (열 ? '⌃' : '⌄') + '</span></div>' +
      '<div class="bar">' + c.칸.map(function (k) { return '<i class="' + k.값 + '"></i>'; }).join('') + '</div>' +
      '<div class="foldbody' + (열 ? ' open' : '') + '"><div>' + 폰속(c) + 다시단추(c) + '</div></div>';
    접기걸기(칸, 칸, c);
    다시걸기(칸, c);
    return 칸;
  }

  function PC행(c) {
    var 열 = !!열림[c.품목코드];
    var 칸 = 만들기('div', { class: 'pcr' + 결(c) + (열 ? ' open' : '') });
    칸.innerHTML =
      '<div class="hd">' + 꼬리표(c) +
      '<div class="who"><span class="nm">' + 안(c.이름) + '</span><span class="cd">' + 안(c.품목코드) + '</span></div>' +
      '<span class="tt">' + 날시(c.보낸때) + '</span>' +
      '<div class="bar lb">' + c.칸.map(function (k) {
        return '<div class="sg ' + k.값 + '"><i></i><span>' + 안(k.마켓) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="rt">' + 실패칩(c) + 분수(c) + '</div><span class="chev">' + (열 ? '⌃' : '⌄') + '</span></div>' +
      '<div class="foldbody' + (열 ? ' open' : '') + '"><div>' + PC속(c) + 다시단추(c) + '</div></div>';
    접기걸기(칸, 칸.querySelector('.hd'), c);
    다시걸기(칸, c);
    return 칸;
  }

  function 칩줄(목록) {
    var 줄 = 만들기('div', { class: 'fchips' });
    ['전체', '실패', '진행중', '완료'].forEach(function (이름) {
      var n = 이름 === '전체' ? 목록.length : 목록.filter(function (c) { return c.무리 === 이름; }).length;
      var b = 만들기('button', { type: 'button', class: 'fchip' + (칩 === 이름 ? ' on' : ''),
        html: 이름 + '<span class="n">' + n + '</span>' });
      b.addEventListener('click', function () { 칩 = 이름; 칠하기(); });
      줄.appendChild(b);
    });
    return 줄;
  }

  function 빈칸(말) { return 만들기('div', { class: '지시-빈', text: 말 }); }

  /* 🔴 검색칸은 그리기()에서 한 번만 만든다 — 칠할 때마다 갈면 한글 조합이 끊긴다 (06g 와 같다) */
  function 칠하기() {
    if (!뿌리) return;
    u.비우기(칩자리); u.비우기(목록자리);
    var 상 = ZG.품절자료.상태();
    if (상.오류) { 목록자리.appendChild(빈칸(상.오류)); return; }
    if (!상.읽음) { 목록자리.appendChild(빈칸('불러오는 중…')); return; }
    var 목록 = 걸러();
    칩자리.appendChild(칩줄(목록));
    if (!ZG.품절자료.카드들().length) { 목록자리.appendChild(빈칸('품절 요청이 없습니다')); return; }
    var 보일 = 목록.filter(function (c) { return 칩 === '전체' || c.무리 === 칩; });
    if (!보일.length) { 목록자리.appendChild(빈칸(검색글 ? '찾는 품목이 없습니다' : '해당하는 요청이 없습니다')); return; }
    var 폰 = u.폰인가();
    var 목 = 만들기('div', { class: 폰 ? 'ph-list' : 'plist' });
    보일.forEach(function (c) { 목.appendChild(폰 ? 폰카드(c) : PC행(c)); });
    목록자리.appendChild(목);
    u.목록등장(목.children);
  }

  function 검색칸() {
    var e = u.손대야열림(만들기('input', { class: 'inp srch', type: 'search', placeholder: '품목코드 · 유통명 · 학명' }));
    u.조합안전입력(e, function (값) {
      if (값 === 검색글) return;
      검색글 = 값; 칠하기();
    }, 180);
    return e;
  }

  function 그리기(본문) {
    u.비우기(본문);
    검색글 = '';
    칩자리 = 만들기('div', { class: '칩자리' });
    목록자리 = 만들기('div');
    if (u.폰인가()) {
      뿌리 = 만들기('div', { class: '품절탭' }, [칩자리, 목록자리]);
    } else {
      var 머리 = 만들기('div', { class: 'ch' }, [만들기('h3', { text: '품절 요청' }), 칩자리, 검색칸()]);
      뿌리 = 만들기('div', { class: '품절탭' }, [만들기('div', { class: 'card' }, [머리, 목록자리])]);
    }
    본문.appendChild(뿌리);
    칠하기();
  }

  function 다시() { if (뿌리 && 뿌리.isConnected) 칠하기(); }

  ZG.품절 = {
    그리기: 그리기, 다시: 다시,
    머리: function () { return { 제목: '상품', 뒤로: null, 왼: '', 오: '' }; }
  };
})(window.ZG);
