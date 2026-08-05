/* 13b-키워드검색 — 첫째 탭 (4단계 설계 §3-1)
   ★ 한 번이 전부다. 창도 확인도 없다.
   🔴 검색칸은 다시 그리지 않는다 — 결과칸만 갈아 끼운다. 그래야 한글 조합이 안 끊긴다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 쪽크기 = 25;
  var 상태 = { 검색어: '', 목록: null, 쪽: 1, 담을폴더: '' };
  var 결과칸, 검색입력;

  function 자() { return ZG.소싱자료; }

  function 요약() {
    return { 왼: '더보기 › 상품소싱', 오: '즐겨찾기 <b>' + 자().목록().length + '</b>' };
  }

  /* ── 폴더 고르개 ── */
  function 폴더옵션(고르개, 지금, 새허용) {
    고르개.appendChild(만들기('option', { value: '', text: '🗂 미분류' }));
    자().폴더들().forEach(function (f) {
      고르개.appendChild(만들기('option', { value: f.이름, text: '📁 ' + f.이름 }));
    });
    if (새허용) 고르개.appendChild(만들기('option', { value: '＋새', text: '＋ 새 폴더…' }));
    // 🔴 지워진 폴더 이름이면 selectedIndex=-1 로 남는다 — 미분류로 되돌린다
    고르개.value = 자().실제폴더(지금);
  }

  /* 새 폴더를 고르면 물음()이 뜬다. 🔴 window.prompt 를 쓰지 않는다 */
  function 새폴더묻기(끝나면) {
    u.물음({ 제목: '새 폴더', 본문: '폴더 이름만 지으면 됩니다.', 이름: '폴더 이름', 확인글: '만들기' }, function (글) {
      if (글 == null) { 끝나면(null); return; }
      var r = 자().폴더만들기(글);
      if (!r.ok) { u.토스트(r.이유); 끝나면(null); return; }
      u.토스트('📁 폴더를 만들었습니다: ' + r.이름);
      끝나면(r.이름);
    });
  }

  function 담을폴더칸() {
    var s = 만들기('select', { class: 'inp', 'aria-label': '담을 폴더' });
    폴더옵션(s, 상태.담을폴더, true);
    s.addEventListener('change', function () {
      if (s.value !== '＋새') { 상태.담을폴더 = s.value; return; }
      s.value = 상태.담을폴더;
      새폴더묻기(function (이름) {
        if (이름) 상태.담을폴더 = 이름;
        ZG.소싱앱.다시그리기();
      });
    });
    return s;
  }

  /* ── ★ 한 번 ── */
  function 별토글(키워드, 값) {
    if (자().담김(키워드)) {
      자().빼기(키워드);
      u.토스트('별표 해제: ' + 키워드);
    } else {
      var 폴더 = u.폰인가() ? '' : 상태.담을폴더;   // 폰에는 「담을 폴더」 칸이 없다 (시안)
      자().담기(키워드, 폴더, 값);
      u.토스트('⭐ 즐겨찾기 → ' + (폴더 || '미분류') + ': ' + 키워드);
    }
    결과채우기();
    ZG.소싱앱.요약다시();
  }

  function 옮기기(키워드, 폴더) {
    자().옮기기(키워드, 폴더);
    u.토스트('📁 ' + (폴더 || '미분류') + '(으)로 옮겼습니다: ' + 키워드);
    결과채우기();
  }

  /* ── 검색 ── */
  function 검색하기() {
    var q = String(상태.검색어 || '').trim();
    if (!q) { u.흔들기(검색입력); if (검색입력) 검색입력.focus(); return; }
    ZG.검색량.연관(q).then(function (r) {
      상태.목록 = r.목록;
      상태.쪽 = 1;
      결과채우기();
    });
  }

  function 검색칸(폰) {
    검색입력 = 만들기('input', {
      class: 'inp', type: 'text', value: 상태.검색어,
      placeholder: '검색할 키워드 (예: 수국)', 'aria-label': '검색할 키워드'
    });
    // 🔴 조합안전입력 — 「휴케라」가 ㅎㅠㅋㅔㄹㅏ 로 깨지던 사고(8/4)
    u.조합안전입력(검색입력, function (값) { 상태.검색어 = 값; }, 180);
    검색입력.addEventListener('keydown', function (e) {
      if (e.key !== 'Enter' || e.isComposing || e.keyCode === 229) return;
      e.preventDefault();
      상태.검색어 = 검색입력.value;
      검색하기();
    });

    var 돋보기 = 만들기('span', { class: 'mg', text: '🔍' });

    if (폰) {
      var 칸 = 만들기('div', { class: 'srch' }, [돋보기, 검색입력]);
      var 버튼 = 만들기('button', { class: 'btn main', type: 'button', text: '검색' });
      버튼.addEventListener('click', function () { 상태.검색어 = 검색입력.value; 검색하기(); });
      return 만들기('div', { style: 'display:flex; gap:var(--space-sm); align-items:center' }, [
        만들기('div', { style: 'flex:1' }, [칸]), 버튼
      ]);
    }

    var 검색필드 = 만들기('div', { class: 'field srch', style: 'flex:1' }, [
      만들기('label', { text: '검색할 키워드' }), 돋보기, 검색입력
    ]);
    var 폴더필드 = 만들기('div', { class: 'field', style: 'width:190px' }, [
      만들기('label', { html: '담을 폴더 <span class="auto">★ 누를 때 들어갈 곳</span>' }),
      담을폴더칸()
    ]);
    var 검색버튼 = 만들기('button', { class: 'btn main wide', type: 'button', text: '검색' });
    검색버튼.addEventListener('click', function () { 상태.검색어 = 검색입력.value; 검색하기(); });

    return 만들기('div', { class: 'card' }, [
      만들기('h3', { html: '키워드 검색 <span class="hint">치면 연관 키워드가 나옵니다 · ★을 눌러 바로 즐겨찾기</span>' }),
      만들기('div', { class: 'row bottom', style: 'margin-bottom:0' }, [검색필드, 폴더필드, 검색버튼])
    ]);
  }

  /* ── 값 칸 ── 없으면 「—」, 있으면 숫자 (§4-3) */
  function 숫자칸(값, 필드) {
    var n = 값 ? Number(값[필드]) || 0 : 0;
    if (!값 || !n) return 만들기('td', { class: 'r none', text: '—' });
    return 만들기('td', { class: 'r', text: u.콤마(n) });
  }

  function 별버튼(키워드, 값, 담김) {
    var b = 만들기('button', {
      type: 'button', class: 'star' + (담김 ? '' : ' off'), text: 담김 ? '★' : '☆',
      'aria-label': (담김 ? '즐겨찾기에서 빼기: ' : '즐겨찾기에 담기: ') + 키워드
    });
    b.addEventListener('click', function () { 별토글(키워드, 값); });
    return b;
  }

  function 쪽번호(전체, 다시) {
    var 마지막 = Math.max(1, Math.ceil(전체 / 쪽크기));
    if (상태.쪽 > 마지막) 상태.쪽 = 마지막;
    var 처음 = (상태.쪽 - 1) * 쪽크기;
    var 상자 = 만들기('div', { class: 'pager' });
    상자.appendChild(만들기('span', {
      class: 'gap', text: 전체 + '개 중 ' + (전체 ? 처음 + 1 : 0) + '~' + Math.min(처음 + 쪽크기, 전체)
    }));
    function 단추(글, 쪽, 켬) {
      if (켬) return 만들기('b', { text: 글 });
      var b = 만들기('button', { type: 'button', text: 글 });
      b.disabled = 쪽 < 1 || 쪽 > 마지막;
      b.addEventListener('click', function () { 상태.쪽 = 쪽; 다시(); });
      return b;
    }
    상자.appendChild(단추('‹', 상태.쪽 - 1));
    for (var i = 1; i <= 마지막; i++) 상자.appendChild(단추(String(i), i, i === 상태.쪽));
    상자.appendChild(단추('›', 상태.쪽 + 1));
    return 상자;
  }

  function 이번쪽() {
    var 처음 = (상태.쪽 - 1) * 쪽크기;
    return (상태.목록 || []).slice(처음, 처음 + 쪽크기);
  }

  /* ── PC 표 ── */
  function PC표() {
    var 표 = 만들기('table');
    var 묶 = 만들기('colgroup');
    ['46px', '', '130px', '130px', '100px', '172px'].forEach(function (w) {
      묶.appendChild(만들기('col', { style: w ? 'width:' + w : null }));
    });
    표.appendChild(묶);

    var 머리 = 만들기('tr', {}, [
      만들기('th', { text: '★', style: 'text-align:center' }),
      만들기('th', { text: '키워드' }),
      만들기('th', { class: 'r', text: '월간검색수 PC' }),
      만들기('th', { class: 'r', text: '월간검색수 모바일' }),
      만들기('th', { class: 'r', text: '상품수' }),
      만들기('th', { text: '담긴 폴더' })
    ]);
    표.appendChild(머리);

    var 몸 = 만들기('tbody');
    이번쪽().forEach(function (it) {
      var 줄레코드 = 자().찾기(it.키워드);
      var 담김 = !!줄레코드;
      var 값 = it.값 || ZG.검색량.값찾기(it.키워드);

      var 별칸 = 만들기('td', { style: 'text-align:center' }, [별버튼(it.키워드, 값, 담김)]);

      var 폴더칸 = 만들기('td');
      if (담김) {
        var s = 만들기('select', { class: 'sel', 'aria-label': '담긴 폴더' });
        폴더옵션(s, 줄레코드.분류 || '', false);
        s.addEventListener('change', function () { 옮기기(it.키워드, s.value); });
        폴더칸.appendChild(s);
      } else {
        폴더칸.className = 'hintcell';
        폴더칸.textContent = '★을 누르면 담깁니다';
      }

      몸.appendChild(만들기('tr', {}, [
        별칸,
        만들기('td', { text: it.키워드, style: 담김 ? 'font-weight:var(--weight-bold)' : null }),
        숫자칸(값, 'PC'), 숫자칸(값, '모바일'), 숫자칸(값, '상품수'),
        폴더칸
      ]));
    });
    표.appendChild(몸);
    u.목록등장(몸.children);
    return 표;
  }

  /* ── 폰 목록 ── 담긴 카드를 탭하면 폴더 고르는 시트 (§3-1) */
  function 폰목록() {
    var 상자 = 만들기('div', { class: 'kwlist' });
    상자.appendChild(만들기('div', { class: 'hd' }, [
      만들기('span', { text: '연관 키워드' }),
      만들기('b', { style: 'color:var(--color-text-sub)', text: String((상태.목록 || []).length) }),
      만들기('span', { class: 'r', text: '월간검색수' })
    ]));

    이번쪽().forEach(function (it) {
      var 줄레코드 = 자().찾기(it.키워드);
      var 담김 = !!줄레코드;
      var 값 = it.값 || ZG.검색량.값찾기(it.키워드);
      var 월 = 값 && Number(값.월검색) ? u.콤마(값.월검색) : '—';

      var 이름 = 만들기('span', { class: 't', text: it.키워드 });
      if (담김) {
        이름.appendChild(만들기('span', {
          class: 'fd', text: (줄레코드.분류 ? '📁 ' : '🗂 ') + (줄레코드.분류 || '미분류')
        }));
      }
      var 값칸 = 만들기('span', { class: 'v' }, [
        만들기('b', { class: 월 === '—' ? '' : 'has', text: 월 }),
        만들기('span', { text: 월 === '—' ? '키 없음' : '월간' })
      ]);

      var 몸 = 만들기('button', { type: 'button', class: 'rest' }, [이름, 값칸]);
      몸.addEventListener('click', function () {
        if (!담김) { 별토글(it.키워드, 값); return; }
        폴더시트(it.키워드, 줄레코드.분류 || '', 결과채우기);
      });

      상자.appendChild(만들기('div', { class: 'kw' }, [별버튼(it.키워드, 값, 담김), 몸]));
    });
    return 상자;
  }

  /* 폰에서 담긴 카드를 탭했을 때 — 분류 탭(13d)도 같이 쓴다. 끝나면()으로 화면만 다시 그린다 */
  function 폴더시트(키워드, 지금값, 끝나면) {
    var 지금 = 자().실제폴더(지금값);
    var 항목 = [{ 값: '', 글: '🗂 미분류', 켬: 지금 === '' }];
    자().폴더들().forEach(function (f) { 항목.push({ 값: f.이름, 글: '📁 ' + f.이름, 켬: 지금 === f.이름 }); });
    항목.push({ 값: '＋새', 글: '＋ 새 폴더…' });

    function 옮기고(폴더) {
      자().옮기기(키워드, 폴더);
      u.토스트('📁 ' + (폴더 || '미분류') + '(으)로 옮겼습니다: ' + 키워드);
      끝나면();
    }

    u.고르기({ 제목: '폴더 고르기', 본문: u.안전(키워드) + ' 을(를) 어디에 담을까요?', 항목: 항목 }, function (값) {
      if (값 == null) return;
      if (값 !== '＋새') { 옮기고(값); return; }
      새폴더묻기(function (이름) { if (이름) 옮기고(이름); else 끝나면(); });
    });
  }

  /* ── 결과칸만 다시 ── */
  function 결과채우기() {
    if (!결과칸) return;
    u.비우기(결과칸);

    if (상태.목록 == null) {
      결과칸.appendChild(만들기('div', { class: 'card' }, [만들기('div', {
        class: 'empty',
        html: '🔍 검색할 키워드를 넣고 <b>검색</b>을 눌러 주세요.<br>' +
              '나온 줄의 <b>★</b>을 한 번 누르면 그 자리에서 즐겨찾기에 담깁니다.'
      })]));
      return;
    }

    var 담긴수 = 상태.목록.filter(function (it) { return 자().담김(it.키워드); }).length;

    if (u.폰인가()) {
      if (!상태.목록.length) {
        결과칸.appendChild(만들기('div', { class: 'card' }, [만들기('div', {
          class: 'empty', html: '찾은 키워드가 없습니다.'
        })]));
        return;
      }
      결과칸.appendChild(폰목록());
      if (상태.목록.length > 쪽크기) 결과칸.appendChild(쪽번호(상태.목록.length, 결과채우기));
      return;
    }

    var 카드 = 만들기('div', { class: 'card table-card' });
    카드.appendChild(만들기('h3', {
      style: 'padding:0 var(--space-sm)',
      html: '「' + u.안전(상태.검색어.trim()) + '」 연관 키워드 ' +
            '<span class="hint">내 데이터에서 찾은 ' + 상태.목록.length + '개 · ★ ' + 담긴수 + '개 담김 — ' +
            '키가 붙으면 네이버 연관 키워드로 바뀝니다</span>' +
            '<span class="right"><span class="chip warn">숫자 칸 비어 있음</span></span>'
    }));
    if (!상태.목록.length) {
      카드.appendChild(만들기('div', { class: 'empty', html: '찾은 키워드가 없습니다.' }));
    } else {
      카드.appendChild(PC표());
      카드.appendChild(쪽번호(상태.목록.length, 결과채우기));
    }
    결과칸.appendChild(카드);
  }

  function 그리기(부모) {
    // 분류 탭에서 폴더를 지우고 돌아왔을 수 있다 — 없어진 폴더면 미분류로 리셋
    상태.담을폴더 = 자().실제폴더(상태.담을폴더);
    var 폰 = u.폰인가();
    var 띠 = ZG.검색량.키있나() ? null : 만들기('div', { class: 'nokey', html: ZG.검색량.안내() });
    // 시안 — 폰은 검색칸이 위, PC는 안내 띠가 위다
    if (폰) { 부모.appendChild(검색칸(true)); if (띠) 부모.appendChild(띠); }
    else { if (띠) 부모.appendChild(띠); 부모.appendChild(검색칸(false)); }
    결과칸 = 만들기('div', { style: 폰 ? null : 'display:flex; flex-direction:column; gap:var(--space-2xl)' });
    부모.appendChild(결과칸);
    결과채우기();
  }

  ZG.키워드검색 = { 그리기: 그리기, 요약: 요약, 상태: 상태, 폴더시트: 폴더시트 };
})(window.ZG);
