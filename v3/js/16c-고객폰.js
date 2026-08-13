/* 16c-고객폰 — 폰 고객 화면: 목록 / 상세 / 등록 (11단계 설계 §4 · 세부설계 §3)
   15c-견적폰 과 구조가 같다. 다른 것만 여기 있다.
   🔴 상세·등록에서 다시 그릴 때 입력칸을 통째로 갈아끼우지 않는다 — 조합 중인 한글이 되돌아간다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기, 자 = null;
  var 상태 = { 뷰: '목록', 키: '', 글: '', 판매처: '', 고른: {}, 폼: null, 펼침: false };

  function 다시() { ZG.주문.다시그리기(); }
  function 폼비우기() { 상태.폼 = { 이름: '', 전화: '', 우편번호: '', 주소: '', 메모: '' }; }
  function 지금것() { return 상태.키 ? 자.하나(상태.키) : null; }
  function 목록으로() { 상태.뷰 = '목록'; 상태.키 = ''; 상태.펼침 = false; 다시(); }

  function 제목() {
    자 = ZG.고객자료;
    if (상태.뷰 === '등록') return '새 고객';
    if (상태.뷰 === '상세') { var g = 지금것(); return g ? (g.이름 || '고객') : '고객'; }
    return '고객';
  }

  function 요약() {
    자 = ZG.고객자료;
    if (상태.뷰 === '등록') {
      var 셈0 = 자.요약(자.목록({}));
      return { 왼: '<span class="req">*</span> 표시는 꼭 채워주세요', 오: '손등록 <b>' + 셈0.손등록 + '</b>명' };
    }
    if (상태.뷰 === '상세') {
      var g = 지금것();
      if (!g) return { 왼: '', 오: '' };
      return { 왼: '주문 <b>' + g.주문수 + '</b>건', 오: '합계 <b>' + u.콤마(g.합계) + '</b>원' };
    }
    var 셈 = 자.요약(자.목록({}));
    return { 왼: '전체 <b>' + 셈.인원 + '</b>명', 오: '주문 <b>' + 셈.주문 + '</b>건' };
  }

  /* ── 목록 ── */
  function 목록그리기(칸) {
    var 검색 = 만들기('input', {
      class: 'inp', style: 'flex:1; min-width:120px', placeholder: '🔍 이름 · 전화 · 주소'
    });
    검색.value = 상태.글;

    var 고르개 = 만들기('select', { class: 'inp sm', style: 'width:112px', 'aria-label': '판매처' });
    [['', '전체 판매처']].concat(자.판매처목록().map(function (v) { return [v, v]; }))
      .forEach(function (쌍) { 고르개.appendChild(만들기('option', { value: 쌍[0], text: 쌍[1] })); });
    고르개.value = 상태.판매처;

    var 몸 = 만들기('div', { class: 'ph-list' });
    // .stack 은 주문.css 에 이미 있다 — 세로로 쌓아 버튼이 폭을 꽉 채운다(15c 의 addbtn 과 같은 모양)
    var 발밑 = 만들기('div', { class: 'stack' });

    function 채우기() {
      u.비우기(몸);
      var 것들 = 자.목록({ 글: 상태.글, 판매처: 상태.판매처 });
      if (!것들.length) {
        몸.appendChild(만들기('div', {
          class: 'empty',
          text: (상태.글 || 상태.판매처) ? '찾는 고객이 없습니다' : '아직 주문도 손등록 고객도 없습니다'
        }));
      } else {
        것들.forEach(function (g) { 몸.appendChild(카드(g, 채우기)); });
        u.목록등장(몸.children);
      }
      발밑채우기(것들);
    }

    function 발밑채우기(것들) {
      u.비우기(발밑);
      var 고름 = 것들.filter(function (g) { return 상태.고른[g.키]; }).map(function (g) { return g.키; });

      var 문자 = 만들기('button', {
        class: 'addbtn', type: 'button',
        text: 고름.length ? '✉ 문자 기록 (' + 고름.length + '명)' : '✉ 문자 기록'
      });
      if (!고름.length) {
        문자.setAttribute('aria-disabled', 'true');
        문자.style.opacity = '.4';
        문자.addEventListener('click', function () { u.토스트('문자를 적어 둘 고객을 먼저 골라 주세요.'); });
      } else {
        문자.addEventListener('click', function () { ZG.문자창.열기(고름, 채우기); });
      }
      발밑.appendChild(문자);

      var 더하기 = 만들기('button', { class: 'addbtn', type: 'button', text: '＋ 고객 등록' });
      더하기.addEventListener('click', function () { 폼비우기(); 상태.뷰 = '등록'; 다시(); });
      발밑.appendChild(더하기);
    }

    u.조합안전입력(검색, function (값) { 상태.글 = 값; 채우기(); });
    고르개.addEventListener('change', function () { 상태.판매처 = 고르개.value; 채우기(); });

    칸.appendChild(만들기('div', { class: 'sbar' }, [검색, 고르개]));
    칸.appendChild(몸);
    칸.appendChild(발밑);
    채우기();
  }

  function 카드(g, 채우기) {
    var c = 만들기('div', { class: 'ph-card ccard' });

    var 고름 = 만들기('button', {
      class: 'cb' + (상태.고른[g.키] ? ' on' : ''), type: 'button',
      'aria-pressed': 상태.고른[g.키] ? 'true' : 'false',
      'aria-label': (g.이름 || '') + ' 고르기'
    });
    고름.addEventListener('click', function (e) {
      e.stopPropagation();
      if (상태.고른[g.키]) delete 상태.고른[g.키]; else 상태.고른[g.키] = true;
      채우기();
    });

    var 오른쪽 = 만들기('div', { class: 'cbody', tabindex: '0', role: 'button' }, [
      만들기('div', { class: 'r1' }, [
        만들기('span', { class: 'nm', text: g.이름 || '' }),
        g.손등록
          ? 만들기('span', { class: 'hand', text: '손등록' })
          : 만들기('span', { class: 'mall', text: g.판매처들[0] || '' }),
        만들기('span', { class: 'day', text: (g.최근주문 || '').slice(5) || '—' }),
        만들기('span', { class: 'go', text: '›' })
      ]),
      만들기('div', { class: 'memo', text: g.주소 || '' })
    ]);

    var 바닥 = 만들기('div', { class: 'foot' });
    var 전화칸 = 만들기('span', { class: 'tel', text: g.전화 || '연락처 없음' });
    바닥.appendChild(전화칸);
    if (g.안심) 바닥.appendChild(만들기('span', { class: 'safe', text: '⚠ 안심' }));
    바닥.appendChild(만들기('span', {
      class: 'right',
      html: '<b>' + g.주문수 + '</b>건 · ' + u.콤마(g.합계) + '원'
    }));
    오른쪽.appendChild(바닥);

    function 들어가기() { 상태.키 = g.키; 상태.뷰 = '상세'; 상태.펼침 = false; 다시(); }
    오른쪽.addEventListener('click', 들어가기);
    오른쪽.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); 들어가기(); }
    });

    c.appendChild(고름);
    c.appendChild(오른쪽);
    return c;
  }

  /* ── 상세 ── */
  function 상세그리기(칸) {
    var g = 지금것();
    if (!g) { 목록으로(); return; }

    var 상자 = 만들기('div', { class: 'box' });
    function 줄넣기(k, v, 덧) {
      var 값칸 = 만들기('span', { class: 'v' }, [만들기('span', { text: v || '—' })]);
      if (덧) 값칸.appendChild(덧);
      상자.appendChild(만들기('div', { class: 'kv' }, [만들기('span', { class: 'k', text: k }), 값칸]));
    }
    줄넣기('연락처', g.전화, g.안심 ? 만들기('div', { class: 'safe', text: '⚠ 안심번호 — 문자가 안 갑니다' }) : null);
    줄넣기('주소', (g.우편번호 ? '(' + g.우편번호 + ') ' : '') + (g.주소 || ''));
    if (g.판매처들.length) 줄넣기('판매처', g.판매처들.join(' · '));
    칸.appendChild(상자);

    var 숫 = 자.숫자만(g.전화);
    if (숫.length >= 8 && !g.안심) {
      칸.appendChild(만들기('a', { class: 'addbtn', href: 'tel:' + 숫, text: '📞 전화 걸기' }));
    }

    주문칸(칸, g);
    메모칸(칸, g);
    문자칸(칸, g);

    var 견적 = 만들기('button', { class: 'btn', type: 'button', text: '📝 견적요청' });
    견적.addEventListener('click', function () { 견적만들기(g); });
    var 주문 = 만들기('button', { class: 'btn', type: 'button', text: '🛒 수동주문' });
    주문.addEventListener('click', function () { 수동주문(g); });
    칸.appendChild(만들기('div', { class: 'twobtn' }, [견적, 주문]));
  }

  /* 앞 2건만 보이고 나머지는 펼쳐서 본다 (세부설계 §3) */
  function 주문칸(칸, g) {
    칸.appendChild(만들기('div', { class: 'ph-sec', text: '주문 내역 (' + g.주문수 + '건)' }));
    var 줄들 = 자.주문줄들(g.키);
    if (!줄들.length) {
      칸.appendChild(만들기('div', { class: 'empty', text: '아직 주문이 없습니다' }));
      return;
    }
    var 보일것 = 상태.펼침 ? 줄들 : 줄들.slice(0, 2);
    보일것.forEach(function (r) {
      칸.appendChild(만들기('div', { class: 'orow' }, [
        만들기('span', { class: 'day', text: (r.주문일 || '').slice(5) }),
        만들기('span', { class: 'nm', text: (r.유통명 || r.품목코드 || '') + (r.규격 ? ' ' + r.규격 : '') }),
        만들기('span', { class: 'qty', text: ZG.주문자료.수량(r) + '주' }),
        만들기('span', { class: 'won', text: u.콤마(ZG.주문자료.금액(r)) })
      ]));
    });
    if (!상태.펼침 && 줄들.length > 2) {
      var 더 = 만들기('div', {
        class: 'orow more', tabindex: '0', role: 'button',
        text: '＋ 지난 주문 ' + (줄들.length - 2) + '건 더 보기'
      });
      function 펼치기() { 상태.펼침 = true; 다시(); }
      더.addEventListener('click', 펼치기);
      더.addEventListener('keydown', function (e) {
        if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); 펼치기(); }
      });
      칸.appendChild(더);
    }
  }

  /* 🔴 날짜 카드 목록. 오래된 것이 위, 새 것이 아래 (확정 설계 §3-2) */
  function 메모칸(칸, g) {
    칸.appendChild(만들기('div', { class: 'ph-sec', text: '메모' }));
    var 상자 = 만들기('div', { class: 'box' });
    (g.메모들 || []).forEach(function (m, i) {
      var 지움 = 만들기('button', {
        class: 'btn sm del', type: 'button', text: '🗑', 'aria-label': m.날 + ' 메모 지우기'
      });
      지움.addEventListener('click', function () { 메모지우기(g, m, i); });
      상자.appendChild(만들기('div', { class: 'kv' }, [
        만들기('span', { class: 'k', text: m.날 || '' }),
        만들기('span', { class: 'v', text: m.글 || '' }),
        지움
      ]));
    });
    if (!(g.메모들 || []).length) {
      상자.appendChild(만들기('div', { class: 'empty', text: '아직 적어 둔 메모가 없습니다' }));
    }
    칸.appendChild(상자);

    if (!상태.폼) 폼비우기();
    var 적는칸 = 만들기('textarea', {
      class: 'inp ta', rows: '3', placeholder: '적으시면 오늘 날짜가 저절로 붙습니다'
    });
    적는칸.value = 상태.폼.메모 || '';
    u.조합안전입력(적는칸, function (값) { 상태.폼.메모 = 값; });   // 다시 그려도 적던 글이 안 사라진다
    칸.appendChild(만들기('div', { class: 'field' }, [적는칸]));

    var 저장 = 만들기('button', { class: 'ph-save', type: 'button', text: '메모 저장' });
    저장.addEventListener('click', function () {
      var 글 = 적는칸.value.trim();
      if (!글) { u.흔들기(적는칸); u.토스트('메모를 적어 주세요'); 적는칸.focus(); return; }
      자.메모추가(g, 글);
      상태.폼.메모 = '';
      u.토스트('메모를 적었습니다');
      다시();
    });
    칸.appendChild(저장);
  }

  function 메모지우기(g, m, i) {
    u.확인({
      제목: '이 메모를 지울까요?',
      본문: u.안전(m.날 || '') + ' · ' + u.안전(String(m.글 || '').slice(0, 40)) +
            '<br><b>되돌릴 수 없습니다.</b>',
      확인글: '삭제', 위험: true
    }, function (예) {
      if (!예) return;
      자.메모삭제(g, i);
      u.토스트('메모를 지웠습니다');
      다시();
    });
  }

  function 문자칸(칸, g) {
    칸.appendChild(만들기('div', { class: 'ph-sec', text: '받은 문자 (' + g.문자수 + '회)' }));
    var 상자 = 만들기('div', { class: 'box' });
    if (!(g.문자들 || []).length) {
      상자.appendChild(만들기('div', { class: 'empty', text: '아직 보낸 문자가 없습니다' }));
    } else {
      g.문자들.forEach(function (m) {
        상자.appendChild(만들기('div', { class: 'kv' }, [
          만들기('span', { class: 'k', text: m.보낸날 || '' }),
          만들기('span', { class: 'v memo', text: m.내용 || '' })
        ]));
      });
    }
    칸.appendChild(상자);
  }

  /* ── 등록 ── */
  function 등록그리기(칸) {
    if (!상태.폼) 폼비우기();
    var 칸들 = {};

    칸.appendChild(글칸(칸들, '이름', '이름 <span class="req">*</span>',
      { class: 'inp', placeholder: '예: 홍길동' }));
    칸.appendChild(글칸(칸들, '전화', '연락처 <span class="req">*</span>',
      { class: 'inp', type: 'tel', placeholder: '010-0000-0000' }));

    var 우편 = 글칸(칸들, '우편번호', '우편번호', { class: 'inp num', placeholder: '00000' });
    우편.style.flex = '0 0 118px';
    var 주소 = 글칸(칸들, '주소', '주소', { class: 'inp', placeholder: '받으실 주소' });
    주소.style.flex = '1';
    칸.appendChild(만들기('div', { class: 'pair' }, [우편, 주소]));

    var 메모 = 만들기('textarea', {
      class: 'inp ta', rows: '4', placeholder: '기억해 둘 것을 적으시면 오늘 날짜로 남습니다'
    });
    메모.value = 상태.폼.메모 || '';
    u.조합안전입력(메모, function (값) { 상태.폼.메모 = 값; });
    칸들.메모 = 메모;
    칸.appendChild(만들기('div', { class: 'field' }, [만들기('label', { text: '메모' }), 메모]));

    var 저장 = 만들기('button', { class: 'ph-save', type: 'button', text: '등록' });
    저장.addEventListener('click', function () {
      var 값 = {
        이름: 칸들.이름.value.trim(), 전화: 칸들.전화.value.trim(),
        우편번호: 칸들.우편번호.value.trim(), 주소: 칸들.주소.value.trim(),
        메모: 칸들.메모.value.trim()
      };
      if (!값.이름) { u.흔들기(칸들.이름); u.토스트('이름을 적어 주세요'); return; }
      if (!값.전화) { u.흔들기(칸들.전화); u.토스트('연락처를 적어 주세요'); return; }
      if (!자.손등록추가(값)) { u.흔들기(칸들.이름); u.토스트('이미 있는 분입니다'); return; }
      u.토스트('고객을 등록했습니다');
      폼비우기();
      목록으로();
    });
    칸.appendChild(저장);

    칸.appendChild(만들기('div', {
      class: 'noteline',
      html: '주문이 아직 없는 분만 손으로 넣습니다. 나중에 <b>같은 이름·전화</b>로 주문이 들어오면 ' +
            '<b>한 줄로 합쳐집니다</b>.'
    }));
  }

  function 글칸(칸들, 이름, 라벨, 속성) {
    var i = 만들기('input', 속성);
    i.value = (상태.폼 && 상태.폼[이름]) || '';
    u.조합안전입력(i, function (값) { 상태.폼[이름] = 값; });
    칸들[이름] = i;
    return 만들기('div', { class: 'field' }, [만들기('label', { html: 라벨 }), i]);
  }

  /* ── 두 버튼 — 16b 와 같은 코드다 (세부설계 §2-4 · §3) ── */
  function 견적만들기(g) {
    u.물음({
      제목: '견적 요청 만들기',
      본문: u.안전(g.이름 || '') + (g.전화 ? ' · ' + u.안전(g.전화) : ''),
      자리표시: '예: 라벤더 20주 견적', 최대: 80, 확인글: '만들기'
    }, function (글) {
      if (!글) return;
      ZG.견적자료.추가({ 요청일: u.오늘문자(), 고객명: g.이름, 연락처: g.전화, 내용: 글 });
      u.토스트('견적 요청 탭에 넣었습니다');
      ZG.견적탭.탭으로('견적');
    });
  }

  function 수동주문(g) {
    ZG.주문.상태.채울값 = { 수령인: g.이름, 전화: g.전화, 주소: g.주소, 우편번호: g.우편번호 };
    ZG.주문.열기('수동');
  }

  function 그리기(칸) {
    자 = ZG.고객자료;
    if (상태.뷰 === '등록') 등록그리기(칸);
    else if (상태.뷰 === '상세') 상세그리기(칸);
    else 목록그리기(칸);
  }

  ZG.고객폰 = { 그리기: 그리기, 상태: 상태, 제목: 제목, 요약: 요약, 목록으로: 목록으로 };
})(window.ZG);
