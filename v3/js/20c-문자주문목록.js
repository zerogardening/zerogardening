/* 20c-문자주문목록 — 문자주문 목록 폰·PC + 이 탭의 셸 ZG.문자주문 (16단계 설계 §3 · 시안 ②③).
   널서리 08-출고 이력화면을 옮겼다 — 달력 · 검색(모든 날짜) · 펼쳐 고치기 · 쓸어서 삭제.
   🔴 남이 저장해 다시 그려져도 펼친 줄과 고치던 값이 날아가지 않게 상태.열린 에 사본을 든다 (§8-7). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  function 자() { return ZG.문자주문자료; }
  function 부() { return ZG.문자주문새문자; }

  var 상태 = { 뷰: '새문자', 날짜: '', 달: '', 검색: '', 열린: null, 송장고침: null };   // 열린 = { id, 종류: '고침'|'올림', 사본 } · 송장고침 = { id, 값들 }
  var 참조 = {};
  var 요일 = ['일', '월', '화', '수', '목', '금', '토'];
  var 휴지통 = '<path d="M4 7h16M10 11v6M14 11v6M5 7l1 12a2 2 0 0 0 2 2h8a2 2 0 0 0 2-2l1-12M9 7V4h6v3"/>';

  function 두자리(n) { return (n < 10 ? '0' : '') + n; }
  function 다시() { ZG.주문.다시그리기(); }
  function 날글(날짜) {
    var d = new Date(Number(날짜.slice(0, 4)), Number(날짜.slice(5, 7)) - 1, Number(날짜.slice(8, 10)));
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + 요일[d.getDay()] + ')';
  }
  function 시각(r) {
    var d = new Date(r.등록일시 || 0), 시 = 두자리(d.getHours()) + ':' + 두자리(d.getMinutes());
    return 상태.검색.trim() ? String(r.날짜).slice(5) + ' ' + 시 : 시;
  }
  function 달옮기기(달, 걸음) {
    var 해 = Number(달.slice(0, 4)), 월 = Number(달.slice(5, 7)) + 걸음;
    해 += Math.floor((월 - 1) / 12);
    월 = ((월 - 1) % 12 + 12) % 12 + 1;
    return 해 + '-' + 두자리(월);
  }

  /* ── 셸 ── */
  function 목록으로() {
    상태.뷰 = '목록'; 상태.날짜 = u.오늘문자(); 상태.달 = 상태.날짜.slice(0, 7);
    상태.검색 = ''; 상태.열린 = null; 상태.송장고침 = null;
    다시();
  }
  function 새문자로() { 상태.뷰 = '새문자'; 상태.열린 = null; 상태.송장고침 = null; 다시(); }
  // 다른 탭에서 돌아오면 새 문자부터. 담던 것은 남긴다 (널서리 나가기)
  function 나가기() { 상태.뷰 = '새문자'; 상태.열린 = null; 상태.송장고침 = null; }
  function 제목() { return '주문'; }
  function 요약() {
    if (상태.뷰 !== '목록') return { 왼: u.오늘문자(), 오: '오늘 문자 <b>' + 자().오늘보낸수() + '</b>건' };
    var 그날 = 자().거르기(상태.날짜, ''), 색 = 자().발송색인();
    var 셈 = { 저장: 0, 보냄: 0, 올림: 0, 발송완료: 0 };
    그날.forEach(function (r) {
      var 결 = r.상태 === '올림' && 자().발송정보(r, 색).됨 ? '발송완료' : r.상태;
      셈[결] = (셈[결] || 0) + 1;
    });
    return { 왼: 날글(상태.날짜) + ' · <b>' + 그날.length + '</b>건',
             오: ['저장', '보냄', '올림', '발송완료'].filter(function (k) { return 셈[k]; })
               .map(function (k) { return k + ' <b>' + 셈[k] + '</b>'; }).join(' · ') };
  }
  function 그리기(본문) {
    본문.classList.add('문자주문');
    부().글칸멈추기(참조.글칸들);
    if (상태.뷰 !== '목록') { 부().그리기(본문); return; }
    if (!상태.날짜) { 상태.날짜 = u.오늘문자(); 상태.달 = 상태.날짜.slice(0, 7); }
    참조 = {};
    if (u.폰인가()) 폰목록(본문); else PC목록(본문);
  }

  /* ── 동작 ── */
  function 열기(r, 종류) {
    if (상태.열린 && 상태.열린.id === r.id && 상태.열린.종류 === 종류 && 종류 === '고침') { 상태.열린 = null; 다시(); return; }
    var 사본 = 종류 === '올림'
      ? { 받는분: r.받는분 || '', 전화: 자().전화모양(r.전화), 주소: r.주소 || '', 상세주소: r.상세주소 || '', 우편: r.우편 || '', 배송메시지: r.배송메시지 || '' }
      : { 받는분: r.받는분 || '', 전화: 자().전화모양(r.전화), 메모: r.메모 || '', 주소: r.주소 || '', 상세주소: r.상세주소 || '', 우편: r.우편 || '',
          배송메시지: r.배송메시지 || '', 배송비: Number(r.배송비) || 0,
          품목: (r.품목 || []).map(function (p) { return Object.assign({}, p); }) };
    상태.열린 = { id: r.id, 종류: 종류, 사본: 사본 };
    다시();
  }
  function 닫기() { 상태.열린 = null; 다시(); }
  function 문자보내기(id) {
    var r = 자().보냄표시(id);
    if (!r) return;
    상태.열린 = null;
    u.토스트(u.폰인가() ? '문자앱을 엽니다' : '문자 내용을 복사했습니다');
    다시();
    자().문자열기(r.전화, 자().문자내용(r));
  }
  /* 저장이 먼저, 링크가 나중 (앞 설계 §5) — 링크를 열면 페이지가 멈출 수 있다 */
  function 발송문자보내기(id) {
    if (상태.송장고침 && 상태.송장고침.id === id) { 자().손송장저장(id, 상태.송장고침.값들); 상태.송장고침 = null; }
    var r = 자().발송문자표시(id);
    if (!r) return;
    var 정보 = 자().발송정보(r);
    u.토스트(u.폰인가() ? '문자앱을 엽니다' : '문자 내용을 복사했습니다');
    다시();
    자().문자열기(r.전화, 자().발송문자내용(r, 정보));
  }
  function 고친것저장(r) {
    부().글칸맞추기(참조.글칸들);
    var 사본 = 상태.열린.사본;
    return 자().고치기(r.id, 사본);
  }
  function 지우기(r) {
    u.확인({ 제목: '이 문자주문을 지울까요?', 본문: u.안전(자().제목(r).글), 확인글: '삭제', 위험: true }, function (했다) {
      if (!했다) return;
      if (!자().지우기(r.id)) { u.토스트('주문올림 줄은 지울 수 없습니다'); return; }
      if (상태.열린 && 상태.열린.id === r.id) 상태.열린 = null;
      u.토스트('지웠습니다');
      다시();
    });
  }
  function 단추(글, 결, 누름, 끔) {
    var b = 만들기('button', { class: 'btn' + (결 ? ' ' + 결 : ''), type: 'button', text: 글 });
    if (끔) b.disabled = true;
    b.addEventListener('click', function (e) { e.stopPropagation(); 누름(); });
    return b;
  }
  /* 펼친 판 끝줄 — 문자 · 주문올리기 · 저장 */
  function 고침단추들(r, 작게) {
    var s = 작게 ? 'sm ' : '';
    var 사본 = 상태.열린.사본;
    var 문자 = 단추('문자', s.trim(), function () { if (고친것저장(r)) 문자보내기(r.id); }, !자().문자되나(사본.전화));
    var 올림 = 단추('주문올리기', s.trim(), function () { var 새 = 고친것저장(r); if (새) 열기(새, '올림'); });
    var 저장 = 단추('저장', s + 'main', function () { if (고친것저장(r)) { 상태.열린 = null; u.토스트('저장했습니다'); 다시(); } });
    return { 문자: 문자, 올림: 올림, 저장: 저장 };
  }

  /* 펼쳐 고치기 — 사람칸·수량·단가·배송비 */
  function 항목줄(p, 폰) {
    var 금액 = 만들기('b');
    function 금액다시() { 금액.textContent = u.콤마(p.수량 * (Number(p.단가) || 0)) + '원'; }
    금액다시();
    var 수 = 부().수량칸(p.수량, function (n) { p.수량 = n; 금액다시(); });
    var 원 = 부().원칸(p.단가, function (n) { p.단가 = n; 금액다시(); });
    if (폰) {
      return 만들기('div', { class: '항목' }, [
        만들기('div', { class: 'n', text: p.유통명 + (p.규격 ? ' ' + p.규격 : '') }),
        만들기('div', { class: 'r' }, [수, 원, 금액])
      ]);
    }
    return 만들기('div', { class: '항목' }, [
      만들기('span', { class: 'n', html: u.안전(p.유통명) + ' <span class="g">' + u.안전(p.규격 || '') + '</span>' }), 수, 원, 금액
    ]);
  }
  function 배송비줄(사본, 폰) {
    var 금액 = 만들기('b');
    function 금액다시() { 금액.textContent = 사본.배송비 ? u.콤마(사본.배송비) + '원' : '—'; }
    금액다시();
    var 원 = 부().원칸(사본.배송비, function (n) { 사본.배송비 = n; 금액다시(); }, '배송비');
    if (폰) return 만들기('div', { class: '항목' }, [만들기('div', { class: 'n', text: '배송비' }), 만들기('div', { class: 'r' }, [원, 금액])]);
    return 만들기('div', { class: '항목' }, [만들기('span', { class: 'n', text: '배송비' }), 원, 금액]);
  }
  function 사람칸들(사본, 폰) {
    var 부품 = 부();
    var 칸 = {
      받는분: 부품.글칸(사본.받는분, '받는 분', function (v) { 사본.받는분 = v; }),
      전화: 부품.전화칸(사본.전화, function (v) { 사본.전화 = v; if (참조.문자단추) 참조.문자단추.disabled = !자().문자되나(v); }, 폰),
      메모: 부품.글칸(사본.메모, '메모', function (v) { 사본.메모 = v; }),
      배송메시지: 부품.글칸(사본.배송메시지, '배송메시지', function (v) { 사본.배송메시지 = v; }),
      곳: 부품.주소칸(사본)
    };
    참조.글칸들 = [칸.받는분, 칸.메모, 칸.배송메시지].concat(칸.곳.칸들);
    return 칸;
  }
  function 고침판(r, 폰) {
    var 사본 = 상태.열린.사본, 밭 = 부().밭, 칸 = 사람칸들(사본, 폰), 단 = 고침단추들(r, !폰);
    참조.문자단추 = 단.문자;
    var 항목들 = 사본.품목.map(function (p) { return 항목줄(p, 폰); }).concat([배송비줄(사본, 폰)]);
    if (폰) {
      return 만들기('div', { class: '속' }, [
        만들기('div', { class: 'pair' }, [밭('받는 분 <span class="auto">선택</span>', 칸.받는분, 'flex:1'), 밭('전화번호', 칸.전화, 'flex:1.3')]),
        밭('메모 <span class="auto">선택</span>', 칸.메모),
        밭('주소 <span class="auto">선택</span>', 칸.곳.줄),
        밭('상세주소', 칸.곳.상세),
        밭('우편번호', 칸.곳.우편, 'width:120px'),
        밭('배송메시지 <span class="auto">선택</span>', 칸.배송메시지)
      ].concat(항목들, [만들기('div', { class: 'act', style: 'margin-top:0; flex-wrap:wrap' }, [단.문자, 단.올림, 단.저장])]));
    }
    var 삭제 = 단추('삭제', 'sm del', function () { 지우기(r); });
    return 만들기('div', { class: '속판' }, [
      만들기('div', { class: '사람줄' }, [
        밭('받는 분 <span class="auto">선택</span>', 칸.받는분, 'width:130px'), 밭('전화번호', 칸.전화, 'width:150px'),
        밭('메모 <span class="auto">선택</span>', 칸.메모, 'flex:1')
      ]),
      만들기('div', { class: '사람줄' }, [
        밭('우편번호', 칸.곳.우편, 'width:130px'), 밭('주소 <span class="auto">선택</span>', 칸.곳.줄, 'flex:1')
      ]),
      만들기('div', { class: '사람줄' }, [
        만들기('div', { style: 'flex:0 0 130px' }), 밭('상세주소', 칸.곳.상세, 'flex:1')   // 주소칸 바로 밑에 맞춘다
      ]),
      만들기('div', { class: '사람줄' }, [밭('배송메시지 <span class="auto">선택</span>', 칸.배송메시지, 'flex:1')])
    ].concat(항목들, [만들기('div', { class: '끝' }, [삭제, 만들기('span', { class: 'spacer' }), 단.문자, 단.올림, 단.저장])]));
  }

  /* ── 한 줄의 글 ── */
  function 칩(r, 폰, 정보) {
    if (정보 && 정보.됨) return 만들기('span', { class: 'st ship', text: '발송완료' });
    if (r.상태 === '올림') return 만들기('span', { class: 'st done', html: '주문올림' + (폰 ? ' <span class="no">' + u.안전(r.올린주문번호 || '') + '</span>' : '') });
    if (r.상태 === '보냄') return 만들기('span', { class: 'st wait', text: '문자 보냄' });
    return 만들기('span', { class: 'st saved', text: '저장됨' });
  }
  function 제목칸(r) {
    var t = 자().제목(r);
    return 만들기('span', { class: 'nm' + (t.결 === '전화' ? ' tel' : t.결 === '메모' ? ' 메모제목' : ''), text: t.글 });
  }
  function 전화글(r) {
    var 전 = 자().숫자만(r.전화);
    return 전 ? '<span class="tel">' + u.안전(자().전화모양(전)) + '</span>' : '<span class="무전화">전화 없음</span>';
  }

  /* ── 발송완료 — 송장칸 · 발송 단추 (16단계-2 §5) ── */
  function 송장칸(r, 정보, 폰) {
    var 고침 = 상태.송장고침 && 상태.송장고침.id === r.id ? 상태.송장고침 : null;
    var 상자 = 만들기('div', { class: '송장' }), 사 = 폰 ? '로젠택배' : '로젠';
    상자.addEventListener('click', function (e) { e.stopPropagation(); });
    function 줄(머리, 칸) { var d = 만들기('div', { class: '줄' }, [머리, 칸]); 상자.appendChild(d); return d; }
    function 사칸() { return 만들기('span', { class: '사', text: 사 }); }
    function 입력(값, i) {
      var e = 만들기('input', { class: 'inp' + (폰 ? ' num' : ''), type: 'text', inputmode: 'numeric', placeholder: '송장번호', value: 값 || '' });
      if (폰) { e.style.textAlign = 'left'; u.손대야열림(e); }
      // 칠 때는 값만 든다 — 다시 그리면 커서가 날아간다
      e.addEventListener('input', function () {
        if (!상태.송장고침 || 상태.송장고침.id !== r.id) 상태.송장고침 = { id: r.id, 값들: [''] };
        var 값들 = 상태.송장고침.값들;
        값들[i] = e.value;
        if (e.value && i === 상자.querySelectorAll('input').length - 1) 줄(사칸(), 입력('', i + 1));
      });
      e.addEventListener('keydown', function (ev) { if (ev.key === 'Enter') { ev.preventDefault(); 확정(true); } });
      if (고침 && 고침.포커스 === i) {
        delete 고침.포커스;
        e.readOnly = false;   // 방금 손으로 누른 칸이다
        setTimeout(function () { e.focus(); }, 0);
      }
      return e;
    }
    function 확정(다시그림) {
      if (!상태.송장고침 || 상태.송장고침.id !== r.id) return;
      자().손송장저장(r.id, 상태.송장고침.값들);
      상태.송장고침 = null;
      if (다시그림) 다시();
    }
    상자.addEventListener('focusout', function () {
      setTimeout(function () {
        // 남의 저장으로 다시 그려져 떨어진 상자 — 고치던 값은 상태에 남겨 새 상자가 되살린다
        if (!상자.isConnected || 상자.contains(document.activeElement)) return;
        var 단 = 참조.발송단추 && 참조.발송단추[r.id];
        // 그 카드의 발송 단추로 간 것이면 다시 그리지 않는다 — 단추가 갈려 클릭이 사라진다 (Safari 는 단추에 포커스를 안 줘 누름으로도 본다)
        확정(!(단 && (document.activeElement === 단 || 참조.발송누름 === r.id)));
      }, 0);
    });
    if (고침) {
      고침.값들.forEach(function (v, i) { 줄(사칸(), 입력(v, i)); });
      var 끝 = 고침.값들[고침.값들.length - 1];
      if (!고침.값들.length || 끝) 줄(사칸(), 입력('', 고침.값들.length));
      return 상자;
    }
    if (!정보.송장.length) { 줄(만들기('span', { class: '없음', text: '송장 없음' }), 입력('', 0)); return 상자; }
    정보.송장.forEach(function (번) { 줄(사칸(), 만들기('span', { class: '번', text: 번 })); });
    상자.style.cursor = 'pointer';
    상자.addEventListener('click', function (e) {
      var 줄들 = Array.prototype.slice.call(상자.children), 누른 = e.target.closest ? e.target.closest('.줄') : null;
      상태.송장고침 = { id: r.id, 값들: 정보.송장.slice(), 포커스: Math.max(0, 줄들.indexOf(누른)) };
      다시();
    });
    return 상자;
  }
  function 일시글(ms) {
    var d = new Date(ms);
    return (d.getMonth() + 1) + '/' + d.getDate() + ' ' + 두자리(d.getHours()) + ':' + 두자리(d.getMinutes());
  }
  function 발송단추(r, 정보, 작게) {
    var s = 작게 ? 'sm' : '', 끔 = !자().문자되나(r.전화), 줄 = [], 단;
    var 누름 = function () { 발송문자보내기(r.id); };
    if (r.발송문자보냄일시) {
      줄.push(만들기('span', { class: '보낸표', html: '발송문자 보냄 <b>' + 일시글(r.발송문자보냄일시) + '</b>' }));
      단 = 단추('다시 보내기', s, 누름, 끔);
    } else 단 = 단추('🚚 발송완료 문자', (s + ' main').trim(), 누름, 끔);
    단.addEventListener('pointerdown', function () { 참조.발송누름 = r.id; });
    (참조.발송단추 = 참조.발송단추 || {})[r.id] = 단;
    줄.push(단);
    return 줄;
  }

  /* ── 폰 ── */
  function 폰카드(r) {
    var 열린 = 상태.열린 && 상태.열린.id === r.id ? 상태.열린 : null;
    var 올림됨 = r.상태 === '올림', 셈 = 자().합계(r), t = 자().제목(r);
    var 정보 = 올림됨 ? 자().발송정보(r, 참조.색인) : null;
    var 카드 = 만들기('div', { class: 'ph-card 문카드' + (열린 && 열린.종류 === '올림' ? ' 올리는중' : '') });
    var r1 = 만들기('div', { class: 'r1' }, [
      만들기('span', { class: 'fx', text: 올림됨 ? '' : (열린 && 열린.종류 === '고침' ? '－' : '＋') }),
      제목칸(r), 칩(r, true, 정보), 만들기('span', { class: 'tm', text: 시각(r) })
    ]);
    var r2 = 만들기('div', { class: 'r2', html: (t.결 === '전화' ? '' : 전화글(r) + ' · ') + 셈.종 + '종 ' + u.콤마(셈.개) + '개' +
      '<span class="amt">' + u.콤마(셈.합) + '원</span>' });
    카드.appendChild(r1); 카드.appendChild(r2);
    if (올림됨) {
      if (정보.됨) {
        카드.appendChild(송장칸(r, 정보, true));
        카드.appendChild(만들기('div', { class: 'act' }, 발송단추(r, 정보, false)));
      } else if (자().온주소(r)) 카드.appendChild(만들기('div', { class: '받는곳', text: 자().온주소(r) }));
      return 카드;
    }
    [r1, r2].forEach(function (e) {
      e.addEventListener('click', function () { if (u.방금끌었나()) return; 열기(r, '고침'); });
    });
    if (열린 && 열린.종류 === '고침') 카드.appendChild(고침판(r, true));
    else if (열린) 카드.appendChild(ZG.문자주문올리기.판(r, 열린.사본, true, 닫기));
    else {
      var 줄 = [];
      if (r.상태 === '저장') 줄.push(단추('문자', '', function () { 문자보내기(r.id); }, !자().문자되나(r.전화)));
      줄.push(단추('주문올리기', 'main', function () { 열기(r, '올림'); }));
      카드.appendChild(만들기('div', { class: 'act' }, 줄));
    }
    var 삭제 = u.쓸기단추('삭제', 'del', function () { 지우기(r); }, 휴지통);
    u.쓸기붙이기(카드, 76);
    return 만들기('div', { class: '쓸줄' }, [만들기('div', { class: '쓸단추' }, [삭제]), 카드]);
  }

  function 폰목록(본문) {
    var 뒤 = 단추('‹ 새 문자', 'sm', 새문자로);
    본문.appendChild(만들기('div', { class: '머리줄' }, [뒤, 검색칸('🔍 받는 분 · 전화 · 품목 · 메모 · 송장 (모든 날짜)')]));
    참조.달력칸 = 만들기('div');
    참조.목록칸 = 만들기('div', { class: 'ph-list' });
    본문.appendChild(참조.달력칸);
    본문.appendChild(참조.목록칸);
    목록다시();
  }

  /* ── PC ── */
  function PC줄(r) {
    var 열린 = 상태.열린 && 상태.열린.id === r.id ? 상태.열린 : null;
    var 올림됨 = r.상태 === '올림', 셈 = 자().합계(r), t = 자().제목(r), 전 = 자().숫자만(r.전화);
    var 정보 = 올림됨 ? 자().발송정보(r, 참조.색인) : null, 됨 = !!(정보 && 정보.됨);
    var 사람;
    if (t.결 === '전화') 사람 = '<span class="전화제목">' + u.안전(t.글) + '</span>';
    else {
      var 아래 = 전 ? '<span class="sub">' + u.안전(자().전화모양(전)) + '</span>' : '<span class="sub 무전화">전화 없음</span>';
      사람 = (t.결 === '메모' ? '<span class="메모제목">' + u.안전(t.글) + '</span>' : u.안전(t.글)) + 아래;
    }
    var 품목글 = (r.품목 || []).map(function (p) { return u.안전(p.유통명) + ' ' + u.콤마(p.수량); }).join(' · ');
    var 밑 = 올림됨 && !됨 && 자().온주소(r) ? u.안전(자().온주소(r)) : (셈.배송비 ? '배송비 ' + u.콤마(셈.배송비) : '배송비 없음');
    var 상태칸 = 만들기('td', { class: '상태칸' }, [칩(r, false, 정보)]);
    if (됨) [송장칸(r, 정보, false)].concat(발송단추(r, 정보, true)).forEach(function (e) { 상태칸.appendChild(e); });
    else if (올림됨) 상태칸.appendChild(만들기('span', { class: 'sub 번호', text: r.올린주문번호 || '' }));
    else if (!열린) {
      if (r.상태 === '저장') 상태칸.appendChild(단추('문자', 'sm 꽉', function () { 문자보내기(r.id); }, !자().문자되나(r.전화)));
      상태칸.appendChild(단추('주문올리기', 'sm main 꽉', function () { 열기(r, '올림'); }));
    }
    var tr = 만들기('tr', { class: 열린 ? (열린.종류 === '고침' ? '펼침' : '올림머리') : '' }, [
      만들기('td', { class: 'fx', text: 올림됨 ? '' : (열린 && 열린.종류 === '고침' ? '－' : '＋') }),
      만들기('td', { class: 'tm', text: 시각(r) }),
      만들기('td', { html: 사람 }),
      만들기('td', { html: 품목글 + '<span class="sub">' + 밑 + '</span>' }),
      만들기('td', { class: 'r', text: u.콤마(셈.합) }),
      상태칸
    ]);
    if (!올림됨) { tr.style.cursor = 'pointer'; tr.addEventListener('click', function () { 열기(r, '고침'); }); }
    if (!열린 || 올림됨) return [tr];
    var 속 = 열린.종류 === '고침' ? 고침판(r, false) : ZG.문자주문올리기.판(r, 열린.사본, false, 닫기);
    return [tr, 만들기('tr', { class: '속줄' + (열린.종류 === '올림' ? ' 올림' : '') }, [만들기('td', { colspan: '6' }, [속])])];
  }

  function PC목록(본문) {
    참조.달력칸 = 만들기('div', { class: 'card' });
    참조.머리글 = 만들기('span', { class: 'd' });
    참조.목록칸 = 만들기('tbody');
    var 출력 = 단추('🖨 출력', 'sm', function () {
      ZG.문자주문올리기.인쇄(자().거르기(상태.날짜, 상태.검색), 상태.검색.trim() ? '' : 상태.날짜);
    });
    var 머리 = 만들기('div', { class: 'tblhd' }, [단추('‹ 새 문자', 'sm', 새문자로), 참조.머리글, 검색칸('🔍 이름 · 전화 · 품목 · 메모 · 송장'), 출력]);
    var 표 = 만들기('table', {}, [
      만들기('colgroup', { html: '<col style="width:24px"><col style="width:48px"><col style="width:136px"><col><col style="width:66px"><col style="width:168px">' }),
      만들기('thead', { html: '<tr><th></th><th>시각</th><th>받는 분 · 전화</th><th>품목</th><th class="r">금액</th><th>상태</th></tr>' }),
      참조.목록칸
    ]);
    본문.appendChild(만들기('div', { class: 'cols' }, [
      만들기('div', { class: 'cl' }, [참조.달력칸]),
      만들기('div', { class: 'lst card table-card' }, [머리, 표])
    ]));
    목록다시();
  }

  /* ── 공통 — 검색 · 달력 · 목록 ── */
  function 검색칸(자리글) {
    var e = u.손대야열림(만들기('input', { class: 'inp 찾기', type: 'search', placeholder: 자리글, value: 상태.검색 }));
    u.조합안전입력(e, function (값) { 상태.검색 = 값; 상태.열린 = null; 상태.송장고침 = null; 목록다시(); }, 150);
    return e;
  }

  function 목록다시() {
    var 폰 = u.폰인가(), 목록 = 자().거르기(상태.날짜, 상태.검색);
    참조.색인 = 자().발송색인();
    참조.발송단추 = {}; 참조.발송누름 = null;
    u.열린줄잊기();
    u.비우기(참조.달력칸);
    // 폰은 찾는 동안 달력을 걷는다 — 모든 날짜에서 찾으므로 고른 날이 뜻이 없다 (시안 ③)
    if (!(폰 && 상태.검색.trim())) 달력그리기(참조.달력칸);
    if (참조.머리글) {
      var 합 = 목록.reduce(function (a, r) { return a + 자().합계(r).합; }, 0);
      참조.머리글.innerHTML = (상태.검색.trim() ? '찾은 것' : 날글(상태.날짜)) + '<small>' + 목록.length + '건 · ' + u.콤마(합) + '원</small>';
    }
    u.비우기(참조.목록칸);
    if (!목록.length) {
      var 빈 = '문자주문이 없습니다';
      참조.목록칸.appendChild(폰 ? 만들기('div', { class: '빈목록', text: 빈 })
        : 만들기('tr', {}, [만들기('td', { colspan: '6', class: '빈목록', text: 빈 })]));
      return;
    }
    var 줄들 = [];
    목록.forEach(function (r) {
      if (폰) 줄들.push(폰카드(r)); else 줄들 = 줄들.concat(PC줄(r));
    });
    줄들.forEach(function (e) { 참조.목록칸.appendChild(e); });
    u.목록등장(줄들);
  }

  function 날짜고르기(날짜) {
    상태.날짜 = 날짜; 상태.달 = 날짜.slice(0, 7); 상태.열린 = null; 상태.송장고침 = null;
    다시();   // 요약줄(폰 .ph-sub)도 그날로 바뀌어야 한다
  }
  function 달로(달) {
    상태.달 = 달;
    if (상태.날짜.slice(0, 7) !== 달) 상태.날짜 = 달 + '-01';
    상태.열린 = null; 상태.송장고침 = null;
    다시();
  }

  function 달력그리기(자리) {
    var 머리 = 만들기('div', { class: 'calhd' });
    var 앞 = 만들기('button', { type: 'button', text: '‹', 'aria-label': '지난 달' });
    앞.addEventListener('click', function () { 달로(달옮기기(상태.달, -1)); });
    var 뒤 = 만들기('button', { type: 'button', text: '›', 'aria-label': '다음 달' });
    뒤.addEventListener('click', function () { 달로(달옮기기(상태.달, 1)); });
    머리.appendChild(앞);
    머리.appendChild(만들기('div', { class: 'm', text: Number(상태.달.slice(0, 4)) + '년 ' + Number(상태.달.slice(5, 7)) + '월' }));
    머리.appendChild(뒤);
    자리.appendChild(머리);

    var 표 = 만들기('div', { class: 'cal' });
    요일.forEach(function (요, i) { 표.appendChild(만들기('div', { class: 'wd' + (i === 0 ? ' sun' : ''), text: 요 })); });
    var 해 = Number(상태.달.slice(0, 4)), 월 = Number(상태.달.slice(5, 7));
    var 첫요일 = new Date(해, 월 - 1, 1).getDay(), 날수 = new Date(해, 월, 0).getDate();
    var 점 = 자().점표(상태.달), 오늘 = u.오늘문자();
    for (var b = 0; b < 첫요일; b++) 표.appendChild(만들기('div', { class: 'd off' }));
    for (var n = 1; n <= 날수; n++) {
      (function (일) {
        var 날짜 = 상태.달 + '-' + 두자리(일);
        var 칸 = 만들기('button', {
          type: 'button', 'aria-label': 날글(날짜),
          class: 'd' + ((첫요일 + 일 - 1) % 7 === 0 ? ' sun' : '') + (날짜 === 상태.날짜 ? ' on' : '') + (날짜 === 오늘 ? ' today' : ''),
          text: String(일)
        });
        칸.appendChild(만들기('i', { class: 점[날짜] ? '' : 'none' }));
        칸.addEventListener('click', function () { 날짜고르기(날짜); });
        표.appendChild(칸);
      })(n);
    }
    자리.appendChild(표);
  }

  ZG.문자주문 = { 그리기: 그리기, 상태: 상태, 제목: 제목, 요약: 요약, 나가기: 나가기, 목록으로: 목록으로 };
})(window.ZG);
