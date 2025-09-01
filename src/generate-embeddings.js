import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import CleverenceDatabase from './database.js';
import SimpleEmbeddingService from './simple-embeddings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmbeddingGenerator {
  constructor() {
    this.db = new CleverenceDatabase();
    this.embeddingService = new SimpleEmbeddingService();
    this.embeddingsFile = path.join(__dirname, '../db/embeddings.json');
  }

  async initialize() {
    console.log('Инициализация генератора эмбеддингов...');
    
    // Инициализируем базу данных
    await this.db.init();
    
    // Инициализируем сервис эмбеддингов
    const success = await this.embeddingService.initialize();
    if (!success) {
      throw new Error('Не удалось инициализировать сервис эмбеддингов');
    }

    console.log('Генератор эмбеддингов инициализирован');
  }

  async generateAllEmbeddings() {
    console.log('Начинаем генерацию эмбеддингов для всех глав...');
    
    const chapters = Array.from(this.db.chapters.values());
    const totalChapters = chapters.length;
    
    console.log(`Найдено ${totalChapters} глав для обработки`);
    
    const embeddings = {};
    let processed = 0;
    let errors = 0;

    for (const chapter of chapters) {
      try {
        console.log(`Обработка главы ${processed + 1}/${totalChapters}: ${chapter.title}`);
        
        const embedding = await this.embeddingService.generateChapterEmbedding(chapter);
        embeddings[chapter.chapter_id] = {
          embedding: embedding,
          title: chapter.title,
          generated_at: new Date().toISOString()
        };
        
        processed++;
        
        // Показываем прогресс каждые 50 глав
        if (processed % 50 === 0) {
          console.log(`Обработано глав: ${processed}/${totalChapters}`);
        }
        
      } catch (error) {
        console.error(`Ошибка обработки главы ${chapter.chapter_id}:`, error.message);
        errors++;
      }
    }

    console.log(`Генерация завершена. Обработано: ${processed}, ошибок: ${errors}`);

    // Сохраняем эмбеддинги в файл
    await this.saveEmbeddings(embeddings);
    
    return {
      total: totalChapters,
      processed,
      errors,
      embeddings: Object.keys(embeddings).length
    };
  }

  async saveEmbeddings(embeddings) {
    try {
      console.log('Сохранение эмбеддингов в файл...');
      
      const data = {
        metadata: {
          model: this.embeddingService.getModelInfo(),
          generated_at: new Date().toISOString(),
          total_embeddings: Object.keys(embeddings).length
        },
        embeddings: embeddings
      };

      fs.writeFileSync(this.embeddingsFile, JSON.stringify(data, null, 2));
      console.log(`Эмбеддинги сохранены в файл: ${this.embeddingsFile}`);
      
    } catch (error) {
      console.error('Ошибка сохранения эмбеддингов:', error);
      throw error;
    }
  }

  async loadEmbeddings() {
    try {
      if (!fs.existsSync(this.embeddingsFile)) {
        console.log('Файл эмбеддингов не найден');
        return null;
      }

      const data = JSON.parse(fs.readFileSync(this.embeddingsFile, 'utf8'));
      console.log(`Загружено ${Object.keys(data.embeddings).length} эмбеддингов`);
      return data;
      
    } catch (error) {
      console.error('Ошибка загрузки эмбеддингов:', error);
      return null;
    }
  }

  async testEmbeddings() {
    console.log('Тестирование эмбеддингов...');
    
    const embeddingsData = await this.loadEmbeddings();
    if (!embeddingsData) {
      console.log('Эмбеддинги не найдены, запускаем генерацию...');
      return await this.generateAllEmbeddings();
    }

    // Тестируем поиск
    const testQueries = [
      'поступление товаров',
      'настройка Mobile SMARTS',
      'панель управления',
      'этикетки и штрихкоды'
    ];

    for (const query of testQueries) {
      console.log(`\nТестирование запроса: "${query}"`);
      
      try {
        const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query);
        
        // Находим наиболее похожие главы
        const similarities = [];
        for (const [chapterId, data] of Object.entries(embeddingsData.embeddings)) {
          const similarity = this.embeddingService.cosineSimilarity(
            queryEmbedding, 
            data.embedding
          );
          similarities.push({
            chapterId: parseInt(chapterId),
            title: data.title,
            similarity
          });
        }

        // Сортируем по сходству
        similarities.sort((a, b) => b.similarity - a.similarity);

        // Показываем топ-3 результата
        console.log('Топ-3 результата:');
        for (let i = 0; i < Math.min(3, similarities.length); i++) {
          const result = similarities[i];
          console.log(`  ${i + 1}. ${result.title} (сходство: ${result.similarity.toFixed(3)})`);
        }
        
      } catch (error) {
        console.error(`Ошибка тестирования запроса "${query}":`, error.message);
      }
    }
  }

  async close() {
    await this.db.close();
  }
}

// Запуск если файл запущен напрямую
const isMainModule = process.argv[1] && process.argv[1].endsWith('generate-embeddings.js');
if (isMainModule) {
  const generator = new EmbeddingGenerator();
  
  try {
    await generator.initialize();
    
    const command = process.argv[2];
    
    if (command === 'test') {
      await generator.testEmbeddings();
    } else {
      const result = await generator.generateAllEmbeddings();
      console.log('Результат генерации:', result);
    }
    
  } catch (error) {
    console.error('Ошибка выполнения:', error);
  } finally {
    await generator.close();
  }
}

export default EmbeddingGenerator;
