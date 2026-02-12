import { NextResponse } from 'next/server'

// Шаг 2.2: Определение промптов для каждого действия
// Шаг 5.2: Оптимизированные промпты для лучшего качества результатов
const prompts = {
  'О чем статья?': {
    system: 'Ты эксперт по анализу текстов. Твоя задача - дать краткое и информативное описание статьи на русском языке.\n\nТребования:\n- Объём: 2-3 предложения\n- Опиши основную тему статьи\n- Упомяни ключевые моменты и выводы\n- Используй понятный и доступный язык\n- Не добавляй лишних деталей',
    getUserMessage: (content) => `О чем эта статья? Дай краткое описание (2-3 предложения) на русском языке.\n\nСтатья:\n${content}`
  },
  'Тезисы': {
    system: 'Ты эксперт по анализу текстов. Твоя задача - выделить основные тезисы статьи в виде нумерованного списка на русском языке.\n\nТребования:\n- Каждый тезис должен быть кратким (1-2 предложения)\n- Тезисы должны отражать ключевые идеи статьи\n- Используй нумерованный список (1., 2., 3., ...)\n- Избегай повторений\n- Расположи тезисы по важности',
    getUserMessage: (content) => `Выдели основные тезисы этой статьи в виде нумерованного списка на русском языке.\n\nСтатья:\n${content}`
  },
  'Пост для Telegram': {
    system: 'Ты эксперт по созданию постов для Telegram. Твоя задача - создать привлекательный и информативный пост на русском языке на основе статьи.\n\nТребования:\n- Используй эмодзи для привлечения внимания (но не переборщи)\n- Добавь хештеги в конце поста (3-5 релевантных хештегов)\n- Используй форматирование: **жирный текст** для заголовков и важных моментов\n- Структурируй пост: используй списки и абзацы\n- Сделай пост интересным и читаемым\n- Длина: 200-400 слов\n- Начни с привлекающего заголовка с эмодзи\n- В конце поста обязательно добавь ссылку на источник статьи (после хештегов). Формат: просто напиши "Читать далее:" или "Источник:" и затем URL одной строкой без markdown-форматирования. НЕ используй формат [текст](URL), просто напиши текст и URL отдельно.',
    getUserMessage: (content, sourceUrl) => {
      let text = `Создай пост для Telegram на основе этой статьи. Пост должен быть привлекательным, информативным, с эмодзи и хештегами.`
      if (sourceUrl) {
        text += `\n\nВ конце поста обязательно добавь ссылку на источник. НЕ используй markdown-форматирование [текст](URL). Просто напиши "Читать далее:" или "Источник:" и затем URL одной строкой:\n${sourceUrl}`
      }
      return `${text}\n\nСтатья:\n${content}`
    }
  }
}

/**
 * API Endpoint для обработки статей через AI
 * Поддерживает три типа действий: "О чем статья?", "Тезисы", "Пост для Telegram"
 * 
 * @route POST /api/ai-action
 * @param {string} actionType - Тип действия: "О чем статья?" | "Тезисы" | "Пост для Telegram"
 * @param {string} content - Текст статьи для обработки
 * @returns {Object} { result: string } - Результат обработки AI
 */
export async function POST(request) {
  try {
    // Шаг 2.1: Валидация входных параметров
    const { actionType, content, sourceUrl } = await request.json()

    if (!actionType) {
      return NextResponse.json(
        { error: 'actionType не предоставлен' },
        { status: 400 }
      )
    }

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Контент не предоставлен или пуст' },
        { status: 400 }
      )
    }

    // Шаг 2.2: Определение промпта по actionType
    const promptConfig = prompts[actionType]

    if (!promptConfig) {
      return NextResponse.json(
        { error: `Неизвестный actionType: ${actionType}. Доступные значения: ${Object.keys(prompts).join(', ')}` },
        { status: 400 }
      )
    }

    // Шаг 5.3: Ограничение размера контента для оптимизации производительности
    const MAX_CONTENT_LENGTH = 8000 // Ограничиваем до 8000 символов
    const truncatedContent = content.length > MAX_CONTENT_LENGTH 
      ? content.substring(0, MAX_CONTENT_LENGTH) + '\n\n[... текст обрезан для оптимизации ...]'
      : content

    const systemMessage = promptConfig.system
    const userMessage = promptConfig.getUserMessage(truncatedContent, sourceUrl)

    // Шаг 2.6: Логирование промпта
    console.log('=== Промпт для AI Action ===')
    console.log('Action Type:', actionType)
    console.log('System:', systemMessage)
    console.log('User (первые 200 символов):', userMessage.substring(0, 200) + (userMessage.length > 200 ? '...' : ''))
    console.log('===========================')

    // Шаг 2.3: Получение конфигурации API
    const apiKey = process.env.OPENROUTER_API_KEY?.replace(/[\[\]]/g, '') // Убираем квадратные скобки если есть
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1'

    if (!apiKey) {
      console.error('Ошибка: API ключ не настроен')
      return NextResponse.json(
        { error: 'API ключ не настроен' },
        { status: 500 }
      )
    }

    // Шаг 2.3: Интеграция с OpenRouter API с таймаутом
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 60000) // Таймаут 60 секунд

    let response
    try {
      response = await fetch(`${baseUrl}/chat/completions`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${apiKey}`,
          'HTTP-Referer': 'http://localhost:3000',
          'X-Title': 'Referent AI Actions'
        },
        body: JSON.stringify({
          model: 'deepseek/deepseek-chat',
          messages: [
            {
              role: 'system',
              content: systemMessage
            },
            {
              role: 'user',
              content: userMessage
            }
          ]
        }),
        signal: controller.signal
      })
    } catch (error) {
      clearTimeout(timeoutId)
      if (error.name === 'AbortError') {
        console.error('Ошибка: Превышено время ожидания ответа от OpenRouter API (60 секунд)')
        return NextResponse.json(
          { error: 'Превышено время ожидания ответа от AI. Попробуйте позже или сократите размер статьи.' },
          { status: 504 }
        )
      }
      throw error
    } finally {
      clearTimeout(timeoutId)
    }

    // Шаг 2.5: Обработка ошибок API OpenRouter
    if (!response.ok) {
      const errorData = await response.text()
      let errorMessage = `Ошибка API OpenRouter: ${response.status}`
      
      try {
        const errorJson = JSON.parse(errorData)
        errorMessage = errorJson.error?.message || errorMessage
      } catch (e) {
        errorMessage = `${errorMessage} - ${errorData.substring(0, 200)}`
      }

      console.error('Ошибка OpenRouter API:', {
        status: response.status,
        error: errorMessage
      })

      // Определяем статус для клиента
      let clientStatus = 500
      if (response.status === 401) {
        clientStatus = 401 // Неавторизован
      } else if (response.status === 429) {
        clientStatus = 429 // Слишком много запросов
      } else if (response.status >= 400 && response.status < 500) {
        clientStatus = 400 // Ошибка клиента
      }

      return NextResponse.json(
        { error: errorMessage },
        { status: clientStatus }
      )
    }

    // Шаг 2.4: Обработка ответа от OpenRouter
    const data = await response.json()
    const result = data.choices?.[0]?.message?.content

    if (!result) {
      console.error('Ошибка: результат не получен от API', data)
      return NextResponse.json(
        { error: 'Результат не получен от AI' },
        { status: 500 }
      )
    }

    console.log('Успешно получен результат от AI, длина:', result.length)

    // Возвращаем результат
    return NextResponse.json({ result })

  } catch (error) {
    // Шаг 2.5: Обработка сетевых ошибок и других исключений
    console.error('Ошибка при обработке запроса:', error)
    
    let errorMessage = 'Ошибка при обработке запроса'
    if (error instanceof TypeError && error.message.includes('fetch')) {
      errorMessage = 'Ошибка сети при подключении к OpenRouter API'
    } else {
      errorMessage = `Ошибка: ${error.message}`
    }

    return NextResponse.json(
      { error: errorMessage },
      { status: 500 }
    )
  }
}
