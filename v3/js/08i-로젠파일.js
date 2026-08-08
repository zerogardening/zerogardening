/* 08i-로젠파일 — 카페24 27칸을 로젠 대량등록 파일로 (계획서 §4 · 설계/엑셀변환-규칙.md 76~135행)
   🔴 열 순서는 카페24 원본 27칸 그대로. 바꾸는 칸은 E(상품명) · J(박스운임) · L(판매가) · Z(옵션추가) 넷뿐이다.
   🔴 머리글을 넣지 않는다 — 택배 프로그램이 1행도 데이터로 읽는다(④ 송장 업로드는 반대로 머리글이 있다).

   들어오는 항목 = { 원본:[27칸], 줄:주문레코드, id:저장된 주문줄 id 또는 '' }
   원본 27칸은 08h 가 메모리에 들고 있는 것이다. 저장소에는 없다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  /* 27칸 중 손대거나 읽어야 하는 자리 (0부터) */
  var C = {
    주문번호: 2, 발주일: 3, 상품명: 4, 옵션: 6, 자체품목코드: 7,
    결제업체: 9, 판매가: 11, 수량: 12, 수령인: 13, 우편번호: 14,
    수령지전화: 16, 전화번호: 17, 핸드폰: 18, 옵션추가: 25
  };

  function 글(v) { return String(v == null ? '' : v); }
  function 이름키(v) { return 글(v).normalize('NFC').replace(/\s/g, ''); }
  function 숫자만(v) { return 글(v).replace(/\D/g, ''); }
  function 자료() { return ZG.주문자료; }

  /* 27칸은 전부 문자열로 내보낸다 — `03022` 의 앞 0 이 살아야 한다 */
  function 문자(v) {
    if (v instanceof Date) return ZG.계산.날짜문자(v.getTime());
    return 글(v);
  }

  function cm뽑기(품목코드) {
    var m = 글(품목코드).match(/-(\d{1,3})$/);
    return m ? Number(m[1]) : 0;
  }

  /* 포트 크기 점수 — 0(모름)은 2점 */
  function 점수(cm) {
    if (!cm) return 2;
    if (cm <= 10) return 1;
    if (cm <= 15) return 2;
    if (cm <= 22) return 3;
    return 4;
  }

  /* ══ 합포장 묶기 ══
     🔴 08a.묶음키(이름+전화+주소)와 다르다. 주소 글자를 그대로 비교하면
        `( 목동, 신시가지5단지 )` 와 `( 목동 신시가지5단지 )` 가 다른 사람이 된다(규칙문서 85행) */
  function 그룹키(것, i) {
    var o = 것.원본;
    var 이 = 이름키(o[C.수령인]), 우 = 숫자만(o[C.우편번호]);
    if (!이 || !우) return '홀로#' + i;          // 이름·우편번호가 없으면 혼자 처리한다
    var 전 = 숫자만(o[C.핸드폰]) || 숫자만(o[C.전화번호]) || 숫자만(o[C.수령지전화]);
    return 이 + '|' + 우 + '|' + (/^050/.test(전) ? '__안심__' : 전);
  }

  function 그룹만들기(항목들) {
    var 순서 = [], 표 = {};
    (항목들 || []).forEach(function (것, i) {
      var k = 그룹키(것, i);
      var g = 표[k];
      if (!g) { g = 표[k] = { 키: k, 것들: [], 차례: 순서.length }; 순서.push(g); }
      g.것들.push(것);
    });
    return 순서;
  }

  /* ★재구매 — 이름+우편번호 기준, 같은 날 여러 주문은 1회. 2회차부터 표시한다.
     전화로는 사람을 못 가린다(안심번호) */
  function 재구매표() {
    var 표 = {};
    ZG.저장소.읽기(ZG.저장소.키.주문).forEach(function (r) {
      var 이 = 이름키(r.수령인), 우 = 숫자만(r.우편번호);
      if (!이 || !우 || !r.주문일) return;
      var k = 이 + '|' + 우;
      (표[k] = 표[k] || {})[r.주문일] = 1;
    });
    return 표;
  }

  /* 한 송장 안에 같은 사람이 여럿이면 가장 큰 회차로 통일한다 */
  function 회차값(g, 표) {
    var 최대 = 0;
    g.것들.forEach(function (것) {
      var o = 것.원본;
      var k = 이름키(o[C.수령인]) + '|' + 숫자만(o[C.우편번호]);
      var 날들 = 표[k];
      var n = 날들 ? Object.keys(날들).length : 0;
      if (n > 최대) 최대 = n;
    });
    return 최대;
  }

  /* ══ 줄 순서 = 작업자가 포장하는 순서 (규칙문서 113~123행) ══ */
  function 갈래(g) {
    if (g.것들.length > 1) return 4;                       // 복수건 — 롤골판지
    var cm = cm뽑기(g.것들[0].줄.품목코드);
    if (cm >= 15) return g.총수량 <= 1 ? 1 : 2;            // 전용박스 1개 / 여러개
    return 3;                                              // 15cm 미만 · 크기 모름
  }

  function 재기(그룹들) {
    그룹들.forEach(function (g) {
      var 총 = 0, 최소 = 0, 점 = 0;
      g.것들.forEach(function (것) {
        var 수 = 자료().수량(것.줄);
        var cm = cm뽑기(것.줄.품목코드);
        총 += 수;
        점 += 점수(cm) * 수;
        if (cm > 0 && (!최소 || cm < 최소)) 최소 = cm;
      });
      g.총수량 = 총;
      g.cm = 최소 || 999;                                  // 크기 모름은 맨 뒤
      g.코드5 = 글(g.것들[0].줄.품목코드).slice(0, 5);
      g.번호 = 글(g.것들[0].줄.주문번호);
      g.점수 = 점;
      g.운임 = 점 >= 12 ? '확인요망' : (점 >= 9 ? '3300' : '2750');
      g.갈래 = 갈래(g);
    });
  }

  function 견주기(a, b) {
    if (a.갈래 !== b.갈래) return a.갈래 - b.갈래;
    if (a.cm !== b.cm) return a.cm - b.cm;
    if (a.코드5 !== b.코드5) return a.코드5 < b.코드5 ? -1 : 1;
    if (a.총수량 !== b.총수량) return a.총수량 - b.총수량;
    if (a.번호 !== b.번호) return a.번호 < b.번호 ? -1 : 1;
    return a.차례 - b.차례;                                 // 묶음 안팎 모두 들어온 순서를 마지막 기준으로
  }

  /* ══ E열 ══ */

  function 앞머리(출력번호, 회차) {
    var 조각 = [String(출력번호)];
    if (회차 >= 2) 조각.push('★' + 회차);
    return '(' + 조각.join('/') + ') ';
  }

  /* 🔴 품목코드를 못 찾으면 원본 상품명을 그대로 둔다 — 지어내지 않는다(실물로 확인) */
  function 상품글(것) {
    var r = 것.줄;
    if (!r.품목코드) return 글(것.원본[C.상품명]);
    var cm = cm뽑기(r.품목코드);
    return 글(r.유통명 || 것.원본[C.상품명]) + (cm ? '(' + cm + 'cm)' : '') + ' ' + 자료().수량(r) + '개';
  }

  /* L열 — `18100.00` → `18100` */
  function 돈(v) {
    var s = 글(v).trim();
    if (!s) return '';
    var n = Number(s.replace(/,/g, ''));
    return isFinite(n) ? String(n) : s;
  }

  function 표만들기(그룹들, 재구매) {
    var 표 = [];
    그룹들.forEach(function (g, gi) {
      g.출력번호 = gi + 1;
      var 회 = 회차값(g, 재구매);
      var 여럿 = g.것들.length > 1;

      /* 안심번호로 묶인 그룹은 서로 번호가 다르다 — 마지막 줄 번호로 그룹 전체를 통일한다(규칙문서 82행) */
      var 통일 = null;
      if (여럿 && g.키.indexOf('__안심__') >= 0) {
        var 끝 = g.것들[g.것들.length - 1].원본;
        통일 = [끝[C.수령지전화], 끝[C.전화번호], 끝[C.핸드폰]];
      }

      g.것들.forEach(function (것, j) {
        var o = 것.원본.slice();
        if (통일) { o[C.수령지전화] = 통일[0]; o[C.전화번호] = 통일[1]; o[C.핸드폰] = 통일[2]; }
        /* 🔴 앞머리는 묶음 맨 앞 줄에만. 두 번째 줄부터는 상품명만 (규칙문서 48행) */
        o[C.상품명] = (j === 0 ? 앞머리(g.출력번호, 회) : '') + 상품글(것) + (여럿 ? '/' : '');
        o[C.결제업체] = g.운임;                             // 그룹 전 줄 같은 값
        o[C.판매가] = 돈(o[C.판매가]);
        o[C.옵션추가] = 글(o[C.옵션추가]).trim() || '0';    // 🔴 빈칸 → 0
        표.push(o.map(문자));
      });
    });
    return 표;
  }

  function 만들기(항목들) {
    var 그룹들 = 그룹만들기(항목들);
    재기(그룹들);
    그룹들.sort(견주기);
    return { 그룹들: 그룹들, 표: 표만들기(그룹들, 재구매표()) };
  }

  /* 내려받기 전에 화면에 적을 숫자들 */
  function 준비(항목들) {
    var r = 만들기(항목들);
    var 확인 = 0, 코드없음 = 0;
    r.그룹들.forEach(function (g) { if (g.운임 === '확인요망') 확인++; });
    (항목들 || []).forEach(function (것) { if (!것.줄.품목코드) 코드없음++; });
    return { 줄수: r.표.length, 묶음수: r.그룹들.length, 확인요망: 확인, 코드없음: 코드없음, 표: r.표, 그룹들: r.그룹들 };
  }

  /* 🔴 동봉카드와 번호를 맞추는 유일한 자리. 이미 번호가 있으면 다시 매기지 않는다 —
     카드를 인쇄한 뒤 파일을 다시 내려받아도 번호가 바뀌면 안 된다 */
  function 번호되쓰기(그룹들) {
    var 저 = ZG.저장소, 목록 = 저.읽기(저.키.주문), 표 = {}, 바뀜 = false;
    목록.forEach(function (r) { if (r.id) 표[r.id] = r; });
    그룹들.forEach(function (g) {
      g.것들.forEach(function (것) {
        var r = 것.id && 표[것.id];
        if (!r || r.출력번호) return;
        r.출력번호 = g.출력번호;
        바뀜 = true;
      });
    });
    if (바뀜) 저.전체쓰기(저.키.주문, 목록);
  }

  function 내보내기(항목들, 파일명) {
    var r = 만들기(항목들);
    if (!r.표.length) return 0;
    var 책 = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(책, XLSX.utils.aoa_to_sheet(r.표), '송장출력');
    XLSX.writeFile(책, 파일명);
    번호되쓰기(r.그룹들);
    return r.표.length;
  }

  /* ══ 꺼내 쓰는 쪽 — 동봉카드를 로젠 파일과 같은 순서로 ══
     🔴 하나도 번호가 없으면 받은 그대로 돌려준다(회귀 없음) */
  function 번호(g) {
    var 최소 = 0;
    ((g && g.줄들) || []).forEach(function (r) {
      var n = Number(r.출력번호) || 0;
      if (n > 0 && (!최소 || n < 최소)) 최소 = n;
    });
    return 최소;
  }

  function 포장순으로(건들) {
    if (!건들 || !건들.length) return 건들;
    var 있 = 건들.some(function (g) { return 번호(g) > 0; });
    if (!있) return 건들;
    return 건들.map(function (g, i) { return { g: g, i: i, n: 번호(g) || 1e9 }; })
      .sort(function (a, b) { return (a.n - b.n) || (a.i - b.i); })
      .map(function (x) { return x.g; });
  }

  ZG.로젠파일 = {
    준비: 준비, 내보내기: 내보내기, 포장순으로: 포장순으로,
    cm뽑기: cm뽑기, 점수: 점수, 그룹만들기: 그룹만들기
  };
})(window.ZG);
