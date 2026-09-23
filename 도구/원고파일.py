#!/usr/bin/env python3
"""상세페이지 원고 7칸을 `발행이미지/제작.html` · `작성내용.md` 에서 뽑고 되박는다 (15단계 B).

🔴 이미지에 찍히는 글은 `작성내용.md` 가 아니라 `발행이미지/제작.html` 이다 (설계 §0-②).
   `.md` 로 초안을 쓰고 편집기에서 손본 것이 `.html` 에만 남는다 — 원본은 html 이다.
   html 이 아직 없는 품목(첫 제작 전)은 md 를 읽는다. 둘 다 없으면 빈 값이다.

🔴 「34품목 전부 같은 구조」가 아니다 (설계 §0-③).
   못 읽은 칸은 **지어내지 않는다.** 아예 돌려주지 않으니 화면에서도 저장 대상에서 빠진다.
   4구역에 ④가 있는 품목이 3개 있다(아스타 베스차토·아폴로·피터해리슨) — ④까지 읽고 되박는다.
   다만 `칸목록()` 에는 안 넣는다(`선택칸들`) — 없는 품목을 「못 읽었다」로 세면 안 된다.

🔴 손대지 않은 구역은 바이트 그대로 둔다. `&nbsp;`(줄바꿈 막이)가 살아 있어야 조판이 안 흐트러진다.
"""
import html as _html
import re

칸들 = ['1', '2', '3', '4-1', '4-2', '4-3', '5', '5-간격']   # 화분묘 — 옛 이름을 그대로 둔다
# 🔴 2026-09-23 우람님 「글 나오는 자리는 다 고칠 수 있어야 한다」 —
#    구근은 3구역이 `.grow` 3항목(언제 심나요·깊이와 방향·어디에 심나요)이고 6구역에 `@발송설명` 글이 있다.
#    `.desc` 하나로 보던 옛 코드는 구근 13품목의 3·6구역을 통째로 못 읽었다.
구근칸들 = ['1', '2', '2-계열', '2-둘레', '3-1', '3-2', '3-3', '3-깊이', '3-간격',
          '4-1', '4-2', '4-3', '5', '5-규격', '6']
소제목있는칸 = {'2', '3', '3-1', '3-2', '3-3', '4-1', '4-2', '4-3', '4-4'}

# 🔴 조판된 `제작.html` 에만 있는 칸이다 — `작성내용.md` 에는 대응하는 자리가 아예 없다 (15단계B §3).
#    html 이 아직 없는 품목(첫 제작 전 8품목)까지 「못 읽었다」로 세면 거짓 경고가 된다.
html전용 = {'2-계열', '2-둘레', '3-깊이', '3-간격', '5-규격', '5-간격'}

# 🔴 있는 품목에만 있는 칸이다(아스타 3품목의 4구역 ④). 없는 품목을 「못 읽었다」로 세지 않는다
선택칸들 = ['4-4']


def 칸목록(구근=False, html=True):
    """그 폼이 **가지고 있어야 할** 칸. 못 읽은 칸을 가리는 자(尺)다 — v3/js/06h-원고자료.js 와 같아야 한다."""
    ㄱ = list(구근칸들 if 구근 else 칸들)
    return ㄱ if html else [k for k in ㄱ if k not in html전용]


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

# 🔴 굵은 글씨는 `**…**` 로 주고받는다 (2026-09-23).
#    전엔 html→평문→html 을 돌면 `<b style="font-weight:500">둘레</b>` 의 굵기가 통째로 날아갔다 —
#    5·6구역 첫 문장이 거기 걸려 있어 한 글자만 고쳐도 강조가 사라졌다.
굵은틀 = r'<(b|strong)\b[^>]*>(.*?)</\1>'
굵은표 = r'\*\*(.+?)\*\*'
굵은html = '<b style="font-weight:500">%s</b>'


def 글로(조각):
    t = re.sub(굵은틀, lambda m: '**' + m.group(2) + '**', 조각, flags=re.S)
    t = re.sub(r'<br\s*/?>', '\n', t)
    t = t.replace('&nbsp;', ' ')
    t = re.sub(r'<[^>]+>', '', t)
    t = _html.unescape(t)
    return re.sub(r'[ \t]+', ' ', t).strip()


def html로(글):
    """여러 줄은 한 줄로 합친다 — .lead·.desc·p 는 조판이 알아서 흘린다.
    🔴 고친 구역의 `&nbsp;` 손질은 사라진다. 어차피 문장이 바뀌는 자리라 받아들인다(설계 §0-②)."""
    한줄 = ' '.join(t.strip() for t in str(글).split('\n') if t.strip())
    t = _html.escape(한줄, quote=False)
    return re.sub(굵은표, lambda m: 굵은html % m.group(1), t, flags=re.S)


def 구역조각(원문, n):
    """`id="sN"` 부터 다음 구역 앞까지.
    🔴 2026-09-23 — class·id 순서를 고정하면 안 된다. 화분묘는 `class="sec" id="s1"`,
       구근은 `id="s1" class="sec"` 로 반대라 예전 정규식이 구근 품목을 전부 못 읽었다
       (읽은 0/7). lookahead 로 순서 무관하게 잡는다."""
    m = re.search(r'<div\b(?=[^>]*\bid="s%s")[^>]*>' % n, 원문)
    if not m:
        return None
    뒤 = re.search(r'<div\b(?=[^>]*\bid="s\d")[^>]*>', 원문[m.end():])
    끝 = m.end() + (뒤.start() if 뒤 else len(원문) - m.end())
    # 🔴 마지막 구역(6)은 뒤에 구역이 없어 **해설까지 통째로** 딸려 온다. 해설 머리(`znum`) 앞에서 끊는다 —
    #    안 끊으면 해설 안의 `.desc` 를 6구역 본문으로 잘못 집을 수 있다. 끝만 줄이니 앞 자리는 안 바뀐다.
    해설 = re.search(r'class="znum"', 원문[m.end():끝])
    if 해설:
        끝 = m.end() + 해설.start()
    return (m.start(), 끝)


def 블록(글, 여는틀):
    """`<div class="mini">` 처럼 **안에 또 div 가 든** 덩이를 짝 맞춰 잘라낸다.
    🔴 정규식 `(.*?)</div>` 로는 첫 안쪽 닫는 태그에서 끊겨 `.mini` 의 둘째 칸을 놓친다.
    돌려주는 것 = (여는시작, 여는끝, 닫는시작, 닫는끝)."""
    m = re.search(여는틀, 글)
    if not m:
        return None
    깊이 = 1
    for t in re.finditer(r'<(/?)div\b[^>]*?(/?)>', 글[m.end():]):
        if t.group(2) == '/':          # <div/> 같은 홑태그는 깊이를 안 바꾼다
            continue
        깊이 += -1 if t.group(1) else 1
        if 깊이 == 0:
            return (m.start(), m.end(), m.end() + t.start(), m.end() + t.end())
    return None


칸틀 = {
    # 🔴 2026-09-23 — `[^>]*` 를 넣어 여는 태그의 다른 속성(구근 5구역의 `style="padding-top:…"`)을 허용한다.
    #    전엔 `class="desc">` 뒤에 바로 `>` 가 와야만 잡혀 그런 품목은 조용히 못 읽혔다.
    '1': r'(<div class="lead"[^>]*>)(.*?)(</div>)',
    '2': r'(<div class="desc"[^>]*>)(.*?)(</div>)',
    '3': r'(<div class="desc"[^>]*>)(.*?)(</div>)',
    '5': r'(<div class="desc"[^>]*>)(.*?)(</div>)',
    # 6구역은 구근에만 글이 있다(`@발송설명`). 화분묘 6구역은 `.desc` 가 아예 없어 저절로 안 잡힌다
    '6': r'(<div class="desc"[^>]*>)(.*?)(</div>)',
}
머리틀 = r'<span class="(?:kr|en)">(.*?)</span>'
항목틀 = r'(<div class="st">)(.*?)(</div>)(\s*)(<p>)(.*?)(</p>)'
홑칸구역 = ('1', '2', '3', '5', '6')


def 항목꼴(조각):
    """3항목(`.grow`)으로 된 구역이냐 — 구근 3구역과 4구역이 이 꼴이다"""
    return 'class="grow"' in 조각


def 구근꼴(원문):
    """폼을 **파일 생김새로** 가른다 — 3구역이 `.grow` 3항목이면 구근이다.
    이름 목록(제작요청.구근인가)에 안 기대는 쪽이 안전하다. 읽는 것은 결국 파일이다."""
    자리 = 구역조각(원문, '3')
    return bool(자리) and 항목꼴(원문[자리[0]:자리[1]])


# ══════════════════════════════════════════════ 한 줄 칸 (2026-09-23 · 15단계B §4-2)
# 상세페이지에 가장 크게 찍히는데 여태 칸이 없던 자리들이다 —
# 「12cm+」·「둘레 12cm 이상」·「더블 얼리」·「10-15cm」·「40-50cm」.
# 우람님 「구근 크기가 편집이 안 된다」의 절반이 여기였다(나머지 절반은 5구역 글자수 상한).

미니틀 = r'<div class="mini"[^>]*>'
규격틀 = r'<div class="sizes"[^>]*>'
간격틀 = r'<div class="sp-dim"[^>]*>'
깊이text = r'(<text[^>]*fill="#5C7A4A"[^>]*font-weight="500"[^>]*>)(.*?)(</text>)'
간격text = r'(<text[^>]*text-anchor="middle"[^>]*>)(.*?)(</text>)'
스팬틀 = r'(<span[^>]*>)(.*?)(</span>)'


def _안(조각, 여는틀):
    b = 블록(조각, 여는틀)
    return (조각[b[1]:b[2]], b) if b else (None, None)


def _되박기(조각, b, 새안):
    return 조각[:b[1]] + 새안 + 조각[b[2]:]


def 미니읽기(조각):
    안, _ = _안(조각, 미니틀)
    if 안 is None:
        return {}
    값, 스 = {}, re.findall(스팬틀, 안, re.S)
    for i, 칸 in enumerate(('2-계열', '2-둘레')):
        if i < len(스):
            값[칸] = {'본문': 글로(스[i][1])}
    return 값


def 미니박기(조각, 관련):
    안, b = _안(조각, 미니틀)
    if 안 is None:
        return 조각
    셈 = [0]

    def 갈기(m):
        셈[0] += 1
        칸 = {1: '2-계열', 2: '2-둘레'}.get(셈[0])
        return (m.group(1) + html로(관련[칸]['본문']) + m.group(3)) if (칸 and 칸 in 관련) else m.group(0)

    return _되박기(조각, b, re.sub(스팬틀, 갈기, 안, flags=re.S))


def 규격읽기(조각):
    """`.sizes` 첫 칸 = 그 상품의 규격(`12cm+` + `둘레 12cm 이상`). 둘째 칸은 500원 동전 — 고정이라 안 연다"""
    안, _ = _안(조각, 규격틀)
    if 안 is None:
        return {}
    큰 = re.search(r'<b[^>]*>(.*?)</b>', 안, re.S)
    작 = re.search(r'<small[^>]*>(.*?)</small>', 안, re.S)
    if not 큰:
        return {}
    return {'5-규격': {'소제목': 글로(큰.group(1)), '본문': 글로(작.group(1)) if 작 else ''}}


def 규격박기(조각, 값):
    안, b = _안(조각, 규격틀)
    if 안 is None:
        return 조각
    안 = re.sub(r'(<b[^>]*>)(.*?)(</b>)',
                lambda m: m.group(1) + html로(값.get('소제목', '')) + m.group(3), 안, count=1, flags=re.S)
    안 = re.sub(r'(<small[^>]*>)(.*?)(</small>)',
                lambda m: m.group(1) + html로(값.get('본문', '')) + m.group(3), 안, count=1, flags=re.S)
    return _되박기(조각, b, 안)


def 간격읽기(조각):
    안, _ = _안(조각, 간격틀)
    if 안 is None:
        return {}
    스 = re.findall(스팬틀, 안, re.S)
    return {'5-간격': {'본문': 글로(스[0][1])}} if 스 else {}


def 간격박기(조각, 값):
    """🔴 `.sp-dim` 의 치수는 두 칸이 **같은 값**이다. 한쪽만 고치면 그림이 어긋난다"""
    안, b = _안(조각, 간격틀)
    if 안 is None:
        return 조각
    새 = re.sub(스팬틀, lambda m: m.group(1) + html로(값['본문']) + m.group(3), 안, flags=re.S)
    return _되박기(조각, b, 새)


def 단면읽기(조각):
    값 = {}
    for 칸, 틀 in (('3-깊이', 깊이text), ('3-간격', 간격text)):
        m = re.search(틀, 조각, re.S)
        if m:
            값[칸] = {'본문': 글로(m.group(2))}
    return 값


def 단면박기(조각, 관련):
    for 칸, 틀 in (('3-깊이', 깊이text), ('3-간격', 간격text)):
        if 칸 in 관련:
            조각 = re.sub(틀, lambda m: m.group(1) + html로(관련[칸]['본문']) + m.group(3),
                         조각, count=1, flags=re.S)
    return 조각


def 항목읽기(조각, 접두, 수=4):
    """④가 있는 품목이 3개 있다(아스타 베스차토·아폴로·피터해리슨) — 넷째까지 읽는다"""
    값 = {}
    for i, m in enumerate(re.finditer(항목틀, 조각, re.S)):
        if i >= 수:
            break
        값['%s-%d' % (접두, i + 1)] = {'소제목': 글로(m.group(2)), '본문': 글로(m.group(6))}
    return 값


def 항목박기(조각, 관련, 접두):
    셈 = [0]

    def 갈기(m):
        셈[0] += 1
        칸 = '%s-%d' % (접두, 셈[0])
        if 칸 not in 관련:
            return m.group(0)
        return (m.group(1) + html로(관련[칸].get('소제목', '')) + m.group(3) + m.group(4) +
                m.group(5) + html로(관련[칸]['본문']) + m.group(7))

    return re.sub(항목틀, 갈기, 조각, flags=re.S)


def html읽기(원문):
    값 = {}
    for n in 홑칸구역:
        자리 = 구역조각(원문, n)
        if not 자리:
            continue
        조각 = 원문[자리[0]:자리[1]]
        if n == '2':
            값.update(미니읽기(조각))                 # 구근만 — 화분묘엔 `.mini` 가 없어 빈 값이다
        if n == '5':
            값.update(규격읽기(조각))                 # 구근 `.sizes`
            값.update(간격읽기(조각))                 # 화분묘 `.sp-dim`
        if n == '3' and 항목꼴(조각):        # 구근 — 「심는 법」 3항목
            값.update(항목읽기(조각, '3', 3))
            값.update(단면읽기(조각))                 # 단면도 SVG 의 깊이·간격 치수
            continue
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
        값.update(항목읽기(원문[자리[0]:자리[1]], '4'))
    return 값


def html박기(원문, 새값):
    """새값 = {칸: {소제목, 본문}} — 준 칸만 갈아 끼운다. 나머지는 바이트 그대로다"""
    글 = 원문
    for n in 홑칸구역:
        관련 = {k: v for k, v in 새값.items() if k.split('-')[0] == n}
        if not 관련:
            continue
        자리 = 구역조각(글, n)
        if not 자리:
            continue
        새조각 = 글[자리[0]:자리[1]]
        if n == '2' and ('2-계열' in 관련 or '2-둘레' in 관련):
            새조각 = 미니박기(새조각, 관련)
        if n == '5' and '5-규격' in 관련:
            새조각 = 규격박기(새조각, 관련['5-규격'])
        if n == '5' and '5-간격' in 관련:
            새조각 = 간격박기(새조각, 관련['5-간격'])
        if n == '3' and 항목꼴(새조각):
            새조각 = 단면박기(항목박기(새조각, 관련, '3'), 관련)
        elif n in 관련:
            조각 = 새조각
            m = re.search(칸틀[n], 조각, re.S)
            if m:
                앞 = re.match(r'\s*(?:<br\s*/?>\s*)*', m.group(2)).group(0)   # 5구역의 앞 <br> 은 조판이다
                새조각 = 조각[:m.start()] + m.group(1) + 앞 + html로(관련[n]['본문']) + m.group(3) + 조각[m.end():]
                if n in ('2', '3') and 관련[n].get('소제목'):
                    새조각 = re.sub(머리틀,
                                    lambda h: h.group(0).replace(h.group(1), html로(관련[n]['소제목'])),
                                    새조각, count=1, flags=re.S)
        글 = 글[:자리[0]] + 새조각 + 글[자리[1]:]

    넷 = {k: v for k, v in 새값.items() if k.startswith('4-')}
    if 넷:
        자리 = 구역조각(글, '4')
        if 자리:
            조각 = 항목박기(글[자리[0]:자리[1]], 넷, '4')
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


def md읽기(원문, 구근=False):
    """🔴 구근 md 의 3구역은 덩이가 **하나뿐**이다(`@자리`. 「언제 심나요」·「깊이와 방향」은 조판 고정문구).
       세 칸 중 어느 것인지 md 만 보고는 못 가린다 — **지어내지 않고 아예 안 돌려준다**(설계 §0-③)."""
    값 = {}
    for n, (_, _, 몸) in md절들(원문).items():
        덩 = re.search(덩이틀, 몸, re.S)
        if not 덩:
            continue
        본문 = 덩.group(1).strip()
        if n == '3' and 구근:
            continue
        if n == '4':
            for i, (_, 제, 본) in enumerate(md4파싱(본문)):
                if i >= 4:
                    break
                값['4-%d' % (i + 1)] = {'소제목': 제, '본문': 본}
        elif n in ('1', '2', '3', '5', '6'):
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
            for i in range(min(4, len(항목))):
                칸 = 관련.get('4-%d' % (i + 1))
                if 칸:
                    항목[i] = (항목[i][0], 칸.get('소제목', ''), 칸['본문'])
            새몸 = md4쓰기(항목)
        else:
            if n not in 관련:
                continue          # 구근 3구역 — md 는 덩이가 하나라 3-1·3-2·3-3 을 못 되박는다
            새몸 = 관련[n]['본문']
            if n in ('2', '3') and 관련[n].get('소제목'):
                몸 = re.sub(r'^소제목\s*:\s*.+$', '소제목 : ' + 관련[n]['소제목'], 몸, count=1, flags=re.M)
                덩 = re.search(덩이틀, 몸, re.S)
        새절 = 몸[:덩.start(1)] + 새몸 + 몸[덩.end(1):]
        글 = 글[:시] + 새절 + 글[끝:]
    return 글


# ══════════════════════════════════════════════ 바깥에서 부르는 것

def 읽기(품목방, 코드=None, 구근=None):
    """(값, 출처). 값 = {칸: {소제목, 본문}} — 🔴 못 읽은 칸은 아예 안 담는다.
    🔴 2026-09-23 — 폴백이 **칸 단위**다. 전엔 html 에서 한 칸이라도 읽히면 md 를 아예 안 봤다.
       홍띠·자엽펜스테몬은 `제작.html` 에 6구역만 다시 뽑아 둔 탓에 나머지 구역이 통째로 편집 불가였다."""
    값, 출처 = {}, ''
    h = 제작본(품목방, 코드)
    if h.exists():
        원문 = h.read_text(encoding='utf-8')
        if 구근 is None:
            구근 = 구근꼴(원문)
        값 = html읽기(원문)
        출처 = '제작.html'
    m = 원고md(품목방)
    빠진 = [k for k in 칸목록(bool(구근), h.exists()) + 선택칸들 if k not in 값]
    if 빠진 and m.exists():
        보탬 = md읽기(m.read_text(encoding='utf-8'), bool(구근))
        더한것 = False
        for k in 빠진:
            if k in 보탬:
                값[k] = 보탬[k]
                더한것 = True
        if 더한것:
            출처 = (출처 + '+작성내용.md') if 출처 else '작성내용.md'
    return 값, 출처


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


def 못읽은칸(값, 구근=False, html=True):
    return [k for k in 칸목록(구근, html) if k not in 값]
