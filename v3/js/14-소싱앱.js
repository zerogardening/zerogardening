/* 14-소싱앱 — 소싱.html 셸. 2탭 라우팅 · 폭 전환 (4단계 설계 §5)
   패턴은 12-업체앱과 같다. 다른 것은 탭이 둘이고, 분류 탭에 「연폴더」가 하나 더 있다는 것뿐이다.
   연폴더: 폴더 이름 | ''(미분류) | null(폴더 목록). 폰에서만 목록/안을 오간다 — PC는 늘 좌우분할이다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 뿌리, 본문;
  var 탭 = '검색';        // 검색 · 분류
  var 연폴더값 = null;

  var 탭이름 = { 검색: '키워드 검색', 분류: '상품분류' };

  function 지금모듈() { return 탭 === '검색' ? ZG.키워드검색 : ZG.상품분류; }

  function 길() {
    var 뒤 = '';
    if (탭 === '분류') {
      // PC는 늘 좌우분할이라 아무것도 안 열려 있어도 보고 있는 폴더가 있다
      var v = u.폰인가() ? 연폴더값 : ZG.상품분류.보는폴더();
      if (v != null) 뒤 = ' › ' + (v === '' ? '미분류' : v);
    }
    return '상품소싱 › ' + 탭이름[탭] + 뒤;
  }

  /* ── PC ── 왼쪽 메뉴는 4개다. 「명세서 발행」은 업체 관리 안 탭이 됐다 */
  function PC뼈대() {
    var 옆 = 만들기('aside', { class: 'pc-side' }, [
      만들기('div', { class: 'logo', text: '제로가드닝' }),
      만들기('div', { class: 'slogan', text: 'GARDENING FROM ZERO' })
    ]);
    [['🌿', '상품', 'index.html'], ['🛒', '주문 관리', '주문.html'], ['🏢', '업체 관리', '업체.html']]
      .forEach(function (셋) {
        var b = 만들기('button', { type: 'button', html: '<span class="ic">' + 셋[0] + '</span>' + 셋[1] });
        b.addEventListener('click', function () { location.href = 셋[2]; });
        옆.appendChild(b);
      });
    옆.appendChild(만들기('button', { type: 'button', class: 'on', html: '<span class="ic">🌱</span>상품소싱' }));

    var 머리 = 만들기('div', { class: 'pc-head' }, [
      만들기('h2', { text: '상품소싱' }), 만들기('div', { class: 'path', text: 길() })
    ]);

    var 탭줄 = 만들기('div', { class: 'pc-tabs', role: 'tablist' });
    ['검색', '분류'].forEach(function (이름) {
      var b = 만들기('button', {
        type: 'button', role: 'tab', text: 탭이름[이름],
        class: 탭 === 이름 ? 'on' : '', 'aria-selected': 탭 === 이름 ? 'true' : 'false'
      });
      b.addEventListener('click', function () { 탭으로(이름); });
      탭줄.appendChild(b);
    });

    본문 = 만들기('div', { class: 'pc-본문' });
    뿌리.appendChild(만들기('div', { class: 'shell' }, [옆, 만들기('div', { class: 'pc-main' }, [머리, 탭줄, 본문])]));
  }

  /* ── 폰 ── 아래 탭바는 늘리지 않는다. 소싱은 「더보기」 안이다 (시안 결정) */
  function 폰뼈대() {
    var 정보 = 지금모듈().요약 ? 지금모듈().요약() : { 왼: '', 오: '' };
    var 폴더안 = 탭 === '분류' && 연폴더값 != null;

    var 왼쪽 = 만들기('div', { class: '왼', style: 'min-width:0' });
    var 뒤 = 만들기('button', { class: 'ph-back', type: 'button', text: '‹', 'aria-label': '뒤로' });
    뒤.addEventListener('click', function () {
      if (폴더안) 폴더열기(null); else location.href = 'index.html';
    });
    왼쪽.appendChild(뒤);
    왼쪽.appendChild(만들기('h1', {
      text: 폴더안 ? (연폴더값 === '' ? '🗂 미분류' : '📁 ' + 연폴더값) : '상품소싱'
    }));

    var 위 = 만들기('div', { class: 'ph-top' }, [왼쪽]);
    if (폴더안 && 연폴더값 !== '') {
      var 이름b = 만들기('button', { class: 'pcbtn', type: 'button', text: '이름 바꾸기' });
      이름b.addEventListener('click', function () { ZG.상품분류.이름바꾸기(연폴더값); });
      위.appendChild(이름b);
    }

    var 아래 = 만들기('div', { class: 'ph-sub' }, [
      만들기('span', { html: 정보.왼 || '' }), 만들기('span', { html: 정보.오 || '' })
    ]);

    본문 = 만들기('div', { class: 'ph-body', style: 'gap:var(--space-lg)' });
    if (!폴더안) {
      var 탭줄 = 만들기('div', { class: 'toggle', style: 'height:36px' });
      ['검색', '분류'].forEach(function (이름) {
        var b = 만들기('button', {
          type: 'button', class: 탭 === 이름 ? 'on' : '', text: 탭이름[이름], style: 'flex:1; padding:0'
        });
        b.addEventListener('click', function () { 탭으로(이름); });
        탭줄.appendChild(b);
      });
      본문.appendChild(탭줄);
    }

    var 바 = 만들기('nav', { class: 'ph-nav' });
    [['🌿', '상품', 'index.html#입고'], ['📦', '재고', 'index.html#재고'], ['🛒', '주문', '주문.html']]
      .forEach(function (셋) {
        var b = 만들기('button', { type: 'button', html: '<span class="ic">' + 셋[0] + '</span>' + 셋[1] });
        b.addEventListener('click', function () { location.href = 셋[2]; });
        바.appendChild(b);
      });
    var 더보기 = 만들기('button', { type: 'button', class: 'on', html: '<span class="ic">⋯</span>더보기' });
    더보기.addEventListener('click', function () { u.더보기시트('소싱'); });
    바.appendChild(더보기);

    뿌리.appendChild(만들기('div', { class: 'ph-shell' }, [위, 아래, 본문, 바]));
  }

  function 다시그리기() {
    u.비우기(뿌리);
    if (u.폰인가()) 폰뼈대(); else PC뼈대();
    지금모듈().그리기(본문);
  }

  /* 폰 위쪽 요약줄만 다시 — ★로 담고 뺄 때마다 숫자가 바뀐다 */
  function 요약다시() {
    if (!u.폰인가()) return;
    var m = 지금모듈();
    if (!m.요약) return;
    var 정보 = m.요약();
    var 줄 = 뿌리.querySelector('.ph-sub');
    if (!줄) return;
    줄.children[0].innerHTML = 정보.왼 || '';
    줄.children[1].innerHTML = 정보.오 || '';
  }

  function 탭으로(이름) {
    탭 = 이름;
    if (이름 === '검색') 연폴더값 = null;
    다시그리기();
  }

  function 연폴더() { return 연폴더값; }

  function 폴더열기(이름) {
    탭 = '분류';
    연폴더값 = 이름;
    다시그리기();
  }

  function 시작() {
    뿌리 = document.getElementById('앱');
    ZG.저장소.부팅();
    다시그리기();
    u.폰질의.addEventListener('change', 다시그리기);
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf('zg.v3.') === 0) 다시그리기();
    });
  }

  ZG.소싱앱 = {
    시작: 시작, 다시그리기: 다시그리기, 요약다시: 요약다시,
    탭으로: 탭으로, 연폴더: 연폴더, 폴더열기: 폴더열기
  };
  document.addEventListener('DOMContentLoaded', 시작);
})(window.ZG);
