# -*- coding: utf-8 -*-
# 11/13 붙여넣기 새 1만 통 시험 ② 돌리기·채점 — python3 채점.py <이름=js폴더>… [--엑셀 경로]
# js폴더의 20l·20h 를 node 로 실어 나누기만 부른다(53 돌리기.js · 바깥 호출 없음) → 전체·네 칸·나이별·꼬리표별 · 「확인 필요」 헛경보·잡힘률 · 실패 유형 상위 · 다양성
# 맞춤: 주소·상세는 띄어쓰기·문장부호 무시, 숫자 사이 ~ . ㅡ _ 띄움 → -, 「번지」 무시, 시·도 표기 같게, 괄호 참고(동 이름) 무시 · 이름·전화는 정확히
import json, re, sys, pathlib, subprocess, collections
여기 = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(여기))
from 만들기 import 자료, 옛자료, 시도들
돌리기 = 여기.parent / '53-붙여넣기실전' / '돌리기.js'

시도표 = sorted(((v, k) for k, vs in 시도들.items() for v in vs), key=lambda x: -len(x[0]))
def 시도같게(s):
    for v, k in 시도표:
        if s.startswith(v): return k + s[len(v):]
    return s
def 참빼기(s, 참):
    for c in sorted({x.strip() for c in 참 for x in [c] + c.split(',') if len(x.strip()) >= 2}, key=len, reverse=True): s = s.replace(c, ' ')   # 「치평동, 상무광명메이루즈」
    return s
def 주맞(s, 참):
    s = 참빼기(s or '', 참)
    s = re.sub(r'(\d)\s*[~.ㅡ_\-]+\s*(\d)', r'\1-\2', s)
    s = re.sub(r'[\s.,()]', '', s).replace('번지', '')
    return 시도같게(s)
def 상맞(s, 참): return re.sub(r'[\s.,()~\-·:ㅡ_]', '', 참빼기(s or '', 참))
def 폰(r):
    d = (r.get('전화들') or [''])[0]
    return '0' + d[2:].lstrip('0') if d.startswith('82') and 10 <= len(d) <= 13 else d

def 원인(m, r, 맞):
    정, 참, 왜 = m['정답'], m['정답']['참고'], []
    if not 맞['이름']: 왜.append('이름:빈칸' if not r.get('이름') else '이름:다른사람' if r['이름'] in m['글'] and re.fullmatch(r'[가-힣]{3}', r['이름']) and r['이름'] != 정['이름'] and 흔이름(r['이름']) else '이름:다른낱말')
    if not 맞['전화']:
        들 = [폰({'전화들': [x]}) for x in r.get('전화들') or []]
        왜.append('전화:못찾음' if not 들 else '전화:다른번호먼저' if 정['전화'] in 들 else '전화:잘못읽음')
    if not 맞['주소']:
        a, t = 주맞(r.get('주소'), 참), 주맞(정['기본'], 참)
        왜.append('주소:빈칸' if not a else '주소:뒤가잘림' if t.startswith(a) else '주소:앞이잘림' if t.endswith(a) else '주소:군말붙음' if t in a else '주소:다름')
    if not 맞['상세']:
        a, t = 상맞(r.get('상세'), 참), 상맞(정['상세'], 참)
        왜.append('상세:빠짐' if not a and t else '상세:있으면안됨' if not t else '상세:군것섞임' if t in a else '상세:일부만' if a in t else '상세:다름')
    return 왜
def 흔이름(n): return bool(re.match('[김이박최정강조윤장임한오서신권황안송류유홍전고문양손배백허남심노하곽성차주우구민진나]', n))

def 판정(m, r):
    정, 참 = m['정답'], m['정답']['참고']
    if '오류' in r: return dict.fromkeys(['이름', '전화', '주소', '상세'], False)
    return {'이름': r.get('이름') == 정['이름'], '전화': 폰(r) == 정['전화'], '주소': 주맞(r.get('주소'), 참) == 주맞(정['기본'], 참), '상세': 상맞(r.get('상세'), 참) == 상맞(정['상세'], 참)}

def 실행(문자, js):
    인, 출 = 자료 / '_문자.json', 자료 / '_결과.json'
    인.write_text(json.dumps(문자, ensure_ascii=False), encoding='utf-8')
    subprocess.run(['node', str(돌리기), str(인), str(출), str(js / '20l-읍면표.js'), str(js / '20h-문자붙여넣기.js')], check=True, capture_output=True)
    답 = json.loads(출.read_text(encoding='utf-8')); 인.unlink(); 출.unlink(); return 답

def 채점(문자, 답):
    N = len(문자); 칸 = ['이름', '전화', '주소', '상세']; 판 = [판정(m, r) for m, r in zip(문자, 답)]
    ok = [all(p.values()) for p in 판]
    꼬 = collections.defaultdict(lambda: [0, 0, collections.Counter()])
    for m, p, o in zip(문자, 판, ok):
        for t in m['표']:
            꼬[t][0] += 1; 꼬[t][1] += o
            for k in 칸:
                if not p[k]: 꼬[t][2][k] += 1
    목록 = [(m, r, p, 원인(m, r, p)) for m, r, p, o in zip(문자, 답, 판, ok) if not o]
    def 붙음(f):
        붙 = [bool(f(r)) for r in 답]; 틀 = [not o for o in ok]
        잡 = sum(a and b for a, b in zip(붙, 틀)); 헛 = sum(a and not b for a, b in zip(붙, 틀))
        return {'붙음': sum(붙) / N, '잡힘률': 잡 / max(1, sum(틀)), '헛경보': 헛 / max(1, N - sum(틀)), '잡': 잡, '틀린': sum(틀), '헛': 헛, '맞은': N - sum(틀)}
    느 = sum(p['이름'] and p['전화'] and (p['주소'] or any(주맞(q, m['정답']['참고']) == 주맞(m['정답']['기본'], m['정답']['참고']) for q in r.get('검색어들') or [])) and p['상세']
            for m, r, p in zip(문자, 답, 판))
    return {'N': N, '전체': sum(ok), '항목': {k: sum(p[k] for p in 판) for k in 칸}, '느슨히': 느, '꼬리표': 꼬, '목록': 목록,
            '확인전체': 붙음(lambda r: r.get('확인')), '새의심': 붙음(lambda r: r.get('의심')), 'ok': ok}

def 가림(s):
    """전화처럼 보이는 덩어리(ㅡ·~·_·띄움 포함)는 뒤 4자리만 남김"""
    def 하나(x):
        g = x.group(0); 뒤 = [i for i, ch in enumerate(g) if ch.isdigit()][-4:]
        return ''.join('*' if ch.isdigit() and i not in 뒤 else ch for i, ch in enumerate(g))
    return re.sub(r'(?:\+82[\s\-]?|\(?0)1[\d\s.\-ㅡ~_()]{7,16}\d', 하나, s or '')

# ── 실패 유형 상위 — 틀린 칸의 원인 × 그 문자에서 가장 실패율이 높은 꼬리표(실수·함정·꼴·상황) ──
def 유형들(c):
    률 = {t: 1 - v[1] / v[0] for t, v in c['꼬리표'].items() if v[0] >= 40 and not t.startswith('나이:')}
    묶 = collections.defaultdict(list)
    for m, r, p, 왜 in c['목록']:
        후 = [t for t in m['표'] if t in 률 and t != '상황:없음']
        t = max(후, key=lambda x: 률[x]) if 후 else '(특이 꼬리표 없음)'
        묶[(왜[0], t)].append((m, r, 왜))
    return sorted(묶.items(), key=lambda x: -len(x[1]))

# ── 다양성 — 이름·전화·주소가 안 든 「말」 조각이 서로 얼마나 겹치나 ──
def 말조각(m):
    정 = m['정답']; 주낱 = [w for w in (정['기본'] + ' ' + 정['상세']).split() if len(w) >= 2]
    out = []
    for 줄 in re.split(r'\n', m['글']):
        for s in re.split(r'(?<=[.?!])\s+', 줄):
            s = s.strip()
            if not s or 정['이름'] in s or 정['전화'][-4:] in re.sub(r'\D', '', s) or any(w in s for w in 주낱): continue
            if re.search(r'\d{3,}[\s.\-ㅡ~_]*\d{3,}', s) or re.search(r'(성함|주소|요청사항|받는|보내는|수령인|입금자명|입금은|주문자|저는)', s): continue
            out.append(s)
    return out
def 다양성(문자):
    조 = [s for m in 문자 for s in 말조각(m)]; 셈 = collections.Counter(조)
    return {'조각': len(조), '서로다른': len(셈), '다른비율': len(셈) / max(1, len(조)), '맨위': 셈.most_common(1)[0] if 셈 else ('', 0),
            '10번넘게나온조각의몫': sum(v for v in 셈.values() if v > 10) / max(1, len(조)), '셈': 셈, '문자통째겹침': len(문자) - len({m['글'] for m in 문자})}

if __name__ == '__main__':
    인 = sys.argv[1:]; 엑셀경로 = None
    if '--엑셀' in 인: i = 인.index('--엑셀'); 엑셀경로 = 인[i + 1]; 인 = 인[:i] + 인[i + 2:]
    문자 = json.loads((자료 / '문자.json').read_text(encoding='utf-8'))
    판들 = []
    for x in 인:
        이, p = x.split('=', 1); 답 = 실행(문자, pathlib.Path(p).resolve()); 판들.append((이, 채점(문자, 답)))
    요 = {}
    for 이, c in 판들:
        N = c['N']; f = lambda v: round(v / N * 100, 1)
        나이 = {t: round(v[1] / v[0] * 100, 1) for t, v in sorted(c['꼬리표'].items()) if t.startswith('나이:')}
        꼬 = {t: [v[0], round(v[1] / v[0] * 100, 1), dict(v[2])] for t, v in sorted(c['꼬리표'].items(), key=lambda x: x[1][1] / x[1][0])}
        요[이] = {'N': N, '전체': f(c['전체']), **{k: f(v) for k, v in c['항목'].items()}, '느슨히': f(c['느슨히']), '나이': 나이, '꼬리표': 꼬,
                 '확인전체': {k: round(v * 100, 1) if isinstance(v, float) else v for k, v in c['확인전체'].items()},
                 '새의심': {k: round(v * 100, 1) if isinstance(v, float) else v for k, v in c['새의심'].items()},
                 '원인': collections.Counter(w for *_, 왜 in c['목록'] for w in 왜).most_common(),
                 '유형상위': [[k[0], k[1], len(v), 가림(v[0][0]['글'])] for k, v in 유형들(c)[:15]]}
        print(이, {k: 요[이][k] for k in ('N', '전체', '이름', '전화', '주소', '상세', '느슨히')}, '\n  나이', 나이, '\n  확인', 요[이]['확인전체'], '\n  의심', 요[이]['새의심'])
    새 = 다양성(문자)
    옛 = [m for f in ('문자.json', '문자-새말투.json', '문자-연습말투.json') for m in json.loads((옛자료 / f).read_text(encoding='utf-8'))]
    옛다 = 다양성(옛); 옛셈 = 옛다['셈']
    겹 = sum(v for s, v in 새['셈'].items() if s in 옛셈)
    요['다양성'] = {'새': {k: v for k, v in 새.items() if k != '셈'}, '옛(53 세 벌)': {k: v for k, v in 옛다.items() if k != '셈'},
                  '새 조각 중 옛 문자에 똑같이 있던 몫': round(겹 / max(1, 새['조각']) * 100, 2), '새 맨위10': 새['셈'].most_common(10)}
    print('다양성', json.dumps(요['다양성'], ensure_ascii=False, default=str)[:900])
    (자료 / '요약.json').write_text(json.dumps(요, ensure_ascii=False, indent=1, default=str), encoding='utf-8')
    if 엑셀경로:
        from 엑셀 import 엑셀
        엑셀(엑셀경로, 판들, 요, 유형들, 가림)
