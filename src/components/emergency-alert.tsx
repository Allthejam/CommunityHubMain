
'use client'

import { useEffect, useState, useRef } from 'react'
import { Megaphone } from 'lucide-react'
import Autoplay from "embla-carousel-autoplay"

import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { type Announcement } from '@/lib/announcement-data'
import {
  Carousel,
  CarouselContent,
  CarouselItem,
  CarouselNext,
  CarouselPrevious,
} from './ui/carousel'
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
} from '@/components/ui/dialog'
import { Button } from './ui/button'
import { ScrollArea } from './ui/scroll-area'
import { cn } from '@/lib/utils'
import Image from 'next/image';

type EmergencyAlertProps = {
  allBroadcasts: Announcement[]
}

export default function EmergencyAlert({ allBroadcasts }: EmergencyAlertProps) {
  const [isDialogOpen, setIsDialogOpen] = useState(false)
  const plugin = useRef(
    Autoplay({ delay: 4000, stopOnInteraction: true })
  )

  if (allBroadcasts.length === 0) {
    return null
  }

  return (
    <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
      <DialogTrigger asChild>
        <div className="cursor-pointer">
          <Carousel 
            opts={{ loop: true }} 
            plugins={[plugin.current]}
            onMouseEnter={plugin.current.stop}
            onMouseLeave={plugin.current.reset}
            className="w-full mb-6"
           >
              <CarouselContent>
                {allBroadcasts.map((announcement) => (
                  <CarouselItem key={announcement.id}>
                    <Alert variant="destructive" className={cn("bg-destructive/10 border-destructive border-2")}>
                        <div className="flex items-start gap-4">
                            {announcement.image && (
                                <div className="relative h-16 w-16 flex-shrink-0 rounded-md overflow-hidden">
                                    <Image src={announcement.image} alt={announcement.subject} fill className="object-cover" />
                                </div>
                            )}
                            <div className="flex-1">
                                <AlertTitle className="flex items-center gap-2"><Megaphone className="h-4 w-4" />{announcement.subject}</AlertTitle>
                                <AlertDescription
                                    className="line-clamp-2"
                                    dangerouslySetInnerHTML={{ __html: announcement.message }}
                                />
                            </div>
                        </div>
                    </Alert>
                  </CarouselItem>
                ))}
              </CarouselContent>
            </Carousel>
        </div>
      </DialogTrigger>
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Megaphone className="h-6 w-6" />
            Emergency Broadcasts
          </DialogTitle>
          <DialogDescription>
            Active critical alerts for the platform.
          </DialogDescription>
        </DialogHeader>
        <ScrollArea className="max-h-[60vh] pr-6">
          <div className="space-y-4">
            {allBroadcasts.map((announcement) => (
              <div key={announcement.id} className="p-4 rounded-lg border bg-secondary">
                 {announcement.image && (
                    <div className="relative w-full aspect-video rounded-md overflow-hidden mb-4">
                        <Image src={announcement.image} alt={announcement.subject} fill className="object-cover" />
                    </div>
                 )}
                <h3 className="font-bold text-lg mb-2">{announcement.subject}</h3>
                <div
                  className="text-sm text-secondary-foreground prose dark:prose-invert max-w-none"
                  dangerouslySetInnerHTML={{ __html: announcement.message }}
                />
              </div>
            ))}
          </div>
        </ScrollArea>
        <Button onClick={() => setIsDialogOpen(false)} className="mt-4">
          Close
        </Button>
      </DialogContent>
    </Dialog>
  )
}
