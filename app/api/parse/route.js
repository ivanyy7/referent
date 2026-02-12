import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL не предоставлен' }, { status: 400 })
    }

    // Валидация URL
    try {
      new URL(url)
    } catch (e) {
      return NextResponse.json({ error: 'Неверный формат URL' }, { status: 400 })
    }

    // Загружаем HTML страницы с таймаутом
    let response
    const controller = new AbortController()
    const timeoutId = setTimeout(() => controller.abort(), 30000) // Таймаут 30 секунд
    
    try {
      response = await fetch(url, {
        signal: controller.signal,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
          'Accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,*/*;q=0.8',
          'Accept-Language': 'en-US,en;q=0.9',
          'Accept-Encoding': 'gzip, deflate, br',
          'Referer': 'https://www.google.com/',
          'DNT': '1',
          'Connection': 'keep-alive',
          'Upgrade-Insecure-Requests': '1'
        },
        // Добавляем опции для лучшей обработки ошибок
        cache: 'no-store',
        next: { revalidate: 0 },
        // Разрешаем редиректы
        redirect: 'follow'
      })
      clearTimeout(timeoutId)
    } catch (fetchError) {
      clearTimeout(timeoutId)
      
      // Обработка различных типов ошибок fetch
      if (fetchError.name === 'AbortError') {
        return NextResponse.json(
          { error: 'Превышено время ожидания при загрузке страницы (30 секунд). Попробуйте позже или проверьте доступность сайта.' },
          { status: 504 }
        )
      }
      
      // Обработка ошибки "fetch failed" - самая частая проблема
      const errorMessage = fetchError.message || String(fetchError)
      if (errorMessage.includes('fetch failed') || errorMessage.includes('ECONNREFUSED') || errorMessage.includes('ENOTFOUND')) {
        return NextResponse.json(
          { error: 'Не удалось подключиться к серверу. Возможные причины:\n- Сайт недоступен или заблокирован\n- Неверный URL\n- Проблемы с сетью\nПроверьте URL и попробуйте другой сайт.' },
          { status: 503 }
        )
      }
      
      if (errorMessage.includes('timeout') || errorMessage.includes('время ожидания')) {
        return NextResponse.json(
          { error: 'Превышено время ожидания при загрузке страницы. Попробуйте позже.' },
          { status: 504 }
        )
      }
      
      if (errorMessage.includes('CORS') || errorMessage.includes('cors')) {
        return NextResponse.json(
          { error: 'Сайт блокирует запросы с этого сервера (CORS). Попробуйте другой URL.' },
          { status: 403 }
        )
      }
      
      if (errorMessage.includes('SSL') || errorMessage.includes('certificate') || errorMessage.includes('cert')) {
        return NextResponse.json(
          { error: 'Ошибка SSL-сертификата. Проверьте безопасность подключения.' },
          { status: 500 }
        )
      }
      
      // Общая обработка ошибок
      return NextResponse.json(
        { error: `Ошибка при загрузке страницы: ${errorMessage}` },
        { status: 500 }
      )
    }

    if (!response.ok) {
      let errorMessage = 'Не удалось загрузить страницу'
      if (response.status === 404) {
        errorMessage = 'Страница не найдена (404). Проверьте правильность URL.'
      } else if (response.status === 403) {
        errorMessage = 'Доступ к странице запрещён (403). Сайт может блокировать автоматические запросы.'
      } else if (response.status === 401) {
        errorMessage = 'Требуется авторизация для доступа к странице (401).'
      } else if (response.status >= 500) {
        errorMessage = `Ошибка сервера (${response.status}). Попробуйте позже.`
      } else {
        errorMessage = `Не удалось загрузить страницу (${response.status}).`
      }
      return NextResponse.json({ error: errorMessage }, { status: response.status >= 500 ? 502 : 400 })
    }

    const html = await response.text()
    const $ = cheerio.load(html)

    // Извлекаем заголовок
    let title = $('h1').first().text().trim() ||
                $('title').text().trim() ||
                $('meta[property="og:title"]').attr('content') ||
                ''

    // Извлекаем дату
    let date = $('time').first().attr('datetime') ||
               $('time').first().text().trim() ||
               $('[class*="date"]').first().text().trim() ||
               $('[class*="published"]').first().text().trim() ||
               $('meta[property="article:published_time"]').attr('content') ||
               ''

    // Извлекаем основной контент
    let content = ''
    
    // Пробуем разные селекторы для контента
    const contentSelectors = [
      'article',
      '.post',
      '.content',
      '.article-content',
      '[role="article"]',
      'main article',
      '.entry-content',
      '.post-content'
    ]

    for (const selector of contentSelectors) {
      const element = $(selector).first()
      if (element.length > 0) {
        content = element.text().trim()
        if (content.length > 100) break // Если нашли достаточно контента
      }
    }

    // Если не нашли, берем основной контент из body
    if (!content || content.length < 100) {
      $('script, style, nav, header, footer, aside').remove()
      content = $('body').text().trim()
    }

    // Очищаем контент от лишних пробелов
    // Шаг 5.3: Оптимизация - ограничиваем длину контента для лучшей производительности
    const MAX_CONTENT_LENGTH = 10000 // Увеличено до 10000 символов для более полного анализа
    content = content.replace(/\s+/g, ' ').substring(0, MAX_CONTENT_LENGTH)

    return NextResponse.json({
      date: date || 'Дата не найдена',
      title: title || 'Заголовок не найден',
      content: content || 'Контент не найден'
    })

  } catch (error) {
    // Если ошибка уже была обработана выше (возвращён NextResponse), не обрабатываем повторно
    if (error instanceof Response || error instanceof NextResponse) {
      return error
    }
    
    // Обработка неожиданных ошибок
    const errorMessage = error?.message || String(error) || 'Неизвестная ошибка'
    const errorString = String(errorMessage).toLowerCase()
    const errorName = error?.name || ''
    
    console.error('Неожиданная ошибка при парсинге:', errorMessage, error)
    
    // Специальная обработка ошибки "fetch failed" и сетевых ошибок
    if (errorName === 'AbortError' || 
        errorString.includes('fetch failed') || 
        errorString.includes('econnrefused') || 
        errorString.includes('enotfound') ||
        errorString.includes('network') ||
        errorString.includes('connection') ||
        errorString.includes('timeout') ||
        errorString.includes('econnreset')) {
      return NextResponse.json(
        { error: 'Не удалось подключиться к серверу. Возможные причины:\n- Сайт недоступен или заблокирован\n- Неверный URL\n- Проблемы с сетью\n- Сайт блокирует автоматические запросы\n\nПроверьте URL и попробуйте другой сайт.' },
        { status: 503 }
      )
    }
    
    // Обработка ошибок валидации URL
    if (errorString.includes('invalid url') || errorString.includes('url')) {
      return NextResponse.json(
        { error: 'Неверный формат URL. Проверьте правильность введённого адреса.' },
        { status: 400 }
      )
    }
    
    return NextResponse.json(
      { error: `Ошибка при парсинге: ${errorMessage}` },
      { status: 500 }
    )
  }
}
