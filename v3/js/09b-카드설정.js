/* 09b-카드설정 — 동봉카드 설정 창 · 수동 카드 창 (2026-08-05 우람님 지시)
   창 틀은 출고리스트·동봉카드와 같은 .pcsheet 를 그대로 쓴다.
   🔴 한글 칸이다. 입력 중에 다시 그리는 처리를 붙이지 않는다(조합이 끊긴다) — 값은 저장할 때 한 번에 읽는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;

  // 확인 상자가 떠 있을 때의 Esc 는 그 상자 몫이다(u.탈출걸기 가 걸러 준다).
  // 창까지 같이 닫히면 쓰던 값이 날아간다
  function 닫기() { ZG.주문입력.닫기창(); }

  /* 창 하나를 띄운다. 머리줄 오른쪽 버튼만 화면마다 다르다 */
  function 창띄우기(제목, 힌트, 오른쪽들, 속들) {
    ZG.주문입력.닫기창();
    var 막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', 닫기);

    var 닫기버튼 = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '닫기' });
    닫기버튼.addEventListener('click', 닫기);

    var 창 = 만들기('div', { class: 'pcsheet', role: 'dialog', 'aria-modal': 'true' }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: 제목 }),
        만들기('span', { class: 'hint', text: 힌트 }),
        만들기('span', { class: 'right' }, 오른쪽들.concat([닫기버튼]))
      ]),
      만들기('div', { class: 'bd' }, 속들)
    ]);
    document.body.appendChild(막);
    document.body.appendChild(창);
    u.탈출걸기(닫기);
    return 창;
  }

  function 밭(라벨, 속) { return 만들기('div', { class: 'field' }, [만들기('label', { text: 라벨 }), 속]); }
  function 절(글) { return 만들기('div', { class: 'ph-sec', text: 글 }); }
  function 글칸(값) { return 만들기('input', { class: 'inp', type: 'text', value: 값 || '', autocomplete: 'off' }); }

  function 수칸(값) {
    var i = 만들기('input', { class: 'inp num', type: 'number', min: '1', value: String(값) });
    i.inputMode = 'numeric';
    return i;
  }

  /* ══ ⚙ 설정 창 ══ */
  function 설정창() {
    var s = ZG.동봉카드.설정읽기();
    var 행들 = [];
    var 목록 = 만들기('div', { class: 'presets' });

    function 프리셋행(p) {
      var 고름 = 만들기('input', { type: 'radio', name: 'zg-프리셋', value: p.id });
      고름.checked = (p.id === s.선택프리셋);
      var 이름 = 글칸(p.이름);
      이름.placeholder = '프리셋 이름';
      var 긴 = 만들기('textarea', { class: 'inp', rows: '4' });
      긴.value = p.내용 || '';
      긴.placeholder = '1~3종 카드에 들어갈 안내 말씀';
      var 짧 = 만들기('textarea', { class: 'inp', rows: '3' });
      짧.value = p.짧은내용 || '';
      짧.placeholder = '비우면 위 글을 그대로 씁니다';

      var 지움 = 만들기('button', {
        class: 'x', type: 'button', text: '✕',
        'aria-label': p.내장 ? '내장 문구는 지울 수 없습니다' : '이 프리셋 지우기',
        title: p.내장 ? '내장 문구는 지울 수 없습니다' : '지우기'
      });
      if (p.내장) 지움.disabled = true;

      var 행 = 만들기('div', { class: 'preset' }, [
        만들기('div', { class: 'top' }, [고름, 이름, 지움]),
        밭('안내 말씀 (1~3종)', 긴),
        밭('짧은 글 (4종 이상)', 짧)
      ]);
      var 것 = { id: p.id, 내장: !!p.내장, 요소: 행, 고름: 고름, 이름: 이름, 긴: 긴, 짧: 짧 };

      지움.addEventListener('click', function () {
        if (p.내장) return;
        u.확인({ 제목: '이 프리셋을 지울까요?', 본문: u.안전(이름.value || '이름 없는 프리셋'), 확인글: '삭제', 위험: true }, function (예) {
          if (!예) return;
          var i = 행들.indexOf(것);
          if (i >= 0) 행들.splice(i, 1);
          목록.removeChild(행);
          if (것.고름.checked && 행들[0]) 행들[0].고름.checked = true;
        });
      });

      행들.push(것);
      목록.appendChild(행);
      return 것;
    }

    s.프리셋들.forEach(프리셋행);

    var 추가 = 만들기('button', { class: 'btn', type: 'button', text: '＋ 프리셋 추가' });
    추가.addEventListener('click', function () {
      var 것 = 프리셋행({ id: 'p' + Date.now(), 이름: '', 내용: '', 짧은내용: '' });
      것.이름.focus();
    });

    var 인사 = 글칸(s.인사), 인사아래 = 글칸(s.인사아래), 태그 = 글칸(s.태그라인);

    var 특상한 = {};
    var 특칸들 = [];
    [1, 2, 3, 4, 5, 6].forEach(function (n) {
      특상한[n] = 수칸(s.특이사항상한[n]);
      특칸들.push(밭(n + '종', 특상한[n]));
    });
    var 긴상한 = 수칸(s.안내말씀상한.긴글), 짧상한 = 수칸(s.안내말씀상한.짧은글);

    var 저장 = 만들기('button', { class: 'btn sm main', type: 'button', text: '저장' });
    저장.addEventListener('click', function () {
      var 새것 = 행들.map(function (r) {
        return {
          id: r.id, 내장: r.내장,
          이름: r.이름.value.trim() || '(이름 없음)',
          내용: r.긴.value.trim(),
          짧은내용: r.짧.value.trim()
        };
      });
      if (!새것.length) { u.토스트('프리셋이 하나는 있어야 합니다.'); return; }
      var 고른 = 행들.filter(function (r) { return r.고름.checked; })[0];

      var 특 = {};
      Object.keys(특상한).forEach(function (n) { 특[n] = Number(특상한[n].value) || s.특이사항상한[n]; });

      ZG.저장소.동봉카드설정쓰기({
        태그라인: 태그.value.trim(),
        인사: 인사.value.trim(),
        인사아래: 인사아래.value.trim(),
        프리셋들: 새것,
        선택프리셋: 고른 ? 고른.id : 새것[0].id,
        특이사항상한: 특,
        안내말씀상한: { 긴글: Number(긴상한.value) || s.안내말씀상한.긴글, 짧은글: Number(짧상한.value) || s.안내말씀상한.짧은글 }
      });
      u.토스트('동봉카드 설정을 저장했습니다.');
      if (!ZG.동봉카드.다시열기()) 닫기();
    });

    var 되돌리기 = 만들기('button', { class: 'btn sm', type: 'button', text: '기본값' });
    되돌리기.addEventListener('click', function () {
      u.확인({ 제목: '기본값으로 되돌릴까요?', 본문: '직접 넣으신 프리셋·문구가 사라집니다.', 확인글: '되돌리기', 위험: true }, function (예) {
        if (!예) return;
        ZG.저장소.전체쓰기(ZG.저장소.키.동봉카드설정, {});
        u.토스트('기본값으로 되돌렸습니다.');
        설정창();
      });
    });

    창띄우기('동봉카드 설정', '문구 · 글자수', [되돌리기, 저장], [
      만들기('div', { class: 'cardset' }, [
        절('안내 말씀 프리셋 — 왼쪽 동그라미로 쓸 문구를 고릅니다'),
        목록, 추가,
        절('인사말'),
        만들기('div', { class: 'itemstack' }, [밭('윗줄', 인사), 밭('아랫줄', 인사아래)]),
        절('상단 태그라인'),
        밭('로고 옆 한 줄', 태그),
        절('글자수 상한 — 넘치면 … 로 잘립니다'),
        만들기('div', { class: 'lims' }, 특칸들),
        만들기('div', { class: 'lims' }, [밭('안내 1~3종', 긴상한), 밭('안내 4종~', 짧상한)])
      ])
    ]);
  }

  /* ══ ✎ 수동 카드 ══ 주문 없이 품목만 골라 같은 카드를 뽑는다.
     받는 분·송장번호·주문번호는 카드에 안 들어가므로 묻지 않는다 */
  function 수동창() {
    var 묶음 = ZG.주문입력.품목카드묶음(null, { 수량숨김: true });   // 카드에 수량은 안 찍힌다

    var 만들 = 만들기('button', { class: 'btn sm main', type: 'button', text: '카드 만들기' });
    만들.addEventListener('click', function () {
      var 것들 = 묶음.읽기();
      if (!것들.length) { u.흔들기(묶음.요소); u.토스트('품목을 하나 이상 골라 주세요.'); return; }
      ZG.동봉카드.수동열기(것들);
    });

    창띄우기('수동 카드', '주문 없이 품목만 골라 만듭니다', [만들], [
      만들기('div', { class: 'cardset' }, [묶음.요소])
    ]);
  }

  ZG.카드설정 = { 설정창: 설정창, 수동창: 수동창 };
})(window.ZG);
