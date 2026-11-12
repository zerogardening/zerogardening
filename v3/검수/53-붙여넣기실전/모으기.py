# -*- coding: utf-8 -*-
# 11/13 붙여넣기 실전 시험 ① 손님 자료 모으기 — 이름·전화·기본주소·상세 (중복 제거 · 안심번호는 무작위 010)
# 읽는 곳: 자동백업(v3_주문·v3_문자주문) + 옛 앱 백업(orders) + 서버 GET(백업 뒤 바뀐 줄만)
# 🔴 결과는 저장소 밖(백업/수동/붙여넣기시험-2026-11-13/ · .gitignore 백업/*)에만. 실제 자료는 커밋하지 않는다
import json, re, random, sys, pathlib, urllib.parse
뿌리 = pathlib.Path(__file__).resolve().parents[3]          # 통합관리/
sys.path.insert(0, str(뿌리 / '도구'))
자료 = 뿌리 / '백업' / '수동' / '붙여넣기시험-2026-11-13'
자료.mkdir(parents=True, exist_ok=True)
random.seed(20261113)

def 최신백업():
    return sorted((뿌리 / '백업' / '자동').glob('v3-*'))[-1]

def 읽기(p):
    return json.loads(p.read_text(encoding='utf-8'))

def 서버뒤줄(표이름, 뒤):
    import 제작요청
    길 = 제작요청.표(표이름) + '?select=내용,수정시각&수정시각=gt.' + urllib.parse.quote(뒤)
    return 제작요청.부르기(길) or []

참고식 = re.compile(r'\(([^)]*)\)')
def 나눠(주소, 상세=''):
    """기본주소(도로명+건물번호 / 지번+번지) · 상세 · 참고(괄호) — 못 나누면 None"""
    s = re.sub(r'\s+', ' ', str(주소 or '')).strip()
    참고 = [x.strip() for x in 참고식.findall(s) + 참고식.findall(상세 or '')]
    s = 참고식.sub(' ', s); s = re.sub(r'\s+', ' ', s).strip()
    낱 = []
    for t in s.split(' '):   # 붙여 쓴 「창후로999번길99」 → 길 이름 + 건물번호
        m = re.fullmatch(r'(.+?(?:로|길))(\d+(?:-\d+)?)', t)
        낱 += [m.group(1), m.group(2)] if m and len(m.group(1)) >= 2 else [t]
    for i, t in enumerate(낱):
        if re.search(r'(로|길)$', t) and i >= 2 and i + 1 < len(낱) and re.fullmatch(r'\d+(-\d+)?', 낱[i + 1]):
            기 = 낱[:i + 2]; 나머 = 낱[i + 2:]; break
        if re.search(r'[가-힣](동|리|가)$', t) and i >= 2 and i + 1 < len(낱) and re.fullmatch(r'산?\d+(-\d+)?(번지)?', 낱[i + 1]):
            기 = 낱[:i + 2]; 나머 = 낱[i + 2:]; break
    else:
        return None
    상 = ' '.join(나머 + ([상세] if 상세 else [])).strip()
    상 = re.sub(r'^[\s.\-,~]+$', '', 상).strip(' ,')
    return ' '.join(기), 상, [c for c in 참고 if c]

요청말 = re.compile(r'주세요|해주|놔|놓아|두지|두고|두세요|맡겨|부탁|연락|전화|문앞|문 앞|배송|택배|있는집|없으면|말고')
def 상세다듬기(이름, 기, 상):
    """실제 상세의 찌꺼기 걷기 → (상세, 요청) — 주소를 한 번 더 적은 것·「번지」·이름·우편번호만 · 배송 요청은 따로"""
    낱 = 기.split(' ')
    if not 상 or 상 in ('번지', '-', '.') or 상 == 이름 or re.fullmatch(r'\d{5}', 상): return '', ''
    if any(len(t) >= 3 and t in 상 for t in 낱[-2:-1]) or 시도처음.match(상): return '', ''
    if 요청말.search(상): return '', 상
    return 상, ''
시도처음 = re.compile(r'^(서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충청|충북|충남|전라|전북|전남|경상|경북|경남|제주)')

def 전화(v):
    d = re.sub(r'\D', '', str(v or ''))
    if d.startswith('82') and len(d) >= 11: d = '0' + d[2:]
    if re.fullmatch(r'01[016789]\d{7,8}', d): return d, False
    if len(d) >= 8: return '010' + ''.join(random.choice('0123456789') for _ in range(8)), True   # 안심번호 050·0503 등
    return None, False

def 모으기():
    판 = 최신백업()
    줄들 = []   # (출처, 이름, 전화, 주소, 상세)
    for r in 읽기(판 / 'v3_주문.json'):
        c = r['내용'] or {}
        if not r.get('삭제됨') and c.get('수령인주소'): 줄들.append(('v3주문', c.get('수령인'), c.get('수령인전화'), c['수령인주소'], ''))
    for r in 읽기(판 / 'v3_문자주문.json'):
        c = r['내용'] or {}
        if not r.get('삭제됨') and c.get('주소'): 줄들.append(('문자주문', c.get('받는분'), c.get('전화'), c['주소'], c.get('상세주소') or ''))
    옛 = 뿌리 / '백업' / '제로가드닝_백업_2026-08-02 복사본.json'
    if 옛.exists():
        for o in 읽기(옛).get('orders', []):
            if o.get('recipientAddr'): 줄들.append(('옛앱', o.get('recipientName'), o.get('recipientMobile') or o.get('ordererMobile') or o.get('ordererPhone'), o['recipientAddr'], ''))
    뒤 = max(r['수정시각'] for r in 읽기(판 / 'v3_주문.json'))
    새 = 0
    if '--서버없이' not in sys.argv:
        for 표이름, 칸 in (('v3_주문', ('수령인', '수령인전화', '수령인주소', None)), ('v3_문자주문', ('받는분', '전화', '주소', '상세주소'))):
            for r in 서버뒤줄(표이름, 뒤):
                c = r['내용'] or {}
                if c.get(칸[2]): 줄들.append(('서버', c.get(칸[0]), c.get(칸[1]), c[칸[2]], c.get(칸[3]) or '' if 칸[3] else '')); 새 += 1
    손님, 본 = [], set(); 셈 = {'전체줄': len(줄들), '서버새줄': 새, '이름버림': 0, '전화버림': 0, '주소못나눔': 0, '중복': 0, '안심번호바꿈': 0}
    for 출처, 이름, 폰, 주소, 상세 in 줄들:
        이름 = re.sub(r'\s+', '', str(이름 or ''))
        if not re.fullmatch(r'[가-힣]{2,4}', 이름): 셈['이름버림'] += 1; continue
        p, 바꿈 = 전화(폰)
        if not p: 셈['전화버림'] += 1; continue
        n = 나눠(주소, 상세)
        if not n: 셈['주소못나눔'] += 1; continue
        열쇠 = (이름, re.sub(r'\s', '', n[0] + n[1]))
        if 열쇠 in 본: 셈['중복'] += 1; continue
        본.add(열쇠); 셈['안심번호바꿈'] += 바꿈
        상, 요 = 상세다듬기(이름, n[0], n[1]); 셈['상세찌꺼기걷음'] = 셈.get('상세찌꺼기걷음', 0) + (상 != n[1])
        손님.append({'출처': 출처, '이름': 이름, '전화': p, '기본': n[0], '상세': 상, '요청': 요, '참고': n[2]})
    셈['손님'] = len(손님)
    (자료 / '손님.json').write_text(json.dumps(손님, ensure_ascii=False, indent=0), encoding='utf-8')
    print(json.dumps(셈, ensure_ascii=False))

if __name__ == '__main__':
    모으기()
