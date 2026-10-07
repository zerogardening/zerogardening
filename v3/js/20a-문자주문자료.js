/* 20a-문자주문자료 — 문자주문 읽기·쓰기·문자 짓기·주문올리기 (16단계 설계 §2·§4·§5). 화면은 없다.
   한 건 = v3_문자주문 한 줄. 품목은 그 안 배열이다 — 늘 통째로 고쳐지고 따로 찾는 곳이 없다.
   🔴 올림(주문올림) 줄은 여기서 막는다 — 화면이 단추를 숨겨도 고치기·지우기가 거부한다 (§8-5). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui;
  function 저() { return ZG.저장소; }
  function 키() { return ZG.저장소.키.문자주문; }

  var 첫머리없음 = '안녕하세요, 제로가드닝입니다.\n주문하신 내역 안내드립니다.';

  function 새id() { return 'sm_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 7); }
  function 숫자만(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }
  function 전화모양(s) {
    var d = 숫자만(s);
    if (/^02/.test(d)) return d.length === 9 ? d.replace(/^(02)(\d{3})(\d{4})$/, '$1-$2-$3') : d.length === 10 ? d.replace(/^(02)(\d{4})(\d{4})$/, '$1-$2-$3') : d;
    if (d.length === 12) return d.replace(/^(\d{4})(\d{4})(\d{4})$/, '$1-$2-$3');
    if (d.length === 11) return d.replace(/^(\d{3})(\d{4})(\d{4})$/, '$1-$2-$3');
    if (d.length === 10) return d.replace(/^(\d{3})(\d{3})(\d{4})$/, '$1-$2-$3');
    return d;
  }
  function 문자되나(전화) { return 숫자만(전화).length >= 9; }

  /* ── 읽기 ── */
  function 전부() {
    return 저().읽기(키()).filter(function (r) { return !r.삭제됨; })
      .sort(function (a, b) { return (b.등록일시 || 0) - (a.등록일시 || 0); });
  }
  function 하나(id) { return 저().읽기(키()).find(function (r) { return r.id === id; }) || null; }

  function 납작(s) { return String(s == null ? '' : s).toLowerCase().replace(/\s/g, ''); }
  /* 찾는 말이 있으면 날짜와 상관없이 전체에서, 없으면 고른 날 하루만 (널서리 이력전체) */
  function 거르기(날짜, 검색) {
    var 열쇠 = 납작(검색);
    if (!열쇠) return 전부().filter(function (r) { return r.날짜 === 날짜; });
    var 숫자열쇠 = 숫자만(열쇠);
    return 전부().filter(function (r) {
      var 밭 = 납작((r.받는분 || '') + (r.메모 || '') + (r.품목 || []).map(function (p) { return p.유통명; }).join(''));
      if (밭.indexOf(열쇠) >= 0) return true;
      return 숫자열쇠.length >= 3 && 숫자열쇠 === 열쇠.replace(/-/g, '') && 숫자만(r.전화).indexOf(숫자열쇠) >= 0;
    });
  }
  function 점표(달) {
    var 표 = {};
    전부().forEach(function (r) { if (String(r.날짜).slice(0, 7) === 달) 표[r.날짜] = true; });
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
  function 문자내용(r) {
    var 이름 = String(r.받는분 || '').trim();
    var 셈 = 합계(r);
    var 글 = (이름 ? '🌱 [제로가드닝]\n' + 이름 + ' 님 주문 안내' : 첫머리없음) + '\n\n' +
      (r.품목 || []).map(function (p) {
        var 단가 = Number(p.단가) || 0, 수량 = Number(p.수량) || 0;
        return '· ' + p.유통명 + (p.규격 ? ' ' + p.규격 : '') + '\n' +
          u.콤마(수량) + '개X' + u.콤마(단가) + '원 = ' + u.콤마(수량 * 단가) + '원';
      }).join('\n\n');
    if (셈.배송비 > 0) 글 += '\n\n배송비 ' + u.콤마(셈.배송비) + '원';
    글 += '\n\n합계: ' + u.콤마(셈.합) + '원';
    var 계 = 계좌();
    if (계) 글 += '\n\n💰입금계좌\n' + 계;
    return 글;
  }
  /* 맥 문자앱이 본문을 안 받는 때가 있다 — PC 는 열기 전에 복사해 둔다 (§5) */
  function 문자열기(전화, 글) {
    if (!u.폰인가() && navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(글).catch(function () { /* 무시 — 링크는 그래도 연다 */ });
    }
    location.href = 'sms:' + 숫자만(전화) + '?body=' + encodeURIComponent(글);
  }

  /* ── 쓰기 ── */
  function 다듬기(값) {
    return {
      받는분: String(값.받는분 || '').trim(), 전화: 숫자만(값.전화), 메모: String(값.메모 || '').trim(),
      품목: (값.품목 || []).map(function (p) {
        return { 품목코드: p.품목코드, 유통명: p.유통명, 학명: p.학명 || '', 규격: p.규격 || '',
                 수량: Math.max(1, Math.floor(Number(p.수량)) || 1), 단가: Math.max(0, Number(p.단가) || 0) };
      }),
      배송비: Math.max(0, Number(값.배송비) || 0)
    };
  }
  function 새로저장(값, 보냄) {
    var 이제 = Date.now(), r = 다듬기(값);
    r.id = 새id(); r.날짜 = u.오늘문자(); r.주소 = '';
    r.상태 = 보냄 ? '보냄' : '저장';
    r.등록일시 = 이제; r.수정일시 = 이제;
    if (보냄) r.보낸일시 = 이제;
    저().덧붙이기(키(), r);
    return r;
  }
  function 고치기(id, 값) {
    var r = 하나(id);
    if (!r || r.상태 === '올림') return null;
    var 변경 = 다듬기(값);
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
    var 이름 = String(사람.받는분 || '').trim();
    if (!이름) return { 오류: '받는 분을 적어 주세요' };
    if (!(r.품목 || []).length) return { 오류: '품목이 없습니다' };

    var 오늘 = u.오늘문자(), 주문키 = 저().키.주문;
    var 주문들 = 저().읽기(주문키);
    // 🔴 중간에 끊겼다 다시 누른 것 — 줄이 이미 있으면 새로 안 만들고 상태만 맞춘다
    var 이미 = 주문들.filter(function (o) { return o.문자주문id === id; });
    var 번호 = 이미.length ? (이미[0].주문번호 || '') : 새주문번호(오늘, 주문들);
    if (!이미.length) {
      var 것 = { 이름: 이름, 전화: 전화모양(사람.전화), 주소: String(사람.주소 || '').trim(), 우편: '' };
      var 바탕 = { 주문번호: 번호, 판매처: '문자', 출처: '수동', 묶음id: '', 우편번호: '', 배송메모: '' };
      r.품목.forEach(function (p) {
        var 줄 = ZG.주문입력.줄만들기(품목st(p), 것, 오늘, '문자', 바탕);
        줄.문자주문id = id;
        저().덧붙이기(주문키, 줄);
      });
    }
    var 이제 = Date.now();
    저().바꾸기(키(), id, {
      상태: '올림', 받는분: 이름, 전화: 숫자만(사람.전화), 주소: String(사람.주소 || '').trim(),
      올린주문번호: 번호, 올린일시: 이제, 수정일시: 이제
    });
    return { 번호: 번호 };
  }

  ZG.문자주문자료 = {
    숫자만: 숫자만, 전화모양: 전화모양, 문자되나: 문자되나,
    전부: 전부, 하나: 하나, 거르기: 거르기, 점표: 점표, 오늘보낸수: 오늘보낸수,
    합계: 합계, 제목: 제목, 후보: 후보, 담을줄: 담을줄,
    문자내용: 문자내용, 문자열기: 문자열기,
    새로저장: 새로저장, 고치기: 고치기, 보냄표시: 보냄표시, 지우기: 지우기, 주문올리기: 주문올리기
  };
})(window.ZG);
