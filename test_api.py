from dotenv import load_dotenv
import os
from anthropic import Anthropic

load_dotenv()

# 디버그: 키가 제대로 로드됐는지 확인 (키 전체를 출력하지 않고 앞 10글자만)
key = os.environ.get("ANTHROPIC_API_KEY")
print("키 확인:", key[:10] if key else "None (로드 안 됨)")

client = Anthropic(api_key=key)

message = client.messages.create(
    model="claude-sonnet-5",
    max_tokens=100,
    messages=[{"role": "user", "content": "골로새서를 한 문장으로 소개해줘"}]
)

print(message.content[0].text)