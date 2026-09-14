/* 06i-원고화면 — 품목 창의 [원고] 갈래 (15단계 B 설계 §1·§3)
   글칸 7개를 전부 펼쳐 세로로 둔다(아코디언 없음). 폰은 한 칸, PC 는 두 칸.
   🔴 평소엔 글자수를 안 띄운다. 저장을 눌렀을 때 넘친 칸에만 띄운다(설계 §1 「덜어낸 넷」). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;

  var 결 = document.createElement('style');
  결.textContent =
    '.원고판{display:flex; flex-direction:column; gap:var(--space-lg)}' +
    '.원고판 .cols{display:flex; gap:var(--space-xl); align-items:flex-start}' +
    '.원고판 .cols > div{flex:1; min-width:0; display:flex; flex-direction:column; gap:var(--space-md)}' +
    '.zonelist{display:flex; flex-direction:column; gap:var(--space-md)}' +
    '.zone{background:var(--color-surface); border-radius:var(--radius-lg);' +
    ' border:var(--border-width) solid var(--color-border-faint); overflow:hidden}' +
    '.zone.bad{border-color:var(--color-danger-border); box-shadow:inset 3px 0 0 var(--color-danger)}' +
    '.zhd{display:flex; align-items:center; gap:var(--space-sm); padding:var(--space-md) var(--space-lg) var(--space-xs);' +
    ' font-size:var(--font-md); font-weight:var(--weight-bold); letter-spacing:-.02em; color:var(--color-text)}' +
    '.zhd .no{width:20px; height:20px; border-radius:var(--radius-sm); background:var(--color-seg-bg);' +
    ' color:var(--color-text-sub); font-size:var(--font-2xs); font-weight:var(--weight-bold);' +
    ' display:inline-flex; align-items:center; justify-content:center; flex-shrink:0}' +
    '.zhd .sub{font-size:var(--font-xs); color:var(--color-text-muted); font-weight:var(--weight-medium)}' +
    '.zhd.빔{color:var(--color-text-hint)}' +
    '.zbody{padding:0 var(--space-lg) var(--space-lg); display:flex; flex-direction:column; gap:var(--space-sm)}' +
    '.cnt{margin-left:auto; font-size:var(--font-2xs); font-weight:var(--weight-semibold);' +
    ' color:var(--color-text-hint); font-variant-numeric:tabular-nums; white-space:nowrap}' +
    '.cnt.over{color:var(--color-danger)}' +
    '.ta{width:100%; font-family:inherit; font-size:var(--font-md); font-weight:var(--weight-regular);' +
    ' line-height:1.7; padding:var(--space-sm) var(--space-md); display:block; resize:vertical;' +
    ' border:var(--border-width) solid var(--color-border); border-radius:var(--radius-md);' +
    ' background:var(--color-surface); color:var(--color-text); letter-spacing:-.01em}' +
    '.ta:focus{outline:none; border-color:var(--color-accent); box-shadow:0 0 0 3px var(--color-accent-bg)}' +
    '.ta.over{border-color:var(--color-danger); background:#FFFCFC}' +
    '.ta:disabled{background:var(--color-bg); color:var(--color-text-hint)}' +
    '.subline{display:flex; align-items:center; gap:var(--space-sm)}' +
    '.subline label{font-size:var(--font-xs); font-weight:var(--weight-semibold); color:var(--color-text-muted)}' +
    '.subline .inp{height:32px; width:150px; font-size:var(--font-md); font-weight:var(--weight-semibold)}' +
    '.item{border-top:var(--border-width) solid var(--color-border-faint); padding-top:var(--space-sm);' +
    ' display:flex; flex-direction:column; gap:var(--space-xs)}' +
    '.item:first-child{border-top:none; padding-top:0}' +
    '.item .ihd{display:flex; align-items:center; gap:var(--space-sm)}' +
    '.item .ihd .n{font-size:var(--font-sm); font-weight:var(--weight-bold); color:var(--color-text-sub); width:14px}' +
    '.item .ihd .inp{height:32px; font-size:var(--font-md); font-weight:var(--weight-semibold); width:170px}' +
    '.pcsave{display:flex; align-items:center; gap:var(--space-md); padding-top:var(--space-sm)}' +
    '.pcsave .st{font-size:var(--font-xs); font-weight:var(--weight-semibold); color:var(--color-text-muted)}' +
    '.pcsave .st b{color:var(--color-accent-dark)}' +
    '.pcsave .st b.no{color:var(--color-danger)}' +
    '.pcsave .spacer{flex:1}' +
    '.pcsave.폰 .btn.main{flex:1; min-height:46px; font-size:var(--font-lg)}' +
    '.btn.off{background:var(--color-seg-bg); color:var(--color-text-hint); border-color:var(--color-border); box-shadow:none}' +
    '.alert .zlink{display:inline-block; font-size:var(--font-xs); font-weight:var(--weight-bold); color:var(--color-danger);' +
    ' background:var(--color-surface); border:var(--border-width) solid var(--color-danger-border);' +
    ' padding:var(--pad-tag); border-radius:var(--radius-badge); margin-right:var(--space-xs)}';
  document.head.appendChild(결);

  var 자 = null;                                    // ZG.원고자료 — 늦게 잡는다(파일 순서에 안 기댄다)
  function 자료() { return 자 || (자 = ZG.원고자료); }

  /* ── 상태는 창에 붙여 둔다. 갈래를 오갔다 와도 고치던 글이 안 날아간다 ── */
  function 상태(창) {
    if (!창.원고) 창.원고 = { 실은가: false, 값: {}, 원래: {}, 있음: {}, 넘침: {}, 말: '' };
    return 창.원고;
  }

  function 같나(a, b) {
    return (a.소제목 || '') === (b.소제목 || '') && (a.본문 || '') === (b.본문 || '');
  }

  function 바뀐칸들(창) {
    var s = 상태(창);
    return 자료().칸들.filter(function (정) {
      return s.있음[정.칸] && !같나(s.값[정.칸] || {}, s.원래[정.칸] || {});
    }).map(function (정) { return 정.칸; });
  }

  /* ══════════ 글칸 하나 ══════════ */

  function 글칸(창, 칸, 줄수) {
    var s = 상태(창);
    var 값 = s.값[칸] || (s.값[칸] = { 소제목: '', 본문: '' });
    var 있 = !!s.있음[칸];
    var ta = 만들기('textarea', {
      class: 'ta' + (s.넘침[칸] ? ' over' : ''), rows: String(줄수 || 4),
      placeholder: 있 ? '' : '이 칸을 파일에서 못 읽었습니다 — 여기서는 고칠 수 없습니다'
    });
    ta.value = 값.본문 || '';
    if (!있) ta.disabled = true;
    /* 🔴 한글 조합 중에 값을 건드리면 「휴케라」가 ㅎㅠㅋㅔㄹㅏ 로 깨진다 (8/4 사고) */
    else u.조합안전입력(ta, function (v) { 값.본문 = v; 저장줄맞추기(창); });
    return ta;
  }

  function 소제목줄(창, 칸, 라벨) {
    var s = 상태(창);
    var 값 = s.값[칸] || (s.값[칸] = { 소제목: '', 본문: '' });
    var inp = 만들기('input', { class: 'inp', type: 'text' });
    inp.value = 값.소제목 || '';
    if (!s.있음[칸]) inp.disabled = true;
    else u.조합안전입력(inp, function (v) { 값.소제목 = v; 저장줄맞추기(창); });
    return 만들기('div', { class: 'subline' }, [만들기('label', { text: 라벨 || '소제목' }), inp]);
  }

  function 셈칩(창, 칸) {
    var s = 상태(창), 넘 = s.넘침[칸];
    if (!넘) return null;
    var 정 = 자료().칸찾기(칸);
    return 만들기('span', {
      class: 'cnt over',
      text: 자료().글자수((s.값[칸] || {}).본문) + ' / ' + 정.상한 + ' · ' + 넘 + '자 넘침'
    });
  }

  /* ══════════ 구역 카드 ══════════ */

  function 홑구역(창, 번호, 칸) {
    var s = 상태(창);
    var 이름들 = 자료().구역이름(창 && 창.품목);   // 🔴 구근은 이름이 다르다 (2026-09-14)
    var 이름 = (칸 === '2' || 칸 === '3') ? ((s.값[칸] || {}).소제목 || 이름들[번호]) : 이름들[번호];
    var 머리 = 만들기('div', { class: 'zhd' }, [만들기('span', { class: 'no', text: 번호 }), 만들기('span', { text: 이름 })]);
    var 칩 = 셈칩(창, 칸);
    if (칩) 머리.appendChild(칩);
    var 몸 = 만들기('div', { class: 'zbody' });
    if (자료().칸찾기(칸).소제목) 몸.appendChild(소제목줄(창, 칸));
    몸.appendChild(글칸(창, 칸));
    return 만들기('div', { class: 'zone' + (s.넘침[칸] ? ' bad' : '') }, [머리, 몸]);
  }

  /* 🔴 4구역은 3항목 고정이다. 더하기·지우기 단추를 두지 않는다 (설계 §1) */
  function 넷째구역(창) {
    var s = 상태(창), 나쁨 = false;
    var 몸 = 만들기('div', { class: 'zbody' });
    ['4-1', '4-2', '4-3'].forEach(function (칸, i) {
      if (s.넘침[칸]) 나쁨 = true;
      var 값 = s.값[칸] || (s.값[칸] = { 소제목: '', 본문: '' });
      var inp = 만들기('input', { class: 'inp', type: 'text' });
      inp.value = 값.소제목 || '';
      if (!s.있음[칸]) inp.disabled = true;
      else u.조합안전입력(inp, function (v) { 값.소제목 = v; 저장줄맞추기(창); });
      var 머리 = 만들기('div', { class: 'ihd' }, [만들기('span', { class: 'n', text: '①②③'[i] }), inp]);
      var 칩 = 셈칩(창, 칸);
      if (칩) 머리.appendChild(칩);
      몸.appendChild(만들기('div', { class: 'item' }, [머리, 글칸(창, 칸, 5)]));
    });
    var 머리줄 = 만들기('div', { class: 'zhd' }, [
      만들기('span', { class: 'no', text: '4' }), 만들기('span', { text: 'How to grow' }),
      만들기('span', { class: 'sub', text: '3항목 고정' })
    ]);
    return 만들기('div', { class: 'zone' + (나쁨 ? ' bad' : '') }, [머리줄, 몸]);
  }

  /* 6구역은 실촬영이라 글이 없다 — 흐린 머리 한 줄만 (설계 §1) */
  function 여섯째구역() {
    return 만들기('div', { class: 'zone' }, [만들기('div', { class: 'zhd 빔' }, [
      만들기('span', { class: 'no', text: '6' }), 만들기('span', { text: '실촬영' }),
      만들기('span', { class: 'sub', text: '사진만 — 글 없음' })
    ])]);
  }

  /* ══════════ 저장 ══════════ */

  function 저장줄맞추기(창) {
    var s = 상태(창);
    if (!s.저장단추) return;
    var 바뀜 = 바뀐칸들(창);
    s.저장단추.disabled = !바뀜.length;
    s.저장단추.className = 'btn main' + (바뀜.length ? '' : ' off');
    var 구역 = [];
    바뀜.forEach(function (칸) {
      var g = 자료().칸찾기(칸).구역 + '구역';
      if (구역.indexOf(g) < 0) 구역.push(g);
    });
    s.알림칸.innerHTML = '고친 곳 ' + (구역.length
      ? '<b>' + u.안전(구역.join(' · ')) + '</b>'
      : '<b style="color:var(--color-text-hint)">없음</b>');
  }

  function 저장하기(창) {
    var s = 상태(창);
    var 바뀜 = 바뀐칸들(창);
    if (!바뀜.length) return;

    s.넘침 = {};
    var 넘친것 = [];
    바뀜.forEach(function (칸) {
      var 넘 = 자료().넘침(칸, (s.값[칸] || {}).본문, (s.원래[칸] || {}).본문);
      if (넘) { s.넘침[칸] = 넘; 넘친것.push(칸); }
    });
    /* 🔴 넘친 칸이 하나라도 있으면 아무것도 안 보낸다 (설계 §3) */
    if (넘친것.length) {
      s.말 = '';
      다시그리기(창);
      u.토스트('글자가 넘쳐 저장하지 못했습니다');
      return;
    }

    s.저장단추.disabled = true;
    자료().저장하기(창.코드, 바뀜.map(function (칸) {
      return { 칸: 칸, 소제목: (s.값[칸] || {}).소제목, 본문: (s.값[칸] || {}).본문,
               맥시각: (s.원래[칸] || {}).맥시각 || 0 };
    })).then(function (n) {
      바뀜.forEach(function (칸) {
        s.원래[칸] = { 소제목: s.값[칸].소제목, 본문: s.값[칸].본문, 맥시각: (s.원래[칸] || {}).맥시각 || 0 };
      });
      다시그리기(창);
      u.토스트(n + '칸 저장했습니다 · 맥이 1분 안에 받아 갑니다');
    }).catch(function (e) {
      console.warn('원고 저장 실패', e);
      저장줄맞추기(창);
      u.토스트(자료().말썽(e));
    });
  }

  function 되돌리기(창) {
    var s = 상태(창);
    s.값 = {};
    Object.keys(s.원래).forEach(function (칸) {
      s.값[칸] = { 소제목: s.원래[칸].소제목, 본문: s.원래[칸].본문 };
    });
    s.넘침 = {};
    다시그리기(창);
  }

  /* ══════════ 그리기 ══════════ */

  function 넘침카드(창) {
    var s = 상태(창);
    var 칸들 = Object.keys(s.넘침);
    if (!칸들.length) return null;
    var 고리 = 칸들.map(function (칸) {
      var 정 = 자료().칸찾기(칸);
      var 이름 = 정.구역 + '구역' + (정.구역 === '4' ? ' ' + 정.이름 : '');
      return '<span class="zlink">' + u.안전(이름) + ' · ' +
             자료().글자수((s.값[칸] || {}).본문) + ' / ' + 정.상한 + '</span>';
    }).join('');
    var 카드 = 만들기('div', { class: 'alert' });
    카드.innerHTML =
      '<h4>글자가 넘쳐 저장하지 못했습니다 <span class="right">' + 칸들.length + '곳</span></h4>' +
      '<p>' + 고리 + ' 넘친 만큼 줄이면 저장됩니다.</p>';
    return 카드;
  }

  function 다시그리기(창) {
    if (!창 || 창.갈래 !== '원고' || !창.몸) return;
    u.비우기(창.몸);
    창.몸.appendChild(판만들기(창));
  }

  function 판만들기(창) {
    var s = 상태(창);
    var 판 = 만들기('div', { class: '원고판' });

    if (!s.실은가) {
      판.appendChild(만들기('div', { class: 'zhd 빔', text: s.말 || '원고를 불러오는 중…' }));
      return 판;
    }

    var 경고 = 넘침카드(창);
    if (경고) 판.appendChild(경고);

    var 왼 = 만들기('div', { class: 'zonelist' }, [
      홑구역(창, '1', '1'), 홑구역(창, '2', '2'), 홑구역(창, '3', '3'),
      홑구역(창, '5', '5'), 여섯째구역()
    ]);
    var 오 = 만들기('div', { class: 'zonelist' }, [넷째구역(창)]);
    판.appendChild(u.폰인가()
      ? 만들기('div', { class: 'zonelist' }, [왼, 오])
      : 만들기('div', { class: 'cols' }, [만들기('div', {}, [왼]), 만들기('div', {}, [오])]));

    var 알림 = 만들기('div', { class: 'st' });
    var 저장 = 만들기('button', { class: 'btn main off', type: 'button', text: '저장', disabled: 'disabled' });
    저장.addEventListener('click', function () { 저장하기(창); });
    var 줄 = [알림, 만들기('div', { class: 'spacer' })];
    if (!u.폰인가()) {
      var 돌 = 만들기('button', { class: 'btn', type: 'button', text: '되돌리기' });
      돌.addEventListener('click', function () { 되돌리기(창); });
      줄.push(돌);
    }
    줄.push(저장);
    판.appendChild(만들기('div', { class: 'pcsave' + (u.폰인가() ? ' 폰' : '') }, 줄));

    s.저장단추 = 저장; s.알림칸 = 알림;
    저장줄맞추기(창);
    return 판;
  }

  function 그리기(몸, 창) {
    var s = 상태(창);
    몸.appendChild(판만들기(창));
    if (s.실은가 || s.부르는중) return;

    s.부르는중 = true;
    자료().불러오기(창.코드).then(function (답) {
      s.부르는중 = false;
      if (!창.덮개.parentNode) return;
      자료().칸들.forEach(function (정) {
        var r = 답.칸값[정.칸];
        if (!r) return;                                  // 못 읽은 칸 — 저장 대상에서 뺀다
        s.있음[정.칸] = true;
        s.값[정.칸] = { 소제목: r.소제목 || '', 본문: r.본문 || '' };
        s.원래[정.칸] = { 소제목: r.소제목 || '', 본문: r.본문 || '', 맥시각: r.맥시각 || 0 };
      });
      s.머리 = 답.머리;
      s.실은가 = true;
      다시그리기(창);
    }).catch(function (e) {
      s.부르는중 = false;
      console.warn('원고 불러오기 실패', e);
      s.말 = 자료().말썽(e);
      if (창.덮개.parentNode && 창.갈래 === '원고') { 다시그리기(창); u.토스트(s.말); }
    });
  }

  ZG.원고화면 = { 그리기: 그리기, 상태: 상태, 바뀐칸들: 바뀐칸들 };
})(window.ZG);
