import express from 'express';
import cors from 'cors';
import CleverenceDatabase from './database.js';

class CleverenceAPI {
  constructor() {
    console.log('Инициализация CleverenceAPI...');
    this.app = express();
    this.db = new CleverenceDatabase();
    this.port = process.env.PORT || 3001;
    
    this.setupMiddleware();
    this.setupRoutes();
  }

  setupMiddleware() {
    console.log('Настройка middleware...');
    this.app.use(cors());
    this.app.use(express.json({ limit: '10mb' }));
    this.app.use(express.urlencoded({ extended: true }));
  }

  setupRoutes() {
    console.log('Настройка маршрутов...');
    
    // Получение статистики
    this.app.get('/api/statistics', async (req, res) => {
      try {
        const stats = await this.db.getStatistics();
        res.json({ success: true, data: stats });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Поиск по документации
    this.app.get('/api/search', async (req, res) => {
      try {
        const { query, limit = 10 } = req.query;
        
        if (!query) {
          return res.status(400).json({ success: false, error: 'Поисковый запрос обязателен' });
        }

        const results = await this.db.searchChapters(query, parseInt(limit));
        res.json({ success: true, data: results });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Получение главы по ID
    this.app.get('/api/chapter/:id', async (req, res) => {
      try {
        const chapterId = parseInt(req.params.id);
        
        if (isNaN(chapterId)) {
          return res.status(400).json({ success: false, error: 'ID главы должен быть числом' });
        }

        const chapter = await this.db.getChapter(chapterId);
        
        if (!chapter) {
          return res.status(404).json({ success: false, error: 'Глава не найдена' });
        }

        res.json({ success: true, data: chapter });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Добавление новой главы
    this.app.post('/api/chapter', async (req, res) => {
      try {
        const { chapter_id, title, content, page_start, content_lines, images_count, tables_count } = req.body;
        
        if (!chapter_id || !title) {
          return res.status(400).json({ 
            success: false, 
            error: 'ID главы и заголовок обязательны' 
          });
        }

        const success = await this.db.addChapter({
          chapter_id: parseInt(chapter_id),
          title,
          content: content || '',
          page_start: parseInt(page_start) || 0,
          content_lines: parseInt(content_lines) || 0,
          images_count: parseInt(images_count) || 0,
          tables_count: parseInt(tables_count) || 0,
        });

        if (success) {
          res.json({ success: true, message: 'Глава успешно добавлена' });
        } else {
          res.status(500).json({ success: false, error: 'Ошибка при добавлении главы' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Получение информации о документе
    this.app.get('/api/document-info', async (req, res) => {
      try {
        const title = await this.db.getMetadata('document_title');
        const pageCount = await this.db.getMetadata('page_count');
        const fileSize = await this.db.getMetadata('file_size');
        const totalChapters = await this.db.getMetadata('total_chapters');
        const chaptersWithContent = await this.db.getMetadata('chapters_with_content');

        res.json({
          success: true,
          data: {
            title: title || 'Cleverence Mobile Smarts Documentation',
            page_count: pageCount ? parseInt(pageCount) : null,
            file_size: fileSize ? parseInt(fileSize) : null,
            total_chapters: totalChapters ? parseInt(totalChapters) : null,
            chapters_with_content: chaptersWithContent ? parseInt(chaptersWithContent) : null,
          }
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Массовое добавление глав
    this.app.post('/api/chapters/bulk', async (req, res) => {
      try {
        const { chapters } = req.body;
        
        if (!Array.isArray(chapters)) {
          return res.status(400).json({ 
            success: false, 
            error: 'chapters должен быть массивом' 
          });
        }

        let successCount = 0;
        let errorCount = 0;
        const errors = [];

        for (const chapter of chapters) {
          try {
            const success = await this.db.addChapter({
              chapter_id: parseInt(chapter.chapter_id),
              title: chapter.title,
              content: chapter.content || '',
              page_start: parseInt(chapter.page_start) || 0,
              content_lines: parseInt(chapter.content_lines) || 0,
              images_count: parseInt(chapter.images_count) || 0,
              tables_count: parseInt(chapter.tables_count) || 0,
            });

            if (success) {
              successCount++;
            } else {
              errorCount++;
              errors.push(`Ошибка добавления главы ${chapter.chapter_id}`);
            }
          } catch (error) {
            errorCount++;
            errors.push(`Ошибка добавления главы ${chapter.chapter_id}: ${error.message}`);
          }
        }

        res.json({
          success: true,
          data: {
            total: chapters.length,
            success_count: successCount,
            error_count: errorCount,
            errors: errors.length > 0 ? errors : undefined
          }
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Получение списка глав с пагинацией
    this.app.get('/api/chapters', async (req, res) => {
      try {
        const { page = 1, limit = 20, search } = req.query;
        
        const result = this.db.getAllChapters(parseInt(page), parseInt(limit), search);

        res.json({
          success: true,
          data: result
        });
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Обновление главы
    this.app.put('/api/chapter/:id', async (req, res) => {
      try {
        const chapterId = parseInt(req.params.id);
        const { title, content, page_start, content_lines, images_count, tables_count } = req.body;
        
        if (isNaN(chapterId)) {
          return res.status(400).json({ success: false, error: 'ID главы должен быть числом' });
        }

        const success = await this.db.addChapter({
          chapter_id: chapterId,
          title: title || '',
          content: content || '',
          page_start: parseInt(page_start) || 0,
          content_lines: parseInt(content_lines) || 0,
          images_count: parseInt(images_count) || 0,
          tables_count: parseInt(tables_count) || 0,
        });

        if (success) {
          res.json({ success: true, message: 'Глава успешно обновлена' });
        } else {
          res.status(500).json({ success: false, error: 'Ошибка при обновлении главы' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Удаление главы
    this.app.delete('/api/chapter/:id', async (req, res) => {
      try {
        const chapterId = parseInt(req.params.id);
        
        if (isNaN(chapterId)) {
          return res.status(400).json({ success: false, error: 'ID главы должен быть числом' });
        }

        const success = this.db.deleteChapter(chapterId);
        
        if (success) {
          res.json({ success: true, message: 'Глава успешно удалена' });
        } else {
          res.status(404).json({ success: false, error: 'Глава не найдена' });
        }
      } catch (error) {
        res.status(500).json({ success: false, error: error.message });
      }
    });

    // Корневой маршрут
    this.app.get('/', (req, res) => {
      res.json({
        success: true,
        message: 'Cleverence Documentation API',
        version: '1.0.0',
        endpoints: {
          'GET /api/statistics': 'Получить статистику документации',
          'GET /api/search?query=...': 'Поиск по документации',
          'GET /api/chapter/:id': 'Получить главу по ID',
          'POST /api/chapter': 'Добавить новую главу',
          'PUT /api/chapter/:id': 'Обновить главу',
          'DELETE /api/chapter/:id': 'Удалить главу',
          'POST /api/chapters/bulk': 'Массовое добавление глав',
          'GET /api/chapters': 'Получить список глав с пагинацией',
          'GET /api/document-info': 'Получить информацию о документе'
        }
      });
    });
  }

  async start() {
    try {
      console.log('Инициализация базы данных...');
      await this.db.init();
      console.log('База данных инициализирована');
      
      console.log(`Запуск сервера на порту ${this.port}...`);
      this.app.listen(this.port, () => {
        console.log(`HTTP API сервер запущен на порту ${this.port}`);
        console.log(`API доступен по адресу: http://localhost:${this.port}`);
      });
    } catch (error) {
      console.error('Ошибка запуска API сервера:', error);
      process.exit(1);
    }
  }

  async stop() {
    await this.db.close();
    console.log('HTTP API сервер остановлен');
  }
}

// Запуск API сервера если файл запущен напрямую
const isMainModule = process.argv[1] && process.argv[1].endsWith('api.js');
if (isMainModule) {
  console.log('Запуск CleverenceAPI...');
  const api = new CleverenceAPI();
  
  // Обработка сигналов завершения
  process.on('SIGINT', async () => {
    console.log('\nПолучен сигнал SIGINT, останавливаем API сервер...');
    await api.stop();
    process.exit(0);
  });

  process.on('SIGTERM', async () => {
    console.log('\nПолучен сигнал SIGTERM, останавливаем API сервер...');
    await api.stop();
    process.exit(0);
  });

  api.start().catch(console.error);
}

export default CleverenceAPI;
