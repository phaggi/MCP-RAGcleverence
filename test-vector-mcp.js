import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testVectorMCPServer() {
  console.log('🧪 Тестирование MCP сервера с векторным поиском...\n');

  // Создаем клиент
  const client = new Client({
    name: 'mcp-test-client',
    version: '1.0.0',
  });

  // Создаем транспорт для запуска сервера
  const transport = new StdioClientTransport({
    command: 'node',
    args: ['src/server-vector.js'],
    cwd: __dirname
  });

  try {
    // Подключаемся к серверу
    console.log('1. Подключение к MCP серверу...');
    await client.connect(transport, {
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'mcp-test-client',
        version: '1.0.0'
      }
    });
    console.log('✅ Подключение установлено\n');

    // Получаем список инструментов
    console.log('2. Получение списка инструментов...');
    const tools = await client.listTools();
    console.log(`✅ Доступно ${tools.tools.length} инструментов:`);
    tools.tools.forEach(tool => {
      console.log(`   • ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // Тестируем статистику
    console.log('3. Тестирование статистики...');
    const statsResult = await client.callTool({
      name: 'get_statistics',
      arguments: {}
    });
    console.log('📊 Статистика документации:');
    console.log(statsResult.content[0].text);
    console.log('✅ Статистика получена\n');

    // Тестируем векторную статистику
    console.log('4. Тестирование векторной статистики...');
    const vectorStatsResult = await client.callTool({
      name: 'get_vector_stats',
      arguments: {}
    });
    console.log('📊 Статистика векторной БД:');
    console.log(vectorStatsResult.content[0].text);
    console.log('✅ Векторная статистика получена\n');

    // Тестируем семантический поиск
    console.log('5. Тестирование семантического поиска...');
    const semanticResult = await client.callTool({
      name: 'vector_search',
      arguments: {
        query: 'поступление товаров на склад',
        limit: 5
      }
    });
    console.log('🔍 Результаты семантического поиска:');
    console.log(semanticResult.content[0].text);
    console.log('✅ Семантический поиск работает\n');

    // Тестируем гибридный поиск
    console.log('6. Тестирование гибридного поиска...');
    const hybridResult = await client.callTool({
      name: 'search_documentation',
      arguments: {
        query: 'настройка Mobile SMARTS',
        limit: 5,
        search_type: 'hybrid'
      }
    });
    console.log('🔍 Результаты гибридного поиска:');
    console.log(hybridResult.content[0].text);
    console.log('✅ Гибридный поиск работает\n');

    // Тестируем ключевой поиск
    console.log('7. Тестирование ключевого поиска...');
    const keywordResult = await client.callTool({
      name: 'search_documentation',
      arguments: {
        query: 'этикетки штрихкоды',
        limit: 3,
        search_type: 'keyword'
      }
    });
    console.log('🔍 Результаты ключевого поиска:');
    console.log(keywordResult.content[0].text);
    console.log('✅ Ключевой поиск работает\n');

    // Тестируем получение главы
    console.log('8. Тестирование получения главы...');
    const chapterResult = await client.callTool({
      name: 'get_chapter',
      arguments: {
        chapter_id: 1
      }
    });
    console.log('📄 Содержимое главы:');
    const chapterText = chapterResult.content[0].text;
    console.log(chapterText.substring(0, 300) + '...');
    console.log('✅ Получение главы работает\n');

    console.log('🎉 Все тесты MCP сервера с векторным поиском прошли успешно!');

  } catch (error) {
    console.error('❌ Ошибка тестирования MCP сервера:', error);
  } finally {
    // Закрываем соединение
    await client.close();
    console.log('\n🔚 MCP сервер остановлен');
  }
}

// Запуск теста
testVectorMCPServer().catch(console.error);
