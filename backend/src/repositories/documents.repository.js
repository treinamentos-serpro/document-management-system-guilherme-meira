const documents = new Map();

function toPublicDocument(document) {
  const { filePath, ...metadata } = document;
  return metadata;
}

function save(document) {
  documents.set(document.id, { ...document });
  return toPublicDocument(document);
}

function findAll() {
  return Array.from(documents.values(), toPublicDocument);
}

function findById(id) {
  const document = documents.get(id);
  return document ? { ...document } : null;
}

module.exports = { save, findAll, findById };