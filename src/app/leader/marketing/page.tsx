'use client';

import * as React from 'react';
import { formatDistanceToNow } from 'date-fns';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { 
    Loader2, 
    Megaphone, 
    Eye, 
    Clipboard, 
    Check, 
    Download, 
    Image as ImageIcon,
    ArrowUpDown,
    ArrowUp,
    ArrowDown,
    Search,
    ChevronLeft,
    ChevronRight
} from 'lucide-react';
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

type SortField = 'headline' | 'audience' | 'feature' | 'updatedAt';
type SortDirection = 'asc' | 'desc';

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

    // Table controls: page size, pagination, sorting, search
    const [pageSize, setPageSize] = React.useState<string>('10');
    const [currentPage, setCurrentPage] = React.useState<number>(1);
    const [sortField, setSortField] = React.useState<SortField>('updatedAt');
    const [sortDirection, setSortDirection] = React.useState<SortDirection>('desc');
    const [searchQuery, setSearchQuery] = React.useState<string>('');

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

    // Handle column sorting
    const handleSort = (field: SortField) => {
        if (sortField === field) {
            setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc');
        } else {
            setSortField(field);
            setSortDirection(field === 'updatedAt' ? 'desc' : 'asc');
        }
        setCurrentPage(1);
    };

    // Filter & sort campaigns
    const filteredAndSortedCampaigns = React.useMemo(() => {
        let list = [...campaigns];

        if (searchQuery.trim()) {
            const query = searchQuery.toLowerCase();
            list = list.filter(c => 
                (c.headline && c.headline.toLowerCase().includes(query)) ||
                (c.audience && c.audience.toLowerCase().includes(query)) ||
                (c.feature && c.feature.toLowerCase().includes(query)) ||
                (c.body && c.body.toLowerCase().includes(query)) ||
                (c.socialMediaPost && c.socialMediaPost.toLowerCase().includes(query))
            );
        }

        list.sort((a, b) => {
            if (sortField === 'updatedAt') {
                const timeA = new Date(a.updatedAt || 0).getTime();
                const timeB = new Date(b.updatedAt || 0).getTime();
                return sortDirection === 'asc' ? timeA - timeB : timeB - timeA;
            }

            const valA = (a[sortField] || '').toString().toLowerCase();
            const valB = (b[sortField] || '').toString().toLowerCase();
            const comp = valA.localeCompare(valB, undefined, { numeric: true, sensitivity: 'base' });
            return sortDirection === 'asc' ? comp : -comp;
        });

        return list;
    }, [campaigns, searchQuery, sortField, sortDirection]);

    // Pagination calculations
    const totalItems = filteredAndSortedCampaigns.length;
    const itemsPerPage = pageSize === 'all' ? (totalItems || 1) : parseInt(pageSize, 10);
    const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
    const startIndex = (currentPage - 1) * itemsPerPage;
    const paginatedCampaigns = pageSize === 'all' 
        ? filteredAndSortedCampaigns 
        : filteredAndSortedCampaigns.slice(startIndex, startIndex + itemsPerPage);

    const formatUpdatedDate = (dateStr?: string) => {
        if (!dateStr) return 'N/A';
        try {
            return formatDistanceToNow(new Date(dateStr), { addSuffix: true });
        } catch {
            return 'Recently';
        }
    };

    const renderSortIcon = (field: SortField) => {
        if (sortField !== field) {
            return <ArrowUpDown className="h-3.5 w-3.5 text-muted-foreground/60 shrink-0" />;
        }
        return sortDirection === 'asc' ? (
            <ArrowUp className="h-3.5 w-3.5 text-primary shrink-0" />
        ) : (
            <ArrowDown className="h-3.5 w-3.5 text-primary shrink-0" />
        );
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
                <CardHeader className="pb-4">
                    <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                        <div>
                            <CardTitle>Available Campaigns</CardTitle>
                            <CardDescription>
                                A library of marketing content created by the platform administrators.
                            </CardDescription>
                        </div>

                        {/* Search and Page Size Selector */}
                        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-3">
                            <div className="relative w-full sm:w-64">
                                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                                <Input
                                    placeholder="Search campaigns..."
                                    value={searchQuery}
                                    onChange={(e) => {
                                        setSearchQuery(e.target.value);
                                        setCurrentPage(1);
                                    }}
                                    className="pl-8 h-9 text-xs"
                                />
                            </div>

                            <div className="flex items-center gap-2 whitespace-nowrap">
                                <span className="text-xs text-muted-foreground font-medium">Show:</span>
                                <Select
                                    value={pageSize}
                                    onValueChange={(val) => {
                                        setPageSize(val);
                                        setCurrentPage(1);
                                    }}
                                >
                                    <SelectTrigger className="h-9 w-[90px] text-xs font-semibold">
                                        <SelectValue placeholder="10" />
                                    </SelectTrigger>
                                    <SelectContent>
                                        <SelectItem value="10">10</SelectItem>
                                        <SelectItem value="20">20</SelectItem>
                                        <SelectItem value="50">50</SelectItem>
                                        <SelectItem value="all">ALL</SelectItem>
                                    </SelectContent>
                                </Select>
                            </div>
                        </div>
                    </div>
                </CardHeader>

                <CardContent className="p-0">
                    <div className="border-t">
                        <Table>
                            <TableHeader>
                                <TableRow className="bg-muted/40">
                                    <TableHead 
                                        className="cursor-pointer select-none hover:text-foreground transition-colors font-semibold"
                                        onClick={() => handleSort('headline')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Headline</span>
                                            {renderSortIcon('headline')}
                                        </div>
                                    </TableHead>
                                    <TableHead 
                                        className="cursor-pointer select-none hover:text-foreground transition-colors font-semibold whitespace-nowrap"
                                        onClick={() => handleSort('audience')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Audience</span>
                                            {renderSortIcon('audience')}
                                        </div>
                                    </TableHead>
                                    <TableHead 
                                        className="cursor-pointer select-none hover:text-foreground transition-colors font-semibold whitespace-nowrap"
                                        onClick={() => handleSort('feature')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Feature</span>
                                            {renderSortIcon('feature')}
                                        </div>
                                    </TableHead>
                                    <TableHead 
                                        className="cursor-pointer select-none hover:text-foreground transition-colors font-semibold whitespace-nowrap"
                                        onClick={() => handleSort('updatedAt')}
                                    >
                                        <div className="flex items-center gap-1.5">
                                            <span>Last Updated</span>
                                            {renderSortIcon('updatedAt')}
                                        </div>
                                    </TableHead>
                                    <TableHead className="text-right font-semibold whitespace-nowrap">Actions</TableHead>
                                </TableRow>
                            </TableHeader>
                            <TableBody>
                                {isLoading ? (
                                    <TableRow>
                                        <TableCell colSpan={5} className="text-center h-28">
                                            <Loader2 className="mx-auto h-6 w-6 animate-spin text-muted-foreground" />
                                        </TableCell>
                                    </TableRow>
                                ) : paginatedCampaigns.length > 0 ? (
                                    paginatedCampaigns.map((campaign) => (
                                        <TableRow key={campaign.id} className="hover:bg-muted/30 transition-colors">
                                            <TableCell className="font-medium max-w-md">{campaign.headline}</TableCell>
                                            <TableCell className="whitespace-nowrap">{campaign.audience}</TableCell>
                                            <TableCell className="whitespace-nowrap">{campaign.feature}</TableCell>
                                            <TableCell className="text-sm text-muted-foreground whitespace-nowrap">
                                                {formatUpdatedDate(campaign.updatedAt)}
                                            </TableCell>
                                            <TableCell className="text-right">
                                                <Dialog>
                                                    <DialogTrigger asChild>
                                                        <Button variant="outline" size="sm" className="h-8">
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
                                        <TableCell colSpan={5} className="text-center h-28 text-muted-foreground">
                                            {searchQuery ? 'No marketing campaigns match your search.' : 'No marketing campaigns available yet.'}
                                        </TableCell>
                                    </TableRow>
                                )}
                            </TableBody>
                        </Table>
                    </div>
                </CardContent>

                {/* Footer with Item Count and Page Navigation */}
                {!isLoading && totalItems > 0 && (
                    <CardFooter className="flex flex-col sm:flex-row items-center justify-between gap-4 p-4 border-t bg-muted/10">
                        <div className="text-xs text-muted-foreground font-medium">
                            {pageSize === 'all' ? (
                                <span>Showing all <strong>{totalItems}</strong> campaigns</span>
                            ) : (
                                <span>
                                    Showing <strong>{startIndex + 1}</strong> to <strong>{Math.min(startIndex + itemsPerPage, totalItems)}</strong> of <strong>{totalItems}</strong> campaigns
                                </span>
                            )}
                        </div>

                        {pageSize !== 'all' && totalPages > 1 && (
                            <div className="flex items-center gap-1.5">
                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.max(1, prev - 1))}
                                    disabled={currentPage <= 1}
                                    className="h-8 px-2 text-xs"
                                >
                                    <ChevronLeft className="h-3.5 w-3.5 mr-1" /> Previous
                                </Button>

                                <div className="flex items-center gap-1 px-2">
                                    {Array.from({ length: totalPages }, (_, i) => i + 1).map((pageNum) => (
                                        <Button
                                            key={pageNum}
                                            variant={currentPage === pageNum ? "default" : "ghost"}
                                            size="sm"
                                            onClick={() => setCurrentPage(pageNum)}
                                            className="h-7 w-7 p-0 text-xs font-semibold"
                                        >
                                            {pageNum}
                                        </Button>
                                    ))}
                                </div>

                                <Button
                                    variant="outline"
                                    size="sm"
                                    onClick={() => setCurrentPage(prev => Math.min(totalPages, prev + 1))}
                                    disabled={currentPage >= totalPages}
                                    className="h-8 px-2 text-xs"
                                >
                                    Next <ChevronRight className="h-3.5 w-3.5 ml-1" />
                                </Button>
                            </div>
                        )}
                    </CardFooter>
                )}
            </Card>

            <MarketingImageGallery images={gallery} isLoading={isLoading} />
        </div>
    );
}
