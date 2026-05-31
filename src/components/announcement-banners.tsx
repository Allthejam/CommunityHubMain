
'use client';
import { useRef, useState } from 'react';
import { type Announcement } from '@/lib/announcement-data';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Building, Globe } from 'lucide-react';
import { Badge } from './ui/badge';
import { Carousel, CarouselContent, CarouselItem } from './ui/carousel';
import Autoplay from "embla-carousel-autoplay"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from './ui/dialog';
import { ScrollArea } from './ui/scroll-area';
import { Button } from './ui/button';
import { cn } from '@/lib/utils';
import Image from 'next/image';

const AnnouncementItem = ({ announcement, context }: { announcement: Announcement, context: 'carousel' | 'dialog' }) => {
    const fromText = announcement.scope === 'platform' ? 'from The Administrators' : 'from Community Admin';
    const isUrgent = announcement.severity === 'urgent';
    const hasImage = !!announcement.image;

    const baseClasses = "p-4 rounded-lg border";
    const colorClasses = isUrgent
        ? "bg-amber-50 border-amber-200 dark:bg-amber-900/30 dark:border-amber-800"
        : "bg-blue-50 border-blue-200 dark:bg-blue-900/30 dark:border-blue-800";

    if (context === 'carousel') {
        return (
            <div className={cn(baseClasses, colorClasses, "h-full")}>
                <div className="flex justify-between items-start mb-2">
                    <h4 className={cn("font-semibold leading-tight line-clamp-1", isUrgent ? "text-amber-900 dark:text-amber-200" : "text-blue-900 dark:text-blue-200")}>{announcement.subject}</h4>
                    {isUrgent && <Badge variant="destructive" className="bg-amber-500 text-white flex-shrink-0">Urgent</Badge>}
                </div>
                <div className="flex gap-3">
                    {hasImage && (
                        <div className="relative w-16 h-16 rounded-md overflow-hidden flex-shrink-0">
                            <Image src={announcement.image!} alt={announcement.subject} fill className="object-cover"/>
                        </div>
                    )}
                    <div className="flex-1">
                        <p className={cn("text-sm line-clamp-2", isUrgent ? "text-amber-800 dark:text-amber-300" : "text-blue-800 dark:text-blue-300")} dangerouslySetInnerHTML={{ __html: announcement.message }} />
                        <p className="text-xs text-muted-foreground pt-2">{announcement.scheduledDates} - {fromText}</p>
                    </div>
                </div>
            </div>
        );
    }

    return (
        <div className={cn(baseClasses, colorClasses)}>
            {hasImage && (
                <div className="relative w-full aspect-video rounded-md overflow-hidden mb-4">
                    <Image src={announcement.image!} alt={announcement.subject} layout="fill" objectFit="cover" />
                </div>
            )}
            <div className="flex justify-between items-start mb-2">
                 <h3 className={cn("font-bold text-lg", isUrgent ? "text-amber-900 dark:text-amber-200" : "text-blue-900 dark:text-blue-200")}>{announcement.subject}</h3>
                {isUrgent && <Badge variant="destructive" className="bg-amber-500 text-white">Urgent</Badge>}
            </div>
            <div
                className="text-sm prose dark:prose-invert max-w-none"
                dangerouslySetInnerHTML={{ __html: announcement.message }}
            />
            <p className="text-xs text-muted-foreground pt-3 mt-3 border-t">{announcement.scheduledDates} - {fromText}</p>
        </div>
    );
};


const AnnouncementCarousel = ({ announcements, title, description, icon: Icon }: { announcements: Announcement[], title: string, description: string, icon: React.ElementType }) => {
    const plugin = useRef(
      Autoplay({ delay: 3000, stopOnInteraction: true })
    )
    const [isOpen, setIsOpen] = useState(false);

    return (
        <Dialog open={isOpen} onOpenChange={setIsOpen}>
            <DialogTrigger asChild>
                <Card className="h-full flex flex-col cursor-pointer bg-card hover:border-primary/20 transition-colors border-0 md:border md:rounded-lg rounded-none">
                    <CardHeader>
                        <CardTitle className="flex items-center gap-2 text-primary">
                            <Icon className="h-5 w-5" /> {title}
                        </CardTitle>
                        <CardDescription>
                            {description}
                        </CardDescription>
                    </CardHeader>
                    <CardContent className="flex-grow flex items-center justify-center p-2 md:p-6 md:pt-0">
                        <Carousel
                            opts={{
                                align: "start",
                                loop: announcements.length > 1,
                            }}
                            plugins={[plugin.current]}
                            onMouseEnter={plugin.current.stop}
                            onMouseLeave={plugin.current.reset}
                            className="w-full"
                            >
                            <CarouselContent className="-ml-2">
                                {announcements.map((announcement) => (
                                <CarouselItem key={announcement.id} className="pl-2">
                                    <AnnouncementItem announcement={announcement} context="carousel" />
                                </CarouselItem>
                                ))}
                            </CarouselContent>
                        </Carousel>
                    </CardContent>
                </Card>
            </DialogTrigger>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Icon className="h-6 w-6" />
                    {title}
                  </DialogTitle>
                  <DialogDescription>
                    All active announcements for this category.
                  </DialogDescription>
                </DialogHeader>
                <ScrollArea className="max-h-[60vh] -mx-6">
                  <div className="space-y-4 px-6">
                    {announcements.map((announcement) => (
                      <AnnouncementItem key={announcement.id} announcement={announcement} context="dialog" />
                    ))}
                  </div>
                </ScrollArea>
                <Button onClick={() => setIsOpen(false)} className="mt-4">
                  Close
                </Button>
              </DialogContent>
        </Dialog>
    )
}

export function AnnouncementBanners({ allAnnouncements }: { allAnnouncements: Announcement[] }) {
  const platformAnnouncements = allAnnouncements.filter(a => a.scope === 'platform');
  const communityAnnouncements = allAnnouncements.filter(a => a.scope === 'community');

  const hasPlatform = platformAnnouncements.length > 0;
  const hasCommunity = communityAnnouncements.length > 0;

  if (!hasPlatform && !hasCommunity) return null;

  return (
    <div className={cn(
        "grid grid-cols-1 gap-y-0 md:gap-6",
        hasPlatform && hasCommunity && "md:grid-cols-2"
    )}>
       {hasPlatform && (
        <AnnouncementCarousel 
            announcements={platformAnnouncements}
            title="Platform Announcements"
            description="Updates from the team."
            icon={Globe}
        />
       )}
        {hasCommunity && (
        <AnnouncementCarousel 
            announcements={communityAnnouncements}
            title="Community Announcements"
            description="Updates from local leaders."
            icon={Building}
        />
       )}
    </div>
  );
}
