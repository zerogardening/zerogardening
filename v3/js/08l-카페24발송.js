/* 08l-카페24발송 — 로젠 송장번호를 카페24에 올리는 자료 (9단계 설계 §1·§4-3·§4-4)
   🔴 화면이 없다. 창은 08m.
   🔴 `진짜:true`는 08m 이 우람님 확인을 받은 뒤에만 넘긴다 — 여기서는 받은 대로만 보낸다.
      이 파일 밖에서 shipment-push 를 부르는 자리는 없다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 묶음크기 = 25;   // 카페24
  var 심폴묶음 = 50;   // 심폴 — 함수가 묶음마다 조회 한 번 + 발송 한 번만 부른다   // 함수가 주문 하나마다 카페24를 두 번 부른다 — 한 번에 다 넣으면 시간제한에 걸린다

  /* 🔴 08f.송장표와 똑같은 잣대다 — 실제로 나간 송장만 올린다 */
  var 보낼판정 = ['정상', '이미', '처리', '미차감'];

  function 값(v) { return String(v == null ? '' : v).trim(); }

  /* 🔴 카페24가 「이미 발송처리된 주문입니다 (…)」로 돌려준 줄은 **실패가 아니다** —
     우람님이 카페24 관리자에서 직접 발송처리하신 건이다(도구/edge-배송등록/index.ts:94~100).
     카페24가 진실이므로(08b:17~19) 통합관리 주문줄도 배송완료로 맞춘다.
     안 맞추면 그 건이 「배송준비중」 탭에 영영 남아 또 보내시게 된다 (우람님 8/10) */
  function 이미나갔나(사유) { return /^이미 발송처리된 주문입니다/.test(값(사유)); }

  /* 로젠 결과 줄들 → 카페24로 보낼 짝 목록.
     🔴 `출처==='자동수집'`으로 좁히지 않는다 — 손업로드 건도 원천은 카페24 주문서다.
        없는 주문번호면 shipment-push 가 「카페24에 없는 주문번호입니다」로 돌려주고 아무 것도 만들지 않는다 */
  function 대상뽑기(줄들) {
    var 짝들 = [], 심폴짝들 = [], 섞임수 = 0, 전화수 = 0, 센수 = {}, 심센수 = {};

    (줄들 || []).forEach(function (것) {
      if (보낼판정.indexOf(것.판정) < 0) return;
      var 주문줄들 = 것.주문줄들 || [];

      var 심폴 = 주문줄들.some(function (r) { return r.판매처 === '심폴'; });
      var 밖 = 주문줄들.some(function (r) { return r.판매처 !== '심폴'; });
      /* 🔴 한 로젠 줄에 심폴과 카페24가 섞여 있으면 어느 쪽에도 안 넣는다 —
         카페24는 주문번호 하나에 송장을 걸고 심폴은 거래번호 단위라 둘을 한 송장으로 못 가른다.
         지금도 이 건은 통째로 빠져 있었다(회귀 아니다). 이름만 붙여 화면에 보여 준다 */
      if (심폴 && 밖) { 섞임수++; return; }

      var 번호 = 값(것.주문번호) || 값(것.연결주문번호);
      if (!번호) { 전화수++; return; }                       // 전화주문은 카페24에도 심폴에도 없다

      if (심폴) { 심폴짝들.push(심폴짝(것, 번호, 주문줄들, 심센수)); return; }

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

    return { 짝들: 짝들, 심폴짝들: 심폴짝들, 섞임수: 섞임수, 전화수: 전화수 };
  }

  /* ══ 심폴 ══
     🔴 진실은 심폴이다. 여기 판정은 L1(우리 기록)일 뿐이고, 실제로 보낼지는
        Edge `simpol-ship` 이 보내기 직전에 L2(배송요청 목록)·L3(송장칸)로 다시 정한다.
        화면을 위한 것이지 이것만 믿고 쏘는 것이 아니다 */
  function 심폴짝(것, 번호, 주문줄들, 심센수) {
    var 앞선것 = 심센수[번호];
    심센수[번호] = (심센수[번호] || 0) + 1;

    var 나갔나 = 주문줄들.some(function (r) { return r && r.심폴상태 === '배송완료'; });
    var 송장 = 값(것.운송장번호);
    var 켬 = true, 사유 = '';
    if (나갔나) { 켬 = false; 사유 = '이미 심폴에 발송처리됨'; }
    else if (앞선것) { 켬 = false; 사유 = '같은 거래번호 — 첫 송장으로 함께 나갑니다'; }
    else if (!송장) { 켬 = false; 사유 = '운송장번호가 없습니다'; }

    return {
      순번: 것.순번, 주문번호: 번호, 운송장번호: 송장,
      수하인: 것.수하인 || '', 주문줄들: 주문줄들,
      켬: 켬, 잠금: !켬, 처음사유: 사유, 결과: null
    };
  }

  /* 🔴 열쇠 이름이 `모드` 다 — 카페24의 `진짜:true` 를 복사해 붙여도 심폴은 조회만 하고 끝난다.
     `모드:'발송'` 은 08m 이 확인창을 통과한 뒤에만 넘긴다 */
  function 심폴부르기(짝들, 모드) {
    var supa = ZG.서버 && ZG.서버.클라이언트;
    if (!supa) return Promise.reject(new Error('서버에 연결돼 있지 않습니다'));
    return supa.functions.invoke('simpol-ship', {
      body: {
        짝들: 짝들.map(function (p) { return { 주문번호: p.주문번호, 운송장번호: p.운송장번호 }; }),
        모드: 모드 === '발송' ? '발송' : '조회'
      }
    }).then(function (r) {
      if (r.error) throw r.error;
      var d = r.data || {};
      if (!d.ok) throw new Error(d.오류 || '알 수 없는 오류');
      return d;
    });
  }

  /* 🔴 결과를 순서로 짝짓지 않는다 — 함수가 걸러낸 줄을 먼저 담아 돌려주므로 순서가 다르다.
     거래번호로 맞춘다 */
  function 심폴보내기(대상, 모드, 진행) {
    var 전체 = (대상 || []).slice(), 남은 = 전체.slice(), 끝 = [];

    function 다음() {
      if (!남은.length) return Promise.resolve(끝);
      var 이번 = 남은.splice(0, 심폴묶음);
      return 심폴부르기(이번, 모드).then(function (d) {
        var 표 = {};
        (d.결과 || []).forEach(function (r) { 표[값(r.주문번호)] = r; });
        이번.forEach(function (p) {
          var r = 표[p.주문번호] || {};
          끝.push({
            짝: p, 됨: r.됨 === true, 판정: 값(r.판정) || '알 수 없음',
            사유: 값(r.사유), 심폴송장: 값(r.심폴송장)
          });
        });
      }).catch(function (e) {
        var 말 = '서버 오류 — ' + String((e && e.message) || e).slice(0, 140);
        이번.forEach(function (p) { 끝.push({ 짝: p, 됨: false, 판정: '실패', 사유: 말, 심폴송장: '' }); });
      }).then(function () {
        if (진행) 진행(끝.length, 전체.length);
        return 다음();
      });
    }
    return 다음();
  }

  /* 🔴 `모드:'발송'` 으로 성공한 거래번호만 되쓴다. 줄 하나 = 행 하나 — 묶음 통째 쓰기 금지.
     안 쓰면 08l.심폴짝()의 L1 이 다음 번에도 체크를 켜 놓아 또 보내시게 된다 */
  function 심폴되쓰기(심폴짝들, 됨표) {
    var 저 = ZG.저장소, 때 = new Date().toISOString(), 센수 = 0;
    (심폴짝들 || []).forEach(function (p) {
      var 송장 = 됨표[p.주문번호];
      if (!송장) return;
      (p.주문줄들 || []).forEach(function (r) {
        if (!r || !r.id) return;
        저.바꾸기(저.키.주문, r.id, { 심폴상태: '배송완료', 심폴송장: 송장, 심폴발송시각: 때 });
        r.심폴상태 = '배송완료'; r.심폴송장 = 송장; r.심폴발송시각 = 때;
        센수++;
      });
    });
    return 센수;
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
          끝.push({
            짝: p, 됨: r.됨 === true, 사유: 값(r.사유), 시험: r.시험 === true,
            품목수: Number(r.품목수) || 0, 이미: r.됨 !== true && 이미나갔나(r.사유)
          });
        });
      }).catch(function (e) {
        var 말 = '서버 오류 — ' + String((e && e.message) || e).slice(0, 140);
        이번.forEach(function (p) { 끝.push({ 짝: p, 됨: false, 사유: 말, 시험: false, 품목수: 0, 이미: false }); });
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

  ZG.카페24발송 = {
    대상뽑기: 대상뽑기, 보내기: 보내기, 상태되쓰기: 상태되쓰기, 이미나갔나: 이미나갔나,
    심폴보내기: 심폴보내기, 심폴되쓰기: 심폴되쓰기
  };
})(window.ZG);
