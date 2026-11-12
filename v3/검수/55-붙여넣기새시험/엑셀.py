# -*- coding: utf-8 -*-
# 11/13 붙여넣기 새 1만 통 시험 ③ 실패 유형(사람 말로) · 엑셀 — 채점.py --엑셀 이 부른다
# 유형 = 틀린 칸 + 그 문자에 든 실수·함정 꼬리표 + 앱 상세에 남은 군것 — 위에서부터 먼저 걸리는 것 하나
import re, collections

유형글 = {
    '전화구분': '전화 사이를 ㅡ · ~ · _ 로 쓰거나 한 자리를 띄움 → 전화를 못 찾음(상세에 번호가 섞이기도)',
    '맺음말': '끝 인사(수고·감사·고맙소·수고하십시요)가 상세 끝에 붙음',
    '상황문장': '선물·문의·배송 부탁 같은 말이 상세에 섞임',
    '이름호칭': '이름에 관계·호칭이 붙음(김○○(여동생) · 어머니 김○○ · 김○○ 여사님) → 받는 분을 못 찾거나 관계어를 이름으로',
    '이름띄움': '이름을 띄어 씀(박 ○○) → 받는 분을 못 찾음',
    '입금자명': '입금자 이름이 따로 있음(입금자는 ○○○) → 입금자를 받는 분으로',
    '보내는분': '주문자·보내는 분 번호가 먼저 나옴 → 전화·이름이 보내는 분 것으로',
    '번호구분': '건물번호를 ㅡ · 띄움으로 씀(740ㅡ91 · 41 - 10) → 주소 끝이 잘림',
    '상세앞': '상세(아파트·동호)를 주소 앞에 씀 → 상세가 빠짐',
    '주소고쳐씀': '주소를 한 번 잘못 쓰고 바로 고침(1129 아니 1192) → 틀린 번호까지 들어감',
    '이름조사': '이름 뒤에 조사·말이 붙음(받는 사람 ○○○으로 해주세요 · ○○○ 앞으로) → 받는 분을 못 찾음',
    '이름기타': '받는 분을 못 찾음·다른 낱말을 이름으로(그 밖)',
    '상세빠짐': '상세가 빠지거나 일부만(그 밖)',
    '주소기타': '기본주소 앞뒤가 다름(그 밖)',
    '기타': '그 밖',
}
맺음식 = re.compile(r'(수고|감사|고맙|ㄱㅅ|부탁|하십시|드림니|드립니|합니다)')
def 남은(r, m):
    a = r.get('상세') or ''
    for w in (m['정답']['상세'] or '').split(): a = a.replace(w, ' ', 1)
    return re.sub(r'\s+', ' ', a).strip()

def 유형(m, r, p, 왜):
    t = set(m['표']); 남 = 남은(r, m)
    if not p['전화'] and t & {'실수:전화ㅡ', '실수:전화물결', '실수:전화밑줄', '실수:전화한자리띄움'}: return '전화구분'
    if '함정:보내는분' in t and not (p['이름'] and p['전화']): return '보내는분'
    if '함정:입금자명' in t and not p['이름']: return '입금자명'
    if '실수:이름띄움' in t and not p['이름']: return '이름띄움'
    if '실수:이름호칭' in t and not p['이름']: return '이름호칭'
    if '실수:주소고쳐씀' in t: return '주소고쳐씀'
    if '꼴:상세앞' in t and not p['상세']: return '상세앞'
    if '실수:번호구분' in t and not p['주소']: return '번호구분'
    if not p['상세'] and 남 and 맺음식.search(남.split(' ')[-1]): return '맺음말'
    if not p['상세'] and 남 and not re.fullmatch(r'[\d\s\-]+', 남): return '상황문장'
    if not p['이름'] and re.search(re.escape(m['정답']['이름']) + r'\s?(으로|로|앞으로)(\s|$|,)', m['글']): return '이름조사'
    if not p['이름']: return '이름기타'
    if not p['상세']: return '상세빠짐'
    if not p['주소']: return '주소기타'
    return '기타'

def 유형셈(c):
    묶 = collections.defaultdict(list)
    for m, r, p, 왜 in c['목록']: 묶[유형(m, r, p, 왜)].append((m, r, p, 왜))
    return sorted(묶.items(), key=lambda x: -len(x[1]))

def 이름가림(s, 이름들):
    for n in sorted(이름들, key=len, reverse=True):
        if n and len(n) >= 2: s = s.replace(n, n[0] + '○' * (len(n) - 1))
    return s

def 엑셀(경로, 판들, 요, _유형들, 가림):
    from openpyxl import Workbook
    from openpyxl.styles import Font, Alignment, PatternFill
    머, 칠 = Font(bold=True), PatternFill('solid', fgColor='E8EDE4')
    def 머리(ws, 줄):
        ws.append(줄)
        for x in ws[ws.max_row]: x.font = 머; x.fill = 칠
    wb = Workbook(); ws = wb.active; ws.title = '요약'
    머리(ws, ['판', '문자 수', '네 칸 다 맞음', '받는 분', '전화', '기본주소', '상세', '노란 줄 붙음', '노란 줄 헛경보', '노란 줄 잡힘률', '새 의심 붙음', '새 의심 헛경보', '새 의심 잡힘률'])
    for 이, c in 판들:
        y = 요[이]
        ws.append([이, y['N'], y['전체'], y['이름'], y['전화'], y['주소'], y['상세'], y['확인전체']['붙음'], y['확인전체']['헛경보'], y['확인전체']['잡힘률'],
                   y['새의심']['붙음'], y['새의심']['헛경보'], y['새의심']['잡힘률']])
    ws.append([]); ws.append(['비교: 0223 보고서 「처음 보는 말투」(옛 문자 · 재는 쪽 669명) e8a26f7 = 85.2%'])
    ws.column_dimensions['A'].width = 14
    w = wb.create_sheet('연령대별'); 머리(w, ['연령대'] + [f'{이} 네 칸 다 맞음' for 이, _ in 판들] + ['문자 수'])
    for k in ['나이:20', '나이:30', '나이:40', '나이:50', '나이:60', '나이:70']:
        w.append([k[3:] + '대'] + [요[이]['나이'][k] for 이, _ in 판들] + [요[판들[0][0]]['꼬리표'][k][0]])
    w = wb.create_sheet('종류별'); 머리(w, ['꼬리표(실수·함정·꼴·상황)', '문자 수'] + [f'{이} 성공률' for 이, _ in 판들] + ['받는 분 틀림', '전화 틀림', '주소 틀림', '상세 틀림'])
    첫 = 요[판들[0][0]]['꼬리표']
    for t, (n, ok, k) in 첫.items():
        if t.startswith('나이:'): continue
        w.append([t, n] + [요[이]['꼬리표'][t][1] for 이, _ in 판들] + [k.get('이름', 0), k.get('전화', 0), k.get('주소', 0), k.get('상세', 0)])
    w.column_dimensions['A'].width = 24
    이, c = 판들[-1]
    w = wb.create_sheet('실패 유형(' + 이 + ')'); 머리(w, ['순위', '유형', '건수', '예시 원문(전화 가림)', '앱이 나눈 것', '사람이 읽은 답'])
    for i, (u, xs) in enumerate(유형셈(c), 1):
        m, r, p, 왜 = xs[0]; 정 = m['정답']
        w.append([i, 유형글[u], len(xs), 가림(m['글']), f"{r.get('이름')} / {폰끝(r)} / {r.get('주소')} / {r.get('상세')}", f"{정['이름']} / {정['전화'][-4:]} / {정['기본']} / {정['상세']}"])
    for col, wd in zip('ABCDEF', [6, 50, 8, 60, 45, 45]): w.column_dimensions[col].width = wd
    for row in w.iter_rows(min_row=2):
        for x in row: x.alignment = Alignment(wrap_text=True, vertical='top')
    w = wb.create_sheet('실패목록(' + 이 + ')')
    머리(w, ['번호', '연령대', '원문 문자(전화 가림)', '답 받는 분', '답 전화', '답 기본주소', '답 상세', '앱 받는 분', '앱 전화', '앱 기본주소', '앱 상세', '틀린 칸', '무엇이 틀렸나', '유형', '꼬리표', '노란 줄'])
    for m, r, p, 왜 in c['목록']:
        정 = m['정답']
        w.append([m['id'], f"{m['나이']}대", 가림(m['글']), 정['이름'], '*' * 7 + 정['전화'][-4:], 정['기본'], 정['상세'], r.get('이름', ''), 폰끝(r), r.get('주소', ''), r.get('상세', ''),
                  ' '.join(k for k in p if not p[k]), ' · '.join(왜), 유형글[유형(m, r, p, 왜)], ' '.join(m['표']), ' | '.join(r.get('확인') or [])])
    for col, wd in zip('ABCDEFGHIJKLMNOP', [8, 6, 55, 8, 12, 34, 20, 8, 12, 34, 24, 10, 26, 40, 40, 40]): w.column_dimensions[col].width = wd
    for row in w.iter_rows(min_row=2):
        for x in row: x.alignment = Alignment(wrap_text=True, vertical='top')
    wb.save(경로)

def 폰끝(r):
    d = (r.get('전화들') or [''])[0]
    return ('*' * max(0, len(d) - 4) + d[-4:]) if d else ''
