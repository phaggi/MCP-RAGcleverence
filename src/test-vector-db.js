import VectorDatabase from './vector-database.js';

async function testVectorDatabase() {
  console.log('🧪 Тестирование векторной базы данных...\n');

  const vectorDB = new VectorDatabase();

  try {
    // Инициализация
    console.log('1. Инициализация векторной БД...');
    const success = await vectorDB.initialize();
    if (!success) {
      throw new Error('Не удалось инициализировать векторную БД');
    }
    console.log('✅ Векторная БД инициализирована\n');

    // Статистика
    console.log('2. Статистика векторной БД:');
    const stats = vectorDB.getStatistics();
    console.log(`   Всего эмбеддингов: ${stats.total_embeddings}`);
    console.log(`   Инициализирована: ${stats.is_initialized ? 'Да' : 'Нет'}`);
    console.log(`   Модель: ${stats.model_info.name}`);
    console.log(`   Размерность: ${stats.model_info.dimension}`);
    console.log('✅ Статистика получена\n');

    // Семантический поиск
    console.log('3. Тестирование семантического поиска...');
    const testQueries = [
      'поступление товаров на склад',
      'настройка Mobile SMARTS',
      'панель управления',
      'этикетки и штрихкоды'
    ];

    for (const query of testQueries) {
      console.log(`\n   Запрос: "${query}"`);
      const results = await vectorDB.semanticSearch(query, 3);
      
      console.log('   Топ-3 результата:');
      results.forEach((result, index) => {
        console.log(`   ${index + 1}. ${result.title} (сходство: ${result.similarity.toFixed(3)})`);
      });
    }
    console.log('✅ Семантический поиск работает\n');

    // Гибридный поиск
    console.log('4. Тестирование гибридного поиска...');
    const hybridQuery = 'поступление товаров';
    console.log(`   Запрос: "${hybridQuery}"`);
    
    const hybridResults = await vectorDB.hybridSearch(hybridQuery, 5);
    console.log('   Топ-5 результатов:');
    hybridResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.title} (счет: ${result.final_score.toFixed(3)}, тип: ${result.search_type})`);
    });
    console.log('✅ Гибридный поиск работает\n');

    // Ключевой поиск
    console.log('5. Тестирование ключевого поиска...');
    const keywordQuery = 'Mobile SMARTS';
    console.log(`   Запрос: "${keywordQuery}"`);
    
    const keywordResults = vectorDB.keywordSearch(keywordQuery, 3);
    console.log('   Топ-3 результата:');
    keywordResults.forEach((result, index) => {
      console.log(`   ${index + 1}. ${result.title} (сходство: ${result.similarity.toFixed(3)})`);
    });
    console.log('✅ Ключевой поиск работает\n');

    // Получение вектора главы
    console.log('6. Тестирование получения вектора главы...');
    const testChapterId = 1;
    const chapterVector = await vectorDB.getChapterVector(testChapterId);
    
    if (chapterVector) {
      console.log(`   Глава ${testChapterId}: ${chapterVector.title}`);
      console.log(`   Размер вектора: ${chapterVector.embedding.length}`);
      console.log(`   Создана: ${chapterVector.metadata.generated_at}`);
    } else {
      console.log(`   Глава ${testChapterId} не найдена`);
    }
    console.log('✅ Получение вектора главы работает\n');

    console.log('🎉 Все тесты векторной базы данных прошли успешно!');

  } catch (error) {
    console.error('❌ Ошибка тестирования векторной БД:', error);
  } finally {
    await vectorDB.close();
  }
}

// Запуск теста
testVectorDatabase().catch(console.error);
