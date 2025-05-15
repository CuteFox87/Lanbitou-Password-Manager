import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const dividerVariants = cva(
  "shrink-0",
  {
    variants: {
      orientation: {
        horizontal: "w-full border-t",
        vertical: "h-full border-l",
      },
      thickness: {
        thin: "border-[0.5px]",
        normal: "border-[1px]",
        thick: "border-[2px]",
      },
      variant: {
        default: "border-gray-200 dark:border-gray-700",
        muted: "border-gray-100 dark:border-gray-800",
        accent: "border-primary-500 dark:border-primary-400",
      },
    },
    defaultVariants: {
      orientation: "horizontal",
      thickness: "normal",
      variant: "default",
    },
  }
)

export interface DividerProps 
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof dividerVariants> {
  /**
   * Decorative text to be displayed in the middle of the divider
   */
  decorative?: string
}

/**
 * Divider component creates a visual separation between content
 * Can be horizontal or vertical with different thickness and color options
 */
export function Divider({
  className,
  orientation,
  thickness,
  variant,
  decorative,
  ...props
}: DividerProps) {
  return (
    <div
      role="separator"
      className={cn(
        decorative ? "flex items-center" : "",
        orientation === "vertical" ? "inline-flex h-full" : "",
        className
      )}
      {...props}
    >
      {decorative ? (
        <React.Fragment>
          <span className={cn(
            dividerVariants({ orientation, thickness, variant }),
            "flex-1"
          )} />
          <span className="px-3 text-xs text-gray-500 dark:text-gray-400">{decorative}</span>
          <span className={cn(
            dividerVariants({ orientation, thickness, variant }),
            "flex-1"
          )} />
        </React.Fragment>
      ) : (
        <span className={cn(
          dividerVariants({ orientation, thickness, variant })
        )} />
      )}
    </div>
  )
}
