'use client';

import * as React from 'react';
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from '@/firebase';
import { doc, updateDoc, collection, query, where, orderBy, serverTimestamp } from 'firebase/firestore';
import { Card, CardContent, CardHeader, CardTitle, CardDescription, CardFooter } from '@/components/ui/card';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Progress } from '@/components/ui/progress';
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel, DropdownMenuSeparator, DropdownMenuTrigger } from '@/components/ui/dropdown-menu';
import { 
  Loader2, 
  Package, 
  Truck, 
  MapPin, 
  User, 
  Store, 
  MoreHorizontal, 
  CheckCircle, 
  RefreshCcw, 
  DollarSign, 
  Camera, 
  Gift, 
  TrendingUp, 
  Edit3, 
  Upload, 
  Image as ImageIcon, 
  Landmark, 
  ArrowUpRight, 
  Save, 
  Trash2, 
  ShieldCheck, 
  FileCheck, 
  Phone, 
  Mail,
  ShoppingBag,
} from 'lucide-react'; // Fast Refresh Trigger
import { getCourierOrdersAction, updateOrderStatusAction } from '@/lib/actions/orderActions';
import { addGalleryImageAction, deleteGalleryImageAction } from '@/lib/actions/galleryActions';
import { useToast } from '@/hooks/use-toast';
import { useActiveCommunityId } from '@/hooks/use-active-community-id';
import Link from 'next/link';

type OrderStatus = 'Received' | 'Awaiting Payment' | 'Packed' | 'Shipped' | 'Ready for Collection' | 'Delivered/Collected' | 'Refunded' | 'Return to Stock';

type GalleryImageItem = {
  id: string;
  url: string;
  path?: string;
  description?: string;
};

type PerkItem = {
  id: string;
  store: string;
  discount: string;
  description: string;
};

type CourierApplicationDoc = {
  id: string;
  applicantId: string;
  applicantName: string;
  communityId: string;
  communityName: string;
  contactEmail: string;
  contactPhone: string;
  licenseImageUrl?: string;
  selfieImageUrl?: string;
  statement?: string;
  status: 'Approved' | 'Pending Review' | 'Declined';
  vehicleDetails?: string;
  refName?: string;
  refPhone?: string;
};

const MAX_GALLERY_LIMIT = 10;
const MAX_FILE_SIZE_MB = 5;

const StatusBadge = ({ status }: { status: OrderStatus }) => {
  const statusConfig: Record<OrderStatus, { className: string; icon: React.ReactNode }> = {
    'Received': { className: 'bg-blue-100 text-blue-800 border-blue-200', icon: <Package className="h-3 w-3" /> },
    'Awaiting Payment': { className: 'bg-yellow-100 text-yellow-800 border-yellow-200', icon: <DollarSign className="h-3 w-3" /> },
    'Packed': { className: 'bg-orange-100 text-orange-800 border-orange-200', icon: <Package className="h-3 w-3" /> },
    'Shipped': { className: 'bg-purple-100 text-purple-800 border-purple-200', icon: <Truck className="h-3 w-3" /> },
    'Ready for Collection': { className: 'bg-indigo-100 text-indigo-800 border-indigo-200', icon: <CheckCircle className="h-3 w-3" /> },
    'Delivered/Collected': { className: 'bg-emerald-100 text-emerald-800 border-emerald-200', icon: <CheckCircle className="h-3 w-3" /> },
    'Refunded': { className: 'bg-red-100 text-red-800 border-red-200', icon: <RefreshCcw className="h-3 w-3" /> },
    'Return to Stock': { className: 'bg-gray-100 text-gray-800 border-gray-200', icon: <Package className="h-3 w-3" /> },
  };

  const config = statusConfig[status] || { className: 'bg-gray-100 text-gray-800', icon: null };

  return (
    <Badge variant="outline" className={config.className}>
      {config.icon}
      <span className="ml-1.5 font-medium">{status}</span>
    </Badge>
  );
};

export default function CourierDashboardPage() {
  const { user, isUserLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();
  const { communityId, userProfile, isLoading: activeCommunityLoading } = useActiveCommunityId();

  const fileInputRef = React.useRef<HTMLInputElement | null>(null);

  const [orders, setOrders] = React.useState<any[]>([]);
  const [loading, setLoading] = React.useState(true);
  const [isUpdating, setIsUpdating] = React.useState<string | null>(null);

  // Community Doc Query
  const communityRef = useMemoFirebase(
    () => (communityId ? doc(db, 'communities', communityId) : null),
    [communityId, db]
  );
  const { data: communityData } = useDoc(communityRef);

  // Live Courier Applications Query (communities/{communityId}/courier_applications)
  const appQuery = useMemoFirebase(
    () =>
      user && communityId
        ? query(
            collection(db, `communities/${communityId}/courier_applications`),
            where('applicantId', '==', user.uid)
          )
        : null,
    [user, communityId, db]
  );
  const { data: courierApps } = useCollection<CourierApplicationDoc>(appQuery);
  const activeApp = courierApps?.[0];

  // Profile Edit State
  const [isProfileOpen, setIsProfileOpen] = React.useState(false);
  const [courierName, setCourierName] = React.useState('');
  const [vehicleType, setVehicleType] = React.useState('');
  const [contactPhone, setContactPhone] = React.useState('');
  const [courierBio, setCourierBio] = React.useState('');
  const [isSavingProfile, setIsSavingProfile] = React.useState(false);

  // Business Document Query (/businesses where accountType == 'courier' & ownerId == user.uid)
  const bizQuery = useMemoFirebase(
    () =>
      user && communityId
        ? query(
            collection(db, 'businesses'),
            where('ownerId', '==', user.uid),
            where('accountType', '==', 'courier'),
            where('primaryCommunityId', '==', communityId)
          )
        : null,
    [user, communityId, db]
  );
  const { data: courierBusinesses } = useCollection<any>(bizQuery);
  const existingBiz = courierBusinesses?.[0];

  // Live Firestore Gallery Query (users/{userId}/gallery fallback subcollection)
  const galleryQuery = useMemoFirebase(
    () => (user ? query(collection(db, `users/${user.uid}/gallery`), orderBy('createdAt', 'desc')) : null),
    [user, db]
  );
  const { data: firestoreGallery } = useCollection<GalleryImageItem>(galleryQuery);

  const [isGalleryOpen, setIsGalleryOpen] = React.useState(false);
  const [isUploadingImage, setIsUploadingImage] = React.useState(false);

  // Live Firestore Perks Query (communities/{communityId}/perks)
  const perksQuery = useMemoFirebase(
    () => (communityId ? collection(db, `communities/${communityId}/perks`) : null),
    [communityId, db]
  );
  const { data: firestorePerks } = useCollection<PerkItem>(perksQuery);
  const [isPerksOpen, setIsPerksOpen] = React.useState(false);

  // Synchronize fields from courier application document & userProfile
  React.useEffect(() => {
    if (activeApp) {
      setCourierName(activeApp.applicantName || userProfile?.courierName || userProfile?.name || '');
      setVehicleType(activeApp.vehicleDetails || userProfile?.vehicleType || 'Mercedes');
      setContactPhone(activeApp.contactPhone || userProfile?.phone || '');
      setCourierBio(activeApp.statement || userProfile?.courierBio || 'Official local community courier providing fast, eco-friendly deliveries.');
    } else if (userProfile) {
      setCourierName(userProfile.courierName || userProfile.name || '');
      setVehicleType(userProfile.vehicleType || 'Mercedes');
      setContactPhone(userProfile.phone || userProfile.contactPhone || '');
      setCourierBio(userProfile.courierBio || 'Official local community courier providing fast, eco-friendly deliveries.');
    }
  }, [activeApp, userProfile]);

  const fetchOrders = React.useCallback(async () => {
    if (user && communityId) {
      setLoading(true);
      try {
        const data = await getCourierOrdersAction(user.uid, communityId);
        setOrders(data);
      } catch (err) {
        console.error('Failed to fetch courier orders:', err);
      } finally {
        setLoading(false);
      }
    } else if (!isUserLoading && !activeCommunityLoading) {
      setLoading(false);
    }
  }, [user, communityId, isUserLoading, activeCommunityLoading]);

  React.useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  const handleUpdateStatus = async (orderId: string, status: OrderStatus) => {
    setIsUpdating(orderId);
    const result = await updateOrderStatusAction({ orderId, status });
    if (result.success) {
      toast({ title: 'Status Updated', description: `Order status updated to "${status}".` });
      fetchOrders();
    } else {
      toast({ title: 'Error', description: 'Could not update order status.', variant: 'destructive' });
    }
    setIsUpdating(null);
  };

  const handleSaveProfile = async () => {
    if (!user) return;
    setIsSavingProfile(true);
    try {
      const userRef = doc(db, 'users', user.uid);
      await updateDoc(userRef, {
        courierName,
        vehicleType,
        phone: contactPhone,
        courierBio,
      });
      toast({ title: 'Profile Updated', description: 'Your courier profile has been saved successfully in Firebase.' });
      setIsProfileOpen(false);
    } catch (err: any) {
      toast({ title: 'Error', description: err.message || 'Could not save profile.', variant: 'destructive' });
    } finally {
      setIsSavingProfile(false);
    }
  };

  // Real File Upload to Firebase Storage
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!user) return;

    const file = e.target.files?.[0];
    if (!file) return;

    const currentCount = firestoreGallery?.length || 0;
    if (currentCount >= MAX_GALLERY_LIMIT) {
      toast({
        title: 'Gallery Full (Max 10)',
        description: `You have reached the maximum limit of ${MAX_GALLERY_LIMIT} photos in your courier gallery.`,
        variant: 'destructive',
      });
      return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
      toast({
        title: 'File too large',
        description: `Please select an image smaller than ${MAX_FILE_SIZE_MB}MB.`,
        variant: 'destructive',
      });
      return;
    }

    setIsUploadingImage(true);
    toast({ title: 'Uploading image to Storage...' });

    try {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      const dataUrl = await new Promise<string>((resolve, reject) => {
        reader.onload = () => resolve(reader.result as string);
        reader.onerror = (error) => reject(error);
      });

      const bizId = existingBiz?.id;
      const storagePath = `gallery/${bizId || user.uid}/${Date.now()}-${file.name}`;
      const res = await addGalleryImageAction({
        businessId: bizId,
        userId: user.uid,
        imageUrl: dataUrl,
        storagePath,
      });

      if (res.success) {
        toast({ title: 'Photo Uploaded!', description: 'Your photo has been saved to your courier gallery.' });
      } else {
        throw new Error(res.error);
      }
    } catch (err: any) {
      toast({ title: 'Upload Failed', description: err.message, variant: 'destructive' });
    } finally {
      setIsUploadingImage(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const handleDeleteImage = async (image: GalleryImageItem) => {
    if (!user) return;
    try {
      await deleteGalleryImageAction({
        businessId: existingBiz?.id,
        userId: user.uid,
        imageId: image.id || '',
        imageUrl: image.url,
        imagePath: image.path || '',
      });
      toast({ title: 'Photo Removed', description: 'Photo removed from gallery.' });
    } catch (err: any) {
      toast({ title: 'Error', description: err.message, variant: 'destructive' });
    }
  };

  if (isUserLoading || activeCommunityLoading || loading) {
    return (
      <div className="flex justify-center items-center h-96">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  // Combine gallery array from /businesses/{businessId} and fallback users/{userId}/gallery subcollection
  const bizGalleryArray: GalleryImageItem[] = existingBiz?.gallery || [];
  const subcollectionGallery: GalleryImageItem[] = firestoreGallery || [];

  // Deduplicate gallery list by URL or Path
  const combinedMap = new Map<string, GalleryImageItem>();
  bizGalleryArray.forEach(item => {
    if (item.url) combinedMap.set(item.url, item);
  });
  subcollectionGallery.forEach(item => {
    if (item.url && !combinedMap.has(item.url)) combinedMap.set(item.url, item);
  });

  const galleryList = Array.from(combinedMap.values());
  const perkList = firestorePerks || [];
  const courierFee = communityData?.courierDeliveryFee ?? 0.20;

  // Financial Stats Calculation
  const totalEarnings = orders
    .filter((o) => o.status === 'Delivered/Collected')
    .reduce((acc, curr) => acc + (Number(curr.deliveryFee) || courierFee), 0);
  const completedJobsCount = orders.filter((o) => o.status === 'Delivered/Collected').length;
  const avgFee = completedJobsCount > 0 ? (totalEarnings / completedJobsCount).toFixed(2) : courierFee.toFixed(2);

  const isApproved = activeApp?.status === 'Approved' || userProfile?.permissions?.isCourier === true;

  return (
    <div className="space-y-8 pb-12">
      {/* Top Header */}
      <div>
        <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
          <Truck className="h-8 w-8 text-primary" />
          Courier Dashboard
        </h1>
        <p className="text-muted-foreground">
          Manage local deliveries, edit courier profile, manage photo gallery (max 10), and track performance for {communityData?.name || userProfile?.communityName || 'your community'}.
        </p>
      </div>

      {/* 4 Core Courier Feature Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        {/* Card 1: Your Community Local Courier (Edit Profile) */}
        <Card className="flex flex-col justify-between hover:shadow-md transition-shadow border-primary/20 bg-card">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className={isApproved ? "bg-emerald-50 text-emerald-700 border-emerald-200" : "bg-amber-50 text-amber-700 border-amber-200"}>
                <ShieldCheck className="mr-1 h-3 w-3" />
                {isApproved ? 'Approved Courier' : 'Application Pending'}
              </Badge>
              <Truck className="h-5 w-5 text-primary" />
            </div>
            <CardTitle className="text-lg font-bold mt-2">
              {courierName || activeApp?.applicantName || userProfile?.name || 'Local Courier Service'}
            </CardTitle>
            <CardDescription className="text-xs line-clamp-2">
              {courierBio ? courierBio.replace(/<[^>]*>?/gm, '') : 'Official local community courier.'}
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 text-xs text-muted-foreground pb-3">
            <div className="flex items-center gap-2">
              <Truck className="h-3.5 w-3.5 text-foreground shrink-0" />
              <span>Vehicle: <strong className="text-foreground">{vehicleType}</strong></span>
            </div>
            <div className="flex items-center gap-2">
              <Phone className="h-3.5 w-3.5 text-foreground shrink-0" />
              <span>Phone: <strong className="text-foreground">{contactPhone || activeApp?.contactPhone || 'Registered'}</strong></span>
            </div>
            {activeApp?.licenseImageUrl && (
              <div className="flex items-center gap-2 text-emerald-600 font-medium">
                <FileCheck className="h-3.5 w-3.5 shrink-0" />
                <span>Driving License Verified</span>
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href="/courier/profile">
                <Edit3 className="mr-2 h-3.5 w-3.5" /> Edit Courier Profile
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Card 2: Courier Photo Gallery (Max 10 Uploads) */}
        <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-purple-50 text-purple-700 border-purple-200">
                {galleryList.length} / {MAX_GALLERY_LIMIT} Photos
              </Badge>
              <Camera className="h-5 w-5 text-purple-600" />
            </div>
            <CardTitle className="text-lg font-bold mt-2">Courier Photo Gallery</CardTitle>
            <CardDescription className="text-xs">
              Upload photos of your delivery vehicle, team, and package handling (max 10).
            </CardDescription>
          </CardHeader>
          <CardContent className="pb-3 space-y-2">
            <Progress value={(galleryList.length / MAX_GALLERY_LIMIT) * 100} className="h-1.5" />
            {galleryList.length > 0 ? (
              <div className="grid grid-cols-3 gap-1.5 rounded-lg overflow-hidden border">
                {galleryList.slice(0, 3).map((img, idx) => (
                  <div key={img.id || img.url || img.path || idx} className="aspect-square bg-muted relative overflow-hidden group">
                    <img src={img.url} alt={img.description || 'Courier photo'} className="w-full h-full object-cover group-hover:scale-105 transition-transform" />
                  </div>
                ))}
              </div>
            ) : (
              <div className="h-20 flex flex-col items-center justify-center border-2 border-dashed rounded-lg text-muted-foreground text-xs italic">
                <ImageIcon className="h-5 w-5 mb-1 text-muted-foreground/60" />
                No gallery photos uploaded yet.
              </div>
            )}
          </CardContent>
          <CardFooter className="pt-0">
            <Dialog open={isGalleryOpen} onOpenChange={setIsGalleryOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <ImageIcon className="mr-2 h-3.5 w-3.5" /> Manage Gallery ({galleryList.length}/{MAX_GALLERY_LIMIT})
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Camera className="h-5 w-5 text-purple-600" />
                    Courier Photo Gallery Management
                  </DialogTitle>
                  <DialogDescription>
                    Upload and manage up to {MAX_GALLERY_LIMIT} photos stored in Firebase Storage.
                  </DialogDescription>
                </DialogHeader>
                <div className="space-y-4 py-2">
                  <div className="flex items-center justify-between text-xs text-muted-foreground">
                    <span>Gallery Capacity</span>
                    <span className="font-semibold text-foreground">{galleryList.length} / {MAX_GALLERY_LIMIT} photos</span>
                  </div>
                  <Progress value={(galleryList.length / MAX_GALLERY_LIMIT) * 100} className="h-2" />

                  {galleryList.length > 0 ? (
                    <div className="grid grid-cols-3 gap-2 max-h-60 overflow-y-auto p-1">
                      {galleryList.map((img, idx) => (
                        <div key={img.id || img.url || img.path || idx} className="aspect-square bg-muted rounded-md overflow-hidden relative border group">
                          <img src={img.url} alt="Courier gallery" className="w-full h-full object-cover" />
                          <button
                            onClick={() => handleDeleteImage(img)}
                            className="absolute top-1 right-1 p-1.5 bg-red-600 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity"
                            title="Delete photo"
                          >
                            <Trash2 className="h-3 w-3" />
                          </button>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <div className="py-8 text-center border-2 border-dashed rounded-lg text-muted-foreground text-xs italic">
                      No photos in gallery. Click below to select image files to upload.
                    </div>
                  )}

                  <div className="space-y-2 pt-2 border-t">
                    <input
                      type="file"
                      accept="image/*"
                      ref={fileInputRef}
                      onChange={handleFileUpload}
                      className="hidden"
                    />
                    <Button
                      onClick={() => fileInputRef.current?.click()}
                      disabled={isUploadingImage || galleryList.length >= MAX_GALLERY_LIMIT}
                      className="w-full"
                    >
                      {isUploadingImage ? (
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      ) : (
                        <Upload className="mr-2 h-4 w-4" />
                      )}
                      {galleryList.length >= MAX_GALLERY_LIMIT
                        ? 'Gallery Limit Reached (10/10)'
                        : 'Upload New Image File'}
                    </Button>
                  </div>
                </div>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>

        {/* Card 3: Financial Performance */}
        <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-emerald-50 text-emerald-700 border-emerald-200">
                Delivery Payouts
              </Badge>
              <TrendingUp className="h-5 w-5 text-emerald-600" />
            </div>
            <CardTitle className="text-lg font-bold mt-2">Financial Performance</CardTitle>
            <CardDescription className="text-xs">
              Delivery fee earnings and completed delivery metrics for this hub.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pb-3">
            <div className="text-2xl font-extrabold text-foreground">
              £{totalEarnings.toFixed(2)}
            </div>
            <div className="flex items-center justify-between text-xs text-muted-foreground pt-1 border-t">
              <span>Completed Deliveries: <strong className="text-foreground">{completedJobsCount}</strong></span>
              <span>Delivery Fee: <strong className="text-foreground">£{courierFee.toFixed(2)}</strong></span>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Button variant="outline" size="sm" asChild className="w-full">
              <Link href="/courier/financials">
                <Landmark className="mr-2 h-3.5 w-3.5 text-emerald-600" /> View Financials <ArrowUpRight className="ml-auto h-3 w-3" />
              </Link>
            </Button>
          </CardFooter>
        </Card>

        {/* Card 4: Business Perks & Community Benefits */}
        <Card className="flex flex-col justify-between hover:shadow-md transition-shadow">
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <Badge variant="outline" className="bg-amber-50 text-amber-700 border-amber-200">
                4 Core Perks Active
              </Badge>
              <Gift className="h-5 w-5 text-amber-600" />
            </div>
            <CardTitle className="text-lg font-bold mt-2">Courier Perks & Benefits</CardTitle>
            <CardDescription className="text-xs">
              Exclusive privileges & 40% revenue share earned for serving your community.
            </CardDescription>
          </CardHeader>
          <CardContent className="space-y-2 pb-3 text-xs">
            <div className="space-y-1.5">
              <div className="flex items-center gap-2 p-1.5 rounded-md bg-emerald-50/70 border border-emerald-100 text-emerald-900">
                <Store className="h-3.5 w-3.5 text-emerald-600 shrink-0" />
                <span className="font-semibold text-xs truncate">Free Business Listing & Storefront</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-md bg-blue-50/70 border border-blue-100 text-blue-900">
                <Truck className="h-3.5 w-3.5 text-blue-600 shrink-0" />
                <span className="font-semibold text-xs truncate">Set Custom Delivery Prices</span>
              </div>
              <div className="flex items-center gap-2 p-1.5 rounded-md bg-purple-50/70 border border-purple-100 text-purple-900">
                <DollarSign className="h-3.5 w-3.5 text-purple-600 shrink-0" />
                <span className="font-semibold text-xs truncate">40% Revenue Share Model</span>
              </div>
            </div>
          </CardContent>
          <CardFooter className="pt-0">
            <Dialog open={isPerksOpen} onOpenChange={setIsPerksOpen}>
              <DialogTrigger asChild>
                <Button variant="outline" size="sm" className="w-full">
                  <Gift className="mr-2 h-3.5 w-3.5 text-amber-600" /> View Courier Perks & Revenue Share
                </Button>
              </DialogTrigger>
              <DialogContent className="sm:max-w-lg">
                <DialogHeader>
                  <DialogTitle className="flex items-center gap-2">
                    <Gift className="h-5 w-5 text-amber-600" />
                    Appointed Courier Perks & Benefits
                  </DialogTitle>
                  <DialogDescription>
                    Official perks, business storefront benefits, and community revenue sharing model.
                  </DialogDescription>
                </DialogHeader>

                <div className="space-y-4 py-2 text-xs">
                  {/* 4 Core Perks */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div className="p-3 rounded-lg border bg-emerald-50/40 border-emerald-200 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-emerald-900">
                        <Store className="h-4 w-4 text-emerald-600" />
                        Free Business Listing
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Full business profile listing on the Virtual Highstreet provided free of charge upon leader approval.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border bg-blue-50/40 border-blue-200 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-blue-900">
                        <ShoppingBag className="h-4 w-4 text-blue-600" />
                        Free Online Store
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Complete online shop & digital storefront to sell products and services directly to local customers.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border bg-purple-50/40 border-purple-200 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-purple-900">
                        <Truck className="h-4 w-4 text-purple-600" />
                        Set Delivery Prices
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Full authority to set and adjust community delivery fees (£) for orders delivered within your hub.
                      </p>
                    </div>

                    <div className="p-3 rounded-lg border bg-amber-50/40 border-amber-200 space-y-1">
                      <div className="flex items-center gap-2 font-bold text-amber-900">
                        <DollarSign className="h-4 w-4 text-amber-600" />
                        40% Revenue Share
                      </div>
                      <p className="text-muted-foreground text-[11px]">
                        Receive 40% of all subscription revenue generated from registered online stores in your community.
                      </p>
                    </div>
                  </div>

                  {/* Revenue Split Model Breakdown Card */}
                  <div className="p-4 rounded-xl bg-slate-900 text-white space-y-3">
                    <div className="flex items-center justify-between border-b border-slate-700 pb-2">
                      <span className="font-bold text-sm text-amber-400 flex items-center gap-2">
                        <TrendingUp className="h-4 w-4" /> Community Subscription Revenue Split
                      </span>
                      <Badge className="bg-amber-500 text-slate-950 font-extrabold text-[10px]">100% Total</Badge>
                    </div>

                    <div className="grid grid-cols-3 gap-2 text-center pt-1">
                      <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Admin</span>
                        <span className="text-lg font-black text-blue-400">50%</span>
                        <span className="text-[9px] text-slate-400 block">Platform Costs</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/80 border border-amber-500/50 space-y-0.5 ring-2 ring-amber-500/30">
                        <span className="text-[10px] uppercase font-bold text-amber-400 block">Courier (You)</span>
                        <span className="text-lg font-black text-amber-300">40%</span>
                        <span className="text-[9px] text-amber-200/70 block">Appointed Courier</span>
                      </div>
                      <div className="p-2 rounded-lg bg-slate-800/80 border border-slate-700 space-y-0.5">
                        <span className="text-[10px] uppercase font-bold text-slate-400 block">Leaders</span>
                        <span className="text-lg font-black text-emerald-400">10%</span>
                        <span className="text-[9px] text-slate-400 block">Community Oversight</span>
                      </div>
                    </div>
                  </div>

                  {/* Additional Storefront Perks */}
                  {perkList.length > 0 && (
                    <div className="space-y-2 pt-2 border-t">
                      <span className="font-semibold text-xs text-muted-foreground uppercase tracking-wider">Local Storefront Partner Perks</span>
                      <div className="space-y-1.5 max-h-32 overflow-y-auto pr-1">
                        {perkList.map((perk) => (
                          <div key={perk.id} className="p-2 rounded-md border bg-muted/30 flex items-center justify-between">
                            <div>
                              <span className="font-semibold text-xs">{perk.store}</span>
                              <p className="text-[10px] text-muted-foreground">{perk.description}</p>
                            </div>
                            <Badge variant="secondary" className="text-[10px] text-amber-800 bg-amber-100">{perk.discount}</Badge>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>
              </DialogContent>
            </Dialog>
          </CardFooter>
        </Card>
      </div>

      {/* Main Delivery Tasks Section */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>Open Delivery Tasks</span>
            <Button variant="ghost" size="sm" asChild>
              <Link href="/courier/orders">
                View All Orders <ArrowUpRight className="ml-1 h-3.5 w-3.5" />
              </Link>
            </Button>
          </CardTitle>
          <CardDescription>Orders requiring collection or delivery in {communityData?.name || userProfile?.communityName || 'your active community'}.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="rounded-md border overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Order ID</TableHead>
                  <TableHead>Storefront</TableHead>
                  <TableHead>Customer</TableHead>
                  <TableHead>Delivery Address</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {orders && orders.length > 0 ? (
                  orders.map((order) => (
                    <TableRow key={order.id}>
                      <TableCell className="font-mono text-xs font-semibold">{order.id.substring(0, 8)}...</TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <Store className="h-4 w-4 text-muted-foreground" />
                          <span className="font-medium">{order.businessName}</span>
                        </div>
                      </TableCell>
                      <TableCell>
                        <div className="flex items-center gap-2">
                          <User className="h-4 w-4 text-muted-foreground" />
                          <span>{order.customerName}</span>
                        </div>
                      </TableCell>
                      <TableCell className="max-w-[200px]">
                        <div className="flex items-start gap-2">
                          <MapPin className="h-4 w-4 text-muted-foreground mt-0.5 shrink-0" />
                          <span className="text-xs line-clamp-2">{order.shippingAddress}</span>
                        </div>
                      </TableCell>
                      <TableCell><StatusBadge status={order.status} /></TableCell>
                      <TableCell className="text-right">
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" disabled={isUpdating === order.id}>
                              {isUpdating === order.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <MoreHorizontal className="h-4 w-4" />}
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuLabel>Update Delivery Status</DropdownMenuLabel>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Shipped')}>
                              <Truck className="mr-2 h-4 w-4 text-purple-600" /> Out for Delivery
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Delivered/Collected')}>
                              <CheckCircle className="mr-2 h-4 w-4 text-emerald-600" /> Delivered
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleUpdateStatus(order.id, 'Packed')}>
                              <RefreshCcw className="mr-2 h-4 w-4 text-orange-600" /> Back to Store (Packed)
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell colSpan={6} className="h-48 text-center">
                      <div className="flex flex-col items-center justify-center space-y-2">
                        <Package className="h-12 w-12 text-muted-foreground/50 mb-2" />
                        <h3 className="font-semibold text-base">No Delivery Tasks</h3>
                        <p className="text-muted-foreground text-sm max-w-sm">There are currently no orders requiring delivery in your community.</p>
                      </div>
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
