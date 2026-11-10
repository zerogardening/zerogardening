# 시험용 로컬 서버 — python3 _시험서버.py <포트> <폴더>
# 🔴 python3 -m http.server 는 접속 대기열이 5라 화면이 스크립트 40여 개를 한꺼번에 부르면 ERR_CONNECTION_RESET 으로 몇 개가 안 실린다(11/10 · 회귀가 들쭉날쭉하던 원인)
import sys, functools, http.server
class 서버(http.server.ThreadingHTTPServer):
    request_queue_size = 128
    daemon_threads = True
쪽 = functools.partial(http.server.SimpleHTTPRequestHandler, directory=sys.argv[2])
쪽.log_message = lambda *a: None
서버(('', int(sys.argv[1])), 쪽).serve_forever()
