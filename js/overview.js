const bookSelect = document.getElementById('book-select');
const overviewBtn = document.getElementById('overview-btn');
const statusEl = document.getElementById('overview-status');
const resultEl = document.getElementById('overview-result');
const briEl = document.getElementById('result-bri');
const keyVerseEl = document.getElementById('result-key-verse');
const structureEl = document.getElementById('result-structure');

overviewBtn.addEventListener('click', async () => {
  const book = bookSelect.value;

  if (!book) {
    statusEl.textContent = '책을 선택해주세요.';
    resultEl.style.display = 'none';
    return;
  }

  statusEl.textContent = '개관을 생성하는 중입니다...';
  resultEl.style.display = 'none';
  overviewBtn.disabled = true;

  try {
    const response = await fetch('/api/book-overview', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ book: book })
    });

    const data = await response.json();

    if (!response.ok) {
      statusEl.textContent = data.error || '오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
      return;
    }

    statusEl.textContent = '';
    briEl.textContent = data.bri;
    keyVerseEl.textContent = data.key_verse;

    structureEl.innerHTML = '';
    data.structure.forEach((item) => {
      const li = document.createElement('li');
      li.textContent = item;
      structureEl.appendChild(li);
    });

    resultEl.style.display = 'block';

  } catch (error) {
    statusEl.textContent = '네트워크 오류가 발생했습니다. 잠시 후 다시 시도해주세요.';
  } finally {
    overviewBtn.disabled = false;
  }
});