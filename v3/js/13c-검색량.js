/* 13c-검색량 — 검색량 어댑터 (4단계 설계 §4)
   🔴 바깥 API 와 zg.v3.키워드 를 만지는 유일한 파일이다.
   다른 파일은 네이버를 모른다 — 영문→한글 변환도 여기서만 한다.

   값객체 = { 월검색, PC, 모바일, 상품수, 경쟁, 판매처수, 연검색, 월별추이, 받은때 }
   없으면 null 이고, 화면은 그때 「—」를 찍는다.

   🔴 상품수·경쟁·판매처수는 지금 언제나 null 이다 — 네이버 「쇼핑」 API 가 404 를 낸다.
      검색량(검색광고)·월별추이(데이터랩)는 정상이다. 고치려면 Supabase Edge Function 을 봐야 한다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 최대줄 = 50;

  /* app.html 이 쓰던 것과 같은 중계 함수다 (CORS 때문에 브라우저가 네이버를 직접 못 부른다) */
  var 함수주소 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/functions/v1/naver-keyword';
  var 익명키 = 'sb_publishable_ds8hYFdqgj-vsotoaqtv4w_XhkL_DN2';
  var 유효시간 = 24 * 60 * 60 * 1000;   // 하루 지난 캐시는 다시 부른다
  var 청크 = 15;                        // 한 번에 보내는 키워드 수 (app.html fetchKeywordData 와 같게)

  function 키있나() { return true; }

  function 안내() {
    return '📊 <b>월간검색수 · 월별 검색추이는 네이버에서 실시간으로 가져옵니다.</b> ' +
           '다만 <b>상품수 · 경쟁률</b>은 네이버 쇼핑 API가 응답하지 않아 아직 비어 있습니다(—).';
  }

  /* ── 캐시 (zg.v3.키워드) ──
     이사된 66건은 키가 식물ID(s_angae 꼴)라 키워드 문자열로는 안 걸린다. 지우지도 않는다 (§2-3) */
  function 캐시(키워드) {
    var 전부 = ZG.저장소.읽기(ZG.저장소.키.키워드);
    var v = 전부[String(키워드 || '').trim()];
    return (v && typeof v === 'object') ? v : null;
  }

  function 캐시넣기(키워드, 값) {
    var k = String(키워드 || '').trim();
    if (!k || !값) return;
    var 전부 = ZG.저장소.읽기(ZG.저장소.키.키워드);
    전부[k] = 값;
    ZG.저장소.전체쓰기(ZG.저장소.키.키워드, 전부);
  }

  /* ── 값 채우기 ── ① 캐시 → ② 즐겨찾기 스냅샷 → ③ null (§4-3) */
  function 값찾기(키워드) {
    var v = 캐시(키워드);
    if (v) return v;
    return ZG.소싱자료.스냅샷(ZG.소싱자료.찾기(키워드));
  }

  /* ── 연관 키워드 ──
     🔴 네이버 연관 키워드는 아직 안 온다(쇼핑 404 와 같이 묶여 있다) — 내 데이터에서 찾는다 (§4-2)
     ① 검색어 자체 ② 즐겨찾기 ③ 품목 유통명 */
  function 연관(검색어) {
    var q = String(검색어 || '').trim();
    var 낮 = q.toLowerCase();
    var 본것 = {}, 목록 = [];

    function 넣기(키워드) {
      var k = String(키워드 || '').trim();
      if (!k || 본것[k] || 목록.length >= 최대줄) return;
      본것[k] = true;
      목록.push({ 키워드: k, 값: 값찾기(k) });
    }

    if (q) 넣기(q);

    ZG.소싱자료.목록().forEach(function (r) {
      if (String(r.키워드).toLowerCase().indexOf(낮) >= 0) 넣기(r.키워드);
    });

    ZG.저장소.품목들().forEach(function (p) {
      var 이름 = String(p.유통명 || '').trim();
      if (이름 && 이름.toLowerCase().indexOf(낮) >= 0) 넣기(이름);
    });

    return Promise.resolve({ 상태: '내데이터', 출처: '내데이터', 목록: 목록 });
  }

  /* ── 네이버 부르기 ── 🔴 여기 말고는 아무 데서도 fetch 하지 않는다 (§4-4) */
  function 신선한가(값) {
    return !!(값 && 값.받은때 && (Date.now() - Number(값.받은때)) < 유효시간);
  }

  /* 응답 영문 → 값객체 한글. 바깥으로 새는 영문 이름은 여기서 끝난다 */
  function 한글로(r, 받은때) {
    var 월 = (r.monthly == null ? null : Number(r.monthly));
    return {
      월검색: 월,
      PC: (r.pc == null ? null : Number(r.pc)),
      모바일: (r.mobile == null ? null : Number(r.mobile)),
      연검색: (r.annual != null ? Number(r.annual) : (월 == null ? null : 월 * 12)),
      상품수: (r.productCount == null ? null : Number(r.productCount)),
      판매처수: (r.sellerCount == null ? null : Number(r.sellerCount)),
      경쟁: (r.competition == null ? null : r.competition),
      월별추이: r.monthlyTrend || [],
      받은때: 받은때 || Date.now()
    };
  }

  function 보내기(묶음, 추이) {
    return fetch(함수주소, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': 'Bearer ' + 익명키,
        'apikey': 익명키
      },
      body: JSON.stringify({ keywords: 묶음, trend: !!추이, related: false })
    }).then(function (응답) {
      if (응답.ok) return 응답.json();
      return 응답.text().then(function (글) {
        throw new Error('네이버 응답 ' + 응답.status + ' ' + String(글).slice(0, 80));
      });
    });
  }

  /* 🔴 네이버는 키워드를 「공백 없는 대문자」로 돌려줄 수 있다 — 보낸 글자로 되돌린다.
     안 되돌리면 캐시 키가 어긋나 화면이 영영 「—」로 남는다 */
  function 되돌리개(묶음) {
    var 표 = {};
    묶음.forEach(function (k) { 표[String(k).replace(/\s/g, '').toUpperCase()] = k; });
    return function (받은키워드) {
      var k = String(받은키워드 || '');
      return 표[k.replace(/\s/g, '').toUpperCase()] || k;
    };
  }

  /* 자세히(키워드들, {추이:true}) → { 상태:'됨'|'실패', 값:{키워드:값객체}, 이유 }
     🔴 실패해도 reject 하지 않는다 — 화면은 목록을 계속 보여줘야 한다 */
  function 자세히(키워드들, 옵션) {
    var 추이 = !!(옵션 && 옵션.추이);
    var 값 = {}, 부를것 = [], 본것 = {};

    (키워드들 || []).forEach(function (kw) {
      var k = String(kw || '').trim();
      if (!k || 본것[k]) return;
      본것[k] = true;
      var c = 캐시(k);
      // 추이가 필요한데 캐시에 추이가 없으면 신선해도 다시 부른다
      if (신선한가(c) && (!추이 || (c.월별추이 && c.월별추이.length))) { 값[k] = c; return; }
      부를것.push(k);
    });

    if (!부를것.length) return Promise.resolve({ 상태: '됨', 값: 값, 이유: '' });

    var 묶음들 = [];
    for (var i = 0; i < 부를것.length; i += 청크) 묶음들.push(부를것.slice(i, i + 청크));

    return 묶음들.reduce(function (앞, 묶음) {
      return 앞.then(function () {
        return 보내기(묶음, 추이).then(function (res) {
          var 받은때 = res.fetchedAt || Date.now();
          var 되돌리기 = 되돌리개(묶음);
          (res.results || []).forEach(function (r) {
            if (!r) return;
            var k = 되돌리기(r.keyword);
            if (!k) return;
            var v = 한글로(r, 받은때);
            값[k] = v;
            캐시넣기(k, v);
          });
        });
      });
    }, Promise.resolve())
      .then(function () { return { 상태: '됨', 값: 값, 이유: '' }; })
      .catch(function (e) { return { 상태: '실패', 값: 값, 이유: (e && e.message) || String(e) }; });
  }

  ZG.검색량 = {
    키있나: 키있나, 안내: 안내, 연관: 연관, 자세히: 자세히,
    캐시: 캐시, 캐시넣기: 캐시넣기, 값찾기: 값찾기
  };
})(window.ZG);
