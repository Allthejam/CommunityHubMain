'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { Megaphone, Star, Handshake, ArrowRight, ArrowLeft, RotateCcw, Info } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import Link from 'next/link';
import { useToast } from '@/hooks/use-toast';

export default function CreateAdvertPage() {
  const router = useRouter();
  const { toast } = useToast();
  const [hasExistingDraft, setHasExistingDraft] = React.useState(false);

  React.useEffect(() => {
    const stored = sessionStorage.getItem('advertPreviewData');
    if (stored) {
      setHasExistingDraft(true);
    }
  }, []);

  const adTypes = [
    {
      type: 'featured',
      title: 'Featured Hero Advert',
      description: 'High-impact, full-width hero card displayed at the top of community hubs. Perfect for major brand awareness.',
      icon: Star,
      color: 'text-primary',
      bgColor: 'bg-primary/10',
      features: ['Full-width imagery', 'Rich HTML description', 'Direct website & email links', 'Priority placement'],
    },
    {
      type: 'partner',
      title: 'Valued Partner Slot',
      description: 'Join the scrolling marquee of trusted brands. Great for consistent, subtle presence across the entire platform.',
      icon: Handshake,
      color: 'text-amber-500',
      bgColor: 'bg-amber-100 dark:bg-amber-900/30',
      features: ['Marquee logo placement', 'Interactive popup bio', 'Lower entry cost', 'Platform-wide visibility'],
    }
  ];

  const handleSelect = (type: string) => {
    const stored = sessionStorage.getItem('advertPreviewData');
    if (stored) {
      const data = JSON.parse(stored);
      if (data.type !== type) {
        data.type = type;
        sessionStorage.setItem('advertPreviewData', JSON.stringify(data));
      }
    } else {
      sessionStorage.setItem('advertPreviewData', JSON.stringify({ type }));
    }
    router.push(`/national/adverts/create/content?type=${type}`);
  };

  const clearSession = () => {
    sessionStorage.removeItem('advertPreviewData');
    setHasExistingDraft(false);
    toast({ title: 'Session Cleared', description: 'You can now start a completely fresh campaign.' });
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-16">
      <div className="flex flex-col sm:flex-row justify-between sm:items-start gap-4">
        <div>
          <Button variant="ghost" asChild className="mb-4">
            <Link href="/national/adverts">
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Campaigns
            </Link>
          </Button>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-primary" />
            Create New National Campaign (Step 1 of 4)
          </h1>
          <p className="text-muted-foreground mt-2">
            Select the type of advertisement you would like to run across the platform.
          </p>
        </div>
        {hasExistingDraft && (
          <Button variant="outline" size="sm" onClick={clearSession} className="text-destructive hover:text-destructive shrink-0">
            <RotateCcw className="mr-2 h-4 w-4" />
            Clear Current Progress
          </Button>
        )}
      </div>

      {hasExistingDraft && (
        <Badge variant="secondary" className="px-4 py-2 text-sm bg-primary/10 text-primary border-primary/20">
          <Info className="mr-2 h-4 w-4" />
          You have a campaign in progress. Selecting a type will resume your session.
        </Badge>
      )}

      <div className="grid md:grid-cols-2 gap-8">
        {adTypes.map((item) => {
          const Icon = item.icon;
          return (
            <Card 
              key={item.type} 
              className="flex flex-col justify-between border-2 hover:border-primary transition-all duration-300 hover:shadow-xl group cursor-pointer"
              onClick={() => handleSelect(item.type)}
            >
              <CardHeader>
                <div className={`h-14 w-14 rounded-2xl ${item.bgColor} flex items-center justify-center mb-4 transition-transform group-hover:scale-110`}>
                  <Icon className={`h-7 w-7 ${item.color}`} />
                </div>
                <CardTitle className="text-2xl font-bold font-headline">{item.title}</CardTitle>
                <CardDescription className="text-sm mt-2">{item.description}</CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 border-t pt-4">
                  <span className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Key Benefits:</span>
                  <ul className="text-xs space-y-2 text-foreground/80">
                    {item.features.map((feature, i) => (
                      <li key={i} className="flex items-center gap-2">
                        <div className="h-1.5 w-1.5 rounded-full bg-primary" />
                        {feature}
                      </li>
                    ))}
                  </ul>
                </div>
              </CardContent>
              <CardFooter className="pt-4 border-t bg-muted/10">
                <Button className="w-full group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  Select {item.title}
                  <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
                </Button>
              </CardFooter>
            </Card>
          );
        })}
      </div>
    </div>
  );
}
