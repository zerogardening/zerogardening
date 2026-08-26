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
              '명세서', '명세서줄', '견적요청', '즐겨찾기', '분류폴더', '심폴짝', '운임손질', '고객', '문자', '메모', '제작요청', '블로그'];

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

  /* ── 「나중에 서버에 닿은 쪽이 이긴다」의 근거 (설계 §5) ─────────────────────
     한 묶음으로 온 두 줄의 도착 순서가 기기마다 정반대라 온 순서대로 덮으면 갈라진다.
     (A는 [B값,A값] · B는 [A값,B값] 순으로 받는다 — 8/6 실측)
     그래서 줄마다 「마지막으로 적용한 수정시각」을 적어 두고 그보다 옛 값은 버린다.
     수정시각은 서버 트리거가 찍으므로 두 기기가 같은 값을 본다.
     🔴 로컬과 같아 건너뛸 때도 시각은 적어 둬야 한다 — 안 그러면 뒤에 온 옛 값이 통과한다. */
  var 적용시각 = {};   // '표|id' → { t: ms, f: 지문 }

  /* timestamptz 를 마이크로초 정수로. 🔴 Date.parse 는 소수 3자리까지만 봐서
     `.088005` 와 `.088006` 이 같아져 버린다 — 실제로 그 자리에서 갈린다. */
  function 밀리초(v) {
    if (!v) return null;
    var s = String(v), 소수 = /\.(\d+)/.exec(s), 마이크로 = 0;
    if (소수) {
      var d = (소수[1] + '000000').slice(0, 6);
      마이크로 = Number(d.slice(3));
      s = s.replace(/\.\d+/, '.' + d.slice(0, 3));
    }
    var t = Date.parse(s);
    return isNaN(t) ? null : t * 1000 + 마이크로;
  }
  /* 같은 밀리초가 실제로 나온다. 그때는 지문이 큰 쪽이 이긴다 —
     어느 쪽이 서버에 남았는지는 알 수 없지만 두 기기가 반드시 같은 답을 낸다. */
  function 밀린값인가(열쇠, t, f) {
    var 앞 = 적용시각[열쇠];
    if (!앞 || t === null || 앞.t === null) return false;
    if (t < 앞.t) return true;
    if (t > 앞.t) return false;
    return String(f) <= String(앞.f);
  }
  function 적어두기(열쇠, t, f) { 적용시각[열쇠] = { t: t, f: f }; }

  /* ── 다시그리기 배분 (200ms 몰아치기 방지) ──────────────────────────────────── */

  /* 🔴 글자를 치고 있는 동안에는 그리지 않는다 (8/6 🔴-8).
     화면을 통째로 다시 그리면 입력칸 DOM 자체가 새것으로 갈아끼워지고, 그 순간
     한글 조합이 끊겨 치던 글자와 포커스가 통째로 사라진다
     (8/4 「휴케라」→「ㅎㅠㅋㅔㄹㅏ」 사고와 같은 원인).
     🔴 이 자리는 「남이 저장한 것을 받아 그리는」 곳이라 급하지 않다 — 손을 뗄 때까지 미룬다.
        우람님이 직접 누른 다시그리기(탭·거르개·저장)는 이 자리를 지나지 않으므로 그대로 즉시 그려진다.
     체크박스·라디오·버튼은 눌러 둔 채로 있는 일이 흔해 막지 않는다 — 글자 치는 칸만 본다. */
  var 글자칸 = { text: 1, search: 1, tel: 1, email: 1, url: 1, number: 1, password: 1 };
  function 치는중() {
    var a = document.activeElement;
    if (!a) return false;
    if (a.isContentEditable) return true;
    if (a.tagName === 'TEXTAREA') return true;
    return a.tagName === 'INPUT' && 글자칸[(a.type || 'text').toLowerCase()] === 1;
  }

  var 예약 = null;
  function 그리기예약() {
    if (예약) return;
    예약 = setTimeout(그리기, 200);
  }
  function 그리기() {
    예약 = null;
    if (치는중()) { 예약 = setTimeout(그리기, 400); return; }   // 손 뗄 때까지 되물어본다
    ['앱', '주문', '업체앱', '소싱앱', '메모앱'].forEach(function (이름) {
      var a = ZG[이름];
      if (a && typeof a.다시그리기 === 'function') { try { a.다시그리기(); } catch (e) { console.warn(e); } }
    });
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
      return supa.from(이름).select('id,내용,삭제됨,수정시각').order('id').range(시작, 시작 + 999)
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
    var 저 = ZG.저장소, 건수 = {}, 밀린인쇄 = null;
    서버.경고 = [];
    // 첫 내려받기로 채운 줄도 시각을 적어 둔다 — 안 그러면 뒤에 오는 옛 값을 못 거른다
    function 시각모으기(표, 행들) {
      행들.forEach(function (r) {
        적어두기(표 + '|' + r.id, 밀리초(r.수정시각), r.삭제됨 ? ' 삭제' : 지문(r.내용));
      });
    }

    var 일 = 표들.map(function (표) {
      return 표받기(표).then(function (행들) {
        var 로컬수 = 저.읽기(키로(표)).length;
        // 관문 ② — 서버가 로컬보다 적으면 그 표는 안 덮는다 (삭제됨 포함해 센다)
        if (!강제 && 행들.length < 로컬수) {
          서버.경고.push('서버 ' + 표 + ' ' + 행들.length + '건 / 이 기기 ' + 로컬수 + '건 — 덮지 않았습니다');
          return;
        }
        시각모으기(표, 행들);
        var 값 = 행들.filter(function (r) { return !r.삭제됨; }).map(function (r) { return r.내용; });
        저.조용히(true); 저.전체쓰기(키로(표), 값); 저.조용히(false);
        건수[표] = 값.length;
      })
      /* 🔴 표 하나가 넘어져도 나머지가 같이 죽지 않게 — Promise.all 이 통째로 거부되면
         다른 표도 안 내려오고 보내기 큐도 안 깨어난다 (8단계 설계 §5-3) */
      .catch(function (e) {
        서버.경고.push(표 + ' 를 못 받았습니다 (' + (e.message || e) + ')');
      });
    }).concat([
      표받기('공유설정').then(function (행들) {
        시각모으기('공유설정', 행들);
        행들.forEach(function (r) {
          if (r.삭제됨) return;
          /* 사무실 크롬이 꺼져 있는 동안 폰이 보낸 동봉카드 인쇄 요청.
             여기서 바로 뽑지 않는다 — 품목·특성이 아직 안 내려왔을 수 있다. */
          if (r.id === '인쇄대기열') { 밀린인쇄 = r.내용; return; }
          if (r.id !== '동봉카드설정' && r.id !== '키워드') return;
          저.조용히(true); 저.전체쓰기(키로(r.id), r.내용 || {}); 저.조용히(false);
        });
      })
    ]);

    return Promise.all(일).then(function () {
      저.설정쓰기({ 실데이터: true });
      if (서버.경고.length) 띠('⚠ ' + 서버.경고.join(' · '), '#fef3c7');
      그리기예약();
      if (밀린인쇄 && ZG.동봉카드 && ZG.동봉카드.사무실인쇄) ZG.동봉카드.사무실인쇄(밀린인쇄);
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
    var 열쇠 = 표 + '|' + 행.id;
    var 새시각 = 밀리초(행.수정시각);
    var 새지문 = 지움 ? ' 삭제' : 지문(행.내용);
    if (밀린값인가(열쇠, 새시각, 새지문)) return;   // 이 줄에 이미 더 새 값을 적용했다

    /* 동봉카드 인쇄 요청 — 저장하지 않고 그 자리서 프린터로 보낸다(09 가 PC 인지 가린다) */
    if (표 === '공유설정' && 행.id === '인쇄대기열') {
      if (!지움 && ZG.동봉카드 && ZG.동봉카드.사무실인쇄) ZG.동봉카드.사무실인쇄(행.내용);
      return;
    }

    if (표 === '공유설정') {
      if (행.id !== '동봉카드설정' && 행.id !== '키워드') return;
      var 새설정 = 지움 ? {} : (행.내용 || {});
      적어두기(열쇠, 새시각, 새지문);
      if (같은가(저.읽기(키로(행.id)), 새설정)) return;   // 이미 같다 — 메아리
      저.조용히(true); 저.전체쓰기(키로(행.id), 새설정); 저.조용히(false);
      그리기예약(); return;
    }

    var 목록 = 저.읽기(k);
    var 자리 = 목록.findIndex(function (r) { return 저.레코드키(표, r) === String(행.id); });
    적어두기(열쇠, 새시각, 새지문);
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
