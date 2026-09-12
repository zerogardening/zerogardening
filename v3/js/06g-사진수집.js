/* 06g-사진수집 — 입고 화면 맨 아래 「상세페이지 작업 대기」 + 품목을 열면 사진 7칸 (15단계 A)
   사진은 Supabase Storage 의 공개 버킷 product 에 품목코드로 들어간다 — product/{품목코드}/3.jpg.
   🔴 경로에 한글을 쓰면 400 InvalidKey 다. 품목코드가 곧 열쇠다.
   맥은 도구/사진받기.py 로 받아 ~/이미지/{식물}/ 에 떨군다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;

  /* 🔴 소급 방지 경계 — 굴러가는 창이 아니라 박아 둔 날이다 (착수일 9/12 기준 3일) */
  var 경계 = new Date(2026, 8, 9).getTime();

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
    '.자름줄{display:flex; gap:10px}';
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

  function 대기품목() {
    var 현 = ZG.제작요청.현황();
    return ZG.저장소.품목들().filter(function (p) {
      return (p.등록일시 || 0) >= 경계 && !(현[p.품목코드] && 현[p.품목코드]['상세페이지']);
    }).sort(function (a, b) { return (b.등록일시 || 0) - (a.등록일시 || 0); });
  }

  function 칩달기(칩, 코드) {
    사진훑기(코드).then(function (표) {
      var 수 = 필수수(function (번) { return 표[번]; });
      칩.textContent = 수 + '/7';
      칩.className = 'chip 사진' + (수 === 7 ? ' 완' : (수 ? ' 일부' : ''));
    }).catch(function () { 칩.style.display = 'none'; });   // 못 세면 숫자를 지어내지 않는다
  }

  /* 폰 — 05d 의 폰내역() 카드와 같은 결(.ph-list > .ph-card) */
  function 폰목록(목록) {
    var 목 = 만들기('div', { class: 'ph-list' });
    목록.forEach(function (p) {
      var 칸 = 만들기('div', { class: 'ph-card' });
      칸.innerHTML =
        '<div class="r1"><div class="nm">' + u.안전(p.유통명) + '</div><div class="cd">' + u.안전(p.품목코드) + '</div></div>' +
        '<div class="sci">' + u.안전(p.학명) + '</div>' +
        '<div class="r2">' + u.안전(p.규격) + '<span class="amt"><span class="chip 사진">…</span></span></div>';
      칩달기(칸.querySelector('.chip'), p.품목코드);
      칸.addEventListener('click', function () { 열기(p); });
      목.appendChild(칸);
    });
    u.목록등장(목.children);
    return 만들기('div', { class: 'stack' }, [
      만들기('div', { class: 'ph-sec', html: '상세페이지 작업 대기 <span class="r">' + 목록.length + '종</span>' }),
      목
    ]);
  }

  /* PC — 05d 의 내역카드() 와 같은 결(.card.table-card > .tablewrap > table) */
  function PC목록(목록) {
    var 카드 = 만들기('div', { class: 'card table-card' });
    카드.appendChild(만들기('h3', { style: 'padding:0 var(--space-sm)', text: '상세페이지 작업 대기' }));
    var 표 = 만들기('table');
    표.innerHTML =
      '<colgroup><col style="width:110px"><col><col style="width:110px"><col style="width:120px"></colgroup>' +
      '<thead><tr><th>품목코드</th><th>유통명 · 학명</th><th>규격</th><th>사진</th></tr></thead>';
    var 몸 = 만들기('tbody');
    목록.forEach(function (p) {
      var 줄 = 만들기('tr', { style: 'cursor:pointer' });
      줄.innerHTML =
        '<td class="code">' + u.안전(p.품목코드) + '</td>' +
        '<td>' + u.안전(p.유통명) + '<div class="sci">' + u.안전(p.학명) + '</div></td>' +
        '<td class="dim">' + u.안전(p.규격) + '</td>' +
        '<td><span class="chip 사진">…</span></td>';
      칩달기(줄.querySelector('.chip'), p.품목코드);
      줄.addEventListener('click', function () { 열기(p); });
      몸.appendChild(줄);
    });
    표.appendChild(몸);
    카드.appendChild(만들기('div', { class: 'tablewrap' }, [표]));
    u.목록등장(몸.children);
    return 카드;
  }

  function 대기카드() {
    var 목록 = 대기품목();
    var 감쌈 = 만들기('div');
    if (!목록.length) return 감쌈;          // 빈 날이 대부분이다 — 설명문을 두지 않는다
    감쌈.appendChild(u.폰인가() ? 폰목록(목록) : PC목록(목록));
    return 감쌈;
  }

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
    창.진행[번] = { 퍼센트: 12 };
    판다시();
    var 막대 = 창.판.querySelector('[data-바="' + 번 + '"]');
    if (막대) setTimeout(function () { 막대.style.width = '88%'; }, 30);
    올리기(창.코드, 번, 자른것).then(function () {
      delete 창.진행[번];
      창.있는것[번] = Date.now();
      if (자른것.그림.close) 자른것.그림.close();
      판다시();
    }).catch(function (e) {
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
    창.요청.disabled = 수 < 7;
  }

  function 요청걸기() {
    // 06e 는 재고 목록에서 고른 것을 본다 — 손대지 않고 고른 것만 갈아 끼운다
    ZG.재고목록.상태.선택 = {};
    ZG.재고목록.상태.선택[창.코드] = true;
    ZG.제작요청.요청하기('상세페이지', 닫기);
  }

  function 열기(품목) {
    닫기();
    var 덮개 = 만들기('div', { class: '사진덮개' });
    var 판 = 만들기('div', { class: '사진판' });
    var 셈 = 만들기('span', { class: 'chip 사진', text: '0/7' });
    var 닫기단추 = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '닫기' });
    var 요청 = 만들기('button', { class: 'btn main', type: 'button', text: '상세페이지 요청', disabled: 'disabled' });

    var 상자 = 만들기('div', { class: '사진창' }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: '사진' }),
        만들기('span', { class: 'cd', text: 품목.품목코드 + ' · ' + 품목.유통명 }),
        만들기('span', { class: 'right' }, [셈, 닫기단추])
      ]),
      만들기('div', { class: 'bd' }, [판, 만들기('div', { class: 'btnrow' }, [요청])])
    ]);
    덮개.appendChild(상자);
    덮개.addEventListener('click', function (e) { if (e.target === 덮개) 닫기(); });
    닫기단추.addEventListener('click', 닫기);
    요청.addEventListener('click', 요청걸기);
    document.body.appendChild(덮개);

    창 = { 코드: 품목.품목코드, 덮개: 덮개, 판: 판, 셈: 셈, 요청: 요청, 있는것: {}, 진행: {} };
    u.탈출걸기(닫기);
    판다시();
    if (!통()) u.토스트('인터넷이 안 닿아 사진을 못 올립니다');
    else 사진훑기(품목.품목코드).then(function (표) {
      if (창 && 창.코드 === 품목.품목코드) { 창.있는것 = 표; 판다시(); }
    }).catch(function (e) { console.warn(e); u.토스트('올라간 사진을 못 읽었습니다'); });
  }

  ZG.사진수집 = { 대기카드: 대기카드, 대기품목: 대기품목, 열기: 열기, 경계: 경계 };
})(window.ZG);
