const AIBridge = (() => {
  // ─────────────────────────────────────────────────────────────
  // AIBridge v3 — 디렉토리 기반 큐 (단일 파일 손상 이슈 근본 해결)
  // 구조: <project>/ai_writing_queue/{pending,completed}/<req_id>.json
  // 각 파일 ~3~7KB, 손상 임계(~30KB) 한참 아래라 안전.
  // 외부 인터페이스(readQueue, writeQueue, enqueue, enqueueBatch, pollOnce 등) 는 v2 와 동일.
  // ─────────────────────────────────────────────────────────────
  const QUEUE_DIR_NAME = 'ai_writing_queue';
  const PENDING_SUBDIR = 'pending';
  const COMPLETED_SUBDIR = 'completed';
  const META_FILE = '_meta.json';

  const IDB_NAME = 'zg_ai_bridge';
  const IDB_STORE = 'handles';
  const IDB_KEY = 'projectFolder';
  let _dirHandle = null;
  let _pollTimer = null;
  let _pollInterval = 5000;
  let _appliedIds = new Set();

  function _openDB(){
    return new Promise((resolve, reject) => {
      const r = indexedDB.open(IDB_NAME, 1);
      r.onupgradeneeded = () => r.result.createObjectStore(IDB_STORE);
      r.onsuccess = () => resolve(r.result);
      r.onerror = () => reject(r.error);
    });
  }
  async function _idbGet(key){
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readonly');
      const req = tx.objectStore(IDB_STORE).get(key);
      req.onsuccess = () => resolve(req.result);
      req.onerror = () => reject(req.error);
    });
  }
  async function _idbSet(key, val){
    const db = await _openDB();
    return new Promise((resolve, reject) => {
      const tx = db.transaction(IDB_STORE, 'readwrite');
      tx.objectStore(IDB_STORE).put(val, key);
      tx.oncomplete = () => resolve();
      tx.onerror = () => reject(tx.error);
    });
  }

  async function _verifyPermission(handle, withWrite){
    if(!handle) return false;
    const opts = withWrite ? { mode: 'readwrite' } : {};
    if((await handle.queryPermission(opts)) === 'granted') return true;
    if((await handle.requestPermission(opts)) === 'granted') return true;
    return false;
  }

  async function isSupported(){ return typeof window.showDirectoryPicker === 'function'; }

  async function getDirHandle(prompt){
    if(_dirHandle){
      if(await _verifyPermission(_dirHandle, true)) return _dirHandle;
      _dirHandle = null;
    }
    const saved = await _idbGet(IDB_KEY);
    if(saved && await _verifyPermission(saved, true)){ _dirHandle = saved; return _dirHandle; }
    if(!prompt) return null;
    return await connectFolder();
  }

  async function connectFolder(){
    if(!(await isSupported())){
      alert('이 브라우저는 폴더 연결을 지원하지 않습니다. Chrome / Edge 최신 버전을 사용하세요.');
      return null;
    }
    try {
      const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
      if(!(await _verifyPermission(handle, true))){ toast('폴더 권한이 거부되었습니다','error'); return null; }
      _dirHandle = handle;
      await _idbSet(IDB_KEY, handle);
      toast(`✓ 폴더 연결: ${handle.name}`, 'flash');
      return handle;
    } catch(e){
      if(e && e.name === 'AbortError') return null;
      console.error('connectFolder error', e);
      toast('폴더 연결 실패: ' + (e.message||e),'error');
      return null;
    }
  }

  // ─────────────────────────────────────────────────────────────
  // 동시 쓰기 방지 — 모든 read+write 작업을 Promise chain 으로 직렬화
  // ─────────────────────────────────────────────────────────────
  let _writeLock = Promise.resolve();
  async function _withLock(fn){
    const prev = _writeLock;
    let release;
    _writeLock = new Promise(r => { release = r; });
    try { await prev; } catch(_){}
    try { return await fn(); }
    finally { release(); }
  }

  // ─────────────────────────────────────────────────────────────
  // 디렉토리 헬퍼 (v3)
  // ─────────────────────────────────────────────────────────────
  async function _getQueueDir(create){
    const root = await getDirHandle(create);
    if(!root) return null;
    try { return await root.getDirectoryHandle(QUEUE_DIR_NAME, { create: !!create }); }
    catch(e){
      if(create) throw e;
      return null;
    }
  }
  async function _getSubDir(subname, create){
    const qd = await _getQueueDir(create);
    if(!qd) return null;
    try { return await qd.getDirectoryHandle(subname, { create: !!create }); }
    catch(e){
      if(create) throw e;
      return null;
    }
  }

  async function _readDirItems(subname){
    const dir = await _getSubDir(subname, false);
    if(!dir) return [];
    const items = [];
    try {
      for await (const entry of dir.values()){
        if(entry.kind !== 'file' || !entry.name.endsWith('.json')) continue;
        if(entry.name === META_FILE) continue;
        try {
          let txt = await (await entry.getFile()).text();
          txt = txt.replace(/\x00+$/, '');
          if(!txt.trim()) continue;
          items.push(JSON.parse(txt));
        } catch(e){
          console.warn('readDirItems: skip corrupt file', entry.name, e);
        }
      }
    } catch(e){
      console.warn('readDirItems iterate error', subname, e);
    }
    // 정렬: id 의 timestamp 접두사 → 사전순 = 시간순
    items.sort((a, b) => String(a.id||'').localeCompare(String(b.id||'')));
    return items;
  }

  async function _writeItemAtomic(subname, item){
    if(!item || !item.id) throw new Error('item.id 필요');
    const dir = await _getSubDir(subname, true);
    if(!dir) throw new Error('폴더가 연결되지 않았습니다');
    const fname = item.id + '.json';
    const json = JSON.stringify(item, null, 2);
    const MAX_ATTEMPTS = 3;
    let lastErr;
    for(let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++){
      try {
        const fh = await dir.getFileHandle(fname, { create:true });
        const blob = new Blob([json], { type:'application/json' });
        const w = await fh.createWritable();
        try {
          await w.write(blob);
          await w.truncate(blob.size);
        } finally { await w.close(); }
        // readback 검증
        const fh2 = await dir.getFileHandle(fname);
        let txt = await (await fh2.getFile()).text();
        txt = txt.replace(/\x00+$/, '');
        JSON.parse(txt);
        return;
      } catch(e){
        lastErr = e;
        console.warn(`writeItem 시도 ${attempt}/${MAX_ATTEMPTS} 실패 (${subname}/${fname}): ${e.message||e}`);
        await new Promise(r => setTimeout(r, 100 * attempt));
      }
    }
    throw new Error(`항목 쓰기 ${MAX_ATTEMPTS}회 실패: ${(lastErr && (lastErr.message||lastErr))}`);
  }

  async function _deleteItem(subname, id){
    const dir = await _getSubDir(subname, false);
    if(!dir) return;
    try { await dir.removeEntry(id + '.json'); }
    catch(e){ if(e && e.name !== 'NotFoundError') console.warn('deleteItem', subname, id, e); }
  }

  // ─────────────────────────────────────────────────────────────
  // 공개 인터페이스 (v2 호환)
  // ─────────────────────────────────────────────────────────────
  async function readQueue(){
    try {
      const pending = await _readDirItems(PENDING_SUBDIR);
      const completed = await _readDirItems(COMPLETED_SUBDIR);
      return { version: 3, queue: [...pending, ...completed] };
    } catch(e){
      console.error('readQueue error', e);
      return null;
    }
  }

  async function writeQueue(data){
    // v2 호환 — 큐 객체 통째로 받아 디렉토리에 동기화
    return _withLock(async () => {
      if(!data || !Array.isArray(data.queue)) return;
      const wantedPending = new Set();
      const wantedCompleted = new Set();
      for(const it of data.queue){
        if(!it || !it.id) continue;
        const sub = (it.status === 'completed') ? COMPLETED_SUBDIR : PENDING_SUBDIR;
        if(sub === COMPLETED_SUBDIR) wantedCompleted.add(it.id); else wantedPending.add(it.id);
        await _writeItemAtomic(sub, it);
      }
      // 디렉토리엔 있지만 wanted 에 없는 파일 → 삭제 (큐에서 빠진 항목 정리)
      for(const sub of [PENDING_SUBDIR, COMPLETED_SUBDIR]){
        const dir = await _getSubDir(sub, false);
        if(!dir) continue;
        const wanted = sub === COMPLETED_SUBDIR ? wantedCompleted : wantedPending;
        const toDelete = [];
        try {
          for await (const entry of dir.values()){
            if(entry.kind !== 'file' || !entry.name.endsWith('.json')) continue;
            if(entry.name === META_FILE) continue;
            const id = entry.name.slice(0, -5);
            if(!wanted.has(id)) toDelete.push(entry.name);
          }
        } catch(_){}
        for(const name of toDelete){
          try { await dir.removeEntry(name); } catch(_){}
        }
      }
    });
  }

  /** 항목 1개 빌드 — slim 포맷. Claude 는 AI_FIELDS/AI_NOTE_META 메타데이터를 app.html 에서 참조. */
  function _buildRequest(skuInfo, opts){
    const fieldRequests = (opts && opts.fieldRequests) || {};
    const cur = skuInfo.aiFields || {};
    // 슬림: platform/label/guide/maxChars 제거 (Claude 가 AI_FIELDS 에서 조회)
    const fields = AI_FIELDS.map(f => ({
      id: f.id,
      currentValue: cur[f.id] || '',
      request: fieldRequests[f.id] || '',
    }));
    return {
      id: 'req_' + Date.now() + '_' + Math.random().toString(36).slice(2, 6),
      skuCode: skuInfo.barcode || skuInfo.skuCode || '',
      scientificName: skuInfo.scientificName || '',
      distributionName: skuInfo.distributionName || '',
      traits: {
        heightMin: skuInfo.heightMin || '', heightMax: skuInfo.heightMax || '',
        widthMin:  skuInfo.widthMin  || '', widthMax:  skuInfo.widthMax  || '',
        hardiness: skuInfo.hardiness || '', watering:  skuInfo.watering  || '',
        sunlight:  skuInfo.sunlight  || '',
        bloomStart:skuInfo.bloomStart|| '', bloomEnd:  skuInfo.bloomEnd  || '',
      },
      memo: skuInfo.note || skuInfo.memo || '',
      fields,
      note: { currentValue: skuInfo.note || '' },
      globalRequest: (opts && opts.globalRequest) || '',
      overwrite: !!(opts && opts.overwrite),
      status: 'pending',
      createdAt: new Date().toISOString(),
    };
  }

  /** v3 — 단일 enqueue */
  async function enqueue(skuInfo, opts){
    return _withLock(async () => {
      const req = _buildRequest(skuInfo, opts);
      await _writeItemAtomic(PENDING_SUBDIR, req);
      return req;
    });
  }

  /** v3 — 다건 일괄 enqueue */
  async function enqueueBatch(skuInfos, opts){
    return _withLock(async () => {
      const reqs = skuInfos.map(s => _buildRequest(s, opts));
      for(const req of reqs){
        await _writeItemAtomic(PENDING_SUBDIR, req);
      }
      return reqs;
    });
  }

  /** completed 항목 → SKU 마스터 반영, 성공 시 파일 삭제 */
  async function pollOnce(){
    return _withLock(async () => {
      const completed = await _readDirItems(COMPLETED_SUBDIR);
      if(completed.length === 0) return 0;
      let applied = 0;
      for(const r of completed){
        if(!r.result || !r.skuCode){
          continue; // 결과 미달 — 파일 보존
        }
        if(r.applied || _appliedIds.has(r.id)){
          // 이미 적용 — 파일만 정리
          await _deleteItem(COMPLETED_SUBDIR, r.id);
          continue;
        }
        try {
          const existing = Store.findSkuByCode(r.skuCode) || {};
          const overwrite = !!r.overwrite;
          const patch = {};
          // aiFields 머지
          if(r.result.fields && typeof r.result.fields === 'object'){
            const merged = Object.assign({}, existing.aiFields||{});
            for(const [k, v] of Object.entries(r.result.fields)){
              if(v == null || v === '') continue;
              if(overwrite || !merged[k]) merged[k] = String(v).trim();
            }
            patch.aiFields = merged;
          }
          // 식물 특성(traits) 자동 채움
          if(r.result.traits && typeof r.result.traits === 'object'){
            const TRAIT_KEYS = ['heightMin','heightMax','widthMin','widthMax',
                                'hardiness','watering','sunlight','bloomStart','bloomEnd'];
            const newUncertain = (existing.aiUncertainTraits||[]).slice();
            const inputUncertain = Array.isArray(r.result.uncertainTraits) ? r.result.uncertainTraits : [];
            for(const k of TRAIT_KEYS){
              const v = r.result.traits[k];
              if(v == null || v === '') continue;
              const cur = existing[k];
              if(overwrite || cur == null || cur === ''){
                patch[k] = String(v).trim();
                if(inputUncertain.includes(k) && !newUncertain.includes(k)){
                  newUncertain.push(k);
                }
              }
            }
            patch.aiUncertainTraits = newUncertain;
          }
          // note (특이사항)
          if(r.result.note){
            const curN = (existing.note||'').trim();
            if(overwrite || !curN) patch.note = String(r.result.note).trim();
          }
          // 구버전 호환 — productCopy/keywords
          if(r.result.productCopy && (overwrite || !existing.productCopy)){
            patch.productCopy = String(r.result.productCopy).trim();
          }
          if(r.result.keywords){
            const arr = Array.isArray(r.result.keywords)
              ? r.result.keywords
              : String(r.result.keywords).split(/[,\n]+/).map(s=>s.trim()).filter(Boolean);
            if(overwrite || !existing.keywords || existing.keywords.length===0) patch.keywords = arr;
          }
          patch.aiUpdatedAt = new Date().toISOString();
          Store.upsertSkuMaster(r.skuCode, patch);
          // 입고 메모 동기화
          if(patch.note){
            const recvs = Store.listReceivings().filter(rr => extractCodePrefix(rr.barcode) === r.skuCode);
            recvs.forEach(rr => Store.updateReceiving(rr.id, { memo: patch.note }));
          }
          _appliedIds.add(r.id);
          applied++;
          // 적용 완료 → 파일 삭제
          await _deleteItem(COMPLETED_SUBDIR, r.id);
        } catch(e){
          console.error('apply error', e);
          // 실패 — 파일 보존 (다음 폴링에서 재시도)
        }
      }
      return applied;
    });
  }

  function startPolling(intervalMs){
    if(_pollTimer) return;
    _pollInterval = intervalMs || _pollInterval;
    const tick = async () => {
      try {
        const applied = await pollOnce();
        if(applied > 0){
          toast(`✓ AI 글쓰기 ${applied}건 새 결과 반영`, 'flash');
          const modal = document.getElementById('sku-detail-modal');
          if(modal && !modal.classList.contains('hidden') && _currentSkuCode){
            window.openSkuDetail(_currentSkuCode);
          }
          if(typeof renderSkuList === 'function') renderSkuList();
          if(typeof renderInventoryView === 'function') renderInventoryView();
        }
      } catch(e){ console.error('poll error', e); }
    };
    _pollTimer = setInterval(tick, _pollInterval);
    tick();
  }
  function stopPolling(){
    if(_pollTimer){ clearInterval(_pollTimer); _pollTimer = null; }
  }

  async function getPendingCount(){
    const pending = await _readDirItems(PENDING_SUBDIR);
    return pending.length;
  }

  async function isConnected(){
    const saved = await _idbGet(IDB_KEY);
    return !!saved;
  }

  async function getFolderName(){
    const saved = await _idbGet(IDB_KEY);
    if(saved && saved.name) return saved.name;
    return '';
  }

  function buildPromptText(skuInfo, opts){
    const t = skuInfo;
    const cur = t.aiFields || {};
    const fieldRequests = (opts && opts.fieldRequests) || {};
    const lines = [
      '# 제로가드닝 — AI 상품글쓰기 요청',
      '',
      '아래 식물 정보로 **각 플랫폼 항목별 텍스트** 와 **재배·관리 특이사항(100자)** 을 작성해주세요.',
      '톤·구조·예시는 SKILL 파일(`.claude/skills/zg-ai-writing/SKILL.md`)을 따릅니다.',
      '',
      '## 식물 정보',
      `- 품목코드: ${t.barcode||'-'}`,
      `- 유통명: ${t.distributionName||'-'}`,
      `- 학명: ${t.scientificName||'-'}`,
      `- 최대 높이: ${t.heightMin||'-'} ~ ${t.heightMax||'-'} cm`,
      `- 최대 너비: ${t.widthMin||'-'} ~ ${t.widthMax||'-'} cm`,
      `- 내한성: ${t.hardiness||'-'}, 물 주기: ${t.watering||'-'}, 일조량: ${t.sunlight||'-'}`,
      `- 개화기: ${t.bloomStart||'-'}월 ~ ${t.bloomEnd||'-'}월`,
      `- 메모: ${t.note||t.memo||'-'}`,
      '',
      '## 작성할 항목',
    ];
    AI_FIELDS.forEach(f => {
      const reqExtra = fieldRequests[f.id] ? ` *(요청: ${fieldRequests[f.id]})*` : '';
      lines.push(`- **${f.label}** (${f.maxChars?`최대 ${f.maxChars}자`:'길이 자유'}) — ${f.guide}${reqExtra}`);
    });
    lines.push(`- **특이사항(note)** (최대 ${AI_NOTE_META.maxChars}자) — ${AI_NOTE_META.guide}`);
    if(opts && opts.globalRequest){
      lines.push('', '## 전체 요청사항');
      lines.push(opts.globalRequest);
    }
    lines.push('');
    lines.push('## 출력 형식 (JSON)');
    lines.push('```json');
    lines.push('{');
    lines.push('  "fields": {');
    AI_FIELDS.forEach((f,i) => {
      lines.push(`    "${f.id}": "..."${i<AI_FIELDS.length-1?',':''}`);
    });
    lines.push('  },');
    lines.push('  "note": "재배 시 ~~ 주의해주세요. ~~"');
    lines.push('}');
    lines.push('```');
    return lines.join('\n');
  }

  return {
    isSupported, isConnected, connectFolder, getDirHandle, getFolderName,
    readQueue, writeQueue, enqueue, enqueueBatch, pollOnce,
    startPolling, stopPolling, getPendingCount,
    buildPromptText,
  };
})();
