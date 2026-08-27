'use client';

import * as React from 'react';
import { GalleryHorizontal, Loader2, Upload, Trash2, Info, Edit2, Save, X } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { Progress } from '@/components/ui/progress';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';
import Image from 'next/image';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { addGalleryImageAction, updateGalleryImageMetadataAction, deleteGalleryImageAction } from '@/lib/actions/galleryActions';

const GALLERY_LIMIT = 50;

export default function NationalGalleryPage() {
  const { user } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [isUploading, setIsSubmitting] = React.useState(false);
  const fileInputRef = React.useRef<HTMLInputElement>(null);

  const galleryQuery = useMemoFirebase(() => {
    if (!user || !db) return null;
    return collection(db, 'users', user.uid, 'gallery');
  }, [user, db]);

  const { data: images, isLoading } = useCollection(galleryQuery);

  const [editingImage, setEditingImage] = React.useState<any | null>(null);
  const [editTitle, setEditTitle] = React.useState('');
  const [editDescription, setEditDescription] = React.useState('');
  const [isSaving, setIsSaving] = React.useState(false);

  const handleEditClick = (img: any) => {
    setEditingImage(img);
    setEditTitle(img.title || img.metaTitle || '');
    setEditDescription(img.description || '');
  };

  const handleUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;

    if (file.size > 2 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum image size is 2MB.', variant: 'destructive' });
      return;
    }

    setIsSubmitting(true);
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64 = reader.result as string;
      const result = await addGalleryImageAction({
        userId: user.uid,
        imageUrl: base64,
        storagePath: `gallery/${user.uid}/${Date.now()}_${file.name}`,
        title: file.name.split('.')[0],
      });

      if (result.success) {
        toast({ title: 'Upload Successful', description: 'New brand asset added to your gallery.' });
      } else {
        toast({ title: 'Upload Failed', description: result.error, variant: 'destructive' });
      }
      setIsSubmitting(false);
    };
    reader.readAsDataURL(file);
  };

  const handleSaveMetadata = async () => {
    if (!user || !editingImage) return;
    setIsSaving(true);
    const result = await updateGalleryImageMetadataAction({
      userId: user.uid,
      imageId: editingImage.id,
      data: {
        title: editTitle,
        description: editDescription
      }
    });

    if (result.success) {
      toast({ title: 'Image Updated', description: 'Metadata has been saved successfully.' });
      setEditingImage(null);
    } else {
      toast({ title: 'Update Failed', description: result.error, variant: 'destructive' });
    }
    setIsSaving(false);
  };

  const handleDeleteImage = async (imageId: string) => {
    if (!user) return;
    if (!window.confirm("Are you sure you want to permanently delete this brand asset?")) return;

    const result = await deleteGalleryImageAction({
      userId: user.uid,
      imageId: imageId,
    });

    if (result.success) {
      toast({ title: 'Asset Deleted' });
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  };

  const count = images?.length || 0;
  const usagePercent = (count / GALLERY_LIMIT) * 100;

  if (isLoading) {
    return <div className="flex justify-center items-center h-96"><Loader2 className="animate-spin text-primary" /></div>;
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto pb-16">
      <div className="flex flex-col sm:flex-row justify-between sm:items-center gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <GalleryHorizontal className="h-8 w-8 text-primary" />
            Brand Asset Gallery
          </h1>
          <p className="text-muted-foreground">Manage your high-resolution imagery and campaign media assets.</p>
        </div>
        <div>
          <Button onClick={() => fileInputRef.current?.click()} disabled={isUploading || count >= GALLERY_LIMIT} className="shadow-lg">
            {isUploading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Upload className="mr-2 h-4 w-4" />}
            Upload Asset
          </Button>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </div>
      </div>

      {/* Storage Limit Overview */}
      <Card className="border-2 shadow-sm">
        <CardHeader className="pb-3">
          <div className="flex justify-between items-center text-sm font-semibold">
            <span>Asset Capacity ({count} / {GALLERY_LIMIT} Images)</span>
            <span>{usagePercent.toFixed(0)}% Utilized</span>
          </div>
        </CardHeader>
        <CardContent>
          <Progress value={usagePercent} className="h-2" />
        </CardContent>
      </Card>

      {/* Media Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-6">
        {images && images.length > 0 ? (
          images.map((img: any) => (
            <Card key={img.id} className="overflow-hidden group border shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
              <div className="relative aspect-square w-full bg-muted">
                <Image src={img.url} alt={img.title || "Gallery Item"} fill className="object-cover transition-transform group-hover:scale-105" />
              </div>
              <CardContent className="p-3 space-y-1">
                <p className="font-bold text-xs truncate">{img.title || 'Untitled Asset'}</p>
                <p className="text-[11px] text-muted-foreground line-clamp-1">{img.description || 'No caption'}</p>
              </CardContent>
              <div className="p-2 border-t bg-muted/20 flex justify-between items-center">
                <Button variant="ghost" size="sm" className="h-7 px-2 text-xs" onClick={() => handleEditClick(img)}>
                  <Edit2 className="h-3 w-3 mr-1" /> Edit
                </Button>
                <Button variant="ghost" size="icon" className="h-7 w-7 text-destructive hover:bg-destructive/10" onClick={() => handleDeleteImage(img.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </Card>
          ))
        ) : (
          <div className="col-span-full text-center py-16 border-2 border-dashed rounded-2xl space-y-4">
            <GalleryHorizontal className="mx-auto h-12 w-12 text-muted-foreground opacity-40" />
            <p className="text-sm text-muted-foreground">Your gallery is empty. Upload high-resolution brand images to showcase in your campaigns and public profile.</p>
            <Button variant="outline" size="sm" onClick={() => fileInputRef.current?.click()}>
              Upload First Asset
            </Button>
          </div>
        )}
      </div>

      {/* Edit Metadata Dialog */}
      <Dialog open={!!editingImage} onOpenChange={(open) => !open && setEditingImage(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Edit Asset Metadata</DialogTitle>
            <DialogDescription>Update the title and description for this brand image.</DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-title">Image Title / Headline</Label>
              <Input id="edit-title" value={editTitle} onChange={(e) => setEditTitle(e.target.value)} />
            </div>
            <div className="space-y-2">
              <Label htmlFor="edit-desc">Caption / Description</Label>
              <Textarea id="edit-desc" value={editDescription} onChange={(e) => setEditDescription(e.target.value)} rows={3} />
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingImage(null)}>Cancel</Button>
            <Button onClick={handleSaveMetadata} disabled={isSaving}>
              {isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : <Save className="mr-2 h-4 w-4" />}
              Save Metadata
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
