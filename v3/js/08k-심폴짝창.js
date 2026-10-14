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

  function 상자틀(빛, 제목, 덧머리, 속) {
    var 머리 = [만들기('span', { text: 제목 })];
    if (덧머리) 머리.push(덧머리);
    return 만들기('div', { class: 'needbox', style: 톤[빛 + '상자'] }, [
      만들기('h4', { style: 톤[빛 + '머리'] }, 머리),
      만들기('div', { class: 'inner' }, 속)
    ]);
  }

  /* 붙인품목코드가 빈 레코드는 짝이 아니다 (옛 짝표() 가 빈 글자로 돌려주던 것과 같은 판단) */
  function 지은코드(색인, 열쇠) { return (색인[열쇠] && 색인[열쇠].붙인품목코드) || ''; }

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
  /* 🔴 옵션이 품목인 상품은 원본코드 아래 옵션(열쇠)별로 한 단 더 묶는다 (21단계 설계 §5).
        옛 짝으로 붙은 줄(라임리키가 골든제브라로 붙은 것)도 보여야 고치시므로 옛 짝이 있으면 넣는다.
        상품명은 품목이 빈 줄 것을 앞세운다 — 붙은 줄의 상품명은 v3 유통명이라 상품을 못 알아본다 */
  function 상품별(항목들, 색인) {
    var 표 = {}, 차례 = [];
    (항목들 || []).forEach(function (것) {
      var r = 것 && 것.줄;
      if (!r) return;
      var c = r.원본코드 || '';
      if (!c) return;
      var 풀 = ZG.짝.옵션풀이(c, r.옵션원문);
      var 심 = r.판매처 === '심폴' || r.판매처 === '당근';
      if (!심 && r.품목코드) {
        if (풀.품목옵션 ? !(지은코드(색인, 풀.열쇠) || 지은코드(색인, c)) : !지은코드(색인, c)) return;
      }
      var 묶키 = c + (풀.품목옵션 ? '§' : '');
      var 상 = 표[묶키];
      if (!상) {
        상 = 표[묶키] = { 코드: c, 상품명: 것.상품명 || '', 빈줄이름: !r.품목코드, 판매처: r.판매처 || '',
          줄수: 0, 품목옵션: 풀.품목옵션, 옵션이름: '', 옵션들: [], 옵션표: {} };
        차례.push(상);
      } else if (!상.빈줄이름 && !r.품목코드 && 것.상품명) {
        상.상품명 = 것.상품명; 상.빈줄이름 = true;
      }
      상.줄수++;
      if (!풀.품목옵션) return;
      if (!상.옵션이름) 상.옵션이름 = 풀.옵션이름;
      var o = 상.옵션표[풀.열쇠];
      if (!o) {
        o = 상.옵션표[풀.열쇠] = { 열쇠: 풀.열쇠, 옵션값: 풀.옵션값, 표시값: 풀.표시값, 입수: 풀.입수, 줄수: 0 };
        상.옵션들.push(o);
      }
      o.줄수++;
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
      규격cm: 값.규격cm, 규격: ZG.품목코드.규격이름(값.규격cm),
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
    var 규격 = 만들기('input', { class: 'inp num', type: 'number', min: '0', placeholder: 'cm · 규격 외는 0' });
    var 단가 = 만들기('input', { class: 'inp num', type: 'number', min: '0', placeholder: '원 · 비워 두셔도 됩니다' });
    유통.value = 것.첫값 || 것.상품명 || '';
    var 특 = ZG.특성.접기(null, { 접어두기: true });
    var 고를칸 = 만들기('div', { style: 'display:flex; gap:6px; flex-wrap:wrap; margin-top:6px' });

    function 값읽기() {
      var v = {
        유통명: 유통.value.trim(), 학명: 학명.value.trim(),
        규격cm: 규격.value.trim() === '' ? NaN : Number(규격.value),
        매입단가: Number(단가.value) || 0, 특성: 특.읽기()
      };
      if (!v.유통명) { u.토스트('유통명을 넣어 주세요.'); return null; }
      if (!v.학명) { u.토스트('학명을 넣어야 품목코드가 만들어집니다.'); return null; }
      if (!(v.규격cm >= 0)) { u.토스트('규격을 넣어 주세요 — 규격 외는 0.'); return null; }
      return v;
    }

    function 짝맺기(코드, 새로냐) {
      ZG.짝.짝쓰기(것.코드, 코드, 것.상품명, 것.덧);
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
  function 묶음저장(묶음, 것, 옵션) {
    var st = 묶음.읽기()[0];
    var 코드 = st ? st.접두 + '-' + st.cm : '';
    if (!코드) { u.토스트('품목을 고른 뒤 「짝 지어 저장」을 눌러 주세요.'); return; }
    /* 🔴 진짜 품목이 있을 때만 짝을 만든다. 없는 코드로 지으면 유통명·규격이 빈 채로 주문이 들어간다 */
    if (!마스터()[코드]) { u.토스트('v3에 ' + 코드 + ' 품목이 없습니다 — 규격을 확인해 주세요.'); return; }
    ZG.짝.짝쓰기(것.코드, 코드, 것.상품명, 것.덧);
    u.토스트((것.이름표 || 것.상품명) + ' → ' + 코드 + ' 짝을 저장했습니다.');
    옵션.바뀌면();   // 되붙이기 + 다시 그리기 — 숫자칸·표가 한꺼번에 맞는다
  }

  function 못지음블록(것, 옵션) {
    var 묶음 = ZG.주문입력.품목카드묶음(null, { 수량숨김: true, 한장만: true });
    function 저장() { 묶음저장(묶음, 것, 옵션); }

    return 만들기('div', { style: 'padding:10px 0; border-top:1px solid var(--color-border)' }, [
      만들기('div', { style: 'display:flex; align-items:baseline; gap:8px; flex-wrap:wrap; margin-bottom:6px' }, [
        만들기('b', { text: 것.상품명 || '(상품명 없음)' }),
        /* 당근은 상품코드가 없어 상품명 자체가 열쇠다 — 같은 글자를 두 번 쓰지 않는다 */
        만들기('span', { class: 'sub', text: 것.코드 === 것.상품명 ? '' : '상품코드 ' + 것.코드 }),
        만들기('span', { class: 'sub', style: 톤.노랑글, text: '이 파일에 ' + 것.줄수 + '줄' })
      ]),
      묶음.요소,
      만들기('div', { style: 'margin-top:6px' }, [단추('짝 지어 저장', 저장, 'main')]),
      새등록칸(것, 옵션)
    ]);
  }

  /* ── 옵션이 품목인 상품 한 블록 — 옵션마다 한 줄 (21단계 설계 §5) ── */
  function 옵션머리(상, 끝) {
    var 칸들 = [
      만들기('b', { text: 상.상품명 || '(상품명 없음)' }),
      만들기('span', { class: 'cd', text: 상.코드 }),
      만들기('span', { class: 'mall', text: 상.판매처 || '기타' }),
      만들기('span', { class: 'sub', text: (상.옵션이름 ? 상.옵션이름 + ' · ' : '') + '옵션 ' + 상.옵션들.length + '개' })
    ];
    if (끝) 칸들.push(끝);
    return 만들기('div', { class: 'phd' }, 칸들);
  }

  function 옵션왼쪽(o, 덧) {
    var 밑 = [];
    if (o.입수 > 0) 밑.push(만들기('span', { class: 'ip', text: o.입수 + '개입' }));
    밑.push(만들기('span', { class: 'ln', text: '이 파일에 ' + o.줄수 + '줄' }));
    if (덧) 밑.push(덧);
    return 만들기('div', {}, [만들기('div', { class: 'ov', text: o.표시값 }), 만들기('div', { class: 'om' }, 밑)]);
  }

  function 지은옵션줄(상, o, 코드, 마, 옵션) {
    var p = 마[코드];
    return 만들기('div', { class: 'orow done' }, [
      옵션왼쪽(o),
      만들기('div', { class: 'act' }, [
        만들기('span', { class: 'ck', text: '✓' }),
        만들기('span', { class: 'pc2', text: 코드 }),
        만들기('span', { class: 'pn', text: p ? p.유통명 : 'v3에 이 품목이 없습니다' }),
        만들기('span', { class: 'sub', text: p ? (p.규격 || '') : '' }),
        만들기('span', { class: 'spc' }),
        단추('짝 풀기', function () {
          ZG.짝.짝풀기(o.열쇠);
          u.토스트(o.표시값 + ' 짝을 풀었습니다.');
          옵션.바뀌면();
        }, 'sm')
      ])
    ]);
  }

  function 빈옵션줄(상, o, 내밀코드, 옵션) {
    /* 검색칸 첫값 — 「2. 튤립 티스부츠」의 번호를 뗀 것 */
    var 첫값 = o.옵션값.replace(/^\d+\s*[.)]\s*/, '');
    var 것 = { 코드: o.열쇠, 상품명: 상.상품명, 이름표: o.표시값, 첫값: 첫값, 덧: { 옵션값: o.옵션값 } };
    var 묶음 = ZG.주문입력.품목카드묶음([{ 유통명: 첫값 }], { 수량숨김: true, 한장만: true });
    var 예전 = null;
    if (내밀코드) {
      예전 = 단추('예전 짝 쓰기 · ' + 내밀코드, function () {
        ZG.짝.짝쓰기(o.열쇠, 내밀코드, 상.상품명, 것.덧);
        u.토스트(o.표시값 + ' → ' + 내밀코드 + ' 짝을 저장했습니다.');
        옵션.바뀌면();
      }, 'sm');
      예전.style.marginLeft = '4px';
    }
    var 새칸 = 만들기('div', { class: 'onew' }, [새등록칸(것, 옵션)]);
    새칸.style.display = 'none';
    var 새로 = 만들기('button', { class: 'lk', type: 'button', text: '＋ 새로 등록' });
    새로.addEventListener('click', function () {
      var 연다 = 새칸.style.display === 'none';
      새칸.style.display = 연다 ? '' : 'none';
      var 접기 = 새칸.querySelector('.fold');
      if (연다 && 접기 && 접기.getAttribute('aria-expanded') !== 'true') 접기.click();
    });
    return 만들기('div', { class: 'orow' }, [
      옵션왼쪽(o, 예전),
      만들기('div', { class: 'act' }, [
        만들기('div', { class: 'q' }, [묶음.요소]),
        단추('짝 지어 저장', function () { 묶음저장(묶음, 것, 옵션); }, 'main'),
        새로
      ]),
      새칸
    ]);
  }

  function 옵션블록(상, 색인, 마, 옵션) {
    var 블록;
    var 끝 = 만들기('button', { class: 'esc', type: 'button', text: '이 상품은 옵션 구분 없이 하나로' });
    끝.addEventListener('click', function () {
      /* 이 상품만 옛 블록으로 바꿔 그린다. 저장하면 id=원본코드 짝에 옵션무시가 붙어 전 옵션을 덮는다 */
      블록.replaceWith(못지음블록({ 코드: 상.코드, 상품명: 상.상품명, 줄수: 상.줄수, 덧: { 옵션무시: true } }, 옵션));
    });
    var 속 = [옵션머리(상, 끝)];
    var 옛코드 = 지은코드(색인, 상.코드);
    if (옛코드) {
      속.push(만들기('div', { class: 'oldnote' }, [
        document.createTextNode('⚠ 예전에 옵션 구분 없이 '),
        만들기('span', { class: 'cd', text: 옛코드 }),
        document.createTextNode('로 지어 둔 짝이 있습니다 — 옵션별로 다시 지어 주세요')
      ]));
    }
    /* 「예전 짝 쓰기」가 내미는 코드 — 옛 짝, 없으면 원본코드가 곧 v3 코드인 경우 (설계 §3).
       🔴 v3에 없는 코드는 내밀지 않는다. 없는 코드로 지으면 유통명이 빈 채로 붙는다 */
    var 꼴 = ZG.주문올리기.코드정규화(상.코드).코드;
    var 내밀 = (옛코드 && 마[옛코드]) ? 옛코드 : ((꼴 && 마[꼴]) ? 꼴 : '');
    상.옵션들.forEach(function (o) {
      var 코드 = 지은코드(색인, o.열쇠);
      속.push(코드 ? 지은옵션줄(상, o, 코드, 마, 옵션) : 빈옵션줄(상, o, 내밀, 옵션));
    });
    블록 = 만들기('div', { class: 'pblk' }, 속);
    return 블록;
  }

  function 못지음상자(것들, 옵션개수, 색인, 옵션) {
    var 마 = 마스터();
    var 속 = 것들.map(function (상) {
      return 상.옵션별 ? 옵션블록(상, 색인, 마, 옵션) : 못지음블록(상, 옵션);
    });
    속.push(만들기('div', { class: 'allrow' }, [
      만들기('span', { class: 'l', text: '짝을 안 지어도 —' }),
      만들기('span', {
        class: 'note',
        html: '<b>저장은 됩니다.</b> 품목코드 없이 들어갑니다'
      })
    ]));
    var 덧 = 옵션개수 ? 만들기('span', { class: 'sub', style: 톤.노랑글 + '; font-weight:700', text: '· 옵션 ' + 옵션개수 + '개' }) : null;
    return 상자틀('노랑', '⚠️ 짝 못 지은 상품 ' + 것들.length + '종', 덧, 속);
  }

  /* ── 이미 지어 둔 것 — 「짝 풀기」가 있어야 잘못 지은 짝을 되돌릴 수 있다.
     옵션별로 지은 상품은 옵션마다 한 줄 ── */
  function 지음상자(것들, 색인, 옵션) {
    var 마 = 마스터();
    function 한줄(상, 옵션글, 줄수, 열쇠) {
      var 코드 = 지은코드(색인, 열쇠), p = 마[코드];
      return 만들기('tr', {}, [
        만들기('td', {}, [만들기('div', { text: 상.상품명 }),
          만들기('div', { class: 'sub', text: '이 파일에 ' + 줄수 + '줄' })]),
        만들기('td', { class: 'dim', text: 옵션글 || '—' }),
        만들기('td', { class: 'code', text: 상.코드 === 상.상품명 ? '—' : 상.코드 }),
        만들기('td', {}, [만들기('div', { class: 'code', text: 코드 }),
          만들기('div', { class: 'sub', text: p ? (p.유통명 + ' · ' + (p.규격 || '')) : 'v3에 이 품목이 없습니다' })]),
        만들기('td', { class: 'r' }, [단추('짝 풀기', function () {
          ZG.짝.짝풀기(열쇠);
          u.토스트((옵션글 || 상.상품명) + ' 짝을 풀었습니다.');
          옵션.바뀌면();
        }, 'sm')])
      ]);
    }
    var 표틀 = 만들기('table', {}, [
      만들기('colgroup', {}, ['', '200px', '170px', '220px', '84px'].map(function (w) {
        return 만들기('col', w ? { style: 'width:' + w } : {});
      })),
      만들기('tr', {}, [
        만들기('th', { text: '상품명' }), 만들기('th', { text: '옵션' }), 만들기('th', { text: '상품코드' }),
        만들기('th', { text: '붙는 v3 품목' }), 만들기('th', { class: 'r', text: '' })
      ])
    ]);
    것들.forEach(function (상) {
      if (상.옵션별) 상.옵션들.forEach(function (o) { 표틀.appendChild(한줄(상, o.표시값, o.줄수, o.열쇠)); });
      else 표틀.appendChild(한줄(상, '', 상.줄수, 상.코드));
    });
    return 상자틀('회색', '이미 짝 지어 둔 것 ' + 것들.length + '종', null, [표틀]);
  }

  function 상자(항목들, 옵션) {
    옵션 = 옵션 || {};
    if (typeof 옵션.바뀌면 !== 'function') 옵션.바뀌면 = function () {};
    var 색인 = ZG.짝.짝색인(), 모두 = 상품별(항목들, 색인);
    var 못 = [], 됨 = [], 옵션개수 = 0;
    모두.forEach(function (상) {
      /* 「옵션 구분 없이 하나로」로 지은 상품은 옛 상품처럼 원본코드 한 짝으로 본다 */
      var 구분없이 = 상.품목옵션 && 색인[상.코드] && 색인[상.코드].옵션무시 && 지은코드(색인, 상.코드);
      상.옵션별 = 상.품목옵션 && !구분없이;
      var 남은 = 상.옵션별
        ? 상.옵션들.filter(function (o) { return !지은코드(색인, o.열쇠); }).length
        : (지은코드(색인, 상.코드) ? 0 : 1);
      if (상.옵션별) 옵션개수 += 남은;
      (남은 ? 못 : 됨).push(상);
    });

    var 속 = [];
    if (못.length) 속.push(못지음상자(못, 옵션개수, 색인, 옵션));
    if (됨.length) 속.push(지음상자(됨, 색인, 옵션));
    /* 🔴 지을 짝도 지어 둔 짝도 없으면 아무것도 안 그린다(null) — 08h 가 그때만 옛 안내를 띄운다.
       빈 상자를 돌려주면 카페24 파일마다 「심폴 짝짓기」 빈 칸이 뜬다 */
    if (!속.length) return null;
    return 만들기('div', {}, 속);
  }

  ZG.짝창 = { 상자: 상자 };
  ZG.심폴짝창 = ZG.짝창;   // 옛 이름
})(window.ZG);
