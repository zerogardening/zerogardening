/* 15d-견적탭 — 주문 화면 셸에 「주문 조회 · 견적 요청 · 고객」 세 칸을 단다 (5단계 설계 §3 · 11단계 설계 §4)
   08b 는 다시그리기() 안 두 줄만 바뀐다. 나머지 손질은 전부 여기서 한다.
   탭 상태는 메모리로만 갖는다 — 새로고침하면 주문 조회로 돌아온다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 켜짐 = '주문';   // '주문' · '견적' · '고객'

  function 탭으로(이름) {
    if (켜짐 === 이름) return;
    켜짐 = 이름;
    // 탭을 옮길 때는 언제나 그 탭의 목록부터 — 안쪽 화면이 열린 채로 돌아오면 뒤로 갈 길이 없다
    if (이름 === '견적') { ZG.견적폰.상태.뷰 = '목록'; ZG.견적폰.상태.id = ''; }
    if (이름 === '고객') { ZG.고객폰.상태.뷰 = '목록'; ZG.고객폰.상태.키 = ''; }
    ZG.주문.다시그리기();
  }

  function 폰모듈() { return 켜짐 === '고객' ? ZG.고객폰 : ZG.견적폰; }
  function PC모듈() { return 켜짐 === '고객' ? ZG.고객PC : ZG.견적PC; }

  function 탭줄(폰) {
    var 줄 = 만들기('div', { class: 폰 ? 'subtabs' : 'pc-tabs', role: 'tablist' });
    [['주문 조회', '주문'], ['견적 요청', '견적'], ['고객', '고객']].forEach(function (쌍) {
      var 켬 = 켜짐 === 쌍[1];
      var b = 만들기('button', {
        type: 'button', role: 'tab', text: 쌍[0],
        class: 켬 ? 'on' : '', 'aria-selected': 켬 ? 'true' : 'false'
      });
      b.addEventListener('click', function () { 탭으로(쌍[1]); });
      줄.appendChild(b);
    });
    return 줄;
  }

  /* PC — 길 안내를 고쳐 쓰고, 이 탭에서 쓸 수 없는 머리줄 버튼은 감춘다 */
  function PC머리() {
    var 길 = document.querySelector('.pc-head .path');
    if (길) {
      if (켜짐 === '고객') {
        var 그사람 = ZG.고객PC.상태.뷰 === '상세' ? ZG.고객자료.하나(ZG.고객PC.상태.키) : null;
        길.textContent = '주문 관리 › 고객' + (그사람 ? ' › ' + (그사람.이름 || '') : '');
      } else {
        길.textContent = '주문 관리 › 견적 요청' + (ZG.견적PC.상태.수정id ? ' › 수정' : '');
      }
    }
    var 버튼들 = document.querySelector('.pc-head .headbtns');
    if (버튼들) 버튼들.hidden = true;
  }

  /* 폰 — 제목과 요약줄. 목록 뷰에는 요약줄이 없어서 여기서 만들어 끼운다 */
  function 폰머리(본문) {
    var 모듈 = 폰모듈();
    var 제목 = document.querySelector('.ph-shell .ph-top h1');
    if (제목) 제목.textContent = 모듈.제목();

    var 요약 = 모듈.요약();
    var 줄 = document.querySelector('.ph-shell .ph-sub');
    if (!줄) {
      줄 = 만들기('div', { class: 'ph-sub' });
      본문.parentNode.insertBefore(줄, 본문);
    }
    u.비우기(줄);

    var 왼 = 만들기('span');
    if (모듈.상태.뷰 !== '목록') {
      // 안쪽 화면에서 목록으로. history.pushState 는 쓰지 않는다 — 주문 상세의 popstate 와 엉킨다
      var 뒤 = 만들기('button', {
        class: 'back', type: 'button', text: 켜짐 === '고객' ? '‹ 고객' : '‹ 견적 요청'
      });
      뒤.addEventListener('click', function () { 모듈.목록으로(); });
      왼.appendChild(뒤);
    } else {
      왼.innerHTML = 요약.왼 || '';
    }
    줄.appendChild(왼);
    줄.appendChild(만들기('span', { html: 요약.오 || '' }));
  }

  /* 주문 조회 말고 다른 뷰(수동주문·출고리스트·주문상세)에는 탭줄이 없다 */
  function 가로채기(본문, 뷰이름) {
    if (뷰이름 !== '목록') return false;
    var 폰 = u.폰인가();

    // 시안 폰 안쪽 화면(등록·상세)에는 탭줄이 없다. 달아 두면 적던 값이 탭 한 번에 빈칸이 된다
    var 안쪽 = 폰 && 켜짐 !== '주문' && 폰모듈().상태.뷰 !== '목록';
    if (!안쪽) {
      if (폰) 본문.insertBefore(탭줄(true), 본문.firstChild);
      else 본문.parentNode.insertBefore(탭줄(false), 본문);
    }

    if (켜짐 === '주문') return false;

    if (폰) { 폰머리(본문); 폰모듈().그리기(본문); }
    else { PC머리(); PC모듈().그리기(본문); }
    return true;
  }

  ZG.견적탭 = { 가로채기: 가로채기, 탭으로: 탭으로, 지금탭: function () { return 켜짐; } };
})(window.ZG);
