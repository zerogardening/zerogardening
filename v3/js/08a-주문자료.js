/* 08a-주문자료 — 정규화 · 묶기 · 검색 · 회차 · 중복판정 · 출고리스트 (2단계 설계 §2 · §4)
   화면이 없다. 여기서 document 를 만지지 않는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 저 = ZG.저장소;

  function 새id() {
    return 'od_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7);
  }

  /* ── 날짜 ──
     실데이터에 `2026-05-13` 과 `5/13/26` 두 형식이 섞여 있었다(설계 §3).
     이 둘만 받는다. 그 밖은 ''을 돌려주고 부르는 쪽이 그 줄을 건너뛴다. */
  function 날짜정규화(값) {
    if (값 == null || 값 === '') return '';
    if (값 instanceof Date) return ZG.계산.날짜문자(값.getTime());
    if (typeof 값 === 'number') return ZG.계산.날짜문자(값);

    var 글 = String(값).trim();
    var m = 글.match(/^(\d{4})-(\d{2})-(\d{2})$/);
    if (m) return 참날짜(+m[1], +m[2], +m[3]);
    m = 글.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2})$/);
    if (m) return 참날짜(2000 + +m[3], +m[1], +m[2]);
    return '';
  }

  function 참날짜(y, mo, d) {
    if (mo < 1 || mo > 12 || d < 1 || d > 31) return '';
    var t = new Date(y, mo - 1, d);
    if (t.getMonth() !== mo - 1 || t.getDate() !== d) return '';
    return ZG.계산.날짜문자(t.getTime());
  }

  function 전화숫자(값) { return String(값 == null ? '' : 값).replace(/\D/g, ''); }
  function 주소압축(값) { return String(값 == null ? '' : 값).replace(/[\s-]/g, ''); }

  /* 이름·전화·주소가 모두 같으면 화면에서 한 건이다. 주문번호로 묶지 않는다 */
  function 묶음키(줄) {
    return String(줄.수령인 || '').trim() + '|' + 전화숫자(줄.수령인전화) + '|' + 주소압축(줄.수령인주소);
  }

  function 수량(줄) { return (Number(줄.주문수량) || 0) * (Number(줄.옵션입수) || 1); }
  function 금액(줄) { return 수량(줄) * (Number(줄.단가) || 0); }

  /* ── 읽기 ── */
  function 전부() { return 저.읽기(저.키.주문); }

  function 맞나(줄, 글, 주소포함) {
    if (!글) return true;
    var 키 = String(글).toLowerCase().replace(/\s/g, '');
    var 숫자키 = 전화숫자(글);
    var 밭 = (줄.수령인 + '|' + 줄.유통명 + '|' + 줄.학명 + '|' + 줄.품목코드 +
              (주소포함 ? '|' + 줄.수령인주소 : '')).toLowerCase().replace(/\s/g, '');
    if (밭.indexOf(키) >= 0) return true;
    return !!숫자키 && 전화숫자(줄.수령인전화).indexOf(숫자키) >= 0;
  }

  /* ── 조회 기준일 = 「올린 날」 (묶음의 올린날) ──
     주문일로 보면 안 된다. 오늘 들어온 주문을 내일 보내기도 하고, 하루에 2~3일치를 한꺼번에 올리기도 하신다.
     주문일 기준이면 오늘 올린 파일이 지난 날짜로 흩어져 오늘 화면에서 사라진다.
     🔴 줄에 올린날을 심지 않고 묶음에서 끌어온다 — 이미 올려둔 주문도 고치지 않고 그대로 맞는다.
     묶음이 없는 줄(손입력·전화주문)은 주문일이 곧 넣은 날이라 그대로 쓴다. */
  function 올린날표() {
    var 표 = {};
    저.읽기(저.키.주문묶음).forEach(function (b) { if (b.올린날) 표[b.id] = String(b.올린날); });
    return 표;
  }

  function 기준일(줄, 표) {
    return (줄.묶음id && 표[줄.묶음id]) || String(줄.주문일 || '');
  }

  function 읽기(조건) {
    조건 = 조건 || {};
    var 표 = 올린날표();
    return 전부().filter(function (r) {
      var 날 = 기준일(r, 표);
      if (조건.부터 && 날 < 조건.부터) return false;
      if (조건.까지 && 날 > 조건.까지) return false;
      if (조건.묶음id && r.묶음id !== 조건.묶음id) return false;
      return 맞나(r, 조건.글, 조건.주소포함);
    }).sort(function (a, b) {
      var 갑 = 기준일(a, 표), 을 = 기준일(b, 표);
      if (갑 !== 을) return 갑 < 을 ? -1 : 1;
      return (a.등록일시 || 0) - (b.등록일시 || 0);
    });
  }

  /* ── 묶기 ──
     정렬은 묶음키가 처음 나온 순서. 한 건 안에서는 들어온 줄 순서 그대로다. */
  function 건으로묶기(줄들) {
    var 장 = ZG.계산.장부();
    var 재고표 = {};
    function 재고(코드) {
      if (!코드) return 0;
      if (재고표[코드] == null) 재고표[코드] = ZG.계산.현재고(코드, 장);
      return 재고표[코드];
    }

    var 순서 = [], 표 = {};
    줄들.forEach(function (r) {
      var k = r.묶음키 || 묶음키(r);
      var g = 표[k];
      if (!g) {
        g = 표[k] = {
          묶음키: k, 수령인: r.수령인, 전화: r.수령인전화, 주소: r.수령인주소,
          우편번호: r.우편번호, 판매처: r.판매처, 묶음id: r.묶음id, 출처: r.출처,
          배송메모: r.배송메모, 주문일: r.주문일, 줄들: [], 총액: 0, 부족여부: false
        };
        순서.push(g);
      }
      g.줄들.push(r);
      g.총액 += 금액(r);
    });

    // 부족은 그 건 안에서 품목코드별로 합산한 필요수량과 견준다
    순서.forEach(function (g) {
      var 필요 = {};
      g.줄들.forEach(function (r) { if (r.품목코드) 필요[r.품목코드] = (필요[r.품목코드] || 0) + 수량(r); });
      g.부족여부 = Object.keys(필요).some(function (코드) { return 재고(코드) < 필요[코드]; });
      g.모자람 = {};
      Object.keys(필요).forEach(function (코드) {
        var 남 = 재고(코드);
        if (남 < 필요[코드]) g.모자람[코드] = { 재고: 남, 모자란수: 필요[코드] - 남 };
      });
    });
    return 순서;
  }

  /* 그 수령인의 지난 주문 건수 — 오늘 것을 뺀 재주문 횟수. 0이면 화면에 그리지 않는다 */
  function 재주문횟수(키, 이번날짜) {
    var 날들 = {};
    전부().forEach(function (r) {
      var k = r.묶음키 || 묶음키(r);
      if (k === 키 && r.주문일 !== 이번날짜) 날들[r.주문일] = 1;
    });
    return Object.keys(날들).length;
  }

  /* ── 회차 ──
     카페24에서 하루 2~3번 받아 올리시므로 회차가 여러 개 생긴다.
     기간을 여러 날로 잡으면 그 안의 회차가 전부 나와야 한다 — 시작일 하루치만 보면 뒷날 것이 사라진다. */
  function 회차목록(부터, 까지) {
    까지 = 까지 || 부터;
    var 묶음 = 저.읽기(저.키.주문묶음).filter(function (b) {
      return b.올린날 >= 부터 && b.올린날 <= 까지;
    });
    묶음.sort(function (a, b) {
      var 갑 = String(a.올린날) + String(a.올린시각);
      var 을 = String(b.올린날) + String(b.올린시각);
      return 갑 < 을 ? -1 : 1;
    });
    var 줄들 = 읽기({ 부터: 부터, 까지: 까지 });
    return 묶음.map(function (b) {
      var 내것 = 줄들.filter(function (r) { return r.묶음id === b.id; });
      return { 묶음id: b.id, 날: b.올린날, 회차: b.회차, 시각: b.올린시각, 건수: 건으로묶기(내것).length };
    });
  }

  /* ── 중복 판정 (업무규칙 §5) ──
     업로드 줄은 주문번호+품목코드+수령인, 손으로 넣은 줄은 주문일+수령인+품목코드로 본다. */
  function 같은주문인가(새줄) {
    var 이름 = String(새줄.수령인 || '').trim();
    return 전부().some(function (r) {
      if (String(r.수령인 || '').trim() !== 이름) return false;
      if (r.품목코드 !== 새줄.품목코드) return false;
      if (새줄.주문번호) return r.주문번호 === 새줄.주문번호;
      return !r.주문번호 && r.주문일 === 새줄.주문일;
    });
  }

  /* ── 출고리스트 — 품목코드별 합산. 재고를 건드리지 않는 경고일 뿐이다 (설계 §2-3) ── */
  function 출고리스트(줄들) {
    var 장 = ZG.계산.장부();
    var 순서 = [], 표 = {};
    줄들.forEach(function (r) {
      var 키 = r.품목코드 || ('?' + (r.원본코드 || r.유통명));
      var t = 표[키];
      if (!t) {
        t = 표[키] = {
          품목코드: r.품목코드 || (r.원본코드 || '—'), 유통명: r.유통명, 규격: r.규격,
          필요: 0, 재고: r.품목코드 ? ZG.계산.현재고(r.품목코드, 장) : 0, 부족: false
        };
        순서.push(t);
      }
      t.필요 += 수량(r);
    });
    순서.forEach(function (t) { t.부족 = t.재고 < t.필요; });
    return 순서;
  }

  ZG.주문자료 = {
    새id: 새id, 날짜정규화: 날짜정규화, 전화숫자: 전화숫자, 묶음키: 묶음키,
    수량: 수량, 금액: 금액, 읽기: 읽기, 건으로묶기: 건으로묶기, 재주문횟수: 재주문횟수,
    회차목록: 회차목록, 같은주문인가: 같은주문인가, 출고리스트: 출고리스트
  };
})(window.ZG);
