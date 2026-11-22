'use client';

import Image from 'next/image';
import { cn } from '@/lib/utils';

interface FittedCardImageProps {
  src: string;
  alt: string;
  className?: string;
  imgClassName?: string;
  priority?: boolean;
  dataAiHint?: string;
  useNativeImg?: boolean;
}

/**
 * Renders any user-uploaded image fitted cleanly inside its container (`object-contain`)
 * over a soft blurred backdrop of the same image so posters, flyers, and portraits
 * never get cropped or leave harsh empty bars.
 */
export function FittedCardImage({
  src,
  alt,
  className,
  imgClassName,
  priority = false,
  dataAiHint,
  useNativeImg = false,
}: FittedCardImageProps) {
  if (useNativeImg) {
    return (
      <div className={cn('relative overflow-hidden bg-muted/60', className)}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt=""
          aria-hidden="true"
          className="absolute inset-0 w-full h-full object-cover blur-xl scale-110 opacity-45 pointer-events-none select-none"
        />
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={src}
          alt={alt}
          className={cn('relative z-10 w-full h-full object-contain', imgClassName)}
        />
      </div>
    );
  }

  return (
    <div className={cn('relative overflow-hidden bg-muted/60', className)}>
      <Image
        src={src}
        alt=""
        fill
        aria-hidden="true"
        className="object-cover blur-xl scale-110 opacity-45 pointer-events-none select-none"
      />
      <Image
        src={src}
        alt={alt}
        fill
        priority={priority}
        className={cn('relative z-10 object-contain', imgClassName)}
        data-ai-hint={dataAiHint}
      />
    </div>
  );
}
