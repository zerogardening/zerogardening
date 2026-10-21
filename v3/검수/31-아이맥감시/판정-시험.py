#!/usr/bin/env python3
"""imac-watch 판정 시험 — 가짜 줄(시각을 옛날로)로 `시험:true` 를 부른다. 저장·발송 없음."""
import json
import urllib.request

주소 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/functions/v1/imac-watch'
지금 = '2026-10-22T03:00:00.000Z'      # = 10/22 12:00 KST


def 분전(n):
    from datetime import datetime, timedelta
    return (datetime.strptime(지금, '%Y-%m-%dT%H:%M:%S.000Z') - timedelta(minutes=n)).strftime('%Y-%m-%dT%H:%M:%S.000Z')


경우 = [  # (이름, 아이맥 몇 분 전, 알림, 기대 보낼, 기대 까닭 앞글자)
    ('14분 전 — 아직 안 끊김', 14, {}, False, '살아있음'),
    ('15분 전 — 경계(안 보냄)', 15, {}, False, '살아있음'),
    ('16분 전 — 첫 알림', 16, {}, True, '첫 끊김'),
    ('40분 전 · 30분 전에 알림 — 안 보냄', 40, {'꺼짐': True, '마지막알림': 분전(30), '횟수': 1}, False, '알린 지'),
    ('90분 전 · 61분 전에 알림 — 다시', 90, {'꺼짐': True, '마지막알림': 분전(61), '횟수': 1}, True, '다시 알림'),
    ('아이맥 줄 없음 — 안 보냄', None, {}, False, '아이맥 줄 없음'),
]
통과 = 0
for 이름, 분, 알림, 보낼, 까닭 in 경우:
    몸 = {'시험': True, '지금': 지금, '알림': 알림, '아이맥': {'시각': 분전(분)} if 분 is not None else {}}
    req = urllib.request.Request(주소, data=json.dumps(몸).encode(), method='POST',
                                 headers={'Content-Type': 'application/json'})
    답 = json.loads(urllib.request.urlopen(req, timeout=30).read())
    맞 = 답.get('ok') and 답.get('보낼') == 보낼 and 답.get('까닭', '').startswith(까닭) and 답.get('쏨') == []
    if 맞 and 이름.endswith('첫 알림'):
        맞 = 답['알림'].get('끊긴때') == '10/22 11:44' and 답['알림'].get('횟수') == 1
    if 맞 and 이름.endswith('다시'):
        맞 = 답['알림'].get('횟수') == 2 and 답['알림'].get('마지막알림') == 지금
    통과 += bool(맞)
    print('✅' if 맞 else '❌', 이름, '→', 답.get('보낼'), 답.get('까닭'), json.dumps(답.get('알림'), ensure_ascii=False))
print('%d/%d' % (통과, len(경우)))
