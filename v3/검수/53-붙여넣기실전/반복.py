# -*- coding: utf-8 -*-
# 11/13 규칙 고치기 반복 ⑤ — python3 반복.py [보는|재는] [--js 폴더(기본 ../../js)] [--문자 파일] [--실패 n --원인 묶음글자(보·전·공·띄·도·이·군·빠·주·기)]
# 🔴 과적합 막기: 손님 1,673명을 손님 단위로 고정 무작위 60/40 — 고칠 때는 「보는」 쪽만 · 「재는」 쪽은 마지막 한 번만
# 문자.json(같은 손님 6통) 를 손님째 나눠야 같은 이름·주소가 양쪽에 섞이지 않는다
import json, random, subprocess, sys, pathlib, collections
여기 = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(여기))
from 만들기 import 자료
from 채점 import 채점, 묶, 묶음이름, 가림, 폰

def 쪽나누기(문자):
    손 = sorted({m['id'].split('-')[0] for m in 문자}, key=int)
    R = random.Random(20261113); R.shuffle(손)
    보 = set(손[:round(len(손) * 0.6)])
    return 보

def 돌리기(문자, js):
    인, 출 = 자료 / '_반복-문자.json', 자료 / '_반복-결과.json'
    인.write_text(json.dumps(문자, ensure_ascii=False), encoding='utf-8')
    subprocess.run(['node', str(여기 / '돌리기.js'), str(인), str(출), str(js / '20l-읍면표.js'), str(js / '20h-문자붙여넣기.js')], check=True, capture_output=True)
    답 = json.loads(출.read_text(encoding='utf-8')); 인.unlink(); 출.unlink()
    return 답

if __name__ == '__main__':
    인 = sys.argv[1:]
    쪽 = 인[0] if 인 and 인[0] in ('보는', '재는') else '보는'
    js = pathlib.Path(인[인.index('--js') + 1] if '--js' in 인 else 여기.parents[1] / 'js').resolve()
    파일 = next((인[i + 1] for i, x in enumerate(인) if x == '--문자'), '문자.json')
    문자 = json.loads((자료 / 파일).read_text(encoding='utf-8'))
    보 = 쪽나누기(json.loads((자료 / '문자.json').read_text(encoding='utf-8')))
    고른 = [m for m in 문자 if (m['id'].split('-')[0] in 보) == (쪽 == '보는')]
    답 = 돌리기(고른, js); c = 채점(고른, 답); N = c['N']
    print(f"{쪽} 쪽 {N}통 · 전체 {c['전체'] / N * 100:.1f}% · " + ' '.join(f"{k} {v / N * 100:.1f}" for k, v in c['항목'].items()) + f" · 느슨히 {c['덧']['느슨히전체'] / N * 100:.1f}")
    # 스스로 의심 — 「확인 필요」가 붙은 비율 · 틀린 것 중 잡은 비율(잡힘률) · 맞은 것 중 괜히 붙은 비율(헛경보)
    틀린 = {id(m) for m, *_ in c['목록']}
    for 이름, 붙음 in (('확인 전체', lambda r: bool(r.get('확인'))), ('새 의심만', lambda r: bool(r.get('의심')))):
        붙 = [붙음(r) for r in 답]; 틀 = [id(m) in 틀린 for m in 고른]
        잡 = sum(a and b for a, b in zip(붙, 틀)); 헛 = sum(a and not b for a, b in zip(붙, 틀))
        print(f"  {이름}: 붙음 {sum(붙) / N * 100:.1f}% · 잡힘률 {잡 / max(1, sum(틀)) * 100:.1f}% ({잡}/{sum(틀)}) · 헛경보 {헛 / max(1, N - sum(틀)) * 100:.1f}% ({헛}/{N - sum(틀)})")
    if '--의심' in 인:
        이유 = collections.Counter(w.split(' — ')[0].split('「')[0] for r in 답 for w in r.get('의심') or [])
        for k, v in 이유.most_common(): print(f'    {v:5d}  {k}')
    묶수 = collections.Counter(); 하나 = collections.Counter()
    for m, r, 맞, 왜 in c['목록']:
        g = {묶(m, x, 왜) for x in 왜}; 묶수.update(g)
        if len(g) == 1: 하나[next(iter(g))] += 1
    for g, n in 묶수.most_common(): print(f'  {n:5d} (이것만 {하나[g]:4d})  {묶음이름[g]}')
    if '--실패' in 인 and 쪽 == '보는':   # 실패 보기는 보는 쪽만
        n = int(인[인.index('--실패') + 1]); 원 = 인[인.index('--원인') + 1] if '--원인' in 인 else ''
        R = random.Random(n)
        목 = [x for x in c['목록'] if not 원 or any(묶(x[0], w, x[3]) == 원 for w in x[3])]
        for m, r, 맞, 왜 in R.sample(목, min(n, len(목))):
            정 = m['정답']
            print('---', ' · '.join(왜), '\n ', 가림(m['글']).replace('\n', ' ⏎ '),
                  f"\n  앱: {r.get('이름')} / {폰(r)[-4:]} / {r.get('주소')} / {r.get('상세')}\n  답: {정['이름']} / {정['전화'][-4:]} / {정['기본']} / {정['상세']}")
