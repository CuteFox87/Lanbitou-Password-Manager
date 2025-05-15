import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const flexVariants = cva(
  "flex",
  {
    variants: {
      direction: {
        row: "flex-row",
        column: "flex-col",
        rowReverse: "flex-row-reverse",
        columnReverse: "flex-col-reverse",
      },
      align: {
        start: "items-start",
        center: "items-center",
        end: "items-end",
        stretch: "items-stretch",
        baseline: "items-baseline",
      },
      justify: {
        start: "justify-start",
        center: "justify-center",
        end: "justify-end",
        between: "justify-between",
        around: "justify-around",
        evenly: "justify-evenly",
      },
      wrap: {
        wrap: "flex-wrap",
        nowrap: "flex-nowrap",
        wrapReverse: "flex-wrap-reverse",
      },
      gap: {
        none: "gap-0",
        xs: "gap-1",
        sm: "gap-2",
        md: "gap-4",
        lg: "gap-6",
        xl: "gap-8",
      },
    },
    defaultVariants: {
      direction: "row",
      align: "start",
      justify: "start",
      wrap: "nowrap",
      gap: "none",
    },
  }
)

export interface FlexProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof flexVariants> {}

/**
 * Flex component provides a flexible layout with configurable direction, alignment, and spacing
 * It's a versatile layout primitive for building complex UI layouts
 */
export function Flex({
  className,
  direction,
  align,
  justify,
  wrap,
  gap,
  ...props
}: FlexProps) {
  return (
    <div
      className={cn(flexVariants({ direction, align, justify, wrap, gap, className }))}
      {...props}
    />
  )
}
