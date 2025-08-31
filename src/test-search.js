import CleverenceDatabase from './database.js';

async function testSearch() {
  console.log('Тестирование поиска...');
  
  const db = new CleverenceDatabase();
  
  try {
    await db.init();
    console.log('База данных инициализирована');
    
    // Тестируем поиск
    const searchQueries = ['cleverence', 'mobile', 'smarts', 'поступление', 'товар'];
    
    for (const query of searchQueries) {
      console.log(`\nПоиск по запросу: "${query}"`);
      const results = await db.searchChapters(query, 5);
      console.log(`Найдено результатов: ${results.length}`);
      
      for (let i = 0; i < Math.min(3, results.length); i++) {
        const result = results[i];
        console.log(`  ${i + 1}. ${result.title} (ID: ${result.chapter_id})`);
      }
    }
    
    // Получаем статистику
    const stats = await db.getStatistics();
    console.log('\nСтатистика:', stats);
    
  } catch (error) {
    console.error('Ошибка тестирования:', error);
  } finally {
    await db.close();
  }
}

testSearch();
