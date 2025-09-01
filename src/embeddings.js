import { pipeline } from '@xenova/transformers';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class EmbeddingService {
  constructor() {
    this.model = null;
    this.modelName = 'Xenova/all-MiniLM-L6-v2'; // Быстрая и качественная модель
    this.embeddingDimension = 384; // Размерность эмбеддингов для этой модели
  }

  async initialize() {
    try {
      console.log('Инициализация модели эмбеддингов...');
      this.model = await pipeline('feature-extraction', this.modelName);
      console.log('Модель эмбеддингов загружена успешно');
      return true;
    } catch (error) {
      console.error('Ошибка инициализации модели эмбеддингов:', error);
      return false;
    }
  }

  async generateEmbedding(text) {
    if (!this.model) {
      throw new Error('Модель эмбеддингов не инициализирована');
    }

    try {
      // Ограничиваем длину текста для производительности
      const truncatedText = this.truncateText(text, 512);
      
      const result = await this.model(truncatedText, {
        pooling: 'mean',
        normalize: true
      });

      // Преобразуем в обычный массив
      const embedding = Array.from(result.data);
      return embedding;
    } catch (error) {
      console.error('Ошибка генерации эмбеддинга:', error);
      throw error;
    }
  }

  async generateEmbeddings(texts) {
    if (!Array.isArray(texts)) {
      texts = [texts];
    }

    const embeddings = [];
    for (const text of texts) {
      try {
        const embedding = await this.generateEmbedding(text);
        embeddings.push(embedding);
      } catch (error) {
        console.error(`Ошибка генерации эмбеддинга для текста: ${text.substring(0, 100)}...`);
        // Возвращаем нулевой вектор в случае ошибки
        embeddings.push(new Array(this.embeddingDimension).fill(0));
      }
    }

    return embeddings;
  }

  // Вычисление косинусного сходства между двумя векторами
  cosineSimilarity(vec1, vec2) {
    if (vec1.length !== vec2.length) {
      throw new Error('Векторы должны иметь одинаковую размерность');
    }

    let dotProduct = 0;
    let norm1 = 0;
    let norm2 = 0;

    for (let i = 0; i < vec1.length; i++) {
      dotProduct += vec1[i] * vec2[i];
      norm1 += vec1[i] * vec1[i];
      norm2 += vec2[i] * vec2[i];
    }

    norm1 = Math.sqrt(norm1);
    norm2 = Math.sqrt(norm2);

    if (norm1 === 0 || norm2 === 0) {
      return 0;
    }

    return dotProduct / (norm1 * norm2);
  }

  // Поиск наиболее похожих векторов
  findSimilarVectors(queryEmbedding, embeddings, topK = 5) {
    const similarities = embeddings.map((embedding, index) => ({
      index,
      similarity: this.cosineSimilarity(queryEmbedding, embedding)
    }));

    // Сортируем по убыванию сходства
    similarities.sort((a, b) => b.similarity - a.similarity);

    // Возвращаем topK результатов
    return similarities.slice(0, topK);
  }

  // Объединение текста для эмбеддинга
  combineTextForEmbedding(title, content) {
    if (typeof content === 'string') {
      return `${title}\n\n${content}`;
    } else if (Array.isArray(content)) {
      const contentText = content.map(item => {
        if (typeof item === 'string') {
          return item;
        } else if (item && typeof item === 'object' && item.text) {
          return item.text;
        }
        return '';
      }).filter(text => text.trim()).join(' ');
      
      return `${title}\n\n${contentText}`;
    }
    
    return title;
  }

  // Обрезка текста до максимальной длины
  truncateText(text, maxLength) {
    if (text.length <= maxLength) {
      return text;
    }
    
    // Обрезаем по словам, чтобы не разрывать слова
    const words = text.split(' ');
    let truncated = '';
    
    for (const word of words) {
      if ((truncated + ' ' + word).length <= maxLength) {
        truncated += (truncated ? ' ' : '') + word;
      } else {
        break;
      }
    }
    
    return truncated;
  }

  // Нормализация текста для лучших эмбеддингов
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\sа-яё]/gi, ' ') // Удаляем специальные символы, оставляем буквы и цифры
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
      .trim();
  }

  // Генерация эмбеддинга для главы
  async generateChapterEmbedding(chapter) {
    const title = chapter.title || '';
    const content = chapter.content || '';
    
    const combinedText = this.combineTextForEmbedding(title, content);
    const normalizedText = this.normalizeText(combinedText);
    
    return await this.generateEmbedding(normalizedText);
  }

  // Генерация эмбеддинга для поискового запроса
  async generateQueryEmbedding(query) {
    const normalizedQuery = this.normalizeText(query);
    return await this.generateEmbedding(normalizedQuery);
  }

  // Получение информации о модели
  getModelInfo() {
    return {
      name: this.modelName,
      dimension: this.embeddingDimension,
      isLoaded: this.model !== null
    };
  }
}

export default EmbeddingService;
