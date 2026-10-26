const { after, before, test } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs/promises');
const path = require('node:path');
const app = require('../src/app');

let server;
let baseUrl;

before(async () => {
  server = app.listen(0);
  await new Promise((resolve) => server.once('listening', resolve));
  baseUrl = `http://127.0.0.1:${server.address().port}`;
});

after(async () => {
  await new Promise((resolve, reject) => {
    server.close((error) => (error ? reject(error) : resolve()));
  });
});

// Teste de fumaça do seed: garante que o app Express foi exportado.
// Novos testes serão adicionados durante os Steps 2, 6 e 7 com auxílio do Copilot.
test('o app backend é exportado', () => {
  assert.ok(app, 'o app deve estar definido');
  assert.strictEqual(typeof app, 'function', 'o app Express deve ser uma função');
});

test('faz upload, lista e baixa um documento', async () => {
  const content = 'conteúdo de teste';
  const form = new FormData();
  form.append('file', new Blob([content], { type: 'text/plain' }), 'teste.txt');
  form.append('owner', 'usuario-teste');

  let document;

  try {
    const uploadResponse = await fetch(`${baseUrl}/upload`, {
      method: 'POST',
      body: form,
    });
    assert.equal(uploadResponse.status, 201);
    document = await uploadResponse.json();
    assert.equal(document.originalName, 'teste.txt');
    assert.equal(document.size, Buffer.byteLength(content));
    assert.equal(document.owner, 'usuario-teste');
    assert.ok(Number.isFinite(Date.parse(document.uploadedAt)));
    assert.equal(Object.hasOwn(document, 'filePath'), false);

    const listResponse = await fetch(`${baseUrl}/documents`);
    assert.equal(listResponse.status, 200);
    const listedDocuments = await listResponse.json();
    assert.ok(listedDocuments.some(({ id }) => id === document.id));

    const downloadResponse = await fetch(
      `${baseUrl}/documents/${document.id}/download`,
    );
    assert.equal(downloadResponse.status, 200);
    assert.equal(await downloadResponse.text(), content);
  } finally {
    if (document) {
      await fs.rm(path.resolve(__dirname, '..', 'storage', document.id), {
        force: true,
      });
    }
  }
});

test('retorna erro ao enviar sem arquivo ou baixar id inexistente', async () => {
  const uploadResponse = await fetch(`${baseUrl}/upload`, { method: 'POST' });
  assert.equal(uploadResponse.status, 400);

  const downloadResponse = await fetch(
    `${baseUrl}/documents/id-inexistente/download`,
  );
  assert.equal(downloadResponse.status, 404);
});
