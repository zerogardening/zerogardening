/* 13a-소싱자료 — 즐겨찾기 · 분류폴더 읽기/쓰기 (4단계 설계 §2)
   저장소를 만지는 곳은 여기뿐이다(검색량 캐시만 13c 몫).

   🔴 즐겨찾기 레코드에는 id 가 없다 — 실데이터 15건에도 없고 PK 는 「키워드」다.
   그래서 저장소.바꾸기/지우기(id로 찾는다)를 쓰지 못하고,
   「읽기 → 배열에서 한 건만 손대기 → 전체쓰기」로 쓴다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  function 저() { return ZG.저장소; }
  function 키() { return ZG.저장소.키; }

  /* ── 즐겨찾기 ── */
  function 목록() { return 저().읽기(키().즐겨찾기); }
  function 즐겨쓰기(것들) { 저().전체쓰기(키().즐겨찾기, 것들); }

  function 찾기(키워드) {
    var k = String(키워드 || '').trim();
    return 목록().find(function (r) { return r.키워드 === k; }) || null;
  }
  function 담김(키워드) { return !!찾기(키워드); }

  /* 🔴 마지막 방어선 — 지워진 폴더 이름으로 담기면 그 줄이 어느 화면에도 안 나온다.
     실재하지 않는 폴더는 미분류('')로 떨어뜨린다 */
  function 실제폴더(이름) {
    var n = String(이름 || '').trim();
    if (!n) return '';
    return 폴더들().some(function (f) { return f.이름 === n; }) ? n : '';
  }

  /* 담을 때의 검색량 스냅샷을 같이 적어 둔다 — 키가 없는 날에도 숫자가 남는다 (§4-3 ②) */
  function 담기(키워드, 폴더, 값) {
    var k = String(키워드 || '').trim();
    if (!k) return null;
    var 것들 = 목록();
    var 갈곳 = 실제폴더(폴더);
    var 있는것 = 것들.find(function (r) { return r.키워드 === k; });
    if (있는것) { 있는것.분류 = 갈곳; 즐겨쓰기(것들); return 있는것; }

    var 새 = {
      키워드: k, 분류: 갈곳, 유형: '', 시즌: '',
      월검색: (값 && 값.월검색) || 0, 연검색: (값 && 값.연검색) || 0,
      PC: (값 && 값.PC) || 0, 모바일: (값 && 값.모바일) || 0,
      상품수: (값 && 값.상품수) || 0, 판매처수: (값 && 값.판매처수) || 0,
      월별추이: (값 && 값.월별추이) || [],
      담은때: Date.now()
    };
    것들.push(새);
    즐겨쓰기(것들);
    return 새;
  }

  function 빼기(키워드) {
    var k = String(키워드 || '').trim();
    var 것들 = 목록();
    var 자리 = 것들.findIndex(function (r) { return r.키워드 === k; });
    if (자리 < 0) return false;
    것들.splice(자리, 1);
    즐겨쓰기(것들);
    return true;
  }

  function 옮기기(키워드, 폴더) {
    var k = String(키워드 || '').trim();
    var 것들 = 목록();
    var 대상 = 것들.find(function (r) { return r.키워드 === k; });
    if (!대상) return false;
    대상.분류 = 실제폴더(폴더);
    즐겨쓰기(것들);
    return true;
  }

  /* 즐겨찾기 줄에 든 검색량 스냅샷. 하나도 없으면 null */
  function 스냅샷(줄) {
    if (!줄) return null;
    var 있나 = ['월검색', 'PC', '모바일', '상품수'].some(function (f) { return Number(줄[f]) > 0; });
    if (!있나) return null;
    return {
      월검색: Number(줄.월검색) || 0, PC: Number(줄.PC) || 0,
      모바일: Number(줄.모바일) || 0, 상품수: Number(줄.상품수) || 0,
      연검색: Number(줄.연검색) || 0, 판매처수: Number(줄.판매처수) || 0
    };
  }

  /* ── 분류폴더 ── 문자열 배열(구 favFolders)도 읽어 준다. 쓸 때는 언제나 객체다 (§2-2) */
  function 폴더들() {
    return 저().읽기(키().분류폴더).map(function (x) {
      if (typeof x === 'string') return { 이름: x, 만든때: 0 };
      return { 이름: String((x && x.이름) || ''), 만든때: Number(x && x.만든때) || 0 };
    }).filter(function (f) { return f.이름; });
  }
  function 폴더쓰기(것들) { 저().전체쓰기(키().분류폴더, 것들); }

  function 폴더찾기(이름) {
    return 폴더들().find(function (f) { return f.이름 === 이름; }) || null;
  }

  function 폴더만들기(이름) {
    var n = String(이름 || '').trim();
    if (!n) return { ok: false, 이유: '폴더 이름을 넣어 주세요' };
    if (n === '미분류') return { ok: false, 이유: '「미분류」는 만들 수 없습니다' };
    var 것들 = 폴더들();
    if (것들.some(function (f) { return f.이름 === n; })) return { ok: false, 이유: '같은 이름의 폴더가 이미 있습니다' };
    것들.push({ 이름: n, 만든때: Date.now() });
    폴더쓰기(것들);
    return { ok: true, 이름: n };
  }

  /* PK 가 이름이라 폴더 이름과 그 안 즐겨찾기의 「분류」를 한 번에 같이 바꾼다.
     하나만 바꾸면 키워드 없는 폴더를 가리켜 통째로 사라진다 (§3-2) */
  function 폴더이름바꾸기(옛이름, 새이름) {
    var n = String(새이름 || '').trim();
    if (!n) return { ok: false, 이유: '폴더 이름을 넣어 주세요' };
    if (n === 옛이름) return { ok: true, 이름: n };
    if (n === '미분류') return { ok: false, 이유: '「미분류」는 쓸 수 없습니다' };
    var 것들 = 폴더들();
    if (것들.some(function (f) { return f.이름 === n; })) return { ok: false, 이유: '같은 이름의 폴더가 이미 있습니다' };
    var 대상 = 것들.find(function (f) { return f.이름 === 옛이름; });
    if (!대상) return { ok: false, 이유: '없는 폴더입니다' };
    대상.이름 = n;
    폴더쓰기(것들);

    var 즐 = 목록();
    즐.forEach(function (r) { if (r.분류 === 옛이름) r.분류 = n; });
    즐겨쓰기(즐);
    return { ok: true, 이름: n };
  }

  /* 폴더만 없앤다. 안의 키워드는 미분류로 간다 — 지우지 않는다 (§3-2) */
  function 폴더삭제(이름) {
    var 것들 = 폴더들().filter(function (f) { return f.이름 !== 이름; });
    폴더쓰기(것들);
    var 즐 = 목록();
    var 옮긴수 = 0;
    즐.forEach(function (r) { if (r.분류 === 이름) { r.분류 = ''; 옮긴수 += 1; } });
    즐겨쓰기(즐);
    return 옮긴수;
  }

  /* 폴더 이름 → 개수. '' 는 미분류.
     폴더가 지워졌는데 분류만 남은 줄(고아)은 미분류로 센다 — 폴더안('')이 그렇게 보여 주므로 숫자도 맞춰야 한다 */
  function 폴더별개수() {
    var 셈 = { '': 0 };
    폴더들().forEach(function (f) { 셈[f.이름] = 0; });
    목록().forEach(function (r) {
      var k = r.분류 || '';
      if (셈[k] == null) k = '';
      셈[k] += 1;
    });
    return 셈;
  }

  /* 🔴 미분류는 「고아 분류」까지 전부 흡수한다 — 어디서 실수해도 화면 어딘가에는 반드시 보인다 */
  function 폴더안(이름) {
    var k = String(이름 || '');
    var 있는이름 = 폴더들().map(function (f) { return f.이름; });
    return 목록().filter(function (r) {
      var c = r.분류 || '';
      return k ? c === k : (c === '' || 있는이름.indexOf(c) < 0);
    }).sort(function (a, b) { return (Number(b.담은때) || 0) - (Number(a.담은때) || 0); });
  }

  ZG.소싱자료 = {
    목록: 목록, 찾기: 찾기, 담김: 담김, 담기: 담기, 빼기: 빼기, 옮기기: 옮기기, 스냅샷: 스냅샷,
    실제폴더: 실제폴더,
    폴더들: 폴더들, 폴더찾기: 폴더찾기, 폴더만들기: 폴더만들기,
    폴더이름바꾸기: 폴더이름바꾸기, 폴더삭제: 폴더삭제,
    폴더별개수: 폴더별개수, 폴더안: 폴더안
  };
})(window.ZG);
