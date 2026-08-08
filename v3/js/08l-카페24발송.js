/* 08l-카페24발송 — 로젠 송장번호를 카페24에 올리는 자료 (9단계 설계 §1·§4-3·§4-4)
   🔴 화면이 없다. 창은 08m.
   🔴 `진짜:true`는 08m 이 우람님 확인을 받은 뒤에만 넘긴다 — 여기서는 받은 대로만 보낸다.
      이 파일 밖에서 shipment-push 를 부르는 자리는 없다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 묶음크기 = 25;   // 함수가 주문 하나마다 카페24를 두 번 부른다 — 한 번에 다 넣으면 시간제한에 걸린다

  /* 🔴 08f.송장표와 똑같은 잣대다 — 실제로 나간 송장만 올린다 */
  var 보낼판정 = ['정상', '이미', '처리', '미차감'];

  function 값(v) { return String(v == null ? '' : v).trim(); }

  /* 로젠 결과 줄들 → 카페24로 보낼 짝 목록.
     🔴 `출처==='자동수집'`으로 좁히지 않는다 — 손업로드 건도 원천은 카페24 주문서다.
        없는 주문번호면 shipment-push 가 「카페24에 없는 주문번호입니다」로 돌려주고 아무 것도 만들지 않는다 */
  function 대상뽑기(줄들) {
    var 짝들 = [], 심폴수 = 0, 전화수 = 0, 센수 = {};

    (줄들 || []).forEach(function (것) {
      if (보낼판정.indexOf(것.판정) < 0) return;
      var 주문줄들 = 것.주문줄들 || [];

      var 심폴 = 주문줄들.some(function (r) { return r.판매처 === '심폴'; });
      if (심폴) { 심폴수++; return; }                        // ② 심폴은 아무 것도 안 보낸다

      var 번호 = 값(것.주문번호) || 값(것.연결주문번호);
      if (!번호) { 전화수++; return; }                       // 전화주문은 카페24에 없다

      // 우리가 손으로 넣은 건도 카페24에 없다
      if (주문줄들.length && 주문줄들.every(function (r) { return r.출처 === '수동'; })) return;

      var 앞선것 = 센수[번호];
      센수[번호] = (센수[번호] || 0) + 1;

      var 카페24상태 = '';
      주문줄들.forEach(function (r) { if (!카페24상태 && r.카페24상태) 카페24상태 = r.카페24상태; });

      var 켬 = true, 사유 = '';
      if (앞선것) {
        /* 카페24는 주문번호 하나에 송장 하나를 N20 품목 전부에 건다 — 합포장 둘째 줄은 꺼 둔다 */
        켬 = false; 사유 = '같은 주문번호 — 첫 송장으로 함께 나갑니다';
      } else if (카페24상태 && 카페24상태 !== '배송준비중') {
        켬 = false; 사유 = '카페24에서 이미 발송된 것으로 보입니다';
      }

      짝들.push({
        순번: 것.순번, 주문번호: 번호, 운송장번호: 값(것.운송장번호),
        수하인: 것.수하인 || '', 주문줄들: 주문줄들,
        켬: 켬, 처음사유: 사유, 미리: null, 결과: null
      });
    });

    return { 짝들: 짝들, 심폴수: 심폴수, 전화수: 전화수 };
  }

  /* 08b:240 의 order-collect 호출과 같은 모양 — r.error 먼저, d.ok 아니면 d.오류를 던진다 */
  function 부르기(짝들, 진짜) {
    var supa = ZG.서버 && ZG.서버.클라이언트;
    if (!supa) return Promise.reject(new Error('서버에 연결돼 있지 않습니다'));
    return supa.functions.invoke('shipment-push', {
      body: {
        짝들: 짝들.map(function (p) { return { 주문번호: p.주문번호, 운송장번호: p.운송장번호 }; }),
        진짜: 진짜 === true
      }
    }).then(function (r) {
      if (r.error) throw r.error;
      var d = r.data || {};
      if (!d.ok) throw new Error(d.오류 || '알 수 없는 오류');
      return d;
    });
  }

  /* 25건씩 끊어 순차로. 🔴 한 묶음이 통째로 실패해도 다음 묶음은 계속 간다 —
     그 묶음 줄들만 「서버 오류」로 채운다. 함수는 결과를 보낸 순서 그대로 돌려준다 */
  function 보내기(대상, 진짜, 진행) {
    var 전체 = (대상 || []).slice(), 남은 = 전체.slice(), 끝 = [];

    function 다음() {
      if (!남은.length) return Promise.resolve(끝);
      var 이번 = 남은.splice(0, 묶음크기);
      return 부르기(이번, 진짜).then(function (d) {
        이번.forEach(function (p, i) {
          var r = (d.결과 || [])[i] || {};
          끝.push({ 짝: p, 됨: r.됨 === true, 사유: 값(r.사유), 시험: r.시험 === true, 품목수: Number(r.품목수) || 0 });
        });
      }).catch(function (e) {
        var 말 = '서버 오류 — ' + String((e && e.message) || e).slice(0, 140);
        이번.forEach(function (p) { 끝.push({ 짝: p, 됨: false, 사유: 말, 시험: false, 품목수: 0 }); });
      }).then(function () {
        if (진행) 진행(끝.length, 전체.length);
        return 다음();
      });
    }
    return 다음();
  }

  /* 🔴 `진짜:true`로 성공한 주문번호만 되쓴다. 미리보기에서는 아무 것도 안 쓴다.
     안 쓰면 08b.나갔나()가 계속 「배송준비중」으로 보여 또 보내시게 된다.
     줄 하나 = 행 하나로 올린다(01c-보내기가 큐에 싣는다). 묶음 통째 쓰기 금지.
     같은 주문번호의 합포장 둘째 줄도 같이 쓴다 — 카페24는 그 주문의 N20 품목을 전부 발송처리한다 */
  function 상태되쓰기(짝들, 됨번호) {
    var 저 = ZG.저장소, 때 = new Date().toISOString(), 센수 = 0;
    (짝들 || []).forEach(function (p) {
      if (!됨번호[p.주문번호]) return;
      (p.주문줄들 || []).forEach(function (r) {
        if (!r || !r.id) return;
        저.바꾸기(저.키.주문, r.id, { 카페24상태: '배송완료', 상태확인: 때 });
        r.카페24상태 = '배송완료';    // 같은 창에서 다시 세도 「이미 발송」으로 잡히게
        센수++;
      });
    });
    return 센수;
  }

  ZG.카페24발송 = { 대상뽑기: 대상뽑기, 보내기: 보내기, 상태되쓰기: 상태되쓰기 };
})(window.ZG);
