import React from 'react'
import { cva, type VariantProps } from 'class-variance-authority'
import { cn } from '../utils'

const sectionVariants = cva(
  "",
  {
    variants: {
      spacing: {
        none: "py-0",
        sm: "py-4",
        md: "py-8",
        lg: "py-12",
        xl: "py-16",
      },
      background: {
        default: "bg-white dark:bg-gray-900",
        muted: "bg-gray-50 dark:bg-gray-800",
        primary: "bg-primary-50 dark:bg-primary-900",
        secondary: "bg-secondary-50 dark:bg-secondary-900",
      },
    },
    defaultVariants: {
      spacing: "lg",
      background: "default",
    },
  }
)

export interface SectionProps
  extends React.HTMLAttributes<HTMLElement>,
    VariantProps<typeof sectionVariants> {}

/**
 * Section component provides a distinct content area with configurable spacing and background
 * Use it to create landing page sections, feature sections, etc.
 */
export function Section({
  className,
  spacing,
  background,
  ...props
}: SectionProps) {
  return (
    <section
      className={cn(sectionVariants({ spacing, background, className }))}
      {...props}
    />
  )
}

const SectionHeader = React.forwardRef<
  HTMLDivElement,
  React.HTMLAttributes<HTMLDivElement>
>(({ className, ...props }, ref) => (
  <div
    ref={ref}
    className={cn("flex flex-col space-y-1.5 text-center mb-8", className)}
    {...props}
  />
))
SectionHeader.displayName = "SectionHeader"

const SectionTitle = React.forwardRef<
  HTMLHeadingElement,
  React.HTMLAttributes<HTMLHeadingElement>
>(({ className, ...props }, ref) => (
  <h2
    ref={ref}
    className={cn("text-3xl font-bold tracking-tight sm:text-4xl", className)}
    {...props}
  />
))
SectionTitle.displayName = "SectionTitle"

const SectionDescription = React.forwardRef<
  HTMLParagraphElement,
  React.HTMLAttributes<HTMLParagraphElement>
>(({ className, ...props }, ref) => (
  <p
    ref={ref}
    className={cn("mx-auto max-w-[80ch] text-gray-500 dark:text-gray-400", className)}
    {...props}
  />
))
SectionDescription.displayName = "SectionDescription"

export { SectionHeader, SectionTitle, SectionDescription }
