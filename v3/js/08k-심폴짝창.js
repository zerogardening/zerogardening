/* 08k-심폴짝창 — 미리보기 안 「상품 짝짓기」 상자 (8단계 설계 §7).
   새 화면 단계를 만들지 않는다. 품목 고르기는 08c.품목카드묶음 을 그대로 빌려 쓴다.

   🔴 줄이 아니라 「원본 상품코드」로 묶는다 — 같은 상품이 다섯 줄이면 짝은 한 번만 지으신다.
   🔴 2026-08-10 우람님 지시로 심폴 전용을 그만뒀다 — 카페24 줄도 품목이 안 붙었으면 여기 뜬다.
      바깥에서는 `ZG.짝창` 으로 부른다(`ZG.심폴짝창` 은 옛 이름, 같은 것이다). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;

  /* 08h 의 톤과 같은 값. 새 CSS 규칙을 만들지 않으려고 여기서 입힌다 */
  var 톤 = {
    노랑상자: 'border-color:#F2DFA8',
    노랑머리: 'background:#FFF8E6; color:#9A6400; border-bottom-color:#F2DFA8',
    회색상자: 'border-color:var(--color-border)',
    회색머리: 'background:var(--color-seg-bg); color:var(--color-text-sub); border-bottom-color:var(--color-border)',
    노랑글: 'color:#9A6400'
  };

  function 상자틀(빛, 제목, 왜, 속) {
    return 만들기('div', { class: 'needbox', style: 톤[빛 + '상자'] }, [
      만들기('h4', { style: 톤[빛 + '머리'] }, [
        만들기('span', { text: 제목 }),
        만들기('span', { class: 'why', text: 왜 || '' })
      ]),
      만들기('div', { class: 'inner' }, 속)
    ]);
  }

  function 단추(글자, 눌림, 반) {
    var b = 만들기('button', { class: 'btn' + (반 ? ' ' + 반 : ''), type: 'button', text: 글자 });
    b.addEventListener('click', 눌림);
    return b;
  }

  /* 짝이 필요한(또는 이미 지어 둔) 줄만 원본코드로 묶는다. { 코드, 상품명, 줄수 }
     🔴 심폴은 늘 짝이 열쇠라 전부 넣는다. 그 밖의 판매처는 **품목이 저절로 붙은 줄을 뺀다** —
        안 그러면 잘 붙은 카페24 상품이 죄다 「짝 못 지음」으로 떠서 진짜 문제가 묻힌다.
        이미 짝을 지어 둔 코드는(짝이 붙여 준 줄이라 품목코드가 차 있다) 「짝 풀기」를 위해 남긴다.
     🔴 원본코드가 빈칸인 줄은 기억할 열쇠가 없어 여기 안 넣는다(우람님 확정 8/10) — 08h 가 따로 알린다. */
  function 상품별(항목들) {
    var 짝 = ZG.짝.짝표();
    var 표 = {}, 차례 = [];
    (항목들 || []).forEach(function (것) {
      var r = 것 && 것.줄;
      if (!r) return;
      var c = r.원본코드 || '';
      if (!c) return;
      if (r.판매처 !== '심폴' && r.품목코드 && !짝[c]) return;
      if (!표[c]) { 표[c] = { 코드: c, 상품명: 것.상품명 || '', 줄수: 0 }; 차례.push(표[c]); }
      표[c].줄수++;
    });
    return 차례;
  }

  function 마스터() {
    var 표 = {};
    ZG.저장소.품목들().forEach(function (p) { 표[p.품목코드] = p; });
    return 표;
  }

  /* ── v3에 아예 없는 식물이면 여기서 바로 등록한다 (2026-08-10 우람님 지시) ──
     🔴 입고(매입) 없이 품목만 생긴다 — 재고는 0이고 매입 이력도 없다.
        마진·명세서는 실제 입고를 넣으셔야 맞는다. 그래서 폼 안에도 같은 말을 적어 둔다.
     🔴 식물은 면세로 넣는다. 과세 품목이면 재고 화면에서 고치셔야 한다(여기엔 칸을 안 뒀다). */
  function 품목넣기(코드, 값) {
    var 저 = ZG.저장소, 이제 = Date.now();
    저.덧붙이기(저.키.품목, {
      품목코드: 코드, 접두: 코드.slice(0, 5), 학명3: 코드.slice(0, 3), 일련번호: 코드.slice(3, 5),
      규격cm: 값.규격cm, 규격: 값.규격cm + 'cm 포트',
      유통명: 값.유통명, 학명: 값.학명, 학명키: ZG.품목코드.학명키(값.학명),
      매입단가: 값.매입단가, 과세구분: '면세', 상태: '판매중',
      특성: 값.특성, 등록일시: 이제, 수정일시: 이제
    });
    return 코드;
  }

  function 칸(라벨, 요소) {
    return 만들기('div', { class: 'field' }, [만들기('label', { text: 라벨 }), 요소]);
  }

  function 새등록칸(것, 옵션) {
    var 유통 = 만들기('input', { class: 'inp', type: 'text', placeholder: '예: 추명국 휠윈드핑크' });
    var 학명 = 만들기('input', { class: 'inp sci', type: 'text', placeholder: '예: Anemone hupehensis' });
    var 규격 = 만들기('input', { class: 'inp num', type: 'number', min: '1', placeholder: 'cm' });
    var 단가 = 만들기('input', { class: 'inp num', type: 'number', min: '0', placeholder: '원 · 비워 두셔도 됩니다' });
    유통.value = 것.상품명 || '';
    var 특 = ZG.특성.접기(null, { 접어두기: true });
    var 고를칸 = 만들기('div', { style: 'display:flex; gap:6px; flex-wrap:wrap; margin-top:6px' });

    function 값읽기() {
      var v = {
        유통명: 유통.value.trim(), 학명: 학명.value.trim(),
        규격cm: Number(규격.value), 매입단가: Number(단가.value) || 0, 특성: 특.읽기()
      };
      if (!v.유통명) { u.토스트('유통명을 넣어 주세요.'); return null; }
      if (!v.학명) { u.토스트('학명을 넣어야 품목코드가 만들어집니다.'); return null; }
      if (!(v.규격cm >= 1)) { u.토스트('규격(포트 cm)을 넣어 주세요.'); return null; }
      return v;
    }

    function 짝맺기(코드, 새로냐) {
      ZG.짝.짝쓰기(것.코드, 코드, 것.상품명);
      u.토스트((새로냐 ? '새 품목 ' : '') + 코드 + ' 에 짝을 지었습니다.');
      옵션.바뀌면();   // 되붙이기 + 다시 그리기
    }

    function 등록() {
      고를칸.innerHTML = '';
      var 값 = 값읽기(); if (!값) return;
      var 계 = ZG.품목코드.코드계산(값.학명, 값.규격cm, ZG.저장소.품목들());
      if (계.상태 === '오류') { u.토스트(계.메시지); return; }
      /* 같은 학명·같은 규격이 이미 있으면 새로 만들지 않는다 — 짝만 짓는다 */
      if (계.상태 === '이미있음') { 짝맺기(계.코드, false); return; }
      if (계.상태 === '새것') { 짝맺기(품목넣기(계.코드, 값), true); return; }
      /* 확인필요 — 앞 3자가 같은 식물이 이미 있다. 같은 것인지 다른 것인지는 우람님만 아신다.
         🔴 여기서 잘못 고르면 엉뚱한 식물과 코드를 나눠 쓰게 된다. 그래서 자동으로 안 정한다 */
      고를칸.appendChild(만들기('div', {
        class: 'sub', style: 톤.노랑글 + '; width:100%',
        text: '앞 3자가 같은 식물이 이미 있습니다 — 어느 쪽인지 골라 주세요'
      }));
      [['같은 식물이다 · ' + 계.확정코드, 계.확정코드],
       ['다른 식물이다 · ' + 계.대안코드, 계.대안코드]].forEach(function (쌍) {
        고를칸.appendChild(단추(쌍[0], function () { 짝맺기(품목넣기(쌍[1], 값), true); }, 'sm'));
      });
    }

    var 몸 = 만들기('div', { class: 'foldbody' }, [
      만들기('div', { class: 'stack', style: 'padding-top:8px' }, [
        만들기('div', { class: 'sub', text:
          '매입 기록 없이 품목만 만듭니다 — 재고는 0이고, 매입가는 실제 입고를 넣으실 때 맞춰집니다.' }),
        칸('유통명', 유통), 칸('학명', 학명), 칸('규격 (포트 cm)', 규격), 칸('매입단가 (선택)', 단가),
        특.요소, 고를칸,
        만들기('div', {}, [단추('새 품목 등록하고 짝 짓기', 등록, 'main')])
      ])
    ]);
    var 글자 = ' v3에 없는 식물이면 <b>여기서 새로 등록</b>';
    var 머리 = 만들기('button', { class: 'fold', type: 'button', 'aria-expanded': 'false', html: '＋' + 글자 });
    머리.addEventListener('click', function () {
      var 열림 = 몸.classList.toggle('open');
      머리.setAttribute('aria-expanded', 열림 ? 'true' : 'false');
      머리.innerHTML = (열림 ? '－' : '＋') + 글자;
    });
    return 만들기('div', { class: 'stack', style: 'margin-top:8px' }, [머리, 몸]);
  }

  /* ── 못 지은 상품 한 블록 — 08c 품목 고르기 카드를 그대로 쓴다 ── */
  function 못지음블록(것, 옵션) {
    var 묶음 = ZG.주문입력.품목카드묶음(null, { 수량숨김: true, 한장만: true });

    function 저장() {
      var st = 묶음.읽기()[0];
      var 코드 = st ? st.접두 + '-' + st.cm : '';
      if (!코드) { u.토스트('품목을 고른 뒤 「짝 지어 저장」을 눌러 주세요.'); return; }
      /* 🔴 진짜 품목이 있을 때만 짝을 만든다. 없는 코드로 지으면 유통명·규격이 빈 채로 주문이 들어간다 */
      if (!마스터()[코드]) { u.토스트('v3에 ' + 코드 + ' 품목이 없습니다 — 규격을 확인해 주세요.'); return; }
      ZG.짝.짝쓰기(것.코드, 코드, 것.상품명);
      u.토스트(것.상품명 + ' → ' + 코드 + ' 짝을 저장했습니다.');
      옵션.바뀌면();   // 되붙이기 + 다시 그리기 — 숫자칸·표가 한꺼번에 맞는다
    }

    return 만들기('div', { style: 'padding:10px 0; border-top:1px solid var(--color-border)' }, [
      만들기('div', { style: 'display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-bottom:6px' }, [
        만들기('b', { text: 것.상품명 || '(상품명 없음)' }),
        만들기('span', { class: 'sub', text: '상품코드 ' + 것.코드 }),
        만들기('span', { class: 'sub', style: 톤.노랑글, text: '이 파일에 ' + 것.줄수 + '줄' })
      ]),
      묶음.요소,
      만들기('div', { style: 'margin-top:6px' }, [단추('짝 지어 저장', 저장, 'main')]),
      새등록칸(것, 옵션)
    ]);
  }

  function 못지음상자(것들, 옵션) {
    var 속 = 것들.map(function (것) { return 못지음블록(것, 옵션); });
    속.push(만들기('div', { class: 'allrow' }, [
      만들기('span', { class: 'l', text: '짝을 안 지어도 —' }),
      만들기('span', {
        class: 'note',
        html: '<b>저장은 됩니다.</b> 품목코드 없이 들어가고 주문 화면에서 나중에 지정하시면 됩니다'
      })
    ]));
    return 상자틀('노랑', '⚠️ 짝 못 지은 상품 ' + 것들.length + '종',
      '한 번만 지어 두시면 다음부터는 저절로 붙습니다', 속);
  }

  /* ── 이미 지어 둔 것 — 「짝 풀기」가 있어야 잘못 지은 짝을 되돌릴 수 있다 ── */
  function 지음상자(것들, 표, 옵션) {
    var 마 = 마스터();
    var 줄들 = 것들.map(function (것) {
      var 코드 = 표[것.코드], p = 마[코드];
      return 만들기('tr', {}, [
        만들기('td', {}, [만들기('div', { text: 것.상품명 }),
          만들기('div', { class: 'sub', text: '이 파일에 ' + 것.줄수 + '줄' })]),
        만들기('td', { class: 'code', text: 것.코드 }),
        만들기('td', {}, [만들기('div', { class: 'code', text: 코드 }),
          만들기('div', { class: 'sub', text: p ? (p.유통명 + ' · ' + (p.규격 || '')) : 'v3에 이 품목이 없습니다' })]),
        만들기('td', { class: 'r' }, [단추('짝 풀기', function () {
          ZG.짝.짝풀기(것.코드);
          u.토스트(것.상품명 + ' 짝을 풀었습니다.');
          옵션.바뀌면();
        }, 'sm')])
      ]);
    });
    var 표틀 = 만들기('table', {}, [
      만들기('colgroup', {}, ['', '170px', '210px', '84px'].map(function (w) {
        return 만들기('col', w ? { style: 'width:' + w } : {});
      })),
      만들기('tr', {}, [
        만들기('th', { text: '상품명' }), 만들기('th', { text: '상품코드' }),
        만들기('th', { text: '붙는 v3 품목' }), 만들기('th', { class: 'r', text: '' })
      ])
    ]);
    줄들.forEach(function (tr) { 표틀.appendChild(tr); });
    return 상자틀('회색', '이미 짝 지어 둔 것 ' + 것들.length + '종',
      '잘못 지었으면 「짝 풀기」로 되돌리시면 됩니다', [표틀]);
  }

  function 상자(항목들, 옵션) {
    옵션 = 옵션 || {};
    if (typeof 옵션.바뀌면 !== 'function') 옵션.바뀌면 = function () {};
    var 표 = ZG.짝.짝표(), 모두 = 상품별(항목들);
    var 못 = 모두.filter(function (것) { return !표[것.코드]; });
    var 됨 = 모두.filter(function (것) { return !!표[것.코드]; });

    var 속 = [];
    if (못.length) 속.push(못지음상자(못, 옵션));
    if (됨.length) 속.push(지음상자(됨, 표, 옵션));
    /* 🔴 지을 짝도 지어 둔 짝도 없으면 아무것도 안 그린다(null) — 08h 가 그때만 옛 안내를 띄운다.
       빈 상자를 돌려주면 카페24 파일마다 「심폴 짝짓기」 빈 칸이 뜬다 */
    if (!속.length) return null;
    return 만들기('div', {}, 속);
  }

  ZG.짝창 = { 상자: 상자 };
  ZG.심폴짝창 = ZG.짝창;   // 옛 이름
})(window.ZG);
