from http.server import BaseHTTPRequestHandler
import json
import os
import re
from anthropic import Anthropic

# 환경 변수에서 API 키를 읽어와 Claude 클라이언트 생성
client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # 프론트에서 보낸 요청 본문(JSON)을 읽어온다
            content_length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(content_length)
            data = json.loads(raw_body)
            book_name = data.get('book', '').strip()

            # 실패 처리 1: 책 이름이 비어있는 경우
            if not book_name:
                self._send_json(400, {"error": "책을 선택해주세요."})
                return

            # Claude에게 보낼 프롬프트: 반드시 JSON 형식으로만 답하도록 강하게 지시
            prompt = f"""당신은 성경 연구를 돕는 전문가입니다.
'{book_name}'에 대한 개관 정보를 아래 JSON 형식으로만, 다른 설명 없이 정확히 응답하세요.

{{
  "bri": "저자, 기록연대, 기록목적을 포함한 핵심 정보 (3~4문장)",
  "key_verse": "이 책의 key verse 구절 위치와 간단한 이유 (1~2문장)",
  "structure": ["1~2장: 설명", "3~5장: 설명", "..."]
}}
"""

            message = client.messages.create(
                model="claude-sonnet-5",
                max_tokens=2000,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = next(
                block.text for block in message.content if block.type == "text"
            )
            # Claude가 ```json ... ``` 코드펜스로 감싸서 응답하는 경우가 있어 제거한다
            response_text = re.sub(r"^```(?:json)?\s*|\s*```$", "", response_text.strip())

            try:
                result = json.loads(response_text)
            except json.JSONDecodeError:
                self._send_json(500, {"error": "결과를 처리하는 중 오류가 발생했습니다. 다시 시도해주세요."})
                return

            self._send_json(200, result)

        except Exception:
            self._send_json(500, {"error": "잠시 후 다시 시도해주세요."})

    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))