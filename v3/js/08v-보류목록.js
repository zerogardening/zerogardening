/* 08v-보류목록 — 묶음 카드(🚚 팝업·배송보류 탭 공용) · 배송보류 탭 · ✋ 넘기기 (22단계 설계 §5)
   🔴 카드 한 장 = 묶음 하나(같은 사람·같은 송장). 자료는 전부 08u.
   🔴 PC 보류 카드는 좌우 칸으로 가르지 않는다 — 머리 / 주문내역 / 송장·넘기기 한 장 (우람님 10/15) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;

  function H() { return ZG.배송보류; }
  function 수량(r) { return ZG.주문자료.수량(r); }

  function 나이글(날) {
    if (!날) return ['', '', 0];
    var 일 = Math.round((Date.parse(u.오늘문자()) - Date.parse(날)) / 86400000);
    return [날.slice(5).replace('-', '/'), 일 <= 0 ? '오늘' : 일 + '일', 일];
  }

  function 품목줄(r) { return (r.유통명 || r.원본코드 || '(품목 없음)') + (r.규격 ? ' · ' + r.규격 : ''); }
  function 상품만(줄들) { return (줄들 || []).filter(function (r) { return r.서비스 !== true; }); }

  function 마켓(r) {
    var 실 = ZG.주문실적, m = 실.마켓이름(r || {});
    return 만들기('span', { class: 'mall' }, [만들기('i', { class: 'md', style: 'background:' + 실.마켓색(m) }), document.createTextNode(m)]);
  }

  /* ══ 묶음 카드 ══
     건: { 수령인, 전화, 줄들 }
     옵션: 체크(true/false/없음)·체크막힘·체크누름 · 머리배지[] · 오른쪽[] · 마켓오른쪽 · 전화
           폰목록(품목코드 없이 N주) · 금액 · 송장('입력'|'글')·송장값·송장바꿈(새) · 아래단추·단추한줄 · 꺼짐 */
  function 묶음카드(건, 옵션) {
    옵션 = 옵션 || {};
    var 줄들 = 상품만(건.줄들), 머리 = [];
    if (옵션.체크 != null) {
      var cb = 만들기('button', {
        type: 'button', class: 'cb big' + (옵션.체크 ? ' on' : ''), role: 'checkbox',
        'aria-checked': 옵션.체크 ? 'true' : 'false', 'aria-label': '배송완료'
      });
      if (옵션.체크막힘) cb.disabled = true;
      else cb.addEventListener('click', function () { if (옵션.체크누름) 옵션.체크누름(); });
      머리.push(cb);
    }
    머리.push(만들기('span', { class: 'who', text: 건.수령인 || '(이름 없음)' }));
    if (옵션.전화 && 건.전화) 머리.push(만들기('span', { class: 'tel', text: u.전화정리(건.전화) }));
    var 오른 = (옵션.오른쪽 || []).slice();
    if (옵션.마켓오른쪽) 오른.push(마켓(줄들[0] || 건.줄들[0]));
    else 머리.push(마켓(줄들[0] || (건.줄들 || [])[0]));
    (옵션.머리배지 || []).forEach(function (b) { 머리.push(b); });
    머리.push(만들기('span', { class: 'rt' }, 오른));

    var 줄칸 = 만들기('div', { class: 'lns' }, 줄들.map(function (r) {
      var 칸 = [];
      if (!옵션.폰목록) 칸.push(만들기('span', { class: 'cd', text: r.품목코드 || '—' }));
      칸.push(만들기('span', { class: 'nm', text: r.유통명 || r.원본코드 || '(품목 없음)' }));
      칸.push(만들기('span', { class: 'rg', text: r.규격 || '' }));
      칸.push(만들기('span', { class: 'q', text: 옵션.폰목록 ? 수량(r) + '주' : '×' + 수량(r) }));
      if (옵션.금액) 칸.push(만들기('span', { class: 'amt', text: u.콤마((Number(r.단가) || 0) * 수량(r)) }));
      return 만들기('div', { class: 'ln' }, 칸);
    }));

    var 송장줄 = 만들기('div', { class: 'tv' }, [만들기('span', { class: 'k', text: '송장' })]);
    if (옵션.송장 === '입력') 송장줄.appendChild(송장입력(옵션));
    else if (옵션.송장 === '글') 송장글(송장줄, 옵션);
    var 몸 = [만들기('div', { class: 'h' }, 머리), 줄칸, 송장줄];
    if (옵션.아래단추) {
      if (옵션.단추한줄) 송장줄.appendChild(옵션.아래단추);
      else 몸.push(옵션.아래단추);
    }
    return 만들기('div', { class: 'oc' + (옵션.꺼짐 ? ' off' : '') }, 몸);
  }

  /* 🚚 팝업 — 늘 열린 칸. blur·Enter 에 고친다. 빈칸이면 흔들고 되돌린다 */
  function 송장입력(옵션) {
    var 옛 = String(옵션.송장값 || '');
    var 칸 = 만들기('input', { class: 'inp', type: 'text', inputmode: 'numeric', autocomplete: 'off', value: 옛 });
    if (!옛) 칸.disabled = true;
    function 확정() {
      var 새 = 칸.value.trim();
      if (새 === 옛) return;
      if (!새) { 칸.value = 옛; u.흔들기(칸); return; }
      옛 = 새;
      if (옵션.송장바꿈) 옵션.송장바꿈(새);
    }
    칸.addEventListener('blur', 확정);
    칸.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); 칸.blur(); }
    });
    return 칸;
  }

  /* 보류 탭 — 번호 글 + ✎. 누르면 그 자리 입력칸 + [저장] (Enter 저장 · Esc 취소) */
  function 송장글(줄, 옵션) {
    var 값 = String(옵션.송장값 || '');
    var 글 = 만들기('span', { class: 'ttl', text: 값 || '—' });
    var 펜 = 만들기('button', { type: 'button', class: 'ed', text: '✎', 'aria-label': '송장번호 고치기' });
    줄.appendChild(글); 줄.appendChild(펜);
    펜.addEventListener('click', function () {
      var 칸 = 만들기('input', { class: 'inp edit', type: 'text', inputmode: 'numeric', autocomplete: 'off', value: 값 });
      var 저장 = 만들기('button', { type: 'button', class: 'ed go', text: '저장' });
      function 원래() { 줄.replaceChild(글, 칸); 줄.replaceChild(펜, 저장); }
      function 확정() {
        var 새 = 칸.value.trim();
        if (!새) { u.흔들기(칸); 칸.focus(); return; }
        if (새 === 값) { 원래(); return; }
        if (옵션.송장바꿈) 옵션.송장바꿈(새);
      }
      칸.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' && !e.isComposing) { e.preventDefault(); 확정(); }
        else if (e.key === 'Escape') { e.preventDefault(); e.stopPropagation(); 원래(); }
      });
      저장.addEventListener('click', 확정);
      줄.replaceChild(칸, 글); 줄.replaceChild(저장, 펜);
      칸.focus(); 칸.select();
    });
  }

  /* ══ 배송보류 탭 ══ */
  function 보류카드(g, 다시, 폰) {
    var 나 = 나이글(g.보류일);
    var 넘김 = 만들기('button', { type: 'button', class: '보류넘김', text: '✋ 배송완료로 넘기기' });
    넘김.addEventListener('click', function () { 넘기기(g, function () {}); });
    var 배지 = [만들기('span', { class: 'hold', text: '배송보류' }),
      만들기('span', { class: 'age' + (나[2] >= 3 ? ' old' : ''), text: 나[0] + ' · ' + 나[1] })];
    return 묶음카드({ 수령인: g.수령인, 전화: g.전화, 줄들: g.줄들 }, {
      전화: !폰, 폰목록: 폰, 금액: !폰,
      머리배지: 폰 ? [] : 배지, 오른쪽: 폰 ? 배지 : [], 마켓오른쪽: 폰,
      송장: '글', 송장값: g.송장,
      송장바꿈: function (새) { H().걸기(g.줄들, 새, g.보류일); 다시(); },
      아래단추: 넘김, 단추한줄: !폰
    });
  }

  function PC(카드, 줄들, 다시) {
    u.비우기(카드);
    var 건들 = H().건들(줄들);
    카드.appendChild(만들기('h3', { style: 'padding:0 var(--space-sm)', html: '배송보류 <span class="hint">' + 건들.length + '건</span>' }));
    if (!건들.length) { 카드.appendChild(만들기('div', { class: 'empty', text: '보류 중인 주문이 없습니다.' })); return; }
    카드.appendChild(만들기('div', { class: 'ogrid 보류판' }, 건들.map(function (g) { return 보류카드(g, 다시, false); })));
  }

  function 폰(목록, 줄들, 다시) {
    u.비우기(목록);
    var 건들 = H().건들(줄들);
    if (!건들.length) { 목록.appendChild(만들기('div', { class: 'ph-card', text: '보류 중인 주문이 없습니다.' })); return; }
    건들.forEach(function (g) { 목록.appendChild(보류카드(g, 다시, true)); });
  }

  /* ══ ✋ 넘기기 = 08n 동작(확인창 → 출고·재고) + 카페24 송장 올리기 ══
     🔴 심폴은 08u 가 안 보낸다(손님 문자) — 남은 수만 알린다 */
  function 넘기기(건, 끝) {
    var 상품 = 상품만(건.줄들), 셈 = H().미리셈([건]), 뽑 = H().대상([건]);
    var 카페 = 뽑.짝들.length > 0 && !!(ZG.서버 && ZG.서버.클라이언트);
    /* 🔴 서버 없이 넘기면 출고만 생기고 카페24 송장은 다시 올릴 화면이 없다(보류가 풀려 탭에서 사라진다) */
    if (뽑.짝들.length && !카페) {
      u.확인({
        제목: '지금은 넘길 수 없습니다',
        본문: '서버에 연결돼 있지 않아 카페24 송장을 올리지 못합니다.<br>연결된 뒤 다시 눌러 주세요 — 보류는 그대로 남아 있습니다.',
        확인글: '확인'
      }, function () {});
      끝(false); return;
    }
    var 표 = '<span class="넘김표"><span class="w">' + u.안전(건.수령인 || '') + '</span><span class="ls">' +
      상품.map(function (r) {
        return '<span class="l"><span>' + u.안전(품목줄(r)) + '</span><span class="q">×' + 수량(r) + '</span></span>';
      }).join('') + '<span class="t">' + u.안전(건.송장) + '</span></span></span>';
    u.확인({
      제목: 상품.length + '건을 배송완료로 넘길까요',
      본문: '재고 <b>−' + u.콤마(셈.주) + '주</b>' + (카페 ? ' · 카페24 송장 올림' : '') + 표,
      확인글: '넘기기'
    }, function (예) {
      if (!예) { 끝(false); return; }
      var 일 = H().보내기([건], { 카페24: 카페 });
      ZG.주문.다시그리기();             // 보류는 이미 풀렸다 — 결과를 기다리는 동안 다시 누를 카드를 없앤다
      일.then(function (결) {
        결과알림(건.수령인, 상품.length, 결, 카페);
        ZG.주문.다시그리기();
        끝(true);
      }, function (e) {
        u.확인({ 제목: '넘기는 중 멈췄습니다', 본문: u.안전(String((e && e.message) || e)), 확인글: '확인' }, function () {});
        ZG.주문.다시그리기();
        끝(true);
      });
    });
  }

  function 결과알림(누구, 건수, 결, 카페) {
    u.토스트('✓ ' + (누구 ? 누구 + ' ' : '') + 건수 + '건 배송완료 · 재고 −' + u.콤마(결.주) + '주' + (카페 ? ' · 카페24 송장 올림' : ''));
    if (결.품목없음) u.토스트('품목코드가 없어 재고를 못 깎은 줄 ' + 결.품목없음 + '개');
    var 줄 = 결.실패.map(function (f) {
      return '<b>' + u.안전(f.수하인) + '</b> · ' + u.안전(f.송장) + ' — ' + u.안전(f.사유);
    });
    if (결.심폴빠짐) 줄.push('심폴 ' + 결.심폴빠짐 + '건은 보내지 않았습니다 — 심폴에서 직접 처리하세요');
    if (!줄.length) return;
    /* 출고는 이미 됐다 — 카페24·심폴 쪽만 손으로 하시면 된다 */
    u.확인({
      제목: 결.실패.length ? '발송처리 못 한 ' + 결.실패.length + '건' : '심폴은 따로 처리하세요',
      본문: 줄.join('<br>') + '<br>배송완료(출고)는 이미 기록됐습니다',
      확인글: '확인'
    }, function () {});
  }

  ZG.보류목록 = { 묶음카드: 묶음카드, PC: PC, 폰: 폰, 넘기기: 넘기기, 결과알림: 결과알림 };
})(window.ZG);
