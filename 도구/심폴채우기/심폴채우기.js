/* 심폴(simpol.co.kr) 「판매상품관리 > 상품 등록」 화면에서 값을 채운다 (2026-09-14 우람님 규칙).

   판매가격 = 매입가 × 2  → 100원 반올림
   수량     = 100

   🔴 심폴은 배송비가 **별도**다 — 쿠팡처럼 상품가에 4,500원을 녹이거나 ×1.1 하지 않는다.
      쿠팡 규칙(`(상품가+4,500)×1.1` 무료배송)과 섞으면 심폴 값이 통째로 비싸진다.
   🔴 소비자가격은 안 건드린다 — 심폴이 「0 입력시 표시하지 않습니다」라고 적어둔 칸이다.
   🔴 등록 버튼은 누르지 않는다. 값만 채우고 멈춘다 — 확인은 우람님이 하신다.
*/
(function () {
  'use strict';
  var 재고 = 100;

  function 글(v) { return String(v == null ? '' : v); }
  function 돈(n) { return n.toLocaleString(); }
  function 판매가(매입) { return Math.round(매입 * 2 / 100) * 100; }

  function 넣기(el, v) {
    el.value = String(v);
    ['input', 'change', 'blur'].forEach(function (e) {
      el.dispatchEvent(new Event(e, { bubbles: true }));
    });
  }

  /* 라벨 칸을 찾아 바로 옆 칸의 입력상자를 준다.
     🔴 「판매가격」과 「소비자가격」이 둘 다 '가격'으로 끝난다 — 부분일치로 찾으면 엉뚱한 칸에 값이 들어간다.
        반드시 통째로 맞춘다. 라벨 앞에는 필수표시(✔)가 붙으므로 떼고 본다. */
  function 칸(라벨) {
    var 셀들 = [].slice.call(document.querySelectorAll('td,th'));
    for (var i = 0; i < 셀들.length; i++) {
      var 이름 = 글(셀들[i].innerText).replace(/\s/g, '').replace(/[✔✓*]/g, '');
      if (이름 !== 라벨) continue;
      var 다음 = 셀들[i].nextElementSibling;
      if (!다음) continue;
      var el = 다음.querySelector('input[type=text],input[type=number],input:not([type])');
      if (el) return el;
    }
    return null;
  }

  var 가격칸 = 칸('판매가격');
  if (!가격칸) {
    alert('판매가격 칸을 못 찾았습니다.\n\n「판매상품관리 > 상품 등록」 화면인지 확인해주세요.\n'
      + '화면이 바뀐 것 같으면 Node에게 알려주세요.');
    return;
  }

  var 매입 = parseInt((prompt('매입가? (숫자만)\n\n판매가격 = 매입가 × 2 로 채웁니다.', '') || '').replace(/\D/g, ''), 10);
  if (!매입) return;

  var 값 = 판매가(매입);
  넣기(가격칸, 값);

  var 수량칸 = 칸('수량'), 수량글 = '';
  if (수량칸) { 넣기(수량칸, 재고); 수량글 = '\n수량 ' + 재고 + '개'; }

  alert('채웠습니다 — 매입 ' + 돈(매입) + '원\n\n판매가격 ' + 돈(값) + '원' + 수량글
    + '\n\n소비자가격은 안 건드렸습니다 (0 이면 표시되지 않습니다).'
    + '\n\n🔴 상품명·카테고리·사진은 손으로 채우시고, 확인하신 뒤 직접 등록해주세요.');
})();
