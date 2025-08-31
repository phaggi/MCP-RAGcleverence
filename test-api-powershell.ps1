Write-Host "Тестирование Cleverence API..." -ForegroundColor Green
Write-Host ""

$baseUrl = "http://localhost:3001"

try {
    # Тест 1: Корневой эндпоинт
    Write-Host "1. Тестирование корневого эндпоинта..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$baseUrl/" -Method GET
    Write-Host "Ответ:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    Write-Host ""

    # Тест 2: Статистика
    Write-Host "2. Тестирование статистики..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$baseUrl/api/statistics" -Method GET
    Write-Host "Статистика:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    Write-Host ""

    # Тест 3: Поиск
    Write-Host "3. Тестирование поиска..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$baseUrl/api/search?query=cleverence" -Method GET
    Write-Host "Поиск по 'cleverence':" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    Write-Host ""

    # Тест 4: Получение главы
    Write-Host "4. Тестирование получения главы..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$baseUrl/api/chapter/1" -Method GET
    Write-Host "Глава 1:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    Write-Host ""

    # Тест 5: Список глав
    Write-Host "5. Тестирование списка глав..." -ForegroundColor Yellow
    $response = Invoke-RestMethod -Uri "$baseUrl/api/chapters?limit=5" -Method GET
    Write-Host "Список глав:" -ForegroundColor Cyan
    $response | ConvertTo-Json -Depth 10
    Write-Host ""

    Write-Host "Все тесты завершены успешно!" -ForegroundColor Green

} catch {
    Write-Host "Ошибка тестирования API: $($_.Exception.Message)" -ForegroundColor Red
}
