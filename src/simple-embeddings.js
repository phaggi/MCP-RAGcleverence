import { createHash } from 'crypto';

class SimpleEmbeddingService {
  constructor() {
    this.embeddingDimension = 128; // Упрощенная размерность
    this.vocabulary = new Set();
    this.wordVectors = new Map();
  }

  async initialize() {
    try {
      console.log('Инициализация упрощенного сервиса эмбеддингов...');
      
      // Создаем базовый словарь из общих слов
      this.buildBasicVocabulary();
      
      // Инициализируем случайные векторы для слов
      this.initializeWordVectors();
      
      console.log('Упрощенный сервис эмбеддингов инициализирован');
      return true;
    } catch (error) {
      console.error('Ошибка инициализации:', error);
      return false;
    }
  }

  buildBasicVocabulary() {
    // Базовые слова для документации Cleverence
    const baseWords = [
      'поступление', 'товар', 'склад', 'настройка', 'mobile', 'smarts',
      'панель', 'управление', 'этикетка', 'штрихкод', 'принтер', 'сканер',
      'документ', 'система', 'функция', 'параметр', 'конфигурация',
      'пользователь', 'интерфейс', 'данные', 'база', 'поиск', 'фильтр',
      'отчет', 'статистика', 'анализ', 'экспорт', 'импорт', 'синхронизация'
    ];

    baseWords.forEach(word => this.vocabulary.add(word.toLowerCase()));
  }

  initializeWordVectors() {
    for (const word of this.vocabulary) {
      // Создаем детерминированный вектор на основе хеша слова
      const hash = createHash('md5').update(word).digest('hex');
      const vector = this.hashToVector(hash);
      this.wordVectors.set(word, vector);
    }
  }

  hashToVector(hash) {
    const vector = new Array(this.embeddingDimension).fill(0);
    
    for (let i = 0; i < this.embeddingDimension; i++) {
      const hexIndex = i % 32; // MD5 дает 32 символа
      const char = hash[hexIndex];
      vector[i] = (parseInt(char, 16) - 8) / 8; // Нормализуем к [-1, 1]
    }
    
    return vector;
  }

  async generateEmbedding(text) {
    try {
      // Нормализуем текст
      const normalizedText = this.normalizeText(text);
      const words = normalizedText.split(' ').filter(word => word.length > 0);
      
      // Создаем вектор на основе слов
      const embedding = new Array(this.embeddingDimension).fill(0);
      let wordCount = 0;
      
      for (const word of words) {
        if (this.wordVectors.has(word)) {
          const wordVector = this.wordVectors.get(word);
          for (let i = 0; i < this.embeddingDimension; i++) {
            embedding[i] += wordVector[i];
          }
          wordCount++;
        }
      }
      
      // Нормализуем вектор
      if (wordCount > 0) {
        for (let i = 0; i < this.embeddingDimension; i++) {
          embedding[i] /= wordCount;
        }
      }
      
      return embedding;
    } catch (error) {
      console.error('Ошибка генерации эмбеддинга:', error);
      return new Array(this.embeddingDimension).fill(0);
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

  // Нормализация текста
  normalizeText(text) {
    return text
      .toLowerCase()
      .replace(/[^\w\sа-яё]/gi, ' ') // Удаляем специальные символы
      .replace(/\s+/g, ' ') // Заменяем множественные пробелы на один
      .trim();
  }

  // Генерация эмбеддинга для главы
  async generateChapterEmbedding(chapter) {
    const title = chapter.title || '';
    const content = chapter.content || '';
    
    const combinedText = this.combineTextForEmbedding(title, content);
    return await this.generateEmbedding(combinedText);
  }

  // Генерация эмбеддинга для поискового запроса
  async generateQueryEmbedding(query) {
    return await this.generateEmbedding(query);
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

  // Получение информации о модели
  getModelInfo() {
    return {
      name: 'Simple-Hash-Based-Embeddings',
      dimension: this.embeddingDimension,
      isLoaded: this.wordVectors.size > 0,
      vocabularySize: this.vocabulary.size
    };
  }

  // Расширение словаря новыми словами
  expandVocabulary(newWords) {
    let added = 0;
    for (const word of newWords) {
      if (!this.vocabulary.has(word.toLowerCase())) {
        this.vocabulary.add(word.toLowerCase());
        const hash = createHash('md5').update(word.toLowerCase()).digest('hex');
        const vector = this.hashToVector(hash);
        this.wordVectors.set(word.toLowerCase(), vector);
        added++;
      }
    }
    console.log(`Добавлено ${added} новых слов в словарь`);
  }
}

export default SimpleEmbeddingService;
