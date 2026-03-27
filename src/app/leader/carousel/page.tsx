
'use client';

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { ArrowLeft } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { InteractiveCarousel } from "@/components/InteractiveCarousel";
import { CarouselProvider } from "@/contexts/carousel-context";

export default function CarouselPage() {
  return (
    <CarouselProvider>
        <div className="space-y-8">
        <div>
            <Button asChild variant="ghost" className="mb-4">
                <Link href="/leader/dashboard">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Dashboard
                </Link>
            </Button>
            <h1 className="text-3xl font-bold tracking-tight font-headline">
            Carousel Test Page
            </h1>
            <p className="text-muted-foreground">
            This is a dedicated page to test your new carousel component.
            </p>
        </div>

        <Card>
            <CardHeader>
            <CardTitle>Test Area</CardTitle>
            </CardHeader>
            <CardContent>
                <InteractiveCarousel />
            </CardContent>
        </Card>
        </div>
    </CarouselProvider>
  );
}

    