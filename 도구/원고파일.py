#!/usr/bin/env python3
"""상세페이지 원고 7칸을 `발행이미지/제작.html` · `작성내용.md` 에서 뽑고 되박는다 (15단계 B).

🔴 이미지에 찍히는 글은 `작성내용.md` 가 아니라 `발행이미지/제작.html` 이다 (설계 §0-②).
   `.md` 로 초안을 쓰고 편집기에서 손본 것이 `.html` 에만 남는다 — 원본은 html 이다.
   html 이 아직 없는 품목(첫 제작 전)은 md 를 읽는다. 둘 다 없으면 빈 값이다.

🔴 「34품목 전부 같은 구조」가 아니다 (설계 §0-③).
   못 읽은 칸은 **지어내지 않는다.** 아예 돌려주지 않으니 화면에서도 저장 대상에서 빠진다.
   4구역에 ④가 있는 품목이 4개 있다 — ①②③만 다루고 ④는 파일에 그대로 둔다.

🔴 손대지 않은 구역은 바이트 그대로 둔다. `&nbsp;`(줄바꿈 막이)가 살아 있어야 조판이 안 흐트러진다.
"""
import html as _html
import re

칸들 = ['1', '2', '3', '4-1', '4-2', '4-3', '5']
소제목있는칸 = {'2', '3', '4-1', '4-2', '4-3'}


def 규격(코드):
    """🔴 품목코드 뒷자리가 곧 규격이다 — `EUA01-15` → `15` · `CAL01-21` → `21`.
       같은 식물 두 규격은 `발행이미지/` 아래 그 이름의 폴더가 한 겹 더 있다 (2026-09-14).
       `상세설명-올리기.py:57` 의 `품목/규격` 과 같은 값이다 — 규칙이 갈리면 또 어긋난다."""
    m = re.search(r'-(\d+)$', str(코드 or ''))
    return m.group(1) if m else ''


def 제작본(품목방, 코드=None):
    """🔴 규격 폴더가 **있을 때만** 그것을 본다. 없으면 지금까지와 똑같다 —
       기존 32품목은 한 글자도 안 바뀐다.
       코드를 안 주면 옛 자리만 본다. 그래서 향등골나물 알바가 `제작있음: false` 로 남아
       [결과] 탭에 「상세페이지 만들기」와 「상품 업로드」가 **함께** 떴다 (우람님이 잡으셨다)."""
    방 = 품목방 / '발행이미지'
    규 = 규격(코드)
    if 규:
        깊 = 방 / 규 / '제작.html'
        if 깊.exists():
            return 깊
    return 방 / '제작.html'


def 원고md(품목방):
    return 품목방 / '작성내용.md'


# ══════════════════════════════════════════════ html ↔ 글

def 글로(조각):
    t = re.sub(r'<br\s*/?>', '\n', 조각)
    t = t.replace('&nbsp;', ' ')
    t = re.sub(r'<[^>]+>', '', t)
    t = _html.unescape(t)
    return re.sub(r'[ \t]+', ' ', t).strip()


def html로(글):
    """여러 줄은 한 줄로 합친다 — .lead·.desc·p 는 조판이 알아서 흘린다.
    🔴 고친 구역의 `&nbsp;` 손질은 사라진다. 어차피 문장이 바뀌는 자리라 받아들인다(설계 §0-②)."""
    한줄 = ' '.join(t.strip() for t in str(글).split('\n') if t.strip())
    return _html.escape(한줄, quote=False)


def 구역조각(원문, n):
    """`id="sN"` 부터 다음 구역 앞까지"""
    m = re.search(r'<div class="[^"]*"\s+id="s%s"' % n, 원문)
    if not m:
        return None
    뒤 = re.search(r'<div class="[^"]*"\s+id="s\d"', 원문[m.end():])
    끝 = m.end() + (뒤.start() if 뒤 else len(원문) - m.end())
    return (m.start(), 끝)


칸틀 = {
    '1': r'(<div class="lead">)(.*?)(</div>)',
    '2': r'(<div class="desc">)(.*?)(</div>)',
    '3': r'(<div class="desc">)(.*?)(</div>)',
    '5': r'(<div class="desc">)(.*?)(</div>)',
}
머리틀 = r'<span class="(?:kr|en)">(.*?)</span>'
항목틀 = r'(<div class="st">)(.*?)(</div>)(\s*)(<p>)(.*?)(</p>)'


def html읽기(원문):
    값 = {}
    for n in ('1', '2', '3', '5'):
        자리 = 구역조각(원문, n)
        if not 자리:
            continue
        조각 = 원문[자리[0]:자리[1]]
        m = re.search(칸틀[n], 조각, re.S)
        if not m:
            continue
        칸 = {'본문': 글로(m.group(2))}
        if n in ('2', '3'):
            h = re.search(머리틀, 조각, re.S)
            칸['소제목'] = 글로(h.group(1)) if h else ''
        값[n] = 칸

    자리 = 구역조각(원문, '4')
    if 자리:
        조각 = 원문[자리[0]:자리[1]]
        # ④가 있는 품목이 4개 있다 — 앞의 셋만 쓴다
        for i, m in enumerate(re.finditer(항목틀, 조각, re.S)):
            if i >= 3:
                break
            값['4-%d' % (i + 1)] = {'소제목': 글로(m.group(2)), '본문': 글로(m.group(6))}
    return 값


def html박기(원문, 새값):
    """새값 = {칸: {소제목, 본문}} — 준 칸만 갈아 끼운다. 나머지는 바이트 그대로다"""
    글 = 원문
    for n in ('1', '2', '3', '5'):
        if n not in 새값:
            continue
        자리 = 구역조각(글, n)
        if not 자리:
            continue
        조각 = 글[자리[0]:자리[1]]
        m = re.search(칸틀[n], 조각, re.S)
        if not m:
            continue
        앞 = re.match(r'\s*(?:<br\s*/?>\s*)*', m.group(2)).group(0)   # 5구역의 앞 <br> 은 조판이다
        새조각 = 조각[:m.start()] + m.group(1) + 앞 + html로(새값[n]['본문']) + m.group(3) + 조각[m.end():]
        if n in ('2', '3') and 새값[n].get('소제목'):
            새조각 = re.sub(머리틀,
                            lambda h: h.group(0).replace(h.group(1), html로(새값[n]['소제목'])),
                            새조각, count=1, flags=re.S)
        글 = 글[:자리[0]] + 새조각 + 글[자리[1]:]

    넷 = {k: v for k, v in 새값.items() if k.startswith('4-')}
    if 넷:
        자리 = 구역조각(글, '4')
        if 자리:
            조각 = 글[자리[0]:자리[1]]
            셈 = [0]

            def 갈기(m):
                셈[0] += 1
                칸 = '4-%d' % 셈[0]
                if 칸 not in 넷:
                    return m.group(0)
                return (m.group(1) + html로(넷[칸].get('소제목', '')) + m.group(3) + m.group(4) +
                        m.group(5) + html로(넷[칸]['본문']) + m.group(7))

            조각 = re.sub(항목틀, 갈기, 조각, flags=re.S)
            글 = 글[:자리[0]] + 조각 + 글[자리[1]:]
    return 글


# ══════════════════════════════════════════════ 작성내용.md

절틀 = r'^##\s*(\d)구역[^\n]*\n(.*?)(?=^##\s|\Z)'
덩이틀 = r'```\n(.*?)\n```'


def md절들(원문):
    return {m.group(1): (m.start(2), m.end(2), m.group(2)) for m in re.finditer(절틀, 원문, re.S | re.M)}


# 4구역 항목은 품목마다 두 꼴이다 (설계 §0-③ — 34품목이 같은 구조가 아니다)
#   문단꼴  `① 심는 시기` + 다음 줄부터 본문
#   줄꼴    `1. 심는 시기 — 본문` 한 줄
# 읽을 때 둘 다 받고, 되박을 때는 원래 꼴을 그대로 지킨다.
줄꼴틀 = r'^\s*(?:[①②③④⑤]|\d+[.)])\s*(.+?)\s*—\s*(.+)$'


def md4파싱(본문):
    줄들 = [t for t in 본문.strip().split('\n') if t.strip()]
    짝 = [re.match(줄꼴틀, t) for t in 줄들]
    if 줄들 and all(짝):
        return [('줄', m.group(1).strip(), m.group(2).strip()) for m in 짝]
    나온것 = []
    for 조각 in re.split(r'\n\s*\n', 본문.strip()):
        줄 = [t for t in 조각.split('\n') if t.strip()]
        if not 줄:
            continue
        나온것.append(('문단', re.sub(r'^[①②③④⑤]\s*', '', 줄[0]).strip(), '\n'.join(줄[1:]).strip()))
    return 나온것


def md4쓰기(항목):
    if 항목 and 항목[0][0] == '줄':
        return '\n'.join('%d. %s — %s' % (i + 1, 제, ' '.join(본.split('\n')))
                         for i, (_, 제, 본) in enumerate(항목))
    return '\n\n'.join('%s %s\n%s' % ('①②③④⑤'[i], 제, 본) for i, (_, 제, 본) in enumerate(항목))


def md읽기(원문):
    값 = {}
    for n, (_, _, 몸) in md절들(원문).items():
        덩 = re.search(덩이틀, 몸, re.S)
        if not 덩:
            continue
        본문 = 덩.group(1).strip()
        if n == '4':
            for i, (_, 제, 본) in enumerate(md4파싱(본문)):
                if i >= 3:
                    break
                값['4-%d' % (i + 1)] = {'소제목': 제, '본문': 본}
        elif n in ('1', '2', '3', '5'):
            칸 = {'본문': 본문}
            if n in ('2', '3'):
                h = re.search(r'^소제목\s*:\s*(.+)$', 몸, re.M)
                칸['소제목'] = h.group(1).strip() if h else ''
            값[n] = 칸
    return 값


def md박기(원문, 새값):
    글 = 원문
    for n, (시, 끝, 몸) in sorted(md절들(글).items(), key=lambda x: -x[1][0]):
        관련 = {k: v for k, v in 새값.items() if k.split('-')[0] == n}
        if not 관련:
            continue
        덩 = re.search(덩이틀, 몸, re.S)
        if not 덩:
            continue
        if n == '4':
            항목 = md4파싱(덩.group(1))
            for i in range(min(3, len(항목))):
                칸 = 관련.get('4-%d' % (i + 1))
                if 칸:
                    항목[i] = (항목[i][0], 칸.get('소제목', ''), 칸['본문'])
            새몸 = md4쓰기(항목)
        else:
            새몸 = 관련[n]['본문']
            if n in ('2', '3') and 관련[n].get('소제목'):
                몸 = re.sub(r'^소제목\s*:\s*.+$', '소제목 : ' + 관련[n]['소제목'], 몸, count=1, flags=re.M)
                덩 = re.search(덩이틀, 몸, re.S)
        새절 = 몸[:덩.start(1)] + 새몸 + 몸[덩.end(1):]
        글 = 글[:시] + 새절 + 글[끝:]
    return 글


# ══════════════════════════════════════════════ 바깥에서 부르는 것

def 읽기(품목방, 코드=None):
    """(값, 출처). 값 = {칸: {소제목, 본문}} — 🔴 못 읽은 칸은 아예 안 담는다"""
    h = 제작본(품목방, 코드)
    if h.exists():
        return html읽기(h.read_text(encoding='utf-8')), '제작.html'
    m = 원고md(품목방)
    if m.exists():
        return md읽기(m.read_text(encoding='utf-8')), '작성내용.md'
    return {}, ''


def 박기(품목방, 새값, 코드=None):
    """고친 칸만 갈아 끼운다. 바뀐 파일 이름들을 돌려준다"""
    바뀐것 = []
    h = 제작본(품목방, 코드)
    if h.exists() and 새값:
        원본 = h.read_text(encoding='utf-8')
        새것 = html박기(원본, 새값)
        if 새것 != 원본:
            h.write_text(새것, encoding='utf-8')
            바뀐것.append('제작.html')
    m = 원고md(품목방)
    if m.exists() and 새값:
        원본 = m.read_text(encoding='utf-8')
        새것 = md박기(원본, 새값)
        if 새것 != 원본:
            m.write_text(새것, encoding='utf-8')
            바뀐것.append('작성내용.md')
    return 바뀐것


def 못읽은칸(값):
    return [k for k in 칸들 if k not in 값]
