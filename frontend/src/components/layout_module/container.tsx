import React from 'react'
import { cn } from '../utils'

interface ContainerProps extends React.HTMLAttributes<HTMLDivElement> {
  /**
   * Max width of the container. Can be "sm", "md", "lg", "xl", or "full"
   * @default "xl"
   */
  maxWidth?: "sm" | "md" | "lg" | "xl" | "full"
}

/**
 * Container component provides consistent horizontal padding and max-width
 * It centers content and applies appropriate margins for different screen sizes
 */
export function Container({
  className,
  children,
  maxWidth = "xl",
  ...props
}: ContainerProps) {
  return (
    <div
      className={cn(
        "mx-auto px-4 sm:px-6 lg:px-8",
        {
          "max-w-sm": maxWidth === "sm",
          "max-w-md": maxWidth === "md",
          "max-w-lg": maxWidth === "lg",
          "max-w-xl": maxWidth === "xl",
          "max-w-full": maxWidth === "full",
        },
        className
      )}
      {...props}
    >
      {children}
    </div>
  )
}
