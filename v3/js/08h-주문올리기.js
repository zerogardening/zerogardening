/* 08h-주문올리기 — 카페24 주문 파일을 올려 v3 주문줄로 넣고, 그 자리에서 로젠 파일까지 (계획서 §1·§3)
   시안 07-주문올리기-macA.html · 창 세 단계(고르기 → 미리보기 → 저장완료+로젠).
   창 여닫기·scrim·드롭존·Esc 는 08g-배송완료창 의 모양을 그대로 따른다.

   🔴 원본 27칸은 저장하지 않는다. 메모리에만 두고 08i 로 넘긴다 —
      나중에 다시 뽑으시려면 카페24 파일을 다시 올리시면 된다(원천이 거기다).
   🔴 [저장] 버튼을 누르기 전에는 저장소가 한 글자도 바뀌지 않는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 상태 = null, 막 = null, 창 = null;

  /* ══ 카페24 27칸 ══ */

  var 칸이름 = [
    '쇼핑몰', '쇼핑몰번호', '주문번호', '발주일', '주문상품명', '상품번호', '옵션', '자체품목코드',
    '결제수단', '결제업체', '결제정보', '판매가', '수량', '수령인', '우편번호', '주소',
    '수령지전화', '전화번호', '핸드폰', '비고', '주문자', '주문자우편번호', '주문자주소',
    '주문자전화번호', '주문자핸드폰', '옵션추가가격', '배송비정보'
  ];
  /* 이 넷 중 하나라도 없으면 아무것도 저장하지 않고 멈춘다 — 엉뚱한 엑셀이 통째로 주문이 되는 사고를 막는다 */
  var 꼭있어야 = ['주문번호', '발주일', '수령인', '수량'];

  function 글(v) { return String(v == null ? '' : v); }
  function 다듬기(v) { return 글(v).trim(); }
  function 머리키(v) { return 글(v).replace(/\s/g, ''); }   // 「옵션추가 가격」의 공백까지 지운다

  /* 머리글은 1행 고정이다. 실물이 1행 머리글이고, 08f 가 0~5행을 훑는 건 로젠 파일이 진짜 3행짜리라서다 */
  function 머리읽기(행) {
    var 자리 = {}, 모르는 = [];
    (행 || []).forEach(function (v, i) {
      var 이름 = 머리키(v);
      if (!이름) return;
      if (칸이름.indexOf(이름) >= 0) { if (자리[이름] == null) 자리[이름] = i; }
      else 모르는.push(다듬기(v));
    });
    return {
      자리: 자리,
      없는칸: 꼭있어야.filter(function (k) { return 자리[k] == null; }),
      모르는: 모르는,
      우편없음: 자리['우편번호'] == null
    };
  }

  function 칸값(행, 자리, 이름) {
    var i = 자리[이름];
    return i == null ? '' : ((행 || [])[i] == null ? '' : 행[i]);
  }
  function 칸글(행, 자리, 이름) { return 다듬기(칸값(행, 자리, 이름)); }

  /* 로젠으로 나갈 27칸. 머리글 순서가 흔들려도 늘 표준 순서로 세운다 */
  function 원본27(행, 자리) {
    return 칸이름.map(function (이름) { return 칸값(행, 자리, 이름); });
  }

  /* ══ 값 정규화 ══ */

  function 숫자(v) {
    var n = Number(글(v).replace(/,/g, '').trim());
    return isFinite(n) ? n : 0;
  }

  /* 🔴 CSV 는 문자열이라 앞 0 이 살아 오지만, xlsx 로 주시면 04524 가 숫자 4524 가 된다 */
  function 우편정규화(v) {
    var s = 글(v).replace(/\D/g, '');
    if (!s) return '';
    return s.length <= 5 ? s.padStart(5, '0') : s;
  }

  /* Date · 엑셀 serial · `2026-08-08 09:12:33` · `2026.8.6` 를 08a 가 받는 모양까지만 다듬고,
     마지막 판정은 08a.날짜정규화 에 맡긴다. 실패하면 그 줄은 저장하지 않는다 */
  function 날짜만들기(v) {
    var 자 = ZG.주문자료;
    if (v instanceof Date) return 자.날짜정규화(v);
    if (typeof v === 'number') {
      if (v > 20000 && v < 90000) return 자.날짜정규화((v - 25569) * 86400000);   // 엑셀 serial
      return 자.날짜정규화(v);
    }
    var s = 글(v).trim().replace(/[.\/]/g, function (c) { return c === '.' ? '-' : '/'; });
    if (/^\d{4}-\d{1,2}-\d{1,2}/.test(s)) {
      var m = s.slice(0, 10).match(/^(\d{4})-(\d{1,2})-(\d{1,2})/);
      s = m[1] + '-' + String(m[2]).padStart(2, '0') + '-' + String(m[3]).padStart(2, '0');
    }
    return 자.날짜정규화(s);
  }

  /* `ech01-10` · `ERB01-10(2)` → { 코드:'ECH01-10', 꼬리:2 }. 못 알아보면 코드 '' */
  function 코드정규화(원문) {
    var s = 글(원문).replace(/\s/g, '').toUpperCase();
    var 꼬리 = 0;
    var m = s.match(/^(.*?)\((\d+)\)$/);
    if (m) { s = m[1]; 꼬리 = Number(m[2]) || 0; }
    var c = s.match(/^([A-Z]{3}\d{2})-?(\d{1,3})$/);
    return { 코드: c ? (c[1] + '-' + Number(c[2])) : '', 꼬리: 꼬리 };
  }

  /* 🔴 하나만 곱한다. 옵션 `수량=N개` 가 우선, 없을 때만 코드 꼬리 `(N)`.
     둘 다 적용하면 4개입 × 2 = 8배가 되고 그 숫자가 08f 의 재고 차감까지 간다 */
  function 옵션입수(옵션원문, 꼬리) {
    var m = 글(옵션원문).match(/수량\s*=\s*(\d+)\s*개/);
    if (m) return Number(m[1]) || 1;
    return 꼬리 > 0 ? 꼬리 : 1;
  }

  function 판매처(쇼핑몰) {
    var s = 다듬기(쇼핑몰);
    return (!s || s === '한국어 쇼핑몰') ? '카페24' : s;
  }

  function 연락처(행, 자리) {
    return 칸글(행, 자리, '핸드폰') || 칸글(행, 자리, '전화번호') || 칸글(행, 자리, '수령지전화');
  }

  function 마스터색인() {
    var 표 = {};
    ZG.저장소.품목들().forEach(function (p) { 표[p.품목코드] = p; });
    return 표;
  }

  /* ══ 주문줄 만들기 ══ */

  function 줄만들기(행, 자리, 마스터) {
    var 주문번호 = 칸글(행, 자리, '주문번호');
    if (!주문번호) return null;                      // 주문번호가 빈 행은 건너뛴다

    var 원본코드 = 칸글(행, 자리, '자체품목코드');
    var 옵션원문 = 칸글(행, 자리, '옵션');
    var 상품명 = 칸글(행, 자리, '주문상품명');
    var 코드 = 코드정규화(원본코드);
    var 품목 = 코드.코드 ? 마스터[코드.코드] : null;

    var 줄 = {
      묶음id: '', 주문번호: 주문번호, 주문일: 날짜만들기(칸값(행, 자리, '발주일')),
      판매처: 판매처(칸글(행, 자리, '쇼핑몰')),
      /* 못 찾아도 막지 않는다 — 원본코드를 남겨 두고 주문 화면에서 나중에 지정하신다 */
      품목코드: 품목 ? 품목.품목코드 : '', 원본코드: 원본코드,
      유통명: 품목 ? 품목.유통명 : 상품명, 학명: 품목 ? 품목.학명 : '', 규격: 품목 ? 품목.규격 : '',
      주문수량: 숫자(칸값(행, 자리, '수량')), 옵션입수: 옵션입수(옵션원문, 코드.꼬리), 옵션원문: 옵션원문,
      단가: 숫자(칸값(행, 자리, '판매가')),
      수령인: 칸글(행, 자리, '수령인'), 수령인전화: 연락처(행, 자리),
      수령인주소: 칸글(행, 자리, '주소'), 우편번호: 우편정규화(칸값(행, 자리, '우편번호')),
      배송메모: 칸글(행, 자리, '비고'),
      묶음키: '', 출처: '업로드'
    };
    줄.묶음키 = ZG.주문자료.묶음키(줄);
    return 줄;
  }

  /* 🔴 업무규칙의 `주문번호+품목코드+수령인` 을 글자대로 쓰면 안 된다 —
     실물 2줄 중 1줄이 품목코드 빈칸이라 한 주문의 둘째 상품이 조용히 사라진다.
     코드가 없으면 상품명+옵션으로 가르고, 같은 키가 「몇 번째냐」까지 센다 */
  function 중복키(줄) {
    var 무엇 = 줄.원본코드 || (글(줄.유통명) + '§' + 글(줄.옵션원문));
    return 글(줄.주문번호) + '|' + 무엇 + '|' + 다듬기(줄.수령인);
  }

  /* 🔴 줄마다 08a.같은주문인가() 를 부르지 않는다 — 호출마다 1MB JSON 을 다시 파싱한다.
     기존 표를 한 번만 만든다 */
  function 기존키표() {
    var 수 = {}, id들 = {};
    ZG.저장소.읽기(ZG.저장소.키.주문).forEach(function (r) {
      var k = 중복키(r);
      수[k] = (수[k] || 0) + 1;
      (id들[k] = id들[k] || []).push(r.id || '');
    });
    return { 수: 수, id들: id들 };
  }

  function 빈행인가(행) {
    return (행 || []).every(function (c) { return 다듬기(c) === ''; });
  }

  function 읽기결과(행들) {
    행들 = 행들 || [];
    /* 🔴 카페24 머리읽기보다 먼저 판정한다 — 심폴 머리글에도 전화번호·우편번호·주소가 있어
       순서를 바꾸면 「카페24 파일이 아닌 것 같습니다」로 끝난다 (8단계 설계 §4) */
    var 심 = ZG.심폴 && ZG.심폴.감지(행들[0]);
    var 머리;
    if (심) {
      var 바꾼 = ZG.심폴.바꾸기(행들, 심);
      행들 = 바꾼.행들;
      머리 = { 자리: 바꾼.자리, 없는칸: [], 모르는: [], 우편없음: false, 심폴: true };
    } else {
      머리 = 머리읽기(행들[0]);
      if (머리.없는칸.length) {
        return { ok: false, 오류: '카페24 · 심폴 주문 파일이 아닌 것 같습니다 — 못 찾은 칸: ' + 머리.없는칸.join(' · ') };
      }
    }

    var 마스터 = 마스터색인(), 기존 = 기존키표(), 센수 = {};
    var 항목들 = [], 무시 = 0;
    for (var i = 1; i < 행들.length; i++) {
      var 행 = 행들[i] || [];
      if (빈행인가(행)) continue;
      var 줄 = 줄만들기(행, 머리.자리, 마스터);
      if (!줄) { 무시++; continue; }

      var 키 = 중복키(줄);
      센수[키] = (센수[키] || 0) + 1;
      var 겹 = (기존.수[키] || 0) >= 센수[키];
      항목들.push({
        원본: 원본27(행, 머리.자리), 줄: 줄,
        상품명: 칸글(행, 머리.자리, '주문상품명'),
        원날짜: 다듬기(칸값(행, 머리.자리, '발주일')),
        갈래: 겹 ? '이미' : (줄.주문일 ? '새것' : '날짜오류'),
        id: 겹 ? ((기존.id들[키] || [])[센수[키] - 1] || '') : ''
      });
    }
    if (심) ZG.심폴.되붙이기(항목들);   // 심폴 줄만 골라 짝표대로 품목을 붙인다
    return { ok: true, 머리: 머리, 항목들: 항목들, 무시: 무시 };
  }

  /* ══ 저장 ══ */

  function 시각문자() {
    var d = new Date();
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  function 저장하기(항목들, 파일명) {
    var 저 = ZG.저장소, 키 = 저.키;
    var 넣을 = 항목들.filter(function (것) { return 것.갈래 === '새것'; });
    if (!넣을.length) return null;          // 🔴 넣을 줄이 0이면 묶음을 만들지 않는다 — 빈 회차 칩이 남는다

    var 오늘 = u.오늘문자();
    var 그날 = 저.읽기(키.주문묶음).filter(function (b) { return b.올린날 === 오늘; });
    var 회차 = 그날.length + 1;
    var 묶음 = {
      id: 오늘.replace(/-/g, '').slice(2) + '-' + String(회차).padStart(2, '0'),
      올린날: 오늘, 올린시각: 시각문자(), 회차: 회차, 파일명: 파일명 || '',
      줄수: 넣을.length, 건너뛴수: 항목들.length - 넣을.length, 등록일시: Date.now()
    };

    var 때 = Date.now();
    var 새줄들 = 넣을.map(function (것) {
      var r = Object.assign({}, 것.줄, { id: ZG.주문자료.새id(), 묶음id: 묶음.id, 등록일시: 때 });
      것.id = r.id;                        // 로젠 출력번호를 되쓸 자리
      return r;
    });

    /* 🔴 덧붙이기를 줄마다 부르지 않는다. 전체쓰기의 줄 대조가 새 줄만 보내기 큐에 싣는다 */
    저.덧붙이기(키.주문묶음, 묶음);
    저.전체쓰기(키.주문, 저.읽기(키.주문).concat(새줄들));
    return 묶음;
  }

  /* ══ 창 ══ */

  function 단추(글자, 눌림, 반) {
    var b = 만들기('button', { class: 'btn' + (반 ? ' ' + 반 : ''), type: 'button', text: 글자 });
    b.addEventListener('click', 눌림);
    return b;
  }

  /* 시안의 노랑(막지 않는 경고)·회색(그냥 지나감) 톤. 새 CSS 를 만들지 않으려고 여기서 입힌다 —
     빨강(.needbox 기본)은 「멈춰야 하는 줄」이라 이 화면에 쓰면 안 된다 */
  var 톤표 = {
    노랑상자: 'border-color:#F2DFA8', 노랑머리: 'background:#FFF8E6; color:#9A6400; border-bottom-color:#F2DFA8',
    회색상자: 'border-color:var(--color-border)', 회색머리: 'background:var(--color-seg-bg); color:var(--color-text-sub); border-bottom-color:var(--color-border)',
    노랑칸: 'background:#FFF8E6; border-color:#F2DFA8', 노랑글: 'color:#9A6400'
  };

  function 상자(빛, 제목, 왜, 속) {
    var 머리 = 만들기('h4', { style: 톤표[빛 + '머리'] }, [
      만들기('span', { text: 제목 }),
      만들기('span', { class: 'why', text: 왜 || '' })
    ]);
    return 만들기('div', { class: 'needbox', style: 톤표[빛 + '상자'] }, [
      머리, 만들기('div', { class: 'inner' }, 속)
    ]);
  }

  function 숫자칸(빛, 이름, 수, 설명) {
    var 것 = 만들기('div', { class: 'sum' + (빛 === 'ok' ? ' ok' : '') }, [
      만들기('div', { class: 'k', text: 이름, style: 빛 === '노랑' ? 톤표.노랑글 : null }),
      만들기('div', { class: 'v', html: 수 + '<small>건</small>', style: 빛 === '노랑' ? 톤표.노랑글 : null }),
      만들기('div', { class: 's', text: 설명 })
    ]);
    if (빛 === '노랑') 것.setAttribute('style', 톤표.노랑칸);
    return 것;
  }

  function 닫기() {
    u.탈출풀기();
    if (막) 막.remove();
    if (창) 창.remove();
    막 = 창 = null; 상태 = null;
    if (ZG.주문 && ZG.주문.다시그리기) ZG.주문.다시그리기();
  }

  function 열기() {
    if (창) return;
    if (!ZG.주문파일.준비됐나()) return;
    상태 = { 단계: '고르기', 파일: null, 파일명: '', 머리: null, 항목들: [], 무시: 0, 묶음: null };
    막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', 닫기);
    document.body.appendChild(막);
    그리기();
    u.탈출걸기(닫기);
  }

  function 껍데기(옵션) {
    var x = 단추('✕', 닫기, '');
    x.className = 'x'; x.setAttribute('aria-label', '닫기');
    var 것 = 만들기('div', {
      class: 'pcsheet dlv' + (옵션.좁게 ? ' narrow' : ''), role: 'dialog', 'aria-modal': 'true'
    }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: 옵션.제목 }),
        만들기('span', { class: 'hint', text: 옵션.힌트 || '' }),
        만들기('span', { class: 'right' }, [x])
      ]),
      만들기('div', { class: 'bd' }, 옵션.몸),
      만들기('div', { class: 'ft' }, 옵션.발)
    ]);
    /* 미리보기만 시안대로 880px — 표가 여섯 칸이라 760px 에서는 주문번호와 이름이 겹친다.
       새 CSS 를 만들지 않으려고 여기서만 폭을 준다 */
    if (옵션.넓게) 것.style.width = 'min(880px, 94vw)';
    if (창) 창.remove();
    창 = 것;
    document.body.appendChild(것);
  }

  function 그리기() {
    if (상태.단계 === '고르기') 고르기창();
    else if (상태.단계 === '미리보기') 미리보기창();
    else 완료창();
  }

  /* ── ① 파일 고르기 ── */

  function 파일찾기() {
    ZG.주문파일.파일고르기({ 확장자: '.csv,.xls,.xlsx' }, function (f) { 파일받기(f); });
  }

  function 파일받기(f, 흔들곳) {
    if (!/\.(csv|xlsx?)$/i.test((f && f.name) || '')) {
      u.흔들기(흔들곳 || 창); u.토스트('.csv · .xls · .xlsx 파일만 됩니다.'); return;
    }
    상태.파일 = f; 상태.파일명 = f.name;
    그리기();
  }

  function 파일줄(다시고르기) {
    return 만들기('div', { class: 'fileline' }, [
      만들기('span', { class: 'ic', text: '📄' }),
      만들기('div', {}, [
        만들기('div', { class: 'nm', text: 상태.파일명 }),
        만들기('div', {
          class: 'sz',
          text: Math.max(1, Math.round(상태.파일.size / 1024)) + ' KB' +
                (상태.항목들.length ? ' · ' + 상태.항목들.length + '줄' : '')
        })
      ]),
      다시고르기 ? 단추('다시 고르기', 파일찾기, 'sm') : null
    ].filter(Boolean));
  }

  function 고르기창() {
    var 고른칸;
    if (상태.파일) {
      고른칸 = 파일줄(true);
    } else {
      고른칸 = 만들기('div', { class: 'drop' }, [
        만들기('span', { class: 'ic', text: '📄' }),
        만들기('div', { class: 't', text: '카페24 · 심폴에서 받은 주문 파일을 고르세요' }),
        만들기('div', { class: 's', text: '여기로 끌어다 놓아도 됩니다 · .csv · .xls · .xlsx' }),
        단추('파일 고르기', 파일찾기)
      ]);
      고른칸.addEventListener('dragover', function (e) { e.preventDefault(); 고른칸.classList.add('over'); });
      고른칸.addEventListener('dragleave', function () { 고른칸.classList.remove('over'); });
      고른칸.addEventListener('drop', function (e) {
        e.preventDefault(); 고른칸.classList.remove('over');
        파일받기(e.dataTransfer.files && e.dataTransfer.files[0], 고른칸);
      });
    }

    var 볼단추 = 단추('미리보기', 미리보기, 'main');
    if (!상태.파일) { 볼단추.disabled = true; 볼단추.setAttribute('style', 'opacity:.45'); }

    껍데기({
      제목: '주문 올리기', 힌트: '카페24 · 심폴 주문 파일', 좁게: true,
      몸: [
        고른칸,
        만들기('div', { class: 'done' }, [만들기('span', {
          html: '파일을 고르면 <b>먼저 보여드립니다</b> — 들어올 줄 · 이미 있는 줄 · 품목 못 찾은 줄.<br>' +
                '저장한 뒤 <b>이 화면에서 바로</b> 로젠 대량등록 파일을 내려받습니다.'
        })])
      ],
      발: [만들기('span', { class: 'spacer' }), 단추('취소', 닫기), 볼단추]
    });
  }

  /* ── ② 미리보기 — 아직 아무것도 저장하지 않는다 ── */

  function 미리보기() {
    ZG.주문파일.읽기(상태.파일, function (결) {
      if (!결.ok) { u.흔들기(창); u.토스트(결.오류); return; }
      var 읽 = 읽기결과(결.행들);
      /* 🔴 머리글 검사에 걸리면 아무것도 저장하지 않고 멈춘다 */
      if (!읽.ok) { u.흔들기(창); u.토스트(읽.오류); return; }
      if (!읽.항목들.length) { u.흔들기(창); u.토스트('읽을 줄이 없습니다 — 빈 파일인 것 같습니다.'); return; }

      상태.머리 = 읽.머리; 상태.항목들 = 읽.항목들; 상태.무시 = 읽.무시;
      상태.심폴 = !!읽.머리.심폴;
      상태.단계 = '미리보기';
      그리기();
      if (읽.머리.우편없음) u.토스트('우편번호 칸이 없습니다 — 합포장 묶기와 ★재구매 회차가 정확하지 않게 됩니다.');
    });
  }

  function 갈래셈(갈래) {
    return 상태.항목들.filter(function (것) { return 것.갈래 === 갈래; }).length;
  }
  function 새것들() { return 상태.항목들.filter(function (것) { return 것.갈래 === '새것'; }); }
  function 코드없는줄() {
    return 새것들().filter(function (것) { return !것.줄.품목코드; });
  }
  function 건수(것들) {
    var 표 = {}, 수 = 0;
    것들.forEach(function (것) { var k = 것.줄.묶음키; if (!표[k]) { 표[k] = 1; 수++; } });
    return 수;
  }

  function 표틀(폭들, 머리들, 줄들) {
    var 것 = 만들기('table', {}, [
      만들기('colgroup', {}, 폭들.map(function (w) {
        return 만들기('col', w ? { style: 'width:' + w } : {});
      })),
      만들기('tr', {}, 머리들.map(function (h) {
        return 만들기('th', { class: h.r ? 'r' : '', text: h.t });
      }))
    ]);
    줄들.forEach(function (tr) { 것.appendChild(tr); });
    return 것;
  }

  function 미리보기창() {
    var 새 = 새것들(), 이미 = 갈래셈('이미'), 코드없음 = 코드없는줄(), 날짜틀림 = 갈래셈('날짜오류');
    var 오늘 = u.오늘문자();
    var 회차 = ZG.저장소.읽기(ZG.저장소.키.주문묶음).filter(function (b) { return b.올린날 === 오늘; }).length + 1;

    var 몸 = [
      파일줄(true),
      만들기('div', { class: 'sums' }, [
        숫자칸('ok', '들어올 줄', 새.length, '주문 ' + 건수(새) + '건 · 새 주문으로 저장됩니다'),
        숫자칸('', '이미 있는 줄', 이미, '같은 주문번호가 이미 있어 건너뜁니다'),
        숫자칸('노랑', '품목 못 찾은 줄', 코드없음.length, '들어올 ' + 새.length + '건 안에 들어 있습니다 · 막지 않습니다')
      ]),
      만들기('div', { class: 'done' }, [만들기('span', {
        html: 새.length
          ? '<b>「이 회차로 저장하기」</b>를 누르면 ' + 새.length + '줄이 <b>' + 오늘 + ' 주문</b>으로 들어갑니다. ' +
            '누르기 전에는 아무것도 저장되지 않습니다.'
          : '들어올 줄이 없습니다 — 전부 이미 올리신 주문입니다. ' +
            '<b>로젠 대량등록 파일은 그대로 다시 만들 수 있습니다.</b>'
      })])
    ];

    if (새.length) 몸.push(들어올상자(새));
    if (상태.심폴) 몸.push(ZG.심폴짝창.상자(상태.항목들, { 바뀌면: 짝바뀜 }));
    else if (코드없음.length) 몸.push(코드없음상자(코드없음));
    if (이미) 몸.push(이미상자());
    if (날짜틀림) 몸.push(날짜상자());

    var 갈단추 = 단추(새.length ? '이 회차로 저장하기' : '로젠 파일 만들기', 저장, 'main');

    껍데기({
      제목: '주문 올리기 — 미리보기', 넓게: true,
      힌트: (상태.심폴 ? '심폴 · ' : '') + 상태.파일명 + ' · ' + 상태.항목들.length + '줄 읽음' + (상태.무시 ? ' (무시 ' + 상태.무시 + '줄)' : ''),
      몸: 몸,
      발: [
        만들기('span', { class: 'fname', text: 새.length ? '저장될 회차 — ' + 오늘 + ' (' + 회차 + '회차)' : '저장할 줄이 없습니다' }),
        만들기('span', { class: 'spacer' }), 단추('취소', 닫기), 갈단추
      ]
    });
  }

  function 짝바뀜() { ZG.심폴.되붙이기(상태.항목들); 그리기(); }

  var 앞몇줄 = 5;

  function 들어올상자(새) {
    var 보임 = 새.slice(0, 앞몇줄);
    var 줄들 = 보임.map(function (것) {
      var r = 것.줄;
      return 만들기('tr', {}, [
        만들기('td', { class: 'code', text: r.주문번호 }),
        만들기('td', {}, [만들기('div', { text: r.수령인 || '(이름 없음)' }),
          만들기('div', { class: 'sub', text: r.수령인주소 || '' })]),
        만들기('td', { class: 'code', text: r.품목코드 || '—' }),
        만들기('td', { text: r.유통명 || '' }),
        만들기('td', { class: 'dim', text: r.규격 || '' }),
        만들기('td', { class: 'r', text: String(ZG.주문자료.수량(r)) })
      ]);
    });
    var 남 = 새.length - 보임.length;
    return 상자('회색', '🟢 들어올 줄 ' + 새.length + '건',
      남 ? '앞 ' + 보임.length + '줄만 보여드립니다 — 나머지 ' + 남 + '줄도 같은 모양입니다' : '',
      [표틀(['150px', '160px', '92px', '', '92px', '52px'], [
        { t: '주문번호' }, { t: '받는 분' }, { t: '품목코드' }, { t: '품목' }, { t: '규격' }, { t: '수량', r: true }
      ], 줄들)]);
  }

  function 코드없음상자(것들) {
    var 줄들 = 것들.slice(0, 8).map(function (것) {
      return 만들기('tr', {}, [
        만들기('td', { class: 'code', text: 것.줄.주문번호 }),
        만들기('td', { text: 것.줄.수령인 || '(이름 없음)' }),
        만들기('td', {}, [만들기('div', { text: 것.상품명 }),
          만들기('div', { class: 'sub', text: 것.줄.원본코드 ? '적혀 온 코드 「' + 것.줄.원본코드 + '」와 맞는 품목이 없습니다' : 'v3 품목코드와 맞는 것이 없습니다' })]),
        만들기('td', { class: 'r', text: String(ZG.주문자료.수량(것.줄)) }),
        만들기('td', { class: 'r', style: 톤표.노랑글, text: '품목코드 없이 저장 · 나중에 지정' })
      ]);
    });
    return 상자('노랑', '⚠️ 품목 못 찾은 줄 ' + 것들.length + '건',
      '그대로 저장됩니다 — 품목코드는 나중에 주문 화면에서 지정하시면 됩니다',
      [표틀(['150px', '104px', '', '52px', '186px'], [
        { t: '주문번호' }, { t: '받는 분' }, { t: '카페24에 적힌 상품명' }, { t: '수량', r: true }, { t: '이 줄은 어떻게 됩니까', r: true }
      ], 줄들),
        만들기('div', { class: 'allrow' }, [
          만들기('span', { class: 'l', text: '이 줄들도 —' }),
          만들기('span', { class: 'note', html: '<b>로젠 대량등록 파일에는 들어갑니다.</b> 상품명은 카페24 것을 그대로 씁니다' })
        ])]);
  }

  function 이미상자() {
    var 것들 = 상태.항목들.filter(function (것) { return 것.갈래 === '이미'; });
    var 줄들 = 것들.slice(0, 8).map(function (것) {
      return 만들기('tr', {}, [
        만들기('td', { class: 'code', text: 것.줄.주문번호 }),
        만들기('td', { text: 것.줄.수령인 || '(이름 없음)' }),
        만들기('td', {}, [만들기('div', { text: 것.줄.유통명 || 것.상품명 }),
          만들기('div', { class: 'sub', text: '이미 v3 에 있는 주문입니다' })]),
        만들기('td', { class: 'r', text: String(ZG.주문자료.수량(것.줄)) }),
        만들기('td', { class: 'r gone', text: '건너뜁니다' })
      ]);
    });
    return 상자('회색', '이미 있는 줄 ' + 것들.length + '건',
      '같은 주문번호가 이미 v3 에 있어 건너뜁니다 — 막지 않습니다',
      [표틀(['150px', '104px', '', '52px', '186px'], [
        { t: '주문번호' }, { t: '받는 분' }, { t: '품목' }, { t: '수량', r: true }, { t: '이 줄은 어떻게 됩니까', r: true }
      ], 줄들),
        만들기('div', { class: 'allrow' }, [
          만들기('span', { class: 'l', text: '겹친 줄은 —' }),
          만들기('span', { class: 'note', html: '<b>건너뜁니다.</b> 로젠 대량등록 파일에는 그대로 들어갑니다(재발행)' })
        ])]);
  }

  function 날짜상자() {
    var 것들 = 상태.항목들.filter(function (것) { return 것.갈래 === '날짜오류'; });
    var 줄들 = 것들.slice(0, 8).map(function (것) {
      return 만들기('tr', {}, [
        만들기('td', { class: 'code', text: 것.줄.주문번호 }),
        만들기('td', { text: 것.줄.수령인 || '(이름 없음)' }),
        만들기('td', {}, [만들기('div', { text: 것.원날짜 || '(빈칸)' }),
          만들기('div', { class: 'sub', text: '발주일을 읽지 못했습니다' })]),
        만들기('td', { class: 'r', style: 톤표.노랑글, text: '저장하지 않음 · 로젠 파일에는 들어감' })
      ]);
    });
    return 상자('노랑', '⚠️ 발주일을 못 읽은 줄 ' + 것들.length + '건',
      '이 줄은 v3 주문으로 저장하지 않습니다 — 카페24에서 날짜를 고쳐 다시 받아 주세요',
      [표틀(['150px', '104px', '', '230px'], [
        { t: '주문번호' }, { t: '받는 분' }, { t: '파일에 적힌 발주일' }, { t: '이 줄은 어떻게 됩니까', r: true }
      ], 줄들)]);
  }

  /* ── ③ 저장 완료 + 로젠 파일 ── */

  function 저장() {
    var 새 = 새것들();
    if (새.length) {
      상태.묶음 = 저장하기(상태.항목들, 상태.파일명);
      u.토스트(새.length + '줄을 저장했습니다.');
      if (ZG.주문 && ZG.주문.다시그리기) ZG.주문.다시그리기();
    }
    상태.단계 = '완료';
    그리기();
  }

  /* 재발행이라 저장한 묶음이 없으면 이미 있던 줄의 묶음id 를, 그것도 없으면 오늘 1회차로 삼는다.
     🔴 이 id 가 곧 운임 손질이 붙는 「그 회차」다 (10단계 §3-1) */
  function 회차id() {
    var id = 상태.묶음 && 상태.묶음.id;
    if (!id) {
      var 목록 = ZG.저장소.읽기(ZG.저장소.키.주문), 표 = {};
      목록.forEach(function (r) { if (r.id) 표[r.id] = r; });
      상태.항목들.some(function (것) {
        var r = 것.id && 표[것.id];
        if (r && r.묶음id) { id = r.묶음id; return true; }
        return false;
      });
    }
    if (!id) id = u.오늘문자().replace(/-/g, '').slice(2) + '-01';
    return id;
  }

  function 파일이름() { return '20' + 회차id() + '.xlsx'; }

  /* 발밑 한 줄 — 손질을 저장할 때마다 이 글자만 갈아 끼운다(창을 다시 그리지 않는다) */
  function 발밑글(준비, 이름) {
    return '내려받을 파일 — ' + 이름 + ' · ' + 준비.줄수 + '줄 · ' + 준비.묶음수 + '묶음 · 박스 ' +
      준비.박스합 + '개 · 로젠 운임 예상 ' + u.콤마(준비.운임합계) + '원' +
      (준비.확인요망 ? ' · 확인요망 ' + 준비.확인요망 + '묶음 제외' : '');
  }

  function 완료창() {
    var 새 = 새것들(), 이미 = 갈래셈('이미'), 코드없음 = 코드없는줄().length;
    var 회 = 상태.묶음 ? (상태.묶음.올린날 + ' (' + 상태.묶음.회차 + '회차)') : '저장 없이 재발행';
    var 묶음id = 회차id();
    function 준비하기() { return ZG.로젠파일.준비(상태.항목들, { 묶음id: 묶음id }); }
    var 준비 = 준비하기();
    var 이름 = 파일이름();
    var 발칸 = 만들기('span', { class: 'fname' });

    var 몸 = [
      만들기('div', { class: 'sums' }, [
        숫자칸('ok', 상태.묶음 ? '저장된 줄' : '저장 안 함', 상태.묶음 ? 새.length : 0,
          상태.묶음 ? '주문 ' + 건수(새) + '건으로 들어갔습니다' : '전부 이미 있던 주문입니다'),
        숫자칸('', '건너뛴 줄', 이미, '이미 있던 주문입니다'),
        숫자칸('노랑', '품목코드 없이 저장', 상태.묶음 ? 코드없음 : 0, '주문 화면에서 코드를 지정해 주세요')
      ]),
      만들기('div', { class: 'done' }, [만들기('span', {
        html: 상태.묶음
          ? '<b>' + 회 + '</b>로 저장되었습니다 — 주문 <b>' + 건수(새) + '건</b> · 품목 <b>' + 새.length + '줄</b>.'
          : '저장한 줄은 없습니다 — <b>로젠 대량등록 파일만 다시 만듭니다.</b>'
      })]),
      상자('회색', '⬇ 로젠 대량등록 파일', '올리신 파일 그대로 만듭니다', [
        표틀(['170px', ''], [{ t: '파일에 들어갈 것' }, { t: '내용', r: true }], [
          만들기('tr', {}, [만들기('td', { text: '줄 수' }), 만들기('td', { class: 'r', text: 준비.줄수 + '줄 · 합포장 ' + 준비.묶음수 + '묶음' })]),
          만들기('tr', {}, [만들기('td', { text: '박스운임 (J열)' }),
            만들기('td', { class: 'r', text: '단가 × 박스수 = 합계가 들어갑니다' })]),
          만들기('tr', {}, [만들기('td', { text: '품목명 칸 (E열)' }),
            만들기('td', { class: 'r', html: 준비.코드없음 ? '품목코드 없는 ' + 준비.코드없음 + '줄은 <span style="' + 톤표.노랑글 + '">카페24 상품명 그대로</span> 들어갑니다' : '전부 유통명으로 다시 씁니다' })]),
          만들기('tr', {}, [만들기('td', { text: '출력번호' }), 만들기('td', { class: 'r', text: '1 ~ ' + 준비.묶음수 + ' · 동봉카드 번호와 같습니다' })])
        ]),
        만들기('div', { class: 'allrow' }, [
          만들기('span', { class: 'l', text: '파일 이름 —' }),
          만들기('span', { class: 'note', html: '<b>' + 이름 + '</b>' }),
          만들기('span', { style: 'flex:1' }),
          만들기('span', { class: 'note', text: '로젠 홈페이지 → 대량등록 → 이 파일 올리기' })
        ])
      ])
    ];

    if (ZG.운임손질창 && 준비.그룹들.length) {
      몸.push(ZG.운임손질창.상자({
        묶음id: 묶음id, 준비하기: 준비하기,
        /* 🔴 손질을 저장해도 완료창을 통째로 다시 그리지 않는다 — 발밑 글자만 갈아 끼운다 */
        바뀌면: function (준) { 발칸.textContent = 발밑글(준, 이름); }
      }));
    }
    발칸.textContent = 발밑글(준비, 이름);

    껍데기({
      제목: 상태.묶음 ? '저장했습니다 — 이제 로젠 파일' : '로젠 파일 만들기',
      힌트: 상태.파일명 + ' · ' + 회,
      몸: 몸,
      발: [
        발칸,
        만들기('span', { class: 'spacer' }), 단추('닫기', 닫기),
        단추('⬇ 로젠 대량등록 파일 내려받기', function () { 내려받기(이름, 묶음id); }, 'main')
      ]
    });
  }

  function 내려받기(이름, 묶음id) {
    var 수 = ZG.로젠파일.내보내기(상태.항목들, 이름, { 묶음id: 묶음id });
    if (!수) { u.토스트('로젠 파일에 넣을 줄이 없습니다.'); return; }
    u.토스트(수 + '줄을 내려받았습니다 — 출력번호를 동봉카드와 맞춰 두었습니다.');
    if (ZG.주문 && ZG.주문.다시그리기) ZG.주문.다시그리기();
  }

  ZG.주문올리기 = {
    열기: 열기, 닫기: 닫기,
    머리읽기: 머리읽기, 읽기결과: 읽기결과, 코드정규화: 코드정규화,
    칸이름들: function () { return 칸이름.slice(); },   // 08j 가 27칸 자리표를 세울 때 쓴다
    옵션입수: 옵션입수, 우편정규화: 우편정규화, 날짜만들기: 날짜만들기, 중복키: 중복키
  };
})(window.ZG);
