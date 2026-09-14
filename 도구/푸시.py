#!/usr/bin/env python3
"""폰 홈 화면에 얹은 통합관리 앱으로 알림을 보낸다 (16단계).

    python3 통합관리/도구/푸시.py 시험        # 구독한 기기에 시험 알림을 하나 보낸다
    python3 통합관리/도구/푸시.py 목록        # 지금 구독된 기기를 센다

웹 푸시 표준(RFC 8291 · RFC 8292)을 그대로 쓴다. 바깥 서비스도, 새 앱도 필요 없다 —
폰이 애플·구글 푸시 서버에 자리를 하나 잡아 주고, 맥이 거기로 쏜다.

🔴 열쇠 한 쌍은 `~/.zg_vapid.json` 에 있다. **한 번 만들면 바꾸지 않는다** —
   바꾸면 이미 구독한 기기가 전부 끊긴다.
🔴 구독 정보는 `v3_지시` 표에 `구독:{끝주소해시}` 로 얹어 둔다. 표를 하나 더 만들지 않으려고
   그렇게 했다(SQL 을 또 돌리시게 하는 것보다 낫다). 화면은 `갈래=='구독'` 인 줄을 안 그린다.
🔴 `pywebpush` 를 안 쓴다. 파이썬에 이미 있는 `cryptography` 만으로 된다 — 새 설치 없음.
"""
import base64
import json
import os
import struct
import sys
import time
import urllib.error
import urllib.parse
import urllib.request
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from 제작요청 import 키, 부르기, 표                     # noqa: E402

from cryptography.hazmat.primitives import hashes, serialization                 # noqa: E402
from cryptography.hazmat.primitives.asymmetric import ec                         # noqa: E402
from cryptography.hazmat.primitives.kdf.hkdf import HKDF                         # noqa: E402
from cryptography.hazmat.primitives.ciphers.aead import AESGCM                   # noqa: E402
from cryptography.hazmat.primitives.asymmetric.utils import decode_dss_signature  # noqa: E402

열쇠집 = Path.home() / '.zg_vapid.json'
주소 = 'https://vjqfhwrgrocapcyndgtx.supabase.co/rest/v1/'


def b64(b):
    return base64.urlsafe_b64encode(b).rstrip(b'=').decode()


def b64풀기(s):
    s = str(s)
    return base64.urlsafe_b64decode(s + '=' * (-len(s) % 4))


def 열쇠():
    if not 열쇠집.exists():
        sys.exit('❌ 열쇠가 없다: %s — 푸시.py 만들 때 같이 만든다' % 열쇠집)
    return json.loads(열쇠집.read_text(encoding='utf-8'))


# ══════════════════════════════════════════════ VAPID — 「나는 이 맥이다」

def 출입증(끝주소, 주인):
    """ES256 로 서명한 JWT. 12시간짜리 — 푸시 서버가 「누가 보냈나」를 이걸로 본다"""
    k = 열쇠()
    비밀 = ec.derive_private_key(int.from_bytes(b64풀기(k['비밀']), 'big'), ec.SECP256R1())
    쪽 = urllib.parse.urlparse(끝주소)
    머리 = b64(json.dumps({'typ': 'JWT', 'alg': 'ES256'}, separators=(',', ':')).encode())
    몸 = b64(json.dumps({'aud': '%s://%s' % (쪽.scheme, 쪽.netloc),
                         'exp': int(time.time()) + 12 * 3600,
                         'sub': 주인}, separators=(',', ':')).encode())
    쓸것 = ('%s.%s' % (머리, 몸)).encode()
    der = 비밀.sign(쓸것, ec.ECDSA(hashes.SHA256()))
    r, s = decode_dss_signature(der)        # 🔴 DER → 원시 64바이트. 이걸 안 바꾸면 서명이 거절된다
    return '%s.%s' % (쓸것.decode(), b64(r.to_bytes(32, 'big') + s.to_bytes(32, 'big')))


# ══════════════════════════════════════════════ 페이로드 암호화 (aes128gcm)

def 봉하기(글, p256dh, auth):
    """RFC 8291. 폰만 열 수 있게 봉한다 — 푸시 서버도 못 읽는다"""
    받는이 = ec.EllipticCurvePublicKey.from_encoded_point(ec.SECP256R1(), b64풀기(p256dh))
    비밀키 = b64풀기(auth)
    한번키 = ec.generate_private_key(ec.SECP256R1())
    내공개 = 한번키.public_key().public_bytes(serialization.Encoding.X962,
                                              serialization.PublicFormat.UncompressedPoint)
    공유 = 한번키.exchange(ec.ECDH(), 받는이)
    받는이바이트 = 받는이.public_bytes(serialization.Encoding.X962,
                                        serialization.PublicFormat.UncompressedPoint)

    소금 = os.urandom(16)
    정보 = b'WebPush: info\x00' + 받는이바이트 + 내공개
    씨 = HKDF(algorithm=hashes.SHA256(), length=32, salt=비밀키, info=정보).derive(공유)
    열쇠 = HKDF(algorithm=hashes.SHA256(), length=16, salt=소금,
                info=b'Content-Encoding: aes128gcm\x00').derive(씨)
    논스 = HKDF(algorithm=hashes.SHA256(), length=12, salt=소금,
                info=b'Content-Encoding: nonce\x00').derive(씨)

    살 = AESGCM(열쇠).encrypt(논스, 글.encode('utf-8') + b'\x02', None)
    return 소금 + struct.pack('!IB', 4096, len(내공개)) + 내공개 + 살


# ══════════════════════════════════════════════ 구독 (v3_지시 표에 얹어 둔다)

def 구독들():
    답 = 부르기(표('v3_지시') + '?select=id,내용,삭제됨') or []
    return [(r['id'], r['내용']) for r in 답
            if not r.get('삭제됨') and (r.get('내용') or {}).get('갈래') == '구독']


def 구독지우기(줄id):
    """푸시 서버가 「그 자리 없다(404·410)」 하면 지운다 — 앱을 지우셨거나 구독이 바뀐 것이다"""
    k = 키()
    req = urllib.request.Request(
        주소 + urllib.parse.quote(표('v3_지시')) + '?id=eq.' + urllib.parse.quote(줄id),
        method='DELETE', headers={'apikey': k, 'Authorization': 'Bearer ' + k})
    try:
        urllib.request.urlopen(req, timeout=30).read()
    except urllib.error.HTTPError:
        pass


# ══════════════════════════════════════════════ 보내기

def 보내기(제목, 글, 갈곳='지시.html'):
    """구독한 기기 전부에 보낸다. (보낸수, 지운수). 🔴 넘어지지 않는다 —
       알림이 안 갔다고 본 일까지 실패로 만들면 안 된다."""
    주인 = 열쇠().get('주인') or 'mailto:sj885885@gmail.com'
    짐 = json.dumps({'제목': 제목, '글': 글, '갈곳': 갈곳}, ensure_ascii=False)
    보냄, 지움 = 0, 0
    for 줄id, 내용 in 구독들():
        끝주소 = 내용.get('끝주소') or ''
        if not 끝주소:
            continue
        try:
            살 = 봉하기(짐, 내용.get('p256dh'), 내용.get('auth'))
            req = urllib.request.Request(끝주소, method='POST', data=살, headers={
                'Authorization': 'vapid t=%s, k=%s' % (출입증(끝주소, 주인), 열쇠()['공개']),
                'Content-Encoding': 'aes128gcm',
                'Content-Type': 'application/octet-stream',
                'TTL': '86400', 'Urgency': 'normal'})
            urllib.request.urlopen(req, timeout=15).read()
            보냄 += 1
        except urllib.error.HTTPError as e:
            if e.code in (404, 410):
                구독지우기(줄id); 지움 += 1
            else:
                print('  ⚠️ 푸시 실패 %s — %s' % (e.code, e.read()[:120]))
        except Exception as e:
            print('  ⚠️ 푸시 실패 — %s' % e)
    return 보냄, 지움


if __name__ == '__main__':
    인자 = sys.argv[1:]
    if 인자 and 인자[0] == '목록':
        것 = 구독들()
        print('구독한 기기 %d대' % len(것))
        for 줄id, c in 것:
            print('  %s · %s' % (줄id[:22], (c.get('끝주소') or '')[:52]))
    elif 인자 and 인자[0] == '시험':
        보냄, 지움 = 보내기('제로가드닝', '시험 알림입니다. 이게 뜨면 다 된 것입니다.')
        print('보냈습니다 %d대%s' % (보냄, ' · 끊긴 구독 %d개 지움' % 지움 if 지움 else ''))
    else:
        print(__doc__.split('\n\n')[1])
