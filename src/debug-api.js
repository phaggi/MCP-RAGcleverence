console.log('Начинаем отладку API...');
console.log('import.meta.url:', import.meta.url);
console.log('process.argv[1]:', process.argv[1]);
console.log('Условие:', import.meta.url === `file://${process.argv[1]}`);

import CleverenceAPI from './api.js';

console.log('CleverenceAPI импортирован');

const api = new CleverenceAPI();
console.log('API создан');

api.start().then(() => {
  console.log('API запущен');
}).catch(error => {
  console.error('Ошибка запуска API:', error);
});
