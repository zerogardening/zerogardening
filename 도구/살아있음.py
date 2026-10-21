#!/usr/bin/env python3
"""아이맥이 5분마다 서버에 「살아있음」을 찍는다 (31단계 · launchd `com.zerogardening.살아있음`).

    python3 통합관리/도구/살아있음.py          # 한 번 찍는다
    python3 통합관리/도구/살아있음.py 보기     # 서버에 찍힌 줄을 본다

10/21 10:45 메모리 부족으로 멈춰 재시동 → FileVault 로그인 화면에서 22:54 까지 섰는데 아무도 몰랐다.
아이맥이 죽으면 스스로 알릴 수 없다 → 서버(Edge `imac-watch`, pg_cron 5분)가 이 줄이 15분 넘게
안 바뀌면 폰에 알린다.

🔴 줄은 `v3_공유설정` 의 id='아이맥'(마켓수집·서버상태와 같은 꼴). `v3_지시` 에 얹으면
   지시 화면에 뜨고 지시함.py 가 「허브로」 넘긴다.
🔴 서버엔 푸시 비밀열쇠가 없다(Secrets 쓰기 403). 그래서 꺼짐 알림을 **여기서 미리 봉해**
   `짐` 에 얹어 둔다 — 서버는 쏘기만 한다. 출입증은 23시간짜리라 끊긴 뒤 23시간까지 알린다.
🔴 「다시 살아남」은 서버가 못 봉한다 → 여기서 `아이맥알림` 줄이 꺼짐이면 보내고 푼다.
"""
import json
import re
import subprocess
import sys
import urllib.parse
import urllib.request
from datetime import datetime, timezone, timedelta
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
import 푸시                                           # noqa: E402
from 제작요청 import 키                               # noqa: E402

주소 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/v3_공유설정'
낮은메모리 = 15      # % 미만이 3번 연속(15분)이면 폰에 한 번
KST = timezone(timedelta(hours=9))


def 부르기(방법, 질의='', 몸=None):
    k = 키()
    req = urllib.request.Request(
        urllib.parse.quote(주소 + 질의, safe=':/?=&,.*'), method=방법,
        data=json.dumps(몸, ensure_ascii=False).encode() if 몸 is not None else None,
        headers={'apikey': k, 'Authorization': 'Bearer ' + k, 'Content-Type': 'application/json',
                 'Prefer': 'resolution=merge-duplicates,return=minimal'})
    with urllib.request.urlopen(req, timeout=20) as r:
        글 = r.read().decode()
    return json.loads(글) if 글 else None


def 줄(id):
    답 = 부르기('GET', '?select=내용&id=eq.' + id) or []
    return (답[0].get('내용') or {}) if 답 else {}


def 적기(id, 내용):
    부르기('POST', '', [{'id': id, '내용': 내용, '삭제됨': False}])


def 메모리():
    글 = subprocess.run(['memory_pressure'], capture_output=True, text=True, timeout=30).stdout
    m = re.search(r'free percentage:\s*(\d+)%', 글)
    return int(m.group(1)) if m else None


def 클로드수():
    글 = subprocess.run(['pgrep', '-f', 'native-binary/claude'], capture_output=True, text=True).stdout
    return len(글.split())


def 짐만들기(제목, 글):
    """구독마다 미리 봉한 푸시 — 서버(Edge)는 이걸 그대로 POST 한다"""
    k = 푸시.열쇠()
    주인 = k.get('주인') or 'mailto:sj885885@gmail.com'
    봉투 = json.dumps({'제목': 제목, '글': 글, '갈곳': '지시.html'}, ensure_ascii=False)
    짐 = []
    for 줄id, c in 푸시.구독들():
        if not c.get('끝주소'):
            continue
        짐.append({'끝주소': c['끝주소'],
                   '출입': 'vapid t=%s, k=%s' % (푸시.출입증(c['끝주소'], 주인, 시간=23), k['공개']),
                   '살': 푸시.b64(푸시.봉하기(봉투, c.get('p256dh'), c.get('auth')))})
    return 짐


def 찍기():
    이제 = datetime.now(timezone.utc)
    앞 = 줄('아이맥')
    남은, 클 = 메모리(), 클로드수()
    낮음 = (앞.get('낮음연속', 0) + 1) if 남은 is not None and 남은 < 낮은메모리 else 0
    때 = 이제.astimezone(KST).strftime('%m/%d %H:%M')
    적기('아이맥', {
        '시각': 이제.strftime('%Y-%m-%dT%H:%M:%S.000Z'), '메모리': 남은, '클로드': 클,
        '낮음연속': 낮음,
        '짐': 짐만들기('🔴 아이맥 소식 끊김', '마지막 소식 %s — 아이맥 화면을 확인해 주세요' % 때)})
    print('%s 찍음 · 메모리 %s%% · 클로드 %d' % (때, 남은, 클))

    if 낮음 == 3:
        푸시.보내기('⚠️ 아이맥 메모리 %s%%' % 남은, '15분째 15%% 미만입니다 — 크롬 창·탭을 줄여야 멈추지 않습니다')

    알림 = 줄('아이맥알림')
    if 알림.get('꺼짐'):
        끊긴 = 알림.get('끊긴때') or ''
        푸시.보내기('✅ 아이맥 다시 살아남', '끊겼던 마지막 소식 %s' % 끊긴 if 끊긴 else '다시 소식이 옵니다')
        적기('아이맥알림', {'꺼짐': False, '살아난때': 이제.strftime('%Y-%m-%dT%H:%M:%S.000Z')})


if __name__ == '__main__':
    if sys.argv[1:] == ['보기']:
        for id in ('아이맥', '아이맥알림'):
            c = 줄(id)
            if '짐' in c:
                c['짐'] = '%d개' % len(c['짐'])
            print(id, json.dumps(c, ensure_ascii=False))
    else:
        찍기()
