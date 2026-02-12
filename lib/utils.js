import { clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Объединяет классы Tailwind с поддержкой переопределений
 */
export function cn(...inputs) {
  return twMerge(clsx(inputs))
}
