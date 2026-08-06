/* 01b-서버 — Supabase 클라이언트 · 로그인 게이트 · 첫 내려받기 · Realtime (7단계 설계 §3·§4-2·§4-3)
   🔴 app_meta 는 읽지도 쓰지도 않는다. v3_ 로 시작하는 새 표만 쓴다.
   CDN 이 안 열리면 조용히 로컬 전용으로 떨어진다 — 화면은 그대로 뜬다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 주소 = 'https://vjqfhwrgrocapcyndgtx.supabase.co';
  var 공개키 = 'sb_publishable_ds8hYFdqgj-vsotoaqtv4w_XhkL_DN2';
  var 토큰키 = 'sb-vjqfhwrgrocapcyndgtx-auth-token';
  var 표들 = ['품목', '입고', '출고', '재고조정', '업체', '주문', '주문묶음',
              '명세서', '명세서줄', '견적요청', '즐겨찾기', '분류폴더'];

  var 서버 = {
    로그인됨: false, 켜짐: false, 아직안올림: false,
    클라이언트: null, 표들: 표들, 경고: [],
    표이름: 표이름, 키로: 키로,
    받아오기: function () { return 내려받기(true); },
    올림표시: 올림표시,
    상태: 상태
  };
  ZG.서버 = 서버;

  function 표이름(k) { return String(k).replace('zg.v3.', ''); }
  function 키로(표) { return 'zg.v3.' + 표; }

  function 상태() {
    return {
      로그인됨: 서버.로그인됨, 켜짐: 서버.켜짐, 아직안올림: 서버.아직안올림,
      못보낸건수: ZG.보내기 ? ZG.보내기.건수() : 0,
      경고: 서버.경고.slice()
    };
  }

  /* ── 게이트 (동기) — 토큰이 없으면 화면을 그리기 전에 로그인으로 보낸다 ───────── */
  var 토큰 = null;
  try { 토큰 = localStorage.getItem(토큰키); } catch (e) {}
  if (!토큰) {
    location.replace('../index.html?from=' + encodeURIComponent(location.href));
    return;
  }
  서버.로그인됨 = true;

  if (!window.supabase || !window.supabase.createClient) {
    console.warn('supabase-js 를 못 불러왔습니다 — 로컬 전용으로 돕니다');
    return;
  }
  var supa = window.supabase.createClient(주소, 공개키, {
    auth: { persistSession: true, autoRefreshToken: true }
  });
  서버.클라이언트 = supa;
  서버.켜짐 = true;

  /* ── 에코 무시 — 「지금 로컬에 이미 있는 값」이 돌아온 것만 버린다 (설계 §5) ────
     🔴 「내가 보낸 값인가」로 판단하면 안 된다. 그사이 남의 값을 로컬에 덮어썼다면
        되돌아온 내 값은 메아리가 아니라 서버의 최신값이라 반드시 받아야 한다.
        (안 받으면 A·B가 서로 상대 값을 든 채 갈라진다 — 8/6 실측)
     로컬과 같을 때만 건너뛰므로 진짜 메아리는 그대로 걸러져 화면이 안 튄다.
     지문은 키를 정렬해 만든다 — jsonb 가 칸 순서를 바꿔 돌려주기 때문이다. */
  function 정렬(v) {
    if (Array.isArray(v)) return v.map(정렬);
    if (v && typeof v === 'object') {
      var o = {};
      Object.keys(v).sort().forEach(function (k) { if (v[k] !== undefined) o[k] = 정렬(v[k]); });
      return o;
    }
    return v;
  }
  function 지문(값) {
    try { return JSON.stringify(정렬(값 === undefined ? null : 값)); }
    catch (e) { return null; }
  }
  function 같은가(a, b) {
    var x = 지문(a); return x !== null && x === 지문(b);
  }

  /* ── 다시그리기 배분 (200ms 몰아치기 방지) ──────────────────────────────────── */
  var 예약 = null;
  function 그리기예약() {
    if (예약) return;
    예약 = setTimeout(function () {
      예약 = null;
      ['앱', '주문', '업체앱', '소싱앱'].forEach(function (이름) {
        var a = ZG[이름];
        if (a && typeof a.다시그리기 === 'function') { try { a.다시그리기(); } catch (e) { console.warn(e); } }
      });
    }, 200);
  }

  function 띠(글, 색) {
    function 넣기() {
      var d = document.createElement('div');
      d.className = 'zg-서버띠';
      d.style.cssText = 'padding:10px 14px;font-size:13px;line-height:1.5;background:' + 색 +
        ';border-bottom:1px solid rgba(0,0,0,.08);position:relative;z-index:60';
      d.textContent = 글;
      document.body.insertBefore(d, document.body.firstChild);
    }
    if (document.body) 넣기(); else document.addEventListener('DOMContentLoaded', 넣기);
  }

  /* ── 표 하나를 통째로 받는다. 1,000건씩 끊는다 ──────────────────────────────── */
  function 표받기(표) {
    var 이름 = 'v3_' + 표, 모두 = [];
    function 다음(시작) {
      return supa.from(이름).select('id,내용,삭제됨').order('id').range(시작, 시작 + 999)
        .then(function (r) {
          if (r.error) throw r.error;
          모두 = 모두.concat(r.data || []);
          if ((r.data || []).length === 1000) return 다음(시작 + 1000);
          return 모두;
        });
    }
    return 다음(0);
  }

  /* ── 관문 ① 서버상태 행이 있는가 ──────────────────────────────────────────── */
  function 서버상태읽기() {
    return supa.from('v3_공유설정').select('내용').eq('id', '서버상태').maybeSingle()
      .then(function (r) { if (r.error) throw r.error; return r.data; });
  }

  /* §7 「☁ 서버로 올리기」가 13개 표를 전부 성공한 뒤에만 부른다 */
  function 올림표시(건수) {
    return supa.from('v3_공유설정').upsert([{
      id: '서버상태', 삭제됨: false,
      내용: { 올림완료: true, 올린때: new Date().toISOString(),
             올린기기: navigator.userAgent.slice(0, 120), 건수: 건수 || {} }
    }], { onConflict: 'id' });
  }

  /* ── 첫 내려받기 ──────────────────────────────────────────────────────────── */
  function 내려받기(강제) {
    var 저 = ZG.저장소, 건수 = {};
    서버.경고 = [];
    var 일 = 표들.map(function (표) {
      return 표받기(표).then(function (행들) {
        var 로컬수 = 저.읽기(키로(표)).length;
        // 관문 ② — 서버가 로컬보다 적으면 그 표는 안 덮는다 (삭제됨 포함해 센다)
        if (!강제 && 행들.length < 로컬수) {
          서버.경고.push('서버 ' + 표 + ' ' + 행들.length + '건 / 이 기기 ' + 로컬수 + '건 — 덮지 않았습니다');
          return;
        }
        var 값 = 행들.filter(function (r) { return !r.삭제됨; }).map(function (r) { return r.내용; });
        저.조용히(true); 저.전체쓰기(키로(표), 값); 저.조용히(false);
        건수[표] = 값.length;
      });
    }).concat([
      표받기('공유설정').then(function (행들) {
        행들.forEach(function (r) {
          if (r.삭제됨 || (r.id !== '동봉카드설정' && r.id !== '키워드')) return;
          저.조용히(true); 저.전체쓰기(키로(r.id), r.내용 || {}); 저.조용히(false);
        });
      })
    ]);

    return Promise.all(일).then(function () {
      저.설정쓰기({ 실데이터: true });
      if (서버.경고.length) 띠('⚠ ' + 서버.경고.join(' · '), '#fef3c7');
      그리기예약();
      return 건수;
    });
  }

  /* ── Realtime — 채널 하나에 13개 표 ───────────────────────────────────────── */
  function 구독() {
    var ch = supa.channel('v3-전체');
    표들.concat(['공유설정']).forEach(function (표) {
      ch.on('postgres_changes', { event: '*', schema: 'public', table: 'v3_' + 표 }, function (p) {
        받은줄(표, p);
      });
    });
    ch.subscribe();
  }

  function 받은줄(표, p) {
    var 행 = p['new'] && p['new'].id ? p['new'] : p.old;
    if (!행 || !행.id) return;
    var 저 = ZG.저장소, k = 키로(표);
    var 지움 = p.eventType === 'DELETE' || 행.삭제됨 === true;

    if (표 === '공유설정') {
      if (행.id !== '동봉카드설정' && 행.id !== '키워드') return;
      var 새설정 = 지움 ? {} : (행.내용 || {});
      if (같은가(저.읽기(키로(행.id)), 새설정)) return;   // 이미 같다 — 메아리
      저.조용히(true); 저.전체쓰기(키로(행.id), 새설정); 저.조용히(false);
      그리기예약(); return;
    }

    var 목록 = 저.읽기(k);
    var 자리 = 목록.findIndex(function (r) { return 저.레코드키(표, r) === String(행.id); });
    if (지움) { if (자리 < 0) return; 목록.splice(자리, 1); }
    else if (자리 >= 0) {
      if (같은가(목록[자리], 행.내용)) return;   // 이미 같다 — 메아리. 다시그리기도 안 한다
      목록[자리] = 행.내용;
    }
    else 목록.push(행.내용);
    저.조용히(true); 저.전체쓰기(k, 목록); 저.조용히(false);
    그리기예약();
  }

  /* ── 시작 ─────────────────────────────────────────────────────────────────── */
  supa.auth.getSession().then(function (r) {
    if (!r || !r.data || !r.data.session) {
      location.replace('../index.html?from=' + encodeURIComponent(location.href));
      throw new Error('세션 없음');
    }
    return 서버상태읽기();
  }).then(function (행) {
    구독();
    if (!행) {
      // 관문 ① — 아무도 올린 적이 없다. 내려받기를 통째로 건너뛴다
      서버.아직안올림 = true;
      띠('아직 서버에 한 번도 올리지 않았습니다 — 이사 화면에서 「☁ 서버로 올리기」를 눌러 주세요. (고장이 아닙니다)', '#fef3c7');
      return null;
    }
    return 내려받기(false);
  }).then(function () {
    // 오래 끊겨 있다 돌아왔을 때 내 옛 값이 남의 새 값을 덮지 않게 — 먼저 받고 나서 보낸다
    if (ZG.보내기) ZG.보내기.깨우기();
  }).catch(function (e) {
    console.warn('서버 연동을 못 켰습니다 — 로컬 전용으로 돕니다', e);
  });
})(window.ZG);
