# -*- coding: utf-8 -*-
# 11/13 실제 주문 붙여넣기 오류(견적 끝 「구매자 성함으로 입금해 주세요」를 따라 쓴 「성함으로」가 받는 분 「으로」로) — python3 v3/검수/58-붙여넣기실제오류/실제오류-시험.py
# 실제 손님 문자와 같은 꼴만 · 이름·주소는 지어낸 것(공개 도로명) · node 로 20l·20h 나누기만 부름(화면 없음 · 바깥 호출 없음)
import json, pathlib, subprocess, tempfile
여기 = pathlib.Path(__file__).resolve().parent
js = 여기.parents[1] / 'js'
사례 = json.loads((여기 / '사례.json').read_text(encoding='utf-8'))
with tempfile.TemporaryDirectory() as d:
    인, 출 = pathlib.Path(d) / '인.json', pathlib.Path(d) / '출.json'
    인.write_text(json.dumps([{'글': c[0]} for c in 사례], ensure_ascii=False), encoding='utf-8')
    subprocess.run(['node', str(여기.parent / '53-붙여넣기실전' / '돌리기.js'), str(인), str(출), str(js / '20l-읍면표.js'), str(js / '20h-문자붙여넣기.js')], check=True, capture_output=True)
    답 = json.loads(출.read_text(encoding='utf-8'))
맞 = 0
for c, r in zip(사례, 답):
    got = [r.get('이름'), (r.get('전화들') or [''])[0], r.get('주소'), r.get('상세')]
    ok = got == c[1:5]; 맞 += ok
    print(('  OK ' if ok else '  XX ') + c[5] + ('' if ok else ' — ' + json.dumps(got, ensure_ascii=False)))
print(f'{맞}/{len(사례)}')
