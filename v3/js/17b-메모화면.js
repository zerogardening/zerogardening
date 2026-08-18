/* 17b-메모화면 — 편집기 · 목록 · 달력 (12단계 설계 §2·§3·§4 · 세부설계 §3-2·§3-4)
   자료와 사진은 17a-메모자료.js 가 든다. 여기는 그리는 일만 한다.
   셸(18-메모앱)이 부르는 것은 맨 아래 ZG.메모 하나다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기, 자 = ZG.메모자료;
  var 두자리 = 자.두자리, 오늘 = 자.오늘, 새id = 자.새id;
  var 제목뽑기 = 자.제목뽑기, 미리보기 = 자.미리보기, 카드미리 = 자.카드미리;
  var 한장 = 자.한장, 목록 = 자.목록, 날짜묶기 = 자.날짜묶기;
  var 폴더세기 = 자.폴더세기, 상태세기 = 자.상태세기, 일지날들 = 자.일지날들;
  var 저장 = 자.저장, 지우기 = 자.지우기;
  var 저장통 = 자.저장통, 올리기 = 자.올리기, 서명걸기 = 자.서명걸기;
  var 요일 = ['일', '월', '화', '수', '목', '금', '토'];

  function 썸네일(r) {
    var 경로 = (r.사진들 || [])[0];
    if (!경로) return null;
    var g = 만들기('img', { class: 'thumb', alt: '', 'data-경로': 경로 });
    return g;
  }

  /* ══════════ 편집기 ══════════ */

  var 글씨색표 = [
    { 값: '#1D1D1F', 글: '검정' }, { 값: '#D93025', 글: '빨강' },
    { 값: '#2F9E44', 글: '초록' }, { 값: '#1B6EF3', 글: '파랑' }, { 값: '#8A8A8E', 글: '회색' }
  ];
  var 형광표 = [
    { 값: '#FFF3A8', 글: '노랑' }, { 값: '#D8F3C4', 글: '연두' },
    { 값: '#CFE8FF', 글: '하늘' }, { 값: '#FFD9E6', 글: '분홍' }, { 값: '', 글: '지우기' }
  ];
  var 크기표 = ['3', '5', '6'];

  /* ponytail: execCommand 는 폐기예정이다. 갈아탈 때는 이 함수 하나만 고친다 —
     Selection API + Range 로 <span> 을 직접 씌우고, 되돌리기는 자체 스택을 든다.
     🔴 부르는 자리를 늘리지 마라. 늘어나면 갈아탈 수 없다. */
  function 서식(무엇, 값) {
    try {
      if (무엇 === 'bold') return document.execCommand('bold');
      if (무엇 === 'size') return document.execCommand('fontSize', false, 값);
      if (무엇 === 'color') return document.execCommand('foreColor', false, 값);
      if (무엇 === 'mark') {
        // 웹킷 일부 판이 hiliteColor 를 안 받는다 — 그때 backColor 로 떨어진다
        if (document.execCommand('hiliteColor', false, 값)) return true;
        return document.execCommand('backColor', false, 값);
      }
      if (무엇 === 'unmark') {
        if (document.execCommand('hiliteColor', false, 'transparent')) return true;
        return document.execCommand('backColor', false, 'transparent');
      }
      if (무엇 === 'text') return document.execCommand('insertText', false, 값);
      if (무엇 === 'html') return document.execCommand('insertHTML', false, 값);
    } catch (e) { console.warn('서식을 못 걸었습니다', 무엇, e); }
    return false;
  }

  function 편집기만들기(초기HTML, 바뀜) {
    var 뿌리 = 만들기('div', {
      class: 'edit', contenteditable: 'true', role: 'textbox',
      'aria-multiline': 'true', 'aria-label': '본문'
    });
    뿌리.innerHTML = 초기HTML || '';
    try { document.execCommand('styleWithCSS', false, true); } catch (e) { /* 옛 판은 <font> 로 남는다 */ }

    /* 🔴 카페24·엑셀에서 복사한 표와 색이 통째로 들어오면 본문이 걷잡을 수 없어진다 — 평문으로 강제한다 */
    뿌리.addEventListener('paste', function (e) {
      e.preventDefault();
      var 글 = (e.clipboardData || window.clipboardData).getData('text/plain');
      서식('text', 글);
    });
    뿌리.addEventListener('input', function () { if (바뀜) 바뀜(); });

    /* 사진 빼기 — 본문에서만 뺀다. Storage 파일은 그대로 둔다(되돌릴 길을 남긴다) */
    뿌리.addEventListener('click', function (e) {
      var g = e.target;
      if (!g || g.tagName !== 'IMG') return;
      u.확인({ 제목: '이 사진을 뺄까요?', 확인글: '빼기', 위험: true }, function (예) {
        if (!예) return;
        if (g.parentNode) g.parentNode.removeChild(g);
        if (바뀜) 바뀜();
      });
    });

    서명걸기(뿌리);

    function 사진넣기(파일, 메모id) {
      if (!저장통()) { u.토스트('인터넷이 안 닿아 사진은 못 붙였습니다'); return Promise.resolve(null); }
      u.토스트('사진을 올리는 중입니다');
      return 올리기(파일, 메모id).then(function (경로) {
        뿌리.focus();
        서식('html', '<img data-경로="' + u.안전(경로) + '" alt="">');
        서명걸기(뿌리);
        if (바뀜) 바뀜();
        return 경로;
      }).catch(function (e) {
        console.warn(e);
        u.토스트('사진을 못 올렸습니다 — 글은 그대로 저장됩니다');
        return null;
      });
    }

    return {
      뿌리: 뿌리,
      읽기: function () { return 뿌리.innerHTML; },
      쓰기: function (html) { 뿌리.innerHTML = html || ''; 서명걸기(뿌리); },
      사진넣기: 사진넣기,
      사진들: function () {
        return [].slice.call(뿌리.querySelectorAll('img[data-경로]')).map(function (g) {
          return g.getAttribute('data-경로');
        });
      }
    };
  }

  /* 선택을 붙들어 둔다 — 색 고르기 시트가 뜨는 사이에 선택이 풀리면 아무 데도 안 걸린다 */
  var 붙든범위 = null;
  function 선택붙들기() {
    var s = window.getSelection();
    붙든범위 = (s && s.rangeCount) ? s.getRangeAt(0).cloneRange() : null;
  }
  function 선택되살리기(편집기) {
    편집기.뿌리.focus();
    if (!붙든범위) return;
    var s = window.getSelection();
    s.removeAllRanges();
    s.addRange(붙든범위);
  }

  function 도구줄(편집기, 사진고르기, 사진글) {
    var 줄 = 만들기('div', { class: 'tbar' });
    var 크기칸 = 0, 지금색 = 글씨색표[1].값;

    function 단추(속성, 할일) {
      var b = 만들기('button', Object.assign({ type: 'button' }, 속성));
      // 🔴 누르는 순간 본문 선택이 풀리면 아무 데도 적용되지 않는다
      b.addEventListener('mousedown', function (e) { e.preventDefault(); 선택붙들기(); });
      b.addEventListener('touchstart', function () { 선택붙들기(); }, { passive: true });
      b.addEventListener('click', function () { 할일(b); });
      줄.appendChild(b);
      return b;
    }

    var 굵게 = 단추({ html: '<b>B</b>', 'aria-label': '굵게' }, function (b) {
      선택되살리기(편집기);
      서식('bold');
      try { b.classList.toggle('on', document.queryCommandState('bold')); } catch (e) { /* 무시 */ }
    });
    편집기.뿌리.addEventListener('keyup', function () {
      try { 굵게.classList.toggle('on', document.queryCommandState('bold')); } catch (e) { /* 무시 */ }
    });

    단추({ html: '<span class="col">가<span class="sz">크기</span></span>', 'aria-label': '글자크기' }, function () {
      선택되살리기(편집기);
      크기칸 = (크기칸 + 1) % 크기표.length;
      서식('size', 크기표[크기칸]);
    });

    단추({
      html: '<span class="col">가<span class="bar" style="background:' + 지금색 + '"></span></span>',
      'aria-label': '글씨색'
    }, function (b) {
      u.고르기({
        제목: '글씨색',
        항목: 글씨색표.map(function (c) { return { 값: c.값, 글: c.글, 켬: c.값 === 지금색 }; })
      }, function (값) {
        if (값 == null) return;
        지금색 = 값;
        b.querySelector('.bar').style.background = 값;
        선택되살리기(편집기);
        서식('color', 값);
      });
    });

    단추({ html: '<span class="hl">가</span>', 'aria-label': '하이라이트' }, function () {
      u.고르기({
        제목: '하이라이트',
        항목: 형광표.map(function (c) { return { 값: c.값 || '지움', 글: c.글 }; })
      }, function (값) {
        if (값 == null) return;
        선택되살리기(편집기);
        if (값 === '지움') 서식('unmark'); else 서식('mark', 값);
      });
    });

    줄.appendChild(만들기('span', { class: 'sep' }));

    var 사진칸 = 만들기('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    사진칸.addEventListener('change', function () {
      var 파일 = 사진칸.files && 사진칸.files[0];
      사진칸.value = '';
      if (파일) 사진고르기(파일);
    });
    단추({ html: 사진글 ? '📷 사진' : '📷', 'aria-label': '사진' }, function () { 사진칸.click(); });
    줄.appendChild(사진칸);

    return 줄;
  }

  /* ══════════ 편집 상태 ══════════ */

  var 편집 = null;      // { id, 종류, 날짜, 폴더, 상태, 날씨, 특이사항, 편집기 }
  var 자동타이머 = null;

  function 값모으기() {
    var 본문 = 편집.편집기.읽기();
    var 값 = {
      id: 편집.id, 종류: 편집.종류, 날짜: 편집.날짜, 본문: 본문,
      제목: 제목뽑기(본문), 사진들: 편집.편집기.사진들()
    };
    if (편집.종류 === '메모') { 값.폴더 = 편집.폴더 || ''; 값.상태 = 편집.상태 || ''; }
    else { 값.날씨 = 편집.날씨 || ''; 값.특이사항 = 편집.특이사항 || ''; }
    return 값;
  }

  /* 저장 단추가 진실이다. 그 위에 조용한 자동저장이 얹힌다 — 화면에는 아무 표시도 안 낸다 */
  function 저장하기(조용히) {
    clearTimeout(자동타이머);
    if (!편집) return null;
    var 값 = 값모으기();
    var 결과 = 저장(값);
    if (!결과) {
      if (!조용히) u.토스트('빈 메모는 저장하지 않습니다');
      return null;
    }
    편집.id = 결과.id;
    return 결과;
  }

  function 바뀜() {
    clearTimeout(자동타이머);
    자동타이머 = setTimeout(function () { 저장하기(true); }, 3000);
  }

  function 마무리() {   // 화면을 뜰 때 조용히 한 번 더
    if (편집) 저장하기(true);
    clearTimeout(자동타이머);
    편집 = null;
  }

  function 폼차리기(종류, 레코드, 날짜) {
    var r = 레코드 || {};
    편집 = {
      id: r.id || null, 종류: 종류, 날짜: r.날짜 || 날짜 || 오늘(),
      폴더: r.폴더 || '', 상태: r.상태 || '', 날씨: r.날씨 || '', 특이사항: r.특이사항 || '',
      편집기: null, 고친때: r.고친때 || 0
    };
    편집.편집기 = 편집기만들기(r.본문 || '', 바뀜);
    편집.편집기.뿌리.addEventListener('blur', function () { 저장하기(true); });
    return 편집;
  }

  function 사진고르기(파일) {
    if (!편집) return;
    if (!편집.id) {                       // 사진 경로에 id 가 들어간다 — 먼저 줄을 만든다
      var 만든것 = 저장하기(true);
      if (!만든것) 편집.id = 새id(편집.종류, 편집.날짜);
    }
    편집.편집기.사진넣기(파일, 편집.id);
  }

  function 편집도구줄() { return 도구줄(편집.편집기, 사진고르기, !u.폰인가()); }

  /* ══════════ 공통 부품 ══════════ */

  function 날짜글(날짜) {
    var d = new Date(날짜 + 'T00:00:00');
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + 요일[d.getDay()] + ')';
  }
  function 시각글(밀리) {
    if (!밀리) return '';
    var d = new Date(밀리);
    return 두자리(d.getHours()) + ':' + 두자리(d.getMinutes());
  }
  function 달글(달) { return Number(달.slice(0, 4)) + '년 ' + Number(달.slice(5, 7)) + '월'; }

  function 달옮기기(달, 걸음) {
    var 해 = Number(달.slice(0, 4)), 월 = Number(달.slice(5, 7)) + 걸음;
    해 += Math.floor((월 - 1) / 12);
    월 = ((월 - 1) % 12 + 12) % 12 + 1;
    return 해 + '-' + 두자리(월);
  }

  function 달고르개(달) {
    var 칸 = 만들기('div', { class: 'mnav' });
    var 앞 = 만들기('button', { type: 'button', text: '‹', 'aria-label': '지난 달' });
    앞.addEventListener('click', function () { ZG.메모앱.달로(달옮기기(달, -1)); });
    var 뒤 = 만들기('button', { type: 'button', text: '›', 'aria-label': '다음 달' });
    뒤.addEventListener('click', function () { ZG.메모앱.달로(달옮기기(달, 1)); });
    칸.appendChild(앞);
    칸.appendChild(만들기('b', { text: 달.replace('-', '.') }));
    칸.appendChild(뒤);
    return 칸;
  }

  function 칩(글, 켬, 누름, 수) {
    var b = 만들기('button', { type: 'button', class: 'fchip' + (켬 ? ' on' : ''), text: 글 });
    if (수 != null) b.appendChild(만들기('span', { class: 'n', text: String(수) }));
    b.addEventListener('click', 누름);
    return b;
  }

  /* ══════════ 메모 탭 ══════════ */

  var 검색어 = '', 폴더거르개 = '', 상태거르개 = '';

  function 메모카드(r, 고름) {
    var 몸 = 만들기('div', { class: 'body' }, [
      만들기('div', { class: 'mt', text: r.제목 || 제목뽑기(r.본문) }),
      만들기('div', { class: 'mp', text: 카드미리(r.본문) })
    ]);
    var 끝줄 = 만들기('div', { class: 'mm' }, [만들기('span', { class: 'tm', text: 시각글(r.만든때) })]);
    if (r.폴더) 끝줄.appendChild(만들기('span', { class: 'ftag', text: '📁 ' + r.폴더 }));
    if (r.상태) {
      var 결 = r.상태 === '할일' ? ' wait' : (r.상태 === '끝' ? ' done' : '');
      끝줄.appendChild(만들기('span', { class: 'chip' + 결, text: r.상태 }));
    }
    몸.appendChild(끝줄);
    var 카드 = 만들기('div', { class: 'mcard' + (고름 ? ' on' : '') }, [몸, 썸네일(r)]);
    카드.addEventListener('click', function () { ZG.메모앱.열기(r.id); });
    return 카드;
  }

  function 목록칸그리기(칸, 종류) {
    u.비우기(칸);
    var 달 = ZG.메모앱.달();
    var 줄들 = 목록({ 종류: 종류, 달: 달, 검색: 검색어, 폴더: 폴더거르개, 상태: 상태거르개 });
    var 고른것 = ZG.메모앱.연것();
    날짜묶기(줄들).forEach(function (묶음) {
      칸.appendChild(만들기('div', { class: 'ph-sec' }, [
        만들기('span', { text: 날짜글(묶음.날짜) }),
        만들기('span', { class: 'r', text: 묶음.줄들.length + '건' })
      ]));
      var 목 = 만들기('div', { class: 'mlist' });
      묶음.줄들.forEach(function (r) { 목.appendChild(메모카드(r, r.id === 고른것)); });
      칸.appendChild(목);
    });
    서명걸기(칸);
  }

  function 메모목록판(자리) {
    var 달 = ZG.메모앱.달();

    var 검색칸 = 만들기('input', { class: 'inp q', placeholder: '메모 검색', value: 검색어, type: 'search' });
    var 목록칸 = 만들기('div', { class: 'mlist-wrap', style: 'display:flex; flex-direction:column; gap:var(--space-md)' });
    // 🔴 한글이 들어가는 칸이다. 직접 oninput 으로 다시 그리면 조합이 끊긴다
    u.조합안전입력(검색칸, function (값) {
      검색어 = 값;
      목록칸그리기(목록칸, '메모');
    }, 220);
    자리.appendChild(만들기('div', { class: 'srow' }, [검색칸, 달고르개(달)]));

    var 폴더들 = 폴더세기(달);
    var 폴더줄 = 만들기('div', { class: 'fchips' });
    폴더줄.appendChild(칩('전체', !폴더거르개, function () {
      폴더거르개 = ''; ZG.메모앱.다시그리기();
    }, 목록({ 종류: '메모', 달: 달 }).length));
    폴더들.forEach(function (f) {
      폴더줄.appendChild(칩(f.이름, 폴더거르개 === f.이름, function () {
        폴더거르개 = 폴더거르개 === f.이름 ? '' : f.이름;   // 한 번 더 누르면 꺼진다
        ZG.메모앱.다시그리기();
      }, f.수));
    });
    자리.appendChild(폴더줄);

    var 셈 = 상태세기(달);
    var 상태줄 = 만들기('div', { class: 'fchips' });
    ['할일', '하는중', '끝'].forEach(function (이름) {
      상태줄.appendChild(칩(이름, 상태거르개 === 이름, function () {
        상태거르개 = 상태거르개 === 이름 ? '' : 이름;
        ZG.메모앱.다시그리기();
      }, 셈[이름]));
    });
    if (!u.폰인가()) {
      var 새것 = 만들기('button', { class: 'btn sm', type: 'button', text: '＋ 새 메모', style: 'margin-left:auto' });
      새것.addEventListener('click', function () { ZG.메모앱.열기('새'); });
      상태줄.appendChild(새것);
    }
    자리.appendChild(상태줄);

    목록칸그리기(목록칸, '메모');
    자리.appendChild(목록칸);
  }

  function 폴더칸() {
    var 목록id = 'zg-폴더목록';
    var 칸 = 만들기('input', { class: 'inp', list: 목록id, value: 편집.폴더 });
    var 데이터 = 만들기('datalist', { id: 목록id });
    폴더세기('').forEach(function (f) { 데이터.appendChild(만들기('option', { value: f.이름 })); });
    // 🔴 한글 칸이다 — 조합안전입력으로 받는다
    u.조합안전입력(칸, function (값) { 편집.폴더 = 값; 바뀜(); }, 200);
    칸.addEventListener('blur', function () { 편집.폴더 = 칸.value; 저장하기(true); });
    return 만들기('div', { class: 'field', style: u.폰인가() ? null : 'width:200px' },
      [만들기('label', { text: '폴더' }), 데이터, 칸]);
  }

  function 상태칸() {
    var 줄 = 만들기('div', { class: 'fchips' });
    ['할일', '하는중', '끝'].forEach(function (이름) {
      var b = 칩(이름, 편집.상태 === 이름, function () {
        편집.상태 = 편집.상태 === 이름 ? '' : 이름;   // 한 번 더 누르면 꺼진다
        [].slice.call(줄.children).forEach(function (c) {
          c.classList.toggle('on', c.textContent === 편집.상태);
        });
        바뀜();
      });
      줄.appendChild(b);
    });
    return 만들기('div', { class: 'field' }, [만들기('label', { text: '진행상황' }), 줄]);
  }

  function 저장누름() {
    var 종류 = 편집 && 편집.종류;
    var 결과 = 저장하기(false);
    if (!결과) return;
    u.토스트('저장했습니다');
    if (u.폰인가()) { ZG.메모앱.닫기(); return; }
    if (종류 === '메모') ZG.메모앱.열기(결과.id);   // PC 는 저장한 것을 그대로 열어 둔다
    else ZG.메모앱.다시그리기();
  }

  function 삭제누름() {
    var id = 편집 && 편집.id;
    if (!id || !한장(id)) { ZG.메모앱.닫기(); return; }
    u.확인({ 제목: '이 기록을 지울까요?', 확인글: '지우기', 위험: true }, function (예) {
      if (!예) return;
      지우기(id);
      편집 = null;
      u.토스트('지웠습니다');
      ZG.메모앱.닫기();
    });
  }

  function PC메모카드() {
    var 머리 = 만들기('h3', { text: '메모 쓰기' });
    머리.appendChild(만들기('span', {
      class: 'hint', text: 편집.날짜 + ' (' + 요일[new Date(편집.날짜 + 'T00:00:00').getDay()] + ')' +
        (편집.고친때 ? ' ' + 시각글(편집.고친때) : '')
    }));
    var 오른 = 만들기('span', { class: 'right', style: 'display:flex; gap:var(--space-sm)' });
    var 삭제 = 만들기('button', { class: 'btn sm', type: 'button', text: '삭제' });
    삭제.addEventListener('click', 삭제누름);
    var 저장b = 만들기('button', { class: 'btn main sm', type: 'button', text: '저장' });
    저장b.addEventListener('click', 저장누름);
    오른.appendChild(삭제); 오른.appendChild(저장b);
    머리.appendChild(오른);

    return 만들기('div', { class: 'card' }, [
      머리,
      만들기('div', { class: 'row bottom' }, [폴더칸(), 상태칸()]),
      편집도구줄(),
      편집.편집기.뿌리
    ]);
  }

  function 팹(누름) {
    var b = 만들기('button', { class: 'ph-fab', type: 'button', text: '＋', 'aria-label': '새로 쓰기' });
    b.addEventListener('click', 누름);
    return b;
  }

  function 그리기메모(자리) {
    마무리();
    var 연것 = ZG.메모앱.연것();

    if (u.폰인가()) {
      if (연것) {
        폼차리기('메모', 연것 === '새' ? null : 한장(연것), 오늘());
        자리.appendChild(폴더칸());
        자리.appendChild(상태칸());
        자리.appendChild(만들기('div', {}, [편집도구줄(), 편집.편집기.뿌리]));
      } else {
        메모목록판(자리);
        자리.appendChild(팹(function () { ZG.메모앱.열기('새'); }));
      }
      return;
    }

    폼차리기('메모', (연것 && 연것 !== '새') ? 한장(연것) : null, 오늘());
    var 왼 = 만들기('div', { class: 'left' });
    메모목록판(왼);
    var 오 = 만들기('div', { class: 'right' }, [PC메모카드()]);
    자리.appendChild(만들기('div', { class: 'cols' }, [왼, 오]));
  }

  function 요약메모() {
    var 연것 = ZG.메모앱.연것();
    if (u.폰인가() && 연것) {
      var r = 연것 === '새' ? null : 한장(연것);
      var 날 = (r && r.날짜) || 오늘();
      var 때 = r && r.만든때 ? ' ' + 시각글(r.만든때) : '';
      return { 왼: 날 + ' (' + 요일[new Date(날 + 'T00:00:00').getDay()] + ')' + 때, 오: '' };
    }
    var 달 = ZG.메모앱.달();
    return { 왼: 달글(달), 오: '메모 <b>' + 목록({ 종류: '메모', 달: 달 }).length + '</b>건' };
  }

  function 폰머리메모() {
    var 연것 = ZG.메모앱.연것();
    if (!연것) return { 제목: '메모' };
    return { 제목: 연것 === '새' ? '새 메모' : '메모', 저장: 저장누름 };
  }

  /* ══════════ 영농일지 탭 ══════════ */

  var 날씨표 = [['맑음', '☀️'], ['흐림', '☁️'], ['비', '🌧'], ['눈', '❄️'], ['바람', '💨']];
  function 날씨글(값) {
    for (var i = 0; i < 날씨표.length; i++) if (날씨표[i][0] === 값) return 날씨표[i][1] + ' ' + 값;
    return 값 || '';
  }

  function 달력(달) {
    var 칸 = 만들기('div', {});
    var 머리 = 만들기('div', { class: 'calhd' });
    var 앞 = 만들기('button', { type: 'button', text: '‹', 'aria-label': '지난 달' });
    앞.addEventListener('click', function () { ZG.메모앱.달로(달옮기기(달, -1)); });
    var 뒤 = 만들기('button', { type: 'button', text: '›', 'aria-label': '다음 달' });
    뒤.addEventListener('click', function () { ZG.메모앱.달로(달옮기기(달, 1)); });
    머리.appendChild(앞);
    머리.appendChild(만들기('div', { class: 'm', text: 달글(달) }));
    머리.appendChild(뒤);
    칸.appendChild(머리);

    var 격자 = 만들기('div', { class: 'cal' });
    요일.forEach(function (w, i) {
      격자.appendChild(만들기('div', { class: 'wd' + (i === 0 ? ' sun' : ''), text: w }));
    });

    var 해 = Number(달.slice(0, 4)), 월 = Number(달.slice(5, 7));
    var 첫날 = new Date(해, 월 - 1, 1);
    var 날수 = new Date(해, 월, 0).getDate();
    var 빈칸 = 첫날.getDay();
    var 점 = 일지날들(달), 오늘날 = 오늘(), 고른날 = ZG.메모앱.고른날();

    for (var i = 0; i < 빈칸; i++) 격자.appendChild(만들기('div', { class: 'd off' }));
    for (var d = 1; d <= 날수; d++) {
      var 날짜 = 달 + '-' + 두자리(d);
      var 결 = 'd';
      if (new Date(해, 월 - 1, d).getDay() === 0) 결 += ' sun';
      if (날짜 === 고른날) 결 += ' on';
      else if (날짜 === 오늘날) 결 += ' today';
      var b = 만들기('button', { type: 'button', class: 결, text: String(d) });
      b.appendChild(만들기('span', { class: 'dot' + (점[날짜] ? '' : ' none') }));
      (function (값) { b.addEventListener('click', function () { ZG.메모앱.날고르기(값); }); })(날짜);
      격자.appendChild(b);
    }
    칸.appendChild(격자);
    return 칸;
  }

  function 날씨칸() {
    var 줄 = 만들기('div', { class: u.폰인가() ? 'fchips' : 'weatherrow' });
    날씨표.forEach(function (쌍, 자리) {
      // 🔴 저장값은 낱말만('맑음'). 이모지는 화면에서만 붙인다
      var b = 칩(쌍[1] + ' ' + 쌍[0], 편집.날씨 === 쌍[0], function () {
        편집.날씨 = 편집.날씨 === 쌍[0] ? '' : 쌍[0];
        [].slice.call(줄.children).forEach(function (c, i) {
          c.classList.toggle('on', 날씨표[i][0] === 편집.날씨);
        });
        바뀜();
      });
      줄.appendChild(b);
    });
    return 만들기('div', { class: 'field', style: u.폰인가() ? null : 'flex:1' },
      [만들기('label', { text: '날씨' }), 줄]);
  }

  function 특이사항칸() {
    var 칸 = 만들기('textarea', { class: 'sisan', rows: '3', 'aria-label': '특이사항' });
    칸.value = 편집.특이사항 || '';
    u.조합안전입력(칸, function (값) { 편집.특이사항 = 값; 바뀜(); }, 200);
    칸.addEventListener('blur', function () { 편집.특이사항 = 칸.value; 저장하기(true); });
    return 만들기('div', { class: 'field' }, [만들기('label', { text: '특이사항' }), 칸]);
  }

  function 작업내용칸() {
    return 만들기('div', { class: 'field', style: u.폰인가() ? null : 'margin-bottom:var(--space-xl)' }, [
      만들기('label', { text: '작업내용' }), 편집도구줄(), 편집.편집기.뿌리
    ]);
  }

  function 일지카드(r) {
    var 몸 = 만들기('div', { class: 'body' }, [
      만들기('div', { class: 'mt', text: 날씨글(r.날씨) || 제목뽑기(r.본문) }),
      만들기('div', { class: 'mp', text: 카드미리(r.본문) }),
      만들기('div', { class: 'mm' }, [만들기('span', { class: 'tm', text: '고친때 ' + 시각글(r.고친때) })])
    ]);
    var 카드 = 만들기('div', { class: 'mcard' }, [몸, 썸네일(r)]);
    카드.addEventListener('click', function () { ZG.메모앱.열기(r.id); });
    return 카드;
  }

  function PC일지카드() {
    var 머리 = 만들기('h3', { text: 날짜글(편집.날짜) + ' 일지' });
    if (편집.고친때) 머리.appendChild(만들기('span', { class: 'hint', text: '고친때 ' + 시각글(편집.고친때) }));
    var 오른 = 만들기('span', { class: 'right', style: 'display:flex; gap:var(--space-sm)' });
    var 삭제 = 만들기('button', { class: 'btn sm', type: 'button', text: '삭제' });
    삭제.addEventListener('click', 삭제누름);
    var 저장b = 만들기('button', { class: 'btn main sm', type: 'button', text: '저장' });
    저장b.addEventListener('click', 저장누름);
    오른.appendChild(삭제); 오른.appendChild(저장b);
    머리.appendChild(오른);

    return 만들기('div', { class: 'card' }, [
      머리, 만들기('div', { class: 'row bottom' }, [날씨칸()]), 작업내용칸(), 특이사항칸()
    ]);
  }

  function 그리기일지(자리) {
    마무리();
    var 달 = ZG.메모앱.달(), 고른날 = ZG.메모앱.고른날();
    var 있던것 = 한장('일지-' + 고른날);

    if (u.폰인가()) {
      if (ZG.메모앱.연것()) {
        폼차리기('일지', 있던것, 고른날);
        편집.id = '일지-' + 고른날;
        자리.appendChild(날씨칸());
        자리.appendChild(작업내용칸());
        자리.appendChild(특이사항칸());
        return;
      }
      자리.appendChild(달력(달));
      자리.appendChild(만들기('div', { class: 'ph-sec' }, [만들기('span', { text: 날짜글(고른날) })]));
      if (있던것) {
        var 목 = 만들기('div', { class: 'mlist' }, [일지카드(있던것)]);
        자리.appendChild(목);
        서명걸기(목);
      }
      자리.appendChild(팹(function () { ZG.메모앱.열기('일지-' + 고른날); }));
      return;
    }

    폼차리기('일지', 있던것, 고른날);
    편집.id = '일지-' + 고른날;
    var 왼 = 만들기('div', { class: 'cal-col' }, [만들기('div', { class: 'card' }, [달력(달)])]);
    var 오 = 만들기('div', { class: 'right' }, [PC일지카드()]);
    자리.appendChild(만들기('div', { class: 'cols' }, [왼, 오]));
  }

  function 요약일지() {
    if (u.폰인가() && ZG.메모앱.연것()) return { 왼: '', 오: '' };
    return { 왼: 달글(ZG.메모앱.달()), 오: '' };
  }

  function 폰머리일지() {
    if (!ZG.메모앱.연것()) return { 제목: '영농일지' };
    return { 제목: 날짜글(ZG.메모앱.고른날()), 저장: 저장누름 };
  }

  window.addEventListener('pagehide', function () { if (편집) 저장하기(true); });

  ZG.메모 = {
    오늘: 오늘, 목록: 목록, 한장: 한장, 저장: 저장, 지우기: 지우기, 마무리: 마무리,
    메모탭: { 그리기: 그리기메모, 요약: 요약메모, 폰머리: 폰머리메모 },
    일지탭: { 그리기: 그리기일지, 요약: 요약일지, 폰머리: 폰머리일지 }
  };
})(window.ZG);
