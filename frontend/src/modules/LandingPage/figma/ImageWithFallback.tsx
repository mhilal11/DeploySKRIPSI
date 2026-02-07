import { ImgHTMLAttributes, useState } from 'react';

type ImageWithFallbackProps = ImgHTMLAttributes<HTMLImageElement> & {
  fallbackSrc?: string;
};

const DEFAULT_FALLBACK = '/img/LogoLDP.png';

export function ImageWithFallback({
  src,
  fallbackSrc = DEFAULT_FALLBACK,
  alt,
  onError,
  ...rest
}: ImageWithFallbackProps) {
  const [currentSrc, setCurrentSrc] = useState(src || fallbackSrc);

  return (
    <img
      src={currentSrc}
      alt={alt}
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


