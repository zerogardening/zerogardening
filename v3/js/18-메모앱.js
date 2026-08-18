/* 18-메모앱 — 메모.html 셸. 2탭 라우팅 · 폭 전환 (12단계 세부설계 §4)
   패턴은 14-소싱앱과 같다. 다른 것은 달(‹ ›)과 「열어 둔 것」을 여기서 든다는 것뿐이다.
   연것: null(목록) | '새'(새 메모) | 메모 id. 폰에서만 목록/쓰기를 오간다 — PC는 늘 좌우분할이다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 뿌리, 본문;
  var 탭 = '메모';                      // '메모' | '일지'
  var 탭이름 = { 메모: '메모', 일지: '영농일지' };
  var 달, 고른날값, 연것값 = null;

  function 지금모듈() { return 탭 === '메모' ? ZG.메모.메모탭 : ZG.메모.일지탭; }
  function 길() { return '메모 › ' + 탭이름[탭]; }

  /* ── PC ── */
  function PC뼈대() {
    var 옆 = u.옆메뉴('메모');
    var 머리 = 만들기('div', { class: 'pc-head' }, [
      만들기('h2', { text: '메모' }), 만들기('div', { class: 'path', text: 길() })
    ]);

    var 탭줄 = 만들기('div', { class: 'pc-tabs', role: 'tablist' });
    ['메모', '일지'].forEach(function (이름) {
      var b = 만들기('button', {
        type: 'button', role: 'tab', text: 탭이름[이름],
        class: 탭 === 이름 ? 'on' : '', 'aria-selected': 탭 === 이름 ? 'true' : 'false'
      });
      b.addEventListener('click', function () { 탭으로(이름); });
      탭줄.appendChild(b);
    });

    본문 = 만들기('div', { class: 'pc-본문' });
    뿌리.appendChild(만들기('div', { class: 'shell' }, [옆, 만들기('div', { class: 'pc-main' }, [머리, 탭줄, 본문])]));
  }

  /* ── 폰 ── */
  function 폰뼈대() {
    var m = 지금모듈();
    var 머리 = m.폰머리 ? m.폰머리() : { 제목: 탭이름[탭] };
    var 정보 = m.요약 ? m.요약() : { 왼: '', 오: '' };
    var 쓰는중 = !!연것값;

    var 왼쪽 = 만들기('div', { class: '왼', style: 'min-width:0' });
    var 뒤 = 만들기('button', { class: 'ph-back', type: 'button', text: '‹', 'aria-label': '뒤로' });
    뒤.addEventListener('click', function () {
      if (쓰는중) 닫기(); else location.href = 'index.html';
    });
    왼쪽.appendChild(뒤);
    왼쪽.appendChild(만들기('h1', { text: 머리.제목, style: 쓰는중 ? 'font-size:var(--font-4xl)' : null }));

    var 위 = 만들기('div', { class: 'ph-top' }, [왼쪽]);
    if (머리.저장) {
      var 저장b = 만들기('button', { class: 'btn main sm', type: 'button', text: '저장' });
      저장b.addEventListener('click', 머리.저장);
      위.appendChild(저장b);
    }

    var 조각 = [위];
    if (정보.왼 || 정보.오) {
      조각.push(만들기('div', { class: 'ph-sub' }, [
        만들기('span', { html: 정보.왼 || '' }), 만들기('span', { html: 정보.오 || '' })
      ]));
    }

    본문 = 만들기('div', { class: 'ph-body tight' });
    if (!쓰는중) {
      var 탭줄 = 만들기('div', { class: 'toggle', style: 'height:36px' });
      ['메모', '일지'].forEach(function (이름) {
        var b = 만들기('button', {
          type: 'button', class: 탭 === 이름 ? 'on' : '', text: 탭이름[이름], style: 'flex:1; padding:0'
        });
        b.addEventListener('click', function () { 탭으로(이름); });
        탭줄.appendChild(b);
      });
      본문.appendChild(탭줄);
    }
    조각.push(본문);

    // 「메모」 칸을 다시 눌러도 페이지를 새로 열지 않는다 — 적던 것이 날아간다
    조각.push(u.탭바('메모', function (이름) {
      if (이름 !== '메모') return false;
      if (연것값) 닫기();
      return true;
    }));

    뿌리.appendChild(만들기('div', { class: 'ph-shell' }, 조각));
  }

  function 다시그리기() {
    u.비우기(뿌리);
    if (u.폰인가()) 폰뼈대(); else PC뼈대();
    지금모듈().그리기(본문);
  }

  function 요약다시() {
    if (!u.폰인가()) return;
    var m = 지금모듈();
    if (!m.요약) return;
    var 정보 = m.요약();
    var 줄 = 뿌리.querySelector('.ph-sub');
    if (!줄) return;
    줄.children[0].innerHTML = 정보.왼 || '';
    줄.children[1].innerHTML = 정보.오 || '';
  }

  function 탭으로(이름) {
    if (탭 !== 이름) 연것값 = null;   // 메모 id 를 일지 화면이 물고 가지 않게
    탭 = 이름;
    다시그리기();
  }

  function 달로(값) {
    달 = 값;
    if (고른날값.slice(0, 7) !== 달) 고른날값 = 달 + '-01';
    연것값 = null;
    다시그리기();
  }

  function 날고르기(날짜) {
    고른날값 = 날짜;
    연것값 = null;
    다시그리기();
  }

  function 열기(id) { 연것값 = id; 다시그리기(); }
  function 닫기() { 연것값 = null; 다시그리기(); }

  function 시작() {
    뿌리 = document.getElementById('앱');
    ZG.저장소.부팅();
    고른날값 = ZG.메모.오늘();
    달 = 고른날값.slice(0, 7);
    다시그리기();
    u.폰질의.addEventListener('change', 다시그리기);
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf('zg.v3.') === 0) 다시그리기();
    });
  }

  /* 🔴 이름은 '메모앱'이다 — 01b-서버.js 의 다시그리기 목록이 이 이름으로 찾는다 */
  ZG.메모앱 = {
    시작: 시작, 다시그리기: 다시그리기, 요약다시: 요약다시, 탭으로: 탭으로,
    달: function () { return 달; }, 달로: 달로,
    고른날: function () { return 고른날값; }, 날고르기: 날고르기,
    연것: function () { return 연것값; }, 열기: 열기, 닫기: 닫기
  };
  document.addEventListener('DOMContentLoaded', 시작);
})(window.ZG);
