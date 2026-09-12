/* 06h-원고자료 — v3_원고 표 읽기/쓰기 · 상한표 · 글자수 검사 (15단계 B 설계 §2)
   화면은 한 줄도 그리지 않는다 — 그리는 것은 06i·06j 다.

   🔴 01-저장소.js·01b-서버.js 를 안 고친다. 여기서 ZG.서버.클라이언트 로 직접 읽고 쓴다.
      공통 파일을 고치면 주문·업체·소싱·메모 html 이 묵은 사본을 물고 갈라진다(설계 §2).
      대가는 오프라인 저장이 안 되는 것 — 안 닿으면 토스트로 분명히 알린다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 표이름 = 'v3_원고';

  /* 상한 근거 — product-writer.md 「글자수 상한」 = 상품/_필드정의.md:205.
     🔴 5구역은 130 이다. 83 으로 잡으면 실측 32품목 중 11품목이 열자마자 저장이 막힌다(설계 §1). */
  var 칸들 = [
    { 칸: '1',   구역: '1', 이름: '①', 소제목: false, 상한: 160 },
    { 칸: '2',   구역: '2', 이름: '②', 소제목: true,  상한: 130 },
    { 칸: '3',   구역: '3', 이름: '③', 소제목: true,  상한: 130 },
    { 칸: '4-1', 구역: '4', 이름: '①', 소제목: true,  상한: 190 },
    { 칸: '4-2', 구역: '4', 이름: '②', 소제목: true,  상한: 190 },
    { 칸: '4-3', 구역: '4', 이름: '③', 소제목: true,  상한: 190 },
    { 칸: '5',   구역: '5', 이름: '⑤', 소제목: false, 상한: 130 }
  ];

  /* 구역 머리에 다는 이름. 2·3 구역은 품목마다 소제목이 달라 값이 있으면 그것을 쓴다 */
  var 구역이름 = { '1': '소개', '2': '꽃', '3': '잎', '4': 'How to grow', '5': '식재 간격', '6': '실촬영' };

  function 칸찾기(칸) {
    for (var i = 0; i < 칸들.length; i++) if (칸들[i].칸 === 칸) return 칸들[i];
    return null;
  }

  /* 🔴 supabase-js 는 인터넷이 끊기거나 세션이 상하면 약속을 영영 안 끝낼 때가 있다.
     그대로 두면 원고 갈래가 「불러오는 중…」에 멈춰 선다 — 조용히 실패하지 않는다 (설계 §2).
     10초가 지나면 오프라인으로 보고 말썽()이 사람 말로 바꿔 준다. */
  function 제때(p) {
    return Promise.race([p, new Promise(function (_, 깨기) {
      setTimeout(function () { 깨기(new Error('오프라인')); }, 10000);
    })]);
  }

  function 통() {
    var 서 = ZG.서버;
    return 서 && 서.켜짐 && 서.클라이언트 ? 서.클라이언트.from(표이름) : null;
  }

  /* 줄바꿈은 안 센다 — 조판이 문단을 다시 흘리므로 글자만이 자리를 먹는다 (설계 §3) */
  function 글자수(본문) { return String(본문 == null ? '' : 본문).replace(/\n/g, '').length; }

  /* 🔴 이미 넘쳐 있던 칸은 「더 늘리지만 않으면」 통과다.
     손대지도 않은 글 때문에 저장이 막히면 화면이 고장난 것과 같다 (설계 §1). */
  function 넘침(칸, 지금본문, 원래본문) {
    var 정 = 칸찾기(칸);
    if (!정) return 0;
    var 셈 = 글자수(지금본문);
    if (셈 <= 정.상한) return 0;
    if (셈 <= 글자수(원래본문)) return 0;
    return 셈 - 정.상한;
  }

  function 줄id(코드, 칸) { return 코드 + '#' + 칸; }

  /* 한 품목이 쓰는 줄 여덟 개 — 머리줄 하나 + 글칸 일곱 */
  function id들(코드) {
    return [코드].concat(칸들.map(function (정) { return 줄id(코드, 정.칸); }));
  }

  /* {칸값: {칸: {소제목, 본문, 고친때}}, 머리: {}}.
     🔴 줄이 없는 칸은 아예 담지 않는다 — 맥이 파일에서 못 읽은 칸이다.
        화면은 그 칸을 흐린 빈 칸으로 두고 저장 대상에서 뺀다 (설계 §0-③). */
  function 불러오기(코드) {
    var t = 통();
    if (!t) return Promise.reject(new Error('오프라인'));
    return 제때(t.select('id,내용,삭제됨').in('id', id들(코드))).then(function (답) {
      if (답 && 답.error) throw 답.error;
      var 칸값 = {}, 머리 = {};
      ((답 && 답.data) || []).forEach(function (r) {
        if (r.삭제됨) return;
        var 내용 = r.내용 || {};
        if (r.id === 코드) { 머리 = 내용; return; }
        var 칸 = r.id.slice(코드.length + 1);
        if (칸찾기(칸)) 칸값[칸] = 내용;
      });
      return { 칸값: 칸값, 머리: 머리 };
    });
  }

  /* 줄들 = [{칸, 소제목, 본문}] — 🔴 바뀐 칸만 보낸다. 안 고친 칸은 아예 안 건드린다 (설계 §2) */
  function 저장하기(코드, 줄들) {
    var t = 통();
    if (!t) return Promise.reject(new Error('오프라인'));
    if (!줄들.length) return Promise.resolve(0);
    var 이제 = Date.now();
    var 행들 = 줄들.map(function (줄) {
      return {
        id: 줄id(코드, 줄.칸),
        내용: { 품목코드: 코드, 칸: 줄.칸, 소제목: 줄.소제목 || '', 본문: 줄.본문 || '',
                고친때: 이제, 맥시각: 줄.맥시각 || 0 },
        삭제됨: false
      };
    });
    return 제때(t.upsert(행들, { onConflict: 'id' })).then(function (답) {
      if (답 && 답.error) throw 답.error;
      return 줄들.length;
    });
  }

  /* 머리줄 — 만들기요청 · 만든때 · 장수 · 만들기상태 · 말 */
  function 머리쓰기(코드, 덧) {
    var t = 통();
    if (!t) return Promise.reject(new Error('오프라인'));
    var 내용 = { 품목코드: 코드 };
    Object.keys(덧 || {}).forEach(function (k) { 내용[k] = 덧[k]; });
    return 제때(t.upsert([{ id: 코드, 내용: 내용, 삭제됨: false }], { onConflict: 'id' })).then(function (답) {
      if (답 && 답.error) throw 답.error;
      return 내용;
    });
  }

  function 머리읽기(코드) {
    var t = 통();
    if (!t) return Promise.reject(new Error('오프라인'));
    return 제때(t.select('id,내용,삭제됨').eq('id', 코드)).then(function (답) {
      if (답 && 답.error) throw 답.error;
      var r = ((답 && 답.data) || [])[0];
      return (r && !r.삭제됨 && r.내용) || {};
    });
  }

  /* 만들어진 이미지는 Storage product/{품목코드}/발행/1.jpg … 6.jpg —
     A단계가 쓰는 {품목코드}/1.jpg(원료)와 칸이 갈린다. 06g 의 것을 그대로 쓴다 (설계 §2) */
  function 발행훑기(코드) { return ZG.사진수집.사진훑기(코드 + '/발행'); }
  function 발행주소(코드, 번, 때) { return ZG.사진수집.주소(코드, '발행/' + 번 + '.jpg', 때); }

  /* 서버가 안 닿거나 표가 아직 없을 때 — 조용히 실패하지 않는다 (설계 §2) */
  function 말썽(e) {
    var m = (e && (e.message || e.msg)) || '';
    if (/오프라인|Failed to fetch|NetworkError|Load failed/i.test(m))
      return '인터넷이 안 닿아 원고를 못 다룹니다';
    if (/does not exist|schema cache|42P01|PGRST205/i.test(m)) return '서버에 v3_원고 표가 아직 없습니다';
    return '원고를 못 읽었습니다 — ' + (m || '까닭 모름');
  }

  ZG.원고자료 = {
    칸들: 칸들, 구역이름: 구역이름, 칸찾기: 칸찾기, 글자수: 글자수, 넘침: 넘침,
    불러오기: 불러오기, 저장하기: 저장하기, 머리읽기: 머리읽기, 머리쓰기: 머리쓰기,
    발행훑기: 발행훑기, 발행주소: 발행주소, 말썽: 말썽, 닿나: function () { return !!통(); }
  };
})(window.ZG);
