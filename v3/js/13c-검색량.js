/* 13c-검색량 — 검색량 어댑터 (4단계 설계 §4)
   🔴 바깥 API 와 zg.v3.키워드 를 만지는 유일한 파일이다.
   키가 붙는 날 이 파일 하나만 갈아끼우면 되게 한다 — 다른 파일은 내부를 모른다.

   값객체 = { 월검색, PC, 모바일, 상품수, 경쟁, 판매처수, 연검색, 월별추이, 받은때 }
   없으면 null 이고, 화면은 그때 「—」 + 「키 없음」을 찍는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 최대줄 = 50;

  function 키있나() { return false; }

  function 안내() {
    return '🔑 <b>네이버 검색광고 API 키가 아직 연결되지 않았습니다.</b> ' +
           '키워드 목록은 나오지만 <b>월간검색수 · 상품수 칸은 비어 있습니다(—)</b>. ' +
           '키를 넣으면 그 자리에 숫자가 채워집니다.';
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
     🔴 키가 없어도 목록은 준다. 안 그러면 ★로 담을 것이 없어 화면이 쓸모없다 (§4-2)
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

    return Promise.resolve({ 상태: '키없음', 출처: '내데이터', 목록: 목록 });
  }

  /* 키가 붙는 날 여기서만 fetch 한다 (§4-4). 지금은 언제나 빈 값이다 */
  function 자세히(키워드들) {
    return Promise.resolve({ 상태: '키없음', 값: {} });
  }

  ZG.검색량 = {
    키있나: 키있나, 안내: 안내, 연관: 연관, 자세히: 자세히,
    캐시: 캐시, 캐시넣기: 캐시넣기, 값찾기: 값찾기
  };
})(window.ZG);
