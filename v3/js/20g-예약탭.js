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
  var 판 = { 거름: '', 주소: null, 사본: null, 방금: {}, 송장: {} };

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
  function 빈곳(v) { return !String(v || '').trim(); }
  // 원본 줄은 사람이 줄마다 있다 — 한 줄이라도 비면 그 줄은 주소 없이 주문탭에 선다
  function 원본빔(r) { return r.원본줄들.some(function (o) { return 빈곳(o.수령인) || 빈곳(o.수령인주소); }); }
  function 지금올리기(r, 다시) {
    function 보냄() {
      var 답 = 예().올리기(r.id);
      if (답.오류) { u.토스트(답.오류); return; }
      u.토스트('주문탭으로 올렸습니다' + (답.번호 ? ' — ' + 답.번호 : ''));
      다시();
    }
    function 올림() {
      자().잠금풀기(r.id);
      // 못 올라감과 같은 기준(사유) — 받는 분이나 주소가 비면 판에서 적고 올린다
      if (!r.원본줄들 && (빈곳(r.받는분) || !자().온주소(r))) { 주소열기(r, 다시); return; }
      // 원본 줄은 고칠 판이 없다 — 막으면 영영 못 올리니 묻고 올린 뒤 주문탭에서 고친다
      if (r.원본줄들 && 원본빔(r)) {
        u.확인({ 제목: '지금 올리기', 확인글: '올리기',
          본문: '원본 주문에 받는 분 주소가 비어 있습니다.' + (u.폰인가() ? '<br>' : ' ') + '주소 없이 올릴까요?' },
          function (했다) { if (했다) 보냄(); });
        return;
      }
      보냄();
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
  /* 특이사항 메모가 있으면 이름 뒤 ★ — 눌러 볼 것 없이 손님 이름에서 바로 보이게 (10/20 우람님) */
  function 이름(r) {
    var 메모 = String(r.메모 || '').trim(), 글 = 자().제목(r).글;
    var e = 만들기('b', { class: 'nm', text: 메모 && 글 !== 메모 ? 글 + ' ★' : 글 });
    if (메모) e.title = 메모;
    return e;
  }
  /* 카드(줄)를 누르거나 [고치기] — 이 자리에서 문자주문 고침 판(20c)을 편다. 저장은 확인창 뒤 (10/23 우람님) */
  function 고치기(r) { ZG.문자주문.예약열기(r.id); }
  function 펼침(r) { return ZG.문자주문.예약열림(r.id); }
  function 누르면펼침(e, r) {
    e.style.cursor = 'pointer';
    e.addEventListener('click', function () { 고치기(r); });
    return e;
  }
  function 끝단추들(r, 못, 다시) {
    return [
      못 && !r.원본줄들 ? 단추('주소 입력', 'sm', function () { 주소열기(r, 다시); }) : null,
      단추(펼침(r) ? '접기' : '고치기', 'sm', function () { 고치기(r); }),
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
      누르면펼침(만들기('div', { class: 'r1' }, [이름(r), dd]), r),
      누르면펼침(만들기('div', { class: 'ds', text: 품글(r) }), r),
      누르면펼침(만들기('div', { class: 'r3' }, [만들기('span', { class: 'amt', text: 금액(r) }),
        r.예약일 && !못 ? 만들기('span', { class: 'dt', html: '예약일 <b>' + 날요일(r.예약일) + '</b>' }) : null]), r)
    ]);
    if (사) 카드.appendChild(경고(사.긴));
    if (!r.예약일) 카드.appendChild(날짜줄(r, 다시, true));
    카드.appendChild(만들기('div', { class: 'r4' }, [못 ? null : 자동표(r, true)].concat(끝단추들(r, 못, 다시))));
    if (판.주소 === r.id) 카드.appendChild(주소판(r, true, 다시));
    if (펼침(r)) 카드.appendChild(ZG.문자주문.예약판(r.id, true));
    return 카드;
  }

  /* ── PC 줄 (시안 PC ①) — 7칸 격자 ── */
  function PC줄(r, 못, 다시) {
    var 사 = 못 ? 예().사유(r) : null;
    var 칸들 = [
      이름(r),
      만들기('span', { class: 'it', text: 품글(r) }),
      만들기('span', { class: 'am', text: 금액(r) })
    ];
    if (r.예약일) {
      칸들.push(만들기('span', { class: 'dt', text: 날요일(r.예약일) }));
      칸들.push(만들기('span', { class: 'dd' + (못 ? ' rd' : ''), text: 못 ? '지남' : 예().D글(r.예약일) }));
    } else 칸들.push(만들기('span', { class: 'dt wd' }, [날짜줄(r, 다시, false)]));
    칸들.push(만들기('span', { class: 'au' }, [사 ? 경고(사.짧은) : 자동표(r, false)]));
    칸들.push(만들기('span', { class: 'bn' }, 끝단추들(r, 못, 다시)));
    var 줄 = [누르면펼침(만들기('div', { class: 'tr' + (못 ? ' bad' : '') + (판.방금[r.id] ? ' 방금' : '') }, 칸들), r)];
    if (판.주소 === r.id) 줄.push(만들기('div', { class: '판줄' }, [주소판(r, false, 다시)]));
    if (펼침(r)) 줄.push(만들기('div', { class: '판줄' }, [ZG.문자주문.예약판(r.id, false)]));
    return 줄;
  }
  var 머리글 = ['받는 분', '품목', '금액', '예약일', 'D-n', '자동 올라감', ''];

  /* ── 공통 — 칩 · 구역 ── */
  function 칩줄(구, 다시, 폰) {
    // 📦 예약 발송은 맨 앞 — 폰 390 에서 칩이 넘쳐 끝에 두면 안 보인다
    var 쌍들 = [['발송', '📦 예약 발송', 발송목록().보낼.length], ['', '전체', 구.못.length + 구.지정.length + 구.미정.length], ['지정', '예약일 지정', 구.지정.length],
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
  /* ══ 📦 예약 발송 (10/28 우람님) — 주문탭에 올라간 예약을 한 곳에 모아 송장 넣고 배송완료.
     배송완료 = (로젠으로 아직 안 나갔으면) 08f 관문 거친 수동 출고 + 손송장 + 문자주문 「발송문자 보냄」 표시.
     예약은 수동·문자 주문뿐이다(20e 넘길수있나) — 마켓 주문은 여기 안 온다 */
  var 이레 = 7 * 86400000;
  function 발송목록() {
    var 다 = 자().전부().filter(function (r) { return r.예약 === true && r.상태 === '올림'; }), 이제 = Date.now();
    function 순(a, b) { return String(a.예약일 || '').localeCompare(String(b.예약일 || '')) || String(a.받는분 || '').localeCompare(String(b.받는분 || '')); }
    return {
      보낼: 다.filter(function (r) { return !r.발송문자보냄일시; }).sort(순),
      끝: 다.filter(function (r) { return r.발송문자보냄일시 && 이제 - r.발송문자보냄일시 < 이레; }).sort(순)
    };
  }
  function 송장들(글) { return String(글 || '').split(/[\s,]+/).map(자().숫자만).filter(Boolean); }
  function 배송완료(r, 다시) {
    var 값 = 송장들(판.송장[r.id] != null ? 판.송장[r.id] : 자().발송정보(r).송장.join(' '));
    if (!값.length) { u.토스트('송장번호를 넣어 주세요'); return; }
    var 정보 = 자().발송정보(r), B = ZG.배송완료, 색인 = B.색인만들기();
    var 넘길 = 정보.됨 ? [] : B.넘길줄만(자().지울줄(r), 색인).넘길;
    if (!정보.됨 && !넘길.length) { u.토스트('넘길 줄이 없습니다 — 품목코드·보류를 확인하세요'); return; }
    u.확인({
      제목: '배송완료', 확인글: '배송완료',
      본문: '<b>' + u.안전(자().제목(r).글) + '</b> · 송장 ' + u.안전(값.join(', ')) +
        (정보.됨 ? '' : '<br>재고가 그만큼 줄어듭니다') + '<br>문자주문은 「발송문자 보냄」으로 바뀝니다'
    }, function (했다) {
      if (!했다) return;
      if (넘길.length) B.출고넣기(넘길, u.오늘문자(), 색인, { 수동: true, 배치: B.새배치(), 운송장번호: 값[0] });
      자().손송장저장(r.id, 값);
      자().발송문자표시(r.id);
      delete 판.송장[r.id];
      u.토스트('배송완료 · ' + (r.받는분 || ''));
      다시();
    });
  }
  function 발송카드(r, 끝, 다시) {
    var 정보 = 자().발송정보(r);
    var 칸 = 만들기('input', { class: 'inp', type: 'text', inputmode: 'numeric', placeholder: '송장번호', 'aria-label': '송장번호',
      value: 판.송장[r.id] != null ? 판.송장[r.id] : 정보.송장.join(' ') });
    칸.addEventListener('input', function () { 판.송장[r.id] = 칸.value; });
    if (끝) 칸.readOnly = true;
    var 표 = 끝 ? 만들기('span', { class: 'atag', text: '문자 보내기 완료 ' + ZG.계산.날짜문자(r.발송문자보냄일시).slice(5).replace('-', '/') })
      : 정보.됨 ? 만들기('span', { class: 'atag gr', text: '로젠 배송완료됨' }) : null;
    return 만들기('div', { class: 'rc 발송' + (끝 ? ' und' : '') }, [
      만들기('div', { class: 'r1' }, [이름(r), r.예약일 ? 만들기('span', { class: 'dd' + (끝 ? ' gr' : ''), text: '예약 ' + 짧은날(r.예약일) }) : null]),
      만들기('div', { class: 'ds', text: 품글(r) + ' · ' + 금액(r) }),
      만들기('div', { class: '날짜줄' }, [칸, 끝 ? null : 단추('배송완료', 'main', function () { 배송완료(r, 다시); })]),
      표 ? 만들기('div', { class: 'r4' }, [표]) : null
    ]);
  }
  function 발송그리기(판칸, 다시) {
    var 목 = 발송목록();
    if (!목.보낼.length && !목.끝.length) { 판칸.appendChild(만들기('div', { class: '빈', text: '주문탭에 올라간 예약이 없습니다' })); return; }
    [['보낼 것', 목.보낼, false], ['보낸 것 (7일)', 목.끝, true]].forEach(function (쌍) {
      if (!쌍[1].length) return;
      판칸.appendChild(구역머리(쌍[0], 쌍[1].length));
      쌍[1].forEach(function (r) { 판칸.appendChild(발송카드(r, 쌍[2], 다시)); });
    });
  }

  function 그리기(칸, 폰, 다시) {
    if (판.거름 === '발송') {
      var 발 = 만들기('div', { class: '예약탭 발송판' + (폰 ? ' 폰' : ' PC') }, [칩줄(구역들(), 다시, 폰)]);
      발송그리기(발, 다시);
      칸.appendChild(발);
      return;
    }
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
