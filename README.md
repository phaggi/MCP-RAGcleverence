# Cleverence MCP-RAG Server

MCP-RAG сервер для работы с документацией Cleverence Mobile Smarts. Позволяет искать и получать информацию из документации через стандартизированный MCP интерфейс и HTTP API.

## Возможности

- 🔍 **Поиск по документации** - полнотекстовый поиск по главам документации
- 📖 **Получение глав** - доступ к конкретным главам по ID
- 📊 **Статистика** - информация о структуре документации
- ➕ **Добавление данных** - возможность донасыщения новыми данными
- 🌐 **HTTP API** - REST API для интеграции с внешними системами
- 💾 **JSON база данных** - легковесное хранение данных в файлах

## Установка

1. Клонируйте репозиторий:
```bash
git clone <repository-url>
cd MCP-RAGcleverence
```

2. Установите зависимости:
```bash
npm install
```

3. Импортируйте данные из JSON файлов:
```bash
npm run import
```

## Использование

### MCP Сервер

Запуск MCP сервера:
```bash
npm start
```

Сервер предоставляет следующие инструменты:

- `search_documentation` - поиск по документации
- `get_chapter` - получение главы по ID
- `get_statistics` - статистика документации
- `add_documentation` - добавление новой главы
- `get_document_info` - информация о документе

### HTTP API

Запуск HTTP API сервера:
```bash
npm run api
```

API доступен по адресу: `http://localhost:3001`

#### Основные эндпоинты:

- `GET /` - информация об API
- `GET /api/statistics` - статистика документации
- `GET /api/search?query=...` - поиск по документации
- `GET /api/chapter/:id` - получение главы по ID
- `POST /api/chapter` - добавление новой главы
- `PUT /api/chapter/:id` - обновление главы
- `DELETE /api/chapter/:id` - удаление главы
- `POST /api/chapters/bulk` - массовое добавление глав
- `GET /api/chapters` - список глав с пагинацией
- `GET /api/document-info` - информация о документе

### Тестирование

Тестирование API (в отдельном терминале):
```bash
npm run test-api-simple
```

## Структура проекта

```
├── src/
│   ├── server.js          # MCP сервер
│   ├── api.js             # HTTP API сервер
│   ├── database.js        # Работа с JSON базой данных
│   └── importer.js        # Импорт данных
├── data/                  # Исходные JSON файлы
├── db/                    # JSON база данных
├── test-api-simple.js     # Тест API
├── package.json
└── README.md
```

## База данных

Сервер использует JSON файлы для хранения данных. Структура базы:

### Файл `chapters.json`
- `id` - автоинкрементный ID
- `chapter_id` - ID главы (уникальный)
- `title` - заголовок главы
- `content` - содержимое главы (строка или массив объектов)
- `page_start` - номер начальной страницы
- `content_lines` - количество строк контента
- `images_count` - количество изображений
- `tables_count` - количество таблиц
- `created_at` - дата создания
- `updated_at` - дата обновления

### Файл `metadata.json`
- `key` - ключ метаданных
- `value` - значение метаданных
- `created_at` - дата создания
- `updated_at` - дата обновления

### Файл `search_index.json`
- `chapter_id` - ссылка на главу
- `search_text` - текст для поиска
- `keywords` - ключевые слова
- `created_at` - дата создания

## Добавление новых данных

### Через MCP
```javascript
// Пример добавления главы через MCP
{
  "name": "add_documentation",
  "arguments": {
    "chapter_id": 1234,
    "title": "Новая глава",
    "content": "Содержимое главы...",
    "page_start": 100,
    "content_lines": 50,
    "images_count": 2,
    "tables_count": 1
  }
}
```

### Через HTTP API
```bash
curl -X POST http://localhost:3001/api/chapter \
  -H "Content-Type: application/json" \
  -d '{
    "chapter_id": 1234,
    "title": "Новая глава",
    "content": "Содержимое главы...",
    "page_start": 100,
    "content_lines": 50,
    "images_count": 2,
    "tables_count": 1
  }'
```

### Массовое добавление
```bash
curl -X POST http://localhost:3001/api/chapters/bulk \
  -H "Content-Type: application/json" \
  -d '{
    "chapters": [
      {
        "chapter_id": 1234,
        "title": "Глава 1",
        "content": "Содержимое..."
      },
      {
        "chapter_id": 1235,
        "title": "Глава 2",
        "content": "Содержимое..."
      }
    ]
  }'
```

## Поиск

### Через MCP
```javascript
{
  "name": "search_documentation",
  "arguments": {
    "query": "Mobile Smarts",
    "limit": 10
  }
}
```

### Через HTTP API
```bash
curl "http://localhost:3001/api/search?query=Mobile%20Smarts&limit=10"
```

## Разработка

### Запуск в режиме разработки
```bash
npm run dev
```

### Тестирование
```bash
npm test
```

## Конфигурация

Сервер использует следующие переменные окружения:

- `PORT` - порт для HTTP API (по умолчанию 3001)

## Лицензия

MIT License

## Поддержка

Для получения поддержки обращайтесь к команде разработки Cleverence.
