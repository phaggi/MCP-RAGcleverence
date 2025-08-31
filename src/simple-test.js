import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

console.log('Начинаем простой тест...');

const dataPath = path.join(__dirname, '../data');
const ragFile = path.join(dataPath, 'rag_structure.json');

console.log('Проверяем файл:', ragFile);
console.log('Файл существует:', fs.existsSync(ragFile));

if (fs.existsSync(ragFile)) {
  try {
    console.log('Читаем файл...');
    const data = JSON.parse(fs.readFileSync(ragFile, 'utf8'));
    console.log('Файл прочитан успешно');
    console.log('Ключи:', Object.keys(data));
    
    if (data.chapters) {
      console.log('Количество глав:', data.chapters.length);
      if (data.chapters.length > 0) {
        console.log('Первая глава:', {
          id: data.chapters[0].id,
          title: data.chapters[0].title,
          content_length: data.chapters[0].content ? data.chapters[0].content.length : 0
        });
      }
    }
  } catch (error) {
    console.error('Ошибка чтения файла:', error);
  }
}

console.log('Тест завершен');
