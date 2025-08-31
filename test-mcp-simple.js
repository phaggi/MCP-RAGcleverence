import { spawn } from 'child_process';
import { fileURLToPath } from 'url';
import path from 'path';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function testMCPServer() {
  console.log('🧪 Простой тест MCP сервера...\n');

  // Запускаем MCP сервер как дочерний процесс
  const serverProcess = spawn('node', ['src/server.js'], {
    cwd: __dirname,
    stdio: ['pipe', 'pipe', 'pipe']
  });

  let output = '';
  let errorOutput = '';

  // Слушаем вывод сервера
  serverProcess.stdout.on('data', (data) => {
    output += data.toString();
    console.log('📤 Сервер:', data.toString().trim());
  });

  serverProcess.stderr.on('data', (data) => {
    errorOutput += data.toString();
    console.log('❌ Ошибка сервера:', data.toString().trim());
  });

  // Отправляем тестовое сообщение
  setTimeout(() => {
    console.log('\n📝 Отправляем тестовое сообщение...');
    const testMessage = {
      jsonrpc: '2.0',
      id: 1,
      method: 'initialize',
      params: {
        protocolVersion: '2024-11-05',
        capabilities: {
          tools: {}
        },
        clientInfo: {
          name: 'mcp-test-client',
          version: '1.0.0'
        }
      }
    };
    
    serverProcess.stdin.write(JSON.stringify(testMessage) + '\n');
  }, 1000);

  // Завершаем тест через 3 секунды
  setTimeout(() => {
    console.log('\n✅ Тест завершен');
    serverProcess.kill();
    process.exit(0);
  }, 3000);

  // Обработка завершения процесса
  serverProcess.on('close', (code) => {
    console.log(`\n🔚 Процесс сервера завершен с кодом: ${code}`);
  });
}

testMCPServer();
