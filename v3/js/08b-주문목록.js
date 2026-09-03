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
    상세키: '', 폈다: {}, 고른: {}, 쪽: 1, 기간칩: '오늘', 상태칩: '',
    출고배치: ''   // 출고리스트에서 고른 지난 배송완료 처리. 열 때마다 「지금 화면」으로 되돌린다
  };

  /* ══ 카페24 배송상태 ══
     🔴 v3 의 출고 기록이 아니라 **카페24 상태가 진실**이다 — 우람님이 카페24 관리자에서
        직접 발송처리하실 수 있고, 그때 v3 에는 출고줄이 없다.
     🔴 상태를 아직 못 받은 줄(자동수집 전에 올린 옛 주문)은 '' 이다. 어느 쪽으로도 거르지 않고
        배지도 안 붙인다 — 「모름」을 「안 나감」으로 보이면 이미 보낸 주문을 또 보내신다. */
  /* ══ 심폴 배송상태 ══
     🔴 심폴은 오픈API가 없어 `카페24상태`가 영영 빈칸이다 — 그대로 두면 두 탭 어디에도 안 걸려
        보내야 할 주문을 놓치신다(8/8 신고). 대신 v3 의 출고 기록을 신호로 쓴다:
        로젠 「출력완료」 파일을 올려 배송완료 처리하는 순간 08f.출고넣기 가 `주문id` 를 단 출고줄을 만든다.
        그게 곧 「나갔다」이고, 그 전까지는 「배송준비중」이다 (우람님 규칙 8/8).
     🔴 출고 색인은 그릴 때 한 번만 만든다 — 줄마다 저장소를 읽으면 주문 1,295건에서 O(n²)가 된다 */
  var 출고캐시 = null;

  function 출고색인() {
    if (출고캐시) return 출고캐시;
    출고캐시 = Object.create(null);
    ZG.저장소.읽기(ZG.저장소.키.출고).forEach(function (r) {
      if (r.주문id) 출고캐시[r.주문id] = r.출고일 || '?';   // 값은 「나간 날」. 판정은 truthy 만 보므로 그대로다
    });
    return 출고캐시;
  }

  function 심폴인가(r) { return r.판매처 === '심폴'; }

  /* 🔴 서비스 줄은 자기 출고로 판정하지 않는다 — 08e 가 넣는 그 순간 출고줄을 만들어 두기 때문에
     발송 전인데도 그 줄만 「배송완료」로 떨어진다(8/8 신고). 같은 건의 「진짜 상품 줄」 판정을 따라간다.
     묶는 열쇠는 08a 의 묶음키 그대로다 — 화면이 건으로 묶는 것과 어긋나면 안 된다.
     상품 줄이 하나도 없는 건(서비스만)은 준비중으로 둔다 — 놓치는 쪽보다 낫다 (우람님 8/8) */
  function 상품기준(줄들) {
    var 표 = Object.create(null), 색 = 출고색인();
    (줄들 || []).forEach(function (r) {
      if (r.서비스 === true) return;
      var k = r.묶음키 || 자.묶음키(r);
      if (표[k] !== false) 표[k] = !!색[r.id];    // 안 나간 상품 줄이 하나라도 있으면 그 건은 준비중
    });
    return 표;
  }

  /* 그 건이 나간 날. 서비스 줄은 자기 출고일이 「넣은 날」이라 못 믿는다 — 상품 줄을 따라간다 (상품기준()과 같은 이치) */
  function 출고일표(줄들) {
    var 표 = Object.create(null), 색 = 출고색인();
    (줄들 || []).forEach(function (r) {
      if (r.서비스 === true) return;
      var k = r.묶음키 || 자.묶음키(r), 날 = 색[r.id];
      if (날 && 날 !== '?' && (!표[k] || 날 > 표[k])) 표[k] = 날;   // 나눠 보내셨으면 마지막 날
    });
    return 표;
  }

  function 출고로나갔나(r, 표) {
    if (r.서비스 === true) return !!표 && 표[r.묶음키 || 자.묶음키(r)] === true;
    return !!출고색인()[r.id];
  }

  /* 🔴 카페24상태만 보면 **통합관리 안에서 손으로 넘긴 배송완료가 영영 「배송준비중」에 남는다** —
     08n 은 출고만 만들고 `카페24상태`는 손대지 않기 때문이다(로젠 송장이 없어 카페24에 보낼 것이 없다).
     그래서 v3 출고 기록도 「나갔다」의 신호로 같이 본다 (우람님 8/10 신고 — 윤혜숙·토마토 건).
     두 신호는 **더한다**: 카페24에서 직접 처리하신 건은 출고가 없고, 손으로 넘긴 건은 카페24상태가 없다 */
  function 준비중인가(r, 표) {
    if (심폴인가(r)) return !출고로나갔나(r, 표);
    return r.카페24상태 === '배송준비중' && !출고로나갔나(r, 표);
  }
  function 나갔나(r, 표) {
    if (심폴인가(r)) return 출고로나갔나(r, 표);
    return (!!r.카페24상태 && r.카페24상태 !== '배송준비중') || 출고로나갔나(r, 표);
  }

  /* 한 건(합포장) 안에 섞여 있을 수 있다 */
  function 건상태(g) {
    var 줄 = g.줄들 || [];
    if (!줄.length) return '';
    var 표 = 상품기준(줄);                       // 그 건의 줄들만 보면 된다 — 이미 묶여 들어온다
    function 준비(r) { return 준비중인가(r, 표); }
    function 나감(r) { return 나갔나(r, 표); }
    if (줄.every(준비)) return '준비중';
    if (줄.every(나감)) return '나감';
    if (줄.some(나감)) return '섞임';
    return '';
  }

  var 상태배지글 = { 준비중: '배송준비중', 나감: '배송완료', 섞임: '일부 발송' };

  function 상태배지(g) {
    var s = 건상태(g);
    if (!s) return null;
    return 만들기('span', { class: 'stat stat-' + s, text: 상태배지글[s] });
  }

  /* ── 날짜 도우미 ── */
  function 날더하기(날짜, 일) {
    var p = 날짜.split('-');
    return ZG.계산.날짜문자(new Date(+p[0], +p[1] - 1, +p[2] + 일).getTime());
  }
  function 요일글(날짜) {
    var p = 날짜.split('-');
    return 요일[new Date(+p[0], +p[1] - 1, +p[2]).getDay()] + '요일';
  }

  /* 🔴 「배송준비중」탭에서만 기간을 버리고 전체 기간에서 찾는다 — 기간 밖에 남아 있는 미발송 주문을
     못 보면 그날 안 보내신다(우람님 8/9). 폰의 하루치(상태.날짜)도 같이 무시한다.
     「전체」·「배송완료」는 그대로 기간을 지킨다 — 배송완료를 전체 기간으로 열면 1,300건이 통째로 쏟아진다 */
  function 기간무시() { return 상태.상태칩 === '준비중'; }

  /* ── 지금 화면에 걸린 줄들 ── */
  function 줄들() {
    if (상태.상태칩 === '나감') return 나간줄들();
    var 온통 = 기간무시();
    var 목록 = 자.읽기({
      부터: 온통 ? '' : (u.폰인가() ? 상태.날짜 : 상태.부터),
      까지: 온통 ? '' : (u.폰인가() ? 상태.날짜 : 상태.까지),
      묶음id: u.폰인가() ? '' : 상태.묶음id,
      글: 상태.글, 주소포함: !u.폰인가()
    });
    /* 🔴 기본은 거르지 않는다 — 일자별로는 그냥 다 보이고, 탭을 고를 때만 걸러진다 */
    if (!상태.상태칩) return 목록;
    var 표 = 상품기준(목록);                     // 거르기 전 목록으로 한 번만 만든다 (O(n))
    if (상태.상태칩 === '준비중') return 목록.filter(function (r) { return 준비중인가(r, 표); });
    return 목록;
  }

  /* ── 배송완료 탭 ──
     🔴 기간은 **주문일자**로 걸린다 — 어제 들어온 주문을 오늘 보내면 「오늘」에 영영 안 뜬다(우람님 9/3 신고).
        그래서 이 탭만은 **나간 날**로 가른다. 출고 기록이 없는 건(카페24에서 직접 처리하신 것)은
        나간 날을 알 길이 없어 여태처럼 주문일로 둔다 — 빠뜨리는 쪽보다 낫다. */
  function 나간기간() {
    return u.폰인가() ? { 부터: 상태.날짜, 까지: 상태.날짜 } : { 부터: 상태.부터, 까지: 상태.까지 };
  }

  /* 그 기간에 있었던 배송완료 처리들. 하루 안에서 이른 것부터 1회차·2회차를 매긴다 */
  function 나간회차들() {
    var 기 = 나간기간();
    var 것들 = ((ZG.배송완료 && ZG.배송완료.배치목록()) || []).filter(function (t) {
      return t.출고일 >= 기.부터 && t.출고일 <= 기.까지;
    });
    것들.sort(function (a, b) { return (a.때 || 0) - (b.때 || 0); });
    var 셈 = {};
    것들.forEach(function (t) { t.회차 = (셈[t.출고일] = (셈[t.출고일] || 0) + 1); });
    return 것들;
  }

  function 나간회차글(t) {
    var 기 = 나간기간(), d = new Date(t.때 || 0);
    var 시각 = t.때 ? ' ' + ('0' + d.getHours()).slice(-2) + ':' + ('0' + d.getMinutes()).slice(-2) : '';
    var 앞 = 기.부터 === 기.까지 ? '' : String(t.출고일).slice(5) + ' ';   // 여러 날을 보면 회차만으로는 어느 날인지 모른다
    return (t.수동 ? '✋ ' : '') + 앞 + t.회차 + '회차' + 시각 + ' · ' + t.건수 + '건';
  }

  function 나간줄들() {
    var 기 = 나간기간(), 묶 = u.폰인가() ? '' : 상태.묶음id;
    var 온 = 자.읽기({ 묶음id: 묶, 글: 상태.글, 주소포함: !u.폰인가() });   // 기간을 안 건다 — 나간 날로 가른다
    var 표 = 상품기준(온);
    var 난 = 온.filter(function (r) { return 나갔나(r, 표); });

    /* 되돌려서 회차가 통째로 사라졌거나 기간 밖으로 나갔으면 조용히 「전체」로 돌아간다 */
    var 회차들 = 나간회차들();
    if (상태.출고배치 && !회차들.some(function (t) { return t.배치 === 상태.출고배치; })) 상태.출고배치 = '';
    if (상태.출고배치) {
      var 집 = Object.create(null);
      (ZG.배송완료.배치줄들(상태.출고배치) || []).forEach(function (r) { 집[r.id] = 1; });
      return 난.filter(function (r) { return 집[r.id]; });
    }

    var 날표 = 출고일표(온), 기간것 = Object.create(null);
    자.읽기({ 부터: 기.부터, 까지: 기.까지, 묶음id: 묶, 글: 상태.글, 주소포함: !u.폰인가() })
      .forEach(function (r) { 기간것[r.id] = 1; });
    return 난.filter(function (r) {
      var 날 = 날표[r.묶음키 || 자.묶음키(r)];
      return 날 ? (날 >= 기.부터 && 날 <= 기.까지) : !!기간것[r.id];
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

    var 바 = u.탭바('주문');
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
    var 옆 = u.옆메뉴('주문 관리');

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

  /* ══ 카페24에서 지금 받아오기 ══
     🔴 브라우저가 카페24를 직접 못 부른다(CORS · 열쇠가 공개된다). Supabase 함수가 대신 부른다.
        같은 함수를 08·12·15시에 Cron 도 부른다 — 여러 번 눌러도 중복은 안 생긴다(함수가 거른다) */
  var 수집중 = false;

  function 주문수집하기(단추) {
    if (수집중) return;
    var supa = ZG.서버 && ZG.서버.클라이언트;
    if (!supa) { u.토스트('서버에 연결돼 있지 않습니다 — 잠시 뒤 다시 눌러 주세요'); return; }

    수집중 = true;
    var 본디 = 단추 ? 단추.textContent : '';
    if (단추) { 단추.disabled = true; 단추.textContent = '받아오는 중…'; }

    supa.functions.invoke('order-collect', { body: { 일수: 14 } })
      .then(function (r) {
        if (r.error) throw r.error;
        var d = r.data || {};
        if (!d.ok) throw new Error(d.오류 || '알 수 없는 오류');
        var 말 = d.새것 ? ('새 주문 ' + d.새것 + '줄을 받았습니다')
                        : '새로 들어온 주문이 없습니다';
        if (d.상태고침) 말 += ' · 배송상태 ' + d.상태고침 + '줄 갱신';
        u.토스트('📥 ' + 말);
        /* 서버가 넣은 줄을 받아온다. Realtime 이 놓쳤을 때도 화면이 맞는다 */
        return Promise.resolve(ZG.서버.받아오기 ? ZG.서버.받아오기() : null).then(function () {
          /* 🔴 Edge Function 은 짝표를 모른다 — 서버는 품목코드만 보고 매칭한다 (2026-08-10).
             받아온 뒤 여기서 못 붙은 줄만 기억해 둔 짝으로 메운다. 붙어 있는 줄은 안 건드린다 */
          var 붙 = (ZG.짝 && ZG.짝.저장된줄되붙이기) ? ZG.짝.저장된줄되붙이기() : 0;
          if (붙) u.토스트('기억해 둔 짝으로 ' + 붙 + '줄에 품목을 붙였습니다.');
        });
      })
      .catch(function (e) {
        u.토스트('주문수집 실패 — ' + String((e && e.message) || e).slice(0, 60));
      })
      .then(function () {
        수집중 = false;
        if (단추) { 단추.disabled = false; 단추.textContent = 본디; }
        다시그리기();
      });
  }

  /* ══ 품목 짝짓기 — 이미 들어와 있는 주문 중 품목이 안 붙은 것 (2026-08-11 우람님 지적) ══
     🔴 08h(주문 올리기) 미리보기의 짝짓기 상자를 그대로 띄운다. 자동수집으로 들어온 주문은
        그 미리보기를 안 거쳐서 여태 손댈 데가 없었다.
     🔴 기간·탭을 안 본다. 짝은 「상품」 단위라 한 번 지으면 옛 주문까지 다 붙는데,
        기간에 걸어 두면 화면에 안 보이는 줄을 영영 못 고치신다 (8/9 배송준비중 탭과 같은 이치) */
  function 짝거리들() {
    return ZG.저장소.읽기(ZG.저장소.키.주문).map(function (r) {
      return { 줄: r, 상품명: r.유통명 || r.원본코드 || '' };
    });
  }

  function 짝못붙은수() {
    var 표 = {};
    ZG.저장소.읽기(ZG.저장소.키.주문).forEach(function (r) {
      if (r && !r.품목코드 && r.원본코드) 표[r.원본코드] = 1;
    });
    return Object.keys(표).length;      // 줄 수가 아니라 「상품 종 수」 — 지으실 짝의 개수다
  }

  function 짝짓기창() {
    ZG.주문입력.닫기창();
    var 막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', ZG.주문입력.닫기창);
    var 속 = 만들기('div', { class: 'bd' });

    function 채우기() {
      /* 🔴 짝을 짓자마자 이미 저장된 줄에 반영한다 — 안 하면 창을 닫고 나서도 목록이 그대로다 */
      var 붙 = (ZG.짝 && ZG.짝.저장된줄되붙이기) ? ZG.짝.저장된줄되붙이기() : 0;
      u.비우기(속);
      var 상자 = ZG.짝창.상자(짝거리들(), { 바뀌면: 채우기 });
      속.appendChild(상자 || 만들기('div', { class: 'ph-card', style: 'text-align:center; padding:24px',
        text: '품목이 안 붙은 주문이 없습니다.' }));
      if (붙) 다시그리기();
    }

    var 닫기 = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '닫기' });
    닫기.addEventListener('click', ZG.주문입력.닫기창);
    /* 🔴 'dlv' — 짝짓기 상자(needbox) CSS 가 `.pcsheet.dlv` 아래에만 있다 (2026-08-19에 빠진 걸 봤다) */
    var 창 = 만들기('div', { class: 'pcsheet dlv', role: 'dialog', 'aria-modal': 'true' }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: '🔗 품목 짝짓기' }),
        만들기('span', { class: 'right' }, [닫기])
      ]),
      속
    ]);
    document.body.appendChild(막);
    document.body.appendChild(창);
    u.탈출걸기(ZG.주문입력.닫기창);
    채우기();
    setTimeout(function () { 닫기.focus(); }, 20);
  }

  /* 못 붙은 게 하나도 없으면 단추를 아예 안 만든다 — 평소 화면에 군더더기를 안 늘린다 */
  function 짝단추(반) {
    var n = 짝못붙은수();
    if (!n) return null;
    var b = 만들기('button', { class: 'btn' + (반 ? ' ' + 반 : ''), type: 'button',
      text: '🔗 품목 짝짓기 ' + n, title: '품목이 안 붙은 상품 ' + n + '종' });
    b.addEventListener('click', 짝짓기창);
    return b;
  }

  function PC머리버튼() {
    function 단추(글, 눌림, 주) {
      var b = 만들기('button', { class: 'btn sm' + (주 ? ' main' : ''), type: 'button', text: 글 });
      b.addEventListener('click', 눌림);
      return b;
    }
    var 수집단추 = 단추('📥 주문수집', function () { 주문수집하기(수집단추); }, true);
    return 만들기('div', { class: 'headbtns' }, [
      수집단추,
      짝단추('sm'),
      단추('⬆ 주문 올리기', 주문올리기누름),
      단추('🚚 배송완료', function () { ZG.주문파일.배송완료(); }, true),
      단추('📋 출고리스트', function () {
        if (상태.상태칩 !== '나감') 상태.출고배치 = '';   // 배송완료 탭에서 고른 회차는 그대로 들고 간다
        ZG.주문입력.PC출고창(상태, 고른줄들());
      }, true),
      단추('💌 동봉카드', function () { 카드열기(포장순(고른건들())); }, true)
    ]);
  }

  /* ══ 폰 — 목록 ══ */
  function 폰목록(칸) {
    var 날바 = 만들기('div', { class: 'datebar' });
    칸.appendChild(날바);

    var 수동 = 만들기('button', { class: 'btn', type: 'button', text: '＋ 수동주문' });
    수동.addEventListener('click', function () { 열기('수동'); });
    var 출고 = 만들기('button', { class: 'btn', type: 'button', text: '📋 출고리스트' });
    출고.addEventListener('click', function () {
      if (상태.상태칩 !== '나감') 상태.출고배치 = '';
      열기('출고');
    });
    var 카드 = 만들기('button', { class: 'btn', type: 'button', text: '💌 동봉카드' });
    카드.addEventListener('click', function () { 카드열기(포장순(자.건으로묶기(줄들()))); });
    var 수집 = 만들기('button', { class: 'btn', type: 'button', text: '📥 주문수집' });
    수집.addEventListener('click', function () { 주문수집하기(수집); });
    칸.appendChild(만들기('div', { class: 'topbtns' }, [수집, 짝단추(), 수동, 출고, 카드]));

    var 목록 = 만들기('div', { class: 'ph-list' });
    function 채우기() {
      날짜줄채우기(날바);          // 🔴 탭을 바꾸면 「무슨 기간을 보고 있는지」도 같이 바뀌어야 한다
      u.비우기(목록);
      var 건들 = 자.건으로묶기(줄들());
      회차줄채우기(회차줄, 채우기);      // 🔴 줄들() 이 사라진 회차를 풀 수 있다 — 반드시 그 뒤다
      if (!건들.length) {
        var 없음 = 상태.글 ? '찾는 주문이 없습니다.'
                 : (기간무시() ? '아직 안 나간 주문이 없습니다.'
                    : (상태.상태칩 === '나감' ? '이 날 나간 주문이 없습니다.' : '이 날짜에 들어온 주문이 없습니다.'));
        목록.appendChild(만들기('div', { class: 'ph-card', text: 없음 }));
      }
      건들.forEach(function (g) { 목록.appendChild(주문카드(g)); });
      u.목록등장(목록.children);
    }

    var 회차줄 = 만들기('div', { class: 'fchips 나간칩줄', style: 'padding:0 var(--space-md) var(--space-xs)' });
    칸.appendChild(찾는칸('이름 · 전화번호 · 상품명으로 찾기', 채우기));
    칸.appendChild(상태칩줄(채우기));
    칸.appendChild(회차줄);
    칸.appendChild(목록);
    채우기();
  }

  /* 폰에도 같은 회차 칩을 둔다. 탭이 배송완료가 아니면 줄째로 감춘다 */
  function 회차줄채우기(줄, 채우기) {
    u.비우기(줄);
    if (상태.상태칩 !== '나감') { 줄.style.display = 'none'; return; }
    줄.style.display = '';
    var 것들 = 나간회차들();
    if (!것들.length) {
      줄.appendChild(만들기('span', {
        text: '이 날 처리한 회차가 없습니다',
        style: 'font-size:var(--font-sm); color:var(--color-text-muted)'
      }));
      return;
    }
    [{ 배치: '', 글: '전체' }].concat(것들.map(function (t) {
      return { 배치: t.배치, 글: 나간회차글(t) };
    })).forEach(function (c) {
      var b = 만들기('button', {
        class: 'fchip 나간칩' + ((상태.출고배치 || '') === c.배치 ? ' on' : ''), type: 'button', text: c.글
      });
      b.addEventListener('click', function () { 상태.출고배치 = c.배치; 채우기(); });
      줄.appendChild(b);
    });
  }

  /* 폰에도 같은 탭을 둔다 — 밭에서 「아직 안 나간 것」만 보시는 게 실제 쓰임이다 */
  function 상태칩줄(채우기) {
    var 줄 = 만들기('div', { class: 'fchips', style: 'padding:0 var(--space-md) var(--space-xs)' });
    [['', '전체'], ['준비중', '배송준비중'], ['나감', '배송완료']].forEach(function (쌍) {
      var b = 만들기('button', { class: 'fchip' + (상태.상태칩 === 쌍[0] ? ' on' : ''), type: 'button', text: 쌍[1] });
      b.addEventListener('click', function () {
        상태.상태칩 = 쌍[0]; 상태.출고배치 = '';
        줄.querySelectorAll('.fchip').forEach(function (x) { x.classList.remove('on'); });
        b.classList.add('on');
        채우기();                      // 🔴 통째로 다시 그리지 않는다 — 찾는칸의 한글 조합이 끊긴다
      });
      줄.appendChild(b);
    });
    return 줄;
  }

  function 날짜줄채우기(줄) {
    u.비우기(줄);
    if (기간무시()) {
      // 화살표 자리는 비워 둔 채 남긴다 — 가운데 글이 그대로 가운데 온다
      줄.appendChild(만들기('span', { class: 'ar', style: 'visibility:hidden' }));
      줄.appendChild(만들기('span', { class: 'd' }, [
        만들기('div', { class: 'big', text: '전체 기간' }),
        만들기('div', { class: 'sml', text: '날짜와 상관없이 아직 안 나간 주문' })
      ]));
      줄.appendChild(만들기('span', { class: 'ar', style: 'visibility:hidden' }));
      return;
    }
    var 왼 = 만들기('button', { class: 'ar', type: 'button', text: '‹', 'aria-label': '하루 앞' });
    var 오 = 만들기('button', { class: 'ar', type: 'button', text: '›', 'aria-label': '하루 뒤' });
    왼.addEventListener('click', function () { 날짜로(날더하기(상태.날짜, -1)); });
    오.addEventListener('click', function () { 날짜로(날더하기(상태.날짜, 1)); });
    var 오늘인가 = 상태.날짜 === u.오늘문자();
    줄.appendChild(왼);
    줄.appendChild(만들기('span', { class: 'd' }, [
      만들기('div', { class: 'big', text: 상태.날짜 }),
      만들기('div', { class: 'sml', text: (오늘인가 ? '오늘 · ' : '') + 요일글(상태.날짜) })
    ]));
    줄.appendChild(오);
  }

  function 날짜로(날짜) {
    상태.날짜 = 날짜; 상태.부터 = 날짜; 상태.까지 = 날짜; 상태.폈다 = {};
    다시그리기();
  }

  /* 🔴 화면을 통째로 다시 그리면 이 입력칸 자체가 새것으로 바뀌고, 그 순간 아이폰의 한글 조합이 끊긴다
     (8/4 「휴케라」→「ㅎㅠㅋㅔㄹㅏ」 사고와 같은 원인). 그래서 목록만 갈아끼우고 입력칸은 손대지 않는다. */
  function 찾는칸(안내, 목록만다시) {
    var 입력 = u.손대야열림(만들기('input', { class: 'inp', type: 'search', placeholder: 안내, value: 상태.글 }));
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
      class: 'ph-card' + (g.부족여부 && 건상태(g) !== '나감' ? ' short' : ''), role: 'button', tabindex: '0'
    });
    // 기준은 그 건의 주문일이다 — 준비중 탭은 화면 날짜와 다른 날 주문도 섞여 나온다
    var 별 = 자.재주문횟수(g.묶음키, g.주문일 || 상태.날짜);
    var 첫줄 =[만들기('span', { class: 'who', text: g.수령인 })];
    if (별 > 0) 첫줄.push(만들기('span', { class: 'star', text: '⭐ ' + 별 }));
    var 폰배지 = 상태배지(g);
    if (폰배지) { 폰배지.style.marginLeft = 'auto'; 첫줄.push(폰배지); }
    첫줄.push(만들기('span', { class: 'mall', text: g.판매처 || '기타', style: 폰배지 ? '' : 'margin-left:auto' }));
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
  /* 🔴 준비중 탭에서 들어온 상세는 그 날짜 밖의 건일 수 있다 — 같은 범위로 찾지 않으면 「못 찾았습니다」가 뜬다.
     그렇다고 전 기간을 통째로 읽으면 안 된다: 건으로묶기는 이름+전화+주소로 묶으니 재주문 손님의
     옛 발송완료 주문까지 지금 건에 딸려 들어와, 상세·수정·동봉카드가 이미 나간 줄을 건드리게 된다(8/9 사고).
     목록에 그린 것과 똑같은 재료(줄들())로 묶는다 — 화면과 상세가 어긋나지 않는다 */
  function 찾은건() {
    var 것들 = 자.건으로묶기(기간무시() ? 줄들() : 자.읽기({ 부터: 상태.날짜, 까지: 상태.날짜 }));
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
      오: (g.주문일 || 상태.날짜) + ' · ' + (g.판매처 || '기타'),
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
    var 별 = 자.재주문횟수(g.묶음키, g.주문일 || 상태.날짜);
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

    // 올린 파일에서 온 건도 고치고 지울 수 있다 (우람님 지시 8/8).
    // 배송완료된 줄이 섞였으면 눌렀을 때 08c 가 막는다 — 재고가 어긋난다
    var 수정 = 만들기('button', { class: 'btn', type: 'button', text: '수정' });
    수정.addEventListener('click', function () { 열기('수동수정', g.묶음키); });
    var 삭제 = 만들기('button', { class: 'btn warn', type: 'button', text: '삭제' });
    삭제.addEventListener('click', function () {
      ZG.주문입력.건삭제(g, function () { 열기('목록'); });
    });
    칸.appendChild(만들기('div', { class: 'topbtns' }, [수정, 삭제]));

    /* ③ 손으로 배송완료 — 그 건의 상태에 따라 한 개만 보인다 (9단계 설계 §5-2).
       카페24·심폴에는 아무 것도 안 보낸다 — 08n 이 확인창에 그 말을 적는다 */
    var 봄 = ZG.수동배송완료.상태보기(g), 손 = null;
    function 마치면(했나) { if (했나) 다시그리기(); }
    if (봄.나감) {
      손 = 만들기('button', { class: 'btn warn', type: 'button', text: '↩ 배송완료 되돌리기' });
      손.addEventListener('click', function () { ZG.수동배송완료.되돌리기([g], 마치면); });
    } else if (봄.넘길수있는) {
      손 = 만들기('button', { class: 'btn', type: 'button', text: '✋ 배송완료로 넘기기' });
      손.addEventListener('click', function () { ZG.수동배송완료.넘기기([g], 마치면); });
    }
    if (손) 칸.appendChild(만들기('div', { class: 'topbtns' }, [손]));
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

  function 고른게있나() {
    return Object.keys(상태.고른).some(function (k) { return 상태.고른[k]; });
  }

  /* ⬆ 주문 올리기 — 두 갈래다 (우람님 지시 8/10)
     ① 체크한 주문이 있거나 회차를 골랐으면 **엑셀을 다시 올리지 않고** 그 줄로 바로 로젠 파일을 만든다
     ② 아무 것도 안 골랐으면 여태처럼 카페24 엑셀 올리기 창을 연다
     🔴 「고른 게 없으면 화면 전체」인 고른줄들() 의 폴백에 그냥 기대면 안 된다 —
        08i 가 주문 줄에 출력번호·상자수를 되쓰므로 1,300건에 번호가 통째로 박힌다.
        그래서 체크나 회차 중 하나는 반드시 있어야 ① 로 간다 */
  function 주문올리기누름() {
    if (!고른게있나() && !상태.묶음id) { ZG.주문파일.카페24로젠(); return; }
    ZG.주문올리기.로젠만들기(고른줄들());
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

  function 기간글() {
    if (기간무시()) return '전체 기간 (배송준비중)';
    var 기 = 상태.부터 === 상태.까지 ? 상태.부터 : 상태.부터 + ' ~ ' + 상태.까지;
    return 상태.상태칩 === '나감' ? 기 + ' 나간 것' : 기;
  }

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
      if (기간무시()) {                      // 지금 안 걸리는 값이라는 걸 눈으로 알게 흐린다
        i.style.opacity = '.4';
        i.title = '배송준비중 탭은 기간을 보지 않습니다';
      }
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

    /* 🔴 카페24 기준 배송상태. 「전체」가 기본이라 일자별로는 지금까지처럼 다 보인다 */
    칩판.appendChild(만들기('span', { style: 'width:1px; height:20px; background:var(--color-border); margin:0 var(--space-xs)' }));
    칩판.appendChild(글자('배송'));
    [['', '전체'], ['준비중', '배송준비중'], ['나감', '배송완료']].forEach(function (쌍) {
      var b = 만들기('button', { class: 'fchip' + (상태.상태칩 === 쌍[0] ? ' on' : ''), type: 'button', text: 쌍[1] });
      b.addEventListener('click', function () { 상태.상태칩 = 쌍[0]; 상태.출고배치 = ''; 상태.쪽 = 1; 다시그리기(); });
      칩판.appendChild(b);
    });
    if (기간무시()) 칩판.appendChild(만들기('span', {
      text: '⚠ 기간을 무시하고 전체 기간의 미발송 주문을 봅니다',
      style: 'font-size:var(--font-sm); font-weight:var(--weight-semibold); color:var(--color-danger)'
    }));

    /* 🔴 배송완료 탭에서만 — 그날 배송완료 처리한 회차다. 하루에 여러 번 하시니 회차로 가른다 (우람님 9/3).
       고르면 그 회차에 나간 건만 남고, 그대로 「출고리스트」를 누르면 그 회차의 출고리스트가 된다 */
    if (상태.상태칩 === '나감') {
      var 회차들 = 나간회차들();
      칩판.appendChild(만들기('span', { style: 'width:1px; height:20px; background:var(--color-border); margin:0 var(--space-xs)' }));
      칩판.appendChild(글자('나간 회차'));
      if (!회차들.length) {
        칩판.appendChild(만들기('span', {
          text: '이 기간에 처리한 회차가 없습니다',
          style: 'font-size:var(--font-sm); color:var(--color-text-muted)'
        }));
      } else {
        [{ 배치: '', 글: '전체' }].concat(회차들.map(function (t) {
          return { 배치: t.배치, 글: 나간회차글(t) };
        })).forEach(function (c) {
          var b = 만들기('button', {
            class: 'fchip 나간칩' + ((상태.출고배치 || '') === c.배치 ? ' on' : ''), type: 'button', text: c.글
          });
          b.addEventListener('click', function () { 상태.출고배치 = c.배치; 상태.쪽 = 1; 다시그리기(); });
          칩판.appendChild(b);
        });
      }
    }

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

    /* 잘못 올린 파일 무르기. 회차를 하나 고른 뒤에만 나온다 — 늘 떠 있으면 잘못 누른다 */
    if (상태.묶음id) {
      var 물리기 = 만들기('button', {
        class: 'fchip', type: 'button', text: '🗑 이 회차 물리기',
        style: 'color:var(--color-danger); border-color:var(--color-danger)'
      });
      물리기.addEventListener('click', function () {
        ZG.주문입력.회차삭제(상태.묶음id, function () {
          상태.묶음id = ''; 상태.쪽 = 1; 다시그리기();
        });
      });
      칩판.appendChild(물리기);
    }

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
      표.appendChild(만들기('tr', {}, [만들기('td', {
        colspan: '9', class: 'dim',
        text: 기간무시() ? '아직 안 나간 주문이 없습니다.'
              : (상태.상태칩 === '나감' ? '이 기간에 나간 주문이 없습니다.' : '이 기간에 들어온 주문이 없습니다.')
      })]));
      return 표;
    }

    건들.forEach(function (g) {
      /* 🔴 이미 나간 건은 재고가 그만큼 깎인 뒤다 — 그 재고로 재면 「모자람」은 거짓이다.
         08c 가 지난 배치의 출고리스트에서 막는 것과 같은 이치 (우람님 9/3) */
      var 나감건 = 건상태(g) === '나감';
      g.줄들.forEach(function (r, i) {
        var tr = 만들기('tr', { class: (i === 0 ? 'gstart ' : '') + (g.부족여부 && !나감건 ? 'short' : '') });
        if (i === 0) {
          var n = String(g.줄들.length);
          tr.appendChild(만들기('td', { rowspan: n }, [고름칸(g)]));
          tr.appendChild(누구칸(g, n));
          var 곳칸 = 만들기('td', { rowspan: n }, [만들기('span', { class: 'mall', text: g.판매처 || '기타' })]);
          var 배지 = 상태배지(g);          // 한 날짜 안에서도 나간 것과 안 나간 것이 구분된다
          if (배지) 곳칸.appendChild(만들기('div', {}, [배지]));
          tr.appendChild(곳칸);
        }
        var 코드값 = String(r.품목코드 || r.원본코드 || '—');
        var 코드칸 = 만들기('td', { class: 'code', text: 줄인코드(코드값) });
        if (코드값 !== 줄인코드(코드값)) 코드칸.title = 코드값;
        if (r.원본품목코드 && r.원본품목코드 !== r.품목코드) 코드칸.appendChild(원래줄(r.원본품목코드));
        tr.appendChild(코드칸);

        var 품목칸 = 만들기('td', {}, [
          document.createTextNode(r.유통명 || '(품목 없음)'),
          서비스딱지(r),
          만들기('div', { class: 'sci', text: r.학명 || '' })
        ]);
        var 모 = 나감건 ? null : g.모자람[r.품목코드];
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

  /* 짝이 안 지어진 심폴 줄은 18자리 원본코드가 그대로 온다 — 좁은 코드 칸을 넘쳐 옆 「품목」 글자와 겹친다.
     뒤 6자리만 남겨 어느 상품인지는 구분되게 하고, 전체 값은 title 로 붙인다.
     v3 품목코드(VEA01 등)는 짧아 손대지 않는다 */
  function 줄인코드(값) { return 값.length > 10 ? '…' + 값.slice(-6) : 값; }

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
    출고캐시 = null;                 // 배송완료 처리·서버 받아오기 뒤에는 반드시 새로 읽는다
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
