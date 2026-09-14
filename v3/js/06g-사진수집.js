/* 06g-사진수집 — 입고 화면 맨 아래 「상세페이지 작업 대기」 + 품목을 열면 사진 7칸 (15단계 A)
   사진은 Supabase Storage 의 공개 버킷 product 에 품목코드로 들어간다 — product/{품목코드}/3.jpg.
   🔴 경로에 한글을 쓰면 400 InvalidKey 다. 품목코드가 곧 열쇠다.
   맥은 도구/사진받기.py 로 받아 ~/이미지/{식물}/ 에 떨군다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;

  /* 🔴 소급 방지 경계 — 굴러가는 창이 아니라 박아 둔 날이다.
     2026-09-14 우람님 지시로 9/9 → 9/1 로 당겼다. 제작대기 11품목이 전부 9/4 등록이라
     경계 밖으로 밀려 「사진 대기」로 9일째 서 있었다. 이미 다 만든 34품목은 여전히 안 뜬다. */
  var 경계 = new Date(2026, 8, 1).getTime();

  /* [번호, 이름, 찍는자리, 추가(없어도 된다)] — 필수는 7개, 6~9 는 넣어도 되고 안 넣어도 된다 */
  var 자리들 = [
    [1, '대표이미지 배경'], [2, '구역1 메인'], [3, '구역2 꽃'], [4, '구역3 잎'], [5, '구역4 재배'],
    [6, '추가', false, true], [7, '추가', false, true], [8, '추가', false, true], [9, '추가', false, true],
    [10, '구역6 실촬영 · 화분 하나', true], [11, '구역6 실촬영 · 여러 포기', true]
  ];

  function 필수수(있다) {
    return 자리들.filter(function (자) { return !자[3] && 있다(자[0]); }).length;
  }

  /* 자름 창·추가 칸 모양 — 06g 만 쓰는 몇 줄이라 여기 둔다(css 캐시버스터를 안 건드리려는 뜻도 있다) */
  var 결 = document.createElement('style');
  결.textContent =
    '.사진칸.추가 .이름{color:var(--color-text-faint)}' +
    '.사진칸.추가 .번{background:transparent; color:var(--color-text-faint); border:1px dashed var(--color-border)}' +
    '.사진칸.추가 .틀.빔{border-style:dotted; opacity:.65}' +
    '.자름덮개{position:fixed; inset:0; z-index:220; background:rgba(0,0,0,.62); display:flex;' +
    ' flex-direction:column; align-items:center; justify-content:center; gap:14px; padding:16px}' +
    '.자름상자{position:relative; width:min(360px,86vw); aspect-ratio:1/1; overflow:hidden;' +
    ' border-radius:var(--radius-md); background:#000; touch-action:none; cursor:grab}' +
    '.자름상자 canvas{position:absolute; left:0; top:0}' +
    '.자름줄{display:flex; gap:10px}' +
    '.ph-card.끝남, tr.끝남{opacity:.5}' +
    '.사진창 .hd .cd{min-width:0; overflow:hidden; text-overflow:ellipsis; white-space:nowrap}';
  document.head.appendChild(결);

  function 통() {
    var 서 = ZG.서버;
    return 서 && 서.켜짐 && 서.클라이언트 ? 서.클라이언트.storage.from('product') : null;
  }

  /* ══════════ 사진 올리기 — 17a-메모자료.js 의 줄이기/올리기를 버킷만 바꿔 가져왔다 ══════════ */

  function 그림읽기(파일) {
    // 회전을 먼저 편다 — 안 하면 아이폰 세로 사진이 눕는다
    if (window.createImageBitmap) {
      try { return createImageBitmap(파일, { imageOrientation: 'from-image' }); } catch (e) {}
    }
    return new Promise(function (좋다, 안된다) {
      var 주소 = URL.createObjectURL(파일);
      var g = new Image();
      g.onload = function () { URL.revokeObjectURL(주소); 좋다(g); };
      g.onerror = function () { URL.revokeObjectURL(주소); 안된다(new Error('사진을 못 읽었습니다')); };
      g.src = 주소;
    });
  }

  /* 자른것 = {그림, 잘:{x,y,변}} — 우람님이 쓰시는 사진은 다 1:1 이라 정사각으로만 만든다 */
  function 판그리기(자른것, 최대) {
    var 잘 = 자른것.잘, 변 = Math.min(최대, Math.round(잘.변));
    var 판 = document.createElement('canvas');
    판.width = 변; 판.height = 변;
    판.getContext('2d').drawImage(자른것.그림, 잘.x, 잘.y, 잘.변, 잘.변, 0, 0, 변, 변);
    return 판;
  }

  function 블롭(판, q) {
    return new Promise(function (좋다, 안된다) {
      판.toBlob(function (b) { b ? 좋다(b) : 안된다(new Error('사진을 못 줄였습니다')); }, 'image/jpeg', q);
    });
  }

  /* 원본(1600·q80)과 썸네일(200·q70)을 한 번에 만든다 —
     목록에서 1600px 을 받으면 폰에서 몇 초씩 걸린다 */
  function 두장만들기(자른것) {
    return Promise.all([블롭(판그리기(자른것, 1600), 0.8), 블롭(판그리기(자른것, 200), 0.7)]);
  }

  function 올리기(코드, 번, 자른것) {
    var t = 통();
    if (!t) return Promise.reject(new Error('오프라인'));
    return 두장만들기(자른것).then(function (둘) {
      var 옵션 = { contentType: 'image/jpeg', upsert: true };
      return Promise.all([
        t.upload(코드 + '/' + 번 + '.jpg', 둘[0], 옵션),
        t.upload(코드 + '/thumb/' + 번 + '.jpg', 둘[1], 옵션)
      ]);
    }).then(function (답들) {
      답들.forEach(function (답) { if (답 && 답.error) throw 답.error; });
    });
  }

  function 주소(코드, 길, 때) {
    var t = 통();
    if (!t) return '';
    var 답 = t.getPublicUrl(코드 + '/' + 길);
    var url = (답 && 답.data && 답.data.publicUrl) || '';
    return url ? url + '?t=' + 때 : '';       // 덮어써도 주소가 같다 — 캐시를 깨야 새 사진이 보인다
  }

  /* 그 품목에 이미 올라간 번호들 */
  function 사진훑기(코드) {
    var t = 통();
    if (!t) return Promise.resolve({});
    return t.list(코드, { limit: 100 }).then(function (답) {
      if (답 && 답.error) throw 답.error;
      var 표 = {};
      ((답 && 답.data) || []).forEach(function (f) {
        var m = /^(\d+)\.jpg$/.exec(f.name || '');
        if (m) 표[m[1]] = Date.parse((f.updated_at || f.created_at) || '') || Date.now();
      });
      return 표;
    });
  }

  /* ══════════ 대기 목록 ══════════ */

  var 진행순 = { 대기: 1, 받음: 2, 끝: 3 };

  /* 06e 의 현황() 은 상태가 '끝' 인 것을 빼 버려 완료를 가려낼 수 없다 — 표를 직접 본다.
     같은 품목에 요청이 둘이면 더 진행된 쪽이 그 품목의 상태다 */
  function 상세요청(코드) {
    var 최 = null;
    ZG.저장소.읽기(ZG.저장소.키.제작요청).forEach(function (r) {
      if (r.삭제됨 || r.종류 !== '상세페이지' || r.품목코드 !== 코드) return;
      if (!최 || (진행순[r.상태] || 0) > (진행순[최.상태] || 0)) 최 = r;
    });
    return 최;
  }

  function 상태표() {
    var 표 = {};
    ZG.저장소.읽기(ZG.저장소.키.제작요청).forEach(function (r) {
      if (r.삭제됨 || r.종류 !== '상세페이지') return;
      if ((진행순[r.상태] || 0) > (진행순[표[r.품목코드]] || 0)) 표[r.품목코드] = r.상태;
    });
    return 표;
  }

  /* 요청이 걸려도 목록에서 빼지 않는다 — 그 뒤에도 사진을 바꿔야 한다.
     완료(끝)는 흐리게 해서 맨 아래로 내린다 */
  function 대기품목(뺀것) {
    var 상 = 상태표();
    return ZG.저장소.품목들().filter(function (p) {
      return (p.등록일시 || 0) >= 경계 && (뺀것 ? !!p.사진뺌 : !p.사진뺌);
    }).sort(function (a, b) {
      var x = 상[a.품목코드] === '끝' ? 1 : 0, y = 상[b.품목코드] === '끝' ? 1 : 0;
      return x !== y ? x - y : (b.등록일시 || 0) - (a.등록일시 || 0);
    });
  }

  /* 🔴 완료는 우람님이 손으로 누르신다. 제작요청 기록으로는 판정할 수 없다 —
     9/4 입고 11품목은 요청을 안 거치고 상세페이지가 끝나 기록이 아예 없다 (2026-09-14)
     🔴 데이터 열쇠는 `사진뺌` 그대로다. 뜻만 「완료」로 바뀌었다 —
     이름을 갈면 이미 빼 두신 품목이 통째로 작업중으로 되돌아온다 (2026-09-14 우람님) */
  var 완료보기 = false;

  function 완료누름(p) {
    var 끝낼까 = !완료보기;
    ZG.저장소.바꾸기(ZG.저장소.키.품목, p.품목코드, { 사진뺌: 끝낼까, 수정일시: Date.now() });
    u.토스트((끝낼까 ? '완료했습니다 — ' : '작업중으로 되돌렸습니다 — ') + p.품목코드);
    칠하기();
  }

  function 뺌단추(p) {
    var b = 만들기('button', { class: '뺌', type: 'button', text: 완료보기 ? '↺' : '✓',
                               title: 완료보기 ? '작업중으로 되돌리기' : '완료로 보내기' });
    b.addEventListener('click', function (e) { e.stopPropagation(); 완료누름(p); });   // 줄을 누르면 사진창이 열린다
    return b;
  }

  /* 🔴 우람님 확정 — 「한 탭 안에서 갈라보기」. 칩 둘로 오간다 (2026-09-14) */
  function 갈래칩(작업수, 완료수) {
    var 줄 = 만들기('div', { class: '갈래칩' });
    [['작업중', false, 작업수], ['완료', true, 완료수]].forEach(function (것) {
      var b = 만들기('button', {
        type: 'button', class: 'fchip' + (완료보기 === 것[1] ? ' on' : ''),
        html: 것[0] + ' <span class="n">' + 것[2] + '</span>'
      });
      b.addEventListener('click', function () { 완료보기 = 것[1]; 칠하기(); });
      줄.appendChild(b);
    });
    return 줄;
  }

  function 칩달기(칩, 코드, 상태) {
    if (상태 === '끝') { 칩.textContent = '완료'; 칩.className = 'chip 사진 완'; return; }
    if (상태 === '받음') { 칩.textContent = '제작 중'; 칩.className = 'chip 요청 진행'; return; }
    if (상태 === '대기') { 칩.textContent = '요청함'; 칩.className = 'chip 요청'; return; }
    사진훑기(코드).then(function (표) {
      var 수 = 필수수(function (번) { return 표[번]; });
      칩.textContent = 수 + '/7';
      칩.className = 'chip 사진' + (수 === 7 ? ' 완' : (수 ? ' 일부' : ''));
    }).catch(function () { 칩.style.display = 'none'; });   // 못 세면 숫자를 지어내지 않는다
  }

  /* 폰 — 05d 의 폰내역() 카드와 같은 결(.ph-list > .ph-card) */
  /* 🔴 폰에서 카드를 왼쪽으로 밀면 빼기가 나온다 (2026-09-14 우람님 「✕ 가 작아 불편하다」).
     어려운 점은 **미는 것과 누르는 것이 같은 손짓**이라는 것이다 — 카드를 누르면 사진창이 열린다.
     그래서 가로로 8px 넘게 움직인 뒤에야 밀기로 보고, 그때부터 누름을 죽인다.
     세로로 먼저 움직이면 아예 손을 뗀다 — 목록 스크롤을 뺏으면 안 된다. */
  var 열린칸 = null;                    // 한 번에 하나만 열어 둔다
  var 단추폭 = 88;

  function 밀기붙이기(싼것, 칸, p) {
    var 시작X = 0, 시작Y = 0, 미는중 = false, 정했나 = false, 열림 = false, 지금 = 0;

    function 옮기기(px, 부드럽게) {
      지금 = px;
      싼것.classList.toggle('끄는중', !부드럽게);
      칸.style.transform = px ? 'translateX(' + px + 'px)' : '';
    }
    function 닫기() { 열림 = false; 옮기기(0, true); if (열린칸 === 싼것) 열린칸 = null; }
    function 열기단추() {
      열림 = true; 옮기기(-단추폭, true);
      if (열린칸 && 열린칸 !== 싼것) 열린칸.__닫기();
      열린칸 = 싼것;
    }
    싼것.__닫기 = 닫기;

    칸.addEventListener('touchstart', function (e) {
      if (e.touches.length !== 1) return;
      시작X = e.touches[0].clientX; 시작Y = e.touches[0].clientY;
      미는중 = true; 정했나 = false;
    }, { passive: true });

    칸.addEventListener('touchmove', function (e) {
      if (!미는중) return;
      var dx = e.touches[0].clientX - 시작X, dy = e.touches[0].clientY - 시작Y;
      if (!정했나) {
        if (Math.abs(dx) < 8 && Math.abs(dy) < 8) return;    // 아직 무엇인지 모른다
        정했나 = true;
        if (Math.abs(dy) > Math.abs(dx)) { 미는중 = false; return; }   // 세로다 — 스크롤에 넘긴다
      }
      var 밑 = 열림 ? -단추폭 : 0;
      var px = Math.max(-단추폭 - 18, Math.min(0, 밑 + dx));   // 오른쪽으로는 안 넘어간다
      옮기기(px, false);
    }, { passive: true });

    function 끝(e) {
      if (!미는중) return;
      미는중 = false;
      if (!정했나) return;                      // 그냥 누른 것이다 — click 이 알아서 연다
      if (e) { e.preventDefault(); e.stopPropagation(); }
      if (지금 < -단추폭 / 2) 열기단추(); else 닫기();
    }
    칸.addEventListener('touchend', 끝);
    칸.addEventListener('touchcancel', 끝);

    // 🔴 민 직후의 click 을 죽인다 — 안 그러면 손을 떼는 순간 사진창이 같이 열린다
    칸.addEventListener('click', function (e) {
      if (정했나 || 열림) { e.preventDefault(); e.stopPropagation(); if (열림) return; }
    }, true);
  }

  function 민카드(칸, p) {
    var 싼것 = 만들기('div', { class: '민칸' + (완료보기 ? ' 되돌리기' : '') });
    var 뒷 = 만들기('button', { type: 'button', class: '뒷단추',
      html: 완료보기 ? '↺<span>작업</span>' : '✓<span>완료</span>' });
    뒷.addEventListener('click', function (e) {
      e.stopPropagation();
      열린칸 = null;
      완료누름(p);
    });
    싼것.appendChild(뒷);
    싼것.appendChild(칸);
    밀기붙이기(싼것, 칸, p);
    return 싼것;
  }

  function 폰목록(목록) {
    var 상 = 상태표();
    var 목 = 만들기('div', { class: 'ph-list' });
    목록.forEach(function (p) {
      var 칸 = 만들기('div', { class: 'ph-card' + (상[p.품목코드] === '끝' ? ' 끝남' : '') });
      칸.innerHTML =
        '<div class="r1"><div class="nm">' + u.안전(p.유통명) + '</div><div class="cd">' + u.안전(p.품목코드) + '</div></div>' +
        '<div class="sci">' + u.안전(p.학명) + '</div>' +
        '<div class="r2">' + u.안전(p.규격) + '<span class="amt"><span class="chip 사진">…</span></span></div>';
      칩달기(칸.querySelector('.chip'), p.품목코드, 상[p.품목코드]);
      칸.addEventListener('click', function () { 열기(p); });
      칸.appendChild(뺌단추(p));            // 밀기가 안 되는 기기를 위해 남겨 둔다(폰에선 CSS 로 감춘다)
      목.appendChild(민카드(칸, p));
    });
    u.목록등장(목.children);
    // 🔴 머리줄을 안 단다 — 위 요약줄과 갈래칩이 이미 같은 말을 하고 있다 (2026-09-14)
    return 만들기('div', { class: 'stack' }, [목]);
  }

  /* PC — 05d 의 내역카드() 와 같은 결(.card.table-card > .tablewrap > table) */
  function PC목록(목록) {
    var 상 = 상태표();
    var 카드 = 만들기('div', { class: 'card table-card' });
    var 머리 = 만들기('div', { class: '사진머리' }, [
      만들기('h3', { text: 완료보기 ? '완료' : '작업중' })
    ]);
    카드.appendChild(머리);
    var 표 = 만들기('table');
    표.innerHTML =
      '<colgroup><col style="width:110px"><col><col style="width:110px"><col style="width:120px"><col style="width:56px"></colgroup>' +
      '<thead><tr><th>품목코드</th><th>유통명 · 학명</th><th>규격</th><th>사진</th><th></th></tr></thead>';
    var 몸 = 만들기('tbody');
    목록.forEach(function (p) {
      var 줄 = 만들기('tr', { class: 상[p.품목코드] === '끝' ? '끝남' : '', style: 'cursor:pointer' });
      줄.innerHTML =
        '<td class="code">' + u.안전(p.품목코드) + '</td>' +
        '<td>' + u.안전(p.유통명) + '<div class="sci">' + u.안전(p.학명) + '</div></td>' +
        '<td class="dim">' + u.안전(p.규격) + '</td>' +
        '<td><span class="chip 사진">…</span></td>' +
        '<td class="뺌칸"></td>';
      칩달기(줄.querySelector('.chip'), p.품목코드, 상[p.품목코드]);
      줄.querySelector('.뺌칸').appendChild(뺌단추(p));
      줄.addEventListener('click', function () { 열기(p); });
      몸.appendChild(줄);
    });
    표.appendChild(몸);
    카드.appendChild(만들기('div', { class: 'tablewrap' }, [표]));
    u.목록등장(몸.children);
    return 카드;
  }

  /* 입고를 저장하면 05d 의 내역다시() 가 이걸 같이 부른다 — 새 품목이 바로 보여야 한다 */
  var 대기칸 = null;

  function 칠하기() {
    if (!대기칸) return;
    대기칸.innerHTML = '';
    var 작업수 = 대기품목(false).length, 완료수 = 대기품목(true).length;
    var 목록 = 대기품목(완료보기);
    if (!작업수 && !완료수) {              // 아직 아무것도 없다
      대기칸.appendChild(만들기('div', { class: '지시-빈', style: 'padding:var(--space-4xl) 0',
        html: '사진이 다 차면 여기에 쌓입니다.' }));
      return;
    }
    대기칸.appendChild(갈래칩(작업수, 완료수));
    대기칸.appendChild(u.폰인가() ? 폰목록(목록) : PC목록(목록));
  }

  function 대기카드() {
    완료보기 = false;                      // 화면을 새로 그리면 「완료」가 아니라 작업중부터 보인다
    대기칸 = 만들기('div');
    칠하기();
    return 대기칸;
  }

  function 대기다시() { 칠하기(); }

  /* ══════════ 1:1 로 자르기 — 끌어서 자리만 옮긴다(확대·축소는 안 넣는다) ══════════ */

  function 자름열기(파일, 넣을때) {
    그림읽기(파일).then(function (그림) {
      var 덮개 = 만들기('div', { class: '자름덮개' });
      var 상자 = 만들기('div', { class: '자름상자' });
      var 그만 = 만들기('button', { class: 'btn', type: 'button', text: '그만' });
      var 넣기 = 만들기('button', { class: 'btn main', type: 'button', text: '넣기' });
      덮개.appendChild(상자);
      덮개.appendChild(만들기('div', { class: '자름줄' }, [그만, 넣기]));
      document.body.appendChild(덮개);

      var 박스 = 상자.clientWidth;
      var 배율 = 박스 / Math.min(그림.width, 그림.height);   // 정사각을 꽉 채운다(cover)
      var 폭 = Math.round(그림.width * 배율), 높 = Math.round(그림.height * 배율);
      var 판 = document.createElement('canvas');
      판.width = 폭; 판.height = 높;
      판.getContext('2d').drawImage(그림, 0, 0, 폭, 높);
      상자.appendChild(판);

      var x = (박스 - 폭) / 2, y = (박스 - 높) / 2;          // 기본은 가운데
      function 놓기() { 판.style.left = x + 'px'; 판.style.top = y + 'px'; }
      놓기();

      var 잡은 = null;
      function 자리(e) { var t = e.touches && e.touches[0]; return t || e; }
      function 시작(e) { var p = 자리(e); 잡은 = { x: p.clientX - x, y: p.clientY - y }; }
      function 끌기(e) {
        if (!잡은) return;
        e.preventDefault();
        var p = 자리(e);
        x = Math.min(0, Math.max(박스 - 폭, p.clientX - 잡은.x));
        y = Math.min(0, Math.max(박스 - 높, p.clientY - 잡은.y));
        놓기();
      }
      function 놓침() { 잡은 = null; }
      상자.addEventListener('mousedown', 시작);
      상자.addEventListener('touchstart', 시작, { passive: true });
      document.addEventListener('mousemove', 끌기);
      document.addEventListener('touchmove', 끌기, { passive: false });
      document.addEventListener('mouseup', 놓침);
      document.addEventListener('touchend', 놓침);

      function 치우기() {
        document.removeEventListener('mousemove', 끌기);
        document.removeEventListener('touchmove', 끌기);
        document.removeEventListener('mouseup', 놓침);
        document.removeEventListener('touchend', 놓침);
        if (덮개.parentNode) 덮개.parentNode.removeChild(덮개);
        if (창) u.탈출걸기(닫기);                            // 탈출은 한 자리뿐이라 사진 창 것으로 되돌린다
      }
      그만.addEventListener('click', function () {
        if (그림.close) 그림.close();
        치우기();
      });
      넣기.addEventListener('click', function () {
        치우기();
        넣을때({ 그림: 그림, 잘: { x: -x / 배율, y: -y / 배율, 변: Math.min(그림.width, 그림.height) } });
      });
      u.탈출걸기(function () { if (그림.close) 그림.close(); 치우기(); });
    }).catch(function (e) {
      console.warn(e);
      u.토스트('사진을 못 읽었습니다');
    });
  }

  /* ══════════ 사진 7칸 ══════════ */

  var 창 = null;

  function 닫기() {
    if (!창) return;
    u.탈출풀기();
    if (창.덮개.parentNode) 창.덮개.parentNode.removeChild(창.덮개);
    창 = null;
  }

  function 붙이기(번, 자른것) {
    var 그창 = 창;                                  // 올리는 사이에 창이 닫히거나 다른 품목으로 바뀔 수 있다
    창.진행[번] = { 퍼센트: 12 };
    판다시();
    var 막대 = 창.판.querySelector('[data-바="' + 번 + '"]');
    if (막대) setTimeout(function () { 막대.style.width = '88%'; }, 30);
    올리기(창.코드, 번, 자른것).then(function () {
      if (그창 !== 창) return;
      delete 창.진행[번];
      창.있는것[번] = Date.now();
      if (자른것.그림.close) 자른것.그림.close();
      판다시();
    }).catch(function (e) {
      if (그창 !== 창) return;
      console.warn('사진 올리기 실패', e);
      창.진행[번] = { 실패: true, 자른것: 자른것 };   // 다시 올릴 때 자른 자리를 그대로 쓴다
      판다시();
    });
  }

  function 칸그리기(자리) {
    var 번 = 자리[0], 진 = 창.진행[번], 때 = 창.있는것[번];
    var 칸 = 만들기('div', { class: '사진칸' + (자리[2] ? ' 찍기' : '') + (자리[3] ? ' 추가' : '') + (진 && 진.실패 ? ' 실패' : '') });
    칸.appendChild(만들기('div', {
      class: '이름',
      html: '<span class="번' + (때 && !진 ? ' 됨' : '') + '">' + 번 + '</span>' + u.안전(자리[1])
    }));

    var 틀 = 만들기('div', { class: '틀' + (때 || 진 ? '' : ' 빔') });
    if (때) 틀.appendChild(만들기('img', { src: 주소(창.코드, 'thumb/' + 번 + '.jpg', 때), alt: '' }));
    else if (!진) 틀.appendChild(만들기('span', { class: '빈표', text: 자리[2] ? '📷' : '＋' }));

    var 고르기 = 만들기('input', { type: 'file', accept: 'image/*', style: 'display:none' });
    고르기.addEventListener('change', function () {
      var 파일 = 고르기.files && 고르기.files[0];
      고르기.value = '';
      if (파일) 자름열기(파일, function (자른것) { 붙이기(번, 자른것); });
    });
    틀.appendChild(고르기);

    if (진 && 진.실패) {
      var 다시올리기 = 만들기('button', { class: 'btn sm', type: 'button', text: '다시 올리기' });
      다시올리기.addEventListener('click', function () { 붙이기(번, 진.자른것); });
      틀.appendChild(만들기('div', { class: '덮개' }, [
        만들기('div', { class: '상태', text: '올리지 못했습니다' }), 다시올리기
      ]));
    } else if (진) {
      var 바 = 만들기('i', { style: 'width:' + 진.퍼센트 + '%' });
      바.dataset.바 = 번;
      틀.appendChild(만들기('div', { class: '덮개' }, [
        만들기('div', { class: '상태', text: '올리는 중' }), 만들기('div', { class: '바' }, [바])
      ]));
    } else if (때) {
      var 다시 = 만들기('button', { class: '다시', type: 'button', text: '다시' });
      다시.addEventListener('click', function (e) { e.stopPropagation(); 고르기.click(); });
      틀.appendChild(다시);
    }

    if (!진) 틀.addEventListener('click', function () { 고르기.click(); });
    칸.appendChild(틀);
    return 칸;
  }

  function 판다시() {
    if (!창) return;
    u.비우기(창.판);
    자리들.forEach(function (자리) { 창.판.appendChild(칸그리기(자리)); });
    var 수 = 필수수(function (번) { return 창.있는것[번]; });   // 추가 칸(6~9)은 안 센다
    창.셈.textContent = 수 + '/7';
    창.셈.className = 'chip 사진' + (수 === 7 ? ' 완' : (수 ? ' 일부' : ''));
    단추맞추기(수);
  }

  /* 단추는 상태에 따라 셋이다 — 요청 전 / 완료로 표시 / 완료 취소 */
  function 단추맞추기(수) {
    var 상 = 창.상태;
    창.요청.textContent = !상 ? '상세페이지 요청' : (상 === '끝' ? '완료 취소' : '완료로 표시');
    창.요청.className = 'btn' + (상 === '끝' ? '' : ' main');
    창.요청.disabled = !상 && 수 < 7;
  }

  function 단추누름() {
    if (!창) return;
    if (!창.상태) { 요청걸기(); return; }
    var r = 상세요청(창.코드);
    if (!r) { u.토스트('요청 기록을 못 찾았습니다'); return; }
    var 새 = 창.상태 === '끝' ? '받음' : '끝';
    ZG.저장소.바꾸기(ZG.저장소.키.제작요청, r.id, { 상태: 새 });   // 서버 전송은 저장소가 한다
    창.상태 = 새;
    판다시();
    ZG.앱.다시그리기();
    u.토스트(새 === '끝' ? '완료로 표시했습니다' : '완료를 취소했습니다');
  }

  function 요청걸기() {
    // 06e 는 재고 목록에서 고른 것을 본다 — 손대지 않고 고른 것만 갈아 끼운다
    ZG.재고목록.상태.선택 = {};
    ZG.재고목록.상태.선택[창.코드] = true;
    ZG.제작요청.요청하기('상세페이지', 닫기);
  }

  /* ══════════ 갈래 셋 — [사진][원고][결과] (15단계 B 설계 §1·§4) ══════════ */

  var 갈래들 = ['사진', '원고', '결과'];

  /* 사진 갈래는 A단계 그대로다. 원고·결과만 몸을 갈아 끼운다 */
  function 몸다시() {
    if (!창) return;
    u.비우기(창.몸);
    창.셈.style.display = 창.갈래 === '사진' ? '' : 'none';
    [].slice.call(창.갈래줄.children).forEach(function (b, i) {
      b.className = 갈래들[i] === 창.갈래 ? 'on' : '';
    });
    if (창.갈래 === '사진') {
      창.몸.appendChild(창.판);
      창.몸.appendChild(창.버튼줄);
      판다시();
    } else if (창.갈래 === '원고') ZG.원고화면.그리기(창.몸, 창);
    else ZG.결과화면.그리기(창.몸, 창);
  }

  function 갈래줄만들기() {
    var 줄 = 만들기('div', { class: 'toggle', style: 'width:220px' });
    갈래들.forEach(function (g) {
      var b = 만들기('button', { type: 'button', text: g, style: 'flex:1; padding:0' });
      b.addEventListener('click', function () { if (창.갈래 !== g) { 창.갈래 = g; 몸다시(); } });
      줄.appendChild(b);
    });
    return 줄;
  }

  function 열기(품목) {
    닫기();
    var 덮개 = 만들기('div', { class: '사진덮개' });
    var 판 = 만들기('div', { class: '사진판' });
    var 셈 = 만들기('span', { class: 'chip 사진', text: '0/7' });
    var 닫기단추 = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '닫기' });
    var 요청 = 만들기('button', { class: 'btn main', type: 'button', text: '상세페이지 요청', disabled: 'disabled' });
    var 요청r = 상세요청(품목.품목코드);
    var 갈래줄 = 갈래줄만들기();
    var 몸 = 만들기('div', { class: 'bd' });
    var 버튼줄 = 만들기('div', { class: 'btnrow' }, [요청]);

    var 상자 = 만들기('div', { class: '사진창' }, [
      만들기('div', { class: 'hd' }, [
        만들기('span', { class: 'cd', text: 품목.품목코드 + ' · ' + 품목.유통명 }),
        갈래줄,
        만들기('span', { class: 'right' }, [셈, 닫기단추])
      ]),
      몸
    ]);
    덮개.appendChild(상자);
    덮개.addEventListener('click', function (e) { if (e.target === 덮개) 닫기(); });
    닫기단추.addEventListener('click', 닫기);
    요청.addEventListener('click', 단추누름);
    document.body.appendChild(덮개);

    창 = { 코드: 품목.품목코드, 품목: 품목, 덮개: 덮개, 판: 판, 몸: 몸, 버튼줄: 버튼줄,
           갈래줄: 갈래줄, 갈래: '사진', 셈: 셈, 요청: 요청,
           상태: (요청r && 요청r.상태) || '', 있는것: {}, 진행: {} };
    u.탈출걸기(닫기);
    몸다시();
    if (!통()) u.토스트('인터넷이 안 닿아 사진을 못 올립니다');
    else 사진훑기(품목.품목코드).then(function (표) {
      if (창 && 창.코드 === 품목.품목코드) { 창.있는것 = 표; if (창.갈래 === '사진') 판다시(); }
    }).catch(function (e) { console.warn(e); u.토스트('올라간 사진을 못 읽었습니다'); });
  }

  ZG.사진수집 = { 대기카드: 대기카드, 대기다시: 대기다시, 대기품목: 대기품목, 열기: 열기, 경계: 경계,
                  주소: 주소, 사진훑기: 사진훑기, 요청걸기: 요청걸기 };

  /* ── 「작업중」 속탭 (2026-09-14 우람님 「입고 탭 하나에 다 묶는다」) ──
     전에는 입고 화면 맨 아래에 카드로 붙어 있었다. 이제 제 탭이다.
     07-앱.js 의 탭들이 `그리기`·`머리` 로 부른다 — 재고·이미지·블로그와 같은 결이다. */
  ZG.작업중 = {
    그리기: function (본문) {
      u.비우기(본문);
      본문.appendChild(대기카드());
    },
    머리: function () {
      return { 제목: '작업중', 뒤로: null,
               왼: '사진이 다 차면 상세페이지가 자동으로 걸립니다', 오: '' };
    },
    다시: 대기다시
  };
})(window.ZG);
