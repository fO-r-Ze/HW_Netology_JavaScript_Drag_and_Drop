import Storage from './Storage.js';
import Card from './Card.js';
import EditorModal from './EditorModal.js';

const DEFAULT_STATE = {
  columns: [
    { id: 'todo', title: 'TODO', cards: [] },
    { id: 'inprogress', title: 'In Progress', cards: [] },
    { id: 'done', title: 'Done', cards: [] },
  ],
};

function migrateCard(card) {
  if (typeof card.title !== 'string' && typeof card.text === 'string') {
    return {
      id: card.id,
      title: card.text,
      description: '',
      color: '',
      images: [],
      checklist: [],
    };
  }
  return {
    id: card.id,
    title: typeof card.title === 'string' ? card.title : '',
    description: typeof card.description === 'string' ? card.description : '',
    color: typeof card.color === 'string' ? card.color : '',
    images: Array.isArray(card.images) ? card.images : [],
    checklist: Array.isArray(card.checklist) ? card.checklist : [],
  };
}

export default class Board {
  constructor(root) {
    this.root = root;
    this.state = null;
    this.nextCardId = 1;

    this.placeholder = null;
    this.draggedElement = null;
    this.justDropped = false;

    this.editor = new EditorModal();

    this.handleClick = this.handleClick.bind(this);
    this.handleChange = this.handleChange.bind(this);
    this.handleMouseDown = this.handleMouseDown.bind(this);
    this.handleDragStart = this.handleDragStart.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleDragEnd = this.handleDragEnd.bind(this);
  }

  init() {
    const saved = Storage.load();
    this.state = saved || JSON.parse(JSON.stringify(DEFAULT_STATE));

    for (const col of this.state.columns) {
      col.cards = col.cards.map(migrateCard);
    }
    this.recalcNextCardId();

    this.root.addEventListener('click', this.handleClick);
    this.root.addEventListener('change', this.handleChange);
    this.root.addEventListener('mousedown', this.handleMouseDown);
    this.root.addEventListener('dragstart', this.handleDragStart);
    this.root.addEventListener('dragover', this.handleDragOver);
    this.root.addEventListener('drop', this.handleDrop);
    this.root.addEventListener('dragend', this.handleDragEnd);

    this.render();
  }

  recalcNextCardId() {
    let max = 0;
    for (const col of this.state.columns) {
      for (const card of col.cards) {
        if (card.id > max) max = card.id;
      }
    }
    this.nextCardId = max + 1;
  }

  save() {
    Storage.save(this.state);
  }

  findCard(cardId) {
    for (const col of this.state.columns) {
      const card = col.cards.find((c) => c.id === cardId);
      if (card) return card;
    }
    return null;
  }

  render() {
    this.root.innerHTML = '';
    const board = document.createElement('div');
    board.className = 'board';

    for (const col of this.state.columns) {
      board.append(this.renderColumn(col));
    }

    this.root.append(board);
  }

  renderColumn(col) {
    const columnEl = document.createElement('div');
    columnEl.className = 'column';
    columnEl.dataset.columnId = col.id;

    const title = document.createElement('h2');
    title.className = 'column__title';
    title.textContent = col.title;

    const cards = document.createElement('div');
    cards.className = 'column__cards';
    cards.dataset.columnId = col.id;

    for (const cardData of col.cards) {
      const card = new Card(cardData);
      cards.append(card.render());
    }

    const footer = document.createElement('div');
    footer.className = 'column__footer';

    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'column__add';
    addBtn.textContent = '+ Add another card';
    footer.append(addBtn);

    columnEl.append(title, cards, footer);
    return columnEl;
  }

  // ---------- Клики ----------
  handleClick(event) {
    if (this.justDropped) {
      this.justDropped = false;
      return;
    }

    // Клик по чекбоксу списка на карточке — не открываем редактор
    if (event.target.closest('.card__checklist-checkbox')) {
      return;
    }

    const editBtn = event.target.closest('.card__action--edit');
    if (editBtn) {
      const cardEl = editBtn.closest('.card');
      if (cardEl) this.openEditor(Number(cardEl.dataset.id));
      return;
    }

    const delBtn = event.target.closest('.card__action--delete');
    if (delBtn) {
      const cardEl = delBtn.closest('.card');
      if (cardEl) this.deleteCard(Number(cardEl.dataset.id));
      return;
    }

    // Клик по самой карточке (но не по чекбоксу) — открывает редактор
    const cardEl = event.target.closest('.card');
    if (cardEl) {
      this.openEditor(Number(cardEl.dataset.id));
      return;
    }

    // «+ Add another card» — открываем редактор в режиме создания
    const addBtn = event.target.closest('.column__add');
    if (addBtn) {
      const columnEl = addBtn.closest('.column');
      if (columnEl) this.openNewCardEditor(columnEl.dataset.columnId);
    }
  }

  // ---------- Изменение чекбоксов чек-листа ----------
  handleChange(event) {
    const checkbox = event.target.closest('.card__checklist-checkbox');
    if (!checkbox) return;

    const cardEl = checkbox.closest('.card');
    if (!cardEl) return;

    const cardId = Number(cardEl.dataset.id);
    const itemIndex = Number(checkbox.dataset.index);
    const card = this.findCard(cardId);
    if (!card || !Array.isArray(card.checklist) || !card.checklist[itemIndex]) {
      return;
    }

    card.checklist[itemIndex].done = checkbox.checked;
    this.save();

    // Перерисовываем только эту карточку
    const updated = new Card(card);
    const newCardEl = updated.render();
    cardEl.replaceWith(newCardEl);
  }

  // Не давать начинать drag с кнопок действий и чекбоксов
  handleMouseDown(event) {
    if (
      event.target.closest('.card__action') ||
      event.target.closest('.card__checklist-checkbox')
    ) {
      event.preventDefault();
    }
  }

  // ---------- Редактор: редактирование существующей карточки ----------
  openEditor(cardId) {
    const card = this.findCard(cardId);
    if (!card) return;

    this.editor.open(card, {
      onSave: (updated) => {
        const target = this.findCard(updated.id);
        if (!target) return;
        Object.assign(target, updated);
        this.save();
        this.render();
      },
      onDelete: (id) => {
        this.deleteCard(id);
      },
    });
  }

  // ---------- Редактор: создание новой карточки ----------
  openNewCardEditor(columnId) {
    const blank = {
      id: null,
      title: '',
      description: '',
      color: '',
      images: [],
      checklist: [],
    };

    this.editor.open(blank, {
      onSave: (data) => this.createCard(columnId, data),
      // onDelete не передаём — в режиме создания нет кнопки «Удалить»
    });
  }

  createCard(columnId, data) {
    const col = this.state.columns.find((c) => c.id === columnId);
    if (!col) return;

    col.cards.push({
      id: this.nextCardId++,
      title: data.title,
      description: data.description,
      color: data.color,
      images: data.images,
      checklist: data.checklist,
    });
    this.save();
    this.render();
  }

  deleteCard(cardId) {
    for (const col of this.state.columns) {
      const idx = col.cards.findIndex((c) => c.id === cardId);
      if (idx !== -1) {
        col.cards.splice(idx, 1);
        this.save();
        this.render();
        return;
      }
    }
  }

  // ---------- DnD ----------
  handleDragStart(event) {
    const card = event.target.closest('.card');
    if (!card) return;

    this.draggedElement = card;
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', card.dataset.id);

    const placeholder = document.createElement('div');
    placeholder.className = 'placeholder';
    placeholder.style.height = `${card.offsetHeight}px`;
    this.placeholder = placeholder;

    setTimeout(() => {
      if (card === this.draggedElement) {
        card.classList.add('card--dragging');
      }
    }, 0);
  }

  handleDragOver(event) {
    if (!this.draggedElement) return;
    const container = event.target.closest('.column__cards');
    if (!container) return;

    event.preventDefault();
    event.dataTransfer.dropEffect = 'move';

    const after = this.getDragAfterElement(container, event.clientY);
    if (after == null) {
      container.append(this.placeholder);
    } else {
      container.insertBefore(this.placeholder, after);
    }
  }

  handleDrop(event) {
    if (!this.draggedElement) return;
    const container = event.target.closest('.column__cards');
    if (!container) return;

    event.preventDefault();

    if (this.placeholder.parentNode) {
      this.placeholder.parentNode.insertBefore(
        this.draggedElement,
        this.placeholder
      );
      this.placeholder.remove();
    }

    this.draggedElement.classList.remove('card--dragging');
    this.syncStateFromDOM();
    this.save();

    this.draggedElement = null;
    this.placeholder = null;
    this.justDropped = true;
  }

  handleDragEnd() {
    if (this.placeholder && this.placeholder.parentNode) {
      this.placeholder.remove();
    }
    if (this.draggedElement) {
      this.draggedElement.classList.remove('card--dragging');
    }
    this.placeholder = null;
    this.draggedElement = null;
  }

  getDragAfterElement(container, y) {
    const cards = [
      ...container.querySelectorAll('.card:not(.card--dragging)'),
    ];
    return cards.reduce(
      (closest, child) => {
        const box = child.getBoundingClientRect();
        const offset = y - box.top - box.height / 2;
        if (offset < 0 && offset > closest.offset) {
          return { offset, element: child };
        }
        return closest;
      },
      { offset: Number.NEGATIVE_INFINITY, element: null }
    ).element;
  }

  syncStateFromDOM() {
    const allCardsById = new Map();
    for (const col of this.state.columns) {
      for (const card of col.cards) {
        allCardsById.set(card.id, card);
      }
    }

    for (const col of this.state.columns) {
      const colEl = this.root.querySelector(
        `.column[data-column-id="${col.id}"]`
      );
      if (!colEl) continue;
      const cardEls = [
        ...colEl.querySelectorAll('.column__cards > .card:not(.card--dragging)'),
      ];
      col.cards = cardEls
        .map((el) => {
          const id = Number(el.dataset.id);
          return allCardsById.get(id) || null;
        })
        .filter(Boolean);
    }
  }
}