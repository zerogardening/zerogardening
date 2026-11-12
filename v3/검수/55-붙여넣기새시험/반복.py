# -*- coding: utf-8 -*-
# 11/13 규칙 고치기 2차 — python3 반복.py [보는|재는] [--js 폴더] [--실패 n [--원인 글자]] [--표 꼬리표]
# 🔴 과적합 막기: 새 1만 통(55)을 손님 단위 고정 60/40 — 고칠 때는 「보는」 쪽만, 「재는」 쪽은 마지막 한 번
import json, random, sys, pathlib, collections
여기 = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(여기))
from 만들기 import 자료
from 채점 import 실행, 채점, 가림, 폰

def 보는손님(문자):
    손 = sorted({m['id'].split('-')[0] for m in 문자}, key=int)
    random.Random(20261113055).shuffle(손)
    return set(손[:round(len(손) * 0.6)])

if __name__ == '__main__':
    인 = sys.argv[1:]
    쪽 = 인[0] if 인 and 인[0] in ('보는', '재는') else '보는'
    js = pathlib.Path(인[인.index('--js') + 1] if '--js' in 인 else 여기.parents[1] / 'js').resolve()
    문자 = json.loads((자료 / '문자.json').read_text(encoding='utf-8'))
    보 = 보는손님(문자)
    고른 = [m for m in 문자 if (m['id'].split('-')[0] in 보) == (쪽 == '보는')]
    답 = 실행(고른, js); c = 채점(고른, 답); N = c['N']
    print(f"{쪽} {N}통 · 전체 {c['전체'] / N * 100:.1f}% · " + ' '.join(f"{k} {v / N * 100:.1f}" for k, v in c['항목'].items()))
    for k in ('확인전체', '새의심'):
        v = c[k]; print(f"  {k}: 붙음 {v['붙음']*100:.1f} 잡힘 {v['잡힘률']*100:.1f} 헛 {v['헛경보']*100:.1f}")
    print('  나이', {t: round(v[1] / v[0] * 100, 1) for t, v in sorted(c['꼬리표'].items()) if t.startswith('나이:')})
    if 쪽 != '보는': sys.exit()
    원 = collections.Counter(w for *_, 왜 in c['목록'] for w in 왜)
    print('  원인', 원.most_common(12))
    꼬 = sorted(((t, v[0], v[1] / v[0]) for t, v in c['꼬리표'].items() if v[0] >= 30), key=lambda x: x[2])
    print('  꼬리표(낮은순)', [(t, n, round(p * 100)) for t, n, p in 꼬[:22]])
    if '--실패' in 인:
        n = int(인[인.index('--실패') + 1]); 글자 = 인[인.index('--원인') + 1] if '--원인' in 인 else ''
        표 = 인[인.index('--표') + 1] if '--표' in 인 else ''
        목 = [x for x in c['목록'] if (not 글자 or any(글자 in w for w in x[3])) and (not 표 or 표 in x[0]['표'])]
        print('  골라진', len(목))
        for m, r, 맞, 왜 in random.Random(n + len(글자)).sample(목, min(n, len(목))):
            정 = m['정답']
            print('---', ' · '.join(왜), ' '.join(t for t in m['표'] if not t.startswith('나이')), '\n ', 가림(m['글']).replace('\n', ' ⏎ '),
                  f"\n  앱: {r.get('이름')} / {폰(r)[-4:]} / {r.get('주소')} / {r.get('상세')}\n  답: {정['이름']} / {정['전화'][-4:]} / {정['기본']} / {정['상세']}")
