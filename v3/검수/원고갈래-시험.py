# -*- coding: utf-8 -*-
"""15단계 B — [원고] 갈래가 네 경우에서 제대로 도는가 (제작요청-시험.py 틀)

  정상   폼이 뜨고 · 고치면 저장단추가 살고 · 저장하면 바뀐 칸만 서버로 간다
  넘침   상한을 넘기면 저장이 막히고 어느 칸인지 말해 준다
  표없음 v3_원고 표가 아직 없으면 그렇다고 말한다
  끊김   🔴 인터넷이 끊기면 사람 말로 알린다 — 「불러오는 중…」에 멈추면 안 된다
         (2026-09-12: supabase-js 가 약속을 영영 안 끝내 여기서 멈춰 섰다. 06h 에 10초 제한을 걸었다)
"""
import json, time, pathlib, urllib.parse, sys
from playwright.sync_api import sync_playwright

뿌리 = pathlib.Path('/Users/zerogardening/claude-projects/제로가드닝/통합관리/v3')
이제 = int(time.time() * 1000)
세션 = {"access_token": "zgtesttoken", "token_type": "bearer", "expires_in": 3600,
        "expires_at": int(time.time()) + 3600, "refresh_token": "zgtesttoken",
        "user": {"id": "00000000-0000-0000-0000-000000000000", "aud": "authenticated",
                 "role": "authenticated", "email": "검수@zg"}}
품목 = {"품목코드": "AAA01-15", "접두": "AAA01", "학명3": "AAA", "일련번호": "01", "규격cm": 15,
        "규격": "15cm 포트", "유통명": "확인용국화", "학명": "X sp.", "학명키": "x sp.",
        "매입단가": 1000, "과세구분": "면세", "상태": "판매중", "특성": None,
        "등록일시": 이제, "수정일시": 이제}
심기 = ("localStorage.setItem('sb-vjqfhwrgrocapcyndgtx-auth-token', %s);"
        "localStorage.setItem('zg.v3.품목', %s);"
        % (json.dumps(json.dumps(세션)), json.dumps(json.dumps([품목], ensure_ascii=False))))

행 = lambda 칸, 소, 본: {"id": "AAA01-15#" + 칸, "삭제됨": False,
                        "내용": {"품목코드": "AAA01-15", "칸": 칸, "소제목": 소, "본문": 본,
                                 "고친때": 이제, "맥시각": 이제}}
줄들 = [{"id": "AAA01-15", "내용": {"품목코드": "AAA01-15"}, "삭제됨": False},
        행('1', '', '가을을 여는 들국화입니다.'), 행('2', '꽃', '노란 꽃이 9월부터 핍니다.'),
        행('3', '잎', '잎은 깊게 갈라집니다.'), 행('4-1', '볕', '하루 여섯 시간 볕이 필요합니다.'),
        행('4-2', '물', '겉흙이 마르면 줍니다.'), 행('4-3', '추위', '노지 월동이 됩니다.'),
        행('5', '', '30cm 간격으로 심습니다.')]

원고표 = '/rest/v1/' + urllib.parse.quote('v3_원고')   # 🔴 표 이름이 퍼센트 인코딩돼 나간다
표없음 = json.dumps({"code": "PGRST205",
                     "message": "Could not find the table 'public.v3_원고' in the schema cache"},
                    ensure_ascii=False)

열기 = """() => {
    var 폰 = [...document.querySelectorAll('.ph-sec')].find(e => e.textContent.indexOf('상세페이지 작업 대기') >= 0);
    if (폰) return 폰.parentElement.querySelector('.ph-card').click();
    var h = [...document.querySelectorAll('h3')].find(e => e.textContent.indexOf('상세페이지 작업 대기') >= 0);
    h.parentElement.querySelector('tbody tr').click(); }"""
갈래누름 = """(g) => [...document.querySelectorAll('.사진창 .toggle button')].find(b => b.textContent === g).click()"""
저장단추 = """() => { var b = [...document.querySelectorAll('.사진창 .bd button')].find(x => x.textContent === '저장');
    return b ? (b.disabled ? '꺼짐' : '켜짐') : '없음'; }"""
몸글 = "() => document.querySelector('.사진창 .bd').textContent.trim().replace(/\\s+/g, ' ')"

보낸것 = []


def 판(무엇, 폭=390, 높=844):
    def 길잡이(r):
        u = r.request.url
        if 원고표 in u:
            if 무엇 == '표없음':
                return r.fulfill(status=404, content_type='application/json', body=표없음)
            if r.request.method in ('POST', 'PATCH'):
                보낸것.append(r.request.post_data or '')
                return r.fulfill(status=200, content_type='application/json', body='[]')
            return r.fulfill(status=200, content_type='application/json',
                             body=json.dumps(줄들, ensure_ascii=False))
        if '/storage/' in u:
            return r.fulfill(status=200, content_type='application/json', body='[]')
        return r.abort()

    with sync_playwright() as p:
        b = p.chromium.launch(); ctx = b.new_context(viewport={'width': 폭, 'height': 높})
        pg = ctx.new_page()
        오류 = []; pg.on('pageerror', lambda e: 오류.append(str(e)))
        if 무엇 != '끊김':
            pg.route("**/*.supabase.co/**", 길잡이)
        pg.add_init_script(심기)
        pg.goto((뿌리 / 'index.html').as_uri() + '#입고'); pg.wait_for_timeout(1500)
        if 무엇 == '끊김':
            ctx.set_offline(True)
        pg.evaluate(열기); pg.wait_for_timeout(700)

        갈래 = pg.evaluate("""() => [...document.querySelectorAll('.사진창 .toggle button')].map(b => b.textContent)""")
        assert 갈래 == ['사진', '원고', '결과'], '갈래줄이 다르다 — %s' % 갈래

        pg.evaluate(갈래누름, '원고')
        pg.wait_for_timeout(12000 if 무엇 == '끊김' else 2000)

        if 무엇 == '표없음':
            assert '표가 아직 없습니다' in pg.evaluate(몸글), pg.evaluate(몸글)[:80]
            print('[표없음] 표가 없다고 말한다 ✅')
        elif 무엇 == '끊김':
            글 = pg.evaluate(몸글)
            assert '불러오는 중' not in 글, '🔴 불러오는 중…에 멈춰 섰다'
            assert '인터넷이 안 닿아' in 글, 글[:80]
            print('[끊김] 인터넷이 안 닿는다고 말한다 ✅')
        else:
            칸 = pg.evaluate("() => document.querySelectorAll('.사진창 .bd textarea').length")
            assert 칸 == 7, '본문칸이 7이 아니다 — %s' % 칸
            assert pg.evaluate(저장단추) == '꺼짐', '열자마자 저장단추가 켜져 있다'

            pg.evaluate("""() => { var t = document.querySelectorAll('.사진창 .bd textarea')[0];
                t.value += ' 좋습니다.'; t.dispatchEvent(new Event('input', {bubbles: true})); }""")
            pg.wait_for_timeout(300)
            assert pg.evaluate(저장단추) == '켜짐', '고쳤는데 저장단추가 안 산다'

            앞 = len(보낸것)
            pg.evaluate("""() => [...document.querySelectorAll('.사진창 .bd button')].find(x => x.textContent === '저장').click()""")
            pg.wait_for_timeout(900)
            assert len(보낸것) == 앞 + 1, '저장이 서버로 안 갔다'
            assert '#1' in 보낸것[-1], '바뀐 칸만 보내야 한다 — %s' % 보낸것[-1][:80]
            assert '#5' not in 보낸것[-1], '안 고친 칸까지 보냈다'

            pg.evaluate("""() => { var t = document.querySelectorAll('.사진창 .bd textarea');
                var l = t[t.length - 1]; l.value = '가'.repeat(300);
                l.dispatchEvent(new Event('input', {bubbles: true})); }""")
            pg.wait_for_timeout(300)
            앞 = len(보낸것)
            pg.evaluate("""() => { var b = [...document.querySelectorAll('.사진창 .bd button')].find(x => x.textContent === '저장');
                if (b && !b.disabled) b.click(); }""")
            pg.wait_for_timeout(700)
            assert len(보낸것) == 앞, '🔴 넘쳤는데 저장이 됐다'
            assert '글자가 넘쳐' in pg.evaluate(몸글), '넘쳤다고 말하지 않는다'

            pg.evaluate(갈래누름, '사진'); pg.wait_for_timeout(600)
            칸수 = pg.evaluate("() => document.querySelectorAll('.사진창 .bd [class*=칸]').length")
            assert 칸수 == 11, '사진 갈래로 돌아오니 칸이 %s 개다' % 칸수
            print('[정상 %dpx] 폼 7칸 · 고치면 저장단추 살고 · 바뀐 칸만 보내고 · 넘치면 막고 · 사진 11칸 그대로 ✅' % 폭)

        assert not 오류, '콘솔 오류 — %s' % 오류
        b.close()


판('정상', 390, 844)
판('정상', 1440, 900)
판('표없음')
판('끊김')
print('\n✅ 원고 갈래 네 경우 다 통과')
