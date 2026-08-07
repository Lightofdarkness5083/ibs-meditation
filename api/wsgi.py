from http.server import BaseHTTPRequestHandler
from urllib.parse import urlparse, parse_qs
import json
import os
import traceback
import psycopg2
import psycopg2.extras

CREATE_TABLE_SQL = """
CREATE TABLE IF NOT EXISTS meditation_summaries (
    id SERIAL PRIMARY KEY,
    visitor_id TEXT NOT NULL,
    book TEXT NOT NULL,
    chapter_verse TEXT NOT NULL,
    records JSONB NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
"""


def _get_connection():
    conn = psycopg2.connect(os.environ["POSTGRES_URL"])
    with conn.cursor() as cur:
        cur.execute(CREATE_TABLE_SQL)
    conn.commit()
    return conn


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            content_length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(content_length)
            data = json.loads(raw_body)

            visitor_id = (data.get('visitor_id') or '').strip()
            book = (data.get('book') or '').strip()
            chapter_verse = (data.get('chapter_verse') or '').strip()
            records = data.get('records')

            if not visitor_id or not book or not chapter_verse or not isinstance(records, list):
                self._send_json(400, {"error": "저장할 묵상 정보가 올바르지 않습니다."})
                return

            conn = _get_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        INSERT INTO meditation_summaries (visitor_id, book, chapter_verse, records)
                        VALUES (%s, %s, %s, %s)
                        RETURNING id, created_at
                        """,
                        (visitor_id, book, chapter_verse, psycopg2.extras.Json(records))
                    )
                    row = cur.fetchone()
                conn.commit()
            finally:
                conn.close()

            self._send_json(200, {"id": row[0], "created_at": row[1].isoformat()})

        except Exception:
            traceback.print_exc()
            self._send_json(500, {"error": "잠시 후 다시 시도해주세요."})

    def do_GET(self):
        try:
            query = parse_qs(urlparse(self.path).query)
            visitor_id = (query.get('visitor_id', [''])[0] or '').strip()

            if not visitor_id:
                self._send_json(400, {"error": "visitor_id가 필요합니다."})
                return

            conn = _get_connection()
            try:
                with conn.cursor() as cur:
                    cur.execute(
                        """
                        SELECT id, book, chapter_verse, records, created_at
                        FROM meditation_summaries
                        WHERE visitor_id = %s
                        ORDER BY created_at DESC
                        LIMIT 50
                        """,
                        (visitor_id,)
                    )
                    rows = cur.fetchall()
            finally:
                conn.close()

            summaries = [
                {
                    "id": row[0],
                    "book": row[1],
                    "chapter_verse": row[2],
                    "records": row[3],
                    "created_at": row[4].isoformat()
                }
                for row in rows
            ]

            self._send_json(200, {"summaries": summaries})

        except Exception:
            traceback.print_exc()
            self._send_json(500, {"error": "잠시 후 다시 시도해주세요."})

    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False, default=str).encode('utf-8'))
