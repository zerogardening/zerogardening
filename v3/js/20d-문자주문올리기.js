/* 20d-문자주문올리기 — 「주문올리기」 판(폰 카드 속 · PC 속줄)과 PC 🖨 출력 (16단계 설계 §4 · 시안 ③).
   받는 분은 여기서만 필수다 — 비면 빨간 테두리 + 단추 잠금, 칠 때마다 다시 판정한다 (§8-1).
   인쇄는 널서리 08-출고 이력인쇄 그대로 — 인쇄 동안만 body 직계로 옮기고 클래스로 나머지를 끈다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui, 만들기 = u.만들기;
  function 자() { return ZG.문자주문자료; }

  /* 사본 = { 받는분, 전화, 주소, 우편 } — 셸이 들고 있다가 다시 그려도 되살린다 (§8-7) */
  function 판(r, 사본, 폰, 닫기) {
    var 부 = ZG.문자주문새문자;
    var 이름 = 만들기('input', { class: 'inp', type: 'text', placeholder: '받는 분', value: 사본.받는분 || '' });
    var 전화 = 부.전화칸(사본.전화, function (v) { 사본.전화 = v; }, 폰);
    var 주소 = 폰
      ? 만들기('textarea', { class: 'inp ta', rows: '2' })
      : 만들기('input', { class: 'inp', type: 'text' });
    주소.value = 사본.주소 || '';
    var 우편 = 만들기('input', { class: 'inp', type: 'text', inputmode: 'numeric', placeholder: '우편번호', value: 사본.우편 || '' });
    // 주소 찾기는 값만 넣고 input 을 안 쏜다 — 돌려주는 focus 와 올리기 직전에 맞춘다
    function 곳맞추기() { 사본.주소 = 주소.value; 사본.우편 = 우편.value; }
    주소.addEventListener('input', 곳맞추기);
    우편.addEventListener('input', 곳맞추기);
    주소.addEventListener('focus', 곳맞추기);
    var 주소줄 = 부.주소묶음(주소, 우편);

    var 닫단추 = 만들기('button', { class: 'btn', type: 'button', text: '닫기' });
    닫단추.addEventListener('click', 닫기);
    var 올림 = 만들기('button', { class: 'btn main', type: 'button', text: '주문올리기', style: 폰 ? 'flex:1' : null });
    var 누르는중 = false;

    // 값만 옮기고 class 만 바꾼다 — DOM 을 갈지 않으니 한글 조합이 안 끊긴다
    function 판정() {
      var 빔 = !String(사본.받는분 || '').trim();
      이름.classList.toggle('need', 빔);
      올림.disabled = 빔 || 누르는중;
    }
    이름.addEventListener('input', function () { 사본.받는분 = 이름.value; 판정(); });
    이름.addEventListener('compositionend', function () { 사본.받는분 = 이름.value; 판정(); });

    올림.addEventListener('click', function () {
      if (누르는중) return;
      누르는중 = true; 판정(); 곳맞추기();
      var 결과 = 자().주문올리기(r.id, 사본);
      if (결과.오류) { 누르는중 = false; 판정(); u.토스트(결과.오류); return; }
      u.토스트('주문을 올렸습니다 — ' + 결과.번호);
      닫기();
    });
    판정();

    var 밭 = 부.밭;
    if (폰) {
      return 만들기('div', { class: '속 올림' }, [
        밭('받는 분 <span class="req">필수</span>', 이름), 밭('전화번호', 전화), 밭('주소', 주소줄), 밭('우편번호', 우편, 'width:120px'),
        만들기('div', { class: 'act', style: 'margin-top:0' }, [닫단추, 올림])
      ]);
    }
    return 만들기('div', { class: '올림판' }, [
      밭('받는 분 <span class="req">필수</span>', 이름), 밭('전화번호', 전화), 밭('우편번호', 우편), 밭('주소', 주소줄),
      만들기('div', { class: '끝단추' }, [닫단추, 올림])
    ]);
  }

  function 인쇄(목록, 제목글) {
    if (!목록.length) { u.토스트('출력할 문자주문이 없습니다'); return; }
    var 자사 = ZG.업체자료 ? ZG.업체자료.자사() : null;
    var 총 = 0;
    var 표속 = 목록.map(function (r) {
      var 셈 = 자().합계(r);
      총 += 셈.합;
      var 줄들 = (r.품목 || []).map(function (p) {
        var 수량 = Number(p.수량) || 0, 단가 = Number(p.단가) || 0;
        return '<tr><td>' + u.안전(r.날짜) + '</td><td>' + u.안전(p.유통명) + ' ' + u.안전(p.규격 || '') + '</td>' +
          '<td class="r">' + u.콤마(수량) + '</td><td class="r">' + u.콤마(단가) + '</td><td class="r">' + u.콤마(수량 * 단가) + '</td></tr>';
      }).join('');
      if (셈.배송비) 줄들 += '<tr><td>' + u.안전(r.날짜) + '</td><td>배송비</td><td></td><td></td><td class="r">' + u.콤마(셈.배송비) + '</td></tr>';
      return '<tr class="dgrp"><td colspan="5">' + u.안전(자().제목(r).글) +
        '<span class="r">' + u.콤마(셈.개) + '개 · ' + u.콤마(셈.합) + '원</span></td></tr>' + 줄들;
    }).join('');

    var 문서 = 만들기('div', { class: 'doc문자' }), 옛제목 = document.title;
    document.title = '문자주문 내역_' + (제목글 || u.오늘문자());
    document.body.classList.add('문자인쇄중');
    document.body.appendChild(문서);
    문서.innerHTML =
      '<h2>문자주문 내역</h2>' +
      '<div class="dmeta">' + u.안전(자사 && 자사.이름 || '제로가드닝') +
      (자사 && 자사.전화 ? ' · ' + u.안전(자사.전화) : '') +
      '<span class="r">인쇄일 ' + u.안전(u.오늘문자()) + '</span></div>' +
      '<table><thead><tr><th>날짜</th><th>품목</th><th class="r">수량</th><th class="r">단가</th><th class="r">금액</th></tr></thead>' +
      '<tbody>' + 표속 + '</tbody>' +
      '<tfoot><tr><td colspan="4" class="r">합계</td><td class="r"><b>' + u.콤마(총) + '원</b></td></tr></tfoot></table>' +
      (자사 && 자사.입금계좌 ? '<div class="dacct">입금계좌 · ' + u.안전(자사.입금계좌) + '</div>' : '');

    function 되돌리기() {
      window.removeEventListener('afterprint', 되돌리기);
      document.title = 옛제목;
      document.body.classList.remove('문자인쇄중');
      if (문서.parentNode) 문서.parentNode.removeChild(문서);
    }
    window.addEventListener('afterprint', 되돌리기);
    setTimeout(function () { window.print(); setTimeout(되돌리기, 1500); }, 50);
  }

  ZG.문자주문올리기 = { 판: 판, 인쇄: 인쇄 };
})(window.ZG);
