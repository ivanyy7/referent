'use client'

import { useState } from 'react'

export default function Home() {
  const [url, setUrl] = useState('')
  const [result, setResult] = useState('')
  const [loading, setLoading] = useState(false)

  const handleAction = async (actionType) => {
    if (!url.trim()) {
      alert('Пожалуйста, введите URL статьи')
      return
    }

    setLoading(true)
    setResult('')

    // Здесь будет логика подключения к AI
    // Пока заглушка
    setTimeout(() => {
      setResult(`Результат для действия "${actionType}" будет здесь...`)
      setLoading(false)
    }, 1000)
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
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-6">
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

        {/* Блок для отображения результата */}
        <div className="bg-white rounded-lg shadow-lg p-6 min-h-[200px]">
          <h2 className="text-xl font-semibold text-gray-800 mb-4">Результат:</h2>
          {loading ? (
            <div className="flex items-center justify-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-indigo-600"></div>
            </div>
          ) : result ? (
            <div className="prose max-w-none">
              <p className="text-gray-700 whitespace-pre-wrap">{result}</p>
            </div>
          ) : (
            <p className="text-gray-400 italic">Результат появится здесь после выбора действия...</p>
          )}
        </div>
      </div>
    </main>
  )
}
