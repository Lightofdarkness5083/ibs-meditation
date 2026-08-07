from http.server import BaseHTTPRequestHandler
import json
import os
import traceback
from anthropic import Anthropic

VALID_STAGES = {"observation", "background", "interpretation", "truth", "application"}


class handler(BaseHTTPRequestHandler):
    def do_POST(self):
        try:
            # 환경 변수에서 API 키를 읽어와 Claude 클라이언트 생성
            client = Anthropic(api_key=os.environ.get("ANTHROPIC_API_KEY"))

            content_length = int(self.headers.get('Content-Length', 0))
            raw_body = self.rfile.read(content_length)
            data = json.loads(raw_body)

            stage = (data.get('stage') or '').strip()
            book = (data.get('book') or '').strip()
            chapter_verse = (data.get('chapter_verse') or '').strip()
            history = data.get('history') or []

            # 실패 처리: 본문 정보나 유효하지 않은 단계
            if not chapter_verse or stage not in VALID_STAGES:
                self._send_json(400, {"error": "본문 정보가 필요합니다."})
                return

            answers = {
                item.get('stage'): item.get('answer', '')
                for item in history if isinstance(item, dict)
            }

            prompt = self._build_prompt(stage, book, chapter_verse, answers)

            message = client.messages.create(
                model="claude-sonnet-5",
                max_tokens=800,
                messages=[{"role": "user", "content": prompt}]
            )

            response_text = next(
                block.text for block in message.content if block.type == "text"
            ).strip()

            result_type = "info" if stage == "background" else "question"
            self._send_json(200, {"content": response_text, "type": result_type})

        except Exception:
            traceback.print_exc()
            self._send_json(500, {"error": "잠시 후 다시 시도해주세요."})

    def _build_prompt(self, stage, book, chapter_verse, answers):
        ref = f"{book} {chapter_verse}".strip()

        if stage == "observation":
            return f"""당신은 귀납적 성경공부(IBS)를 돕는 가이드입니다.
본문: {ref}
지금은 '관찰' 단계입니다. 절대 해석하거나 답을 알려주지 마세요.
사용자가 본문을 스스로 관찰하도록 돕는 질문 1개만 만들어주세요.
(예: 누가 누구에게 말하는가? 반복되는 단어는? 대조되는 표현은?)
질문 1개만 출력하고 다른 설명은 붙이지 마세요."""

        if stage == "background":
            return f"""본문: {ref}
이 본문이 기록된 역사적·문화적 배경을 3~4문장으로 설명해주세요.
독자가 스스로 조사하기 어려운 사실 정보 위주로 작성하세요.
마크다운 제목(#)이나 강조(**) 없이, 자연스럽게 이어지는 문단 하나로만 작성하세요."""

        if stage == "interpretation":
            return f"""당신은 귀납적 성경공부(IBS)를 돕는 가이드입니다.
본문: {ref}
사용자의 관찰 내용: "{answers.get('observation', '')}"
사용자의 배경 조사 내용: "{answers.get('background', '')}"
위 내용을 참고하여, 사용자가 이 본문을 당시 독자의 입장에서
해석해보도록 돕는 질문 1개를 만들어주세요.
답을 직접 알려주지 말고, 사용자의 관찰과 연결되는 질문을 만드세요.
질문 1개만 출력하고 다른 설명은 붙이지 마세요."""

        if stage == "truth":
            return f"""당신은 귀납적 성경공부(IBS)를 돕는 가이드입니다.
본문: {ref}
사용자의 해석 내용: "{answers.get('interpretation', '')}"
지금은 '성경적 진리 찾기' 단계입니다. 진리를 대신 요약하거나 결론을 질문 속에 미리 제시하지 마세요.
사용자가 자신의 해석을 바탕으로 이 본문이 말하는 성경적 진리를
스스로 한 문장으로 정리해보도록 돕는 질문 1개만 만들어주세요.
질문 1개만 출력하고 다른 설명은 붙이지 마세요."""

        # application
        return f"""본문: {ref}
사용자가 정리한 성경적 진리: "{answers.get('truth', '')}"
이 진리를 오늘 사용자의 삶에 구체적으로 적용할 수 있도록
돕는 개인적이고 실천 가능한 질문 1개를 만들어주세요.
질문 1개만 출력하고 다른 설명은 붙이지 마세요."""

    def _send_json(self, status_code, data):
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.end_headers()
        self.wfile.write(json.dumps(data, ensure_ascii=False).encode('utf-8'))
