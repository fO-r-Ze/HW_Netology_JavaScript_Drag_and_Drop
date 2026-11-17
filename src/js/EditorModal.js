const PALETTE_COLORS = [
  '',
  '#ffffff',
  '#fef3c7',
  '#dbeafe',
  '#dcfce7',
  '#fee2e2',
  '#ede9fe',
  '#fce7f3',
];

const MAX_IMAGE_SIZE = 1024 * 1024; // 1 MB на файл

export default class EditorModal {
  constructor() {
    this.element = null;
    this.state = null;
    this.onSave = null;
    this.onDelete = null;
    this.errorTimer = null;

    this.handleClick = this.handleClick.bind(this);
    this.handleKeyDown = this.handleKeyDown.bind(this);
    this.handleFileChange = this.handleFileChange.bind(this);
    this.handleDrop = this.handleDrop.bind(this);
    this.handleDragOver = this.handleDragOver.bind(this);
    this.handleDragLeave = this.handleDragLeave.bind(this);
  }

  open(cardData, { onSave, onDelete } = {}) {
    this.close();

    this.state = {
      id: cardData.id ?? null,
      title: cardData.title || '',
      description: cardData.description || '',
      color: cardData.color || '',
      images: [...(cardData.images || [])],
      checklist: (cardData.checklist || []).map((i) => ({ ...i })),
    };
    this.onSave = onSave || null;
    this.onDelete = onDelete || null;

    this.render();
  }

  get isCreate() {
    return this.state.id == null;
  }

  render() {
    const overlay = document.createElement('div');
    overlay.className = 'modal-overlay';

    const modal = document.createElement('div');
    modal.className = 'modal';
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');

    // Шапка + крестик закрытия
    const header = document.createElement('div');
    header.className = 'modal__header';

    const titleEl = document.createElement('h2');
    titleEl.className = 'modal__title';
    titleEl.textContent = this.isCreate
      ? 'Новая карточка'
      : 'Редактировать карточку';

    const closeBtn = document.createElement('button');
    closeBtn.type = 'button';
    closeBtn.className = 'modal__close';
    closeBtn.setAttribute('aria-label', 'Закрыть');
    closeBtn.title = 'Закрыть';
    closeBtn.innerHTML = `
      <svg viewBox="0 0 16 16" width="16" height="16" aria-hidden="true">
        <path fill="currentColor"
          d="M3.3 3.3l9.4 9.4-1 1L2.3 4.3l1-1zM12.7 3.3l1 1-9.4 9.4-1-1 9.4-9.4z"/>
      </svg>
    `.trim();

    header.append(titleEl, closeBtn);

    // Тело
    const body = document.createElement('div');
    body.className = 'modal__body';

    // Заголовок
    const titleField = document.createElement('label');
    titleField.className = 'field';
    const titleLabel = document.createElement('span');
    titleLabel.className = 'field__label';
    titleLabel.textContent = 'Заголовок';
    const titleInput = document.createElement('input');
    titleInput.type = 'text';
    titleInput.className = 'field__input field__input--title';
    titleInput.value = this.state.title;
    titleInput.placeholder = 'Введите заголовок...';
    titleField.append(titleLabel, titleInput);

    // Описание
    const descField = document.createElement('label');
    descField.className = 'field';
    const descLabel = document.createElement('span');
    descLabel.className = 'field__label';
    descLabel.textContent = 'Описание';
    const descInput = document.createElement('textarea');
    descInput.className = 'field__input field__input--description';
    descInput.rows = 3;
    descInput.value = this.state.description;
    descInput.placeholder = 'Добавьте более подробное описание...';
    descField.append(descLabel, descInput);

    // Цвет
    const colorField = document.createElement('div');
    colorField.className = 'field';
    const colorLabel = document.createElement('span');
    colorLabel.className = 'field__label';
    colorLabel.textContent = 'Цвет';
    const palette = document.createElement('div');
    palette.className = 'palette';

    for (const c of PALETTE_COLORS) {
      const swatch = document.createElement('button');
      swatch.type = 'button';
      swatch.className = 'palette__swatch';
      swatch.dataset.color = c;
      if (!c) {
        swatch.classList.add('palette__swatch--empty');
        swatch.textContent = '×';
        swatch.title = 'Без цвета';
      } else {
        swatch.style.background = c;
        swatch.title = c;
      }
      if (this.state.color === c) {
        swatch.classList.add('palette__swatch--active');
      }
      palette.append(swatch);
    }
    colorField.append(colorLabel, palette);

    // Чек-лист
    const listField = document.createElement('div');
    listField.className = 'field';
    const listLabel = document.createElement('span');
    listLabel.className = 'field__label';
    listLabel.textContent = 'Список';

    const list = document.createElement('div');
    list.className = 'checklist';

    const addItemRow = document.createElement('div');
    addItemRow.className = 'checklist__add';
    const addInput = document.createElement('input');
    addInput.type = 'text';
    addInput.className = 'checklist__add-input';
    addInput.placeholder = 'Новый пункт...';
    const addBtn = document.createElement('button');
    addBtn.type = 'button';
    addBtn.className = 'checklist__add-btn';
    addBtn.textContent = 'Добавить';
    addItemRow.append(addInput, addBtn);

    listField.append(listLabel, list, addItemRow);

    // Картинки
    const imagesField = document.createElement('div');
    imagesField.className = 'field';
    const imagesLabel = document.createElement('span');
    imagesLabel.className = 'field__label';
    imagesLabel.textContent = 'Картинки';

    const dropzone = document.createElement('div');
    dropzone.className = 'dropzone';
    dropzone.innerHTML =
      '<span>Перетащите изображения сюда или нажмите, чтобы выбрать файлы</span>';

    const fileInput = document.createElement('input');
    fileInput.type = 'file';
    fileInput.accept = 'image/*';
    fileInput.multiple = true;
    fileInput.hidden = true;
    dropzone.append(fileInput);

    const preview = document.createElement('div');
    preview.className = 'images-preview';

    imagesField.append(imagesLabel, dropzone, preview);

    body.append(titleField, descField, colorField, listField, imagesField);

    // Футер
    const footer = document.createElement('div');
    footer.className = 'modal__footer';

    const saveBtn = document.createElement('button');
    saveBtn.type = 'button';
    saveBtn.className = 'btn btn--primary modal__save';
    saveBtn.textContent = this.isCreate ? 'Создать' : 'Сохранить';

    const cancelBtn = document.createElement('button');
    cancelBtn.type = 'button';
    cancelBtn.className = 'btn modal__cancel';
    cancelBtn.textContent = 'Отмена';

    footer.append(saveBtn, cancelBtn);

    // Кнопка «Удалить» — только в режиме редактирования
    if (!this.isCreate) {
      const deleteBtn = document.createElement('button');
      deleteBtn.type = 'button';
      deleteBtn.className = 'btn btn--danger modal__delete';
      deleteBtn.textContent = 'Удалить';
      footer.append(deleteBtn);
    }

    modal.append(header, body, footer);
    overlay.append(modal);
    document.body.append(overlay);
    this.element = overlay;

    this.titleInput = titleInput;
    this.descInput = descInput;
    this.palette = palette;
    this.list = list;
    this.listAddInput = addInput;
    this.listAddBtn = addBtn;
    this.dropzone = dropzone;
    this.imageInput = fileInput;
    this.preview = preview;

    this.renderChecklist();
    this.renderImages();

    overlay.addEventListener('click', this.handleClick);
    document.addEventListener('keydown', this.handleKeyDown);
    fileInput.addEventListener('change', this.handleFileChange);
    dropzone.addEventListener('dragover', this.handleDragOver);
    dropzone.addEventListener('dragleave', this.handleDragLeave);
    dropzone.addEventListener('drop', this.handleDrop);

    titleInput.focus();
  }

  renderChecklist() {
    this.list.innerHTML = '';
    this.state.checklist.forEach((item, index) => {
      this.list.append(this.renderChecklistRow(item, index));
    });
  }

  renderChecklistRow(item, index) {
    const row = document.createElement('div');
    row.className = 'checklist__item';
    row.dataset.index = String(index);

    const cb = document.createElement('input');
    cb.type = 'checkbox';
    cb.checked = !!item.done;
    cb.className = 'checklist__checkbox';

    const inp = document.createElement('input');
    inp.type = 'text';
    inp.className = 'checklist__text';
    inp.value = item.text || '';

    const del = document.createElement('button');
    del.type = 'button';
    del.className = 'checklist__remove';
    del.setAttribute('aria-label', 'Удалить пункт');
    del.innerHTML = '&#x2715;';

    row.append(cb, inp, del);
    return row;
  }

  renderImages() {
    this.preview.innerHTML = '';
    this.state.images.forEach((src, index) => {
      const box = document.createElement('div');
      box.className = 'image-preview';
      box.dataset.index = String(index);

      const img = document.createElement('img');
      img.src = src;
      img.alt = '';

      const del = document.createElement('button');
      del.type = 'button';
      del.className = 'image-preview__remove';
      del.setAttribute('aria-label', 'Удалить картинку');
      del.innerHTML = '&#x2715;';

      box.append(img, del);
      this.preview.append(box);
    });
  }

  syncChecklistFromDOM() {
    if (!this.list) return;
    const rows = [...this.list.querySelectorAll('.checklist__item')];
    this.state.checklist = rows.map((row) => ({
      text: row.querySelector('.checklist__text').value,
      done: row.querySelector('.checklist__checkbox').checked,
    }));
  }

  handleClick(event) {
    if (event.target === this.element) {
      this.close();
      return;
    }
    if (
      event.target.closest('.modal__close') ||
      event.target.closest('.modal__cancel')
    ) {
      this.close();
      return;
    }
    if (event.target.closest('.modal__save')) {
      this.submit();
      return;
    }
    if (event.target.closest('.modal__delete')) {
      const id = this.state.id;
      this.close();
      if (this.onDelete) this.onDelete(id);
      return;
    }

    const swatch = event.target.closest('.palette__swatch');
    if (swatch) {
      this.state.color = swatch.dataset.color;
      this.palette.querySelectorAll('.palette__swatch').forEach((s) => {
        s.classList.toggle('palette__swatch--active', s === swatch);
      });
      return;
    }

    const removeItem = event.target.closest('.checklist__remove');
    if (removeItem) {
      this.syncChecklistFromDOM();
      const row = removeItem.closest('.checklist__item');
      const index = Number(row.dataset.index);
      this.state.checklist.splice(index, 1);
      this.renderChecklist();
      return;
    }

    if (event.target.closest('.checklist__add-btn')) {
      const text = this.listAddInput.value.trim();
      if (!text) return;
      this.syncChecklistFromDOM();
      this.state.checklist.push({ text, done: false });
      this.listAddInput.value = '';
      this.renderChecklist();
      return;
    }

    const removeImage = event.target.closest('.image-preview__remove');
    if (removeImage) {
      const box = removeImage.closest('.image-preview');
      const index = Number(box.dataset.index);
      this.state.images.splice(index, 1);
      this.renderImages();
      return;
    }

    if (event.target.closest('.dropzone')) {
      this.imageInput.click();
    }
  }

  handleKeyDown(event) {
    if (event.key === 'Escape') this.close();
  }

  handleDragOver(event) {
    event.preventDefault();
    this.dropzone.classList.add('dropzone--over');
  }

  handleDragLeave() {
    this.dropzone.classList.remove('dropzone--over');
  }

  handleDrop(event) {
    event.preventDefault();
    this.dropzone.classList.remove('dropzone--over');
    this.processFiles([...event.dataTransfer.files]);
  }

  handleFileChange(event) {
    this.processFiles([...event.target.files]);
    event.target.value = '';
  }

  processFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) continue;
      if (file.size > MAX_IMAGE_SIZE) {
        this.showError(`Файл "${file.name}" больше 1 MB и был отклонён`);
        continue;
      }
      const reader = new FileReader();
      reader.onload = () => {
        this.state.images.push(reader.result);
        this.renderImages();
      };
      reader.readAsDataURL(file);
    }
  }

  showError(message) {
    let err = this.element.querySelector('.modal__error');
    if (!err) {
      err = document.createElement('div');
      err.className = 'modal__error';
      this.element.querySelector('.modal').append(err);
    }
    err.textContent = message;
    clearTimeout(this.errorTimer);
    this.errorTimer = setTimeout(() => {
      if (err.parentNode) err.remove();
    }, 3000);
  }

  submit() {
    // Заголовок обязателен — иначе создавались бы безымянные карточки
    if (!this.titleInput.value.trim()) {
      this.showError('Введите заголовок карточки');
      this.titleInput.focus();
      return;
    }

    this.syncChecklistFromDOM();
    const updated = {
      id: this.state.id,
      title: this.titleInput.value.trim(),
      description: this.descInput.value.trim(),
      color: this.state.color,
      images: [...this.state.images],
      checklist: this.state.checklist.filter((i) => i.text.trim() !== ''),
    };
    const onSave = this.onSave;
    this.close();
    if (onSave) onSave(updated);
  }

  close() {
    if (this.element && this.element.parentNode) {
      this.element.remove();
    }
    this.element = null;
    document.removeEventListener('keydown', this.handleKeyDown);
    clearTimeout(this.errorTimer);
  }
}