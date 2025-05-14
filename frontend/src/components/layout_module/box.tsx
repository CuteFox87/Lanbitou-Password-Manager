import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const boxVariants = cva(
  "rounded-lg",
  {
    variants: {
      variant: {
        default: "bg-white border border-gray-200 shadow-sm dark:bg-gray-800 dark:border-gray-700",
        ghost: "bg-transparent border-none shadow-none",
        outline: "border border-gray-200 bg-transparent dark:border-gray-700",
      },
      size: {
        sm: "p-3",
        md: "p-4",
        lg: "p-6",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "md",
    },
  }
)

export interface BoxProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof boxVariants> {}

/**
 * Box component serves as a versatile container with variants
 * It can be used to create cards, panels, and other container elements
 */
export function Box({
  className,
  variant,
  size,
  ...props
}: BoxProps) {
  return (
    <div
      className={cn(boxVariants({ variant, size, className }))}
      {...props}
    />
  )
}
