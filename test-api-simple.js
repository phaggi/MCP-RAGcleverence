const BASE_URL = 'http://localhost:3001';

async function testAPI() {
  console.log('Тестирование Cleverence API...\n');

  try {
    // Тест 1: Корневой эндпоинт
    console.log('1. Тестирование корневого эндпоинта...');
    const rootResponse = await fetch(`${BASE_URL}/`);
    const rootData = await rootResponse.json();
    console.log('Ответ:', JSON.stringify(rootData, null, 2));
    console.log('');

    // Тест 2: Статистика
    console.log('2. Тестирование статистики...');
    const statsResponse = await fetch(`${BASE_URL}/api/statistics`);
    const statsData = await statsResponse.json();
    console.log('Статистика:', JSON.stringify(statsData, null, 2));
    console.log('');

    // Тест 3: Поиск
    console.log('3. Тестирование поиска...');
    const searchResponse = await fetch(`${BASE_URL}/api/search?query=cleverence`);
    const searchData = await searchResponse.json();
    console.log('Поиск по "cleverence":', JSON.stringify(searchData, null, 2));
    console.log('');

    // Тест 4: Получение главы
    console.log('4. Тестирование получения главы...');
    const chapterResponse = await fetch(`${BASE_URL}/api/chapter/1`);
    const chapterData = await chapterResponse.json();
    console.log('Глава 1:', JSON.stringify(chapterData, null, 2));
    console.log('');

    // Тест 5: Список глав
    console.log('5. Тестирование списка глав...');
    const chaptersResponse = await fetch(`${BASE_URL}/api/chapters?limit=5`);
    const chaptersData = await chaptersResponse.json();
    console.log('Список глав:', JSON.stringify(chaptersData, null, 2));
    console.log('');

    console.log('Все тесты завершены успешно!');

  } catch (error) {
    console.error('Ошибка тестирования API:', error.message);
  }
}

testAPI();
