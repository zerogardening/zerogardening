/* 06m-품절화면 — 상품 › 품절 탭 (23단계 설계 §3-6 · 시안 23-품절탭-macA.html)
   자료는 06l(ZG.품절자료). 여기는 폰 카드 / PC 행만 그린다.
   🔴 css 는 전부 `.품절탭` 아래 — `.bar .st .why .mrow .dot` 가 주문·메모·업체 css 에 이미 있다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 칩 = '전체', 검색글 = '', 열림 = {};
  var 뿌리 = null, 칩자리 = null, 목록자리 = null;

  var 글 = { ok: '완료', fail: '실패', none: '없음', wait: '대기', run: '진행중', unk: '기록 없음', chk: '확인 못 함' };
  var 올린글 = { ok: '올림', fail: '실패', none: '안 올림', wait: '대기', run: '진행중', unk: '기록 없음', chk: '확인 못 함' };
  function 칩글(c, v) { return (c.업로드 ? 올린글 : 글)[v]; }
  function 열쇠(c) { return (c.업로드 ? '올:' : '') + c.품목코드; }   // 두 탭의 펼침이 서로 안 엮이게
  // 방식은 저장하지 않고 화면이 정한다 — 도구가 하는 일이 마켓마다 정해져 있다
  function 방식(마켓, 다시) {
    if (다시) return { 카페24: '재고 되살림', 심폴: '무제한', 스마트스토어: '재고 999' }[마켓] || '판매중';
    return /카페24|심폴|스마트스토어/.test(마켓) ? '재고 0' : '판매중지';
  }

  function 두(n) { return (n < 10 ? '0' : '') + n; }
  function 시각(ms) { if (!ms) return ''; var d = new Date(ms); return 두(d.getHours()) + ':' + 두(d.getMinutes()); }
  function 날(ms) { if (!ms) return ''; var d = new Date(ms); return 두(d.getMonth() + 1) + '/' + 두(d.getDate()); }
  function 날시(ms) { return ms ? 날(ms) + ' ' + 시각(ms) : ''; }
  function 언제(c) { return c.업로드 ? (c.올린때 ? 날(c.올린때) + ' 올림' : '') : 날시(c.보낸때); }
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
    var 결 = c.무리 === '실패' ? ' bad' : c.무리 === '완료' && (!c.업로드 || c.완료수 === c.분모) ? ' done' : '';
    return '<span class="frac' + 결 + '"><b>' + c.완료수 + '</b>/' + c.분모 + '</span>';
  }
  function 실패칩(c) { return c.무리 === '실패' && c.실패수 ? '<span class="fn">실패 ' + c.실패수 + '</span>' : ''; }
  /* 줄 오른쪽 단추 — 업로드는 상품 보기(주소 없으면 꺼짐) · 품절은 실패 줄에만 [다시].
     🔴 업로드 실패에는 [다시]가 없다 — 쿠팡·심폴은 다시 보내면 상품이 둘로 올라간다(지시함 프롬프트 ⑦⑧) */
  function 줄단추(c, k) {
    if (c.업로드) return k.주소
      ? '<a class="btn sm lk" href="' + 안(k.주소) + '" target="_blank" rel="noopener">상품 보기 ↗</a>'
      : '<a class="btn sm lk off" aria-disabled="true">상품 보기 ↗</a>';
    return (k.값 === 'fail' || k.값 === 'chk') && !c.옛줄   // 노랑도 줄 [다시] — WING 로그인 뒤 다시 확인 (「실패만 다시」엔 안 든다) && c.무리 !== '진행중'
      ? '<button type="button" class="btn sm rd" data-다시="' + 안(k.마켓) + '">다시</button>' : '';
  }
  function 사유칸(k) { return k.값 === 'fail' ? ' class="why"' : k.값 === 'chk' ? ' class="why 노랑"' : ' class="why 회색"'; }

  // 옛 줄도 펼치면 마켓 7줄 — 답장 글을 통째로 뿌리지 않는다 (23단계 후속 · 우람님)
  function 폰속(c) {
    return '<div class="mlist">' + c.칸.map(function (k) {
      var 단 = 줄단추(c, k);
      return '<div class="mrow ' + k.값 + '"><span class="dot"></span><span class="mk">' + 안(k.마켓) + '</span>' +
        (c.업로드 ? '' : '<span class="how">' + 방식(k.마켓, c.다시판매) + '</span>') +
        '<span class="st ' + k.값 + '">' + 칩글(c, k.값) + '</span>' +
        (c.업로드 ? '<span class="tm">' + 날(k.때) + '</span>' + 단
          : '<span class="tm">' + (단 || 시각(k.때)) + '</span>') + '</div>' +
        (k.사유 && (k.값 === 'fail' || k.값 === 'chk') ? '<div' + 사유칸(k) + '>' + 안(k.사유) + '</div>' : '');
    }).join('') + '</div>';
  }

  function PC속(c) {
    var 머 = c.업로드
      ? '<col style="width:150px"><col style="width:120px"><col style="width:140px"><col><col style="width:130px"></colgroup>' +
        '<tr><th>마켓</th><th>상태</th><th>올린 때</th><th>사유</th><th></th></tr>'
      : '<col style="width:150px"><col style="width:110px"><col style="width:110px"><col style="width:90px"><col>' +
        '<col style="width:90px"></colgroup><tr><th>마켓</th><th>방식</th><th>상태</th><th>시각</th><th>사유</th><th></th></tr>';
    return '<table class="mt"><colgroup>' + 머 + c.칸.map(function (k) {
      return '<tr class="' + k.값 + '"><td class="mk">' + (c.업로드 ? '<span class="dot"></span>' : '') + 안(k.마켓) + '</td>' +
        (c.업로드 ? '' : '<td class="dim">' + 방식(k.마켓, c.다시판매) + '</td>') +
        '<td><span class="st ' + k.값 + '">' + 칩글(c, k.값) + '</span></td><td class="dim">' + (c.업로드 ? 날시(k.때) : 시각(k.때)) +
        '</td><td' + 사유칸(k) + '>' + 안(k.사유) + '</td><td class="' + (c.업로드 ? 'lkc' : 'rdc') + '">' + 줄단추(c, k) + '</td></tr>';
    }).join('') + '</table>';
  }

  /* 누르면 그 자리에서 접고 편다 — 통째로 다시 그리지 않아야 펼침 애니메이션이 산다 */
  function 접기걸기(칸, 손잡이, c) {
    손잡이.setAttribute('role', 'button');
    손잡이.setAttribute('tabindex', '0');
    손잡이.setAttribute('aria-expanded', 열림[열쇠(c)] ? 'true' : 'false');
    function 바꾸기(e) {
      if (e && e.target.closest && e.target.closest('a, button')) return;   // 상품 보기 · 다시 · ↺
      var 열 = !열림[열쇠(c)];
      if (열) 열림[열쇠(c)] = true; else delete 열림[열쇠(c)];
      칸.classList.toggle('open', 열);
      칸.querySelector('.foldbody').classList.toggle('open', 열);
      칸.querySelector('.chev').textContent = 열 ? '⌃' : '⌄';
      손잡이.setAttribute('aria-expanded', 열 ? 'true' : 'false');
    }
    손잡이.addEventListener('click', 바꾸기);
    손잡이.addEventListener('keydown', function (e) {
      if (e.target !== 손잡이) return;
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); 바꾸기(); }
    });
  }

  /* 펼친 칸 맨 아래 — 실패가 있으면 「실패만 다시 (N곳)」(주) + 「품절 전체 다시」(보조), 없으면 보조 하나 (시안 23c).
     🔴 다시판매→품절로 껐다 켜면 그 사이 마켓이 판매중으로 열린다 — 상태는 그대로 두고 지시만 다시 낸다.
     🔴 진행중이면 안 보인다 — 맥이 집기 전에 두 번 쌓이면 같은 일을 두 번 한다.
     🔴 업로드 카드엔 없다 — PC 만 ↺(작업중으로) 를 작게 둔다(폰은 밀기) */
  function 다시단추(c) {
    if (c.업로드) return u.폰인가() ? '' : '<div class="redo"><button type="button" class="btn sm 되돌" title="작업중으로 되돌리기">↺ 작업중으로</button></div>';
    if (c.무리 === '진행중') return '';
    var 실 = 실패마켓(c);
    var 삭 = u.폰인가() ? '' : '<button type="button" class="btn sm 지움" title="이 카드를 목록에서 지웁니다">삭제</button>';
    var 보조 = '<button type="button" class="btn" data-다시="*">' + (c.다시판매 ? '판매 전체 다시' : '품절 전체 다시') + '</button>';
    if (!실.length || c.옛줄) return '<div class="redo">' + 삭 + 보조 + '</div>';
    var 주 = '<button type="button" class="btn warn" data-다시="' + 안(실.join(',')) + '">실패만 다시<span class="n">(' + 실.length + '곳)</span></button>';
    return '<div class="redo">' + 삭 + (u.폰인가() ? 주 + 보조 : 보조 + 주) + '</div>';
  }
  /* 품절 카드 삭제 — 폰은 밀기(06g 민카드) · PC 는 펼친 칸 맨 아래 「삭제」. 진행중은 못 지운다 */
  function 지우기(c) {
    ZG.품절자료.지우기(c.품목코드).then(null, function (e) { u.토스트(e.message || '지우지 못했습니다'); });
  }
  function 실패마켓(c) { return c.칸.filter(function (k) { return k.값 === 'fail'; }).map(function (k) { return k.마켓; }); }

  function 다시걸기(칸, c) {
    var 삭 = 칸.querySelector('.지움');
    if (삭) 삭.addEventListener('click', function (e) { e.stopPropagation(); 지우기(c); });
    var 되 = 칸.querySelector('.되돌');
    if (되) 되.addEventListener('click', function (e) { e.stopPropagation(); ZG.사진수집.완료누름(c.품목); });
    Array.prototype.forEach.call(칸.querySelectorAll('[data-다시]'), function (b) {
      b.addEventListener('click', function (e) {
        e.stopPropagation();
        var 품절 = !c.다시판매, 값 = b.getAttribute('data-다시');
        var 대상 = 값 === '*' ? null : 값.split(',');
        u.확인({
          제목: c.이름 + ' — ' + (대상 ? 대상.join(' · ') + ' 다시 보냅니다' : 품절 ? '품절 처리를 다시 보냅니다' : '판매 재개를 다시 보냅니다'),
          본문: 대상 ? '고른 마켓에만 같은 지시를 한 번 더 냅니다. 이미 된 마켓은 건드리지 않습니다.'
            : '자사몰 · 심폴 · 오픈마켓에 같은 지시를 한 번 더 냅니다.<br>이미 그 상태인 마켓은 건드리지 않습니다.',
          확인글: '다시 보낸다', 위험: 품절
        }, function (예) {
          if (!예) return;
          Array.prototype.forEach.call(칸.querySelectorAll('[data-다시]'), function (x) { x.disabled = true; });
          var 품목 = (ZG.저장소.읽기(ZG.저장소.키.품목) || []).filter(function (p) { return p.품목코드 === c.품목코드; })[0] ||
            { 품목코드: c.품목코드, 유통명: c.이름 };
          ZG.마켓품절.밀기(품목, 품절, 대상 ? { 대상: 대상, 마켓: c.마켓원 } : undefined);
        });
      });
    });
  }

  function 결(c) { return c.무리 === '실패' ? ' bad' : c.무리 === '완료' && !c.업로드 ? ' done' : ''; }

  /* 업로드 카드 썸네일 — 못 읽으면 자리만 남기고 숨긴다 */
  function 썸(c) {
    var s = ZG.사진수집.주소(c.품목코드, 'thumb/1.jpg', c.수정일시);
    return '<img class="th" alt=""' + (s ? ' src="' + 안(s) + '"' : '') + ' loading="lazy">';
  }
  function 썸걸기(칸) {
    var g = 칸.querySelector('img.th');
    if (!g) return;
    if (!g.getAttribute('src')) g.style.visibility = 'hidden';
    g.addEventListener('error', function () { g.style.visibility = 'hidden'; });
  }

  function 폰카드(c) {
    var 열 = !!열림[열쇠(c)];
    var 칸 = 만들기('div', { class: 'sc' + 결(c) + (열 ? ' open' : '') });
    var 줄2 = '<span class="cd">' + 안(c.품목코드) + '</span><span class="tt">' + 언제(c) + '</span>' +
      실패칩(c) + '<span class="chev">' + (열 ? '⌃' : '⌄') + '</span>';
    칸.innerHTML = (c.업로드
      ? '<div class="top">' + 썸(c) + '<div class="info"><div class="r1"><span class="nm">' + 안(c.이름) + '</span>' + 분수(c) +
        '</div><div class="r2">' + 줄2 + '</div></div></div>'
      : '<div class="r1">' + 꼬리표(c) + '<span class="nm">' + 안(c.이름) + '</span>' + 분수(c) + '</div>' +
        '<div class="r2">' + 줄2 + '</div>') +
      '<div class="bar">' + c.칸.map(function (k) { return '<i class="' + k.값 + '"></i>'; }).join('') + '</div>' +
      '<div class="foldbody' + (열 ? ' open' : '') + '"><div>' + 폰속(c) + 다시단추(c) + '</div></div>';
    접기걸기(칸, 칸, c);
    다시걸기(칸, c);
    썸걸기(칸);
    // 폰 업로드 카드는 06g 작업중 카드처럼 밀면 ↺(작업중으로)
    if (c.업로드) return ZG.사진수집.민카드(칸, c.품목);
    return c.무리 === '진행중' ? 칸 : ZG.사진수집.민카드(칸, null, { 글: '삭제', 누름: function () { 지우기(c); } });
  }

  function PC행(c) {
    var 열 = !!열림[열쇠(c)];
    var 칸 = 만들기('div', { class: 'pcr' + 결(c) + (열 ? ' open' : '') });
    칸.innerHTML =
      '<div class="hd">' + (c.업로드 ? 썸(c) : 꼬리표(c)) +
      '<div class="who"><span class="nm">' + 안(c.이름) + '</span><span class="cd">' + 안(c.품목코드) + '</span></div>' +
      '<span class="tt">' + 언제(c) + '</span>' +
      '<div class="bar lb">' + c.칸.map(function (k) {
        return '<div class="sg ' + k.값 + (c.업로드 && k.마켓 === '스마트스토어' ? ' w' : '') + '"><i></i><span>' + 안(k.마켓) + '</span></div>';
      }).join('') + '</div>' +
      '<div class="rt">' + 실패칩(c) + 분수(c) + '</div><span class="chev">' + (열 ? '⌃' : '⌄') + '</span></div>' +
      '<div class="foldbody' + (열 ? ' open' : '') + '"><div>' + PC속(c) + 다시단추(c) + '</div></div>';
    접기걸기(칸, 칸.querySelector('.hd'), c);
    다시걸기(칸, c);
    썸걸기(칸);
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

  /* 업로드 › 완료 목록 (24단계) — 06g 가 검색칸·작업중/완료 칩·정렬을 갖고 이것만 부른다 */
  function 업로드목록(찾글, 정렬) {
    var 자리 = 만들기('div'), 폰 = u.폰인가();
    var 판 = 만들기('div', { class: '품절탭 업로드탭' }, [폰 ? 자리
      : 만들기('div', { class: 'card' }, [만들기('div', { class: 'ch' }, [만들기('h3', { text: '업로드 완료' })]), 자리])]);
    var 상 = ZG.품절자료.업로드상태(), 찾 = 납작(찾글);
    var 목록 = ZG.품절자료.업로드카드들(정렬).filter(function (c) {
      return !찾 || 납작(c.품목코드 + c.이름 + c.학명).indexOf(찾) >= 0;
    });
    if (상.오류) 자리.appendChild(빈칸(상.오류));
    else if (!상.읽음) 자리.appendChild(빈칸('불러오는 중…'));
    else if (!목록.length) 자리.appendChild(빈칸(찾 ? '찾는 품목이 없습니다' : '완료된 품목이 없습니다'));
    else {
      var 목 = 만들기('div', { class: 폰 ? 'ph-list' : 'plist' });
      목록.forEach(function (c) { 목.appendChild(폰 ? 폰카드(c) : PC행(c)); });
      자리.appendChild(목);
      u.목록등장(목.children);
    }
    return 판;
  }

  ZG.품절 = {
    그리기: 그리기, 다시: 다시, 업로드목록: 업로드목록,
    머리: function () { return { 제목: '상품', 뒤로: null, 왼: '', 오: '' }; }
  };
})(window.ZG);
