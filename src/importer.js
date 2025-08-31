import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CleverenceDatabase from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class DataImporter {
  constructor() {
    this.db = new CleverenceDatabase();
    this.dataPath = path.join(__dirname, '../data');
  }

  async init() {
    await this.db.init();
  }

  async importStructureAnalysis() {
    console.log('Импорт структуры документации...');
    
    try {
      const filePath = path.join(this.dataPath, 'structure_analysis.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Сохраняем метаданные документа
      if (data.document_info) {
        await this.db.setMetadata('document_title', data.document_info.title || 'Cleverence Mobile Smarts Documentation');
        await this.db.setMetadata('page_count', data.document_info.page_count?.toString() || '0');
        await this.db.setMetadata('file_size', data.document_info.file_size?.toString() || '0');
      }

      if (data.structure_analysis) {
        await this.db.setMetadata('total_chapters', data.structure_analysis.total_chapters?.toString() || '0');
        await this.db.setMetadata('chapters_with_content', data.structure_analysis.chapters_with_content?.toString() || '0');
        await this.db.setMetadata('chapters_with_tables', data.structure_analysis.chapters_with_tables?.toString() || '0');
      }

      // Импортируем главы
      if (data.structure_analysis?.chapter_details) {
        let imported = 0;
        let skipped = 0;
        
        for (const chapter of data.structure_analysis.chapter_details) {
          if (chapter.title && chapter.title.trim()) {
            const success = await this.db.addChapter({
              chapter_id: chapter.id,
              title: chapter.title,
              content: '', // Контент будет добавлен из других файлов
              page_start: chapter.page_start || 0,
              content_lines: chapter.content_lines || 0,
              images_count: chapter.images_count || 0,
              tables_count: chapter.tables_count || 0
            });
            
            if (success) {
              imported++;
            } else {
              skipped++;
            }
          }
        }
        
        console.log(`Импортировано глав: ${imported}, пропущено: ${skipped}`);
      }
      
    } catch (error) {
      console.error('Ошибка импорта структуры:', error);
    }
  }

  async importRagStructure() {
    console.log('Импорт RAG структуры...');
    
    try {
      const filePath = path.join(this.dataPath, 'rag_structure.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Сохраняем метаданные
      if (data.metadata) {
        await this.db.setMetadata('document_title', data.metadata.title || 'Cleverence Mobile Smarts Documentation');
        await this.db.setMetadata('page_count', data.metadata.page_count?.toString() || '0');
        await this.db.setMetadata('file_size', data.metadata.file_size?.toString() || '0');
      }

      // Импортируем главы
      if (data.chapters && Array.isArray(data.chapters)) {
        let imported = 0;
        let skipped = 0;
        
        console.log(`Найдено ${data.chapters.length} глав для импорта`);
        
        for (const chapter of data.chapters) {
          if (chapter.title && chapter.title.trim()) {
            const success = await this.db.addChapter({
              chapter_id: chapter.id,
              title: chapter.title,
              content: chapter.content || '',
              page_start: chapter.page_start || 0,
              content_lines: chapter.content ? (typeof chapter.content === 'string' ? chapter.content.split('\n').length : (Array.isArray(chapter.content) ? chapter.content.length : 0)) : 0,
              images_count: chapter.images ? chapter.images.length : 0,
              tables_count: chapter.tables ? chapter.tables.length : 0
            });
            
            if (success) {
              imported++;
              if (imported % 100 === 0) {
                console.log(`Импортировано глав: ${imported}`);
              }
            } else {
              skipped++;
            }
          }
        }
        
        console.log(`Импорт RAG структуры завершен. Импортировано: ${imported}, пропущено: ${skipped}`);
      }
      
    } catch (error) {
      console.error('Ошибка импорта RAG структуры:', error);
    }
  }

  async importFullTextStructure() {
    console.log('Импорт полной текстовой структуры...');
    
    try {
      const filePath = path.join(this.dataPath, 'full_text_structure.json');
      const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
      
      // Сохраняем метаданные
      if (data.metadata) {
        await this.db.setMetadata('document_title', data.metadata.title || 'Cleverence Mobile Smarts Documentation');
        await this.db.setMetadata('page_count', data.metadata.page_count?.toString() || '0');
        await this.db.setMetadata('file_size', data.metadata.file_size?.toString() || '0');
      }

      // Обрабатываем страницы если они есть
      if (data.pages && Array.isArray(data.pages)) {
        console.log(`Найдено ${data.pages.length} страниц для обработки`);
        
        let imported = 0;
        for (const page of data.pages) {
          if (page.content && page.content.trim()) {
            const success = await this.db.addChapter({
              chapter_id: 10000 + page.page_number, // Используем уникальные ID для страниц
              title: `Страница ${page.page_number}`,
              content: page.content,
              page_start: page.page_number,
              content_lines: page.content.split('\n').length,
              images_count: 0,
              tables_count: 0
            });
            
            if (success) {
              imported++;
            }
          }
        }
        
        console.log(`Импортировано страниц: ${imported}`);
      }
      
      console.log('Импорт полной текстовой структуры завершен');
      
    } catch (error) {
      console.error('Ошибка импорта полной текстовой структуры:', error);
    }
  }

  async importAll() {
    console.log('Начинаем импорт всех данных...');
    
    try {
      await this.init();
      
      // Импортируем в правильном порядке
      await this.importStructureAnalysis();
      await this.importRagStructure();
      await this.importFullTextStructure();
      
      // Получаем статистику
      const stats = await this.db.getStatistics();
      console.log('Статистика после импорта:', stats);
      
      console.log('Импорт завершен успешно!');
      
    } catch (error) {
      console.error('Ошибка импорта:', error);
    } finally {
      await this.db.close();
    }
  }

  async close() {
    await this.db.close();
  }
}

// Запуск импорта если файл запущен напрямую
const isMainModule = process.argv[1] && process.argv[1].endsWith('importer.js');
if (isMainModule) {
  const importer = new DataImporter();
  importer.importAll().catch(console.error);
}

export default DataImporter;
