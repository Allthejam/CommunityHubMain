'use client';

import React, { useState, useEffect, useRef } from 'react';
import { Card, CardContent, CardHeader } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';

interface LazyFeedProps {
  children: React.ReactNode;
  placeholderHeight?: string;
  id?: string;
  className?: string;
}

export function LazyFeed({ children, placeholderHeight = "h-48", id, className }: LazyFeedProps) {
  const [isVisible, setIsVisible] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (isVisible) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const [entry] = entries;
        if (entry.isIntersecting) {
          setIsVisible(true);
          observer.disconnect();
        }
      },
      {
        // 250px rootMargin so feed starts loading BEFORE user reaches it on scroll
        rootMargin: '250px 0px 250px 0px',
        threshold: 0.01,
      }
    );

    if (containerRef.current) {
      observer.observe(containerRef.current);
    }

    return () => {
      observer.disconnect();
    };
  }, [isVisible]);

  return (
    <div ref={containerRef} id={id} className={className}>
      {isVisible ? (
        children
      ) : (
        <Card className="w-full">
          <CardHeader className="p-4 sm:p-6 pb-2">
            <Skeleton className="h-6 w-48 mb-1" />
            <Skeleton className="h-4 w-72" />
          </CardHeader>
          <CardContent className={`p-4 sm:p-6 flex items-center justify-center ${placeholderHeight}`}>
            <Skeleton className="h-full w-full rounded-lg" />
          </CardContent>
        </Card>
      )}
    </div>
  );
}
