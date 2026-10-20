/* 08g-배송완료창 — 🚚 배송완료 팝업 하나 (6단계-4 설계 §7 · 22단계 설계 §2 · 시안 22c)
   파일 전 = 끌어놓기 칸 · 파일 뒤 = 묶음 카드(같은 송장 한 장). PC 모달 800px · 폰 아래 시트.
   자료는 전부 08f 가 만진다 — 여기서 `zg.v3.출고`를 직접 쓰지 않는다.
   🔴 출고는 파일 처리 순간 생기고, 보류는 체크를 끄는 그 순간 저장된다 — [저장]은 카페24 올리기뿐이다 */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 상태 = null, 막 = null, 창 = null;
  var 참조 = {};          // 카드·줄 단위로만 다시 그리려고 들고 있는 자리들

  function B() { return ZG.배송완료; }
  function H() { return ZG.배송보류; }

  function 단추(글, 눌림, 반) {
    var b = 만들기('button', { class: 'btn' + (반 ? ' ' + 반 : ''), type: 'button', text: 글 });
    b.addEventListener('click', 눌림);
    return b;
  }

  function 오늘숫자() { return u.오늘문자().replace(/-/g, ''); }

  function 닫기() {
    u.탈출풀기();
    if (막) 막.remove();
    if (창) 창.remove();
    막 = 창 = null; 상태 = null; 참조 = {};
    if (ZG.주문 && ZG.주문.다시그리기) ZG.주문.다시그리기();   // 재고가 줄어 「재고부족」 표시가 따라간다
  }

  function 열기() {
    if (창) return;
    /* 엑셀이 아직 안 왔으면 기다렸다 저 스스로 다시 불린다 (08d.준비되면) */
    if (!window.XLSX) { ZG.주문파일.준비되면(열기); return; }
    상태 = { 단계: '고르기', 파일: null, 파일명: '', 총: 0, 무시: 0, 색인: null, 줄들: [], 되돌림: 0, 배치: '', 찾기: '' };
    막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', 닫기);
    document.body.appendChild(막);
    그리기();
    u.탈출걸기(닫기);
  }

  function 그리기() {
    참조 = {};
    var 폰 = u.폰인가(), 결과 = 상태.단계 === '결과';
    var x = 단추('✕', 닫기, '');
    x.className = 'x'; x.setAttribute('aria-label', '닫기');
    참조.수 = 만들기('span', { class: 'cnt' });

    var 찾기 = 만들기('input', { class: 'inp', type: 'search', placeholder: '품목명 · 고객명', value: 상태.찾기 });
    if (!결과) 찾기.disabled = true;
    u.조합안전입력(찾기, function (v) { 상태.찾기 = v; 거르기(); }, 150);
    var 도구 = [만들기('div', { class: 'srch' }, [찾기]), 단추('📄 로젠 엑셀 불러오기', 불러오기, 'sm')];
    if (결과 && !폰) {
      var 파일명 = '카페24_송장업로드_' + 오늘숫자() + '.xlsx';
      var 파일단추 = 단추('⬇ 송장 파일', function () { 내려받기(파일명); }, 'sm');
      파일단추.title = 파일명;
      도구.push(파일단추);
    }

    var 속 = [];
    if (폰) 속.push(만들기('div', { class: 'grab' }));
    속.push(만들기('div', { class: 'hd' }, [
      만들기('h3', { text: '🚚 배송완료' }), 참조.수,
      만들기('span', { class: 'hint', text: 결과 ? 상태.파일명 + ' · ' + 상태.총 + '줄' + (상태.무시 ? ' (무시 ' + 상태.무시 + '줄)' : '') : '' }),
      만들기('span', { class: 'right' }, [x])
    ]));
    속.push(만들기('div', { class: 'mtool' }, 도구));
    속.push(만들기('div', { class: 'bd' }, 결과 ? 결과몸() : 고르기몸(폰)));
    if (결과) 속.push(참조.발 = 만들기('div', { class: 'ft' }));

    var 것 = 만들기('div', { class: 'pcsheet dlv pop' + (폰 ? ' 폰시트' : ''), role: 'dialog', 'aria-modal': 'true' }, 속);
    if (창) 창.remove();
    창 = 것;
    document.body.appendChild(것);
    if (결과) 요약새로();
  }

  /* 결과가 있는데 다시 불러오면 닫고 새로 연다 — 앞 파일의 출고·보류는 이미 저장됐다 */
  function 불러오기() {
    if (상태.단계 === '결과') { 닫기(); 열기(); }
    파일찾기();
  }

  /* ══ 파일 전 ══ */

  function 파일받기(f, 흔들곳) {
    if (!/\.xlsx?$/i.test(f && f.name || '')) { u.흔들기(흔들곳 || 창); u.토스트('.xls · .xlsx 파일만 됩니다.'); return; }
    상태.파일 = f; 상태.파일명 = f.name;
    처리();
  }

  function 고르기몸(폰) {
    var 칸 = 만들기('div', { class: 'drop' }, [
      만들기('span', { class: 'ic', text: '📄' }),
      만들기('div', { class: 't', text: '로젠 「출력완료」 파일' }),
      만들기('div', { class: 's', text: '.xls · .xlsx' }),
      단추('파일 고르기', 파일찾기)
    ]);
    칸.addEventListener('dragover', function (e) { e.preventDefault(); 칸.classList.add('over'); });
    칸.addEventListener('dragleave', function () { 칸.classList.remove('over'); });
    칸.addEventListener('drop', function (e) {
      e.preventDefault(); 칸.classList.remove('over');
      파일받기(e.dataTransfer.files && e.dataTransfer.files[0], 칸);
    });
    return 폰 ? [칸] : [칸, 손처리줄()];
  }

  function 파일찾기() { ZG.주문파일.파일고르기({ 확장자: '.xls,.xlsx' }, function (f) { if (상태) 파일받기(f); }); }

  /* ══ 로젠 파일 없이 — 고른 건만 손으로 (9단계 설계 §5-1) ══
     🔴 `ZG.주문.고른줄들()`을 쓰면 안 된다 — 아무것도 안 골랐을 때 화면 전체(최대 1,300건)로
        폴백한다. 그 폴백으로 배송완료를 만들면 재고가 통째로 어긋난다. 그래서 `상태.고른`으로 직접 센다 */
  function 고른건들() {
    var 상 = ZG.주문 && ZG.주문.상태;
    if (!상 || !상.고른) return [];
    return ZG.주문자료.건으로묶기(ZG.주문.줄들()).filter(function (g) { return 상.고른[g.묶음키]; });
  }

  function 손처리줄() {
    var 건들 = 고른건들();

    function 부르기(할일) {
      u.탈출풀기();                                   // 확인창이 뜨는 동안 Esc 주인을 넘긴다
      할일(건들, function (했나) {
        if (했나) 닫기(); else u.탈출걸기(닫기);
      });
    }

    var 넘김 = 단추('✋ 배송완료로 넘기기', function () { 부르기(ZG.수동배송완료.넘기기); }, 'sm');
    var 되돌 = 단추('↩ 배송완료 되돌리기', function () { 부르기(ZG.수동배송완료.되돌리기); }, 'sm warn');
    if (!건들.length) {
      넘김.disabled = 되돌.disabled = true;
      넘김.setAttribute('style', 'opacity:.45'); 되돌.setAttribute('style', 'opacity:.45');
    }

    return 만들기('div', { class: 'allrow' }, [
      만들기('span', { class: 'l', text: '또는, 로젠 파일 없이 —' }),
      만들기('span', { class: 'note', text: 건들.length ? '고른 ' + 건들.length + '건' : '' }),
      만들기('span', { style: 'flex:1' }), 넘김, 되돌
    ]);
  }

  /* ══ 처리 ══ */

  function 처리() {
    ZG.주문파일.시트배열(상태.파일, function (결) {
      if (!결.ok) { u.흔들기(창); u.토스트(결.오류); return; }
      var 읽 = B().읽기시트(결.행들);
      /* 🔴 머리글 검사에 걸리면 아무것도 저장하지 않고 멈춘다 */
      if (!읽.ok) { u.흔들기(창); u.토스트(읽.오류); return; }
      if (!읽.줄들.length) { u.흔들기(창); u.토스트('읽을 줄이 없습니다 — 빈 파일인 것 같습니다.'); return; }

      상태.총 = 읽.총; 상태.무시 = 읽.무시;
      상태.색인 = B().색인만들기();
      /* 🔴 이 파일 한 번이 배치 하나다 — 아래 「이름으로 찾기」로 뒤늦게 붙인 줄도 같은 배치에 담긴다 */
      상태.배치 = B().새배치();
      var 오늘 = u.오늘문자();
      /* 🔴 판정하기가 출고를 만들며 색인을 올린다 — 형제 찾기는 반드시 그 전이다 */
      var 줄들 = 읽.줄들.concat(B().합포장형제(읽.줄들, 상태.색인));
      줄들.forEach(function (줄, i) { 줄.순번 = i + 1; });
      상태.줄들 = 줄들.map(function (줄) { return 판정하기(줄, 오늘, 줄들); });
      /* 🔴 묶는 열쇠는 여기서 고정한다 — 송장을 고치면 운송장번호가 바뀌어 카드가 갈라진다 */
      상태.줄들.forEach(function (것) { 것.묶키 = 묶음열쇠(것); });
      상태.단계 = '결과';
      그리기();
    });
  }

  function 판정하기(줄, 오늘, 로젠줄들) {
    var 것 = {
      순번: 줄.순번, 운송장번호: 줄.운송장번호, 수하인: 줄.수하인, 박스: 줄.박스, 주문번호: 줄.주문번호,
      판정: '확인', 사유: '', 주문줄들: [], 만든출고: [], 표시글: '', 연결주문번호: '', 확인원본: false,
      합포장: !!줄.합포장
    };
    if (!줄.주문번호) {
      것.사유 = '빈번호'; 것.확인원본 = true; 것.전화앞 = 줄.전화앞 || [];
      var 짝 = B().전화후보(줄.수하인, 것.전화앞, 상태.색인);
      if (짝.length === 1) 붙임(것, 짝[0], '이름·전화로 찾음 · ');
      return 것;
    }

    var 찾은 = B().주문찾기(줄.주문번호, 상태.색인);
    if (!찾은.length) { 것.사유 = '없는번호'; 것.확인원본 = true; return 것; }
    찾은 = B().받는분몫(찾은, 줄.수하인, 로젠줄들);

    것.주문줄들 = 찾은;
    var 갈래 = B().넘길줄만(찾은, 상태.색인);
    /* 🔴 보류 묶음은 일부만 깎지 않는다 — 송장 파일·카페24 목록에 「보류」가 없어 저절로 빠진다 (22단계 §1) */
    if (갈래.걸린.some(function (c) { return c.사유 === '보류'; })) {
      것.판정 = '보류'; 것.보류전판정 = '정상'; 것.표시글 = '보류 중 — 송장만 저장됨';
      return 것;
    }
    var 못깎음 = 못깎았나(갈래.걸린);
    if (!갈래.넘길.length) {
      /* 🔴 방패 사유를 갈라 본다 (설계 §3-1). 「이미 나감」과 「품목코드 없음」은 전혀 다른 일이다 —
         품목코드가 없으면 재고가 한 주도 안 깎였는데 초록 「정상」에 섞여 우람님이 끝까지 모르신다 */
      if (못깎음) {
        것.판정 = '미차감'; 것.사유 = '품목없음'; 것.확인원본 = true;
        것.표시글 = '품목코드가 없어 재고를 차감하지 못했습니다 — 확인 필요';
        return 것;
      }
      것.판정 = '이미'; 것.표시글 = '이미 처리된 주문입니다'; return 것;
    }
    것.만든출고 = B().출고넣기(갈래.넘길, 오늘, 상태.색인, { 배치: 상태.배치, 운송장번호: 것.운송장번호 || '' });
    것.판정 = '정상';
    것.표시글 = B().차감글(갈래.넘길) + (것.합포장 ? ' · 합포장 — 같은 송장으로 함께 처리' : '') +
      (못깎음 ? ' · 품목코드 없는 줄은 못 깎음' : '');
    return 것;
  }

  /* 방패에 걸린 사유 중 「재고를 못 깎았다」는 쪽이 있나 — `이미`·`서비스`는 이미 나간 것이라 정상이다 */
  function 못깎았나(걸린) {
    var 있 = false;
    (걸린 || []).forEach(function (c) { if (c.사유 === '품목미확인' || c.사유 === '수량0') 있 = true; });
    return 있;
  }

  /* ══ 결과 ══ */

  function 셈(판정들) {
    return 상태.줄들.filter(function (것) { return 판정들.indexOf(것.판정) >= 0; }).length;
  }

  /* 로젠 파일에 없던 줄인데 우리가 붙여 처리한 수 — 되돌린 줄은 빠진다 */
  function 합포장수() {
    return 상태.줄들.filter(function (것) { return 것.합포장 && 것.만든출고.length; }).length;
  }

  function 출고셈() {
    var 건 = 0, 코드 = [], 주 = 0, 내것 = {};
    상태.줄들.forEach(function (것) {
      if (!것.만든출고.length) return;      // 되돌린 줄은 품목 수에서도 빠져야 한다
      건 += 것.만든출고.length;
      것.만든출고.forEach(function (id) { 내것[id] = 1; });
      (것.주문줄들 || []).forEach(function (r) {
        if (r.품목코드 && 코드.indexOf(r.품목코드) < 0) 코드.push(r.품목코드);
      });
    });
    if (건) ZG.저장소.읽기(ZG.저장소.키.출고).forEach(function (r) { if (내것[r.id]) 주 += Number(r.수량) || 0; });
    return { 건: 건, 품목: 코드.length, 주: 주 };
  }

  /* 줄마다 다른 사유를 수하인 칸 밑에 한 줄로 붙인다 — 상자 머리에 뭉쳐 두면
     어느 줄이 왜 걸렸는지 우람님이 짚어 보실 수 없다 */
  function 줄사유(것) {
    if (것.사유 === '빈번호') return '전화주문(주문번호 없음)';
    if (것.사유 === '없는번호') return 'v3에 없는 주문번호: ' + 것.주문번호;
    if (것.사유 === '품목없음') return '품목코드 없음 — 재고 못 깎음';
    return '';
  }

  function 결과몸() {
    참조.판 = 만들기('div', { class: 'ogrid' });
    카드묶음들().forEach(function (묶) { 참조.판.appendChild(카드(묶)); });
    참조.완료글 = 만들기('span');
    참조.전체되돌리기 = 단추('되돌리기', 전부되돌리기, 'sm');
    var 몸 = [참조.판, 만들기('div', { class: 'done' }, [참조.완료글, 참조.전체되돌리기])];
    var 확인표 = 확인상자();          // 확인 필요가 0이면 통째로 안 그린다
    if (확인표) 몸.push(확인표);
    return 몸;
  }

  function 요약새로() {
    var 초록 = 셈(['정상', '이미', '처리']), 빨강 = 셈(['확인', '미차감']);
    var 카드들 = 카드묶음들(), 보류 = 카드들.filter(보류인가).length;
    참조.수.textContent = 카드들.length + '건';
    var 수 = 출고셈(), 송장줄 = B().송장표(상태.줄들).length - 1, 이미 = 셈(['이미']);
    참조.완료글.innerHTML = '정상 ' + 초록 + '건 — <b>출고 ' + 수.건 + '건 기록</b> · <b>재고 ' + 수.품목 +
      '품목 차감</b> 완료 · 송장 업로드 파일 <b>' + 송장줄 + '줄</b> 준비됨' +
      (이미 ? ' · 이미 처리된 ' + 이미 + '건은 건너뜀' : '') +
      (합포장수() ? ' · <b>합포장 ' + 합포장수() + '건</b>을 같은 송장번호로 함께 처리' : '') +
      (보류 ? ' · <b>⏸ 보류 ' + 보류 + '건</b> — 송장만 저장' : '') +
      /* 🔴 여기서 출고리스트 창을 띄우면 안 된다 — 08c 의 닫기창()이 `.pcsheet` 를 통째로 지워
         이 창(=내려받을 송장 파일)이 같이 날아간다. 길만 알려 드린다 */
      (수.건 ? '<br>📋 <b>포장하실 출고리스트</b> — 주문 화면 「📋 출고리스트」에서 맨 앞 칩(방금 처리분)을 누르세요.' : '') +
      /* 되돌리면 그 줄들은 화면에서 사라진다 — 무슨 일이 일어났는지 여기 한 줄로 남긴다 */
      (상태.되돌림 ? '<br>↩ <b>되돌림</b> — 정상 처리했던 ' + 상태.되돌림 +
        '건이 취소되었습니다. 창을 닫고 파일을 다시 돌리면 다시 처리할 수 있습니다.' : '');
    참조.전체되돌리기.hidden = 수.건 === 0;

    if (참조.확인수) 참조.확인수.textContent = '⚠️ 확인 필요 ' + 빨강 + '건';
    발새로(카드들.filter(켜졌나).length, 보류, 수.주);
  }

  /* ── 발 줄 — 합 · 「카페24 송장 올리기」 체크 · [저장] ──
     🔴 PC는 체크가 켜져 있어도 여기서 보내지 않는다. [저장]이 08m 을 열고 미리보기·확인을 지나야 나간다.
        보류 줄은 판정이 「보류」라 대상뽑기에서 저절로 빠진다 */
  function 대상() {
    var 뽑 = ZG.카페24발송.대상뽑기(상태.줄들);
    return { 짝들: 뽑.짝들, 심폴짝들: 뽑.심폴짝들 || [], 섞임수: 뽑.섞임수, 전화수: 뽑.전화수 };
  }
  function 서버있나() { return !!(ZG.서버 && ZG.서버.클라이언트); }
  /* 폰은 심폴을 안 보낸다(08m 이 PC 창이다) — 카페24 짝만 센다 */
  function 올릴수(뽑) { return 뽑.짝들.length + (u.폰인가() ? 0 : 뽑.심폴짝들.length); }
  function c24켬(뽑) { return 올릴수(뽑) > 0 && 서버있나() && !상태.c24끔; }

  function 발새로(완료, 보류, 주) {
    var 발 = 참조.발, 폰 = u.폰인가(), 뽑 = 대상(), n = 올릴수(뽑);
    u.비우기(발);
    var 완글 = 만들기('span', { class: 'n', html: '배송완료 <b>' + 완료 + '</b>' + (폰 ? '' : '건 <small>재고 −' + u.콤마(주) + '주</small>') });
    var 보글 = 만들기('span', { class: 'n hb', html: '⏸ 보류 <b>' + 보류 + '</b>' + (폰 ? '' : '건 <small>송장만 저장</small>') });

    var 켬 = c24켬(뽑), 빠짐 = [];
    if (뽑.섞임수) 빠짐.push('심폴·카페24 섞임 ' + 뽑.섞임수 + '건');
    if (뽑.전화수) 빠짐.push('전화주문 ' + 뽑.전화수 + '건');
    var c24 = 만들기('button', { type: 'button', class: 'c24' }, [
      만들기('span', { class: 'cb' + (켬 ? ' on' : '') }),
      만들기('span', { text: '카페24 송장 올리기' })
    ]);
    c24.title = (서버있나() ? '' : '서버에 연결돼 있지 않습니다 · ') + n + '건' + (빠짐.length ? ' · ' + 빠짐.join(' · ') + ' 제외' : '');
    c24.hidden = !n;
    if (!서버있나()) c24.disabled = true;
    c24.addEventListener('click', function () { 상태.c24끔 = !상태.c24끔; 요약새로(); });

    var 저장단추 = 만들기('button', { type: 'button', class: 폰 ? 'bigbtn' : 'btn main', text: '저장' });
    저장단추.addEventListener('click', function () { 저장(저장단추); });
    if (폰) {
      발.className = 'ft selfix';
      발.appendChild(만들기('div', { class: 'r1' }, [완글, 보글, c24]));
      발.appendChild(저장단추);
    } else {
      발.className = 'ft savebar';
      발.appendChild(완글); 발.appendChild(만들기('span', { class: 'sep' })); 발.appendChild(보글);
      발.appendChild(만들기('span', { class: 'rt' }, [c24, 저장단추]));
    }
  }

  /* [저장] = 카페24 체크가 켜져 있으면 올리기 · 꺼져 있으면 닫기. 출고 확정의 뜻은 없다 */
  function 저장(단) {
    var 뽑 = 대상();
    if (!c24켬(뽑)) { 닫기(); return; }
    if (!u.폰인가()) { ZG.카페24발송창.열기({ 짝들: 뽑.짝들, 심폴짝들: 뽑.심폴짝들, 그다음: 닫기 }); return; }
    /* 폰 — 08m 은 PC 창이라 안 띄운다. 묻고 바로 올린다 */
    var 짝 = 뽑.짝들.filter(function (p) { return p.켬; }), 심 = 뽑.심폴짝들.length;
    if (!짝.length) { 닫기(); return; }
    u.탈출풀기();
    u.확인({
      제목: '카페24에 송장 ' + 짝.length + '건을 올릴까요',
      본문: 심 ? '심폴 ' + 심 + '건은 PC에서' : '', 확인글: '올리기'
    }, function (예) {
      u.탈출걸기(닫기);
      if (!예) return;
      단.disabled = true; 단.textContent = '올리는 중…';
      H().카페24올리기(짝).then(function (c) {
        닫기();
        u.토스트('카페24 송장 ' + c.됨 + '건 올림');
        if (c.실패.length) u.확인({
          제목: '올리지 못한 ' + c.실패.length + '건',
          본문: c.실패.map(function (f) { return '<b>' + u.안전(f.수하인) + '</b> · ' + u.안전(f.송장) + ' — ' + u.안전(f.사유); }).join('<br>'),
          확인글: '확인'
        }, function () {});
      }, function (e) {
        단.disabled = false; 단.textContent = '저장';
        u.토스트('올리기 실패 — ' + String((e && e.message) || e).slice(0, 60));
      });
    });
  }

  /* ── 카드 — 한 장 = 운송장번호 하나 (보류 단위 = 묶음) ── */
  function 묶음들() {
    var 순 = [], 표 = {};
    상태.줄들.forEach(function (것) {
      var k = 것.묶키;
      if (!표[k]) { 표[k] = { 키: k, 운송장번호: 것.운송장번호 || '', 것들: [] }; 순.push(표[k]); }
      표[k].것들.push(것);
    });
    return 순;
  }
  function 묶음열쇠(것) { return 것.운송장번호 ? '묶' + 것.운송장번호 : '묶#' + 것.순번; }
  function 카드묶음들() { return 묶음들().filter(function (묶) { return 상품줄들(묶).length; }); }
  function 찾은묶(키) { return 묶음들().filter(function (m) { return m.키 === 키; })[0]; }

  function 상품줄들(묶) {
    var 줄 = [], 본 = {};
    묶.것들.forEach(function (것) {
      (것.주문줄들 || []).forEach(function (r) {
        if (본[r.id]) return;
        본[r.id] = 1; 줄.push(r);
      });
    });
    return 줄;
  }

  function 있나(묶, 판정들) { return 묶.것들.some(function (것) { return 판정들.indexOf(것.판정) >= 0; }); }
  function 보류인가(묶) { return 있나(묶, ['보류']); }
  function 바꿀수(묶) { return !!묶.운송장번호 && 있나(묶, ['정상', '처리', '보류']); }
  function 켜졌나(묶) { return 묶.것들.some(function (것) { return 것.만든출고.length; }); }

  function 막힘배지(묶) {
    if (있나(묶, ['미차감'])) return 만들기('span', { class: 'res chk', text: '품목코드 없음' });
    /* 같은 주문을 쥔 다른 카드가 이번에 출고를 만들었으면 「이미 나감」은 거짓이다 — 그 카드와 함께 간다 */
    if (있나(묶, ['이미'])) {
      var 함께 = 이어진묶들(묶.키).some(function (m) { return m.키 !== 묶.키 && 켜졌나(m); });
      return 만들기('span', { class: 'res dup', text: 함께 ? '같은 주문 — 함께 나감' : '이미 나감' });
    }
    if (!묶.운송장번호) return 만들기('span', { class: 'res chk', text: '운송장번호 없음' });
    return 만들기('span', { class: 'res dup', text: '넘어감' });
  }

  function 카드(묶) {
    var 보류 = 보류인가(묶), 바꿈 = 바꿀수(묶), 줄들 = 상품줄들(묶);
    var 날 = ((줄들[0] && ZG.주문자료.날짜정규화(줄들[0].주문일)) || '').slice(5).replace('-', '/');
    var 것 = ZG.보류목록.묶음카드({ 수령인: 묶.것들[0].수하인, 줄들: 줄들 }, {
      체크: 바꿈 && !보류, 체크막힘: !바꿈,
      체크누름: function () { if (보류) 완료로(묶.키); else 보류로(묶.키); },
      머리배지: 보류 ? [만들기('span', { class: 'hold', text: '송장만 저장' })] : (바꿈 ? [] : [막힘배지(묶)]),
      오른쪽: 날 ? [만들기('span', { class: 'dt', text: 날 + ' 주문' })] : [],
      송장: '입력', 송장값: 묶.운송장번호,
      송장바꿈: function (새) { 송장고치기(묶.키, 새); },
      꺼짐: 보류
    });
    것.dataset.찾기 = [묶.것들[0].수하인].concat(줄들.map(function (r) {
      return [r.유통명, r.원본코드, r.품목코드].join(' ');
    })).join(' ').toLowerCase();
    것.hidden = !맞나(것);
    return (참조['카' + 묶.키] = 것);
  }

  function 맞나(카) {
    var q = String(상태.찾기 || '').trim().toLowerCase();
    return !q || 카.dataset.찾기.indexOf(q) >= 0;
  }
  /* 🔴 다시 그리지 않고 hidden 만 바꾼다 — 찾기칸 한글 조합이 끊기지 않게 */
  function 거르기() {
    Object.keys(참조).forEach(function (k) { if (k.charAt(0) === '카') 참조[k].hidden = !맞나(참조[k]); });
  }

  /* 카드 하나만 갈아 끼운다. 이름 찾기로 새로 주문이 붙은 묶음은 판 끝에 붙인다 */
  function 카드새로(키) {
    var 묶 = 찾은묶(키), 옛 = 참조['카' + 키];
    if (!묶 || !상품줄들(묶).length) return;
    if (옛 && 옛.parentNode) 옛.parentNode.replaceChild(카드(묶), 옛);
    else if (참조.판) 참조.판.appendChild(카드(묶));
  }

  /* 같은 주문줄을 쥔 카드들 — 한 주문번호가 로젠 줄 둘(박스 나눔)이면 둘째 카드는 첫 카드 출고 때문에 「이미」다.
     🔴 보류·완료는 이 묶음 전체가 같이 따라간다. 하나만 끄면 둘째 송장이 카페24로 나간다 */
  function 이어진묶들(키) {
    var 모두 = 묶음들(), 든 = {}, 아이디 = {}, 안 = [];
    function 닿나(묶) { return 묶.것들.some(function (것) { return (것.주문줄들 || []).some(function (r) { return 아이디[r.id]; }); }); }
    function 담기(묶) {
      든[묶.키] = 1; 안.push(묶);
      묶.것들.forEach(function (것) { (것.주문줄들 || []).forEach(function (r) { 아이디[r.id] = 1; }); });
    }
    모두.forEach(function (묶) { if (묶.키 === 키) 담기(묶); });
    for (var 더 = true; 더;) {
      더 = false;
      모두.forEach(function (묶) { if (!든[묶.키] && 닿나(묶)) { 담기(묶); 더 = true; } });
    }
    return 안;
  }

  /* 그 송장 묶음의 출고를 되물리고 보류를 건다. 🔴 누르는 그 순간 저장한다 —
     ✕·Esc로 닫으면 출고는 빠졌는데 보류도 없는 줄이 되어 송장을 잃는다.
     🔴 보류송장은 출고를 쥐고 있던 카드의 것만 건다 — 따라온 카드의 송장을 걸면 남의 줄에 남의 송장이 붙는다 */
  function 보류로(키) {
    var 묶들 = 이어진묶들(키), 오늘 = u.오늘문자();
    묶들.forEach(function (묶) {
      묶.것들.forEach(function (것) {
        if (!것.만든출고.length) return;
        B().출고되돌리기(것.만든출고, 상태.색인);
        것.만든출고 = [];
        것.보류전판정 = 것.판정; 것.보류전표시글 = 것.표시글;
        것.판정 = '보류'; 것.표시글 = '보류 중 — 송장만 저장됨';
        H().걸기(것.주문줄들, 묶.운송장번호, 오늘);
      });
    });
    묶들.forEach(function (묶) {
      묶.것들.forEach(function (것) {
        if (것.판정 !== '이미' || !(것.주문줄들 || []).some(H().보류인가)) return;
        것.보류전판정 = '이미'; 것.보류전표시글 = 것.표시글;
        것.판정 = '보류'; 것.표시글 = '보류 중 — 같은 주문의 다른 상자';
      });
    });
    묶들.forEach(function (묶) { 묶.것들.forEach(줄새로); });
  }

  /* 앞 카드가 풀고 출고를 만들면 뒤 카드는 넘길 게 없어 「이미」로 돌아간다 — 출고는 한 번만 생긴다 */
  function 완료로(키) {
    /* 보류송장을 건 카드가 먼저 푼다 — 누른 카드가 따라온 카드여도 출고엔 처음 건 송장이 실린다 */
    var 순 = 묶음들().map(function (m) { return m.키; }), 오늘 = u.오늘문자();
    function 주인(묶) {
      return 묶.것들.some(function (것) {
        return (것.주문줄들 || []).some(function (r) { return H().보류인가(r) && String(r.보류송장 || '') === 묶.운송장번호; });
      }) ? 0 : 1;
    }
    var 묶들 = 이어진묶들(키).sort(function (a, b) { return 주인(a) - 주인(b) || 순.indexOf(a.키) - 순.indexOf(b.키); });
    묶들.forEach(function (묶) {
      묶.것들.forEach(function (것) {
        if (것.판정 !== '보류') return;
        H().풀기(것.주문줄들);
        var 갈래 = B().넘길줄만(것.주문줄들, 상태.색인);
        if (!갈래.넘길.length) {
          것.판정 = 못깎았나(갈래.걸린) ? '미차감' : '이미';
          것.표시글 = 것.판정 === '미차감' ? '품목코드가 없어 재고를 차감하지 못했습니다 — 확인 필요' : '이미 처리된 주문입니다';
          return;
        }
        것.만든출고 = B().출고넣기(갈래.넘길, 오늘, 상태.색인, { 배치: 상태.배치, 운송장번호: 묶.운송장번호 });
        것.판정 = 것.보류전판정 === '이미' ? '정상' : (것.보류전판정 || '정상');
        것.표시글 = 것.보류전판정 === '이미' ? B().차감글(갈래.넘길) : (것.보류전표시글 || B().차감글(갈래.넘길));
      });
    });
    묶들.forEach(function (묶) { 묶.것들.forEach(줄새로); });
  }

  /* 송장을 고치면 이미 만든 출고는 새 번호로 다시 넣고(같은 배치), 보류면 보류송장만 바꾼다. 08f 는 안 고친다.
     🔴 보류송장은 그 카드가 건 것일 때만 바꾼다 — 따라온 카드의 송장으로 덮으면 남의 송장이 붙는다 */
  function 송장고치기(키, 새) {
    var 묶 = 찾은묶(키), 옛 = 묶.운송장번호, 혼자 = 이어진묶들(키).length === 1, 오늘 = u.오늘문자();
    묶.것들.forEach(function (것) {
      것.운송장번호 = 새;
      if (것.판정 === '보류') {
        var 내것 = (것.주문줄들 || []).filter(function (r) {
          return H().보류인가(r) && (혼자 || String(r.보류송장 || '') === String(옛 || ''));
        });
        if (내것.length) H().걸기(내것, 새, 내것[0].보류일);
        return;
      }
      if (!것.만든출고.length) return;
      B().출고되돌리기(것.만든출고, 상태.색인);
      var 갈래 = B().넘길줄만(것.주문줄들, 상태.색인);
      것.만든출고 = 갈래.넘길.length ? B().출고넣기(갈래.넘길, 오늘, 상태.색인, { 배치: 상태.배치, 운송장번호: 새 }) : [];
    });
    묶.것들.forEach(줄새로);
  }

  /* ── 확인 필요 상자 — 한 줄도 없으면 아예 안 그린다 ── */
  function 확인상자() {
    var 대상 = 상태.줄들.filter(function (것) { return 것.확인원본; });
    if (!대상.length) return null;

    var 몸통 = 만들기('table', {}, [
      만들기('colgroup', {}, [
        /* 수하인 칸에 사유 한 줄이 같이 들어간다 — 좁으면 「주문번/호」로 잘려 읽히지 않는다 */
        만들기('col', { style: 'width:132px' }), 만들기('col', { style: 'width:156px' }),
        만들기('col', { style: 'width:56px' }), 만들기('col')
      ]),
      만들기('tr', {}, [
        만들기('th', { text: '운송장번호' }), 만들기('th', { text: '수하인' }),
        만들기('th', { class: 'r', text: '박스' }), 만들기('th', { class: 'r', text: '이 줄을 어떻게 할까요' })
      ])
    ]);
    대상.forEach(function (것) { 몸통.appendChild(줄만들기(것)); });

    var 확인수 = 참조.확인수 = 만들기('span', { text: '⚠️ 확인 필요 ' + 셈(['확인']) + '건' });
    return 만들기('div', { class: 'needbox' }, [
      만들기('h4', {}, [확인수, 만들기('span', { class: 'why', text: '줄마다 사유를 이름 밑에 적었습니다' })]),
      만들기('div', { class: 'inner' }, [
        몸통,
        만들기('div', { class: 'allrow' }, [
          만들기('span', { class: 'l', text: '여러 줄이 나오면 —' }),
          단추('전부 이름으로 찾기', 전부이름, 'sm'), 단추('전부 넘어가기', 전부넘김, 'sm'),
          만들기('span', { style: 'flex:1' }),
          만들기('span', { class: 'note', html: '넘어간 줄도 송장 업로드 파일에는 <b>들어가지 않습니다</b>' })
        ])
      ])
    ]);
  }

  function 끝칸(것) {
    /* 품목코드가 없는 줄은 이름으로 다시 찾아도 방패에 또 걸린다 — 버튼을 주지 않고 사유만 적는다 */
    if (것.판정 === '미차감') return 만들기('td', { class: 'r warn', text: 것.표시글 });
    if (것.판정 === '확인') {
      return 만들기('td', {}, [만들기('div', { class: 'rowbtns' }, [
        단추('이름으로 주문 찾아 재고 차감', function () { 이름처리(것); }, 'sm main'),
        단추('재고 그대로 두고 넘어가기', function () {
          것.판정 = '넘어감'; 것.표시글 = '재고 그대로 두고 넘어감'; 줄새로(것);
        }, 'sm')
      ])]);
    }
    if (것.판정 === '넘어감') return 만들기('td', { class: 'r gone', text: 것.표시글 || '넘어감' });
    if (것.판정 === '보류') return 만들기('td', { class: 'r gone', text: '⏸ ' + 것.표시글 });
    return 만들기('td', { class: 'went' }, [만들기('div', { class: 'rowbtns' }, [
      만들기('span', { text: 것.표시글 }), 단추('되돌리기', function () { 줄되돌리기(것); }, 'sm')
    ])]);
  }

  function 수하인칸(것) {
    var 속 = [만들기('div', { text: 것.수하인 || '(이름 없음)' })];
    var 사유 = 줄사유(것);
    if (사유) 속.push(만들기('div', { class: 'sub', text: 사유 }));
    return 만들기('td', {}, 속);
  }

  function 줄만들기(것) {
    return (참조['줄' + 것.순번] = 만들기('tr', {}, [
      만들기('td', { class: 'code', text: 것.운송장번호 }),
      수하인칸(것),
      만들기('td', { class: 'r', text: String(것.박스) }),
      끝칸(것)
    ]));
  }

  /* 🔴 다시 그리기는 줄·카드 단위로만. 판 전체를 다시 그리면 스크롤과 방금 본 이력이 튄다 */
  function 줄새로(것) {
    var 옛 = 참조['줄' + 것.순번];
    if (옛 && 옛.parentNode) 옛.parentNode.replaceChild(줄만들기(것), 옛);
    카드새로(것.묶키);
    요약새로();
  }

  /* ══ §5 이름으로 찾기 ══ */

  /* 판정만 바꾼다 — 파일을 읽는 중(판정하기)에는 그릴 줄이 아직 없다 */
  function 붙임(것, g, 머리) {
    var 갈래 = B().넘길줄만(g.줄들, 상태.색인);
    if (!갈래.넘길.length) { 것.판정 = '넘어감'; 것.표시글 = '그 주문은 이미 나갔습니다'; return; }
    것.만든출고 = B().출고넣기(갈래.넘길, u.오늘문자(), 상태.색인, { 배치: 상태.배치, 운송장번호: 것.운송장번호 || '' });
    것.주문줄들 = 갈래.넘길;
    것.연결주문번호 = String(갈래.넘길[0].주문번호 || '').trim();
    것.판정 = '처리';
    것.표시글 = (머리 || '') + g.짧은글;
  }
  function 붙이기(것, g) { 붙임(것, g); 줄새로(것); }

  /* 후보가 날짜만 다르게 8줄 늘어서 헷갈린다 — 「오늘 · 」「N일 전 · 」를 맨 앞에 세워 먼저 읽히게 한다.
     🔴 후보 목록 자체는 좁히지 않는다. 지난 주문이 오늘 나가는 일이 있어 걸러내면 고를 길이 없어진다 */
  function 날짜표(주문일) {
    if (!주문일) return '';
    var 오늘 = u.오늘문자();
    if (주문일 === 오늘) return '🟢 오늘 · ';
    var 날 = Math.round((Date.parse(오늘) - Date.parse(주문일)) / 86400000);
    return 날 > 0 ? 날 + '일 전 · ' : '';
  }

  function 이름처리(것, 그다음) {
    function 끝(중단) { if (그다음) 그다음(중단); }

    // 전화까지 맞는 주문이 있으면 그것만 고르게 한다 — 같은 이름의 지난 주문이 끼지 않는다
    var 전화로 = B().전화후보(것.수하인, 것.전화앞, 상태.색인);
    var 후보 = 전화로.length ? 전화로.slice(0, 8) : B().이름후보(것.수하인, 상태.색인);
    if (!후보.length) {
      것.판정 = '넘어감'; 것.표시글 = '그 이름으로 안 나간 주문을 못 찾음';
      u.토스트('그 이름으로 아직 안 나간 주문을 못 찾았습니다 — 이 줄은 넘어갑니다.');
      줄새로(것); 끝(false); return;
    }
    if (후보.length === 1) { 붙이기(것, 후보[0]); 끝(false); return; }

    /* 🔴 고르기를 부르기 직전에 탈출을 풀고, 콜백에서 다시 건다.
       안 하면 Esc 한 번에 후보창과 결과창이 같이 닫혀 처리 이력이 통째로 날아간다 */
    u.탈출풀기();
    u.고르기({
      제목: '어느 주문일까요',
      본문: 전화로.length ? '수하인 「' + u.안전(것.수하인 || '') + '」 이름·전화로 찾은 주문입니다.'
        : '수하인 「' + u.안전(것.수하인 || '') + '」 이름으로 찾은 주문입니다.<br>' +
            '<b>날짜를 꼭 보세요</b> — 같은 이름의 지난 주문도 함께 뜹니다.',
      항목: 후보.map(function (g, i) { return { 값: String(i), 글: 날짜표(g.주문일) + g.글 }; })
    }, function (값) {
      u.탈출걸기(닫기);
      if (값 == null) { 끝(true); return; }
      붙이기(것, 후보[Number(값)]);
      끝(false);
    });
  }

  function 전부이름() {
    var 남은 = 상태.줄들.filter(function (것) { return 것.판정 === '확인'; }), i = 0;
    (function 다음(중단) {
      if (중단 || i >= 남은.length) { 요약새로(); return; }
      이름처리(남은[i++], 다음);
    })(false);
  }

  function 전부넘김() {
    상태.줄들.forEach(function (것) {
      if (것.판정 !== '확인') return;
      것.판정 = '넘어감'; 것.표시글 = '재고 그대로 두고 넘어감'; 줄새로(것);
    });
    요약새로();
  }

  /* ══ 되돌리기 — 창을 닫기 전까지만 된다 (설계 §11-5) ══ */

  function 한줄되돌리기(것) {
    if (!것.만든출고.length) return false;
    B().출고되돌리기(것.만든출고, 상태.색인);
    것.만든출고 = [];
    것.판정 = 것.확인원본 ? '확인' : '넘어감';
    것.표시글 = 것.확인원본 ? '' : '되돌렸습니다 — 재고 원래대로';
    줄새로(것);
    return true;
  }

  function 줄되돌리기(것) {
    if (!한줄되돌리기(것)) { u.토스트('되돌릴 출고가 없습니다.'); return; }
    u.토스트('재고를 원래대로 되돌렸습니다.');
  }

  /* 정상 줄은 시안에 표가 없다. 그 줄들이 만든 출고를 한 번에 되물리는 자리를 `.done` 줄 끝에 둔다 */
  function 전부되돌리기() {
    var 수 = 출고셈();
    if (!수.건) { u.토스트('되돌릴 출고가 없습니다.'); return; }
    u.탈출풀기();
    u.확인({
      제목: '방금 만든 출고를 되돌릴까요',
      본문: '출고 <b>' + 수.건 + '건</b>을 지우고 재고를 원래대로 돌립니다.',
      확인글: '되돌리기', 위험: true
    }, function (예) {
      u.탈출걸기(닫기);
      if (!예) return;
      상태.줄들.forEach(한줄되돌리기);
      상태.되돌림 += 수.건;      // 되돌린 줄은 화면에서 사라진다 — 안내를 `.done` 줄에 남긴다
      요약새로();
      u.토스트('출고 ' + 수.건 + '건을 되돌렸습니다 — 재고 원래대로.');
    });
  }

  function 내려받기(파일명) {
    var 줄수 = B().송장표(상태.줄들).length - 1;
    if (!줄수) { u.토스트('송장 파일에 넣을 줄이 없습니다.'); return; }
    B().내보내기(상태.줄들, 파일명);
    u.토스트(줄수 + '줄을 내려받았습니다.');
  }

  ZG.배송완료창 = { 열기: 열기, 닫기: 닫기 };
})(window.ZG);
