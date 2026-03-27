
"use client";

import * as React from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { ArrowLeft, Loader2, MapPin } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardHeader, CardContent, CardTitle } from "@/components/ui/card";
import { useToast } from "@/hooks/use-toast";

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
        <div className="container mx-auto bg-card p-4 sm:p-6 lg:p-8 rounded-lg">
            <Button variant="ghost" onClick={() => router.back()} className="mb-4">
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Editor
            </Button>
            
            <div className="space-y-8">
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
                        <div className="relative w-full h-80 rounded-lg overflow-hidden shadow-lg">
                            <Image src={aboutData.bannerImage} alt={aboutData.bannerImageDescription || "Community Banner"} fill className="object-cover" />
                        </div>
                        {aboutData.bannerImageDescription && <figcaption className="text-xs text-muted-foreground text-center mt-2">{aboutData.bannerImageDescription}</figcaption>}
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

                <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                    {aboutData.imageOne && (
                         <figure>
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-md">
                                <Image src={aboutData.imageOne} alt={aboutData.imageOneDescription || "Community Image One"} fill className="object-cover" />
                            </div>
                            {aboutData.imageOneDescription && <figcaption className="text-xs text-muted-foreground text-center mt-2">{aboutData.imageOneDescription}</figcaption>}
                        </figure>
                    )}
                     {aboutData.imageTwo && (
                         <figure>
                            <div className="relative w-full aspect-video rounded-lg overflow-hidden shadow-md">
                                <Image src={aboutData.imageTwo} alt={aboutData.imageTwoDescription || "Community Image Two"} fill className="object-cover" />
                            </div>
                            {aboutData.imageTwoDescription && <figcaption className="text-xs text-muted-foreground text-center mt-2">{aboutData.imageTwoDescription}</figcaption>}
                        </figure>
                    )}
                </div>

                {aboutData.mapEmbedCode && (
                    <div>
                         <h2 className="text-2xl font-bold font-headline mb-4 flex items-center gap-2"><MapPin/> Our Location</h2>
                         <div
                            className="aspect-video w-full rounded-md border bg-muted map-embed-container shadow-md"
                            dangerouslySetInnerHTML={{ __html: aboutData.mapEmbedCode }}
                        />
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
