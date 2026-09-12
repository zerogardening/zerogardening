"""사진받기.py — 창고 쪽이 새것이면 덮는가, 안 바뀐 건 건너뛰는가"""
import sys, time, types, tempfile, os
from pathlib import Path
도구 = Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/도구')

가짜 = types.ModuleType('제작요청')
가짜.키 = lambda: 'k'; 가짜.표 = lambda t: t; 가짜.부르기 = lambda *a, **k: []
가짜.폴더명 = lambda n: '-'.join(str(n).split())
방 = Path(tempfile.mkdtemp()); 가짜.원본사진방 = 방
sys.modules['제작요청'] = 가짜
sys.path.insert(0, str(도구))
import importlib.util
스펙 = importlib.util.spec_from_file_location('사진받기', 도구 / '사진받기.py')
m = importlib.util.module_from_spec(스펙); 스펙.loader.exec_module(m)

창고 = {}          # 길 → (내용, 올린때)
m.유통명표 = lambda: {'A0001': '휴케라 라임'}
m.목록때 = lambda 길='': (
    {'A0001': 0} if 길 == '' else
    {k.split('/')[1]: v[1] for k, v in 창고.items() if k.startswith(길 + '/')})
m.목록 = lambda 길='': list(m.목록때(길))
m.내려받기 = lambda 길: 창고[길][0]

잎 = 방 / '휴케라-라임' / '1.jpg'
def 돌려(꼬리=''):
    print('  →', end=' '); m.받기('다시' in 꼬리)

print('① 없던 것 받기')
창고['A0001/1.jpg'] = (b'first', time.time())
돌려(); assert 잎.read_bytes() == b'first', 잎.read_bytes()

print('② 안 바뀌었으면 건너뛴다')
잎.write_bytes(b'first'); os.utime(잎, (time.time(), time.time()))
창고['A0001/1.jpg'] = (b'SHOULD-NOT-COME', 창고['A0001/1.jpg'][1])
돌려(); assert 잎.read_bytes() == b'first', '안 바뀐 것을 다시 받았다'

print('③ 창고가 더 새것이면 덮는다  ← 우람님이 폰에서 사진을 갈아 끼운 경우')
창고['A0001/1.jpg'] = (b'second', time.time() + 5)
돌려(); assert 잎.read_bytes() == b'second', '갈아 끼운 사진이 안 왔다: %r' % 잎.read_bytes()

print('④ 두 번 더 돌려도 파일 수 그대로')
전 = len(list((방 / '휴케라-라임').iterdir())); 돌려(); 돌려()
assert len(list((방 / '휴케라-라임').iterdir())) == 전

print('\n✅ 넷 다 통과')
