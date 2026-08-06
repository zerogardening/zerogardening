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

  /* ══ 출고 연동 (6단계-3 설계 §1 · §2) ══
     서비스는 넣는 즉시 나간 것으로 본다. `zg.v3.출고`에 주문줄 하나당 한 줄씩 만든다.
     연결키는 2단계 설계 §2-3이 확정해 둔 `주문id` — 배송완료 변환의 이중차감 방지가 여기 걸린다 */
  function 출고찾기(주문id) {
    var 저 = ZG.저장소;
    return 저.읽기(저.키.출고).filter(function (r) { return r.주문id === 주문id; });
  }

  function 출고맞추기(줄) {
    if (!줄 || 줄.서비스 !== true) return 0;   // 보통 주문줄은 배송완료 변환 몫이다
    var 저 = ZG.저장소;
    var 있던 = 출고찾기(줄.id)[0];
    var 목표 = ZG.주문자료.수량(줄);
    if (목표 <= 0 || !줄.품목코드) {
      if (있던) 저.지우기(저.키.출고, 있던.id);
      return 0;
    }
    var 값 = { 품목코드: 줄.품목코드, 수량: 목표, 출고일: 줄.주문일 || ZG.계산.날짜문자(Date.now()) };
    if (있던) {
      저.바꾸기(저.키.출고, 있던.id, 값);   // id·주문id·등록일시는 Object.assign 이라 그대로 남는다
    } else {
      저.덧붙이기(저.키.출고, {
        id: 'sh_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7),
        출고일: 값.출고일, 품목코드: 값.품목코드, 수량: 값.수량,
        출처: '서비스', 주문id: 줄.id, 등록일시: Date.now()
      });
    }
    return 목표;
  }

  function 출고지우기(주문id) {
    var 저 = ZG.저장소;
    출고찾기(주문id).forEach(function (r) { 저.지우기(저.키.출고, r.id); });
  }

  /* 고른 건마다 카드에 적은 품목을 그대로 한 줄씩 만든다.
     같은 품목을 일부러 또 넣을 수 있으므로 `같은주문인가()` 중복 확인은 하지 않는다 (설계 §2-5).
     넣은 줄마다 출고를 함께 만들고 뺀 총수량을 돌려준다 (6단계-3 설계 §5) */
  function 넣어주기(건들, 카드들) {
    var 저 = ZG.저장소, 뺀수량 = 0;
    건들.forEach(function (g) {
      var 바탕 = (g.줄들 || [])[0];          // 묶음id·주문번호·판매처·출처·우편번호·배송메모를 여기서 물려받는다
      var 것 = { 이름: g.수령인, 전화: g.전화, 주소: g.주소 };
      카드들.forEach(function (st) {
        var 줄 = 저.덧붙이기(저.키.주문, ZG.주문입력.줄만들기(st, 것, g.주문일, g.판매처 || '기타', 바탕));
        뺀수량 += 출고맞추기(줄);
      });
    });
    return 뺀수량;
  }

  /* 품목코드가 안 잡힌 카드가 한 장이라도 있으면 아무것도 넣지 않는다 (설계 §5).
     조용히 통과시키면 그 카드만 빠지고 출고도 안 생겨 재고가 어긋난다 */
  function 막는말(묶음) {
    var 모두 = 묶음.모두(), 읽은 = 묶음.읽기();
    if (모두.length !== 읽은.length) {
      var 걸린 = null;
      모두.forEach(function (st) {
        if (걸린) return;
        if (!st.접두) 걸린 = '품목이 안 정해진 카드가 있습니다. 목록에서 골라 주세요 — 직접 쓴 이름에는 품목코드가 안 붙습니다.';
        else if (st.cm <= 0) 걸린 = '화분 사이즈를 정해 주세요.';
        else if (st.수량 <= 0) 걸린 = '수량을 1 이상으로 넣어 주세요.';
      });
      if (걸린) return 걸린;
    }
    var 저 = ZG.저장소;
    var 있는코드 = {};
    저.읽기(저.키.품목).forEach(function (p) { 있는코드[p.품목코드] = 1; });
    var 없는 = null;
    읽은.forEach(function (st) {
      var 코드 = st.접두 + '-' + st.cm;
      if (!없는 && !있는코드[코드]) 없는 = 코드;
    });
    if (없는) return '품목마스터에 없는 규격입니다 (' + 없는 + '). 재고에서 뺄 수 없으니 상품관리에 먼저 등록해 주세요.';
    return '';
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
      var 말 = 막는말(묶음);
      if (말) { u.흔들기(묶음.요소); u.토스트(말); return; }
      var 뺀수량 = 넣어주기(건들, 카드들);
      닫기();
      u.토스트(건들.length + '건에 서비스 ' + 카드들.length + '품목을 넣고 재고 ' + 뺀수량 + '주를 뺐습니다.');
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

  ZG.서비스품목 = { 창: 창, 출고맞추기: 출고맞추기, 출고지우기: 출고지우기 };
})(window.ZG);
