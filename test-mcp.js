import { Client } from '@modelcontextprotocol/sdk/client/index.js';
import { StdioClientTransport } from '@modelcontextprotocol/sdk/client/stdio.js';
import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function testMCPServer() {
  console.log('🧪 Тестирование MCP сервера...\n');

  // Запускаем MCP сервер как дочерний процесс
  const serverProcess = spawn('node', ['src/server.js'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  // Создаем транспорт для связи с сервером
  const transport = new StdioClientTransport(serverProcess.stdin, serverProcess.stdout);
  const client = new Client(transport);

  try {
    // Инициализируем соединение
    await client.connect({
      protocolVersion: '2024-11-05',
      capabilities: {
        tools: {}
      },
      clientInfo: {
        name: 'mcp-test-client',
        version: '1.0.0'
      }
    });

    console.log('✅ MCP сервер успешно подключен\n');

    // Получаем список доступных инструментов
    const tools = await client.listTools();
    console.log('📋 Доступные инструменты:');
    tools.tools.forEach(tool => {
      console.log(`  - ${tool.name}: ${tool.description}`);
    });
    console.log('');

    // Тестируем поиск
    console.log('🔍 Тестирование поиска...');
    const searchResult = await client.callTool('search_documentation', {
      query: 'cleverence'
    });
    console.log(`Найдено результатов: ${searchResult.content.length}`);
    console.log('');

    // Тестируем получение статистики
    console.log('📊 Тестирование статистики...');
    const statsResult = await client.callTool('get_statistics', {});
    console.log('Статистика:', JSON.stringify(statsResult.content, null, 2));
    console.log('');

    // Тестируем получение главы
    console.log('📖 Тестирование получения главы...');
    const chapterResult = await client.callTool('get_chapter', {
      chapter_id: 1
    });
    console.log('Глава 1 получена успешно');
    console.log('');

    console.log('✅ Все тесты MCP сервера прошли успешно!');

  } catch (error) {
    console.error('❌ Ошибка тестирования MCP сервера:', error);
  } finally {
    // Завершаем процесс сервера
    serverProcess.kill();
    await client.close();
  }
}

testMCPServer().catch(console.error);
