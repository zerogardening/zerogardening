/* 20h-문자붙여넣기 — 손님 문자 붙여넣기 → 받는 분·전화·주소·상세 · 무료배송 단추 (33단계 설계 · 11/10 우람님).
   새 문자(20b)·펼친 고침 판(20c)·주문올리기 판(20d)이 같은 단추를 쓴다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;

  // 도로식은 08c 주소비교와 같은 식 — 도로명+번호까지가 주소칸, 뒤는 상세
  var 도로식 = /([가-힣A-Za-z0-9·.]+(?:로|길)(?:\s*\d+번?안?길)?)\s*(\d+)(?:\s*-\s*(\d+))?(?![\d번가길])/;
  var 지번식 = /([가-힣0-9]+(?:동|리|가))\s*(산\s*)?(\d+)(?:\s*-\s*(\d+))?(?![\d동호층])/;
  var 전화식 = /(?:\+82[\s.-]?|0)1[016789][\s.)-]*\d{3,4}[\s.-]*\d{4}|0\d{1,2}[\s.)-]+\d{3,4}[\s.-]+\d{4}/g;
  var 라벨식 = /(받는\s*(?:분|사람)|수령인|성함|이름|주소|연락처|전화번호|전화|핸드폰|휴대폰|폰번호)\s*[:：]?/g;
  var 시도식 = /(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|충청|전북|전남|전라|경북|경남|경상|제주)/;
  var 동네식 = /[가-힣]+(?:시|군|구|읍|면|동|리|로|길)(?=\s|\d|$)/;
  var 꼬리식 = /\s*(님|입니다|이에요|예요)?[~!.,\s]*$/;
  var 인사식 = /^(감사합니다|감사해요|고맙습니다|부탁드립니다|부탁드려요|안녕하세요|네|넵)$/;
  function 숫자만(s) { return String(s || '').replace(/\D/g, ''); }

  /* 돌려주는 값 { 이름, 전화들[숫자], 원문주소, 주소, 상세 } — 규칙 33단계 §1~6 · 원형 검수/45 */
  function 나누기(글) {
    글 = String(글 || '').normalize('NFC');
    var 전화들 = (글.match(전화식) || []).map(숫자만).filter(function (v, i, a) { return a.indexOf(v) === i; });
    var 조각 = 글.replace(전화식, '\n').replace(라벨식, '\n').split(/[\n\/]|,(?=\s*[가-힣]{2,4}\s*(?:,|$))/)
      .map(function (s) { return s.replace(/^[\s,.·-]+|[\s,.·-]+$/g, ''); }).filter(Boolean);
    var 주소 = '', 이름 = '';
    조각.forEach(function (s) {
      var 시 = s.search(시도식), 곳 = 시 >= 0 ? 시 : (동네식.test(s) && s.replace(/\s/g, '').length > 5 ? 0 : -1);
      if (!주소 && 곳 >= 0) {
        var 앞 = s.slice(0, 곳).replace(꼬리식, '');
        if (!이름 && /^[가-힣]{2,4}$/.test(앞)) 이름 = 앞;
        주소 = s.slice(곳); return;
      }
      if (주소 && /\d+\s*(동|호|층)|아파트|빌라|빌딩|오피스텔|맨션|타워|주택/.test(s) && !/^[가-힣]{2,4}$/.test(s)) { 주소 += ' ' + s; return; }
      var 낱 = s.replace(꼬리식, '');
      if (!이름 && /^[가-힣]{2,4}$/.test(낱) && !인사식.test(낱)) 이름 = 낱;
    });
    주소 = 주소.replace(/\s+/g, ' ').trim();
    var m = 도로식.exec(주소) || 지번식.exec(주소), 끝 = m ? m.index + m[0].length : 주소.length;
    return { 이름: 이름, 전화들: 전화들, 원문주소: 주소, 주소: 주소.slice(0, 끝).trim(), 상세: 주소.slice(끝).replace(/^[\s,]+/, '').trim() };
  }

  // 값을 넣고 input 을 쏜다 — 칸 주인(상태·사본)이 받게. 조합안전입력 칸은 맞추기로 바로
  function 넣기(e, v) { e.value = v; e.dispatchEvent(new Event('input', { bubbles: true })); if (e.맞추기) e.맞추기(); }

  /* 칸 = { 이름, 전화, 곳(20b 주소칸) } · 이름·전화가 이미 다르게 적혀 있으면 확인창으로 고르게 (질문지 3 답) */
  function 채우기(칸, 값) {
    var 다름 = [], 새전화 = 값.전화들[0] ? u.전화정리(값.전화들[0]) : '';
    var 지금이름 = 칸.이름.value.trim(), 지금전화 = 숫자만(칸.전화.value);
    if (값.이름 && 지금이름 && 지금이름 !== 값.이름) 다름.push(['받는 분', 지금이름, 값.이름, 칸.이름]);
    else if (값.이름) 넣기(칸.이름, 값.이름);
    if (새전화 && 지금전화 && 지금전화 !== 숫자만(새전화)) 다름.push(['전화번호', 칸.전화.value, 새전화, 칸.전화]);
    else if (새전화 && !지금전화) 넣기(칸.전화, 새전화);
    if (값.원문주소) { 넣기(칸.곳.주소, 값.주소); 넣기(칸.곳.상세, 값.상세); 넣기(칸.곳.우편, ''); }
    function 찾기() { if (값.원문주소 && 칸.곳.줄.찾기) 칸.곳.줄.찾기(값.원문주소); }
    if (!다름.length) { 찾기(); return; }
    u.확인({
      제목: '적힌 것과 다릅니다', 취소글: '그대로 두기', 확인글: '붙여넣은 걸로',
      본문: 다름.map(function (d) { return u.안전(d[0]) + ' · 지금 <b>' + u.안전(d[1]) + '</b> → 붙여넣은 <b>' + u.안전(d[2]) + '</b>'; }).join('<br>')
    }, function (예) {
      if (예) 다름.forEach(function (d) { 넣기(d[3], d[2]); });
      찾기();
    });
  }

  function 단추(칸) {
    var b = 만들기('button', { class: 'btn 붙단추', type: 'button', text: '📋 손님 문자 붙여넣기' });
    b.addEventListener('click', function () {
      if (!navigator.clipboard || !navigator.clipboard.readText) { u.토스트('이 기기에서는 복사한 글을 못 읽습니다'); return; }
      navigator.clipboard.readText().then(function (글) {
        var 값 = 나누기(글);
        if (!값.이름 && !값.전화들.length && !값.원문주소) { u.토스트('이름·전화·주소를 못 찾았습니다'); return; }
        채우기(칸, 값);
      }, function () { u.토스트('복사한 글을 못 읽었습니다'); });
    });
    return b;
  }

  /* 배송비 옆 「무료배송」 — 누르면 0원·무료배송, 다시 누르면 4,500 · 배송비를 치면 풀린다. 바뀜(원) 은 칸 주인이 합계를 다시 셈 */
  function 무료단추(대상, 원칸, 바뀜) {
    var b = 만들기('button', { class: 'btn sm 무료', type: 'button' });
    function 모양() { b.textContent = 대상.무료배송 ? '✓ 무료배송' : '무료배송'; b.classList.toggle('켬', !!대상.무료배송); }
    b.addEventListener('click', function () {
      대상.무료배송 = !대상.무료배송;
      var n = 대상.무료배송 ? 0 : 4500;
      원칸.value = n ? u.콤마(n) : '';
      바뀜(n); 모양();
    });
    원칸.addEventListener('input', function () { if (대상.무료배송) { 대상.무료배송 = false; 모양(); 바뀜(u.숫자(원칸.value)); } });
    모양();
    return b;
  }

  /* 자주 파는 묶음 — 최근 60일 문자주문에서 두 번 넘게 나온 같은 품목·수량 조합 위 4개를 저절로 고른다(손으로 고치는 화면 없음 · 11/10).
     품목 하나 1개짜리는 묶음이 아니다 · 지금 없는 품목이 낀 조합은 뺀다 · 단가는 지금 값 */
  function 묶음들() {
    var 지금 = Date.now(), 셈 = {}, 품 = {}, 자료 = ZG.문자주문자료;
    ZG.저장소.품목들().forEach(function (p) { 품[p.품목코드] = p; });
    자료.전부().forEach(function (r) {
      if (지금 - (r.등록일시 || 0) > 60 * 864e5) return;
      var 줄 = (r.품목 || []).map(function (p) { return [p.품목코드, Math.max(1, Number(p.수량) || 1)]; }).sort();
      if (!줄.length || 줄.some(function (c) { return !품[c[0]]; }) || (줄.length === 1 && 줄[0][1] < 2)) return;
      var k = JSON.stringify(줄);
      (셈[k] = 셈[k] || { 줄: 줄, 번: 0 }).번++;
    });
    return Object.keys(셈).map(function (k) { return 셈[k]; }).filter(function (m) { return m.번 >= 2; })
      .sort(function (a, b) { return b.번 - a.번; }).slice(0, 4)
      .map(function (m) { return m.줄.map(function (c) { return Object.assign(자료.담을줄(품[c[0]]), { 수량: c[1] }); }); });
  }
  function 묶음칸(담기) {
    var 들 = 묶음들();
    if (!들.length) return null;
    return 만들기('div', { class: '묶음줄' }, [만들기('span', { class: 'lbl', text: '자주 파는 묶음' })].concat(들.map(function (줄) {
      var b = 만들기('button', { class: 'btn sm 묶음', type: 'button', text: 줄.map(function (p) { return p.유통명 + ' ' + p.수량; }).join(' + ') });
      b.addEventListener('click', function () { 담기(줄.map(function (p) { return Object.assign({}, p); })); });
      return b;
    })));
  }

  ZG.문자붙여넣기 = { 나누기: 나누기, 단추: 단추, 무료단추: 무료단추, 묶음칸: 묶음칸 };
})(window.ZG);
