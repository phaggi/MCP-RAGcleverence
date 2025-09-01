import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import SimpleEmbeddingService from './simple-embeddings.js';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class VectorDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '../db');
    this.embeddingsFile = path.join(this.dbPath, 'embeddings.json');
    this.vectorIndexFile = path.join(this.dbPath, 'vector_index.json');
    this.embeddingService = new SimpleEmbeddingService();
    
    this.embeddings = new Map();
    this.vectorIndex = new Map();
    this.isInitialized = false;
  }

  async initialize() {
    try {
      console.log('Инициализация векторной базы данных...');
      
      // Инициализируем сервис эмбеддингов
      await this.embeddingService.initialize();
      
      // Загружаем существующие эмбеддинги
      await this.loadEmbeddings();
      
      // Создаем векторный индекс
      await this.buildVectorIndex();
      
      this.isInitialized = true;
      console.log('Векторная база данных инициализирована');
      return true;
    } catch (error) {
      console.error('Ошибка инициализации векторной БД:', error);
      return false;
    }
  }

  async loadEmbeddings() {
    try {
      if (!fs.existsSync(this.embeddingsFile)) {
        console.log('Файл эмбеддингов не найден');
        return;
      }

      const data = JSON.parse(fs.readFileSync(this.embeddingsFile, 'utf8'));
      console.log(`Загружено ${Object.keys(data.embeddings).length} эмбеддингов`);
      
      // Загружаем эмбеддинги в Map для быстрого доступа
      for (const [chapterId, embeddingData] of Object.entries(data.embeddings)) {
        this.embeddings.set(parseInt(chapterId), embeddingData);
      }
      
    } catch (error) {
      console.error('Ошибка загрузки эмбеддингов:', error);
    }
  }

  async buildVectorIndex() {
    try {
      console.log('Построение векторного индекса...');
      
      // Создаем индекс для быстрого поиска
      for (const [chapterId, embeddingData] of this.embeddings) {
        this.vectorIndex.set(chapterId, {
          embedding: embeddingData.embedding,
          title: embeddingData.title,
          metadata: {
            chapter_id: chapterId,
            generated_at: embeddingData.generated_at
          }
        });
      }
      
      console.log(`Векторный индекс построен для ${this.vectorIndex.size} глав`);
      
    } catch (error) {
      console.error('Ошибка построения векторного индекса:', error);
    }
  }

  async semanticSearch(query, limit = 10) {
    if (!this.isInitialized) {
      throw new Error('Векторная база данных не инициализирована');
    }

    try {
      // Генерируем эмбеддинг для запроса
      const queryEmbedding = await this.embeddingService.generateQueryEmbedding(query);
      
      // Вычисляем сходство со всеми главами
      const similarities = [];
      
      for (const [chapterId, vectorData] of this.vectorIndex) {
        const similarity = this.embeddingService.cosineSimilarity(
          queryEmbedding, 
          vectorData.embedding
        );
        
        similarities.push({
          chapter_id: chapterId,
          title: vectorData.title,
          similarity: similarity,
          metadata: vectorData.metadata
        });
      }
      
      // Сортируем по убыванию сходства
      similarities.sort((a, b) => b.similarity - a.similarity);
      
      // Возвращаем топ результатов
      return similarities.slice(0, limit);
      
    } catch (error) {
      console.error('Ошибка семантического поиска:', error);
      return [];
    }
  }

  async hybridSearch(query, limit = 10) {
    if (!this.isInitialized) {
      throw new Error('Векторная база данных не инициализирована');
    }

    try {
      // Семантический поиск
      const semanticResults = await this.semanticSearch(query, limit * 2);
      
      // Простой ключевой поиск
      const keywordResults = this.keywordSearch(query, limit * 2);
      
      // Объединяем результаты
      const combinedResults = this.combineSearchResults(semanticResults, keywordResults, limit);
      
      return combinedResults;
      
    } catch (error) {
      console.error('Ошибка гибридного поиска:', error);
      return [];
    }
  }

  keywordSearch(query, limit = 10) {
    const queryWords = query.toLowerCase().split(' ');
    const results = [];
    
    for (const [chapterId, vectorData] of this.vectorIndex) {
      let score = 0;
      const title = vectorData.title.toLowerCase();
      
      for (const word of queryWords) {
        if (title.includes(word)) {
          score += 1;
        }
      }
      
      if (score > 0) {
        results.push({
          chapter_id: chapterId,
          title: vectorData.title,
          similarity: score / queryWords.length, // Нормализуем
          metadata: vectorData.metadata,
          search_type: 'keyword'
        });
      }
    }
    
    // Сортируем по убыванию сходства
    results.sort((a, b) => b.similarity - a.similarity);
    
    return results.slice(0, limit);
  }

  combineSearchResults(semanticResults, keywordResults, limit) {
    const combined = new Map();
    
    // Добавляем семантические результаты с весом 0.7
    for (const result of semanticResults) {
      combined.set(result.chapter_id, {
        ...result,
        final_score: result.similarity * 0.7,
        search_type: 'semantic'
      });
    }
    
    // Добавляем ключевые результаты с весом 0.3
    for (const result of keywordResults) {
      if (combined.has(result.chapter_id)) {
        // Если глава уже есть, увеличиваем счет
        const existing = combined.get(result.chapter_id);
        existing.final_score += result.similarity * 0.3;
        existing.search_type = 'hybrid';
      } else {
        combined.set(result.chapter_id, {
          ...result,
          final_score: result.similarity * 0.3,
          search_type: 'keyword'
        });
      }
    }
    
    // Сортируем по финальному счету
    const sortedResults = Array.from(combined.values())
      .sort((a, b) => b.final_score - a.final_score)
      .slice(0, limit);
    
    return sortedResults;
  }

  async getChapterVector(chapterId) {
    if (!this.isInitialized) {
      throw new Error('Векторная база данных не инициализирована');
    }

    return this.vectorIndex.get(chapterId) || null;
  }

  async addChapterVector(chapterId, title, content) {
    if (!this.isInitialized) {
      throw new Error('Векторная база данных не инициализирована');
    }

    try {
      // Генерируем эмбеддинг для новой главы
      const embedding = await this.embeddingService.generateChapterEmbedding({
        title: title,
        content: content
      });
      
      // Добавляем в индекс
      this.vectorIndex.set(chapterId, {
        embedding: embedding,
        title: title,
        metadata: {
          chapter_id: chapterId,
          generated_at: new Date().toISOString()
        }
      });
      
      // Обновляем файл эмбеддингов
      await this.saveEmbeddings();
      
      return true;
    } catch (error) {
      console.error('Ошибка добавления вектора главы:', error);
      return false;
    }
  }

  async saveEmbeddings() {
    try {
      const data = {
        metadata: {
          model: this.embeddingService.getModelInfo(),
          updated_at: new Date().toISOString(),
          total_embeddings: this.vectorIndex.size
        },
        embeddings: {}
      };
      
      // Сохраняем все эмбеддинги
      for (const [chapterId, vectorData] of this.vectorIndex) {
        data.embeddings[chapterId] = {
          embedding: vectorData.embedding,
          title: vectorData.title,
          generated_at: vectorData.metadata.generated_at
        };
      }
      
      fs.writeFileSync(this.embeddingsFile, JSON.stringify(data, null, 2));
      console.log(`Эмбеддинги сохранены: ${this.vectorIndex.size} глав`);
      
    } catch (error) {
      console.error('Ошибка сохранения эмбеддингов:', error);
    }
  }

  getStatistics() {
    return {
      total_embeddings: this.vectorIndex.size,
      is_initialized: this.isInitialized,
      model_info: this.embeddingService.getModelInfo()
    };
  }

  async close() {
    // Сохраняем изменения
    await this.saveEmbeddings();
    console.log('Векторная база данных закрыта');
  }
}

export default VectorDatabase;
