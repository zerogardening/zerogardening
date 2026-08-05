/* 08e-서비스품목 — 고른 주문들에 서비스(무료) 품목을 한 번에 넣는다 (6단계 설계 §2)
   표를 따로 만들지 않는다. `zg.v3.주문`에 보통 품목줄과 똑같은 모양으로 넣고 `서비스:true` 하나만 더한다 —
   그래야 묶기·출고리스트·동봉카드·엑셀이 손대지 않고 그대로 센다 (설계 §2-1). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;

  function 힌트글(건들) {
    var 이름들 = [];
    건들.forEach(function (g) {
      var n = g.수령인 || '(이름 없음)';
      if (이름들.indexOf(n) < 0) 이름들.push(n);
    });
    var 앞 = 이름들.slice(0, 3).join(' · ');
    var 남 = 이름들.length - 3;
    return '고른 ' + 건들.length + '건 · ' + 앞 + (남 > 0 ? ' 외 ' + 남 + '명' : '');
  }

  /* 고른 건마다 카드에 적은 품목을 그대로 한 줄씩 만든다.
     같은 품목을 일부러 또 넣을 수 있으므로 `같은주문인가()` 중복 확인은 하지 않는다 (설계 §2-5) */
  function 넣어주기(건들, 카드들) {
    var 저 = ZG.저장소;
    건들.forEach(function (g) {
      var 바탕 = (g.줄들 || [])[0];          // 묶음id·주문번호·판매처·출처·우편번호·배송메모를 여기서 물려받는다
      var 것 = { 이름: g.수령인, 전화: g.전화, 주소: g.주소 };
      카드들.forEach(function (st) {
        저.덧붙이기(저.키.주문, ZG.주문입력.줄만들기(st, 것, g.주문일, g.판매처 || '기타', 바탕));
      });
    });
  }

  function 닫기() { ZG.주문입력.닫기창(); }

  function 창(건들) {
    // 「고른 게 없으면 전체」 규칙을 쓰지 않는다 — 그 날 주문 전부에 서비스가 들어간다 (설계 §2-5)
    if (!건들 || !건들.length) { u.토스트('서비스를 넣을 주문을 먼저 골라 주세요.'); return; }

    var 묶음 = ZG.주문입력.품목카드묶음(null, { 단가보임: true, 서비스: true });

    var 넣기 = 만들기('button', { class: 'btn sm main', type: 'button', text: '넣기' });
    넣기.addEventListener('click', function () {
      var 카드들 = 묶음.읽기();
      if (!카드들.length) { u.흔들기(묶음.요소); u.토스트('품목을 하나 이상 골라 주세요.'); return; }
      넣어주기(건들, 카드들);
      닫기();
      u.토스트(건들.length + '건에 서비스 ' + 카드들.length + '품목을 넣었습니다.');
      ZG.주문.다시그리기();
    });

    var 닫기버튼 = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '닫기' });
    닫기버튼.addEventListener('click', 닫기);

    ZG.주문입력.닫기창();
    var 막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', 닫기);

    var 창요소 = 만들기('div', { class: 'pcsheet', role: 'dialog', 'aria-modal': 'true' }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: '서비스 품목 넣기' }),
        만들기('span', { class: 'hint', text: 힌트글(건들) }),
        만들기('span', { class: 'right' }, [넣기, 닫기버튼])
      ]),
      만들기('div', { class: 'bd' }, [만들기('div', { class: 'cardset' }, [묶음.요소])])
    ]);
    document.body.appendChild(막);
    document.body.appendChild(창요소);
    u.탈출걸기(닫기);   // Esc 는 04-공통UI 한 자리에서만 받는다
  }

  ZG.서비스품목 = { 창: 창 };
})(window.ZG);
