import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

class CleverenceDatabase {
  constructor() {
    this.dbPath = path.join(__dirname, '../db');
    this.chaptersFile = path.join(this.dbPath, 'chapters.json');
    this.metadataFile = path.join(this.dbPath, 'metadata.json');
    this.searchIndexFile = path.join(this.dbPath, 'search_index.json');
    
    this.chapters = new Map();
    this.metadata = new Map();
    this.searchIndex = new Map();
  }

  async init() {
    try {
      // Создаем папку db если её нет
      if (!fs.existsSync(this.dbPath)) {
        fs.mkdirSync(this.dbPath, { recursive: true });
      }

      // Загружаем данные из файлов
      await this.loadData();
      console.log('База данных инициализирована:', this.dbPath);
    } catch (error) {
      console.error('Ошибка инициализации базы данных:', error);
      throw error;
    }
  }

  async loadData() {
    try {
      // Загружаем главы
      if (fs.existsSync(this.chaptersFile)) {
        const chaptersData = JSON.parse(fs.readFileSync(this.chaptersFile, 'utf8'));
        this.chapters = new Map(Object.entries(chaptersData));
      }

      // Загружаем метаданные
      if (fs.existsSync(this.metadataFile)) {
        const metadataData = JSON.parse(fs.readFileSync(this.metadataFile, 'utf8'));
        this.metadata = new Map(Object.entries(metadataData));
      }

      // Загружаем поисковый индекс
      if (fs.existsSync(this.searchIndexFile)) {
        const searchIndexData = JSON.parse(fs.readFileSync(this.searchIndexFile, 'utf8'));
        this.searchIndex = new Map(Object.entries(searchIndexData));
      }
    } catch (error) {
      console.error('Ошибка загрузки данных:', error);
    }
  }

  async saveData() {
    try {
      // Сохраняем главы
      const chaptersData = Object.fromEntries(this.chapters);
      fs.writeFileSync(this.chaptersFile, JSON.stringify(chaptersData, null, 2));

      // Сохраняем метаданные
      const metadataData = Object.fromEntries(this.metadata);
      fs.writeFileSync(this.metadataFile, JSON.stringify(metadataData, null, 2));

      // Сохраняем поисковый индекс
      const searchIndexData = Object.fromEntries(this.searchIndex);
      fs.writeFileSync(this.searchIndexFile, JSON.stringify(searchIndexData, null, 2));
    } catch (error) {
      console.error('Ошибка сохранения данных:', error);
    }
  }

  // Преобразуем content в строку для поиска
  contentToString(content) {
    if (typeof content === 'string') {
      return content;
    } else if (Array.isArray(content)) {
      return content.map(item => {
        if (typeof item === 'string') {
          return item;
        } else if (item && typeof item === 'object' && item.text) {
          return item.text;
        }
        return '';
      }).join(' ');
    }
    return '';
  }

  // Получаем количество строк в content
  getContentLines(content) {
    if (typeof content === 'string') {
      return content.split('\n').length;
    } else if (Array.isArray(content)) {
      return content.length;
    }
    return 0;
  }

  async addChapter(chapterData) {
    const { chapter_id, title, content, page_start, content_lines, images_count, tables_count } = chapterData;
    
    try {
      const chapter = {
        id: this.chapters.size + 1,
        chapter_id,
        title,
        content: content || '',
        page_start: page_start || 0,
        content_lines: content_lines || this.getContentLines(content),
        images_count: images_count || 0,
        tables_count: tables_count || 0,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      this.chapters.set(chapter_id.toString(), chapter);

      // Добавляем в поисковый индекс
      const contentString = this.contentToString(content);
      if (contentString) {
        const searchText = `${title} ${contentString}`.toLowerCase();
        const keywords = this.extractKeywords(searchText);
        
        this.searchIndex.set(chapter_id.toString(), {
          chapter_id,
          search_text: searchText,
          keywords,
          created_at: new Date().toISOString()
        });
      }

      await this.saveData();
      return true;
    } catch (error) {
      console.error('Ошибка добавления главы:', error);
      return false;
    }
  }

  async searchChapters(query, limit = 10) {
    const searchQuery = query.toLowerCase();
    const results = [];
    
    try {
      for (const [chapterId, searchData] of this.searchIndex) {
        if (searchData.search_text.includes(searchQuery)) {
          const chapter = this.chapters.get(chapterId);
          if (chapter) {
            results.push({
              ...chapter,
              search_text: searchData.search_text
            });
          }
        }
      }

      // Сортируем результаты по релевантности
      results.sort((a, b) => {
        const aScore = this.calculateRelevanceScore(a, searchQuery);
        const bScore = this.calculateRelevanceScore(b, searchQuery);
        return bScore - aScore;
      });

      return results.slice(0, limit);
    } catch (error) {
      console.error('Ошибка поиска:', error);
      return [];
    }
  }

  calculateRelevanceScore(chapter, query) {
    let score = 0;
    const queryWords = query.split(' ');
    
    // Проверяем заголовок
    for (const word of queryWords) {
      if (chapter.title.toLowerCase().includes(word)) {
        score += 10;
      }
    }
    
    // Проверяем содержимое
    const contentString = this.contentToString(chapter.content);
    if (contentString && contentString.trim()) {
      for (const word of queryWords) {
        if (contentString.toLowerCase().includes(word)) {
          score += 1;
        }
      }
    }
    
    return score;
  }

  async getChapter(chapterId) {
    try {
      const chapter = this.chapters.get(chapterId.toString());
      return chapter || null;
    } catch (error) {
      console.error('Ошибка получения главы:', error);
      return null;
    }
  }

  async getStatistics() {
    try {
      let totalChapters = this.chapters.size;
      let chaptersWithContent = 0;
      let chaptersWithTables = 0;
      let chaptersWithImages = 0;
      let totalContentLines = 0;
      let totalTables = 0;
      let totalImages = 0;

      for (const chapter of this.chapters.values()) {
        const contentString = this.contentToString(chapter.content);
        if (contentString && contentString.trim()) {
          chaptersWithContent++;
        }
        if (chapter.tables_count > 0) {
          chaptersWithTables++;
        }
        if (chapter.images_count > 0) {
          chaptersWithImages++;
        }
        totalContentLines += chapter.content_lines || 0;
        totalTables += chapter.tables_count || 0;
        totalImages += chapter.images_count || 0;
      }

      return {
        total_chapters: totalChapters,
        chapters_with_content: chaptersWithContent,
        chapters_with_tables: chaptersWithTables,
        chapters_with_images: chaptersWithImages,
        total_content_lines: totalContentLines,
        total_tables: totalTables,
        total_images: totalImages
      };
    } catch (error) {
      console.error('Ошибка получения статистики:', error);
      return null;
    }
  }

  async setMetadata(key, value) {
    try {
      this.metadata.set(key, {
        value,
        created_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      });
      await this.saveData();
      return true;
    } catch (error) {
      console.error('Ошибка установки метаданных:', error);
      return false;
    }
  }

  async getMetadata(key) {
    try {
      const metadata = this.metadata.get(key);
      return metadata ? metadata.value : null;
    } catch (error) {
      console.error('Ошибка получения метаданных:', error);
      return null;
    }
  }

  extractKeywords(text) {
    // Простая реализация извлечения ключевых слов
    const words = text.toLowerCase()
      .replace(/[^\w\s]/g, ' ')
      .split(/\s+/)
      .filter(word => word.length > 3)
      .slice(0, 10);
    
    return words.join(' ');
  }

  async close() {
    await this.saveData();
  }

  // Методы для HTTP API
  getAllChapters(page = 1, limit = 20, search = null) {
    try {
      let chapters = Array.from(this.chapters.values());

      // Фильтрация по поиску
      if (search) {
        const searchLower = search.toLowerCase();
        chapters = chapters.filter(chapter => {
          const contentString = this.contentToString(chapter.content);
          return chapter.title.toLowerCase().includes(searchLower) ||
                 contentString.toLowerCase().includes(searchLower);
        });
      }

      // Сортировка по ID главы
      chapters.sort((a, b) => a.chapter_id - b.chapter_id);

      // Пагинация
      const total = chapters.length;
      const offset = (page - 1) * limit;
      const paginatedChapters = chapters.slice(offset, offset + limit);

      return {
        chapters: paginatedChapters,
        pagination: {
          page,
          limit,
          total,
          pages: Math.ceil(total / limit)
        }
      };
    } catch (error) {
      console.error('Ошибка получения глав:', error);
      return { chapters: [], pagination: { page, limit, total: 0, pages: 0 } };
    }
  }

  deleteChapter(chapterId) {
    try {
      const chapterIdStr = chapterId.toString();
      const deleted = this.chapters.delete(chapterIdStr);
      this.searchIndex.delete(chapterIdStr);
      
      if (deleted) {
        this.saveData();
      }
      
      return deleted;
    } catch (error) {
      console.error('Ошибка удаления главы:', error);
      return false;
    }
  }
}

export default CleverenceDatabase;
