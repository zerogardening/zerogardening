/* 20a-문자주문자료 — 문자주문 읽기·쓰기·문자 짓기·주문올리기 (16단계 설계 §2·§4·§5). 화면은 없다.
   한 건 = v3_문자주문 한 줄. 품목은 그 안 배열이다 — 늘 통째로 고쳐지고 따로 찾는 곳이 없다.
   🔴 올림(주문올림) 줄은 여기서 막는다 — 화면이 단추를 숨겨도 고치기·지우기가 거부한다 (§8-5). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui;
  function 저() { return ZG.저장소; }
  function 키() { return ZG.저장소.키.문자주문; }

  function 새id() { return 'sm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
  function 숫자만(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function 전화모양(s) { return u.전화정리(s); }
  /* 저장은 지금처럼 숫자만 — 해외 번호만 앞 + 를 남긴다 */
  function 전화저장(s) {
    var 정 = u.전화정리(s);
    return (정.charAt(0) === '+' ? '+' : '') + 숫자만(정);
  }
  function 문자되나(전화) { return 숫자만(u.전화정리(전화)).length >= 9; }
  /* 로젠 27칸 주소는 한 칸이다 — 수동주문(08c)이 한 칸에 「도로명 동·호수」로 넣는 모양과 맞춘다 */
  function 온주소(r) {
    return [r && r.주소, r && r.상세주소].map(function (v) { return String(v || '').trim(); }).filter(Boolean).join(' ');
  }

  /* ── 읽기 ── */
  function 전부() {
    return 저().읽기(키()).filter(function (r) { return !r.삭제됨; })
      .sort(function (a, b) { return (b.등록일시 || 0) - (a.등록일시 || 0); });
  }
  function 하나(id) { return 저().읽기(키()).find(function (r) { return r.id === id; }) || null; }

  /* ── 예약 (18단계 §3-1) ── */
  function 예약중(r) { return !!r && r.예약 === true && r.상태 !== '올림'; }
  // 시안 컨펌대로 예약 줄도 받은 날 목록에 칩을 단 채 보인다 — 빼려면 여기 한 줄만 !예약중(r) 로
  function 오늘에보이나(r) { return true; }
  /* 「예약일 전입니다 — 지금 올릴까요?」 확인창을 지난 줄. 잠금 판정이 여기 한 곳이라 20c·20d·20e 가 다 따라온다.
     메모리만 — 새로고침하면 다시 잠긴다 */
  var 풀린 = {};
  function 잠금풀기(id) { 풀린[id] = true; }
  function 올릴수있나(r) {
    if (!예약중(r) || !r.예약일 || r.예약일 <= u.오늘문자() || 풀린[r.id]) return { 된다: true };
    return { 된다: false, 까닭: '예약일(' + Number(r.예약일.slice(5, 7)) + '/' + Number(r.예약일.slice(8, 10)) + ') 전이라 올릴 수 없습니다' };
  }

  function 납작(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s/g, ''); }
  /* 찾는 말이 있으면 날짜와 상관없이 전체에서, 없으면 고른 날 하루만 (널서리 이력전체) */
  function 거르기(날짜, 검색) {
    var 열쇠 = 납작(검색);
    if (!열쇠) return 전부().filter(function (r) { return r.날짜 === 날짜 && 오늘에보이나(r); });
    var 숫자열쇠 = 숫자만(열쇠), 색 = null;
    return 전부().filter(function (r) {
      var 밭 = 납작((r.받는분 || '') + (r.메모 || '') + (r.품목 || []).map(function (p) { return p.유통명; }).join(''));
      if (밭.indexOf(열쇠) >= 0) return true;
      if (숫자열쇠.length < 3 || 숫자열쇠 !== 열쇠.replace(/-/g, '')) return false;
      if (숫자만(u.전화정리(r.전화)).indexOf(숫자열쇠) >= 0) return true;
      if (r.상태 !== '올림') return false;
      색 = 색 || 발송색인();   // 검색할 때 한 번만 — 줄마다 저장소를 읽지 않는다
      return 발송정보(r, 색).송장.some(function (s) { return 숫자만(s).indexOf(숫자열쇠) >= 0; });
    });
  }
  function 점표(달) {
    var 표 = {};
    전부().forEach(function (r) { if (String(r.날짜).slice(0, 7) === 달 && 오늘에보이나(r)) 표[r.날짜] = true; });
    return 표;
  }
  function 오늘보낸수() {
    var 오늘 = u.오늘문자();
    return 전부().filter(function (r) { return r.보낸일시 && ZG.계산.날짜문자(r.보낸일시) === 오늘; }).length;
  }

  /* ── 셈 ── */
  function 합계(r) {
    var 품목 = r.품목 || [];
    var 개 = 0, 금액 = 0;
    품목.forEach(function (p) { 개 += Number(p.수량) || 0; 금액 += (Number(p.수량) || 0) * (Number(p.단가) || 0); });
    var 배송비 = Math.max(0, Number(r.배송비) || 0);
    return { 종: 품목.length, 개: 개, 품목금액: 금액, 배송비: 배송비, 합: 금액 + 배송비 };
  }

  /* 받는분 → 전화 → 📝 메모 → 「첫 품목 외 n종」 (§8-3) */
  function 제목(r) {
    if (String(r.받는분 || '').trim()) return { 글: r.받는분.trim(), 결: '이름' };
    if (숫자만(r.전화)) return { 글: 전화모양(r.전화), 결: '전화' };
    if (String(r.메모 || '').trim()) return { 글: r.메모.trim(), 결: '메모' };
    var 품목 = r.품목 || [];
    if (!품목.length) return { 글: '품목 없음', 결: '품목' };
    return { 글: 품목[0].유통명 + (품목.length > 1 ? ' 외 ' + (품목.length - 1) + '종' : ''), 결: '품목' };
  }

  /* 개당 값 — 판매단가는 판매단위 묶음 값이다(튤립 5개입이면 ÷5). 없으면 매입×2 (§7) */
  function 기본단가(p) {
    var 판 = Number(p.판매단가) || 0;
    if (판 > 0) return Math.round(판 / (Number(p.판매단위) || 1));
    return (Number(p.매입단가) || 0) * 2;
  }
  /* 품목코드 단위 8개 (널서리 후보목록). u.후보찾기는 접두로 묶어 규격을 못 고른다 */
  function 후보(글) {
    var 열쇠 = 납작(글);
    if (!열쇠) return [];
    return 저().품목들().filter(function (p) {
      return 납작(p.유통명 + p.학명 + p.품목코드).indexOf(열쇠) >= 0;
    }).slice(0, 8);
  }
  function 담을줄(p) {
    return { 품목코드: p.품목코드, 유통명: p.유통명, 학명: p.학명 || '', 규격: p.규격 || '', 수량: 1, 단가: 기본단가(p) };
  }

  /* ── 문자 ── */
  function 계좌() {
    var 자사 = ZG.업체자료 ? ZG.업체자료.자사() : null;
    return 자사 && 자사.입금계좌 ? String(자사.입금계좌).trim() : '';
  }
  /* 「규격 외」(구근 등)는 문자에 안 적는다 — 상품명만 (10/7 우람님) */
  function 규격글(p) {
    var 규 = String(p.규격 || '').trim();
    return 규 && 규.replace(/\s/g, '') !== '규격외' ? ' ' + 규 : '';
  }
  function 문자내용(r) {
    var 이름 = String(r.받는분 || '').trim();
    var 셈 = 합계(r);
    var 글 = '🌱 [제로가드닝]\n' + (이름 ? 이름 + ' 님 주문 안내' : '주문 내역 안내') + '\n\n' +
      (r.품목 || []).map(function (p) {
        var 단가 = Number(p.단가) || 0, 수량 = Number(p.수량) || 0;
        return '· ' + p.유통명 + 규격글(p) + '\n' +
          u.콤마(수량) + '개X' + u.콤마(단가) + '원 = ' + u.콤마(수량 * 단가) + '원';
      }).join('\n\n');
    if (셈.배송비 > 0) 글 += '\n\n배송비 ' + u.콤마(셈.배송비) + '원';
    글 += '\n\n합계: ' + u.콤마(셈.합) + '원';
    var 계 = 계좌();
    // 한 줄이면 폰 문자 칸에서 잘린다 — 계좌번호 뒤에서 끊어 예금주를 둘째 줄로
    if (계) 글 += '\n\n💰입금계좌\n' + 계.replace(/^(.*\d)\s+(?=[^\d\s][^\d]*$)/, '$1\n');
    글 += '\n\n📌 성함, 주소, 연락처를 보내주세요!';
    return 글;
  }
  /* 맥 문자앱이 본문을 안 받는 때가 있다 — PC 는 열기 전에 복사해 둔다 (§5) */
  function 문자열기(전화, 글) {
    if (!u.폰인가() && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(글).catch(function () { /* 무시 — 링크는 그래도 연다 */ });
    }
    location.href = 'sms:' + 전화저장(전화) + '?body=' + encodeURIComponent(글);
  }

  /* ── 발송완료 (16단계-2 §2) — 저장하지 않고 주문 줄·출고에서 그때그때 판정한다 ── */
  function 넣기(표, 열쇠, 것) { (표[열쇠] = 표[열쇠] || []).push(것); }
  // 🔴 카드마다 저장소를 읽으면 O(n²) — 목록 한 번에 색인 하나 (08f 색인만들기와 같은 이유)
  function 발송색인() {
    var 색 = { 문자id별: {}, 번호별: {}, 출고별: {} };
    저().읽기(저().키.주문).forEach(function (o) {
      if (o.문자주문id) 넣기(색.문자id별, o.문자주문id, o);
      var n = String(o.주문번호 || '').trim();
      if (n && o.판매처 === '문자') 넣기(색.번호별, n, o);
    });
    저().읽기(저().키.출고).forEach(function (s) {
      if (s.출처 === '주문' && s.주문id) 넣기(색.출고별, s.주문id, s);
    });
    return 색;
  }
  /* 번호로 잡는 건 그 번호에 이 문자주문id 줄이 남아 있을 때만.
     🔴 주문탭에서 올린 주문을 지우면 새주문번호()가 같은 번호를 다른 문자주문에 다시 준다 —
        번호만 보면 남의 주문을 제 것으로 잡는다 (17단계④ 검수) */
  function 번호살아있나(r, 제줄들) {
    var n = String(r.올린주문번호 || '').trim();
    return n && 제줄들.some(function (o) { return String(o.주문번호 || '').trim() === n; }) ? n : '';
  }
  // 주문탭에서 나중에 더한 줄도 잡는다 — 판매처 '문자'로 같은 모양 번호의 남의 주문은 막는다
  function 대상줄(r, 색) {
    var 본 = {}, 줄들 = [], 제줄 = 색.문자id별[r.id] || [];
    function 담기(o) { if (o.서비스 === true || 본[o.id]) return; 본[o.id] = 1; 줄들.push(o); }
    제줄.forEach(담기);
    var n = 번호살아있나(r, 제줄);
    if (n) (색.번호별[n] || []).forEach(담기);
    return 줄들;
  }
  function 겹침빼기(값들) {
    var 본 = {};
    return 값들.filter(function (v) { if (!v || 본[v]) return false; 본[v] = 1; return true; });
  }
  // 수량은 출고 수량 합 — 주문탭에서 수량을 고쳤어도 실제로 빠진 수가 나온다
  function 나간품목짓기(r, 나간, 색) {
    var 모음 = {}, 차례 = [];
    나간.forEach(function (o) {
      var 코드 = o.품목코드 || '';
      if (!모음[코드]) { 모음[코드] = { 유통명: o.유통명 || '', 규격: o.규격 || '', 수량: 0 }; 차례.push(코드); }
      색.출고별[o.id].forEach(function (s) { 모음[코드].수량 += Number(s.수량) || 0; });
    });
    var 앞 = [];
    (r.품목 || []).forEach(function (p) {
      var 것 = 모음[p.품목코드 || ''];
      if (!것 || 앞.indexOf(p.품목코드 || '') >= 0) return;
      것.유통명 = p.유통명; 것.규격 = p.규격 || '';
      앞.push(p.품목코드 || '');
    });
    return 앞.concat(차례.filter(function (c) { return 앞.indexOf(c) < 0; })).map(function (c) { return 모음[c]; });
  }
  function 발송정보(r, 색) {
    if (!r || r.상태 !== '올림') return null;
    색 = 색 || 발송색인();
    var 나간 = [], 출고들 = [];
    대상줄(r, 색).forEach(function (o) {
      var 출 = 색.출고별[o.id];
      if (출 && 출.length) { 나간.push(o); 출고들 = 출고들.concat(출); }
    });
    출고들.sort(function (a, b) { return (a.등록일시 || 0) - (b.등록일시 || 0); });
    var 자동 = 겹침빼기(출고들.map(function (s) { return String(s.운송장번호 || '').trim(); }));
    var 손 = Array.isArray(r.손송장);
    return { 됨: 나간.length > 0, 자동송장: 자동, 송장: 손 ? r.손송장.slice() : 자동, 손: 손,
             나간품목: 나간품목짓기(r, 나간, 색) };
  }
  function 발송문자내용(r, 정보) {
    정보 = 정보 || 발송정보(r);
    var 이름 = String(r.받는분 || '').trim();
    var 글 = '🌱 [제로가드닝]\n' + (이름 ? 이름 + ' 님 ' : '') + '주문하신 상품을 보냈습니다\n\n' +
      정보.나간품목.map(function (p) {
        return '· ' + p.유통명 + 규격글(p) + ' ' + u.콤마(p.수량) + '개';
      }).join('\n');
    if (정보.송장.length) 글 += '\n\n' + 정보.송장.map(function (s) { return '로젠택배 ' + s; }).join('\n');
    return 글;
  }

  /* ── 쓰기 ── */
  function 다듬기(값) {
    var 것 = {
      받는분: String(값.받는분 || '').trim(), 전화: 전화저장(값.전화), 메모: String(값.메모 || '').trim(),
      품목: (값.품목 || []).map(function (p) {
        return { 품목코드: p.품목코드, 유통명: p.유통명, 학명: p.학명 || '', 규격: p.규격 || '',
                 수량: Math.max(1, Math.floor(Number(p.수량)) || 1), 단가: Math.max(0, Number(p.단가) || 0) };
      }),
      배송비: Math.max(0, Number(값.배송비) || 0),
      주소: String(값.주소 || '').trim(), 상세주소: String(값.상세주소 || '').trim(), 우편: String(값.우편 || '').trim(),
      배송메시지: String(값.배송메시지 || '').trim()
    };
    // 예약 칸은 넘어올 때만 — 새로저장(20b)은 안 넘기므로 기존 줄 모양이 그대로다
    if ('예약' in 값) { 것.예약 = !!값.예약; 것.예약일 = 값.예약 ? String(값.예약일 || '') : ''; }
    주소확인칸(것, 값);
    return 것;
  }
  /* 원문주소·주소확인 (19단계 §2-2) — 넘어올 때만. 안 넘긴 사본으로 고치면 원문이 빈칸으로 덮인다 */
  function 주소확인칸(것, 값) {
    if ('원문주소' in 값) 것.원문주소 = String(값.원문주소 || '').trim();
    if ('주소확인' in 값) 것.주소확인 = String(값.주소확인 || '');
    return 것;
  }
  function 새로저장(값, 보냄) {
    var 이제 = Date.now(), r = 다듬기(값);
    r.id = 새id(); r.날짜 = u.오늘문자();
    r.상태 = 보냄 ? '보냄' : '저장';
    r.등록일시 = 이제; r.수정일시 = 이제;
    if (보냄) r.보낸일시 = 이제;
    저().덧붙이기(키(), r);
    return r;
  }
  function 고치기(id, 값) {
    var r = 하나(id);
    if (!r || r.상태 === '올림') return null;
    // 주문탭에서 옮긴 줄은 되살릴 때 원본줄들을 쓴다 — 사람·품목을 고쳐도 조용히 버려지므로 예약 칸만 받는다
    if (r.원본줄들) {
      var 예약 = !!값.예약;
      저().바꾸기(키(), id, { 예약: 예약, 예약일: 예약 ? String(값.예약일 || '') : '', 수정일시: Date.now() });
      return 하나(id);
    }
    var 변경 = 다듬기(값);
    if (!변경.품목.length) return null;
    변경.수정일시 = Date.now();
    저().바꾸기(키(), id, 변경);
    return 하나(id);
  }
  function 보냄표시(id) {
    var r = 하나(id);
    if (!r || r.상태 === '올림') return null;
    var 이제 = Date.now();
    저().바꾸기(키(), id, { 상태: '보냄', 보낸일시: 이제, 수정일시: 이제 });
    return 하나(id);
  }
  function 지우기(id) {
    var r = 하나(id);
    if (!r || r.상태 === '올림') return false;
    저().지우기(키(), id);
    return true;
  }

  /* 올린 문자주문이 주문탭에 남긴 줄 — 대상줄()과 같은 범위에서 서비스 제외만 뺐다.
     🔴 서비스 줄(08e)은 주문번호·판매처만 물려받고 문자주문id 가 없다.
        id 로만 지우면 서비스 줄과 그 출고가 고아로 남아 재고가 빠진 채 남는다 */
  function 지울줄(r) {
    var 주문들 = 저().읽기(저().키.주문);
    var n = 번호살아있나(r, 주문들.filter(function (o) { return o.문자주문id === r.id; }));
    return 주문들.filter(function (o) {
      return o.문자주문id === r.id || (n && o.판매처 === '문자' && String(o.주문번호 || '').trim() === n);
    });
  }
  /* 돌려주는 값: { 지운주문수 } 또는 { 오류 }
     🔴 문자주문 줄은 맨 끝에 지운다 — 중간에 끊기면 남아 있어 다시 눌러 마저 지운다 */
  function 올림지우기(id) {
    var r = 하나(id);
    if (!r || r.상태 !== '올림') return { 오류: '올린 문자주문이 아닙니다' };
    var 줄들 = 지울줄(r);
    var 나간 = ZG.주문입력.나간줄(줄들);       // 두 기기 사이 틈 — 확인창 뒤에 한 번 더 본다
    if (나간.length) return { 오류: '이미 배송완료된 줄이 ' + 나간.length + '개 있어 지울 수 없습니다.' };
    var 번호들 = {};
    줄들.forEach(function (o) {
      번호들[o.주문번호 || o.id] = 1;
      저().지우기(저().키.주문, o.id);
      if (ZG.서비스품목) ZG.서비스품목.출고지우기(o.id);
    });
    저().지우기(키(), r.id);
    return { 지운주문수: Object.keys(번호들).length };
  }

  /* 발송문자·손송장은 올림 줄에만 — 고치기·보냄표시·지우기의 올림 거부와 따로 간다 */
  function 발송문자표시(id) {
    var r = 하나(id);
    if (!r || r.상태 !== '올림') return null;
    var 이제 = Date.now();
    저().바꾸기(키(), id, { 발송문자보냄일시: 이제, 수정일시: 이제 });
    return 하나(id);
  }
  /* 자동과 같아지면 null 로 풀어 다시 자동을 따른다 · 빈 배열은 「자동 송장을 지웠다」 (§2) */
  function 손송장저장(id, 값들) {
    var r = 하나(id);
    if (!r || r.상태 !== '올림') return null;
    var 깨끗 = 겹침빼기((값들 || []).map(숫자만));
    var 자동 = 발송정보(r).자동송장;
    var 같다 = 깨끗.length === 자동.length && 깨끗.every(function (v, i) { return v === 자동[i]; });
    저().바꾸기(키(), id, { 손송장: 같다 ? null : 깨끗, 수정일시: Date.now() });
    return 하나(id);
  }

  /* ── 주문올리기 (§4) ── */
  function 새주문번호(날짜, 주문들) {
    var 앞 = 날짜.slice(2, 4) + 날짜.slice(5, 7) + 날짜.slice(8, 10);
    var 큰 = 0;
    주문들.forEach(function (o) {
      var m = /^(\d{6})-(\d+)$/.exec(String(o.주문번호 || ''));
      if (m && m[1] === 앞) 큰 = Math.max(큰, Number(m[2]));
    });
    return 앞 + '-' + String(큰 + 1).padStart(2, '0');
  }
  function 품목st(p) {
    var 코드 = String(p.품목코드 || ''), 자리 = 코드.lastIndexOf('-');
    var 꼬리 = 코드.slice(자리 + 1), cm = Number(꼬리);
    // 코드정보()가 접두+'-'+cm 으로 다시 붙인다 — 숫자로 바꿔 모양이 달라지면 원코드와 어긋나 단가가 덮인다
    if (String(cm) !== 꼬리) cm = 꼬리;
    return { 접두: 코드.slice(0, 자리), cm: cm, 유통명: p.유통명, 학명: p.학명 || '',
             수량: Number(p.수량) || 1, 단가: Number(p.단가) || 0, 원코드: 코드 };
  }
  /* 돌려주는 값: { 번호 } 또는 { 오류 } */
  function 주문올리기(id, 사람) {
    var r = 하나(id);
    if (!r) return { 오류: '없는 문자주문입니다' };
    if (r.상태 === '올림') return { 오류: '이미 올린 주문입니다' };
    if (r.원본줄들) return ZG.예약자료.되살리기(id);   // 줄에 사람·품목이 다 있다 — 받는 분 판을 안 거친다
    var 됨 = 올릴수있나(r);   // 화면이 잠가도 두 기기 틈이 있다
    if (!됨.된다) return { 오류: 됨.까닭 };
    var 이름 = String(사람.받는분 || '').trim();
    if (!이름) return { 오류: '받는 분을 적어 주세요' };
    if (!(r.품목 || []).length) return { 오류: '품목이 없습니다' };

    var 오늘 = u.오늘문자(), 주문키 = 저().키.주문;
    var 주문들 = 저().읽기(주문키);
    // 🔴 중간에 끊겼다 다시 누른 것 — 줄이 이미 있으면 새로 안 만들고 상태만 맞춘다
    var 이미 = 주문들.filter(function (o) { return o.문자주문id === id; });
    var 주소 = String(사람.주소 || '').trim(), 상세 = String(사람.상세주소 || '').trim(), 우편 = String(사람.우편 || '').trim();
    var 메시지 = String(사람.배송메시지 || '').trim();
    var 번호 = 이미.length ? (이미[0].주문번호 || '') : 새주문번호(오늘, 주문들);
    if (!이미.length) {
      var 것 = { 이름: 이름, 전화: 전화모양(사람.전화), 주소: 온주소({ 주소: 주소, 상세주소: 상세 }), 우편: 우편 };
      var 바탕 = { 주문번호: 번호, 판매처: '문자', 출처: '수동', 묶음id: '', 우편번호: 우편, 배송메모: 메시지 };
      r.품목.forEach(function (p) {
        var 줄 = ZG.주문입력.줄만들기(품목st(p), 것, 오늘, '문자', 바탕);
        줄.문자주문id = id;
        저().덧붙이기(주문키, 줄);
      });
    }
    var 이제 = Date.now();
    저().바꾸기(키(), id, 주소확인칸({
      상태: '올림', 받는분: 이름, 전화: 전화저장(사람.전화), 주소: 주소, 상세주소: 상세, 우편: 우편, 배송메시지: 메시지,
      올린주문번호: 번호, 올린일시: 이제, 수정일시: 이제
    }, 사람));
    return { 번호: 번호 };
  }

  ZG.문자주문자료 = {
    숫자만: 숫자만, 전화모양: 전화모양, 문자되나: 문자되나, 온주소: 온주소,
    예약중: 예약중, 오늘에보이나: 오늘에보이나, 올릴수있나: 올릴수있나, 잠금풀기: 잠금풀기,
    전부: 전부, 하나: 하나, 거르기: 거르기, 점표: 점표, 오늘보낸수: 오늘보낸수,
    합계: 합계, 제목: 제목, 후보: 후보, 담을줄: 담을줄,
    문자내용: 문자내용, 문자열기: 문자열기,
    새로저장: 새로저장, 고치기: 고치기, 보냄표시: 보냄표시, 지우기: 지우기, 주문올리기: 주문올리기,
    지울줄: 지울줄, 올림지우기: 올림지우기, 새주문번호: 새주문번호,
    발송색인: 발송색인, 발송정보: 발송정보, 발송문자내용: 발송문자내용, 발송문자표시: 발송문자표시, 손송장저장: 손송장저장
  };
})(window.ZG);
