/* 13d-상품분류 — 둘째 탭 (4단계 설계 §3-2)
   PC 는 늘 좌우분할, 폰은 폴더 타일 ↔ 폴더 안을 오간다(연폴더는 셸이 들고 있다).
   ★ 클릭 = 즐겨찾기에서 줄째로 뺀다. 폴더에서만 빼는 게 아니다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 쪽크기 = 25;
  var 쪽 = 1;

  function 자() { return ZG.소싱자료; }

  /* PC 는 아무것도 안 열려 있으면 첫 폴더(없으면 미분류)를 연다 */
  function 지금폴더() {
    var v = ZG.소싱앱.연폴더();
    if (v != null) return 자().실제폴더(v);   // 지워진 폴더가 열린 채로 남았으면 미분류로
    var 것들 = 자().폴더들();
    return 것들.length ? 것들[0].이름 : '';
  }

  function 요약() {
    return { 왼: '폴더 <b>' + 자().폴더들().length + '</b>개', 오: '즐겨찾기 <b>' + 자().목록().length + '</b>' };
  }

  function 날짜(ms) { return ms ? ZG.계산.날짜문자(ms) : '—'; }

  function 다시() { ZG.소싱앱.다시그리기(); }

  /* ── 폴더 만들기 · 이름 바꾸기 · 삭제 ── 🔴 window.prompt 를 쓰지 않는다 */
  function 새폴더() {
    u.물음({ 제목: '새 폴더', 본문: '폴더 이름만 지으면 됩니다. 만든 뒤 키워드를 옮겨 넣습니다.', 이름: '폴더 이름', 확인글: '만들기' },
      function (글) {
        if (글 == null) return;
        var r = 자().폴더만들기(글);
        if (!r.ok) { u.토스트(r.이유); return; }
        u.토스트('📁 폴더를 만들었습니다: ' + r.이름);
        ZG.소싱앱.폴더열기(r.이름);
      });
  }

  function 이름바꾸기(이름) {
    u.물음({ 제목: '폴더 이름 바꾸기', 본문: '안에 담긴 키워드도 같이 따라옵니다.', 이름: '폴더 이름', 값: 이름, 확인글: '바꾸기' },
      function (글) {
        if (글 == null) return;
        var r = 자().폴더이름바꾸기(이름, 글);
        if (!r.ok) { u.토스트(r.이유); return; }
        u.토스트('📁 이름을 바꿨습니다: ' + r.이름);
        ZG.소싱앱.폴더열기(r.이름);
      });
  }

  function 폴더삭제(이름) {
    var n = 자().폴더안(이름).length;
    u.확인({
      제목: '폴더를 지웁니다',
      본문: '폴더 <b>「' + u.안전(이름) + '」</b>을(를) 지웁니다.<br>' +
            '안의 키워드 <b>' + n + '개</b>는 <b>미분류로 갑니다</b> — 지워지지 않습니다.',
      확인글: '폴더 삭제', 위험: true
    }, function (예) {
      if (!예) return;
      var 옮김 = 자().폴더삭제(이름);
      u.토스트('🗑 폴더를 지웠습니다 · 키워드 ' + 옮김 + '개는 미분류로');
      ZG.소싱앱.폴더열기(u.폰인가() ? null : '');
    });
  }

  /* ── 줄 부품 ── */
  function 별빼기(키워드) {
    자().빼기(키워드);
    u.토스트('별표 해제: ' + 키워드);
    다시();
  }

  function 별버튼(키워드) {
    var b = 만들기('button', { type: 'button', class: 'star', text: '★', 'aria-label': '즐겨찾기에서 빼기: ' + 키워드 });
    b.addEventListener('click', function () { 별빼기(키워드); });
    return b;
  }

  function 옮기개(줄) {
    var s = 만들기('select', { class: 'sel', 'aria-label': '폴더 옮기기' });
    s.appendChild(만들기('option', { value: '', text: '🗂 미분류' }));
    자().폴더들().forEach(function (f) { s.appendChild(만들기('option', { value: f.이름, text: '📁 ' + f.이름 })); });
    s.value = 자().실제폴더(줄.분류);   // 고아 분류면 미분류 자리에 맞춘다
    s.addEventListener('change', function () {
      자().옮기기(줄.키워드, s.value);
      u.토스트('📁 ' + (s.value || '미분류') + '(으)로 옮겼습니다: ' + 줄.키워드);
      다시();
    });
    return s;
  }

  function 월검색글(줄) {
    var 값 = ZG.검색량.값찾기(줄.키워드);
    return 값 && Number(값.월검색) ? u.콤마(값.월검색) : '';
  }

  function 쪽번호(전체, 그리다시) {
    var 마지막 = Math.max(1, Math.ceil(전체 / 쪽크기));
    if (쪽 > 마지막) 쪽 = 마지막;
    var 처음 = (쪽 - 1) * 쪽크기;
    var 상자 = 만들기('div', { class: 'pager' });
    상자.appendChild(만들기('span', {
      class: 'gap', text: 전체 + '개 중 ' + (전체 ? 처음 + 1 : 0) + '~' + Math.min(처음 + 쪽크기, 전체)
    }));
    function 단추(글, 번호, 켬) {
      if (켬) return 만들기('b', { text: 글 });
      var b = 만들기('button', { type: 'button', text: 글 });
      b.disabled = 번호 < 1 || 번호 > 마지막;
      b.addEventListener('click', function () { 쪽 = 번호; 그리다시(); });
      return b;
    }
    상자.appendChild(단추('‹', 쪽 - 1));
    for (var i = 1; i <= 마지막; i++) 상자.appendChild(단추(String(i), i, i === 쪽));
    상자.appendChild(단추('›', 쪽 + 1));
    return 상자;
  }

  /* ══ PC ══ */
  function 왼쪽(고른것, 셈) {
    var 카드 = 만들기('div', { class: 'card flist' });
    var 것들 = 자().폴더들();
    카드.appendChild(만들기('h3', { html: '폴더 <span class="hint">' + 것들.length + '개</span>' }));

    것들.forEach(function (f) {
      var b = 만들기('button', { type: 'button', class: 'it' + (고른것 === f.이름 ? ' on' : '') }, [
        만들기('span', { text: '📁' }), 만들기('span', { text: f.이름 }),
        만들기('span', { class: 'n', text: String(셈[f.이름] || 0) })
      ]);
      b.addEventListener('click', function () { 쪽 = 1; ZG.소싱앱.폴더열기(f.이름); });
      카드.appendChild(b);
    });

    if (!것들.length) {
      카드.appendChild(만들기('div', {
        class: 'empty', style: 'padding:16px 8px; font-size:var(--font-xs)',
        html: '아직 폴더가 없습니다.'
      }));
    }

    카드.appendChild(만들기('div', { class: 'sep' }));
    var 미 = 만들기('button', { type: 'button', class: 'it' + (고른것 === '' ? ' on' : '') }, [
      만들기('span', { text: '🗂' }), 만들기('span', { text: '미분류' }),
      만들기('span', { class: 'n', text: String(셈[''] || 0) })
    ]);
    미.addEventListener('click', function () { 쪽 = 1; ZG.소싱앱.폴더열기(''); });
    카드.appendChild(미);

    var 새 = 만들기('button', { type: 'button', class: 'it add' }, [
      만들기('span', { text: '＋' }), 만들기('span', { text: '새 폴더 만들기' })
    ]);
    새.addEventListener('click', 새폴더);
    카드.appendChild(새);
    return 카드;
  }

  function PC표(줄들) {
    var 표 = 만들기('table');
    var 묶 = 만들기('colgroup');
    ['44px', '', '112px', '104px', '158px'].forEach(function (w) {
      묶.appendChild(만들기('col', { style: w ? 'width:' + w : null }));
    });
    표.appendChild(묶);
    표.appendChild(만들기('tr', {}, [
      만들기('th', { text: '★', style: 'text-align:center' }),
      만들기('th', { text: '키워드' }),
      만들기('th', { text: '담은 날' }),
      만들기('th', { class: 'r', text: '월간검색수' }),
      만들기('th', { text: '폴더 옮기기' })
    ]));

    var 몸 = 만들기('tbody');
    var 처음 = (쪽 - 1) * 쪽크기;
    줄들.slice(처음, 처음 + 쪽크기).forEach(function (줄) {
      var 월 = 월검색글(줄);
      몸.appendChild(만들기('tr', {}, [
        만들기('td', { style: 'text-align:center' }, [별버튼(줄.키워드)]),
        만들기('td', { text: 줄.키워드, style: 'font-weight:var(--weight-bold)' }),
        만들기('td', { class: 'dim', text: 날짜(줄.담은때) }),
        월 ? 만들기('td', { class: 'r', text: 월 }) : 만들기('td', { class: 'r none', text: '—' }),
        만들기('td', {}, [옮기개(줄)])
      ]));
    });
    표.appendChild(몸);
    u.목록등장(몸.children);
    return 표;
  }

  function PC그리기(부모) {
    var 고른것 = 지금폴더();
    var 셈 = 자().폴더별개수();
    var 줄들 = 자().폴더안(고른것);
    var 폴더 = 고른것 ? 자().폴더찾기(고른것) : null;
    var 미분류 = 고른것 === '';

    var 오른쪽 = 만들기('div', { class: 'card table-card' });
    var 머리 = 만들기('h3', {
      style: 'padding:0 var(--space-sm)',
      html: (미분류 ? '🗂 미분류' : '📁 ' + u.안전(고른것)) +
            ' <span class="hint">' + 줄들.length + '개' +
            (폴더 && 폴더.만든때 ? ' · ' + 날짜(폴더.만든때) + ' 만듦' : '') + '</span>'
    });
    if (!미분류 && 폴더) {
      var 버튼줄 = 만들기('span', { class: 'right', style: 'display:flex; gap:var(--space-sm)' });
      var 이름b = 만들기('button', { class: 'btn sm', type: 'button', text: '이름 바꾸기' });
      이름b.addEventListener('click', function () { 이름바꾸기(고른것); });
      var 삭제b = 만들기('button', { class: 'btn sm', type: 'button', text: '폴더 삭제' });
      삭제b.addEventListener('click', function () { 폴더삭제(고른것); });
      버튼줄.appendChild(이름b); 버튼줄.appendChild(삭제b);
      머리.appendChild(버튼줄);
    }
    오른쪽.appendChild(머리);

    if (!줄들.length) {
      오른쪽.appendChild(만들기('div', {
        class: 'empty',
        html: 미분류
          ? '🗂 미분류에 든 키워드가 없습니다.<br>「키워드 검색」 탭에서 ★을 눌러 담아 주세요.'
          : '📁 이 폴더는 비어 있습니다.<br>미분류에서 「폴더 옮기기」로 키워드를 옮겨 오세요.'
      }));
    } else {
      오른쪽.appendChild(PC표(줄들));
      오른쪽.appendChild(쪽번호(줄들.length, 다시));
    }

    부모.appendChild(만들기('div', { class: 'fsplit' }, [
      왼쪽(고른것, 셈), 만들기('div', { class: 'fright' }, [오른쪽])
    ]));
  }

  /* ══ 폰 ══ */
  function 타일들(부모) {
    var 셈 = 자().폴더별개수();
    var 격자 = 만들기('div', { class: 'folders' });

    자().폴더들().forEach(function (f) {
      var t = 만들기('button', { type: 'button', class: 'ftile' }, [
        만들기('span', { class: 'ico', text: '📁' }),
        만들기('span', { class: 'nm', text: f.이름 }),
        만들기('span', { class: 'n', text: (셈[f.이름] || 0) + '개' })
      ]);
      t.addEventListener('click', function () { 쪽 = 1; ZG.소싱앱.폴더열기(f.이름); });
      격자.appendChild(t);
    });

    var 미 = 만들기('button', { type: 'button', class: 'ftile etc' }, [
      만들기('span', { class: 'ico', text: '🗂' }),
      만들기('span', { class: 'nm', text: '미분류' }),
      만들기('span', { class: 'n', text: (셈[''] || 0) + '개' })
    ]);
    미.addEventListener('click', function () { 쪽 = 1; ZG.소싱앱.폴더열기(''); });
    격자.appendChild(미);

    var 새 = 만들기('button', { type: 'button', class: 'ftile new' }, [
      만들기('span', { class: 'ico', text: '＋' }), 만들기('span', { class: 'nm', text: '새 폴더' })
    ]);
    새.addEventListener('click', 새폴더);
    격자.appendChild(새);

    if (!자().폴더들().length) {
      부모.appendChild(만들기('div', {
        class: 'nokey', style: 'background:var(--color-surface); border-color:var(--color-border); color:var(--color-text-sub)',
        html: '아직 폴더가 없습니다. <b>＋ 새 폴더</b>로 만들어 주세요. 담은 키워드는 그때까지 <b>미분류</b>에 있습니다.'
      }));
    }
    부모.appendChild(격자);
  }

  function 폰폴더안(부모, 이름) {
    var 줄들 = 자().폴더안(이름);
    부모.appendChild(만들기('div', { class: 'ph-sec' }, [
      만들기('span', { text: '담긴 키워드' }), 만들기('span', { class: 'r', text: '★ 눌러 빼기' })
    ]));

    if (!줄들.length) {
      부모.appendChild(만들기('div', {
        class: 'empty',
        html: 이름 ? '📁 이 폴더는 비어 있습니다.' : '🗂 미분류에 든 키워드가 없습니다.'
      }));
      return;
    }

    var 목록 = 만들기('div', { class: 'ph-list' });
    줄들.forEach(function (줄) {
      var 월 = 월검색글(줄);
      var r1 = 만들기('div', { class: 'r1' }, [
        별버튼(줄.키워드), 만들기('span', { class: 'nm', text: 줄.키워드 }),
        만들기('span', { class: 'chev', style: 'margin-left:auto', text: '›' })
      ]);
      var r2 = 만들기('div', {
        class: 'r2',
        html: '월간검색수 <b style="color:' + (월 ? 'var(--color-text)' : 'var(--color-text-faint)') + '">' +
              (월 || '—') + '</b> ' + (월 ? '' : '키 없음') +
              '<span class="amt" style="font-size:var(--font-xs); color:var(--color-text-muted)">' +
              날짜(줄.담은때) + '</span>'
      });
      var 카드 = 만들기('div', { class: 'ph-card' }, [r1, r2]);
      // 카드를 탭하면 폴더 고르는 시트 — 검색 탭과 같은 손놀림이다(★은 그 자리에서 빼기)
      카드.addEventListener('click', function (e) {
        if (e.target.closest('.star')) return;
        ZG.키워드검색.폴더시트(줄.키워드, 줄.분류 || '', 다시);
      });
      목록.appendChild(카드);
    });
    부모.appendChild(목록);
    u.목록등장(목록.children);
  }

  function 그리기(부모) {
    if (!u.폰인가()) { PC그리기(부모); return; }
    var 연 = ZG.소싱앱.연폴더();
    if (연 == null) 타일들(부모);
    else 폰폴더안(부모, 연);
  }

  ZG.상품분류 = { 그리기: 그리기, 요약: 요약, 보는폴더: 지금폴더, 이름바꾸기: 이름바꾸기, 폴더삭제: 폴더삭제, 새폴더: 새폴더 };
})(window.ZG);
