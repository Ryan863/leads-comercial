'use client'

import React, { useEffect, useRef, useState } from 'react'

type ScrollRevealProps = {
  children: React.ReactNode
  className?: string
  delay?: number
  threshold?: number
}

export function ScrollReveal({
  children,
  className = '',
  delay = 0,
  threshold = 0.15,
}: ScrollRevealProps) {
  const [isVisible, setIsVisible] = useState(false)
  const ref = useRef<HTMLDivElement>(null)

  useEffect(() => {
    const element = ref.current
    if (!element) return

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true)
          observer.unobserve(entry.target)
        }
      },
      {
        threshold,
        rootMargin: '0px 0px -40px 0px',
      }
    )

    observer.observe(element)

    return () => {
      observer.disconnect()
    }
  }, [threshold])

  return (
    <div
      ref={ref}
      style={{
        transitionDelay: `${delay}ms`,
      }}
      className={`transition-all duration-700 ease-out ${
        isVisible
          ? 'translate-y-0 opacity-100'
          : 'translate-y-8 opacity-0 pointer-events-none'
      } ${className}`}
    >
      {children}
    </div>
  )
}
