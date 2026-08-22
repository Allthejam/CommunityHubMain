"use client";

import * as React from "react";
import Image from "next/image";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { doc, getDoc, collection, query, orderBy } from "firebase/firestore";
import { useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import {
    ArrowLeft,
    Loader2,
    MapPin,
    HelpCircle,
    Phone,
    User,
    Mail,
    Shield,
    ShieldAlert,
    ExternalLink,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion";
import { Separator } from "@/components/ui/separator";

type CommunityProfileData = {
    headline?: string;
    introduction?: string;
    population?: string;
    area?: string;
    yearEstablished?: string;
    mainContent?: string;
    mapEmbedCode?: string;
    bannerImage?: string;
    imageOne?: string;
    imageTwo?: string;
    usefulInformation?: { name: string; number: string; address: string; }[];
    communityInformation?: {
        name: string;
        title: string;
        email: string;
        phone: string;
    }[];
    policeContact?: {
        stationName: string;
        officerName: string;
        contactEmail: string;
        contactPhone: string;
    };
    showLeadershipOnAboutPage?: boolean;
};

type CommunityData = {
    name?: string;
    profileId?: string;
}

type FaqItem = {
    id: string;
    question: string;
    answer: string;
    order: number;
}

export default function CommunityAboutPage() {
    const params = useParams();
    const router = useRouter();
    const communityId = params.communityId as string;
    const db = useFirestore();

    const [aboutData, setAboutData] = React.useState<CommunityProfileData | null>(null);
    const [communityName, setCommunityName] = React.useState("");
    const [loading, setLoading] = React.useState(true);
    const [isEmergencyPublic, setIsEmergencyPublic] = React.useState(false);
    
    const faqsQuery = useMemoFirebase(() => {
        if (!communityId || !db) return null;
        return query(collection(db, `communities/${communityId}/faqs`), orderBy("order", "asc"));
    }, [communityId, db]);
    
    const { data: faqs, isLoading: faqsLoading } = useCollection<FaqItem>(faqsQuery);

    React.useEffect(() => {
        if (!communityId || !db) return;

        const fetchAboutData = async () => {
            setLoading(true);
            try {
                const communityRef = doc(db, 'communities', communityId as string);
                const communitySnap = await getDoc(communityRef);

                if (communitySnap.exists()) {
                    const communityData = communitySnap.data() as CommunityData;
                    setCommunityName(communityData.name || "");

                    if (communityData.profileId) {
                        const profileRef = doc(db, 'community_profiles', communityData.profileId);
                        const profileSnap = await getDoc(profileRef);
                        if (profileSnap.exists()) {
                            setAboutData(profileSnap.data() as CommunityProfileData);
                        }
                    }
                }

                // Check if Emergency Action Plan is public
                const planRef = doc(db, 'communities', communityId as string, 'emergency_plan', 'main');
                const planSnap = await getDoc(planRef);
                if (planSnap.exists()) {
                    const planData = planSnap.data();
                    setIsEmergencyPublic(planData?.isPublicOnAboutPage === true);
                }
            } catch (error) {
                console.error("Failed to fetch community data:", error);
            } finally {
                setLoading(false);
            }
        };
        fetchAboutData();
    }, [communityId, db]);
    
    const handleScrollToFaq = () => {
        document.getElementById('faq-section')?.scrollIntoView({ behavior: 'smooth' });
    };

    if (loading || faqsLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    if (!aboutData) {
         return (
            <div className="text-center py-12">
                <h1 className="text-2xl font-bold">About {communityName}</h1>
                <p className="text-muted-foreground mt-4">This community hasn't created their "About" page yet.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/home"><ArrowLeft className="mr-2 h-4 w-4" />Back to Home</Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="container mx-auto bg-card p-4 sm:p-6 lg:p-8 rounded-2xl shadow-sm border space-y-8">
            {/* Top Navigation & Fast Links */}
            <div className="flex flex-wrap justify-between items-center gap-3">
                <Button variant="ghost" size="sm" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back
                </Button>
                
                <div className="flex items-center gap-2 flex-wrap">
                    {isEmergencyPublic && (
                        <Button
                            asChild
                            variant="outline"
                            size="sm"
                            className="bg-red-500/10 border-red-500/40 text-red-600 dark:text-red-400 hover:bg-red-500/20 font-bold gap-2 shadow-sm"
                        >
                            <Link href={`/community/${communityId}/emergency`}>
                                <ShieldAlert className="h-4 w-4 text-red-500" />
                                Emergency & Resilience
                            </Link>
                        </Button>
                    )}
                    {faqs && faqs.length > 0 && (
                        <Button variant="outline" size="sm" onClick={handleScrollToFaq}>
                            <HelpCircle className="mr-2 h-4 w-4" />
                            FAQs
                        </Button>
                    )}
                </div>
            </div>
            
            <div className="space-y-12">
                <div className="text-center">
                    <h1 className="text-3xl sm:text-4xl font-bold font-headline">{aboutData.headline || `About ${communityName}`}</h1>
                    {aboutData.introduction && (
                        <div 
                            className="mt-4 text-base sm:text-lg text-muted-foreground max-w-2xl mx-auto prose dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: aboutData.introduction }} 
                        />
                    )}
                </div>

                {aboutData.bannerImage && (
                    <div className="relative w-full h-72 sm:h-96 rounded-2xl overflow-hidden shadow-lg border">
                        <Image src={aboutData.bannerImage} alt="Community Banner" fill className="object-cover" priority />
                    </div>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <Card><CardHeader className="p-4"><CardTitle className="text-xl">{aboutData.population || "N/A"}</CardTitle><CardContent className="p-0"><p className="text-xs text-muted-foreground">Population</p></CardContent></CardHeader></Card>
                    <Card><CardHeader className="p-4"><CardTitle className="text-xl">{aboutData.area || "N/A"}</CardTitle><CardContent className="p-0"><p className="text-xs text-muted-foreground">Area</p></CardContent></CardHeader></Card>
                    <Card><CardHeader className="p-4"><CardTitle className="text-xl">{aboutData.yearEstablished || "N/A"}</CardTitle><CardContent className="p-0"><p className="text-xs text-muted-foreground">Established</p></CardContent></CardHeader></Card>
                </div>

                {aboutData.mainContent && (
                    <div 
                        className="prose dark:prose-invert max-w-none leading-relaxed"
                        dangerouslySetInnerHTML={{ __html: aboutData.mainContent }} 
                    />
                )}

                {/* Useful Contacts */}
                {aboutData.usefulInformation && aboutData.usefulInformation.length > 0 && (
                    <div className="pt-8 border-t">
                        <h2 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2 text-primary"><Phone className="h-6 w-6"/> Useful Contacts</h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {aboutData.usefulInformation.map((contact, index) => (
                                <Card key={index} className="bg-secondary/20 border-none">
                                    <CardHeader>
                                        <CardTitle className="text-lg">{contact.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm">
                                        <p className="font-bold text-foreground">{contact.number}</p>
                                        <p className="mt-1 text-muted-foreground">{contact.address}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

                {/* Police Contact */}
                {aboutData.policeContact?.stationName && (
                     <div className="pt-8 border-t">
                         <h2 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2 text-primary"><Shield className="h-6 w-6"/> Police & Community Safety</h2>
                         <Card className="max-w-md bg-destructive/5 border-destructive/20">
                            <CardHeader>
                                <CardTitle>{aboutData.policeContact.stationName}</CardTitle>
                                {aboutData.policeContact.officerName && <CardDescription>Lead: {aboutData.policeContact.officerName}</CardDescription>}
                            </CardHeader>
                            <CardContent className="space-y-3 text-sm">
                                <div className="flex items-center gap-2">
                                    <Phone className="h-4 w-4 text-muted-foreground" />
                                    <span>{aboutData.policeContact.contactPhone}</span>
                                </div>
                                {aboutData.policeContact.contactEmail && (
                                     <div className="flex items-center gap-2">
                                        <Mail className="h-4 w-4 text-muted-foreground" />
                                        <span>{aboutData.policeContact.contactEmail}</span>
                                    </div>
                                )}
                            </CardContent>
                         </Card>
                     </div>
                )}

                {/* Images */}
                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {aboutData.imageOne && (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-md border">
                            <Image src={aboutData.imageOne} alt="Community Image One" fill className="object-cover" />
                        </div>
                    )}
                     {aboutData.imageTwo && (
                        <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-md border">
                            <Image src={aboutData.imageTwo} alt="Community Image Two" fill className="object-cover" />
                        </div>
                    )}
                </div>

                {aboutData.mapEmbedCode && (
                    <div className="pt-8 border-t">
                         <h2 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2 text-primary"><MapPin className="h-6 w-6"/> Our Location</h2>
                         <div
                            className="aspect-video w-full rounded-md border bg-muted map-embed-container shadow-md"
                            dangerouslySetInnerHTML={{ __html: aboutData.mapEmbedCode }}
                        />
                    </div>
                )}
                
                {/* FAQs */}
                {faqs && faqs.length > 0 && (
                    <div id="faq-section" className="pt-8 border-t">
                        <h2 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2 text-primary"><HelpCircle className="h-6 w-6" /> Frequently Asked Questions</h2>
                        <Accordion type="single" collapsible className="w-full">
                            {faqs.map(faq => (
                                <AccordionItem key={faq.id} value={faq.id}>
                                    <AccordionTrigger className="text-lg font-semibold">{faq.question}</AccordionTrigger>
                                    <AccordionContent>
                                        <div className="prose dark:prose-invert max-w-none text-muted-foreground" dangerouslySetInnerHTML={{ __html: faq.answer }} />
                                    </AccordionContent>
                                </AccordionItem>
                            ))}
                        </Accordion>
                    </div>
                )}

                {/* Community Leadership */}
                {aboutData.showLeadershipOnAboutPage !== false && aboutData.communityInformation && aboutData.communityInformation.length > 0 && (
                    <div className="pt-8 border-t">
                        <h2 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2 text-primary"><User className="h-6 w-6"/> Community Leadership</h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {aboutData.communityInformation.map((leader, index) => (
                                <Card key={index} className="shadow-none border-dashed">
                                    <CardHeader>
                                        <CardTitle className="text-lg">{leader.name}</CardTitle>
                                        {leader.title && <CardDescription>{leader.title}</CardDescription>}
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground space-y-2">
                                        {leader.email && (
                                            <div className="flex items-center gap-2">
                                                <Mail className="h-4 w-4" />
                                                <a href={`mailto:${leader.email}`} className="hover:underline text-primary break-all">{leader.email}</a>
                                            </div>
                                        )}
                                        {leader.phone && (
                                            <div className="flex items-center gap-2">
                                                <Phone className="h-4 w-4" />
                                                <span>{leader.phone}</span>
                                            </div>
                                        )}
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
