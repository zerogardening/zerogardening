/* 21b-현황판화면 — 지시로그를 4단계(준비·작업중·컨펌대기·완료)로 본다 (25단계, 시안 25-현황판-macA).
   화면은 계산하지 않는다 — 단계·제목·설명은 아이맥 올리기가 정해 둔 그대로 그린다.
   다시 읽는 때: 열 때 · ↻ · 앱으로 돌아올 때. 판이 5분마다 바뀌니 타이머 폴링은 두지 않는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u, 만들기, 자;
  var 뿌리;
  var 판 = null, 말 = '';            // 판 = {갱신, 항목[]} · 말 = 못 읽은 까닭
  var 단계 = null, 팀 = '전체';      // 단계 null = 완료 뺀 셋. 남기지 않는다 — 열 때마다 기본
  var 첫판 = true;

  var 결 = { 준비: 'rd', 작업중: 'go', 컨펌대기: 'me', 완료: 'dn' };
  var 순서 = { 컨펌대기: 0, 작업중: 1, 준비: 2 };
  var 요일 = ['일', '월', '화', '수', '목', '금', '토'];
  var 휴지통 = '<path d="M4 7h16"/><path d="M9.5 7V4.5h5V7"/><path d="M6 7l1 13h10l1-13"/><path d="M10 11v5.5M14 11v5.5"/>';
  var 돌림 = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.85" stroke-linecap="round"' +
             ' stroke-linejoin="round" aria-hidden="true"><path d="M20.5 12a8.5 8.5 0 1 1-2.5-6"/><path d="M20.5 3.5V8h-4.5"/></svg>';

  function 월일(iso) { return iso ? (+iso.slice(5, 7)) + '/' + (+iso.slice(8, 10)) : ''; }
  function 날머리(iso) {
    var d = new Date(+iso.slice(0, 4), +iso.slice(5, 7) - 1, +iso.slice(8, 10));
    return 월일(iso) + ' ' + 요일[d.getDay()];
  }

  /* ── 읽기 ── */
  function 읽기() {
    자.불러오기().then(function (r) {
      판 = r; 말 = '';
      그리기();
      if (첫판) { 첫판 = false; u.목록등장(뿌리.querySelectorAll('.tk, .dr')); }
    }).catch(function (e) {
      말 = 자.말썽(e);
      그리기();
    });
  }

  /* ── 정리 — 화면에서 먼저 빼고(낙관), 못 쓰면 제자리에 되넣는다 ── */
  function 정리(h, 겉) {
    function 빼기() {
      var i = 판.항목.indexOf(h);
      if (i < 0) return;
      판.항목.splice(i, 1);
      그리기();
      자.숨기기(h).then(function () {
        u.토스트('정리했습니다');
      }).catch(function (e) {
        판.항목.splice(Math.min(i, 판.항목.length), 0, h);
        그리기();
        u.토스트('정리 못 했습니다 — ' + 자.말썽(e));
      });
    }
    if (u.움직임끔() || !겉.animate) return 빼기();
    var 길이 = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--dur-exit')) || 220;
    겉.animate([{ opacity: 1, transform: 'none' }, { opacity: 0, transform: 'translateX(-24px)' }],
      { duration: 길이, easing: 'cubic-bezier(.4,0,1,1)', fill: 'forwards' }).onfinish = 빼기;
  }

  /* 폰 = 밀어서 「정리」 · PC = 마우스 올린 줄에만 「정리」 단추 */
  function 정리붙이기(h, 몸, 단추자리) {
    if (u.폰인가()) {
      var 겉 = 만들기('div', { class: '쓸줄' });
      var b = u.쓸기단추('정리', 'del', function () { 정리(h, 겉); }, 휴지통);
      u.쓸기붙이기(몸, 76);
      겉.appendChild(만들기('div', { class: '쓸단추' }, [b]));
      겉.appendChild(몸);
      return 겉;
    }
    var 단추 = 만들기('button', { type: 'button', class: 'btn sm cl', text: '정리' });
    단추.addEventListener('click', function () { 정리(h, 몸); });
    단추자리.appendChild(단추);
    return 몸;
  }

  /* ── 조각 ── */
  function 흐름(수, 넓게) {
    var 줄 = 만들기('div', { class: 'flow' + (넓게 ? ' wide' : '') });
    자.단계들.forEach(function (s) {
      var 칸 = 만들기('div', {
        class: 'fs ' + 결[s] + (단계 === s ? ' on' : 단계 ? ' dim' : ''),
        role: 'button', tabindex: '0', 'aria-pressed': 단계 === s ? 'true' : 'false'
      }, [만들기('div', { class: 'sg' }, [만들기('span', { class: 'nm', text: s }), 만들기('b', { text: String(수[s]) })])]);
      칸.addEventListener('click', function () { 단계 = 단계 === s ? null : s; u.햅틱(); 그리기(); });
      칸.addEventListener('keydown', function (e) { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); 칸.click(); } });
      줄.appendChild(칸);
    });
    return 줄;
  }

  function 칩들(수, 넓게) {
    var 줄 = 만들기('div', { class: 'tchips' + (넓게 ? ' wide' : '') });
    자.팀들.forEach(function (n) {
      var b = 만들기('button', {
        type: 'button', class: 'fchip' + (팀 === n ? ' on' : 수[n] ? '' : ' zero'),
        html: u.안전(n) + '<span class="n">' + 수[n] + '</span>'
      });
      b.addEventListener('click', function () { 팀 = n; 그리기(); });
      줄.appendChild(b);
    });
    return 줄;
  }

  function 카드(h) {
    var k = 결[h.단계];
    var r1 = 만들기('div', { class: 'r1' }, [
      만들기('span', { class: 'tt', text: h.제목 }),
      h.막힘 ? 만들기('span', { class: 'blkm', text: '막힘' }) : null,
      만들기('span', { class: 'sp ' + k, text: h.단계 })
    ]);
    var 률 = h.률 == null ? [만들기('span', { class: 'pg-none' })] : [
      만들기('span', { class: 'pg', html: '<i style="width:' + Math.max(0, Math.min(100, h.률)) + '%"></i>' }),
      만들기('span', { class: 'pct', text: h.률 + '%' })
    ];
    var 몸 = 만들기('div', { class: 'tk ' + k }, [
      r1,
      h.설명 ? 만들기('div', { class: 'ds', text: h.설명 }) : null,
      만들기('div', { class: 'r3' }, [
        만들기('span', { class: 'team', text: h.팀 }),
        h.날 ? 만들기('span', { class: 'day', text: 월일(h.날) }) : null
      ].concat(률))
    ]);
    return 정리붙이기(h, 몸, r1);
  }

  function 카드목록(항목들, 넓게) {
    var 판순 = 판.항목;
    var 줄 = 항목들.slice().sort(function (a, b) {
      return (순서[a.단계] - 순서[b.단계]) || (b.날 || '').localeCompare(a.날 || '') || 판순.indexOf(a) - 판순.indexOf(b);
    });
    return 만들기('div', { class: 'tks' + (넓게 ? ' wide' : '') }, 줄.map(카드));
  }

  function 완료목록(항목들, 넓게) {
    var 판순 = 판.항목;
    var 줄 = 항목들.slice().sort(function (a, b) {
      return (b.날 || '').localeCompare(a.날 || '') || 판순.indexOf(a) - 판순.indexOf(b);
    });
    var 목록 = 만들기('div', { class: 'dl' }), 앞날 = null;
    줄.forEach(function (h) {
      if (h.날 !== 앞날) { 앞날 = h.날; 목록.appendChild(만들기('div', { class: 'dh', text: h.날 ? 날머리(h.날) : '' })); }
      var 몸 = 만들기('div', { class: 'dr' }, [
        만들기('span', { class: 'tt', text: h.제목 }),
        h.설명 ? 만들기('span', { class: 'ds', text: h.설명 }) : null
      ]);
      목록.appendChild(정리붙이기(h, 몸, 몸));
    });
    var 상자 = 만들기('div', { class: 'dbox' }, [목록]);
    return 넓게 ? 만들기('div', { class: 'pcdone' }, [상자]) : 상자;
  }

  function 본문(넓게) {
    if (말) return 만들기('div', { class: '빈글', text: 말 });
    if (!판) return null;
    if (!판.갱신) return 만들기('div', { class: '빈글', text: '아직 올라온 판이 없습니다' });
    var 고른 = 자.거르기(판.항목, 단계, 팀);
    if (!고른.length) return 만들기('div', { class: '빈글', text: '없습니다' });
    return 단계 === '완료' ? 완료목록(고른, 넓게) : 카드목록(고른, 넓게);
  }

  function 갱신칸(넓게) {
    var 글 = 판 && 판.갱신 ? '갱신 ' + 월일(판.갱신.slice(0, 10)) + ' ' + 판.갱신.slice(11, 16) : '';
    var b = 만들기('button', { type: 'button', class: 넓게 ? 'btn sm rfb' : 'rf', html: 돌림, 'aria-label': '다시 읽기' });
    b.addEventListener('click', function () { u.햅틱(); 읽기(); });
    return 만들기('span', { class: 'upd' }, [document.createTextNode(글), b]);
  }

  /* ── 그리기 ── */
  function 그리기() {
    u.열린줄잊기();
    var 스크롤 = window.scrollY;
    u.비우기(뿌리);
    var 수 = 자.세기(판 ? 판.항목 : [], 단계, 팀);
    if (u.폰인가()) {
      뿌리.appendChild(만들기('div', { class: 'ph-shell' }, [
        만들기('div', { class: 'ph-top' }, [만들기('h1', { text: '현황판' }), 갱신칸(false)]),
        만들기('div', { class: 'ph-body' }, [흐름(수.단계, false), 칩들(수.팀, false), 본문(false)]),
        u.탭바('현황판')
      ]));
    } else {
      뿌리.appendChild(만들기('div', { class: 'shell' }, [
        u.옆메뉴('현황판'),
        만들기('div', { class: 'pc-main' }, [
          만들기('div', { class: 'pc-head hb' }, [만들기('div', {}, [만들기('h2', { text: '현황판' })]), 갱신칸(true)]),
          흐름(수.단계, true), 칩들(수.팀, true), 본문(true)
        ])
      ]));
    }
    window.scrollTo(0, 스크롤);
  }

  function 시작() {
    u = ZG.ui; 만들기 = u.만들기; 자 = ZG.현황판자료;
    뿌리 = document.getElementById('앱');
    ZG.저장소.부팅();
    그리기();
    읽기();
    u.폰질의.addEventListener('change', 그리기);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) 읽기(); });
  }

  ZG.현황판 = { 시작: 시작, 읽기: 읽기, 그리기: 그리기, 상태: function () { return { 판: 판, 단계: 단계, 팀: 팀, 말: 말 }; } };
  document.addEventListener('DOMContentLoaded', 시작);
})(window.ZG);
