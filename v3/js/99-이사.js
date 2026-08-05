/* 99-이사 — 구 프로그램(app.html) 백업 JSON 을 v3 저장소 모양으로 옮긴다.
   이사.html 에서만 쓴다. 평소 화면에는 실리지 않는다.

   🔴 옮기는 규칙의 원본이 이 파일이다. 규칙을 고치려면 여기를 고친다.
   구 데이터는 한 덩어리(state) 하나였고 v3 는 표마다 키 하나다(설계 §3). */
window.ZG = window.ZG || {};
(function (ZG) {
  'use strict';

  /* ── 구 프로그램의 normalizeInventoryKey 와 같은 규칙 ──
     app.html 13826행. 묶음 꼬리 `(2)` 를 떼고 8자로 자른다 */
  function 코드정규화(코드) {
    if (!코드) return '';
    var 괄호뗀 = String(코드).replace(/\([^)]*\)\s*$/, '').trim().toUpperCase();
    return 괄호뗀.length > 8 ? 괄호뗀.slice(0, 8) : 괄호뗀;
  }

  /* `ERB01-10(2)` → 2. 없으면 1 */
  function 입수뽑기(코드) {
    var m = String(코드 || '').match(/\((\d+)\)\s*$/);
    return m ? Number(m[1]) : 1;
  }

  /* `15cm 포트` → 15 · 코드 꼬리 `-15` 도 본다 */
  function 규격cm뽑기(규격, 코드) {
    var m = String(규격 || '').match(/(\d+)\s*cm/i);
    if (m) return Number(m[1]);
    m = String(코드 || '').match(/-(\d+)$/);
    return m ? Number(m[1]) : 0;
  }

  var 상태표 = { selling: '판매중', soldout: '품절', paused: '일시중지' };

  function 아이디(앞, i) {
    return 앞 + '_이사_' + i.toString(36);
  }

  function 날짜문자(밀리초) {
    var d = new Date(Number(밀리초) || Date.now());
    return d.getFullYear() + '-' + String(d.getMonth() + 1).padStart(2, '0') +
           '-' + String(d.getDate()).padStart(2, '0');
  }

  /* `260503` → `2026-05-03` */
  function 여섯자리날짜(s) {
    var t = String(s || '');
    if (!/^\d{6}$/.test(t)) return '';
    return '20' + t.slice(0, 2) + '-' + t.slice(2, 4) + '-' + t.slice(4, 6);
  }

  /* 구 데이터에 `5/6/26` 같은 미국식 날짜가 17건 섞여 있다(엑셀이 그렇게 뱉었다).
     그대로 두면 글자 비교로 거르는 기간 조회에서 통째로 빠진다 → `2026-05-06` 으로 편다 */
  function 날짜정규화(값, 대체밀리초) {
    var s = String(값 || '').trim();
    if (/^\d{4}-\d{2}-\d{2}$/.test(s)) return s;
    var m = s.match(/^(\d{1,2})\/(\d{1,2})\/(\d{2}|\d{4})$/);
    if (m) {
      var 해 = m[3].length === 2 ? '20' + m[3] : m[3];
      return 해 + '-' + m[1].padStart(2, '0') + '-' + m[2].padStart(2, '0');
    }
    var d = new Date(s);
    if (s && !isNaN(d.getTime())) return 날짜문자(d.getTime());
    return 날짜문자(대체밀리초);
  }

  function 시각문자(밀리초) {
    var d = new Date(Number(밀리초) || 0);
    return String(d.getHours()).padStart(2, '0') + ':' + String(d.getMinutes()).padStart(2, '0');
  }

  /* 구 skus 한 줄 → v3 특성 객체. 값이 하나도 없으면 null (동봉카드가 빈 상자를 안 찍게) */
  function 특성만들기(sku) {
    if (!sku) return null;
    function 범위(a, b, 꼬리) {
      var x = String(a == null ? '' : a).trim(), y = String(b == null ? '' : b).trim();
      if (!x && !y) return '';
      if (x && y && x !== y) return x + '~' + y + (꼬리 || '');
      return (x || y) + (꼬리 || '');
    }
    var 것 = {
      '최대높이': 범위(sku.heightMin, sku.heightMax),
      '최대너비': 범위(sku.widthMin, sku.widthMax),
      '내한성': String(sku.hardiness || '').trim(),
      '물주기': String(sku.watering || '').trim(),
      '햇빛': String(sku.sunlight || '').trim(),
      '개화기': 범위(sku.bloomStart, sku.bloomEnd, '월'),
      '관리특이사항': String(sku.note || '').trim()
    };
    var 찬것 = Object.keys(것).filter(function (k) { return 것[k]; });
    return 찬것.length ? 것 : null;
  }

  /* ────────────────────────────────
     변환 — 구 state 객체 하나를 받아 v3 표들을 돌려준다.
     저장소에 쓰지는 않는다(미리보기를 먼저 보여주기 위해서다)
  ──────────────────────────────── */
  function 변환(구) {
    var 경고 = [];
    var skus = 구.skus || [], 입고원 = 구.receivings || [], 주문원 = 구.orders || [];
    var 상태맵 = 구.inventoryStatus || {}, 조정맵 = 구.inventoryAdjustments || {};

    // 접두(5자) → 구 sku. 특성·이름 보강용
    var sku맵 = {};
    skus.forEach(function (s) { if (s.barcode) sku맵[String(s.barcode).toUpperCase()] = s; });

    /* ── 1. 품목 — 입고와 주문에 나온 모든 품목코드를 모은다 ── */
    var 품목맵 = {};
    function 품목자리(코드) {
      if (!품목맵[코드]) 품목맵[코드] = { 품목코드: 코드, 입고들: [], 주문들: [] };
      return 품목맵[코드];
    }
    var 코드없는입고 = 0;
    입고원.forEach(function (r) {
      var 코드 = 코드정규화(r.barcode);
      // 규격이 안 붙은 5자 코드는 입고 spec 으로 채워 8자로 만든다
      if (코드.length === 5) {
        var cm = 규격cm뽑기(r.spec, '');
        if (cm) 코드 = 코드 + '-' + cm;
      }
      if (!코드 || 코드.length < 5) { 코드없는입고++; return; }
      품목자리(코드).입고들.push(r);
    });
    var 코드없는주문 = 0;
    주문원.forEach(function (o) {
      var 코드 = 코드정규화(o.itemCode);
      if (!코드 || 코드.length < 5) { 코드없는주문++; return; }
      품목자리(코드).주문들.push(o);
    });
    if (코드없는입고) 경고.push('품목코드가 없는 입고 ' + 코드없는입고 + '건 — 품목·입고에서 뺐다');
    if (코드없는주문) 경고.push('품목코드가 없는 주문 ' + 코드없는주문 + '건 — 주문줄은 남기고 재고 계산에서만 뺐다');

    var 지금 = Date.now();
    var 품목 = Object.keys(품목맵).sort().map(function (코드, i) {
      var 자 = 품목맵[코드];
      // 이름은 입고리스트가 원본이다(구 프로그램 computeInventoryList 와 같은 우선순위).
      // 쇼핑몰 상품명(productName)은 길고 제목이라 안 쓴다
      var 최근입고 = 자.입고들.slice().sort(function (a, b) { return (b.createdAt || 0) - (a.createdAt || 0); })[0];
      var 접두 = 코드.slice(0, 5);
      var sku = sku맵[접두];
      var 유통명 = (최근입고 && 최근입고.distributionName) || (sku && sku.distributionName) || '';
      var 학명 = (최근입고 && 최근입고.scientificName) || (sku && sku.scientificName) || '';
      if (!유통명) 유통명 = 학명 || 코드;
      var 규격 = (최근입고 && 최근입고.spec) || '';
      var cm = 규격cm뽑기(규격, 코드);
      if (!규격 && cm) 규격 = cm + 'cm 포트';
      // 구 프로그램 getInventoryStatus 는 없으면 'paused' 다. 8자 키를 먼저, 없으면 접두를 본다
      var 상태원 = 상태맵[코드] || 상태맵[접두] || 'paused';
      // 과세는 taxable === true 일 때만이다. 구 데이터는 false/없음이 전부라 사실상 다 면세다
      var 과세 = (최근입고 && 최근입고.taxable === true) ? '과세' : '면세';
      return {
        품목코드: 코드,
        접두: 접두,
        학명3: 코드.slice(0, 3),
        일련번호: 코드.slice(3, 5),
        규격cm: cm,
        규격: 규격,
        유통명: 유통명,
        학명: 학명,
        학명키: (ZG.품목코드 && 학명) ? ZG.품목코드.학명키(학명) : '',
        매입단가: Number(최근입고 && 최근입고.purchasePrice) || 0,
        과세구분: 과세,
        상태: 상태표[상태원] || '일시중지',
        특성: 특성만들기(sku),
        등록일시: (최근입고 && 최근입고.createdAt) || 지금,
        수정일시: (최근입고 && 최근입고.createdAt) || 지금
      };
    });

    /* ── 2. 입고 ── */
    var 입고 = [];
    품목.forEach(function (p) {
      품목맵[p.품목코드].입고들.forEach(function (r, i) {
        입고.push({
          id: r.id || 아이디('rc', 입고.length),
          입고일: 날짜정규화(r.receivedAt, r.createdAt),
          입고업체: r.supplier || '',
          품목코드: p.품목코드,
          유통명: r.distributionName || p.유통명,
          학명: r.scientificName || p.학명,
          규격: r.spec || p.규격,
          수량: Number(r.quantity) || 0,
          매입단가: Number(r.purchasePrice) || 0,
          과세구분: r.taxable === true ? '과세' : '면세',
          메모: r.memo || '',
          등록일시: Number(r.createdAt) || 지금
        });
      });
    });

    /* ── 3. 출고 — 구 데이터엔 출고표가 없다. 주문이 곧 출고다
       (구 computeInventoryList 도 orders 를 빼서 현재고를 냈다).
       🔴 다만 구 프로그램은 `qty` 를 그대로 뺐고, v3 확정규칙은 「옵션 입수를 곱한다」다.
       여기서는 v3 규칙을 따른다 — 묶음상품 5건에서 구 화면과 수치가 달라진다 ── */
    var 출고 = [], 곱해진건 = 0;
    주문원.forEach(function (o, i) {
      var 코드 = 코드정규화(o.itemCode);
      if (!코드 || 코드.length < 5 || !품목맵[코드]) return;
      var 입수 = 입수뽑기(o.itemCode);
      if (입수 > 1) 곱해진건++;
      var 수량 = (Number(o.qty) || 0) * 입수;
      if (수량 <= 0) return;
      출고.push({
        id: 아이디('sh', i),
        출고일: 날짜정규화(o.orderedAt, o.createdAt),
        품목코드: 코드,
        수량: 수량,
        출처: '주문',
        등록일시: Number(o.createdAt) || 지금
      });
    });
    if (곱해진건) 경고.push('묶음상품 ' + 곱해진건 + '건은 옵션 입수를 곱해 출고했다(v3 확정규칙) — 구 화면 재고와 그만큼 다르다');

    /* ── 4. 재고조정 — 구 inventoryAdjustments 는 코드마다 최신 한 개뿐 ── */
    var 재고조정 = Object.keys(조정맵).map(function (코드, i) {
      var a = 조정맵[코드] || {};
      return {
        id: 아이디('adj', i),
        품목코드: 코드정규화(코드),
        조정수량: Number(a.qty) || 0,
        조정일시: Number(a.adjustedAt) || 지금,
        사유: '구 프로그램에서 조정한 값'
      };
    });

    /* ── 5. 주문묶음 ── */
    var 묶음 = (구.orderBatches || []).map(function (b) {
      return {
        id: b.id,
        회차: Number(b.seq) || 1,
        올린시각: 시각문자(b.uploadedAt),
        올린날: 여섯자리날짜(b.uploadedDate) || 날짜문자(b.uploadedAt),
        출처: '카페24',
        파일명: b.fileName || ''
      };
    });

    /* ── 6. 주문 ── */
    var 주문 = 주문원.map(function (o, i) {
      var 코드 = 코드정규화(o.itemCode);
      var p = 품목맵[코드] && 품목.find(function (x) { return x.품목코드 === 코드; });
      var 입수 = 입수뽑기(o.itemCode);
      return {
        id: o.id || 아이디('od', i),
        묶음id: o.batchId || '',
        주문번호: o.orderNo || '',
        주문일: 날짜정규화(o.orderedAt, o.createdAt),
        판매처: '카페24',           // 구 데이터는 shopName 이 전부 「한국어 쇼핑몰」(카페24 기본값)이다
        품목코드: 코드,
        원본코드: o.itemCode || '',
        유통명: (p && p.유통명) || o.productName || '',
        학명: (p && p.학명) || '',
        규격: (p && p.규격) || '',
        주문수량: Number(o.qty) || 0,
        옵션입수: 입수,
        옵션원문: o.option || '',
        단가: Number(o.unitPrice) || 0,
        수령인: o.recipientName || o.ordererName || '',
        수령인전화: o.recipientMobile || o.recipientPhone || o.recipientPhone2 || o.ordererMobile || '',
        수령인주소: o.recipientAddr || o.ordererAddr || '',
        우편번호: o.recipientZip || o.ordererZip || '',
        배송메모: o.memo || '',
        묶음키: '',
        출처: '카페24',
        등록일시: Number(o.createdAt) || 지금
      };
    });

    /* ── 7. 업체 — 칸을 버리지 않는다. 업체관리 화면이 이 값들을 쓴다 ── */
    var 업체 = (구.companies || []).map(function (c) {
      return {
        id: c.id,
        이름: c.name || '',
        구분: c.category || '공급업체',
        대표: c.ceo || '',
        전화: c.phone || '',
        담당자: c.manager || '',
        담당자전화: c.managerPhone || '',
        이메일: c.email || '',
        주소: c.address || '',
        사업자번호: c.bizNumber || '',
        업태: c.bizType || '',
        종목: c.bizCategory || '',
        취급품목: c.items || [],
        메모: c.memo || '',
        내업체: c.isSelf === true,
        마지막사용: Number(c.updatedAt) || Number(c.createdAt) || 0,
        등록일시: Number(c.createdAt) || 지금
      };
    });
    // 입고에만 이름으로 남아 있고 업체표엔 없는 공급처를 채운다(입고 화면 드롭다운이 비지 않게)
    var 있는이름 = {};
    업체.forEach(function (c) { 있는이름[c.이름] = true; });
    var 더한업체 = 0;
    입고.forEach(function (r) {
      if (r.입고업체 && !있는이름[r.입고업체]) {
        있는이름[r.입고업체] = true;
        더한업체++;
        업체.push({
          id: 아이디('co', 업체.length), 이름: r.입고업체, 구분: '공급업체',
          대표: '', 전화: '', 담당자: '', 담당자전화: '', 이메일: '', 주소: '',
          사업자번호: '', 업태: '', 종목: '', 취급품목: [], 메모: '',
          내업체: false, 마지막사용: r.등록일시, 등록일시: r.등록일시
        });
      }
    });
    if (더한업체) 경고.push('입고에만 있던 공급처 ' + 더한업체 + '곳을 업체로 새로 넣었다');

    /* ── 8. 명세서 · 견적요청 · 즐겨찾기 — 아직 화면이 없다. 칸 이름만 우리 것으로 바꿔 보관한다 ── */
    var 명세서 = (구.statements || []).map(function (s) { return s; });
    var 견적요청 = (구.quoteRequests || []).map(function (q) {
      return {
        id: q.id,
        요청일: 날짜정규화(q.requestedAt, q.createdAt),
        고객명: q.customerName || '',
        연락처: q.contact || '',
        내용: q.content || '',
        상태: q.status || '요청',
        등록일시: Number(q.createdAt) || 지금,
        수정일시: Number(q.updatedAt) || Number(q.createdAt) || 지금
      };
    });
    var 즐겨찾기 = (구.favorites || []).map(function (f) {
      return {
        키워드: f.name || '',
        분류: f.folder || '',
        유형: f.type || '',
        월검색: Number(f.monthly) || 0,
        연검색: Number(f.annual) || 0,
        PC: Number(f.pc) || 0,
        모바일: Number(f.mobile) || 0,
        상품수: Number(f.productCount) || 0,
        판매처수: Number(f.sellerCount) || 0,
        시즌: f.season || '',
        월별추이: f.monthlyTrend || [],
        담은때: Number(f.addedAt) || 지금
      };
    });
    var 분류폴더 = (구.favFolders || []).slice();

    return {
      품목: 품목, 입고: 입고, 출고: 출고, 재고조정: 재고조정,
      업체: 업체, 주문: 주문, 주문묶음: 묶음,
      명세서: 명세서, 견적요청: 견적요청,
      즐겨찾기: 즐겨찾기, 분류폴더: 분류폴더,
      키워드: 구.keywordData || {},
      경고: 경고
    };
  }

  /* 저장소에 실제로 쓴다. 되돌릴 수 없다 — 이사.html 이 먼저 확인을 받는다 */
  function 넣기(결과) {
    var 저 = ZG.저장소, 키 = 저.키;
    저.전체쓰기(키.품목, 결과.품목);
    저.전체쓰기(키.입고, 결과.입고);
    저.전체쓰기(키.출고, 결과.출고);
    저.전체쓰기(키.재고조정, 결과.재고조정);
    저.전체쓰기(키.업체, 결과.업체);
    저.전체쓰기(키.주문, 결과.주문);
    저.전체쓰기(키.주문묶음, 결과.주문묶음);
    저.전체쓰기(키.명세서, 결과.명세서);
    저.전체쓰기(키.견적요청, 결과.견적요청);
    저.전체쓰기(키.즐겨찾기, 결과.즐겨찾기);
    저.전체쓰기(키.분류폴더, 결과.분류폴더);
    저.전체쓰기(키.키워드, 결과.키워드);
    // 🔴 이 줄이 있어야 다음에 앱을 열 때 목데이터가 실데이터를 덮지 않는다
    저.설정쓰기({ 스키마버전: 저.스키마버전, 시드완료: true, 실데이터: true, 이사한때: Date.now() });
  }

  ZG.이사 = { 변환: 변환, 넣기: 넣기, 코드정규화: 코드정규화, 입수뽑기: 입수뽑기 };
})(window.ZG);
