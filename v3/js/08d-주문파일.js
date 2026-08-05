/* 08d-주문파일 — 엑셀 (2단계 설계 §7)
   ① 카페24 → 로젠 · ② 로젠 출력완료 → 배송완료 는 자리만 두었다.
   실제 엑셀 세 개(카페24 주문 내려받기 · 로젠 대량등록 양식 · 로젠 출력완료)를 눈으로 보기 전에
   칸 이름을 지어내면 파일이 통째로 어긋난다. 양식을 받은 뒤 여기에 매핑을 붙인다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 자 = null;
  var 아직 = '실제 엑셀 양식을 받은 뒤 연결합니다.';

  function 준비됐나() {
    if (window.XLSX) return true;
    u.토스트('엑셀 도구를 못 읽었습니다 — js/lib/xlsx.min.js 를 확인해 주세요.');
    return false;
  }

  function 카페24로젠() { u.토스트('카페24 → 로젠 파일 — ' + 아직); }
  function 배송완료() { u.토스트('로젠 → 배송완료 파일 — ' + 아직); }

  /* ③ 화면 표 그대로 내려받기 */
  function 내려받기(줄들) {
    if (!준비됐나()) return;
    자 = 자 || ZG.주문자료;
    if (!줄들 || !줄들.length) { u.토스트('내려받을 주문이 없습니다.'); return; }

    var 표 = [['받는 분', '전화', '주소', '주문한 곳', '품목코드', '품목', '규격', '수량', '단가', '금액']];
    줄들.forEach(function (r) {
      표.push([
        r.수령인 || '', r.수령인전화 || '', r.수령인주소 || '', r.판매처 || '',
        r.품목코드 || r.원본코드 || '', r.유통명 || '', r.규격 || '',
        자.수량(r), Number(r.단가) || 0, 자.금액(r)
      ]);
    });

    var 종이 = XLSX.utils.aoa_to_sheet(표);
    var 책 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(책, 종이, '주문');
    var 날 = (ZG.주문 && ZG.주문.상태.부터) || u.오늘문자();
    XLSX.writeFile(책, '주문_' + 날 + '.xlsx');
    u.토스트(줄들.length + '줄을 내려받았습니다.');
  }

  ZG.주문파일 = { 카페24로젠: 카페24로젠, 배송완료: 배송완료, 내려받기: 내려받기 };
})(window.ZG);
