/* 06f-블로그 — 「상품」 화면 네 번째 탭. 그 주 블로그 원고를 읽고·고치고·이미지를 받는다 (14단계)

   🔴 맥 편집기 창을 얹던 iframe 을 버렸다 (8/26 우람님). 어느 PC에서 통합관리를 열어도
      원고가 보여야 네이버에 올리실 수 있다 — 127.0.0.1 은 그 맥에서만 열린다.
   자료는 표 `v3_블로그` 다. 맥 편집기의 [저장]이 원고 한 편을 한 줄로 올린다.
   이미지는 Storage 공개 버킷 `blog` 에 있고, 줄에는 주소만 담긴다.

   고치신 것은 「고친본문」 칸에 들어가 서버로 간다 — 맥에서 고치든 밖에서 고치든 한 자리다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 지금 = { 주차: null, 이름: null, 손댐: false };

  function 줄들() {
    return ZG.저장소.읽기(ZG.저장소.키.블로그).filter(function (r) { return !r.삭제됨; });
  }

  function 주차들() {
    var 본것 = {}, 것들 = [];
    줄들().forEach(function (r) { if (!본것[r.주차]) { 본것[r.주차] = 1; 것들.push(r.주차); } });
    return 것들.sort().reverse();          // 최근 주차가 앞
  }

  function 그주(주차) {
    return 줄들().filter(function (r) { return r.주차 === 주차; })
                 .sort(function (a, b) { return a.이름 < b.이름 ? -1 : 1; });
  }

  function 지금줄() {
    return 줄들().filter(function (r) { return r.주차 === 지금.주차 && r.이름 === 지금.이름; })[0] || null;
  }

  /* 「붙임」이 있으면 그것이 진짜다 — 글꼴·색·사진까지 든 판이라 네이버에 그대로 붙는다.
     없는 글(옛 주차)은 예전처럼 글자만 낸다. */
  function 꾸민것(r) { return r && r.붙임 ? (r.고친붙임 != null ? r.고친붙임 : r.붙임) : null; }
  function 글자(r) { return (r && (r.고친본문 != null ? r.고친본문 : r.본문)) || ''; }
  function 고쳤나(r) { return r && (r.고친붙임 != null || r.고친본문 != null); }

  /* 붙임은 「<style>…</style> + 몸」이다. 스타일은 고치는 칸 밖에 둔다 — 지워지지 않게 */
  function 쪼개기(글) {
    var 끝 = 글.indexOf('</style>');
    return 끝 < 0 ? { css: '', 몸: 글 }
                  : { css: 글.slice(0, 끝 + 8), 몸: 글.slice(끝 + 8) };
  }

  function 머리() {
    var r = 지금줄();
    return { 제목: '블로그 원고', 왼: 지금.주차 || '', 오: r ? r.제목 : '' };
  }

  /* ── 그리기 ─────────────────────────────────────────────── */
  function 그리기(본문) {
    u.비우기(본문);

    var 주들 = 주차들();
    if (!주들.length) {
      본문.appendChild(안내('아직 올라온 원고가 없습니다.<br><br>' +
        '맥에서 <b>블로그 원고를 열고 [저장]</b>을 누르시면 여기로 올라옵니다 — ' +
        '그다음부터는 어느 PC에서든 보입니다.'));
      return;
    }
    if (주들.indexOf(지금.주차) < 0) { 지금.주차 = 주들[0]; 지금.이름 = null; }
    var 그것들 = 그주(지금.주차);
    if (!그것들.some(function (r) { return r.이름 === 지금.이름; })) {
      지금.이름 = 그것들.length ? 그것들[0].이름 : null;
    }
    지금.손댐 = false;

    var 틀 = 만들기('div', { class: '블-틀' });
    본문.appendChild(틀);
    틀.appendChild(윗줄(주들));
    틀.appendChild(원고탭(그것들));

    var r = 지금줄();
    if (!r) { 틀.appendChild(안내('이 주차엔 원고가 없습니다.')); return; }
    틀.appendChild(글칸(r));
    틀.appendChild(만들기('div', { class: '블-말', id: '블-말' }));
    틀.appendChild(이미지줄(r));
  }

  function 안내(글) {
    var d = 만들기('div', { class: '블-덧' });
    d.innerHTML = 글;
    return d;
  }

  function 말하기(글, 갈래) {
    var d = document.getElementById('블-말');
    if (d) { d.textContent = 글; d.className = '블-말 ' + (갈래 || ''); }
  }

  /* ── 주차 넘기기 + 단추들 ────────────────────────────────── */
  function 윗줄(주들) {
    var 칸 = 주들.indexOf(지금.주차);
    var 앞 = 만들기('button', { class: '블-단추', type: 'button', text: '◀' });
    var 뒤 = 만들기('button', { class: '블-단추', type: 'button', text: '▶' });
    앞.disabled = 칸 >= 주들.length - 1;   // 목록이 최근순이라 「앞」이 뒤 칸이다
    뒤.disabled = 칸 <= 0;
    앞.addEventListener('click', function () { 옮기기(주들[칸 + 1], null); });
    뒤.addEventListener('click', function () { 옮기기(주들[칸 - 1], null); });

    var 복사 = 만들기('button', { class: '블-단추 주', type: 'button', text: '전체 복사' });
    복사.addEventListener('click', 복사하기);
    var 저장 = 만들기('button', { class: '블-단추', type: 'button', text: '저장' });
    저장.addEventListener('click', 저장하기);
    var 원본 = 만들기('button', { class: '블-단추', type: 'button', text: '원본으로', id: '블-원본' });
    원본.addEventListener('click', 원본으로);
    var r = 지금줄();
    원본.disabled = !고쳤나(r);

    return 만들기('div', { class: '블-위' }, [
      앞, 만들기('div', { class: '블-주차', text: 지금.주차 }), 뒤,
      만들기('div', { class: '블-참' }), 원본, 복사, 저장
    ]);
  }

  function 옮기기(주차, 이름) {
    if (지금.손댐 && !confirm('고치신 것을 저장하지 않았습니다. 그냥 넘어갈까요?')) return;
    if (주차) 지금.주차 = 주차;
    지금.이름 = 이름;
    ZG.앱.다시그리기();
  }

  function 원고탭(그것들) {
    var 틀 = 만들기('div', { class: '블-탭들' });
    그것들.forEach(function (r) {
      var b = 만들기('button', {
        type: 'button',
        text: (고쳤나(r) ? '✏️ ' : '') + (r.제목 || r.이름),
        class: r.이름 === 지금.이름 ? 'on' : ''
      });
      b.addEventListener('click', function () { 옮기기(null, r.이름); });
      틀.appendChild(b);
    });
    return 틀;
  }

  /* ── 이미지 — 있는 것은 받고, 없는 것은 「촬영 필요」 ───────── */
  function 이미지줄(r) {
    var 것들 = r.이미지 || [];
    var 틀 = 만들기('div', { class: '블-사진들' });
    if (!것들.length) {
      틀.appendChild(만들기('div', { class: '블-사진없음', text: '이 원고엔 사진 자리가 없습니다' }));
      return 틀;
    }

    var 있는것 = 것들.filter(function (x) { return x.주소; });
    var 머리칸 = 만들기('div', { class: '블-사진머리' }, [
      만들기('b', { text: '이미지 ' + 있는것.length + '/' + 것들.length + '장' })
    ]);
    if (있는것.length) {
      var 전부 = 만들기('button', { class: '블-단추 작게', type: 'button',
                                 text: '전부 받기 (' + 있는것.length + ')' });
      전부.addEventListener('click', function () { 받기(있는것, r); });
      머리칸.appendChild(전부);
    }
    틀.appendChild(머리칸);

    var 줄 = 만들기('div', { class: '블-사진줄' });
    것들.forEach(function (x) {
      var 칸 = 만들기('div', { class: '블-사진' + (x.주소 ? '' : ' 없음') });
      if (x.주소) {
        칸.appendChild(만들기('img', { src: x.주소, alt: x.alt || '', loading: 'lazy' }));
      } else {
        칸.appendChild(만들기('div', { class: '블-찍기', text: '📷' }));
      }
      칸.appendChild(만들기('div', { class: '블-사진이름',
        text: '사진' + x.번호 + (x.주소 ? '' : ' · 촬영 필요') }));
      if (x.캡션) 칸.appendChild(만들기('div', { class: '블-캡션', text: x.캡션 }));
      if (!x.주소 && x.alt) 칸.appendChild(만들기('div', { class: '블-캡션', text: x.alt }));
      if (x.주소) {
        var b = 만들기('button', { class: '블-단추 작게', type: 'button', text: '받기' });
        b.addEventListener('click', function () { 받기([x], r); });
        칸.appendChild(b);
      }
      줄.appendChild(칸);
    });
    틀.appendChild(줄);
    return 틀;
  }

  /* 🔴 <a download> 는 다른 자리(Storage)의 파일엔 안 먹는다 — 그냥 열려 버린다.
     받아서 blob 으로 바꿔 내려준다. 막히면 새 창으로 여는 것까지는 해 드린다. */
  function 받기(것들, r) {
    말하기('받는 중…');
    var 센것 = 0;
    것들.forEach(function (x, i) {
      setTimeout(function () {
        fetch(x.주소).then(function (답) { return 답.blob(); }).then(function (b) {
          var 주소 = URL.createObjectURL(b);
          var a = document.createElement('a');
          a.href = 주소;
          a.download = (r.이름 || '원고').replace(/\.md$/, '') + '-사진' + x.번호 +
                       (x.주소.match(/\.\w+$/) || ['.jpg'])[0];
          document.body.appendChild(a); a.click(); a.remove();
          setTimeout(function () { URL.revokeObjectURL(주소); }, 4000);
          말하기(++센것 + '/' + 것들.length + '장 받았습니다', '됐다');
        }).catch(function () {
          window.open(x.주소, '_blank');
          말하기('사진' + x.번호 + '은 새 창으로 열었습니다 — 거기서 저장하십시오');
        });
      }, i * 350);   // 한꺼번에 쏘면 브라우저가 뒤 것을 막는다
    });
  }

  /* ── 글칸 ──────────────────────────────────────────────── */
  function 글칸(r) {
    var 꾸민 = 꾸민것(r);
    if (!꾸민) {
      var 칸 = 만들기('textarea', { class: '블-글', id: '블-글', spellcheck: 'false' });
      칸.value = 글자(r);
      칸.addEventListener('input', 손댐);
      return 칸;
    }
    var 조각 = 쪼개기(꾸민);
    var 겉 = 만들기('div', { class: '블-원고틀' });
    var 스타일 = 만들기('div', { id: '블-css' });
    스타일.innerHTML = 조각.css;
    var 글 = 만들기('div', { class: '블-원고', id: '블-글', contenteditable: 'true',
                            spellcheck: 'false' });
    글.innerHTML = 조각.몸;
    글.addEventListener('input', 손댐);
    겉.appendChild(스타일);
    겉.appendChild(글);
    return 겉;
  }

  function 손댐() {
    지금.손댐 = true;
    말하기('고치는 중 — 저장하지 않았습니다');
  }

  /* 지금 화면에 있는 것을 「저장할 꼴」로 되돌린다 */
  function 지금값(r) {
    var 칸 = document.getElementById('블-글');
    if (!칸) return null;
    if (!꾸민것(r)) return { 고친본문: 칸.value };
    var 스타일 = document.getElementById('블-css');
    return { 고친붙임: (스타일 ? 스타일.innerHTML : '') + 칸.innerHTML };
  }

  function 복사하기() {
    var 칸 = document.getElementById('블-글');
    if (!칸) return;
    var 됐다 = function () { 말하기('복사했습니다 — 네이버 글쓰기에 그대로 붙여넣으십시오', '됐다'); };

    /* 글자칸(옛 주차)은 예전 그대로 */
    if (칸.tagName === 'TEXTAREA') {
      if (!칸.value) { 말하기('복사할 것이 없습니다', '틀렸다'); return; }
      if (navigator.clipboard && navigator.clipboard.writeText) {
        navigator.clipboard.writeText(칸.value).then(됐다, 글자예비);
      } else { 글자예비(); }
      return;
    }

    /* 🔴 꾸민 판은 text/html 로 실어야 글꼴·색·사진이 같이 붙는다.
       글자만 실으면 네이버에 민 글자로 들어간다. */
    var html = (document.getElementById('블-css') || { innerHTML: '' }).innerHTML + 칸.innerHTML;
    if (window.ClipboardItem && navigator.clipboard && navigator.clipboard.write) {
      navigator.clipboard.write([new ClipboardItem({
        'text/html': new Blob([html], { type: 'text/html' }),
        'text/plain': new Blob([칸.innerText], { type: 'text/plain' })
      })]).then(됐다, 서식예비);
    } else { 서식예비(); }

    /* 예비 — 글을 통째로 잡아 복사한다. 서식은 그대로 따라온다 */
    function 서식예비() {
      var 범위 = document.createRange();
      범위.selectNodeContents(칸);
      var 고른것 = window.getSelection();
      고른것.removeAllRanges(); 고른것.addRange(범위);
      document.execCommand('copy');
      고른것.removeAllRanges();
      됐다();
    }
    function 글자예비() {
      var 자리 = [칸.selectionStart, 칸.selectionEnd];
      칸.select(); document.execCommand('copy');
      칸.setSelectionRange(자리[0], 자리[1]);   // 잡힌 채로 두면 다음 글쇠에 다 날아간다
      됐다();
    }
  }

  function 저장하기() {
    var r = 지금줄(), 값 = 지금값(r);
    if (!r || !값) return;
    ZG.저장소.바꾸기(ZG.저장소.키.블로그, r.id, 값);
    지금.손댐 = false;
    ZG.앱.다시그리기();
    말하기('저장했습니다 — 다른 PC에서도 이대로 보입니다', '됐다');
  }

  function 원본으로() {
    var r = 지금줄();
    if (!고쳤나(r)) return;
    if (!confirm('고치신 것을 버리고 원고 그대로 다시 볼까요?')) return;
    ZG.저장소.바꾸기(ZG.저장소.키.블로그, r.id, { 고친본문: null, 고친붙임: null });
    지금.손댐 = false;
    ZG.앱.다시그리기();
    말하기('원고 그대로 되돌렸습니다', '됐다');
  }

  ZG.블로그 = { 그리기: 그리기, 머리: 머리 };
})(window.ZG);
