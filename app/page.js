'use client'

import { useState } from 'react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAction = async (actionType) => {
    // Шаг 3.1: Проверка наличия URL
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    // Шаг 3.3: Установка состояния загрузки
    setLoading(true)
    setResult('')

    try {
      // Шаг 3.2: Парсим статью с таймаутом
      const parseController = new AbortController()
      const parseTimeoutId = setTimeout(() => parseController.abort(), 30000) // Таймаут 30 секунд

      let parseResponse
      try {
        parseResponse = await fetch('/api/parse', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ url }),
          signal: parseController.signal
        })
      } catch (error) {
        clearTimeout(parseTimeoutId)
        if (error.name === 'AbortError') {
          throw new Error('Превышено время ожидания при парсинге статьи. Проверьте URL и попробуйте снова.')
        }
        throw error
      } finally {
        clearTimeout(parseTimeoutId)
      }

      // Шаг 3.4: Обработка ошибок парсинга
      if (!parseResponse.ok) {
        let errorMessage = 'Ошибка при парсинге статьи'
        try {
          const errorData = await parseResponse.json()
          errorMessage = errorData.error || errorMessage
        } catch (e) {
          // Если не удалось распарсить JSON, используем текст ответа
          const text = await parseResponse.text().catch(() => '')
          errorMessage = text || errorMessage
        }
        throw new Error(errorMessage)
      }

      const parsedData = await parseResponse.json()

      // Проверка наличия контента
      if (!parsedData.content || parsedData.content === 'Контент не найден') {
        throw new Error('Не удалось извлечь контент из статьи')
      }
      
      // Шаг 3.2: Обрабатываем статью через AI с streaming ответом
      const aiController = new AbortController()
      const aiTimeoutId = setTimeout(() => aiController.abort(), 90000) // Таймаут 90 секунд

      let aiResponse
      try {
        aiResponse = await fetch('/api/ai-action', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({ 
            actionType: actionType,  // 'О чем статья?', 'Тезисы', 'Пост для Telegram'
            content: parsedData.content,
            sourceUrl: url.trim()  // для «Пост для Telegram» — ссылка на источник в конце поста
          }),
          signal: aiController.signal
        })
      } catch (error) {
        clearTimeout(aiTimeoutId)
        if (error.name === 'AbortError') {
          throw new Error('Превышено время ожидания ответа от AI. Попробуйте позже или сократите размер статьи.')
        }
        throw error
      } finally {
        clearTimeout(aiTimeoutId)
      }

      // Шаг 3.4: Обработка ошибок AI запроса
      if (!aiResponse.ok) {
        const errorData = await aiResponse.text().catch(() => '')
        let errorMessage = 'Ошибка при обработке статьи через AI'
        
        try {
          const errorJson = JSON.parse(errorData)
          errorMessage = errorJson.error || errorMessage
        } catch (e) {
          errorMessage = errorData || errorMessage
        }
        
        // Более понятные сообщения для разных статусов
        if (aiResponse.status === 401) {
          errorMessage = 'Ошибка авторизации API. Проверьте настройки API ключа.'
        } else if (aiResponse.status === 429) {
          errorMessage = 'Слишком много запросов. Попробуйте позже.'
        } else if (aiResponse.status === 400) {
          errorMessage = errorMessage || 'Неверный запрос. Проверьте данные.'
        }
        
        throw new Error(errorMessage)
      }

      // Шаг 3.2: Получаем результат от AI
      const aiData = await aiResponse.json()
      
      // Шаг 3.2: Выводим результат от AI
      if (!aiData.result) {
        throw new Error('Результат не получен от AI')
      }

      setResult(aiData.result)
    } catch (error) {
      // Шаг 3.4: Вывод понятных сообщений об ошибках
      setResult(`Ошибка: ${error.message}`)
    } finally {
      // Шаг 3.3: Сброс состояния загрузки
      setLoading(false)
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 py-12 px-4">
      <div className="max-w-4xl mx-auto">
        <h1 className="text-4xl font-bold text-center text-gray-800 mb-8">
          Анализ статей с помощью AI
        </h1>

        {/* Поле ввода URL */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <label htmlFor="article-url" className="block text-sm font-medium text-gray-700 mb-2">
            URL англоязычной статьи
          </label>
          <input
            id="article-url"
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://example.com/article"
            className="w-full px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all"
          />
        </div>

        {/* Кнопки действий */}
        <div className="bg-white rounded-lg shadow-lg p-6 mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-4">
            Выберите действие:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <button
            onClick={() => handleAction('О чем статья?')}
            disabled={loading}
            className="bg-indigo-600 hover:bg-indigo-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed"
          >
            О чем статья?
          </button>
          <button
            onClick={() => handleAction('Тезисы')}
            disabled={loading}
            className="bg-purple-600 hover:bg-purple-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed"
          >
            Тезисы
          </button>
          <button
            onClick={() => handleAction('Пост для Telegram')}
            disabled={loading}
            className="bg-teal-600 hover:bg-teal-700 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed"
          >
            Пост для Telegram
          </button>
          </div>
        </div>

        {/* Блок для отображения результата */}
        <div className="bg-white rounded-lg shadow-lg p-6 min-h-[200px]">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Результат:</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : result ? (
            <pre className="bg-gray-50 p-4 rounded-lg overflow-auto max-h-96">
              <code className="text-sm text-gray-800 whitespace-pre-wrap">{result}</code>
            </pre>
          ) : (
            <p className="text-gray-400 italic">Результат появится здесь после выбора действия...</p>
          )}
        </div>
      </div>
    </main>
  )
}
