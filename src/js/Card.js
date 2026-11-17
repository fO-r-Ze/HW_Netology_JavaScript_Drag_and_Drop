export default class Card {
  constructor(data) {
    this.data = data;
    this.element = null;
  }

  render() {
    const {
      title,
      description,
      color,
      images = [],
      checklist = [],
    } = this.data;

    const card = document.createElement('div');
    card.className = 'card';
    card.draggable = true;
    card.dataset.id = String(this.data.id);
    if (color) card.style.background = color;

    // Кнопки действий — правый верхний угол
    const actions = document.createElement('div');
    actions.className = 'card__actions';

    const editBtn = document.createElement('button');
    editBtn.type = 'button';
    editBtn.className = 'card__action card__action--edit';
    editBtn.setAttribute('aria-label', 'Редактировать карточку');
    editBtn.title = 'Редактировать';
    editBtn.innerHTML = `
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path fill="currentColor"
          d="M11.5 1.5l3 3L5 14H2v-3l9.5-9.5zM3 12.6V13h.4l9-9-1.4-1.4-8 8z"/>
      </svg>
    `.trim();

    const delBtn = document.createElement('button');
    delBtn.type = 'button';
    delBtn.className = 'card__action card__action--delete';
    delBtn.setAttribute('aria-label', 'Удалить карточку');
    delBtn.title = 'Удалить';
    delBtn.innerHTML = `
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <path fill="currentColor"
          d="M3.3 3.3l9.4 9.4-1 1L2.3 4.3l1-1zM12.7 3.3l1 1-9.4 9.4-1-1 9.4-9.4z"/>
      </svg>
    `.trim();

    actions.append(editBtn, delBtn);
    card.append(actions);

    if (title) {
      const h = document.createElement('div');
      h.className = 'card__title';
      h.textContent = title;
      card.append(h);
    }

    if (description) {
      const p = document.createElement('div');
      p.className = 'card__description';
      p.textContent = description;
      card.append(p);
    }

    if (images.length) {
      const imgs = document.createElement('div');
      imgs.className = 'card__images';
      for (const src of images.slice(0, 3)) {
        const img = document.createElement('img');
        img.src = src;
        img.alt = '';
        img.className = 'card__image';
        imgs.append(img);
      }
      if (images.length > 3) {
        const more = document.createElement('div');
        more.className = 'card__more';
        more.textContent = `+${images.length - 3}`;
        imgs.append(more);
      }
      card.append(imgs);
    }

    if (checklist.length) {
      card.append(this.renderChecklist(checklist));
    }

    this.element = card;
    return card;
  }

  renderChecklist(checklist) {
    const done = checklist.filter((i) => i.done).length;

    const wrap = document.createElement('div');
    wrap.className = 'card__checklist';

    const header = document.createElement('div');
    header.className = 'card__checklist-header';
    header.textContent = `✓ ${done}/${checklist.length}`;
    wrap.append(header);

    const list = document.createElement('ul');
    list.className = 'card__checklist-items';

    checklist.forEach((item, index) => {
      const li = document.createElement('li');
      li.className = 'card__checklist-item';
      if (item.done) li.classList.add('card__checklist-item--done');
      li.dataset.index = String(index);

      const cb = document.createElement('input');
      cb.type = 'checkbox';
      cb.className = 'card__checklist-checkbox';
      cb.checked = !!item.done;
      cb.dataset.index = String(index);
      cb.setAttribute('aria-label', item.text || 'Пункт списка');

      const text = document.createElement('span');
      text.className = 'card__checklist-text';
      text.textContent = item.text || '';

      li.append(cb, text);
      list.append(li);
    });

    wrap.append(list);
    return wrap;
  }
}