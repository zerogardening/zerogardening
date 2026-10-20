/* 20g-예약탭 — 주문탭 상태 하위탭 「예약」 (26단계 설계 · 시안 26). 자료·자동 올림은 20e, 받는 분 판은 20d 것을 쓴다.
   시안의 .rc .nm .dd .st 가 흔한 이름이라 CSS 는 .예약탭 아래에 가둔다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 요일 = ['일', '월', '화', '수', '목', '금', '토'];
  function 자() { return ZG.문자주문자료; }
  function 예() { return ZG.예약자료; }
  // 주소 = 받는 분 판을 연 줄 id · 사본은 다시 그려도 치던 값이 남게 여기 둔다 (20c 와 같은 까닭)
  var 판 = { 거름: '', 주소: null, 사본: null, 방금: {} };

  var 시계 = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="12" r="9"/><path d="M12 7v5l3 2"/></svg>';
  var 세모 = '<svg class="ico" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M12 3 2.5 20h19Z"/><path d="M12 10v4.5M12 17.5v.01"/></svg>';

  function 짧은날(날) { return Number(날.slice(5, 7)) + '/' + Number(날.slice(8, 10)); }
  function 날요일(날) {
    var d = new Date(+날.slice(0, 4), +날.slice(5, 7) - 1, +날.slice(8, 10));
    return 짧은날(날) + ' (' + (날 === u.오늘문자() ? '오늘' : 요일[d.getDay()]) + ')';
  }
  function 품글(r) { return (r.품목 || []).map(function (p) { return p.유통명 + ' ' + u.콤마(p.수량); }).join(' · '); }
  function 금액(r) { return u.콤마(자().합계(r).합) + '원'; }
  function 단추(글, 결, 누름) {
    var b = 만들기('button', { class: 'btn ' + 결, type: 'button', text: 글 });
    b.addEventListener('click', function (e) { e.stopPropagation(); 누름(); });
    return b;
  }

  function 구역들() {
    var 목 = 예().예약목록();
    return {
      못: 목.지정.filter(예().사유),
      지정: 목.지정.filter(function (r) { return !예().사유(r); }),
      미정: 목.미정
    };
  }
  function 수() { var 목 = 예().예약목록(); return 목.지정.length + 목.미정.length; }

  /* ── 줄 동작 ── */
  function 주소열기(r, 다시) {
    판.주소 = r.id;
    판.사본 = { 받는분: r.받는분 || '', 전화: 자().전화모양(r.전화), 주소: r.주소 || '', 상세주소: r.상세주소 || '',
               우편: r.우편 || '', 배송메시지: r.배송메시지 || '' };
    ['원문주소', '주소확인'].forEach(function (k) { if (k in r) 판.사본[k] = r[k]; });
    다시();
  }
  function 주소판(r, 폰, 다시) {
    return 만들기('div', { class: '문자주문 주소자리' }, [
      ZG.문자주문올리기.판(r, 판.사본, 폰, function () { 판.주소 = null; 판.사본 = null; 다시(); })
    ]);
  }
  function 지금올리기(r, 다시) {
    function 올림() {
      자().잠금풀기(r.id);
      // 받는 분 없이는 주문 줄을 못 짓는다 — 판에서 적고 올린다. 원본 줄은 사람이 원본에 있다
      if (!r.원본줄들 && !String(r.받는분 || '').trim()) { 주소열기(r, 다시); return; }
      var 답 = 예().올리기(r.id);
      if (답.오류) { u.토스트(답.오류); return; }
      u.토스트('주문탭으로 올렸습니다' + (답.번호 ? ' — ' + 답.번호 : ''));
      다시();
    }
    if (!r.예약일 || 예().때됨(r.예약일)) { 올림(); return; }
    u.확인({
      제목: '지금 올리기', 확인글: '올리기',
      본문: '<span class="예약누구"><b>' + u.안전(자().제목(r).글) + '</b> · ' + u.안전(품글(r)) + ' · ' + 금액(r) + '</span>' +
        '예약일 <b class="예약날">' + 짧은날(r.예약일) + '</b> 전입니다.' + (u.폰인가() ? '<br>' : ' ') + '지금 주문탭으로 올릴까요?'
    }, function (했다) { if (했다) 올림(); });
  }
  function 날짜줄(r, 다시, 폰) {
    var 칸 = 만들기('input', { class: 'inp', type: 'date', min: u.오늘문자(), 'aria-label': '예약일' });
    칸.addEventListener('click', function (e) { e.stopPropagation(); });
    var 저장 = 단추(폰 ? '날짜 저장' : '저장', 폰 ? '' : 'sm', function () {
      if (!칸.value) { u.토스트('예약일을 골라 주세요'); return; }
      // 🔴 고치기는 넘긴 칸으로 줄을 다시 짓는다 — 예약일만 넘기면 받는 분·품목이 지워진다
      if (!자().고치기(r.id, Object.assign({}, r, { 예약: true, 예약일: 칸.value }))) { u.토스트('저장하지 못했습니다'); return; }
      u.토스트('예약일 ' + 짧은날(칸.value) + ' 저장');
      다시();
      if (예().때됨(칸.value)) 자동();
    });
    return 만들기('div', { class: '날짜줄' }, [칸, 저장]);
  }
  function 끝단추들(r, 못, 다시) {
    return [
      못 && !r.원본줄들 ? 단추('주소 입력', 'sm', function () { 주소열기(r, 다시); }) : null,
      단추('지금 올리기', 'sm main', function () { 지금올리기(r, 다시); })
    ];
  }
  function 자동표(r, 폰) {
    if (r.예약일) return 만들기('span', { class: 'atag', html: 시계 + '예약일에 자동으로 올라감' });
    return 만들기('span', { class: 'atag gr', text: 폰 ? '날짜 정해야 자동으로 올라감' : '날짜 정해야 자동' });
  }
  function 경고(글) { return 만들기('span', { class: 'wmsg', html: 세모 + u.안전(글) }); }

  /* ── 폰 카드 (시안 ①) ── */
  function 폰카드(r, 못, 다시) {
    var 사 = 못 ? 예().사유(r) : null;
    var dd = 못 ? 만들기('span', { class: 'dd rd', text: '예약일 ' + 날요일(r.예약일) })
      : r.예약일 ? 만들기('span', { class: 'dd', text: 예().D글(r.예약일) }) : 만들기('span', { class: 'dd gr', text: '날짜 미정' });
    var 카드 = 만들기('div', { class: 'rc' + (못 ? ' bad' : r.예약일 ? '' : ' und') + (판.방금[r.id] ? ' 방금' : '') }, [
      만들기('div', { class: 'r1' }, [만들기('b', { class: 'nm', text: 자().제목(r).글 }), dd]),
      만들기('div', { class: 'ds', text: 품글(r) }),
      만들기('div', { class: 'r3' }, [만들기('span', { class: 'amt', text: 금액(r) }),
        r.예약일 && !못 ? 만들기('span', { class: 'dt', html: '예약일 <b>' + 날요일(r.예약일) + '</b>' }) : null])
    ]);
    if (사) 카드.appendChild(경고(사.긴));
    if (!r.예약일) 카드.appendChild(날짜줄(r, 다시, true));
    카드.appendChild(만들기('div', { class: 'r4' }, [못 ? null : 자동표(r, true)].concat(끝단추들(r, 못, 다시))));
    if (판.주소 === r.id) 카드.appendChild(주소판(r, true, 다시));
    return 카드;
  }

  /* ── PC 줄 (시안 PC ①) — 7칸 격자 ── */
  function PC줄(r, 못, 다시) {
    var 사 = 못 ? 예().사유(r) : null;
    var 칸들 = [
      만들기('b', { class: 'nm', text: 자().제목(r).글 }),
      만들기('span', { class: 'it', text: 품글(r) }),
      만들기('span', { class: 'am', text: 금액(r) })
    ];
    if (r.예약일) {
      칸들.push(만들기('span', { class: 'dt', text: 날요일(r.예약일) }));
      칸들.push(만들기('span', { class: 'dd' + (못 ? ' rd' : ''), text: 예().D글(r.예약일) }));
    } else 칸들.push(만들기('span', { class: 'dt wd' }, [날짜줄(r, 다시, false)]));
    칸들.push(만들기('span', { class: 'au' }, [사 ? 경고(사.짧은) : 자동표(r, false)]));
    칸들.push(만들기('span', { class: 'bn' }, 끝단추들(r, 못, 다시)));
    var 줄 = [만들기('div', { class: 'tr' + (못 ? ' bad' : '') + (판.방금[r.id] ? ' 방금' : '') }, 칸들)];
    if (판.주소 === r.id) 줄.push(만들기('div', { class: '판줄' }, [주소판(r, false, 다시)]));
    return 줄;
  }
  var 머리글 = ['받는 분', '품목', '금액', '예약일', 'D-n', '자동 올라감', ''];

  /* ── 공통 — 칩 · 구역 ── */
  function 칩줄(구, 다시, 폰) {
    var 쌍들 = [['', '전체', 구.못.length + 구.지정.length + 구.미정.length], ['지정', '예약일 지정', 구.지정.length],
               ['미정', '날짜 미정', 구.미정.length], ['못', '못 올라감', 구.못.length]];
    return 만들기('div', { class: 'fchips' + (폰 ? ' 칩넘침' : '') }, 쌍들.map(function (쌍) {
      var b = 만들기('button', { type: 'button', class: 'fchip' + (쌍[0] === '못' ? ' wc' : '') + (판.거름 === 쌍[0] ? ' on' : ''),
        html: 쌍[1] + '<span class="n">' + 쌍[2] + '</span>' });
      b.addEventListener('click', function () { 판.거름 = 쌍[0]; 판.방금 = {}; 다시(); });
      return b;
    }));
  }
  function 구역머리(글, n, 빨강) {
    return 만들기('div', { class: 'hsec' + (빨강 ? ' rd' : ''), html: 글 + ' <i>' + n + '</i>' });
  }
  function 그리기(칸, 폰, 다시) {
    var 구 = 구역들(), 보일 = [['못', '못 올라감', 구.못], ['지정', '예약일 지정', 구.지정], ['미정', '날짜 미정', 구.미정]]
      .filter(function (쌍) { return 쌍[2].length && (!판.거름 || 판.거름 === 쌍[0]); });
    var 판칸 = 만들기('div', { class: '예약탭' + (폰 ? ' 폰' : ' PC') });
    if (!폰) 판칸.appendChild(만들기('div', { class: '머리' }, [칩줄(구, 다시, 폰),
      만들기('span', { class: 'sum', html: '전체 <b>' + 수() + '</b>건 · 오늘 자동으로 올라감 <b>' + 예().오늘자동수() + '</b>건' })]));
    else 판칸.appendChild(칩줄(구, 다시, 폰));
    if (!보일.length) 판칸.appendChild(만들기('div', { class: '빈', text: '예약 주문이 없습니다' }));
    var 줄들 = [];
    보일.forEach(function (쌍) {
      var 못 = 쌍[0] === '못';
      if (폰) {
        판칸.appendChild(구역머리(쌍[1], 쌍[2].length, 못));
        쌍[2].forEach(function (r) { var c = 폰카드(r, 못, 다시); 판칸.appendChild(c); 줄들.push(c); });
        return;
      }
      var 상자 = 만들기('div', { class: 'tbox' }, [구역머리(쌍[1], 쌍[2].length, 못),
        만들기('div', { class: 'th' }, 머리글.map(function (t) { return 만들기('span', { text: t }); }))]);
      쌍[2].forEach(function (r) { PC줄(r, 못, 다시).forEach(function (e) { 상자.appendChild(e); 줄들.push(e); }); });
      판칸.appendChild(상자);
    });
    칸.appendChild(판칸);
    u.목록등장(줄들);
  }

  /* ── 주문탭 줄의 「📅 예약에서 옴」 — 올린 뒤에도 예약 칸이 남는다 ──
     ponytail: 저장소 읽기가 매번 JSON 을 푼다 — 그리는 한 번 동안(1초) 표 하나를 같이 쓴다 */
  var 옴표 = null, 옴때 = 0;
  function 옴칩(g) {
    if (!옴표 || Date.now() - 옴때 > 1000) {
      옴표 = {}; 옴때 = Date.now();
      자().전부().forEach(function (m) { if (m.예약 === true) 옴표[m.id] = 1; });
    }
    var 옴 = g.줄들.some(function (o) { return o.문자주문id && 옴표[o.문자주문id]; });
    return 옴 ? 만들기('span', { class: '예약옴', text: '📅 예약에서 옴' }) : null;
  }

  /* 주문탭 예약 탭으로 — 주문 → 예약 넘긴 직후면 옮긴 줄에 테두리 */
  function 보기(ids) {
    판.거름 = ''; 판.방금 = {};
    (ids || []).forEach(function (id) { 판.방금[id] = true; });
    var 상 = ZG.주문.상태;
    상.상태칩 = '예약'; 상.출고배치 = '';
    if (상.뷰 !== '목록') 상.뷰 = '목록';
    ZG.견적탭.탭으로('주문');
    ZG.주문.다시그리기();
  }

  function 자동() {
    return 예().자동올리기().then(function (답) {
      if (!답 || !답.올림) return;
      ZG.주문.다시그리기();
      u.토스트('📅 예약 ' + 답.올림 + '건이 주문탭에 올라왔습니다');
      var t = 답.못 && document.querySelector('#토스트칸 .toast:last-child');
      if (!t) return;
      t.classList.add('예약토스트');
      t.appendChild(만들기('span', { text: 답.못 + '건은 못 올라감 · 확인' }));
      t.addEventListener('click', function () { 보기(); });
    });
  }
  // 첫 내려받기 뒤에 — 받기 전 낡은 줄로 돌면 남이 이미 올린 것을 또 잡으러 간다 (서버 없으면 곧바로)
  document.addEventListener('DOMContentLoaded', function () {
    Promise.resolve(ZG.서버 && ZG.서버.준비).then(자동, 자동);
  });

  ZG.예약탭 = {
    폰: function (칸, 다시) { 그리기(칸, true, 다시); },
    PC: function (칸, 다시) { 그리기(칸, false, 다시); },
    수: 수, 옴칩: 옴칩, 보기: 보기, 자동: 자동
  };
})(window.ZG);
