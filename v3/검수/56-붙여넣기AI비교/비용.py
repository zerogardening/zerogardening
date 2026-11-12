# -*- coding: utf-8 -*-
# 11/13 붙여넣기 AI 비교 ③ 토큰·월 비용 — python3 비용.py
# 🔴 토큰 수는 「추정」: 이 맥에 API 키가 없어 count_tokens 를 못 부름 → 한글 1자 1.5토큰 · 그 밖의 글자 0.5토큰으로 넉넉히(Haiku 5.5 새 토크나이저는 옛것보다 약 30% 많음)
# 값: claude-api 스킬 표(2026-11-03 기준) Haiku 5.5 입력 $0.10 · 출력 $0.50 /100만 토큰 · 캐시 읽기 약 0.1배 · 캐시 쓰기 1.25배(5분) · 캐시는 512토큰 넘어야
#     Supabase 가격 페이지(11/13 확인) Edge 함수 Free 50만 회 · Pro($25) 200만 회 포함 · 넘으면 100만 회당 $2
#     환율 open.er-api.com 2026-11-12 00:02 UTC 1달러 = 1,336.6원
import json, pathlib
여기 = pathlib.Path(__file__).resolve().parent
자료 = 여기.parents[2] / '백업' / '수동' / '붙여넣기AI비교-2026-11-13'
def 토큰(s): return sum(1.5 if '가' <= ch <= '힣' else 0.5 for ch in s)
세트 = json.loads((자료 / '세트.json').read_text(encoding='utf-8'))
AI = [x for f in sorted((자료 / 'AI').glob('결과*.json')) for x in json.loads(f.read_text(encoding='utf-8'))]
지시 = 토큰((여기 / '앱지시.txt').read_text(encoding='utf-8')) + 20
입 = sum(토큰(m['글']) for m in 세트) / len(세트) + 10
출 = sum(토큰(json.dumps({k: x.get(k, '') for k in ('이름', '전화', '주소', '상세')}, ensure_ascii=False)) for x in AI) / len(AI) + 5
환율, 입값, 출값 = 1336.6, 0.10 / 1e6, 0.50 / 1e6
캐시됨 = 지시 >= 512
한통 = ((지시 * 0.1 if 캐시됨 else 지시) + 입) * 입값 + 출 * 출값   # 지시는 모든 가게가 같아 캐시가 늘 따뜻하다고 봄(우리 서버 한 곳에서 부름)
한통_캐시없음 = (지시 + 입) * 입값 + 출 * 출값
비 = json.loads((자료 / '비교결과.json').read_text(encoding='utf-8'))
호출 = {b['방식']: b['AI호출'] / 비['N'] for b in 비['방식']}
B율, B의심율 = 비['확인붙음'] / 비['N'], 비['의심붙음'] / 비['N']
방식 = {'A': 0, 'B(확인 필요 붙은 것)': B율, 'B(새 의심만)': B의심율, 'C': 1}
가게들, 붙여넣기 = [100, 1000, 10000, 100000], {'적게': 30, '보통': 100, '많게': 300}
def Edge달러(회): return max(0, 회 - 2_000_000) / 1e6 * 2   # Pro 포함분 넘는 것만(Pro 기본료 $25 는 앱 전체가 원래 내는 값이라 뺌)
표 = []
for 가 in 가게들:
    for 이름, n in 붙여넣기.items():
        통 = 가 * n; 줄 = {'가게': 가, '가게당': 이름, '월 붙여넣기': 통}
        for 방, 율 in 방식.items():
            회 = 통 * 율
            줄[방] = round((회 * 한통 + Edge달러(회)) * 환율)
        표.append(줄)
결과 = {'지시토큰': round(지시), '문자토큰': round(입), '답토큰': round(출), '캐시됨': 캐시됨, '한통원': 한통 * 환율, '한통원_캐시없음': 한통_캐시없음 * 환율,
       'B율': B율, 'B의심율': B의심율, '표': 표, '환율': 환율}
(자료 / '비용결과.json').write_text(json.dumps(결과, ensure_ascii=False, indent=1), encoding='utf-8')
print({k: v for k, v in 결과.items() if k != '표'})
for 줄 in 표: print(줄)
