/* 08m-카페24발송창 — ☁ 카페24 발송처리 모달 (9단계 설계 §4-2)
   🔴 단계를 건너뛸 수 없다. 미리보기(A)를 통과하기 전에는 「진짜 올리기」 버튼이 화면에 아예 없다.
   🔴 진짜로 올리기 직전에 u.확인(위험)을 한 번 더 받는다 — 손님에게 발송 알림이 나가는 동작이다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 상태 = null, 막 = null, 창 = null, 앞창 = null;

  function 단추(글, 눌림, 반) {
    var b = 만들기('button', { class: 'btn' + (반 ? ' ' + 반 : ''), type: 'button', text: 글 });
    b.addEventListener('click', 눌림);
    return b;
  }

  /* 08g:362~375 관례 그대로 — 부를 때 탈출을 풀고, 닫을 때 배송완료창에 돌려준다 */
  function 열기(옵션) {
    if (창) return;
    상태 = {
      짝들: (옵션.짝들 || []).slice(), 심폴수: Number(옵션.심폴수) || 0,
      단계: 'A', 바쁨: false, 진행글: '', 요약: '', 그다음: 옵션.그다음
    };
    u.탈출풀기();
    /* 결과창 위에 겹쳐 뜨면 아래로 삐져나와 두 창이 한 덩어리로 보인다 — 뒤엣것은 잠시 감춘다 */
    앞창 = document.querySelector('.pcsheet.dlv');
    if (앞창) 앞창.style.display = 'none';
    막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', 닫기물음);
    document.body.appendChild(막);
    그리기();
    u.탈출걸기(닫기물음);
  }

  function 진짜닫기() {
    u.탈출풀기();
    if (막) 막.remove();
    if (창) 창.remove();
    if (앞창) 앞창.style.display = '';
    막 = 창 = 앞창 = null;
    var 그다음 = 상태 && 상태.그다음;
    상태 = null;
    u.탈출걸기(ZG.배송완료창.닫기);
    if (그다음) 그다음();
  }

  /* 미리보기에서 막힌 줄도 「실패」다 — 그 줄은 아직 카페24에 안 올라갔다.
     닫기 경고와 「↻ 다시」가 둘 다 이걸 본다 */
  function 실패줄들() {
    return 상태.짝들.filter(function (p) {
      if (p.결과) return !p.결과.됨;
      return p.켬 && p.미리 && !p.미리.됨;
    });
  }
  function 실패수() { return 실패줄들().length; }

  function 닫기물음() {
    if (!상태 || 상태.바쁨) return;
    var m = 실패수();
    if (!m) { 진짜닫기(); return; }
    u.탈출풀기();
    u.확인({
      제목: '실패 ' + m + '건이 남아 있습니다',
      본문: '닫으면 이 목록은 사라집니다. 성공한 것은 이미 기록됐고, 같은 로젠 파일을 다시 올리면 남은 것만 다시 뜹니다.',
      확인글: '그래도 닫기', 위험: true
    }, function (예) {
      if (예) { 진짜닫기(); return; }
      u.탈출걸기(닫기물음);
    });
  }

  /* ══ 그리기 ══ */

  function 보낼목록() {
    return 상태.짝들.filter(function (p) {
      return p.켬 && p.미리 && p.미리.됨 && !(p.결과 && p.결과.됨);
    });
  }

  function 결과글(p) {
    if (p.결과) return (p.결과.됨 ? '✅ 발송처리됨' : '❌ ' + (p.결과.사유 || '실패')).slice(0, 170);
    if (p.미리) return (p.미리.됨 ? '✅ 올릴 수 있습니다' + (p.미리.품목수 ? ' · 품목 ' + p.미리.품목수 : '')
                                  : '❌ ' + (p.미리.사유 || '올릴 수 없습니다')).slice(0, 170);
    return p.처음사유 || '';
  }

  function 표만들기() {
    var 몸통 = 만들기('table', {}, [
      만들기('colgroup', {}, [
        만들기('col', { style: 'width:38px' }), 만들기('col', { style: 'width:104px' }),
        만들기('col', { style: 'width:96px' }), 만들기('col', { style: 'width:124px' }), 만들기('col')
      ]),
      만들기('tr', {}, [
        만들기('th', { text: '' }), 만들기('th', { text: '주문번호' }), 만들기('th', { text: '받는 분' }),
        만들기('th', { text: '운송장번호' }), 만들기('th', { class: 'r', text: '결과' })
      ])
    ]);

    상태.짝들.forEach(function (p) {
      var 체크 = 만들기('input', { type: 'checkbox', 'aria-label': p.주문번호 + ' 올리기' });
      체크.checked = !!p.켬;
      /* 이미 올라간 줄은 다시 켤 수 없다 — 같은 송장을 두 번 보내면 카페24에서 덮어써진다 */
      체크.disabled = 상태.바쁨 || !!(p.결과 && p.결과.됨);
      체크.addEventListener('change', function () { p.켬 = 체크.checked; 발새로(); });

      몸통.appendChild(만들기('tr', {}, [
        만들기('td', {}, [체크]),
        만들기('td', { class: 'code', text: p.주문번호 }),
        만들기('td', { text: p.수하인 || '(이름 없음)' }),
        만들기('td', { class: 'code', text: p.운송장번호 }),
        만들기('td', {
          class: 'r' + (p.결과 && !p.결과.됨 ? ' warn' : (p.결과 ? ' went' : (p.미리 && !p.미리.됨 ? ' warn' : ' gone'))),
          text: 결과글(p)
        })
      ]));
    });
    return 몸통;
  }

  function 몸만들기() {
    var 몸 = [
      만들기('div', { class: 'c24warn', html:
        '🔴 진짜로 올리면 <b>되돌릴 수 없습니다.</b> 카페24 관리자에서 손으로 지워야 하고, ' +
        '<b>손님에게 발송 알림이 나갈 수 있습니다.</b>' })
    ];
    몸.push(만들기('div', { class: 'needbox c24' }, [
      만들기('h4', {}, [
        만들기('span', { text: '☁ 카페24 발송처리' }),
        만들기('span', { class: 'why', text: '켜진 줄만 올라갑니다' })
      ]),
      만들기('div', { class: 'inner' }, [표만들기()])
    ]));
    if (상태.심폴수) {
      몸.push(만들기('div', { class: 'c24note', text:
        '심폴 ' + 상태.심폴수 + '건은 대상이 아닙니다 — 심폴은 직접 발송처리하셔야 합니다' }));
    }
    if (상태.요약) 몸.push(만들기('div', { class: 'done' }, [만들기('span', { html: 상태.요약 })]));
    return 몸;
  }

  function 발만들기() {
    var 것들 = [만들기('span', { class: 'fname', text: 상태.진행글 }), 만들기('span', { class: 'spacer' })];
    var 닫기단추 = 단추('닫기', 닫기물음, '');
    닫기단추.disabled = 상태.바쁨;
    것들.push(닫기단추);

    if (상태.바쁨) return 것들;

    if (상태.단계 === 'A') {
      var 미리단추 = 단추('🔍 미리보기 — 안 올라갑니다', 미리보기, 'main');
      미리단추.disabled = !상태.짝들.filter(function (p) { return p.켬; }).length;
      것들.push(미리단추);
      return 것들;
    }

    if (상태.단계 === 'B') {
      /* 🔴 여기가 오발사 방지의 핵심이다 — 미리보기를 통과한 줄이 하나도 없으면 진짜 버튼을 안 만든다 */
      var 보낼 = 보낼목록();
      /* 미리보기가 전부 막혔으면 올릴 것이 없다 — 진짜 단추 대신 다시 하는 길만 준다 */
      if (!보낼.length) {
        if (실패수()) 것들.push(단추('↻ 실패한 것만 다시 올리기', 다시올리기, ''));
        return 것들;
      }
      것들.push(단추('① 첫 1건만 올려보기', function () { 진짜물음(보낼.slice(0, 1)); }, ''));
      것들.push(단추('☁ 진짜 올리기 ' + 보낼.length + '건', function () { 진짜물음(보낼); }, 'warn'));
      return 것들;
    }

    if (실패수()) 것들.push(단추('↻ 실패한 것만 다시 올리기', 다시올리기, ''));
    return 것들;
  }

  function 그리기() {
    var x = 단추('✕', 닫기물음, '');
    x.className = 'x'; x.setAttribute('aria-label', '닫기');
    var 것 = 만들기('div', { class: 'pcsheet dlv', role: 'dialog', 'aria-modal': 'true' }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: '☁ 카페24 발송처리' }),
        만들기('span', { class: 'hint', text: 상태.짝들.length + '건 · 로젠 송장번호를 카페24에 올립니다' }),
        만들기('span', { class: 'right' }, [x])
      ]),
      만들기('div', { class: 'bd' }, 몸만들기()),
      만들기('div', { class: 'ft' }, 발만들기())
    ]);
    if (창) 창.remove();
    창 = 것;
    document.body.appendChild(것);
  }

  function 발새로() { 그리기(); }

  /* ══ A — 미리보기. 🔴 여기서는 zg.v3.주문을 한 줄도 안 쓴다 ══ */

  function 미리보기() {
    var 대상 = 상태.짝들.filter(function (p) { return p.켬; });
    if (!대상.length) { u.토스트('올릴 줄을 하나도 안 골랐습니다.'); return; }
    상태.바쁨 = true; 상태.진행글 = '카페24에서 주문을 읽는 중… 0/' + 대상.length;
    상태.요약 = '';
    그리기();

    ZG.카페24발송.보내기(대상, false, function (한, 전) {
      상태.진행글 = '카페24에서 주문을 읽는 중… ' + 한 + '/' + 전;
      그리기();
    }).then(function (결과들) {
      결과들.forEach(function (r) { r.짝.미리 = { 됨: r.됨, 사유: r.사유, 품목수: r.품목수 }; });
      var 됨 = 결과들.filter(function (r) { return r.됨; }).length;
      상태.바쁨 = false; 상태.단계 = 'B'; 상태.진행글 = '';
      상태.요약 = '🔍 미리보기 — <b>' + 됨 + '건</b>은 올릴 수 있습니다 · 올릴 수 없는 것 <b>' +
                  (결과들.length - 됨) + '건</b>. <b>아직 아무 것도 올라가지 않았습니다.</b>';
      그리기();
    });
  }

  /* ══ B → 진짜. 🔴 확인창을 통과해야만 진짜:true 가 나간다 ══ */

  function 진짜물음(보낼) {
    if (!보낼.length) return;
    u.탈출풀기();
    u.확인({
      제목: '카페24에 발송처리 할까요',
      본문: '<b>' + 보낼.length + '건</b>을 올립니다. 되돌리려면 카페24 관리자에서 손으로 지워야 합니다.<br>' +
            '손님에게 발송 알림이 나갈 수 있습니다.',
      확인글: '올리기', 위험: true
    }, function (예) {
      u.탈출걸기(닫기물음);
      if (!예) return;
      진짜올리기(보낼);
    });
  }

  function 진짜올리기(보낼) {
    상태.바쁨 = true; 상태.진행글 = '올리는 중… 0/' + 보낼.length;
    그리기();

    ZG.카페24발송.보내기(보낼, true, function (한, 전) {
      상태.진행글 = '올리는 중… ' + 한 + '/' + 전;
      그리기();
    }).then(function (결과들) {
      var 됨번호 = {}, 성공 = 0;
      결과들.forEach(function (r) {
        r.짝.결과 = { 됨: r.됨, 사유: r.사유 };
        if (r.됨) { 됨번호[r.짝.주문번호] = 1; 성공++; }
      });
      /* 🔴 성공한 주문번호만 v3 주문줄에 되쓴다. 출고·재고·송장은 손대지 않는다 */
      ZG.카페24발송.상태되쓰기(상태.짝들, 됨번호);

      var 실패 = 결과들.length - 성공;
      상태.바쁨 = false; 상태.진행글 = '';
      상태.단계 = (실패 || !보낼목록().length) ? 'C' : 'B';   // 첫 1건만 올렸으면 남은 줄을 마저 올릴 수 있게 B로 둔다
      상태.요약 = '✅ 카페24 발송처리 <b>' + 성공 + '건</b>' + (실패 ? ' · ❌ 실패 <b>' + 실패 + '건</b>' : '') +
                  ' — 통합관리의 출고·재고 기록은 그대로 둡니다';
      그리기();
      u.토스트('카페24 발송처리 ' + 성공 + '건' + (실패 ? ' · 실패 ' + 실패 + '건' : '') + '.');
    });
  }

  /* ══ C — 실패한 것만 다시. A(미리보기)부터 다시 태운다 ══ */

  function 다시올리기() {
    var 실패 = 실패줄들(), 남 = 실패.length;
    if (!남) { u.토스트('다시 올릴 줄이 없습니다.'); return; }
    /* 🔴 이미 올라간 줄은 손대지 않는다 — 결과를 지우면 체크가 다시 켜져 같은 송장을 두 번 보낸다 */
    상태.짝들.forEach(function (p) { if (실패.indexOf(p) < 0) p.켬 = false; });
    실패.forEach(function (p) { p.켬 = true; p.미리 = null; p.결과 = null; });
    상태.단계 = 'A'; 상태.요약 = '↻ 실패한 ' + 남 + '건만 다시 켰습니다 — 미리보기부터 다시 합니다.';
    그리기();
  }

  ZG.카페24발송창 = { 열기: 열기 };
})(window.ZG);
