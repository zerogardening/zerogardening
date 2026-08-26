/* 06a-재고목록 — 재고 탭 목록 (설계 §4-2 · §7) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 쪽크기 = 15;

  /* 급열림: 재입고 요청 접기칸. 앱을 새로 열면 늘 접힌 채로 시작하고(밭에서는 목록이 먼저다),
     한 번 펼치면 그 세션 동안은 다시 그려도 펼친 채로 둔다. */
  var 상태 = {
    필터: '전체', 소진만: false, 검색: '', 쪽: 1, 폰보임: 15, 상세코드: null, 스크롤: 0, 급열림: false,
    업체: '', 입고부터: '', 입고까지: '',   // 입고 기준 거르개 (8/19)
    선택: {},        // 품목코드 → true. 골라 놓은 것 (8/6 선택 삭제)
    선택모드: false  // 폰에서만 쓴다 — 「선택」을 눌러야 동그라미가 나온다
  };
  var 참조 = {};

  function 고른것들() { return Object.keys(상태.선택); }
  function 선택비우기() { 상태.선택 = {}; }

  /* 고른 개수가 바뀔 때마다 부른다. 목록은 다시 그리지 않는다 —
     다시 그리면 체크를 누르는 족족 화면이 튀고 누르던 자리를 잃는다 */
  function 선택바갱신() {
    var 수 = 고른것들().length;
    if (참조.선택바) {
      참조.선택바.classList.toggle('보임', 수 > 0);
      if (참조.선택수) 참조.선택수.textContent = 수 + '종 골랐습니다';
    }
    if (참조.폰막대) 참조.폰막대.classList.toggle('보임', 수 > 0);
    if (참조.폰삭제) 참조.폰삭제.textContent = 수 ? 수 + '종 삭제' : '삭제';
    if (참조.전체체크) {
      var 보이는 = 참조.보이는코드 || [];
      참조.전체체크.checked = 보이는.length > 0 && 보이는.every(function (c) { return 상태.선택[c]; });
    }
  }

  function 고르기(코드, 켬) {
    if (켬) 상태.선택[코드] = true;
    else delete 상태.선택[코드];
    선택바갱신();
  }

  function 전부요약() {
    var 장 = ZG.계산.장부();
    var 품목 = ZG.저장소.품목들();
    var 접두수 = {};
    품목.forEach(function (p) { 접두수[p.접두] = (접두수[p.접두] || 0) + 1; });
    var 입고별 = {};   // 품목코드 → [{날짜, 업체}] — 입고 기준 거르개가 쓴다
    장.입고.forEach(function (r) {
      (입고별[r.품목코드] = 입고별[r.품목코드] || [])
        .push({ 날짜: r.입고일 || '', 업체: (r.입고업체 || '').trim() });
    });
    return ZG.계산.소진순정렬(품목.map(function (p) {
      var 요 = ZG.계산.요약(p, 장);
      요.같은접두 = 접두수[p.접두] > 1;
      요.입고들 = 입고별[p.품목코드] || [];
      return 요;
    }));
  }

  function 거르기(전부) {
    var 열쇠 = 상태.검색.toLowerCase().replace(/\s/g, '');
    return 전부.filter(function (요) {
      var p = 요.품목;
      if (상태.필터 !== '전체' && p.상태 !== 상태.필터) return false;
      if (상태.소진만 && !요.재입고) return false;
      // 날짜와 업체는 같은 입고 기록 하나에서 동시에 맞아야 한다 (8/5에 한아름에서 들어온 것)
      if (상태.업체 || 상태.입고부터 || 상태.입고까지) {
        var 맞는입고 = (요.입고들 || []).some(function (i) {
          if ((상태.입고부터 || 상태.입고까지) && !i.날짜) return false;
          if (상태.입고부터 && i.날짜 < 상태.입고부터) return false;
          if (상태.입고까지 && i.날짜 > 상태.입고까지) return false;
          if (상태.업체 && i.업체 !== 상태.업체) return false;
          return true;
        });
        if (!맞는입고) return false;
      }
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

  /* ── 입고 기준 거르개 (입고일 범위 · 입고업체) ──
     부품·배치는 05d 입고내역 검색줄과 같다. 업체 목록은 업체관리가 아니라
     실제 입고 기록에서 뽑는다 — 등록 안 된 이름으로 들어온 입고도 골라야 한다. */
  function 입고거르개(전부, 다시) {
    var 필드 = ZG.입고내부.필드;   // 05d 입고내역도 같은 것을 쓴다
    var 이름들 = {};
    전부.forEach(function (요) {
      (요.입고들 || []).forEach(function (i) { if (i.업체) 이름들[i.업체] = true; });
    });

    var 업체 = 만들기('select', { class: 'inp', 'aria-label': '입고업체' });
    업체.innerHTML = '<option value="">전체 업체</option>' +
      Object.keys(이름들).sort().map(function (n) { return '<option>' + u.안전(n) + '</option>'; }).join('');
    업체.value = 상태.업체;
    업체.addEventListener('change', function () { 상태.업체 = 업체.value; 상태.쪽 = 1; 다시(); });

    var 날짜칸 = function (어느) {
      var e = 만들기('input', { class: 'inp', type: 'date', value: 상태[어느] });
      e.addEventListener('change', function () { 상태[어느] = e.value; 상태.쪽 = 1; 다시(); });
      return e;
    };

    var 초기화 = 만들기('button', { class: 'btn', type: 'button', text: '조건 초기화' });
    초기화.addEventListener('click', function () {
      상태.업체 = ''; 상태.입고부터 = ''; 상태.입고까지 = ''; 상태.쪽 = 1; 다시();
    });

    return 만들기('div', { class: 'qbar 입고거르개' }, [
      필드('입고업체', 업체, 'width:168px'),
      필드('입고일 시작', 날짜칸('입고부터'), 'width:150px'),
      만들기('div', { class: 'dash', text: '~' }),
      필드('입고일 종료', 날짜칸('입고까지'), 'width:150px'),
      초기화
    ]);
  }

  /* 이 칸은 목록을 다시 그려도 DOM 이 살아남아야 한다 — 06b 목록다시() 참고.
     칸이 갈아끼워지면 아이폰 한글 조합이 끊긴다. */
  function 검색칸(목록다시) {
    /* 🔴 손대야열림 — 탭을 바꿀 때 아이폰이 커서를 여기로 옮겨 붙여 키보드가 저 혼자 올라왔다 */
    var e = u.손대야열림(만들기('input', { class: 'inp', type: 'search', placeholder: '🔍  유통명 · 학명 · 품목코드로 찾기' }));
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
    var 고름 = 상태.선택모드;
    var 칸 = 만들기('button', {
      class: 'ph-card' + (고름 ? ' 고르는중' : '') + (고름 && 상태.선택[p.품목코드] ? ' 골랐다' : ''),
      type: 'button'
    });
    var 속 = (고름 ? '<span class="동그라미"></span>' : '') +
      '<div class="r1"><div class="nm">' + u.안전(p.유통명) + '</div>' +
      '<div class="days big ' + 요.등급 + '">' + u.안전(요.소진.표시) + '</div>' +
      (고름 ? '' : '<span class="chev">›</span>') + '</div>';
    if (!짧게) 속 += '<div class="sci">' + u.안전(p.학명) + '</div>';
    속 += '<div class="r2">' + u.안전(p.품목코드) + ' · <b>' + u.콤마(Math.max(0, 요.현재고)) + '</b>주 · 월 ' +
      u.콤마(요.월출고) + '주 나감</div>';
    var 칩 = ZG.제작요청.칩들(ZG.제작요청.현황(), p.품목코드);
    if (칩) 속 += '<div class="r2">' + 칩 + '</div>';
    칸.innerHTML = 속;
    칸.addEventListener('click', function () {
      if (!상태.선택모드) { ZG.재고수정.폰상세열기(p.품목코드); return; }
      var 켬 = !상태.선택[p.품목코드];
      고르기(p.품목코드, 켬);
      칸.classList.toggle('골랐다', 켬);
    });
    return 칸;
  }

  /* ── 고른 것 알림줄 (PC) — 목록칸 밖에 둔다. 목록을 다시 그려도 살아남아야 한다 ── */
  function 선택바() {
    var 수글 = 만들기('b', { text: '0종 골랐습니다' });
    참조.선택수 = 수글;
    var 풀기 = 만들기('button', { class: 'btn sm', type: 'button', text: '선택 해제' });
    풀기.addEventListener('click', function () { 선택비우기(); ZG.재고.목록다시(); 선택바갱신(); });
    var 지움 = 만들기('button', { class: 'btn sm warn', type: 'button', text: '선택 삭제' });
    지움.addEventListener('click', function () { ZG.재고수정.선택삭제(); });
    var 바 = 만들기('div', { class: '선택바' }, [수글, 만들기('div', { style: 'flex:1' }),
      요청단추('상세페이지'), 요청단추('식물정보'), 풀기, 지움]);
    참조.선택바 = 바;
    return 바;
  }

  /* 고른 품목을 상품팀 일감으로 넘긴다 (13단계). PC 선택바와 폰 작업막대가 같이 쓴다 */
  function 요청단추(종류, 폰) {
    var b = 만들기('button', { class: 폰 ? '' : 'btn sm', type: 'button', text: 종류 });
    b.addEventListener('click', function () { ZG.제작요청.요청하기(종류); });
    return b;
  }

  /* ── 폰: 「선택」 단추와 아래 고정 작업 막대 ── */
  function 선택단추(다시) {
    var b = 만들기('button', { class: 'btn sm', type: 'button', text: 상태.선택모드 ? '취소' : '선택' });
    b.addEventListener('click', function () {
      상태.선택모드 = !상태.선택모드;
      if (!상태.선택모드) 선택비우기();
      다시();
    });
    return b;
  }

  function 폰작업막대() {
    var b = 만들기('button', { class: '삭제', type: 'button', text: '삭제' });
    b.addEventListener('click', function () { ZG.재고수정.선택삭제(); });
    참조.폰삭제 = b;
    var 바 = 만들기('div', { class: 'ph-작업막대' }, [
      요청단추('상세페이지', true), 요청단추('식물정보', true), b
    ]);
    참조.폰막대 = 바;
    return 바;
  }

  /* ── PC 표 ── */
  function 표그리기(걸러진) {
    var 표 = 만들기('table');
    표.innerHTML =
      '<colgroup><col style="width:38px"><col style="width:104px"><col>' +
      '<col style="width:100px"><col style="width:86px"><col style="width:76px">' +
      '<col style="width:86px"><col style="width:104px"><col style="width:70px"></colgroup>' +
      '<thead><tr><th class="ck"></th><th>품목코드</th><th>유통명 · 학명</th><th>규격</th>' +
      '<th class="r">현재고</th><th class="r">소진일</th><th class="r">매입단가</th><th>상태</th><th></th></tr></thead>';

    var 몸 = 만들기('tbody');
    var 현 = ZG.제작요청.현황();
    var 처음 = (상태.쪽 - 1) * 쪽크기;
    var 쪽것 = 걸러진.slice(처음, 처음 + 쪽크기);

    // 「이 쪽 전부」 체크는 지금 보이는 줄만 본다 — 안 보이는 줄까지 골라 지우면 사고다
    참조.보이는코드 = 쪽것.map(function (요) { return 요.품목.품목코드; });
    var 전체체크 = 만들기('input', { type: 'checkbox', 'aria-label': '이 쪽 전부 고르기' });
    참조.전체체크 = 전체체크;
    전체체크.addEventListener('change', function () {
      참조.보이는코드.forEach(function (c) {
        if (전체체크.checked) 상태.선택[c] = true; else delete 상태.선택[c];
      });
      Array.prototype.forEach.call(몸.querySelectorAll('input[type=checkbox]'), function (c) {
        c.checked = 전체체크.checked;
        c.closest('tr').classList.toggle('골랐다', 전체체크.checked);
      });
      선택바갱신();
    });
    표.querySelector('th.ck').appendChild(전체체크);

    쪽것.forEach(function (요) {
      var p = 요.품목;
      var 줄 = 만들기('tr');
      줄.dataset.코드 = p.품목코드;
      줄.innerHTML =
        '<td class="ck"></td>' +
        '<td class="code' + (요.같은접두 ? ' same' : '') + '">' + u.안전(p.품목코드) + '</td>' +
        '<td>' + u.안전(p.유통명) + '<div class="sci">' + u.안전(p.학명) + '</div></td>' +
        '<td class="dim">' + u.안전(p.규격) + '</td>' +
        '<td class="r' + (요.현재고 <= 0 ? ' zero' : '') + '">' + u.콤마(Math.max(0, 요.현재고)) +
        '<span class="sub">월 ' + u.콤마(요.월출고) + '주</span></td>' +
        (요.소진.종류 === '판정안함'
          ? '<td class="r dim" style="font-weight:var(--weight-medium)">판정 안 함</td>'
          : '<td class="r"><span class="days ' + 요.등급 + '">' + u.안전(요.소진.표시) + '</span></td>') +
        '<td class="r">' + u.콤마(p.매입단가) + '</td>' +
        '<td>' + 배지(요) + ZG.제작요청.칩들(현, p.품목코드) + '</td><td></td>';
      var 체크 = 만들기('input', { type: 'checkbox', 'aria-label': p.유통명 + ' 고르기' });
      체크.checked = !!상태.선택[p.품목코드];
      줄.classList.toggle('골랐다', 체크.checked);
      체크.addEventListener('change', function () {
        고르기(p.품목코드, 체크.checked);
        줄.classList.toggle('골랐다', 체크.checked);
      });
      줄.firstChild.appendChild(체크);

      var 고침 = 만들기('button', { class: 'btn sm', type: 'button', text: '수정' });
      고침.addEventListener('click', function () { ZG.재고수정.시트열기(p.품목코드, 고침, 줄); });
      줄.lastChild.appendChild(고침);
      몸.appendChild(줄);
    });

    if (!쪽것.length) {
      몸.innerHTML = '<tr><td colspan="9" class="dim" style="text-align:center; padding:var(--space-4xl) 0">' +
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
    필터칩들: 필터칩들, 입고거르개: 입고거르개, 검색칸: 검색칸, 급한카드들: 급한카드들, 폰카드: 폰카드,
    표그리기: 표그리기, 쪽번호: 쪽번호, 배지: 배지,
    고른것들: 고른것들, 선택비우기: 선택비우기, 선택바갱신: 선택바갱신,
    선택바: 선택바, 선택단추: 선택단추, 폰작업막대: 폰작업막대
  };
})(window.ZG);
