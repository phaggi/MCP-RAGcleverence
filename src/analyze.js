import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

function analyzeFile(filePath) {
  console.log(`\nАнализ файла: ${path.basename(filePath)}`);
  
  try {
    const data = JSON.parse(fs.readFileSync(filePath, 'utf8'));
    
    console.log('Тип данных:', typeof data);
    console.log('Ключи верхнего уровня:', Object.keys(data));
    
    if (Array.isArray(data)) {
      console.log('Это массив с', data.length, 'элементами');
      if (data.length > 0) {
        console.log('Первый элемент:', Object.keys(data[0]));
      }
    } else if (typeof data === 'object') {
      // Анализируем вложенные структуры
      for (const [key, value] of Object.entries(data)) {
        if (Array.isArray(value)) {
          console.log(`${key}: массив с ${value.length} элементами`);
          if (value.length > 0 && typeof value[0] === 'object') {
            console.log(`  Первый элемент ${key}:`, Object.keys(value[0]));
          }
        } else if (typeof value === 'object' && value !== null) {
          console.log(`${key}: объект с ключами:`, Object.keys(value));
        } else {
          console.log(`${key}:`, typeof value, value);
        }
      }
    }
    
  } catch (error) {
    console.error('Ошибка анализа файла:', error.message);
  }
}

function main() {
  const dataPath = path.join(__dirname, '../data');
  
  const files = [
    'structure_analysis.json',
    'rag_structure.json', 
    'full_text_structure.json'
  ];
  
  for (const file of files) {
    const filePath = path.join(dataPath, file);
    if (fs.existsSync(filePath)) {
      analyzeFile(filePath);
    } else {
      console.log(`\nФайл ${file} не найден`);
    }
  }
}

main();
