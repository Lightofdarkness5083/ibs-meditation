const recordsStatus = document.getElementById('records-status');
const recordsList = document.getElementById('records-list');

function formatDate(iso) {
  const d = new Date(iso);
  return d.toLocaleString('ko-KR', { dateStyle: 'medium', timeStyle: 'short' });
}

function renderRecords(summaries) {
  recordsList.innerHTML = '';

  summaries.forEach((summary) => {
    const card = document.createElement('details');
    card.className = 'record-card';

    const heading = document.createElement('summary');
    heading.className = 'record-card-heading';
    heading.innerHTML = `<span>${summary.book} ${summary.chapter_verse}</span><span class="record-card-date">${formatDate(summary.created_at)}</span>`;
    card.appendChild(heading);

    const body = document.createElement('div');
    body.className = 'record-card-body';

    summary.records.forEach((record) => {
      const stageBlock = document.createElement('div');
      stageBlock.className = 'summary-card';

      const stageHeading = document.createElement('h3');
      stageHeading.textContent = record.title;
      stageBlock.appendChild(stageHeading);

      if (record.content) {
        const questionEl = document.createElement('p');
        questionEl.className = 'summary-question';
        questionEl.textContent = record.content;
        stageBlock.appendChild(questionEl);
      }

      const answerEl = document.createElement('p');
      if (record.answer) {
        answerEl.className = 'summary-answer';
        answerEl.textContent = record.answer;
      } else {
        answerEl.className = 'summary-answer summary-answer--empty';
        answerEl.textContent = '(답변 없음)';
      }
      stageBlock.appendChild(answerEl);

      body.appendChild(stageBlock);
    });

    card.appendChild(body);
    recordsList.appendChild(card);
  });
}

async function loadRecords() {
  recordsStatus.textContent = '불러오는 중입니다...';

  try {
    const response = await fetch(`/api/summaries?visitor_id=${encodeURIComponent(getVisitorId())}`);
    const data = await response.json();

    if (!response.ok) {
      throw new Error();
    }

    if (data.summaries.length === 0) {
      recordsStatus.textContent = '아직 저장된 묵상 기록이 없습니다.';
      return;
    }

    recordsStatus.textContent = '';
    renderRecords(data.summaries);

  } catch (error) {
    recordsStatus.textContent = '기록을 불러오지 못했습니다. 잠시 후 다시 시도해주세요.';
  }
}

loadRecords();
