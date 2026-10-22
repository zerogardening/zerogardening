/* 21a-현황판자료 — v3_현황판 읽기·정리(숨김) (25단계).
   🔴 '판' 줄은 아이맥 현황판올리기.py 만 쓴다. 여기서는 절대 쓰지 않는다(RLS 로는 못 막는다).
      브라우저가 쓰는 것은 '숨김:{항목id}' 줄뿐 — 한 번 정리 = 한 줄이라 올리기가 덮지 못한다.
   🔴 01·01b 를 안 고친다. ZG.서버.클라이언트 로 직접 읽고 쓴다(19-지시함과 같은 길). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 표이름 = 'v3_현황판';
  var 단계들 = ['준비', '작업중', '컨펌대기', '완료'];
  var 팀들 = ['전체', '허브', '블로그', '상품', '개발', '논문'];   // 「기타」는 칩이 없고 전체에만 든다

  function 통() {
    var 서 = ZG.서버;
    return 서 && 서.켜짐 && 서.클라이언트 ? 서.클라이언트.from(표이름) : null;
  }

  /* supabase-js 는 인터넷이 끊기면 약속을 영영 안 끝낼 때가 있다 — 10초에 끊는다 (19 와 같다) */
  function 제때(p) {
    return Promise.race([p, new Promise(function (_, 깨기) {
      setTimeout(function () { 깨기(new Error('오프라인')); }, 10000);
    })]);
  }

  function 말썽(e) {
    var m = (e && (e.message || e.msg)) || '';
    if (/오프라인|Failed to fetch|NetworkError|Load failed/i.test(m)) return '인터넷이 안 닿습니다';
    if (/does not exist|schema cache|42P01|PGRST205/i.test(m))
      return '서버에 v3_현황판 표가 아직 없습니다 — 25단계-현황판.sql 을 돌리십시오';
    return '못 읽었습니다 — ' + (m || '까닭 모름');
  }

  /* → {갱신, 항목[], 숨김:Set, 급함:Set}. 숨긴 항목은 여기서 이미 뺀다 — 목록·숫자 어디에도 안 나온다
     급함 = 우람님이 카드에서 누른 「급함」('급함:{항목id}' 줄 · 삭제됨=false) — 허브가 지시함.py 허브 로 읽는다 */
  function 불러오기() {
    var t = 통();
    if (!t) return Promise.reject(new Error('오프라인'));
    return 제때(t.select('id,내용,삭제됨')).then(function (r) {
      if (r.error) throw r.error;
      var 판 = null, 숨김 = new Set(), 급함 = new Set();
      (r.data || []).forEach(function (줄) {
        if (줄.id === '판') 판 = 줄.내용 || null;
        else if (!줄.삭제됨 && 줄.id.indexOf('숨김:') === 0 && 줄.내용) 숨김.add(줄.내용.항목);
        else if (!줄.삭제됨 && 줄.id.indexOf('급함:') === 0 && 줄.내용) 급함.add(줄.내용.항목);
      });
      var 항목 = ((판 && 판.항목) || []).filter(function (h) { return !숨김.has(h.id); });
      return { 갱신: (판 && 판.갱신) || '', 항목: 항목, 숨김: 숨김, 급함: 급함 };
    });
  }

  function 숨기기(항목) {
    var t = 통();
    if (!t) return Promise.reject(new Error('오프라인'));
    return 제때(t.upsert([{
      id: '숨김:' + 항목.id,
      내용: { 항목: 항목.id, 제목: 항목.제목, 숨긴때: new Date().toISOString() },
      삭제됨: false
    }])).then(function (r) { if (r.error) throw r.error; });
  }

  /* 급함 켜기/끄기 — 한 항목 = 한 줄('급함:{id}'), 끄면 삭제됨=true(지우지 않는다) · '판' 줄은 안 건드린다 */
  function 급함(항목, 켬) {
    var t = 통();
    if (!t) return Promise.reject(new Error('오프라인'));
    return 제때(t.upsert([{
      id: '급함:' + 항목.id,
      내용: { 항목: 항목.id, 제목: 항목.제목, 설명: 항목.긴설명 || 항목.설명 || '', 팀: 항목.팀, 날: 항목.날, 누른때: new Date().toISOString() },
      삭제됨: !켬
    }])).then(function (r) { if (r.error) throw r.error; });
  }

  /* 순수 함수 — 검수가 콘솔에서 바로 부른다. 단계 null = 완료 뺀 셋 */
  function 거르기(항목들, 단계, 팀) {
    return 항목들.filter(function (h) {
      return (단계 ? h.단계 === 단계 : h.단계 !== '완료') && (팀 === '전체' || !팀 || h.팀 === 팀);
    });
  }

  /* 흐름 칸 = 지금 팀 기준 단계별 · 칩 = 지금 단계 기준 팀별 */
  function 세기(항목들, 단계, 팀) {
    var 단 = {}, 팀수 = {};
    단계들.forEach(function (s) { 단[s] = 거르기(항목들, s, 팀).length; });
    var 이단계 = 거르기(항목들, 단계, '전체');
    팀들.forEach(function (n) {
      팀수[n] = n === '전체' ? 이단계.length : 이단계.filter(function (h) { return h.팀 === n; }).length;
    });
    return { 단계: 단, 팀: 팀수 };
  }

  ZG.현황판자료 = {
    단계들: 단계들, 팀들: 팀들,
    불러오기: 불러오기, 숨기기: 숨기기, 급함: 급함, 거르기: 거르기, 세기: 세기, 말썽: 말썽
  };
})(window.ZG);
