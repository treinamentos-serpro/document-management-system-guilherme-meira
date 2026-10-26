const documentsRepository = require('../repositories/documents.repository');

function create(file, owner) {
  const normalizedOwner =
    typeof owner === 'string' && owner.trim() ? owner.trim() : 'anonymous';

  return documentsRepository.save({
    id: file.filename,
    originalName: file.originalname,
    size: file.size,
    uploadedAt: new Date().toISOString(),
    owner: normalizedOwner,
    filePath: file.path,
  });
}

function list() {
  return documentsRepository.findAll();
}

function findById(id) {
  return documentsRepository.findById(id);
}

module.exports = { create, list, findById };