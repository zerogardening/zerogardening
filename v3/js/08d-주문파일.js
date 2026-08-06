/* 08d-주문파일 — 엑셀 입출력 공용 자리 (2단계 설계 §7 · 6단계-4 설계 §1)
   ① 카페24 → 로젠 은 아직 자리만 두었다 — 실제 양식을 눈으로 보기 전에 칸 이름을 지어내면 파일이 통째로 어긋난다.
   ② 로젠 출력완료 → 배송완료 는 08f(자료)·08g(화면)로 나갔고 여기엔 입구와 공용 도구만 남는다. */
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

  function 배송완료() {
    if (ZG.배송완료창) ZG.배송완료창.열기();
    else u.토스트('배송완료 변환을 못 읽었습니다 — js/08g-배송완료창.js 를 확인해 주세요.');
  }

  /* ══ 엑셀 입력 공용 (6단계-4 설계 §2) ══ */

  /* 파일 하나 고르기. input 은 화면에 남기지 않는다 — 창을 다시 그릴 때마다 쌓인다 */
  function 파일고르기(옵션, 그때) {
    var 칸 = document.createElement('input');
    칸.type = 'file';
    칸.accept = (옵션 && 옵션.확장자) || '.xls,.xlsx';
    칸.style.display = 'none';
    칸.addEventListener('change', function () {
      var 것 = 칸.files && 칸.files[0];
      칸.remove();
      if (것) 그때(것);
    });
    document.body.appendChild(칸);
    칸.click();
  }

  /* 첫 시트를 2차원 배열로. 그때({ok, 오류, 행들, 시트}) */
  function 시트배열(파일, 그때) {
    if (!준비됐나()) { 그때({ ok: false, 오류: '엑셀 도구를 못 읽었습니다 — js/lib/xlsx.min.js 를 확인해 주세요.' }); return; }
    var 읽개 = new FileReader();
    읽개.onerror = function () { 그때({ ok: false, 오류: '파일을 못 읽었습니다.' }); };
    읽개.onload = function (e) {
      try {
        var 책 = XLSX.read(new Uint8Array(e.target.result), { type: 'array' });
        var 이름 = 책.SheetNames[0];
        /* 🔴 raw:true — raw:false 는 서식을 입힌 글자를 줘서 숫자 칸에 천단위 쉼표가 붙는다.
           blankrows:false 는 빈 줄을 지워 행 번호를 밀어 버린다 (6단계-4 설계 §2) */
        var 행들 = XLSX.utils.sheet_to_json(책.Sheets[이름], { header: 1, defval: '', raw: true });
        그때({ ok: true, 오류: '', 행들: 행들, 시트: 이름 });
      } catch (err) {
        console.warn('엑셀 열기 실패', err);
        그때({ ok: false, 오류: '엑셀 파일을 여는 데 실패했습니다 — 파일이 손상됐거나 엑셀 파일이 아닙니다.' });
      }
    };
    읽개.readAsArrayBuffer(파일);
  }

  /* 엑셀 열 이름으로 값 꺼내기 — 칸(행, 'S'). 설계서가 열을 알파벳으로 적어 뒀다 */
  function 칸(행, 열이름) {
    var 자리 = 0;
    String(열이름).toUpperCase().split('').forEach(function (c) { 자리 = 자리 * 26 + (c.charCodeAt(0) - 64); });
    var v = (행 || [])[자리 - 1];
    return v == null ? '' : v;
  }

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

  ZG.주문파일 = {
    카페24로젠: 카페24로젠, 배송완료: 배송완료, 내려받기: 내려받기,
    파일고르기: 파일고르기, 시트배열: 시트배열, 칸: 칸, 준비됐나: 준비됐나
  };
})(window.ZG);
