const STAGES = [
  {
    key: 'prayer',
    label: '1 / 7 · 기도',
    title: '기도로 시작하기',
    needsApi: false,
    instruction: '묵상을 시작하기 전, 본문을 통해 하나님을 만나게 해달라고 잠시 기도해보세요.',
    placeholder: '오늘 드리는 기도를 적어보세요 (선택)'
  },
  {
    key: 'reading',
    label: '2 / 7 · 소리내어 읽기',
    title: '본문을 소리내어 읽어보세요',
    needsApi: false,
    instruction: '위에 표시된 본문을 소리내어 읽어보세요.',
    placeholder: '읽으며 떠오른 생각을 적어보세요 (선택)'
  },
  {
    key: 'observation',
    label: '3 / 7 · 관찰',
    title: '본문을 관찰해보세요',
    needsApi: true,
    placeholder: '관찰한 내용을 적어보세요'
  },
  {
    key: 'background',
    label: '4 / 7 · 배경',
    title: '역사적 배경',
    needsApi: true,
    placeholder: '배경을 읽고 느낀 점이나 메모를 적어보세요 (선택)'
  },
  {
    key: 'interpretation',
    label: '5 / 7 · 해석',
    title: '본문을 해석해보세요',
    needsApi: true,
    placeholder: '해석한 내용을 적어보세요'
  },
  {
    key: 'truth',
    label: '6 / 7 · 성경적 진리',
    title: '진리를 한 문장으로 정리해보세요',
    needsApi: true,
    placeholder: '발견한 성경적 진리를 적어보세요'
  },
  {
    key: 'application',
    label: '7 / 7 · 개인 적용',
    title: '삶에 적용해보세요',
    needsApi: true,
    placeholder: '오늘 실천할 적용을 적어보세요'
  }
];

// 본문 패널: 개인 적용 단계를 제외한 모든 단계에서 계속 표시
const VERSE_HIDDEN_STAGES = new Set(['application']);
// Question+답변을 하나의 박스로 묶어 보여줄 단계
const BOXED_STAGES = new Set(['observation', 'interpretation', 'truth', 'application']);

const setupSection = document.getElementById('setup-section');
const bookSelect = document.getElementById('book-select');
const chapterVerseInput = document.getElementById('chapter-verse-input');
const startBtn = document.getElementById('start-btn');
const setupStatus = document.getElementById('setup-status');

const stageSection = document.getElementById('stage-section');
const stageLabel = document.getElementById('stage-label');
const stageTitle = document.getElementById('stage-title');

const versePanel = document.getElementById('verse-panel');
const versePanelTitle = document.getElementById('verse-panel-title');
const versePanelBody = document.getElementById('verse-panel-body');
const verseToggleBtn = document.getElementById('verse-toggle-btn');

const qaBox = document.getElementById('qa-box');
const stageLoading = document.getElementById('stage-loading');
const stageContent = document.getElementById('stage-content');
const retryBtn = document.getElementById('retry-btn');
const stageAnswer = document.getElementById('stage-answer');
const nextBtn = document.getElementById('next-btn');

const doneSection = document.getElementById('done-section');
const restartBtn = document.getElementById('restart-btn');
const summaryList = document.getElementById('summary-list');
const saveBtn = document.getElementById('save-btn');
const saveStatus = document.getElementById('save-status');

let book = '';
let chapterVerse = '';
let verseLines = [];
let verseExpanded = true;
let history = [];
let stageRecords = [];
let currentIndex = 0;

startBtn.addEventListener('click', async () => {
  book = bookSelect.value;
  chapterVerse = chapterVerseInput.value.trim();

  if (!book || !chapterVerse) {
    setupStatus.textContent = '성경책과 장·절을 모두 입력해주세요.';
    return;
  }

  const valid = await validateAndLoadVerses();
  if (!valid) return;

  history = [];
  stageRecords = [];
  currentIndex = 0;
  verseExpanded = true;
  saveStatus.textContent = '';
  saveBtn.disabled = false;

  setupSection.style.display = 'none';
  doneSection.style.display = 'none';
  stageSection.style.display = 'block';

  renderStage();
});

nextBtn.addEventListener('click', () => {
  const stage = STAGES[currentIndex];
  const answer = stageAnswer.value.trim();

  if (answer) {
    history.push({ stage: stage.key, answer: answer });
  }

  stageRecords.push({
    title: stage.title,
    content: stageContent.textContent,
    answer: answer
  });

  currentIndex += 1;

  if (currentIndex >= STAGES.length) {
    renderSummary();
    stageSection.style.display = 'none';
    doneSection.style.display = 'block';
    return;
  }

  renderStage();
});

restartBtn.addEventListener('click', () => {
  bookSelect.value = '';
  chapterVerseInput.value = '';
  setupStatus.textContent = '';
  verseLines = [];
  stageRecords = [];
  summaryList.innerHTML = '';
  saveStatus.textContent = '';
  saveBtn.disabled = false;
  doneSection.style.display = 'none';
  setupSection.style.display = 'block';
});

saveBtn.addEventListener('click', async () => {
  saveBtn.disabled = true;
  saveStatus.textContent = '저장하는 중입니다...';

  try {
    const response = await fetch('/api/summaries', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        visitor_id: getVisitorId(),
        book: book,
        chapter_verse: chapterVerse,
        records: stageRecords
      })
    });

    if (!response.ok) {
      throw new Error();
    }

    saveStatus.textContent = '저장되었습니다. "묵상 기록"에서 확인할 수 있어요.';

  } catch (error) {
    saveStatus.textContent = '저장에 실패했습니다. 잠시 후 다시 시도해주세요.';
    saveBtn.disabled = false;
  }
});

verseToggleBtn.addEventListener('click', () => {
  verseExpanded = !verseExpanded;
  versePanelBody.style.display = verseExpanded ? 'block' : 'none';
  verseToggleBtn.textContent = verseExpanded ? '접기' : '펼치기';
});

function parseChapterVerse(cv) {
  const match = cv.match(/^(\d+):(\d+)(?:-(\d+))?$/);
  if (!match) return null;
  const [, chapter, start, end] = match;
  return { chapter: chapter, start: start, end: end || start };
}

async function validateAndLoadVerses() {
  const parsed = parseChapterVerse(chapterVerse);

  if (!parsed) {
    setupStatus.textContent = '장·절 형식이 올바르지 않습니다. (예: 1:15-20)';
    return false;
  }

  startBtn.disabled = true;
  setupStatus.textContent = '입력하신 장·절을 확인하는 중입니다...';

  try {
    const url = `/api/verses?book=${encodeURIComponent(book)}&chapter=${encodeURIComponent(parsed.chapter)}&start=${encodeURIComponent(parsed.start)}&end=${encodeURIComponent(parsed.end)}`;

    let response;
    try {
      response = await fetch(url);
    } catch (networkError) {
      setupStatus.textContent = '네트워크 연결을 확인한 뒤 다시 시도해주세요.';
      return false;
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      setupStatus.textContent = '서버 응답을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.';
      return false;
    }

    if (!response.ok) {
      setupStatus.textContent = '입력하신 장·절을 찾을 수 없습니다. 다시 확인해주세요.';
      return false;
    }

    verseLines = data.verses;
    setupStatus.textContent = '';
    return true;

  } finally {
    startBtn.disabled = false;
  }
}

function updateVersePanel(stage) {
  if (VERSE_HIDDEN_STAGES.has(stage.key)) {
    versePanel.style.display = 'none';
    return;
  }

  versePanel.style.display = 'block';
  versePanelTitle.textContent = `${book} ${chapterVerse}`;
  versePanelBody.textContent = verseLines.map((v) => `${v.verse} ${v.text}`).join('\n');
  versePanelBody.style.display = verseExpanded ? 'block' : 'none';
  verseToggleBtn.textContent = verseExpanded ? '접기' : '펼치기';
}

function updateQaBoxStyle(stage) {
  qaBox.classList.toggle('qa-box--boxed', BOXED_STAGES.has(stage.key));
}

function renderSummary() {
  summaryList.innerHTML = '';

  stageRecords.forEach((record) => {
    const card = document.createElement('div');
    card.className = 'summary-card';

    const heading = document.createElement('h3');
    heading.textContent = record.title;
    card.appendChild(heading);

    if (record.content) {
      const questionEl = document.createElement('p');
      questionEl.className = 'summary-question';
      questionEl.textContent = record.content;
      card.appendChild(questionEl);
    }

    const answerEl = document.createElement('p');
    if (record.answer) {
      answerEl.className = 'summary-answer';
      answerEl.textContent = record.answer;
    } else {
      answerEl.className = 'summary-answer summary-answer--empty';
      answerEl.textContent = '(답변 없음)';
    }
    card.appendChild(answerEl);

    summaryList.appendChild(card);
  });
}

function renderStage() {
  const stage = STAGES[currentIndex];

  stageLabel.textContent = `${stage.label} · ${book} ${chapterVerse}`;
  stageTitle.textContent = stage.title;
  stageAnswer.value = '';
  stageAnswer.placeholder = stage.placeholder;

  stageContent.style.display = 'none';
  stageContent.textContent = '';
  retryBtn.style.display = 'none';

  updateVersePanel(stage);
  updateQaBoxStyle(stage);

  if (!stage.needsApi) {
    stageContent.textContent = stage.instruction;
    stageContent.style.display = 'block';
    return;
  }

  fetchGuide(stage.key);
}

async function fetchGuide(stageKey) {
  stageLoading.style.display = 'block';
  stageContent.style.display = 'none';
  retryBtn.style.display = 'none';
  nextBtn.disabled = true;

  try {
    let response;
    try {
      response = await fetch('/api/ibs-guide', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          stage: stageKey,
          book: book,
          chapter_verse: chapterVerse,
          history: history
        })
      });
    } catch (networkError) {
      throw new Error('네트워크 연결을 확인한 뒤 다시 시도해주세요.');
    }

    let data;
    try {
      data = await response.json();
    } catch (parseError) {
      throw new Error('서버 응답을 처리하지 못했습니다. 잠시 후 다시 시도해주세요.');
    }

    if (!response.ok) {
      throw new Error(data.error || '오류가 발생했습니다. 잠시 후 다시 시도해주세요.');
    }

    stageContent.textContent = data.content;
    stageContent.style.display = 'block';

  } catch (error) {
    stageContent.textContent = error.message;
    stageContent.style.display = 'block';
    retryBtn.style.display = 'inline-block';
    retryBtn.onclick = () => fetchGuide(stageKey);

  } finally {
    stageLoading.style.display = 'none';
    nextBtn.disabled = false;
  }
}
