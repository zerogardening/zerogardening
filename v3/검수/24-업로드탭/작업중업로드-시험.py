# -*- coding: utf-8 -*-
# 작업중 카드 밀기 [업로드] · 완료 카드 [작업] · 다시 올리기(카페24번호 있으면 상세페이지갱신) — python3 작업중업로드-시험.py
# 🔴 서버·카페24·마켓에 아무것도 안 나간다. 가짜 supabase 에 지시 줄이 쌓이는 것만 본다.
import json, pathlib, subprocess, sys, time
from playwright.sync_api import sync_playwright
뿌리 = pathlib.Path('/Users/woorambaik/claude-projects/제로가드닝/통합관리/v3')
결과 = []
def 본다(이름, 참, 덧=''):
    결과.append(bool(참)); print(('  OK ' if 참 else '  XX ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))
지금 = int(time.time() * 1000)
품목 = [
    {'품목코드': 'AAA01-10', '유통명': '다시올림', '학명': 'A', '규격': '10cm', '등록일시': 지금 - 1},      # 카페24번호 있음
    {'품목코드': 'BBB01-10', '유통명': '처음올림', '학명': 'B', '규격': '10cm', '등록일시': 지금 - 2},      # 번호 없음
    {'품목코드': 'CCC01-10', '유통명': '장없음', '학명': 'C', '규격': '10cm', '등록일시': 지금 - 3},        # 발행 장 없음
    {'품목코드': 'DDD01-10', '유통명': '완료품목', '학명': 'D', '규격': '10cm', '등록일시': 지금 - 4, '사진뺌': True},
]
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
        "if(!sessionStorage.getItem('심음')){sessionStorage.setItem('심음','1');localStorage.setItem('zg.v3.품목', %s);}"
        % json.dumps(json.dumps(품목, ensure_ascii=False), ensure_ascii=False))
가짜 = """() => {
  window.__쓴것 = [];
  const 질의 = (t) => { const q = { select(){return q}, order(){return q}, limit(){return q}, eq(){return q}, in(){return q}, gte(){return q},
    upsert(r){ window.__쓴것.push(r); return Promise.resolve({ error: null }); },
    then(ok, no){ return Promise.resolve({ data: [], error: null }).then(ok, no); } }; return q; };
  ZG.서버.켜짐 = true;
  ZG.서버.클라이언트 = { from: (t) => 질의(t), storage: { from: () => ({ getPublicUrl: () => ({ data: { publicUrl: '' } }), list: () => Promise.resolve({ data: [] }) }) }, functions: { invoke: () => Promise.resolve({ data: {} }) } };
  const 장 = { '1': 1, '2': 1, '3': 1, '4': 1, '5': 1, '6': 1 };
  ZG.원고자료.발행훑기 = (c) => Promise.resolve(c === 'CCC01-10' ? {} : 장);
  ZG.원고자료.불러오기 = (c) => Promise.resolve({ 칸값: {}, 머리: c === 'AAA01-10' ? { 카페24번호: '312', 올린때: 1 } : {} });
  ZG.원고자료.머리쓰기 = (c, d) => Promise.resolve(d);
}"""
서버 = subprocess.Popen([sys.executable, '-c', 'import functools, http.server as h; h.ThreadingHTTPServer.request_queue_size = 256; '
                         'h.ThreadingHTTPServer(("", 8795), functools.partial(h.SimpleHTTPRequestHandler, directory=%r)).serve_forever()' % str(뿌리)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1.2)
미끄럼 = '''(i) => { const 칸 = document.querySelectorAll('.민칸 .ph-card')[i];
  const t = (type, x) => { const e = new Event(type, { bubbles: true, cancelable: true });
    e.touches = type === 'touchend' ? [] : [{ clientX: x, clientY: 100 }]; 칸.dispatchEvent(e); };
  t('touchstart', 340); t('touchmove', 300); t('touchmove', 100); t('touchend', 100); }'''
try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        ctx = 브.new_context(viewport={'width': 390, 'height': 844}, device_scale_factor=2, service_workers='block')
        쪽 = ctx.new_page(); 오류 = []
        쪽.on('pageerror', lambda e: 오류.append(str(e)))
        쪽.route('**cdn.jsdelivr.net**', lambda r: r.abort())
        쪽.add_init_script(심기)
        쪽.goto('http://localhost:8795/index.html#작업중'); 쪽.wait_for_timeout(1500)
        쪽.evaluate(가짜); 쪽.wait_for_timeout(500)
        코드 = 쪽.eval_on_selector_all('.민칸 .cd', 'es => es.map(e => e.textContent)')
        본다('작업중 카드 3장(완료 품목 제외)', 코드 == ['AAA01-10', 'BBB01-10', 'CCC01-10'], 코드)
        쪽.evaluate(미끄럼, 0); 쪽.wait_for_timeout(500)
        단 = 쪽.eval_on_selector_all('.민칸:nth-child(1) .뒷단추', 'bs => bs.map(b => b.innerText.replace(/\\s+/g, ""))')
        본다('작업중 밀기 — 업로드 · 완료 두 단추', sorted(단) == sorted(['⬆업로드', '✓완료']), 단)
        본다('밀면 두 단추 폭(176)만큼 열림', '-176' in 쪽.eval_on_selector('.민칸:nth-child(1) .ph-card', 'e => e.style.transform'), 쪽.eval_on_selector('.민칸:nth-child(1) .ph-card', 'e => e.style.transform'))
        쪽.screenshot(path=str(pathlib.Path(__file__).parent / '폰-7-작업중밀기.png'))
        쪽.click('.민칸:nth-child(1) .뒷단추.올림'); 쪽.wait_for_timeout(500)
        제 = 쪽.inner_text('.askbox')
        본다('번호 있음 → 「카페24 312번을 고칠까요」(새 등록 아님)', '312번을 고칠까요' in 제 and '쿠팡은 건드리지 않습니다' in 제, 제)
        쪽.click('.askbox .btn.warn, .askbox .btn.main'); 쪽.wait_for_timeout(600)
        쓴 = 쪽.evaluate('() => window.__쓴것.map(x => x[0].내용)')
        본다('지시 줄 = 상세페이지갱신 · 카페24번호 312 · 카페24올리기 아님',
             len(쓴) == 1 and 쓴[0]['갈래'] == '상세페이지갱신' and 쓴[0]['카페24번호'] == '312' and 쓴[0]['품목코드'] == 'AAA01-10', 쓴)
        # 번호 없음
        쪽.evaluate(미끄럼, 1); 쪽.wait_for_timeout(500)
        쪽.click('.민칸:nth-child(2) .뒷단추.올림'); 쪽.wait_for_timeout(500)
        본다('번호 없음 → 「카페24에 올릴까요」', '카페24에 올릴까요' in 쪽.inner_text('.askbox'))
        쪽.click('.askbox .btn.warn, .askbox .btn.main'); 쪽.wait_for_timeout(600)
        쓴 = 쪽.evaluate('() => window.__쓴것.map(x => x[0].내용)')
        본다('지시 줄 = 카페24올리기', len(쓴) == 2 and 쓴[1]['갈래'] == '카페24올리기' and '카페24번호' not in 쓴[1], 쓴[-1])
        # 장 없음
        쪽.evaluate(미끄럼, 2); 쪽.wait_for_timeout(500)
        쪽.click('.민칸:nth-child(3) .뒷단추.올림'); 쪽.wait_for_timeout(600)
        본다('발행 장 없으면 확인창 없이 이유 토스트 · 지시 안 씀', not 쪽.query_selector('.askbox') and len(쪽.evaluate('() => window.__쓴것')) == 2, 쪽.evaluate('() => document.body.innerText').count('먼저 만드십시오'))
        # 완료 탭
        쪽.click('.갈래칩 .fchip:nth-child(2)'); 쪽.wait_for_timeout(700)
        쪽.evaluate(미끄럼.replace('.민칸 .ph-card', '.민칸 .sc'), 0); 쪽.wait_for_timeout(500)
        단 = 쪽.eval_on_selector_all('.민칸:nth-child(1) .뒷단추', 'bs => bs.map(b => b.innerText.replace(/\\s+/g, ""))')
        본다('완료 밀기 — 「작업」 하나만', 단 == ['↺작업'], 단)
        쪽.screenshot(path=str(pathlib.Path(__file__).parent / '폰-8-완료밀기.png'))
        본다('콘솔 에러 없음', not 오류, 오류)
        # PC
        ctx2 = 브.new_context(viewport={'width': 1440, 'height': 1000}, service_workers='block')
        쪽2 = ctx2.new_page(); 오2 = []
        쪽2.on('pageerror', lambda e: 오2.append(str(e))); 쪽2.route('**cdn.jsdelivr.net**', lambda r: r.abort())
        쪽2.add_init_script(심기); 쪽2.goto('http://localhost:8795/index.html#작업중'); 쪽2.wait_for_timeout(1500)
        본다('PC 작업중 표 정상 · 에러 없음', 쪽2.query_selector('table') is not None and not 오2, 오2)
        브.close()
finally:
    서버.terminate()
print('\n%d/%d 통과' % (sum(결과), len(결과)))
sys.exit(0 if all(결과) else 1)
