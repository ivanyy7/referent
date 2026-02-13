import { NextResponse } from 'next/server'
import { InferenceClient } from '@huggingface/inference'

const IMAGE_PROMPT_SYSTEM = `Ты эксперт по созданию промптов для генерации изображений. На основе статьи создай короткий промпт на английском языке для текстово-изобразительной нейросети (например, Stable Diffusion, DALL-E).

Требования:
- 1-2 предложения, до 150 слов
- Описывай визуальную сцену, ключевые объекты, атмосферу, стиль
- Избегай абстрактных понятий — только конкретные визуальные образы
- Без кавычек и лишнего форматирования
- Только текст промпта, ничего лишнего`

const HF_MODELS = [
  'black-forest-labs/FLUX.1-schnell',
  'stabilityai/stable-diffusion-2-1-base',
  'runwayml/stable-diffusion-v1-5',
]

/**
 * POST /api/generate-image
 * 1. Генерирует промпт для изображения через OpenRouter
 * 2. Генерирует изображение через Hugging Face Inference Providers API (router.huggingface.co)
 */
export async function POST(request) {
  try {
    const { content } = await request.json()

    if (!content || typeof content !== 'string' || content.trim().length === 0) {
      return NextResponse.json(
        { error: 'Контент не предоставлен или пуст' },
        { status: 400 }
      )
    }

    const openRouterKey = process.env.OPENROUTER_API_KEY?.replace(/[\[\]]/g, '')
    const hfKey = process.env.HUGGINGFACE_API_KEY?.replace(/[\[\]]/g, '')

    if (!openRouterKey) {
      return NextResponse.json(
        { error: 'API ключ OpenRouter не настроен' },
        { status: 500 }
      )
    }

    if (!hfKey) {
      return NextResponse.json(
        { error: 'API ключ Hugging Face не настроен' },
        { status: 500 }
      )
    }

    const baseUrl = process.env.OPENAI_BASE_URL || 'https://openrouter.ai/api/v1'
    const truncatedContent = content.length > 4000
      ? content.substring(0, 4000) + '\n\n[...]'
      : content

    // Шаг 1: Генерация промпта через OpenRouter
    const promptResponse = await fetch(`${baseUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${openRouterKey}`,
      },
      body: JSON.stringify({
        model: 'deepseek/deepseek-chat',
        messages: [
          { role: 'system', content: IMAGE_PROMPT_SYSTEM },
          { role: 'user', content: `Создай промпт для иллюстрации к этой статье:\n\n${truncatedContent}` },
        ],
      }),
    })

    if (!promptResponse.ok) {
      const errText = await promptResponse.text()
      console.error('OpenRouter error:', promptResponse.status, errText)
      return NextResponse.json(
        { error: 'Ошибка при создании промпта для изображения' },
        { status: 502 }
      )
    }

    const promptData = await promptResponse.json()
    const imagePrompt = promptData.choices?.[0]?.message?.content?.trim()

    if (!imagePrompt) {
      return NextResponse.json(
        { error: 'Не удалось создать промпт для изображения' },
        { status: 500 }
      )
    }

    // Шаг 2: Генерация изображения через Hugging Face Inference Providers API (router.huggingface.co)
    const hf = new InferenceClient(hfKey)

    let imageBlob = null

    for (const model of HF_MODELS) {
      try {
        const blob = await hf.textToImage({
          provider: 'hf-inference',
          model,
          inputs: imagePrompt,
          parameters: model.includes('FLUX')
            ? undefined
            : { num_inference_steps: 20, guidance_scale: 7.5 },
        })
        if (blob && blob instanceof Blob && blob.size > 0) {
          imageBlob = blob
          break
        }
      } catch (err) {
        console.error(`HF ${model} error:`, err.message)
      }
    }

    if (!imageBlob) {
      return NextResponse.json(
        { error: 'Не удалось сгенерировать изображение. Убедитесь, что HUGGINGFACE_API_KEY — токен с правом «Make calls to Inference Providers» (User permissions → Inference в huggingface.co/settings/tokens).' },
        { status: 502 }
      )
    }

    const arrayBuffer = await imageBlob.arrayBuffer()
    const mimeType = imageBlob.type || 'image/png'
    const base64 = Buffer.from(arrayBuffer).toString('base64')

    return NextResponse.json({
      image: `data:${mimeType};base64,${base64}`,
      prompt: imagePrompt,
    })
  } catch (error) {
    console.error('generate-image error:', error)
    return NextResponse.json(
      { error: 'Ошибка при генерации изображения' },
      { status: 500 }
    )
  }
}
