/* 19-지시함 — 폰·웹에서 일감을 쌓아 두면 맥이 켜질 때 처리하고 여기로 답장한다 (16단계).
   자료·화면이 한 파일이다. 채팅 하나라 나눌 만큼 크지 않다.

   🔴 01-저장소.js·01b-서버.js 를 안 고친다. ZG.서버.클라이언트 로 직접 읽고 쓴다 —
      06h-원고자료.js 가 고른 길과 같다. 공통 파일을 고치면 주문·업체·소싱·메모 html 이
      묵은 사본을 물고 갈라진다.
   🔴 답장은 폴링으로 받는다(5초). Realtime 을 따로 붙이지 않는다 —
      건수가 하루 몇 줄이고, 폴링 하나면 「맥이 아직 안 깼다」까지 같은 길로 보인다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 표이름 = 'v3_지시';
  var 폴링초 = 5;
  var 최대줄 = 200;

  var u, 만들기;
  var 뿌리, 흐름칸, 입력칸, 보냄단추, 상태칸, 알림단추;
  var 담긴것 = [];          // [{id, 내용}] — id 오름차순이 곧 시간순
  var 첫판 = true, 타이머 = null, 읽는중 = false;

  /* ══════════════════════════════════════ 자료 ══════════════════════════════════════ */

  function 통() {
    var 서 = ZG.서버;
    return 서 && 서.켜짐 && 서.클라이언트 ? 서.클라이언트.from(표이름) : null;
  }

  /* supabase-js 는 인터넷이 끊기면 약속을 영영 안 끝낼 때가 있다 — 10초에 끊는다 (06h 와 같다) */
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

  function 난수(n) {
    var s = '';
    while (s.length < n) s += Math.random().toString(36).slice(2);
    return s.slice(0, n);
  }

  /* ══════════════ 알림 (16단계) ══════════════
     🔴 구독은 이 표에 `갈래:'구독'` 으로 얹는다. 표를 하나 더 만들지 않으려고 그렇게 했다 —
        SQL 을 또 돌리시게 하는 것보다 낫다. 흐름은 이 줄을 안 그린다.
     🔴 아이폰은 **홈 화면에 추가한 앱**에서만 알림이 된다. 사파리 탭이면 단추를 아예 숨긴다. */
  var 공개키 = 'BMaAIVV9hA3EIHSbv4wVEVF8rVguS4qyoBc_ewSKpgHvZi0lV8YfmAHJYcQCNC-dJSGf_UjGStfmDPukLv4DgC0';

  function 바이트로(b) {
    var s = (b + '='.repeat((4 - b.length % 4) % 4)).replace(/-/g, '+').replace(/_/g, '/');
    var 살 = atob(s), 통 = new Uint8Array(살.length);
    for (var i = 0; i < 살.length; i++) 통[i] = 살.charCodeAt(i);
    return 통;
  }
  function b64로(버퍼) {
    var 통 = new Uint8Array(버퍼), s = '';
    for (var i = 0; i < 통.length; i++) s += String.fromCharCode(통[i]);
    return btoa(s).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
  }

  function 알림될까() {
    if (!('serviceWorker' in navigator) || !('PushManager' in window) || !('Notification' in window)) return false;
    var 아이폰 = /iPhone|iPad|iPod/.test(navigator.userAgent);
    var 홈앱 = window.navigator.standalone === true ||
               (window.matchMedia && window.matchMedia('(display-mode: standalone)').matches);
    return !아이폰 || 홈앱;      // 사파리 탭에서는 눌러도 안 되니 보여 주지 않는다
  }

  function 지금구독() {
    if (!알림될까()) return Promise.resolve(null);
    return navigator.serviceWorker.ready.then(function (등록) {
      return 등록.pushManager.getSubscription();
    }).catch(function () { return null; });
  }

  function 알림켜기() {
    return Notification.requestPermission().then(function (답) {
      if (답 !== 'granted') throw new Error('알림이 허용되지 않았습니다');
      return navigator.serviceWorker.ready;
    }).then(function (등록) {
      return 등록.pushManager.getSubscription().then(function (있는것) {
        return 있는것 || 등록.pushManager.subscribe(
          { userVisibleOnly: true, applicationServerKey: 바이트로(공개키) });
      });
    }).then(function (구독) {
      var j = (구독.toJSON && 구독.toJSON()) || {}, 열쇠 = j.keys || {};
      var t = 통();
      if (!t) throw new Error('오프라인');
      // 끝주소 꼬리로 id 를 삼는다 — 같은 기기를 두 번 켜도 줄이 하나다
      var 아이디 = '구독:' + 구독.endpoint.slice(-36).replace(/[^A-Za-z0-9_-]/g, '');
      return 제때(t.upsert([{ id: 아이디, 삭제됨: false, 내용: {
        갈래: '구독', 끝주소: 구독.endpoint,
        p256dh: 열쇠.p256dh || b64로(구독.getKey('p256dh')),
        auth: 열쇠.auth || b64로(구독.getKey('auth')),
        기기: navigator.userAgent.slice(0, 80), 켠때: Date.now()
      } }], { onConflict: 'id' })).then(function (답) {
        if (답 && 답.error) throw 답.error;
        return true;
      });
    });
  }

  function 불러오기() {
    var t = 통();
    if (!t) return Promise.reject(new Error('오프라인'));
    return 제때(t.select('id,내용,삭제됨').order('id', { ascending: false }).limit(최대줄))
      .then(function (답) {
        if (답 && 답.error) throw 답.error;
        return ((답 && 답.data) || [])
          .filter(function (r) { return !r.삭제됨 && (r.내용 || {}).갈래 !== '구독'; })
          .map(function (r) { return { id: r.id, 내용: r.내용 || {} }; })
          .reverse();                       // 화면은 오래된 것이 위다
      });
  }

  function 보내기(글) {
    var t = 통();
    if (!t) return Promise.reject(new Error('오프라인'));
    var 이제 = Date.now();
    var 줄 = {
      id: 이제 + '-' + 난수(4),             // 🔴 문자열 정렬이 곧 시간 정렬이다
      내용: { 누가: '우람님', 보낸때: 이제, 글: 글, 상태: '대기' },
      삭제됨: false
    };
    return 제때(t.upsert([줄], { onConflict: 'id' })).then(function (답) {
      if (답 && 답.error) throw 답.error;
      담긴것.push(줄);                       // 기다리지 않고 먼저 띄운다
      return 줄;
    });
  }

  /* ══════════════════════════════════════ 화면 ══════════════════════════════════════ */

  function 두자리(n) { return (n < 10 ? '0' : '') + n; }

  function 시각(ms) {
    var d = new Date(ms || 0);
    var 시 = d.getHours(), 오후 = 시 >= 12;
    return (오후 ? '오후 ' : '오전 ') + (시 % 12 || 12) + ':' + 두자리(d.getMinutes());
  }

  function 날글(ms) {
    var d = new Date(ms || 0), 오늘 = new Date();
    var 같은날 = d.toDateString() === 오늘.toDateString();
    if (같은날) return '오늘';
    return (d.getMonth() + 1) + '월 ' + d.getDate() + '일 (' + '일월화수목금토'[d.getDay()] + ')';
  }

  function 말풍선(글, 결, 때, 자국) {
    var 방울 = 만들기('div', { class: '말풍선 ' + 결, text: 글 });
    if (자국) 방울.appendChild(만들기('div', { class: '자국', text: 자국 }));
    var 나인가 = 결 === '나';
    var 조각 = [방울, 만들기('span', { class: '때', text: 시각(때) })];
    return 만들기('div', { class: '줄 ' + (나인가 ? '나' : '맥') }, 나인가 ? 조각.reverse() : 조각);
  }

  function 기다림풍선() {
    return 만들기('div', { class: '줄 맥' }, [
      만들기('div', { class: '말풍선 맥 하는중' }, [만들기('i'), 만들기('i'), 만들기('i')])
    ]);
  }

  function 흐름그리기() {
    u.비우기(흐름칸);
    if (!담긴것.length) {
      흐름칸.appendChild(만들기('div', { class: '지시-빈' , html:
        '여기에 일감을 쌓아 두시면<br>맥이 켜질 때 알아서 해 두고 답장합니다.' }));
      return;
    }
    var 지난날 = '';
    담긴것.forEach(function (줄) {
      var c = 줄.내용 || {};
      var 날 = 날글(c.보낸때);
      if (날 !== 지난날) {
        흐름칸.appendChild(만들기('div', { class: '지시-날', text: 날 }));
        지난날 = 날;
      }
      흐름칸.appendChild(말풍선(c.글 || '', c.누가 === '시스템' ? '맥 시스템' : '나', c.보낸때));

      var 상태 = c.상태 || '대기';
      if (상태 === '하는중') { 흐름칸.appendChild(기다림풍선()); return; }
      if (상태 === '대기') return;              // 안내는 아래에 한 번만 단다
      if (!c.답장) return;
      흐름칸.appendChild(말풍선(c.답장, 상태 === '됨' ? '맥' : '맥 탈', c.답한때, c.커밋 || ''));
    });

    /* 🔴 기다리는 것이 있으면 맨 아래에 한 줄. 줄마다 달면 지저분하고,
       아무 표시도 없으면 「보냈는데 안 되나?」 하신다 */
    var 기다림 = 담긴것.filter(function (줄) {
      return ((줄.내용 || {}).상태 || '대기') === '대기';
    }).length;
    if (기다림) {
      흐름칸.appendChild(만들기('div', { class: '지시-날',
        text: 기다림 + '건 — 맥이 켜지면 시작합니다' }));
    }
  }

  function 바닥으로() { 흐름칸.scrollTop = 흐름칸.scrollHeight; }

  function 상태쓰기(글) { if (상태칸) 상태칸.textContent = 글 || ''; }

  function 새로고침(바닥까지) {
    if (읽는중) return;
    읽는중 = true;
    불러오기().then(function (것들) {
      읽는중 = false;
      var 달라졌나 = 것들.length !== 담긴것.length ||
        JSON.stringify(것들) !== JSON.stringify(담긴것);
      담긴것 = 것들;
      상태쓰기(기다리는수());
      if (!달라졌나 && !바닥까지) return;
      var 바닥에있었나 = 흐름칸.scrollTop + 흐름칸.clientHeight >= 흐름칸.scrollHeight - 40;
      흐름그리기();
      if (바닥까지 || 바닥에있었나 || 첫판) 바닥으로();
      첫판 = false;
    }).catch(function (e) {
      읽는중 = false;
      상태쓰기(말썽(e));
    });
  }

  function 기다리는수() {
    var n = 담긴것.filter(function (줄) {
      var s = (줄.내용 || {}).상태 || '대기';
      return s === '대기' || s === '하는중';
    }).length;
    return n ? n + '건 기다리는 중' : '';
  }

  function 보냄() {
    var 글 = (입력칸.value || '').trim();
    if (!글) return;
    보냄단추.disabled = true;
    보내기(글).then(function () {
      입력칸.value = '';
      입력칸.style.height = 'auto';
      보냄단추.disabled = false;
      흐름그리기(); 바닥으로(); 상태쓰기(기다리는수());
    }).catch(function (e) {
      보냄단추.disabled = false;
      if (ZG.ui && ZG.ui.토스트) ZG.ui.토스트(말썽(e));
      else alert(말썽(e));
    });
  }

  function 뼈대() {
    상태칸 = 만들기('span', { class: '상태' });
    var 뒤 = 만들기('button', { class: '지시-뒤', type: 'button', text: '‹', 'aria-label': '뒤로' });
    뒤.addEventListener('click', function () { location.href = 'index.html'; });
    알림단추 = 만들기('button', { class: '지시-알림', type: 'button', text: '알림 켜기',
                                  style: 'display:none' });
    알림단추.addEventListener('click', function () {
      알림단추.disabled = true;
      알림켜기().then(function () {
        알림단추.style.display = 'none';
        if (u.토스트) u.토스트('알림을 켰습니다 — 일이 끝나면 폰에 뜹니다');
      }).catch(function (e) {
        알림단추.disabled = false;
        var m = (e && e.message) || '';
        if (u.토스트) u.토스트(/허용/.test(m) ? '폰 설정에서 알림을 허용해 주십시오' : '알림을 못 켰습니다 — ' + m);
      });
    });

    var 머리 = 만들기('div', { class: '지시-머리' }, [
      뒤, 만들기('h1', { text: '지시함' }), 알림단추, 상태칸
    ]);

    흐름칸 = 만들기('div', { class: '지시-흐름' });

    입력칸 = 만들기('textarea', {
      rows: '1', placeholder: '무엇을 해 둘까요',
      'aria-label': '지시 적기'
    });
    입력칸.addEventListener('input', function () {
      입력칸.style.height = 'auto';
      입력칸.style.height = Math.min(입력칸.scrollHeight, 140) + 'px';
    });
    // PC 는 Enter 로 보낸다(줄바꿈은 Shift+Enter). 폰은 Enter 가 줄바꿈이라 단추로만 보낸다
    입력칸.addEventListener('keydown', function (e) {
      if (e.key === 'Enter' && !e.shiftKey && !u.폰인가()) { e.preventDefault(); 보냄(); }
    });

    보냄단추 = 만들기('button', { class: '지시-보내기', type: 'button', text: '↑', 'aria-label': '보내기' });
    보냄단추.addEventListener('click', 보냄);

    뿌리.appendChild(만들기('div', { class: '지시-shell' }, [
      머리, 흐름칸, 만들기('div', { class: '지시-입력' }, [입력칸, 보냄단추])
    ]));
  }

  function 시작() {
    u = ZG.ui; 만들기 = u.만들기;
    뿌리 = document.getElementById('앱');
    ZG.저장소.부팅();
    뼈대();
    흐름그리기();
    상태쓰기('불러오는 중…');
    새로고침(true);
    // 아직 알림을 안 켜셨으면 단추를 보여 준다. 이미 켜셨으면 조용히 숨긴다
    지금구독().then(function (있나) {
      if (!있나 && 알림될까()) 알림단추.style.display = '';
    }).catch(function () {});
    // 🔴 서버가 늦게 켜지거나(로그인) 답장이 늦게 와도 이 한 줄이 다 받는다
    타이머 = setInterval(function () {
      if (!document.hidden) 새로고침(false);
    }, 폴링초 * 1000);
    document.addEventListener('visibilitychange', function () {
      if (!document.hidden) 새로고침(false);
    });
  }

  ZG.지시함 = {
    시작: 시작, 새로고침: 새로고침, 흐름그리기: 흐름그리기, 바닥으로: 바닥으로,
    담긴것: function () { return 담긴것; }
  };
  document.addEventListener('DOMContentLoaded', 시작);
})(window.ZG);
