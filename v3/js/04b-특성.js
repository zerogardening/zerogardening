/* 04b-특성 — 식물 특성 접기칸 (설계 §3-2 · §16-5)
   입고 등록과 재고 수정이 같은 부품을 쓴다.
   입고 때 못 채우고 나중에 재고 화면에서 채우는 흐름이 자연스러워서다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;

  var 칸들 = [
    ['최대높이', '최대높이(cm)', '60'],
    ['최대너비', '최대너비(cm)', '45'],
    ['내한성', '내한성', 'Zone5'],
    ['물주기', '물주기', '보통'],
    ['햇빛', '햇빛', '양지'],
    ['개화기', '개화기', '6~9월']
  ];
  var 요약글 = 칸들.map(function (셋) { return 셋[0]; }).join(' · ') + ' · 관리 특이사항';

  function 비었나(값) {
    if (!값) return true;
    return Object.keys(값).every(function (k) { return !String(값[k] == null ? '' : 값[k]).trim(); });
  }

  /* 반환: { 요소, 읽기() } — 읽기()는 전부 비면 null 을 준다
     옵션.접어두기: 값이 있어도 접힌 채로 연다 (재고 수정 화면) */
  function 접기(처음값, 옵션) {
    처음값 = 처음값 || {};
    옵션 = 옵션 || {};
    var 입력들 = {};

    var 표 = 만들기('div', { class: '특성표' });
    칸들.forEach(function (셋) {
      var e = 만들기('input', { class: 'inp', type: 'text', placeholder: 셋[2] });
      e.value = 처음값[셋[0]] == null ? '' : String(처음값[셋[0]]);
      입력들[셋[0]] = e;
      표.appendChild(만들기('div', { class: 'field' }, [만들기('label', { text: 셋[1] }), e]));
    });

    var 메모 = 만들기('textarea', {
      class: 'inp multi', rows: '3',
      placeholder: '예) 겨울에 밑동을 바짝 잘라줍니다. 여름 서향 볕에 잎이 탑니다.'
    });
    메모.value = 처음값.관리특이사항 == null ? '' : String(처음값.관리특이사항);
    입력들.관리특이사항 = 메모;
    표.appendChild(만들기('div', { class: 'field 넓게' }, [만들기('label', { text: '관리 특이사항' }), 메모]));

    var 몸 = 만들기('div', { class: 'foldbody' }, [표]);
    var 머리 = 만들기('button', {
      class: 'fold', type: 'button', 'aria-expanded': 'false',
      html: '＋ 식물 특성 <span class="s">선택 · 나중에 채워도 됩니다</span>' +
        '<span class="r">' + u.안전(요약글) + '</span>'
    });
    머리.addEventListener('click', function () {
      var 열림 = 몸.classList.toggle('open');
      머리.setAttribute('aria-expanded', 열림 ? 'true' : 'false');
      머리.innerHTML = (열림 ? '－' : '＋') + ' 식물 특성 <span class="s">선택 · 나중에 채워도 됩니다</span>' +
        '<span class="r">' + u.안전(요약글) + '</span>';
    });

    if (!옵션.접어두기 && !비었나(처음값)) { 몸.classList.add('open'); 머리.setAttribute('aria-expanded', 'true'); }

    function 읽기() {
      var 값 = {};
      Object.keys(입력들).forEach(function (k) { 값[k] = 입력들[k].value.trim(); });
      return 비었나(값) ? null : 값;
    }

    function 칸비우기() {
      Object.keys(입력들).forEach(function (k) { 입력들[k].value = ''; });
    }

    return { 요소: 만들기('div', { class: 'stack' }, [머리, 몸]), 읽기: 읽기, 비우기: 칸비우기 };
  }

  ZG.특성 = { 접기: 접기, 비었나: 비었나, 요약글: 요약글 };
})(window.ZG);
