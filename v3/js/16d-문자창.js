/* 16d-문자창 — 보내신 문자를 적어 두는 창 (11단계 설계 §5 · 세부설계 §4)
   🔴 이 프로그램은 문자를 보내지 않는다. 발송 API·수신동의·예약을 만들지 않는다.
   PC·폰이 같은 창을 쓴다(주문.css 의 pcsheet 폰 규칙). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 막 = null, 창 = null;

  function 닫기() {
    if (막) { 막.remove(); 막 = null; }
    if (창) { 창.remove(); 창 = null; }
    u.탈출풀기();
  }

  function 열기(키들, 끝나면) {
    닫기();
    var 자 = ZG.고객자료;
    키들 = (키들 || []).slice();

    var 사람들 = 자.목록({}).filter(function (g) { return 키들.indexOf(g.키) >= 0; });
    var 안심들 = 사람들.filter(function (g) { return g.안심; });

    var 날짜 = 만들기('input', { class: 'inp num', type: 'date', style: 'width:160px' });
    날짜.value = u.오늘문자();
    var 내용 = 만들기('textarea', {
      class: 'inp ta', rows: '5',
      placeholder: '보내신 문자 내용을 그대로 붙여넣으시면 됩니다'
    });

    var 지난칸 = 만들기('div');

    function 지난채우기() {
      u.비우기(지난칸);
      var 것들 = 자.문자전부();
      지난칸.appendChild(만들기('div', { class: 'ph-sec', text: '지난 발송' }));
      if (!것들.length) {
        지난칸.appendChild(만들기('div', { class: 'empty', text: '아직 적어 둔 문자가 없습니다' }));
        return;
      }
      var 상자 = 만들기('div', { class: 'box' });
      것들.forEach(function (m) {
        var 첫줄 = String(m.내용 || '').split('\n')[0];
        var 지움 = 만들기('button', {
          class: 'btn sm del', type: 'button', text: '🗑', style: 'margin-left:auto',
          'aria-label': '이 발송 기록 지우기'
        });
        지움.addEventListener('click', function () {
          u.확인({
            제목: '이 발송 기록을 지울까요?',
            본문: u.안전(m.보낸날 || '') + ' · ' + u.안전(첫줄.slice(0, 30)) + '<br><b>되돌릴 수 없습니다.</b>',
            확인글: '삭제', 위험: true
          }, function (예) {
            if (!예) return;
            자.문자삭제(m.id);
            u.토스트('발송 기록을 지웠습니다');
            지난채우기();
            if (끝나면) 끝나면();
          });
        });
        상자.appendChild(만들기('div', { class: 'kv' }, [
          만들기('span', { class: 'k', text: m.보낸날 || '' }),
          만들기('span', { class: 'v' }, [
            만들기('span', { text: 첫줄 || '(내용 없음)' }),
            만들기('div', {
              class: 'hint',
              html: '인원 <b>' + (m.받은이 || []).length + '</b>명 · 보낸 뒤 주문 <b>' +
                    자.반응수(m) + '</b>명 <span style="opacity:.7">(' + 자.반응기간 + '일)</span>'
            })
          ]),
          지움
        ]));
      });
      지난칸.appendChild(상자);
    }

    function 저장하기() {
      var 글 = 내용.value.trim();
      if (!글) { u.흔들기(내용); u.토스트('보낸 내용을 적어 주세요'); 내용.focus(); return; }
      자.문자추가({ 보낸날: 날짜.value || u.오늘문자(), 내용: 글, 받은이: 키들 });
      u.토스트(키들.length + '명에게 보낸 문자를 적었습니다');
      닫기();
      if (끝나면) 끝나면();   // 🔴 고른 체크는 풀지 않는다 — 연달아 다른 내용으로 또 적으실 수 있다
    }

    var 저장 = 만들기('button', { class: 'btn sm main', type: 'button', text: '저장' });
    저장.addEventListener('click', 저장하기);
    var 닫기버튼 = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '닫기' });
    닫기버튼.addEventListener('click', 닫기);

    var 고른줄 = 만들기('div', { class: 'noteline' }, [
      만들기('div', {
        html: '고른 <b>' + 키들.length + '</b>명' +
              (안심들.length ? ' · <b>⚠ 안심번호 ' + 안심들.length + '명(문자 안 감)</b>' : '')
      })
    ]);
    if (안심들.length) {
      고른줄.appendChild(만들기('div', {
        style: 'margin-top:var(--space-2xs)',
        text: 안심들.map(function (g) { return g.이름; }).join(' · ')
      }));
    }

    막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', 닫기);

    창 = 만들기('div', { class: 'pcsheet', role: 'dialog', 'aria-modal': 'true' }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: '문자 기록' }),
        만들기('span', {
          class: 'hint',
          text: '보내신 문자를 여기에 적어 둡니다 — 이 프로그램은 문자를 보내지 않습니다'
        }),
        만들기('span', { class: 'right' }, [저장, 닫기버튼])
      ]),
      만들기('div', { class: 'bd' }, [
        고른줄,
        만들기('div', { class: 'pair', style: 'margin-top:var(--space-lg)' }, [
          만들기('div', { class: 'field', style: 'flex:0 0 160px' }, [
            만들기('label', { text: '보낸 날짜' }), 날짜
          ])
        ]),
        만들기('div', { class: 'field', style: 'margin-top:var(--space-md)' }, [
          만들기('label', { text: '보낸 내용' }), 내용
        ]),
        지난칸
      ])
    ]);

    document.body.appendChild(막);
    document.body.appendChild(창);
    지난채우기();
    u.탈출걸기(닫기);
    setTimeout(function () { 내용.focus(); }, 20);
  }

  ZG.문자창 = { 열기: 열기, 닫기: 닫기 };
})(window.ZG);
