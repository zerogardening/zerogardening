/* 99b-서버올리기 — 이사 화면의 「☁ 서버로 올리기」·「⬇ 서버에서 받아오기」 (7단계 설계 §7)
   🔴 올리기는 사무실 PC 에서 딱 한 번만. 폰에서 또 누르면 폰의 옛 값이 서버를 덮는다. */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  var 칸 = document.getElementById('서버칸');
  if (!칸) return;

  칸.innerHTML =
    '<h2>3. 서버(Supabase)</h2>' +
    '<p class="설명" style="margin:0 0 12px">' +
    '🔴 <b>「서버로 올리기」는 사무실 PC 에서 딱 한 번만</b> 누르세요. 폰에서 또 누르면 폰에 있던 옛 값이 서버를 덮어씁니다.<br>' +
    '<code>?reset=1</code> 은 이 브라우저만 지웁니다 — 로그인 상태라면 새로고침할 때 서버에서 다시 내려옵니다.</p>' +
    '<button class="주" id="올리기">☁ 서버로 올리기</button> ' +
    '<button id="받아오기">⬇ 서버에서 받아오기</button>' +
    '<p id="진행" style="margin:12px 0 0;font-size:13px;font-weight:600"></p>';

  var 진행 = document.getElementById('진행');
  var 올리기단추 = document.getElementById('올리기');
  var 받기단추 = document.getElementById('받아오기');

  function 알림(글) { 진행.textContent = 글; }

  if (!ZG.서버 || !ZG.서버.켜짐) {
    알림('서버에 연결되지 않았습니다 — 로그인 상태와 인터넷을 확인해 주세요.');
    올리기단추.disabled = true; 받기단추.disabled = true;
    return;
  }

  var supa = ZG.서버.클라이언트;

  /* 500건씩 끊어 보낸다. 실패한 묶음만 한 번 다시 시도 */
  function 묶어올리기(표, 행들, 알리기) {
    var 자리 = 0;
    function 다음() {
      if (자리 >= 행들.length) return Promise.resolve();
      var 조각 = 행들.slice(자리, 자리 + 500);
      return supa.from('v3_' + 표).upsert(조각, { onConflict: 'id' }).then(function (r) {
        if (r.error) return supa.from('v3_' + 표).upsert(조각, { onConflict: 'id' });
        return r;
      }).then(function (r) {
        if (r && r.error) throw r.error;
        자리 += 조각.length;
        알리기(표 + ' ' + 행들.length + '건 중 ' + 자리 + '…');
        return 다음();
      });
    }
    return 다음();
  }

  올리기단추.addEventListener('click', function () {
    if (!confirm('이 브라우저의 데이터를 서버로 올립니다. 사무실 PC 에서 한 번만 하세요. 계속할까요?')) return;
    올리기단추.disabled = true; 받기단추.disabled = true;
    var 저 = ZG.저장소, 건수 = {};

    /* 🔴 키를 못 찾은 줄은 조용히 버리지 않는다. 버리면 「즐겨찾기 15건」이라 찍어 놓고
       서버는 0건인 거짓 성공이 되고, 그 상태로 서버상태 행까지 써 버린다.
       건수는 서버에 실제로 들어간 수만 센다. */
    var 일 = ZG.서버.표들.reduce(function (앞, 표) {
      return 앞.then(function () {
        var 목록 = 저.읽기(ZG.서버.키로(표));
        var 행들 = [], 못센줄 = 0;
        목록.forEach(function (r) {
          var id = 저.레코드키(표, r);
          if (!id || id === 'undefined') { 못센줄++; return; }
          행들.push({ id: id, 내용: r, 삭제됨: false });
        });
        if (못센줄) {
          throw new Error(표 + ' ' + 못센줄 + '건에 「' + 저.키필드(표) + '」 칸이 없습니다 — 올리지 않았습니다');
        }
        건수[표] = 행들.length;
        return 묶어올리기(표, 행들, 알림);
      });
    }, Promise.resolve());

    일.then(function () {
      var 설정행 = [];
      [저.키.동봉카드설정, 저.키.키워드].forEach(function (k) {
        설정행.push({ id: ZG.서버.표이름(k), 내용: 저.읽기(k) || {}, 삭제됨: false });
      });
      return 묶어올리기('공유설정', 설정행, 알림);
    }).then(function () {
      // 🔴 13개 표가 전부 성공한 뒤에야 서버상태 행을 쓴다 (관문 ①)
      return ZG.서버.올림표시(건수);
    }).then(function (r) {
      if (r && r.error) throw r.error;
      알림('✅ 다 올렸습니다 — ' + Object.keys(건수).map(function (표) {
        return 표 + ' ' + 건수[표];
      }).join(' · '));
      받기단추.disabled = false;
    }).catch(function (e) {
      알림('❌ 도중에 실패했습니다 — 서버상태를 쓰지 않았습니다. 다시 눌러 주세요. (' + (e.message || e) + ')');
      올리기단추.disabled = false; 받기단추.disabled = false;
    });
  });

  받기단추.addEventListener('click', function () {
    if (!confirm('서버 것으로 이 브라우저를 통째로 갈아끼웁니다. 지금 브라우저 값이 지워집니다. 계속할까요?')) return;
    올리기단추.disabled = true; 받기단추.disabled = true;
    알림('받는 중…');
    ZG.서버.받아오기().then(function (건수) {
      알림('✅ 받아왔습니다 — ' + Object.keys(건수 || {}).map(function (표) {
        return 표 + ' ' + 건수[표];
      }).join(' · '));
      올리기단추.disabled = false; 받기단추.disabled = false;
    }).catch(function (e) {
      알림('❌ 못 받았습니다 — ' + (e.message || e));
      올리기단추.disabled = false; 받기단추.disabled = false;
    });
  });
})(window.ZG);
