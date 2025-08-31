import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CleverenceDatabase from './database.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function simpleImport() {
  console.log('Начинаем упрощенный импорт...');
  
  const db = new CleverenceDatabase();
  
  try {
    await db.init();
    console.log('База данных инициализирована');
    
    const dataPath = path.join(__dirname, '../data');
    const ragFile = path.join(dataPath, 'rag_structure.json');
    
    console.log('Читаем RAG файл...');
    const data = JSON.parse(fs.readFileSync(ragFile, 'utf8'));
    
    console.log(`Найдено ${data.chapters.length} глав`);
    
    // Импортируем только первые 10 глав для тестирования
    let imported = 0;
    for (let i = 0; i < Math.min(10, data.chapters.length); i++) {
      const chapter = data.chapters[i];
      
      if (chapter.title && chapter.title.trim()) {
        const content = chapter.content || '';
        const contentLines = typeof content === 'string' ? content.split('\n').length : 0;
        
        const success = await db.addChapter({
          chapter_id: chapter.id,
          title: chapter.title,
          content: content,
          page_start: chapter.page_start || 0,
          content_lines: contentLines,
          images_count: chapter.images ? chapter.images.length : 0,
          tables_count: chapter.tables ? chapter.tables.length : 0
        });
        
        if (success) {
          imported++;
          console.log(`Импортирована глава ${i + 1}: ${chapter.title} (контент: ${content.length} символов)`);
        }
      }
    }
    
    console.log(`Импортировано глав: ${imported}`);
    
    // Получаем статистику
    const stats = await db.getStatistics();
    console.log('Статистика:', stats);
    
    // Тестируем поиск
    const searchResults = await db.searchChapters('cleverence');
    console.log(`Поиск по 'cleverence' вернул ${searchResults.length} результатов`);
    
  } catch (error) {
    console.error('Ошибка импорта:', error);
  } finally {
    await db.close();
  }
}

simpleImport();
