import CleverenceDatabase from './database.js';

async function testDatabase() {
  console.log('Тестирование базы данных...');
  
  const db = new CleverenceDatabase();
  
  try {
    // Инициализация
    await db.init();
    console.log('База данных инициализирована');
    
    // Добавление тестовой главы
    const success = await db.addChapter({
      chapter_id: 1,
      title: 'Тестовая глава',
      content: 'Это тестовое содержимое главы для проверки работы базы данных.',
      page_start: 1,
      content_lines: 5,
      images_count: 0,
      tables_count: 1
    });
    
    console.log('Добавление главы:', success ? 'успешно' : 'ошибка');
    
    // Поиск
    const searchResults = await db.searchChapters('тестовая');
    console.log('Результаты поиска:', searchResults.length);
    
    // Получение главы
    const chapter = await db.getChapter(1);
    console.log('Полученная глава:', chapter ? chapter.title : 'не найдена');
    
    // Статистика
    const stats = await db.getStatistics();
    console.log('Статистика:', stats);
    
    // Метаданные
    await db.setMetadata('test_key', 'test_value');
    const metadata = await db.getMetadata('test_key');
    console.log('Метаданные:', metadata);
    
    console.log('Тестирование завершено успешно!');
    
  } catch (error) {
    console.error('Ошибка тестирования:', error);
  } finally {
    await db.close();
  }
}

testDatabase();


