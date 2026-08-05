/* 06b-재고배치 — 재고 탭의 PC · 폰 배치 (설계 §4-2) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 목 = ZG.재고목록, 상태 = 목.상태, 참조 = 목.참조;

  function 다시() { 그리기(참조.뿌리); }

  /* 검색 · 쪽넘김 · 더보기는 목록칸만 갈아끼운다.
     화면을 통째로 다시 그리면 검색 입력칸 DOM 이 사라져 한글 조합이 끊긴다. */
  function 목록다시() {
    if (!참조.목록칸) return 다시();
    var 걸러진 = 목.거르기(목.전부요약());
    u.비우기(참조.목록칸);
    (u.폰인가() ? 폰목록속(걸러진) : PC목록속(걸러진)).forEach(function (c) {
      if (c) 참조.목록칸.appendChild(c);
    });
  }

  function PC목록속(걸러진) {
    return [목.표그리기(걸러진), 목.쪽번호(걸러진, 목록다시)];
  }

  function 폰목록속(걸러진) {
    var 조각 = [만들기('div', { class: 'ph-sec', html: '소진일 빠른 순 <span class="r">' + 걸러진.length + '종</span>' })];
    var 목록 = 만들기('div', { class: 'ph-list' });
    걸러진.slice(0, 상태.폰보임).forEach(function (요) { 목록.appendChild(목.폰카드(요, false)); });
    if (!걸러진.length) 목록.appendChild(만들기('div', { class: 'ph-card', text: '이 조건에 맞는 품목이 없습니다' }));
    조각.push(목록);
    u.목록등장(목록.children);

    if (걸러진.length > 상태.폰보임) {
      var 더 = 만들기('button', { class: 'btn', type: 'button', text: '더 보기' });
      더.addEventListener('click', function () { 상태.폰보임 += 15; 목록다시(); });
      조각.push(더);
    }
    return 조각;
  }

  function PC배치(뿌리) {
    var 전부 = 목.전부요약();
    var 걸러진 = 목.거르기(전부);
    참조.목록칸 = null;

    var 급 = 목.급한카드들(전부, false);
    if (급) 뿌리.appendChild(급);

    var 감쌈 = 만들기('div', { class: 'editwrap' });
    var 카드 = 만들기('div', { class: 'card table-card' });
    카드.appendChild(만들기('h3', {
      style: 'padding:0 var(--space-sm)',
      html: '전체 품목 <span class="hint">소진일 빠른 순</span>' +
        '<span class="right" style="display:flex; gap:var(--space-sm)">' +
        '<button class="btn sm" aria-disabled="true">⬇ 엑셀 내려받기</button>' +
        '<button class="btn sm" aria-disabled="true">인쇄</button></span>'
    }));

    var 조건 = 만들기('div', { style: 'padding:0 var(--space-sm) var(--space-lg); display:flex; flex-direction:column; gap:var(--space-lg)' });
    var 칩줄 = 목.필터칩들(전부, 다시);
    칩줄.appendChild(만들기('div', { style: 'flex:1' }));
    var 찾기 = 목.검색칸(목록다시);
    찾기.style.width = '264px'; 찾기.style.height = 'var(--h-btn)';
    칩줄.appendChild(찾기);
    조건.appendChild(칩줄);
    카드.appendChild(조건);

    참조.목록칸 = 만들기('div');
    PC목록속(걸러진).forEach(function (c) { 참조.목록칸.appendChild(c); });
    카드.appendChild(참조.목록칸);
    카드.appendChild(만들기('p', {
      style: 'padding:0 var(--space-2xl) var(--space-lg); font-size:var(--font-xs); color:var(--color-text-muted); line-height:1.7',
      html: '품목코드 왼쪽의 <b style="color:var(--color-accent-dark)">초록 띠</b>는 앞자리가 같은 다른 규격입니다 — ' +
        전부.filter(function (요) { return 요.같은접두; }).length + '종.'
    }));

    감쌈.appendChild(카드);
    참조.감쌈 = 감쌈;
    뿌리.appendChild(감쌈);
  }

  function 폰목록(뿌리) {
    var 전부 = 목.전부요약();
    var 걸러진 = 목.거르기(전부);
    참조.목록칸 = null;

    var 급 = 목.급한카드들(전부, true);
    if (급) 뿌리.appendChild(급);

    뿌리.appendChild(만들기('div', { class: 'field' }, [목.검색칸(목록다시)]));
    뿌리.appendChild(목.필터칩들(전부, 다시));

    참조.목록칸 = 만들기('div', { class: 'stack' });
    폰목록속(걸러진).forEach(function (c) { 참조.목록칸.appendChild(c); });
    뿌리.appendChild(참조.목록칸);
  }

  function 그리기(뿌리) {
    참조.뿌리 = 뿌리;
    참조.목록칸 = null; 참조.검색 = null;
    u.비우기(뿌리);
    if (u.폰인가()) {
      if (상태.상세코드) { ZG.재고수정.폰상세그리기(뿌리); return; }
      폰목록(뿌리);
    } else {
      상태.상세코드 = null;
      PC배치(뿌리);
    }
  }

  function 머리() {
    if (u.폰인가() && 상태.상세코드) return ZG.재고수정.폰상세머리();
    var 요 = 목.요약글();
    return { 제목: '재고', 뒤로: null, 왼: 요.왼, 오: 요.오 };
  }

  ZG.재고 = { 그리기: 그리기, 다시: 다시, 목록다시: 목록다시, 머리: 머리 };
})(window.ZG);
