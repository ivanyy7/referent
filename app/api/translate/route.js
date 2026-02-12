import { NextResponse } from 'next/server'

export async function POST(request) {
  try {
    const { content } = await request.json()

    if (!content) {
      return NextResponse.json({ error: 'Контент не предоставлен' }, { status: 400 })
    }

    const apiKey = process.env.OPENROUTER_API_KEY?.replace(/[\[\]]/g, '') // Убираем квадратные скобки если есть
    const baseUrl = process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1'

    if (!apiKey) {
      return NextResponse.json({ error: 'API ключ не настроен' }, { status: 500 })
    }

    // Формируем промпт
    const systemMessage = 'Ты профессиональный переводчик. Переведи следующий текст с английского на русский язык, сохраняя структуру и смысл.'
    const userMessage = `Переведи на русский язык:\n\n${content}`

    // Логируем промпт в терминал
    console.log('=== Промпт для Deepseek ===')
    console.log('System:', systemMessage)
    console.log('User:', userMessage.substring(0, 200) + (userMessage.length > 200 ? '...' : ''))
    console.log('===========================')

    // Запрос к OpenRouter для перевода
    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'HTTP-Referer': 'http://localhost:3000',
        'X-Title': 'Referent Translator'
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
      })
    })

    if (!response.ok) {
      const errorData = await response.text()
      return NextResponse.json(
        { error: `Ошибка API: ${response.status} - ${errorData}` },
        { status: response.status }
      )
    }

    const data = await response.json()
    const translation = data.choices?.[0]?.message?.content || 'Перевод не получен'

    return NextResponse.json({ translation })

  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при переводе: ' + error.message },
      { status: 500 }
    )
  }
}
