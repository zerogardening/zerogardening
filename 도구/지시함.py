#!/usr/bin/env python3
"""폰·웹에서 쌓아 두신 지시를 맥이 꺼내 Claude 에게 시키고, 같은 줄에 답장을 적는다 (16단계).

    python3 통합관리/도구/지시함.py          # 한 건 집어 처리한다 (일꾼.py 가 60초마다 부른다)
    python3 통합관리/도구/지시함.py 보기      # 지금 쌓인 것만 찍는다 (아무것도 안 한다)

주고받는 자리는 Supabase `v3_지시` 표다. 줄 하나가 「지시 + 그 답장」이다 (16단계-지시함.sql).
🔴 열쇠·REST 호출은 제작요청.py 것을 그대로 쓴다 — 규칙이 갈리면 표가 둘로 갈린다.

🔴 위험한 일을 거르는 로직이 여기 없다. **연장을 안 줘서** 막는다 —
   `--allowedTools` 에 Bash 가 없으면 지우기·push·결제가 **애초에 불가능하다.**
   글로 거르면 우회당한다. 연장이 없으면 우회할 것이 없다. (2026-09-14 시험으로 확인)

🔴 커밋·push 는 Claude 가 아니라 **이 스크립트가** 한다. 무엇이 올라가는지 여기서 다 보인다.
   그리고 **Claude 가 만진 파일만** 올린다 — 돌리기 전후의 `git status` 를 견줘서 고른다.
   `git add -A` 를 쓰지 않는다. 다른 창 작업이 딸려 나간 적이 있다.
"""
import json
import re
import subprocess
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from 제작요청 import 키, 부르기, 표                     # noqa: E402

뿌리 = Path(__file__).resolve().parents[2]              # 제로가드닝/ — ops 저장소이자 Claude 가 일할 창
주소 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/'

# 🔴 Bash 가 없다. 이 한 줄이 「지우기·push·돈 나가는 일 금지」의 전부다
도구들 = 'Read,Write,Edit,Glob,Grep,WebSearch,WebFetch,TodoWrite'
상한초 = 30 * 60          # 한 건에 30분. 넘으면 끊고 '실패' 로 적는다
버림초 = 45 * 60          # '하는중' 인데 이만큼 지났으면 맥이 꺼졌던 것이다 — 다시 집는다
쉴유휴초 = 60             # 우람님이 이 안에 무언가 입력하셨으면 이번 바퀴는 건너뛴다
답장상한 = 1500           # 폰 채팅에 뜨는 글이다. 길면 못 읽는다


# ══════════════════════════════════════════════ 우람님이 쓰고 계신가

def 유휴초():
    """마지막 키보드·마우스 입력 뒤 몇 초 지났나. 못 재면 999 — 못 쟀다고 멈추지는 않는다"""
    try:
        r = subprocess.run(['ioreg', '-c', 'IOHIDSystem'], capture_output=True, text=True, timeout=10)
        m = re.search(r'"HIDIdleTime"\s*=\s*(\d+)', r.stdout)
        return int(m.group(1)) / 1e9 if m else 999
    except Exception:
        return 999


# ══════════════════════════════════════════════ 표 주고받기

def 올리기(행들):
    if not 행들:
        return
    k = 키()
    req = urllib.request.Request(
        주소 + urllib.parse.quote('v3_지시'), method='POST',
        data=json.dumps(행들, ensure_ascii=False).encode(),
        headers={'apikey': k, 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json',
                 'Prefer': 'resolution=merge-duplicates,return=minimal'})
    urllib.request.urlopen(req).read()


def 줄들():
    """{id: 내용} — 안 지운 것만. id 가 곧 시간순이다.
    🔴 표가 아직 없으면(404) None 을 준다 — 조용히 넘어가야 한다.
       우람님이 `16단계-지시함.sql` 을 돌리시기 전까지 1분마다 빨간 줄이 쌓이면 로그를 못 읽는다."""
    try:
        답 = 부르기(표('v3_지시') + '?select=id,내용,삭제됨') or []
    except urllib.error.HTTPError as e:
        if e.code == 404:
            return None
        raise
    return {r['id']: (r.get('내용') or {}) for r in 답 if not r.get('삭제됨')}


def 적기(줄id, 내용, **고칠것):
    새 = dict(내용)
    새.update(고칠것)
    올리기([{'id': 줄id, '내용': 새, '삭제됨': False}])
    return 새


def 집을것(모두):
    """제일 오래된 '대기' 하나. 버려진 '하는중' 이 있으면 그게 먼저다"""
    이제 = time.time() * 1000
    버려진 = [(i, c) for i, c in 모두.items()
              if c.get('상태') == '하는중' and 이제 - (c.get('집은때') or 0) > 버림초 * 1000]
    if 버려진:
        return sorted(버려진)[0]
    # 🔴 살아 있는 '하는중' 이 있으면 아무것도 안 집는다 — 한 번에 한 건이다
    if any(c.get('상태') == '하는중' for c in 모두.values()):
        return None
    대기 = [(i, c) for i, c in 모두.items() if (c.get('상태') or '대기') == '대기']
    return sorted(대기)[0] if 대기 else None


# ══════════════════════════════════════════════ Claude 부르기

머리말 = """아래는 우람님이 폰이나 웹에서 남기신 지시다. 그대로 수행해라.

🔴 이 창은 사람이 보고 있지 않다. 되물을 수 없으니 막히면 막힌 대로 답해라.
🔴 git·push·삭제·결제는 네가 하지 않는다 — 연장 자체가 없다. 커밋은 끝난 뒤 스크립트가 한다.
🔴 다 끝나면 **마지막 줄에 `답장:` 으로 시작하는 한두 문장**을 적어라.
   우람님 폰 채팅에 그대로 뜬다. 무엇을 했고 어디를 보시면 되는지만 적는다.

── 지시 ──
%s
"""


def 부르기클로드(글):
    """(성공?, 화면에 찍힌 것) — 시간이 넘으면 끊는다"""
    r = subprocess.run(
        ['claude', '-p', 머리말 % 글, '--allowedTools', 도구들],
        capture_output=True, text=True, cwd=str(뿌리), timeout=상한초)
    return r.returncode == 0, (r.stdout or '') + (('\n' + r.stderr) if r.stderr.strip() else '')


def 답장뽑기(찍힌것):
    """`답장:` 줄이 있으면 그것. 없으면 마지막 몇 줄"""
    줄 = [t.strip() for t in (찍힌것 or '').split('\n') if t.strip()]
    for t in reversed(줄):
        if t.startswith('답장:'):
            return t[3:].strip()[:답장상한]
    return ('\n'.join(줄[-6:]) if 줄 else '아무 말도 없이 끝났습니다')[:답장상한]


# ══════════════════════════════════════════════ 커밋 — Claude 가 만진 것만

def 손댄것():
    r = subprocess.run(['git', 'status', '--porcelain'], cwd=str(뿌리),
                       capture_output=True, text=True)
    return {t[3:] for t in r.stdout.split('\n') if t.strip()}


def 커밋(전, 글):
    """Claude 가 새로 만지거나 만든 것만 올린다. ops 저장소는 결과물이라 push 까지 간다"""
    새것 = sorted(손댄것() - 전)
    if not 새것:
        return ''
    subprocess.run(['git', 'add', '--'] + 새것, cwd=str(뿌리), check=True)
    쪽지 = ('[야간] %s\n\n우람님 지시를 맥이 혼자 처리한 것이다 (16단계 지시함).\n'
            '되돌리기: 도구/야간되돌리기.sh\n' % 글.strip().split('\n')[0][:60])
    subprocess.run(['git', 'commit', '-q', '-m', 쪽지], cwd=str(뿌리), check=True)
    밀림 = subprocess.run(['git', 'push'], cwd=str(뿌리), capture_output=True, text=True)
    r = subprocess.run(['git', 'log', '-1', '--format=%h'], cwd=str(뿌리),
                       capture_output=True, text=True)
    return '%s · 파일 %d개%s' % (r.stdout.strip(), len(새것),
                                '' if 밀림.returncode == 0 else ' · 🔴 push 실패')


# ══════════════════════════════════════════════ 한 건

def 한건():
    모두 = 줄들()
    if 모두 is None:
        return None     # 표가 아직 없다 — 16단계-지시함.sql 을 돌리시면 곧바로 산다
    것 = 집을것(모두)
    if not 것:
        return None
    if 유휴초() < 쉴유휴초:
        return None          # 우람님이 쓰고 계신다. 조용히 다음 바퀴에

    줄id, 내용 = 것
    글 = (내용.get('글') or '').strip()
    if not 글:
        적기(줄id, 내용, 상태='실패', 답장='지시가 비어 있습니다', 답한때=int(time.time() * 1000))
        print('⚠️ %s — 빈 지시' % 줄id); return '빈지시'

    내용 = 적기(줄id, 내용, 상태='하는중', 집은때=int(time.time() * 1000))
    print('🛠  %s — %s' % (줄id, 글[:60]))
    sys.stdout.flush()

    전 = 손댄것()
    잰때 = time.time()
    try:
        됐나, 찍힌것 = 부르기클로드(글)
    except subprocess.TimeoutExpired:
        적기(줄id, 내용, 상태='실패', 답한때=int(time.time() * 1000),
             걸린초=int(time.time() - 잰때),
             답장='%d분이 넘어 끊었습니다. 일이 너무 컸거나 막혔습니다.' % (상한초 // 60))
        print('❌ %s — 시간 초과' % 줄id); return '시간초과'
    except Exception as e:
        적기(줄id, 내용, 상태='실패', 답한때=int(time.time() * 1000),
             걸린초=int(time.time() - 잰때), 답장='Claude 를 부르지 못했습니다 — %s' % e)
        print('❌ %s — %s' % (줄id, e)); return '실패'

    답 = 답장뽑기(찍힌것)
    자국 = ''
    try:
        자국 = 커밋(전, 글)
    except Exception as e:
        답 += '\n(커밋은 못 했습니다 — %s)' % e

    적기(줄id, 내용, 상태='됨' if 됐나 else '실패', 답장=답, 답한때=int(time.time() * 1000),
         걸린초=int(time.time() - 잰때), 커밋=자국)
    말 = '%s %s — %d초%s' % ('✅' if 됐나 else '❌', 줄id, time.time() - 잰때,
                            ' · ' + 자국 if 자국 else '')
    print(말)
    return 말


def 보기():
    모두 = 줄들()
    if 모두 is None:
        return print('🔴 v3_지시 표가 아직 없습니다 — v3/설계/16단계-지시함.sql 을 Supabase 에서 돌리십시오')
    if not 모두:
        print('지시함이 비어 있습니다')
        return
    for i in sorted(모두):
        c = 모두[i]
        print('  %-6s %-8s %s' % (c.get('상태') or '대기', (c.get('누가') or '?'),
                                  (c.get('글') or '')[:60]))
        if c.get('답장'):
            print('         ↳ %s' % c['답장'][:100].replace('\n', ' '))


def 점검():
    """표 없이 되는 곳만 스스로 확인한다. 고치고 나면 이것부터 돌린다"""
    assert 답장뽑기('이것저것\n답장: 끝냈습니다') == '끝냈습니다'
    assert 답장뽑기('답장 줄이 없다') == '답장 줄이 없다'
    assert 답장뽑기('') == '아무 말도 없이 끝났습니다'
    assert len(답장뽑기('답장: ' + 'ㄱ' * 3000)) == 답장상한
    이제 = time.time() * 1000
    모 = {'1-a': {'상태': '됨'}, '3-c': {'상태': '대기'}, '2-b': {'상태': '대기'}}
    assert 집을것(모)[0] == '2-b', '오래된 것부터 집어야 한다'
    모['9-z'] = {'상태': '하는중', '집은때': 이제}
    assert 집을것(모) is None, '살아있는 하는중이 있으면 안 집는다'
    모['9-z']['집은때'] = 이제 - (버림초 + 60) * 1000
    assert 집을것(모)[0] == '9-z', '버려진 하는중은 다시 집는다'
    assert 'Bash' not in 도구들, '🔴 Bash 가 끼면 지우기·push 가 뚫린다'
    assert 유휴초() >= 0
    print('✅ 점검 통과 — 답장뽑기 4 · 집을것 3 · 연장목록 1')


if __name__ == '__main__':
    if len(sys.argv) > 1 and sys.argv[1] == '점검':
        점검()
    elif len(sys.argv) > 1 and sys.argv[1] == '보기':
        보기()
    else:
        한건()
