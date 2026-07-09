const DexieConstructor = window.Dexie;

if (!DexieConstructor) {
  throw new Error('Dexie.js não foi carregado. Verifique a conexão com a CDN.');
}

export const db = new DexieConstructor('GaleriaPessoalDB');

db.version(1).stores({
  photos: 'id, nome, categoria, favorita, criadaEm, atualizadoEm'
});

db.version(2).stores({
  photos: 'id, titulo, nomeOriginal, nome, categoria, favorita, criadaEm, atualizadoEm'
});

export async function addPhoto(photo) {
  return db.photos.add(photo);
}

export async function addPhotos(photos) {
  return db.photos.bulkAdd(photos);
}

export async function getAllPhotos() {
  return db.photos.orderBy('criadaEm').reverse().toArray();
}

export async function updatePhoto(id, data) {
  return db.photos.update(id, {
    ...data,
    atualizadoEm: new Date().toISOString()
  });
}

export async function deletePhoto(id) {
  return db.photos.delete(id);
}

export async function clearPhotos() {
  return db.photos.clear();
}
