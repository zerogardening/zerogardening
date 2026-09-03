/* 16b-고객PC — PC 고객 명부 · 상세 · 등록 시트 (11단계 설계 §4 · 세부설계 §2)
   틀은 15b-견적PC 와 같다. 상태를 갖고, 그리기(칸) 하나를 내보내고, 다시 그릴 때 ZG.주문.다시그리기() 를 부른다.
   🔴 고객 표를 따로 두지 않는다 — 숫자는 전부 16a 가 주문에서 뽑아 준다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기, 자 = null;
  var 쪽크기 = 20;
  var 상태 = {
    글: '', 부터: '', 까지: '', 최소주문: 0, 최소문자: 0, 판매처: '', 손등록만: false,
    쪽: 1, 고른: {}, 뷰: '목록', 키: '', 번쩍키: '', 폼: null
  };
  var 채우기 = function () {};

  function 다시() { ZG.주문.다시그리기(); }
  function 조건() {
    return {
      글: 상태.글, 부터: 상태.부터, 까지: 상태.까지,
      최소주문: 상태.최소주문, 최소문자: 상태.최소문자,
      판매처: 상태.판매처, 손등록만: 상태.손등록만
    };
  }
  function 고른키들(것들) {
    return 것들.filter(function (g) { return 상태.고른[g.키]; }).map(function (g) { return g.키; });
  }

  /* ── 통계 5칸 — 🔴 필터와 무관하게 전체 기준 (세부설계 §2-1) ── */
  function 통계채우기(칸) {
    u.비우기(칸);
    var 셈 = 자.요약(자.목록({}));
    [
      ['고객', 셈.인원 + '명'],
      ['주문', 셈.주문 + '건'],
      ['합계', u.콤마(셈.합계) + '원'],
      ['손등록 (주문 0건)', 셈.손등록 + '명'],
      ['⚠ 안심번호 (문자 안 감)', 셈.안심 + '명']
    ].forEach(function (쌍) {
      칸.appendChild(만들기('div', {}, [
        만들기('div', { class: 'k', text: 쌍[0] }),
        만들기('div', { class: 'v', text: 쌍[1] })
      ]));
    });
  }

  /* ── 필터줄 ── */
  function 검색줄() {
    var 검색 = 만들기('input', { class: 'inp grow', placeholder: '🔍 이름 · 전화 · 주소 검색…' });
    검색.value = 상태.글;
    u.조합안전입력(검색, function (값) { 상태.글 = 값; 상태.쪽 = 1; 채우기(); });

    function 날칸(이름, 안내) {
      var i = 만들기('input', { class: 'inp num', type: 'date', style: 'width:150px', 'aria-label': 안내 });
      i.value = 상태[이름] || '';
      i.addEventListener('change', function () { 상태[이름] = i.value; 상태.쪽 = 1; 채우기(); });
      return i;
    }

    function 셈고르개(이름, 값들, 폭, 안내) {
      var s = 만들기('select', { class: 'inp', style: 'width:' + 폭, 'aria-label': 안내 });
      값들.forEach(function (쌍) { s.appendChild(만들기('option', { value: 쌍[0], text: 쌍[1] })); });
      s.value = String(상태[이름] || '');
      s.addEventListener('change', function () { 상태[이름] = s.value; 상태.쪽 = 1; 채우기(); });
      return s;
    }

    var 주문고르개 = 셈고르개('최소주문',
      [['', '주문 전체'], ['1', '1회 이상'], ['2', '2회 이상'], ['3', '3회 이상'], ['5', '5회 이상']],
      '116px', '최소 주문 횟수');
    var 문자고르개 = 셈고르개('최소문자',
      [['', '문자 전체'], ['1', '1회 이상'], ['2', '2회 이상'], ['3', '3회 이상']],
      '116px', '최소 문자 횟수');

    // 🔴 판매처 값은 데이터에서 뽑는다 — 코드에 박으면 심폴·새 판매처가 안 나온다 (세부설계 §1-5)
    var 판매처 = 만들기('select', { class: 'inp', style: 'width:130px', 'aria-label': '판매처' });
    [['', '전체 판매처']].concat(자.판매처목록().map(function (v) { return [v, v]; }))
      .forEach(function (쌍) { 판매처.appendChild(만들기('option', { value: 쌍[0], text: 쌍[1] })); });
    판매처.value = 상태.판매처;
    판매처.addEventListener('change', function () { 상태.판매처 = 판매처.value; 상태.쪽 = 1; 채우기(); });

    var 손칩 = 만들기('button', {
      type: 'button', class: 상태.손등록만 ? 'on' : '', text: '손등록만',
      'aria-pressed': 상태.손등록만 ? 'true' : 'false'
    });
    손칩.addEventListener('click', function () {
      상태.손등록만 = !상태.손등록만; 상태.쪽 = 1; 채우기();
    });

    var 초기화 = 만들기('button', { class: 'btn', type: 'button', text: '↺ 초기화' });
    초기화.addEventListener('click', function () {
      상태.글 = ''; 상태.부터 = ''; 상태.까지 = '';
      상태.최소주문 = 0; 상태.최소문자 = 0; 상태.판매처 = ''; 상태.손등록만 = false;
      상태.쪽 = 1;
      다시();
    });

    return 만들기('div', { class: 'sbar', style: 'padding:0 var(--space-sm) var(--space-lg)' }, [
      검색,
      날칸('부터', '기간 시작'),
      만들기('span', { class: 'sep', text: '~' }),
      날칸('까지', '기간 끝'),
      주문고르개, 문자고르개, 판매처,
      만들기('div', { class: 'fchips' }, [손칩]),
      초기화
    ]);
  }

  /* ── 고르기 — 🔴 08b:882 의 .cb 버튼 패턴을 쓴다. input[type=checkbox] 를 새로 들이지 않는다 ── */
  function 고름칸(g) {
    var b = 만들기('button', {
      class: 'cb' + (상태.고른[g.키] ? ' on' : ''), type: 'button',
      'aria-pressed': 상태.고른[g.키] ? 'true' : 'false',
      'aria-label': (g.이름 || '') + ' 고르기'
    });
    b.addEventListener('click', function () {
      if (상태.고른[g.키]) delete 상태.고른[g.키]; else 상태.고른[g.키] = true;
      채우기();
    });
    return b;
  }

  /* 🔴 지금 쪽이 아니라 지금 필터 결과 전부를 고른다 (세부설계 §2-1) */
  function 모두고름칸(것들) {
    var 다켬 = 것들.length > 0 && 것들.every(function (g) { return 상태.고른[g.키]; });
    var b = 만들기('button', {
      class: 'cb' + (다켬 ? ' on' : ''), type: 'button', 'aria-label': '거른 고객 모두 고르기'
    });
    b.addEventListener('click', function () {
      것들.forEach(function (g) { if (다켬) delete 상태.고른[g.키]; else 상태.고른[g.키] = true; });
      채우기();
    });
    return b;
  }

  /* ── 표 ── */
  function 표그리기(쪽것들, 전체것들) {
    var t = 만들기('table');
    var 열 = 만들기('colgroup');
    ['28px', '150px', '132px', '', '58px', '58px', '104px', '100px', '120px', '76px'].forEach(function (w) {
      열.appendChild(만들기('col', w ? { style: 'width:' + w } : {}));
    });
    t.appendChild(열);

    var 머리 = 만들기('tr');
    머리.appendChild(만들기('th', {}, [모두고름칸(전체것들)]));
    ['이름', '연락처', '주소', '주문', '문자', '최근주문', '합계', '판매처', ''].forEach(function (글) {
      머리.appendChild(만들기('th', { text: 글 }));
    });
    t.appendChild(머리);

    쪽것들.forEach(function (g) { t.appendChild(줄(g)); });
    return t;
  }

  function 줄(g) {
    var tr = 만들기('tr', { class: 상태.고른[g.키] ? 'picked' : '' });
    tr.appendChild(만들기('td', {}, [고름칸(g)]));

    var 이름칸 = 만들기('td', {}, [만들기('b', { text: g.이름 || '' })]);
    if (g.손등록) 이름칸.appendChild(만들기('div', { class: 'hand', text: '손등록' }));
    tr.appendChild(이름칸);

    var 전화칸 = 만들기('td', { class: 'tel' }, [만들기('span', { text: g.전화 || '' })]);
    if (g.안심) 전화칸.appendChild(만들기('div', { class: 'safe', text: '⚠ 안심번호' }));
    tr.appendChild(전화칸);

    tr.appendChild(만들기('td', { class: 'addr', text: g.주소 || '' }));
    tr.appendChild(만들기('td', { class: 'cnt' + (g.주문수 ? '' : ' none'), text: String(g.주문수) }));
    tr.appendChild(만들기('td', { class: 'cnt' + (g.문자수 ? '' : ' none'), text: String(g.문자수) }));

    var 날칸 = 만들기('td', { class: 'day' });
    if (g.최근주문) 날칸.textContent = g.최근주문;
    else 날칸.appendChild(만들기('span', { class: 'dash', text: '—' }));
    tr.appendChild(날칸);

    var 돈칸 = 만들기('td', { class: 'won' });
    if (g.합계) 돈칸.textContent = u.콤마(g.합계);
    else 돈칸.appendChild(만들기('span', { class: 'dash', text: '—' }));
    tr.appendChild(돈칸);

    var 처칸 = 만들기('td');
    if (g.판매처들.length) {
      처칸.appendChild(만들기('span', { class: 'mall', text: g.판매처들[0] }));
      if (g.판매처들.length > 1) {
        처칸.appendChild(만들기('span', { class: 'mall plus', text: '외 ' + (g.판매처들.length - 1) }));
      }
    } else {
      처칸.appendChild(만들기('span', { class: 'dash', text: '—' }));
    }
    tr.appendChild(처칸);

    var 상세 = 만들기('button', { class: 'btn sm', type: 'button', text: '상세' });
    상세.addEventListener('click', function () { 상태.키 = g.키; 상태.뷰 = '상세'; 다시(); });
    tr.appendChild(만들기('td', {}, [상세]));

    if (상태.번쩍키 === g.키) { 상태.번쩍키 = ''; requestAnimationFrame(function () { u.번쩍(tr); }); }
    return tr;
  }

  function 쪽줄(총쪽) {
    var 줄칸 = 만들기('div', { class: 'pager' });
    function 단추(글, 쪽, 막힘) {
      var b = 만들기('button', { type: 'button', text: 글, disabled: 막힘 ? 'disabled' : null });
      b.addEventListener('click', function () { 상태.쪽 = 쪽; 채우기(); });
      return b;
    }
    줄칸.appendChild(단추('‹', Math.max(1, 상태.쪽 - 1), 상태.쪽 <= 1));
    for (var i = 1; i <= 총쪽; i++) {
      if (i === 상태.쪽) 줄칸.appendChild(만들기('b', { text: String(i) }));
      else 줄칸.appendChild(단추(String(i), i, false));
    }
    줄칸.appendChild(단추('›', Math.min(총쪽, 상태.쪽 + 1), 상태.쪽 >= 총쪽));
    return 줄칸;
  }

  /* ── 목록 뷰 ── */
  function 목록그리기(칸) {
    var 통계 = 만들기('div', { class: 'stat' });
    칸.appendChild(통계);

    var 제목 = 만들기('h3', { style: 'padding:0 var(--space-sm)' });
    var 몸 = 만들기('div');
    var 표카드 = 만들기('div', { class: 'card table-card' }, [제목]);
    표카드.appendChild(검색줄());
    표카드.appendChild(몸);
    칸.appendChild(표카드);

    채우기 = function () {
      통계채우기(통계);
      u.비우기(몸);

      var 것들 = 자.목록(조건());
      var 셈 = 자.요약(것들);
      var 고름 = 고른키들(것들);

      u.비우기(제목);
      제목.appendChild(만들기('span', { text: '고객 명부 ' }));
      제목.appendChild(만들기('span', {
        class: 'hint',
        html: 셈.인원 + '명 · 주문 ' + 셈.주문 + '건 · 합계 ' + u.콤마(셈.합계) + '원 — 주문에서 자동으로 뽑습니다' +
              (고름.length ? ' · <b>고른 ' + 고름.length + '명</b>' : '')
      }));
      제목.appendChild(머리버튼들(것들, 고름));

      var 총쪽 = Math.max(1, Math.ceil(것들.length / 쪽크기));
      if (상태.쪽 > 총쪽) 상태.쪽 = 총쪽;

      if (!것들.length) {
        몸.appendChild(만들기('div', {
          class: 'empty',
          text: 걸러진가() ? '찾는 고객이 없습니다' : '아직 주문도 손등록 고객도 없습니다'
        }));
        return;
      }
      몸.appendChild(표그리기(것들.slice((상태.쪽 - 1) * 쪽크기, 상태.쪽 * 쪽크기), 것들));
      몸.appendChild(쪽줄(총쪽));
    };
    채우기();
  }

  function 걸러진가() {
    return !!(상태.글 || 상태.부터 || 상태.까지 || 상태.최소주문 ||
              상태.최소문자 || 상태.판매처 || 상태.손등록만);
  }

  function 머리버튼들(것들, 고름) {
    var 엑셀 = 만들기('button', { class: 'btn sm', type: 'button', text: '⬇ 엑셀' });
    엑셀.addEventListener('click', function () { 엑셀내려받기(것들); });

    var 문자 = 만들기('button', { class: 'btn sm', type: 'button', text: '✉ 문자 기록' });
    if (!고름.length) {
      // 고른 사람이 없으면 창을 안 연다 — 08b:911 서비스 버튼과 같은 처리 (세부설계 §2-1)
      문자.setAttribute('aria-disabled', 'true');
      문자.style.opacity = '.4';
      문자.addEventListener('click', function () { u.토스트('문자를 적어 둘 고객을 먼저 골라 주세요.'); });
    } else {
      문자.addEventListener('click', function () { ZG.문자창.열기(고름, 채우기); });
    }

    var 등록 = 만들기('button', { class: 'btn sm main', type: 'button', text: '＋ 고객 등록' });
    등록.addEventListener('click', function () { 등록시트(); });

    return 만들기('span', { class: 'right' }, [엑셀, 문자, 등록]);
  }

  /* ── 상세 뷰 (세부설계 §2-2) ── */
  function 상세그리기(칸) {
    var g = 상태.키 ? 자.하나(상태.키) : null;
    if (!g) { 목록으로(); return; }

    var 통계 = 만들기('div', { class: 'stat' });
    [
      ['주문', g.주문수 + '건'],
      ['합계', u.콤마(g.합계) + '원'],
      ['첫 주문', g.첫주문 || '—'],
      ['최근 주문', g.최근주문 || '—']
    ].forEach(function (쌍) {
      통계.appendChild(만들기('div', {}, [
        만들기('div', { class: 'k', text: 쌍[0] }),
        만들기('div', { class: 'v', text: 쌍[1] })
      ]));
    });
    칸.appendChild(통계);

    칸.appendChild(만들기('div', { class: 'dgrid' }, [
      만들기('div', {}, [정보카드(g), 메모카드(g), 문자카드(g)]),
      주문카드(g)
    ]));
  }

  function 목록으로() { 상태.뷰 = '목록'; 상태.키 = ''; 다시(); }

  function 정보카드(g) {
    var 뒤로 = 만들기('button', { class: 'btn sm', type: 'button', text: '‹ 목록' });
    뒤로.addEventListener('click', 목록으로);

    var 표 = 만들기('div', { class: 'box' });
    function 줄넣기(k, v, 덧) {
      var 값칸 = 만들기('span', { class: 'v' }, [만들기('span', { text: v || '—' })]);
      if (덧) 값칸.appendChild(덧);
      표.appendChild(만들기('div', { class: 'kv' }, [만들기('span', { class: 'k', text: k }), 값칸]));
    }
    줄넣기('이름', g.이름);
    줄넣기('연락처', g.전화, g.안심 ? 만들기('div', { class: 'safe', text: '⚠ 안심번호 — 문자가 안 갑니다' }) : null);
    줄넣기('우편번호', g.우편번호);
    줄넣기('주소', g.주소);
    줄넣기('판매처', g.판매처들.join(' · '));
    if (g.손등록) 줄넣기('구분', '손등록 (주문 0건)');

    var 견적 = 만들기('button', { class: 'btn', type: 'button', text: '📝 견적요청 만들기' });
    견적.addEventListener('click', function () { 견적만들기(g); });
    var 주문 = 만들기('button', { class: 'btn', type: 'button', text: '🛒 수동주문 넣기' });
    주문.addEventListener('click', function () { 수동주문(g); });

    return 만들기('div', { class: 'card' }, [
      만들기('h3', {}, [
        만들기('span', { text: '고객 정보' }),
        만들기('span', { class: 'right' }, [뒤로])
      ]),
      표,
      만들기('div', { class: 'actrow' }, [견적, 주문])
    ]);
  }

  /* 🔴 날짜 카드 목록. 오래된 것이 위, 새 것이 아래 (확정 설계 §3-2) */
  function 메모카드(g) {
    var 몸 = 만들기('div');
    (g.메모들 || []).forEach(function (m, i) {
      var 지움 = 만들기('button', {
        class: 'btn sm del', type: 'button', text: '🗑', 'aria-label': m.날 + ' 메모 지우기'
      });
      지움.addEventListener('click', function () { 메모지우기(g, m, i); });
      몸.appendChild(만들기('div', { class: 'kv' }, [
        만들기('span', { class: 'k', text: m.날 || '' }),
        만들기('span', { class: 'v', text: m.글 || '' }),
        지움
      ]));
    });
    if (!(g.메모들 || []).length) {
      몸.appendChild(만들기('div', { class: 'empty', text: '아직 적어 둔 메모가 없습니다' }));
    }

    var 적는칸 = 만들기('textarea', {
      class: 'inp ta', rows: '3', placeholder: '오늘 나눈 이야기를 적으시면 날짜가 저절로 붙습니다'
    });
    var 저장 = 만들기('button', { class: 'btn main wide', type: 'button', text: '💾 메모 저장' });
    저장.addEventListener('click', function () {
      var 글 = 적는칸.value.trim();
      if (!글) { u.흔들기(적는칸); u.토스트('메모를 적어 주세요'); 적는칸.focus(); return; }
      자.메모추가(g, 글);
      u.토스트('메모를 적었습니다');
      다시();   // 오늘 날짜 카드가 맨 아래에 생기고 칸이 비워진다
    });

    return 만들기('div', { class: 'card' }, [
      만들기('h3', {}, [
        만들기('span', { text: '메모 ' }),
      ]),
      만들기('div', { class: 'box' }, [몸]),
      만들기('div', { class: 'field', style: 'margin-top:var(--space-md)' }, [적는칸]),
      만들기('div', { class: 'formfoot' }, [저장])
    ]);
  }

  function 메모지우기(g, m, i) {
    u.확인({
      제목: '이 메모를 지울까요?',
      본문: u.안전(m.날 || '') + ' · ' + u.안전(String(m.글 || '').slice(0, 40)) +
            '<br><b>되돌릴 수 없습니다.</b>',
      확인글: '삭제', 위험: true
    }, function (예) {
      if (!예) return;
      자.메모삭제(g, i);
      u.토스트('메모를 지웠습니다');
      다시();   // 🔴 지운 뒤 반드시 다시 그린다 (세부설계 §1-7)
    });
  }

  function 문자카드(g) {
    var 몸 = 만들기('div', { class: 'box' });
    if (!(g.문자들 || []).length) {
      몸.appendChild(만들기('div', { class: 'empty', text: '아직 보낸 문자가 없습니다' }));
    } else {
      g.문자들.forEach(function (m) {
        몸.appendChild(만들기('div', { class: 'kv' }, [
          만들기('span', { class: 'k', text: m.보낸날 || '' }),
          만들기('span', { class: 'v memo', text: m.내용 || '' })
        ]));
      });
    }
    return 만들기('div', { class: 'card' }, [
      만들기('h3', {}, [
        만들기('span', { text: '받은 문자 ' }),
        만들기('span', { class: 'hint', text: g.문자수 + '회' })
      ]),
      몸
    ]);
  }

  function 주문카드(g) {
    var 줄들 = 자.주문줄들(g.키);
    var 제목 = 만들기('h3', {}, [만들기('span', { text: '주문 내역' })]);
    var 엑셀 = 만들기('button', { class: 'btn sm', type: 'button', text: '⬇ 엑셀' });
    엑셀.addEventListener('click', function () { 엑셀내려받기([g]); });
    제목.appendChild(만들기('span', { class: 'right' }, [엑셀]));

    var 카드 = 만들기('div', { class: 'card table-card' }, [제목]);
    if (!줄들.length) {
      카드.appendChild(만들기('div', { class: 'empty', text: '아직 주문이 없습니다' }));
      return 카드;
    }

    var t = 만들기('table');
    var 열 = 만들기('colgroup');
    ['104px', '110px', '', '62px', '100px', '110px'].forEach(function (w) {
      열.appendChild(만들기('col', w ? { style: 'width:' + w } : {}));
    });
    t.appendChild(열);
    t.appendChild(만들기('tr', {}, ['날짜', '품목코드', '품목', '수량', '금액', '판매처'].map(function (글) {
      return 만들기('th', { text: 글 });
    })));

    줄들.forEach(function (r) {
      t.appendChild(만들기('tr', {}, [
        만들기('td', { class: 'day', text: r.주문일 || '' }),
        만들기('td', { text: r.품목코드 || r.원본코드 || '' }),
        만들기('td', { text: (r.유통명 || '') + (r.규격 ? ' ' + r.규격 : '') }),
        만들기('td', { class: 'cnt', text: String(ZG.주문자료.수량(r)) }),
        만들기('td', { class: 'won', text: u.콤마(ZG.주문자료.금액(r)) }),
        만들기('td', {}, [만들기('span', { class: 'mall', text: r.판매처 || '' })])
      ]));
    });

    var 끝 = 만들기('tr', { class: 'sum' }, [
      만들기('td', { text: '합계' }),
      만들기('td', {}), 만들기('td', {}),
      만들기('td', { class: 'cnt', text: String(줄들.reduce(function (a, r) { return a + ZG.주문자료.수량(r); }, 0)) }),
      만들기('td', { class: 'won', text: u.콤마(g.합계) }),
      만들기('td', {})
    ]);
    t.appendChild(끝);

    카드.appendChild(t);
    return 카드;
  }

  /* ── 두 버튼이 가는 곳 (세부설계 §2-4) ── */
  function 견적만들기(g) {
    u.물음({
      제목: '견적 요청 만들기',
      본문: u.안전(g.이름 || '') + (g.전화 ? ' · ' + u.안전(g.전화) : ''),
      자리표시: '예: 라벤더 20주 견적', 최대: 80, 확인글: '만들기'
    }, function (글) {
      if (!글) return;
      ZG.견적자료.추가({ 요청일: u.오늘문자(), 고객명: g.이름, 연락처: g.전화, 내용: 글 });
      u.토스트('견적 요청 탭에 넣었습니다');
      ZG.견적탭.탭으로('견적');
    });
  }

  /* 08b 를 고치지 않는다 — 채울값만 얹고 수동주문 화면을 연다 (확정 설계 §7) */
  function 수동주문(g) {
    ZG.주문.상태.채울값 = { 수령인: g.이름, 전화: g.전화, 주소: g.주소, 우편번호: g.우편번호 };
    ZG.주문.열기('수동');
  }

  /* ── 등록 시트 — 🔴 주문 화면이 이미 쓰는 .pcscrim + .pcsheet 를 그대로 쓴다 (세부설계 §2-3) ── */
  function 등록시트() {
    var 막 = null, 창 = null;
    function 닫기() {
      if (막) { 막.remove(); 막 = null; }
      if (창) { 창.remove(); 창 = null; }
      u.탈출풀기();
    }

    var 칸 = {};
    function 밭(이름, 라벨, 속성, 폭) {
      var i = 만들기('input', 속성);
      칸[이름] = i;
      return 만들기('div', { class: 'field', style: 폭 ? 'flex:0 0 ' + 폭 : null },
        [만들기('label', { html: 라벨 }), i]);
    }

    var 이름밭 = 밭('이름', '이름 <span class="req">*</span>', { class: 'inp', placeholder: '예: 홍길동' });
    var 전화밭 = 밭('전화', '연락처 <span class="req">*</span>', { class: 'inp', type: 'tel', placeholder: '010-0000-0000' });
    var 우편밭 = 밭('우편번호', '우편번호', { class: 'inp num', placeholder: '00000' }, '120px');
    var 주소밭 = 밭('주소', '주소', { class: 'inp', placeholder: '받으실 주소' });
    var 메모칸 = 만들기('textarea', { class: 'inp ta', rows: '4', placeholder: '기억해 둘 것을 적으시면 오늘 날짜로 남습니다' });

    function 저장하기() {
      var 값 = {
        이름: 칸.이름.value.trim(), 전화: 칸.전화.value.trim(),
        우편번호: 칸.우편번호.value.trim(), 주소: 칸.주소.value.trim(),
        메모: 메모칸.value.trim()
      };
      if (!값.이름) { u.흔들기(칸.이름); u.토스트('이름을 적어 주세요'); 칸.이름.focus(); return; }
      if (!값.전화) { u.흔들기(칸.전화); u.토스트('연락처를 적어 주세요'); 칸.전화.focus(); return; }
      var 결과 = 자.손등록추가(값);
      if (!결과) { u.흔들기(칸.이름); u.토스트('이미 있는 분입니다'); return; }
      상태.번쩍키 = 결과.id;
      u.토스트('고객을 등록했습니다');
      닫기();
      다시();
    }

    var 등록 = 만들기('button', { class: 'btn sm main', type: 'button', text: '＋ 등록' });
    등록.addEventListener('click', 저장하기);
    var 닫기버튼 = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '닫기' });
    닫기버튼.addEventListener('click', 닫기);

    막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', 닫기);

    창 = 만들기('div', { class: 'pcsheet', role: 'dialog', 'aria-modal': 'true' }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: '고객 등록' }),
        만들기('span', { class: 'right' }, [등록, 닫기버튼])
      ]),
      만들기('div', { class: 'bd' }, [
        이름밭, 전화밭,
        만들기('div', { class: 'pair' }, [우편밭, 주소밭]),
        만들기('div', { class: 'field' }, [만들기('label', { text: '메모' }), 메모칸]),
        만들기('div', {
          class: 'noteline',
          html: '나중에 <b>같은 이름·전화</b>로 주문이 들어오면 <b>한 줄로 합쳐집니다</b>.'
        })
      ])
    ]);

    document.body.appendChild(막);
    document.body.appendChild(창);
    u.탈출걸기(닫기);
    setTimeout(function () { 칸.이름.focus(); }, 20);
  }

  /* ── 엑셀 — 08d-주문파일.js:124 패턴 그대로. 공용 헬퍼를 만들지 않는다 (확정 설계 §8) ── */
  function 엑셀내려받기(것들) {
    /* 엑셀이 아직 안 왔으면 기다렸다 저 스스로 다시 불린다 (08d.준비되면) */
    if (!window.XLSX) { ZG.주문파일.준비되면(function () { 엑셀내려받기(것들); }); return; }
    if (!것들.length) { u.토스트('내려받을 고객이 없습니다'); return; }

    var 표 = [['이름', '연락처', '안심번호', '우편번호', '주소', '주문(건)', '문자(회)',
               '첫주문', '최근주문', '합계', '판매처', '손등록', '메모']];
    것들.forEach(function (g) {
      표.push([
        g.이름 || '', g.전화 || '', g.안심 ? 'Y' : '', g.우편번호 || '', g.주소 || '',
        g.주문수, g.문자수, g.첫주문 || '', g.최근주문 || '', g.합계,
        g.판매처들.join(' · '), g.손등록 ? 'Y' : '',
        (g.메모들 || []).map(function (m) { return (m.날 || '') + ' ' + (m.글 || ''); }).join(' / ')
      ]);
    });

    var 종이 = XLSX.utils.aoa_to_sheet(표);
    var 책 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(책, 종이, '고객');
    XLSX.writeFile(책, '고객_' + u.오늘문자() + '.xlsx');
    u.토스트(것들.length + '명을 내려받았습니다.');
  }

  /* ── 조립 ── */
  function 그리기(칸) {
    자 = ZG.고객자료;
    if (상태.뷰 === '상세') 상세그리기(칸);
    else 목록그리기(칸);
  }

  ZG.고객PC = { 그리기: 그리기, 상태: 상태 };
})(window.ZG);
