'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Megaphone, Eye, Clipboard, Check, Download, Image as ImageIcon } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';
import { getLeaderMarketingHubDataAction } from '@/lib/actions/marketingActions';

type MarketingCampaign = {
    id: string;
    audience: string;
    feature: string;
    headline: string;
    body: string;
    socialMediaPost: string;
    coverImageUrl?: string;
    isMainAppVisible?: boolean;
    updatedAt: string;
    createdAt?: string;
};

type GalleryImage = {
    id: string;
    url: string;
    description: string;
    path?: string;
};

const CopyToClipboardButton = ({ textToCopy, isHtml = false }: { textToCopy: string; isHtml?: boolean }) => {
    const [copied, setCopied] = React.useState(false);
    const { toast } = useToast();

    const handleCopy = () => {
        let text = textToCopy;
        if (isHtml) {
            const tempDiv = document.createElement('div');
            tempDiv.innerHTML = textToCopy;
            text = tempDiv.textContent || tempDiv.innerText || "";
        }

        navigator.clipboard.writeText(text).then(() => {
            setCopied(true);
            toast({ title: 'Copied to clipboard!' });
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            toast({ title: 'Error', description: 'Failed to copy text.', variant: 'destructive' });
        });
    };

    return (
        <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
        </Button>
    );
};

const MarketingImageGallery = ({ images, isLoading }: { images: GalleryImage[]; isLoading: boolean }) => {
    const { toast } = useToast();

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        toast({ title: "Image URL Copied!" });
    };

    const formatImageDescription = (image: GalleryImage) => {
        if (image.description && image.description !== 'Auto-indexed from Storage' && image.description !== 'Community Hub Promotional Artwork') {
            return image.description;
        }
        const path = image.path || image.url || '';
        const filename = path.split('/').pop()?.split('?')[0] || 'marketing-image.jpg';
        return filename.replace(/[-_]/g, ' ').replace(/\.[^/.]+$/, "");
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle className="flex items-center gap-2">
                    <ImageIcon className="h-5 w-5" />
                    Marketing Image Gallery
                </CardTitle>
                <CardDescription>
                    A collection of promotional images and platform screenshots provided for your marketing efforts.
                </CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : images && images.length > 0 ? (
                    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((image) => {
                            const description = formatImageDescription(image);
                            const isBase64 = image.url && image.url.startsWith('data:');
                            return (
                                <div key={image.id} className="group relative rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden flex flex-col justify-between">
                                    <div className="relative aspect-video w-full bg-muted overflow-hidden flex items-center justify-center">
                                        {isBase64 ? (
                                            <img
                                                src={image.url}
                                                alt={description}
                                                className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        ) : (
                                            <Image
                                                src={image.url}
                                                alt={description}
                                                fill
                                                sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 25vw"
                                                className="object-cover transition-transform duration-300 group-hover:scale-105"
                                            />
                                        )}
                                    </div>
                                    <div className="p-3 bg-card flex flex-col justify-between flex-grow">
                                        <p className="text-xs font-medium text-foreground line-clamp-1 capitalize mb-2" title={description}>
                                            {description}
                                        </p>
                                        <div className="flex gap-2">
                                            <Button
                                                size="sm"
                                                variant="secondary"
                                                className="flex-1 text-xs h-8"
                                                onClick={() => handleCopyUrl(image.url)}
                                            >
                                                <Clipboard className="mr-1.5 h-3.5 w-3.5" /> Copy URL
                                            </Button>
                                            <Button asChild size="sm" variant="outline" className="text-xs h-8">
                                                <a href={image.url} download={`marketing-image-${image.id}.jpg`} target="_blank" rel="noopener noreferrer">
                                                    <Download className="mr-1.5 h-3.5 w-3.5" /> Download
                                                </a>
                                            </Button>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                ) : (
                    <p className="text-center text-muted-foreground py-10">The marketing gallery is currently empty.</p>
                )}
            </CardContent>
        </Card>
    );
};

export default function LeaderMarketingPage() {
    const [campaigns, setCampaigns] = React.useState<MarketingCampaign[]>([]);
    const [gallery, setGallery] = React.useState<GalleryImage[]>([]);
    const [isLoading, setIsLoading] = React.useState(true);

    React.useEffect(() => {
        let isMounted = true;
        async function loadData() {
            try {
                const isDemo = typeof window !== 'undefined' && window.location.pathname.startsWith('/demo');
                const res = await getLeaderMarketingHubDataAction(isDemo);
                if (isMounted && res.success) {
                    setCampaigns(res.campaigns || []);
                    setGallery(res.gallery || []);
                }
            } catch (error) {
                console.error("Failed to load marketing data:", error);
            } finally {
                if (isMounted) setIsLoading(false);
            }
        }
        loadData();
        return () => { isMounted = false; };
    }, []);

    const formatUpdatedDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
        } catch {
            return 'Recently';
        }
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Megaphone className="h-8 w-8 text-primary" />
                    Marketing Materials
                </h1>
                <p className="text-muted-foreground">
                    Use these pre-made campaigns to promote Community Hub to your local area.
                </p>
            </div>

            <Card>
                <CardHeader>
                    <CardTitle>Available Campaigns</CardTitle>
                    <CardDescription>
                        A library of marketing content created by the platform administrators.
                    </CardDescription>
                </CardHeader>
                <CardContent>
                    <div className="rounded-md border">
                        <Table>
                            <TableHeader>
                                <TableRow>
                                    <TableHead>Headline</TableHead>
                                    <TableHead>Audience</TableHead>
                                    <TableHead>Feature</TableHead>
                                    <TableHead>Last Updated</TableHead>
                                    <TableHead className="text-right">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : campaigns && campaigns.length > 0 ? (
                                    campaigns.map((campaign) => (
                                        <TableRow key={campaign.id}>
                                            <TableCell className="font-medium max-w-md">{campaign.headline}</TableCell>
                                            <TableCell className="whitespace-nowrap">{campaign.audience}</TableCell>
                                            <TableCell className="whitespace-nowrap">{campaign.feature}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                {formatUpdatedDate(campaign.updatedAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm">
                                                            <Eye className="mr-2 h-4 w-4" /> View & Use
                                                        </Button>
                                                    </DialogTrigger>
                                                    <DialogContent className="max-w-2xl">
                                                        <DialogHeader>
                                                            <DialogTitle>{campaign.headline}</DialogTitle>
                                                        </DialogHeader>
                                                        <ScrollArea className="max-h-[70vh] pr-4">
                                                            <div className="space-y-6 py-4">
                                                                {campaign.coverImageUrl && (
                                                                    <div className="relative w-full aspect-video rounded-lg overflow-hidden">
                                                                        <Image
                                                                            src={campaign.coverImageUrl}
                                                                            alt="Campaign cover image"
                                                                            fill
                                                                            className="object-cover"
                                                                        />
                                                                    </div>
                                                                )}
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between items-center">
                                                                        <Label className="text-lg font-semibold">Body Text</Label>
                                                                        <CopyToClipboardButton textToCopy={campaign.body} isHtml={true} />
                                                                    </div>
                                                                    <div
                                                                        className="p-4 border rounded-md bg-background prose dark:prose-invert max-w-none text-foreground"
                                                                        dangerouslySetInnerHTML={{ __html: campaign.body }}
                                                                    />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between items-center">
                                                                        <Label className="text-lg font-semibold">Social Media Post</Label>
                                                                        <CopyToClipboardButton textToCopy={campaign.socialMediaPost} />
                                                                    </div>
                                                                    <Alert variant="default" className="bg-background">
                                                                        <AlertDescription className="text-foreground">{campaign.socialMediaPost}</AlertDescription>
                                                                    </Alert>
                                                                </div>
                                                            </div>
                                                        </ScrollArea>
                                                    </DialogContent>
                                                </Dialog>
                                            </TableCell>
                                        </TableRow>
                                    ))
                                ) : (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-24 text-muted-foreground">
                                            No marketing campaigns available yet.
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <MarketingImageGallery images={gallery} isLoading={isLoading} />
        </div>
    );
}
