/* 06l-품절자료 — 상품 › 품절 탭이 보는 자료 (23단계 설계 §3)
   `v3_지시` 의 마켓품절·마켓판매 줄을 읽어 품목별 카드로 만든다. 화면은 06m 이 그린다.
   🔴 01-저장소·01b-서버를 안 고친다 — `v3_지시` 를 01b 표들에 넣으면 채널 하나에 다 걸린다(16단계 §1-3).
      19-지시함처럼 ZG.서버.클라이언트 로 직접 읽는다.
   🔴 마켓 칸은 쓰는 이가 둘이다 — 카페24 는 06k 가 줄을 만들 때, 나머지 여섯은 맥(지시함.py)이 끝날 때. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 마켓들 = ['카페24', '심폴', '스마트스토어', '쿠팡', 'G마켓', '롯데ON', '11번가'];
  var 폴링초 = 15, 날수 = 30;
  var 줄들 = [], 오류 = '', 읽음 = false, 서명 = '', 타이머 = null, 읽는중 = false, 또 = false;

  function 클() {
    var 서 = ZG.서버;
    return 서 && 서.켜짐 && 서.클라이언트 ? 서.클라이언트 : null;
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
      return '서버에 v3_지시 표가 아직 없습니다 — 16단계-지시함.sql 을 돌리십시오';
    return '못 읽었습니다 — ' + (m || '까닭 모름');
  }

  function 읽기() {
    var c = 클();
    if (!c) return Promise.reject(new Error('오프라인'));
    // id 앞 13자리 = 보낸때 ms — 문자열 비교가 곧 시간 비교다
    return 제때(c.from('v3_지시').select('id,내용,삭제됨')
      .eq('삭제됨', false).in('내용->>갈래', ['마켓품절', '마켓판매'])
      .gte('id', String(Date.now() - 날수 * 864e5))
      .order('id', { ascending: false }).limit(300))
      .then(function (답) {
        if (답 && 답.error) throw 답.error;
        return ((답 && 답.data) || []).map(function (r) { return { id: r.id, 내용: r.내용 || {} }; });
      });
  }

  function 새로() {
    if (읽는중) { 또 = true; return; }      // 06k 가 막 쌓은 줄을 놓치지 않게 끝나면 한 번 더
    읽는중 = true;
    읽기().then(function (것) {
      줄들 = 것; 오류 = ''; 읽음 = true;
    }, function (e) {
      오류 = 말썽(e);
    }).then(function () {
      읽는중 = false;
      if (또) { 또 = false; setTimeout(새로, 0); }
      var 새서명 = 오류 ? '!' + 오류 : 줄들.map(function (r) {
        return r.id + (r.내용.상태 || '') + JSON.stringify(r.내용.마켓 || null);
      }).join('|');
      if (새서명 === 서명) return;
      서명 = 새서명;
      배지칠하기();
      if (ZG.품절 && ZG.품절.다시) ZG.품절.다시();
    });
  }

  function 시작() {
    if (타이머) return;
    새로();
    타이머 = setInterval(function () { if (!document.hidden) 새로(); }, 폴링초 * 1000);
    document.addEventListener('visibilitychange', function () { if (!document.hidden) 새로(); });
  }

  /* ── 파생 ── */
  function 칸상태(줄, 마켓) {
    var 내 = 줄.내용, 칸 = (내.마켓 || {})[마켓];
    if (칸) {
      var 값 = 칸.상태 === '완료' ? 'ok' : 칸.상태 === '없음' ? 'none' : 'fail';
      return { 마켓: 마켓, 값: 값, 사유: 칸.사유 || '', 때: 칸.때 || null };
    }
    var 상 = 내.상태;
    if (상 === '대기') return { 마켓: 마켓, 값: 'wait', 사유: '', 때: null };
    if (상 === '하는중') return { 마켓: 마켓, 값: 'run', 사유: '', 때: null };
    if (상 === '실패' || 상 === '거부')
      return { 마켓: 마켓, 값: 'fail', 사유: String(내.답장 || '').split('\n')[0], 때: 내.답한때 || null };
    return { 마켓: 마켓, 값: 'unk', 사유: '', 때: null };
  }

  function 품목표() {
    var 표 = {};
    (ZG.저장소.읽기(ZG.저장소.키.품목) || []).forEach(function (p) { 표[p.품목코드] = p; });
    return 표;
  }

  function 카드들() {
    var 표 = 품목표(), 본 = {}, 카 = [];
    줄들.forEach(function (줄) {             // id 내림차순 — 품목마다 처음 만난 것이 가장 최근
      var 내 = 줄.내용, 코드 = 내.품목코드;
      if (!코드 || 본[코드]) return;
      본[코드] = true;
      var p = 표[코드] || {};
      var 칸 = 마켓들.map(function (m) { return 칸상태(줄, m); });
      var 셈 = function (v) { return 칸.filter(function (k) { return k.값 === v; }).length; };
      var 무리 = 셈('fail') ? '실패' : (내.상태 === '대기' || 내.상태 === '하는중') ? '진행중' : '완료';
      카.push({
        품목코드: 코드, id: 줄.id, 갈래: 내.갈래, 다시판매: 내.갈래 === '마켓판매',
        보낸때: 내.보낸때 || Number(String(줄.id).slice(0, 13)) || 0,
        이름: p.유통명 || 내.폴더 || 코드, 학명: p.학명 || '',
        칸: 칸, 완료수: 셈('ok'), 실패수: 셈('fail'), 분모: 마켓들.length - 셈('none'),
        무리: 무리, 옛줄: !내.마켓, 상태: 내.상태 || '', 답장: 내.답장 || ''
      });
    });
    var 순 = { 실패: 0, 진행중: 1, 완료: 2 };
    return 카.sort(function (a, b) {
      if (a.무리 !== b.무리) return 순[a.무리] - 순[b.무리];
      // 진행중은 먼저 보낸 것이 위 — 맥이 집는 순서다
      return a.무리 === '진행중' ? a.보낸때 - b.보낸때 : b.보낸때 - a.보낸때;
    });
  }

  /* 실패가 있으면 빨강 + 실패 수 · 진행중만 있으면 회색 + 진행중 수 · 아니면 숨김.
     못 읽었으면 숨긴다 — 숫자를 지어내지 않는다 */
  function 배지칠하기() {
    var 실 = 0, 진 = 0;
    if (읽음 && !오류) 카드들().forEach(function (c) { if (c.무리 === '실패') 실++; else if (c.무리 === '진행중') 진++; });
    Array.prototype.forEach.call(document.querySelectorAll('[data-품절배지]'), function (b) {
      var n = 실 || 진;
      b.hidden = !n;
      b.textContent = n ? String(n) : '';
      b.classList.toggle('빨강', !!실);
    });
    if (ZG.앱 && ZG.앱.알약맞추기) ZG.앱.알약맞추기();
  }

  ZG.품절자료 = {
    시작: 시작, 새로: 새로, 카드들: 카드들, 배지칠하기: 배지칠하기, 마켓들: 마켓들,
    상태: function () { return { 오류: 오류, 읽음: 읽음 }; }
  };
})(window.ZG);
