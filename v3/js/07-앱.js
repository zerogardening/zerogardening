/* 07-앱 — 부팅 · 뼈대 · 탭 전환 (설계 §4 · §8-4 · §8-5) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 탭들 = [
    { 이름: '입고', 아이콘: '🌿', 모듈: function () { return ZG.입고; } },
    { 이름: '재고', 아이콘: '📦', 모듈: function () { return ZG.재고; } }
  ];
  // 「명세서 발행」은 업체 관리 안 세 번째 탭이 됐다 — 왼쪽 메뉴는 4개다 (3단계 설계)
  var 지금 = '입고';
  var 뿌리, 본문;

  function 해시읽기() {
    var h = decodeURIComponent(location.hash.replace('#', ''));
    return (h === '재고' || h === '입고') ? h : null;
  }

  function 현재모듈() { return 지금 === '재고' ? ZG.재고 : ZG.입고; }

  function 머리정보() {
    var m = 현재모듈();
    if (m.머리) return m.머리();
    var 요 = m.요약 ? m.요약() : { 왼: '', 오: '' };
    return { 제목: 지금, 뒤로: null, 왼: 요.왼, 오: 요.오 };
  }

  /* ── PC 뼈대 ── */
  function PC뼈대() {
    var 옆 = 만들기('aside', { class: 'pc-side' });
    옆.appendChild(만들기('div', { class: 'logo', text: '제로가드닝' }));
    옆.appendChild(만들기('div', { class: 'slogan', text: 'GARDENING FROM ZERO' }));
    옆.appendChild(만들기('button', { class: 'on', type: 'button', html: '<span class="ic">🌿</span>상품' }));
    var 주문메뉴 = 만들기('button', { type: 'button', html: '<span class="ic">🛒</span>주문 관리' });
    주문메뉴.addEventListener('click', function () { location.href = '주문.html'; });
    옆.appendChild(주문메뉴);
    var 업체메뉴 = 만들기('button', { type: 'button', html: '<span class="ic">🏢</span>업체 관리' });
    업체메뉴.addEventListener('click', function () { location.href = '업체.html'; });
    옆.appendChild(업체메뉴);
    var 소싱메뉴 = 만들기('button', { type: 'button', html: '<span class="ic">🌱</span>상품소싱' });
    소싱메뉴.addEventListener('click', function () { location.href = '소싱.html'; });
    옆.appendChild(소싱메뉴);

    var 머리 = 만들기('div', { class: 'pc-head' }, [
      만들기('h2', { text: '상품' }),
      만들기('div', { class: 'path', text: '상품 › ' + 지금 })
    ]);

    var 탭 = 만들기('div', { class: 'pc-tabs', role: 'tablist' });
    var 알약 = 만들기('i', { class: 'ind' });
    탭.appendChild(알약);
    var 단추들 = 탭들.map(function (t) {
      var b = 만들기('button', {
        type: 'button', role: 'tab', text: t.이름,
        'aria-selected': t.이름 === 지금 ? 'true' : 'false',
        class: t.이름 === 지금 ? 'on' : ''
      });
      b.addEventListener('click', function () { 탭으로(t.이름); });
      탭.appendChild(b);
      return b;
    });

    본문 = 만들기('div', { class: 'pc-본문' });
    var 주 = 만들기('div', { class: 'pc-main' }, [머리, 탭, 본문]);
    뿌리.appendChild(만들기('div', { class: 'shell' }, [옆, 주]));

    // 알약을 켜진 탭 자리로
    var 켜짐 = 단추들[탭들.findIndex(function (t) { return t.이름 === 지금; })];
    requestAnimationFrame(function () {
      알약.style.width = 켜짐.offsetWidth + 'px';
      알약.style.transform = 'translateX(' + (켜짐.offsetLeft - 2) + 'px)';
    });
  }

  /* ── 폰 뼈대 ── */
  function 폰뼈대() {
    var 정보 = 머리정보();
    var 위 = 만들기('div', { class: 'ph-top' });
    var 왼쪽 = 만들기('div');
    if (정보.뒤로) {
      // 제목이 없는 화면은 뒤로가기가 유일한 길잡이다 — 크게 뽑는다 (8/6 우람님)
      var 뒤 = 만들기('button', {
        class: 'ph-back' + (정보.제목 ? '' : ' 큼'), type: 'button',
        text: '‹ ' + (정보.뒤로글 || '재고 목록')
      });
      뒤.addEventListener('click', 정보.뒤로);
      왼쪽.appendChild(뒤);
    }
    if (정보.제목) 왼쪽.appendChild(만들기('h1', { text: 정보.제목, style: 정보.작게 ? 'font-size:22px' : null }));
    위.appendChild(왼쪽);

    var 아래 = (정보.왼 || 정보.오) ? 만들기('div', { class: 'ph-sub' }, [
      만들기('span', { html: 정보.왼 }), 만들기('span', { html: 정보.오 })
    ]) : null;

    본문 = 만들기('div', { class: 'ph-body' });

    var 바 = 만들기('nav', { class: 'ph-nav' });
    탭들.forEach(function (t) {
      var b = 만들기('button', {
        type: 'button', class: t.이름 === 지금 ? 'on' : '',
        html: '<span class="ic">' + t.아이콘 + '</span>' + t.이름
      });
      b.addEventListener('click', function () { 탭으로(t.이름); });
      바.appendChild(b);
    });
    var 주문탭 = 만들기('button', { type: 'button', html: '<span class="ic">🛒</span>주문' });
    주문탭.addEventListener('click', function () { location.href = '주문.html'; });
    바.appendChild(주문탭);
    var 더보기 = 만들기('button', { type: 'button', html: '<span class="ic">⋯</span>더보기' });
    더보기.addEventListener('click', function () { u.더보기시트(''); });
    바.appendChild(더보기);

    뿌리.appendChild(만들기('div', { class: 'ph-shell' }, [위, 아래, 본문, 바]));
  }

  function 다시그리기() {
    u.비우기(뿌리);
    if (u.폰인가()) 폰뼈대(); else PC뼈대();
    현재모듈().그리기(본문);
    if (u.폰인가()) 요약다시();
  }

  /* 폰 위쪽 요약줄만 다시 — 저장 뒤 숫자가 바뀔 때 */
  function 요약다시() {
    if (!u.폰인가()) return;
    var 정보 = 머리정보();
    var 줄 = 뿌리.querySelector('.ph-sub');
    if (!줄) return;
    줄.children[0].innerHTML = 정보.왼;
    줄.children[1].innerHTML = 정보.오;
  }

  function 탭으로(이름) {
    if (location.hash === '#' + 이름) { 지금 = 이름; 다시그리기(); return; }
    location.hash = '#' + 이름;
  }

  function 해시바뀜() {
    var 새것 = 해시읽기();
    if (!새것) 새것 = '입고';
    if (새것 === 지금) return;
    지금 = 새것;
    ZG.저장소.설정쓰기({ 마지막탭: 지금 });
    다시그리기();
  }

  function 시작() {
    뿌리 = document.getElementById('앱');
    ZG.저장소.부팅();
    지금 = 해시읽기() || ZG.저장소.설정읽기().마지막탭 || '입고';
    if (!location.hash) location.hash = '#' + 지금;
    다시그리기();

    window.addEventListener('hashchange', 해시바뀜);
    u.폰질의.addEventListener('change', 다시그리기);
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf('zg.v3.') === 0) 다시그리기();
    });
  }

  ZG.앱 = { 시작: 시작, 다시그리기: 다시그리기, 요약다시: 요약다시 };
  document.addEventListener('DOMContentLoaded', 시작);
})(window.ZG);
