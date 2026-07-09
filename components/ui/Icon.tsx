import React from 'react'
import { Icon as LucideIcon } from 'lucide-react'

type IconProps = {
  icon: LucideIcon
  size?: number
  className?: string
}

export default function Icon({ icon: IconComp, size = 18, className = '' }: IconProps) {
  return <IconComp size={size} className={className} />
}
