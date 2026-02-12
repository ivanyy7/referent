import { NextResponse } from 'next/server'
import * as cheerio from 'cheerio'

export async function POST(request) {
  try {
    const { url } = await request.json()

    if (!url) {
      return NextResponse.json({ error: 'URL не предоставлен' }, { status: 400 })
    }

    // Загружаем HTML страницы
    const response = await fetch(url)
    if (!response.ok) {
      return NextResponse.json({ error: 'Не удалось загрузить страницу' }, { status: 400 })
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
    content = content.replace(/\s+/g, ' ').substring(0, 5000) // Ограничиваем длину

    return NextResponse.json({
      date: date || 'Дата не найдена',
      title: title || 'Заголовок не найден',
      content: content || 'Контент не найден'
    })

  } catch (error) {
    return NextResponse.json(
      { error: 'Ошибка при парсинге: ' + error.message },
      { status: 500 }
    )
  }
}
