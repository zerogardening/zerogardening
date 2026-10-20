/* 20e-예약자료 — 예약주문 판정·묶기 (18단계 설계 §3-2). 화면은 없다.
   예약은 v3_문자주문 한 줄의 칸(예약·예약일)이다 — 새 표가 없다. r.날짜(받은 날)는 건드리지 않는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var u = ZG.ui;
  function 자() { return ZG.문자주문자료; }

  function 날로(날) { return new Date(Number(날.slice(0, 4)), Number(날.slice(5, 7)) - 1, Number(날.slice(8, 10))); }
  // 서머타임이 없어 반올림이면 하루 길이가 어긋나지 않는다
  function 날수(날) { return Math.round((날로(날) - 날로(u.오늘문자())) / 86400000); }
  function 때됨(날) { return !!날 && 날 <= u.오늘문자(); }
  function D글(날) {
    var n = 날수(날);
    return n === 0 ? '오늘' : n > 0 ? 'D-' + n : 'D+' + (-n);
  }
  function 지난글(날) {
    var n = -날수(날);
    return n <= 0 ? '오늘' : n === 1 ? '어제' : n + '일 전';
  }

  function 순(가, 나) { return 가 < 나 ? -1 : 가 > 나 ? 1 : 0; }
  /* 날짜로 거르지 않는다 — 예약은 받은 날과 상관없이 한 곳에 모인다 */
  function 예약목록() {
    var 예약들 = 자().전부().filter(자().예약중);
    function 등록순(a, b) { return (a.등록일시 || 0) - (b.등록일시 || 0); }
    return {
      지정: 예약들.filter(function (r) { return r.예약일; })
        .sort(function (a, b) { return 순(a.예약일, b.예약일) || 등록순(a, b); }),
      미정: 예약들.filter(function (r) { return !r.예약일; })
        .sort(function (a, b) { return 순(String(a.날짜), String(b.날짜)) || 등록순(a, b); })
    };
  }
  /* 못 올라감 — 저장하지 않고 그때그때 본다. 주소를 채우면 저절로 빠진다 (26단계 §1)
     원본줄들 줄도 받는분·주소는 옮길 때 첫 줄에서 받아 둔 값이라 같은 칸을 본다 */
  function 사유(r) {
    if (!때됨(r.예약일)) return null;
    if (!String(r.받는분 || '').trim()) return { 짧은: '받는 분 이름 비어 있음', 긴: '받는 분 이름이 비어 있어 올라가지 못함' };
    if (!자().온주소(r)) return { 짧은: '받는 분 주소 비어 있음', 긴: '받는 분 주소가 비어 있어 올라가지 못함' };
    if (!(r.원본줄들 || r.품목 || []).length) return { 짧은: '품목 없음', 긴: '품목이 없어 올라가지 못함' };
    return null;
  }

  /* ══ ② 주문탭 → 예약 「보관 이동」 · 되살림 (§4) ══ */
  function 저() { return ZG.저장소; }
  function 문키() { return 저().키.문자주문; }
  function 복사(v) { return JSON.parse(JSON.stringify(v)); }
  function id표(줄들) { var 표 = {}; (줄들 || []).forEach(function (o) { 표[o.id] = 1; }); return 표; }
  function 다있나(원본, 줄들) { var 표 = id표(원본); return 줄들.every(function (o) { return 표[o.id]; }); }

  /* 🔴 g.출처는 첫 줄 것뿐이다 — 묶음키가 같으면 마켓 줄과 수동 줄이 한 건에 섞인다. 줄마다 본다 */
  function 넘길수있나(g) {
    var 줄들 = (g && g.줄들) || [];
    return !!줄들.length && 줄들.every(function (o) { return o.출처 === '수동'; });
  }
  function 품목들(원본) {
    return 원본.filter(function (o) { return o.서비스 !== true; }).map(function (o) {
      return { 품목코드: o.품목코드, 유통명: o.유통명, 학명: o.학명 || '', 규격: o.규격 || '',
               수량: ZG.주문자료.수량(o), 단가: Number(o.단가) || 0 };
    });
  }

  /* 한 건을 다시 읽고 다시 막는다 — 확인창 뒤 두 기기 틈 (17단계와 같은 까닭) */
  function 건살피기(g, 주문들) {
    var 표 = id표(g.줄들);
    var 지금 = 주문들.filter(function (o) { return 표[o.id]; });
    if (!지금.length) return null;
    var 이름 = 지금[0].수령인 || g.수령인 || '';
    if (!넘길수있나({ 줄들: 지금 })) return { 오류: 이름 + ' — 마켓 주문은 넘길 수 없습니다' };
    if (ZG.주문입력.나간줄(지금).length) return { 오류: '배송완료된 주문은 넘길 수 없습니다 — ' + 이름 };
    var 지금표 = id표(지금), 흡수 = [], 본 = {};
    for (var i = 0; i < 지금.length; i++) {
      var mid = 지금[i].문자주문id;
      if (!mid || 본[mid]) continue;
      본[mid] = 1;
      var m = 자().하나(mid);
      if (!m || m.상태 !== '올림') continue;
      // 반쪽만 옮기지 않는다 — 그 문자주문의 다른 줄이 남으면 껍데기를 지울 때 고아가 된다
      if (자().지울줄(m).some(function (o) { return !지금표[o.id]; })) return { 오류: '이 문자주문의 다른 줄이 따로 있어 넘길 수 없습니다 — ' + 이름 };
      흡수.push(m);
    }
    return { 지금: 지금, 흡수: 흡수 };
  }

  /* 예약 줄을 쓴다 — 끊긴 뒤 다시 누르면 원본이 겹치는 예약 줄을 이어 쓴다(두 벌 방지) */
  function 예약줄쓰기(살핌, 예약일) {
    var 지금 = 살핌.지금, 지금표 = id표(지금), 이제 = Date.now();
    var 있던 = 자().전부().find(function (r) {
      return r.상태 !== '올림' && (r.원본줄들 || []).some(function (o) { return 지금표[o.id]; });
    });
    if (있던) {
      var 원 = id표(있던.원본줄들), 더할 = 지금.filter(function (o) { return !원[o.id]; });
      if (더할.length) {
        var 합친 = 있던.원본줄들.concat(복사(더할));
        저().바꾸기(문키(), 있던.id, { 원본줄들: 합친, 품목: 품목들(합친), 수정일시: 이제 });
      }
      return 있던.id;
    }
    var 하나만 = 살핌.흡수.length === 1 ? 살핌.흡수[0] : null, 첫 = 지금[0];
    var 이른날 = 지금.map(function (o) { return String(o.주문일 || ''); }).filter(Boolean).sort()[0] || u.오늘문자();
    var 보낸 = 살핌.흡수.filter(function (m) { return m.보낸일시; })[0];
    var r = {
      id: 'sm_' + 이제.toString(36) + '_' + Math.random().toString(36).slice(2, 7),
      날짜: (하나만 && 하나만.날짜) || (살핌.흡수[0] && 살핌.흡수[0].날짜) || 이른날,
      상태: 보낸 ? '보냄' : '저장',
      받는분: 첫.수령인 || '', 전화: 자().숫자만(첫.수령인전화), 주소: 첫.수령인주소 || '', 상세주소: '',
      우편: 첫.우편번호 || '', 배송메시지: 첫.배송메모 || '',
      메모: 하나만 ? (하나만.메모 || '') : '', 배송비: 하나만 ? (Number(하나만.배송비) || 0) : 0,
      품목: 품목들(지금),
      예약: true, 예약일: 예약일 || '', 원본줄들: 복사(지금), 옮겨온일시: 이제,
      등록일시: 이제, 수정일시: 이제
    };
    if (보낸) r.보낸일시 = 보낸.보낸일시;
    저().덧붙이기(문키(), r);
    return r.id;
  }

  function 쉬기(ms) { return new Promise(function (풀) { setTimeout(풀, ms); }); }
  function 제때(p) {
    return Promise.race([p, new Promise(function (_, 깨기) { setTimeout(function () { 깨기(new Error('오프라인')); }, 10000); })]);
  }
  /* 🔴 로컬 되읽기만으로는 모자란다 — 01 저장()은 localStorage 쓰기가 실패해도 캐시에 남고,
     큐는 표마다 따로 올라가 주문 삭제만 먼저 서버에 닿을 수 있다. 그래서 서버에서 되읽어 본다 */
  /* 돌려주는 값: Promise { id: 내용 } (지운 줄은 빠진다) · 서버가 없으면 null · 못 닿으면 거부 */
  function 서버읽기(ids) {
    var 서 = ZG.서버;
    if (!(서 && 서.켜짐 && 서.클라이언트)) return Promise.resolve(null);
    return Promise.resolve(ZG.보내기 && ZG.보내기.깨우기()).then(function () {
      return 제때(서.클라이언트.from('v3_문자주문').select('id,내용,삭제됨').in('id', ids));
    }).then(function (답) {
      if (!답 || 답.error) throw new Error('서버 답 없음');
      var 표 = {};
      (답.data || []).forEach(function (행) { if (!행.삭제됨) 표[행.id] = 행.내용 || {}; });
      return 표;
    });
  }
  function 서버확인(짝들) {
    return 서버읽기(짝들.map(function (짝) { return 짝.id; })).then(function (표) {
      return !표 || 짝들.every(function (짝) { return 표[짝.id] && 다있나(표[짝.id].원본줄들, 짝.지금); });
    }).catch(function () { return false; });
  }
  function 확인되나(짝들, 남은) {
    var 로컬 = 짝들.every(function (짝) { var r = 자().하나(짝.id); return r && 다있나(r.원본줄들, 짝.지금); });
    if (!로컬) return Promise.resolve(false);
    return 서버확인(짝들).then(function (됨) {
      if (됨 || 남은 <= 0) return 됨;
      return 쉬기(1000).then(function () { return 확인되나(짝들, 남은 - 1); });
    });
  }

  /* 돌려주는 값: Promise { 새id들 } | { 오류 }
     🔴 순서가 곧 안전장치다 — 예약 줄 쓰기 → 확인 → 주문 지우기 → 흡수한 문자주문 지우기 */
  function 옮기기(건들, 예약일) {
    try {
      var 주문들 = 저().읽기(저().키.주문), 살핌들 = [];
      for (var i = 0; i < 건들.length; i++) {
        var 살 = 건살피기(건들[i], 주문들);
        if (!살) continue;
        if (살.오류) return Promise.resolve({ 오류: 살.오류 });
        살핌들.push(살);
      }
      if (!살핌들.length) return Promise.resolve({ 오류: '넘길 주문이 없습니다 — 이미 옮겨졌거나 지워졌습니다' });
      var 짝들 = 살핌들.map(function (살) { return { id: 예약줄쓰기(살, 예약일), 지금: 살.지금 }; });
    } catch (e) { return Promise.resolve({ 오류: '예약으로 옮기지 못했습니다 — ' + e.message }); }

    return 확인되나(짝들, 2).then(function (됨) {
      if (!됨) return { 오류: '예약에 담긴 것을 서버에서 확인하지 못해 주문은 그대로 두었습니다. 다시 누르면 이어서 합니다' };
      살핌들.forEach(function (살) {
        살.지금.forEach(function (o) {
          저().지우기(저().키.주문, o.id);
          if (ZG.서비스품목) ZG.서비스품목.출고지우기(o.id);
        });
      });
      // 맨 끝 — 그 일을 예약 줄이 이어받았다. 여기서 끊기면 「주문올림」 껍데기만 남는다(올림 삭제로 지운다)
      살핌들.forEach(function (살) { 살.흡수.forEach(function (m) { 저().지우기(문키(), m.id); }); });
      return { 새id들: 짝들.map(function (짝) { return 짝.id; }) };
    }).catch(function (e) { return { 오류: '예약으로 옮기지 못했습니다 — ' + e.message }; });
  }

  /* 돌려주는 값: { 번호 } | { 오류 }  —  상태 바꾸기는 맨 끝. 그 전에 끊기면 다시 눌러 남은 줄만 더한다 */
  function 되살리기(id) {
    var r = 자().하나(id);
    // 예약을 풀어도 원본은 남는다 — 예약중이 아니어도 올릴 수 있어야 갇히지 않는다
    if (!r || r.상태 === '올림' || !(r.원본줄들 || []).length) return { 오류: '되살릴 원본이 없습니다' };
    var 됨 = 자().올릴수있나(r);
    if (!됨.된다) return { 오류: 됨.까닭 };
    var 오늘 = u.오늘문자(), 주문키 = 저().키.주문, 주문들 = 저().읽기(주문키);
    var 원본 = r.원본줄들, 원표 = id표(원본), 있는표 = id표(주문들);
    var 이미 = 원본.filter(function (o) { return 있는표[o.id]; });
    var 원번호 = (원본.map(function (o) { return String(o.주문번호 || '').trim(); }).filter(Boolean))[0] || '';
    var 번호;
    if (이미.length) {
      var 그줄 = 주문들.find(function (o) { return o.id === 이미[0].id; });
      번호 = String(그줄.주문번호 || '').trim();
    } else if (원번호 && 주문들.some(function (o) { return !원표[o.id] && String(o.주문번호 || '').trim() === 원번호; })) {
      번호 = 자().새주문번호(오늘, 주문들);   // 거부하면 그 예약은 영영 못 올린다 (§4-5 3)
    } else 번호 = 원번호;
    원본.forEach(function (o) {
      if (있는표[o.id]) return;
      var 줄 = 복사(o);
      줄.주문번호 = 번호; 줄.주문일 = 오늘; 줄.문자주문id = r.id;
      delete 줄.출력번호;   // 옛 출력번호가 남으면 08i 가 다시 안 매겨 그날 번호·동봉카드와 겹친다
      저().덧붙이기(주문키, 줄);
      if (줄.서비스 === true && ZG.서비스품목) ZG.서비스품목.출고맞추기(줄);
    });
    var 이제 = Date.now();
    저().바꾸기(문키(), r.id, { 상태: '올림', 올린주문번호: 번호, 올린일시: 이제, 원본줄들: null, 수정일시: 이제 });
    return { 번호: 번호 };
  }

  /* ══ 자동 올림 (26단계 §3) — 앱이 뜰 때 · 📥 주문수집 때. 올리기는 손으로 누르는 것과 같은 함수다 ══ */
  var 기기 = 'k_' + Math.random().toString(36).slice(2, 8);   // 이 창 하나 — 새로고침하면 새 기기다
  var 도는중 = false;
  function 사람(r) {
    return { 받는분: r.받는분, 전화: r.전화, 주소: r.주소, 상세주소: r.상세주소, 우편: r.우편, 배송메시지: r.배송메시지 };
  }
  function 올리기(id) {
    var r = 자().하나(id);
    if (!r || !자().예약중(r)) return { 오류: '이미 올렸습니다' };
    return r.원본줄들 ? 되살리기(id) : 자().주문올리기(id, 사람(r));
  }
  function 남이잡음(것) { return 것.자동 && 것.자동.기기 !== 기기 && Date.now() - (것.자동.때 || 0) < 60000; }
  function 서버도때됨(것) { return 것.예약 === true && 것.상태 !== '올림' && 때됨(것.예약일); }
  function 내것만(ids) {
    return 서버읽기(ids).then(function (표) {
      return ids.filter(function (id) { var 것 = 표[id]; return 것 && 서버도때됨(것) && 것.자동 && 것.자동.기기 === 기기; });
    });
  }
  function 닿을때까지(ids, 남은) {
    return 내것만(ids).then(function (내) {
      if (내.length === ids.length || 남은 <= 0) return 내;
      return 쉬기(1000).then(function () { return 닿을때까지(ids, 남은 - 1); });
    });
  }
  /* 🔴 쓰기 전에 서버부터 읽는다 — 로컬이 낡았으면(남이 이미 올림) 그 낡은 줄로 서버를 덮는다
     ponytail: 서버 잠금이 아니라 되읽기다. 두 기기 쓰기가 1.5초 넘게 엇갈리면 뚫린다 — 겪으면 조건부 update(RPC)로 */
  function 잡기(후보) {
    var ids = 후보.map(function (r) { return r.id; });
    return 서버읽기(ids).then(function (표) {
      if (!표) return ids;   // 서버 없음(로컬 시험) — 겹칠 남이 없다
      var 잡을 = 후보.filter(function (r) {
        var 것 = 표[r.id];
        return 것 && 서버도때됨(것) && 것.수정일시 === r.수정일시 && !남이잡음(것);
      }).map(function (r) { return r.id; });
      if (!잡을.length) return [];
      잡을.forEach(function (id) { 저().바꾸기(문키(), id, { 자동: { 기기: 기기, 때: Date.now() } }); });
      return 닿을때까지(잡을, 3).then(function (내) {
        return 내.length ? 쉬기(1500).then(function () { return 내것만(내); }) : [];
      });
    }).catch(function () { return []; });   // 서버에 못 닿으면 안 올린다 — 다음 번에
  }
  /* 돌려주는 값: Promise { 올림, 못 } · 이미 도는 중이면 null */
  function 자동올리기() {
    if (도는중) return Promise.resolve(null);
    var 목 = 예약목록().지정.filter(function (r) { return 때됨(r.예약일); });
    var 못 = 목.filter(사유).length, 후보 = 목.filter(function (r) { return !사유(r); });
    if (!후보.length) return Promise.resolve({ 올림: 0, 못: 못 });
    도는중 = true;
    return 잡기(후보).then(function (ids) {
      var 올림 = 0;
      ids.forEach(function (id) {
        if (!(ZG.서버 && ZG.서버.켜짐)) 저().바꾸기(문키(), id, { 자동: { 기기: 기기, 때: Date.now() } });
        if (!올리기(id).오류) 올림++;
      });
      도는중 = false;
      return { 올림: 올림, 못: 못 };
    }, function () { 도는중 = false; return { 올림: 0, 못: 못 }; });
  }
  function 오늘자동수() {
    var 오늘 = u.오늘문자();
    return 자().전부().filter(function (r) {
      return r.상태 === '올림' && r.자동 && ZG.계산.날짜문자(r.자동.때) === 오늘;
    }).length;
  }

  ZG.예약자료 = {
    날수: 날수, 때됨: 때됨, D글: D글, 지난글: 지난글, 예약목록: 예약목록, 사유: 사유,
    넘길수있나: 넘길수있나, 옮기기: 옮기기, 되살리기: 되살리기, 올리기: 올리기,
    자동올리기: 자동올리기, 오늘자동수: 오늘자동수
  };
})(window.ZG);
