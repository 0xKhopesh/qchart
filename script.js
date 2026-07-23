let flatQuestions = [];
let categoryBlockList = [];

const COLUMN_WIDTH = 280;
const COLUMN_GAP = 30;
const CARD_GAP = 20;

const ITEMS_PER_COLUMN = 20;

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
    categoryBlockList = [];

    const tempColumn = document.createElement('div');
    tempColumn.className = 'grid-column';
    grid.appendChild(tempColumn);

    for (const [categoryName, questions] of Object.entries(categories)) {
        const block = createCategoryBlock(categoryName, questions);
        categoryBlockList.push(block);
        tempColumn.appendChild(block);
    }

    layoutColumns();
}

function createCategoryBlock(categoryName, questions) {
    const block = document.createElement('div');
    block.className = 'category-block';

    const headerRow = document.createElement('div');
    headerRow.className = 'category-header-row';

    const headerLabel = document.createElement('label');
    headerLabel.className = 'category-header';

    const headerCheckbox = document.createElement('input');
    headerCheckbox.type = 'checkbox';
    headerCheckbox.checked = true;
    headerCheckbox.dataset.category = categoryName;

    headerLabel.appendChild(headerCheckbox);
    headerLabel.append(` ${categoryName}`);

    const collapseBtn = document.createElement('button');
    collapseBtn.type = 'button';
    collapseBtn.className = 'collapse-toggle';
    collapseBtn.textContent = '▾';
    collapseBtn.setAttribute('aria-expanded', 'true');
    collapseBtn.setAttribute('aria-label', `Collapse ${categoryName}`);

    headerRow.appendChild(headerLabel);
    headerRow.appendChild(collapseBtn);
    block.appendChild(headerRow);

    const questionsContainer = document.createElement('div');
    questionsContainer.className = 'questions-container';

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
        questionsContainer.appendChild(qLabel);

        childCheckboxes.push(qCheck);

        flatQuestions.push({
            category: categoryName,
            text: qText,
            checkboxEl: qCheck
        });
    });

    block.appendChild(questionsContainer);

    headerCheckbox.addEventListener('change', function () {
        childCheckboxes.forEach(cb => (cb.checked = this.checked));
    });

    childCheckboxes.forEach(cb => {
        cb.addEventListener('change', function () {
            headerCheckbox.checked = childCheckboxes.every(c => c.checked);
        });
    });

    collapseBtn.addEventListener('click', () => {
        const nowCollapsed = block.classList.toggle('collapsed');
        questionsContainer.style.display = nowCollapsed ? 'none' : '';
        collapseBtn.setAttribute('aria-expanded', String(!nowCollapsed));
        collapseBtn.setAttribute('aria-label', (nowCollapsed ? 'Expand ' : 'Collapse ') + categoryName);
        layoutColumns();
    });

    return block;
}

function layoutColumns() {
    const grid = document.getElementById('questionGrid');
    if (!grid || categoryBlockList.length === 0) return;

    const gridStyles = getComputedStyle(grid);
    const paddingLeft = parseFloat(gridStyles.paddingLeft) || 0;
    const paddingRight = parseFloat(gridStyles.paddingRight) || 0;
    const availableWidth = grid.clientWidth - paddingLeft - paddingRight;

    const numColumns = Math.max(
        1,
        Math.floor((availableWidth + COLUMN_GAP) / (COLUMN_WIDTH + COLUMN_GAP))
    );

    const heights = categoryBlockList.map(block => block.offsetHeight);
    const totalHeight = heights.reduce((sum, h) => sum + h + CARD_GAP, 0);
    const tallestSingle = Math.max(...heights) + CARD_GAP;

    const targetHeight = Math.max(totalHeight / numColumns, tallestSingle);

    const columnBuckets = Array.from({ length: numColumns }, () => []);
    let columnIndex = 0;
    let currentColumnHeight = 0;

    categoryBlockList.forEach((block, i) => {
        const h = heights[i] + CARD_GAP;
        const wouldOverflow = currentColumnHeight + h > targetHeight;
        const hasRoomToMoveOn = columnIndex < numColumns - 1;

        if (wouldOverflow && currentColumnHeight > 0 && hasRoomToMoveOn) {
            columnIndex++;
            currentColumnHeight = 0;
        }

        columnBuckets[columnIndex].push(block);
        currentColumnHeight += h;
    });

    grid.innerHTML = '';
    columnBuckets.forEach(blocks => {
        const columnEl = document.createElement('div');
        columnEl.className = 'grid-column';
        blocks.forEach(block => columnEl.appendChild(block));
        grid.appendChild(columnEl);
    });
}

function debounce(fn, wait) {
    let t;
    return (...args) => {
        clearTimeout(t);
        t = setTimeout(() => fn(...args), wait);
    };
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

function buildColumns(limitedQuestions, showCategoryHeaders, itemsPerColumn) {
    const columns = [];
    let currentColumn = [];
    let countInColumn = 0;
    let currentCategory = null;

    limitedQuestions.forEach((q, i) => {
        if (showCategoryHeaders && q.category !== currentCategory) {
            currentCategory = q.category;
            currentColumn.push({ type: 'header', text: currentCategory });
        }

        currentColumn.push({ type: 'question', number: i + 1, text: q.text });
        countInColumn++;

        if (countInColumn >= itemsPerColumn) {
            columns.push(currentColumn);
            currentColumn = [];
            countInColumn = 0;
        }
    });

    if (currentColumn.length > 0) {
        columns.push(currentColumn);
    }

    return columns;
}

function createOverlayItem(displayNumber, text) {
    const item = document.createElement('div');
    item.className = 'overlay-item';

    const num = document.createElement('span');
    num.className = 'overlay-number';
    num.textContent = displayNumber + '.';

    const textEl = document.createElement('span');
    textEl.className = 'overlay-text';
    textEl.textContent = text;

    item.appendChild(num);
    item.appendChild(textEl);
    return item;
}

function getRequestedCount(maxAvailable) {
    const countInput = document.getElementById('optCount');
    let count = parseInt(countInput.value, 10);
    if (isNaN(count) || count < 1) count = 1;
    count = Math.min(count, 40, maxAvailable);
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
    const columns = buildColumns(limited, showCategoryHeaders, ITEMS_PER_COLUMN);

    columns.forEach(columnEntries => {
        const columnEl = document.createElement('div');
        columnEl.className = 'overlay-column';

        columnEntries.forEach(entry => {
            if (entry.type === 'header') {
                const catHeader = document.createElement('div');
                catHeader.className = 'overlay-category-header';
                catHeader.textContent = entry.text;
                columnEl.appendChild(catHeader);
            } else {
                columnEl.appendChild(createOverlayItem(entry.number, entry.text));
            }
        });

        overlayContent.appendChild(columnEl);
    });
}

function fitOverlayToScreen() {
    const content = document.getElementById('overlayContent');
    const buffer = 40;
    const minScale = 0.4;
    const step = 0.05;

    let scale = 1;
    content.style.setProperty('--ov-scale', scale);

    const top = content.getBoundingClientRect().top;
    const availableHeight = window.innerHeight - top - buffer;
    const availableWidth = window.innerWidth - buffer * 2;

    while (
        (content.scrollWidth > availableWidth || content.scrollHeight > availableHeight) &&
        scale > minScale
    ) {
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
groupLabel.classList.toggle('hidden', !randomCheckbox.checked);
randomCheckbox.addEventListener('change', function () {
    groupLabel.classList.toggle('hidden', !this.checked);
});

countInput.addEventListener('change', function () {
    let v = parseInt(this.value, 10);
    if (isNaN(v) || v < 1) v = 1;
    if (v > 40) v = 40;
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

window.addEventListener('resize', debounce(() => {
    layoutColumns();
    const overlay = document.getElementById('overlay');
    if (overlay.style.display === 'block') {
        fitOverlayToScreen();
    }
}, 120));
});
