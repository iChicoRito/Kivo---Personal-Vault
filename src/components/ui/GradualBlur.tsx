/*
 * React Bits GradualBlur (JavaScript + CSS variant), ported to TypeScript.
 * https://reactbits.dev/animations/gradual-blur
 * Component added by Ansh - github.com/ansh-dhanani
 */

import {
  memo,
  useEffect,
  useMemo,
  useRef,
  useState,
  type CSSProperties,
  type ReactElement,
  type RefObject,
} from 'react'

import './GradualBlur.css'

export type GradualBlurPosition = 'top' | 'bottom' | 'left' | 'right'
export type GradualBlurCurve = 'linear' | 'bezier' | 'ease-in' | 'ease-out' | 'ease-in-out'
export type GradualBlurTarget = 'parent' | 'page'

type GradualBlurConfig = {
  position: GradualBlurPosition
  strength: number
  height: string
  width?: string
  divCount: number
  exponential: boolean
  zIndex: number
  animated: boolean | 'scroll'
  duration: string
  easing: string
  opacity: number
  curve: GradualBlurCurve
  responsive: boolean
  target: GradualBlurTarget
  className: string
  style: CSSProperties
  hoverIntensity?: number
  onAnimationComplete?: () => void
  mobileHeight?: string
  tabletHeight?: string
  desktopHeight?: string
  mobileWidth?: string
  tabletWidth?: string
  desktopWidth?: string
}

export type GradualBlurProps = Partial<GradualBlurConfig> & {
  preset?: keyof typeof PRESETS
}

const DEFAULT_CONFIG: GradualBlurConfig = {
  position: 'bottom',
  strength: 2,
  height: '6rem',
  divCount: 5,
  exponential: false,
  zIndex: 1000,
  animated: false,
  duration: '0.3s',
  easing: 'ease-out',
  opacity: 1,
  curve: 'linear',
  responsive: false,
  target: 'parent',
  className: '',
  style: {},
}

const PRESETS = {
  top: { position: 'top', height: '6rem' },
  bottom: { position: 'bottom', height: '6rem' },
  left: { position: 'left', height: '6rem' },
  right: { position: 'right', height: '6rem' },
  subtle: { height: '4rem', strength: 1, opacity: 0.8, divCount: 3 },
  intense: { height: '10rem', strength: 4, divCount: 8, exponential: true },
  smooth: { height: '8rem', curve: 'bezier', divCount: 10 },
  sharp: { height: '5rem', curve: 'linear', divCount: 4 },
  header: { position: 'top', height: '8rem', curve: 'ease-out' },
  footer: { position: 'bottom', height: '8rem', curve: 'ease-out' },
  sidebar: { position: 'left', height: '6rem', strength: 2.5 },
  'page-header': { position: 'top', height: '10rem', target: 'page', strength: 3 },
  'page-footer': { position: 'bottom', height: '10rem', target: 'page', strength: 3 },
} as const satisfies Record<string, Partial<GradualBlurConfig>>

const CURVE_FUNCTIONS: Record<string, (progress: number) => number> = {
  linear: (p) => p,
  bezier: (p) => p * p * (3 - 2 * p),
  'ease-in': (p) => p * p,
  'ease-out': (p) => 1 - Math.pow(1 - p, 2),
  'ease-in-out': (p) => (p < 0.5 ? 2 * p * p : 1 - Math.pow(-2 * p + 2, 2) / 2),
}

function mergeConfigs(...configs: Array<Partial<GradualBlurConfig>>): GradualBlurConfig {
  return configs.reduce<GradualBlurConfig>(
    (merged, config) => ({ ...merged, ...config }),
    DEFAULT_CONFIG,
  )
}

function getGradientDirection(position: GradualBlurPosition) {
  return (
    {
      top: 'to top',
      bottom: 'to bottom',
      left: 'to left',
      right: 'to right',
    } as const
  )[position]
}

function debounce(fn: () => void, wait: number) {
  let timer: ReturnType<typeof setTimeout>
  return () => {
    clearTimeout(timer)
    timer = setTimeout(fn, wait)
  }
}

function responsiveKeyFor(prefix: string, key: 'height' | 'width'): keyof GradualBlurConfig {
  return `${prefix}${key[0].toUpperCase()}${key.slice(1)}` as keyof GradualBlurConfig
}

function useResponsiveDimension(
  responsive: boolean,
  config: GradualBlurConfig,
  key: 'height' | 'width',
) {
  const [value, setValue] = useState(config[key])

  useEffect(() => {
    if (!responsive) return

    const calc = () => {
      const windowWidth = window.innerWidth
      let next = config[key]

      const mobile = config[responsiveKeyFor('mobile', key)] as string | undefined
      const tablet = config[responsiveKeyFor('tablet', key)] as string | undefined
      const desktop = config[responsiveKeyFor('desktop', key)] as string | undefined

      if (windowWidth <= 480 && mobile) next = mobile
      else if (windowWidth <= 768 && tablet) next = tablet
      else if (windowWidth <= 1024 && desktop) next = desktop

      setValue(next)
    }

    const debounced = debounce(calc, 100)
    calc()
    window.addEventListener('resize', debounced)
    return () => window.removeEventListener('resize', debounced)
  }, [responsive, config, key])

  return responsive ? value : config[key]
}

function useIntersectionObserver(ref: RefObject<HTMLDivElement | null>, shouldObserve: boolean) {
  const [isVisible, setIsVisible] = useState(!shouldObserve)

  useEffect(() => {
    const element = ref.current
    if (!shouldObserve || !element) return

    const observer = new IntersectionObserver(([entry]) => setIsVisible(entry.isIntersecting), {
      threshold: 0.1,
    })

    observer.observe(element)
    return () => observer.disconnect()
  }, [ref, shouldObserve])

  return isVisible
}

function GradualBlurBase(props: GradualBlurProps) {
  const containerRef = useRef<HTMLDivElement>(null)
  const [isHovered, setIsHovered] = useState(false)

  const config = useMemo(() => {
    const presetConfig = props.preset ? PRESETS[props.preset] : {}
    return mergeConfigs(presetConfig, props)
  }, [props])

  const responsiveHeight = useResponsiveDimension(config.responsive, config, 'height')
  const responsiveWidth = useResponsiveDimension(config.responsive, config, 'width')

  const isVisible = useIntersectionObserver(containerRef, config.animated === 'scroll')

  const blurDivs = useMemo(() => {
    const divs: ReactElement[] = []
    const increment = 100 / config.divCount
    const currentStrength =
      isHovered && config.hoverIntensity ? config.strength * config.hoverIntensity : config.strength

    const curveFunc = CURVE_FUNCTIONS[config.curve] ?? CURVE_FUNCTIONS.linear

    for (let i = 1; i <= config.divCount; i++) {
      let progress = i / config.divCount
      progress = curveFunc(progress)

      let blurValue: number
      if (config.exponential) {
        blurValue = Math.pow(2, progress * 4) * 0.0625 * currentStrength
      } else {
        blurValue = 0.0625 * (progress * config.divCount + 1) * currentStrength
      }

      const p1 = Math.round((increment * i - increment) * 10) / 10
      const p2 = Math.round(increment * i * 10) / 10
      const p3 = Math.round((increment * i + increment) * 10) / 10
      const p4 = Math.round((increment * i + increment * 2) * 10) / 10

      let gradient = `transparent ${p1}%, black ${p2}%`
      if (p3 <= 100) gradient += `, black ${p3}%`
      if (p4 <= 100) gradient += `, transparent ${p4}%`

      const direction = getGradientDirection(config.position)

      const divStyle: CSSProperties = {
        position: 'absolute',
        inset: '0',
        maskImage: `linear-gradient(${direction}, ${gradient})`,
        WebkitMaskImage: `linear-gradient(${direction}, ${gradient})`,
        backdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        WebkitBackdropFilter: `blur(${blurValue.toFixed(3)}rem)`,
        opacity: config.opacity,
        transition:
          config.animated && config.animated !== 'scroll'
            ? `backdrop-filter ${config.duration} ${config.easing}`
            : undefined,
      }

      divs.push(<div key={i} style={divStyle} />)
    }

    return divs
  }, [config, isHovered])

  const containerStyle = useMemo(() => {
    const isVertical = config.position === 'top' || config.position === 'bottom'
    const isHorizontal = config.position === 'left' || config.position === 'right'
    const isPageTarget = config.target === 'page'

    const baseStyle: CSSProperties = {
      position: isPageTarget ? 'fixed' : 'absolute',
      pointerEvents: config.hoverIntensity ? 'auto' : 'none',
      opacity: isVisible ? 1 : 0,
      transition: config.animated ? `opacity ${config.duration} ${config.easing}` : undefined,
      zIndex: isPageTarget ? config.zIndex + 100 : config.zIndex,
      ...config.style,
    }

    if (isVertical) {
      baseStyle.height = responsiveHeight
      baseStyle.width = responsiveWidth || '100%'
      baseStyle[config.position] = 0
      baseStyle.left = 0
      baseStyle.right = 0
    } else if (isHorizontal) {
      baseStyle.width = responsiveWidth || responsiveHeight
      baseStyle.height = '100%'
      baseStyle[config.position] = 0
      baseStyle.top = 0
      baseStyle.bottom = 0
    }

    return baseStyle
  }, [config, responsiveHeight, responsiveWidth, isVisible])

  useEffect(() => {
    const { animated, onAnimationComplete, duration } = config
    if (isVisible && animated === 'scroll' && onAnimationComplete) {
      const ms = parseFloat(duration) * 1000
      const timer = setTimeout(() => onAnimationComplete(), ms)
      return () => clearTimeout(timer)
    }
  }, [isVisible, config])

  return (
    <div
      ref={containerRef}
      className={`gradual-blur ${
        config.target === 'page' ? 'gradual-blur-page' : 'gradual-blur-parent'
      } ${config.className}`}
      style={containerStyle}
      onMouseEnter={config.hoverIntensity ? () => setIsHovered(true) : undefined}
      onMouseLeave={config.hoverIntensity ? () => setIsHovered(false) : undefined}
    >
      <div
        className="gradual-blur-inner"
        style={{
          position: 'relative',
          width: '100%',
          height: '100%',
        }}
      >
        {blurDivs}
      </div>
    </div>
  )
}

export const GradualBlur = memo(GradualBlurBase)
GradualBlur.displayName = 'GradualBlur'

export default GradualBlur
