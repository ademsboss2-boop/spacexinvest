import React from 'react'
import clsx from 'clsx'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  variant?: 'primary' | 'ghost'
  as?: 'button' | 'a'
}

export function Button({ variant = 'primary', className, children, as = 'button', ...rest }: ButtonProps) {
  const base = 'btn'
  const variantClass = variant === 'primary' ? 'btn-primary' : 'btn-ghost'
  const classes = clsx(base, variantClass, className)
  if (as === 'a') {
    // @ts-expect-error allow anchor props when as='a'
    return (
      <a className={classes} {...rest}>
        {children}
      </a>
    )
  }
  return (
    <button className={classes} {...rest}>
      {children}
    </button>
  )
}

export default Button
