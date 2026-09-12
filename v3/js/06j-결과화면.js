/* 06j-결과화면 — 품목 창의 [결과] 갈래 (15단계 B 설계 §1·§3)
   만들어진 1~6.jpg 를 보여 준다. 없으면 점선 자리 여섯과 준비 칩 셋.
   🔴 [상세페이지 만들기]는 새 자동화가 아니다 — 06e 의 요청하기('상세페이지')를 그대로 부른다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 번호들 = ['1', '2', '3', '4', '5', '6'];
  var 이름들 = { '1': '소개', '2': '꽃', '3': '잎', '4': 'How to grow', '5': '식재 간격', '6': '실촬영' };

  var 결 = document.createElement('style');
  결.textContent =
    '.결과판{display:flex; flex-direction:column; gap:var(--space-lg)}' +
    '.toolbar{display:flex; align-items:center; gap:var(--space-sm); flex-wrap:wrap}' +
    '.toolbar .made{font-size:var(--font-xs); font-weight:var(--weight-semibold); color:var(--color-text-muted)}' +
    '.toolbar .spacer{flex:1}' +
    '.ready{display:flex; gap:var(--space-sm); flex-wrap:wrap; align-items:center}' +
    '.rchip{display:inline-flex; align-items:center; gap:var(--gap-chip); font-size:var(--font-2xs);' +
    ' font-weight:var(--weight-semibold); padding:var(--pad-chip); border-radius:var(--radius-pill);' +
    ' background:var(--color-accent-bg); color:var(--color-accent-dark);' +
    ' border:var(--border-width) solid var(--color-accent-border)}' +
    '.rchip::before{content:"✓"; font-size:var(--font-2xs)}' +
    '.rchip.no{background:var(--color-danger-bg); color:var(--color-danger); border-color:var(--color-danger-border)}' +
    '.rchip.no::before{content:"!"}' +
    '.shots{display:flex; gap:var(--space-md); align-items:flex-start}' +
    '.shots figure{flex:1; min-width:0; display:flex; flex-direction:column; gap:var(--space-xs)}' +
    '.shots img{width:100%; display:block; border-radius:var(--radius-md);' +
    ' border:var(--border-width) solid var(--color-border); background:var(--color-surface)}' +
    '.ph-shots{display:flex; flex-direction:column; gap:var(--space-md)}' +
    '.ph-shots img{width:100%; display:block; border-radius:var(--radius-md);' +
    ' border:var(--border-width) solid var(--color-border)}' +
    '.shotlab{display:flex; align-items:center; gap:var(--space-xs); font-size:var(--font-2xs);' +
    ' font-weight:var(--weight-semibold); color:var(--color-text-sub)}' +
    '.shotlab .n{width:16px; height:16px; border-radius:var(--radius-sm); background:var(--color-seg-bg);' +
    ' color:var(--color-text-sub); font-size:var(--font-3xs); font-weight:var(--weight-bold);' +
    ' display:inline-flex; align-items:center; justify-content:center; flex-shrink:0}' +
    '.ghost{border:var(--border-width-thick) dashed var(--color-border); border-radius:var(--radius-md);' +
    ' background:var(--color-bg); display:flex; flex-direction:column; align-items:center; justify-content:center;' +
    ' gap:var(--space-3xs); color:var(--color-text-hint); font-size:var(--font-xs); font-weight:var(--weight-semibold)}' +
    '.ghost b{font-size:var(--font-md); color:var(--color-text-faint)}' +
    '.ghosts{display:grid; grid-template-columns:1fr 1fr; gap:var(--space-md)}' +
    '.ghosts .ghost{height:96px}' +
    '.결과판 .말{font-size:var(--font-xs); color:var(--color-danger); font-weight:var(--weight-semibold); line-height:1.6}';
  document.head.appendChild(결);

  function 자료() { return ZG.원고자료; }

  function 상태(창) {
    if (!창.결과) 창.결과 = { 실은가: false, 있는것: {}, 머리: {}, 칸값: {}, 말: '', 만드는중: false };
    return 창.결과;
  }

  function 때글(ms) {
    if (!ms) return '';
    var d = new Date(ms);
    function 둘(n) { return (n < 10 ? '0' : '') + n; }
    return d.getFullYear() + '-' + 둘(d.getMonth() + 1) + '-' + 둘(d.getDate()) +
           ' ' + 둘(d.getHours()) + ':' + 둘(d.getMinutes());
  }

  /* ══════════ 준비 칩 셋 ══════════ */

  function 준비칩들(창) {
    var s = 상태(창);
    var 사진수 = Object.keys(창.있는것 || {}).length;
    var 구역 = {};
    var 넘친것 = 0;
    자료().칸들.forEach(function (정) {
      var r = s.칸값[정.칸];
      if (!r) return;
      구역[정.구역] = true;
      if (자료().글자수(r.본문) > 정.상한) 넘친것++;
    });
    var 구역수 = Object.keys(구역).length;
    var 줄 = 만들기('div', { class: 'ready' });
    줄.appendChild(만들기('span', { class: 'rchip' + (사진수 ? '' : ' no'), text: '사진 ' + 사진수 + '장' }));
    줄.appendChild(만들기('span', { class: 'rchip' + (구역수 ? '' : ' no'), text: '원고 ' + 구역수 + '구역' }));
    줄.appendChild(만들기('span', {
      class: 'rchip' + (넘친것 ? ' no' : ''),
      text: 넘친것 ? '글자수 넘친 칸 ' + 넘친것 + '개' : '글자수 모두 안쪽'
    }));
    return 줄;
  }

  /* ══════════ 단추 ══════════ */

  /* 제작.html 이 있으면 [다시 만들기], 없으면 [상세페이지 만들기].
     브라우저는 맥 파일을 못 보니 맥이 머리줄에 적어 둔 것을 본다 — 없으면 만든 흔적으로 가른다 */
  function 만든적있나(창) {
    var s = 상태(창);
    if (s.머리.제작있음 != null) return !!s.머리.제작있음;
    return !!s.머리.만든때 || Object.keys(s.있는것).length > 0;
  }

  function 다시만들기(창) {
    var s = 상태(창);
    var 덧 = {};
    Object.keys(s.머리).forEach(function (k) { 덧[k] = s.머리[k]; });
    덧.만들기요청 = Date.now();
    덧.만들기상태 = '요청';
    덧.말 = '';
    자료().머리쓰기(창.코드, 덧).then(function (내용) {
      s.머리 = 내용;
      s.만드는중 = true;
      s.기다린때 = Date.now();
      다시그리기(창);
      기다리기(창);
      u.토스트('맥에 만들기를 걸었습니다 · 1분 안에 받아 갑니다');
    }).catch(function (e) {
      console.warn('만들기 요청 실패', e);
      u.토스트(자료().말썽(e));
    });
  }

  /* 5초마다 머리줄과 발행 폴더를 다시 본다. 5분이 지나면 그만둔다 (설계 §3) */
  function 기다리기(창) {
    var s = 상태(창);
    if (!s.만드는중) return;
    setTimeout(function () {
      if (!창.덮개.parentNode || !s.만드는중) return;
      Promise.all([자료().머리읽기(창.코드), 자료().발행훑기(창.코드)]).then(function (둘) {
        s.머리 = 둘[0]; s.있는것 = 둘[1];
        if (s.머리.만들기상태 === '됨' || s.머리.만들기상태 === '실패') {
          s.만드는중 = false;
          다시그리기(창);
          u.토스트(s.머리.만들기상태 === '됨' ? '만들었습니다' : '만들지 못했습니다');
          return;
        }
        if (Date.now() - s.기다린때 > 300000) {
          s.만드는중 = false;
          다시그리기(창);
          u.토스트('맥이 안 받아 갔습니다 — 맥이 켜져 있는지 보십시오');
          return;
        }
        기다리기(창);
      }).catch(function () { 기다리기(창); });
    }, 5000);
  }

  function 만들기단추(창) {
    var s = 상태(창);
    var 있 = 만든적있나(창);
    var 단 = 만들기('button', {
      class: 'btn main' + (u.폰인가() ? '' : ' wide'), type: 'button',
      text: s.만드는중 ? '만드는 중…' : (있 ? '다시 만들기' : '상세페이지 만들기')
    });
    if (s.만드는중) 단.disabled = true;
    else 단.addEventListener('click', function () {
      if (있) 다시만들기(창);
      else ZG.사진수집.요청걸기();     // 🔴 새 자동화가 아니다 — 06e 의 요청하기 를 그대로 탄다
    });
    return 단;
  }

  function 내려받기단추(창) {
    var s = 상태(창);
    var 단 = 만들기('button', { class: 'btn sm', type: 'button', text: '내려받기' });
    단.addEventListener('click', function () {
      번호들.forEach(function (n) {
        if (s.있는것[n]) window.open(자료().발행주소(창.코드, n, s.있는것[n]), '_blank');
      });
    });
    return 단;
  }

  /* ══════════ 그리기 ══════════ */

  function 장들(창) {
    var s = 상태(창);
    var 폰 = u.폰인가();
    var 통 = 만들기('div', { class: 폰 ? 'ph-shots' : 'shots' });
    번호들.forEach(function (n) {
      var 라벨 = 만들기('div', { class: 'shotlab' }, [
        만들기('span', { class: 'n', text: n }), 만들기('span', { text: 이름들[n] })
      ]);
      var 것 = s.있는것[n]
        ? 만들기('img', { src: 자료().발행주소(창.코드, n, s.있는것[n]), alt: '' })
        : 만들기('div', { class: 'ghost', style: 폰 ? 'height:96px' : 'height:200px' },
                 [만들기('b', { text: n }), 만들기('span', { text: 이름들[n] })]);
      if (폰) { 통.appendChild(라벨); 통.appendChild(것); }
      else 통.appendChild(만들기('figure', {}, [라벨, 것]));
    });
    return 통;
  }

  function 빈자리들() {
    var 통 = 만들기('div', { class: 'ghosts' });
    번호들.forEach(function (n) {
      통.appendChild(만들기('div', { class: 'ghost' }, [만들기('b', { text: n }), 만들기('span', { text: 이름들[n] })]));
    });
    return 통;
  }

  function 판만들기(창) {
    var s = 상태(창);
    var 판 = 만들기('div', { class: '결과판' });
    if (!s.실은가) {
      판.appendChild(만들기('div', { class: 'toolbar' }, [만들기('span', { class: 'made', text: s.말 || '결과를 불러오는 중…' })]));
      return 판;
    }

    var 장수 = Object.keys(s.있는것).length;
    var 줄 = 만들기('div', { class: 'toolbar' });
    if (장수) 줄.appendChild(만들기('span', { class: 'rchip', text: 장수 + '장 있음' }));
    줄.appendChild(만들기('span', {
      class: 'made', text: s.머리.만든때 ? '만든 때 ' + 때글(s.머리.만든때) : '만든 적 없음'
    }));
    줄.appendChild(만들기('div', { class: 'spacer' }));
    if (장수 && !u.폰인가()) 줄.appendChild(내려받기단추(창));
    줄.appendChild(만들기단추(창));
    판.appendChild(줄);

    if (!장수) 판.appendChild(준비칩들(창));
    if (s.머리.만들기상태 === '실패' && s.머리.말) {
      판.appendChild(만들기('div', { class: '말', text: s.머리.말 }));
    }
    판.appendChild(장수 ? 장들(창) : 빈자리들());
    return 판;
  }

  function 다시그리기(창) {
    if (!창 || 창.갈래 !== '결과' || !창.몸) return;
    u.비우기(창.몸);
    창.몸.appendChild(판만들기(창));
  }

  function 그리기(몸, 창) {
    var s = 상태(창);
    몸.appendChild(판만들기(창));
    if (s.실은가 || s.부르는중) return;

    s.부르는중 = true;
    Promise.all([자료().발행훑기(창.코드), 자료().불러오기(창.코드)]).then(function (둘) {
      s.부르는중 = false;
      if (!창.덮개.parentNode) return;
      s.있는것 = 둘[0];
      s.칸값 = 둘[1].칸값;
      s.머리 = 둘[1].머리;
      s.실은가 = true;
      다시그리기(창);
    }).catch(function (e) {
      s.부르는중 = false;
      console.warn('결과 불러오기 실패', e);
      s.말 = 자료().말썽(e);
      if (창.덮개.parentNode && 창.갈래 === '결과') { 다시그리기(창); u.토스트(s.말); }
    });
  }

  ZG.결과화면 = { 그리기: 그리기 };
})(window.ZG);
