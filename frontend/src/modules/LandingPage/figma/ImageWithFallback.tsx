import Image, { type ImageProps } from 'next/image';
import { useState } from 'react';

type ImageWithFallbackProps = Omit<ImageProps, 'src'> & {
  src?: string;
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK = '/img/LogoLDP.png';

export function ImageWithFallback({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  alt,
  onError,
  width,
  height,
  ...rest
}: ImageWithFallbackProps) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);
  const resolvedWidth = typeof width === 'number' ? width : 1080;
  const resolvedHeight = typeof height === 'number' ? height : 720;

  return (
    <Image
      src={currentSrc}
      alt={alt}
      width={resolvedWidth}
      height={resolvedHeight}
      unoptimized
      onError={(event) => {
        if (currentSrc !== fallbackSrc) {
          setCurrentSrc(fallbackSrc);
        }
        onError?.(event);
      }}
      {...rest}
    />
  );
}
