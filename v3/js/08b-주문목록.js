/* 08b-주문목록 — 뼈대 · 뷰 전환 · 폰 목록/상세 · PC 표 (2단계 설계 §5 · §6) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기, 자 = null;   // 자료 모듈은 시작할 때 잡는다
  var 요일 = ['일', '월', '화', '수', '목', '금', '토'];
  var 쪽크기 = 20;
  var 뿌리, 본문;

  var 상태 = {
    뷰: '목록', 날짜: '', 부터: '', 까지: '', 글: '', 묶음id: '',
    상세키: '', 폈다: {}, 고른: {}, 쪽: 1, 기간칩: '오늘'
  };

  /* ── 날짜 도우미 ── */
  function 날더하기(날짜, 일) {
    var p = 날짜.split('-');
    return ZG.계산.날짜문자(new Date(+p[0], +p[1] - 1, +p[2] + 일).getTime());
  }
  function 요일글(날짜) {
    var p = 날짜.split('-');
    return 요일[new Date(+p[0], +p[1] - 1, +p[2]).getDay()] + '요일';
  }

  /* ── 지금 화면에 걸린 줄들 ── */
  function 줄들() {
    return 자.읽기({
      부터: u.폰인가() ? 상태.날짜 : 상태.부터,
      까지: u.폰인가() ? 상태.날짜 : 상태.까지,
      묶음id: u.폰인가() ? '' : 상태.묶음id,
      글: 상태.글, 주소포함: !u.폰인가()
    });
  }

  /* ── 뷰 전환 ── */
  function 열기(뷰, 인자) {
    상태.뷰 = 뷰;
    if (뷰 === '상세' || 뷰 === '수동수정') 상태.상세키 = 인자 || '';
    try { history.pushState({ 뷰: 뷰, 키: 상태.상세키 }, ''); } catch (e) { /* file:// 에서는 무시 */ }
    다시그리기();
  }

  function 뷰객체() {
    if (상태.뷰 === '수동') return ZG.주문입력.수동뷰(상태);
    if (상태.뷰 === '출고') return ZG.주문입력.출고뷰(상태, 줄들());
    if (상태.뷰 === '상세') return 상세뷰();
    if (상태.뷰 === '수동수정') {
      var g = 찾은건();
      if (g) return ZG.주문입력.수정뷰(상태, g);
      상태.뷰 = '목록';
    }
    return { 제목: '주문', 그리기: 폰목록 };
  }

  /* ══ 뼈대 ══ */
  function 폰뼈대(뷰) {
    // 뒤로갈 데가 있을 때(하위 뷰)만 제목 왼쪽에 「‹」 하나 (8/6 우람님) — 다른 장과 같은 자리다
    var 왼쪽 = 만들기('div', { class: '왼' });
    if (뷰.왼) {
      var 뒤 = 만들기('button', { class: 'ph-back', type: 'button', text: '‹', 'aria-label': '뒤로' });
      뒤.addEventListener('click', function () { 열기('목록'); });
      왼쪽.appendChild(뒤);
    }
    왼쪽.appendChild(만들기('h1', { text: 뷰.제목 }));
    var 위 = 만들기('div', { class: 'ph-top' }, [왼쪽]);
    var 조각 = [위];

    if (뷰.오) {
      조각.push(만들기('div', { class: 'ph-sub' }, [
        만들기('span', {}), 만들기('span', { text: 뷰.오 })
      ]));
    }

    본문 = 만들기('div', { class: 'ph-body', style: 'gap:var(--space-md)' });
    조각.push(본문);
    var 바닥 = 뷰.바닥 ? 뷰.바닥() : null;
    if (바닥) 조각.push(바닥);

    var 바 = 만들기('nav', { class: 'ph-nav' });
    [['🌿', '입고'], ['📦', '재고']].forEach(function (쌍) {
      var b = 만들기('button', { type: 'button', html: '<span class="ic">' + 쌍[0] + '</span>' + 쌍[1] });
      b.addEventListener('click', function () { location.href = 'index.html#' + 쌍[1]; });
      바.appendChild(b);
    });
    바.appendChild(만들기('button', { type: 'button', class: 'on', html: '<span class="ic">🛒</span>주문' }));
    var 더보기 = 만들기('button', { type: 'button', html: '<span class="ic">⋯</span>더보기' });
    더보기.addEventListener('click', function () { u.더보기시트(''); });
    바.appendChild(더보기);
    조각.push(바);

    뿌리.appendChild(만들기('div', { class: 'ph-shell' }, 조각));

    // 탭바가 fixed 라 총액바를 그 높이만큼 올리고, 본문 아래에 둘의 자리를 비워 둔다
    if (바닥) requestAnimationFrame(function () {
      var 탭높이 = 바.offsetHeight;
      바닥.style.bottom = 탭높이 + 'px';
      본문.style.paddingBottom = (탭높이 + 바닥.offsetHeight + 16) + 'px';
    });
  }

  function PC뼈대() {
    var 옆 = 만들기('aside', { class: 'pc-side' }, [
      만들기('div', { class: 'logo', text: '제로가드닝' }),
      만들기('div', { class: 'slogan', text: 'GARDENING FROM ZERO' })
    ]);
    var 상품 = 만들기('button', { type: 'button', html: '<span class="ic">🌿</span>상품' });
    상품.addEventListener('click', function () { location.href = 'index.html'; });
    옆.appendChild(상품);
    옆.appendChild(만들기('button', { type: 'button', class: 'on', html: '<span class="ic">🛒</span>주문 관리' }));
    // 「명세서 발행」은 업체 관리 안 세 번째 탭이 됐다 — 왼쪽 메뉴는 4개다 (3단계 설계)
    var 업체메뉴 = 만들기('button', { type: 'button', html: '<span class="ic">🏢</span>업체 관리' });
    업체메뉴.addEventListener('click', function () { location.href = '업체.html'; });
    옆.appendChild(업체메뉴);
    var 소싱메뉴 = 만들기('button', { type: 'button', html: '<span class="ic">🌱</span>상품소싱' });
    소싱메뉴.addEventListener('click', function () { location.href = '소싱.html'; });
    옆.appendChild(소싱메뉴);

    var 머리 = 만들기('div', { class: 'pc-head' }, [
      만들기('div', {}, [만들기('h2', { text: '주문 관리' }), 만들기('div', { class: 'path', text: '주문 › 주문 조회' })]),
      PC머리버튼()
    ]);

    본문 = 만들기('div', { class: 'pc-본문' });
    뿌리.appendChild(만들기('div', { class: 'shell' }, [옆, 만들기('div', { class: 'pc-main' }, [머리, 본문])]));
  }

  /* 카드 창 하나가 설정(⚙)·수동 카드(✎)의 입구다 — 머리줄 버튼을 더 늘리지 않는다.
     고른 주문이 없어 카드를 못 그릴 때는 수동 카드 창으로 보낸다(그냥 토스트만 뜨면 막다른 길이다) */
  function 카드열기(건들) {
    if (건들 && 건들.length) ZG.동봉카드.열기(건들);
    else ZG.카드설정.수동창();
  }

  /* 로젠 파일을 뽑았으면 그때 매긴 출력번호대로 카드를 뽑는다 — 송장과 종이가 번호로 맞는다.
     아직 번호가 없으면 08i 가 받은 그대로 돌려준다(회귀 없음) */
  function 포장순(건들) {
    return ZG.로젠파일 ? ZG.로젠파일.포장순으로(건들) : 건들;
  }

  function PC머리버튼() {
    function 단추(글, 눌림, 주) {
      var b = 만들기('button', { class: 'btn sm' + (주 ? ' main' : ''), type: 'button', text: 글 });
      b.addEventListener('click', 눌림);
      return b;
    }
    return 만들기('div', { class: 'headbtns' }, [
      단추('⬆ 주문 올리기', function () { ZG.주문파일.카페24로젠(); }),
      단추('🚚 배송완료', function () { ZG.주문파일.배송완료(); }, true),
      단추('📋 출고리스트', function () { ZG.주문입력.PC출고창(상태, 고른줄들()); }, true),
      단추('💌 동봉카드', function () { 카드열기(포장순(고른건들())); }, true)
    ]);
  }

  /* ══ 폰 — 목록 ══ */
  function 폰목록(칸) {
    칸.appendChild(날짜줄());

    var 수동 = 만들기('button', { class: 'btn', type: 'button', text: '＋ 수동주문' });
    수동.addEventListener('click', function () { 열기('수동'); });
    var 출고 = 만들기('button', { class: 'btn', type: 'button', text: '📋 출고리스트' });
    출고.addEventListener('click', function () { 열기('출고'); });
    var 카드 = 만들기('button', { class: 'btn', type: 'button', text: '💌 동봉카드' });
    카드.addEventListener('click', function () { 카드열기(포장순(자.건으로묶기(줄들()))); });
    칸.appendChild(만들기('div', { class: 'topbtns' }, [수동, 출고, 카드]));

    var 목록 = 만들기('div', { class: 'ph-list' });
    function 채우기() {
      u.비우기(목록);
      var 건들 = 자.건으로묶기(줄들());
      if (!건들.length) {
        목록.appendChild(만들기('div', { class: 'ph-card', text: 상태.글 ? '찾는 주문이 없습니다.' : '이 날짜에 들어온 주문이 없습니다.' }));
      }
      건들.forEach(function (g) { 목록.appendChild(주문카드(g)); });
      u.목록등장(목록.children);
    }

    칸.appendChild(찾는칸('이름 · 전화번호 · 상품명으로 찾기', 채우기));
    칸.appendChild(목록);
    채우기();
  }

  function 날짜줄() {
    var 왼 = 만들기('button', { class: 'ar', type: 'button', text: '‹', 'aria-label': '하루 앞' });
    var 오 = 만들기('button', { class: 'ar', type: 'button', text: '›', 'aria-label': '하루 뒤' });
    왼.addEventListener('click', function () { 날짜로(날더하기(상태.날짜, -1)); });
    오.addEventListener('click', function () { 날짜로(날더하기(상태.날짜, 1)); });
    var 오늘인가 = 상태.날짜 === u.오늘문자();
    return 만들기('div', { class: 'datebar' }, [
      왼,
      만들기('span', { class: 'd' }, [
        만들기('div', { class: 'big', text: 상태.날짜 }),
        만들기('div', { class: 'sml', text: (오늘인가 ? '오늘 · ' : '') + 요일글(상태.날짜) })
      ]),
      오
    ]);
  }

  function 날짜로(날짜) {
    상태.날짜 = 날짜; 상태.부터 = 날짜; 상태.까지 = 날짜; 상태.폈다 = {};
    다시그리기();
  }

  /* 🔴 화면을 통째로 다시 그리면 이 입력칸 자체가 새것으로 바뀌고, 그 순간 아이폰의 한글 조합이 끊긴다
     (8/4 「휴케라」→「ㅎㅠㅋㅔㄹㅏ」 사고와 같은 원인). 그래서 목록만 갈아끼우고 입력칸은 손대지 않는다. */
  function 찾는칸(안내, 목록만다시) {
    var 입력 = 만들기('input', { class: 'inp', type: 'search', placeholder: 안내, value: 상태.글 });
    u.조합안전입력(입력, function (값) {
      if (값 === 상태.글) return;
      상태.글 = 값; 상태.쪽 = 1;
      목록만다시();
    }, 220);
    return 만들기('div', { class: 'search' }, [만들기('span', { class: 'mag', text: '🔍' }), 입력]);
  }

  /* 무료로 얹어 나가는 줄임을 목록·상세·표·동봉카드 넷에서 같은 모양으로 알린다 (6단계 설계 §2-6) */
  function 서비스딱지(r) {
    return r.서비스 ? 만들기('span', { class: 'svc', text: '서비스' }) : null;
  }

  function 주문카드(g) {
    var 카드 = 만들기('div', {
      class: 'ph-card' + (g.부족여부 ? ' short' : ''), role: 'button', tabindex: '0'
    });
    var 별 = 자.재주문횟수(g.묶음키, 상태.날짜);
    var 첫줄 = [만들기('span', { class: 'who', text: g.수령인 })];
    if (별 > 0) 첫줄.push(만들기('span', { class: 'star', text: '⭐ ' + 별 }));
    첫줄.push(만들기('span', { class: 'mall', text: g.판매처 || '기타', style: 'margin-left:auto' }));
    첫줄.push(만들기('span', { class: 'chev', text: '›' }));
    카드.appendChild(만들기('div', { class: 'r0' }, 첫줄));

    var 폈나 = !!상태.폈다[g.묶음키];
    var 보임 = 폈나 ? g.줄들 : g.줄들.slice(0, 2);
    var 줄칸 = 만들기('div', { class: 'olines' });
    보임.forEach(function (r) {
      줄칸.appendChild(만들기('div', { class: 'oline' }, [
        만들기('span', { class: 'nm' }, [
          document.createTextNode(r.유통명 || r.원본코드 || '(품목 없음)'), 서비스딱지(r)
        ]),
        만들기('span', { class: 'rg', text: r.규격 || '' }),
        만들기('span', { class: 'q', text: 자.수량(r) + '주' })
      ]));
    });
    카드.appendChild(줄칸);

    if (!폈나 && g.줄들.length > 2) {
      var 더 = 만들기('button', { class: 'more', type: 'button', text: '＋' + (g.줄들.length - 2) + '개 더' });
      더.addEventListener('click', function (e) {
        e.stopPropagation();                       // 상세로 넘어가지 않고 그 자리에서 편다
        상태.폈다[g.묶음키] = true; 다시그리기();
      });
      카드.appendChild(더);
    }

    // 부족 표시는 시안 그대로 카드째 빨강 하나뿐이다. 경고 글줄을 따로 얹지 않는다

    function 들어가기() { 열기('상세', g.묶음키); }
    카드.addEventListener('click', 들어가기);
    카드.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); 들어가기(); }
    });
    return 카드;
  }

  /* ══ 폰 — 상세 ══ */
  function 찾은건() {
    var 것들 = 자.건으로묶기(자.읽기({ 부터: 상태.날짜, 까지: 상태.날짜 }));
    return 것들.filter(function (g) { return g.묶음키 === 상태.상세키; })[0] || null;
  }

  function 상세뷰() {
    var g = 찾은건();
    if (!g) return { 제목: '주문 상세', 왼: '‹ 주문', 오: 상태.날짜, 그리기: function (칸) {
      칸.appendChild(만들기('div', { class: 'ph-card', text: '그 주문을 찾지 못했습니다.' }));
    } };

    return {
      제목: '주문 상세',
      왼: '‹ 주문',
      오: 상태.날짜 + ' · ' + (g.판매처 || '기타'),
      그리기: function (칸) { 상세그리기(칸, g); },
      바닥: function () {
        var 카드 = 만들기('button', { class: 'btn main', type: 'button', text: '💌 동봉카드' });
        카드.addEventListener('click', function () { ZG.동봉카드.열기([g]); });
        return 만들기('div', { class: 'totalbar' }, [
          만들기('span', { class: 'l', text: '총 주문금액' }),
          만들기('span', { class: 'v', text: u.콤마(g.총액) + '원' }),
          카드
        ]);
      }
    };
  }

  function 상세그리기(칸, g) {
    var 별 = 자.재주문횟수(g.묶음키, 상태.날짜);
    var 머리자식 = [만들기('span', {
      text: g.수령인,
      style: 'font-size:var(--font-xl); font-weight:var(--weight-bold); letter-spacing:-.02em; color:var(--color-text)'
    })];
    if (별 > 0) 머리자식.push(만들기('span', { class: 'star', text: '⭐ ' + 별 }));
    var 여닫이 = 만들기('span', { class: 'r', text: '닫기 ⌃' });
    머리자식.push(여닫이);

    var 머리 = 만들기('button', {
      class: 'fold', type: 'button', 'aria-expanded': 'true',
      style: 'border-radius:var(--radius-md) var(--radius-md) 0 0'
    }, 머리자식);

    var 속 = 만들기('div', { class: 'foldin' }, [
      만들기('div', {}, [만들기('div', { class: 'k', text: '전화번호' }), 만들기('div', { class: 'v', text: g.전화 || '—' })]),
      만들기('div', {}, [만들기('div', { class: 'k', text: '주소' }), 만들기('div', { class: 'v', text: g.주소 || '—' })])
    ]);
    if (g.배송메모) 속.appendChild(만들기('div', {}, [
      만들기('div', { class: 'k', text: '배송메모' }), 만들기('div', { class: 'v', text: g.배송메모 })
    ]));
    var 몸 = 만들기('div', { class: 'foldbody open' }, [속]);
    머리.addEventListener('click', function () {
      var 열림 = 몸.classList.toggle('open');
      머리.setAttribute('aria-expanded', 열림 ? 'true' : 'false');
      여닫이.textContent = 열림 ? '닫기 ⌃' : '열기 ⌄';
    });
    칸.appendChild(만들기('div', {}, [머리, 몸]));

    칸.appendChild(만들기('div', { class: 'ph-sec', html: '주문 품목 <span class="r">' + g.줄들.length + '품목</span>' }));

    var 상자 = 만들기('div', { class: 'ph-card', style: 'padding:0 var(--space-2xl)' });
    g.줄들.forEach(function (r) {
      상자.appendChild(만들기('div', { class: 'dline' }, [
        만들기('span', {}, [
          만들기('div', { class: 'nm' }, [
            document.createTextNode(r.유통명 || r.원본코드 || '(품목 없음)'), 서비스딱지(r)
          ]),
          만들기('div', {
            class: 'rg',
            text: (r.규격 || '') + ' · ' + u.콤마(r.단가) + '원' + (r.수정됨 ? ' · ✎ 수정됨' : '')
          })
        ]),
        만들기('span', { class: 'q', text: 자.수량(r) + '주' })
      ]));
    });
    칸.appendChild(상자);

    // 올린 파일에서 온 건도 고칠 수 있다. 다만 지우는 것은 수동 건만 —
    // 매입·주문 기록은 지우지 않는다(업무규칙 §8, 6단계 설계 §1-5)
    var 수정 = 만들기('button', { class: 'btn', type: 'button', text: '수정' });
    수정.addEventListener('click', function () { 열기('수동수정', g.묶음키); });
    var 버튼들 = [수정];
    if (g.출처 === '수동') {
      var 삭제 = 만들기('button', { class: 'btn warn', type: 'button', text: '삭제' });
      삭제.addEventListener('click', function () {
        ZG.주문입력.수동삭제(g, function () { 열기('목록'); });
      });
      버튼들.push(삭제);
    }
    칸.appendChild(만들기('div', { class: 'topbtns' }, 버튼들));
  }

  /* ══ PC — 표 ══ */
  /* 고른 게 없으면 지금 화면에 걸린 것 전부다 */
  function 고른건들() {
    var 건들 = 자.건으로묶기(줄들());
    var 고름 = 건들.filter(function (g) { return 상태.고른[g.묶음키]; });
    return 고름.length ? 고름 : 건들;
  }

  function 고른줄들() {
    return 고른건들().reduce(function (a, g) { return a.concat(g.줄들); }, []);
  }

  function PC그리기(칸) {
    var 카드 = 만들기('div', { class: 'card table-card' });

    function 채우기() {
      u.비우기(카드);
      var 건들 = 자.건으로묶기(줄들());
      var 총쪽 = Math.max(1, Math.ceil(건들.length / 쪽크기));
      if (상태.쪽 > 총쪽) 상태.쪽 = 총쪽;
      var 이번쪽 = 건들.slice((상태.쪽 - 1) * 쪽크기, 상태.쪽 * 쪽크기);
      var 줄수 = 건들.reduce(function (a, g) { return a + g.줄들.length; }, 0);

      var 회차들 = 자.회차목록(상태.부터, 상태.까지);
      카드.appendChild(만들기('h3', {
        style: 'padding:0 var(--space-sm)',
        html: '주문 조회 <span class="hint">' + u.안전(기간글()) + ' · 주문 ' + 건들.length + '건 · 품목 ' + 줄수 + '줄</span>' +
              '<span class="right">' + 회차들.map(function (c) {
                return '<span class="rnd">' + u.안전(회차칩글(c)) + '</span> ';
              }).join('') + '</span>'
      }));
      카드.appendChild(PC표(이번쪽));
      카드.appendChild(PC아래줄(건들));
      카드.appendChild(PC쪽줄(총쪽, 건들.length));
    }

    칸.appendChild(PC거르개(채우기));
    칸.appendChild(카드);
    채우기();
  }

  function 기간글() { return 상태.부터 === 상태.까지 ? 상태.부터 : 상태.부터 + ' ~ ' + 상태.까지; }

  /* 회차 칩에 쓰는 글. 여러 날을 걸쳐 보면 「1회차」가 날마다 또 나와 어느 날 것인지 알 수 없다 — 그때만 날짜를 붙인다.
     아래 `회차글(묶음id)` 과 다른 함수다. 이름을 겹치게 두면 나중 것이 앞 것을 덮어 표 배지가 깨진다(8/4 겪음). */
  function 회차칩글(c) {
    var 앞 = (상태.부터 === 상태.까지) ? '' : String(c.날).slice(5) + ' ';
    return 앞 + c.회차 + '회차 ' + c.시각;
  }

  function PC거르개(목록만다시) {
    var 칩판 = 만들기('div', { class: 'fchips' });
    function 글자(t) { return 만들기('span', { text: t, style: 'font-size:var(--font-sm); font-weight:var(--weight-semibold); color:var(--color-text-sub)' }); }
    function 날짜칸(어느) {
      var i = 만들기('input', { class: 'inp', type: 'date', value: 상태[어느], style: 'width:138px; height:var(--h-btn-sm); font-size:var(--font-sm); text-align:center' });
      i.addEventListener('change', function () {
        if (!i.value) return;
        상태[어느] = i.value; 상태.기간칩 = ''; 상태.쪽 = 1; 다시그리기();
      });
      return i;
    }
    칩판.appendChild(글자('기간'));
    칩판.appendChild(날짜칸('부터'));
    칩판.appendChild(만들기('span', { text: '~', style: 'color:var(--color-text-muted)' }));
    칩판.appendChild(날짜칸('까지'));

    [['오늘', 0], ['이번 주', 1], ['이번 달', 2]].forEach(function (쌍) {
      var b = 만들기('button', { class: 'fchip' + (상태.기간칩 === 쌍[0] ? ' on' : ''), type: 'button', text: 쌍[0] });
      b.addEventListener('click', function () { 기간칩(쌍[0], 쌍[1]); });
      칩판.appendChild(b);
    });

    칩판.appendChild(만들기('span', { style: 'width:1px; height:20px; background:var(--color-border); margin:0 var(--space-xs)' }));
    칩판.appendChild(글자('올린 회차'));
    var 전체 = 만들기('button', { class: 'fchip' + (상태.묶음id ? '' : ' on'), type: 'button', text: '전체' });
    전체.addEventListener('click', function () { 상태.묶음id = ''; 상태.쪽 = 1; 다시그리기(); });
    칩판.appendChild(전체);
    자.회차목록(상태.부터, 상태.까지).forEach(function (c) {
      var b = 만들기('button', {
        class: 'fchip' + (상태.묶음id === c.묶음id ? ' on' : ''), type: 'button',
        text: 회차칩글(c)
      });
      b.addEventListener('click', function () { 상태.묶음id = c.묶음id; 상태.쪽 = 1; 다시그리기(); });
      칩판.appendChild(b);
    });

    칩판.appendChild(만들기('span', { style: 'flex:1' }));
    var 찾기 = 찾는칸('이름 · 전화번호 · 주소 · 상품명', 목록만다시);
    찾기.style.width = '300px'; 찾기.style.marginLeft = 'auto';
    찾기.querySelector('.inp').style.height = 'var(--h-btn-sm)';
    찾기.querySelector('.inp').style.fontSize = 'var(--font-sm)';
    칩판.appendChild(찾기);
    return 칩판;
  }

  function 기간칩(이름, 종류) {
    var 오늘 = u.오늘문자();
    if (종류 === 0) { 상태.부터 = 오늘; 상태.까지 = 오늘; }
    else if (종류 === 1) {
      var p = 오늘.split('-'), d = new Date(+p[0], +p[1] - 1, +p[2]);
      상태.부터 = 날더하기(오늘, -d.getDay()); 상태.까지 = 날더하기(상태.부터, 6);
    } else {
      var q = 오늘.split('-');
      상태.부터 = q[0] + '-' + q[1] + '-01';
      상태.까지 = ZG.계산.날짜문자(new Date(+q[0], +q[1], 0).getTime());
    }
    상태.기간칩 = 이름; 상태.묶음id = ''; 상태.쪽 = 1; 다시그리기();
  }

  function PC표(건들) {
    var 표 = 만들기('table');
    표.innerHTML =
      '<colgroup><col style="width:28px"><col style="width:200px"><col style="width:92px"><col style="width:86px">' +
      '<col><col style="width:86px"><col style="width:76px"><col style="width:66px"><col style="width:82px"></colgroup>';
    var 머리 = 만들기('tr');
    머리.appendChild(만들기('th', {}, [모두고름칸(건들)]));
    ['받는 분 · 전화 · 주소', '주문한 곳', '품목코드', '품목'].forEach(function (t) { 머리.appendChild(만들기('th', { text: t })); });
    머리.appendChild(만들기('th', { text: '규격' }));
    ['수량', '단가', '금액'].forEach(function (t) { 머리.appendChild(만들기('th', { class: 'r', text: t })); });
    표.appendChild(머리);

    if (!건들.length) {
      표.appendChild(만들기('tr', {}, [만들기('td', { colspan: '9', class: 'dim', text: '이 기간에 들어온 주문이 없습니다.' })]));
      return 표;
    }

    건들.forEach(function (g) {
      g.줄들.forEach(function (r, i) {
        var tr = 만들기('tr', { class: (i === 0 ? 'gstart ' : '') + (g.부족여부 ? 'short' : '') });
        if (i === 0) {
          var n = String(g.줄들.length);
          tr.appendChild(만들기('td', { rowspan: n }, [고름칸(g)]));
          tr.appendChild(누구칸(g, n));
          tr.appendChild(만들기('td', { rowspan: n }, [만들기('span', { class: 'mall', text: g.판매처 || '기타' })]));
        }
        var 코드칸 = 만들기('td', { class: 'code', text: r.품목코드 || r.원본코드 || '—' });
        if (r.원본품목코드 && r.원본품목코드 !== r.품목코드) 코드칸.appendChild(원래줄(r.원본품목코드));
        tr.appendChild(코드칸);

        var 품목칸 = 만들기('td', {}, [
          document.createTextNode(r.유통명 || '(품목 없음)'),
          서비스딱지(r),
          만들기('div', { class: 'sci', text: r.학명 || '' })
        ]);
        var 모 = g.모자람[r.품목코드];
        if (모) 품목칸.appendChild(만들기('div', {
          class: 'lack', text: '⚠ 재고 ' + 모.재고 + '주 — ' + 모.모자란수 + '주 모자람'
        }));
        tr.appendChild(품목칸);

        tr.appendChild(만들기('td', { class: 'dim', text: r.규격 || '' }));
        var 수칸 = 만들기('td', { class: 'r' + (모 ? ' zero' : ''), text: String(자.수량(r)) });
        if ((Number(r.옵션입수) || 1) > 1) 수칸.appendChild(만들기('div', { class: 'mul', text: r.주문수량 + ' × ' + r.옵션입수 + '개입' }));
        if (r.원본수량 != null && Number(r.원본수량) !== Number(r.주문수량)) 수칸.appendChild(원래줄(r.원본수량));
        tr.appendChild(수칸);
        var 단가칸 = 만들기('td', { class: 'r', text: u.콤마(r.단가) });
        if (r.원본단가 != null && Number(r.원본단가) !== Number(r.단가)) 단가칸.appendChild(원래줄(u.콤마(r.원본단가)));
        tr.appendChild(단가칸);
        tr.appendChild(만들기('td', { class: 'r', text: u.콤마(자.금액(r)) }));
        표.appendChild(tr);
      });
    });
    return 표;
  }

  function 원래줄(값) { return 만들기('div', { class: 'was', text: '원래 ' + 값 }); }

  /* 그 건 안에 고친 줄이 하나라도 있으면 마지막으로 고친 때를 돌려준다 */
  function 고친때(g) {
    var 있 = false, t = 0;
    g.줄들.forEach(function (r) {
      if (!r.수정됨) return;
      있 = true;
      t = Math.max(t, Number(r.수정시각) || 0);
    });
    return 있 ? t : -1;
  }

  function 짧은시각(ms) {
    var d = new Date(ms);
    function 두자리(n) { return (n < 10 ? '0' : '') + n; }
    return 두자리(d.getMonth() + 1) + '-' + 두자리(d.getDate()) + ' ' + 두자리(d.getHours()) + ':' + 두자리(d.getMinutes());
  }

  function 누구칸(g, n) {
    var 칸 = 만들기('td', { class: 'who', rowspan: n }, [
      만들기('div', { class: 'n', text: g.수령인 }),
      만들기('div', { class: 'd', text: g.전화 || '' }),
      만들기('div', { class: 'd', text: g.주소 || '' }),
      만들기('div', { class: 'cnt', text: g.줄들.length + '품목 · ' + u.콤마(g.총액) + '원' })
    ]);
    // 회차 정보는 어떤 경우에도 지우지 않는다. 「✎ 수정」은 그 옆에 따로 붙인다 (6단계 설계 §1-4)
    var 꼬리 = [g.묶음id
      ? 만들기('span', { class: 'rnd', text: 회차글(g.묶음id) })
      : 만들기('span', { class: 'rnd hand', text: '직접입력' })];

    var 때 = 고친때(g);
    if (때 >= 0) 꼬리.push(만들기('span', {
      class: 'rnd edited', text: '✎ 수정됨', title: 때 ? '수정 ' + 짧은시각(때) : '수정됨'
    }));

    var 고치기 = 만들기('button', {
      class: 'rnd hand click', type: 'button', text: '✎ 수정',
      title: (g.출처 === '수동' ? '수동주문' : '주문') + ' 수정'
    });
    고치기.addEventListener('click', function (e) { e.stopPropagation(); ZG.주문입력.PC수정창(g); });
    꼬리.push(고치기);

    칸.appendChild(만들기('div', {
      style: 'margin-top:5px; display:flex; flex-wrap:wrap; gap:3px'
    }, 꼬리));
    return 칸;
  }

  function 회차글(묶음id) {
    var b = ZG.저장소.읽기(ZG.저장소.키.주문묶음).filter(function (x) { return x.id === 묶음id; })[0];
    return b ? b.회차 + '회차 ' + b.올린시각 : 묶음id;
  }

  function 고름칸(g) {
    var b = 만들기('button', {
      class: 'cb' + (상태.고른[g.묶음키] ? ' on' : ''), type: 'button',
      'aria-pressed': 상태.고른[g.묶음키] ? 'true' : 'false', 'aria-label': g.수령인 + ' 고르기'
    });
    b.addEventListener('click', function () {
      if (상태.고른[g.묶음키]) delete 상태.고른[g.묶음키]; else 상태.고른[g.묶음키] = true;
      다시그리기();
    });
    return b;
  }

  function 모두고름칸(건들) {
    var 다켬 = 건들.length > 0 && 건들.every(function (g) { return 상태.고른[g.묶음키]; });
    var b = 만들기('button', { class: 'cb' + (다켬 ? ' on' : ''), type: 'button', 'aria-label': '모두 고르기' });
    b.addEventListener('click', function () {
      건들.forEach(function (g) { if (다켬) delete 상태.고른[g.묶음키]; else 상태.고른[g.묶음키] = true; });
      다시그리기();
    });
    return b;
  }

  function PC아래줄(건들) {
    var 고름 = 건들.filter(function (g) { return 상태.고른[g.묶음키]; });
    var 내려 = 만들기('button', { class: 'btn sm', type: 'button', text: '엑셀로 내려받기' });
    내려.addEventListener('click', function () { ZG.주문파일.내려받기(고른줄들()); });

    /* 🔴 여기서는 「고른 게 없으면 전체」를 쓰지 않는다 — 그 날 주문 전부에 서비스가 들어간다 (설계 §2-5) */
    var 서비스 = 만들기('button', { class: 'btn sm', type: 'button', text: '🎁 서비스 품목 넣기' });
    if (!고름.length) {
      서비스.setAttribute('aria-disabled', 'true');
      서비스.style.opacity = '.4';
      서비스.addEventListener('click', function () { u.토스트('서비스를 넣을 주문을 먼저 골라 주세요.'); });
    } else {
      서비스.addEventListener('click', function () { ZG.서비스품목.창(고름); });
    }

    return 만들기('div', { class: 'tbar' }, [
      만들기('span', { class: 'sel', html: '고른 것 <b>' + 고름.length + '</b>건' }),
      서비스,
      만들기('span', { class: 'spacer' }),
      내려
    ]);
  }

  function PC쪽줄(총쪽, 모두) {
    var 줄 = 만들기('div', { class: 'pager' });
    function 단추(글, 쪽, 막힘) {
      var b = 만들기('button', { type: 'button', text: 글, disabled: 막힘 ? 'disabled' : null });
      b.addEventListener('click', function () { 상태.쪽 = 쪽; 다시그리기(); });
      return b;
    }
    줄.appendChild(단추('‹', Math.max(1, 상태.쪽 - 1), 상태.쪽 <= 1));
    for (var i = 1; i <= 총쪽; i++) {
      if (i === 상태.쪽) 줄.appendChild(만들기('b', { text: String(i) }));
      else 줄.appendChild(단추(String(i), i, false));
    }
    줄.appendChild(단추('›', Math.min(총쪽, 상태.쪽 + 1), 상태.쪽 >= 총쪽));
    줄.appendChild(만들기('span', { class: 'gap' }));
    줄.appendChild(만들기('span', { text: '모두 ' + 모두 + '건', style: 'margin-left:var(--space-md)' }));
    return 줄;
  }

  /* ══ 그리기 ══ */
  function 다시그리기() {
    u.비우기(뿌리);
    if (u.폰인가()) {
      var 뷰 = 뷰객체();
      폰뼈대(뷰);
      if (!(ZG.견적탭 && ZG.견적탭.가로채기(본문, 상태.뷰))) 뷰.그리기(본문);
    } else {
      if (상태.뷰 !== '목록') 상태.뷰 = '목록';   // PC 는 표 한 장이다. 출고리스트는 창으로 뜬다
      PC뼈대();
      if (!(ZG.견적탭 && ZG.견적탭.가로채기(본문, 상태.뷰))) PC그리기(본문);
    }
  }

  function 시작() {
    자 = ZG.주문자료;
    뿌리 = document.getElementById('앱');
    ZG.저장소.부팅();
    상태.날짜 = 상태.부터 = 상태.까지 = u.오늘문자();   // 조회 일자는 저장하지 않는다 (설계 §2-4)
    다시그리기();

    window.addEventListener('popstate', function () {
      if (상태.뷰 === '목록') return;
      상태.뷰 = '목록'; 다시그리기();
    });
    u.폰질의.addEventListener('change', 다시그리기);
    window.addEventListener('storage', function (e) {
      if (e.key && e.key.indexOf('zg.v3.') === 0) 다시그리기();
    });
  }

  ZG.주문 = { 시작: 시작, 열기: 열기, 다시그리기: 다시그리기, 상태: 상태, 줄들: 줄들, 고른줄들: 고른줄들 };
  document.addEventListener('DOMContentLoaded', 시작);
})(window.ZG);
