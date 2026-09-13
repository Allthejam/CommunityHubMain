'use client';

import * as React from 'react';
import { useCollection, useFirestore, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy, where, limit } from 'firebase/firestore';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Loader2, Megaphone, Eye, Clipboard, Check, Download } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import Image from 'next/image';

type MarketingCampaign = {
    id: string;
    audience: string;
    feature: string;
    headline: string;
    body: string;
    socialMediaPost: string;
    coverImageUrl?: string;
    updatedAt: { toDate: () => Date };
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
        }).catch(err => {
            toast({ title: 'Error', description: 'Failed to copy text.', variant: 'destructive' });
        });
    };

    return (
        <Button variant="ghost" size="icon" onClick={handleCopy} className="h-7 w-7">
            {copied ? <Check className="h-4 w-4 text-green-500" /> : <Clipboard className="h-4 w-4" />}
        </Button>
    )
}

const MarketingImageGallery = () => {
    const db = useFirestore();
    const { toast } = useToast();

    // Query for the platform_marketing_gallery directly
    const galleryQuery = useMemoFirebase(() => 
        db ? query(collection(db, "platform_marketing_gallery")) : null
    , [db]);
    const { data: images, isLoading } = useCollection(galleryQuery);

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        toast({ title: "Image URL Copied!" });
    };

    const formatImageDescription = (image: any) => {
        if (image.description && image.description !== 'Auto-indexed from Storage') {
            return image.description;
        }
        const path = image.path || image.url || '';
        const filename = path.split('/').pop() || '';
        let cleanName = decodeURIComponent(filename);
        // Strip timestamp prefix if any (e.g., 1777118925899-Name)
        cleanName = cleanName.replace(/^\d+-/, '');
        // Strip file extension
        cleanName = cleanName.replace(/\.[^/.]+$/, "");
        // Replace hyphens and underscores with spaces
        cleanName = cleanName.replace(/[-_]/g, ' ');
        return cleanName || 'Marketing Image';
    };

    return (
        <Card>
            <CardHeader>
                <CardTitle>Image Gallery</CardTitle>
                <CardDescription>Copy the URL or download any image to use in your own announcements or content.</CardDescription>
            </CardHeader>
            <CardContent>
                {isLoading ? (
                    <div className="flex justify-center items-center h-48">
                        <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
                    </div>
                ) : images && images.length > 0 ? (
                    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
                        {images.map((image: any) => {
                            const description = formatImageDescription(image);
                            return (
                                <div key={image.id} className="group relative aspect-square">
                                    <Image
                                        src={image.url}
                                        alt={description}
                                        fill
                                        className="object-cover rounded-md border"
                                    />
                                    <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md p-2">
                                        <div className="text-center">
                                            <p className="text-white text-xs mb-2 line-clamp-2">{description}</p>
                                            <div className="flex flex-col gap-2">
                                                <Button size="sm" variant="secondary" onClick={() => handleCopyUrl(image.url)}>
                                                    <Clipboard className="mr-2 h-4 w-4" /> Copy URL
                                                </Button>
                                                <Button asChild size="sm" variant="outline" className="text-black">
                                                    <a href={image.url} download={`marketing-image-${image.id}.jpg`}>
                                                        <Download className="mr-2 h-4 w-4" /> Download
                                                    </a>
                                                </Button>
                                            </div>
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
    )
}

const DEFAULT_CAMPAIGNS = [
    {
        id: 'merchant-outreach-1',
        headline: 'High Street Merchant Invitation: Boost Local Footfall & Online Orders for £20/mo',
        audience: 'Local Shops, Cafés & Trades',
        feature: 'Virtual High Street & Directory',
        body: `<h3>Join Your Town's Official Digital High Street</h3>
<p>Dear Local Business Owner,</p>
<p>Our Community Council has launched the official <strong>Community Hub</strong> digital platform to defend and revitalise local independent trade. For just <strong>£20/month</strong>, your business receives:</p>
<ul>
  <li>A dedicated interactive storefront profile in the town's official mobile app and web portal.</li>
  <li>Option for Click &amp; Collect ordering and local doorstep courier delivery.</li>
  <li>Direct reach to verified local residents without paying advertising fees to big-tech social media monopolies.</li>
  <li><strong>Civic Reinvestment:</strong> Up to 60% of your subscription is returned directly to our Council Treasury to fund town projects, lights, defibs, and floral displays.</li>
</ul>
<p>Visit <strong>my-community-hub.co.uk</strong> to register your business today and put your shop on our digital town map!</p>`,
        socialMediaPost: `🏪 Local business owners in our community! Put your shop, cafe, or trade on our town's official mobile app for just £20/mo. Get online orders, doorstep courier delivery, and keep local trade thriving. Register today at my-community-hub.co.uk!`,
        updatedAt: { toDate: () => new Date() }
    },
    {
        id: 'resident-launch-2',
        headline: 'Resident Town Launch: Download Your Official Parish App & Web Portal',
        audience: 'Verified Town Residents',
        feature: 'Community Feed & Emergency Siren',
        body: `<h3>Your Town's Official Community Hub is Now Live!</h3>
<p>Stay informed and connected with zero social media clutter, algorithms, or trolling.</p>
<ul>
  <li><strong>Instant Emergency Alerts:</strong> Real-time SMS and siren broadcasts during severe storms, flooding, or road blocks.</li>
  <li><strong>Local High Street Shopping:</strong> Browse products and menus from local independent butchers, bakers, and shops with same-day local courier delivery.</li>
  <li><strong>What's On &amp; Events:</strong> Comprehensive community calendar for ceilidhs, markets, sports matches, and parish council meetings.</li>
  <li><strong>Lost &amp; Found:</strong> Instant alerts for missing pets, keys, and found property.</li>
</ul>
<p>Download the app or visit our community portal online today.</p>`,
        socialMediaPost: `📢 Our town's official Community Hub is live! 100% focused on our parish: local news, emergency weather alerts, high street shopping with doorstep delivery, and community events. Get the app now at my-community-hub.co.uk!`,
        updatedAt: { toDate: () => new Date() }
    },
    {
        id: 'courier-launch-3',
        headline: 'Virtual High Street Doorstep Courier Delivery Network',
        audience: 'Shoppers & Local Merchants',
        feature: 'Local Courier Network',
        body: `<h3>Same-Day Doorstep Delivery from Your Favourite Local Shops</h3>
<p>You can now order online from independent butchers, bakeries, pharmacies, and local retailers with rapid doorstep delivery provided by our appointed local green couriers.</p>
<ul>
  <li>Support local high street businesses from the comfort of your home.</li>
  <li>Fast, reliable delivery keeping local jobs and spending inside our parish.</li>
  <li>Click &amp; Collect or Home Delivery available across all participating stores.</li>
</ul>`,
        socialMediaPost: `🚚 Fresh local groceries, bakery items, and high street goods delivered straight to your door! Support independent shops across our town by ordering through the official Community Hub.`,
        updatedAt: { toDate: () => new Date() }
    }
];

export default function LeaderMarketingPage() {
    const db = useFirestore();
    const campaignsQuery = useMemoFirebase(() => db ? query(collection(db, 'marketing_campaigns'), orderBy('updatedAt', 'desc')) : null, [db]);
    const { data: dbCampaigns, isLoading } = useCollection<MarketingCampaign>(campaignsQuery);

    const campaigns = (dbCampaigns && dbCampaigns.length > 0) ? dbCampaigns : DEFAULT_CAMPAIGNS;

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Megaphone className="h-8 w-8" />
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
                                    <TableRow><TableCell colSpan={5} className="text-center h-24"><Loader2 className="mx-auto h-6 w-6 animate-spin" /></TableCell></TableRow>
                                ) : campaigns && campaigns.length > 0 ? (
                                    campaigns.map((campaign: any) => (
                                        <TableRow key={campaign.id}>
                                            <TableCell className="font-medium">{campaign.headline}</TableCell>
                                            <TableCell>{campaign.audience}</TableCell>
                                            <TableCell>{campaign.feature}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground">{campaign.updatedAt ? formatDistanceToNow(campaign.updatedAt.toDate(), { addSuffix: true }) : 'N/A'}</TableCell>
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
                                                                        <Image src={campaign.coverImageUrl} alt="Campaign cover image" fill className="object-cover" />
                                                                    </div>
                                                                )}
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between items-center">
                                                                        <Label className="text-lg font-semibold">Body Text</Label>
                                                                        <CopyToClipboardButton textToCopy={campaign.body} isHtml={true} />
                                                                    </div>
                                                                    <div className="p-4 border rounded-md bg-background prose dark:prose-invert max-w-none" dangerouslySetInnerHTML={{ __html: campaign.body }} />
                                                                </div>
                                                                <div className="space-y-2">
                                                                    <div className="flex justify-between items-center">
                                                                        <Label className="text-lg font-semibold">Social Media Post</Label>
                                                                        <CopyToClipboardButton textToCopy={campaign.socialMediaPost} />
                                                                    </div>
                                                                    <Alert variant="default" className="bg-background">
                                                                        <AlertDescription>{campaign.socialMediaPost}</AlertDescription>
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
                                    <TableRow><TableCell colSpan={5} className="text-center h-24">No marketing campaigns available yet.</TableCell></TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>
            </Card>

            <MarketingImageGallery />
        </div>
    );
}
