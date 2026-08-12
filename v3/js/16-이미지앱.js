/* 16-이미지앱 — 이미지.html 셸. 상품 상세페이지·대표이미지를 통합관리 안에서 고친다.
   패턴은 14-소싱앱과 같다. 다른 것은 본문이 「맥에서 도는 편집기」를 그대로 얹은 창이라는 점뿐이다.

   🔴 자료를 받아오지 않는다 — 창만 얹는다.
      통합관리는 https 이고 편집기는 http://127.0.0.1 이다. 브라우저는 127.0.0.1 을 안전한 자리로
      쳐서 창은 막지 않지만, 자료를 받아오려 들면 사설망 검사에 걸릴 여지가 있다.
      상품 고르기·자동완성·저장은 전부 편집기 안(같은 자리)에서 돈다.

   🔴 편집기가 꺼져 있으면 창이 빈다. 그때는 터미널에 「상품이미지」 한 낱말이다.
      (자동 실행은 아직 안 붙였다 — 2026-08-11) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 뿌리;
  var 편집기 = 'http://127.0.0.1:8765/';

  function 창() {
    var 틀 = 만들기('div', { class: 'img-틀' });
    var 창 = 만들기('iframe', { class: 'img-창', src: 편집기, title: '상품 이미지 편집기' });
    var 덧 = 만들기('div', { class: 'img-덧' });
    덧.innerHTML = '아래가 비어 있으면 편집기가 꺼져 있는 것입니다 — ' +
                   '맥 터미널에 <b>상품이미지</b> 한 낱말을 치시고 이 화면을 새로 고쳐주세요.';
    틀.appendChild(덧);
    틀.appendChild(창);
    return 틀;
  }

  /* ── PC ── 왼쪽 메뉴는 다섯이다 */
  function PC뼈대() {
    var 옆 = 만들기('aside', { class: 'pc-side' }, [
      만들기('div', { class: 'logo', text: '제로가드닝' }),
      만들기('div', { class: 'slogan', text: 'GARDENING FROM ZERO' })
    ]);
    [['🌿', '상품', 'index.html'], ['🛒', '주문 관리', '주문.html'],
     ['🏢', '업체 관리', '업체.html'], ['🌱', '상품소싱', '소싱.html']]
      .forEach(function (셋) {
        var b = 만들기('button', { type: 'button', html: '<span class="ic">' + 셋[0] + '</span>' + 셋[1] });
        b.addEventListener('click', function () { location.href = 셋[2]; });
        옆.appendChild(b);
      });
    옆.appendChild(만들기('button', { type: 'button', class: 'on', html: '<span class="ic">🖼</span>상품 이미지' }));

    var 머리 = 만들기('div', { class: 'pc-head' }, [
      만들기('h2', { text: '상품 이미지' }),
      만들기('div', { class: 'path', text: '상품 이미지 › 상세페이지 · 대표이미지 고치기' })
    ]);

    var 본문 = 만들기('div', { class: 'pc-본문' }, [창()]);
    뿌리.appendChild(만들기('div', { class: 'shell' }, [옆, 만들기('div', { class: 'pc-main' }, [머리, 본문])]));
  }

  /* ── 폰 ── 여기서 할 일이 아니다. 사진을 보며 글자를 고치는 화면이라 좁으면 못 쓴다 */
  function 폰뼈대() {
    var 판 = 만들기('div', { class: 'ph-wrap' }, [
      만들기('div', { class: 'ph-head' }, [만들기('h2', { text: '상품 이미지' })])
    ]);
    var 말 = 만들기('div', { class: 'img-덧 img-폰' });
    말.innerHTML = '이 화면은 <b>PC에서</b> 쓰십니다.<br>' +
                   '사진을 보면서 글자를 고치는 자리라 폰에서는 좁습니다.';
    판.appendChild(말);
    뿌리.appendChild(판);
  }

  function 다시그리기() {
    u.비우기(뿌리);
    if (u.폰인가()) 폰뼈대(); else PC뼈대();
  }

  function 시작() {
    뿌리 = document.getElementById('앱');
    다시그리기();
    u.폰질의.addEventListener('change', 다시그리기);
  }

  ZG.이미지앱 = { 시작: 시작, 다시그리기: 다시그리기 };
  document.addEventListener('DOMContentLoaded', 시작);
})(window.ZG);
