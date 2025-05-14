import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'

/**
 * Combines class names using clsx and merges Tailwind classes efficiently.
 * This utility is crucial for conditional class application in the shadcn/ui approach.
 */
export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
