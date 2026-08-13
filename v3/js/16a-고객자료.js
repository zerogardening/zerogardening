/* 16a-고객자료 — 주문에서 뽑은 고객 명부 · 손등록 · 메모 · 문자 (11단계 설계 §2·§3 · 세부설계 §1)
   🔴 고객 표를 따로 두지 않는다. v3_주문 1,287줄이 그대로 명부다.
   화면이 없다 — document 를 만지지 않는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 저 = ZG.저장소;
  var 반응기간 = 14;   // ponytail: 반응 집계 창은 14일 고정. 기간을 고르고 싶어지면 그때 칸을 단다 (설계 §5)

  /* ── 열쇠 ── */
  function 이름키(s) { return String(s == null ? '' : s).replace(/\s+/g, '').toLowerCase(); }
  function 숫자만(s) { return String(s == null ? '' : s).replace(/[^0-9]/g, ''); }
  function 전화숫자(s) { return 숫자만(s); }

  /* 🔴 구 프로그램 customerHistory 가 쓰던 그 열쇠다("배성|27208"). 구분자 | 를 바꾸면 539명 대조가 깨진다.
     050 안심번호는 사람마다 바뀌므로 우편번호가 있으면 저절로 전화를 안 탄다 */
  function 사람키(이름, 우편번호, 전화) {
    var 이 = 이름키(이름);
    if (!이) return '';
    var 우 = 숫자만(우편번호);
    return 이 + '|' + (우 || 'T' + 전화숫자(전화));
  }
  /* 우편번호 유무로 갈린 같은 사람을 잇는 열쇠 (설계 §3-1 ②단계) */
  function 보조키(이름, 전화) {
    var 이 = 이름키(이름);
    return 이 ? 이 + '|T' + 전화숫자(전화) : '';
  }
  function 안심번호인가(전화) { return /^050/.test(전화숫자(전화)); }

  function 날더하기(날, 일수) {
    var t = new Date(String(날) + 'T00:00:00');
    if (isNaN(t.getTime())) return String(날 || '');
    t.setDate(t.getDate() + 일수);
    return ZG.계산.날짜문자(t.getTime());
  }

  /* ── 주문 → 고객 그룹 ── */
  function 새그룹(키, r) {
    return {
      키: 키,
      이름: r.수령인 || '', 전화: r.수령인전화 || '', 주소: r.수령인주소 || '', 우편번호: r.우편번호 || '',
      판매처들: [], 주문일들: {}, 주문수: 0, 줄수: 0, 합계: 0,
      첫주문: '', 최근주문: '', 손등록: false, 안심: false,
      메모들: [], 문자수: 0, 문자들: [], 줄모음: [], 고객행id: '', 최신일: ''
    };
  }

  function 얹기(g, r) {
    var 날 = String(r.주문일 || '');
    // 사람 정보는 「가장 최근 주문줄」의 값으로 덮는다 — 이사·번호변경이 최신으로 보여야 한다
    if (날 >= g.최신일) {
      g.최신일 = 날;
      if (r.수령인) g.이름 = r.수령인;
      if (r.수령인전화) g.전화 = r.수령인전화;
      if (r.수령인주소) g.주소 = r.수령인주소;
      if (r.우편번호) g.우편번호 = r.우편번호;
    }
    var 처 = r.판매처 || '';
    if (처 && g.판매처들.indexOf(처) < 0) g.판매처들.push(처);
    if (날) {
      g.주문일들[날] = 1;
      if (!g.첫주문 || 날 < g.첫주문) g.첫주문 = 날;
      if (날 > g.최근주문) g.최근주문 = 날;
    }
    g.줄수 += 1;
    g.합계 += ZG.주문자료.금액(r);
    g.줄모음.push(r);
  }

  function 그룹만들기() {
    var 순서 = [], 표 = {};
    저.읽기(저.키.주문).forEach(function (r) {
      var k = 사람키(r.수령인, r.우편번호, r.수령인전화);
      if (!k) return;                                  // 이름이 없는 줄은 버린다
      var g = 표[k];
      if (!g) { g = 표[k] = 새그룹(k, r); 순서.push(g); }
      얹기(g, r);
    });
    return { 순서: 순서, 표: 표 };
  }

  /* ── 손등록 붙이기 (설계 §3-1 순서 그대로) — 주문이 이긴다. 메모들만 얹는다 ── */
  function 손등록얹기(뭉치) {
    var 보조 = {};
    뭉치.순서.forEach(function (g) { var b = 보조키(g.이름, g.전화); if (b && !보조[b]) 보조[b] = g; });

    저.읽기(저.키.고객).forEach(function (c) {
      var g = 뭉치.표[c.id]                              // ① 사람키가 같다
           || 보조[보조키(c.이름, c.전화)];              // ② 이름+전화가 같다
      if (g) { g.메모들 = (c.메모들 || []).slice(); g.고객행id = c.id; return; }
      var 새 = 새그룹(c.id, {
        수령인: c.이름, 수령인전화: c.전화, 수령인주소: c.주소, 우편번호: c.우편번호
      });
      새.메모들 = (c.메모들 || []).slice();               // ③ 주문 0건 고객으로 목록에 넣는다
      새.고객행id = c.id;
      뭉치.순서.push(새); 뭉치.표[c.id] = 새;
    });
  }

  /* ── 문자 얹기 ──
     🔴 받은이 키는 「그때의 키」다. 나중에 우편번호가 붙어 키가 갈려도 문자가 안 사라지게
        자기 키와 보조키 둘 다로 찾아 발송 id 로 중복을 지운다 */
  function 문자얹기(뭉치) {
    var 색인 = {};
    문자전부().forEach(function (m) {
      (m.받은이 || []).forEach(function (k) {
        if (!k) return;
        (색인[k] = 색인[k] || []).push(m);
      });
    });
    뭉치.순서.forEach(function (g) {
      var 본것 = {}, 모음 = [];
      [g.키, 보조키(g.이름, g.전화), g.고객행id].forEach(function (k) {
        (k && 색인[k] ? 색인[k] : []).forEach(function (m) {
          if (본것[m.id]) return;
          본것[m.id] = 1; 모음.push(m);
        });
      });
      g.문자들 = 모음;
      g.문자수 = 모음.length;
    });
  }

  function 마무리(뭉치) {
    뭉치.순서.forEach(function (g) {
      g.주문수 = Object.keys(g.주문일들).length;   // 🔴 같은 날 여러 건은 1건이다 (재구매 규칙과 같은 셈)
      g.손등록 = g.주문수 === 0;                    // 🔴 v3_고객 행이 있느냐가 아니다
      g.안심 = 안심번호인가(g.전화);
    });
    뭉치.순서.sort(function (a, b) {
      if (!a.최근주문 !== !b.최근주문) return a.최근주문 ? -1 : 1;   // 주문 0건은 맨 뒤
      if (a.최근주문 !== b.최근주문) return a.최근주문 < b.최근주문 ? 1 : -1;
      return b.합계 - a.합계;
    });
    return 뭉치;
  }

  /* 🔴 캐시를 두지 않는다. 캐시를 두면 주문·메모를 고친 뒤 옛 숫자가 남는다 */
  function 뭉치만들기() {
    var 뭉치 = 그룹만들기();
    손등록얹기(뭉치);
    문자얹기(뭉치);
    return 마무리(뭉치);
  }

  /* ── 읽기 · 필터 ── */
  function 걸림(g, 조건) {
    if (조건.글) {
      var 글 = 이름키(조건.글), 숫 = 숫자만(조건.글);
      var 밭 = 이름키(g.이름 + '|' + g.주소 + '|' + g.전화 + '|' + g.우편번호);
      var 맞나 = 밭.indexOf(글) >= 0 ||
        (!!숫 && (전화숫자(g.전화).indexOf(숫) >= 0 || 숫자만(g.우편번호).indexOf(숫) >= 0));
      if (!맞나) return false;
    }
    // 🔴 기간은 거르개일 뿐 집계를 좁히지 않는다 — 표의 주문수·합계는 언제나 전체 이력이다
    if (조건.부터 || 조건.까지) {
      var 있나 = Object.keys(g.주문일들).some(function (날) {
        if (조건.부터 && 날 < 조건.부터) return false;
        if (조건.까지 && 날 > 조건.까지) return false;
        return true;
      });
      if (!있나) return false;
    }
    if (조건.최소주문 && g.주문수 < Number(조건.최소주문)) return false;
    if (조건.최소문자 && g.문자수 < Number(조건.최소문자)) return false;
    if (조건.판매처 && g.판매처들.indexOf(조건.판매처) < 0) return false;
    if (조건.손등록만 && !g.손등록) return false;
    return true;
  }

  function 목록(조건) {
    조건 = 조건 || {};
    return 뭉치만들기().순서.filter(function (g) { return 걸림(g, 조건); });
  }

  function 하나(키) {
    var 뭉치 = 뭉치만들기();
    return 뭉치.표[키] || null;
  }

  /* 그 사람 주문 줄, 주문일 내림차순 (상세 표 · 엑셀용) */
  function 주문줄들(키) {
    var g = 하나(키);
    if (!g) return [];
    return g.줄모음.slice().sort(function (a, b) {
      var x = String(a.주문일 || ''), y = String(b.주문일 || '');
      if (x !== y) return x < y ? 1 : -1;
      return (Number(b.등록일시) || 0) - (Number(a.등록일시) || 0);
    });
  }

  function 요약(것들) {
    var s = { 인원: 0, 주문: 0, 합계: 0, 손등록: 0, 안심: 0 };
    (것들 || []).forEach(function (g) {
      s.인원 += 1; s.주문 += g.주문수; s.합계 += g.합계;
      if (g.손등록) s.손등록 += 1;
      if (g.안심) s.안심 += 1;
    });
    return s;
  }

  /* 🔴 판매처 값은 데이터에서 뽑는다 — 코드에 박으면 심폴·새 판매처가 안 나온다 */
  function 판매처목록() {
    var 본것 = {}, 모음 = [];
    저.읽기(저.키.주문).forEach(function (r) {
      var 처 = r.판매처 || '';
      if (!처 || 본것[처]) return;
      본것[처] = 1; 모음.push(처);
    });
    return 모음.sort();
  }

  /* ── 문자 (v3_문자) — 🔴 발송 한 번이 한 줄이다. 사람마다 한 줄로 만들지 않는다 ── */
  function 문자전부() {
    return 저.읽기(저.키.문자).slice().sort(function (a, b) {
      var x = String(a.보낸날 || ''), y = String(b.보낸날 || '');
      if (x !== y) return x < y ? 1 : -1;
      return (Number(b.등록일시) || 0) - (Number(a.등록일시) || 0);
    });
  }

  function 문자추가(값) {
    var 지금 = Date.now();
    var 새것 = {
      id: 'ms_' + 지금 + '_' + Math.random().toString(36).slice(2, 8),
      보낸날: String(값.보낸날 || '').trim() || ZG.ui.오늘문자(),
      내용: String(값.내용 || '').trim(),
      받은이: (값.받은이 || []).slice(),
      등록일시: 지금
    };
    return 저.덧붙이기(저.키.문자, 새것);
  }

  function 문자삭제(id) { return 저.지우기(저.키.문자, id); }

  /* 「보낸 뒤 주문 M명」이 곧 반응률이다. 캠페인 표도 어트리뷰션도 만들지 않는다 (설계 §5)
     🔴 보낸 당일 주문도 반응으로 센다 — 문자 보고 그날 넣는 것이 가장 흔하다 */
  function 반응수(발송) {
    if (!발송 || !발송.보낸날) return 0;
    var 시작 = String(발송.보낸날), 끝 = 날더하기(시작, 반응기간);
    var 뭉치 = 뭉치만들기();
    var 보조 = {};
    뭉치.순서.forEach(function (g) { var b = 보조키(g.이름, g.전화); if (b && !보조[b]) 보조[b] = g; });

    var 센것 = {}, 수 = 0;
    (발송.받은이 || []).forEach(function (k) {
      var g = 뭉치.표[k] || 보조[k];
      if (!g || 센것[g.키]) return;
      var 했나 = Object.keys(g.주문일들).some(function (날) { return 날 >= 시작 && 날 <= 끝; });
      if (!했나) return;
      센것[g.키] = 1; 수 += 1;
    });
    return 수;
  }

  /* ── 손등록 CRUD · 메모 ── */
  function 손등록행(고객) {
    var 찾을 = (고객 && (고객.고객행id || 고객.키)) || '';
    var 것들 = 저.읽기(저.키.고객);
    for (var i = 0; i < 것들.length; i++) if (것들[i].id === 찾을) return 것들[i];
    return null;
  }

  function 손등록추가(값) {
    var 이름 = String(값.이름 || '').trim();
    var 전화 = String(값.전화 || '').trim();
    var 우편 = String(값.우편번호 || '').trim();
    var id = 사람키(이름, 우편, 전화);
    if (!id) return null;
    var 있나 = 저.읽기(저.키.고객).some(function (c) { return c.id === id; });
    if (있나) return null;                     // 덮지 않는다. 화면이 「이미 있는 분입니다」를 띄운다
    var 지금 = Date.now();
    var 메모 = String(값.메모 || '').trim();
    return 저.덧붙이기(저.키.고객, {
      id: id, 이름: 이름, 전화: 전화, 주소: String(값.주소 || '').trim(), 우편번호: 우편,
      메모들: 메모 ? [{ 날: ZG.ui.오늘문자(), 글: 메모 }] : [],
      등록일시: 지금, 수정일시: 지금
    });
  }

  function 손등록수정(키, 값) {
    return 저.바꾸기(저.키.고객, 키, {
      이름: String(값.이름 || '').trim(), 전화: String(값.전화 || '').trim(),
      주소: String(값.주소 || '').trim(), 우편번호: String(값.우편번호 || '').trim(),
      수정일시: Date.now()
    });
  }

  function 손등록삭제(키) { return 저.지우기(저.키.고객, 키); }

  /* 메모는 v3_고객 한 줄 안의 배열이다. 표를 더 만들지 않는다 (설계 §3-2)
     🔴 새 배열을 만들어 넘긴다 — 읽은 배열을 그 자리에서 push 하면 캐시 사본과 어긋난다 */
  function 메모추가(고객, 글) {
    var 적을것 = String(글 || '').trim();
    if (!고객 || !적을것) return null;
    var 행 = 손등록행(고객);
    var 새카드 = { 날: ZG.ui.오늘문자(), 글: 적을것 };
    if (행) {
      return 저.바꾸기(저.키.고객, 행.id, {
        메모들: (행.메모들 || []).concat([새카드]), 수정일시: Date.now()
      });
    }
    // 주문에서 파생된 고객에게도 메모를 달 수 있어야 한다 — 그 자리에서 v3_고객 행을 만든다
    var 지금 = Date.now();
    var 만든것 = 저.덧붙이기(저.키.고객, {
      id: 고객.키, 이름: 고객.이름 || '', 전화: 고객.전화 || '',
      주소: 고객.주소 || '', 우편번호: 고객.우편번호 || '',
      메모들: [새카드], 등록일시: 지금, 수정일시: 지금
    });
    고객.고객행id = 고객.키;
    return 만든것;
  }

  function 메모삭제(고객, 차례) {
    var 행 = 손등록행(고객);
    if (!행) return null;
    var 새것 = (행.메모들 || []).slice();
    if (차례 < 0 || 차례 >= 새것.length) return null;
    새것.splice(차례, 1);
    return 저.바꾸기(저.키.고객, 행.id, { 메모들: 새것, 수정일시: Date.now() });
  }

  ZG.고객자료 = {
    반응기간: 반응기간,
    사람키: 사람키, 보조키: 보조키, 안심번호인가: 안심번호인가, 숫자만: 숫자만, 날더하기: 날더하기,
    목록: 목록, 하나: 하나, 주문줄들: 주문줄들, 요약: 요약, 판매처목록: 판매처목록,
    문자전부: 문자전부, 문자추가: 문자추가, 문자삭제: 문자삭제, 반응수: 반응수,
    손등록추가: 손등록추가, 손등록수정: 손등록수정, 손등록삭제: 손등록삭제,
    메모추가: 메모추가, 메모삭제: 메모삭제
  };
})(window.ZG);
