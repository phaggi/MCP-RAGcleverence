import { Server } from '@modelcontextprotocol/sdk/server/index.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { CallToolRequestSchema, ListToolsRequestSchema } from '@modelcontextprotocol/sdk/types.js';
import CleverenceDatabase from './database.js';
import VectorDatabase from './vector-database.js';

class CleverenceMCPServer {
  constructor() {
    this.server = new Server(
      {
        name: 'cleverence-docs',
        version: '2.0.0',
      },
      {
        capabilities: {
          tools: {},
        },
      }
    );

    this.db = new CleverenceDatabase();
    this.vectorDB = new VectorDatabase();
    this.isInitialized = false;

    this.setupTools();
  }

  async initialize() {
    try {
      console.log('Инициализация MCP сервера Cleverence...');
      
      // Инициализируем обычную БД
      await this.db.init();
      
      // Инициализируем векторную БД
      const vectorSuccess = await this.vectorDB.initialize();
      if (!vectorSuccess) {
        console.warn('Векторная БД не инициализирована, будет использоваться только обычный поиск');
      }
      
      this.isInitialized = true;
      console.log('MCP сервер Cleverence инициализирован');
      
    } catch (error) {
      console.error('Ошибка инициализации MCP сервера:', error);
    }
  }

  setupTools() {
    // Инструмент для поиска документации (гибридный поиск)
    this.server.setRequestHandler(ListToolsRequestSchema, async () => {
      return {
        tools: [
          {
            name: 'search_documentation',
            description: 'Поиск по документации Cleverence Mobile Smarts с использованием векторного и ключевого поиска',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Поисковый запрос на русском языке',
                },
                limit: {
                  type: 'number',
                  description: 'Максимальное количество результатов (по умолчанию 10)',
                  default: 10,
                },
                search_type: {
                  type: 'string',
                  description: 'Тип поиска: semantic, keyword, hybrid (по умолчанию hybrid)',
                  enum: ['semantic', 'keyword', 'hybrid'],
                  default: 'hybrid',
                },
              },
              required: ['query'],
            },
          },
          {
            name: 'get_chapter',
            description: 'Получить содержимое главы по ID',
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
            description: 'Получить статистику документации',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'list_chapters',
            description: 'Получить список всех глав с пагинацией',
            inputSchema: {
              type: 'object',
              properties: {
                page: {
                  type: 'number',
                  description: 'Номер страницы (по умолчанию 1)',
                  default: 1,
                },
                limit: {
                  type: 'number',
                  description: 'Количество глав на странице (по умолчанию 20)',
                  default: 20,
                },
              },
            },
          },
          {
            name: 'get_document_info',
            description: 'Получить информацию о документе',
            inputSchema: {
              type: 'object',
              properties: {},
            },
          },
          {
            name: 'vector_search',
            description: 'Семантический поиск с использованием векторных эмбеддингов',
            inputSchema: {
              type: 'object',
              properties: {
                query: {
                  type: 'string',
                  description: 'Поисковый запрос для семантического поиска',
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
            name: 'get_vector_stats',
            description: 'Получить статистику векторной базы данных',
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
            return await this.handleGetStatistics(args);
          case 'list_chapters':
            return await this.handleListChapters(args);
          case 'get_document_info':
            return await this.handleGetDocumentInfo(args);
          case 'vector_search':
            return await this.handleVectorSearch(args);
          case 'get_vector_stats':
            return await this.handleGetVectorStats(args);
          default:
            throw new Error(`Неизвестный инструмент: ${name}`);
        }
      } catch (error) {
        console.error(`Ошибка выполнения инструмента ${name}:`, error);
        return {
          content: [
            {
              type: 'text',
              text: `❌ Ошибка: ${error.message}`,
            },
          ],
        };
      }
    });
  }

  async handleSearchDocumentation(args) {
    const { query, limit = 10, search_type = 'hybrid' } = args;

    if (!this.isInitialized) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Сервер не инициализирован',
          },
        ],
      };
    }

    try {
      let results = [];
      let searchMethod = '';

      if (search_type === 'semantic' && this.vectorDB.isInitialized) {
        results = await this.vectorDB.semanticSearch(query, limit);
        searchMethod = 'семантический поиск';
      } else if (search_type === 'keyword' && this.vectorDB.isInitialized) {
        results = this.vectorDB.keywordSearch(query, limit);
        searchMethod = 'ключевой поиск';
      } else if (search_type === 'hybrid' && this.vectorDB.isInitialized) {
        results = await this.vectorDB.hybridSearch(query, limit);
        searchMethod = 'гибридный поиск';
      } else {
        // Fallback к обычному поиску
        results = this.db.search(query, limit);
        searchMethod = 'обычный поиск';
      }

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `🔍 Поиск "${query}" не дал результатов (${searchMethod})`,
            },
          ],
        };
      }

      const formattedResults = results.map((result, index) => {
        const score = result.similarity || result.final_score || result.relevance_score || 0;
        const scoreText = score > 0 ? ` (сходство: ${score.toFixed(3)})` : '';
        
        return `${index + 1}. **${result.title}**${scoreText}`;
      }).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `🔍 Результаты поиска "${query}" (${searchMethod}):\n\n${formattedResults}\n\nВсего найдено: ${results.length} глав`,
          },
        ],
      };
    } catch (error) {
      console.error('Ошибка поиска:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Ошибка поиска: ${error.message}`,
          },
        ],
      };
    }
  }

  async handleVectorSearch(args) {
    const { query, limit = 10 } = args;

    if (!this.isInitialized || !this.vectorDB.isInitialized) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Векторная база данных не инициализирована',
          },
        ],
      };
    }

    try {
      const results = await this.vectorDB.semanticSearch(query, limit);

      if (results.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `🔍 Семантический поиск "${query}" не дал результатов`,
            },
          ],
        };
      }

      const formattedResults = results.map((result, index) => {
        return `${index + 1}. **${result.title}** (сходство: ${result.similarity.toFixed(3)})`;
      }).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `🔍 Результаты семантического поиска "${query}":\n\n${formattedResults}\n\nВсего найдено: ${results.length} глав`,
          },
        ],
      };
    } catch (error) {
      console.error('Ошибка семантического поиска:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Ошибка семантического поиска: ${error.message}`,
          },
        ],
      };
    }
  }

  async handleGetVectorStats(args) {
    if (!this.vectorDB.isInitialized) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Векторная база данных не инициализирована',
          },
        ],
      };
    }

    try {
      const stats = this.vectorDB.getStatistics();
      
      return {
        content: [
          {
            type: 'text',
            text: `📊 Статистика векторной базы данных:\n\n` +
                  `• Всего эмбеддингов: ${stats.total_embeddings}\n` +
                  `• Инициализирована: ${stats.is_initialized ? 'Да' : 'Нет'}\n` +
                  `• Модель: ${stats.model_info.name}\n` +
                  `• Размерность: ${stats.model_info.dimension}\n` +
                  `• Размер словаря: ${stats.model_info.vocabularySize}`,
          },
        ],
      };
    } catch (error) {
      console.error('Ошибка получения статистики векторной БД:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Ошибка получения статистики: ${error.message}`,
          },
        ],
      };
    }
  }

  async handleGetChapter(args) {
    const { chapter_id } = args;

    if (!this.isInitialized) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Сервер не инициализирован',
          },
        ],
      };
    }

    try {
      const chapter = await this.db.getChapter(chapter_id);
      if (!chapter) {
        return {
          content: [
            {
              type: 'text',
              text: `❌ Глава с ID ${chapter_id} не найдена`,
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
    } catch (error) {
      console.error('Ошибка получения главы:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Ошибка получения главы: ${error.message}`,
          },
        ],
      };
    }
  }

  async handleGetStatistics(args) {
    if (!this.isInitialized) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Сервер не инициализирован',
          },
        ],
      };
    }

    try {
      const stats = await this.db.getStatistics();
      let statsText = `📊 Статистика документации:\n\n` +
                     `• Всего глав: ${stats.total_chapters}\n` +
                     `• Глав с контентом: ${stats.chapters_with_content}\n` +
                     `• Глав с таблицами: ${stats.chapters_with_tables}\n` +
                     `• Глав с изображениями: ${stats.chapters_with_images}\n` +
                     `• Общее количество строк: ${stats.total_content_lines}\n` +
                     `• Общее количество таблиц: ${stats.total_tables}\n` +
                     `• Общее количество изображений: ${stats.total_images}`;

      // Добавляем статистику векторной БД если доступна
      if (this.vectorDB.isInitialized) {
        const vectorStats = this.vectorDB.getStatistics();
        statsText += `\n\n📊 Векторная база данных:\n` +
                    `• Эмбеддингов: ${vectorStats.total_embeddings}\n` +
                    `• Модель: ${vectorStats.model_info.name}\n` +
                    `• Размерность: ${vectorStats.model_info.dimension}`;
      }

      return {
        content: [
          {
            type: 'text',
            text: statsText,
          },
        ],
      };
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Ошибка получения статистики: ${error.message}`,
          },
        ],
      };
    }
  }

  async handleListChapters(args) {
    const { page = 1, limit = 20 } = args;

    if (!this.isInitialized) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Сервер не инициализирован',
          },
        ],
      };
    }

    try {
      const { chapters, pagination } = this.db.getAllChapters(page, limit);

      if (chapters.length === 0) {
        return {
          content: [
            {
              type: 'text',
              text: `📄 Страница ${page} пуста (всего глав: ${chapters.length})`,
            },
          ],
        };
      }

      const formattedChapters = chapters.map((chapter, index) => {
        return `${(pagination.page - 1) * pagination.limit + index + 1}. **${chapter.title}** (ID: ${chapter.chapter_id}, стр. ${chapter.page_start})`;
      }).join('\n');

      return {
        content: [
          {
            type: 'text',
            text: `📄 Список глав (страница ${pagination.page}):\n\n${formattedChapters}\n\nПоказано ${chapters.length} из ${pagination.total} глав`,
          },
        ],
      };
    } catch (error) {
      console.error('Ошибка получения списка глав:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Ошибка получения списка глав: ${error.message}`,
          },
        ],
      };
    }
  }

  async handleGetDocumentInfo(args) {
    if (!this.isInitialized) {
      return {
        content: [
          {
            type: 'text',
            text: '❌ Сервер не инициализирован',
          },
        ],
      };
    }

    try {
      const info = this.db.getDocumentInfo();
      return {
        content: [
          {
            type: 'text',
            text: `📚 Информация о документе:\n\n` +
                  `• Название: ${info.title}\n` +
                  `• Версия: ${info.version}\n` +
                  `• Описание: ${info.description}\n` +
                  `• Автор: ${info.author}\n` +
                  `• Лицензия: ${info.license}\n` +
                  `• Дата создания: ${info.created_at}\n` +
                  `• Последнее обновление: ${info.updated_at}`,
          },
        ],
      };
    } catch (error) {
      console.error('Ошибка получения информации о документе:', error);
      return {
        content: [
          {
            type: 'text',
            text: `❌ Ошибка получения информации о документе: ${error.message}`,
          },
        ],
      };
    }
  }

  async run() {
    await this.initialize();
    
    const transport = new StdioServerTransport();
    await this.server.connect(transport);
    
    console.log('🚀 MCP сервер Cleverence с векторным поиском запущен');
  }
}

// Запуск сервера
const server = new CleverenceMCPServer();
server.run().catch(console.error);
