# Тестовый скрипт для проверки API /api/ai-action
# Использование: .\test-api.ps1

$baseUrl = "http://localhost:3000/api/ai-action"

Write-Host "=== Тестирование API /api/ai-action ===" -ForegroundColor Cyan
Write-Host ""

# Тест 1: Валидация - отсутствие actionType
Write-Host "Тест 1: Валидация - отсутствие actionType" -ForegroundColor Yellow
try {
    $body = @{content="Test content"} | ConvertTo-Json -Compress
    $response = Invoke-WebRequest -Uri $baseUrl -Method POST -ContentType "application/json" -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing -ErrorAction Stop
    Write-Host "  ОШИБКА: Должна быть ошибка 400" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  OK: Получена ошибка 400" -ForegroundColor Green
    } else {
        Write-Host "  ОШИБКА: Неожиданный статус" -ForegroundColor Red
    }
}
Write-Host ""

# Тест 2: Валидация - пустой content
Write-Host "Тест 2: Валидация - пустой content" -ForegroundColor Yellow
try {
    $body = @{actionType="О чем статья?";content=""} | ConvertTo-Json -Compress
    $response = Invoke-WebRequest -Uri $baseUrl -Method POST -ContentType "application/json" -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing -ErrorAction Stop
    Write-Host "  ОШИБКА: Должна быть ошибка 400" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  OK: Получена ошибка 400" -ForegroundColor Green
    } else {
        Write-Host "  ОШИБКА: Неожиданный статус" -ForegroundColor Red
    }
}
Write-Host ""

# Тест 3: Валидация - неизвестный actionType
Write-Host "Тест 3: Валидация - неизвестный actionType" -ForegroundColor Yellow
try {
    $body = @{actionType="Неизвестное действие";content="Test content"} | ConvertTo-Json -Compress
    $response = Invoke-WebRequest -Uri $baseUrl -Method POST -ContentType "application/json" -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing -ErrorAction Stop
    Write-Host "  ОШИБКА: Должна быть ошибка 400" -ForegroundColor Red
} catch {
    if ($_.Exception.Response.StatusCode -eq 400) {
        Write-Host "  OK: Получена ошибка 400" -ForegroundColor Green
    } else {
        Write-Host "  ОШИБКА: Неожиданный статус" -ForegroundColor Red
    }
}
Write-Host ""

# Тест 4: Успешный запрос с actionType "О чем статья?"
Write-Host "Тест 4: Успешный запрос - 'О чем статья?'" -ForegroundColor Yellow
try {
    $testContent = "Artificial intelligence (AI) is transforming the way we work and live. Machine learning algorithms can now process vast amounts of data and make predictions with remarkable accuracy. This technology is being applied across various industries, from healthcare to finance."
    $body = @{actionType="О чем статья?";content=$testContent} | ConvertTo-Json -Compress
    $response = Invoke-WebRequest -Uri $baseUrl -Method POST -ContentType "application/json" -Body ([System.Text.Encoding]::UTF8.GetBytes($body)) -UseBasicParsing -ErrorAction Stop
    
    if ($response.StatusCode -eq 200) {
        $result = $response.Content | ConvertFrom-Json
        if ($result.result) {
            Write-Host "  OK: Получен результат, длина: $($result.result.Length) символов" -ForegroundColor Green
            Write-Host "  Результат (первые 100 символов): $($result.result.Substring(0, [Math]::Min(100, $result.result.Length)))..." -ForegroundColor Gray
        } else {
            Write-Host "  ОШИБКА: Результат пустой" -ForegroundColor Red
        }
    } else {
        Write-Host "  ОШИБКА: Неожиданный статус $($response.StatusCode)" -ForegroundColor Red
    }
} catch {
    Write-Host "  ОШИБКА: $($_.Exception.Message)" -ForegroundColor Red
}
Write-Host ""

Write-Host "=== Тестирование завершено ===" -ForegroundColor Cyan
