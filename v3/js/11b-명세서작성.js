/* 11b-명세서작성 — 문서 화면 · 공급받는자/품목 넣기 · 저장 · 출력 (3단계 설계 §4 · §5)
   화면의 .doc 가 곧 종이다. 할인·단위정리·품목추가줄은 인쇄에서 빠진다(업체.css @media print). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 계 = null;                       // ZG.명세서계산 (시작 뒤에 잡는다)
  var 기본비고 = '배송비 별도';

  var 상태 = {
    종류: '거래명세서', 번호: '', 작성일: '', 납기일: '',
    받는곳: { 이름: '', 대표: '', 사업자번호: '', 주소: '', 전화: '', 담당자: '' },
    할인모드: '할인', 할인값: 0, 비고: '', 줄들: [], 스냅샷: null
  };

  var 표칸, 합계칸, 비고칸;

  function 할인율() { return 상태.할인모드 === '할증' ? -Number(상태.할인값 || 0) : Number(상태.할인값 || 0); }

  function 비고기본(계좌) {
    var 줄 = [기본비고];
    if (계좌 && 계좌.trim()) 줄.push('입금계좌: ' + 계좌.trim());
    return 줄.join('\n');
  }

  /* 사용자가 손댄 흔적이 없을 때만 갱신한다 (설계 §4-6) */
  function 비고맞추기(계좌) {
    var 지금 = 상태.비고 || '';
    var 기본같음 = 지금.trim() === '' || 지금 === 기본비고 || /^배송비 별도\s*\n\s*입금계좌:/.test(지금);
    if (!기본같음) return;
    상태.비고 = 비고기본(계좌);
    if (비고칸) 비고칸.value = 상태.비고;
  }

  function 준비() {
    계 = ZG.명세서계산;
    if (!상태.번호) 상태.번호 = 계.번호만들기();
    if (!상태.작성일) 상태.작성일 = u.오늘문자();
    var 자사 = ZG.업체자료.자사();
    비고맞추기(자사 ? (자사.입금계좌 || '') : '');
  }

  function 새로() {
    상태.줄들 = [];
    상태.받는곳 = { 이름: '', 대표: '', 사업자번호: '', 주소: '', 전화: '', 담당자: '' };
    상태.번호 = 계.번호만들기();
    상태.작성일 = u.오늘문자();
    상태.납기일 = '';
    상태.비고 = '';
    상태.스냅샷 = null;
    준비();
  }

  function 스냅샷() {
    return JSON.stringify({
      번호: 상태.번호, 종류: 상태.종류, 작성일: 상태.작성일, 납기일: 상태.납기일,
      받는곳: 상태.받는곳, 줄들: 상태.줄들, 비고: 상태.비고, 할인율: 할인율()
    });
  }

  function 요약() {
    return { 왼: 'NO. ' + (상태.번호 || '-'), 오: '품목 <b>' + 상태.줄들.length + '</b>건' };
  }

  /* ── 공급받는자 자동완성 — 업체표에서 고른다. 판매처를 앞에 둔다 ── */
  function 받는곳자동완성(입력, 담을곳, 고름) {
    var 상자 = null;
    function 닫기() { if (상자 && 상자.parentNode) 상자.remove(); 상자 = null; }
    function 열기(글) {
      닫기();
      var q = String(글 || '').trim().toLowerCase();
      var 것들 = ZG.업체자료.목록().filter(function (c) { return c.이름; }).sort(function (a, b) {
        var x = a.구분 === '판매처' ? 0 : 1, y = b.구분 === '판매처' ? 0 : 1;
        return x !== y ? x - y : (a.이름 || '').localeCompare(b.이름 || '', 'ko');
      });
      if (q) 것들 = 것들.filter(function (c) {
        return [c.이름, c.대표, c.담당자].some(function (s) { return String(s || '').toLowerCase().indexOf(q) >= 0; });
      });
      것들 = 것들.slice(0, 8);
      if (!것들.length) return;
      상자 = 만들기('div', { class: 'ac', role: 'listbox' });
      상자.appendChild(만들기('div', { class: 'hd', text: '업체 관리에 등록된 곳 ' + 것들.length + '곳 — 고르면 주소·연락처가 채워집니다' }));
      것들.forEach(function (c) {
        var 아래 = [c.구분, c.대표, c.전화].filter(Boolean).join(' · ');
        var 줄 = 만들기('button', { type: 'button', class: 'it', role: 'option' }, [
          만들기('div', {}, [만들기('div', { class: 'nm', text: c.이름 }), 만들기('div', { class: 'sub', text: 아래 })])
        ]);
        줄.addEventListener('mousedown', function (e) { e.preventDefault(); });
        줄.addEventListener('click', function () { 닫기(); 고름(c); });
        상자.appendChild(줄);
      });
      담을곳.appendChild(상자);
    }
    u.조합안전입력(입력, function (값) { 상태.받는곳.이름 = 값; 열기(값); }, 200);
    입력.addEventListener('focus', function () { 열기(입력.value); });
    입력.addEventListener('blur', function () { setTimeout(닫기, 150); });
    입력.setAttribute('autocomplete', 'off');
    return { 닫기: 닫기 };
  }

  /* ── 품목 넣기 ── */
  function 겹치나(새줄) {
    return 상태.줄들.find(function (줄) {
      var a = String(줄.품목코드 || '').trim().toUpperCase();
      var b = String(새줄.품목코드 || '').trim().toUpperCase();
      if (a && b) return a === b;
      return String(줄.유통명 || '').trim() === String(새줄.유통명 || '').trim() &&
        String(줄.규격 || '').trim() === String(새줄.규격 || '').trim();
    });
  }

  function 줄넣기(새줄) {
    var 겹 = 겹치나(새줄);
    if (겹) {
      u.토스트('이미 넣은 품목입니다 — 수량은 표에서 직접 고쳐 주세요');
      return false;
    }
    상태.줄들.push(새줄);
    표다시();
    return true;
  }

  /* 자동완성에서 고른 묶음 → 그 규격의 품목 한 개를 집는다 */
  function 묶음에서품목(g) {
    var 것 = (g.품목들 || []).find(function (p) { return p.규격 === g.최근규격; }) || g.대표;
    return {
      품목코드: 것.품목코드 || '', 유통명: 것.유통명 || '', 학명: 것.학명 || '',
      규격: g.최근규격 || 것.규격 || '', 매입단가: Number(g.최근단가) || Number(것.매입단가) || 0,
      과세구분: 것.과세구분 === '과세' ? '과세' : '면세'
    };
  }

  /* ── 표 · 합계 ── */
  function 표다시() {
    if (표칸) { if (u.폰인가()) 폰표채우기(); else 표채우기(); }
    if (합계칸) 합계채우기();
    if (u.폰인가()) ZG.업체앱.요약다시();
  }

  function 합계채우기() {
    u.비우기(합계칸);
    var 합 = 계.합계(상태.줄들);
    function 칸(이름, 값, 큰가) {
      return 만들기('span', { class: 큰가 ? 'grand' : null }, [
        만들기('span', { class: 'k', text: 이름 }),
        만들기('b', { text: u.콤마(값) }),
        document.createTextNode(이름 === '수량' ? '' : '원')
      ]);
    }
    [칸('수량', 합.수량), 칸('공급가액', 합.공급가액), 칸('세액', 합.세액), 칸('합계', 합.합계, true)]
      .forEach(function (e) { 합계칸.appendChild(e); });
  }

  /* 치는 도중에 표를 다시 그리면 이 <input> 이 통째로 갈려 포커스가 날아가고
     첫 글자만 남는다(40→12 를 치면 140 이 저장되던 사고). 그래서 그 줄의 금액칸만 갈아 끼운다 */
  function 숫자셀(줄, 밭, 폭, 바뀜) {
    var 칸 = 만들기('td', { class: 'r' });
    var 입력 = 만들기('input', {
      class: 'cellinp', type: 'number', min: '0', value: String(줄[밭] || 0),
      style: 폭 ? 'width:' + 폭 : null, 'aria-label': 밭
    });
    입력.addEventListener('input', function () {
      줄[밭] = Math.max(0, Number(입력.value) || 0);
      바뀜();
    });
    칸.appendChild(입력);
    return 칸;
  }

  function 표채우기() {
    u.비우기(표칸);
    var 표 = 만들기('table', { class: 'items' });
    var 묶 = 만들기('colgroup');
    ['34px', '96px', '', '82px', '56px', '86px', '104px', '82px', '30px'].forEach(function (w) {
      묶.appendChild(만들기('col', { style: w ? 'width:' + w : null }));
    });
    표.appendChild(묶);

    var 머리 = 만들기('tr');
    [['NO', ''], ['품목코드', ''], ['품목명', 'l'], ['규격', ''], ['수량', ''], ['단가', ''],
     ['공급가액', ''], ['세액', '']].forEach(function (쌍) {
      머리.appendChild(만들기('th', { class: 쌍[1] || null, text: 쌍[0] }));
    });
    머리.appendChild(만들기('th', { class: 'xcol' }));
    표.appendChild(머리);

    var 몸 = 만들기('tbody');
    if (!상태.줄들.length) {
      몸.appendChild(만들기('tr', {}, [만들기('td', {
        class: 'empty', colspan: '9', text: '아래 칸에서 품목을 찾아 넣어 주세요'
      })]));
    }
    상태.줄들.forEach(function (줄, i) {
      var 지움 = 만들기('button', { class: 'xbtn', type: 'button', text: '×', 'aria-label': '이 줄 지우기' });
      지움.addEventListener('click', function () { 상태.줄들.splice(i, 1); 표다시(); });
      var 공급칸 = 만들기('td', { class: 'r b' });
      var 세액칸 = 만들기('td', { class: 'r dim' });
      function 금액다시() {
        공급칸.textContent = u.콤마((Number(줄.수량) || 0) * (Number(줄.단가) || 0));
        세액칸.textContent = 줄.과세구분 === '과세' ? u.콤마(계.줄세액(줄)) : '면세';
      }
      금액다시();
      function 셀바뀜() { 금액다시(); 합계채우기(); }
      몸.appendChild(만들기('tr', {}, [
        만들기('td', { class: 'n', text: String(i + 1) }),
        만들기('td', { class: 'cd', text: 줄.품목코드 || '-' }),
        만들기('td', { class: 'nm', title: 줄.유통명 || '', text: 줄.유통명 || '' }),
        만들기('td', { class: 'sp', text: 줄.규격 || '-' }),
        숫자셀(줄, '수량', '46px', 셀바뀜),
        숫자셀(줄, '단가', '76px', 셀바뀜),
        공급칸, 세액칸,
        만들기('td', { class: 'xcol' }, [지움])
      ]));
    });
    표.appendChild(몸);
    표칸.appendChild(표);
  }

  /* ── 저장 · 출력 ── */
  function 저장() {
    if (!상태.줄들.length) { u.토스트('품목이 없어 저장할 수 없습니다'); return; }
    var 지금 = 스냅샷();
    if (상태.스냅샷 === 지금) { u.토스트('이미 저장되었습니다 (바뀐 것이 없습니다)'); return; }
    var 합 = 계.합계(상태.줄들);
    var 자사 = ZG.업체자료.자사();
    var 머리 = {
      번호: 상태.번호 || 계.번호만들기(), 종류: 상태.종류,
      작성일: 상태.작성일 || u.오늘문자(), 납기일: 상태.납기일 || '',
      받는곳: Object.assign({}, 상태.받는곳),
      공급자: 자사 ? {
        이름: 자사.이름 || '', 대표: 자사.대표 || '', 사업자번호: 자사.사업자번호 || '',
        주소: 자사.주소 || '', 전화: 자사.전화 || '', 입금계좌: 자사.입금계좌 || ''
      } : null,
      할인율: 할인율(), 비고: 상태.비고 || '',
      공급가액: 합.공급가액, 세액: 합.세액, 합계: 합.합계
    };
    ZG.업체자료.명세서저장(머리, 상태.줄들.map(function (줄) { return Object.assign({}, 줄); }));
    상태.스냅샷 = 지금;
    u.토스트('✓ 발행 이력에 저장했습니다');
    ZG.업체앱.요약다시();
  }

  /* 종이에는 .doc 만 남긴다. 길목에 표를 붙여 두고 인쇄가 끝나면 뗀다 */
  function 인쇄() {
    if (!상태.줄들.length) { u.토스트('품목을 먼저 넣어 주세요'); return; }
    var 문서 = document.querySelector('.doc');
    if (!문서) return;
    var 길 = [];
    for (var e = 문서.parentNode; e && e !== document.body; e = e.parentNode) {
      e.classList.add('인쇄길'); 길.push(e);
    }
    var 옛제목 = document.title;
    document.title = 계.인쇄파일명(상태.작성일, 상태.받는곳.이름);
    document.body.classList.add('명세서인쇄중');
    setTimeout(function () {
      window.print();
      setTimeout(function () {
        document.title = 옛제목;
        document.body.classList.remove('명세서인쇄중');
        길.forEach(function (e) { e.classList.remove('인쇄길'); });
      }, 1500);
    }, 50);
  }

  /* ── PC 문서 ── */
  function 받는곳칸(라벨, 밭, 넓게) {
    var 입력 = 만들기('input', { type: 'text', value: 상태.받는곳[밭] || '', 'aria-label': 라벨 });
    var 담을곳 = 만들기('div', { class: 'v' + (넓게 ? ' w3' : '') }, [입력]);
    if (밭 === '이름') {
      var 감쌈 = 만들기('div', { class: 'acwrap' }, [입력]);
      담을곳 = 만들기('div', { class: 'v' + (넓게 ? ' w3' : '') }, [감쌈]);
      받는곳자동완성(입력, 감쌈, function (c) {
        상태.받는곳 = {
          이름: c.이름 || '', 대표: c.대표 || '', 사업자번호: c.사업자번호 || '',
          주소: c.주소 || '', 전화: c.전화 || '', 담당자: c.담당자 || ''
        };
        u.토스트('✓ ' + c.이름 + ' 정보를 채웠습니다');
        ZG.업체앱.다시그리기();
      });
    } else if (밭 === '사업자번호' || 밭 === '전화') {
      입력.addEventListener('input', function () { 상태.받는곳[밭] = 입력.value; });
    } else {
      u.조합안전입력(입력, function (v) { 상태.받는곳[밭] = v; }, 200);
      입력.addEventListener('blur', function () { 상태.받는곳[밭] = 입력.value; });
    }
    return [만들기('div', { class: 'k', text: 라벨 }), 담을곳];
  }

  function 공급자칸() {
    var 자사 = ZG.업체자료.자사();
    var 것 = 만들기('div', { class: 'party self' }, [
      만들기('div', { class: 'ptitle', html: '공 급 자 <em>· 업체 관리에서 수정</em>' })
    ]);
    function 줄(라벨, 값, 넓게, 경고) {
      것.appendChild(만들기('div', { class: 'k', text: 라벨 }));
      것.appendChild(만들기('div', { class: 'v' + (넓게 ? ' w3' : '') + (경고 ? ' warn' : ''), text: 값 || '-' }));
    }
    if (!자사) {
      줄('상호', '⚠ 업체 등록에서 "공급자로 지정"을 체크해주세요', true, true);
      return 것;
    }
    줄('상호', 자사.이름, true);
    줄('대표자', 자사.대표);
    줄('사업자번호', 자사.사업자번호);
    줄('주소', 자사.주소, true);
    줄('연락처', 자사.전화, true);
    return 것;
  }

  /* 빈 날짜칸은 종이에 「연도. 월. 일.」로 찍힌다 — 비었으면 인쇄에서 뺀다 */
  function 날짜칸(라벨, 값, 넣기) {
    var 입력 = 만들기('input', { class: 'dt', type: 'date', value: 값 || '', 'aria-label': 라벨 });
    var 줄 = 만들기('label', { class: 값 ? null : '빈날짜' }, [만들기('span', { class: 'k', text: 라벨 }), 입력]);
    입력.addEventListener('change', function () {
      넣기(입력.value);
      줄.classList.toggle('빈날짜', !입력.value);
    });
    return 줄;
  }

  function 할인도구() {
    var 모드 = 만들기('select', { class: 'inp', 'aria-label': '할인 또는 할증' });
    ['할인', '할증'].forEach(function (m) { 모드.appendChild(만들기('option', { value: m, text: m })); });
    모드.value = 상태.할인모드;
    var 값 = 만들기('input', { class: 'pct', type: 'number', value: String(상태.할인값 || 0), 'aria-label': '할인율' });
    var 설명 = 만들기('span', { class: 'why' });

    function 설명맞추기() {
      설명.textContent = 상태.할인모드 === '할증'
        ? '단가 = (매입가×2)×(1+할증율) → 100원 반올림'
        : '단가 = (매입가×2)×(1−할인율) → 100원 반올림';
    }
    function 바뀜() {
      var 옛 = 할인율();
      상태.할인모드 = 모드.value;
      상태.할인값 = 계.할인율자르기(Number(값.value) || 0);
      설명맞추기();
      계.할인다시(상태.줄들, 옛, 할인율());
      표다시();
    }
    모드.addEventListener('change', 바뀜);
    값.addEventListener('change', 바뀜);
    설명맞추기();
    return 만들기('label', { class: 'tool' }, [
      document.createTextNode('💰'), 모드, 값, document.createTextNode(' %'), 설명
    ]);
  }

  function 정리도구() {
    var 단위 = 만들기('select', { class: 'inp', 'aria-label': '정리 단위' });
    [10, 100, 1000, 10000].forEach(function (n) {
      단위.appendChild(만들기('option', { value: String(n), text: u.콤마(n) + '원' }));
    });
    단위.value = '100';
    var 방식 = 만들기('select', { class: 'inp', 'aria-label': '정리 방식' });
    ['반올림', '올림', '내림'].forEach(function (m) { 방식.appendChild(만들기('option', { value: m, text: m })); });
    var 적용 = 만들기('button', { class: 'btn sm', type: 'button', text: '적용' });
    적용.addEventListener('click', function () {
      if (!상태.줄들.length) { u.토스트('정리할 품목이 없습니다'); return; }
      계.단위정리(상태.줄들, Number(단위.value), 방식.value);
      표다시();
      u.토스트('✓ 모든 단가를 ' + u.콤마(Number(단위.value)) + '원 단위로 ' + 방식.value + ' 했습니다');
    });
    return 만들기('label', { class: 'tool' }, [
      document.createTextNode('📐 단위 정리'), 단위, 방식, 적용
    ]);
  }

  function 도구줄() {
    var 종류 = 만들기('select', { class: 'inp', style: 'width:150px', 'aria-label': '문서 종류' });
    ['거래명세서', '견적서'].forEach(function (t) { 종류.appendChild(만들기('option', { value: t, text: t })); });
    종류.value = 상태.종류;
    종류.addEventListener('change', function () { 상태.종류 = 종류.value; ZG.업체앱.다시그리기(); });

    function 단추(글, 눌림, 주) {
      var b = 만들기('button', { class: 'btn sm' + (주 ? ' main' : ''), type: 'button', text: 글 });
      b.addEventListener('click', 눌림);
      return b;
    }
    return 만들기('div', { class: 'stbar' }, [
      종류,
      만들기('span', { class: 'hint', text: '세금계산서는 홈택스에서 발행합니다 · 💾 저장을 누르면 이력에 쌓입니다' }),
      만들기('span', { class: 'sp' }),
      단추('⚙ 내 업체정보', function () { ZG.업체앱.내업체정보(); }),
      단추('↺ 초기화', function () {
        if (!상태.줄들.length) { 새로(); ZG.업체앱.다시그리기(); return; }
        u.확인({ 제목: '지금 쓰던 명세서를 비울까요?', 본문: '넣어 둔 품목이 사라집니다.' }, function (예) {
          if (!예) return;
          새로(); ZG.업체앱.다시그리기(); u.토스트('명세서를 비웠습니다');
        });
      }),
      단추('💾 저장', 저장),
      단추('🖨 출력', 인쇄, true)
    ]);
  }

  function PC그리기(부모) {
    부모.appendChild(도구줄());

    var 받는곳 = 만들기('div', { class: 'party' }, [만들기('div', { class: 'ptitle', text: '공 급 받 는 자' })]);
    [['상호', '이름', true], ['대표자', '대표', false], ['사업자번호', '사업자번호', false],
     ['주소', '주소', true], ['연락처', '전화', false], ['담당자', '담당자', false]]
      .forEach(function (셋) { 받는곳칸(셋[0], 셋[1], 셋[2]).forEach(function (e) { 받는곳.appendChild(e); }); });

    표칸 = 만들기('div');
    합계칸 = 만들기('div', { class: 'totals' });
    var 넣기 = ZG.명세서품목.품목부품();
    var 추가단추 = 만들기('button', { class: 'btn main', type: 'button', text: '＋ 품목 추가' });
    추가단추.addEventListener('click', 넣기.추가);
    var 직접단추 = 만들기('button', { class: 'btn', type: 'button', text: '✏️ 직접 입력' });
    직접단추.addEventListener('click', ZG.명세서품목.직접입력창);

    비고칸 = 만들기('textarea', { class: 'v', rows: '2', 'aria-label': '비고' });
    비고칸.value = 상태.비고 || '';
    u.조합안전입력(비고칸, function (v) { 상태.비고 = v; }, 250);
    비고칸.addEventListener('blur', function () { 상태.비고 = 비고칸.value; });

    부모.appendChild(만들기('div', { class: 'doc' }, [
      만들기('div', { class: 'dhead' }, [
        만들기('h1', { text: 상태.종류 }),
        만들기('div', { class: 'dmeta' }, [
          만들기('div', { class: 'no', text: 'NO. ' + 상태.번호 }),
          만들기('div', { text: '발행일 ' + (상태.작성일 || '') })
        ])
      ]),
      만들기('div', { class: 'parties' }, [받는곳, 공급자칸()]),
      만들기('div', { class: 'dmetarow' }, [
        날짜칸('작성일자', 상태.작성일, function (v) { 상태.작성일 = v; ZG.업체앱.다시그리기(); }),
        날짜칸(상태.종류 === '견적서' ? '유효기간' : '납기일', 상태.납기일, function (v) { 상태.납기일 = v; }),
        할인도구(), 정리도구()
      ]),
      표칸,
      만들기('div', { class: 'addrow' }, [넣기.감쌈, 넣기.수량, 넣기.단가, 추가단추, 직접단추]),
      합계칸,
      만들기('div', { class: 'dmemo' }, [만들기('div', { class: 'k', text: '비고' }), 비고칸])
    ]));

    표채우기();
    합계채우기();
  }

  /* ── 폰 — 작성까지만. 출력은 PC 에서 한다 (시안 ③) ── */
  function 폰그리기(부모) {
    var 고르개 = 만들기('div', { class: 'toggle' });
    ['견적서', '거래명세서'].forEach(function (t) {
      var b = 만들기('button', { type: 'button', class: 상태.종류 === t ? 'on' : '', text: t, style: 'flex:1;padding:0' });
      b.addEventListener('click', function () { 상태.종류 = t; ZG.업체앱.다시그리기(); });
      고르개.appendChild(b);
    });
    부모.appendChild(고르개);

    var 이름칸 = 만들기('input', { class: 'inp', type: 'text', value: 상태.받는곳.이름 || '' });
    var 감쌈 = 만들기('div', { class: 'acwrap' }, [이름칸]);
    받는곳자동완성(이름칸, 감쌈, function (c) {
      상태.받는곳 = {
        이름: c.이름 || '', 대표: c.대표 || '', 사업자번호: c.사업자번호 || '',
        주소: c.주소 || '', 전화: c.전화 || '', 담당자: c.담당자 || ''
      };
      ZG.업체앱.다시그리기();
    });
    부모.appendChild(만들기('div', { class: 'field' }, [
      만들기('label', {}, [document.createTextNode('공급받는자 (고객) '), 만들기('span', { class: 'req', text: '*' })]),
      감쌈
    ]));

    function 날짜밭(라벨, 값, 넣기) {
      var 입력 = 만들기('input', { class: 'inp num', type: 'date', value: 값 || '' });
      입력.addEventListener('change', function () { 넣기(입력.value); });
      return 만들기('div', { class: 'field' }, [만들기('label', { text: 라벨 }), 입력]);
    }
    부모.appendChild(만들기('div', { class: 'pair' }, [
      날짜밭('작성일자', 상태.작성일, function (v) { 상태.작성일 = v; }),
      날짜밭(상태.종류 === '견적서' ? '유효기간' : '납기일', 상태.납기일, function (v) { 상태.납기일 = v; })
    ]));

    표칸 = 만들기('div', { class: 'doccard' });
    부모.appendChild(표칸);

    var 추가 = 만들기('button', { class: 'addbtn', type: 'button', text: '＋ 품목 추가' });
    추가.addEventListener('click', ZG.명세서품목.폰품목창);
    부모.appendChild(추가);

    var 저장단추 = 만들기('button', { class: 'ph-save', type: 'button', text: '저장' });
    저장단추.addEventListener('click', 저장);
    부모.appendChild(저장단추);
    부모.appendChild(만들기('div', {
      class: 'noteline', html: '🖨 <b>출력은 PC화면</b>에서 — 밭에서 잡아 두고 사무실에서 뽑습니다.'
    }));
    폰표채우기();
  }

  function 폰표채우기() {
    u.비우기(표칸);
    if (!상태.줄들.length) {
      표칸.appendChild(만들기('div', { class: 'empty', text: '아직 넣은 품목이 없습니다' }));
      return;
    }
    상태.줄들.forEach(function (줄, i) {
      var 지움 = 만들기('button', { class: 'xbtn', type: 'button', text: '×', 'aria-label': '이 줄 지우기' });
      지움.addEventListener('click', function () { 상태.줄들.splice(i, 1); 표다시(); });
      표칸.appendChild(만들기('div', { class: 'lineitem' }, [
        만들기('div', { class: 't' }, [
          만들기('b', { text: 줄.유통명 || '' }),
          만들기('span', { text: [줄.품목코드, 줄.규격].filter(Boolean).join(' · ') || '직접 입력' })
        ]),
        만들기('div', { class: 'q', text: u.콤마(줄.수량) + ' × ' + u.콤마(줄.단가) }),
        만들기('div', { class: 'a', text: u.콤마((Number(줄.수량) || 0) * (Number(줄.단가) || 0)) }),
        지움
      ]));
    });
    var 합 = 계.합계(상태.줄들);
    표칸.appendChild(만들기('div', { class: 'grandline' }, [
      만들기('span', { class: 'k', text: 합.세액 ? '합계 (세액 포함)' : '합계 (면세)' }),
      만들기('span', { class: 'v', text: u.콤마(합.합계) })
    ]));
  }

  function 그리기(부모) {
    준비();
    표칸 = null; 합계칸 = null; 비고칸 = null;
    if (u.폰인가()) 폰그리기(부모); else PC그리기(부모);
  }

  /* 이력에서 한 장을 다시 연다 — 새 장이 아니라 그 장이라 번호도 그대로 쓴다 (설계 §5) */
  function 불러오기(id) {
    계 = ZG.명세서계산;
    var 머리 = ZG.업체자료.명세서찾기(id);
    if (!머리) return;
    var d = Number(머리.할인율) || 0;
    상태.종류 = 머리.종류 || '거래명세서';
    상태.번호 = 머리.번호 || 계.번호만들기();
    상태.작성일 = 머리.작성일 || u.오늘문자();
    상태.납기일 = 머리.납기일 || '';
    상태.받는곳 = Object.assign({ 이름: '', 대표: '', 사업자번호: '', 주소: '', 전화: '', 담당자: '' }, 머리.받는곳 || {});
    상태.할인모드 = d < 0 ? '할증' : '할인';        // 실데이터 1건이 −20(할증 20%)이다
    상태.할인값 = Math.abs(d);
    상태.비고 = 머리.비고 || '';
    상태.줄들 = ZG.업체자료.명세서줄들(id).map(function (줄) {
      return {
        품목코드: 줄.품목코드 || '', 유통명: 줄.유통명 || '', 학명: 줄.학명 || '', 규격: 줄.규격 || '',
        수량: Number(줄.수량) || 0, 단가: Number(줄.단가) || 0,
        매입단가: Number(줄.매입단가) || 0, 과세구분: 줄.과세구분 === '과세' ? '과세' : '면세'
      };
    });
    준비();                                        // 계좌·비고를 먼저 맞춘 뒤에 찍어야 스냅샷이 어긋나지 않는다
    상태.스냅샷 = 스냅샷();                        // 불러온 직후 또 저장하면 중복이다
    u.토스트('✓ ' + 상태.종류 + ' ' + 상태.번호 + ' 불러왔습니다');
  }

  ZG.명세서 = {
    상태: 상태, 그리기: 그리기, 불러오기: 불러오기,
    준비: 준비, 새로: 새로, 요약: 요약, 할인율: 할인율,
    비고기본: 비고기본, 비고맞추기: 비고맞추기, 스냅샷: 스냅샷,
    표다시: 표다시, 줄넣기: 줄넣기, 묶음에서품목: 묶음에서품목,
    받는곳자동완성: 받는곳자동완성, 저장: 저장, 인쇄: 인쇄
  };
})(window.ZG);
