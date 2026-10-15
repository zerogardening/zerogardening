#!/usr/bin/env python3
"""v3 「주문수집」을 누르시면 마켓플러스에서 5개 마켓 주문수집을 먼저 누른다 (2026-10-15 우람님).

    python3 통합관리/도구/마켓수집.py        # 예약(com.zerogardening.마켓수집)이 10초마다 부른다
    python3 통합관리/도구/마켓수집.py 지금    # 요청 없이 한 번 돌려 본다

왜 — 마켓플러스 자동수집은 30분 주기라, 막 들어온 주문은 카페24에 아직 없다.
흐름 — v3 가 `v3_공유설정` 의 「마켓수집」 줄에 {요청} 을 쓴다 → 여기서 보고 수집을 건다
      → {받은요청·끝·결과} 를 쓴다 → v3 가 받은요청==요청 이고 끝이 차면 카페24에서 받아온다(order-collect).
🔴 요청은 폰 시계, 시작·끝은 맥 시계다. 앞뒤 비교 말고 「받은요청」 같음으로 가린다.

🔴 단추를 누르지 않고 단추가 부르는 주소(`runManualCrawling`)를 페이지 안에서 직접 부른다.
   맥 화면이 꺼지면 크롬이 안 그려 클릭이 Timeout 난다(쿠팡보내기 `자리잡기` 주석).
🔴 마켓 목록은 화면에서 읽는다 — 계정이 늘거나 바뀌어도 여기 안 고친다.
🔴 2분 안에 또 누르셔도 다시 걸지 않는다(바깥 사이트에 부담 주지 않는다).
"""
import json
import sys
import time
import urllib.parse
import urllib.request
from datetime import datetime, timezone
from pathlib import Path

주소 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/v3_공유설정'
줄id = '마켓수집'
쉬는초 = 120
기다림 = 25    # ponytail: 실측 8~20초에 끝남. 늦는 마켓은 다음 자동수집(30분)이 메운다
도구 = Path('/Users/woorambaik/claude-projects/제로가드닝/상품/_도구/쿠팡보내기.py')


def 부르기(방법, 질의='', 몸=None):
    k = (Path.home() / '.zg_supabase_key').read_text().strip()
    req = urllib.request.Request(
        urllib.parse.quote(주소 + 질의, safe=':/?=&,.*'), method=방법,
        data=json.dumps(몸, ensure_ascii=False).encode() if 몸 is not None else None,
        headers={'apikey': k, 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json',
                 'Prefer': 'resolution=merge-duplicates,return=minimal'})
    with urllib.request.urlopen(req, timeout=15) as r:
        글 = r.read().decode()
    return json.loads(글) if 글 else None


def 지금():
    """🔴 v3 의 `new Date().toISOString()` 과 같은 꼴 — 글자 비교로 앞뒤를 가린다"""
    return datetime.now(timezone.utc).strftime('%Y-%m-%dT%H:%M:%S.%f')[:-3] + 'Z'


def 지난초(때):
    return (datetime.now(timezone.utc) - datetime.strptime(때, '%Y-%m-%dT%H:%M:%S.%fZ')
            .replace(tzinfo=timezone.utc)).total_seconds()


def 적기(내용):
    부르기('POST', '', [{'id': 줄id, '내용': 내용, '삭제됨': False}])


def 수집걸기():
    """마켓플러스에 수동 주문수집을 건다. 돌려주는 값 = 건 마켓 이름들"""
    import importlib.util
    s = importlib.util.spec_from_file_location('쿠팡보내기', 도구)
    m = importlib.util.module_from_spec(s)
    s.loader.exec_module(m)
    _, 쪽 = m.자리잡기()     # 🔴 자물쇠·화면깨우기·로그인까지 여기서 한다
    쪽.goto('https://mp.cafe24.com/mp/order/front/crawlSchedule',
            wait_until='domcontentloaded', timeout=40000)
    쪽.wait_for_selector('.eScheduleAccount', state='attached', timeout=20000)
    답 = 쪽.evaluate('''async () => {
      const 칸 = [...document.querySelectorAll(".eScheduleAccount")];
      const f = new URLSearchParams();
      칸.forEach(x => f.append("account_no_list[]", x.name));
      f.append("csrf_token", document.querySelector("input[name=csrf_token]").value);
      const r = await fetch("/mp/order/action/runManualCrawling", {method: "POST", body: f,
        headers: {"X-Requested-With": "XMLHttpRequest"}});
      return {상태: r.status, 글: (await r.text()).slice(0, 300),
              마켓: 칸.map(x => (x.closest("tr").cells[1] || {}).innerText || x.name)};
    }''')
    if 답['상태'] != 200:
        raise RuntimeError('마켓플러스 %s — %s' % (답['상태'], 답['글']))
    time.sleep(기다림)
    return [글.strip() for 글 in 답['마켓']]


def 한바퀴(억지=False):
    줄 = 부르기('GET', '?id=eq.%s&select=내용' % 줄id) or [{}]
    내용 = 줄[0].get('내용') or {}
    요청, 시작 = 내용.get('요청') or '', 내용.get('시작') or ''
    if not 억지 and (not 요청 or 요청 == 내용.get('받은요청')):
        return
    내용['받은요청'] = 요청
    # 🔴 시작을 먼저 적는다 — 도는 동안 다음 바퀴가 같은 요청을 또 잡지 않게
    if 시작 and 지난초(시작) < 쉬는초:
        적기(dict(내용, 끝=지금(), 결과='방금 모았습니다'))
        return
    시작 = 지금()
    적기(dict(내용, 시작=시작, 끝='', 결과=''))
    # 🔴 다른 작업이 크롬을 쥐고 있으면 45초까지 기다린다 — 수집 25초를 더해도 v3 의 90초 안이다
    자물쇠 = Path('/tmp/zg_마켓플러스.lock')
    for _ in range(9):
        if not 자물쇠.exists():
            break
        time.sleep(5)
    try:
        결과 = '✅ ' + '·'.join(수집걸기())
    except (SystemExit, Exception) as e:     # 자물쇠·열쇠가 없으면 sys.exit 로 온다
        결과 = '❌ ' + str(e).split('\n')[0].lstrip('❌ ')[:120]
    # 🔴 실패는 「방금 돌았다」로 치지 않는다 — 고치고 바로 다시 누르시면 돌아야 한다
    적기(dict(내용, 시작=시작 if 결과[0] == '✅' else 내용.get('시작', ''), 끝=지금(), 결과=결과))
    print(time.strftime('[%m/%d %H:%M:%S]'), 결과)


if __name__ == '__main__':
    한바퀴(억지=sys.argv[1:] == ['지금'])
