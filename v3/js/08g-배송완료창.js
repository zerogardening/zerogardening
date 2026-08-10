/* 08g-배송완료창 — 창 두 개 (6단계-4 설계 §7) · 시안 06-배송완료변환-macA.html 그대로
   ① 파일 고르기(520px) → ② 처리 결과(760px). PC 전용이다.
   자료는 전부 08f 가 만진다 — 여기서 `zg.v3.출고`를 직접 쓰지 않는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 상태 = null, 막 = null, 창 = null;
  var 참조 = {};          // 줄 단위로만 다시 그리려고 들고 있는 자리들

  function B() { return ZG.배송완료; }

  function 단추(글, 눌림, 반) {
    var b = 만들기('button', { class: 'btn' + (반 ? ' ' + 반 : ''), type: 'button', text: 글 });
    b.addEventListener('click', 눌림);
    return b;
  }

  function 오늘숫자() { return u.오늘문자().replace(/-/g, ''); }

  function 닫기() {
    u.탈출풀기();
    if (막) 막.remove();
    if (창) 창.remove();
    막 = 창 = null; 상태 = null; 참조 = {};
    if (ZG.주문 && ZG.주문.다시그리기) ZG.주문.다시그리기();   // 재고가 줄어 「재고부족」 표시가 따라간다
  }

  function 열기() {
    if (창) return;
    if (!ZG.주문파일.준비됐나()) return;
    상태 = { 단계: '고르기', 파일: null, 파일명: '', 총: 0, 무시: 0, 색인: null, 줄들: [], 되돌림: 0 };
    막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', 닫기);
    document.body.appendChild(막);
    그리기();
    u.탈출걸기(닫기);
  }

  function 껍데기(옵션) {
    var x = 단추('✕', 닫기, '');
    x.className = 'x'; x.setAttribute('aria-label', '닫기');
    var 것 = 만들기('div', {
      class: 'pcsheet dlv' + (옵션.좁게 ? ' narrow' : ''), role: 'dialog', 'aria-modal': 'true'
    }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: 옵션.제목 }),
        만들기('span', { class: 'hint', text: 옵션.힌트 || '' }),
        만들기('span', { class: 'right' }, [x])
      ]),
      만들기('div', { class: 'bd' }, 옵션.몸),
      만들기('div', { class: 'ft' }, 옵션.발)
    ]);
    if (창) 창.remove();
    창 = 것;
    document.body.appendChild(것);
  }

  function 그리기() {
    참조 = {};
    if (상태.단계 === '고르기') 고르기창(); else 결과창();
  }

  /* ══ ① 파일 고르기 ══ */

  function 파일받기(f, 흔들곳) {
    if (!/\.xlsx?$/i.test(f && f.name || '')) { u.흔들기(흔들곳 || 창); u.토스트('.xls · .xlsx 파일만 됩니다.'); return; }
    상태.파일 = f; 상태.파일명 = f.name;
    그리기();
  }

  function 고르기창() {
    var 고른칸;
    if (상태.파일) {
      고른칸 = 만들기('div', { class: 'fileline' }, [
        만들기('span', { class: 'ic', text: '📄' }),
        만들기('div', {}, [
          만들기('div', { class: 'nm', text: 상태.파일명 }),
          만들기('div', { class: 'sz', text: Math.max(1, Math.round(상태.파일.size / 1024)) + ' KB' })
        ]),
        단추('다시 고르기', 파일찾기, 'sm')
      ]);
    } else {
      고른칸 = 만들기('div', { class: 'drop' }, [
        만들기('span', { class: 'ic', text: '📄' }),
        만들기('div', { class: 't', text: '로젠 「출력완료」 파일을 고르세요' }),
        만들기('div', { class: 's', text: '여기로 끌어다 놓아도 됩니다 · .xls · .xlsx' }),
        단추('파일 고르기', 파일찾기)
      ]);
      고른칸.addEventListener('dragover', function (e) { e.preventDefault(); 고른칸.classList.add('over'); });
      고른칸.addEventListener('dragleave', function () { 고른칸.classList.remove('over'); });
      고른칸.addEventListener('drop', function (e) {
        e.preventDefault(); 고른칸.classList.remove('over');
        파일받기(e.dataTransfer.files && e.dataTransfer.files[0], 고른칸);
      });
    }

    var 처리버튼 = 단추('배송완료 처리', 처리, 'main');
    if (!상태.파일) { 처리버튼.disabled = true; 처리버튼.setAttribute('style', 'opacity:.45'); }

    껍데기({
      제목: '배송완료 처리', 힌트: '로젠 출력완료 파일', 좁게: true,
      몸: [
        고른칸,
        손처리줄()
      ],
      발: [만들기('span', { class: 'spacer' }), 단추('취소', 닫기), 처리버튼]
    });
  }

  function 파일찾기() { ZG.주문파일.파일고르기({ 확장자: '.xls,.xlsx' }, function (f) { 파일받기(f); }); }

  /* ══ ③ 로젠 파일 없이 — 고른 건만 손으로 (9단계 설계 §5-1) ══
     🔴 `ZG.주문.고른줄들()`을 쓰면 안 된다 — 아무것도 안 골랐을 때 화면 전체(최대 1,300건)로
        폴백한다(08b:518~522). 그 폴백으로 배송완료를 만들면 재고가 통째로 어긋난다.
        그래서 `상태.고른`으로 직접 센다 */
  function 고른건들() {
    var 상 = ZG.주문 && ZG.주문.상태;
    if (!상 || !상.고른) return [];
    return ZG.주문자료.건으로묶기(ZG.주문.줄들()).filter(function (g) { return 상.고른[g.묶음키]; });
  }

  function 손처리줄() {
    var 건들 = 고른건들();

    function 부르기(할일) {
      u.탈출풀기();                                   // 확인창이 뜨는 동안 Esc 주인을 넘긴다
      할일(건들, function (했나) {
        if (했나) 닫기(); else u.탈출걸기(닫기);
      });
    }

    var 넘김 = 단추('✋ 배송완료로 넘기기', function () { 부르기(ZG.수동배송완료.넘기기); }, 'sm');
    var 되돌 = 단추('↩ 배송완료 되돌리기', function () { 부르기(ZG.수동배송완료.되돌리기); }, 'sm warn');
    if (!건들.length) {
      넘김.disabled = 되돌.disabled = true;
      넘김.setAttribute('style', 'opacity:.45'); 되돌.setAttribute('style', 'opacity:.45');
    }

    return 만들기('div', { class: 'allrow' }, [
      만들기('span', { class: 'l', text: '또는, 로젠 파일 없이 —' }),
      만들기('span', { class: 'note', text: 건들.length ? '표에서 고른 ' + 건들.length + '건' : '먼저 주문표에서 건을 고르세요' }),
      만들기('span', { style: 'flex:1' }), 넘김, 되돌
    ]);
  }

  /* ══ 처리 ══ */

  function 처리() {
    ZG.주문파일.시트배열(상태.파일, function (결) {
      if (!결.ok) { u.흔들기(창); u.토스트(결.오류); return; }
      var 읽 = B().읽기시트(결.행들);
      /* 🔴 머리글 검사에 걸리면 아무것도 저장하지 않고 멈춘다 */
      if (!읽.ok) { u.흔들기(창); u.토스트(읽.오류); return; }
      if (!읽.줄들.length) { u.흔들기(창); u.토스트('읽을 줄이 없습니다 — 빈 파일인 것 같습니다.'); return; }

      상태.총 = 읽.총; 상태.무시 = 읽.무시;
      상태.색인 = B().색인만들기();
      var 오늘 = u.오늘문자();
      상태.줄들 = 읽.줄들.map(function (줄) { return 판정하기(줄, 오늘); });
      상태.단계 = '결과';
      그리기();
    });
  }

  function 판정하기(줄, 오늘) {
    var 것 = {
      순번: 줄.순번, 운송장번호: 줄.운송장번호, 수하인: 줄.수하인, 박스: 줄.박스, 주문번호: 줄.주문번호,
      판정: '확인', 사유: '', 주문줄들: [], 만든출고: [], 표시글: '', 연결주문번호: '', 확인원본: false
    };
    if (!줄.주문번호) { 것.사유 = '빈번호'; 것.확인원본 = true; return 것; }

    var 찾은 = B().주문찾기(줄.주문번호, 상태.색인);
    if (!찾은.length) { 것.사유 = '없는번호'; 것.확인원본 = true; return 것; }

    것.주문줄들 = 찾은;
    var 갈래 = B().넘길줄만(찾은, 상태.색인);
    var 못깎음 = 못깎았나(갈래.걸린);
    if (!갈래.넘길.length) {
      /* 🔴 방패 사유를 갈라 본다 (설계 §3-1). 「이미 나감」과 「품목코드 없음」은 전혀 다른 일이다 —
         품목코드가 없으면 재고가 한 주도 안 깎였는데 초록 「정상」에 섞여 우람님이 끝까지 모르신다 */
      if (못깎음) {
        것.판정 = '미차감'; 것.사유 = '품목없음'; 것.확인원본 = true;
        것.표시글 = '품목코드가 없어 재고를 차감하지 못했습니다 — 확인 필요';
        return 것;
      }
      것.판정 = '이미'; 것.표시글 = '이미 처리된 주문입니다'; return 것;
    }
    것.만든출고 = B().출고넣기(갈래.넘길, 오늘, 상태.색인);
    것.판정 = '정상';
    것.표시글 = B().차감글(갈래.넘길) + (못깎음 ? ' · 품목코드 없는 줄은 못 깎음' : '');
    return 것;
  }

  /* 방패에 걸린 사유 중 「재고를 못 깎았다」는 쪽이 있나 — `이미`·`서비스`는 이미 나간 것이라 정상이다 */
  function 못깎았나(걸린) {
    var 있 = false;
    (걸린 || []).forEach(function (c) { if (c.사유 === '품목미확인' || c.사유 === '수량0') 있 = true; });
    return 있;
  }

  /* ══ ② 결과 창 ══ */

  function 셈(판정들) {
    return 상태.줄들.filter(function (것) { return 판정들.indexOf(것.판정) >= 0; }).length;
  }

  function 출고셈() {
    var 건 = 0, 코드 = [];
    상태.줄들.forEach(function (것) {
      if (!것.만든출고.length) return;      // 되돌린 줄은 품목 수에서도 빠져야 한다
      건 += 것.만든출고.length;
      (것.주문줄들 || []).forEach(function (r) {
        if (r.품목코드 && 코드.indexOf(r.품목코드) < 0) 코드.push(r.품목코드);
      });
    });
    return { 건: 건, 품목: 코드.length };
  }

  /* 줄마다 다른 사유를 수하인 칸 밑에 한 줄로 붙인다 — 상자 머리에 뭉쳐 두면
     어느 줄이 왜 걸렸는지 우람님이 짚어 보실 수 없다 */
  function 줄사유(것) {
    if (것.사유 === '빈번호') return '전화주문(주문번호 없음)';
    if (것.사유 === '없는번호') return 'v3에 없는 주문번호: ' + 것.주문번호;
    if (것.사유 === '품목없음') return '품목코드 없음 — 재고 못 깎음';
    return '';
  }

  function 결과창() {
    var 초록수 = 만들기('div', { class: 'v' });
    var 빨강수 = 만들기('div', { class: 'v' });
    var 완료글 = 만들기('span');
    참조.초록수 = 초록수; 참조.빨강수 = 빨강수; 참조.완료글 = 완료글;

    var 전체되돌리기 = 참조.전체되돌리기 = 단추('되돌리기', 전부되돌리기, 'sm');

    var 몸 = [
      만들기('div', { class: 'sums' }, [
        만들기('div', { class: 'sum ok' }, [
          만들기('div', { class: 'k', text: '정상 처리' }), 초록수,
          만들기('div', { class: 's', text: '주문번호를 찾아 「나갔다」고 기록했습니다' })
        ]),
        만들기('div', { class: 'sum ng' }, [
          만들기('div', { class: 'k', text: '확인 필요' }), 빨강수,
          만들기('div', { class: 's', text: '어느 주문인지 못 찾았습니다' })
        ])
      ]),
      만들기('div', { class: 'done' }, [완료글, 전체되돌리기])
    ];

    var 확인표 = 확인상자();          // 확인 필요가 0이면 통째로 안 그린다
    if (확인표) 몸.push(확인표);

    /* 카페24 상자는 자리만 잡아 두고 요약새로()가 채운다 — 「이름으로 찾기」로 판정이 바뀌면 대상 수도 따라 바뀐다 */
    참조.c24자리 = 만들기('div');
    몸.push(참조.c24자리);

    var 파일명 = '카페24_송장업로드_' + 오늘숫자() + '.xlsx';
    껍데기({
      제목: '배송완료 처리 결과',
      힌트: 상태.파일명 + ' · ' + 상태.총 + '줄' + (상태.무시 ? ' (무시 ' + 상태.무시 + '줄)' : ''),
      몸: 몸,
      발: [
        만들기('span', { class: 'fname', text: '내려받을 파일 — ' + 파일명 }),
        만들기('span', { class: 'spacer' }), 단추('닫기', 닫기),
        단추('⬇ 송장 업로드 파일 내려받기', function () { 내려받기(파일명); }, 'main')
      ]
    });
    요약새로();
  }

  function 요약새로() {
    /* `미차감`은 초록이 아니라 빨강이다 — 재고를 한 주도 못 깎았으니 「정상 처리」로 세면 안 된다 */
    var 초록 = 셈(['정상', '이미', '처리']), 빨강 = 셈(['확인', '미차감']);
    참조.초록수.innerHTML = 초록 + '<small>건</small>';
    참조.빨강수.innerHTML = 빨강 + '<small>건</small>';
    var 수 = 출고셈(), 송장줄 = B().송장표(상태.줄들).length - 1, 이미 = 셈(['이미']);
    참조.완료글.innerHTML = '정상 ' + 초록 + '건 — <b>출고 ' + 수.건 + '건 기록</b> · <b>재고 ' + 수.품목 +
      '품목 차감</b> 완료 · 송장 업로드 파일 <b>' + 송장줄 + '줄</b> 준비됨' +
      (이미 ? ' · 이미 처리된 ' + 이미 + '건은 건너뜀' : '') +
      /* 되돌리면 그 줄들은 화면에서 사라진다 — 무슨 일이 일어났는지 여기 한 줄로 남긴다 */
      (상태.되돌림 ? '<br>↩ <b>되돌림</b> — 정상 처리했던 ' + 상태.되돌림 +
        '건이 취소되었습니다. 창을 닫고 파일을 다시 돌리면 다시 처리할 수 있습니다.' : '');
    참조.전체되돌리기.hidden = 수.건 === 0;

    if (참조.확인수) 참조.확인수.textContent = '⚠️ 확인 필요 ' + 빨강 + '건';
    카페24새로();
  }

  /* ── ① 카페24 발송처리 상자 (9단계 설계 §4-1) ──
     🔴 자동 호출은 어디에도 없다. 우람님이 이 단추를 눌러야만 08m 이 뜨고,
        거기서 미리보기를 통과하고 확인창을 눌러야만 실제 전송이 일어난다 */
  function 카페24새로() {
    var 자리 = 참조.c24자리;
    if (!자리) return;
    u.비우기(자리);

    var 뽑 = ZG.카페24발송.대상뽑기(상태.줄들);
    var 짝들 = 뽑.짝들;
    /* 대상이 0건이면 상자를 통째로 안 그린다 — 단, 심폴이 있으면 안내 한 줄짜리로 그린다 (②) */
    if (!짝들.length && !뽑.심폴수) { 자리.hidden = true; return; }
    자리.hidden = false;

    var 빠짐 = [];
    if (뽑.심폴수) 빠짐.push('심폴 ' + 뽑.심폴수 + '건');
    if (뽑.전화수) 빠짐.push('전화주문 ' + 뽑.전화수 + '건');

    var 속 = [만들기('span', {
      html: (짝들.length ? '카페24 <b>' + 짝들.length + '건</b>' : '카페24 대상 없음') +
            (빠짐.length ? ' · ' + 빠짐.join(' · ') + ' 제외' : '')
    })];

    if (짝들.length) {
      var 버튼 = 단추('발송처리', function () {
        ZG.카페24발송창.열기({ 짝들: 짝들, 심폴수: 뽑.심폴수, 그다음: 요약새로 });
      }, 'sm main');
      if (!ZG.서버 || !ZG.서버.클라이언트) {
        버튼.disabled = true; 버튼.setAttribute('style', 'opacity:.45');
        속.push(만들기('span', { class: 'note', text: '서버에 연결돼 있지 않습니다' }));
      }
      속.push(버튼);
    }

    자리.appendChild(만들기('div', { class: 'needbox c24' }, [
      만들기('h4', {}, [
        만들기('span', { text: '☁ 카페24 발송처리' })
      ]),
      만들기('div', { class: 'inner' }, [만들기('div', { class: 'c24row' }, 속)])
    ]));
  }

  /* ── 확인 필요 상자 — 한 줄도 없으면 아예 안 그린다 ── */
  function 확인상자() {
    var 대상 = 상태.줄들.filter(function (것) { return 것.확인원본; });
    if (!대상.length) return null;

    var 몸통 = 만들기('table', {}, [
      만들기('colgroup', {}, [
        /* 수하인 칸에 사유 한 줄이 같이 들어간다 — 좁으면 「주문번/호」로 잘려 읽히지 않는다 */
        만들기('col', { style: 'width:132px' }), 만들기('col', { style: 'width:156px' }),
        만들기('col', { style: 'width:56px' }), 만들기('col')
      ]),
      만들기('tr', {}, [
        만들기('th', { text: '운송장번호' }), 만들기('th', { text: '수하인' }),
        만들기('th', { class: 'r', text: '박스' }), 만들기('th', { class: 'r', text: '이 줄을 어떻게 할까요' })
      ])
    ]);
    대상.forEach(function (것) { 몸통.appendChild(줄만들기(것)); });

    var 확인수 = 참조.확인수 = 만들기('span', { text: '⚠️ 확인 필요 ' + 셈(['확인']) + '건' });
    return 만들기('div', { class: 'needbox' }, [
      만들기('h4', {}, [확인수, 만들기('span', { class: 'why', text: '줄마다 사유를 이름 밑에 적었습니다' })]),
      만들기('div', { class: 'inner' }, [
        몸통,
        만들기('div', { class: 'allrow' }, [
          만들기('span', { class: 'l', text: '여러 줄이 나오면 —' }),
          단추('전부 이름으로 찾기', 전부이름, 'sm'), 단추('전부 넘어가기', 전부넘김, 'sm'),
          만들기('span', { style: 'flex:1' }),
          만들기('span', { class: 'note', html: '넘어간 줄도 송장 업로드 파일에는 <b>들어가지 않습니다</b>' })
        ])
      ])
    ]);
  }

  function 끝칸(것) {
    /* 품목코드가 없는 줄은 이름으로 다시 찾아도 방패에 또 걸린다 — 버튼을 주지 않고 사유만 적는다 */
    if (것.판정 === '미차감') return 만들기('td', { class: 'r warn', text: 것.표시글 });
    if (것.판정 === '확인') {
      return 만들기('td', {}, [만들기('div', { class: 'rowbtns' }, [
        단추('이름으로 주문 찾아 재고 차감', function () { 이름처리(것); }, 'sm main'),
        단추('재고 그대로 두고 넘어가기', function () {
          것.판정 = '넘어감'; 것.표시글 = '재고 그대로 두고 넘어감'; 줄새로(것);
        }, 'sm')
      ])]);
    }
    if (것.판정 === '넘어감') return 만들기('td', { class: 'r gone', text: 것.표시글 || '넘어감' });
    return 만들기('td', { class: 'went' }, [만들기('div', { class: 'rowbtns' }, [
      만들기('span', { text: 것.표시글 }), 단추('되돌리기', function () { 줄되돌리기(것); }, 'sm')
    ])]);
  }

  function 수하인칸(것) {
    var 속 = [만들기('div', { text: 것.수하인 || '(이름 없음)' })];
    var 사유 = 줄사유(것);
    if (사유) 속.push(만들기('div', { class: 'sub', text: 사유 }));
    return 만들기('td', {}, 속);
  }

  function 줄만들기(것) {
    return (참조['줄' + 것.순번] = 만들기('tr', {}, [
      만들기('td', { class: 'code', text: 것.운송장번호 }),
      수하인칸(것),
      만들기('td', { class: 'r', text: String(것.박스) }),
      끝칸(것)
    ]));
  }

  /* 🔴 다시 그리기는 줄 단위로만. 표 전체를 다시 그리면 스크롤과 방금 본 이력이 튄다 */
  function 줄새로(것) {
    var 옛 = 참조['줄' + 것.순번];
    if (옛 && 옛.parentNode) 옛.parentNode.replaceChild(줄만들기(것), 옛);
    요약새로();
  }

  /* ══ §5 이름으로 찾기 ══ */

  function 붙이기(것, g) {
    var 갈래 = B().넘길줄만(g.줄들, 상태.색인);
    if (!갈래.넘길.length) { 것.판정 = '넘어감'; 것.표시글 = '그 주문은 이미 나갔습니다'; 줄새로(것); return; }
    것.만든출고 = B().출고넣기(갈래.넘길, u.오늘문자(), 상태.색인);
    것.주문줄들 = 갈래.넘길;
    것.연결주문번호 = String(갈래.넘길[0].주문번호 || '').trim();
    것.판정 = '처리';
    것.표시글 = g.짧은글;
    줄새로(것);
  }

  /* 후보가 날짜만 다르게 8줄 늘어서 헷갈린다 — 「오늘 · 」「N일 전 · 」를 맨 앞에 세워 먼저 읽히게 한다.
     🔴 후보 목록 자체는 좁히지 않는다. 지난 주문이 오늘 나가는 일이 있어 걸러내면 고를 길이 없어진다 */
  function 날짜표(주문일) {
    if (!주문일) return '';
    var 오늘 = u.오늘문자();
    if (주문일 === 오늘) return '🟢 오늘 · ';
    var 날 = Math.round((Date.parse(오늘) - Date.parse(주문일)) / 86400000);
    return 날 > 0 ? 날 + '일 전 · ' : '';
  }

  function 이름처리(것, 그다음) {
    function 끝(중단) { if (그다음) 그다음(중단); }

    var 후보 = B().이름후보(것.수하인, 상태.색인);
    if (!후보.length) {
      것.판정 = '넘어감'; 것.표시글 = '그 이름으로 안 나간 주문을 못 찾음';
      u.토스트('그 이름으로 아직 안 나간 주문을 못 찾았습니다 — 이 줄은 넘어갑니다.');
      줄새로(것); 끝(false); return;
    }
    if (후보.length === 1) { 붙이기(것, 후보[0]); 끝(false); return; }

    /* 🔴 고르기를 부르기 직전에 탈출을 풀고, 콜백에서 다시 건다.
       안 하면 Esc 한 번에 후보창과 결과창이 같이 닫혀 처리 이력이 통째로 날아간다 */
    u.탈출풀기();
    u.고르기({
      제목: '어느 주문일까요',
      본문: '수하인 「' + (것.수하인 || '') + '」 이름으로 찾은 주문입니다.<br>' +
            '<b>날짜를 꼭 보세요</b> — 같은 이름의 지난 주문도 함께 뜹니다.',
      항목: 후보.map(function (g, i) { return { 값: String(i), 글: 날짜표(g.주문일) + g.글 }; })
    }, function (값) {
      u.탈출걸기(닫기);
      if (값 == null) { 끝(true); return; }
      붙이기(것, 후보[Number(값)]);
      끝(false);
    });
  }

  function 전부이름() {
    var 남은 = 상태.줄들.filter(function (것) { return 것.판정 === '확인'; }), i = 0;
    (function 다음(중단) {
      if (중단 || i >= 남은.length) { 요약새로(); return; }
      이름처리(남은[i++], 다음);
    })(false);
  }

  function 전부넘김() {
    상태.줄들.forEach(function (것) {
      if (것.판정 !== '확인') return;
      것.판정 = '넘어감'; 것.표시글 = '재고 그대로 두고 넘어감'; 줄새로(것);
    });
    요약새로();
  }

  /* ══ 되돌리기 — 창을 닫기 전까지만 된다 (설계 §11-5) ══ */

  function 한줄되돌리기(것) {
    if (!것.만든출고.length) return false;
    B().출고되돌리기(것.만든출고, 상태.색인);
    것.만든출고 = [];
    것.판정 = 것.확인원본 ? '확인' : '넘어감';
    것.표시글 = 것.확인원본 ? '' : '되돌렸습니다 — 재고 원래대로';
    줄새로(것);
    return true;
  }

  function 줄되돌리기(것) {
    if (!한줄되돌리기(것)) { u.토스트('되돌릴 출고가 없습니다.'); return; }
    u.토스트('재고를 원래대로 되돌렸습니다.');
  }

  /* 정상 줄은 시안에 표가 없다. 그 줄들이 만든 출고를 한 번에 되물리는 자리를 `.done` 줄 끝에 둔다 */
  function 전부되돌리기() {
    var 수 = 출고셈();
    if (!수.건) { u.토스트('되돌릴 출고가 없습니다.'); return; }
    u.탈출풀기();
    u.확인({
      제목: '방금 만든 출고를 되돌릴까요',
      본문: '출고 <b>' + 수.건 + '건</b>을 지우고 재고를 원래대로 돌립니다.',
      확인글: '되돌리기', 위험: true
    }, function (예) {
      u.탈출걸기(닫기);
      if (!예) return;
      상태.줄들.forEach(한줄되돌리기);
      상태.되돌림 += 수.건;      // 되돌린 줄은 화면에서 사라진다 — 안내를 `.done` 줄에 남긴다
      요약새로();
      u.토스트('출고 ' + 수.건 + '건을 되돌렸습니다 — 재고 원래대로.');
    });
  }

  function 내려받기(파일명) {
    var 줄수 = B().송장표(상태.줄들).length - 1;
    if (!줄수) { u.토스트('송장 파일에 넣을 줄이 없습니다.'); return; }
    B().내보내기(상태.줄들, 파일명);
    u.토스트(줄수 + '줄을 내려받았습니다.');
  }


  ZG.배송완료창 = { 열기: 열기, 닫기: 닫기 };
})(window.ZG);
