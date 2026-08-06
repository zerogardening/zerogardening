/* 09-동봉카드 — 주문 건마다 한 장씩, 담긴 식물의 돌보는 법을 적어 넣는 카드 (시안 09-동봉카드.html)
   받는 분·송장번호·하단 영문 워드마크는 넣지 않는다(2026-08-05 우람님 확정).
   한 장은 A4 세로 한 장이고 식물 여섯 종까지, 넘으면 쪽을 나눈다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 한장 = 6;

  /* 그리는 차례 — 크기 정보가 먼저다(우람님 확정). 값이 빈 줄은 아예 그리지 않는다.
     [키, 아이콘, 보일 이름, 한 줄 통째로 쓸지] */
  var 라벨들 = [
    ['최대높이', '↕', '최대 높이'], ['최대너비', '↔', '최대 너비'], ['내한성', '❄', '내한성'],
    ['물주기', '💧', '물 주기'], ['햇빛', '☀', '일조량'], ['개화기', '🌸', '개화기'],
    ['관리특이사항', '📝', '특이사항', true]
  ];
  var 단위 = { 최대높이: 'cm', 최대너비: 'cm' };

  /* ── 기본값 ── 저장된 설정이 없으면(첫 실행) 이 값이 그대로 쓰인다.
     안내 말씀은 칸이 남는 1~3종은 긴 글, 빽빽한 4종부터는 줄인 글이다(시안 그대로).
     프리셋에 짧은글이 비어 있으면 긴 글 하나를 양쪽에 쓴다 — 상한이 알아서 자른다.
     🔴 A4 한 장을 넘기면 글이 잘림 표시도 없이 사라진다. 그래서 상한으로 미리 자른다.
     숫자는 종수별로 브라우저에서 한 자씩 늘려 가며 넘치기 직전 값을 잰 것이다(2026-08-05).
     3종은 칸 최소높이를 낮춘 뒤(주문.css .cp-plants.n3) 다시 재어 58 → 110 으로 올렸다 */
  var 기본설정 = {
    태그라인: '가드닝, 처음이어도 괜찮아요. 제로에서 같이 시작해요.',
    인사: '구매해주셔서 감사합니다',
    인사아래: '정성껏 키운 식물이 잘 도착했길 바랍니다.',
    선택프리셋: '기본',
    프리셋들: [
      {
        // 설정 기능이 생기기 전에 카드에 박혀 있던 문구이자 옛 app.html 의 「계절·날씨 안내」다. 같은 글이라 하나로 둔다
        id: '기본', 내장: true, 이름: '🌤️ 계절·날씨 안내',
        내용: '온도가 급변하는 환절기에는 식물도 스트레스를 받습니다. 겨울철에는 5℃ 이하로 떨어지지 않도록 실내 월동을 권장드리며, 한여름 직사광선이 강한 시간대(오전 11시~오후 3시)는 피해주세요. 흙이 마르는 속도는 계절·환경에 따라 다르니 손가락으로 흙을 짚어보고 마른 정도를 확인한 뒤 물을 주시면 됩니다.',
        짧은내용: '겨울철에는 5℃ 이하로 떨어지지 않도록 실내 월동을 권장드립니다. 흙이 마르는 속도는 계절·환경에 따라 다르니 손가락으로 짚어보고 마른 정도를 확인한 뒤 물을 주세요.'
      },
      {
        id: '리뷰', 내장: true, 이름: '⭐ 리뷰 안내', 짧은내용: '',
        내용: '식물이 마음에 드셨다면 잠깐 시간 내어 리뷰 한 줄 남겨주시면 큰 힘이 됩니다 :) 키우시다 궁금한 점이나 부족한 부분이 있으시면 언제든 편하게 연락주세요. 감사합니다.'
      }
    ],
    특이사항상한: { 1: 800, 2: 230, 3: 110, 4: 225, 5: 155, 6: 124 },
    안내말씀상한: { 긴글: 185, 짧은글: 122 }
  };

  /* 저장된 것만 덮어쓴다. 새 항목이 늘어도 옛 저장값이 그대로 살아 있게 한다 */
  function 설정읽기() {
    var 저 = ZG.저장소.동봉카드설정읽기() || {};
    var s = {
      태그라인: 저.태그라인 != null ? 저.태그라인 : 기본설정.태그라인,
      인사: 저.인사 != null ? 저.인사 : 기본설정.인사,
      인사아래: 저.인사아래 != null ? 저.인사아래 : 기본설정.인사아래,
      선택프리셋: 저.선택프리셋 || 기본설정.선택프리셋,
      프리셋들: (저.프리셋들 && 저.프리셋들.length) ? 저.프리셋들 : 기본설정.프리셋들.slice(),
      특이사항상한: Object.assign({}, 기본설정.특이사항상한, 저.특이사항상한 || {}),
      안내말씀상한: Object.assign({}, 기본설정.안내말씀상한, 저.안내말씀상한 || {})
    };
    return s;
  }

  function 고른프리셋(s) {
    var 것 = s.프리셋들.filter(function (p) { return p.id === s.선택프리셋; })[0];
    return 것 || s.프리셋들[0] || 기본설정.프리셋들[0];
  }

  function 안내글(s, 종수) {
    var p = 고른프리셋(s);
    if (종수 <= 3) return 자르기(String(p.내용 || ''), s.안내말씀상한.긴글);
    return 자르기(String(p.짧은내용 || p.내용 || ''), s.안내말씀상한.짧은글);
  }

  function 자르기(글, 상한) {
    return 글.length > 상한 ? 글.slice(0, 상한 - 1) + '…' : 글;
  }

  /* 특성은 품목에 붙어 있다. 그 규격에 없으면 같은 접두(같은 식물)의 다른 규격 것을 쓴다 */
  function 특성찾개() {
    var 품목 = ZG.저장소.품목들();
    return function (코드) {
      if (!코드) return null;
      var 딱 = 품목.filter(function (p) { return p.품목코드 === 코드 && p.특성; })[0];
      if (딱) return 딱.특성;
      var 접두 = String(코드).slice(0, 5);
      var 곁 = 품목.filter(function (p) { return p.접두 === 접두 && p.특성; })[0];
      return 곁 ? 곁.특성 : null;
    };
  }

  /* 한 건 안에 같은 품목이 두 줄이어도 카드에는 한 칸이다 */
  function 식물들(g, 특성) {
    var 순서 = [], 본것 = {};
    g.줄들.forEach(function (r) {
      // 산 것과 서비스가 같은 품목이면 서비스 쪽이 묻혀 버린다 — 키를 나눠 둘 다 남긴다 (6단계 설계 §2-6)
      var 키 = (r.품목코드 || r.유통명) + (r.서비스 ? '@s' : '');
      if (본것[키]) return;
      본것[키] = 1;
      순서.push({
        유통명: r.유통명 || r.원본코드 || '(품목 없음)', 학명: r.학명 || '',
        서비스: !!r.서비스, 특성: 특성(r.품목코드)
      });
    });
    return 순서;
  }

  /* 「Zone 5 (-28.9℃)」처럼 괄호가 붙은 값은 괄호를 버리고 아랫줄 작은 글씨로 내린다(우람님 확정).
     괄호째 한 줄로 두면 줄 중간에서 갈라져 읽기 나빴다 */
  function 값넣기(칸, 값) {
    var 쪼갬 = /^(.*?)\s*[（(]([^)）]+)[)）]\s*$/.exec(값);
    if (!쪼갬) { 칸.textContent = 값; return; }
    칸.textContent = 쪼갬[1];
    칸.appendChild(만들기('small', { text: 쪼갬[2] }));
  }

  function 식물칸(식물, 종수, s) {
    var 특 = 식물.특성 || {};
    var 줄들 = [];
    라벨들.forEach(function (쌍) {
      var 값 = String(특[쌍[0]] == null ? '' : 특[쌍[0]]).trim();
      if (!값) return;
      if (쌍[0] === '관리특이사항') 값 = 자르기(값, Number(s.특이사항상한[종수]) || 124);
      var 숫자값 = false;
      // 「60~90」처럼 숫자만 든 크기 값에만 단위를 붙인다. 붙인 단위는 값과 갈라지면 안 된다
      if (단위[쌍[0]] && /^[\d~\-–\s.]+$/.test(값)) { 값 += 단위[쌍[0]]; 숫자값 = true; }
      var 값칸 = 만들기('span', { class: 'v' + (숫자값 ? ' num' : '') });
      값넣기(값칸, 값);
      // 한 줄 통째로 쓰는 항목(특이사항)은 라벨을 넣지 않는다 — 아이콘과 본문만 (2026-08-05 우람님)
      var 조각 = [만들기('i', { text: 쌍[1] })];
      if (!쌍[3]) 조각.push(만들기('span', { class: 'l', text: 쌍[2] }));
      조각.push(값칸);
      줄들.push(만들기('div', { class: 't' + (쌍[3] ? ' wide' : '') }, 조각));
    });
    return 만들기('div', { class: 'plant' }, [
      만들기('div', { class: 'ph' }, [
        만들기('span', { class: 'nm' }, [
          document.createTextNode(식물.유통명),
          식물.서비스 ? 만들기('span', { class: 'svc', text: '서비스' }) : null
        ]),
        만들기('span', { class: 'sci', text: 식물.학명 })
      ]),
      만들기('div', { class: 'traits' }, 줄들)
    ]);
  }

  function 판만들기(식물묶음, 번호, 쪽, 총쪽, s) {
    s = s || 설정읽기();
    var 종수 = Math.min(식물묶음.length, 한장);
    var 제목 = '🌿 정원식물 관리카드' + (총쪽 > 1 ? ' (' + 쪽 + '/' + 총쪽 + ')' : '');

    var 로고 = 만들기('img', { src: 'img/카드로고1.png', alt: '제로가드닝' });

    return 만들기('div', { class: 'encardframe' }, [만들기('div', { class: 'encard' }, [
      만들기('div', { class: 'cp-head' }, [
        만들기('div', { class: 'lg' }, [로고]),
        만들기('div', { class: 'tag', text: s.태그라인 })
      ]),
      만들기('div', { class: 'cp-title', text: 제목 }),
      // 종수가 배치를 정한다 (주문.css .cp-plants.n*)
      만들기('div', { class: 'cp-plants n' + 종수 }, 식물묶음.map(function (식물) { return 식물칸(식물, 종수, s); })),
      만들기('div', { class: 'cp-gap' }),
      만들기('div', { class: 'cp-bottom' }, [
        만들기('div', { class: 'thanks', text: s.인사 }, [만들기('small', { text: s.인사아래 })]),
        만들기('div', { class: 'memo' }, [
          만들기('div', { class: 't', text: '💌 안내 말씀' }),
          만들기('p', { text: 안내글(s, 종수) })
        ])
      ]),
      만들기('div', { class: 'enno', text: String(번호) })   // 몇 번째 묶음인지. 숫자만 적는다
    ])]);
  }

  function 판들만들기(건들) {
    var 특성 = 특성찾개();
    var s = 설정읽기();
    var 판들 = [];
    건들.forEach(function (g, i) {
      var 것들 = 식물들(g, 특성);
      if (!것들.length) return;
      var 총쪽 = Math.ceil(것들.length / 한장);
      for (var 쪽 = 1; 쪽 <= 총쪽; 쪽++) {
        판들.push(판만들기(것들.slice((쪽 - 1) * 한장, 쪽 * 한장), i + 1, 쪽, 총쪽, s));
      }
    });
    return 판들;
  }

  /* ── 창 ── 출고리스트 창과 같은 틀이다(주문.css 의 body.인쇄중 규칙을 그대로 탄다) */
  /* Esc 는 u.탈출걸기 한 자리에서만 받는다 — 닫기창()이 그 자리를 비운다 */
  function 닫기() { ZG.주문입력.닫기창(); }

  var 마지막건들 = null;   // 설정을 고치고 돌아왔을 때 보던 카드를 그대로 다시 그리려고 들고 있는다

  function 열기(건들) {
    if (!건들 || !건들.length) { u.토스트('카드를 만들 주문이 없습니다.'); return; }
    var 판들 = 판들만들기(건들);
    if (!판들.length) { u.토스트('카드에 넣을 품목이 없습니다.'); return; }
    마지막건들 = 건들;

    ZG.주문입력.닫기창();
    var 막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', 닫기);

    var 인쇄 = 만들기('button', { class: 'btn sm main', type: 'button', text: '🖨 인쇄' });
    인쇄.addEventListener('click', function () { window.print(); });
    var 수동 = 만들기('button', { class: 'btn sm', type: 'button', text: '✎ 수동 카드', title: '주문 없이 품목만 골라 카드 만들기' });
    수동.addEventListener('click', function () { ZG.카드설정.수동창(); });
    var 설정 = 만들기('button', { class: 'btn sm', type: 'button', text: '⚙', 'aria-label': '동봉카드 설정' });
    설정.addEventListener('click', function () { ZG.카드설정.설정창(); });
    var 닫기버튼 = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '닫기' });
    닫기버튼.addEventListener('click', 닫기);

    /* '카드' — 출고리스트 창과 구분하는 표식. 이 창에서만 손가락 확대를 푼다(공통.css 맨 위) */
    var 창 = 만들기('div', { class: 'pcsheet 카드', role: 'dialog', 'aria-modal': 'true' }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: '동봉카드' }),
        만들기('span', { class: 'hint', text: 건들.length + '건 · ' + 판들.length + '장' }),
        만들기('span', { class: 'right' }, [수동, 설정, 인쇄, 닫기버튼])
      ]),
      만들기('div', { class: 'bd' }, 판들)
    ]);
    document.body.appendChild(막);
    document.body.appendChild(창);
    document.body.classList.add('인쇄중');
    u.탈출걸기(닫기);
    setTimeout(function () { 닫기버튼.focus(); }, 20);
  }

  /* 수동으로 고른 품목을 「건」 모양으로 맞춰 같은 길로 태운다 (08c 품목카드묶음의 읽기() 결과) */
  function 수동열기(품목들) {
    if (!품목들 || !품목들.length) { u.토스트('품목을 하나 이상 골라 주세요.'); return false; }
    var 건 = {
      줄들: 품목들.map(function (st) {
        return { 품목코드: st.접두 + '-' + st.cm, 유통명: st.유통명, 학명: st.학명, 주문수량: st.수량 };
      })
    };
    열기([건]);
    return true;
  }

  /* 설정 창에서 저장한 뒤 보던 카드로 돌아온다 */
  function 다시열기() {
    if (마지막건들 && 마지막건들.length) { 열기(마지막건들); return true; }
    return false;
  }

  ZG.동봉카드 = { 열기: 열기, 수동열기: 수동열기, 다시열기: 다시열기, 기본설정: 기본설정, 설정읽기: 설정읽기 };
})(window.ZG);
