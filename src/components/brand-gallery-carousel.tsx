'use client';

import * as React from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { cn } from '@/lib/utils';

interface GalleryImage {
  id: string;
  url: string;
  title?: string;
}

/**
 * A stylized carousel that displays images with a center-focused scaling effect.
 * Images overlap and shrink as they move away from the active center.
 * Features: Autoplay, Pause on Hover, Mouse/Touch Drag gestures.
 */
export function BrandGalleryCarousel({ images }: { images: GalleryImage[] }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [isHovered, setIsHovered] = React.useState(false);
  const [startX, setStartX] = React.useState<number | null>(null);
  const [isDragging, setIsDragging] = React.useState(false);

  if (!images || images.length === 0) return null;

  const next = React.useCallback(() => {
    setActiveIndex((prev) => (prev + 1) % images.length);
  }, [images.length]);

  const prev = React.useCallback(() => {
    setActiveIndex((prev) => (prev - 1 + images.length) % images.length);
  }, [images.length]);

  // Autoplay Logic
  React.useEffect(() => {
    if (isHovered || images.length <= 1) return;
    const interval = setInterval(next, 5000);
    return () => clearInterval(interval);
  }, [next, isHovered, images.length]);

  // Interaction Handlers
  const handleStart = (clientX: number) => {
    setStartX(clientX);
    setIsDragging(false);
  };

  const handleMove = (clientX: number) => {
    if (startX === null) return;
    const diff = startX - clientX;
    if (Math.abs(diff) > 10) {
      setIsDragging(true);
    }
  };

  const handleEnd = (clientX: number) => {
    if (startX === null) return;
    const diff = startX - clientX;
    const threshold = 50;

    if (diff > threshold) {
      next();
    } else if (diff < -threshold) {
      prev();
    }
    
    setStartX(null);
    setTimeout(() => setIsDragging(false), 50);
  };

  // If only one image, just show it centered without controls
  if (images.length === 1) {
    return (
      <div className="flex justify-center p-4">
        <div className="relative aspect-video w-full max-w-2xl rounded-2xl overflow-hidden shadow-xl border-2 border-primary/20">
          <Image src={images[0].url} alt={images[0].title || "Gallery"} fill className="object-cover" />
        </div>
      </div>
    );
  }

  return (
    <div 
      className="relative w-full h-[350px] sm:h-[500px] flex items-center justify-center overflow-hidden touch-pan-y select-none cursor-grab active:cursor-grabbing"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => {
        setIsHovered(false);
        setStartX(null);
      }}
      onMouseDown={(e) => handleStart(e.clientX)}
      onMouseMove={(e) => handleMove(e.clientX)}
      onMouseUp={(e) => handleEnd(e.clientX)}
      onTouchStart={(e) => handleStart(e.touches[0].clientX)}
      onTouchMove={(e) => handleMove(e.touches[0].clientX)}
      onTouchEnd={(e) => e.changedTouches[0] && handleEnd(e.changedTouches[0].clientX)}
    >
      <div className="relative w-full h-full flex items-center justify-center pointer-events-none">
        {images.map((img, index) => {
          let offset = index - activeIndex;
          
          // Handle infinite loop offsets
          if (offset < -Math.floor(images.length / 2)) {
            offset += images.length;
          } else if (offset > Math.floor(images.length / 2)) {
            offset -= images.length;
          }

          const isActive = offset === 0;
          const absOffset = Math.abs(offset);

          // Calculate transforms based on distance from center
          const scale = Math.max(0.65, 1 - absOffset * 0.18);
          const translateX = offset * 180; // Distance between image centers in pixels
          const opacity = Math.max(0.2, 1 - absOffset * 0.35);
          const zIndex = 30 - absOffset * 5;

          // Limit rendering depth to save performance
          if (absOffset > 2 && images.length > 5) return null;

          return (
            <div
              key={img.id || index}
              className={cn(
                "absolute transition-all duration-700 ease-out flex flex-col items-center",
                isActive ? "pointer-events-auto cursor-pointer" : "pointer-events-auto cursor-pointer"
              )}
              style={{
                transform: `translateX(${translateX}px) scale(${scale})`,
                zIndex,
                opacity,
              }}
              onClick={() => {
                if (!isDragging) {
                  setActiveIndex(index);
                }
              }}
            >
              <div className={cn(
                "relative aspect-video w-[280px] sm:w-[480px] md:w-[600px] rounded-2xl overflow-hidden shadow-2xl transition-all duration-500 border-2",
                isActive ? "border-primary ring-4 ring-primary/20 shadow-primary/20" : "border-border/60 hover:border-primary/50"
              )}>
                <Image
                  src={img.url}
                  alt={img.title || `Brand Slide ${index + 1}`}
                  fill
                  className="object-cover"
                  sizes="(max-width: 768px) 100vw, 600px"
                  priority={isActive}
                />
                
                {/* Overlay vignette */}
                <div className={cn(
                  "absolute inset-0 transition-opacity duration-300",
                  isActive ? "bg-gradient-to-t from-black/60 via-transparent to-transparent opacity-60" : "bg-black/40"
                )} />

                {/* Caption / Title */}
                {img.title && isActive && (
                  <div className="absolute bottom-0 inset-x-0 p-4 text-white font-medium text-sm text-center drop-shadow-md truncate">
                    {img.title}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {/* Navigation Buttons */}
      <Button
        variant="secondary"
        size="icon"
        className="absolute left-4 z-40 rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-background/80 backdrop-blur-md shadow-lg border hover:bg-background hover:scale-105 transition-all text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          prev();
        }}
      >
        <ChevronLeft className="h-6 w-6" />
      </Button>

      <Button
        variant="secondary"
        size="icon"
        className="absolute right-4 z-40 rounded-full h-10 w-10 sm:h-12 sm:w-12 bg-background/80 backdrop-blur-md shadow-lg border hover:bg-background hover:scale-105 transition-all text-foreground"
        onClick={(e) => {
          e.stopPropagation();
          next();
        }}
      >
        <ChevronRight className="h-6 w-6" />
      </Button>

      {/* Pagination Dots */}
      <div className="absolute bottom-2 z-40 flex items-center gap-1.5 p-1.5 rounded-full bg-background/60 backdrop-blur-md border shadow-sm">
        {images.map((_, i) => (
          <button
            key={i}
            className={cn(
              "h-2 rounded-full transition-all duration-300",
              i === activeIndex ? "w-6 bg-primary" : "w-2 bg-muted-foreground/40 hover:bg-muted-foreground"
            )}
            onClick={() => setActiveIndex(i)}
          />
        ))}
      </div>
    </div>
  );
}
