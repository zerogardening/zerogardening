# -*- coding: utf-8 -*-
# 11/13 규칙 고치기 2차 ⑥ 마지막 측정 — python3 측정.py <이름=js폴더>…
# 세 벌: 고친 쪽(1차 60%) · 재는 쪽(1차 40% · 고치는 동안 안 봄) · 2차 새 1만 통(만들기2 · 다른 씨앗·새 조각 · 고치는 동안 안 봄)
# 판마다 전체·네 칸·나이별·꼬리표별 · 노란 「확인 필요」 붙음·잡힘률·헛경보 → 자료/측정-2차.json
import json, sys, pathlib, collections
여기 = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(여기))
from 만들기 import 자료
from 만들기2 import 자료 as 자료2
from 채점 import 실행, 채점
from 반복 import 보는손님

def 줄이기(c):
    N = c['N']; f = lambda v: round(v / N * 100, 1)
    return {'N': N, '전체': f(c['전체']), **{k: f(v) for k, v in c['항목'].items()},
            '나이': {t[3:]: round(v[1] / v[0] * 100, 1) for t, v in sorted(c['꼬리표'].items()) if t.startswith('나이:')},
            '꼬리표': {t: [v[0], round(v[1] / v[0] * 100, 1)] for t, v in c['꼬리표'].items() if not t.startswith('나이:')},
            '확인': {k: round(v * 100, 1) if isinstance(v, float) else v for k, v in c['확인전체'].items()}}

if __name__ == '__main__':
    판 = [x.split('=', 1) for x in sys.argv[1:]]
    벌1 = json.loads((자료 / '문자.json').read_text(encoding='utf-8')); 보 = 보는손님(벌1)
    벌들 = {'고친쪽(1차 60%)': [m for m in 벌1 if m['id'].split('-')[0] in 보], '재는쪽(1차 40%)': [m for m in 벌1 if m['id'].split('-')[0] not in 보],
           '2차 새 1만': json.loads((자료2 / '문자.json').read_text(encoding='utf-8'))}
    요 = {}
    for 벌이름, 문자 in 벌들.items():
        for 이, p in 판:
            c = 채점(문자, 실행(문자, pathlib.Path(p).resolve())); 요.setdefault(벌이름, {})[이] = 줄이기(c)
            r = 요[벌이름][이]
            print(f"{벌이름:14s} {이:6s} {r['N']}통 전체 {r['전체']} · 이름 {r['이름']} 전화 {r['전화']} 주소 {r['주소']} 상세 {r['상세']} · 나이 {r['나이']} · 확인 붙음 {r['확인']['붙음']} 잡힘 {r['확인']['잡힘률']} 헛 {r['확인']['헛경보']}")
    (자료 / '측정-2차.json').write_text(json.dumps(요, ensure_ascii=False, indent=1), encoding='utf-8')
