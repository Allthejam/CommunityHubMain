
"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MapPin, Phone, Shield, User, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle, CardDescription } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";
import { Separator } from "@/components/ui/separator";

type AboutPagePreview = {
    headline?: string;
    introduction?: string;
    population?: string;
    area?: string;
    yearEstablished?: string;
    mainContent?: string;
    mapEmbedCode?: string;
    bannerImage?: string;
    bannerImageDescription?: string;
    imageOne?: string;
    imageOneDescription?: string;
    imageTwo?: string;
    imageTwoDescription?: string;
    policeContact?: {
      stationName: string;
      officerName: string;
      contactEmail: string;
      contactPhone: string;
    };
    usefulInformation?: { name: string; number: string; address: string }[];
    communityInformation?: { name: string; title: string }[];
    showLeadershipOnAboutPage?: boolean;
};

const PreviewPageContent = () => {
    const router = useRouter();
    const { toast } = useToast();
    const [aboutData, setAboutData] = React.useState<AboutPagePreview | null>(null);
    const [loading, setLoading] = React.useState(true);

    React.useEffect(() => {
        try {
            const storedData = sessionStorage.getItem('aboutPagePreview');
            if (storedData) {
                setAboutData(JSON.parse(storedData));
            }
        } catch (error) {
            console.error("Failed to parse about page data from sessionStorage", error);
            toast({
                title: "Could Not Load Preview",
                description: "There was an error reading the preview data.",
                variant: "destructive"
            });
        } finally {
            setLoading(false);
        }
    }, [toast]);

    if (loading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            </div>
        );
    }
    
    if (!aboutData) {
        return (
             <div className="text-center py-12">
                <h1 className="text-2xl font-bold">No Preview Data Found</h1>
                <p className="text-muted-foreground">Please go back to the editor page and click "Preview" again.</p>
                <Button variant="link" className="mt-4" onClick={() => router.back()}>
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Editor
                </Button>
            </div>
        )
    }

    return (
        <div className="container mx-auto bg-card p-4 sm:p-6 lg:p-8 rounded-lg shadow-sm border">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Editor
            </Button>
            
            <div className="space-y-12">
                <div className="text-center">
                    <h1 className="text-4xl font-bold font-headline">{aboutData.headline || `About Your Community`}</h1>
                    {aboutData.introduction && (
                        <div 
                            className="mt-4 text-lg text-muted-foreground max-w-2xl mx-auto prose dark:prose-invert"
                            dangerouslySetInnerHTML={{ __html: aboutData.introduction }} 
                        />
                    )}
                </div>

                {aboutData.bannerImage && (
                    <figure>
                        <div className="relative w-full h-80 rounded-lg overflow-hidden shadow-lg border">
                            <Image src={aboutData.bannerImage} alt={aboutData.bannerImageDescription || "Community Banner"} fill className="object-cover" />
                        </div>
                    </figure>
                )}
                
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-center">
                    <Card><CardHeader><CardTitle>{aboutData.population || "N/A"}</CardTitle><CardContent className="p-0"><p className="text-sm text-muted-foreground">Population</p></CardContent></CardHeader></Card>
                    <Card><CardHeader><CardTitle>{aboutData.area || "N/A"}</CardTitle><CardContent className="p-0"><p className="text-sm text-muted-foreground">Area</p></CardContent></CardHeader></Card>
                    <Card><CardHeader><CardTitle>{aboutData.yearEstablished || "N/A"}</CardTitle><CardContent className="p-0"><p className="text-sm text-muted-foreground">Established</p></CardContent></CardHeader></Card>
                </div>

                {aboutData.mainContent && (
                    <div 
                        className="prose dark:prose-invert max-w-none"
                        dangerouslySetInnerHTML={{ __html: aboutData.mainContent }} 
                    />
                )}

                {aboutData.usefulInformation && aboutData.usefulInformation.length > 0 && (
                    <div>
                         <h2 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2 text-primary"><Phone className="h-6 w-6"/> Useful Contacts</h2>
                         <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {aboutData.usefulInformation.map((contact, index) => (
                                <Card key={index} className="bg-secondary/20">
                                    <CardHeader>
                                        <CardTitle className="text-lg">{contact.name}</CardTitle>
                                    </CardHeader>
                                    <CardContent className="text-sm text-muted-foreground">
                                        <p className="font-bold">{contact.number}</p>
                                        <p className="mt-1">{contact.address}</p>
                                    </CardContent>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}

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

                {aboutData.mapEmbedCode && (
                    <div>
                         <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2 text-primary"><MapPin className="h-6 w-6"/> Our Location</h2>
                         <div
                            className="aspect-video w-full rounded-md border bg-muted overflow-hidden shadow-md"
                            dangerouslySetInnerHTML={{ __html: aboutData.mapEmbedCode }}
                        />
                    </div>
                )}

                 {aboutData.showLeadershipOnAboutPage !== false && aboutData.communityInformation && aboutData.communityInformation.length > 0 && (
                    <div className="pt-8 border-t">
                        <h2 className="text-2xl font-bold font-headline mb-6 flex items-center gap-2 text-primary"><User className="h-6 w-6"/> Community Leadership</h2>
                        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                            {aboutData.communityInformation.map((leader, index) => (
                                <Card key={index}>
                                    <CardHeader>
                                        <CardTitle className="text-lg">{leader.name}</CardTitle>
                                        <CardDescription>{leader.title}</CardDescription>
                                    </CardHeader>
                                </Card>
                            ))}
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

export default function LeaderAboutPreviewPage() {
  return (
    <React.Suspense fallback={<div className="flex justify-center items-center h-screen"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
        <PreviewPageContent />
    </React.Suspense>
  )
}
