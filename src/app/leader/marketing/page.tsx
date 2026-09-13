'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
    Loader2, 
    Megaphone, 
    Eye, 
    Clipboard, 
    Check, 
    Download, 
    Sparkles, 
    Store, 
    Building2, 
    FileText, 
    Image as ImageIcon, 
    Truck, 
    Coins, 
    ArrowRight, 
    Search, 
    ExternalLink,
    Printer,
    Share2,
    HeartHandshake,
    ShieldCheck
} from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Label } from '@/components/ui/label';
import Image from 'next/image';
import { getLeaderMarketingHubDataAction } from '@/lib/actions/marketingActions';

const CopyToClipboardButton = ({ textToCopy, isHtml = false, label = "Copy" }: { textToCopy: string; isHtml?: boolean; label?: string }) => {
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
            toast({ title: 'Copied to clipboard! 📋' });
            setTimeout(() => setCopied(false), 2000);
        }).catch(() => {
            toast({ title: 'Error', description: 'Failed to copy text.', variant: 'destructive' });
        });
    };

    return (
        <Button variant={copied ? "default" : "outline"} size="sm" onClick={handleCopy} className="h-8 text-xs font-bold gap-1.5 shadow-xs">
            {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Clipboard className="h-3.5 w-3.5" />}
            <span>{copied ? 'Copied!' : label}</span>
        </Button>
    );
};

export default function LeaderMarketingPage() {
    const { toast } = useToast();
    const [isLoading, setIsLoading] = React.useState(true);
    const [campaigns, setCampaigns] = React.useState<any[]>([]);
    const [gallery, setGallery] = React.useState<any[]>([]);
    const [adverts, setAdverts] = React.useState<any[]>([]);
    const [pitchKits, setPitchKits] = React.useState<any[]>([]);

    const [campaignSearch, setCampaignSearch] = React.useState('');
    const [selectedAudience, setSelectedAudience] = React.useState('all');

    const isDemo = typeof window !== 'undefined' && (
        sessionStorage.getItem('isDemoMode') === 'true' || 
        window.location.pathname.startsWith('/demo')
    );

    React.useEffect(() => {
        async function loadMarketingData() {
            setIsLoading(true);
            try {
                const res = await getLeaderMarketingHubDataAction(isDemo);
                if (res.success) {
                    setCampaigns(res.campaigns || []);
                    setGallery(res.gallery || []);
                    setAdverts(res.adverts || []);
                    setPitchKits(res.pitchKits || []);
                }
            } catch (err: any) {
                console.error("Error loading marketing hub data:", err);
            } finally {
                setIsLoading(false);
            }
        }
        loadMarketingData();
    }, [isDemo]);

    const handleCopyUrl = (url: string) => {
        navigator.clipboard.writeText(url);
        toast({ title: "Asset URL Copied!" });
    };

    const formatImageDescription = (image: any) => {
        if (image.description && image.description !== 'Auto-indexed from Storage' && image.description !== 'Community Hub Promotional Artwork') {
            return image.description;
        }
        const path = image.path || image.url || '';
        const filename = path.split('/').pop() || '';
        let cleanName = decodeURIComponent(filename);
        cleanName = cleanName.replace(/^\d+-/, '').replace(/\.[^/.]+$/, "").replace(/[-_]/g, ' ');
        return cleanName || 'Promotional Asset';
    };

    const audiences = React.useMemo(() => {
        const set = new Set<string>();
        campaigns.forEach(c => {
            if (c.audience) set.add(c.audience);
        });
        return Array.from(set);
    }, [campaigns]);

    const filteredCampaigns = React.useMemo(() => {
        return campaigns.filter(c => {
            const matchesSearch = !campaignSearch || 
                c.headline?.toLowerCase().includes(campaignSearch.toLowerCase()) ||
                c.feature?.toLowerCase().includes(campaignSearch.toLowerCase()) ||
                c.body?.toLowerCase().includes(campaignSearch.toLowerCase());
            
            const matchesAudience = selectedAudience === 'all' || c.audience === selectedAudience;

            return matchesSearch && matchesAudience;
        });
    }, [campaigns, campaignSearch, selectedAudience]);

    return (
        <div className="space-y-8 pb-12">
            {/* Hero Header */}
            <div className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-emerald-600/15 via-primary/5 to-card border border-emerald-500/20 p-6 sm:p-8 shadow-sm">
                <div className="relative z-10 flex flex-col md:flex-row md:items-center justify-between gap-6">
                    <div className="space-y-2 max-w-2xl">
                        <div className="flex items-center gap-2 flex-wrap">
                            <Badge className="bg-emerald-600 text-white font-extrabold px-3 py-1 text-xs gap-1.5 shadow-xs">
                                <Megaphone className="h-3.5 w-3.5" />
                                Official Leader Marketing Hub
                            </Badge>
                            {isDemo && (
                                <Badge className="bg-sky-500/20 text-sky-400 border-sky-500/30 text-xs font-mono">
                                    Demo Sandbox Active
                                </Badge>
                            )}
                        </div>
                        <h1 className="text-2xl sm:text-4xl font-black font-headline text-foreground tracking-tight">
                            Promote Your Town &amp; Onboard Merchants
                        </h1>
                        <p className="text-sm text-muted-foreground leading-relaxed">
                            Everything you need to successfully launch and grow your Community Hub: ready-made merchant onboarding letters, shop window QR stickers, copy-paste social media blasts, and official advertising campaigns.
                        </p>
                    </div>

                    <div className="flex flex-col sm:flex-row gap-2.5 shrink-0">
                        <Button 
                            onClick={() => {
                                const pack = pitchKits.map(k => `${k.title}\n${'='.repeat(k.title.length)}\n${k.content}`).join('\n\n' + '-'.repeat(50) + '\n\n');
                                navigator.clipboard.writeText(pack);
                                toast({ title: 'Complete Merchant Pitch Pack Copied! 🚀' });
                            }} 
                            className="bg-emerald-600 hover:bg-emerald-500 text-white font-black text-xs h-10 px-5 gap-2 shadow-md"
                        >
                            <Sparkles className="h-4 w-4" /> Copy Full Outreach Kit
                        </Button>
                    </div>
                </div>
            </div>

            {/* Main Tabs Container */}
            <Tabs defaultValue="campaigns" className="space-y-6">
                <TabsList className="grid grid-cols-2 md:grid-cols-4 h-auto p-1.5 bg-muted/80 rounded-2xl border">
                    <TabsTrigger value="campaigns" className="font-bold text-xs py-2.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl">
                        <FileText className="h-3.5 w-3.5 text-emerald-500" />
                        <span>Ready Campaigns ({campaigns.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="pitch-kits" className="font-bold text-xs py-2.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl">
                        <Store className="h-3.5 w-3.5 text-amber-500" />
                        <span>High Street Pitch Packs ({pitchKits.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="adverts" className="font-bold text-xs py-2.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl">
                        <Megaphone className="h-3.5 w-3.5 text-sky-500" />
                        <span>Community Adverts ({adverts.length})</span>
                    </TabsTrigger>
                    <TabsTrigger value="gallery" className="font-bold text-xs py-2.5 gap-1.5 data-[state=active]:bg-card data-[state=active]:shadow-sm rounded-xl">
                        <ImageIcon className="h-3.5 w-3.5 text-purple-500" />
                        <span>Asset Gallery ({gallery.length})</span>
                    </TabsTrigger>
                </TabsList>

                {/* TAB 1: READY-TO-USE MARKETING CAMPAIGNS */}
                <TabsContent value="campaigns" className="space-y-6">
                    <Card className="shadow-xs border-2">
                        <CardHeader className="pb-4 border-b bg-muted/20">
                            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                                <div>
                                    <CardTitle className="text-lg font-black font-headline flex items-center gap-2">
                                        <FileText className="h-5 w-5 text-emerald-500" />
                                        Platform Marketing &amp; Outreach Campaigns
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Ready-to-use email copy, news articles, and social media announcements created for Community Leaders.
                                    </CardDescription>
                                </div>

                                <div className="flex flex-col sm:flex-row items-center gap-2.5">
                                    <div className="relative w-full sm:w-64">
                                        <Search className="absolute left-2.5 top-2.5 h-3.5 w-3.5 text-muted-foreground" />
                                        <Input
                                            placeholder="Search campaigns..."
                                            value={campaignSearch}
                                            onChange={(e) => setCampaignSearch(e.target.value)}
                                            className="h-8 text-xs pl-8"
                                        />
                                    </div>
                                    {audiences.length > 0 && (
                                        <select
                                            value={selectedAudience}
                                            onChange={(e) => setSelectedAudience(e.target.value)}
                                            className="h-8 text-xs rounded-md border border-input bg-background px-2.5 font-bold"
                                        >
                                            <option value="all">All Audiences ({campaigns.length})</option>
                                            {audiences.map(aud => (
                                                <option key={aud} value={aud}>{aud}</option>
                                            ))}
                                        </select>
                                    )}
                                </div>
                            </div>
                        </CardHeader>
                        <CardContent className="p-0">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48">
                                    <Loader2 className="h-8 w-8 animate-spin text-emerald-600" />
                                </div>
                            ) : filteredCampaigns.length > 0 ? (
                                <Table>
                                    <TableHeader>
                                        <TableRow className="bg-muted/40">
                                            <TableHead className="font-bold text-xs">Headline &amp; Focus</TableHead>
                                            <TableHead className="font-bold text-xs">Target Audience</TableHead>
                                            <TableHead className="font-bold text-xs">Feature</TableHead>
                                            <TableHead className="font-bold text-xs text-right">Action</TableHead>
                                        </TableRow>
                                    </TableHeader>
                                    <TableBody>
                                        {filteredCampaigns.map((campaign: any) => (
                                            <TableRow key={campaign.id} className="hover:bg-muted/30 transition-colors">
                                                <TableCell className="font-bold text-sm text-foreground max-w-md">
                                                    {campaign.headline}
                                                </TableCell>
                                                <TableCell>
                                                    <Badge variant="outline" className="text-[11px] font-semibold bg-muted/60">
                                                        {campaign.audience}
                                                    </Badge>
                                                </TableCell>
                                                <TableCell>
                                                    <span className="text-xs text-muted-foreground font-medium">
                                                        {campaign.feature}
                                                    </span>
                                                </TableCell>
                                                <TableCell className="text-right">
                                                    <Dialog>
                                                        <DialogTrigger asChild>
                                                            <Button variant="default" size="sm" className="bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs h-8 gap-1.5 shadow-xs">
                                                                <Eye className="h-3.5 w-3.5" /> View &amp; Copy
                                                            </Button>
                                                        </DialogTrigger>
                                                        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
                                                            <DialogHeader className="pb-3 border-b">
                                                                <div className="flex items-center gap-2 mb-1">
                                                                    <Badge className="bg-emerald-600 text-white text-[10px]">
                                                                        {campaign.audience}
                                                                    </Badge>
                                                                    <Badge variant="outline" className="text-[10px]">
                                                                        {campaign.feature}
                                                                    </Badge>
                                                                </div>
                                                                <DialogTitle className="text-lg font-black font-headline text-foreground">
                                                                    {campaign.headline}
                                                                </DialogTitle>
                                                            </DialogHeader>

                                                            <ScrollArea className="flex-1 pr-4 space-y-6">
                                                                {/* Body Copy */}
                                                                <div className="space-y-2 pt-2">
                                                                    <div className="flex items-center justify-between">
                                                                        <Label className="text-xs font-black uppercase text-muted-foreground tracking-wider">
                                                                            Campaign Body / Letter Content
                                                                        </Label>
                                                                        <CopyToClipboardButton textToCopy={campaign.body} isHtml={true} label="Copy Letter" />
                                                                    </div>
                                                                    <div 
                                                                        className="p-4 rounded-xl border bg-muted/30 text-xs sm:text-sm prose dark:prose-invert max-w-none leading-relaxed"
                                                                        dangerouslySetInnerHTML={{ __html: campaign.body }}
                                                                    />
                                                                </div>

                                                                {/* Social Media Blurb */}
                                                                {campaign.socialMediaPost && (
                                                                    <div className="space-y-2 pt-4 border-t">
                                                                        <div className="flex items-center justify-between">
                                                                            <Label className="text-xs font-black uppercase text-muted-foreground tracking-wider flex items-center gap-1.5">
                                                                                <Share2 className="h-3.5 w-3.5 text-sky-500" />
                                                                                Social Media &amp; WhatsApp Post
                                                                            </Label>
                                                                            <CopyToClipboardButton textToCopy={campaign.socialMediaPost} label="Copy Post" />
                                                                        </div>
                                                                        <div className="p-3.5 rounded-xl border bg-card font-mono text-xs text-foreground leading-relaxed">
                                                                            {campaign.socialMediaPost}
                                                                        </div>
                                                                    </div>
                                                                )}
                                                            </ScrollArea>
                                                        </DialogContent>
                                                    </Dialog>
                                                </TableCell>
                                            </TableRow>
                                        ))}
                                    </TableBody>
                                </Table>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground text-sm">
                                    No campaigns found matching your filter.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 2: HIGH STREET RECRUITMENT & PITCH PACKS */}
                <TabsContent value="pitch-kits" className="space-y-6">
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {pitchKits.map((kit) => (
                            <Card key={kit.id} className="border-2 hover:border-amber-500/40 transition-all flex flex-col justify-between shadow-sm">
                                <CardHeader className="pb-3">
                                    <div className="flex items-center justify-between gap-2 mb-1">
                                        <Badge className="bg-amber-500/20 text-amber-700 dark:text-amber-300 border-amber-500/40 text-[10px] font-bold">
                                            {kit.badge}
                                        </Badge>
                                        <Store className="h-4 w-4 text-amber-500" />
                                    </div>
                                    <CardTitle className="text-base font-bold text-foreground">
                                        {kit.title}
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        {kit.summary}
                                    </CardDescription>
                                </CardHeader>
                                <CardContent className="space-y-4 pt-0">
                                    <div className="p-3 rounded-lg bg-muted/40 border text-xs space-y-1.5">
                                        <p className="font-bold text-foreground">Key Highlights:</p>
                                        <ul className="list-disc pl-4 space-y-1 text-muted-foreground">
                                            {kit.points.map((pt: string, idx: number) => (
                                                <li key={idx}>{pt}</li>
                                            ))}
                                        </ul>
                                    </div>

                                    <Dialog>
                                        <DialogTrigger asChild>
                                            <Button className="w-full bg-amber-600 hover:bg-amber-500 text-white font-bold text-xs h-9 gap-1.5 shadow-xs">
                                                <FileText className="h-3.5 w-3.5" /> View Pitch Document
                                            </Button>
                                        </DialogTrigger>
                                        <DialogContent className="max-w-2xl max-h-[85vh] flex flex-col p-6">
                                            <DialogHeader className="pb-3 border-b">
                                                <DialogTitle className="text-lg font-black font-headline">
                                                    {kit.title}
                                                </DialogTitle>
                                                <DialogDescription className="text-xs">
                                                    Target: <strong>{kit.target}</strong>
                                                </DialogDescription>
                                            </DialogHeader>
                                            <ScrollArea className="flex-1 pr-4 space-y-4 pt-2">
                                                <div className="flex items-center justify-between">
                                                    <span className="text-xs font-bold text-muted-foreground uppercase">Document Text</span>
                                                    <CopyToClipboardButton textToCopy={kit.content} label="Copy Text" />
                                                </div>
                                                <pre className="p-4 rounded-xl border bg-muted/30 text-xs font-mono whitespace-pre-wrap leading-relaxed text-foreground">
                                                    {kit.content}
                                                </pre>
                                            </ScrollArea>
                                        </DialogContent>
                                    </Dialog>
                                </CardContent>
                            </Card>
                        ))}
                    </div>
                </TabsContent>

                {/* TAB 3: COMMUNITY ADVERTS & COMMERCIAL SPONSORS */}
                <TabsContent value="adverts" className="space-y-6">
                    <Card className="border-2 shadow-xs">
                        <CardHeader className="pb-4 border-b bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black font-headline flex items-center gap-2">
                                        <Megaphone className="h-5 w-5 text-sky-500" />
                                        Live Community Advertising &amp; Sponsor Inventory
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Browse active commercial adverts and merchant spotlight units currently running across the network.
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="bg-sky-500/10 text-sky-600 dark:text-sky-400 border-sky-500/30 text-xs font-bold">
                                    {adverts.length} Active Placements
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48">
                                    <Loader2 className="h-8 w-8 animate-spin text-sky-600" />
                                </div>
                            ) : adverts.length > 0 ? (
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                                    {adverts.map((ad: any) => (
                                        <Card key={ad.id} className="overflow-hidden border border-border/80 bg-card hover:border-sky-500/40 transition-all flex flex-col justify-between shadow-xs">
                                            {ad.image && (
                                                <div className="relative aspect-video w-full bg-slate-900 overflow-hidden">
                                                    {ad.image.startsWith('data:') ? (
                                                        <img src={ad.image} alt={ad.title} className="w-full h-full object-cover" />
                                                    ) : (
                                                        <Image src={ad.image} alt={ad.title} fill className="object-cover" />
                                                    )}
                                                    <Badge className="absolute top-2 left-2 bg-slate-950/80 text-white font-mono text-[10px] backdrop-blur-xs">
                                                        {ad.type?.toUpperCase() || 'SPONSOR'}
                                                    </Badge>
                                                </div>
                                            )}
                                            <CardHeader className="p-4 pb-2">
                                                <CardTitle className="text-sm font-bold text-foreground line-clamp-2">
                                                    {ad.title || ad.headline}
                                                </CardTitle>
                                                <CardDescription className="text-xs text-primary font-bold">
                                                    {ad.businessName}
                                                </CardDescription>
                                            </CardHeader>
                                            <CardContent className="p-4 pt-0 space-y-3">
                                                {ad.description && (
                                                    <p className="text-xs text-muted-foreground line-clamp-2 leading-relaxed">
                                                        {ad.description}
                                                    </p>
                                                )}
                                                {ad.websiteLink && (
                                                    <Button asChild variant="outline" size="sm" className="w-full text-xs font-semibold h-8 gap-1.5">
                                                        <a href={ad.websiteLink} target="_blank" rel="noopener noreferrer">
                                                            <ExternalLink className="h-3.5 w-3.5" /> Visit Advertiser
                                                        </a>
                                                    </Button>
                                                )}
                                            </CardContent>
                                        </Card>
                                    ))}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground text-sm">
                                    No advertising placements found in inventory.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>

                {/* TAB 4: OFFICIAL MARKETING IMAGE & ASSET GALLERY */}
                <TabsContent value="gallery" className="space-y-6">
                    <Card className="border-2 shadow-xs">
                        <CardHeader className="pb-4 border-b bg-muted/20">
                            <div className="flex items-center justify-between">
                                <div>
                                    <CardTitle className="text-lg font-black font-headline flex items-center gap-2">
                                        <ImageIcon className="h-5 w-5 text-purple-500" />
                                        Platform Marketing &amp; Artwork Gallery
                                    </CardTitle>
                                    <CardDescription className="text-xs text-muted-foreground">
                                        Download high-resolution artwork, logos, and promotional graphics to use in your local parish bulletins and posters.
                                    </CardDescription>
                                </div>
                                <Badge variant="outline" className="bg-purple-500/10 text-purple-600 dark:text-purple-400 border-purple-500/30 text-xs font-bold">
                                    {gallery.length} Assets Available
                                </Badge>
                            </div>
                        </CardHeader>
                        <CardContent className="p-6">
                            {isLoading ? (
                                <div className="flex justify-center items-center h-48">
                                    <Loader2 className="h-8 w-8 animate-spin text-purple-600" />
                                </div>
                            ) : gallery.length > 0 ? (
                                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-4">
                                    {gallery.map((img: any) => {
                                        const desc = formatImageDescription(img);
                                        return (
                                            <div key={img.id} className="group relative aspect-square rounded-2xl overflow-hidden border-2 bg-muted/30 shadow-xs hover:border-purple-500 transition-all flex flex-col justify-end">
                                                {img.url.startsWith('data:') ? (
                                                    <img src={img.url} alt={desc} className="absolute inset-0 w-full h-full object-cover" />
                                                ) : (
                                                    <Image src={img.url} alt={desc} fill className="object-cover" />
                                                )}
                                                
                                                {/* Hover Action Overlay */}
                                                <div className="absolute inset-0 bg-slate-950/80 opacity-0 group-hover:opacity-100 transition-opacity flex flex-col items-center justify-center p-3 text-center gap-2">
                                                    <p className="text-white text-[11px] font-bold line-clamp-2 leading-tight">
                                                        {desc}
                                                    </p>
                                                    <div className="flex flex-col gap-1.5 w-full">
                                                        <Button size="sm" variant="secondary" onClick={() => handleCopyUrl(img.url)} className="h-7 text-[11px] font-bold gap-1">
                                                            <Clipboard className="h-3 w-3" /> Copy URL
                                                        </Button>
                                                        <Button asChild size="sm" variant="outline" className="h-7 text-[11px] font-bold bg-white/20 text-white hover:bg-white/30 border-white/30 gap-1">
                                                            <a href={img.url} download={`marketing-asset-${img.id}.jpg`} target="_blank" rel="noopener noreferrer">
                                                                <Download className="h-3 w-3" /> Download
                                                            </a>
                                                        </Button>
                                                    </div>
                                                </div>
                                            </div>
                                        );
                                    })}
                                </div>
                            ) : (
                                <div className="text-center py-12 text-muted-foreground text-sm">
                                    No marketing gallery assets found.
                                </div>
                            )}
                        </CardContent>
                    </Card>
                </TabsContent>
            </Tabs>
        </div>
    );
}
