/* 04-공통UI — 포맷터 · 토스트 · 자동완성 · 스테퍼 (설계 §6-6 · §10 · §11) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 폰질의 = window.matchMedia('(max-width: 899px)');
  var 움직임끔질의 = window.matchMedia('(prefers-reduced-motion: reduce)');

  function 폰인가() { return 폰질의.matches; }
  function 움직임끔() { return 움직임끔질의.matches; }

  function 만들기(태그, 속성, 자식) {
    var e = document.createElement(태그);
    if (속성) Object.keys(속성).forEach(function (k) {
      if (k === 'class') e.className = 속성[k];
      else if (k === 'html') e.innerHTML = 속성[k];
      else if (k === 'text') e.textContent = 속성[k];
      else if (k.slice(0, 2) === 'on') e.addEventListener(k.slice(2), 속성[k]);
      else if (속성[k] != null) e.setAttribute(k, 속성[k]);
    });
    (자식 || []).forEach(function (c) { if (c) e.appendChild(c); });
    return e;
  }

  function 비우기(요소) { while (요소.firstChild) 요소.removeChild(요소.firstChild); }

  function 콤마(수) { return (Number(수) || 0).toLocaleString('ko-KR'); }
  function 숫자(문자) {
    var s = String(문자 == null ? '' : 문자).replace(/[,\s원]/g, '');
    var n = Number(s);
    return isNaN(n) ? 0 : n;
  }
  function 오늘문자() { return ZG.계산.날짜문자(Date.now()); }

  function 안전(문자) {
    return String(문자 == null ? '' : 문자)
      .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
  }

  /* ── 토스트 ── */
  function 토스트(글) {
    var 칸 = document.getElementById('토스트칸');
    if (!칸) return;
    var t = 만들기('div', { class: 'toast', role: 'status', 'aria-live': 'polite', text: 글 });
    칸.appendChild(t);
    var 머무름 = 움직임끔() ? 1200 : 2600;
    setTimeout(function () {
      t.className = 'toast 가는중';
      setTimeout(function () { if (t.parentNode) t.parentNode.removeChild(t); }, 260);
    }, 머무름);
  }

  /* ── 확인 대화상자 — macOS 방식. window.confirm 대신 톤을 맞춘다 ──
     되돌릴 수 없는 일(입고 삭제)과 되돌리기 어려운 일(새 업체 등록)에만 쓴다. */
  function 확인(옵션, 그때) {
    var 앞선것 = document.querySelector('.askbox');
    if (앞선것) return;                       // 두 겹으로 뜨지 않게
    var 되돌릴포커스 = document.activeElement;

    function 닫기(답) {
      document.removeEventListener('keydown', 열쇠);
      if (막) 막.remove();
      if (상자) 상자.remove();
      if (되돌릴포커스 && 되돌릴포커스.focus) 되돌릴포커스.focus();
      그때(답);
    }
    function 열쇠(e) {
      if (e.key === 'Escape') { e.preventDefault(); 닫기(false); }
      else if (e.key === 'Tab') {
        var 것들 = 상자.querySelectorAll('button');
        var 처음 = 것들[0], 끝 = 것들[것들.length - 1];
        if (e.shiftKey && document.activeElement === 처음) { e.preventDefault(); 끝.focus(); }
        else if (!e.shiftKey && document.activeElement === 끝) { e.preventDefault(); 처음.focus(); }
      }
    }

    var 막 = 만들기('div', { class: 'askscrim' });
    막.addEventListener('click', function () { 닫기(false); });

    var 아니오 = 만들기('button', { class: 'btn', type: 'button', text: 옵션.취소글 || '취소' });
    아니오.addEventListener('click', function () { 닫기(false); });
    var 예 = 만들기('button', { class: 'btn ' + (옵션.위험 ? 'warn' : 'main'), type: 'button', text: 옵션.확인글 || '확인' });
    예.addEventListener('click', function () { 닫기(true); });

    var 상자 = 만들기('div', { class: 'askbox', role: 'dialog', 'aria-modal': 'true' }, [
      만들기('h4', { text: 옵션.제목 }),
      옵션.본문 ? 만들기('p', { html: 옵션.본문 }) : null,
      만들기('div', { class: 'btnrow' }, [아니오, 예])
    ]);

    document.body.appendChild(막);
    document.body.appendChild(상자);
    document.addEventListener('keydown', 열쇠);
    setTimeout(function () { 예.focus(); }, 20);
  }

  /* ── 물음 — 한 줄만 받는 대화상자. window.prompt 를 쓰지 않는다 (4단계 설계 §3-2) ──
     답을 받으면 그때(글), 취소면 그때(null). 폰에서는 아래에서 올라오는 시트 모양이다. */
  function 물음(옵션, 그때) {
    if (document.querySelector('.askbox')) return;
    var 되돌릴포커스 = document.activeElement;

    var 칸 = 만들기('input', {
      class: 'inp', type: 'text', value: 옵션.값 || '',
      placeholder: 옵션.자리표시 || '', maxlength: String(옵션.최대 || 40)
    });

    function 닫기(답) {
      document.removeEventListener('keydown', 열쇠);
      막.remove(); 상자.remove();
      if (되돌릴포커스 && 되돌릴포커스.focus) 되돌릴포커스.focus();
      그때(답);
    }
    function 확정() {
      var v = 칸.value.trim();
      if (!v) { 흔들기(칸); 칸.focus(); return; }
      닫기(v);
    }
    function 열쇠(e) { if (e.key === 'Escape') { e.preventDefault(); 닫기(null); } }

    // 조합 중 Enter 는 글자 확정이지 제출이 아니다
    칸.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
      e.preventDefault(); 확정();
    });

    var 막 = 만들기('div', { class: 'askscrim' });
    막.addEventListener('click', function () { 닫기(null); });

    var 아니오 = 만들기('button', { class: 'btn', type: 'button', text: '취소' });
    아니오.addEventListener('click', function () { 닫기(null); });
    var 예 = 만들기('button', { class: 'btn main', type: 'button', text: 옵션.확인글 || '확인' });
    예.addEventListener('click', 확정);

    var 상자 = 만들기('div', {
      class: 'askbox' + (폰인가() ? ' sheetup' : ''), role: 'dialog', 'aria-modal': 'true'
    }, [
      만들기('h4', { text: 옵션.제목 }),
      옵션.본문 ? 만들기('p', { html: 옵션.본문 }) : null,
      만들기('div', { class: 'field' }, [
        만들기('label', { text: 옵션.이름 || '이름' }), 칸
      ]),
      만들기('div', { class: 'btnrow' }, [아니오, 예])
    ]);

    document.body.appendChild(막);
    document.body.appendChild(상자);
    document.addEventListener('keydown', 열쇠);
    setTimeout(function () { 칸.focus(); 칸.select(); }, 20);
  }

  /* ── 고르기 시트 — 항목 하나를 고른다. 취소면 그때(null) ── */
  function 고르기(옵션, 그때) {
    if (document.querySelector('.askbox')) return;
    var 되돌릴포커스 = document.activeElement;

    function 닫기(값) {
      document.removeEventListener('keydown', 열쇠);
      막.remove(); 상자.remove();
      if (되돌릴포커스 && 되돌릴포커스.focus) 되돌릴포커스.focus();
      그때(값);
    }
    function 열쇠(e) { if (e.key === 'Escape') { e.preventDefault(); 닫기(null); } }

    var 막 = 만들기('div', { class: 'askscrim' });
    막.addEventListener('click', function () { 닫기(null); });

    var 목록 = 만들기('div', { class: 'picklist' });
    (옵션.항목 || []).forEach(function (it) {
      var b = 만들기('button', { type: 'button', class: it.켬 ? 'on' : '', text: it.글 });
      b.addEventListener('click', function () { 닫기(it.값); });
      목록.appendChild(b);
    });

    var 닫기버튼 = 만들기('button', { class: 'btn', type: 'button', text: '닫기' });
    닫기버튼.addEventListener('click', function () { 닫기(null); });

    var 상자 = 만들기('div', {
      class: 'askbox' + (폰인가() ? ' sheetup' : ''), role: 'dialog', 'aria-modal': 'true'
    }, [
      만들기('h4', { text: 옵션.제목 }),
      옵션.본문 ? 만들기('p', { html: 옵션.본문 }) : null,
      목록,
      만들기('div', { class: 'btnrow' }, [닫기버튼])
    ]);

    document.body.appendChild(막);
    document.body.appendChild(상자);
    document.addEventListener('keydown', 열쇠);
  }

  /* ── 폰 아래 「⋯ 더보기」 ── 갈 곳이 둘이라 화면마다 제 시트를 만들면 네 벌이 어긋난다.
     네 화면(상품·주문·업체·소싱)이 이 하나를 같이 쓴다 (4단계 설계 §7) */
  function 더보기시트(지금) {
    고르기({
      제목: '더보기',
      본문: '폰 아래 탭에 자리가 없어 여기 모았습니다.',
      항목: [
        { 값: '업체', 글: '🏢 업체 관리', 켬: 지금 === '업체' },
        { 값: '소싱', 글: '🌱 상품소싱', 켬: 지금 === '소싱' }
      ]
    }, function (값) {
      if (값 === '업체') location.href = '업체.html';
      else if (값 === '소싱') location.href = '소싱.html';
    });
  }

  /* ── 창 Esc 는 주인이 하나다 ──
     창(.pcsheet)은 한 번에 하나만 뜬다. 그런데 모듈마다 document 에 제 리스너를 걸어 두면
     앞 창 것이 안 떨어진 채로 남아, 확인 상자 위에서 Esc 를 눌렀을 때 그 창까지 같이 닫혔다.
     (동봉카드 위에 설정 창 → 삭제 확인 → Esc → 쓰던 값 통째로 날아감. 2026-08-05 검수)
     그래서 자리를 하나만 둔다. 새로 걸면 앞엣것은 그 자리에서 밀려난다. */
  var 탈출할일 = null;

  function 탈출열쇠(e) {
    if (e.key !== 'Escape' || !탈출할일) return;
    if (document.querySelector('.askbox')) return;   // 확인 상자가 떠 있으면 Esc 는 그 상자 몫이다
    탈출할일();
  }

  function 탈출걸기(할일) {
    document.removeEventListener('keydown', 탈출열쇠);
    탈출할일 = 할일;
    document.addEventListener('keydown', 탈출열쇠);
  }

  function 탈출풀기() {
    탈출할일 = null;
    document.removeEventListener('keydown', 탈출열쇠);
  }

  /* ── 검사 실패한 칸 흔들기 ── */
  function 흔들기(요소) {
    if (!요소) return;
    요소.getAnimations && 요소.getAnimations().forEach(function (a) { a.cancel(); });
    요소.classList.remove('흔듦');
    void 요소.offsetWidth;
    요소.classList.add('흔듦');
    setTimeout(function () { 요소.classList.remove('흔듦'); }, 320);
  }

  /* ── 목록 등장 — 앞 6줄만 시차 (설계 §10-3) ── */
  function 목록등장(줄들) {
    Array.prototype.slice.call(줄들).forEach(function (줄, i) {
      if (i >= 6) return;
      줄.classList.add('등장');
      줄.style.animationDelay = (i * 24) + 'ms';
      줄.addEventListener('animationend', function () {
        줄.classList.remove('등장'); 줄.style.animationDelay = '';
      }, { once: true });
    });
  }

  function 번쩍(요소) {
    if (!요소) return;
    요소.classList.add('번쩍');
    setTimeout(function () { 요소.classList.remove('번쩍'); }, 700);
  }

  /* ── 한글 IME 안전 입력 ──
     아이폰에서 「휴케라」가 ㅎㅠㅋㅔㄹㅏ 로 떨어지던 버그.
     조합(composition) 중에 목록을 다시 그리면 조합이 끊긴다.
     그래서 조합이 끝난 뒤에만, 그것도 debounce 를 걸어 한 번만 처리한다.
     처리(값) 안에서 입력칸의 value 를 덮어쓰거나 DOM 을 갈아끼우지 않는다. */
  function 조합안전입력(입력, 처리, 지연) {
    var 조합중 = false, 타이머 = null;
    var 밀리 = 지연 == null ? 180 : 지연;

    function 예약() {
      clearTimeout(타이머);
      타이머 = setTimeout(function () { 처리(입력.value); }, 밀리);
    }

    입력.addEventListener('compositionstart', function () { 조합중 = true; });
    // 브라우저에 따라 compositionend 시점에 isComposing 이 이미 false 다 — 여기서 한 번 확실히 처리한다
    입력.addEventListener('compositionend', function () { 조합중 = false; 예약(); });
    입력.addEventListener('input', function (e) {
      if (조합중 || e.isComposing) return;
      예약();
    });
    return { 조합중: function () { return 조합중; }, 취소: function () { clearTimeout(타이머); } };
  }

  /* ── 스테퍼 — 길게 누르면 연속 (설계 §8-2) ── */
  function 스테퍼(값, 바뀜) {
    var 숫자칸 = 만들기('div', { class: 'num', text: String(값) });
    var 지금 = 값;

    function 놓기(delta) {
      지금 = Math.max(0, 지금 + delta);
      숫자칸.textContent = String(지금);
      숫자칸.classList.remove('톡'); void 숫자칸.offsetWidth; 숫자칸.classList.add('톡');
      바뀜(지금);
    }

    function 누름버튼(글, delta) {
      var 타이머 = null, 반복 = null;
      function 멈춤() { clearTimeout(타이머); clearInterval(반복); }
      var b = 만들기('button', { type: 'button', text: 글, 'aria-label': delta > 0 ? '하나 늘리기' : '하나 줄이기' });
      b.addEventListener('click', function () { 놓기(delta); });
      b.addEventListener('pointerdown', function () {
        타이머 = setTimeout(function () { 반복 = setInterval(function () { 놓기(delta); }, 60); }, 400);
      });
      ['pointerup', 'pointerleave', 'pointercancel'].forEach(function (e) { b.addEventListener(e, 멈춤); });
      return b;
    }

    var 상자 = 만들기('div', { class: 'stepper' }, [누름버튼('－', -1), 숫자칸, 누름버튼('＋', 1)]);
    상자.맞추기 = function (새값) { 지금 = 새값; 숫자칸.textContent = String(새값); };
    return 상자;
  }

  /* ── 자동완성 (설계 §6-6) ──
     묶는 단위는 접두 5자. 규격만 다른 것은 한 줄로 묶는다. */
  function 후보찾기(글) {
    var 열쇠 = String(글).toLowerCase().replace(/\s/g, '');
    if (!열쇠) return [];
    var 저 = ZG.저장소;
    var 품목 = 저.품목들();
    var 입고 = 저.읽기(저.키.입고);

    var 묶음 = {};
    품목.forEach(function (p) {
      var 밭 = (p.유통명 + p.학명 + p.품목코드).toLowerCase().replace(/\s/g, '');
      if (밭.indexOf(열쇠) < 0) return;
      var g = 묶음[p.접두] || (묶음[p.접두] = { 접두: p.접두, 품목들: [], 입고건수: 0, 최근입고일: '', 최근규격: '', 최근단가: 0 });
      g.품목들.push(p);
    });

    Object.keys(묶음).forEach(function (접두) {
      var g = 묶음[접두];
      g.품목들.sort(function (a, b) { return a.규격cm - b.규격cm; });
      g.대표 = g.품목들[0];
      입고.forEach(function (r) {
        if (String(r.품목코드).slice(0, 5) !== 접두) return;
        g.입고건수 += 1;
        if (String(r.입고일) >= g.최근입고일) {
          g.최근입고일 = String(r.입고일); g.최근규격 = r.규격; g.최근단가 = r.매입단가;
        }
      });
      if (!g.최근규격) { g.최근규격 = g.대표.규격; g.최근단가 = g.대표.매입단가; }
    });

    return Object.keys(묶음).map(function (k) { return 묶음[k]; })
      .sort(function (a, b) { return b.입고건수 - a.입고건수; })
      .slice(0, 6);
  }

  function 자동완성(설정) {
    var 입력 = 설정.입력, 담을곳 = 설정.담을곳;
    var 목록 = [], 고른칸 = -1, 상자 = null;

    function 닫기() {
      if (상자 && 상자.parentNode) 상자.parentNode.removeChild(상자);
      상자 = null; 고른칸 = -1;   // 목록은 지우지 않는다 — 그리기()가 닫기()를 먼저 부른다
      입력.setAttribute('aria-expanded', 'false');
    }

    function 표시() {
      var 줄들 = 상자 ? 상자.querySelectorAll('.it') : [];
      Array.prototype.forEach.call(줄들, function (줄, i) {
        줄.classList.toggle('on', i === 고른칸);
        줄.setAttribute('aria-selected', i === 고른칸 ? 'true' : 'false');
      });
    }

    function 그리기() {
      닫기();
      if (!목록.length && !설정.새로) return;
      상자 = 만들기('div', { class: 'ac', role: 'listbox' });
      상자.appendChild(만들기('div', {
        class: 'hd',
        text: 목록.length
          ? '전에 넣은 것에서 ' + 목록.length + '건 찾았습니다 — 고르면 학명 · 품목코드가 저절로 채워집니다'
          : '전에 넣은 것에는 없습니다'
      }));

      목록.forEach(function (g, i) {
        var 왼 = 만들기('div', {}, [
          만들기('div', { class: 'nm', text: g.대표.유통명 }),
          만들기('div', { class: 'sci', text: g.대표.학명 })
        ]);
        var 자식 = [만들기('div', { class: 'cd', text: g.접두 }), 왼];
        if (!폰인가()) {
          자식.push(만들기('div', {
            class: 'rg',
            html: '입고 ' + g.입고건수 + '건 · 최근 ' + 안전(g.최근입고일 || '—') +
                  '<br>' + 안전(g.최근규격) + ' · ' + 콤마(g.최근단가) + '원'
          }));
        }
        var 줄 = 만들기('button', { type: 'button', class: 'it', role: 'option', 'aria-selected': 'false' }, 자식);
        줄.addEventListener('mousedown', function (e) { e.preventDefault(); });
        줄.addEventListener('click', function () { var g2 = g; 닫기(); 설정.고름(g2); });
        줄.addEventListener('mousemove', function () { 고른칸 = i; 표시(); });
        상자.appendChild(줄);
      });

      if (설정.새로) {
        var 새줄 = 만들기('button', {
          type: 'button', class: 'new',
          html: '＋ 목록에 없습니다 — 새 품목으로 등록 <span>학명을 끝까지 치면 품목코드가 새로 만들어집니다</span>'
        });
        새줄.addEventListener('mousedown', function (e) { e.preventDefault(); });
        새줄.addEventListener('click', function () { 닫기(); 설정.새로(); });
        상자.appendChild(새줄);
      }

      담을곳.appendChild(상자);
      입력.setAttribute('aria-expanded', 'true');
    }

    입력.setAttribute('role', 'combobox');
    입력.setAttribute('aria-expanded', 'false');
    입력.setAttribute('autocomplete', 'off');

    조합안전입력(입력, function (값) {
      var 글 = String(값).trim();
      if (글.length < 1) { 목록 = []; 닫기(); return; }
      목록 = 후보찾기(글); 고른칸 = -1; 그리기();
    }, 150);

    입력.addEventListener('keydown', function (e) {
      if (e.isComposing || e.keyCode === 229) return;   // 조합 중 Enter 는 글자 확정이지 선택이 아니다
      if (!상자) return;
      if (e.key === 'ArrowDown') { e.preventDefault(); 고른칸 = Math.min(고른칸 + 1, 목록.length - 1); 표시(); }
      else if (e.key === 'ArrowUp') { e.preventDefault(); 고른칸 = Math.max(고른칸 - 1, 0); 표시(); }
      else if (e.key === 'Enter') {
        if (고른칸 >= 0) { e.preventDefault(); var g = 목록[고른칸]; 닫기(); 설정.고름(g); }
      } else if (e.key === 'Escape') { e.preventDefault(); 닫기(); }
      else if (e.key === 'Tab') { 닫기(); }
    });

    입력.addEventListener('blur', function () { setTimeout(닫기, 120); });

    return { 닫기: 닫기 };
  }

  ZG.ui = {
    만들기: 만들기, 비우기: 비우기, 안전: 안전,
    콤마: 콤마, 숫자: 숫자, 오늘문자: 오늘문자,
    폰인가: 폰인가, 폰질의: 폰질의, 움직임끔: 움직임끔,
    토스트: 토스트, 확인: 확인, 물음: 물음, 고르기: 고르기, 더보기시트: 더보기시트, 흔들기: 흔들기, 목록등장: 목록등장, 번쩍: 번쩍,
    탈출걸기: 탈출걸기, 탈출풀기: 탈출풀기,
    스테퍼: 스테퍼, 자동완성: 자동완성, 후보찾기: 후보찾기,
    조합안전입력: 조합안전입력
  };
})(window.ZG);
