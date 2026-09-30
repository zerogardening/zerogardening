/* 15e-문자뽑기 — 견적 요청 → 주문올리기. 붙여넣은 문자에서 받는 분·전화·주소·우편번호를 뽑는다.
   뽑기()는 DOM·저장소를 안 쓰는 순수 함수다 — 브라우저 없이 시험하려고.
   🔴 붙여넣은 원문은 어디에도 저장하지 않는다. 창이 닫히면 textarea 와 함께 버린다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  // 앞뒤가 숫자가 아닌 휴대폰 번호. lookbehind 대신 앞 글자를 잡는다(옛 사파리)
  var 폰식 = /(^|[^\d])(01[016-9])[\s.\-]{0,2}(\d{3,4})[\s.\-]{0,2}(\d{4})(?!\d)/g;
  var 시도식 = /(^|[^가-힣])(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청[남북]도|충[남북]|전라[남북]도|전[남북]|경상[남북]도|경[남북]|제주)/;
  // 번지 숫자 뒤가 「시간」「번출구」「가」면 잡담이다 — 「차로 2시간」「을지로3가 2번출구」
  var 도로식 = /[가-힣0-9](로|길|동|리|가)\s*\d+(-\d+)?(?=$|[\s,.)(\[]|번지)/;
  // 주소 줄 머리말 — 「주소는」「배송지:」「(06236)」. 뗀 뒤 시·도가 맨 앞이면 진짜 주소 줄로 먼저 친다
  var 머리식 = /^\s*[-*•·]?\s*(?:(?:배송|받는|받을|보낼|보내실)\s*)?(?:주소지?|배송지|곳)?(?:는|은)?\s*[:：]?\s*(?:우편(?:번호)?\s*[:：]?\s*)?(?:[(\[]\s*\d{5}\s*[)\]]|\d{5}(?=\s))?\s*/;
  // 머리말에 바로 붙은 조사만 뗀다 — 「받는분 이수진」의 「이」는 성이다
  var 받는식 = /(받는\s*분|받는\s*사람|받는\s*이|받으시는\s*분|수령인|수취인)(?:(?:은|는|이|가|을|를)(?=[\s:：]))?\s*[:：]?\s*([^\n,/|()\d]+)/g;
  // 상세주소만 따로 적은 다음 줄 — 「101동 1203호」「2층」「OO아파트」
  var 상세식 = /\d+\s*(호|층)|\d+\s*동\s*\d+|아파트|빌라|오피스텔|맨션|타워|번지/;

  function 숫자만(s) { return String(s == null ? '' : s).replace(/\D/g, ''); }

  function 전화모양(d) {
    d = 숫자만(d);
    if (d.length === 11) return d.slice(0, 3) + '-' + d.slice(3, 7) + '-' + d.slice(7);
    if (d.length === 10) return d.slice(0, 3) + '-' + d.slice(3, 6) + '-' + d.slice(6);
    return d;
  }

  function 폰들(글) {
    var 것들 = [], m;
    폰식.lastIndex = 0;
    while ((m = 폰식.exec(글))) 것들.push(m[2] + m[3] + m[4]);
    return 것들;
  }

  function 폰지우기(줄) { return 줄.replace(폰식, '$1').replace(/\s{2,}/g, ' '); }

  function 뽑기(글, 참고) {
    참고 = 참고 || {};
    글 = String(글 || '').replace(/\r/g, '');
    var 자사 = (참고.자사번호 || []).map(숫자만).filter(Boolean);
    var 결과 = { 수령인: '', 전화: '', 주소: '', 우편번호: '' };

    /* 전화 — 자사 번호를 빼고 마지막에 나온 것 */
    var 폰 = 폰들(글).filter(function (d) { return 자사.indexOf(d) < 0; });
    if (폰.length) 결과.전화 = 전화모양(폰[폰.length - 1]);
    else {
      var 연 = String(참고.연락처 || '');
      var 연폰 = 폰들(연).filter(function (d) { return 자사.indexOf(d) < 0; });
      if (연폰.length) 결과.전화 = 전화모양(연폰[0]);
      else if (연.indexOf('@') < 0 && 숫자만(연).length >= 9) 결과.전화 = 연.trim();
    }

    /* 주소 — 시·도 뒤 몇 낱말 안에 도로명/지번이 있는 줄. 시·도가 줄 맨 앞인 줄을 먼저, 같으면 마지막 것 */
    var 줄들 = 글.split('\n');
    var 주소줄 = -1, 최고 = 0;
    줄들.forEach(function (줄, i) {
      var 깨끗 = 폰지우기(줄).replace(머리식, '');
      var m = 시도식.exec(깨끗);
      if (!m) return;
      var 앞 = 깨끗.slice(m.index + m[1].length).split(/\s+/).slice(0, 8).join(' ');
      if (!도로식.test(앞)) return;
      var 점 = m.index === 0 && !m[1] ? 2 : 1;
      if (점 >= 최고) { 최고 = 점; 주소줄 = i; }
    });
    if (주소줄 >= 0) {
      var 원 = 폰지우기(줄들[주소줄]);
      var 시작 = 시도식.exec(원);
      var 주소 = 원.slice(시작.index + 시작[1].length);
      var 다음 = 폰지우기(줄들[주소줄 + 1] || '').trim();
      if (다음 && 다음.length <= 40 && 상세식.test(다음) && !시도식.test(다음)) 주소 += ' ' + 다음;
      결과.주소 = 주소;
    }

    /* 우편번호 — 「우편」이 적힌 줄 → 주소줄 → 주소 위·아래 줄 순으로 본다 */
    // 괄호·「우편」머리말은 믿고, 그 밖엔 단독 5자리만 — 「48000원」「총 35000」 같은 금액을 거른다
    function 다섯(줄) {
      줄 = 폰지우기(줄 || '');
      var m = /[(\[]\s*([0-6]\d{4})\s*[)\]]/.exec(줄) || /우편(?:번호)?\s*[:：]?\s*([0-6]\d{4})(?!\d)/.exec(줄);
      if (m) return m[1];
      if (/금액|합계|입금|결제|가격|총액|총\s*\d/.test(줄)) return '';
      var 식 = /(^|[\s,:])([0-6]\d{4})(?=$|[\s,.])/g, n;
      while ((n = 식.exec(줄)))
        if (!/^\s*(원|만|천|개|세트|번|장|박스|주|분|명|건|%)/.test(줄.slice(n.index + n[0].length))) return n[2];
      return '';
    }
    var 후보 = 줄들.filter(function (줄) { return /우편/.test(줄); });
    if (주소줄 >= 0) 후보 = 후보.concat([줄들[주소줄], 줄들[주소줄 - 1], 줄들[주소줄 + 1]]);
    for (var i = 0; i < 후보.length && !결과.우편번호; i++) 결과.우편번호 = 다섯(후보[i]);
    // 주소 줄에 같이 적힌 우편번호는 주소에서 뗀다 — 「(06236)」「06236」
    if (결과.우편번호) 결과.주소 = 결과.주소.replace(new RegExp('(^|[^\\d])[(\\[]?\\s*' + 결과.우편번호 + '\\s*[)\\]]?(?!\\d)'), '$1 ');
    // 문자 말투 꼬리 — 「…152 입니다」「…33 으로 보내주세요」
    결과.주소 = 결과.주소.replace(/\s*(으?로\s*)?(보내\s*주세요|부탁(드려요|드립니다|해요|합니다)|입니다|이에요|예요|이요|요)?[.~!\s]*$/, '')
      .replace(/\s{2,}/g, ' ').replace(/[\s,]+$/, '').trim();

    /* 받는 분 — 머리말 뒤 값, 마지막 것 */
    var m2;
    받는식.lastIndex = 0;
    while ((m2 = 받는식.exec(글))) {
      // 같은 줄에 「전화」「주소」가 이어 적혀도 첫 낱말만 — 「김 철수」처럼 띄운 성은 붙인다
      var 낱 = m2[2].trim().split(/\s+/);
      var 붙임 = 낱[0].length === 1 && 낱[1];
      var 이름 = 붙임 ? 낱[0] + 낱[1] : 낱[0];
      // 「김철수로 해주세요」의 「로」
      if (/^(해|하|부탁|적|써|넣|바꿔|변경)/.test(낱[붙임 ? 2 : 1] || '')) 이름 = 이름.replace(/(으로|로)$/, '');
      이름 = 이름.replace(/님$/, '');
      if (이름) 결과.수령인 = 이름;
    }
    if (!결과.수령인) 결과.수령인 = String(참고.고객명 || '').trim();

    return 결과;
  }

  /* 자사 번호 — 업체 표의 내업체(10a 자사() 와 같은 조건). 주문.html 은 10a 를 안 싣는다 */
  function 자사번호() {
    var 저 = ZG.저장소;
    var 나 = 저.읽기(저.키.업체).filter(function (c) { return c.내업체 === true; })[0];
    return 나 ? [나.전화, 나.담당자전화].filter(Boolean) : [];
  }

  /* ── 창 — 16d 문자창과 같은 .pcscrim + .pcsheet 틀 ── */
  var 막 = null, 창 = null;
  function 닫기() {
    if (막) { 막.remove(); 막 = null; }
    if (창) { 창.remove(); 창 = null; }
    ZG.ui.탈출풀기();
  }

  function 열기(q) {
    닫기();
    var u = ZG.ui, 만들기 = u.만들기;
    var 글칸 = 만들기('textarea', { class: 'inp ta', rows: '12', placeholder: '문자 붙여넣기' });

    function 올리기() {
      var 글 = 글칸.value.trim();
      if (!글) { u.흔들기(글칸); u.토스트('문자를 붙여넣어 주세요'); 글칸.focus(); return; }
      var 값 = 뽑기(글, { 자사번호: 자사번호(), 고객명: q.고객명, 연락처: q.연락처 });
      var 빈 = [['수령인', '받는 분'], ['전화', '전화'], ['주소', '주소'], ['우편번호', '우편번호']]
        .filter(function (쌍) { return !값[쌍[0]]; }).map(function (쌍) { return 쌍[1]; });
      닫기();
      ZG.주문.상태.채울값 = {
        수령인: 값.수령인, 전화: 값.전화, 주소: 값.주소, 우편번호: 값.우편번호,
        경로: '문자', 견적id: q.id
      };
      ZG.주문.열기('수동');
      if (빈.length) u.토스트(빈.join('·') + '을(를) 못 찾았습니다');
    }

    var 확인 = 만들기('button', { class: 'btn sm main', type: 'button', text: '주문 채우기' });
    확인.addEventListener('click', 올리기);
    var 닫기버튼 = 만들기('button', { class: 'x', type: 'button', text: '✕', 'aria-label': '닫기' });
    닫기버튼.addEventListener('click', 닫기);

    막 = 만들기('div', { class: 'pcscrim' });
    막.addEventListener('click', 닫기);
    창 = 만들기('div', { class: 'pcsheet', role: 'dialog', 'aria-modal': 'true' }, [
      만들기('div', { class: 'hd' }, [
        만들기('h3', { text: '주문올리기' }),
        만들기('span', { class: 'hint', text: (q.고객명 || '') + (q.연락처 ? ' · ' + q.연락처 : '') }),
        만들기('span', { class: 'right' }, [확인, 닫기버튼])
      ]),
      만들기('div', { class: 'bd' }, [글칸])
    ]);
    document.body.appendChild(막);
    document.body.appendChild(창);
    u.탈출걸기(닫기);
    setTimeout(function () { 글칸.focus(); }, 20);
  }

  ZG.문자뽑기 = { 뽑기: 뽑기, 전화모양: 전화모양, 열기: 열기, 닫기: 닫기 };
})(window.ZG);
