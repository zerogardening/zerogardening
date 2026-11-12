# -*- coding: utf-8 -*-
# 11/13 붙여넣기 AI 비교 ② 채점 — python3 비교.py  (만들기.py → 규칙 돌리기(53 돌리기.js) → Haiku 결과 AI/결과NN.json 이 있어야 함)
# A 규칙만 · B 규칙이 의심한 것만 AI · C 늘 규칙+AI — 문자마다 ①자동으로 맞게 들어감 ②노란 줄(사람 확인) ③조용히 틀림
# 「같다」는 답지 없이 앱이 알 수 있는 비교(띄어쓰기·문장부호만 무시) · 「맞다」는 55 채점.py 판정(답지)
import json, re, sys, pathlib, collections
여기 = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(여기.parent / '55-붙여넣기새시험'))
from 채점 import 판정, 주맞, 상맞, 폰
자료 = 여기.parents[2] / '백업' / '수동' / '붙여넣기AI비교-2026-11-13'

세트 = json.loads((자료 / '세트.json').read_text(encoding='utf-8'))
규칙 = json.loads((자료 / '규칙결과.json').read_text(encoding='utf-8'))
AI = {}
for f in sorted((자료 / 'AI').glob('결과*.json')):
    for x in json.loads(f.read_text(encoding='utf-8')): AI[x['id']] = x
def AI꼴(x):
    d = ''.join(ch for ch in str(x.get('전화') or '') if ch.isdigit())
    return {'이름': (x.get('이름') or '').replace(' ', ''), '전화들': [d] if d else [], '주소': x.get('주소') or '', '상세': x.get('상세') or ''}
def 같다(a, b, 글):
    괄 = [w for x in re.findall(r'\(([^)]*)\)', 글) for w in re.split(r'[,\s]+', x) if w]   # 문자 속 괄호 낱말(동 이름)은 앱도 안다 — 빼고 비교
    return (a.get('이름') or '') == (b.get('이름') or '') and 폰(a) == 폰(b) and 주맞(a.get('주소'), 괄) == 주맞(b.get('주소'), 괄) and 상맞(a.get('상세'), 괄) == 상맞(b.get('상세'), 괄)

줄 = []
for m, r in zip(세트, 규칙):
    a = AI.get(m['id'])
    if a is None: continue
    a = AI꼴(a)
    줄.append({'m': m, '규': r, 'AI': a, '규맞': all(판정(m, r).values()), 'AI맞': all(판정(m, a).values()), '같음': 같다(r, a, m['글']),
              '확인': bool(r.get('확인')), '의심': bool(r.get('의심')), '나이': m['나이'], 'AI칸': 판정(m, a), '규칙칸': 판정(m, r)})
N = len(줄)

def 셈(이름, 뽑기):
    """뽑기(줄) → (노란줄?, 들어간 값이 맞나?, AI 불렀나?)"""
    c = collections.Counter()
    for z in 줄:
        노, 맞, 불 = 뽑기(z)
        c['AI호출'] += 불
        if 노: c['노란'] += 1; c['노란_규칙틀림'] += not z['규맞']; c['노란_AI틀림'] += not z['AI맞']; c['노란_둘다맞음'] += z['규맞'] and z['AI맞']; c['노란_넣을값틀림'] += not 맞
        else: c['자동_맞음' if 맞 else '조용히_틀림'] += 1
    return {'방식': 이름, **{k: c[k] for k in ('자동_맞음', '노란', '노란_규칙틀림', '노란_AI틀림', '노란_둘다맞음', '노란_넣을값틀림', '조용히_틀림', 'AI호출')}}

방식 = [
    셈('A 규칙만 (노란 줄 = 지금 앱 「확인 필요」 전부)', lambda z: (z['확인'], z['규맞'], 0)),
    셈('A 규칙만 (노란 줄 = 새 의심 규칙만)', lambda z: (z['의심'], z['규맞'], 0)),
    셈('B 「확인 필요」 붙은 것만 AI · 다르면 노란 줄', lambda z: (z['확인'] and not z['같음'], z['규맞'] if not z['확인'] or z['같음'] else z['AI맞'], z['확인'])),
    셈('B 「확인 필요」 붙은 것만 AI · 다르면 AI 값으로 그냥', lambda z: (False, z['AI맞'] if z['확인'] else z['규맞'], z['확인'])),
    셈('B 새 의심만 AI · 다르면 노란 줄', lambda z: (z['의심'] and not z['같음'], z['규맞'] if not z['의심'] or z['같음'] else z['AI맞'], z['의심'])),
    셈('C 늘 둘 다 · 다르면 노란 줄', lambda z: (not z['같음'], z['규맞'] if z['같음'] else z['AI맞'], 1)),
    셈('C 늘 둘 다 · 다르거나 규칙 새 의심이면 노란 줄', lambda z: (not z['같음'] or z['의심'], z['규맞'] if z['같음'] else z['AI맞'], 1)),
    셈('(참고) AI만 · 노란 줄 없음', lambda z: (False, z['AI맞'], 1)),
]
나이별 = {}
for 나 in (20, 30, 40, 50, 60, 70):
    g = [z for z in 줄 if z['나이'] == 나]
    나이별[나] = {'통': len(g), '규칙맞음': sum(z['규맞'] for z in g), 'AI맞음': sum(z['AI맞'] for z in g),
               'C조용히틀림': sum(z['같음'] and not z['규맞'] for z in g), 'C노란줄': sum(not z['같음'] for z in g),
               'A조용히틀림': sum(not z['확인'] and not z['규맞'] for z in g)}
칸 = {k: {'규칙': sum(z['규칙칸'][k] for z in 줄), 'AI': sum(z['AI칸'][k] for z in 줄)} for k in ('이름', '전화', '주소', '상세')}
넷 = collections.Counter((z['규맞'], z['AI맞'], z['같음']) for z in 줄)
결과 = {'N': N, '규칙맞음': sum(z['규맞'] for z in 줄), 'AI맞음': sum(z['AI맞'] for z in 줄), '같음': sum(z['같음'] for z in 줄),
       '확인붙음': sum(z['확인'] for z in 줄), '의심붙음': sum(z['의심'] for z in 줄), '방식': 방식, '나이별': 나이별, '칸': 칸,
       '넷': {f'규칙{"맞" if a else "틀"}·AI{"맞" if b else "틀"}·{"같음" if c else "다름"}': v for (a, b, c), v in sorted(넷.items())}}
(자료 / '비교결과.json').write_text(json.dumps(결과, ensure_ascii=False, indent=1), encoding='utf-8')
p = lambda v: f'{v / N * 100:.1f}%'
print(f"{N}통 · 규칙 맞음 {p(결과['규칙맞음'])} · AI 맞음 {p(결과['AI맞음'])} · 둘이 같음 {p(결과['같음'])} · 확인 붙음 {p(결과['확인붙음'])} · 새 의심 {p(결과['의심붙음'])}")
for b in 방식: print(f"  {b['방식']}: ①자동맞음 {p(b['자동_맞음'])} ②노란 {p(b['노란'])}(규칙틀림 {b['노란_규칙틀림']}·AI틀림 {b['노란_AI틀림']}·둘다맞아괜히 {b['노란_둘다맞음']}·미리채운값틀림 {b['노란_넣을값틀림']}) ③조용히틀림 {p(b['조용히_틀림'])} · AI호출 {p(b['AI호출'])}")
print('  칸', 칸); print('  넷', 결과['넷']); print('  나이', 나이별)
if '--틀린' in sys.argv:
    for z in 줄:
        if z['같음'] and not z['규맞']: print('--- 둘 다 같게 틀림', z['m']['id'], repr(z['m']['글'][:160]), '\n  규', {k: z['규'].get(k) for k in ('이름', '주소', '상세')}, '\n  답', {k: z['m']['정답'][k] for k in ('이름', '기본', '상세')})
if '--AI틀린' in sys.argv:
    c = collections.Counter(k for z in 줄 for k, v in z['AI칸'].items() if not v); print(c)
    for z in 줄[:200]:
        if not z['AI맞']: print('---', z['m']['id'], [k for k, v in z['AI칸'].items() if not v], repr(z['m']['글'][:140]), '\n  AI', z['AI'], '\n  답', {k: z['m']['정답'][k] for k in ('이름', '전화', '기본', '상세')})
