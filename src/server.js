import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import {
  CallToolRequestSchema,
  ListToolsRequestSchema,
} from '@modelcontextprotocol/sdk/types.js';
import CleverenceDatabase from './database.js';

class CleverenceMCPServer {
  constructor() {
    this.db = new CleverenceDatabase();
    this.server = new Server(
      {
        name: 'cleverence-documentation-server',
        version: '1.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.setupTools();
  }

  setupTools() {
    // Инструмент для поиска по документации
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_documentation',
            description: 'Поиск по документации Cleverence Mobile Smarts',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Поисковый запрос',
                },
                limit: {
                  type: 'number',
                  description: 'Максимальное количество результатов (по умолчанию 10)',
                  default: 10,
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_chapter',
            description: 'Получение конкретной главы документации по ID',
            inputSchema: {
              type: 'object',
              properties: {
                chapter_id: {
                  type: 'number',
                  description: 'ID главы',
                },
              },
              required: ['chapter_id'],
            },
          },
          {
            name: 'get_statistics',
            description: 'Получение статистики по документации',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'add_documentation',
            description: 'Добавление новой главы в документацию',
            inputSchema: {
              type: 'object',
              properties: {
                chapter_id: {
                  type: 'number',
                  description: 'ID главы',
                },
                title: {
                  type: 'string',
                  description: 'Заголовок главы',
                },
                content: {
                  type: 'string',
                  description: 'Содержимое главы',
                },
                page_start: {
                  type: 'number',
                  description: 'Номер начальной страницы',
                },
                content_lines: {
                  type: 'number',
                  description: 'Количество строк контента',
                },
                images_count: {
                  type: 'number',
                  description: 'Количество изображений',
                },
                tables_count: {
                  type: 'number',
                  description: 'Количество таблиц',
                },
              },
              required: ['chapter_id', 'title'],
            },
          },
          {
            name: 'get_document_info',
            description: 'Получение информации о документе',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
        ],
      };
    });

    // Обработчик вызовов инструментов
    this.server.setRequestHandler(CallToolRequestSchema, async (request) => {
      const { name, arguments: args } = request.params;

      try {
        switch (name) {
          case 'search_documentation':
            return await this.handleSearchDocumentation(args);
          case 'get_chapter':
            return await this.handleGetChapter(args);
          case 'get_statistics':
            return await this.handleGetStatistics();
          case 'add_documentation':
            return await this.handleAddDocumentation(args);
          case 'get_document_info':
            return await this.handleGetDocumentInfo();
          default:
            throw new Error(`Неизвестный инструмент: ${name}`);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: `Ошибка выполнения инструмента ${name}: ${error.message}`,
            },
          ],
          isError: true,
        };
      }
    });
  }

  async handleSearchDocumentation(args) {
    const { query, limit = 10 } = args;
    
    if (!query || typeof query !== 'string') {
      throw new Error('Поисковый запрос обязателен и должен быть строкой');
    }

    const results = await this.db.searchChapters(query, limit);
    
    if (results.length === 0) {
      return {
        content: [
          {
            type: 'text',
            text: `По запросу "${query}" ничего не найдено. Попробуйте изменить поисковый запрос.`,
          },
        ],
      };
    }

    const formattedResults = results.map(chapter => {
      let contentPreview = 'Нет содержимого';
      if (chapter.content) {
        const contentString = typeof chapter.content === 'string' ? chapter.content : JSON.stringify(chapter.content);
        contentPreview = contentString.length > 200 ? contentString.substring(0, 200) + '...' : contentString;
      }
      
      return {
        id: chapter.chapter_id,
        title: chapter.title,
        content: contentPreview,
        page_start: chapter.page_start,
        content_lines: chapter.content_lines,
        tables_count: chapter.tables_count,
        images_count: chapter.images_count,
      };
    });

    return {
      content: [
        {
          type: 'text',
          text: `Найдено ${results.length} результатов по запросу "${query}":\n\n${formattedResults.map((result, index) => 
            `${index + 1}. **${result.title}** (ID: ${result.id}, стр. ${result.page_start})\n   ${result.content}\n`
          ).join('\n')}`,
        },
      ],
    };
  }

  async handleGetChapter(args) {
    const { chapter_id } = args;
    
    if (!chapter_id || typeof chapter_id !== 'number') {
      throw new Error('ID главы обязателен и должен быть числом');
    }

    const chapter = await this.db.getChapter(chapter_id);
    
    if (!chapter) {
      return {
        content: [
          {
            type: 'text',
            text: `Глава с ID ${chapter_id} не найдена.`,
          },
        ],
      };
    }

    let contentText = 'Содержимое главы отсутствует';
    if (chapter.content) {
      if (typeof chapter.content === 'string') {
        contentText = chapter.content;
      } else if (Array.isArray(chapter.content)) {
        contentText = chapter.content.map(item => {
          if (typeof item === 'string') {
            return item;
          } else if (item && typeof item === 'object' && item.text) {
            return item.text;
          }
          return '';
        }).filter(text => text.trim()).join(' ');
      } else {
        contentText = JSON.stringify(chapter.content);
      }
    }

    return {
      content: [
        {
          type: 'text',
          text: `**${chapter.title}** (ID: ${chapter.chapter_id}, стр. ${chapter.page_start})\n\n${contentText}\n\n**Статистика:**\n- Строк контента: ${chapter.content_lines}\n- Таблиц: ${chapter.tables_count}\n- Изображений: ${chapter.images_count}`,
        },
      ],
    };
  }

  async handleGetStatistics() {
    const stats = await this.db.getStatistics();
    
    if (!stats) {
      return {
        content: [
          {
            type: 'text',
            text: 'Не удалось получить статистику документации.',
          },
        ],
      };
    }

    return {
      content: [
        {
          type: 'text',
          text: `**Статистика документации Cleverence Mobile Smarts:**\n\n- Всего глав: ${stats.total_chapters}\n- Глав с контентом: ${stats.chapters_with_content}\n- Глав с таблицами: ${stats.chapters_with_tables}\n- Глав с изображениями: ${stats.chapters_with_images}\n- Всего строк контента: ${stats.total_content_lines || 0}\n- Всего таблиц: ${stats.total_tables || 0}\n- Всего изображений: ${stats.total_images || 0}`,
        },
      ],
    };
  }

  async handleAddDocumentation(args) {
    const { chapter_id, title, content, page_start, content_lines, images_count, tables_count } = args;
    
    if (!chapter_id || typeof chapter_id !== 'number') {
      throw new Error('ID главы обязателен и должен быть числом');
    }
    
    if (!title || typeof title !== 'string') {
      throw new Error('Заголовок главы обязателен и должен быть строкой');
    }

    const success = await this.db.addChapter({
      chapter_id,
      title,
      content: content || '',
      page_start: page_start || 0,
      content_lines: content_lines || 0,
      images_count: images_count || 0,
      tables_count: tables_count || 0,
    });

    if (success) {
      return {
        content: [
          {
            type: 'text',
            text: `Глава "${title}" (ID: ${chapter_id}) успешно добавлена в документацию.`,
          },
        ],
      };
    } else {
      return {
        content: [
          {
            type: 'text',
            text: `Ошибка при добавлении главы "${title}" (ID: ${chapter_id}).`,
          },
        ],
        isError: true,
      };
    }
  }

  async handleGetDocumentInfo() {
    const title = await this.db.getMetadata('document_title');
    const pageCount = await this.db.getMetadata('page_count');
    const fileSize = await this.db.getMetadata('file_size');
    const totalChapters = await this.db.getMetadata('total_chapters');
    const chaptersWithContent = await this.db.getMetadata('chapters_with_content');

    return {
      content: [
        {
          type: 'text',
          text: `**Информация о документе:**\n\n- Название: ${title || 'Cleverence Mobile Smarts Documentation'}\n- Количество страниц: ${pageCount || 'Неизвестно'}\n- Размер файла: ${fileSize ? (parseInt(fileSize) / 1024 / 1024).toFixed(2) + ' MB' : 'Неизвестно'}\n- Всего глав: ${totalChapters || 'Неизвестно'}\n- Глав с контентом: ${chaptersWithContent || 'Неизвестно'}`,
        },
      ],
    };
  }

  async start() {
    try {
      await this.db.init();
      console.log('MCP сервер Cleverence Documentation запущен');
      
      const transport = new StdioServerTransport();
      await this.server.connect(transport);
      
      console.log('Сервер готов к работе');
    } catch (error) {
      console.error('Ошибка запуска сервера:', error);
      process.exit(1);
    }
  }

  async stop() {
    await this.db.close();
    console.log('Сервер остановлен');
  }
}

// Запуск сервера
const server = new CleverenceMCPServer();

// Обработка сигналов завершения
process.on('SIGINT', async () => {
  console.log('\nПолучен сигнал SIGINT, останавливаем сервер...');
  await server.stop();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\nПолучен сигнал SIGTERM, останавливаем сервер...');
  await server.stop();
  process.exit(0);
});

// Запуск сервера
server.start().catch(console.error);
