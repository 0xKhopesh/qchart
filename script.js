
let flatQuestions = [];


function initTheme() {
    const saved = localStorage.getItem('icebreakTheme');
    const isLight = saved === 'light';
    document.body.classList.toggle('light-theme', isLight);
    updateThemeButtonLabel();
}

function toggleTheme() {
    const isLight = document.body.classList.toggle('light-theme');
    localStorage.setItem('icebreakTheme', isLight ? 'light' : 'dark');
    updateThemeButtonLabel();
}

function updateThemeButtonLabel() {
    const btn = document.getElementById('themeToggle');
    if (!btn) return;
    const isLight = document.body.classList.contains('light-theme');
    btn.textContent = isLight ? '🌙 Dark Mode' : '☀️ Light Mode';
}


function renderMainScreen() {
    const grid = document.getElementById('questionGrid');
    if (!grid) return;
    grid.innerHTML = '';
    flatQuestions = [];

    for (const [categoryName, questions] of Object.entries(categories)) {
        const block = createCategoryBlock(categoryName, questions);
        grid.appendChild(block);
    }
}

function createCategoryBlock(categoryName, questions) {
    const block = document.createElement('div');
    block.className = 'category-block';

    const headerLabel = document.createElement('label');
    headerLabel.className = 'category-header';

    const headerCheckbox = document.createElement('input');
    headerCheckbox.type = 'checkbox';
    headerCheckbox.checked = true;
    headerCheckbox.dataset.category = categoryName;

    headerLabel.appendChild(headerCheckbox);
    headerLabel.append(` ${categoryName}`);
    block.appendChild(headerLabel);

    const childCheckboxes = [];
    questions.forEach((qText) => {
        const qLabel = document.createElement('label');
        qLabel.className = 'question-label';

        const qCheck = document.createElement('input');
        qCheck.type = 'checkbox';
        qCheck.className = 'question-check';
        qCheck.checked = true;
        qCheck.dataset.category = categoryName;
        qCheck.dataset.question = qText;

        qLabel.appendChild(qCheck);
        qLabel.append(` ${qText}`);
        block.appendChild(qLabel);

        childCheckboxes.push(qCheck);

        flatQuestions.push({
            category: categoryName,
            text: qText,
            checkboxEl: qCheck
        });
    });

    headerCheckbox.addEventListener('change', function () {
        childCheckboxes.forEach(cb => (cb.checked = this.checked));
    });

    childCheckboxes.forEach(cb => {
        cb.addEventListener('change', function () {
            headerCheckbox.checked = childCheckboxes.every(c => c.checked);
        });
    });

    return block;
}

function shuffleArray(arr) {
    const a = arr.slice();
    for (let i = a.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [a[i], a[j]] = [a[j], a[i]];
    }
    return a;
}

function getCheckedQuestions() {
    return flatQuestions.filter(q => q.checkboxEl.checked);
}

function buildOverlayOrder(checkedQuestions, randomize, keepGrouped) {
    if (!randomize) {
        return checkedQuestions;
    }

    if (keepGrouped) {
        const byCategory = {};
        checkedQuestions.forEach(q => {
            (byCategory[q.category] = byCategory[q.category] || []).push(q);
        });

        const shuffledCategoryNames = shuffleArray(Object.keys(byCategory));
        let result = [];
        shuffledCategoryNames.forEach(cat => {
            result = result.concat(shuffleArray(byCategory[cat]));
        });
        return result;
    }

    return shuffleArray(checkedQuestions);
}

function createOverlayItem(displayNumber, q) {
    const item = document.createElement('div');
    item.className = 'overlay-item';

    const num = document.createElement('span');
    num.className = 'overlay-number';
    num.textContent = displayNumber + '.';

    const text = document.createElement('span');
    text.className = 'overlay-text';
    text.textContent = q.text;

    item.appendChild(num);
    item.appendChild(text);
    return item;
}

function getRequestedCount(maxAvailable) {
    const countInput = document.getElementById('optCount');
    let count = parseInt(countInput.value, 10);
    if (isNaN(count) || count < 1) count = 1;
    count = Math.min(count, 100, maxAvailable);
    countInput.value = count;
    return count;
}

function renderOverlay() {
    const overlayContent = document.getElementById('overlayContent');
    overlayContent.innerHTML = '';

    const randomize = document.getElementById('optRandom').checked;
    const keepGrouped = document.getElementById('optGroup').checked;

    const checked = getCheckedQuestions();

    if (checked.length === 0) {
        const empty = document.createElement('p');
        empty.className = 'overlay-empty';
        empty.textContent = 'No questions selected — check some boxes first!';
        overlayContent.appendChild(empty);
        return;
    }

    const count = getRequestedCount(checked.length);
    const ordered = buildOverlayOrder(checked, randomize, keepGrouped);
    const limited = ordered.slice(0, count);

    const showCategoryHeaders = randomize && keepGrouped;

    let currentCategory = null;
    limited.forEach((q, i) => {
        if (showCategoryHeaders && q.category !== currentCategory) {
            currentCategory = q.category;
            const catHeader = document.createElement('div');
            catHeader.className = 'overlay-category-header';
            catHeader.textContent = currentCategory;
            overlayContent.appendChild(catHeader);
        }
        overlayContent.appendChild(createOverlayItem(i + 1, q));
    });
}

function fitOverlayToScreen() {
    const content = document.getElementById('overlayContent');
    const bottomBuffer = 40;
    const minScale = 0.4;
    const step = 0.05;

    content.style.height = 'auto';
    content.style.setProperty('--ov-scale', 1);

    const top = content.getBoundingClientRect().top;
    const availableHeight = window.innerHeight - top - bottomBuffer;

    if (content.scrollHeight <= availableHeight) {
        return;
    }

    content.style.height = availableHeight + 'px';

    let scale = 1;

    while (content.scrollWidth > content.clientWidth && scale > minScale) {
        scale = Math.round((scale - step) * 100) / 100;
        content.style.setProperty('--ov-scale', scale);
    }
}


document.addEventListener('DOMContentLoaded', () => {
    initTheme();
    renderMainScreen();

    const countInput = document.getElementById('optCount');
    const defaultCount = 20;
    countInput.value = Math.min(defaultCount, flatQuestions.length) || 1;

    document.getElementById('themeToggle').addEventListener('click', toggleTheme);

    const randomCheckbox = document.getElementById('optRandom');
    const groupLabel = document.getElementById('groupLabel');
    groupLabel.classList.toggle('hidden', !randomCheckbox.checked); // reflect default-checked state
    randomCheckbox.addEventListener('change', function () {
        groupLabel.classList.toggle('hidden', !this.checked);
    });

    countInput.addEventListener('change', function () {
        let v = parseInt(this.value, 10);
        if (isNaN(v) || v < 1) v = 1;
        if (v > 100) v = 100;
        this.value = v;
    });

    document.getElementById('displayBtn').addEventListener('click', () => {
        renderOverlay();
        document.getElementById('overlay').style.display = 'block';
        fitOverlayToScreen();
    });

    document.getElementById('closeOverlay').addEventListener('click', () => {
        document.getElementById('overlay').style.display = 'none';
    });

    window.addEventListener('resize', () => {
        const overlay = document.getElementById('overlay');
        if (overlay.style.display === 'block') {
            fitOverlayToScreen();
        }
    });
});
