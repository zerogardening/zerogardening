/* 06l-품절자료 — 상품 › 품절 탭이 보는 자료 (23단계 설계 §3)
   `v3_지시` 의 마켓품절·마켓판매 줄을 읽어 품목별 카드로 만든다. 화면은 06m 이 그린다.
   옛 줄(마켓 칸 없음)은 답장 글에서 마켓 이름이 찍힌 것만 뽑아 칸을 채운다 — 23단계 후속.
   🔴 01-저장소·01b-서버를 안 고친다 — `v3_지시` 를 01b 표들에 넣으면 채널 하나에 다 걸린다(16단계 §1-3).
      19-지시함처럼 ZG.서버.클라이언트 로 직접 읽는다.
   🔴 마켓 칸은 쓰는 이가 둘이다 — 카페24 는 06k 가 줄을 만들 때, 나머지 여섯은 맥(지시함.py)이 끝날 때.
   🔴 10/23 — 15초마다 통째로 다시 받지 않는다(Supabase 전송량 초과로 앱 정지). 01d-지시구독이 알려 준
      바뀐 줄이 품절·판매(또는 업로드) 줄일 때만 다시 받는다. 15초 타이머는 첫 받기가 안 됐을 때만. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 마켓들 = ['카페24', '심폴', '스마트스토어', '쿠팡', 'G마켓', '롯데ON', '11번가'];
  var 폴링초 = 15, 날수 = 30;
  var 품절갈래 = ['마켓품절', '마켓판매'];
  // 🔴 이때부터 낸 지시만 보인다 — 그 전 것은 우람님이 「다 정리하고 앞으로 지시한 것만」 (2026-10-16 23:5x). 표에서 지우지 않는다
  var 시작점 = 1792162504808;
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
      .eq('삭제됨', false).in('내용->>갈래', 품절갈래)
      .gte('id', String(Math.max(시작점, Date.now() - 날수 * 864e5)))
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

  /* 카드 삭제 = 그 품목의 품절·판매 지시 줄을 전부 소프트 삭제(삭제됨=true).
     🔴 가장 최근 줄만 지우면 더 옛 줄이 카드로 되살아난다 — 보이는 줄 전부를 지운다.
     🔴 진행중(대기·하는중) 줄은 맥이 집을 수 있어 안 지운다. 마켓 상태는 건드리지 않는다. */
  function 지우기(코드) {
    var c = 클();
    if (!c) return Promise.reject(new Error('오프라인'));
    var 들 = 줄들.filter(function (r) { return r.내용.품목코드 === 코드; });
    if (들.some(function (r) { return r.내용.상태 === '대기' || r.내용.상태 === '하는중'; }))
      return Promise.reject(new Error('진행중이라 지울 수 없습니다'));
    var 아이디 = 들.map(function (r) { return r.id; });
    return 제때(c.from('v3_지시').update({ 삭제됨: true }).in('id', 아이디)).then(function (답) {
      if (답 && 답.error) throw 답.error;
      줄들 = 줄들.filter(function (r) { return 아이디.indexOf(r.id) < 0; });
      서명 = ''; 배지칠하기();
      if (ZG.품절 && ZG.품절.다시) ZG.품절.다시();
    });
  }

  function 시작() {
    if (타이머) return;
    새로();
    타이머 = setInterval(function () {
      if (document.hidden) return;
      if (!읽음) 새로();
      if (보이나() && !올.읽음) 업로드새로();
    }, 폴링초 * 1000);
    ZG.지시구독.듣기(function (바뀐) {
      var 갈래 = 바뀐.map(function (r) { return (r.내용 || {}).갈래; });
      // 지운 줄(DELETE)은 갈래를 모른다 — 그땐 둘 다 다시
      var 모름 = 바뀐.some(function (r) { return !r.내용; });
      if (모름 || 갈래.some(function (g) { return 품절갈래.indexOf(g) >= 0; })) 새로();
      if (보이나() && (모름 || 갈래.indexOf('카페24올리기') >= 0)) 업로드새로();
    });
  }

  /* ── 파생 ── */
  /* 옛 답장(맥이 글로만 적던 때 — `내용.마켓` 없음)에서 마켓별 상태를 뽑는다. 마켓 이름이 분명히 찍힌 것만.
     🔴 카페24 는 답장에 안 나온다(06k 가 Edge 로 먼저 한다) — 「카페24가 판매안함」은 다른 마켓 실패의 까닭이다.
     🔴 이름 없는 줄(「전송요청 창이 안 떴다」)은 어느 마켓인지 짐작하지 않는다 — 그 마켓은 「기록 없음」. */
  var 맥마켓 = 마켓들.slice(1);
  function 한줄(s) {
    return s.replace(/`[^`]*`/g, '').replace(/\*\*/g, '').replace(/^[\s│├└▶\-✅❌🔴⏳]+/, '')
      .split(' — ')[0].replace(/\s+/g, ' ').trim();
  }
  function 이름들(s) { return 맥마켓.filter(function (m) { return s.indexOf(m) >= 0; }); }

  function 옛칸들(답장) {
    var 나무 = {}, 낱 = {}, 묶 = '', 구역 = '', 구역결 = {}, 무리 = { 스스: [], 넷: [], 이미: [] }, 코드안 = false;
    String(답장 || '').split('\n').forEach(function (줄) {
      var t = 줄.trim(), m;
      if (/^```/.test(t)) { 코드안 = !코드안; 묶 = 구역 = ''; return; }
      // 마켓플러스 출력 나무 — 「할 것」 목록과 그 아래 ▶ 구역의 ✅/🔴 를 짝짓는다
      if (/^├\s*스마트스토어 \d+행/.test(t)) { 묶 = '스스'; return; }
      if (/^├\s*그 밖 \d+행/.test(t)) { 묶 = '넷'; return; }
      if (/^└\s*이미 그 상태라 안 건드림/.test(t)) { 묶 = '이미'; return; }
      if ((m = /^│?\s*(스마트스토어|쿠팡|G마켓|롯데ON|11번가) \(/.exec(t)) && 묶) { 무리[묶].push(m[1]); return; }
      if (/^▶/.test(t)) { 묶 = ''; 구역 = /^▶\s*그 밖 넷/.test(t) ? '넷' : /^▶\s*스마트스토어/.test(t) ? '스스' : ''; return; }
      if (/^말:/.test(t)) { 묶 = 구역 = ''; return; }
      if (구역 && /🔴/.test(t) && (!구역결[구역] || 구역결[구역].값 !== 'fail')) { 구역결[구역] = { 값: 'fail', 사유: 한줄(t) }; return; }
      if (구역 && /^✅/.test(t) && !구역결[구역]) { 구역결[구역] = { 값: 'ok', 사유: '' }; return; }
      // 심폴 도구 출력
      if (/심폴에 없다/.test(t)) { 나무.심폴 = 나무.심폴 || { 값: 'none', 사유: '심폴에 없다' }; return; }
      if (/✅\s*(품절|무제한) 로 바뀐 것을 확인했다/.test(t)) { 나무.심폴 = 나무.심폴 || { 값: 'ok', 사유: '' }; return; }
      // 요약 줄 — 표시로 시작하고 마켓 이름이 꼭 하나인 줄만
      var 표 = /^(?:-\s*)?(✅|❌|🔴)/.exec(t), 든 = 이름들(t);
      if (!코드안 && 표 && 든.length === 1 && !낱[든[0]])
        낱[든[0]] = { 값: 표[1] === '✅' ? 'ok' : 'fail', 사유: 표[1] === '✅' ? '' : 한줄(t) };
    });
    무리.이미.forEach(function (m) { 나무[m] = { 값: 'ok', 사유: '이미 그 상태' }; });
    무리.넷.forEach(function (m) { if (구역결.넷) 나무[m] = 구역결.넷; });
    무리.스스.forEach(function (m) { if (구역결.스스) 나무[m] = 구역결.스스; });
    Object.keys(낱).forEach(function (m) { if (!나무[m]) 나무[m] = 낱[m]; });
    return 나무;
  }

  // 미확인 = 전송은 됐는데 쿠팡 WING 으로 확인을 못 했다 (노랑 · 실패 아님 · 「실패만 다시」에 안 든다)
  function 값(상태) {
    return { 완료: 'ok', 없음: 'none', 미확인: 'chk', 대기: 'wait' }[상태] || 'fail';
  }

  /* 10/17 전 줄 — WING 확인을 못 한 쿠팡을 「실패」로 덮어 적었다(마켓플러스품절.py 고침 전).
     답장에 확인 못 한 까닭이 찍혀 있으면 미확인으로 읽는다. 표는 고치지 않는다 */
  function 고친마켓(내) {
    var 마 = 내.마켓, 쿠 = 마 && 마['쿠팡'];
    if (!쿠 || 쿠.상태 !== '실패' || !/^WING 확인/.test(쿠.사유 || '') ||
        !/WING (로그인이 풀려|크롬에 못 붙었다|목록에서)/.test(내.답장 || '')) return 마;
    var 새 = {};
    Object.keys(마).forEach(function (k) { 새[k] = 마[k]; });
    새['쿠팡'] = { 상태: '미확인', 사유: '전송 완료 · 쿠팡 확인 못 함 (WING)', 때: 쿠.때 };
    return 새;
  }

  function 칸상태(줄, 마켓, 옛) {
    var 내 = 줄.내용, 칸 = (고친마켓(내) || {})[마켓];
    if (칸) return { 마켓: 마켓, 값: 값(칸.상태), 사유: 칸.사유 || '', 때: 칸.때 || null };
    var 상 = 내.상태;
    if (상 === '대기') return { 마켓: 마켓, 값: 'wait', 사유: '', 때: null };
    if (상 === '하는중') return { 마켓: 마켓, 값: 'run', 사유: '', 때: null };
    // 지시가 「실패」여도 7칸을 다 빨갛게 칠하지 않는다 — 답장에 그 마켓이 찍혀 있을 때만
    var k = 옛[마켓];
    if (k) return { 마켓: 마켓, 값: k.값, 사유: k.사유, 때: 내.답한때 || null };
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
      var 옛 = 옛칸들(내.답장), 옛줄 = !내.마켓;
      var 칸 = 마켓들.map(function (m) { return 칸상태(줄, m, 옛); });
      var 셈 = function (v) { return 칸.filter(function (k) { return k.값 === v; }).length; };
      // 옛 줄은 지시 상태로만 무리를 가른다 — 답장에서 뽑은 칸은 보여주기만 (배지 숫자를 글 해석에 걸지 않는다)
      // 새 줄은 칸으로만 — 지시가 「실패」여도 칸이 다 됐으면 완료다(SPD01 전송불가 오판 · 쿠팡 미확인).
      // 단 칸이 비어 있으면(도중에 끊김) 지시 「실패」를 믿는다
      var 진행 = 내.상태 === '대기' || 내.상태 === '하는중';
      var 무리 = 옛줄
        ? (내.상태 === '실패' || 내.상태 === '거부' ? '실패' : 진행 ? '진행중' : '완료')
        : (셈('fail') || ((내.상태 === '실패' || 내.상태 === '거부') && 셈('unk')) ? '실패'
          : 진행 || 셈('wait') || 셈('run') ? '진행중' : '완료');
      카.push({
        품목코드: 코드, id: 줄.id, 갈래: 내.갈래, 다시판매: 내.갈래 === '마켓판매',
        보낸때: 내.보낸때 || Number(String(줄.id).slice(0, 13)) || 0,
        이름: p.유통명 || 내.폴더 || 코드, 학명: p.학명 || '',
        칸: 칸, 완료수: 셈('ok'), 실패수: 셈('fail'), 분모: 마켓들.length - 셈('none'),
        무리: 무리, 옛줄: 옛줄, 상태: 내.상태 || '', 답장: 내.답장 || '', 마켓원: 고친마켓(내) || {}
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

  /* ══ 업로드 › 완료 (24단계) — 같은 카드를 업로드 모드로 쓴다 ══
     품목 = 06g 「완료」(사진뺌) · 원줄 = 그 품목의 가장 최근 `카페24올리기` · 카페24 번호 = 원줄 칸 → 원고 머리.
     🔴 옛 업로드(마켓 칸 없음)는 카페24 만 머리 번호로 · 나머지 여섯은 「기록 없음」 */
  var 올 = { 줄: {}, 머리: {}, 읽음: false, 오류: '', 읽는중: false, 서명: '' };
  var 카페24주소 = 'https://www.zerogardening.com/product/detail.html?product_no=';

  function 보이나() { return !!document.querySelector('.업로드탭'); }

  function 업로드새로() {
    var c = 클();
    if (올.읽는중) return;
    if (!c) { 올.오류 = 말썽(new Error('오프라인')); if (보이나()) ZG.작업중.다시(); return; }
    올.읽는중 = true;
    var 코드들 = ZG.사진수집.대기품목(true, false).map(function (p) { return p.품목코드; });
    Promise.all([
      제때(c.from('v3_지시').select('id,내용').eq('삭제됨', false).eq('내용->>갈래', '카페24올리기')
        .order('id', { ascending: false }).limit(1000)),
      코드들.length ? 제때(c.from('v3_원고').select('id,내용').in('id', 코드들)) : Promise.resolve({ data: [] })
    ]).then(function (답) {
      답.forEach(function (d) { if (d && d.error) throw d.error; });
      var 줄 = {}, 머리 = {};
      (답[0].data || []).forEach(function (r) {   // id 내림차순 — 처음 만난 것이 가장 최근
        var k = (r.내용 || {}).품목코드;
        if (k && !줄[k]) 줄[k] = r.내용;
      });
      (답[1].data || []).forEach(function (r) { 머리[r.id] = r.내용 || {}; });
      올.줄 = 줄; 올.머리 = 머리; 올.읽음 = true; 올.오류 = '';
    }, function (e) { 올.오류 = 말썽(e); }).then(function () {
      올.읽는중 = false;
      var 새 = 올.오류 || JSON.stringify([올.줄, 올.머리]);
      if (새 === 올.서명) return;
      올.서명 = 새;
      if (보이나()) ZG.작업중.다시();
    });
  }

  function 업로드카드(p) {
    var 내 = 올.줄[p.품목코드] || {}, 머 = 올.머리[p.품목코드] || {}, 옛 = !내.마켓;
    var 칸 = 마켓들.map(function (m) {
      var k = !옛 && 내.마켓[m];
      var 것 = k ? { 마켓: m, 값: 값(k.상태), 사유: k.사유 || '', 때: k.때 || null, 번호: k.번호 || '' }
        : { 마켓: m, 값: 'unk', 사유: '', 때: null, 번호: '' };
      if (m === '카페24' && (옛 || 것.값 === 'ok') && !것.번호 && 머.카페24번호) {
        것.값 = 'ok'; 것.번호 = String(머.카페24번호); 것.때 = 것.때 || 머.올린때 || 내.답한때 || null;
      }
      // 주소는 카페24 만 — 다른 마켓은 번호를 아직 못 얻는다(상품 보기 꺼짐)
      것.주소 = m === '카페24' && 것.값 === 'ok' && /^\d+$/.test(것.번호) ? 카페24주소 + 것.번호 : '';
      return 것;
    });
    var 셈 = function (v) { return 칸.filter(function (k) { return k.값 === v; }).length; };
    return {
      업로드: true, 품목: p, 품목코드: p.품목코드, 이름: p.유통명 || p.품목코드, 학명: p.학명 || '',
      수정일시: p.수정일시 || 0, 옛줄: 옛, 올린때: 내.답한때 || 머.올린때 || 0,
      칸: 칸, 완료수: 셈('ok'), 실패수: 셈('fail'), 분모: 마켓들.length - 셈('none'),
      무리: 셈('fail') ? '실패' : '완료'
    };
  }

  function 업로드카드들(정렬) {
    if (!올.읽음 && !올.오류) 업로드새로();
    return ZG.사진수집.대기품목(true, false).map(업로드카드).sort(function (a, b) {
      if (정렬 === '실패먼저' && (a.실패수 > 0) !== (b.실패수 > 0)) return a.실패수 > 0 ? -1 : 1;
      return b.올린때 - a.올린때;
    });
  }

  ZG.품절자료 = {
    옛칸들: 옛칸들, 시작: 시작, 새로: 새로, 지우기: 지우기, 카드들: 카드들, 배지칠하기: 배지칠하기, 마켓들: 마켓들,
    상태: function () { return { 오류: 오류, 읽음: 읽음 }; },
    업로드카드들: 업로드카드들, 업로드새로: 업로드새로,
    업로드상태: function () { return { 오류: 올.오류, 읽음: 올.읽음 }; }
  };
})(window.ZG);
