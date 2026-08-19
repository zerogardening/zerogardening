# -*- coding: utf-8 -*-
# 13단계 — 맥에서 도는 `통합관리/도구/제작요청.py` 검수 (서버는 가짜로 세운다)
#   python3 v3/검수/제작요청스크립트-시험.py
import importlib.util, json, pathlib, sys, tempfile

경로 = pathlib.Path(__file__).resolve().parents[2] / '도구' / '제작요청.py'
스펙 = importlib.util.spec_from_file_location('제작요청', 경로)
모 = importlib.util.module_from_spec(스펙)
스펙.loader.exec_module(모)

결과 = []
def 본다(이름, 참, 덧=''):
    결과.append((참, 이름, 덧))

방 = pathlib.Path(tempfile.mkdtemp())
모.뿌리 = 방
모.품목방 = 방 / '상품' / '품목'
모.제작대기 = 방 / '상품' / '제작대기.md'
모.식물정보방 = 방 / '통합관리' / '식물정보'
모.대기파일 = 모.식물정보방 / '대기.json'

요청줄 = [
    {'id': 'pr_1', '삭제됨': False, '내용': {'품목코드': 'PER03-15', '종류': '상세페이지', '상태': '대기',
     '유통명': "수크령 레드헤드", '학명': "Pennisetum alopecuroides 'Red Head'", '규격cm': 15}},
    {'id': 'pr_2', '삭제됨': False, '내용': {'품목코드': 'CAR01-10', '종류': '식물정보', '상태': '대기',
     '유통명': '청사초', '학명': 'Carex breviculmis', '규격cm': 10}},
    {'id': 'pr_3', '삭제됨': True, '내용': {'품목코드': 'ZZZ01-10', '종류': '상세페이지', '상태': '대기',
     '유통명': '지운것', '학명': 'x', '규격cm': 10}},
]
품목줄 = [
    {'id': 'PER03-15', '내용': {'품목코드': 'PER03-15', '유통명': '수크령 레드헤드', '특성': None}},
    {'id': 'CAR01-10', '내용': {'품목코드': 'CAR01-10', '유통명': '청사초',
                               '특성': {'최대높이': '20~30', '관리특이사항': '', '내한성': ''}}},
]
보낸것 = []

def 가짜부르기(길, 방법='GET', 몸=None):
    보낸것.append((방법, 길, 몸))
    if 방법 != 'GET':
        # PATCH 한 것을 가짜 서버에도 반영한다 — 두 번 돌렸을 때를 보려면 필요하다
        표, _, 조건 = 길.partition('?')
        id값 = 조건.split('eq.')[-1]
        from urllib.parse import unquote
        for 줄 in (요청줄 if '제작요청' in unquote(표) else 품목줄):
            if 줄['id'] == unquote(id값):
                줄['내용'] = 몸['내용']
        return None
    from urllib.parse import unquote
    return [dict(r) for r in (요청줄 if '제작요청' in unquote(길) else 품목줄)]

모.부르기 = 가짜부르기

# ── 받기 ────────────────────────────────────────────────────────────────
모.받기()

입력 = 모.품목방 / '수크령-레드헤드' / '입력.md'
본다('유통명 공백이 하이픈 폴더가 된다', 입력.exists(), str(입력))
글 = 입력.read_text(encoding='utf-8') if 입력.exists() else ''
본다('입력.md 에 식물명·학명·화분 규격이 다 있다',
     '수크령 레드헤드' in 글 and "Pennisetum alopecuroides 'Red Head'" in 글 and '15cm화분' in 글)
본다('학명은 확정값이 아니라고 못박는다', '리서치로 확정' in 글)
본다('제작대기.md 에 한 줄', '수크령-레드헤드' in 모.제작대기.read_text(encoding='utf-8'))

묶음 = json.loads(모.대기파일.read_text(encoding='utf-8'))
본다('식물정보만 대기.json 에 간다',
     len(묶음['품목']) == 1 and 묶음['품목'][0]['품목코드'] == 'CAR01-10', str(len(묶음['품목'])))
본다('이미 적힌 특성은 미리 채워 보여준다', 묶음['품목'][0]['특성']['최대높이'] == '20~30',
     묶음['품목'][0]['특성']['최대높이'])
본다('빈 칸 7개가 다 있다', list(묶음['품목'][0]['특성']) == 모.특성칸)
본다('고를 수 있는 값도 적어 준다', '내한성' in 묶음['고를수있는값'])
본다('삭제된 요청은 안 가져온다', not (모.품목방 / '지운것').exists())
본다('둘 다 「받음」으로 바꾼다',
     sum(1 for 방법, _, 몸 in 보낸것 if 방법 == 'PATCH' and 몸['내용'].get('상태') == '받음') == 2)

# 두 번 돌려도 덮지 않는다
입력.write_text('# 손으로 고친 것', encoding='utf-8')
요청줄[0]['내용']['상태'] = '대기'      # 다시 대기로 되돌려 놓고 또 부른다
모.받기()
본다('이미 있는 입력.md 는 덮지 않는다', 입력.read_text(encoding='utf-8') == '# 손으로 고친 것')
본다('대기.json 에 같은 요청이 두 번 들어가지 않는다',
     len(json.loads(모.대기파일.read_text(encoding='utf-8'))['품목']) == 1)
본다('제작대기.md 에도 같은 품목이 두 줄 되지 않는다',
     모.제작대기.read_text(encoding='utf-8').count('수크령-레드헤드') == 1)

# ── 올리기 ──────────────────────────────────────────────────────────────
묶음 = json.loads(모.대기파일.read_text(encoding='utf-8'))
묶음['품목'][0]['특성'].update({'최대높이': '99~99', '내한성': 'Zone4', '관리특이사항': '초봄에 묵은 잎을 훑어냅니다'})
모.대기파일.write_text(json.dumps(묶음, ensure_ascii=False), encoding='utf-8')
보낸것.clear()
모.올리기()

from urllib.parse import unquote
올린것 = [몸 for 방법, 길, 몸 in 보낸것 if 방법 == 'PATCH' and '품목' in unquote(길)]
본다('품목 한 줄을 올린다', len(올린것) == 1, str(len(올린것)))
특성 = 올린것[0]['내용']['특성'] if 올린것 else {}
본다('🔴 이미 값이 있던 칸은 안 덮는다', 특성.get('최대높이') == '20~30', 특성.get('최대높이'))
본다('비어 있던 칸만 채운다', 특성.get('내한성') == 'Zone4' and 특성.get('관리특이사항').startswith('초봄'))
본다('요청을 「끝」으로 닫는다',
     any(방법 == 'PATCH' and '제작요청' in unquote(길) and 몸['내용'].get('상태') == '끝'
         for 방법, 길, 몸 in 보낸것))
본다('올린 것은 대기.json 에서 뺀다',
     json.loads(모.대기파일.read_text(encoding='utf-8'))['품목'] == [])

통과 = sum(1 for 참, _, _ in 결과 if 참)
for 참, 이름, 덧 in 결과:
    print(('  ✅ ' if 참 else '  ❌ ') + 이름 + (' — ' + str(덧) if 덧 and not 참 else ''))
print('%d/%d' % (통과, len(결과)))
sys.exit(0 if 통과 == len(결과) else 1)
