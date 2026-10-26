const documentsService = require('../services/documents.service');

function upload(req, res) {
  if (!req.file) {
    return res.status(400).json({ error: 'O arquivo é obrigatório.' });
  }

  const document = documentsService.create(req.file, req.body.owner);
  return res.status(201).json(document);
}

function list(req, res) {
  return res.json(documentsService.list());
}

function download(req, res, next) {
  const document = documentsService.findById(req.params.id);

  if (!document) {
    return res.status(404).json({ error: 'Documento não encontrado.' });
  }

  return res.download(document.filePath, document.originalName, (error) => {
    if (error && !res.headersSent) {
      next(error);
    }
  });
}

module.exports = { upload, list, download };