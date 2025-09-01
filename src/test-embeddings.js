import SimpleEmbeddingService from './simple-embeddings.js';

async function testEmbeddings() {
  console.log('🧪 Тестирование упрощенных эмбеддингов...\n');

  const embeddingService = new SimpleEmbeddingService();

  try {
    // Инициализируем модель
    console.log('1. Инициализация упрощенной модели...');
    const success = await embeddingService.initialize();
    if (!success) {
      throw new Error('Не удалось инициализировать модель');
    }
    console.log('✅ Модель инициализирована\n');

    // Тестируем генерацию эмбеддингов
    console.log('2. Тестирование генерации эмбеддингов...');
    const testTexts = [
      'поступление товаров на склад',
      'настройка Mobile SMARTS',
      'панель управления',
      'этикетки и штрихкоды'
    ];

    for (const text of testTexts) {
      console.log(`   Генерация эмбеддинга для: "${text}"`);
      const embedding = await embeddingService.generateEmbedding(text);
      console.log(`   ✅ Размер эмбеддинга: ${embedding.length} измерений\n`);
    }

    // Тестируем косинусное сходство
    console.log('3. Тестирование косинусного сходства...');
    const embedding1 = await embeddingService.generateEmbedding('поступление товаров');
    const embedding2 = await embeddingService.generateEmbedding('прием товаров на склад');
    const embedding3 = await embeddingService.generateEmbedding('настройка принтера');

    const similarity12 = embeddingService.cosineSimilarity(embedding1, embedding2);
    const similarity13 = embeddingService.cosineSimilarity(embedding1, embedding3);

    console.log(`   Сходство "поступление товаров" и "прием товаров на склад": ${similarity12.toFixed(3)}`);
    console.log(`   Сходство "поступление товаров" и "настройка принтера": ${similarity13.toFixed(3)}`);
    console.log('✅ Косинусное сходство работает\n');

    // Тестируем поиск похожих векторов
    console.log('4. Тестирование поиска похожих векторов...');
    const queryEmbedding = await embeddingService.generateEmbedding('поступление товаров');
    const embeddings = [
      await embeddingService.generateEmbedding('прием товаров на склад'),
      await embeddingService.generateEmbedding('настройка принтера'),
      await embeddingService.generateEmbedding('отгрузка товаров'),
      await embeddingService.generateEmbedding('инвентаризация склада')
    ];

    const similarVectors = embeddingService.findSimilarVectors(queryEmbedding, embeddings, 3);
    console.log('   Топ-3 похожих вектора:');
    similarVectors.forEach((result, index) => {
      console.log(`   ${index + 1}. Индекс: ${result.index}, Сходство: ${result.similarity.toFixed(3)}`);
    });
    console.log('✅ Поиск похожих векторов работает\n');

    // Информация о модели
    console.log('5. Информация о модели:');
    const modelInfo = embeddingService.getModelInfo();
    console.log(`   Модель: ${modelInfo.name}`);
    console.log(`   Размерность: ${modelInfo.dimension}`);
    console.log(`   Загружена: ${modelInfo.isLoaded ? 'Да' : 'Нет'}`);
    console.log(`   Размер словаря: ${modelInfo.vocabularySize}`);
    console.log('✅ Информация получена\n');

    console.log('🎉 Все тесты упрощенных эмбеддингов прошли успешно!');

  } catch (error) {
    console.error('❌ Ошибка тестирования эмбеддингов:', error);
  }
}

// Запуск теста
testEmbeddings().catch(console.error);
