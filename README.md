# ibs-meditation (Q&A IBS 묵상)

귀납적 성경 공부(IBS) 방식으로 성경을 묵상할 수 있도록 돕는 웹 서비스입니다. 서비스 기획 배경과 상세 요구사항은 [기획서.md](기획서.md)를 참고하세요.

배포 주소: https://ibs-meditation.vercel.app

## 주요 기능

- **성경책 개관**: 책을 선택하면 AI(Claude)가 BRI, key verse, 문단 구조를 정리해 보여줍니다.
- **7단계 묵상**: 기도 → 소리내어 읽기 → 관찰 → 배경 → 해석 → 성경적 진리 → 개인 적용 순서로, AI가 정답 대신 질문을 던지며 스스로 본문을 발견하도록 돕습니다.
- **본문 조회**: 개역한글 성경 데이터를 장·절 단위로 조회합니다.
- **묵상 기록**: 완료한 묵상을 저장하고, 나중에 브라우저별로 다시 꺼내볼 수 있습니다 (로그인 없이 익명 ID로 구분).

## 기술 스택

- 프론트엔드: HTML / CSS / JavaScript (프레임워크 없음, 정적 파일)
- 백엔드: Vercel Serverless Functions (Python, `http.server.BaseHTTPRequestHandler` 기반)
- 데이터베이스: Vercel Postgres (Neon)
- AI: Claude API (Anthropic)
- 배포: GitHub → Vercel (main 브랜치 push 시 자동 배포)

## 프로젝트 구조

```
├── index.html            홈
├── overview.html          성경책 개관 페이지
├── meditation.html        묵상하기 페이지
├── records.html           묵상 기록 페이지
├── css/style.css
├── js/
│   ├── overview.js
│   ├── meditation.js
│   ├── records.js
│   └── visitor.js         브라우저별 익명 ID(localStorage) 생성
├── data/bible_kor.json     개역한글 성경 본문 데이터
└── api/                    Vercel Python 함수 (아래 라우팅 표 참고)
    ├── app.py
    ├── main.py
    ├── server.py
    └── wsgi.py
```

## API 라우팅

Vercel의 Python 런타임은 `/api` 안에서 특정 파일명(`app.py`, `index.py`, `server.py`, `main.py`, `wsgi.py`, `asgi.py`)만 함수로 자동 인식합니다. 그래서 실제 파일명과 프론트엔드가 호출하는 URL이 다르며, `vercel.json`의 `rewrites`로 연결되어 있습니다.

| 호출 경로 (프론트엔드) | 실제 파일 | 설명 |
|---|---|---|
| `POST /api/book-overview` | `api/app.py` | 성경책 개관 생성 (Claude) |
| `POST /api/ibs-guide` | `api/main.py` | 묵상 단계별 AI 가이드 질문 (Claude) |
| `GET /api/verses` | `api/server.py` | 본문 조회 (정적 데이터, AI 미사용) |
| `POST` / `GET /api/summaries` | `api/wsgi.py` | 묵상 기록 저장 / 조회 (Postgres) |

파일 추가·변경 시 이 표와 `vercel.json`을 함께 확인하세요.

## 환경 변수

Vercel 프로젝트 설정 → Environment Variables에 아래 값이 필요합니다.

| 변수명 | 용도 |
|---|---|
| `ANTHROPIC_API_KEY` | Claude API 호출 (개관 생성, 묵상 가이드) |
| `POSTGRES_URL` | 묵상 기록 저장/조회. Vercel Storage에서 Postgres(Neon)를 프로젝트에 연결하면 자동으로 추가됩니다. |

## 로컬 개발

정적 파일(HTML/CSS/JS)만 볼 때는 Node 설치 없이 바로 확인할 수 있습니다.

```bash
python3 -m http.server 5500
```

단, `/api/*` 엔드포인트는 Vercel Python 런타임에서만 동작하므로, API까지 포함해 실제와 동일하게 확인하려면 Node.js와 Vercel CLI가 필요합니다.

```bash
npm i -g vercel
vercel dev
```

## 배포

`main` 브랜치에 push하면 Vercel이 자동으로 빌드·배포합니다. 배포 상태는 Vercel 대시보드의 Deployments 탭에서 확인할 수 있습니다.
