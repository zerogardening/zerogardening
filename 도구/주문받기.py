#!/usr/bin/env python3
"""카페24에서 배송준비중 주문을 받아 「카페24 주문 CSV」와 똑같은 27칸 파일로 뽑는다.

    python3 주문받기.py              # 최근 30일 배송준비중 → 바탕화면에 CSV
    python3 주문받기.py --날짜 7      # 최근 7일
    python3 주문받기.py --시험        # 8/6 실물 CSV 와 27칸 대조 (파일 안 만든다)

뽑은 파일을 v3 「주문 올리기」에 그대로 올리면 된다.
"""
import csv
import json
import subprocess
import sys
from datetime import date, timedelta
from pathlib import Path

ROOT = Path("/Users/zerogardening/claude-projects/제로가드닝")
API = ROOT / "상품/_도구/카페24.py"
실물 = ROOT / "통합관리/백업/카페24주문원본_20260806.csv"
나갈곳 = Path.home() / "Desktop"

# 실물 CSV 머리글 그대로 (공백까지) — v3 는 공백을 지우고 읽지만 실물과 같게 둔다
칸이름 = [
    '쇼핑몰', '쇼핑몰번호', '주문번호', '발주일', '주문상품명', '상품번호', '옵션', '자체품목코드',
    '결제수단', '결제업체', '결제정보', '판매가', '수량', '수령인', '우편번호', '주소',
    '수령지전화', '전화번호', '핸드폰', '비고', '주문자', '주문자우편번호', '주문자주소',
    '주문자전화번호', '주문자핸드폰', '옵션추가 가격', '배송비 정보',
]
배송준비중 = "N20"


def 부르기(경로):
    r = subprocess.run([sys.executable, str(API), "GET", 경로],
                       capture_output=True, text=True)
    if r.returncode != 0:
        sys.exit(f"❌ 카페24 호출 실패\n{r.stderr.strip()}")
    return json.loads(r.stdout)


def 글(v):
    return "" if v is None else str(v)


def 돈(v):
    """0 이면 빈칸 — 실물 CSV 가 그렇다."""
    try:
        return "" if float(v) == 0 else 돈글(v)
    except (TypeError, ValueError):
        return 글(v)


def 돈글(v):
    return f"{float(v):.2f}"


def 배송비(주문):
    """실물은 무료배송에 「무료」라고 적혀 있다."""
    액 = (주문.get("initial_order_amount") or {}).get("shipping_fee")
    try:
        return "무료" if float(액 or 0) == 0 else 돈글(액)
    except (TypeError, ValueError):
        return ""


def 줄만들기(주문, 품목, 수령인, 주문자):
    return {
        '쇼핑몰': '한국어 쇼핑몰',          # 실물이 마켓주문에도 늘 이 값이다
        '쇼핑몰번호': 글(주문.get('shop_no')),
        '주문번호': 글(주문.get('order_id')),
        '발주일': 글(주문.get('order_date'))[:10],
        '주문상품명': 글(품목.get('product_name')),
        '상품번호': 글(품목.get('product_no')),
        '옵션': 글(품목.get('option_value')),
        '자체품목코드': 글(품목.get('custom_product_code')),
        '결제수단': (주문.get('payment_method_name') or [''])[0],
        '결제업체': '',
        '결제정보': '',
        '판매가': 돈글(품목.get('product_price') or 0),
        '수량': 글(품목.get('quantity')),
        '수령인': 글(수령인.get('name')),
        '우편번호': 글(수령인.get('zipcode')),
        '주소': 글(수령인.get('address_full')),
        '수령지전화': '',
        '전화번호': 글(수령인.get('phone')),
        '핸드폰': 글(수령인.get('cellphone')),
        '비고': 글(수령인.get('shipping_message')),
        '주문자': 글(주문.get('billing_name')),
        '주문자우편번호': 글(주문자.get('buyer_zipcode')),
        '주문자주소': (글(주문자.get('buyer_address1')) + ' ' +
                  글(주문자.get('buyer_address2'))).strip(),
        '주문자전화번호': 글(주문자.get('phone')),
        '주문자핸드폰': 글(주문자.get('cellphone')),
        '옵션추가 가격': 돈(품목.get('option_price')),
        '배송비 정보': 배송비(주문),
    }


def 받기(시작, 끝, 상태=배송준비중):
    """🔴 배송준비중만 받는다 — 안 거르면 이미 보낸 주문이 다시 들어온다."""
    q = (f"orders?limit=100&start_date={시작}&end_date={끝}"
         f"&embed=items,receivers,buyer")
    if 상태:
        q += f"&order_status={상태}"
    줄들 = []
    for 주문 in 부르기(q).get("orders", []):
        수령인들 = 주문.get("receivers") or [{}]
        주문자 = 주문.get("buyer") or {}
        for 품목 in (주문.get("items") or []):
            # 품목마다 배송지가 다를 수 있다(복수배송). shipping_code 로 짝을 찾는다
            수령인 = next((r for r in 수령인들
                        if r.get("shipping_code") == 품목.get("shipping_code")), 수령인들[0])
            줄들.append(줄만들기(주문, 품목, 수령인, 주문자))
    return 줄들


def 쓰기(줄들, 경로):
    with open(경로, "w", encoding="utf-8-sig", newline="") as f:
        w = csv.DictWriter(f, fieldnames=칸이름)
        w.writeheader()
        w.writerows(줄들)


def 시험():
    """8/6 실물 CSV 와 27칸을 대조한다. 이게 통과해야 진짜로 쓸 수 있다."""
    실물줄 = {}
    for r in csv.DictReader(open(실물, encoding="utf-8-sig")):
        실물줄[(r['주문번호'], r['자체품목코드'])] = r

    맞음 = 틀림 = 안본줄 = 0
    for 주문번호 in dict.fromkeys(k[0] for k in 실물줄):        # 실물에 있는 주문 전부
        d = 부르기(f"orders/{주문번호}?embed=items,receivers,buyer")
        주문 = d.get("order") or d["orders"][0]
        수령인들 = 주문.get("receivers") or [{}]
        주문자 = 주문.get("buyer") or {}
        for 품목 in 주문.get("items", []):
            키 = (주문['order_id'], 글(품목.get('custom_product_code')))
            기대 = 실물줄.pop(키, None)
            if not 기대:
                안본줄 += 1
                print(f"⚠️ 실물에 없는 줄이 API 에 있다: {키}")
                continue
            났 = 줄만들기(주문, 품목, 수령인들[0], 주문자)
            print(f"\n── {키[0]} · {키[1] or '(코드없음)'}")
            for k in 칸이름:
                a, b = 글(기대.get(k)).strip(), 글(났[k]).strip()
                if a == b:
                    맞음 += 1
                else:
                    틀림 += 1
                    print(f"   🔴 {k:<10} 실물={a!r}  받은것={b!r}")
    for 키 in 실물줄:
        안본줄 += 1
        print(f"🔴 실물에 있는데 API 로는 안 나온 줄: {키}")
    print(f"\n{'✅' if 틀림 == 0 and 안본줄 == 0 else '🔴'} "
          f"맞은 칸 {맞음} · 다른 칸 {틀림} · 짝 못 찾은 줄 {안본줄}")
    return 틀림 == 0 and 안본줄 == 0


def main():
    if "--시험" in sys.argv:
        sys.exit(0 if 시험() else 1)

    일수 = 30
    if "--날짜" in sys.argv:
        일수 = int(sys.argv[sys.argv.index("--날짜") + 1])
    끝 = date.today()
    시작 = 끝 - timedelta(days=일수)

    줄들 = 받기(시작.isoformat(), 끝.isoformat())
    if not 줄들:
        print(f"받아올 배송준비중 주문이 없습니다 ({시작} ~ {끝}).")
        return

    경로 = 나갈곳 / f"카페24주문_{끝:%Y%m%d}.csv"
    쓰기(줄들, 경로)
    주문수 = len({r['주문번호'] for r in 줄들})
    print(f"✅ 주문 {주문수}건 · {len(줄들)}줄 → {경로}")
    print("   바탕화면에 있습니다. v3 「주문 올리기」에 그대로 올리시면 됩니다.")
    for r in 줄들:
        print(f"   · {r['주문번호']}  {r['수령인']:<6} {r['자체품목코드']:<10} {r['수량']}개  {r['주문상품명'][:24]}")


if __name__ == "__main__":
    main()
