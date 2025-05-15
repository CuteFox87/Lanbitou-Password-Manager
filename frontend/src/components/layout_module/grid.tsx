import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const gridVariants = cva(
  "grid",
  {
    variants: {
      cols: {
        1: "grid-cols-1",
        2: "grid-cols-1 sm:grid-cols-2",
        3: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3",
        4: "grid-cols-1 sm:grid-cols-2 lg:grid-cols-4",
        auto: "grid-cols-auto",
      },
      gap: {
        none: "gap-0",
        sm: "gap-2",
        md: "gap-4",
        lg: "gap-6",
        xl: "gap-8",
      },
    },
    defaultVariants: {
      cols: 3,
      gap: "md",
    },
  }
)

export interface GridProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof gridVariants> {}

/**
 * Grid component provides a responsive grid layout with configurable columns and gaps
 * It automatically adjusts the column count based on screen size
 */
export function Grid({
  className,
  cols,
  gap,
  ...props
}: GridProps) {
  return (
    <div
      className={cn(gridVariants({ cols, gap, className }))}
      {...props}
    />
  )
}
