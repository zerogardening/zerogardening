/* 20i-입금매칭 — 입금 알림(34단계) ↔ 문자주문 짝 · 카드 색 띠 · 「주문 올릴까요?」 (34단계 2단계 · 11/10 우람님 「바로 만들어」).
   입금 줄은 01b 가 v3_공유설정 「입금:…」 줄을 ZG.입금줄 {id: 내용} 에 모은다(이 화면만 · 저장 안 함).
   손으로 정한 것만 문자주문 줄 「입금」 칸 하나에 남긴다 — { id: 맞다고 한 입금, 뗀: [아니라고 한 입금들] } */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 이레 = 7 * 864e5, 하루 = 864e5;
  function 자() { return ZG.문자주문자료; }

  /* 구매자명(받는 분) ↔ 입금자명 (11/10 우람님) — 띄어쓰기만 빼고 똑같으면 「같음」(자동 초록).
     앞에 붙은 「048-」「048 」 숫자는 뗀다. 입금자명이 받는 분 이름을 품고 더 붙었거나(「김두용(제로가드닝)」「(주)김두용」) 은행이 잘라 앞부분만 왔으면(「김두」) 「비슷」(빨간 확인요청 · 손으로) */
  // 농협 문자는 입금자명 앞에 「048-」 같은 숫자가 붙어 온다(11/10 13:11 실례) — 떼고 견준다 · 이미 저장된 줄도 여기서 맞는다
  function 납작이름(s) { return String(s || '').normalize('NFC').replace(/^\s*\d+\s*-\s*|^\s*\d+\s+/, '').replace(/\s/g, ''); }
  function 이름비교(받는분, 입금자) {
    var a = 납작이름(받는분), b = 납작이름(입금자);
    if (a.length < 2 || b.length < 2) return '';
    if (a === b) return '같음';
    var 가 = a.replace(/\(주\)|㈜|주식회사/g, ''), 나 = b.replace(/\(주\)|㈜|주식회사/g, '');
    return b.indexOf(가 || a) >= 0 || (나.length >= 2 && 가.indexOf(나) === 0) ? '비슷' : '';
  }
  function 이름같나(a, b) { return 이름비교(a, b) === '같음'; }
  function 금액같나(r, d) { return 자().합계(r).합 === d.금액; }

  function 입금들() {
    var 줄 = ZG.입금줄 || {}, 지금 = Date.now();
    return Object.keys(줄).map(function (id) {
      var d = 줄[id] || {};
      return { id: id, 이름: String(d.이름 || ''), 금액: Number(d.금액) || 0, 은행: d.은행 || '', 시각: d.시각 || '', ms: Date.parse(d.시각) || 0 };
    }).filter(function (d) { return d.금액 > 0 && 지금 - d.ms < 이레; })
      .sort(function (a, b) { return a.ms - b.ms; });
  }

  /* { 주문id: { 결, 입금, 확정, 후보 } } · 결 = 맞음(초록)·다름(주황·차액)·고름(같은 이름 입금 둘 넘음)·확인(빨강)·전(입금 전) (11/10 우람님 규칙)
     ① 이미 짝이 적힌 줄 — 한 입금은 한 주문만: 두 기기가 같은 입금을 붙였으면 먼저 붙인 것(입금.때)이 이긴다
     ② 이름으로 — 금액 딱 맞는 주문 먼저(같은 이름 두 주문이면 안 올린 것 → 오래된 것 하나에만) ③ 남은 주문은 이름 맞는 입금이 하나면 그것(금액 다르면 주황), 둘 넘으면 「골라 주세요」
     ④ 짝이 없는 안 올린 주문에 이름이 「비슷」한 입금이 있으면 빨간 「확인요청」 — 자동으로 안 붙이고 누르면 맞음·아님
     금액만 맞는 「이분 입금일까요?」는 뺐다(비슷한 금액이 많아 거의 안 맞음) */
  function 판정(고정) {
    var 답 = {}, 쓴 = {}, 줄 = {}, 들 = 입금들(), 새짝 = [];
    들.forEach(function (d) {줄[d.id] = d; });
    var 주문 = 자().전부().filter(function (r) { return Date.now() - (r.등록일시 || 0) < 이레; });
    주문.filter(function (r) { return r.입금 && 줄[r.입금.id]; })
      .sort(function (a, b) { return (a.입금.때 || 0) - (b.입금.때 || 0); })
      .forEach(function (r) {
        var d = 줄[r.입금.id];
        if (쓴[d.id]) return;
        쓴[d.id] = true; 답[r.id] = { 결: 금액같나(r, d) ? '맞음' : '다름', 입금: d, 확정: true };
      });
    function 뗐나(r, d) { return !!(r.입금 && (r.입금.뗀 || []).indexOf(d.id) >= 0); }
    function 붙이기(r, d) { 쓴[d.id] = true; 답[r.id] = { 결: 금액같나(r, d) ? '맞음' : '다름', 입금: d }; 새짝.push([r, d]); }
    function 빈줄(d) {
      return 주문.filter(function (r) { return !답[r.id] && !뗐나(r, d) && 이름같나(r.받는분, d.이름); })
        .sort(function (a, b) { return (a.상태 === '올림') - (b.상태 === '올림') || (a.등록일시 || 0) - (b.등록일시 || 0); });
    }
    들.forEach(function (d) {
      if (쓴[d.id]) return;
      var 딱 = 빈줄(d).filter(function (r) { return 금액같나(r, d); });
      if (딱.length) 붙이기(딱[0], d);
    });
    주문.filter(function (r) { return !답[r.id]; })
      .sort(function (a, b) { return (a.상태 === '올림') - (b.상태 === '올림') || (a.등록일시 || 0) - (b.등록일시 || 0); })
      .forEach(function (r) {
        var ds = 들.filter(function (d) { return !쓴[d.id] && !뗐나(r, d) && 이름같나(r.받는분, d.이름); });
        if (ds.length === 1) 붙이기(r, ds[0]);
        else if (ds.length > 1) 답[r.id] = { 결: '고름', 입금: ds[0], 후보: ds };
        else if (r.상태 !== '올림') {
          var 비 = 들.filter(function (d) { return !쓴[d.id] && !뗐나(r, d) && 이름비교(r.받는분, d.이름) === '비슷'; });
          답[r.id] = 비.length ? { 결: '확인', 입금: 비[0], 후보: 비 } : { 결: '전', 늦음: Date.now() - (r.등록일시 || 0) > 하루 };
        }
      });
    // 처음 맞은 짝은 그 문자주문 줄에 바로 적어 고정 — 다시 열어도 안 바뀌고, 바꾸는 길은 「떼어 내기」뿐
    if (고정) 새짝.forEach(function (x) { 맞다(x[0], x[1]); 답[x[0].id].확정 = true; });
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
    if (판.결 === '고름') return '골라 주세요 · ' + d.이름 + ' 입금 ' + 판.후보.length + '건';
    if (판.결 === '확인') return '확인요청 · ' + d.이름 + ' ' + u.콤마(d.금액) + '원' + (판.후보.length > 1 ? ' 외 ' + (판.후보.length - 1) + '건' : '');
    if (판.결 === '올림') return '입금 ✓ (주문 올림)';
    return '입금 전';
  }

  function 남기기(r, 값) {
    var 저 = ZG.저장소;
    저.바꾸기(저.키.문자주문, r.id, { 입금: 값, 수정일시: Date.now() });
  }
  function 맞다(r, d) { 남기기(r, { id: d.id, 뗀: (r.입금 && r.입금.뗀) || [], 때: Date.now() }); }
  function 아니다(r, d) { 남기기(r, { id: '', 뗀: ((r.입금 && r.입금.뗀) || []).concat(d.id) }); }

  function 띠누름(r, 판) {
    var d = 판.입금, 셈 = 자().합계(r), 고름 = 판.결 === '고름', 확인 = 판.결 === '확인';
    u.고르기({
      제목: 고름 ? '어느 입금인가요?' : 확인 ? '받는 분 「' + r.받는분 + '」 입금이 맞나요?' : '입금 ' + u.콤마(d.금액) + '원',
      본문: (고름 || 확인 ? '' : u.안전(d.은행) + ' · <b>' + u.안전(d.이름) + '</b> · ' + u.안전(때글(d)) + '<br>') + '주문 합계 ' + u.콤마(셈.합) + '원',
      항목: 고름 || 확인 ? 판.후보.map(function (x) { return { 값: x.id, 글: (확인 ? '맞음 — ' : '') + x.이름 + ' ' + u.콤마(x.금액) + '원 · ' + 때글(x) }; })
          .concat(확인 ? [{ 값: '아님', 글: '아님' }] : [])
        : [{ 값: '뗌', 글: '떼어 내기' }]
    }, function (값) {
      if (!값) return;
      if (값 === '아님') 남기기(r, { id: '', 뗀: ((r.입금 && r.입금.뗀) || []).concat(판.후보.map(function (x) { return x.id; })) });
      else if (값 === '뗌') 아니다(r, d);
      else 맞다(r, 판.후보.filter(function (x) { return x.id === 값; })[0]);
      ZG.주문.다시그리기();
    });
  }

  /* 저장 직후(새 문자·고침 판·주문올리기 판) — 그 이름 입금을 바로 찾아 짝을 적고 짧게 알린다 */
  function 저장뒤(id) {
    var 전판 = 판정(true), 판 = 전판[id], r = 자().하나(id);
    if (!판 || !판.입금 || !r) return;
    자동올리기(전판);
    var d = 판.입금;
    u.토스트(판.결 === '고름' ? (r.받는분 + '님 같은 이름 입금 ' + 판.후보.length + '건 · 골라 주세요')
      : 판.결 === '확인' ? (r.받는분 + '님 비슷한 이름 입금 · ' + d.이름 + ' ' + u.콤마(d.금액) + '원 · 확인해 주세요')
      : (r.받는분 + '님 입금 있음 · ' + u.콤마(d.금액) + '원 · ' + 때글(d) + (판.결 === '다름' ? ' (금액 다름)' : '')));
  }

  /* 카드 맨 위 띠 — 판 없으면 null(7일 지난 안 올린 줄) */
  function 띠(r, 판) {
    if (!판 && r.상태 === '올림') 판 = { 결: '올림' };   // 입금 줄이 없어도 올린 주문은 입금된 것 — 7일 지난 것도
    if (!판) return null;
    var e = 만들기('div', { class: '입금띠 ' + 판.결 + (판.늦음 ? ' 늦음' : ''), text: 띠글(r, 판) });
    if (판.입금) {
      e.setAttribute('role', 'button');
      e.addEventListener('click', function (ev) { ev.stopPropagation(); 띠누름(r, 판); });
    }
    return e;
  }

  /* 자동 올리기(11/10 13:25 우람님) — 초록 입금 + 받는 분 + 주소가 갖춰지면 누르지 않아도 20a 주문올리기 그대로.
     빨강·주황·골라 주세요는 안 올림 · 예약일 전·예약 되살리기 줄도 안 함 · 두 기기가 같이 올려도 주문 줄 id 가 같아 하나(20a) */
  function 자동올리기(판) {
    var 된 = 0, 저 = ZG.저장소;
    Object.keys(판).forEach(function (id) {
      var r = 자().하나(id);
      if (!r || 판[id].결 !== '맞음' || r.상태 === '올림' || r.원본줄들) return;
      if (!String(r.받는분 || '').trim() || !String(r.주소 || '').trim() || !자().올릴수있나(r).된다) return;
      if (자().주문올리기(id, r).오류) return;
      저.바꾸기(저.키.문자주문, id, { 자동올림: true });
      된++;
    });
    if (된) u.토스트('입금 확인 · 주문 ' + 된 + '건 자동으로 올렸습니다');
    return 된;
  }

  ZG.입금매칭 = { 판정: 판정, 띠: 띠, 자동올리기: 자동올리기, 이름같나: 이름같나, 저장뒤: 저장뒤 };
})(window.ZG);
