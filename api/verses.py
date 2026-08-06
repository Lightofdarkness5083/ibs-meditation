from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import os

DATA_PATH = os.path.join(os.path.dirname(__file__), '..', 'data', 'bible_kor.json')

with open(DATA_PATH, encoding='utf-8') as f:
    BIBLE = json.load(f)


class handler(BaseHTTPRequestHandler):
    def do_GET(self):
        try:
            query = parse_qs(urlparse(self.path).query)
            book = query.get('book', [''])[0].strip()
            chapter = query.get('chapter', [''])[0].strip()
            start = query.get('start', [''])[0].strip()
            end = query.get('end', [''])[0].strip() or start

            verses = self._lookup(book, chapter, start, end)

            if verses is None:
                self._send_json(400, {"error": "해당 장·절을 찾을 수 없습니다."})
                return

            self._send_json(200, {"book": book, "chapter": chapter, "verses": verses})

        except Exception:
            self._send_json(500, {"error": "잠시 후 다시 시도해주세요."})

    def do_OPTIONS(self):
        self.send_response(204)
        self._set_cors_headers()
        self.end_headers()

    def _lookup(self, book, chapter, start, end):
        book_data = BIBLE.get(book)
        if not book_data:
            return None

        chapter_data = book_data.get('chapters', {}).get(chapter)
        if not chapter_data:
            return None

        try:
            start_n = int(start)
            end_n = int(end)
        except ValueError:
            return None

        if start_n < 1 or end_n < start_n:
            return None

        verses = []
        for v in range(start_n, end_n + 1):
            text = chapter_data.get(str(v))
            if text is None:
                continue
            verses.append({"verse": v, "text": text})

        return verses if verses else None

    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self._set_cors_headers()
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))

    def _set_cors_headers(self):
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
