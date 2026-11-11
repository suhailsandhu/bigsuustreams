import React, { useEffect, useRef, useState } from 'react';

interface CountUpProps {
  to: number;
  from?: number;
  separator?: string;
  decimals?: number;
  duration?: number; // in seconds
  className?: string;
  style?: React.CSSProperties;
}

export const CountUp: React.FC<CountUpProps> = ({
  to,
  from = 0,
  separator = ',',
  decimals = 0,
  duration = 1.6,
  className = '',
  style = {}
}) => {
  const [count, setCount] = useState<number>(from);
  const elementRef = useRef<HTMLSpanElement | null>(null);
  const [hasAnimated, setHasAnimated] = useState<boolean>(false);

  useEffect(() => {
    const el = elementRef.current;
    if (!el) return;

    if (typeof IntersectionObserver === 'undefined') {
      setCount(to);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasAnimated) {
          setHasAnimated(true);

          let startTime: number | null = null;

          const updateCount = (timestamp: number) => {
            if (!startTime) startTime = timestamp;
            const progress = Math.min((timestamp - startTime) / (duration * 1000), 1);
            
            // Ease-out expo formula for smooth deceleration
            const easedProgress = progress === 1 ? 1 : 1 - Math.pow(2, -10 * progress);
            
            const currentVal = from + (to - from) * easedProgress;
            setCount(currentVal);

            if (progress < 1) {
              requestAnimationFrame(updateCount);
            } else {
              setCount(to);
            }
          };

          requestAnimationFrame(updateCount);
        }
      },
      { threshold: 0.1 }
    );

    observer.observe(el);

    return () => {
      if (el) observer.unobserve(el);
    };
  }, [to, from, duration, hasAnimated]);

  const formattedNumber = count.toLocaleString(undefined, {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals
  });

  const displayValue = separator !== ',' ? formattedNumber.replace(/,/g, separator) : formattedNumber;

  return (
    <span ref={elementRef} className={className} style={style}>
      {displayValue}
    </span>
  );
};

export default CountUp;
