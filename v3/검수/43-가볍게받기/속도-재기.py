# -*- coding: utf-8 -*-
# 43 가볍게 받기 — 화면 하나 여는 시간 전/후 재기
#   python3 속도-재기.py <전 v3 뿌리> <표크기.json> <표본.json>
#   표크기.json = {표: {줄, 날KB}} (서버에서 한 번 잰 값) · 표본.json = 표마다 진짜 모양 줄 몇 개 — 둘 다 손님 자료라 저장소 밖
#   표본 줄을 표크기만큼 불려(id 바꾸고 「가」로 채움) 가짜 서버가 내준다 → 폰 흉내(CPU 4배 느리게 · 4G 9Mbps·150ms)로
#   ① load(싣는 파일 다 받고 돌림) ② 서버.준비(첫 받기 끝 = 표를 받아 저장까지) 를 3번씩 재 가운데 값
#   🔴 가짜 서버 자료는 쪽 안에 있어 회선을 안 탄다 → 받는 시간은 압축 크기 ÷ 9Mbps 로 따로 셈(보고서)
import json, pathlib, statistics, subprocess, sys, time
from playwright.sync_api import sync_playwright
sys.path.insert(0, str(pathlib.Path(__file__).resolve().parent))
from importlib import import_module
틀 = import_module('받기-시험')   # 가짜 클라이언트·심기를 같이 쓴다

후뿌리 = pathlib.Path(__file__).resolve().parents[2]
전뿌리 = pathlib.Path(sys.argv[1]); 크기 = json.loads(pathlib.Path(sys.argv[2]).read_text()); 표본 = json.loads(pathlib.Path(sys.argv[3]).read_text())
쪽들 = ['주문.html', 'index.html', '메모.html', '지시.html']

def 불리기():
    자 = {}
    for t, 줄들 in 표본.items():
        if not 줄들 or t not in 크기: continue
        n, 한줄 = 크기[t]['줄'], 크기[t]['날KB'] * 1024 / max(크기[t]['줄'], 1)
        out = []
        for i in range(n):
            r = json.loads(json.dumps(줄들[i % len(줄들)])); 새 = f'{r["id"]}_{i}'
            r['id'] = 새; 키 = '품목코드' if t == '품목' else '키워드' if t == '즐겨찾기' else '이름' if t == '분류폴더' else 'id'
            r['내용'][키] = 새
            모자람 = int(한줄 - len(json.dumps(r, ensure_ascii=False).encode()))
            if 모자람 > 0: r['내용']['_채움'] = '가' * (모자람 // 3)
            out.append(r)
        자[t] = out
    return 자

def 재기(뿌리, 포트, 자):
    서버 = subprocess.Popen([sys.executable, '-m', 'http.server', str(포트), '-d', str(뿌리)], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.2); 결과 = {}
    try:
        with sync_playwright() as p:
            # 🔴 route(가로채기)를 걸면 회선 흉내가 안 먹는다 → 바깥 주소는 이름풀이로 막는다
            브 = p.chromium.launch(args=['--host-resolver-rules=MAP cdn.jsdelivr.net 127.0.0.1:9, MAP *.supabase.co 127.0.0.1:9'])
            for h in 쪽들:
                load, 준비 = [], []
                for _ in range(3):
                    쪽 = 브.new_page(viewport={'width': 390, 'height': 844}, service_workers='block')
                    cdp = 쪽.context.new_cdp_session(쪽)
                    cdp.send('Emulation.setCPUThrottlingRate', {'rate': 4})
                    cdp.send('Network.enable')
                    cdp.send('Network.emulateNetworkConditions', {'offline': False, 'latency': 150, 'downloadThroughput': 9e6 / 8, 'uploadThroughput': 1e6 / 8})
                    쪽.add_init_script('window.__가짜자료 = ' + json.dumps(자, ensure_ascii=False) + ';' + 틀.가짜 + 틀.심기)
                    쪽.goto(f'http://localhost:{포트}/{h}', wait_until='load', timeout=120000)
                    load.append(쪽.evaluate('() => performance.getEntriesByType("navigation")[0].loadEventEnd'))
                    준비.append(쪽.evaluate('() => ZG.서버.준비.then(() => performance.now())'))
                    쪽.close()
                결과[h] = {'load초': round(statistics.median(load) / 1000, 2), '준비초': round(statistics.median(준비) / 1000, 2)}
                print(뿌리.parent.name, h, 결과[h], flush=True)
            브.close()
    finally:
        서버.terminate(); 서버.wait()
    return 결과

if __name__ == '__main__':
    자 = 불리기()
    전 = 재기(전뿌리, 8845, 자); 후 = 재기(후뿌리, 8846, 자)
    print(json.dumps({'전': 전, '후': 후}, ensure_ascii=False))
