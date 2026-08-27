'use client';

import * as React from 'react';
import { Megaphone, PlusCircle, Loader2, MoreHorizontal, FileEdit, Trash2, Eye, AlertCircle, Clock, ExternalLink } from 'lucide-react';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, where } from 'firebase/firestore';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuLabel, 
  ContextMenuSeparator, 
  ContextMenuTrigger 
} from '@/components/ui/context-menu';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { format } from 'date-fns';
import Link from 'next/link';
import Image from 'next/image';
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { cn } from '@/lib/utils';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { deleteAdvertAction } from '@/lib/actions/advertActions';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { ScrollArea } from '@/components/ui/scroll-area';

type Advert = {
  id: string;
  title?: string;
  headline?: string;
  shortDescription?: string;
  fullDescription?: string;
  type: 'featured' | 'partner';
  status: 'Active' | 'Scheduled' | 'Paused' | 'Expired' | 'Draft' | 'Pending Approval';
  startDate?: any;
  endDate?: any;
  image?: string;
  scope?: string;
  createdAt?: any;
};

export default function NationalAdvertsPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();

  const [previewAdvert, setPreviewAdvert] = React.useState<Advert | null>(null);

  const advertsQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return query(
      collection(db, "adverts"),
      where("ownerId", "==", user.uid)
    );
  }, [user, db]);

  const { data: rawAdverts, isLoading, error } = useCollection<Advert>(advertsQuery, undefined, true);

  const adverts = React.useMemo(() => {
    if (!rawAdverts) return [];
    
    return rawAdverts
      .filter(ad => ad.scope === 'national' || ad.scope === 'community' || !ad.scope)
      .sort((a, b) => {
        const timeA = a.createdAt?.toMillis?.() || a.createdAt?.seconds || 0;
        const timeB = b.createdAt?.toMillis?.() || b.createdAt?.seconds || 0;
        return timeB - timeA;
      });
  }, [rawAdverts]);

  const handleDelete = async (advertId: string) => {
    if (!window.confirm('Are you sure you want to delete this campaign? This action cannot be undone.')) return;
    
    const result = await deleteAdvertAction({ advertId });
    if (result.success) {
      toast({ title: 'Campaign Deleted' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const navigateToEdit = (ad: Advert) => {
    const url = `/national/adverts/create/content?id=${ad.id}&type=${ad.type}`;
    router.push(url);
  };

  if (isUserLoading || isLoading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-primary" /></div>;
  }

  const getStatusBadge = (status: Advert['status']) => {
    switch (status) {
      case 'Active':
        return <Badge className="bg-emerald-600 text-white font-semibold hover:bg-emerald-600">Active</Badge>;
      case 'Scheduled':
        return <Badge variant="secondary" className="bg-blue-100 text-blue-800 dark:bg-blue-900/40 dark:text-blue-300 font-semibold">Scheduled</Badge>;
      case 'Pending Approval':
        return <Badge variant="outline" className="text-amber-600 border-amber-500 font-semibold">Pending Approval</Badge>;
      case 'Draft':
        return <Badge variant="outline" className="text-muted-foreground border-dashed">Draft</Badge>;
      default:
        return <Badge variant="outline">{status}</Badge>;
    }
  };

  return (
    <div className="space-y-8 max-w-7xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <Megaphone className="h-8 w-8 text-primary" />
            National Campaigns
          </h1>
          <p className="text-muted-foreground">Manage and track your platform-wide advertisements.</p>
        </div>
        <Button asChild className="shadow-lg">
          <Link href="/national/adverts/create">
            <PlusCircle className="mr-2 h-4 w-4" />
            Create New Campaign
          </Link>
        </Button>
      </div>

      {error && (
        <Alert variant="default" className="bg-primary/5 border-primary/20">
          <AlertCircle className="h-4 w-4 text-primary" />
          <AlertTitle>Syncing Adverts</AlertTitle>
          <AlertDescription>Your campaigns are being indexed. This may take a few moments.</AlertDescription>
        </Alert>
      )}

      <Card className="border-2 shadow-sm overflow-hidden">
        <CardContent className="p-0">
          <Table>
            <TableHeader className="bg-muted/40">
              <TableRow>
                <TableHead className="w-[100px]">Creative</TableHead>
                <TableHead>Headline & Copy</TableHead>
                <TableHead className="w-[130px]">Type</TableHead>
                <TableHead className="w-[140px]">Status</TableHead>
                <TableHead className="w-[180px]">Schedule</TableHead>
                <TableHead className="text-right w-[80px]">Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {adverts && adverts.length > 0 ? (
                adverts.map((ad) => {
                  const startDate = ad.startDate?.toDate ? ad.startDate.toDate() : (ad.startDate ? new Date(ad.startDate) : null);
                  const endDate = ad.endDate?.toDate ? ad.endDate.toDate() : (ad.endDate ? new Date(ad.endDate) : null);

                  return (
                    <ContextMenu key={ad.id}>
                      <ContextMenuTrigger asChild>
                        <TableRow 
                          className="hover:bg-muted/50 cursor-pointer transition-colors group"
                          onClick={() => setPreviewAdvert(ad)}
                        >
                          <TableCell onClick={(e) => e.stopPropagation()}>
                            <div className="relative h-14 w-20 rounded-lg overflow-hidden bg-muted border">
                              {ad.image ? (
                                <Image src={ad.image} alt={ad.headline || ad.title || "Ad"} fill className="object-cover" />
                              ) : (
                                <div className="w-full h-full flex items-center justify-center text-[9px] uppercase font-bold text-muted-foreground">
                                  No Asset
                                </div>
                              )}
                            </div>
                          </TableCell>
                          <TableCell>
                            <p className="font-bold text-sm text-foreground group-hover:text-primary transition-colors">
                              {ad.headline || ad.title || 'Untitled Draft'}
                            </p>
                            <p className="text-xs text-muted-foreground line-clamp-1">
                              {ad.shortDescription || 'No description provided'}
                            </p>
                          </TableCell>
                          <TableCell>
                            <Badge variant="outline" className="capitalize text-xs">
                              {ad.type} Ad
                            </Badge>
                          </TableCell>
                          <TableCell>{getStatusBadge(ad.status)}</TableCell>
                          <TableCell className="text-xs text-muted-foreground">
                            {startDate && endDate ? (
                              <div>
                                <p>{format(startDate, 'dd MMM yyyy')}</p>
                                <p className="text-[10px] text-muted-foreground/80">to {format(endDate, 'dd MMM yyyy')}</p>
                              </div>
                            ) : (
                              <span className="italic text-muted-foreground/60">Not scheduled</span>
                            )}
                          </TableCell>
                          <TableCell className="text-right" onClick={(e) => e.stopPropagation()}>
                            <DropdownMenu>
                              <DropdownMenuTrigger asChild>
                                <Button variant="ghost" size="icon" className="h-8 w-8">
                                  <MoreHorizontal className="h-4 w-4" />
                                </Button>
                              </DropdownMenuTrigger>
                              <DropdownMenuContent align="end">
                                <DropdownMenuLabel>Campaign Actions</DropdownMenuLabel>
                                <DropdownMenuItem onClick={() => setPreviewAdvert(ad)}>
                                  <Eye className="mr-2 h-4 w-4" /> Preview Advert
                                </DropdownMenuItem>
                                <DropdownMenuItem onClick={() => navigateToEdit(ad)}>
                                  <FileEdit className="mr-2 h-4 w-4" /> Edit Campaign
                                </DropdownMenuItem>
                                <DropdownMenuSeparator />
                                <DropdownMenuItem onClick={() => handleDelete(ad.id)} className="text-destructive">
                                  <Trash2 className="mr-2 h-4 w-4" /> Delete Campaign
                                </DropdownMenuItem>
                              </DropdownMenuContent>
                            </DropdownMenu>
                          </TableCell>
                        </TableRow>
                      </ContextMenuTrigger>
                      <ContextMenuContent>
                        <ContextMenuLabel>Quick Actions</ContextMenuLabel>
                        <ContextMenuItem onClick={() => setPreviewAdvert(ad)}>
                          <Eye className="mr-2 h-4 w-4" /> Preview
                        </ContextMenuItem>
                        <ContextMenuItem onClick={() => navigateToEdit(ad)}>
                          <FileEdit className="mr-2 h-4 w-4" /> Edit
                        </ContextMenuItem>
                        <ContextMenuSeparator />
                        <ContextMenuItem onClick={() => handleDelete(ad.id)} className="text-destructive">
                          <Trash2 className="mr-2 h-4 w-4" /> Delete
                        </ContextMenuItem>
                      </ContextMenuContent>
                    </ContextMenu>
                  );
                })
              ) : (
                <TableRow>
                  <TableCell colSpan={6} className="h-48 text-center text-muted-foreground">
                    <div className="space-y-3">
                      <Megaphone className="mx-auto h-8 w-8 opacity-40" />
                      <p>No campaigns found.</p>
                      <Button asChild size="sm">
                        <Link href="/national/adverts/create">Create New Campaign</Link>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      {/* Advert Preview Dialog */}
      <Dialog open={!!previewAdvert} onOpenChange={(open) => !open && setPreviewAdvert(null)}>
        <DialogContent className="max-w-2xl max-h-[90vh] flex flex-col p-0 overflow-hidden">
          <DialogHeader className="p-6 pb-2 border-b">
            <div className="flex items-center justify-between">
              <DialogTitle className="text-xl font-bold font-headline">{previewAdvert?.headline || previewAdvert?.title || "Campaign Preview"}</DialogTitle>
              {previewAdvert && getStatusBadge(previewAdvert.status)}
            </div>
            <DialogDescription className="capitalize">
              {previewAdvert?.type} Advertisement Placement
            </DialogDescription>
          </DialogHeader>

          <ScrollArea className="flex-1 p-6">
            <div className="space-y-6">
              {previewAdvert?.image && (
                <div className="relative aspect-video w-full rounded-xl overflow-hidden border bg-muted shadow-sm">
                  <Image src={previewAdvert.image} alt="Preview" fill className="object-cover" />
                </div>
              )}

              <div className="space-y-2">
                <h4 className="font-bold text-base text-foreground">{previewAdvert?.headline || previewAdvert?.title}</h4>
                <p className="text-sm text-muted-foreground leading-relaxed">{previewAdvert?.shortDescription}</p>
              </div>

              {previewAdvert?.fullDescription && (
                <div className="pt-4 border-t space-y-2">
                  <h5 className="font-bold text-xs uppercase text-muted-foreground">Full Content</h5>
                  <div 
                    className="prose dark:prose-invert max-w-none text-sm"
                    dangerouslySetInnerHTML={{ __html: previewAdvert.fullDescription }}
                  />
                </div>
              )}
            </div>
          </ScrollArea>

          <div className="p-4 border-t bg-muted/20 flex justify-end gap-2">
            <Button variant="outline" onClick={() => setPreviewAdvert(null)}>Close</Button>
            {previewAdvert && (
              <Button onClick={() => {
                const ad = previewAdvert;
                setPreviewAdvert(null);
                navigateToEdit(ad);
              }}>
                <FileEdit className="mr-2 h-4 w-4" /> Edit Advert
              </Button>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </div>
  );
}
