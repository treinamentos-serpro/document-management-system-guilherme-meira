# Especificação - Document Management System

## 1. Objetivo

Disponibilizar uma aplicação web para enviar, listar e baixar documentos, mantendo os arquivos no filesystem local e seus metadados em memória.

## 2. Escopo

### Dentro do escopo

- Upload de documentos por meio da aplicação web.
- Armazenamento dos arquivos no filesystem local em `backend/storage`, usando multer com `diskStorage`.
- Registro em memória dos metadados dos documentos.
- Listagem dos documentos enviados.
- Download de um documento pelo identificador.
- Gestão simples de documentos por usuário, sem definir nesta especificação um mecanismo de autenticação ou isolamento.
- Interface web em React e comunicação com o backend por chamadas `fetch` sob o prefixo `/api`.

### Fora do escopo

- Armazenamento remoto, em nuvem ou em serviços de terceiros.
- Versionamento de documentos.
- Persistência durável dos metadados em banco de dados.
- Definição de autenticação, autorização ou gerenciamento de contas nesta etapa.
- Definição de limites de tamanho, lista de tipos de arquivo permitidos ou retenção de arquivos.

## 3. Requisitos funcionais

| ID | Requisito | Critério de aceite |
| --- | --- | --- |
| RF-01 | O usuário pode enviar um documento por `POST /upload`, como arquivo em uma requisição `multipart/form-data`. | Quando o upload for aceito, o arquivo e gravado localmente e os metadados são registrados em memória. O nome do campo multipart ainda deve ser definido. |
| RF-02 | O sistema atribui um identificador único a cada documento enviado. | O identificador retornado permite localizar o documento para listagem e download. |
| RF-03 | O sistema registra os metadados previstos para cada documento. | Os metadados incluem `id`, `originalName`, `size`, `uploadedAt` e `owner`, conforme o modelo de dados. |
| RF-04 | O usuário pode listar documentos por `GET /documents`. | A resposta contém uma coleção de metadados, sem o conteúdo binário dos arquivos nem caminhos internos do filesystem. |
| RF-05 | O usuário pode baixar um documento por `GET /documents/:id/download`. | Para um identificador existente, a resposta entrega o conteúdo binário correspondente ao arquivo armazenado localmente. |
| RF-06 | O sistema identifica falhas de upload, listagem ou download e informa o resultado ao cliente. | O formato comum de erro, os códigos HTTP e o comportamento detalhado para cada falha devem ser definidos antes da implementação dos contratos finais. |
| RF-07 | A aplicação web consome os endpoints do backend por meio do prefixo `/api`. | O frontend usa o proxy existente do Vite, que encaminha as chamadas ao backend removendo o prefixo `/api`. |

## 4. Requisitos não funcionais

| ID | Requisito |
| --- | --- |
| RNF-01 | Os arquivos enviados devem ser gravados exclusivamente no filesystem local da aplicação, em `backend/storage`, por meio de multer configurado com `diskStorage`. |
| RNF-02 | Os metadados devem permanecer em memória nesta fase; não deve ser introduzido banco de dados ou armazenamento externo. |
| RNF-03 | A configuração da aplicação deve seguir o princípio 12-Factor e ser fornecida por variáveis de ambiente quando aplicável. |
| RNF-04 | O backend deve manter as responsabilidades separadas em `routes`, `controllers`, `services` e `repositories`, com dependências no sentido `routes -> controllers -> services -> repositories`. |
| RNF-05 | O frontend deve usar React com componentes funcionais e Hooks, mantendo a comunicação HTTP em `services/` e usando `fetch`. |
| RNF-06 | Falhas de entrada HTTP e de leitura ou escrita de arquivos devem ser tratadas nos limites apropriados da aplicação, sem expor detalhes internos do filesystem ao cliente. |
| RNF-07 | Os metadados mantidos em memória são voláteis: a recuperação depois de reiniciar o processo não e garantida nesta fase. |

## 5. Modelo de dados (metadados do documento)

| Campo | Tipo | Descrição |
| --- | --- | --- |
| `id` | string | Identificador único do documento, usado para referenciá-lo na listagem e no download. |
| `originalName` | string | Nome original informado para o arquivo enviado. |
| `size` | number | Tamanho do arquivo em bytes. |
| `uploadedAt` | string | Data e hora do upload em formato ISO 8601. |
| `owner` | string | Identificador do usuário dono do documento. A origem e a validação deste identificador ainda não estão definidas. |

Os metadados ficam em memória e não possuem garantia de persistência após o encerramento ou reinício do backend. O caminho físico do arquivo é um detalhe interno da persistência local: não deve ser exposto como metadado da API. A estratégia para relacionar `id` ao caminho interno deve ser definida na implementação do repository.

## 6. Contratos de API

Os endpoints abaixo são contratos funcionais preliminares. O proxy do frontend expõe as chamadas como `/api/upload`, `/api/documents` e `/api/documents/:id/download`; no backend, as rotas correspondem a `/upload`, `/documents` e `/documents/:id/download`.

### POST /upload

- **Finalidade:** receber e armazenar um documento.
- **Entrada:** requisição `multipart/form-data` com arquivo no campo `file` e campo `owner` opcional. Quando ausente ou vazio, `owner` recebe o valor `anonymous`.
- **Processamento:** gravar o arquivo em `backend/storage` via multer `diskStorage`, gerar um `id` e registrar os metadados em memória.
- **Sucesso:** `201 Created`, com os metadados do documento criado (`id`, `originalName`, `size`, `uploadedAt` e `owner`) em JSON.
- **Erro:** `400 Bad Request` se o arquivo não for enviado ou se o upload for inválido.
- **Ainda a definir:** limites e tipos de arquivo aceitos. O campo `owner` é apenas metadado fornecido pelo cliente, não uma identidade autenticada.

### GET /documents

- **Finalidade:** listar os documentos registrados em memória.
- **Entrada prevista:** sem parâmetros obrigatórios definidos.
- **Sucesso:** `200 OK`, com um array de metadados; não inclui conteúdo binário nem caminho local. A listagem não é filtrada por `owner`.

### GET /documents/:id/download

- **Finalidade:** baixar o arquivo associado ao identificador informado.
- **Entrada prevista:** `id` no segmento da URL.
- **Sucesso:** `200 OK`, com o conteúdo binário e o nome original como nome de download.
- **Erro:** `404 Not Found` quando o identificador não existir ou o arquivo local não estiver disponível.

### Convenções de erro e validação pendentes

As respostas de erro usam JSON no formato `{ "error": "mensagem" }`. Upload ausente ou inválido retorna `400`; documento ou arquivo inexistente retorna `404`; falhas inesperadas retornam `500`. Permanecem pendentes a validação adicional de entrada, os limites de tamanho e a política de tipos de arquivo.

## 7. Decisões arquiteturais

- **Backend:** Node.js e Express em CommonJS. As rotas definem endpoints e delegam aos controllers; controllers tratam HTTP e validação básica; services concentram regras de negócio; repositories encapsulam persistência.
- **Fluxo de dependências:** `routes -> controllers -> services -> repositories`. Camadas internas não devem depender das camadas externas.
- **Upload:** multer com `diskStorage` grava arquivos localmente em `backend/storage`. Provedores externos e serviços de upload de terceiros não são permitidos.
- **Metadados:** mantidos em memória nesta fase inicial; sua perda ao reiniciar o processo e esperada e deve ser comunicada como limitação.
- **Frontend:** React com Vite, organização por componentes, páginas e serviços. Chamadas ao backend usam `fetch` com prefixo `/api`; o proxy do Vite encaminha ao backend.
- **Identidade do usuário:** `owner` pode ser informado no multipart e assume `anonymous` quando ausente. Esse valor não é autenticado e não representa controle de acesso; os endpoints não isolam documentos por usuário.
- **Segurança do filesystem:** nomes originais são metadados de apresentação, não devem ser usados diretamente como caminhos de armazenamento. A estratégia de nome interno e o tratamento de nomes no download devem ser definidos durante a implementação.
- **Configuracao:** valores de ambiente e caminhos configuráveis devem seguir as convenções 12-Factor, respeitando a pasta local de armazenamento definida pelo projeto.

## 8. Plano de execução

O plano registra a evolução do sistema. O backend de upload, listagem e download foi implementado em suas camadas; as etapas de frontend e integração completa permanecem futuras.

1. **Definir políticas restantes:** acordar limites de tamanho, tipos de arquivo e validações adicionais de upload.
2. **Backend implementado:** rotas, controllers, services e repository cobrem upload, listagem e download; Multer grava em `backend/storage`, e metadados ficam em memória. Testes HTTP cobrem os fluxos principais e erros básicos.
3. **Implementar o frontend:** criar a interface React para upload, listagem e download e encapsular chamadas `fetch` em `services/`, usando o prefixo `/api`.
4. **Validar a integração completa:** testar o fluxo frontend-backend pelo proxy do Vite e verificar os critérios de aceite ponta a ponta.
