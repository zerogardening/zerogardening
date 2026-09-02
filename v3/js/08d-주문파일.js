/* 08d-주문파일 — 엑셀 입출력 공용 자리 (2단계 설계 §7 · 6단계-4 설계 §1)
   ① 카페24 → 로젠 은 아직 자리만 두었다 — 실제 양식을 눈으로 보기 전에 칸 이름을 지어내면 파일이 통째로 어긋난다.
   ② 로젠 출력완료 → 배송완료 는 08f(자료)·08g(화면)로 나갔고 여기엔 입구와 공용 도구만 남는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 자 = null;

  var 못읽음 = '엑셀 도구를 못 읽었습니다 — js/lib/xlsx.min.js 를 확인해 주세요.';

  /* 창이 이미 열린 뒤의 안전망이다. 입구는 아래 준비되면() 이 지킨다 */
  function 준비됐나() {
    if (window.XLSX) return true;
    u.토스트(못읽음);
    return false;
  }

  /* ── 엑셀 도구를 눌렀을 때 아직 안 와 있으면 기다렸다 이어서 한다 (우람님 9/2) ──
     🔴 주문.html 이 xlsx(952KB)를 async 로 받는다. 튕겨 버리면 화면 뜨자마자 누르신 분만
        「못 읽었습니다」를 보시게 된다 — 조금 뒤엔 멀쩡히 되는데도.
     🔴 페이지의 async 태그를 지켜보지 않고 **우리가 직접 한 벌 더 부른다.**
        아직 오는 중이면 브라우저가 같은 주소를 합쳐 주고, 이미 실패했으면 이게 곧 재시도다.
        태그에 매달리면 우리가 붙기 전에 끝나 버린 실패를 영영 못 듣는다. */
  var 기다리는것 = [], 부르는중 = false;

  function 다받았다() {
    부르는중 = false;
    var 할일들 = 기다리는것;
    기다리는것 = [];
    if (!window.XLSX) { u.토스트(못읽음); return; }
    할일들.forEach(function (f) { f(); });
  }

  function 준비되면(할일) {
    if (window.XLSX) { 할일(); return; }
    기다리는것.push(할일);
    if (부르는중) return;
    부르는중 = true;
    u.토스트('엑셀 도구를 불러오는 중입니다…');
    var s = document.createElement('script');
    s.src = 'js/lib/xlsx.min.js';
    s.onload = 다받았다;
    s.onerror = 다받았다;
    document.body.appendChild(s);
  }

  function 카페24로젠() {
    if (ZG.주문올리기) ZG.주문올리기.열기();
    else u.토스트('주문 올리기를 못 읽었습니다 — js/08h-주문올리기.js 를 확인해 주세요.');
  }

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

  /* 첫 시트를 2차원 배열로. 그때({ok, 오류, 행들, 시트})
     🔴 옵션은 없어도 된다 — 인자를 안 주면 지금까지와 완전히 같이 동작한다(08f·08g 가 그대로 탄다) */
  function 시트배열(파일, 그때, 옵션) {
    if (!준비됐나()) { 그때({ ok: false, 오류: '엑셀 도구를 못 읽었습니다 — js/lib/xlsx.min.js 를 확인해 주세요.' }); return; }
    var 읽개 = new FileReader();
    읽개.onerror = function () { 그때({ ok: false, 오류: '파일을 못 읽었습니다.' }); };
    읽개.onload = function (e) {
      try {
        var 설정 = { type: 'array' };
        // 카페24 xlsx 는 발주일이 날짜 셀일 수 있다 — 안 켜면 46000 이 1970-01-01 이 된다
        if (옵션 && 옵션.cellDates) 설정.cellDates = true;
        var 책 = XLSX.read(new Uint8Array(e.target.result), 설정);
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

  /* 확장자를 보고 알아서 갈라 읽는다. csv·xlsx 둘 다 같은 모양(2차원 배열)으로 돌려준다.
     🔴 파싱을 SheetJS 하나로 모은 이유 — 카페24 주소에 쉼표가 흔하다.
        따옴표 안의 쉼표·줄바꿈은 손파서보다 낫고, xlsx 경로와 코드가 하나가 된다 */
  function 읽기(파일, 그때) {
    if (!/\.csv$/i.test((파일 && 파일.name) || '')) { 시트배열(파일, 그때, { cellDates: true }); return; }
    if (!준비됐나()) { 그때({ ok: false, 오류: '엑셀 도구를 못 읽었습니다 — js/lib/xlsx.min.js 를 확인해 주세요.' }); return; }

    var 읽개 = new FileReader();
    읽개.onerror = function () { 그때({ ok: false, 오류: '파일을 못 읽었습니다.' }); };
    읽개.onload = function (e) {
      try {
        // raw:true 가 없으면 우편번호 04524 가 숫자 4524 가 되고 판매가에 서식이 붙는다
        var 책 = XLSX.read(글자로(new Uint8Array(e.target.result)), { type: 'string', raw: true });
        var 이름 = 책.SheetNames[0];
        var 행들 = XLSX.utils.sheet_to_json(책.Sheets[이름], { header: 1, defval: '', raw: true });
        그때({ ok: true, 오류: '', 행들: 행들, 시트: 이름 });
      } catch (err) {
        console.warn('CSV 열기 실패', err);
        그때({ ok: false, 오류: 'CSV 파일을 여는 데 실패했습니다 — 파일이 손상된 것 같습니다.' });
      }
    };
    읽개.readAsArrayBuffer(파일);
  }

  /* 🔴 fatal:true 가 바이트로 판정한다 — 정규식 추측보다 정확하다.
     🔴 UTF-8 BOM(U+FEFF)을 안 떼면 첫 머리글이 `﻿쇼핑몰`이 돼 매핑이 통째로 어긋난다. 실물에 실제로 있다 */
  function 글자로(바이트) {
    var 글;
    try { 글 = new TextDecoder('utf-8', { fatal: true }).decode(바이트); }
    catch (e) { 글 = new TextDecoder('euc-kr').decode(바이트); }
    return 글.charCodeAt(0) === 0xFEFF ? 글.slice(1) : 글;
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
    /* 엑셀이 아직 안 왔으면 기다렸다 저 스스로 다시 불린다 (08d.준비되면) */
    if (!window.XLSX) { 준비되면(function () { 내려받기(줄들); }); return; }
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
    파일고르기: 파일고르기, 시트배열: 시트배열, 읽기: 읽기, 칸: 칸,
    준비됐나: 준비됐나, 준비되면: 준비되면
  };
})(window.ZG);
