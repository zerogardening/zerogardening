# -*- coding: utf-8 -*-
# 당근마켓 주문 엑셀 올리기 검수 (2026-09-03 우람님 지시 「당근 엑셀도 심폴처럼 올리게」)
#   python3 v3/검수/당근주문-시험.py     ← 그대로 다시 돈다 (playwright 필요)
#
# 🔴 당근 파일은 암호가 걸려 있다(ECMA-376 Agile). xlsx.min.js 무료판은 못 연다 —
#    08d 가 WebCrypto 로 직접 푼다. 여기가 이 시험의 핵심이다.
# 🔴 당근 파일에는 수량 칸이 없다 → 전부 1개. 상품코드도 없다 → 짝 열쇠는 상품명이다.
import pathlib, shutil, subprocess, sys, tempfile, time
from playwright.sync_api import sync_playwright

원본 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
표본 = pathlib.Path.home() / 'Downloads' / '당근_진행중_주문내역_202693.xlsx'
# 로그인 문·서비스워커·새판 되받기를 끈다 (새판확인-시험.py 와 같은 수)
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token','{\"a\":1}');"
        "Object.defineProperty(window,'supabase',{value:undefined,writable:false,configurable:false});"
        "Object.defineProperty(navigator,'serviceWorker',{get:()=>undefined});")
결과 = []


def 본다(이름, 참, 덧=''):
    결과.append(bool(참))
    print(('  ✅ ' if 참 else '  🔴 ') + 이름 + ((' — ' + str(덧)) if 덧 else ''))


터 = pathlib.Path(tempfile.mkdtemp(prefix='zg-dg-'))
사본 = 터 / 'v3'
shutil.copytree(원본, 사본, ignore=shutil.ignore_patterns('검수', '시안', '설계', '.git'))
if not 표본.exists():
    raise SystemExit('표본 파일이 없다: %s' % 표본)
shutil.copy(표본, 사본 / '당근표본.xlsx')

서버 = subprocess.Popen([sys.executable, '-m', 'http.server', '8821', '-d', str(사본)],
                        stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
time.sleep(1)

읽기 = """
async (주소) => {
  const 바이트 = await (await fetch(주소)).arrayBuffer();
  const 파일 = new File([바이트], '당근표본.xlsx');
  const 잰때 = performance.now();
  const 결 = await new Promise(r => ZG.주문파일.읽기(파일, r));
  return { 결, 걸린ms: Math.round(performance.now() - 잰때) };
}
"""

# 암호 안 걸린 평범한 엑셀도 여전히 읽히는가 (되돌이 시험)
평범 = """
async () => {
  const 표 = [['쇼핑몰','주문번호','발주일','주문상품명','자체품목코드','수량','수령인','우편번호','주소','핸드폰','판매가'],
              ['한국어 쇼핑몰','A-1','2026-09-01','테스트','ECH01-10',2,'홍길동','04524','서울시','01011112222',9900]];
  const 종이 = XLSX.utils.aoa_to_sheet(표), 책 = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(책, 종이, '주문');
  const 바이트 = XLSX.write(책, { type: 'array', bookType: 'xlsx' });
  const 파일 = new File([바이트], '카페24.xlsx');
  return await new Promise(r => ZG.주문파일.읽기(파일, r));
}
"""

try:
    with sync_playwright() as p:
        브 = p.chromium.launch()
        쪽 = 브.new_page()
        터진것 = []
        쪽.on('pageerror', lambda e: 터진것.append(str(e)))
        쪽.add_init_script(심기)
        쪽.goto('http://127.0.0.1:8821/주문.html')
        try:
            쪽.wait_for_function('!!window.XLSX && !!window.ZG && !!ZG.당근', timeout=20000)
        except Exception:
            print('  🔴 스크립트가 안 떴다:', 터진것[:5])
            print('  ZG 키:', 쪽.evaluate('Object.keys(window.ZG || {})'))
            raise

        print('\n[1] 암호 걸린 당근 파일 열기')
        본 = 쪽.evaluate(읽기, 'http://127.0.0.1:8821/당근표본.xlsx')
        결, 행들 = 본['결'], (본['결'] or {}).get('행들') or []
        본다('암호를 풀고 읽었다', 결.get('ok'), 결.get('오류') or '')
        본다('걸린 시간이 10초 안이다', 본['걸린ms'] < 10000, str(본['걸린ms']) + 'ms')
        본다('머리글 14칸', len(행들[0]) == 14 if 행들 else False, 행들[0] if 행들 else '')
        본다('첫 칸이 주문번호다', bool(행들) and 행들[0][0] == '주문번호')

        print('\n[2] 당근 14칸 → 카페24 27칸')
        본다('당근 파일로 알아본다', 쪽.evaluate('r => !!ZG.당근.감지(r[0])', 행들))
        읽 = 쪽.evaluate('r => ZG.주문올리기.읽기결과(r)', 행들)
        본다('읽기결과 ok', 읽.get('ok'), 읽.get('오류') or '')
        본다('당근 표시가 붙는다', (읽.get('머리') or {}).get('당근') is True)
        항목들 = 읽.get('항목들') or []
        본다('주문 1줄을 읽었다', len(항목들) == 1, len(항목들))

        if 항목들:
            줄 = 항목들[0]['줄']
            본다('판매처 = 당근', 줄['판매처'] == '당근', 줄['판매처'])
            본다('주문번호', 줄['주문번호'] == '5129998', 줄['주문번호'])
            본다('주문일 (시:분을 떼고)', 줄['주문일'] == '2026-09-02', 줄['주문일'])
            본다('수령인', 줄['수령인'] == '이현숙', 줄['수령인'])
            본다('연락처 (앞 0 이 살아 있다)', 줄['수령인전화'] == '01094480091', 줄['수령인전화'])
            본다('우편번호', 줄['우편번호'] == '62377', 줄['우편번호'])
            본다('주소', 줄['수령인주소'].startswith('전남광주통합특별시'), 줄['수령인주소'])
            본다('단가 (쉼표를 뗀다)', 줄['단가'] == 40500, 줄['단가'])
            본다('🔴 수량 칸이 없어 1개로 넣는다', 줄['주문수량'] == 1, 줄['주문수량'])
            본다('옵션입수 1 (곱하지 않는다)', 줄['옵션입수'] == 1, 줄['옵션입수'])
            본다('배송메모 = 요청사항', 줄['배송메모'] == '부재시문앞', 줄['배송메모'])
            본다('🔴 짝 열쇠는 상품명이다', 줄['원본코드'].startswith('제로가드닝 팜파스'), 줄['원본코드'])
            본다('품목은 안 붙는다 (짝을 지으셔야 한다)', 줄['품목코드'] == '', 줄['품목코드'])
            본다('유통명 자리에 당근 상품명', 줄['유통명'] == 줄['원본코드'])
            본다('갈래 = 새것', 항목들[0]['갈래'] == '새것', 항목들[0]['갈래'])

        print('\n[3] 짝창에 당근 줄이 뜨는가')
        글 = 쪽.evaluate('it => { var d = ZG.짝창.상자(it); return d ? d.textContent : ""; }', 항목들)
        본다('짝 못 지은 당근 줄이 상자에 올라온다', '제로가드닝 팜파스' in 글, 글[:80])

        print('\n[4] 되돌이 — 암호 없는 엑셀은 그대로 읽힌다')
        평 = 쪽.evaluate(평범)
        본다('평범한 카페24 엑셀 읽기', 평.get('ok'), 평.get('오류') or '')
        평읽 = 쪽.evaluate('r => ZG.주문올리기.읽기결과(r)', 평.get('행들') or [])
        본다('카페24로 읽힌다 (당근으로 오인 안 한다)',
             평읽.get('ok') and not (평읽.get('머리') or {}).get('당근'), 평읽.get('오류') or '')
        본다('수량 2가 그대로', (평읽.get('항목들') or [{}])[0].get('줄', {}).get('주문수량') == 2)

        본다('콘솔 에러 없다', not 터진것, 터진것)
        브.close()
finally:
    서버.terminate()
    shutil.rmtree(터, ignore_errors=True)

print('\n%d/%d 통과' % (sum(결과), len(결과)))
raise SystemExit(0 if all(결과) else 1)
