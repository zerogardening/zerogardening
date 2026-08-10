/* 08c-주문입력 — 수동주문 등록 · 출고리스트 화면 (2단계 설계 §5 · §6) */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 경로들 = [['전화', '전화주문'], ['문자', '문자'], ['직접방문', '직접방문'], ['기타', '기타']];
  var 사이즈들 = [10, 15, 18, 21];   // 화분은 이 넷과 「직접입력」뿐이다. 등록된 규격을 조회하지 않는다

  /* ══ 수동주문 등록 ══ */
  function 수동뷰(상태) {
    return {
      제목: '수동주문',
      왼: '‹ 주문',
      오: 상태.날짜,
      그리기: function (칸) { 수동그리기(칸, 상태); }
    };
  }

  function 수동그리기(칸, 상태) {
    var 설정 = ZG.저장소.설정읽기();
    var 경로 = 설정.마지막주문경로 || '전화주문';

    /* 어디로 들어온 주문 */
    var 세그 = 만들기('div', { class: 'seg segsm' });
    경로들.forEach(function (쌍) {
      var b = 만들기('button', { type: 'button', class: 경로 === 쌍[1] ? 'on' : '', text: 쌍[0] });
      b.addEventListener('click', function () {
        경로 = 쌍[1];
        Array.prototype.forEach.call(세그.children, function (c) { c.classList.toggle('on', c === b); });
      });
      세그.appendChild(b);
    });
    칸.appendChild(밭('어디로 들어온 주문', 세그));

    var 사람 = 사람칸(null);
    칸.appendChild(사람.요소);

    칸.appendChild(만들기('div', { class: 'ph-sec', text: '주문 품목' }));
    var 묶음 = 품목카드묶음(null);
    칸.appendChild(묶음.요소);

    var 등록 = 만들기('button', { class: 'ph-save', type: 'button', text: '주문등록' });
    등록.addEventListener('click', function () {
      var 것 = 사람.값();
      if (!막지않나(사람, 것)) return;
      var 카드들 = 묶음.읽기();
      if (!카드들.length) { u.흔들기(묶음.요소); u.토스트('품목을 하나 이상 골라 주세요.'); return; }

      var 줄들 = 카드들.map(function (st) { return 줄만들기(st, 것, 상태.날짜, 경로); });

      function 넣기() {
        줄들.forEach(function (줄) { ZG.저장소.덧붙이기(ZG.저장소.키.주문, 줄); });
        ZG.저장소.설정쓰기({ 마지막주문경로: 경로 });
        u.토스트(것.이름 + ' · ' + 줄들.length + '품목 넣었습니다.');
        ZG.주문.열기('목록');
      }

      var 겹친것 = 줄들.filter(function (줄) { return ZG.주문자료.같은주문인가(줄); })[0];
      if (겹친것) {
        u.확인({
          제목: '같은 주문이 이미 있습니다',
          본문: 상태.날짜 + ' · <b>' + u.안전(것.이름) + '</b> · ' + u.안전(겹친것.유통명) + '<br>그래도 넣으시겠습니까?',
          확인글: '넣기'
        }, function (예) { if (예) 넣기(); });
        return;
      }
      넣기();
    });
    칸.appendChild(등록);
  }

  function 막지않나(사람, 것) {
    function 막기(칸, 글) { u.흔들기(칸); u.토스트(글); 칸.focus(); return false; }
    if (!것.이름) return 막기(사람.이름, '받는 분을 적어 주세요.');
    if (!것.전화) return 막기(사람.전화, '전화번호를 적어 주세요.');
    if (!것.주소) return 막기(사람.주소, '주소를 적어 주세요.');
    return true;
  }

  function 밭(라벨, 속, 넓게) {
    var f = 만들기('div', { class: 'field' }, [만들기('label', { html: 라벨 }), 속]);
    if (넓게) f.style.flex = '1';
    return f;
  }

  function 입력칸(값, 형, 클래스) {
    return 만들기('input', { class: 클래스 || 'inp', type: 형 || 'text', value: 값, autocomplete: 'off' });
  }

  /* ══ 받는 분 — 등록 · 수정이 같은 부품을 쓴다 ══
     한글 칸이다. 입력 중에 다시 그리는 처리를 붙이지 않는다(조합이 끊긴다) */
  function 사람칸(g) {
    var 이름 = 입력칸(g ? (g.수령인 || '') : '');
    var 전화 = 입력칸(g ? (g.전화 || '') : '', 'tel');
    var 주소 = 입력칸(g ? (g.주소 || '') : '');
    var 요소 = 만들기('div', { class: 'itemstack' }, [
      만들기('div', { class: 'pair' }, [
        밭('받는 분 <span class="req">*</span>', 이름, true),
        밭('전화번호 <span class="req">*</span>', 전화, true)
      ]),
      밭('주소 <span class="req">*</span>', 주소, true)
    ]);
    return {
      요소: 요소, 이름: 이름, 전화: 전화, 주소: 주소,
      값: function () {
        return { 이름: 이름.value.trim(), 전화: 전화.value.trim(), 주소: 주소.value.trim() };
      }
    };
  }

  /* ══ 품목 카드 ══
     한 장 = 품목 하나. 화분 크기는 고정 다섯 값이고 품목코드는 접두 + '-' + cm 로 만든다.
     ZG.ui.자동완성 을 카드마다 새로 걸어 준다(접두 묶음 그대로 쓴다 — 규격으로 펼치지 않는다). */
  function 카드값(줄) {
    if (!줄) return { id: null, 접두: '', 유통명: '', 학명: '', cm: 15, 수량: 1, 단가: 0, 원코드: '', 원본: '', 서비스: false };
    var 코드 = String(줄.품목코드 || '');
    return {
      id: 줄.id, 접두: 코드.slice(0, 5), 유통명: 줄.유통명 || '', 학명: 줄.학명 || '',
      원본: 줄.원본코드 || '', 서비스: !!줄.서비스,
      cm: Number(코드.split('-')[1]) || Number(String(줄.규격 || '').replace(/[^0-9]/g, '')) || 0,
      // 카드가 다루는 것은 「주문수량」뿐이다 — 옵션입수(4개입)를 곱한 값을 넣으면 저장할 때 수량이 배로 뛴다 (설계 §1-2).
      // 수량 0은 「빼는 대신 0으로 둔 줄」이라 다시 열 때 1로 되살리면 안 된다 (설계 §1-5)
      수량: 줄.주문수량 == null ? 1 : (Number(줄.주문수량) || 0),
      단가: Number(줄.단가) || 0, 원코드: 코드
    };
  }

  /* 옵션.수량숨김 — 동봉카드는 품목마다 특성만 적고 수량은 쓰지 않는다(09-동봉카드 식물들()).
     수동 카드 창에서 묻지 않는다
     옵션.뺄수없음 · 옵션.영수량허용 — 올린 파일에서 온 건. 줄을 지우는 대신 수량 0으로 남긴다 (설계 §1-5)
     옵션.단가보임 · 옵션.서비스 — 서비스 품목 넣기 창 (설계 §2-4). 단가 0이 소매가로 덮이지 않게 한다 */
  function 품목카드묶음(처음줄들, 옵션) {
    옵션 = 옵션 || {};
    var 목록 = [];
    var 판 = 만들기('div', { class: 'itemcards' });

    function 넣기(줄) {
      var st = 카드값(줄);
      if (옵션.서비스) st.서비스 = true;
      var el = 카드하나(st, function () { 빼기(st); }, 옵션);
      목록.push({ st: st, el: el });
      판.appendChild(el);
    }

    function 빼기(st) {
      var i = -1;
      목록.forEach(function (x, n) { if (x.st === st) i = n; });
      if (i < 0) return;
      판.removeChild(목록[i].el);
      목록.splice(i, 1);
      if (!목록.length) 넣기(null);          // 마지막 한 장은 내용만 비운다
    }

    (처음줄들 && 처음줄들.length ? 처음줄들 : [null]).forEach(넣기);

    var 추가 = 만들기('button', { class: 'btn', type: 'button', text: '＋ 품목 추가' });
    추가.addEventListener('click', function () { 넣기(null); });
    if (옵션.한장만) 추가.style.display = 'none';   // 심폴 짝짓기는 카드 한 장만 쓴다 (8단계 설계 §7-2)

    return {
      요소: 만들기('div', { class: 'itemstack' }, [판, 추가]),
      처음id들: (처음줄들 || []).map(function (r) { return r.id; }),
      // 거르개를 못 넘은 카드까지 전부. 품목코드가 안 붙은 줄의 수량을 살리는 데 쓴다 (고쳐넣기)
      모두: function () { return 목록.map(function (x) { return x.st; }); },
      읽기: function () {
        return 목록.map(function (x) { return x.st; })
          .filter(function (st) {
            return st.접두 && st.cm > 0 && (st.수량 > 0 || (옵션.영수량허용 && st.id && st.수량 === 0));
          });
      }
    };
  }

  function 카드하나(st, 지움눌림, 옵션) {
    옵션 = 옵션 || {};
    var 이름칸 = 입력칸(st.유통명);
    이름칸.placeholder = '품목명 · 학명으로 찾기';
    var 담을곳 = 만들기('div', { class: 'acwrap' });
    var 학명줄 = 만들기('div', { class: 'sci', text: st.학명 });
    var 코드줄 = 만들기('div', { class: 'rgs' });

    var 지움 = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '이 품목 빼기' });
    // 서비스 줄은 우리가 얹은 사은품이라 뺄 수 있다 — 손님 주문 원본줄만 막는다 (6단계-3 설계 §3-1)
    if (옵션.뺄수없음 && st.id && !st.서비스) {
      // 올린 주문의 원래 줄은 지우지 않는다(업무규칙 §8). 대신 수량 0으로 남긴다
      지움.style.opacity = '.3';
      지움.style.cursor = 'default';
      지움.setAttribute('aria-disabled', 'true');
      지움.addEventListener('click', function () {
        u.토스트('올린 주문의 품목은 뺄 수 없습니다. 수량을 0으로 바꿔 주세요.');
      });
    } else {
      지움.addEventListener('click', 지움눌림);
    }

    /* 화분 크기 — 고정 목록 */
    var 크기 = 만들기('select', { class: 'inp', 'aria-label': '화분 사이즈' });
    사이즈들.forEach(function (cm) { 크기.appendChild(만들기('option', { value: String(cm), text: cm + 'cm' })); });
    크기.appendChild(만들기('option', { value: '직접', text: '직접입력' }));

    var 직접 = 만들기('input', { class: 'inp num', type: 'number', min: '1', 'aria-label': '직접 넣는 화분 크기(cm)' });
    직접.inputMode = 'numeric';
    직접.style.display = 'none';

    if (사이즈들.indexOf(st.cm) >= 0) 크기.value = String(st.cm);
    else if (st.cm > 0) { 크기.value = '직접'; 직접.value = String(st.cm); 직접.style.display = ''; }
    else { 크기.value = '15'; st.cm = 15; }

    /* 코드가 안 붙은 카드는 읽기()의 거르개를 못 넘어 저장에서 빠진다.
       올린 건의 원래 줄이면 그 줄은 지워지지 않고 원본 그대로 남으므로 그 사실을 적어 준다 (검수 🔴-1) */
    function 코드새로() {
      var 코드 = (st.접두 && st.cm > 0) ? st.접두 + '-' + st.cm : '';
      var 미확인 = !코드 && 옵션.뺄수없음 && !!st.id;
      코드줄.classList.toggle('nocode', 미확인);
      코드줄.textContent = 코드 ? 코드 + ' · 재고 ' + ZG.계산.현재고(코드)
        : (미확인 ? '품목 미확인' + (st.원본 ? ' (' + st.원본 + ')' : '') + ' — 품목은 원본 그대로 둡니다' : '');
    }

    크기.addEventListener('change', function () {
      if (크기.value === '직접') {
        직접.style.display = '';
        st.cm = Number(직접.value) || 0;
        직접.focus();
      } else {
        직접.style.display = 'none';
        st.cm = Number(크기.value) || 0;
      }
      코드새로();
    });
    // 「직접입력」을 고른 동안에만 이 칸이 크기를 정한다
    직접.addEventListener('input', function () {
      if (크기.value !== '직접') return;
      st.cm = Number(직접.value) || 0;
      코드새로();
    });

    /* 수량 */
    var 수량속 = null;
    if (옵션.수량숨김) {
      st.수량 = 1;                      // 읽기()의 수량>0 걸러내기를 통과시킨다
    } else if (u.폰인가()) {
      수량속 = u.스테퍼(st.수량, function (v) { st.수량 = v; });
    } else {
      수량속 = 입력칸(String(st.수량), 'number', 'inp num');
      수량속.min = '0';
      수량속.addEventListener('input', function () { st.수량 = Number(수량속.value) || 0; });
    }

    /* 단가 — 서비스 창에서만 묻는다. 기본 0원이고 코드정보()가 이 값을 덮지 않는다 (설계 §2-3) */
    var 단가속 = null;
    if (옵션.단가보임) {
      단가속 = 입력칸(String(st.단가), 'number', 'inp num');
      단가속.min = '0';
      단가속.addEventListener('input', function () { st.단가 = Number(단가속.value) || 0; });
    }

    ZG.ui.자동완성({
      입력: 이름칸, 담을곳: 담을곳,
      고름: function (g) {
        st.접두 = g.접두; st.유통명 = g.대표.유통명; st.학명 = g.대표.학명;
        이름칸.value = g.대표.유통명;
        학명줄.textContent = g.대표.학명;
        var 최근 = Number(String(g.최근규격 || '').replace(/[^0-9]/g, '')) || 0;
        if (사이즈들.indexOf(최근) >= 0) {
          st.cm = 최근; 크기.value = String(최근); 직접.value = ''; 직접.style.display = 'none';
        } else if (최근 > 0) {
          // 드롭다운에 없는 규격(27cm 등)은 「직접입력」에 채워 둔다.
          // 그냥 두면 기본 15가 남아 엉뚱한 코드가 조용히 만들어진다
          st.cm = 최근; 크기.value = '직접'; 직접.value = String(최근); 직접.style.display = '';
        }
        코드새로();
      }
    });
    // 골라 둔 뒤 이름을 고쳐 쓰면 그 품목이 아니다. 입력칸 value 는 여기서 건드리지 않는다
    u.조합안전입력(이름칸, function () {
      if (이름칸.value.trim() === st.유통명) return;
      st.접두 = ''; st.학명 = ''; 학명줄.textContent = '';
      코드새로();
    }, 200);

    코드새로();

    return 만들기('div', { class: 'itemcard' }, [
      만들기('div', { class: 'top' }, [만들기('div', { class: 'grow' }, [이름칸, 담을곳, 학명줄, 코드줄]), 지움]),
      만들기('div', { class: 'pair' }, [
        밭('화분 사이즈', 만들기('div', { class: 'sizebox' }, [크기, 직접]), !!수량속),
        수량속 ? 밭('수량', 수량속, true) : null,
        단가속 ? 밭('단가', 단가속, true) : null
      ])
    ]);
  }

  /* 등록된 품목이 있으면 그 규격을 따르고 단가는 소매가(매입가 × 1.7, 업무규칙 §3)로 낸다.
     매칭이 없으면(직접입력·미등록 규격) 이미 들어와 있던 단가를 그대로 둔다 —
     규격만 고쳤다고 사용자가 넣어 둔 금액을 0으로 지우면 안 된다.
     재고가 없다고 막지 않는다 — 재고부족은 화면에서 경고만 한다 (설계 §2-3) */
  function 코드정보(st) {
    var 코드 = st.접두 + '-' + st.cm;
    var p = ZG.저장소.품목들().filter(function (x) { return x.품목코드 === 코드; })[0];
    var 단가 = Number(st.단가) || 0;
    // 서비스 줄은 적어 넣은 값(기본 0원)이 그대로 값이다. 소매가로 덮으면 무료가 사라진다 (설계 §2-3)
    if (!st.서비스 && st.원코드 !== 코드) 단가 = p ? Math.round((Number(p.매입단가) || 0) * 1.7) : 단가;
    return {
      품목코드: 코드,
      규격: p ? p.규격 : st.cm + 'cm 포트',
      단가: 단가
    };
  }

  /* `바탕` — 이 줄이 붙는 건의 원본 줄(보통 g.줄들[0]).
     업로드 건에 줄을 더할 때 회차·주문번호·출처를 물려받지 않으면 그 줄만 회차 필터에서 빠진다 (설계 §2-2) */
  function 줄만들기(st, 것, 날짜, 경로, 바탕) {
    var 정보 = 코드정보(st);
    var b = 바탕 || null;
    var 줄 = {
      id: ZG.주문자료.새id(),
      묶음id: b ? (b.묶음id || '') : '',
      주문번호: b ? (b.주문번호 || '') : '',
      주문일: 날짜, 판매처: (b && b.판매처) || 경로,
      품목코드: 정보.품목코드, 원본코드: 정보.품목코드,
      유통명: st.유통명, 학명: st.학명, 규격: 정보.규격,
      주문수량: st.수량, 옵션입수: 1, 옵션원문: '',
      단가: 정보.단가,
      수령인: 것.이름, 수령인전화: 것.전화, 수령인주소: 것.주소,
      우편번호: b ? (b.우편번호 || '') : '',
      배송메모: b ? (b.배송메모 || '') : '',
      묶음키: '', 출처: (b && b.출처) || '수동', 등록일시: Date.now()
    };
    if (st.서비스) 줄.서비스 = true;
    줄.묶음키 = ZG.주문자료.묶음키(줄);
    return 줄;
  }

  /* 값이 실제로 달라진 줄에만 「고쳤다」를 남긴다.
     원본* 셋은 처음 고칠 때 한 번만 — 두 번 세 번 고쳐도 맨 처음 값이 보여야 한다 (설계 §1-1) */
  function 수정표시(옛, 새) {
    if (!옛) return;
    var 바뀜 = false;

    function 견주기(칸, 원본칸, 숫자) {
      if (!(칸 in 새)) return;      // 사람칸만 고치는 줄에 원본수량·원본단가를 만들지 않는다
      var a = 숫자 ? (Number(옛[칸]) || 0) : (옛[칸] || '');
      var b = 숫자 ? (Number(새[칸]) || 0) : (새[칸] || '');
      if (a === b) return;
      바뀜 = true;
      if (원본칸 && 옛[원본칸] == null) 새[원본칸] = 옛[칸];
    }
    견주기('품목코드', '원본품목코드', false);
    견주기('주문수량', '원본수량', true);
    견주기('단가', '원본단가', true);
    ['유통명', '학명', '규격', '수령인', '수령인전화', '수령인주소'].forEach(function (k) {
      견주기(k, null, false);
    });

    if (!바뀜) return;
    새.수정됨 = true;
    새.수정시각 = Date.now();
  }

  /* ══ 주문 고치기 — 폰 화면 · PC 창이 같은 저장 처리를 쓴다 ══
     🔴 올린 파일에서 온 식별값(묶음id·주문번호·판매처·출처·원본코드·옵션원문·옵션입수·등록일시·id)은
        아래 `바뀔것` 표에 없어야 한다. 저장소.바꾸기()가 Object.assign 이라 표에 없는 칸은 그대로 남는다 (설계 §1-2) */
  function 고쳐넣기(g, 사람, 묶음) {
    var 것 = 사람.값();
    if (!막지않나(사람, 것)) return false;
    var 카드들 = 묶음.읽기();
    // 올린 건은 원래 줄이 남아 있으므로(아래 보존 처리) 카드가 다 걸러져도 사람칸 수정은 저장한다
    if (!카드들.length && (g.출처 === '수동' || !묶음.처음id들.length)) {
      u.흔들기(묶음.요소); u.토스트('품목을 하나 이상 남겨 주세요.'); return false;
    }

    var 저 = ZG.저장소, 남은 = {}, 옛줄 = {};
    (g.줄들 || []).forEach(function (r) { 옛줄[r.id] = r; });

    /* 🔴 고치기 전 모습을 미리 떠 둔다 (2026-08-10) — 저장소.바꾸기 는 레코드를 그 자리에서 덮어써서
       (01-저장소 Object.assign) 저장 뒤에는 「원래 품목이 비어 있었는지」를 알 길이 없다.
       이 스냅숏으로 「손으로 새로 붙인 줄」만 가려내 짝을 기억한다 */
    var 짝기억알림 = [];   // 이번 저장에서 새로 기억한 짝 — 저장 끝에 한 번만 알린다
    var 고치기전 = {};
    (g.줄들 || []).forEach(function (r) {
      고치기전[r.id] = { 원본코드: r.원본코드, 품목코드: r.품목코드, 유통명: r.유통명 };
    });

    카드들.forEach(function (st) {
      var 정보 = 코드정보(st);
      if (st.id) {
        남은[st.id] = 1;
        var 바뀔것 = {
          품목코드: 정보.품목코드,
          유통명: st.유통명, 학명: st.학명, 규격: 정보.규격,
          주문수량: st.수량, 단가: 정보.단가,
          수령인: 것.이름, 수령인전화: 것.전화, 수령인주소: 것.주소
        };
        바뀔것.묶음키 = ZG.주문자료.묶음키(바뀔것);
        수정표시(옛줄[st.id], 바뀔것);
        var 대상 = 저.바꾸기(저.키.주문, st.id, 바뀔것);
        /* 🔴 비어 있던 품목을 손으로 지정하시면 그 짝을 기억한다 — 다음에 같은 상품이 들어오면
           저절로 붙는다 (2026-08-10 우람님 지시). 원본코드가 빈칸이면 기억할 열쇠가 없어 넘어간다.
           이미 붙어 있던 품목을 딴 것으로 바꾸신 경우도 짝을 고쳐 둔다 — 그게 우람님 판단이다 */
        var 전 = 고치기전[st.id];
        if (ZG.짝 && 전 && 전.원본코드 && 정보.품목코드 && 전.품목코드 !== 정보.품목코드) {
          ZG.짝.짝쓰기(전.원본코드, 정보.품목코드, 전.유통명 || st.유통명 || '');
          /* 🔴 반드시 알린다 — 「이 주문만 다른 걸 보냈다」고 고치셨는데 조용히 기억해 버리면
             다음 주문부터 엉뚱한 품목이 붙는다. 잘못 기억했으면 여기서 한 번 더 고치시면 덮인다 */
          짝기억알림.push(전.원본코드 + ' → ' + 정보.품목코드);
        }
        // 서비스 줄은 수량·품목을 고치면 출고도 따라 움직인다. 수량 0이면 출고가 사라진다 (6단계-3 설계 §3-2)
        if (대상 && 대상.서비스 && ZG.서비스품목) ZG.서비스품목.출고맞추기(대상);
      } else {
        // 올린 건에 품목을 더할 때도 회차·주문번호를 물려받는다 (설계 §2-2)
        저.덧붙이기(저.키.주문, 줄만들기(st, 것, g.주문일, g.판매처 || '기타', (g.줄들 || [])[0]));
      }
    });
    // 올린 건은 줄을 지우지 않는다 — 수량 0으로 남는다 (설계 §1-5)
    if (g.출처 === '수동') {
      묶음.처음id들.forEach(function (id) {
        if (!id || 남은[id]) return;
        저.지우기(저.키.주문, id);
        if (ZG.서비스품목) ZG.서비스품목.출고지우기(id);
      });
    } else {
      /* 품목코드가 안 붙은 줄(실데이터 매칭 실패 15건)은 카드 거르개를 못 넘어 위 반복에서 빠진다.
         그대로 두면 그 줄만 옛 수령인·주소·묶음키로 남아 한 건이 두 건으로 갈라진다 (검수 🔴-1).
         품목 칸은 손대지 않고 사람칸과 묶음키만 나머지 줄과 똑같이 맞춰 같은 건에 남긴다 (설계 §1-2) */
      var 카드표 = {};
      묶음.모두().forEach(function (st) { if (st.id) 카드표[st.id] = st; });
      묶음.처음id들.forEach(function (id) {
        if (!id || 남은[id]) return;
        /* 서비스 줄을 ✕로 뺐다 — 카드가 아예 없어졌을 때만이다.
           품목명을 지워 읽기() 거르개에서만 빠진 줄은 카드표에 남아 있으므로 지우지 않는다 (설계 §3-2) */
        if (!카드표[id] && 옛줄[id] && 옛줄[id].서비스) {
          저.지우기(저.키.주문, id);
          if (ZG.서비스품목) ZG.서비스품목.출고지우기(id);
          return;
        }
        var 사람것 = { 수령인: 것.이름, 수령인전화: 것.전화, 수령인주소: 것.주소 };
        // 품목만 원본 그대로 두고 수량은 카드에 적은 값을 따른다(수량 0으로 빼기 — 설계 §1-5)
        if (카드표[id]) 사람것.주문수량 = 카드표[id].수량;
        사람것.묶음키 = ZG.주문자료.묶음키(사람것);
        수정표시(옛줄[id], 사람것);
        var 바뀐 = 저.바꾸기(저.키.주문, id, 사람것);
        /* 품목명을 지운 채 수량만 고친 서비스 줄도 이 갈래로 온다.
           여기서 안 부르면 주문수량만 바뀌고 출고줄이 옛 수량으로 남아 재고가 어긋난다 (6단계-3 설계 §3-2) */
        if (바뀐 && 바뀐.서비스 && ZG.서비스품목) ZG.서비스품목.출고맞추기(바뀐);
      });
    }
    u.토스트(것.이름 + ' 주문을 고쳤습니다.');
    if (짝기억알림.length) {
      u.토스트('짝 기억 — ' + 짝기억알림.join(' · ') + ' · 다음부터 저절로 붙습니다');
    }
    return true;
  }

  /* ── 지우기 (우람님 지시 8/8) ──
     올린 건도 지울 수 있다. 다만 🔴 이미 배송완료된 줄이 하나라도 있으면 막는다 —
     출고를 같이 지우면 나간 물건인데 재고가 되살아나고, 안 지우면 주인 없는 출고가 남는다.
     서비스 품목 출고(출처 '서비스')는 주문에 딸린 것이라 같이 지운다. 막는 것은 출처 '주문' 뿐이다. */
  function 나간줄(줄들) {
    var 저 = ZG.저장소, 나간 = {};
    저.읽기(저.키.출고).forEach(function (r) {
      if (r.주문id && r.출처 === '주문') 나간[r.주문id] = 1;
    });
    return (줄들 || []).filter(function (r) { return 나간[r.id]; });
  }

  function 건삭제(g, 끝나면) {
    var 나간것 = 나간줄(g.줄들);
    if (나간것.length) {
      u.토스트('이미 배송완료된 줄이 ' + 나간것.length + '개 있어 지울 수 없습니다.');
      return;
    }
    u.확인({
      제목: '이 주문을 지울까요?',
      본문: u.안전(g.수령인) + ' · ' + g.줄들.length + '품목',
      확인글: '삭제', 위험: true
    }, function (예) {
      if (!예) return;
      g.줄들.forEach(function (r) {
        ZG.저장소.지우기(ZG.저장소.키.주문, r.id);
        if (ZG.서비스품목) ZG.서비스품목.출고지우기(r.id);   // 서비스가 아닌 줄엔 찾는 게 없어 아무 일도 안 난다
      });
      u.토스트(g.수령인 + ' 주문을 지웠습니다.');
      끝나면();
    });
  }

  /* 회차 통째로 무르기 — 잘못 올린 파일을 되돌린다. 묶음까지 지워야 빈 회차 칩이 안 남는다 */
  function 회차삭제(묶음id, 끝나면) {
    var 저 = ZG.저장소;
    var 묶음 = 저.읽기(저.키.주문묶음).filter(function (b) { return b.id === 묶음id; })[0];
    var 줄들 = ZG.주문자료.읽기({ 묶음id: 묶음id });
    if (!줄들.length) { u.토스트('이 회차에 남은 주문이 없습니다.'); return; }

    var 나간것 = 나간줄(줄들);
    if (나간것.length) {
      u.토스트('이 회차에 배송완료된 줄이 ' + 나간것.length + '개 있어 물릴 수 없습니다.');
      return;
    }
    var 이름 = 묶음 ? (묶음.올린날 + ' ' + 묶음.회차 + '회차 ' + 묶음.올린시각) : 묶음id;
    u.확인({
      제목: '이 회차를 통째로 물릴까요?',
      본문: 이름 + ' · 주문 ' + ZG.주문자료.건으로묶기(줄들).length + '건 · 품목 ' + 줄들.length + '줄',
      확인글: '물리기', 위험: true
    }, function (예) {
      if (!예) return;
      줄들.forEach(function (r) {
        저.지우기(저.키.주문, r.id);
        if (ZG.서비스품목) ZG.서비스품목.출고지우기(r.id);
      });
      저.지우기(저.키.주문묶음, 묶음id);
      u.토스트(이름 + ' 를 물렸습니다.');
      끝나면();
    });
  }

  /* 올린 건이면 원래 줄을 지울 수 없다. 그 차이만 옵션으로 넘긴다 (설계 §1-5) */
  function 수정옵션(g) {
    var 올린것 = g.출처 !== '수동';
    return { 뺄수없음: 올린것, 영수량허용: 올린것 };
  }

  /* 폰 — 주문 수정 화면 */
  function 수정뷰(상태, g) {
    return {
      제목: g.출처 === '수동' ? '수동주문 수정' : '주문 수정',
      왼: '‹ 주문',
      오: 상태.날짜 + ' · ' + (g.판매처 || '기타'),
      그리기: function (칸) {
        var 사람 = 사람칸(g);
        칸.appendChild(사람.요소);
        칸.appendChild(만들기('div', { class: 'ph-sec', text: '주문 품목' }));
        var 묶음 = 품목카드묶음(g.줄들, 수정옵션(g));
        칸.appendChild(묶음.요소);

        var 저장 = 만들기('button', { class: 'ph-save', type: 'button', text: '저장' });
        저장.addEventListener('click', function () {
          if (고쳐넣기(g, 사람, 묶음)) ZG.주문.열기('목록');
        });
        칸.appendChild(저장);

        var 삭제 = 만들기('button', { class: 'btn warn', type: 'button', text: '삭제' });
        삭제.addEventListener('click', function () {
          건삭제(g, function () { ZG.주문.열기('목록'); });
        });
        칸.appendChild(삭제);
      }
    };
  }

  /* PC — 수동주문 수정 창 (출고리스트 창과 같은 틀. 인쇄가 아니므로 body.인쇄중 은 걸지 않는다) */
  function PC수정창(g) {
    닫기창();
    var 막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', 닫기창);

    var 사람 = 사람칸(g);
    var 묶음 = 품목카드묶음(g.줄들, 수정옵션(g));

    var 저장 = 만들기('button', { class: 'btn sm main', type: 'button', text: '저장' });
    저장.addEventListener('click', function () {
      if (!고쳐넣기(g, 사람, 묶음)) return;
      닫기창(); ZG.주문.다시그리기();
    });
    var 오른것들 = [];
    var 삭제 = 만들기('button', { class: 'btn sm warn', type: 'button', text: '삭제' });
    삭제.addEventListener('click', function () {
      건삭제(g, function () { 닫기창(); ZG.주문.다시그리기(); });
    });
    오른것들.push(삭제);
    var 닫기 = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '닫기' });
    닫기.addEventListener('click', 닫기창);
    오른것들.push(저장, 닫기);

    var 창 = 만들기('div', { class: 'pcsheet', role: 'dialog', 'aria-modal': 'true' }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: g.출처 === '수동' ? '수동주문 수정' : '주문 수정' }),
        만들기('span', { class: 'hint', text: g.주문일 + ' · ' + (g.판매처 || '기타') }),
        만들기('span', { class: 'right' }, 오른것들)
      ]),
      만들기('div', { class: 'bd' }, [사람.요소, 묶음.요소])
    ]);
    document.body.appendChild(막);
    document.body.appendChild(창);
    u.탈출걸기(닫기창);
    setTimeout(function () { 사람.이름.focus(); }, 20);
  }

  /* ══ 출고리스트 ══ */
  function 건수글(상태, 줄들) {
    var 고름 = Object.keys(상태.고른).length;
    var 건수 = ZG.주문자료.건으로묶기(줄들).length;
    return (고름 ? '고른 ' : '') + 건수 + '건';
  }

  function 출고뷰(상태, 줄들) {
    return {
      제목: '출고리스트',
      왼: '‹ 주문',
      오: 상태.날짜 + ' · ' + 건수글(상태, 줄들),
      그리기: function (칸) {
        칸.style.gap = '0';
        칸.appendChild(폰표(ZG.주문자료.출고리스트(줄들)));
      }
    };
  }

  function 폰표(것들) {
    var 표 = 만들기('table', { class: 'mini' });
    표.innerHTML = '<colgroup><col style="width:82px"><col><col style="width:46px"><col style="width:46px"></colgroup>';
    표.appendChild(만들기('tr', {}, [
      만들기('th', { text: '코드' }), 만들기('th', { text: '품목 · 규격' }),
      만들기('th', { class: 'r', text: '필요' }), 만들기('th', { class: 'r', text: '재고' })
    ]));
    if (!것들.length) {
      표.appendChild(만들기('tr', {}, [만들기('td', { colspan: '4', class: 'dim', text: '나갈 품목이 없습니다.' })]));
      return 표;
    }
    것들.forEach(function (t) {
      var 이름칸 = 만들기('td', {}, [
        document.createTextNode(t.유통명 || '(품목 없음)'),
        만들기('div', { class: 'rgs', text: t.규격 || '' })
      ]);
      if (t.부족) 이름칸.appendChild(만들기('div', { class: 'lack', text: '재고부족' }));
      표.appendChild(만들기('tr', { class: t.부족 ? 'short' : '' }, [
        만들기('td', { class: 'code', text: t.품목코드 }),
        이름칸,
        만들기('td', { class: 'r' + (t.부족 ? ' zero' : ''), text: String(t.필요) }),
        만들기('td', { class: 'r' + (t.부족 ? ' zero' : ''), text: String(t.재고) })
      ]));
    });
    return 표;
  }

  /* PC — 시안의 창 그대로 */
  function PC출고창(상태, 줄들) {
    닫기창();
    var 막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', 닫기창);

    var 인쇄 = 만들기('button', { class: 'btn sm main', type: 'button', text: '🖨 인쇄' });
    인쇄.addEventListener('click', function () { window.print(); });
    var 닫기 = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '닫기' });
    닫기.addEventListener('click', 닫기창);

    var 창 = 만들기('div', { class: 'pcsheet', role: 'dialog', 'aria-modal': 'true' }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: '출고리스트' }),
        만들기('span', { class: 'hint', text: (상태.부터 === 상태.까지 ? 상태.부터 : 상태.부터 + ' ~ ' + 상태.까지) + ' · ' + 건수글(상태, 줄들) }),
        만들기('span', { class: 'right' }, [인쇄, 닫기])
      ]),
      만들기('div', { class: 'bd' }, [PC표(ZG.주문자료.출고리스트(줄들))])
    ]);
    document.body.appendChild(막);
    document.body.appendChild(창);
    document.body.classList.add('인쇄중');   // 이 표가 있을 때만 인쇄 CSS 가 걸린다 (주문.css 맨 아래)
    u.탈출걸기(닫기창);
    setTimeout(function () { 닫기.focus(); }, 20);
  }

  /* Esc 는 u.탈출걸기 한 자리에서만 받는다 (04-공통UI). 창마다 따로 걸면 앞 창 것이 남는다 */
  function 닫기창() {
    document.body.classList.remove('인쇄중');
    u.탈출풀기();
    var 것들 = document.querySelectorAll('.pcscrim, .pcsheet');
    Array.prototype.forEach.call(것들, function (x) { x.remove(); });
  }

  function PC표(것들) {
    var 표 = 만들기('table');
    표.innerHTML = '<colgroup><col style="width:110px"><col><col style="width:70px"><col style="width:70px"><col style="width:96px"></colgroup>';
    표.appendChild(만들기('tr', {}, [
      만들기('th', { text: '품목코드' }), 만들기('th', { text: '품목 · 규격' }),
      만들기('th', { class: 'r', text: '필요' }), 만들기('th', { class: 'r', text: '재고' }),
      만들기('th', { text: '상태' })
    ]));
    if (!것들.length) {
      표.appendChild(만들기('tr', {}, [만들기('td', { colspan: '5', class: 'dim', text: '나갈 품목이 없습니다.' })]));
      return 표;
    }
    것들.forEach(function (t) {
      표.appendChild(만들기('tr', { class: t.부족 ? 'short' : '' }, [
        만들기('td', { class: 'code', text: t.품목코드 }),
        만들기('td', {}, [
          document.createTextNode(t.유통명 || '(품목 없음)'),
          만들기('div', { class: 'rgs', text: t.규격 || '' })
        ]),
        만들기('td', { class: 'r' + (t.부족 ? ' zero' : ''), text: String(t.필요) }),
        만들기('td', { class: 'r' + (t.부족 ? ' zero' : ''), text: String(t.재고) }),
        만들기('td', {}, [만들기('span', { class: 'chip' + (t.부족 ? ' out' : ''), text: t.부족 ? '재고부족' : '충분' })])
      ]));
    });
    return 표;
  }

  ZG.주문입력 = {
    수동뷰: 수동뷰, 출고뷰: 출고뷰, PC출고창: PC출고창,
    수정뷰: 수정뷰, PC수정창: PC수정창, 건삭제: 건삭제, 회차삭제: 회차삭제,
    품목카드묶음: 품목카드묶음,   // 09b 수동 카드 · 08e 서비스 창이 같은 부품을 쓴다
    줄만들기: 줄만들기,           // 08e 서비스 품목이 같은 모양의 줄을 만든다 (설계 §2-1)
    닫기창: 닫기창
  };
})(window.ZG);
