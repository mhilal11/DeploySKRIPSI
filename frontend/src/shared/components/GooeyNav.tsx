import React, { useRef, useEffect, useState } from 'react';

interface GooeyNavItem {
  label: string;
  href: string;
}

export interface GooeyNavProps {
  items: GooeyNavItem[];
  animationTime?: number;
  particleCount?: number;
  particleDistances?: [number, number];
  particleR?: number;
  timeVariance?: number;
  colors?: number[];
  initialActiveIndex?: number;
  className?: string;
  textColor?: string;
  activeTextColor?: string;
  pillColor?: string;
  filterColor?: string;
  bubbleColor?: string;
  textShadowColor?: string;
  colorPalette?: string[];
}

type CSSVars = React.CSSProperties & {
  [key: `--${string}`]: string | number | undefined;
};

const GooeyNav: React.FC<GooeyNavProps> = ({
  items,
  // defaults dibuat lebih ringan
  animationTime = 450,
  particleCount = 15,
  particleDistances = [70, 8],
  particleR = 80,
  timeVariance = 150,
  colors = [1, 2, 3, 1, 2, 3, 1, 4],
  initialActiveIndex = 0,
  className = '',
  textColor = '#6b7280',
  activeTextColor = '#ffffff',
  pillColor = '#7c3aed',
  filterColor = '#9d6dff',
  bubbleColor = '#a78bfa',
  textShadowColor = 'rgba(0,0,0,0.12)',
  colorPalette
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const navRef = useRef<HTMLUListElement>(null);
  const filterRef = useRef<HTMLSpanElement>(null);
  const textRef = useRef<HTMLSpanElement>(null);
  const [activeIndex, setActiveIndex] = useState<number>(initialActiveIndex);

  const cssVars: CSSVars = {
    '--gooey-text': textColor,
    '--gooey-text-active': activeTextColor,
    '--gooey-pill': pillColor,
    '--gooey-filter': filterColor,
    '--gooey-bubble': bubbleColor,
    '--gooey-text-shadow': textShadowColor
  };

  // default palette kalau colorPalette tidak diisi
  const palette = colorPalette ?? [
    '#38bdf8', // biru
    '#22c55e', // hijau
    '#f97316', // oranye
    '#e11d48'  // pink
  ];

  palette.slice(0, 4).forEach((value, index) => {
    cssVars[`--color-${index + 1}` as '--color-1'] = value;
  });

  const noise = (n = 1): number => n / 2 - Math.random() * n;

  const getXY = (
    distance: number,
    pointIndex: number,
    totalPoints: number
  ): [number, number] => {
    const angle = ((360 + noise(4)) / totalPoints) * pointIndex * (Math.PI / 180);
    return [distance * Math.cos(angle), distance * Math.sin(angle)];
  };

  const createParticle = (
    i: number,
    t: number,
    d: [number, number],
    r: number
  ) => {
    let rotate = noise(r / 12);
    return {
      start: getXY(d[0], particleCount - i, particleCount),
      end: getXY(d[1] + noise(5), particleCount - i, particleCount),
      time: t,
      scale: 1 + noise(0.15),
      color: colors[Math.floor(Math.random() * colors.length)],
      rotate: rotate > 0 ? (rotate + r / 25) * 10 : (rotate - r / 25) * 10
    };
  };

  const makeParticles = (element: HTMLElement): void => {
    if (particleCount <= 0) return;

    const d: [number, number] = particleDistances;
    const r = particleR;
    const bubbleTime = animationTime * 2 + timeVariance;
    element.style.setProperty('--time', `${bubbleTime}ms`);

    const fragment = document.createDocumentFragment();

    for (let i = 0; i < particleCount; i++) {
      const t = animationTime * 2 + noise(timeVariance);
      const p = createParticle(i, t, d, r);

      const particle = document.createElement('span');
      const point = document.createElement('span');

      particle.classList.add('particle');
      particle.style.setProperty('--start-x', `${p.start[0]}px`);
      particle.style.setProperty('--start-y', `${p.start[1]}px`);
      particle.style.setProperty('--end-x', `${p.end[0]}px`);
      particle.style.setProperty('--end-y', `${p.end[1]}px`);
      particle.style.setProperty('--time', `${t}ms`);
      particle.style.setProperty('--scale', `${p.scale}`);
      // fallback warna bukan putih lagi, tapi bubbleColor
      particle.style.setProperty(
        '--color',
        `var(--color-${p.color}, ${bubbleColor})`
      );
      particle.style.setProperty('--rotate', `${p.rotate}deg`);

      particle.addEventListener('animationend', () => {
        particle.remove();
      });

      point.classList.add('point');
      particle.appendChild(point);
      fragment.appendChild(particle);
    }

    // clear sebelumnya biar nggak numpuk
    const existing = element.querySelectorAll('.particle');
    existing.forEach((p) => p.remove());

    element.classList.remove('active');
    element.appendChild(fragment);

    // trigger di frame berikutnya supaya animasi smooth
    requestAnimationFrame(() => {
      element.classList.add('active');
    });
  };

  const updateEffectPosition = (element: HTMLElement): void => {
    if (!containerRef.current || !filterRef.current || !textRef.current) return;

    const containerRect = containerRef.current.getBoundingClientRect();
    const pos = element.getBoundingClientRect();
    const styles = {
      left: `${pos.x - containerRect.x}px`,
      top: `${pos.y - containerRect.y}px`,
      width: `${pos.width}px`,
      height: `${pos.height}px`
    };

    Object.assign(filterRef.current.style, styles);
    Object.assign(textRef.current.style, styles);

    textRef.current.innerText = element.innerText;
  };

  const activateItem = (el: HTMLElement, index: number): void => {
    if (activeIndex === index) return;

    setActiveIndex(index);
    updateEffectPosition(el);

    if (filterRef.current) {
      makeParticles(filterRef.current);
    }

    if (textRef.current) {
      textRef.current.classList.remove('active');
      void textRef.current.offsetWidth; // reflow kecil, tapi jarang
      textRef.current.classList.add('active');
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>, index: number): void => {
    const liEl = e.currentTarget.parentElement as HTMLElement;
    if (!liEl) return;
    activateItem(liEl, index);
  };

  const handleKeyDown = (e: React.KeyboardEvent<HTMLAnchorElement>, index: number): void => {
    if (e.key === 'Enter' || e.key === ' ') {
      e.preventDefault();
      const liEl = e.currentTarget.parentElement as HTMLElement;
      if (liEl) {
        activateItem(liEl, index);
      }
    }
  };

  useEffect(() => {
    if (!navRef.current || !containerRef.current) return;

    const activeLi = navRef.current.querySelectorAll('li')[activeIndex] as HTMLElement;
    if (activeLi) {
      updateEffectPosition(activeLi);
      textRef.current?.classList.add('active');
    }

    const resizeObserver = new ResizeObserver(() => {
      const currentActiveLi = navRef.current?.querySelectorAll('li')[activeIndex] as HTMLElement;
      if (currentActiveLi) {
        updateEffectPosition(currentActiveLi);
      }
    });

    resizeObserver.observe(containerRef.current);
    return () => resizeObserver.disconnect();
  }, [activeIndex]);

  return (
    <>
      <style>
        {`
          :root {
            --linear-ease: linear(0, 0.068, 0.19 2.7%, 0.804 8.1%, 1.037, 1.199 13.2%, 1.245, 1.27 15.8%, 1.274, 1.272 17.4%, 1.249 19.1%, 0.996 28%, 0.949, 0.928 33.3%, 0.926, 0.933 36.8%, 1.001 45.6%, 1.013, 1.019 50.8%, 1.018 54.4%, 1 63.1%, 0.995 68%, 1.001 85%, 1);
          }

          .effect {
            position: absolute;
            opacity: 1;
            pointer-events: none;
            display: grid;
            place-items: center;
            z-index: 1;
            will-change: transform, opacity;
          }

          .effect.text {
            color: var(--gooey-text);
            transition: color 0.25s ease;
            z-index: 3;
          }

          .effect.text.active {
            color: var(--gooey-text-active);
          }

          .effect.filter {
            filter: blur(1.5px);
            mix-blend-mode: normal;
          }

          .effect.filter::before {
            content: "";
            position: absolute;
            inset: -4px;
            z-index: -2;
            border-radius: 9999px;
            background: var(--gooey-filter);
            opacity: 0.28;
          }

          .effect.filter::after {
            content: "";
            position: absolute;
            inset: 0;
            transform: scale(0.9);
            opacity: 0;
            z-index: -1;
            border-radius: 9999px;
            background: var(--gooey-bubble);
            transition: opacity 0.25s ease, transform 0.25s ease;
          }

          .effect.active::after {
            transform: scale(1);
            opacity: 1;
          }

          .particle,
          .point {
            display: block;
            opacity: 0;
            width: 24px;   /* particle lebih besar */
            height: 24px;
            border-radius: 9999px;
            transform-origin: center;
            will-change: transform, opacity;
          }

          .particle {
            --time: 400ms;
            position: absolute;
            top: 50%;
            left: 50%;
            animation: particle var(--time) ease-out 1;
          }

          .point {
            background: var(--color);
            opacity: 1;
            animation: point var(--time) ease-out 1;
          }

          @keyframes particle {
            0% {
              transform: translate(calc(var(--start-x)), calc(var(--start-y))) scale(0.8) rotate(0deg);
              opacity: 0;
            }
            40% {
              opacity: 1;
            }
            100% {
              transform: translate(calc(var(--end-x)), calc(var(--end-y))) scale(0.2) rotate(var(--rotate));
              opacity: 0;
            }
          }

          @keyframes point {
            0% {
              transform: scale(0);
              opacity: 0;
            }
            30% {
              transform: scale(calc(var(--scale) * 0.6));
              opacity: 1;
            }
            100% {
              transform: scale(0);
              opacity: 0;
            }
          }

          li,
          li a {
            position: relative;
            z-index: 2;
          }

          li.active {
            color: var(--gooey-text-active);
            text-shadow: none;
          }

          li.active::after {
            opacity: 1;
            transform: scale(1);
          }

          li::after {
            content: "";
            position: absolute;
            inset: 0;
            border-radius: 9999px;
            background: var(--gooey-pill);
            opacity: 0;
            transform: scale(0.85);
            transition: all 0.25s ease;
            z-index: -1;
          }
        `}
      </style>

      <div
        className={`relative ${className}`}
        ref={containerRef}
        style={cssVars}
      >
        <nav
          className="flex relative"
          style={{ transform: 'translate3d(0,0,0.01px)' }}
        >
          <ul
            ref={navRef}
            className="flex gap-8 list-none p-0 px-4 m-0 relative z-[3]"
            style={{
              color: 'var(--gooey-text)',
              textShadow: '0 1px 1px var(--gooey-text-shadow)'
            }}
          >
            {items.map((item, index) => (
              <li
                key={index}
                className={`rounded-full relative cursor-pointer transition-[background-color_color_box-shadow] duration-200 ease-out shadow-[0_0_0.5px_1.5px_transparent] ${
                  activeIndex === index ? 'active' : ''
                }`}
              >
                <a
                  href={item.href}
                  onClick={(e) => handleClick(e, index)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="outline-none py-[0.6em] px-[1em] inline-block select-none"
                >
                  {item.label}
                </a>
              </li>
            ))}
          </ul>
        </nav>

        <span className="effect filter" ref={filterRef} />
        <span className="effect text" ref={textRef} />
      </div>
    </>
  );
};

export default GooeyNav;

