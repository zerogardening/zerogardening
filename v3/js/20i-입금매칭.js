/* 20i-입금매칭 — 입금 알림(34단계) ↔ 문자주문 짝 · 카드 색 띠 · 「주문 올릴까요?」 (34단계 2단계 · 11/10 우람님 「바로 만들어」).
   입금 줄은 01b 가 v3_공유설정 「입금:…」 줄을 ZG.입금줄 {id: 내용} 에 모은다(이 화면만 · 저장 안 함).
   손으로 정한 것만 문자주문 줄 「입금」 칸 하나에 남긴다 — { id: 맞다고 한 입금, 뗀: [아니라고 한 입금들] } */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 이레 = 7 * 864e5, 하루 = 864e5;
  function 자() { return ZG.문자주문자료; }

  // 구매자명 = 입금자명 — 띄어쓰기·(주)·주식회사·숫자 무시 · 은행이 잘라 보내니 앞부분이 같으면 같다
  function 이름키(s) { return String(s || '').normalize('NFC').replace(/\(주\)|㈜|주식회사|[\s\d]/g, ''); }
  function 이름같나(a, b) {
    a = 이름키(a); b = 이름키(b);
    return a.length >= 2 && b.length >= 2 && (a.indexOf(b) === 0 || b.indexOf(a) === 0);
  }
  function 금액같나(r, d) { return 자().합계(r).합 === d.금액; }

  function 입금들() {
    var 줄 = ZG.입금줄 || {}, 지금 = Date.now();
    return Object.keys(줄).map(function (id) {
      var d = 줄[id] || {};
      return { id: id, 이름: String(d.이름 || ''), 금액: Number(d.금액) || 0, 은행: d.은행 || '', 시각: d.시각 || '', ms: Date.parse(d.시각) || 0 };
    }).filter(function (d) { return d.금액 > 0 && 지금 - d.ms < 이레; })
      .sort(function (a, b) { return a.ms - b.ms; });
  }

  /* { 주문id: { 결, 입금, 확정 } } · 결 = 맞음(초록)·다름(주황)·물음(노랑)·고름(골라 주세요)·전(입금 전) — 규칙 34단계 2단계 가 */
  function 판정() {
    var 답 = {}, 쓴 = {}, 줄 = {}, 들 = 입금들();
    들.forEach(function (d) { 줄[d.id] = d; });
    var 주문 = 자().전부().filter(function (r) { return Date.now() - (r.등록일시 || 0) < 이레; });
    // ① 손으로 맞다고 한 짝이 먼저 — 한 입금은 한 주문에만
    주문.forEach(function (r) {
      var d = r.입금 && 줄[r.입금.id];
      if (d && !쓴[d.id]) { 쓴[d.id] = true; 답[r.id] = { 결: 금액같나(r, d) ? '맞음' : '다름', 입금: d, 확정: true }; }
    });
    var 빈 = 주문.filter(function (r) { return !답[r.id] && r.상태 !== '올림'; });
    function 뗐나(r, d) { return !!(r.입금 && (r.입금.뗀 || []).indexOf(d.id) >= 0); }
    // ② 남은 입금을 들어온 차례로
    들.filter(function (d) { return !쓴[d.id]; }).forEach(function (d) {
      var 남 = 빈.filter(function (r) { return !답[r.id] && !뗐나(r, d); });
      var 이름 = 남.filter(function (r) { return 이름같나(r.받는분, d.이름); });
      if (이름.length === 1) { 답[이름[0].id] = { 결: 금액같나(이름[0], d) ? '맞음' : '다름', 입금: d }; return; }
      if (이름.length > 1) {
        var 딱 = 이름.filter(function (r) { return 금액같나(r, d); });
        if (딱.length === 1) 답[딱[0].id] = { 결: '맞음', 입금: d };
        else 이름.forEach(function (r) { 답[r.id] = { 결: '고름', 입금: d }; });
        return;
      }
      var 돈 = 남.filter(function (r) { return 금액같나(r, d); });
      if (돈.length === 1) 답[돈[0].id] = { 결: '물음', 입금: d };
    });
    빈.forEach(function (r) { if (!답[r.id]) 답[r.id] = { 결: '전', 늦음: Date.now() - (r.등록일시 || 0) > 하루 }; });
    return 답;
  }

  function 때글(d) { var m = /^\d{4}-(\d\d)-(\d\d)T(\d\d:\d\d)/.exec(d.시각); return m ? Number(m[1]) + '/' + Number(m[2]) + ' ' + m[3] : ''; }
  function 띠글(r, 판) {
    var d = 판.입금;
    if (판.결 === '맞음') return '입금 ✓ ' + 때글(d) + ' · ' + u.콤마(d.금액) + '원';
    if (판.결 === '다름') {
      var 차 = d.금액 - 자().합계(r).합;
      return '금액 다름 · ' + u.콤마(d.금액) + '원 들어옴 (' + u.콤마(Math.abs(차)) + '원 ' + (차 < 0 ? '모자람' : '더 들어옴') + ')';
    }
    if (판.결 === '물음') return '이분 입금일까요? · ' + d.이름 + ' ' + u.콤마(d.금액) + '원';
    if (판.결 === '고름') return '골라 주세요 · ' + d.이름 + ' ' + u.콤마(d.금액) + '원';
    return '입금 전';
  }

  function 남기기(r, 값) {
    var 저 = ZG.저장소;
    저.바꾸기(저.키.문자주문, r.id, { 입금: 값, 수정일시: Date.now() });
  }
  function 맞다(r, d) { 남기기(r, { id: d.id, 뗀: (r.입금 && r.입금.뗀) || [] }); }
  function 아니다(r, d) { 남기기(r, { id: '', 뗀: ((r.입금 && r.입금.뗀) || []).concat(d.id) }); }

  function 띠누름(r, 판) {
    var d = 판.입금, 셈 = 자().합계(r);
    var 항목 = 판.결 === '물음' ? [{ 값: '맞음', 글: '맞음 — 이 주문 입금' }, { 값: '뗌', 글: '아님' }]
      : 판.결 === '고름' ? [{ 값: '맞음', 글: '이 주문 입금이 맞음' }, { 값: '뗌', 글: '이 주문 아님' }]
      : [{ 값: '뗌', 글: '떼어 내기' }].concat(판.결 === '다름' && !판.확정 ? [{ 값: '맞음', 글: '금액이 달라도 이 입금 맞음' }] : []);
    u.고르기({
      제목: '입금 ' + u.콤마(d.금액) + '원',
      본문: u.안전(d.은행) + ' · <b>' + u.안전(d.이름) + '</b> · ' + u.안전(때글(d)) + '<br>주문 합계 ' + u.콤마(셈.합) + '원',
      항목: 항목
    }, function (값) {
      if (!값) return;
      if (값 === '맞음') 맞다(r, d); else 아니다(r, d);
      ZG.주문.다시그리기();
    });
  }

  /* 카드 맨 위 띠 — 판 없으면 null(7일 지난 줄·올린 줄) */
  function 띠(r, 판) {
    if (!판) return null;
    var e = 만들기('div', { class: '입금띠 ' + 판.결 + (판.늦음 ? ' 늦음' : ''), text: 띠글(r, 판) });
    if (판.입금) {
      e.setAttribute('role', 'button');
      e.addEventListener('click', function (ev) { ev.stopPropagation(); 띠누름(r, 판); });
    }
    return e;
  }

  /* 「주문 올릴까요?」 — 초록일 때만(노랑은 「맞음」 뒤 초록이 된다) · 한 번 누르면 20a 주문올리기 그대로. 받는 분·주소가 비면 안 올림 */
  function 올릴단추(r, 판, 다시) {
    if (!판 || 판.결 !== '맞음' || r.상태 === '올림') return null;
    var b = 만들기('button', { class: 'btn main 큰올림', type: 'button', text: '주문 올릴까요?' });
    b.addEventListener('click', function (ev) {
      ev.stopPropagation();
      if (!r.원본줄들 && (!String(r.받는분 || '').trim() || !String(r.주소 || '').trim())) { u.토스트('받는 분·주소를 먼저 넣어 주세요'); return; }
      if (!판.확정) 맞다(r, 판.입금);   // 올린 뒤에도 띠가 남게 짝을 적어 둔다
      var 답 = 자().주문올리기(r.id, r);
      if (답.오류) { u.토스트(답.오류); 다시(); return; }
      u.토스트('주문을 올렸습니다' + (답.번호 ? ' — ' + 답.번호 : ''));
      다시();
    });
    return b;
  }

  ZG.입금매칭 = { 판정: 판정, 띠: 띠, 올릴단추: 올릴단추, 이름같나: 이름같나 };
})(window.ZG);
