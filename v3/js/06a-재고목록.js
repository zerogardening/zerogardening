/* 06a-재고목록 — 재고 탭 목록 (설계 §4-2 · §7) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 쪽크기 = 15;

  /* 급열림: 재입고 요청 접기칸. 앱을 새로 열면 늘 접힌 채로 시작하고(밭에서는 목록이 먼저다),
     한 번 펼치면 그 세션 동안은 다시 그려도 펼친 채로 둔다. */
  var 상태 = { 필터: '전체', 소진만: false, 검색: '', 쪽: 1, 폰보임: 15, 상세코드: null, 스크롤: 0, 급열림: false };
  var 참조 = {};

  function 전부요약() {
    var 장 = ZG.계산.장부();
    var 품목 = ZG.저장소.읽기(ZG.저장소.키.품목);
    var 접두수 = {};
    품목.forEach(function (p) { 접두수[p.접두] = (접두수[p.접두] || 0) + 1; });
    return ZG.계산.소진순정렬(품목.map(function (p) {
      var 요 = ZG.계산.요약(p, 장);
      요.같은접두 = 접두수[p.접두] > 1;
      return 요;
    }));
  }

  function 거르기(전부) {
    var 열쇠 = 상태.검색.toLowerCase().replace(/\s/g, '');
    return 전부.filter(function (요) {
      var p = 요.품목;
      if (상태.필터 !== '전체' && p.상태 !== 상태.필터) return false;
      if (상태.소진만 && !요.재입고) return false;
      if (열쇠) {
        var 밭 = (p.유통명 + p.학명 + p.품목코드).toLowerCase().replace(/\s/g, '');
        if (밭.indexOf(열쇠) < 0) return false;
      }
      return true;
    });
  }

  function 요약글() {
    var 전부 = 전부요약();
    var 총 = 전부.reduce(function (a, 요) { return a + Math.max(0, 요.현재고); }, 0);
    var 급함 = 전부.filter(function (요) { return 요.재입고; }).length;
    return { 왼: '등록 <b>' + 전부.length + '</b>종 · 총 <b>' + u.콤마(총) + '</b>주', 오: '3주 내 소진 <b>' + 급함 + '</b>종' };
  }

  function 필터칩들(전부, 다시) {
    var 상자 = 만들기('div', { class: 'fchips' });
    var 셈 = function (이름) {
      return 이름 === '전체' ? 전부.length : 전부.filter(function (요) { return 요.품목.상태 === 이름; }).length;
    };
    ['전체', '판매중', '품절', '일시중지'].forEach(function (이름) {
      var b = 만들기('button', {
        class: 'fchip' + (상태.필터 === 이름 ? ' on' : ''), type: 'button',
        html: u.안전(이름) + ' <span class="n">' + 셈(이름) + '</span>'
      });
      b.addEventListener('click', function () { 상태.필터 = 이름; 상태.쪽 = 1; 다시(); });
      상자.appendChild(b);
    });
    var 급함 = 전부.filter(function (요) { return 요.재입고; }).length;
    var 급 = 만들기('button', {
      class: 'fchip alert' + (상태.소진만 ? ' on' : ''), type: 'button',
      style: 'margin-left:var(--space-md)',
      html: '3주 내 소진 <span class="n">' + 급함 + '</span>'
    });
    급.addEventListener('click', function () { 상태.소진만 = !상태.소진만; 상태.쪽 = 1; 다시(); });
    상자.appendChild(급);
    return 상자;
  }

  /* 이 칸은 목록을 다시 그려도 DOM 이 살아남아야 한다 — 06b 목록다시() 참고.
     칸이 갈아끼워지면 아이폰 한글 조합이 끊긴다. */
  function 검색칸(목록다시) {
    var e = 만들기('input', { class: 'inp', type: 'search', placeholder: '🔍  유통명 · 학명 · 품목코드로 찾기' });
    e.value = 상태.검색;
    u.조합안전입력(e, function (값) {
      if (값 === 상태.검색) return;
      상태.검색 = 값; 상태.쪽 = 1; 목록다시();
    }, 180);
    참조.검색 = e;
    return e;
  }

  /* ── 재입고 요청 — 접기칸 (설계 §16-7) ──
     04b-특성의 .fold / .foldbody 구조를 그대로 쓴다. 부품은 새로 만들지 않는다. */
  function 급한카드들(전부, 폰) {
    var 급 = 전부.filter(function (요) { return 요.재입고; });
    var 최대 = 폰 ? 3 : 5;
    var 상자 = 만들기('div', { class: 'alert' + (급.length ? '' : ' quiet') });

    var 속 = 만들기('div', { class: '재입고속' });
    var 몸 = 만들기('div', { class: 'foldbody' }, [속]);
    var 머리 = 만들기('button', { class: 'fold 재입고머리', type: 'button', 'aria-expanded': 'false' });
    function 머리글(열림) {
      머리.innerHTML = (열림 ? '－' : '＋') + ' 재입고 요청 <span class="n">' + 급.length + '종</span>';
    }
    머리.addEventListener('click', function () {
      상태.급열림 = 몸.classList.toggle('open');
      머리.setAttribute('aria-expanded', 상태.급열림 ? 'true' : 'false');
      머리글(상태.급열림);
    });
    머리글(상태.급열림);
    if (상태.급열림) { 몸.classList.add('open'); 머리.setAttribute('aria-expanded', 'true'); }
    상자.appendChild(머리);
    상자.appendChild(몸);

    if (!급.length) {
      속.appendChild(만들기('p', { text: '3주 안에 소진될 품목이 없습니다.' }));
      return 상자;
    }

    if (폰) {
      var 목 = 만들기('div', { class: 'ph-list' });
      급.slice(0, 최대).forEach(function (요) { 목.appendChild(폰카드(요, true)); });
      속.appendChild(목);
      u.목록등장(목.children);
    } else {
      var 판 = 만들기('div', { class: 'ucards' });
      급.slice(0, 최대).forEach(function (요) { 판.appendChild(급한카드(요)); });
      속.appendChild(판);
      u.목록등장(판.children);
      if (급.length > 최대) {
        속.appendChild(만들기('p', {
          style: 'margin-top:var(--space-lg)',
          html: '소진일이 빠른 순입니다. 나머지 <b>' + (급.length - 최대) + '종</b>은 아래 목록에서 「3주 내 소진」을 누르면 보입니다.'
        }));
      }
    }

    var 전체보기 = 만들기('button', { class: 'btn sm', type: 'button', text: 폰 ? '전체 ›' : '3주 내 소진만 보기' });
    전체보기.addEventListener('click', function () { 상태.소진만 = true; 상태.쪽 = 1; ZG.재고.그리기(참조.뿌리); });
    속.appendChild(만들기('div', { class: '재입고끝' }, [전체보기]));
    return 상자;
  }

  function 급한카드(요) {
    var p = 요.품목;
    var 칸 = 만들기('div', { class: 'ucard' });
    칸.innerHTML =
      '<div class="days ' + 요.등급 + '">' + u.안전(요.소진.표시) + '</div>' +
      '<div class="nm">' + u.안전(p.유통명) + ' <span class="code">' + u.안전(p.품목코드) + '</span></div>' +
      '<div class="sci">' + u.안전(p.학명) + ' · ' + u.안전(p.규격) + '</div>' +
      '<div class="stock">현재고 <b' + (요.현재고 <= 0 ? ' class="zero"' : '') + '>' + u.콤마(Math.max(0, 요.현재고)) +
      '</b><span class="sub">월 ' + u.콤마(요.월출고) + '주 나감</span></div>' +
      '<div class="last">마지막 입고 ' + u.안전(요.마지막입고 || '기록 없음') + '</div>';
    var b = 만들기('button', { class: 'btn sm', type: 'button', text: '입고 등록' });
    b.addEventListener('click', function () { ZG.입고.채우기(p); location.hash = '#입고'; });
    칸.appendChild(b);
    return 칸;
  }

  /* ── 폰 카드 ── */
  function 폰카드(요, 짧게) {
    var p = 요.품목;
    var 칸 = 만들기('button', { class: 'ph-card', type: 'button' });
    var 속 = '<div class="r1"><div class="nm">' + u.안전(p.유통명) + '</div>' +
      '<div class="days big ' + 요.등급 + '">' + u.안전(요.소진.표시) + '</div><span class="chev">›</span></div>';
    if (!짧게) 속 += '<div class="sci">' + u.안전(p.학명) + '</div>';
    속 += '<div class="r2">' + u.안전(p.품목코드) + ' · <b>' + u.콤마(Math.max(0, 요.현재고)) + '</b>주 · 월 ' +
      u.콤마(요.월출고) + '주 나감</div>';
    칸.innerHTML = 속;
    칸.addEventListener('click', function () { ZG.재고수정.폰상세열기(p.품목코드); });
    return 칸;
  }

  /* ── PC 표 ── */
  function 표그리기(걸러진) {
    var 표 = 만들기('table');
    표.innerHTML =
      '<colgroup><col style="width:104px"><col>' +
      '<col style="width:100px"><col style="width:86px"><col style="width:76px">' +
      '<col style="width:86px"><col style="width:104px"><col style="width:70px"></colgroup>' +
      '<thead><tr><th>품목코드</th><th>유통명 · 학명</th><th>규격</th>' +
      '<th class="r">현재고</th><th class="r">소진일</th><th class="r">매입단가</th><th>상태</th><th></th></tr></thead>';

    var 몸 = 만들기('tbody');
    var 처음 = (상태.쪽 - 1) * 쪽크기;
    var 쪽것 = 걸러진.slice(처음, 처음 + 쪽크기);

    쪽것.forEach(function (요) {
      var p = 요.품목;
      var 줄 = 만들기('tr');
      줄.dataset.코드 = p.품목코드;
      줄.innerHTML =
        '<td class="code' + (요.같은접두 ? ' same' : '') + '">' + u.안전(p.품목코드) + '</td>' +
        '<td>' + u.안전(p.유통명) + '<div class="sci">' + u.안전(p.학명) + '</div></td>' +
        '<td class="dim">' + u.안전(p.규격) + '</td>' +
        '<td class="r' + (요.현재고 <= 0 ? ' zero' : '') + '">' + u.콤마(Math.max(0, 요.현재고)) +
        '<span class="sub">월 ' + u.콤마(요.월출고) + '주</span></td>' +
        (요.소진.종류 === '판정안함'
          ? '<td class="r dim" style="font-weight:var(--weight-medium)">판정 안 함</td>'
          : '<td class="r"><span class="days ' + 요.등급 + '">' + u.안전(요.소진.표시) + '</span></td>') +
        '<td class="r">' + u.콤마(p.매입단가) + '</td>' +
        '<td>' + 배지(요) + '</td><td></td>';
      var 고침 = 만들기('button', { class: 'btn sm', type: 'button', text: '수정' });
      고침.addEventListener('click', function () { ZG.재고수정.시트열기(p.품목코드, 고침, 줄); });
      줄.lastChild.appendChild(고침);
      몸.appendChild(줄);
    });

    if (!쪽것.length) {
      몸.innerHTML = '<tr><td colspan="8" class="dim" style="text-align:center; padding:var(--space-4xl) 0">' +
        '이 조건에 맞는 품목이 없습니다</td></tr>';
    }
    표.appendChild(몸);
    u.목록등장(몸.querySelectorAll('tr'));
    참조.표몸 = 몸;
    return 만들기('div', { class: 'tablewrap' }, [표]);
  }

  function 배지(요) {
    var p = 요.품목;
    if (요.재입고) return '<span class="chip out">재입고 필요</span>';
    if (p.상태 === '품절' || p.상태 === '일시중지') return '<span class="chip warn">' + u.안전(p.상태) + '</span>';
    return '<span class="chip">판매중</span>';
  }

  function 쪽번호(걸러진, 다시) {
    var 마지막 = Math.max(1, Math.ceil(걸러진.length / 쪽크기));
    if (상태.쪽 > 마지막) 상태.쪽 = 마지막;
    var 처음 = (상태.쪽 - 1) * 쪽크기;
    var 상자 = 만들기('div', { class: 'pager' });
    상자.appendChild(만들기('span', {
      class: 'gap',
      text: 걸러진.length + '종 중 ' + (걸러진.length ? 처음 + 1 : 0) + '~' + Math.min(처음 + 쪽크기, 걸러진.length)
    }));
    function 단추(글, 쪽, 켬) {
      if (켬) return 만들기('b', { text: 글 });
      var b = 만들기('button', { type: 'button', text: 글 });
      b.disabled = 쪽 < 1 || 쪽 > 마지막;
      b.addEventListener('click', function () { 상태.쪽 = 쪽; 다시(); });
      return b;
    }
    상자.appendChild(단추('‹', 상태.쪽 - 1));
    for (var i = 1; i <= 마지막; i++) 상자.appendChild(단추(String(i), i, i === 상태.쪽));
    상자.appendChild(단추('›', 상태.쪽 + 1));
    return 상자;
  }

  ZG.재고목록 = {
    상태: 상태, 참조: 참조, 전부요약: 전부요약, 거르기: 거르기, 요약글: 요약글,
    필터칩들: 필터칩들, 검색칸: 검색칸, 급한카드들: 급한카드들, 폰카드: 폰카드,
    표그리기: 표그리기, 쪽번호: 쪽번호, 배지: 배지
  };
})(window.ZG);
