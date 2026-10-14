/* 08p-운임손질창 — 「주문 올리기」 완료창 안의 묶음 줄 목록 + 그 자리 펼침 편집 (10단계 설계 §5)
   새 창을 띄우지 않는다. 새 페이지도 만들지 않는다.

   🔴 상태는 줄 색으로만 말한다 — 빨강(확인요망) · 초록(손댐). 설명 문구·경고바·계산근거를 붙이지 않는다.
   🔴 저장하면 이 상자만 다시 그린다. 완료창 전체를 다시 그리면 입력칸이 통째로 갈아끼워진다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 앞몇줄 = 6;

  function 단추(글자, 눌림, 반) {
    var b = 만들기('button', { class: 'btn' + (반 ? ' ' + 반 : ''), type: 'button', text: 글자 });
    b.addEventListener('click', function (e) { e.stopPropagation(); 눌림(); });
    return b;
  }

  /* 박스 ± 는 .btn 을 입히지 않는다 — .qty 가 자기 크기를 갖는다 */
  function 셈단추(글자, 눌림) {
    var b = 만들기('button', { type: 'button', text: 글자 });
    b.addEventListener('click', function (e) { e.stopPropagation(); 눌림(); });
    return b;
  }

  function 돈(v) { return u.콤마(Number(v) || 0); }
  function 글(v) { return String(v == null ? '' : v); }

  /* 한 줄이 자기 손질 행을 찾는 열쇠. 추가 송장은 차수로 갈린다 */
  function 줄키(g) { return g.키 + '#' + (g.차수 || 1); }

  function 주소줄(g) {
    var o = g.것들[0].원본;
    var 주 = 글(o[15]).split(/\s+/).slice(0, 2).join(' ');
    var 우 = 글(o[14]);
    return [주, 우].filter(Boolean).join(' · ');
  }

  function 품목글(g) {
    return g.것들.map(function (것) {
      var r = 것.줄;
      return (r.유통명 || 것.상품명 || '') + ' ' + ZG.주문자료.수량(r) + '개';
    }).join(' / ');
  }

  function 상자(옵션) {
    옵션 = 옵션 || {};
    var 열린 = null;                 // 펼쳐 둔 줄키 하나
    var 고른 = {};                   // 줄키 → true — 여러 묶음에 단가 한꺼번에 (우람님 10/14)
    var 머리글칸 = null;             // 「로젠에 나갈 ○묶음 · 박스 ○개」 — 조용히 저장할 때 글자만 갈아 끼운다
    var 편집 = {};                   // 줄키 → { 단가, 박스수 } — 저장 전 손에 든 값
    var 틀 = 만들기('div', {});
    var 준비 = null;

    function 손질행(g) {
      return ZG.운임손질.찾기(옵션.묶음id, g.키, g.차수 || 1);
    }

    function 손에든값(g) {
      var k = 줄키(g);
      if (!편집[k]) {
        편집[k] = {
          단가: g.단가 === '확인요망' ? '' : String(g.단가),
          박스수: g.박스수 || 1
        };
      }
      return 편집[k];
    }

    function 다시() {
      준비 = 옵션.준비하기();
      u.비우기(틀);
      틀.appendChild(그리기());
      if (옵션.바뀌면) 옵션.바뀌면(준비);
    }

    function 머리글() { return '📦 로젠에 나갈 ' + 준비.묶음수 + '묶음 · 박스 ' + 준비.박스합 + '개'; }

    /* 고른 묶음에 같은 단가를 한꺼번에 — 박스수는 각자 것을 그대로 둔다 */
    function 한꺼번에(단) {
      if (!단) { u.토스트('택배 단가를 넣어 주세요.'); return; }
      var 수 = 0;
      준비.그룹들.forEach(function (g) {
        var k = 줄키(g);
        if (!고른[k]) return;
        ZG.운임손질.저장(옵션.묶음id, g.키, g.차수 || 1, {
          단가: 단, 박스수: (편집[k] && 편집[k].박스수) || g.박스수 || 1,
          수령인: 글(g.것들[0].줄.수령인), 자동값: g.자동값
        });
        delete 편집[k];
        수++;
      });
      고른 = {};
      u.토스트(수 + '묶음을 ' + 돈(단) + '원으로 넣었습니다.');
      다시();
    }

    /* ── 펼침 (§5-4) ── */

    /* 🔴 저장 단추가 없다 — 고르거나 치는 즉시 저장한다 (우람님 10/14 「두 번 누를 필요 없다」).
       치는 도중 상자를 다시 그리면 입력칸이 갈아끼워져 커서가 날아간다 →
       저장만 하고 줄머리 금액·색·머리글 글자만 그 자리에서 맞춘다 */
    function 펼침(g, 머리맞추기) {
      var 값 = 손에든값(g);
      var 합계칸 = 만들기('span', { class: 'hint2' });
      var 밑줄 = 만들기('div', { class: 'sumline' });
      var 단가칸 = 만들기('input', {
        class: 'inp num', type: 'text', inputmode: 'numeric',
        value: 값.단가 ? 돈(값.단가) : '', maxlength: '9'
      });
      /* 볼 때는 콤마, 칠 때는 숫자만 — 치는 도중 값을 갈아 끼우면 커서가 튄다 */
      /* 🔴 들어가면 기존 값을 통째로 고른다 — 돈이 걸린 칸이라 「3300」 뒤에 이어 쳐서
         「33002750」이 되면 안 된다. focus 직후 브라우저가 커서를 다시 잡는 일이 있어 한 박자 늦춘다 */
      단가칸.addEventListener('focus', function () {
        단가칸.value = 값.단가;
        단가칸.select();
        setTimeout(function () { if (document.activeElement === 단가칸) 단가칸.select(); }, 0);
      });
      단가칸.addEventListener('blur', function () { 단가칸.value = 값.단가 ? 돈(값.단가) : ''; });
      var 박스칸 = 만들기('span', { class: 'n', text: String(값.박스수) });

      function 합계글() {
        var 단 = Number(값.단가) || 0;
        if (!단) { 합계칸.textContent = '단가를 넣어 주세요'; 밑줄.textContent = ''; return; }
        var 합 = 단 * 값.박스수;
        합계칸.textContent = 돈(단) + '원 × ' + 값.박스수 + '박스 = ' + 돈(합) + '원';
        밑줄.textContent = 값.박스수 > 1
          ? 돈(단) + '원짜리 송장 ' + 값.박스수 + '장으로 나갑니다 (이름 뒤에 번호가 붙습니다)'
          : '이 ' + 돈(단) + '원이 로젠 J열에 들어갑니다';
      }

      /* 🔴 값이 바뀌어도 다시 그리지 않는다 — 그 자리에서 글자만 갈아 끼운다 */
      단가칸.addEventListener('input', function () {
        var s = 단가칸.value.replace(/[^\d]/g, '');
        if (s !== 단가칸.value) 단가칸.value = s;
        값.단가 = s;
        세그맞추기();
        합계글();
        조용히저장();
      });
      단가칸.addEventListener('keydown', function (e) { if (e.key === 'Enter') 단가칸.blur(); });

      var 세그 = 만들기('div', { class: 'seg tight' });
      var 버튼들 = [];
      ['2750', '3300', ''].forEach(function (v) {
        var b = 만들기('button', { type: 'button', text: v ? 돈(v) : '직접' });
        b.addEventListener('click', function (e) {
          e.stopPropagation();
          if (v) { 값.단가 = v; 단가칸.value = 돈(v); }
          else 단가칸.focus();
          세그맞추기(); 합계글();
          if (v) 조용히저장();
        });
        버튼들.push({ v: v, b: b });
        세그.appendChild(b);
      });
      function 세그맞추기() {
        버튼들.forEach(function (x) {
          var 켬 = x.v ? (값.단가 === x.v) : (값.단가 !== '2750' && 값.단가 !== '3300');
          x.b.className = 켬 ? 'on' : '';
        });
      }
      세그맞추기(); 합계글();

      function 박스바꾸기(d) {
        값.박스수 = Math.min(9, Math.max(1, 값.박스수 + d));
        박스칸.textContent = String(값.박스수);
        합계글();
        조용히저장();
      }

      /* 단가가 비었으면 저장하지 않는다 — 지우고 다시 치는 중이다 */
      function 조용히저장() {
        var 단 = Number(값.단가) || 0;
        if (!단) return;
        ZG.운임손질.저장(옵션.묶음id, g.키, g.차수 || 1, {
          단가: 단, 박스수: 값.박스수,
          수령인: 글(g.것들[0].줄.수령인), 자동값: g.자동값
        });
        준비 = 옵션.준비하기();
        if (머리글칸) 머리글칸.textContent = 머리글();
        if (옵션.바뀌면) 옵션.바뀌면(준비);
        머리맞추기(단, 값.박스수);
      }

      function 되돌리기() {
        ZG.운임손질.지우기(옵션.묶음id, g.키, g.차수 || 1);
        delete 편집[줄키(g)];
        다시();
      }

      function 한건더() {
        var 차 = ZG.운임손질.다음차수(옵션.묶음id, g.키);
        ZG.운임손질.저장(옵션.묶음id, g.키, 차, {
          단가: g.자동값 === '확인요망' ? 0 : Number(g.자동값),
          박스수: 1, 수령인: 글(g.것들[0].줄.수령인), 자동값: g.자동값
        });
        u.토스트(차 + '번 송장을 만들었습니다 — 단가·박스수는 따로 정하시면 됩니다.');
        다시();
      }

      function 없애기() {
        ZG.운임손질.지우기(옵션.묶음id, g.키, g.차수);
        delete 편집[줄키(g)];
        다시();
      }

      var 줄들 = [
        만들기('div', { class: 'erow' }, [
          만들기('span', { class: 'lb', text: '택배 단가' }), 세그,
          만들기('div', { class: 'wonbox' }, [단가칸, 만들기('span', { class: 'won', text: '원' })]),
          만들기('span', { class: 'hint2', text: '박스 1개 값입니다' })
        ]),
        만들기('div', { class: 'erow' }, [
          만들기('span', { class: 'lb', text: '박스 수량' }),
          만들기('div', { class: 'qty' }, [
            셈단추('−', function () { 박스바꾸기(-1); }), 박스칸, 셈단추('＋', function () { 박스바꾸기(1); })
          ])
        ]),
        만들기('div', { class: 'erow' }, [
          만들기('span', { class: 'lb', text: '합계' }),
          만들기('div', {}, [합계칸, 밑줄])
        ])
      ];

      if (!g.추가) {
        줄들.push(만들기('div', { class: 'erow' }, [
          만들기('span', { class: 'lb', text: '송장' }),
          단추('＋ 같은 수령인으로 송장 한 장 더 만들기', 한건더, 'sm'),
          단추('품목을 나눠 담기', function () { u.토스트('다음에 만듭니다.'); }, 'sm')
        ]));
      }

      var 바 = [만들기('span', { class: 'spacer' })];
      if (g.추가) 바.push(단추('이 송장 없애기', 없애기, 'sm'));
      else if (g.손댐) 바.push(단추('자동값으로 되돌리기', 되돌리기, 'sm'));
      if (바.length > 1) 줄들.push(만들기('div', { class: 'ebar' }, 바));

      var 것 = 만들기('div', { class: 'gedit' }, 줄들);
      것.addEventListener('click', function (e) { e.stopPropagation(); });
      return 것;
    }

    /* ── 묶음 한 줄 (§5-2 색이 곧 상태다) ── */

    function 줄(g) {
      var k = 줄키(g);
      var 열림 = 열린 === k;
      var 색 = g.단가 === '확인요망' ? ' ng' : (g.손댐 ? ' edited' : '');
      var 것 = 만들기('div', { class: 'grp' + 색 + (g.추가 ? ' plus' : '') + (열림 ? ' open' : '') });

      var 값칸 = 만들기('div', { class: 'val fee' });
      function 값쓰기(운임, 단, 박스) {
        값칸.textContent = 돈(운임);
        if (박스 > 1) 값칸.appendChild(만들기('span', { class: 'cap2', text: 돈(단) + ' × ' + 박스 }));
      }
      if (g.운임 === '확인요망') 값칸.textContent = '확인요망';
      else 값쓰기(g.운임, g.단가, g.박스수);
      function 머리맞추기(단, 박스) {
        값쓰기(단 * 박스, 단, 박스);
        것.classList.remove('ng');
        것.classList.add('edited');
      }

      var 고름 = 만들기('button', {
        class: 'cb' + (고른[k] ? ' on' : ''), type: 'button', 'aria-label': 글(g.것들[0].줄.수령인) + ' 고르기'
      });
      고름.addEventListener('click', function (e) {
        e.stopPropagation();
        if (고른[k]) delete 고른[k]; else 고른[k] = true;
        u.비우기(틀); 틀.appendChild(그리기());
      });

      var 누구 = g.추가
        ? 만들기('div', { class: 'who' }, [
            만들기('span', { text: 글(g.것들[0].줄.수령인) || '(이름 없음)' }),
            만들기('div', { class: 'sub', text: g.차수 + '번 송장' })
          ])
        : 만들기('div', { class: 'who' }, [
            만들기('span', { text: 글(g.것들[0].줄.수령인) || '(이름 없음)' }),
            만들기('div', { class: 'sub', text: 주소줄(g) })
          ]);

      var 줄머리 = 만들기('div', { class: 'gline' }, [
        고름,
        /* 한 손님 상자가 여럿이면 1-1·1-2 (08i.번호글과 같은 규칙). 저장값은 정수 그대로다 */
        만들기('span', {
          class: 'no' + (g.분번 ? ' split' : ''),
          text: g.분번 ? g.출력번호 + '-' + g.분번 : String(g.출력번호)
        }),
        누구,
        만들기('div', { class: 'items', text: g.추가 ? '별도 송장' : 품목글(g) }),
        값칸,
        만들기('span', { class: 'chev', text: 열림 ? '⌄' : '›' })
      ]);
      줄머리.addEventListener('click', function () {
        열린 = 열림 ? null : k;
        u.비우기(틀); 틀.appendChild(그리기());
      });
      것.appendChild(줄머리);
      if (열림) 것.appendChild(펼침(g, 머리맞추기));
      return 것;
    }

    /* ── 상자 ── */

    var 다보기 = false;

    function 그리기() {
      var 그룹들 = 준비.그룹들;
      var 보임 = 다보기 ? 그룹들 : 그룹들.slice(0, 앞몇줄);
      /* 펼쳐 둔 줄은 접힌 뒤쪽에 있어도 보여야 한다 */
      if (!다보기 && 열린) {
        그룹들.forEach(function (g) {
          if (줄키(g) === 열린 && 보임.indexOf(g) < 0) 보임 = 보임.concat([g]);
        });
      }
      var 속 = 보임.map(줄);
      var 고른수 = 그룹들.filter(function (g) { return 고른[줄키(g)]; }).length;
      if (고른수) 속.unshift(한꺼번에줄(고른수));
      var 남 = 그룹들.length - 보임.length;
      if (남 > 0) {
        속.push(만들기('div', { class: 'allrow' }, [
          만들기('span', { class: 'l', text: '나머지 ' + 남 + '묶음 —' }),
          단추('더 보기', function () { 다보기 = true; u.비우기(틀); 틀.appendChild(그리기()); }, 'sm')
        ]));
      }
      /* 모두 고르기는 「더 보기」로 접힌 묶음까지 고른다 */
      var 다켬 = 그룹들.length > 0 && 그룹들.every(function (g) { return 고른[줄키(g)]; });
      var 모두 = 만들기('button', { class: 'cb' + (다켬 ? ' on' : ''), type: 'button', 'aria-label': '모두 고르기' });
      모두.addEventListener('click', function () {
        그룹들.forEach(function (g) { if (다켬) delete 고른[줄키(g)]; else 고른[줄키(g)] = true; });
        u.비우기(틀); 틀.appendChild(그리기());
      });
      머리글칸 = 만들기('span', { text: 머리글() });
      return 만들기('div', { class: 'needbox', style: 'border-color:var(--color-border)' }, [
        만들기('h4', { style: 'background:var(--color-seg-bg); color:var(--color-text-sub); border-bottom-color:var(--color-border)' }, [
          만들기('span', { style: 'display:flex; align-items:center; gap:var(--space-md)' }, [모두, 머리글칸]),
          만들기('span', { class: 'why', text: '포장하는 순서 그대로입니다 — 동봉카드 번호와 같습니다' })
        ]),
        만들기('div', { class: 'inner' }, 속)
      ]);
    }

    /* 고른 게 있을 때만 뜬다 — 2,750·3,300 은 누르는 즉시, 직접은 엔터나 「넣기」 */
    function 한꺼번에줄(수) {
      var 칸 = 만들기('input', { class: 'inp num', type: 'text', inputmode: 'numeric', maxlength: '9', placeholder: '직접' });
      칸.addEventListener('input', function () { 칸.value = 칸.value.replace(/[^\d]/g, ''); });
      칸.addEventListener('keydown', function (e) { if (e.key === 'Enter') 한꺼번에(Number(칸.value) || 0); });
      var 세그 = 만들기('div', { class: 'seg tight' });
      ['2750', '3300'].forEach(function (v) {
        var b = 만들기('button', { type: 'button', text: 돈(v) });
        b.addEventListener('click', function () { 한꺼번에(Number(v)); });
        세그.appendChild(b);
      });
      return 만들기('div', {
        class: 'erow',
        style: 'padding:var(--space-md) var(--space-lg); margin-bottom:var(--space-md); border:var(--border-width) solid var(--color-accent-border); background:var(--color-accent-bg); border-radius:var(--radius-sm)'
      }, [
        만들기('span', { class: 'lb', text: '고른 ' + 수 + '묶음' }), 세그,
        만들기('div', { class: 'wonbox' }, [칸, 만들기('span', { class: 'won', text: '원' })]),
        단추('넣기', function () { 한꺼번에(Number(칸.value) || 0); }, 'sm main'),
        단추('고르기 풀기', function () { 고른 = {}; u.비우기(틀); 틀.appendChild(그리기()); }, 'sm')
      ]);
    }

    준비 = 옵션.준비하기();
    틀.appendChild(그리기());
    return 틀;
  }

  ZG.운임손질창 = { 상자: 상자 };
})(window.ZG);
