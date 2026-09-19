import { useEffect, useRef, useState, type CSSProperties, type ElementType, type Ref } from 'react'
import { useGSAP } from '@gsap/react'
import { gsap } from 'gsap'
import { ScrollTrigger } from 'gsap/ScrollTrigger'
import { SplitText as GSAPSplitText } from 'gsap/SplitText'

gsap.registerPlugin(ScrollTrigger, GSAPSplitText, useGSAP)

type SplitTextSplitType = 'chars' | 'words' | 'lines' | 'words, chars'

export type SplitTextProps = {
  text: string
  tag?: ElementType
  className?: string
  id?: string
  tabIndex?: number
  ref?: Ref<HTMLElement>
  delay?: number
  duration?: number
  ease?: string
  splitType?: SplitTextSplitType
  from?: gsap.TweenVars
  to?: gsap.TweenVars
  threshold?: number
  rootMargin?: string
  textAlign?: CSSProperties['textAlign']
  onLetterAnimationComplete?: () => void
}

const DEFAULT_FROM: gsap.TweenVars = { opacity: 0, y: 40 }
const DEFAULT_TO: gsap.TweenVars = { opacity: 1, y: 0 }

/**
 * Splitting needs the Font Loading API and a motion-safe user. Tests run in
 * jsdom, which has no `document.fonts`, and reduced motion opts out; both get
 * plain static text instead.
 */
function animationAllowed() {
  if (typeof document === 'undefined' || !document.fonts) return false
  if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') return true

  return !window.matchMedia('(prefers-reduced-motion: reduce)').matches
}

export default function SplitText({
  text,
  tag: Tag = 'p',
  className = '',
  id,
  tabIndex,
  ref,
  delay = 50,
  duration = 1.25,
  ease = 'power3.out',
  splitType = 'chars',
  from = DEFAULT_FROM,
  to = DEFAULT_TO,
  threshold = 0.1,
  rootMargin = '-100px',
  textAlign = 'start',
  onLetterAnimationComplete,
}: SplitTextProps) {
  const elementRef = useRef<HTMLElement | null>(null)
  const splitRef = useRef<GSAPSplitText | null>(null)
  const completedRef = useRef(false)
  const onCompleteRef = useRef(onLetterAnimationComplete)
  const [animationEnabled] = useState(animationAllowed)
  const [fontsLoaded, setFontsLoaded] = useState(
    () => typeof document === 'undefined' || !document.fonts,
  )

  useEffect(() => {
    onCompleteRef.current = onLetterAnimationComplete
  }, [onLetterAnimationComplete])

  useEffect(() => {
    if (typeof document === 'undefined' || !document.fonts) return

    if (document.fonts.status === 'loaded') {
      setFontsLoaded(true)
      return
    }

    let active = true

    void document.fonts.ready.then(() => {
      if (active) setFontsLoaded(true)
    })

    return () => {
      active = false
    }
  }, [])

  useGSAP(
    () => {
      const element = elementRef.current

      if (!element || !text) return

      splitRef.current?.revert()
      splitRef.current = null

      // GSAP replaces React's text node with split spans, so React can no longer
      // update the element's text. Re-sync it with the prop before every split.
      if (element.textContent !== text) element.textContent = text

      if (!animationEnabled || !fontsLoaded || completedRef.current) return

      const startPct = (1 - threshold) * 100
      const marginMatch = /^(-?\d+(?:\.\d+)?)(px|em|rem|%)?$/.exec(rootMargin)
      const marginValue = marginMatch ? Number.parseFloat(marginMatch[1]) : 0
      const marginUnit = marginMatch ? marginMatch[2] || 'px' : 'px'
      const sign =
        marginValue === 0
          ? ''
          : marginValue < 0
            ? `-=${Math.abs(marginValue)}${marginUnit}`
            : `+=${marginValue}${marginUnit}`
      const start = `top ${startPct}%${sign}`

      const split = new GSAPSplitText(element, {
        type: splitType,
        smartWrap: true,
        autoSplit: splitType === 'lines',
        linesClass: 'split-line',
        wordsClass: 'split-word',
        charsClass: 'split-char',
        reduceWhiteSpace: false,
        onSplit: (self) => {
          const targets =
            (splitType.includes('chars') && self.chars.length > 0 && self.chars) ||
            (splitType.includes('words') && self.words.length > 0 && self.words) ||
            (splitType.includes('lines') && self.lines.length > 0 && self.lines) ||
            self.chars ||
            self.words ||
            self.lines

          return gsap.fromTo(
            targets,
            { ...from },
            {
              ...to,
              duration,
              ease,
              stagger: delay / 1000,
              scrollTrigger: {
                trigger: element,
                start,
                once: true,
                fastScrollEnd: true,
                anticipatePin: 0.4,
              },
              onComplete: () => {
                completedRef.current = true
                onCompleteRef.current?.()
              },
              willChange: 'transform, opacity',
              force3D: true,
            },
          )
        },
      })

      splitRef.current = split

      return () => {
        ScrollTrigger.getAll().forEach((trigger) => {
          if (trigger.trigger === element) trigger.kill()
        })

        split.revert()
        splitRef.current = null
      }
    },
    {
      dependencies: [
        text,
        delay,
        duration,
        ease,
        splitType,
        JSON.stringify(from),
        JSON.stringify(to),
        threshold,
        rootMargin,
        animationEnabled,
        fontsLoaded,
      ],
      scope: elementRef,
    },
  )

  const assignRef = (node: HTMLElement | null) => {
    elementRef.current = node

    if (typeof ref === 'function') {
      ref(node)
    } else if (ref) {
      ref.current = node
    }
  }

  return (
    <Tag
      ref={assignRef}
      className={`split-parent ${className}`}
      id={id}
      style={{
        textAlign,
        overflow: 'hidden',
        display: 'inline-block',
        whiteSpace: 'normal',
        wordWrap: 'break-word',
        willChange: 'transform, opacity',
      }}
      tabIndex={tabIndex}
    >
      {text}
    </Tag>
  )
}
