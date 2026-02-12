'use client'

import { useState, useRef, useEffect } from 'react'
import { AlertCircle, Copy, Check, Sun, Moon } from 'lucide-react'
import { Alert, AlertDescription, AlertTitle } from '../components/ui/alert'

/** Дружественные сообщения для ошибок загрузки статьи (404, 500, таймаут и т.п.) */
const PARSE_ERROR_MESSAGE = 'Не удалось загрузить статью по этой ссылке.'

/** Маппинг ошибок AI на дружественные тексты */
function getAiErrorMessage(status) {
  switch (status) {
    case 401:
      return 'Ошибка авторизации. Проверьте настройки API ключа.'
    case 429:
      return 'Слишком много запросов. Попробуйте позже.'
    case 400:
      return 'Неверный запрос. Проверьте данные.'
    case 504:
      return 'Превышено время ожидания. Попробуйте позже или сократите статью.'
    default:
      return 'Ошибка при обработке. Попробуйте позже.'
  }
}

export default function Home() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)
  const [urlError, setUrlError] = useState('')
  const [resultIsError, setResultIsError] = useState(false)
  const [copySuccess, setCopySuccess] = useState(false)
  const [processStatus, setProcessStatus] = useState('')
  const [isDark, setIsDark] = useState(false)
  const resultBlockRef = useRef(null)

  useEffect(() => {
    const stored = localStorage.getItem('theme')
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches
    const dark = stored === 'dark' || (!stored && prefersDark)
    setIsDark(dark)
    document.documentElement.classList.toggle('dark', dark)
  }, [])

  const toggleTheme = () => {
    const next = !isDark
    setIsDark(next)
    document.documentElement.classList.toggle('dark', next)
    localStorage.setItem('theme', next ? 'dark' : 'light')
  }

  const handleClear = () => {
    setUrl('')
    setResult('')
    setLoading(false)
    setUrlError('')
    setResultIsError(false)
    setCopySuccess(false)
    setProcessStatus('')
  }

  useEffect(() => {
    if (result && !loading && !resultIsError && resultBlockRef.current) {
      resultBlockRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' })
    }
  }, [result, loading, resultIsError])

  const handleAction = async (actionType) => {
    setUrlError('')
    setResultIsError(false)
    setCopySuccess(false)

    if (!url.trim()) {
      setUrlError('Введите URL статьи')
      return
    }
    try {
      new URL(url.trim())
    } catch {
      setUrlError('Некорректный формат URL')
      return
    }

    setLoading(true)
    setResult('')
    setProcessStatus('Загружаю статью…')

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
          throw new Error(PARSE_ERROR_MESSAGE)
        }
        throw new Error(PARSE_ERROR_MESSAGE)
      } finally {
        clearTimeout(parseTimeoutId)
      }

      // Обработка ошибок парсинга (404, 500, таймаут и т.п.) — всегда дружественный текст
      if (!parseResponse.ok) {
        throw new Error(PARSE_ERROR_MESSAGE)
      }

      const parsedData = await parseResponse.json()

      if (!parsedData.content || parsedData.content === 'Контент не найден') {
        throw new Error(PARSE_ERROR_MESSAGE)
      }

      setProcessStatus('Анализирую с помощью AI…')

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
          throw new Error(getAiErrorMessage(504))
        }
        throw new Error(getAiErrorMessage(500))
      } finally {
        clearTimeout(aiTimeoutId)
      }

      // Обработка ошибок AI — только дружественные тексты
      if (!aiResponse.ok) {
        throw new Error(getAiErrorMessage(aiResponse.status))
      }

      const aiData = await aiResponse.json()

      if (!aiData.result) {
        throw new Error('Результат не получен. Попробуйте снова.')
      }

      setResult(aiData.result)
      setResultIsError(false)
    } catch (error) {
      // Используем только дружественное сообщение, никогда не показываем сырые API-ошибки
      setResult(error instanceof Error ? error.message : getAiErrorMessage(500))
      setResultIsError(true)
    } finally {
      setLoading(false)
      setProcessStatus('')
    }
  }

  return (
    <main className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 dark:from-gray-900 dark:to-gray-800 py-8 sm:py-12 px-4 sm:px-6 overflow-x-hidden transition-colors">
      <div className="max-w-4xl mx-auto min-w-0">
        <div className="mb-6 sm:mb-8 flex items-center justify-between gap-3 sm:gap-4">
          <div className="w-8 sm:w-9 shrink-0" aria-hidden />
          <h1 className="text-xl sm:text-2xl md:text-3xl lg:text-4xl font-bold text-center text-gray-800 dark:text-gray-100 flex-1 min-w-0 break-words">
            Анализ статей с помощью AI
          </h1>
          <button
            type="button"
            onClick={toggleTheme}
            title={isDark ? 'Светлая тема' : 'Тёмная тема'}
            className="shrink-0 p-1.5 rounded-md text-gray-500 hover:text-amber-500 dark:text-gray-400 dark:hover:text-amber-400 hover:bg-black/5 dark:hover:bg-white/10 transition-colors"
          >
            {isDark ? (
              <Sun className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} aria-hidden />
            ) : (
              <Moon className="h-4 w-4 sm:h-5 sm:w-5" strokeWidth={1.8} aria-hidden />
            )}
          </button>
        </div>

        {/* Поле ввода URL */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 relative transition-colors">
          <div className="flex flex-col sm:flex-row sm:justify-between sm:items-start gap-2 mb-2">
            <label htmlFor="article-url" className="text-sm font-medium text-gray-700 dark:text-gray-300 shrink-0">
              URL англоязычной статьи
            </label>
            <button
              type="button"
              onClick={handleClear}
              className="shrink-0 px-3 py-1.5 text-xs font-medium text-gray-600 hover:text-gray-800 hover:bg-gray-100 dark:text-gray-400 dark:hover:text-gray-200 dark:hover:bg-gray-700 rounded border border-gray-300 dark:border-gray-600 transition-colors self-start"
            >
              Очистить
            </button>
          </div>
          <input
            id="article-url"
            type="url"
            value={url}
            onChange={(e) => {
              setUrl(e.target.value)
              setUrlError('')
            }}
            placeholder="Введите URL статьи, например: https://example.com/article"
            className={`w-full px-4 py-3 border rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-transparent outline-none transition-all dark:bg-gray-700 dark:text-gray-100 dark:placeholder-gray-400 ${
              urlError ? 'border-red-400 bg-red-50 dark:border-red-500 dark:bg-red-950/30' : 'border-gray-300 dark:border-gray-600'
            }`}
          />
          {urlError && (
            <Alert variant="destructive" className="mt-3">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Ошибка ввода</AlertTitle>
              <AlertDescription>{urlError}</AlertDescription>
            </Alert>
          )}
          <p className="mt-2 text-xs text-gray-500 dark:text-gray-400">
            Укажите ссылку на англоязычную статью.
          </p>
        </div>

        {/* Кнопки действий */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 mb-4 sm:mb-6 transition-colors">
          <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-4">
            Выберите действие:
          </label>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3 sm:gap-4">
          <button
            onClick={() => handleAction('О чем статья?')}
            disabled={loading}
            title="Краткое описание содержания статьи"
            className="bg-indigo-600 hover:bg-indigo-700 active:bg-indigo-800 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
          >
            О чем статья?
          </button>
          <button
            onClick={() => handleAction('Тезисы')}
            disabled={loading}
            title="Ключевые тезисы и выводы статьи"
            className="bg-purple-600 hover:bg-purple-700 active:bg-purple-800 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
          >
            Тезисы
          </button>
          <button
            onClick={() => handleAction('Пост для Telegram')}
            disabled={loading}
            title="Готовый пост для публикации в Telegram-канале"
            className="bg-teal-600 hover:bg-teal-700 active:bg-teal-800 disabled:bg-gray-400 text-white font-semibold py-3 px-6 rounded-lg shadow-md hover:shadow-lg transition-all duration-200 disabled:cursor-not-allowed min-h-[48px] touch-manipulation"
          >
            Пост для Telegram
          </button>
          </div>
        </div>

        {/* Текущий процесс (только при загрузке) */}
        {processStatus && (
          <div className="mb-4 px-4 py-2 bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 rounded-lg text-sm text-indigo-800 dark:text-indigo-200 break-words transition-colors">
            {processStatus}
          </div>
        )}

        {/* Блок для отображения результата */}
        <div ref={resultBlockRef} className="bg-white dark:bg-gray-800 rounded-lg shadow-lg p-4 sm:p-6 min-h-[200px] relative transition-colors overflow-hidden">
          <div className="flex justify-between items-start gap-3 sm:gap-4 mb-4 min-w-0">
            <h2 className="text-lg sm:text-xl font-semibold text-gray-800 dark:text-gray-200 shrink-0">Результат:</h2>
            <button
              type="button"
              onClick={async () => {
                if (!result || loading) return
                try {
                  await navigator.clipboard.writeText(result)
                  setCopySuccess(true)
                  setTimeout(() => setCopySuccess(false), 2000)
                } catch {
                  setCopySuccess(false)
                }
              }}
              disabled={!result || loading}
              title="Скопировать"
              className="shrink-0 p-1.5 rounded text-gray-500 hover:text-indigo-600 hover:bg-indigo-50 dark:text-gray-400 dark:hover:text-indigo-400 dark:hover:bg-indigo-950/40 disabled:opacity-40 disabled:cursor-not-allowed disabled:hover:bg-transparent disabled:hover:text-gray-500 dark:disabled:hover:text-gray-400 transition-colors"
            >
              {copySuccess ? (
                <Check className="h-4 w-4" strokeWidth={2.5} aria-hidden />
              ) : (
                <Copy className="h-4 w-4" strokeWidth={2} aria-hidden />
              )}
            </button>
          </div>
          {loading ? (
            <div className="flex flex-col items-center justify-center py-12 gap-3">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600 dark:border-indigo-400" aria-hidden="true" />
              <p className="text-sm text-gray-500 dark:text-gray-400">Анализируем статью, подождите...</p>
            </div>
          ) : resultIsError ? (
            <Alert variant="destructive">
              <AlertCircle className="h-4 w-4" />
              <AlertTitle>Ошибка</AlertTitle>
              <AlertDescription>{result}</AlertDescription>
            </Alert>
          ) : result ? (
            <div className="rounded-lg overflow-auto max-h-96 bg-gray-50 dark:bg-gray-700/50 p-4 transition-colors min-w-0">
              <pre className="text-sm text-gray-800 dark:text-gray-200 whitespace-pre-wrap break-words overflow-x-auto">
                <code>{result}</code>
              </pre>
            </div>
          ) : (
            <p className="text-gray-400 dark:text-gray-500 italic py-8 break-words">
              Введите URL статьи выше и нажмите одну из кнопок — результат появится здесь.
            </p>
          )}
        </div>
      </div>
    </main>
  )
}
