'use client'

import React from 'react'
import clsx from 'clsx'

type ButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> &
  React.AnchorHTMLAttributes<HTMLAnchorElement> & {
    variant?: 'primary' | 'ghost'
    as?: 'button' | 'a'
  }

export function Button({ variant = 'primary', className, children, as = 'button', ...rest }: ButtonProps) {
  const base = 'btn'
  const variantClass = variant === 'primary' ? 'btn-primary' : 'btn-ghost'
  const classes = clsx(base, variantClass, className)

  if (as === 'a') {
    const { href, ...anchorRest } = rest as React.AnchorHTMLAttributes<HTMLAnchorElement>
    return (
      <a className={classes} href={href} {...(anchorRest as any)}>
        {children}
      </a>
    )
  }

  return (
    <button className={classes} {...(rest as React.ButtonHTMLAttributes<HTMLButtonElement>)}>
      {children}
    </button>
  )
}

export default Button
