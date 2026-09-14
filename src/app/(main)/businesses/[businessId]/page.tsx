
"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDocs, collection, query, where, documentId, orderBy } from "firebase/firestore";
import { useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";
import {
    ArrowLeft,
    Loader2,
    Globe,
    Mail,
    Phone,
    MapPin,
    Share2,
    Camera,
    Clock,
    Search as SearchIcon,
    Megaphone,
    Calendar,
    Store,
    ExternalLink,
    ChevronLeft,
    ChevronRight,
    Send,
    UserCheck,
    Building2,
    Navigation,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { format } from "date-fns";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useToast } from "@/hooks/use-toast";
import { sendGroupEnquiryAction } from "@/lib/actions/groupEnquiryActions";


type GalleryImage = {
    id: string;
    url: string;
    description?: string;
}

type CommunitySelection = {
  id: string | null;
  country: string | null;
  state: string | null;
  region: string | null;
  community: string | null;
};

type BusinessProfile = {
    name?: string; // Legacy field
    businessName?: string;
    businessCategory?: string;
    shortDescription?: string;
    longDescription?: string;
    pageTwoIntro?: string;
    logoImage?: string;
    bannerImage?: string;
    website?: string;
    contactEmail?: string;
    contactNumber?: string;
    socialMedia?: string;
    addresses?: { addressLine1: string, city: string, postcode: string }[];
    primaryCommunityName?: string;
    additionalCommunities?: CommunitySelection[];
    openingHours?: any;
    pageTwoContent?: { id: string; text: string; image: string | null }[];
    pageThreeContent?: string;
    showPageTwo?: boolean;
    showPageThree?: boolean;
    pageThreeType?: 'contact' | 'custom' | 'minutes';
    meetingMinutes?: { id: string; title: string; date: any; content: string; pdfUrl?: string }[];
    keyContacts?: { id: string; name: string; role: string; email?: string; phone?: string; bio?: string }[];
    meetingLocation?: { venueName?: string; addressLine1?: string; city?: string; postcode?: string; meetingSchedule?: string; googleMapsUrl?: string };
    enableContactForm?: boolean;
    contactIntroText?: string;
    pageTwoTitle?: string;
    accountType?: string;
    status?: 'Approved' | 'Subscribed' | string; // Add other statuses if needed
};

type Advert = {
    id: string;
    title: string;
    price: string;
    image?: string;
    businessName?: string;
    shortDescription?: string;
    fullDescription?: string;
    description?: string;
    link?: string;
    status: 'Active' | 'Scheduled' | 'Approved';
    businessId?: string;
};

type CommunityEvent = {
    id: string;
    title: string;
    startDate: { toDate: () => Date };
    image?: string;
    dataAiHint?: string;
};

const hasOpeningHours = (hours: any) => {
    if (!hours || typeof hours !== 'object' || Object.keys(hours).length === 0) return false;
    // Check if any day has been given any time values or is explicitly marked as closed
    return Object.values(hours).some(dayData => {
        if (typeof dayData !== 'object' || dayData === null) return false;
        const d = dayData as any;
        return d.closed === true || d.morningOpen || d.morningClose || d.afternoonOpen || d.afternoonClose;
    });
};

const OpeningHours = ({ hours }: { hours: any }) => {
    if (!hours) return <p className="text-sm text-muted-foreground">Not specified.</p>;

    const days = ["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"];

    return (
        <TooltipProvider>
            <div className="space-y-2 text-sm">
                {days.map(day => {
                    const dayData = hours[day];
                    if (!dayData) return null;
                    
                    const morningSession = dayData.morningOpen && dayData.morningClose ? `${dayData.morningOpen} - ${dayData.morningClose}` : null;
                    const afternoonSession = dayData.afternoonOpen && dayData.afternoonClose ? `${dayData.afternoonOpen} - ${dayData.afternoonClose}` : null;

                    let summaryText;
                    let detailText;

                    if (dayData.closed) {
                        summaryText = 'Closed';
                        detailText = 'Closed all day';
                    } else if (morningSession && afternoonSession) {
                        summaryText = 'Open';
                        detailText = `${morningSession}, ${afternoonSession}`;
                    } else if (morningSession) {
                        summaryText = 'Open';
                        detailText = morningSession;
                    } else if (afternoonSession) {
                        summaryText = 'Open';
                        detailText = afternoonSession;
                    } else {
                        return null; // Don't render if no times and not explicitly closed
                    }

                    return (
                        <div key={day} className="flex justify-between items-center">
                            <span className="capitalize font-medium">{day}</span>
                            <Tooltip>
                                <TooltipTrigger asChild>
                                    <span className="text-muted-foreground text-xs cursor-help underline decoration-dotted">{summaryText}</span>
                                </TooltipTrigger>
                                <TooltipContent>
                                    <p>{detailText}</p>
                                </TooltipContent>
                            </Tooltip>
                        </div>
                    )
                })}
            </div>
        </TooltipProvider>
    )
}

const AdvertCard = ({ advert }: { advert: Advert }) => (
    <Dialog>
        <DialogTrigger asChild>
            <Card className="overflow-hidden group cursor-pointer flex flex-col h-full">
                <CardHeader className="p-0">
                    <div className="relative w-full aspect-video bg-muted">
                        {advert.image && (
                            <Image
                                src={advert.image}
                                alt={advert.title}
                                fill
                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                            />
                        )}
                    </div>
                </CardHeader>
                <CardHeader className="p-3">
                    <CardTitle className="text-base truncate">{advert.title}</CardTitle>
                </CardHeader>
                <CardContent className="flex-grow p-3 pt-0">
                    <p className="text-xs text-muted-foreground line-clamp-2">{advert.shortDescription || advert.description}</p>
                </CardContent>
                <CardFooter className="p-3 pt-0 mt-auto">
                    <div className="text-sm font-medium text-primary w-full text-center">
                        Learn More
                    </div>
                </CardFooter>
            </Card>
        </DialogTrigger>
        <DialogContent className="sm:max-w-xl">
            <DialogHeader>
                <DialogTitle>{advert.title}</DialogTitle>
                <DialogDescription>From {advert.businessName}</DialogDescription>
            </DialogHeader>
            <ScrollArea className="max-h-[60vh] pr-6">
                <div className="py-4 space-y-4">
                     <div className="relative w-full aspect-video rounded-md overflow-hidden bg-muted">
                        <Image src={advert.image || ''} alt={advert.title} fill className="object-contain p-4" />
                    </div>
                    <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: advert.fullDescription || advert.description || advert.shortDescription || '' }} />
                </div>
            </ScrollArea>
             <DialogFooter className="p-6 pt-4 border-t">
                {advert.businessId ? (
                    <Button asChild>
                        <Link href={`/businesses/${advert.businessId}`}>
                            <Store className="mr-2 h-4 w-4" />
                            Visit Business
                        </Link>
                    </Button>
                ) : (
                    <Button asChild variant="outline">
                        <a href={advert.link || '#'} target="_blank" rel="noopener noreferrer">
                            <ExternalLink className="mr-2 h-4 w-4" />
                            Visit Site
                        </a>
                    </Button>
                )}
            </DialogFooter>
        </DialogContent>
    </Dialog>
);


const BusinessAdverts = ({ businessId }: { businessId: string }) => {
    const db = useFirestore();
    const advertsQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(
            collection(db, 'adverts'),
            where('businessId', '==', businessId),
            where('status', 'in', ['Active', 'Scheduled', 'Approved'])
        );
    }, [db, businessId]);

    const { data: adverts, isLoading } = useCollection<Advert>(advertsQuery);

    if (isLoading) return <Card><CardContent className="p-4 flex justify-center items-center h-24"><Loader2 className="animate-spin" /></CardContent></Card>;
    if (!adverts || adverts.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 mt-4"><Megaphone className="h-5 w-5 text-primary" /> Special Offers</h2>
            {adverts.map(ad => (
                <AdvertCard key={ad.id} advert={ad} />
            ))}
        </div>
    );
};

const EventCard = ({ event }: { event: CommunityEvent }) => (
    <Link href={`/events/${event.id}`}>
        <Card className="overflow-hidden group cursor-pointer flex flex-col h-full hover:shadow-lg transition-shadow">
            {event.image && (
                <div className="relative aspect-video w-full">
                    <Image src={event.image} alt={event.title} fill className="object-cover" />
                </div>
            )}
            <CardHeader>
                <CardTitle className="text-base truncate">{event.title}</CardTitle>
                <CardDescription>{format(event.startDate.toDate(), "PPP")}</CardDescription>
            </CardHeader>
        </Card>
    </Link>
);

const BusinessEvents = ({ businessId }: { businessId: string }) => {
    const db = useFirestore();
    const eventsQuery = useMemoFirebase(() => {
        if (!db) return null;
        return query(
            collection(db, 'events'),
            where('businessId', '==', businessId),
            where('status', 'in', ['Live', 'Upcoming'])
        );
    }, [db, businessId]);

    const { data: events, isLoading } = useCollection<CommunityEvent>(eventsQuery);

    if (isLoading) return <Card><CardContent className="p-4 flex justify-center items-center h-24"><Loader2 className="animate-spin" /></CardContent></Card>;
    if (!events || events.length === 0) return null;

    return (
        <div className="space-y-4">
            <h2 className="text-lg font-semibold flex items-center gap-2 mt-4"><Calendar className="h-5 w-5 text-primary" /> Upcoming Events</h2>
            {events.map(event => (
                <EventCard key={event.id} event={event} />
            ))}
        </div>
    );
};

function GroupEnquiryForm({ groupId, groupName }: { groupId: string; groupName: string }) {
  const [senderName, setSenderName] = React.useState('');
  const [senderEmail, setSenderEmail] = React.useState('');
  const [senderPhone, setSenderPhone] = React.useState('');
  const [subject, setSubject] = React.useState('');
  const [message, setMessage] = React.useState('');
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!senderName.trim() || !senderEmail.trim() || !subject.trim() || !message.trim()) {
      toast({ title: 'Missing Information', description: 'Please fill in your name, email, subject, and message.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    try {
      const res = await sendGroupEnquiryAction({
        groupId,
        groupName,
        senderName,
        senderEmail,
        senderPhone,
        subject,
        message,
      });
      if (res.success) {
        toast({ title: 'Message Sent!', description: `Thank you, your enquiry has been sent to ${groupName}.` });
        setSenderName('');
        setSenderEmail('');
        setSenderPhone('');
        setSubject('');
        setMessage('');
      } else {
        toast({ title: 'Submission Failed', description: res.error || 'Could not send message.', variant: 'destructive' });
      }
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'An error occurred.', variant: 'destructive' });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Card className="border shadow-xs bg-card">
      <CardHeader className="pb-3">
        <CardTitle className="text-lg flex items-center gap-2">
          <Mail className="h-5 w-5 text-primary" />
          Send a Message to {groupName}
        </CardTitle>
        <CardDescription>
          Have a question, request, or want to get in touch? Send an enquiry directly to our team.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Your Name <span className="text-destructive">*</span></label>
              <Input
                placeholder="e.g., John Smith"
                value={senderName}
                onChange={(e) => setSenderName(e.target.value)}
                required
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Email Address <span className="text-destructive">*</span></label>
              <Input
                type="email"
                placeholder="e.g., john@example.com"
                value={senderEmail}
                onChange={(e) => setSenderEmail(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Phone Number (Optional)</label>
              <Input
                type="tel"
                placeholder="e.g., 07123 456789"
                value={senderPhone}
                onChange={(e) => setSenderPhone(e.target.value)}
              />
            </div>
            <div className="space-y-1.5">
              <label className="text-xs font-semibold text-foreground">Subject / Topic <span className="text-destructive">*</span></label>
              <Input
                placeholder="e.g., General Enquiry / Community Question"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                required
              />
            </div>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-foreground">Your Message <span className="text-destructive">*</span></label>
            <Textarea
              placeholder="Write your enquiry or message here..."
              rows={4}
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              required
            />
          </div>
          <Button type="submit" disabled={isSubmitting} className="w-full sm:w-auto">
            {isSubmitting ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Send className="mr-2 h-4 w-4" />}
            Send Enquiry
          </Button>
        </form>
      </CardContent>
    </Card>
  );
}


export default function BusinessProfilePage() {
    const params = useParams();
    const router = useRouter();
    const { businessId } = params;
    const db = useFirestore();
    const [activeTab, setActiveTab] = React.useState('page1');

    const [additionalCommunityNames, setAdditionalCommunityNames] = React.useState<string[]>([]);
    const [loadingCommunities, setLoadingCommunities] = React.useState(false);
    
    const [searchQuery, setSearchQuery] = React.useState("");
    const [selectedYear, setSelectedYear] = React.useState<string>("all");

    const businessRef = useMemoFirebase(() => {
        if (!businessId || !db) return null;
        return doc(db, 'businesses', businessId as string);
    }, [businessId, db]);

    const { data: profile, isLoading: loading } = useDoc<BusinessProfile>(businessRef);

    const galleryQuery = useMemoFirebase(() => {
        if (!businessId || !db) return null;
        return query(collection(db, `businesses/${businessId as string}/gallery`), orderBy('createdAt', 'desc'));
    }, [businessId, db]);
    const { data: gallery, isLoading: galleryLoading } = useCollection<GalleryImage>(galleryQuery);

    const allGalleryImages = React.useMemo(() => {
        const list: Array<{ id: string; url: string; description?: string }> = [];
        if (profile?.gallery && Array.isArray(profile.gallery)) {
            profile.gallery.forEach((g: any, i: number) => {
                if (g?.url) {
                    list.push({ id: g.id || `biz-g-${i}`, url: g.url, description: g.description });
                }
            });
        }
        if (gallery && gallery.length > 0) {
            gallery.forEach((g) => {
                if (g.url && !list.some((existing) => existing.url === g.url)) {
                    list.push({ id: g.id, url: g.url, description: g.description });
                }
            });
        }
        return list;
    }, [profile?.gallery, gallery]);

    const primaryCommunityRef = useMemoFirebase(() => {
        if (!profile?.primaryCommunityId || !db) return null;
        return doc(db, 'communities', profile.primaryCommunityId);
    }, [profile?.primaryCommunityId, db]);
    const { data: primaryCommunityData } = useDoc<any>(primaryCommunityRef);

    const availableYears = React.useMemo(() => {
        if (!profile?.meetingMinutes) return [];
        const years = new Set(profile.meetingMinutes.map(m => format(new Date(m.date.seconds * 1000), 'yyyy')));
        return ["all", ...Array.from(years).sort((a, b) => b.localeCompare(a))];
    }, [profile?.meetingMinutes]);

    const filteredMinutes = React.useMemo(() => {
        if (!profile?.meetingMinutes) return [];
        
        return profile.meetingMinutes
            .sort((a,b) => b.date.seconds - a.date.seconds)
            .filter(minute => {
                if (selectedYear === "all") return true;
                return format(new Date(minute.date.seconds * 1000), 'yyyy') === selectedYear;
            })
            .filter(minute => {
                if (!searchQuery) return true;
                const searchableText = `${minute.title} ${minute.content}`.toLowerCase();
                return searchableText.includes(searchQuery.toLowerCase());
            });
    }, [profile?.meetingMinutes, selectedYear, searchQuery]);


    React.useEffect(() => {
        if (profile?.additionalCommunities && profile.additionalCommunities.length > 0 && db) {
            setLoadingCommunities(true);
            const communityIds = profile.additionalCommunities
                .map(c => c.community)
                .filter((id): id is string => !!id && id.trim() !== '');

            if (communityIds.length > 0) {
                const q = query(collection(db, 'communities'), where(documentId(), 'in', communityIds));
                getDocs(q).then(snapshot => {
                    const names = snapshot.docs.map(doc => doc.data().name);
                    setAdditionalCommunityNames(names);
                    setLoadingCommunities(false);
                }).catch(error => {
                    console.error("Error fetching additional communities: ", error);
                    setLoadingCommunities(false);
                });
            } else {
                 setAdditionalCommunityNames([]);
                setLoadingCommunities(false);
            }
        } else {
            setAdditionalCommunityNames([]);
            setLoadingCommunities(false);
        }
    }, [profile, db]);

    if (loading || galleryLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }

    if (!profile) {
        return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold">Business Not Found</h1>
                <p className="text-muted-foreground">This business profile could not be found or has been removed.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/directory"><ArrowLeft className="mr-2 h-4 w-4" />Back to Directory</Link>
                </Button>
            </div>
        );
    }
    
    const primaryCommunityName = primaryCommunityData?.name || profile?.communityName || 'Local Community';

    const name = profile?.businessName || profile?.name || 'Business Name';
    const isCourier = profile?.accountType === 'courier' || profile?.businessCategory === 'courier';
    const categoryLabel = isCourier
        ? `Community Courier for "${primaryCommunityName}"`
        : (profile?.businessCategory?.split('-').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' & ') || 'Category');
    const primaryAddress = profile?.addresses?.[0] ? `${profile.addresses[0].addressLine1}, ${profile.addresses[0].city}, ${profile.addresses[0].postcode}` : 'No address provided';
    const getInitials = (n: string) => n.split(' ').map(part => part[0]).join('').toUpperCase();
    
    const page2Available = profile?.showPageTwo !== false && ((profile?.pageTwoContent && profile.pageTwoContent.length > 0) || !!profile?.pageTwoIntro);
    
    const page2TabTitle = isCourier ? 'Meet Our Team' : (profile?.pageTwoTitle || 'Our Team');
    const page3Type = profile?.pageThreeType || (profile?.keyContacts?.length || profile?.meetingLocation ? 'contact' : 'custom');
    const page3MinutesAvailable = page3Type === 'minutes' && profile?.showPageThree !== false && profile?.meetingMinutes && profile.meetingMinutes.length > 0;
    const page3CustomAvailable = page3Type === 'custom' && profile?.showPageThree !== false && !!profile?.pageThreeContent;
    const page3ContactAvailable = (page3Type === 'contact' || page3Type === 'custom') && profile?.showPageThree !== false && (
        (profile?.keyContacts && profile.keyContacts.length > 0) ||
        !!profile?.meetingLocation?.venueName ||
        profile?.enableContactForm !== false ||
        !!profile?.pageThreeContent
    );
    const page3Available = page3MinutesAvailable || page3ContactAvailable || page3CustomAvailable;
    const page3TabTitle = page3Type === 'minutes' ? 'Meeting Minutes' : (isCourier ? 'Contact & Depot' : 'Contact Us');

    return (
        <div className="max-w-6xl mx-auto">
             <Button variant="ghost" className="mb-4" onClick={() => router.back()}>
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back
            </Button>
            <Card className="overflow-hidden">
                {/* Clean Unobstructed Banner Image */}
                <div className="w-full h-48 md:h-64 relative bg-muted">
                    {profile.bannerImage ? (
                        <Image src={profile.bannerImage} alt={`${name} banner`} width={1200} height={300} className="w-full h-full object-cover" priority />
                    ) : <div className="h-full w-full bg-gradient-to-r from-purple-100 to-indigo-100" />}
                </div>

                {/* Clean Business Header Below Banner Image */}
                <div className="p-6 border-b bg-card relative">
                    <div className="flex flex-col md:flex-row md:items-end justify-between gap-4 -mt-16 md:-mt-20">
                        <div className="flex flex-col md:flex-row items-start md:items-end gap-4">
                            <div className="relative w-24 h-24 md:w-32 md:h-32 rounded-xl border-4 border-background overflow-hidden bg-card shadow-md shrink-0">
                                <Avatar className="h-full w-full">
                                    <AvatarImage src={profile.logoImage} alt={`${name} logo`} className="object-contain" />
                                    <AvatarFallback className="text-4xl">{getInitials(name)}</AvatarFallback>
                                </Avatar>
                            </div>
                            <div className="pt-2 md:pt-0">
                                <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-foreground font-headline">
                                    {name}
                                </h1>
                                <p className="text-muted-foreground text-sm font-medium">{categoryLabel}</p>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="p-6">
                   <div className="grid md:grid-cols-3 gap-8">
                       <div className="md:col-span-2 space-y-8">
                            {activeTab === 'page1' && (
                                <>
                                    <div>
                                        <h2 className="text-2xl font-semibold font-headline">
                                            {isCourier ? 'About Your Community Local Courier' : `About ${name}`}
                                        </h2>
                                        {!isCourier && profile.shortDescription && <p className="mt-4 text-lg text-muted-foreground font-light leading-relaxed">{profile.shortDescription}</p>}
                                        {profile.longDescription && (
                                            <div className="prose dark:prose-invert max-w-none text-muted-foreground mt-4" dangerouslySetInnerHTML={{ __html: profile.longDescription }}/>
                                        )}
                                    </div>
                                    
                                    {gallery && gallery.length > 0 && (
                                        <div>
                                            <h2 className="text-2xl font-semibold font-headline mb-4 flex items-center gap-2"><Camera /> Gallery</h2>
                                            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-4">
                                                {gallery.map((image, index) => (
                                                    <Dialog key={image.id}>
                                                        <DialogTrigger asChild>
                                                            <div className="relative aspect-square rounded-lg overflow-hidden cursor-pointer group">
                                                                <Image
                                                                    src={image.url}
                                                                    alt={image.description || `Gallery image ${index + 1}`}
                                                                    fill
                                                                    className="object-cover transition-transform duration-300 group-hover:scale-105"
                                                                />
                                                            </div>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-3xl">
                                                            <DialogHeader>
                                                                <DialogTitle>{image.description || `${name} - Image ${index + 1}`}</DialogTitle>
                                                            </DialogHeader>
                                                            <div className="relative aspect-video">
                                                                <Image
                                                                    src={image.url}
                                                                    alt={image.description || `Gallery image ${index + 1}`}
                                                                    fill
                                                                    className="object-contain"
                                                                />
                                                            </div>
                                                        </DialogContent>
                                                    </Dialog>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </>
                            )}
                             {activeTab === 'page2' && page2Available && (
                                <div className="space-y-8">
                                    <h2 className="text-2xl font-semibold font-headline">{page2TabTitle}</h2>
                                    {profile.pageTwoIntro && (
                                        <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: profile.pageTwoIntro }} />
                                    )}
                                    {profile.pageTwoIntro && profile.pageTwoContent && profile.pageTwoContent.length > 0 && (
                                        <Separator />
                                    )}
                                    {profile.pageTwoContent?.map((block, index) => {
                                        const isReversed = index % 2 !== 0;
                                        const textContent = <div className="prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: block.text }} />;
                                        const imageContent = block.image && (
                                            <div className="relative aspect-video rounded-lg overflow-hidden">
                                                <Image src={block.image} alt={`Content image ${index + 1}`} fill className="object-cover" />
                                            </div>
                                        );

                                        return (
                                            <div key={block.id} className="grid md:grid-cols-2 gap-8 items-center">
                                                {isReversed ? (
                                                    <>
                                                        {imageContent}
                                                        {textContent}
                                                    </>
                                                ) : (
                                                    <>
                                                        {textContent}
                                                        {imageContent}
                                                    </>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                            {activeTab === 'page3' && page3Available && (
                                page3Type === 'minutes' ? (
                                    <div className="space-y-4">
                                        <div className="flex flex-col sm:flex-row gap-4">
                                            <div className="relative flex-1">
                                                <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                                                <Input
                                                    placeholder="Search minutes..."
                                                    value={searchQuery}
                                                    onChange={(e) => setSearchQuery(e.target.value)}
                                                    className="pl-10"
                                                />
                                            </div>
                                            <Select value={selectedYear} onValueChange={setSelectedYear}>
                                                <SelectTrigger className="w-full sm:w-[180px]">
                                                    <SelectValue placeholder="Filter by year..." />
                                                </SelectTrigger>
                                                <SelectContent>
                                                    {availableYears.map(year => (
                                                        <SelectItem key={year} value={year}>
                                                            {year === 'all' ? 'All Years' : year}
                                                        </SelectItem>
                                                    ))}
                                                </SelectContent>
                                            </Select>
                                        </div>
                                        <Accordion type="single" collapsible className="w-full">
                                            {filteredMinutes.length > 0 ? (
                                                filteredMinutes?.map(minute => (
                                                    <AccordionItem value={minute.id} key={minute.id}>
                                                        <AccordionTrigger>
                                                            <div className="flex flex-col items-start text-left">
                                                                <span className="font-semibold">{minute.title}</span>
                                                                <span className="text-sm text-muted-foreground">{format(new Date(minute.date.seconds * 1000), 'PPP')}</span>
                                                            </div>
                                                        </AccordionTrigger>
                                                        <AccordionContent>
                                                            <div className="prose dark:prose-invert max-w-none text-sm" dangerouslySetInnerHTML={{ __html: minute.content }} />
                                                            {minute.pdfUrl && 
                                                                <div className="mt-4">
                                                                    <Button asChild size="sm">
                                                                        <a href={minute.pdfUrl} target="_blank" rel="noopener noreferrer">Download PDF</a>
                                                                    </Button>
                                                                </div>
                                                            }
                                                        </AccordionContent>
                                                    </AccordionItem>
                                                ))
                                            ) : (
                                                <div className="p-6 text-center text-muted-foreground">
                                                    No meeting minutes match your criteria.
                                                </div>
                                            )}
                                        </Accordion>
                                    </div>
                                ) : (
                                    <div className="space-y-8">
                                        <div>
                                            <h2 className="text-2xl font-semibold font-headline mb-2">{page3TabTitle}</h2>
                                            <p className="text-muted-foreground text-sm">
                                                {profile.contactIntroText || `Get in touch with the team at ${name}, view key department contacts, or send us a direct message.`}
                                            </p>
                                            {profile.pageThreeContent && (
                                                <div className="prose dark:prose-invert max-w-none mt-4 text-sm" dangerouslySetInnerHTML={{ __html: profile.pageThreeContent }} />
                                            )}
                                        </div>

                                        {/* Section 1: Key Contacts Directory */}
                                        {profile.keyContacts && profile.keyContacts.length > 0 && (
                                            <div className="space-y-4">
                                                <h3 className="text-lg font-semibold font-headline flex items-center gap-2">
                                                    <UserCheck className="h-5 w-5 text-primary" />
                                                    Key Contacts & Department Personnel
                                                </h3>
                                                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                    {profile.keyContacts.map((contact, idx) => (
                                                        <Card key={contact.id || idx} className="border shadow-xs hover:border-primary/40 transition-colors">
                                                            <CardContent className="p-4 space-y-2.5">
                                                                <div>
                                                                    <p className="font-bold text-base text-foreground leading-snug">{contact.name}</p>
                                                                    <Badge variant="secondary" className="mt-1 font-medium text-xs">
                                                                        {contact.role}
                                                                    </Badge>
                                                                </div>
                                                                {contact.bio && (
                                                                    <p className="text-xs text-muted-foreground line-clamp-2">{contact.bio}</p>
                                                                )}
                                                                <div className="pt-2 flex flex-wrap gap-2 text-xs">
                                                                    {contact.email && (
                                                                        <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                                                                            <a href={`mailto:${contact.email}`}>
                                                                                <Mail className="h-3.5 w-3.5 text-primary" />
                                                                                {contact.email}
                                                                            </a>
                                                                        </Button>
                                                                    )}
                                                                    {contact.phone && (
                                                                        <Button asChild variant="outline" size="sm" className="h-8 text-xs gap-1.5">
                                                                            <a href={`tel:${contact.phone}`}>
                                                                                <Phone className="h-3.5 w-3.5 text-primary" />
                                                                                {contact.phone}
                                                                            </a>
                                                                        </Button>
                                                                    )}
                                                                </div>
                                                            </CardContent>
                                                        </Card>
                                                    ))}
                                                </div>
                                            </div>
                                        )}

                                        {/* Section 2: Meeting / Office Venue Location */}
                                        {profile.meetingLocation?.venueName && (
                                            <Card className="border shadow-xs bg-slate-50/50 dark:bg-slate-900/40">
                                                <CardHeader className="pb-3">
                                                    <CardTitle className="text-lg flex items-center gap-2">
                                                        <Building2 className="h-5 w-5 text-primary" />
                                                        Meeting Location & Venue
                                                    </CardTitle>
                                                </CardHeader>
                                                <CardContent className="space-y-3 text-sm">
                                                    <div>
                                                        <p className="font-semibold text-foreground text-base">{profile.meetingLocation.venueName}</p>
                                                        <p className="text-muted-foreground mt-0.5">
                                                            {[profile.meetingLocation.addressLine1, profile.meetingLocation.city, profile.meetingLocation.postcode].filter(Boolean).join(', ')}
                                                        </p>
                                                    </div>
                                                    {profile.meetingLocation.meetingSchedule && (
                                                        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground bg-background p-2.5 rounded-md border">
                                                            <Clock className="h-4 w-4 text-primary shrink-0" />
                                                            <span>Schedule: {profile.meetingLocation.meetingSchedule}</span>
                                                        </div>
                                                    )}
                                                    <div>
                                                        <Button asChild variant="outline" size="sm" className="gap-2">
                                                            <a
                                                                href={profile.meetingLocation.googleMapsUrl || `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent([profile.meetingLocation.venueName, profile.meetingLocation.addressLine1, profile.meetingLocation.city, profile.meetingLocation.postcode].filter(Boolean).join(', '))}`}
                                                                target="_blank"
                                                                rel="noopener noreferrer"
                                                            >
                                                                <Navigation className="h-4 w-4 text-primary" />
                                                                Get Directions on Google Maps
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </CardContent>
                                            </Card>
                                        )}

                                        {/* Section 3: Interactive Message Enquiry Form */}
                                        {profile.enableContactForm !== false && (
                                            <GroupEnquiryForm groupId={businessId as string} groupName={name} />
                                        )}
                                    </div>
                                )
                            )}
                       </div>
                        <div className="space-y-4">
                            <Card>
                                <CardContent className="p-2">
                                    <div className="flex flex-col gap-1">
                                        <Button variant={activeTab === 'page1' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('page1')} className="justify-start">Profile</Button>
                                        <Button variant={activeTab === 'page2' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('page2')} disabled={!page2Available} className="justify-start">{page2TabTitle}</Button>
                                        <Button variant={activeTab === 'page3' ? 'secondary' : 'ghost'} onClick={() => setActiveTab('page3')} disabled={!page3Available} className="justify-start">{page3TabTitle}</Button>
                                    </div>
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Contact & Links</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div className="flex items-start gap-3">
                                        <MapPin className="h-4 w-4 mt-1 text-muted-foreground flex-shrink-0" />
                                        <a href={`https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(primaryAddress)}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">{primaryAddress}</a>
                                    </div>
                                    {profile.contactNumber && (
                                    <div className="flex items-center gap-3">
                                        <Phone className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <a href={`tel:${profile.contactNumber}`} className="text-primary hover:underline break-all">{profile.contactNumber}</a>
                                    </div>
                                    )}
                                    {profile.contactEmail && (
                                    <div className="flex items-center gap-3">
                                        <Mail className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <a href={`mailto:${profile.contactEmail}`} className="text-primary hover:underline break-all">{profile.contactEmail}</a>
                                    </div>
                                    )}
                                    {profile.website && (
                                    <div className="flex items-center gap-3">
                                        <Globe className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <a href={profile.website.startsWith('http') ? profile.website : `https://${profile.website}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">Visit Website</a>
                                    </div>
                                    )}
                                    {profile.socialMedia && (
                                    <div className="flex items-center gap-3">
                                        <Share2 className="h-4 w-4 text-muted-foreground flex-shrink-0" />
                                        <a href={profile.socialMedia.startsWith('http') ? profile.socialMedia : `https://${profile.socialMedia}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline break-all">Social Media</a>
                                    </div>
                                    )}
                                </CardContent>
                            </Card>
                            <Card>
                                <CardHeader>
                                    <CardTitle className="text-lg">Communities</CardTitle>
                                </CardHeader>
                                <CardContent className="space-y-3 text-sm">
                                    <div>
                                        <p className="font-semibold">Primary Community</p>
                                        <p className="text-muted-foreground font-medium">{primaryCommunityName}</p>
                                    </div>
                                    {loadingCommunities ? <Loader2 className="h-4 w-4 animate-spin" /> : (
                                        additionalCommunityNames.length > 0 && (
                                            <div>
                                                <p className="font-semibold mt-2">Also in</p>
                                                <ul className="list-disc pl-5 text-muted-foreground">
                                                    {additionalCommunityNames.map((name, index) => (
                                                        <li key={index}>{name}</li>
                                                    ))}
                                                </ul>
                                            </div>
                                        )
                                    )}
                                </CardContent>
                            </Card>
                             <BusinessAdverts businessId={businessId as string} />
                            <BusinessEvents businessId={businessId as string} />
                             {hasOpeningHours(profile.openingHours) && (
                                 <Card>
                                     <CardHeader>
                                         <CardTitle className="text-lg flex items-center gap-2">
                                             <Clock className="h-5 w-5" /> Opening Hours
                                         </CardTitle>
                                     </CardHeader>
                                     <CardContent>
                                         <OpeningHours hours={profile.openingHours} />
                                     </CardContent>
                                 </Card>
                             )}
                         </div>
                    </div>
                 </div>
             </Card>

            {/* Bottom Highlight Courier Gallery Carousel */}
            {allGalleryImages.length > 0 && (
                <CourierGalleryCarousel images={allGalleryImages} />
            )}
        </div>
    );
}

function CourierGalleryCarousel({ images }: { images: Array<{ id: string; url: string; description?: string }> }) {
  const [activeIndex, setActiveIndex] = React.useState(0);
  const [selectedImage, setSelectedImage] = React.useState<{ url: string; description?: string } | null>(null);
  const [isPaused, setIsPaused] = React.useState(false);

  React.useEffect(() => {
    if (!images || images.length <= 1 || isPaused || selectedImage) return;

    const timer = setInterval(() => {
      setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
    }, 3500);

    return () => clearInterval(timer);
  }, [images, isPaused, selectedImage]);

  if (!images || images.length === 0) return null;

  const handlePrev = () => {
    setActiveIndex((prev) => (prev === 0 ? images.length - 1 : prev - 1));
  };

  const handleNext = () => {
    setActiveIndex((prev) => (prev === images.length - 1 ? 0 : prev + 1));
  };

  return (
    <Card 
      className="mt-8 border bg-card overflow-hidden shadow-sm"
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <CardHeader className="pb-2 flex flex-row items-center justify-between border-b bg-muted/20">
        <div>
          <CardTitle className="text-xl font-bold font-headline flex items-center gap-2">
            <Camera className="h-5 w-5 text-purple-600" />
            Courier Photo Showcase
          </CardTitle>
          <CardDescription className="text-xs">
            Browse delivery fleet, package handling, and local community service photos.
          </CardDescription>
        </div>
        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="icon" onClick={handlePrev} className="h-8 w-8 rounded-full">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button variant="outline" size="icon" onClick={handleNext} className="h-8 w-8 rounded-full">
            <ChevronRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="py-8 px-4">
        {/* Carousel Slider Container */}
        <div className="relative flex items-center justify-center min-h-[280px] overflow-hidden py-4">
          <div className="flex items-center justify-center gap-3 sm:gap-6 w-full max-w-5xl transition-all duration-500 ease-out">
            {[-1, 0, 1].map((offset) => {
              const imageIndex = (activeIndex + offset + images.length) % images.length;
              const img = images[imageIndex];
              const isCenter = offset === 0;

              return (
                <div
                  key={`${img.id}-${offset}`}
                  onClick={() => {
                    if (isCenter) {
                      setSelectedImage(img);
                    } else {
                      setActiveIndex(imageIndex);
                    }
                  }}
                  className={`relative rounded-xl overflow-hidden cursor-pointer transition-all duration-500 ease-in-out transform shrink-0 ${
                    isCenter
                      ? 'w-64 sm:w-80 md:w-[420px] aspect-video scale-110 z-20 shadow-2xl ring-4 ring-purple-600/80 opacity-100'
                      : 'w-36 sm:w-48 md:w-60 aspect-video scale-90 z-10 opacity-60 hover:opacity-90 shadow-md grayscale-[20%]'
                  }`}
                >
                  <Image
                    src={img.url}
                    alt={img.description || 'Courier Gallery Photo'}
                    fill
                    className="object-cover"
                  />
                  {isCenter && (
                    <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-transparent to-transparent flex items-end p-3 text-white">
                      <p className="text-xs font-medium truncate">{img.description || 'Click to view full photo'}</p>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>

        {/* Carousel Pagination Dots */}
        <div className="flex justify-center items-center gap-1.5 mt-4">
          {images.map((img, idx) => (
            <button
              key={img.id}
              onClick={() => setActiveIndex(idx)}
              className={`h-2 rounded-full transition-all ${
                idx === activeIndex ? 'w-6 bg-purple-600' : 'w-2 bg-muted-foreground/30 hover:bg-muted-foreground/60'
              }`}
              title={`Photo ${idx + 1}`}
            />
          ))}
        </div>
      </CardContent>

      {/* Full Photo Dialog Modal */}
      {selectedImage && (
        <Dialog open={!!selectedImage} onOpenChange={() => setSelectedImage(null)}>
          <DialogContent className="max-w-4xl">
            <DialogHeader>
              <DialogTitle className="text-base flex items-center gap-2">
                <Camera className="h-4 w-4 text-purple-600" />
                {selectedImage.description || 'Courier Photo Preview'}
              </DialogTitle>
            </DialogHeader>
            <div className="relative aspect-video w-full overflow-hidden rounded-lg bg-black">
              <Image
                src={selectedImage.url}
                alt={selectedImage.description || 'Courier Photo'}
                fill
                className="object-contain"
              />
            </div>
          </DialogContent>
        </Dialog>
      )}
    </Card>
  );
}
