#!/usr/bin/env python3
"""폰·PC 에서 고친 상세페이지 원고를 맥으로 받고, 맥의 원고를 올린다 (15단계 B).

    python3 통합관리/도구/원고받기.py          # 주고받고, 만들기 요청이 있으면 렌더까지
    python3 통합관리/도구/원고받기.py 점검      # 어느 품목의 어느 칸을 못 읽는지만 찍는다
    python3 통합관리/도구/원고받기.py 만들기 구절초-노랑   # 그 품목만 손으로 다시 뽑는다

주고받는 자리는 Supabase `v3_원고` 표다. 줄 하나가 글칸 하나다 (설계 §2).
🔴 열쇠·REST 호출·폴더명 규칙은 제작요청.py 것을 그대로 쓴다 — 규칙이 갈리면 폴더가 둘로 갈린다.
🔴 늦게 온 것이 이긴다를 막는 두 시각 —
     고친때 > 맥시각  → 화면이 더 새것이다. 파일에 박고 맥시각 = 고친때
     그 밖에 글이 다르면 → 파일이 더 새것이다. 올리고 고친때 = 맥시각 = 지금
   맥이 방금 쓴 파일을 되올리는 핑퐁이 안 나도록 **글이 같으면 아무것도 안 한다**(멱등).
🔴 편집기(편집.py)는 한 줄도 안 고친다. 렌더 블록만 본보기로 베꼈다.
"""
import json, shutil, subprocess, sys, time, urllib.parse, urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from 제작요청 import 키, 부르기, 표, 폴더명, 품목방             # noqa: E402
import 원고파일 as 원고                                        # noqa: E402

창고 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/storage/v1/'
버킷 = 'product'
뿌리 = Path(__file__).resolve().parents[2]
RENDER = 뿌리 / '블로그' / '_도구' / 'render.py'
내보낼방 = Path.home() / '상세페이지'   # 🔴 제작요청.py 와 같은 자리. 그쪽을 import 하지 않는다 — 아직 커밋 안 된 파일이라 죽는다
# 🔴 소급 방지 경계 — 06g-사진수집.js:12 의 `new Date(2026, 8, 1)` 과 같은 날이어야 한다.
#    2026-09-14 우람님 지시로 9/9 → 9/1. 제작대기 11품목이 9/4 등록이라 전부 밖이었다
경계 = int(time.mktime((2026, 9, 1, 0, 0, 0, 0, 0, -1)) * 1000)


def 올리기(행들):
    """v3_원고 upsert — 표가 없으면 그 자리에서 분명히 죽는다(조용한 실패 금지)"""
    if not 행들:
        return
    k = 키()
    req = urllib.request.Request(
        'https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/' + urllib.parse.quote('v3_원고'),
        method='POST', data=json.dumps(행들, ensure_ascii=False).encode(),
        headers={'apikey': k, 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json',
                 'Prefer': 'resolution=merge-duplicates,return=minimal'})
    urllib.request.urlopen(req, timeout=30).read()


def 원고줄들():
    줄 = 부르기(표('v3_원고') + '?select=id,내용,삭제됨') or []
    return {r['id']: (r.get('내용') or {}) for r in 줄 if not r.get('삭제됨')}


def 품목표():
    """{품목코드: 품목폴더}. 경계 뒤 신규 품목만, 폴더가 없는 코드는 뺀다"""
    줄 = 부르기(표('v3_품목') + '?select=id,내용') or []
    표들 = {}
    for r in 줄:
        내용 = r.get('내용') or {}
        유통명 = 내용.get('유통명', '')
        if not 유통명 or (내용.get('등록일시') or 0) < 경계:
            continue
        방 = 품목방 / 폴더명(유통명)
        if 방.is_dir():
            표들[r['id']] = 방
    return 표들


def 창고올리기(길, 자료):
    k = 키()
    req = urllib.request.Request(
        창고 + 'object/' + 버킷 + '/' + urllib.parse.quote(길), method='POST', data=자료,
        headers={'apikey': k, 'Authorization': 'Bearer ' + k,
                 'Content-Type': 'image/jpeg', 'x-upsert': 'true'})
    urllib.request.urlopen(req, timeout=30).read()


# ══════════════════════════════════════════════ 주고받기

def 맞추기(코드, 방, 줄들):
    파일값, 출처 = 원고.읽기(방, 코드)
    못읽음 = 원고.못읽은칸(파일값)
    내린것, 올린것 = [], []
    박을것, 올릴행 = {}, []
    이제 = int(time.time() * 1000)

    for 칸, 값 in 파일값.items():
        줄 = 줄들.get(코드 + '#' + 칸)
        if 줄 and (줄.get('고친때') or 0) > (줄.get('맥시각') or 0):
            # 화면 쪽이 더 새것이다 — 파일에 박는다
            박을것[칸] = {'소제목': 줄.get('소제목', ''), '본문': 줄.get('본문', '')}
            줄 = dict(줄)
            줄['맥시각'] = 줄.get('고친때') or 이제
            올릴행.append({'id': 코드 + '#' + 칸, '내용': 줄, '삭제됨': False})
            내린것.append(칸)
            continue
        같다 = 줄 and (줄.get('본문', '') == 값.get('본문', '')
                      and 줄.get('소제목', '') == 값.get('소제목', ''))
        if 같다:
            continue                      # 🔴 글이 같으면 아무것도 안 한다 — 멱등이고 핑퐁이 없다
        올릴행.append({'id': 코드 + '#' + 칸, '내용': {
            '품목코드': 코드, '칸': 칸, '소제목': 값.get('소제목', ''), '본문': 값.get('본문', ''),
            '고친때': 이제, '맥시각': 이제}, '삭제됨': False})
        올린것.append(칸)

    if 박을것:
        원고.박기(방, 박을것, 코드)
    올리기(올릴행)
    return 내린것, 올린것, 못읽음, 출처


# ══════════════════════════════════════════════ 다시 만들기

def 뽑기(코드, 방):
    """편집.py 1516-1545 의 render.py → sips → 복사 블록을 그대로 옮겼다"""
    파일 = 원고.제작본(방, 코드)
    if not 파일.exists():
        return [], '제작.html 이 아직 없습니다 — 첫 조립은 사람·에이전트 몫입니다'
    원문 = 파일.read_text(encoding='utf-8')
    뽑은것, 지적 = [], []
    # 🔴 두 규격인 품목은 `~/상세페이지/{품목}/{규격}` 으로 가른다 — 뿌리에 두면 서로 덮는다
    #    (`~/상세페이지/향등골나물-알바/10·15` · 제작요청.py 가 세운 자리와 같다)
    규 = 원고.규격(코드)
    갈곳 = (내보낼방 / 방.name / 규) if (규 and 파일.parent.name == 규) else (내보낼방 / 방.name)
    갈곳.mkdir(parents=True, exist_ok=True)
    for i in '123456':
        if 'id="s%s"' % i not in 원문:
            continue
        png, jpg = 파일.parent / ('%s.png' % i), 파일.parent / ('%s.jpg' % i)
        전 = png.stat().st_mtime if png.exists() else 0
        r = subprocess.run(['python3', str(RENDER), str(파일), str(png), '--sel', '#s%s' % i, '--screen'],
                           capture_output=True, text=True)
        if not png.exists() or png.stat().st_mtime == 전:
            끝 = [t for t in (r.stdout + r.stderr).strip().split('\n') if t.strip()]
            지적.append('%s: %s' % (i, 끝[-1][:90] if 끝 else '까닭 모름'))
            continue
        if r.returncode != 0:
            지적 += ['%s — %s' % (i, t.strip(' ·')) for t in r.stdout.split('\n') if t.strip().startswith('·')]
        subprocess.run(['sips', '-s', 'format', 'jpeg', '-s', 'formatOptions', '82',
                        str(png), '--out', str(jpg)], capture_output=True)
        if jpg.exists():
            shutil.copy2(jpg, 갈곳 / ('%s.jpg' % i))
            # 🔴 `발행` 이 아니라 `pub` 이다 — Supabase Storage 는 키에 한글을 못 쓴다
            #    (`InvalidKey`). 설계는 `발행/` 이었는데 신규 입고가 0건이라
            #    한 번도 안 올려 봐서 2026-09-14 까지 아무도 몰랐다.
            창고올리기('%s/pub/%s.jpg' % (코드, i), jpg.read_bytes())
            뽑은것.append(i)
    return 뽑은것, ' · '.join(지적)


def 만들기처리(코드, 방, 머리):
    뽑은것, 말 = 뽑기(코드, 방)
    새 = dict(머리)
    새['품목코드'] = 코드
    새['맥시각'] = int(time.time() * 1000)
    새['제작있음'] = 원고.제작본(방, 코드).exists()
    새['장수'] = len(뽑은것)
    새['말'] = 말
    # 조판 자체검수(render.py)가 짚은 것이 있어도 그림이 나왔으면 '됨' 이다 — 지적은 `말` 로 전한다
    새['만들기상태'] = '됨' if 뽑은것 else '실패'
    if 뽑은것:
        새['만든때'] = 새['맥시각']
    올리기([{'id': 코드, '내용': 새, '삭제됨': False}])
    return 뽑은것, 말


def 머리맞추기(코드, 방, 머리):
    """🔴 머리줄의 제작있음을 실제 파일과 맞춘다 — 이 한 값이 [상세페이지 만들기]/[다시 만들기]를 가른다
       (06j-결과화면.js:92 만든적있나 가 이 값을 맨 먼저 본다). 안 맞추면 다 조립해도 단추가 안 바뀐다.
       달라졌을 때만 올린다(멱등). 맥시각은 건드리지 않는다 — 만들기요청 비교가 이 값으로 이뤄진다"""
    있다 = 원고.제작본(방, 코드).exists()
    if '제작있음' in 머리 and bool(머리.get('제작있음')) == 있다:
        return False
    새 = dict(머리)
    새['품목코드'] = 코드
    새['제작있음'] = 있다
    올리기([{'id': 코드, '내용': 새, '삭제됨': False}])
    return True


# ══════════════════════════════════════════════ 갈래

def 점검():
    방들 = sorted(p for p in 품목방.iterdir() if p.is_dir())
    안좋은것 = 0
    for 방 in 방들:
        값, 출처 = 원고.읽기(방)
        못 = 원고.못읽은칸(값)
        if 못 or not 출처:
            안좋은것 += 1
            print('  ⚠️ %-24s %-10s 읽은 %d/7 · 못 읽은 칸 %s'
                  % (방.name, 출처 or '파일없음', len(값), ','.join(못)))
    print('점검 끝 — 품목 %d개 중 손볼 것 %d개. 🔴 못 읽은 칸은 화면에서도 안 고쳐진다(설계 §0-③)'
          % (len(방들), 안좋은것))


def 주고받기():
    줄들 = 원고줄들()
    코드표 = 품목표()
    받은, 보낸, 만든, 머리고침 = 0, 0, 0, 0
    for 코드, 방 in sorted(코드표.items()):
        내린것, 올린것, 못읽음, 출처 = 맞추기(코드, 방, 줄들)
        받은 += len(내린것); 보낸 += len(올린것)
        if 내린것 or 올린것:
            print('  ✅ %-24s %s%s' % (방.name,
                                      ('내려받음 ' + ','.join(내린것) + ' ') if 내린것 else '',
                                      ('올림 ' + ','.join(올린것)) if 올린것 else ''))
        if 못읽음:
            print('  ⚠️ %-24s 못 읽은 칸 %s (%s)' % (방.name, ','.join(못읽음), 출처 or '파일없음'))

        머리 = 줄들.get(코드) or {}
        if (머리.get('만들기요청') or 0) > (머리.get('맥시각') or 0):
            print('  🛠  %s — 다시 만듭니다' % 방.name)
            뽑은것, 말 = 만들기처리(코드, 방, 머리)   # 여기서 제작있음까지 같이 올라간다
            만든 += 1
            print('     %s%s' % ('뽑음 ' + ','.join(뽑은것) if 뽑은것 else '못 뽑음', ' · ' + 말 if 말 else ''))
        elif 머리맞추기(코드, 방, 머리):
            머리고침 += 1
            print('  📄 %-24s 제작.html %s' % (방.name, '있음' if 원고.제작본(방, 코드).exists() else '없음'))
    print('원고 — 내려받은 칸 %d · 올린 칸 %d · 다시 만든 품목 %d · 머리줄 고침 %d'
          % (받은, 보낸, 만든, 머리고침))


if __name__ == '__main__':
    인자 = sys.argv[1:]
    if 인자 and 인자[0] == '점검':
        점검()
    elif len(인자) >= 2 and 인자[0] == '만들기':
        방 = 품목방 / 인자[1]
        코드 = next((c for c, d in 품목표().items() if d == 방), '')
        if not 코드:
            sys.exit('❌ 통합관리에 없는 품목이다 — ' + 인자[1])
        print(만들기처리(코드, 방, 원고줄들().get(코드) or {}))
    else:
        주고받기()
