import React, { useState, useEffect, useRef } from 'react';

export type RevealDirection = 'up' | 'down' | 'left' | 'right' | 'zoom-in' | 'zoom-out' | 'blur-up' | 'fade' | 'none';

export interface RevealOnScrollProps {
  children: React.ReactNode;
  className?: string;
  delayMs?: number;
  durationMs?: number;
  direction?: RevealDirection;
  threshold?: number;
  rootMargin?: string;
  once?: boolean;
  blur?: boolean;
  scale?: boolean;
  as?: React.ElementType;
  style?: React.CSSProperties;
}

export const RevealOnScroll: React.FC<RevealOnScrollProps> = ({
  children,
  className = '',
  delayMs = 0,
  durationMs = 700,
  direction = 'up',
  threshold = 0.1,
  rootMargin = '0px 0px -40px 0px',
  once = true,
  blur = false,
  scale = false,
  as: Component = 'div',
  style = {},
}) => {
  const [isVisible, setIsVisible] = useState(false);
  const ref = useRef<HTMLElement | null>(null);

  useEffect(() => {
    // Check for reduced motion preference
    if (typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      setIsVisible(true);
      return;
    }

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting) {
          setIsVisible(true);
          if (once && ref.current) {
            observer.unobserve(ref.current);
          }
        } else if (!once) {
          setIsVisible(false);
        }
      },
      {
        threshold,
        rootMargin,
      }
    );

    const currentRef = ref.current;
    if (currentRef) {
      observer.observe(currentRef);
    }

    return () => {
      if (currentRef) {
        observer.unobserve(currentRef);
      }
      observer.disconnect();
    };
  }, [threshold, rootMargin, once]);

  // Initial transform class based on direction
  let initialTransformClass = '';
  switch (direction) {
    case 'up':
      initialTransformClass = 'translate-y-8 sm:translate-y-12';
      break;
    case 'down':
      initialTransformClass = '-translate-y-8 sm:-translate-y-12';
      break;
    case 'left':
      initialTransformClass = '-translate-x-8 sm:-translate-x-12';
      break;
    case 'right':
      initialTransformClass = 'translate-x-8 sm:translate-x-12';
      break;
    case 'zoom-in':
      initialTransformClass = 'scale-90 translate-y-4';
      break;
    case 'zoom-out':
      initialTransformClass = 'scale-105';
      break;
    case 'blur-up':
      initialTransformClass = 'translate-y-8 blur-sm';
      break;
    case 'fade':
      initialTransformClass = '';
      break;
    case 'none':
      initialTransformClass = '';
      break;
    default:
      initialTransformClass = 'translate-y-8';
  }

  const customTransitionStyle: React.CSSProperties = {
    transitionProperty: 'opacity, transform, filter',
    transitionDuration: `${durationMs}ms`,
    transitionTimingFunction: 'cubic-bezier(0.16, 1, 0.3, 1)',
    transitionDelay: `${delayMs}ms`,
    willChange: 'opacity, transform',
    ...style,
  };

  const visibleClass = 'opacity-100 translate-y-0 translate-x-0 scale-100 filter-none';
  const hiddenClass = `opacity-0 ${initialTransformClass} ${blur && direction !== 'blur-up' ? 'blur-sm' : ''} ${scale && direction !== 'zoom-in' ? 'scale-95' : ''}`;

  return (
    <Component
      ref={ref}
      style={customTransitionStyle}
      className={`transition-all ${isVisible ? visibleClass : hiddenClass} ${className}`}
    >
      {children}
    </Component>
  );
};

export default RevealOnScroll;
