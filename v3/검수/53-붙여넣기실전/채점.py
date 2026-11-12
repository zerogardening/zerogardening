# -*- coding: utf-8 -*-
# 11/13 붙여넣기 실전 시험 ④ 채점 — python3 채점.py <이름=결과.json>… [--엑셀 경로…]
# 항목별(이름·전화·기본주소·상세) 맞음/틀림 · 꼬리표(변형)별 실패율 · 원인 묶음 · 실패 목록 엑셀(전화는 뒤 4자리만)
# 비교 기준: 주소는 띄어쓰기 무시 · 시·도 표기(부산광역시/부산시/부산) 같게 · 번지 구분 ~ . → - · 「번지」 무시 · 괄호 참고항목(동 이름) 무시
#           상세는 띄어쓰기·문장부호(. , ( ) ~ - · :) 무시 · 이름·전화는 정확히
import json, re, sys, pathlib, collections
여기 = pathlib.Path(__file__).resolve().parent
sys.path.insert(0, str(여기))
from 만들기 import 시도표, 자료

def 시도같게(s):
    for 열, 식, _ in 시도표:
        m = re.match('(' + 식 + ')', s)
        if m and not s.startswith('전남광주'): return 열 + s[m.end():]
    return s
def 참고빼기(s, 참고):
    for c in 참고:
        for p in sorted(set([c] + [x.strip() for x in c.split(',')]), key=len, reverse=True):
            if len(p) >= 2: s = s.replace(p, ' ')
    return s
def 주소맞춤(s, 참고):
    s = re.sub(r'\s+', '', 참고빼기(s or '', 참고))
    s = re.sub(r'(\d)[~.](\d)', r'\1-\2', s).replace('번지', '')
    return 시도같게(s)
def 상세맞춤(s, 참고):
    return re.sub(r'[\s.,()~\-·:]', '', 참고빼기(s or '', 참고))

def 폰(r):   # 화면은 전화들[0] 을 u.전화정리 로 넣는다 — 82 로 시작하면 0 으로(04-공통UI 63행)
    d = (r.get('전화들') or [''])[0]
    return '0' + d[2:].lstrip('0') if d.startswith('82') and 10 <= len(d) <= 13 else d

def 판정(m, r):
    정 = m['정답']; 참 = 정['참고']
    if '오류' in r: return {'이름': False, '전화': False, '주소': False, '상세': False}, {'오류': r['오류']}
    맞 = {'이름': r['이름'] == 정['이름'], '전화': 폰(r) == 정['전화'],
          '주소': 주소맞춤(r['주소'], 참) == 주소맞춤(정['기본'], 참), '상세': 상세맞춤(r['상세'], 참) == 상세맞춤(정['상세'], 참)}
    덧 = {'검색어안': any(주소맞춤(q, 참) == 주소맞춤(정['기본'], 참) for q in r.get('검색어들') or []),
          '상세숫자': re.findall(r'\d+', 상세맞춤(r['상세'], 참)) == re.findall(r'\d+', 상세맞춤(정['상세'], 참))}
    return 맞, 덧

def 원인(m, r, 맞):
    """틀린 칸마다 무엇이 틀렸나 — 짧은 말 하나"""
    정 = m['정답']; 참 = 정['참고']; 왜 = []
    if '오류' in r: return ['오류']
    if not 맞['이름']:
        왜.append('이름:빈칸' if not r['이름'] else ('이름:다른낱말'))
    if not 맞['전화']:
        들 = [폰({'전화들': [x]}) for x in r.get('전화들') or []]
        왜.append('전화:못찾음' if not 들 else '전화:첫번호가보내는분' if 정['전화'] in 들 else '전화:다름')
    if not 맞['주소']:
        a, t = 주소맞춤(r['주소'], 참), 주소맞춤(정['기본'], 참)
        뺀 = 시도같게(re.sub(r'\s+', '', 정['기본'].split(' ')[0]))
        왜.append('주소:빈칸' if not a else '주소:시도만빠짐' if 뺀 + a == t else '주소:끝모자람' if t.startswith(a) else '주소:앞모자람' if t.endswith(a) else
                  '주소:군말붙음' if t in a else '주소:다름')
    if not 맞['상세']:
        a, t = 상세맞춤(r['상세'], 참), 상세맞춤(정['상세'], 참)
        왜.append('상세:빠짐' if not a else '상세:군것섞임' if t and t in a else '상세:없어야함' if not t else '상세:일부빠짐' if a in t else '상세:다름')
    return 왜

묶음이름 = {'보': '보내는 분 번호·이름이 먼저 와서 엉킴', '전': '상세 숫자와 전화가 붙어 전화를 잘못 잡음', '공': '건물번호를 띄어 씀(32 19)',
           '띄': '길 이름을 띄어 씀(주서 3길 · 오정로78 번길)', '도': '시·도만 빠짐(검색엔 지장 적음)', '이': '이름 못 찾음·잘못 잡음',
           '군': '상세에 군말·요청이 섞임', '빠': '상세가 빠짐(다음 줄 건물명 등)', '주': '기본주소 앞·뒤가 잘림(그 밖)', '기': '그 밖'}
def 묶(m, c, 왜):
    t = m['표']
    if '보내는분먼저' in t: return '보'
    if c == '전화:다름' or c.startswith('상세') and '전화:다름' in 왜: return '전'
    if '번호구분:공백' in t and (c == '주소:끝모자람' or c.startswith('상세')): return '공'
    if ('띄어쓰기:번띄움' in t or '띄어쓰기:길앞띄움' in t) and (c == '주소:끝모자람' or c.startswith('상세')): return '띄'
    if c == '주소:시도만빠짐': return '도'
    if c.startswith('이름'): return '이'
    if c in ('상세:군것섞임', '상세:없어야함'): return '군'
    if c in ('상세:빠짐', '상세:일부빠짐'): return '빠'
    if c.startswith('주소'): return '주'
    return '기'

def 고치면(채):
    """묶음마다 — 그 묶음만 고치면 오르는 건수 · 큰 것부터 차례로 고치면 누적 성공률"""
    목 = [set(묶(m, c, 왜) for c in 왜) for m, r, 맞, 왜 in 채['목록']]
    혼 = collections.Counter(next(iter(g)) for g in 목 if len(g) == 1)
    차례, 누적, 고친 = [], 채['전체'], set()
    for g, _ in 혼.most_common():
        고친.add(g); 새 = sum(1 for x in 목 if x <= 고친) + 채['전체']
        차례.append((g, 묶음이름[g], 혼[g], sum(1 for x in 목 if g in x), round(새 / 채['N'] * 100, 1)))
    return 차례

def 가림(s):
    """전화처럼 보이는 숫자 덩어리는 뒤 4자리만 남김"""
    return re.sub(r'(?:\+82[\s.\-]?|0)1[016789][\s.)\-]*\d{3,4}[\s.\-]*\d{4}|\b01[016789]\d{7,8}\b',
                  lambda x: re.sub(r'\d', '*', x.group(0)[:-4]) + x.group(0)[-4:], s or '')

def 채점(문자, 답):
    판들 = [판정(m, r) for m, r in zip(문자, 답)]
    N = len(문자); 칸 = ['이름', '전화', '주소', '상세']
    전체 = sum(all(p[0].values()) for p in 판들)
    항목 = {k: sum(p[0][k] for p in 판들) for k in 칸}
    덧 = {'검색어안': sum(p[0]['주소'] or p[1].get('검색어안', False) for p in 판들),
          '상세숫자': sum(p[0]['상세'] or p[1].get('상세숫자', False) for p in 판들),
          '느슨히전체': sum(p[0]['이름'] and p[0]['전화'] and (p[0]['주소'] or p[1].get('검색어안')) and (p[0]['상세'] or p[1].get('상세숫자')) for p in 판들)}
    꼬 = collections.defaultdict(lambda: [0, 0, collections.Counter()])
    원 = collections.Counter(); 원만 = collections.Counter(); 목록 = []
    for m, r, (맞, _) in zip(문자, 답, 판들):
        ok = all(맞.values())
        for t in m['표']:
            꼬[t][0] += 1; 꼬[t][1] += ok
            for k in 칸:
                if not 맞[k]: 꼬[t][2][k] += 1
        if not ok:
            왜 = 원인(m, r, 맞); 원.update(왜)
            if len(왜) == 1: 원만[왜[0]] += 1
            목록.append((m, r, 맞, 왜))
    return {'N': N, '전체': 전체, '항목': 항목, '덧': 덧, '꼬리표': {t: v for t, v in 꼬.items()}, '원인': 원, '원인하나만': 원만, '목록': 목록}

def 끝4(s): return '*' * max(0, len(s) - 4) + s[-4:]

def 엑셀(경로, 표들, 판이름, 채):
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill
    wb = Workbook(); ws = wb.active; ws.title = '요약'
    머 = Font(bold=True); 칠 = PatternFill('solid', fgColor='E8EDE4')
    ws.append(['판', '문자 수', '전체 맞음', '이름', '전화', '기본주소', '상세', '기본주소(검색어 후보 안)', '상세(숫자만)', '느슨히 전체'])
    for 이, c in 표들:
        N = c['N']; f = lambda v: f'{v / N * 100:.1f}%'
        ws.append([이, N, f(c['전체'])] + [f(c['항목'][k]) for k in ['이름', '전화', '주소', '상세']] + [f(c['덧']['검색어안']), f(c['덧']['상세숫자']), f(c['덧']['느슨히전체'])])
    for x in ws[1]: x.font = 머; x.fill = 칠
    w2 = wb.create_sheet('변형별')
    w2.append(['변형(꼬리표)', '문자 수', '전체 맞음', '실패율', '이름 틀림', '전화 틀림', '주소 틀림', '상세 틀림'])
    for t, (n, ok, k) in sorted(채['꼬리표'].items(), key=lambda x: -(1 - x[1][1] / x[1][0])):
        w2.append([t, n, ok, f'{(1 - ok / n) * 100:.1f}%', k['이름'], k['전화'], k['주소'], k['상세']])
    for x in w2[1]: x.font = 머; x.fill = 칠
    w3 = wb.create_sheet('원인별')
    w3.append(['원인', '건수(겹침 포함)', '이 원인 하나만 틀린 건'])
    for k, v in 채['원인'].most_common(): w3.append([k, v, 채['원인하나만'].get(k, 0)])
    for x in w3[1]: x.font = 머; x.fill = 칠
    w4 = wb.create_sheet('실패목록(' + 판이름 + ')')
    w4.append(['번호', '원문 문자', '정답 이름', '정답 전화', '정답 기본주소', '정답 상세', '앱 이름', '앱 전화', '앱 기본주소', '앱 상세', '틀린 칸', '무엇이 틀렸나', '변형 종류'])
    for m, r, 맞, 왜 in 채['목록']:
        정 = m['정답']
        w4.append([m['id'], 가림(m['글']), 정['이름'], 끝4(정['전화']), 정['기본'], 정['상세'], r.get('이름', ''), 끝4(폰(r)),
                   r.get('주소', ''), r.get('상세', ''), ' '.join(k for k in 맞 if not 맞[k]), ' · '.join(왜), ' '.join(m['표'])])
    for x in w4[1]: x.font = 머; x.fill = 칠
    for c, w in zip('ABCDEFGHIJKLM', [7, 50, 8, 14, 34, 22, 8, 14, 34, 22, 10, 26, 50]): w4.column_dimensions[c].width = w
    for row in w4.iter_rows(min_row=2):
        for x in row: x.alignment = Alignment(wrap_text=True, vertical='top')
    w2.column_dimensions['A'].width = 24; w3.column_dimensions['A'].width = 20; ws.column_dimensions['A'].width = 18
    wb.save(경로)

if __name__ == '__main__':
    인 = sys.argv[1:]; 엑셀들 = []
    if '--엑셀' in 인: i = 인.index('--엑셀'); 엑셀들 = 인[i + 1:]; 인 = 인[:i]
    문자 = json.loads((자료 / '문자.json').read_text(encoding='utf-8'))
    표들 = []
    for x in 인:
        이, p = x.split('=', 1)
        표들.append((이, 채점(문자, json.loads(pathlib.Path(p).read_text(encoding='utf-8')))))
    요약 = {}
    for 이, c in 표들:
        N = c['N']
        요약[이] = {'전체': round(c['전체'] / N * 100, 1), **{k: round(v / N * 100, 1) for k, v in c['항목'].items()}, **{k: round(v / N * 100, 1) for k, v in c['덧'].items()},
                   '원인': c['원인'].most_common(), '원인하나만': c['원인하나만'].most_common(),
                   '꼬리표': {t: [n, round((1 - ok / n) * 100, 1), dict(k)] for t, (n, ok, k) in c['꼬리표'].items()}}
    (자료 / '요약.json').write_text(json.dumps(요약, ensure_ascii=False, indent=1), encoding='utf-8')
    for 이, c in 표들: print(이, {k: v for k, v in 요약[이].items() if k not in ('꼬리표', '원인하나만')})
    for 경로 in 엑셀들: 엑셀(경로, 표들, 표들[-1][0], 표들[-1][1])
