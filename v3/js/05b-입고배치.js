/* 05b-입고배치 — 입고 탭의 PC · 폰 배치 (설계 §4-1)
   입고 내역 목록은 05d, 수정 · 삭제는 05e 에 있다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  var 내 = ZG.입고내부, 상태 = 내.상태, 참조 = 내.참조;

  /* ── PC 배치 ── */
  function PC배치() {
    참조.경고칸 = 만들기('div');
    참조.자동완성칸 = 만들기('div', { style: 'flex:1' });
    참조.코드라벨 = 만들기('span', { class: 'auto', text: '자동 생성' });

    var 코드칸 = 만들기('input', { class: 'inp code', readonly: 'readonly', 'aria-readonly': 'true', value: 상태.코드 });
    참조.코드 = 코드칸;
    참조.금액 = 만들기('input', { class: 'inp num code', readonly: 'readonly', value: '0' });

    var 폼 = 만들기('div', { class: 'card' });
    폼.appendChild(만들기('h3', {
      html: '입고 등록' +
        '<span class="right" style="display:flex; gap:var(--space-sm)">' +
        '<button class="btn sm" aria-disabled="true">엑셀 불러오기</button>' +
        '<button class="btn sm" aria-disabled="true">여러 건 한꺼번에</button></span>'
    }));

    폼.appendChild(만들기('div', { class: 'row' }, [
      내.필드('입고일자 <span class="req">*</span>', 내.입력칸('입고일', { type: 'date' }), 'width:150px', '입고일'),
      내.필드('입고업체 <span class="req">*</span>', 업체칸(), 'width:170px', '입고업체'),
      내.필드('유통명 <span class="req">*</span>', 유통명칸(), 'width:190px', '유통명'),
      내.필드('학명 <span class="auto">치는 즉시 후보가 뜹니다</span>', 학명칸(), 'flex:1; min-width:220px', '학명')
    ]));
    폼.appendChild(만들기('div', { class: 'row', style: 'margin-top:calc(var(--space-lg) * -1)' }, [
      만들기('div', { style: 'width:330px' }), 참조.자동완성칸
    ]));
    폼.appendChild(만들기('div', { class: 'row' }, [
      내.필드('규격 <span class="req">*</span>', 내.규격칸(), 'flex:1')
    ]));
    폼.appendChild(만들기('div', { class: 'row bottom' }, [
      내.필드('수량 <span class="req">*</span>', 내.숫자칸('수량'), 'width:118px', '수량'),
      내.필드('매입단가 <span class="req">*</span>', 내.숫자칸('매입단가'), 'width:138px', '매입단가'),
      내.필드('금액 <span class="auto">자동 계산</span>', 참조.금액, 'width:150px'),
      내.필드('과세 · 면세 <span class="req">*</span>', 내.과세칸(), 'width:186px'),
      코드필드(코드칸, 'width:178px')
    ]));
    폼.appendChild(만들기('div', { class: 'row' }, [메모필드('flex:1')]));

    var 단추줄 = 만들기('div', { class: 'row bottom' }, [만들기('div', { class: 'spacer' })]);
    참조.저장단추들 = [];
    [['칸 비우기', 'btn', '비우기'], ['저장하고 끝내기', 'btn', '끝내기'], ['저장하고 계속', 'btn main wide', '계속']]
      .forEach(function (셋) {
        var b = 만들기('button', { class: 셋[1], type: 'button', text: 셋[0] });
        b.addEventListener('click', function () { ZG.입고.단추(셋[2]); });
        if (셋[2] !== '비우기') 참조.저장단추들.push(b);
        단추줄.appendChild(b);
      });
    폼.appendChild(단추줄);
    폼.appendChild(참조.경고칸);
    폼.appendChild(특성칸());

    return [폼, ZG.입고내역.내역카드()];
  }

  /* ── 폰 배치 ── */
  function 폰배치() {
    참조.경고칸 = 만들기('div');
    참조.자동완성칸 = 만들기('div');
    참조.코드라벨 = 만들기('span', { class: 'auto', text: '자동 생성' });
    var 코드칸 = 만들기('input', { class: 'inp code', readonly: 'readonly', 'aria-readonly': 'true', value: 상태.코드 });
    참조.코드 = 코드칸;

    var 저장 = 만들기('button', { class: 'ph-save', type: 'button', text: '저장하고 다음 것 입력' });
    저장.style.marginTop = '0';   // 아래에 입고 내역이 이어지므로 바닥으로 밀지 않는다
    저장.addEventListener('click', function () { ZG.입고.단추('계속'); });
    참조.저장단추들 = [저장];

    참조.내역칸 = 만들기('div');
    ZG.입고내역.내역다시();

    return [
      내.필드('입고업체 <span class="req">*</span> <span class="auto">오늘 계속 이 업체입니다</span>', 업체칸(), null, '입고업체'),
      내.필드('유통명 <span class="req">*</span>', 유통명칸(), null, '유통명'),
      참조.자동완성칸,
      내.필드('학명 <span class="auto">골라주시면 저절로 채워집니다</span>', 학명칸(), null, '학명'),
      내.필드('규격 <span class="req">*</span> <span class="auto">「치」로 들어와도 cm로 저장합니다</span>', 내.규격칸()),
      만들기('div', { class: 'pair' }, [
        내.필드('수량 <span class="req">*</span>', 내.숫자칸('수량'), null, '수량'),
        내.필드('매입단가 <span class="req">*</span>', 내.숫자칸('매입단가'), null, '매입단가')
      ]),
      만들기('div', { class: 'pair' }, [
        내.필드('과세 · 면세 <span class="req">*</span>', 내.과세칸()),
        코드필드(코드칸)
      ]),
      메모필드(),
      참조.경고칸,
      특성칸(),
      저장,
      참조.내역칸
    ];
  }

  function 코드필드(코드칸, 스타일) {
    var f = 만들기('div', { class: 'field', style: 스타일 || null });
    var l = 만들기('label', { text: '품목코드 ' });
    l.appendChild(참조.코드라벨);
    f.appendChild(l); f.appendChild(코드칸);
    return f;
  }

  function 메모필드(스타일) {
    return 내.필드('메모 <span class="auto">선택 · 이 입고 건에만 남습니다</span>',
      내.입력칸('메모', { placeholder: '예) 잎 상태 좋음 · 화분 깨진 것 3개 반품' }), 스타일);
  }

  function 특성칸() {
    참조.특성 = ZG.특성.접기(null);
    var 감쌈 = 참조.특성.요소;
    감쌈.style.marginTop = 'var(--space-xl)';
    return 감쌈;
  }

  /* ── 자동완성이 붙는 칸 ── */
  function 유통명칸() {
    var e = 내.입력칸('유통명');
    u.자동완성({ 입력: e, 담을곳: 참조.자동완성칸, 고름: 내.후보채우기, 새로: function () { 참조.학명 && 참조.학명.focus(); } });
    return e;
  }
  function 학명칸() {
    var e = 내.입력칸('학명', { class: 'inp sci' });
    e.addEventListener('change', 내.코드갱신);
    e.addEventListener('blur', 내.코드갱신);
    u.자동완성({ 입력: e, 담을곳: 참조.자동완성칸, 고름: 내.후보채우기, 새로: 내.코드갱신 });
    return e;
  }
  function 업체칸() {
    var 업체 = ZG.저장소.읽기(ZG.저장소.키.업체);
    var e = 내.입력칸('입고업체', { list: 'zg-업체목록' });
    var 목록 = 만들기('datalist', { id: 'zg-업체목록' });
    목록.innerHTML = 업체.map(function (c) { return '<option value="' + u.안전(c.이름) + '">'; }).join('');
    return 만들기('div', { style: 'position:relative' }, [e, 목록]);
  }

  ZG.입고배치 = { PC배치: PC배치, 폰배치: 폰배치, 업체칸: 업체칸 };
})(window.ZG);
