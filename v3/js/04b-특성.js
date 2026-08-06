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

  /* 골라 넣는 칸 (8/6 우람님). 🔴 값은 구 프로그램이 쓰던 것을 그대로 둔다 —
     이사해 온 실데이터가 이 글자라 바꾸면 짝이 안 맞는다. 보이는 글만 풀어 썼다. */
  var 고르개 = {
    내한성: [['Zone2', 'Zone 2 (-45.6℃)'], ['Zone3', 'Zone 3 (-40℃)'], ['Zone4', 'Zone 4 (-34.4℃)'],
             ['Zone5', 'Zone 5 (-28.9℃)'], ['Zone6', 'Zone 6 (-23.3℃)'], ['Zone7', 'Zone 7 (-17.8℃)'],
             ['Zone8', 'Zone 8 (-12.2℃)'], ['Zone9', 'Zone 9 (-6.7℃)'], ['Zone10', 'Zone 10 (-1.1℃)']],
    물주기: [['자주', '자주 (흙이 마르면 바로)'], ['보통', '보통 (흙 표면이 마를 때)'],
             ['적게', '적게 (흙이 완전히 마른 뒤)'], ['건조', '건조하게 (가뭄 강함)'], ['다습', '다습 (항상 촉촉)']],
    햇빛:   [['양지', '양지 (6시간 이상 직사광)'], ['양지-반음지', '양지-반음지'],
             ['반음지', '반음지 (간접광)'], ['반음지-음지', '반음지-음지'], ['음지', '음지 (그늘 선호)']]
  };

  function 고름칸(이름, 값) {
    var s = 만들기('select', { class: 'inp' });
    function 넣기(v, 글) {
      var o = 만들기('option', { value: v, text: 글 });
      s.appendChild(o);
    }
    넣기('', '— 선택 —');
    var 있는것 = false;
    고르개[이름].forEach(function (쌍) {
      넣기(쌍[0], 쌍[1]);
      if (쌍[0] === 값) 있는것 = true;
    });
    /* 🔴 데이터에 「Zone 5 (-28.9℃)」처럼 화면에 보이던 긴 글자가 그대로 들어 있는 줄이 있다
       (구 프로그램이 내보낼 때 풀어 쓴 것이 그대로 넘어왔다).
       같은 뜻이니 코드값으로 알아본다 — 안 그러면 똑같은 항목이 둘로 보인다 */
    if (값 && !있는것) {
      var 짝 = 고르개[이름].filter(function (쌍) { return 쌍[1] === 값; })[0];
      if (짝) { 값 = 짝[0]; 있는것 = true; }
    }
    /* 그래도 못 알아본 옛 값은 그 값대로 넣어 둔다.
       안 넣으면 이 화면을 열어 저장하는 것만으로 조용히 지워진다 */
    if (값 && !있는것) 넣기(값, 값 + ' (예전 값)');
    s.value = 값;
    return s;
  }
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
      var 값 = 처음값[셋[0]] == null ? '' : String(처음값[셋[0]]);
      var e;
      if (고르개[셋[0]]) e = 고름칸(셋[0], 값);
      else {
        e = 만들기('input', { class: 'inp', type: 'text', placeholder: 셋[2] });
        e.value = 값;
      }
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
