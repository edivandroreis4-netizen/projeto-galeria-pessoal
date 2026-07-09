import PhotoSwipeLightbox from 'https://cdn.jsdelivr.net/npm/photoswipe@5/dist/photoswipe-lightbox.esm.min.js';
import {
  addPhotos,
  clearPhotos,
  deletePhoto,
  getAllPhotos,
  updatePhoto
} from './database.js';

const DEFAULT_FILTER = 'Todas';
const COMPRESSION_OPTIONS = {
  maxSizeMB: 1,
  maxWidthOrHeight: 1920,
  useWebWorker: true,
  initialQuality: 0.82
};

const state = {
  photos: [],
  currentFilter: DEFAULT_FILTER,
  searchTerm: '',
  viewMode: localStorage.getItem('galeriaViewMode') || 'contain',
  objectUrls: []
};

const elements = {
  uploadPanel: document.querySelector('#uploadPanel'),
  openUploadPanel: document.querySelector('#openUploadPanel'),
  closeUploadPanel: document.querySelector('#closeUploadPanel'),
  emptyUploadButton: document.querySelector('#emptyUploadButton'),
  savePhotosButton: document.querySelector('#savePhotosButton'),
  clearGalleryButton: document.querySelector('#clearGalleryButton'),
  photoInput: document.querySelector('#photoInput'),
  photoCategory: document.querySelector('#photoCategory'),
  photoDescription: document.querySelector('#photoDescription'),
  searchInput: document.querySelector('#searchInput'),
  categoryFilter: document.querySelector('#categoryFilter'),
  galleryGrid: document.querySelector('#galleryGrid'),
  emptyState: document.querySelector('#emptyState'),
  totalPhotos: document.querySelector('#totalPhotos'),
  favoritePhotos: document.querySelector('#favoritePhotos'),
  totalCategories: document.querySelector('#totalCategories'),
  storageCount: document.querySelector('#storageCount'),
  resultCount: document.querySelector('#resultCount'),
  navButtons: document.querySelectorAll('[data-filter-category]'),
  viewModeButtons: document.querySelectorAll('[data-view-mode]')
};

const toast = Swal.mixin({
  toast: true,
  position: 'top-end',
  showConfirmButton: false,
  timer: 2300,
  timerProgressBar: true
});

let pond;

const lightbox = new PhotoSwipeLightbox({
  gallery: '#galleryGrid',
  children: 'a.gallery-card__media-link',
  pswpModule: () => import('https://cdn.jsdelivr.net/npm/photoswipe@5/dist/photoswipe.esm.min.js')
});

lightbox.init();

function initFilePond() {
  FilePond.registerPlugin(
    FilePondPluginFileValidateType,
    FilePondPluginFileValidateSize,
    FilePondPluginImagePreview
  );

  FilePond.setOptions({
    labelIdle: 'Arraste suas fotos ou <span class="filepond--label-action">clique para selecionar</span>',
    labelFileTypeNotAllowed: 'Tipo de arquivo inválido',
    fileValidateTypeLabelExpectedTypes: 'Envie apenas imagens',
    labelMaxFileSizeExceeded: 'Arquivo muito grande',
    labelMaxFileSize: 'Tamanho máximo: {filesize}',
    credits: false
  });

  pond = FilePond.create(elements.photoInput, {
    allowMultiple: true,
    allowReorder: true,
    maxFileSize: '8MB',
    acceptedFileTypes: ['image/*'],
    imagePreviewHeight: 170,
    storeAsFile: false
  });
}

function formatDate(dateValue) {
  return new Intl.DateTimeFormat('pt-BR', {
    day: '2-digit',
    month: '2-digit',
    year: 'numeric'
  }).format(new Date(dateValue));
}

function formatSize(bytes = 0) {
  if (!bytes) return '0 KB';

  const units = ['B', 'KB', 'MB', 'GB'];
  const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
  const value = bytes / 1024 ** index;

  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function normalizeText(value = '') {
  return value
    .toString()
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function safeText(value = '') {
  const map = {
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#039;'
  };

  return value.toString().replace(/[&<>"']/g, (char) => map[char]);
}

function createPhotoTitle(number) {
  return `Foto ${String(number).padStart(2, '0')}`;
}

function getDisplayTitle(photo) {
  if (photo.titulo?.trim()) return photo.titulo.trim();

  const photoIndex = state.photos.findIndex((item) => item.id === photo.id);
  return createPhotoTitle(photoIndex >= 0 ? photoIndex + 1 : 1);
}

function getOriginalName(photo) {
  return photo.nomeOriginal || photo.nome || getDisplayTitle(photo);
}


function getFileExtensionFromType(type = '') {
  const extensions = {
    'image/jpeg': 'jpg',
    'image/png': 'png',
    'image/webp': 'webp',
    'image/gif': 'gif',
    'image/avif': 'avif'
  };

  return extensions[type] || 'jpg';
}

function createSafeFileName(photo, fallbackPrefix = 'foto-galeria') {
  const title = getDisplayTitle(photo) || fallbackPrefix;
  const extension = getFileExtensionFromType(photo.tipo || photo.arquivo?.type);
  const baseName = title
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 48) || fallbackPrefix;

  return `${baseName}.${extension}`;
}

function revokeObjectUrls() {
  for (const url of state.objectUrls) {
    URL.revokeObjectURL(url);
  }

  state.objectUrls = [];
}

function createObjectUrl(blob) {
  const url = URL.createObjectURL(blob);
  state.objectUrls.push(url);
  return url;
}

function getImageDimensions(file) {
  return new Promise((resolve) => {
    const image = new Image();
    const url = URL.createObjectURL(file);

    image.onload = () => {
      const dimensions = {
        width: image.naturalWidth || 1200,
        height: image.naturalHeight || 800
      };
      URL.revokeObjectURL(url);
      resolve(dimensions);
    };

    image.onerror = () => {
      URL.revokeObjectURL(url);
      resolve({ width: 1200, height: 800 });
    };

    image.src = url;
  });
}

function calculateSavingsPercent(originalBytes = 0, optimizedBytes = 0) {
  if (!originalBytes || optimizedBytes >= originalBytes) return 0;

  return Math.round(((originalBytes - optimizedBytes) / originalBytes) * 100);
}

function getPhotoSizeTitle(photo) {
  if (photo.comprimida && photo.tamanhoOriginal) {
    return `Original: ${formatSize(photo.tamanhoOriginal)} | Otimizada: ${formatSize(photo.tamanho)}`;
  }

  return `Tamanho: ${formatSize(photo.tamanho)}`;
}

function getCompressionBadge(photo) {
  if (!photo.comprimida || !photo.economiaPercentual) return '';

  return `<span class="compression-badge" title="Foto otimizada automaticamente">-${photo.economiaPercentual}%</span>`;
}

function getCompressionOverlay(photo) {
  if (!photo.comprimida || !photo.economiaPercentual) return '';

  return `
    <span
      class="gallery-card__optimization"
      aria-label="Foto otimizada com ${photo.economiaPercentual}% menos espaço"
      title="Foto otimizada automaticamente: ${photo.economiaPercentual}% menos espaço"
    >
      -${photo.economiaPercentual}%
    </span>
  `;
}

function getImageCompressionTool() {
  return window.imageCompression || window.browserImageCompression || null;
}

async function optimizeImageFile(file) {
  const fallback = {
    file,
    compressed: false,
    originalSize: file.size,
    optimizedSize: file.size,
    savingsPercent: 0
  };

  if (!file?.type?.startsWith('image/')) return fallback;

  const imageCompression = getImageCompressionTool();

  if (!imageCompression) {
    console.warn('Compressão automática indisponível: biblioteca browser-image-compression não carregada.');
    return fallback;
  }

  try {
    const optimizedBlob = await imageCompression(file, COMPRESSION_OPTIONS);

    if (!optimizedBlob || optimizedBlob.size >= file.size) {
      return fallback;
    }

    const optimizedFile = new File([optimizedBlob], file.name, {
      type: optimizedBlob.type || file.type,
      lastModified: file.lastModified || Date.now()
    });

    return {
      file: optimizedFile,
      compressed: true,
      originalSize: file.size,
      optimizedSize: optimizedFile.size,
      savingsPercent: calculateSavingsPercent(file.size, optimizedFile.size)
    };
  } catch (error) {
    console.warn('Não foi possível comprimir a imagem. Salvando arquivo original.', error);
    return fallback;
  }
}

function getFilteredPhotos() {
  let filtered = [...state.photos];

  if (state.currentFilter === 'Favoritas') {
    filtered = filtered.filter((photo) => photo.favorita);
  } else if (state.currentFilter !== DEFAULT_FILTER) {
    filtered = filtered.filter((photo) => photo.categoria === state.currentFilter);
  }

  if (state.searchTerm) {
    const searchablePhotos = filtered.map((photo) => ({
      photo,
      titulo: normalizeText(getDisplayTitle(photo)),
      nome: normalizeText(getOriginalName(photo)),
      categoria: normalizeText(photo.categoria),
      descricao: normalizeText(photo.descricao)
    }));

    const fuse = new Fuse(searchablePhotos, {
      threshold: 0.35,
      ignoreLocation: true,
      keys: ['titulo', 'nome', 'categoria', 'descricao']
    });

    filtered = fuse.search(state.searchTerm).map((result) => result.item.photo);
  }

  return filtered;
}

function updateStats(filteredPhotos) {
  const total = state.photos.length;
  const favorites = state.photos.filter((photo) => photo.favorita).length;
  const categories = new Set(state.photos.map((photo) => photo.categoria)).size;
  const resultText = filteredPhotos.length === 1 ? '1 resultado' : `${filteredPhotos.length} resultados`;
  const storageText = total === 1 ? '1 foto' : `${total} fotos`;

  elements.totalPhotos.textContent = total;
  elements.favoritePhotos.textContent = favorites;
  elements.totalCategories.textContent = categories;
  elements.storageCount.textContent = storageText;
  elements.resultCount.textContent = resultText;
}

function getCategoryIcon(category) {
  const icons = {
    Família: 'ph-users-three',
    Viagens: 'ph-airplane-tilt',
    Trabalho: 'ph-briefcase',
    Projetos: 'ph-code',
    Outras: 'ph-folder-open'
  };

  return icons[category] || 'ph-folder-open';
}

function renderGallery() {
  const filteredPhotos = getFilteredPhotos();

  revokeObjectUrls();
  updateStats(filteredPhotos);

  elements.galleryGrid.dataset.viewMode = state.viewMode;
  elements.galleryGrid.innerHTML = '';
  elements.emptyState.classList.toggle('is-visible', filteredPhotos.length === 0);

  if (filteredPhotos.length === 0) {
    return;
  }

  const fragment = document.createDocumentFragment();

  for (const photo of filteredPhotos) {
    const imageUrl = createObjectUrl(photo.arquivo);
    const displayTitle = getDisplayTitle(photo);
    const originalName = getOriginalName(photo);
    const article = document.createElement('article');
    article.className = 'gallery-card';
    article.dataset.id = photo.id;

    article.innerHTML = `
      <a
        class="gallery-card__media-link"
        href="${imageUrl}"
        data-pswp-width="${photo.width || 1200}"
        data-pswp-height="${photo.height || 800}"
        target="_blank"
        aria-label="Abrir foto ${safeText(displayTitle)} em tela cheia"
      >
        <img src="${imageUrl}" alt="${safeText(photo.descricao || displayTitle)}" loading="lazy" />
        ${getCompressionOverlay(photo)}
      </a>

      <div class="gallery-card__body">
        <div class="gallery-card__info">
          <h3 class="gallery-card__title" title="Nome original: ${safeText(originalName)}">${safeText(displayTitle)}</h3>

          <div class="gallery-card__meta">
            <span class="badge">
              <i class="ph-duotone ${getCategoryIcon(photo.categoria)}" aria-hidden="true"></i>
              ${safeText(photo.categoria)}
            </span>
            <span>${formatDate(photo.criadaEm)}</span>
            <span title="${safeText(getPhotoSizeTitle(photo))}">${formatSize(photo.tamanho)}${getCompressionBadge(photo)}</span>
          </div>
        </div>

        <p class="gallery-card__description">${safeText(photo.descricao || 'Sem descrição adicionada.')}</p>

        <div class="gallery-card__actions">
          <button class="action-button ${photo.favorita ? 'is-favorite' : ''}" type="button" data-action="favorite" aria-label="${photo.favorita ? 'Remover dos favoritos' : 'Adicionar aos favoritos'}">
            <i class="ph-duotone ph-heart" aria-hidden="true"></i>
            <span>${photo.favorita ? 'Favorita' : 'Favoritar'}</span>
          </button>

          <button class="action-button action-button--share" type="button" data-action="share" aria-label="Compartilhar foto">
            <i class="ph-duotone ph-share-network" aria-hidden="true"></i>
            <span>Compartilhar</span>
          </button>

          <button class="action-button" type="button" data-action="edit" aria-label="Editar título e categoria da foto">
            <i class="ph-duotone ph-pencil-simple" aria-hidden="true"></i>
            <span>Editar</span>
          </button>

          <button class="action-button action-button--danger" type="button" data-action="delete" aria-label="Excluir foto">
            <i class="ph-duotone ph-trash" aria-hidden="true"></i>
            <span>Excluir</span>
          </button>
        </div>
      </div>
    `;

    fragment.appendChild(article);
  }

  elements.galleryGrid.appendChild(fragment);
}

async function loadPhotos() {
  state.photos = await getAllPhotos();

  const photosWithoutTitle = state.photos.filter((photo) => !photo.titulo?.trim());

  if (photosWithoutTitle.length > 0) {
    for (let index = 0; index < photosWithoutTitle.length; index += 1) {
      await updatePhoto(photosWithoutTitle[index].id, {
        titulo: createPhotoTitle(index + 1),
        nomeOriginal: photosWithoutTitle[index].nomeOriginal || photosWithoutTitle[index].nome
      });
    }

    state.photos = await getAllPhotos();
  }

  renderGallery();
}

async function createPhotoRecord(file, index, category, description) {
  const optimization = await optimizeImageFile(file);
  const optimizedFile = optimization.file;
  const { width, height } = await getImageDimensions(optimizedFile);
  const titleNumber = state.photos.length + index + 1;

  return {
    id: crypto.randomUUID(),
    titulo: createPhotoTitle(titleNumber),
    nomeOriginal: file.name,
    nome: file.name,
    categoria: category,
    descricao: description,
    favorita: false,
    criadaEm: new Date().toISOString(),
    atualizadoEm: new Date().toISOString(),
    tipo: optimizedFile.type || file.type,
    tamanho: optimizedFile.size,
    tamanhoOriginal: optimization.originalSize,
    comprimida: optimization.compressed,
    economiaPercentual: optimization.savingsPercent,
    width,
    height,
    arquivo: optimizedFile
  };
}

async function saveFilesToGallery(files, category, description) {
  const photos = [];
  const summary = {
    photos,
    originalBytes: 0,
    optimizedBytes: 0,
    compressedCount: 0
  };

  let index = 0;

  for (const file of files) {
    const photo = await createPhotoRecord(file, index, category, description);

    photos.push(photo);
    summary.originalBytes += photo.tamanhoOriginal || photo.tamanho || 0;
    summary.optimizedBytes += photo.tamanho || 0;

    if (photo.comprimida) {
      summary.compressedCount += 1;
    }

    index += 1;
  }

  await addPhotos(photos);
  await loadPhotos();

  return summary;
}

async function handleSavePhotos() {
  const files = pond.getFiles().map((item) => item.file).filter(Boolean);

  if (files.length === 0) {
    toast.fire({ icon: 'info', title: 'Selecione pelo menos uma foto.' });
    return;
  }

  const saveButtonLabel = elements.savePhotosButton.querySelector('span');
  const defaultSaveButtonText = saveButtonLabel?.textContent || 'Salvar na galeria';

  elements.savePhotosButton.disabled = true;
  if (saveButtonLabel) saveButtonLabel.textContent = 'Otimizando fotos...';

  try {
    const category = elements.photoCategory.value;
    const description = elements.photoDescription.value.trim();

    const summary = await saveFilesToGallery(files, category, description);
    const savingsPercent = calculateSavingsPercent(summary.originalBytes, summary.optimizedBytes);

    pond.removeFiles();
    elements.photoDescription.value = '';
    elements.uploadPanel.classList.remove('is-open');

    toast.fire({
      icon: 'success',
      title: savingsPercent > 0
        ? `${files.length === 1 ? 'Foto salva' : 'Fotos salvas'} com ${savingsPercent}% menos espaço.`
        : files.length === 1 ? 'Foto salva com sucesso.' : 'Fotos salvas com sucesso.'
    });
  } catch (error) {
    console.error(error);
    Swal.fire({
      icon: 'error',
      title: 'Erro ao salvar',
      text: 'Não foi possível salvar as fotos no navegador.'
    });
  } finally {
    elements.savePhotosButton.disabled = false;
    if (saveButtonLabel) saveButtonLabel.textContent = defaultSaveButtonText;
  }
}

async function sharePhoto(photo) {
  if (!navigator.share) {
    throw new Error('Este navegador não oferece suporte para compartilhamento nativo.');
  }

  const fileType = photo.tipo || photo.arquivo?.type || 'image/jpeg';
  const shareFile = new File([photo.arquivo], createSafeFileName(photo), {
    type: fileType,
    lastModified: Date.now()
  });

  const shareData = {
    title: getDisplayTitle(photo),
    text: 'Foto compartilhada pelo app Galeria Pessoal.',
    files: [shareFile]
  };

  if (navigator.canShare && !navigator.canShare({ files: [shareFile] })) {
    throw new Error('Este navegador não permite compartilhar esta imagem como arquivo.');
  }

  await navigator.share(shareData);
}

async function handleGalleryAction(event) {
  const button = event.target.closest('[data-action]');

  if (!button) return;

  const card = button.closest('.gallery-card');
  const photoId = card?.dataset.id;
  const photo = state.photos.find((item) => item.id === photoId);

  if (!photo) return;

  const action = button.dataset.action;

  if (action === 'favorite') {
    await updatePhoto(photo.id, { favorita: !photo.favorita });
    await loadPhotos();
    toast.fire({
      icon: 'success',
      title: !photo.favorita ? 'Foto marcada como favorita.' : 'Foto removida dos favoritos.'
    });
  }

  if (action === 'share') {
    try {
      await sharePhoto(photo);
    } catch (error) {
      if (error.name === 'AbortError') return;

      console.error(error);

      Swal.fire({
        icon: 'info',
        title: 'Compartilhamento indisponível',
        text: 'Seu navegador não permitiu compartilhar esta foto diretamente. Tente pelo celular, pelo app instalado ou por outro navegador compatível com compartilhamento de arquivos.'
      });
    }
  }

  if (action === 'delete') {
    const result = await Swal.fire({
      icon: 'warning',
      title: 'Excluir foto?',
      text: 'Essa ação não poderá ser desfeita.',
      showCancelButton: true,
      confirmButtonText: 'Sim, excluir',
      cancelButtonText: 'Cancelar',
      confirmButtonColor: '#dc2626'
    });

    if (result.isConfirmed) {
      await deletePhoto(photo.id);
      await loadPhotos();
      toast.fire({ icon: 'success', title: 'Foto excluída.' });
    }
  }

  if (action === 'edit') {
    const result = await Swal.fire({
      title: 'Editar foto',
      html: `
        <label class="swal-form-label" for="swalPhotoTitle">Título da foto</label>
        <input id="swalPhotoTitle" class="swal2-input swal-photo-input" value="${safeText(getDisplayTitle(photo))}" maxlength="40" />

        <label class="swal-form-label" for="swalPhotoCategory">Categoria</label>
        <select id="swalPhotoCategory" class="swal2-select swal-photo-select">
          <option value="Família">Família</option>
          <option value="Viagens">Viagens</option>
          <option value="Trabalho">Trabalho</option>
          <option value="Projetos">Projetos</option>
          <option value="Outras">Outras</option>
        </select>
      `,
      didOpen: () => {
        document.querySelector('#swalPhotoCategory').value = photo.categoria;
      },
      focusConfirm: false,
      showCancelButton: true,
      confirmButtonText: 'Salvar',
      cancelButtonText: 'Cancelar',
      preConfirm: () => {
        const title = document.querySelector('#swalPhotoTitle').value.trim();
        const category = document.querySelector('#swalPhotoCategory').value;

        if (!title) {
          Swal.showValidationMessage('Informe um título para a foto.');
          return false;
        }

        return { titulo: title, categoria: category };
      }
    });

    if (result.isConfirmed) {
      await updatePhoto(photo.id, result.value);
      await loadPhotos();
      toast.fire({ icon: 'success', title: 'Foto atualizada.' });
    }
  }
}

async function handleClearGallery() {
  if (state.photos.length === 0) {
    toast.fire({ icon: 'info', title: 'A galeria já está vazia.' });
    return;
  }

  const result = await Swal.fire({
    icon: 'warning',
    title: 'Limpar toda a galeria?',
    text: 'Todas as fotos salvas neste navegador serão removidas.',
    showCancelButton: true,
    confirmButtonText: 'Sim, limpar',
    cancelButtonText: 'Cancelar',
    confirmButtonColor: '#dc2626'
  });

  if (!result.isConfirmed) return;

  await clearPhotos();
  await loadPhotos();
  toast.fire({ icon: 'success', title: 'Galeria limpa.' });
}

function setFilter(filter) {
  state.currentFilter = filter;
  elements.categoryFilter.value = filter;

  for (const button of elements.navButtons) {
    button.classList.toggle('is-active', button.dataset.filterCategory === filter);
  }

  renderGallery();
}

function setViewMode(mode) {
  state.viewMode = mode === 'cover' ? 'cover' : 'contain';
  localStorage.setItem('galeriaViewMode', state.viewMode);
  elements.galleryGrid.dataset.viewMode = state.viewMode;

  for (const button of elements.viewModeButtons) {
    const isActive = button.dataset.viewMode === state.viewMode;
    button.classList.toggle('is-active', isActive);
    button.setAttribute('aria-pressed', String(isActive));
  }
}

function updateSearchPlaceholder() {
  const isCompactScreen = window.matchMedia('(max-width: 620px)').matches;
  elements.searchInput.placeholder = isCompactScreen
    ? 'Pesquisar fotos'
    : 'Pesquisar por nome, categoria ou descrição';
}

function handleCardTouchFeedback(event) {
  const mediaLink = event.target.closest('.gallery-card__media-link');

  if (!mediaLink) return;

  const card = mediaLink.closest('.gallery-card');
  if (!card) return;

  card.classList.add('is-tapped');
  window.setTimeout(() => card.classList.remove('is-tapped'), 180);
}

function bindEvents() {
  elements.openUploadPanel.addEventListener('click', () => {
    elements.uploadPanel.classList.add('is-open');
    elements.uploadPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  elements.emptyUploadButton.addEventListener('click', () => {
    elements.uploadPanel.classList.add('is-open');
    elements.uploadPanel.scrollIntoView({ behavior: 'smooth', block: 'start' });
  });

  elements.closeUploadPanel.addEventListener('click', () => {
    elements.uploadPanel.classList.remove('is-open');
  });

  elements.savePhotosButton.addEventListener('click', handleSavePhotos);
  elements.clearGalleryButton.addEventListener('click', handleClearGallery);
  elements.galleryGrid.addEventListener('click', handleGalleryAction);
  elements.galleryGrid.addEventListener('pointerdown', handleCardTouchFeedback);
  window.addEventListener('resize', updateSearchPlaceholder);

  elements.searchInput.addEventListener('input', (event) => {
    state.searchTerm = normalizeText(event.target.value);
    renderGallery();
  });

  elements.categoryFilter.addEventListener('change', (event) => {
    setFilter(event.target.value);
  });

  for (const button of elements.navButtons) {
    button.addEventListener('click', () => {
      setFilter(button.dataset.filterCategory);
    });
  }

  for (const button of elements.viewModeButtons) {
    button.addEventListener('click', () => {
      setViewMode(button.dataset.viewMode);
    });
  }
}

async function registerServiceWorker() {
  if (!('serviceWorker' in navigator)) return;

  try {
    await navigator.serviceWorker.register('./service-worker.js');
  } catch (error) {
    console.warn('Service Worker não registrado:', error);
  }
}

async function init() {
  initFilePond();
  bindEvents();
  updateSearchPlaceholder();
  setViewMode(state.viewMode);
  await loadPhotos();
  await registerServiceWorker();
}

init();
