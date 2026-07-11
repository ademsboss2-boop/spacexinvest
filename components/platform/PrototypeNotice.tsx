import React from 'react'

type PrototypeNoticeProps = {
  children?: React.ReactNode
  compact?: boolean
}

export default function PrototypeNotice({
  children,
  compact = false
}: PrototypeNoticeProps) {
  return (
    <div
      role="note"
      className={`border border-white/10 bg-white/5 text-white/60 backdrop-blur-md ${
        compact ? 'px-4 py-3 text-xs' : 'px-5 py-4 text-sm leading-relaxed'
      }`}
    >
      {children ??
        'Competition prototype. No real securities are offered or sold through this website.'}
    </div>
  )
}
