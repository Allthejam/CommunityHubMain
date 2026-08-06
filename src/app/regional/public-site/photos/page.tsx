'use client';

import React, { useState, useRef, useCallback, useEffect, useMemo } from 'react';
import Link from 'next/link';
import { 
  ArrowLeft,
  Camera,
  ImagePlus,
  Trash2,
  Pencil,
  X,
  Check,
  Loader2,
  Image as ImageIcon,
  Upload,
  MoreVertical,
  Info,
  ShieldCheck,
  ChevronRight
} from 'lucide-react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, collection, addDoc, deleteDoc, updateDoc, query, where, orderBy, serverTimestamp, Timestamp } from 'firebase/firestore';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Label } from '@/components/ui/label';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useToast } from '@/hooks/use-toast';
import { Skeleton } from '@/components/ui/skeleton';
import { uploadImageAction } from '@/lib/actions/storageActions';
import { deleteStorageFileAction } from '@/lib/actions/regionalStorageActions';

interface PhotoDoc {
  id: string;
  name: string;
  altText: string;
  storagePath: string;
  imageUrl: string;
  uploadedAt: Timestamp | null;
  userId: string;
}

import { useRouter } from 'next/navigation';

export default function RegionalPhotosPage() {
  const { user } = useUser();
  const db = useFirestore();
  const router = useRouter();
  const { toast } = useToast();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile, isLoading: isProfileLoading } = useDoc(userProfileRef);

  useEffect(() => {
    if (isProfileLoading) return;
    if (!user || (userProfile && userProfile.accountType !== 'regional' && !userProfile.permissions?.isRegionalNetwork)) {
      toast({
        title: 'Access Restricted',
        description: 'Only authorized regional network accounts can access authority photo management.',
        variant: 'destructive',
      });
      router.replace('/regional-networks');
    }
  }, [user, userProfile, isProfileLoading, router, toast]);

  const [isUploading, setIsUploading] = useState(false);
  const [editingPhoto, setEditingPhoto] = useState<PhotoDoc | null>(null);
  const [editName, setEditName] = useState('');
  const [editAltText, setEditAltText] = useState('');
  const [isSavingEdit, setIsSavingEdit] = useState(false);
  const [deletingPhotoId, setDeletingPhotoId] = useState<string | null>(null);
  const [previewPhoto, setPreviewPhoto] = useState<PhotoDoc | null>(null);

  // Upload dialog state
  const [showUploadDialog, setShowUploadDialog] = useState(false);
  const [uploadName, setUploadName] = useState('');
  const [uploadAltText, setUploadAltText] = useState('');
  const [uploadPreview, setUploadPreview] = useState<string | null>(null);
  const [uploadFile, setUploadFile] = useState<File | null>(null);

  // Query photos for this user from Firestore
  const photosQuery = useMemoFirebase(() => {
    if (!db || !user) return null;
    return query(
      collection(db, 'regionalPhotos'),
      where('userId', '==', user.uid),
      orderBy('uploadedAt', 'desc')
    );
  }, [db, user]);

  const { data: photosDocs, isLoading: isLoadingPhotos } = useCollection(photosQuery);

  const photos: PhotoDoc[] = useMemo(() => {
    if (!photosDocs) return [];
    return photosDocs.map((d: any) => ({
      id: d.id || d.docId,
      name: d.name || 'Untitled',
      altText: d.altText || '',
      storagePath: d.storagePath || '',
      imageUrl: d.imageUrl || '',
      uploadedAt: d.uploadedAt || null,
      userId: d.userId || '',
    }));
  }, [photosDocs]);

  const MAX_PHOTOS_LIMIT = 20;

  // Handle file selection
  const handleFileSelect = useCallback((e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Check 20-photo limit
    if (photos.length >= MAX_PHOTOS_LIMIT) {
      toast({
        title: 'Storage Limit Reached (20/20)',
        description: `To optimize hosting and storage costs, a maximum of 20 photos is allowed. Please delete an existing photo before uploading a new one.`,
        variant: 'destructive',
      });
      if (fileInputRef.current) fileInputRef.current.value = '';
      return;
    }

    // Validate it's an image
    if (!file.type.startsWith('image/')) {
      toast({ title: 'Invalid file', description: 'Only image files (JPEG, PNG, GIF, WebP) are allowed.', variant: 'destructive' });
      return;
    }

    // Max 10MB
    if (file.size > 10 * 1024 * 1024) {
      toast({ title: 'File too large', description: 'Maximum file size is 10MB.', variant: 'destructive' });
      return;
    }

    setUploadFile(file);
    setUploadName(file.name.replace(/\.[^/.]+$/, ''));
    setUploadAltText('');

    // Generate preview
    const reader = new FileReader();
    reader.onload = (ev) => {
      setUploadPreview(ev.target?.result as string);
    };
    reader.readAsDataURL(file);

    setShowUploadDialog(true);

    // Reset input
    if (fileInputRef.current) fileInputRef.current.value = '';
  }, [photos.length, toast]);

  // Upload photo to Firebase Storage + save metadata to Firestore
  const handleUpload = useCallback(async () => {
    if (!uploadFile || !user || !db || !uploadPreview) return;

    setIsUploading(true);
    try {
      const timestamp = Date.now();
      const ext = uploadFile.name.split('.').pop() || 'jpg';
      const storagePath = `regional-photos/${user.uid}/${timestamp}_${uploadName.replace(/[^a-zA-Z0-9-_]/g, '_')}.${ext}`;

      // Upload to Firebase Storage via server action
      const result = await uploadImageAction({
        base64Data: uploadPreview,
        path: storagePath,
      });

      if (!result.success) {
        throw new Error(result.error || 'Upload failed');
      }

      // Save metadata to Firestore
      await addDoc(collection(db, 'regionalPhotos'), {
        name: uploadName || 'Untitled',
        altText: uploadAltText || '',
        storagePath,
        imageUrl: result.url,
        userId: user.uid,
        uploadedAt: serverTimestamp(),
      });

      toast({ title: 'Photo uploaded!', description: `"${uploadName}" has been added to your gallery.` });
      setShowUploadDialog(false);
      setUploadPreview(null);
      setUploadFile(null);
      setUploadName('');
      setUploadAltText('');
    } catch (error: any) {
      console.error('Upload error:', error);
      toast({ title: 'Upload failed', description: error.message || 'Could not upload photo.', variant: 'destructive' });
    } finally {
      setIsUploading(false);
    }
  }, [uploadFile, user, db, uploadPreview, uploadName, uploadAltText, toast]);

  // Delete photo from Storage + Firestore
  const handleDelete = useCallback(async (photo: PhotoDoc) => {
    if (!db) return;
    setDeletingPhotoId(photo.id);
    try {
      // Delete from Storage
      if (photo.storagePath) {
        await deleteStorageFileAction({ storagePath: photo.storagePath });
      }

      // Delete Firestore doc
      await deleteDoc(doc(db, 'regionalPhotos', photo.id));

      toast({ title: 'Photo removed', description: `"${photo.name}" has been deleted.` });
    } catch (error: any) {
      console.error('Delete error:', error);
      toast({ title: 'Delete failed', description: error.message || 'Could not delete photo.', variant: 'destructive' });
    } finally {
      setDeletingPhotoId(null);
    }
  }, [db, toast]);

  // Edit photo metadata (rename + alt text)
  const handleSaveEdit = useCallback(async () => {
    if (!db || !editingPhoto) return;
    setIsSavingEdit(true);
    try {
      await updateDoc(doc(db, 'regionalPhotos', editingPhoto.id), {
        name: editName || 'Untitled',
        altText: editAltText || '',
      });
      toast({ title: 'Photo updated', description: `"${editName}" details saved.` });
      setEditingPhoto(null);
    } catch (error: any) {
      console.error('Edit error:', error);
      toast({ title: 'Update failed', description: error.message || 'Could not update photo.', variant: 'destructive' });
    } finally {
      setIsSavingEdit(false);
    }
  }, [db, editingPhoto, editName, editAltText, toast]);

  const openEditDialog = (photo: PhotoDoc) => {
    setEditingPhoto(photo);
    setEditName(photo.name);
    setEditAltText(photo.altText);
  };

  return (
    <div className="container mx-auto max-w-7xl py-8 px-4 space-y-8">
      
      {/* Navigation */}
      <div className="flex items-center justify-between flex-wrap gap-4">
        <Button asChild variant="ghost" size="sm" className="p-0 h-auto">
          <Link href="/regional/public-site">
            <ArrowLeft className="mr-2 h-4 w-4" /> Back to Public Site
          </Link>
        </Button>
        <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-300 text-xs">
          📸 Regional Photo Gallery
        </Badge>
      </div>

      {/* Header Banner */}
      <div className="bg-gradient-to-r from-emerald-900 via-teal-900 to-slate-900 text-white rounded-2xl p-6 md:p-8 shadow-lg relative overflow-hidden">
        <div className="absolute right-0 top-0 -mt-10 -mr-10 w-64 h-64 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none" />
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 relative z-10">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <Badge className="bg-emerald-500/20 text-emerald-300 border-emerald-400/30 text-xs font-semibold px-3 py-1">
                <Camera className="h-3.5 w-3.5 mr-1" /> Public Site — Photo Gallery
              </Badge>
              <Badge className={`text-xs font-bold px-3 py-1 ${photos.length >= MAX_PHOTOS_LIMIT ? 'bg-red-500/20 text-red-300 border-red-400/40 animate-pulse' : 'bg-emerald-500/20 text-emerald-300 border-emerald-400/30'}`}>
                {photos.length} / {MAX_PHOTOS_LIMIT} Photos Used
              </Badge>
            </div>
            <h1 className="text-2xl md:text-4xl font-extrabold font-headline tracking-tight text-white flex items-center gap-3">
              <ImageIcon className="h-8 w-8 text-emerald-400" /> Regional Photo Gallery
            </h1>
            <p className="text-emerald-100/80 text-sm md:text-base mt-2 max-w-2xl font-light">
              Upload, name, and manage photos for your regional authority&apos;s public billboard. Photos auto-sync with the 3D revolving showcase.
            </p>
          </div>

          <div className="flex flex-col items-end gap-2 shrink-0">
            <Button 
              onClick={() => fileInputRef.current?.click()} 
              disabled={photos.length >= MAX_PHOTOS_LIMIT}
              className={`${photos.length >= MAX_PHOTOS_LIMIT ? 'bg-slate-700 text-slate-400 cursor-not-allowed' : 'bg-emerald-500 hover:bg-emerald-600 text-slate-950 font-bold shadow-md'}`}
            >
              <Upload className="mr-2 h-4 w-4" /> 
              {photos.length >= MAX_PHOTOS_LIMIT ? 'Limit Reached (20/20)' : 'Upload Photo'}
            </Button>
            {photos.length >= MAX_PHOTOS_LIMIT && (
              <span className="text-[11px] text-red-300 font-medium">Delete a photo to upload a new one</span>
            )}
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept="image/jpeg,image/png,image/gif,image/webp"
        capture="environment"
        className="hidden"
        onChange={handleFileSelect}
      />

      {/* Info Note & Cost Optimization Banner */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-start gap-3 p-4 rounded-xl border bg-blue-50/50 dark:bg-blue-950/20 border-blue-200 text-xs">
          <Info className="h-4 w-4 text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-blue-800 dark:text-blue-300">Images Only — No External URLs</span>
            <p className="text-blue-700 dark:text-blue-400">All photos must be uploaded directly from your device or camera. Formats: JPEG, PNG, GIF, WebP. Max 10MB per file.</p>
          </div>
        </div>

        <div className="flex items-start gap-3 p-4 rounded-xl border bg-amber-50/50 dark:bg-amber-950/20 border-amber-200 text-xs">
          <ShieldCheck className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <span className="font-bold text-amber-900 dark:text-amber-300">Strict Storage Limit: Max 20 Photos</span>
            <p className="text-amber-800 dark:text-amber-400">To control cloud hosting and bandwidth costs, accounts are capped at 20 showcase images. Delete old photos anytime to free up slots.</p>
          </div>
        </div>
      </div>

      {/* Photo Gallery Grid */}
      {isLoadingPhotos ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {[1, 2, 3, 4].map(i => <Skeleton key={i} className="aspect-square rounded-xl" />)}
        </div>
      ) : photos.length === 0 ? (
        <Card className="shadow-md">
          <CardContent className="p-12 text-center space-y-4">
            <Camera className="h-14 w-14 text-emerald-600 mx-auto opacity-60" />
            <div className="space-y-1">
              <h3 className="text-lg font-bold text-foreground">No Photos Yet</h3>
              <p className="text-sm text-muted-foreground max-w-md mx-auto">
                Upload your first photo to start building your regional authority&apos;s public gallery.
              </p>
            </div>
            <Button onClick={() => fileInputRef.current?.click()} className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold">
              <ImagePlus className="mr-2 h-4 w-4" /> Upload Your First Photo
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
          {photos.map((photo) => (
            <Card key={photo.id} className="shadow-md overflow-hidden group hover:border-emerald-500/50 transition-all">
              {/* Image */}
              <div 
                className="aspect-square relative cursor-pointer bg-muted"
                onClick={() => setPreviewPhoto(photo)}
              >
                <img
                  src={photo.imageUrl}
                  alt={photo.altText || photo.name}
                  className="w-full h-full object-cover group-hover:scale-105 transition-transform duration-300"
                  loading="lazy"
                />
                {/* Actions Overlay */}
                <div className="absolute top-2 right-2 opacity-0 group-hover:opacity-100 transition-opacity">
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button size="icon" variant="secondary" className="h-8 w-8 shadow-lg bg-white/90 hover:bg-white">
                        <MoreVertical className="h-4 w-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem onClick={(e) => { e.stopPropagation(); openEditDialog(photo); }}>
                        <Pencil className="mr-2 h-4 w-4" /> Edit Name & Alt Text
                      </DropdownMenuItem>
                      <DropdownMenuItem 
                        className="text-red-600 focus:text-red-600"
                        onClick={(e) => { e.stopPropagation(); handleDelete(photo); }}
                      >
                        <Trash2 className="mr-2 h-4 w-4" /> 
                        {deletingPhotoId === photo.id ? 'Deleting...' : 'Remove Photo'}
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </div>
              </div>

              {/* Info Footer */}
              <CardContent className="p-3 space-y-0.5">
                <p className="text-xs font-bold text-foreground line-clamp-1">{photo.name}</p>
                {photo.altText && (
                  <p className="text-[10px] text-muted-foreground line-clamp-1 italic">Alt: {photo.altText}</p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      {/* Upload Dialog */}
      <Dialog open={showUploadDialog} onOpenChange={setShowUploadDialog}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <ImagePlus className="h-5 w-5 text-emerald-600" /> Upload Photo
            </DialogTitle>
            <DialogDescription>
              Name your photo and add alt text for SEO before uploading.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {/* Preview */}
            {uploadPreview && (
              <div className="rounded-xl overflow-hidden border bg-muted max-h-64 flex items-center justify-center">
                <img src={uploadPreview} alt="Upload preview" className="max-h-64 object-contain" />
              </div>
            )}

            {/* Name */}
            <div className="space-y-1.5">
              <Label htmlFor="photo-name" className="text-xs font-bold">Photo Name *</Label>
              <Input
                id="photo-name"
                value={uploadName}
                onChange={(e) => setUploadName(e.target.value)}
                placeholder="e.g. Cairngorms Authority Meeting 2026"
                className="text-sm"
              />
            </div>

            {/* Alt Text */}
            <div className="space-y-1.5">
              <Label htmlFor="photo-alt" className="text-xs font-bold">Alt Text (SEO)</Label>
              <Textarea
                id="photo-alt"
                value={uploadAltText}
                onChange={(e) => setUploadAltText(e.target.value)}
                placeholder="Describe what's in the photo for accessibility and search engines..."
                rows={2}
                className="text-sm resize-none"
              />
              <p className="text-[10px] text-muted-foreground">Screen readers and search engines use this to understand the image content.</p>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setShowUploadDialog(false)} disabled={isUploading}>
              Cancel
            </Button>
            <Button 
              onClick={handleUpload} 
              disabled={isUploading || !uploadName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isUploading ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Uploading...</> : <><Upload className="mr-2 h-4 w-4" /> Upload Photo</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Edit Dialog */}
      <Dialog open={!!editingPhoto} onOpenChange={(open) => { if (!open) setEditingPhoto(null); }}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Pencil className="h-5 w-5 text-emerald-600" /> Edit Photo Details
            </DialogTitle>
            <DialogDescription>
              Update the name and alt text for this photo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            {editingPhoto && (
              <div className="rounded-xl overflow-hidden border bg-muted max-h-48 flex items-center justify-center">
                <img src={editingPhoto.imageUrl} alt={editingPhoto.altText || editingPhoto.name} className="max-h-48 object-contain" />
              </div>
            )}

            <div className="space-y-1.5">
              <Label htmlFor="edit-name" className="text-xs font-bold">Photo Name *</Label>
              <Input
                id="edit-name"
                value={editName}
                onChange={(e) => setEditName(e.target.value)}
                placeholder="Photo name"
                className="text-sm"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="edit-alt" className="text-xs font-bold">Alt Text (SEO)</Label>
              <Textarea
                id="edit-alt"
                value={editAltText}
                onChange={(e) => setEditAltText(e.target.value)}
                placeholder="Describe what's in the photo..."
                rows={2}
                className="text-sm resize-none"
              />
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setEditingPhoto(null)} disabled={isSavingEdit}>
              Cancel
            </Button>
            <Button 
              onClick={handleSaveEdit} 
              disabled={isSavingEdit || !editName.trim()}
              className="bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
            >
              {isSavingEdit ? <><Loader2 className="mr-2 h-4 w-4 animate-spin" /> Saving...</> : <><Check className="mr-2 h-4 w-4" /> Save Changes</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Full Preview Dialog */}
      <Dialog open={!!previewPhoto} onOpenChange={(open) => { if (!open) setPreviewPhoto(null); }}>
        <DialogContent className="sm:max-w-3xl p-0 overflow-hidden">
          {previewPhoto && (
            <>
              <div className="bg-black flex items-center justify-center min-h-[300px] max-h-[70vh]">
                <img
                  src={previewPhoto.imageUrl}
                  alt={previewPhoto.altText || previewPhoto.name}
                  className="max-w-full max-h-[70vh] object-contain"
                />
              </div>
              <div className="p-4 space-y-1 border-t">
                <p className="text-sm font-bold text-foreground">{previewPhoto.name}</p>
                {previewPhoto.altText && (
                  <p className="text-xs text-muted-foreground italic">Alt: {previewPhoto.altText}</p>
                )}
                <div className="flex gap-2 pt-2">
                  <Button size="sm" variant="outline" onClick={() => { openEditDialog(previewPhoto); setPreviewPhoto(null); }}>
                    <Pencil className="mr-1.5 h-3.5 w-3.5" /> Edit
                  </Button>
                  <Button 
                    size="sm" 
                    variant="destructive" 
                    onClick={() => { handleDelete(previewPhoto); setPreviewPhoto(null); }}
                  >
                    <Trash2 className="mr-1.5 h-3.5 w-3.5" /> Remove
                  </Button>
                </div>
              </div>
            </>
          )}
        </DialogContent>
      </Dialog>

    </div>
  );
}
