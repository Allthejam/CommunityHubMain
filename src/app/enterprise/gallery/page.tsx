
'use client';

import * as React from "react";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Button } from "@/components/ui/button";
import {
  ImageIcon,
  Loader2,
  Trash2,
  Upload,
  Info,
  GalleryHorizontal,
} from "lucide-react";
import Image from "next/image";
import { useUser, useFirestore, useCollection, useMemoFirebase } from "@/firebase";
import { collection, query, where } from "firebase/firestore";
import { useToast } from "@/hooks/use-toast";
import { getPricingPlans, type Plan } from "@/lib/actions/pricingActions";
import { Progress } from "@/components/ui/progress";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { addGalleryImageAction, deleteGalleryImageAction, updateBusinessGalleryImageDescriptionAction } from "@/lib/actions/galleryActions";
import { Input } from "@/components/ui/input";
import { useDebouncedCallback } from "use-debounce";

const MAX_FILE_SIZE_MB = 2;

type Business = {
  id: string;
  businessName: string;
  gallery?: GalleryImage[];
};

type GalleryImage = {
  url: string;
  path: string;
  description?: string;
};

export default function EnterpriseGalleryPage() {
  const { user, isUserLoading: authLoading } = useUser();
  const db = useFirestore();
  const { toast } = useToast();

  const [selectedBusinessId, setSelectedBusinessId] = React.useState<
    string | null
  >(null);
  const [isUploading, setIsUploading] = React.useState(false);
  const [enterprisePlan, setEnterprisePlan] = React.useState<Plan | null>(null);
  const fileInputRef = React.useRef<HTMLInputElement>(null);
  const [imageToDelete, setImageToDelete] = React.useState<GalleryImage | null>(null);
  const [isDeleting, setIsDeleting] = React.useState(false);

  const businessQuery = useMemoFirebase(
    () => (user ? query(
        collection(db, "businesses"), 
        where("ownerId", "==", user.uid),
        where("accountType", "==", "enterprise")
    ) : null),
    [user, db]
  );
  const { data: businesses, isLoading: businessesLoading } = useCollection<Business>(businessQuery);
  
  const selectedBusiness = React.useMemo(
    () => businesses?.find((b) => b.id === selectedBusinessId),
    [businesses, selectedBusinessId]
  );

  const images = selectedBusiness?.gallery || [];

  const loading = authLoading || businessesLoading;

  React.useEffect(() => {
    if (businesses && businesses.length > 0 && !selectedBusinessId) {
        setSelectedBusinessId(businesses[0].id);
    }
  }, [businesses, selectedBusinessId]);

  React.useEffect(() => {
    const fetchPlans = async () => {
      const plans = await getPricingPlans();
      if (plans.enterprise) {
        setEnterprisePlan(plans.enterprise);
      }
    };
    fetchPlans();
  }, []);
  
  const galleryLimit = enterprisePlan?.galleryImages ?? 50;
  const currentImageCount = images?.length ?? 0;

  const handleImageUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!selectedBusinessId || !user) return;

    const file = e.target.files?.[0];
    if (!file) return;

    if (currentImageCount >= galleryLimit) {
        toast({
            title: "Gallery Full",
            description: "You have reached the maximum number of images for your plan.",
            variant: "destructive",
        });
        return;
    }

    if (file.size > MAX_FILE_SIZE_MB * 1024 * 1024) {
        toast({ title: "File too large", description: `Please upload an image smaller than ${MAX_FILE_SIZE_MB}MB.`, variant: "destructive" });
        return;
    }

    setIsUploading(true);
    toast({ title: "Processing image..." });
    
    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        const dataUrl = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = error => reject(error);
        });

        const storagePath = `gallery/${selectedBusinessId}/${Date.now()}-${file.name}`;
        
        const result = await addGalleryImageAction({
            businessId: selectedBusinessId, 
            imageUrl: dataUrl,
            storagePath,
        });

        if (result.success) {
            toast({ title: "Image Added!", description: "Your image has been added to the gallery."});
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ title: "Upload Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsUploading(false);
        if (fileInputRef.current) fileInputRef.current.value = "";
    }
  };
  
  const handleDeleteImage = async () => {
    if (!selectedBusinessId || !imageToDelete) return;
    setIsDeleting(true);

    try {
        const result = await deleteGalleryImageAction({
            businessId: selectedBusinessId,
            image: imageToDelete,
        });

        if (result.success) {
            toast({ title: "Image Deleted", description: "The image has been removed from your gallery." });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ title: "Deletion Failed", description: error.message, variant: "destructive" });
    } finally {
        setIsDeleting(false);
        setImageToDelete(null);
    }
  }
  
  const debouncedDescriptionUpdate = useDebouncedCallback(async (imageUrl: string, description: string) => {
    if (!selectedBusinessId) return;
    
    const result = await updateBusinessGalleryImageDescriptionAction({
      businessId: selectedBusinessId,
      imageUrl: imageUrl,
      description: description,
    });
    
    if (!result.success) {
        toast({ title: "Error", description: "Could not save description.", variant: "destructive" });
    } else {
        toast({ title: "Saved!", description: "Image description has been updated." });
    }
  }, 1000);


  if (loading) {
    return (
        <div className="flex justify-center items-center h-96">
            <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
        </div>
    );
  }


  return (
      <div className="space-y-8">
        <div>
          <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
            <GalleryHorizontal className="h-8 w-8" />
            Group Galleries
          </h1>
          <p className="text-muted-foreground">
            Manage the images that appear on your enterprise group profile pages.
          </p>
        </div>

        <AlertDialog onOpenChange={(open) => !open && setImageToDelete(null)}>
        <Card>
            <CardHeader>
              <CardTitle>Select a Group</CardTitle>
              <CardDescription>
                Choose which group's gallery you want to manage.
              </CardDescription>
            </CardHeader>
            <CardContent>
              {loading ? (
                <Loader2 className="h-6 w-6 animate-spin" />
              ) : (
                <Select
                  value={selectedBusinessId || ""}
                  onValueChange={setSelectedBusinessId}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Select a group..." />
                  </SelectTrigger>
                  <SelectContent>
                    {businesses?.map((biz) => (
                      <SelectItem key={biz.id} value={biz.id}>
                        {biz.businessName}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              )}
            </CardContent>
        </Card>

        {selectedBusinessId && (
          <Card>
            <CardHeader>
              <CardTitle>
                {selectedBusiness?.businessName} Gallery
              </CardTitle>
              <CardDescription>
                Upload, view, and delete your gallery images.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-2">
                    <div className="flex justify-between text-sm text-muted-foreground">
                        <span>Image Slots Used</span>
                        <span>{currentImageCount} / {galleryLimit}</span>
                    </div>
                    <Progress value={(currentImageCount / galleryLimit) * 100} />
                </div>
                
                <Alert>
                    <Info className="h-4 w-4" />
                    <AlertTitle>Image Guidelines</AlertTitle>
                    <AlertDescription>
                        For best results, upload images in a 4:3 aspect ratio (e.g., 1200x900 pixels). Max file size is {MAX_FILE_SIZE_MB}MB per image.
                    </AlertDescription>
                </Alert>

              <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-6">
                {images?.map((image, index) => (
                  <div key={`${image.path}-${index}`} className="space-y-2">
                      <div className="relative group aspect-square">
                          <Image
                              src={image.url}
                              alt={image.description || `Gallery image ${index + 1}`}
                              fill
                              className="object-cover rounded-md border"
                          />
                          <div className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center rounded-md p-2">
                          <AlertDialogTrigger asChild>
                              <Button variant="destructive" size="icon" onClick={() => setImageToDelete(image)}>
                                  <Trash2 />
                              </Button>
                          </AlertDialogTrigger>
                          </div>
                      </div>
                      <Input
                          defaultValue={image.description || ''}
                          onChange={(e) => debouncedDescriptionUpdate(image.url, e.target.value)}
                          placeholder="Image description..."
                          className="h-8 text-xs"
                      />
                  </div>
                ))}
                 {currentImageCount < galleryLimit && (
                     <div 
                        className="aspect-square border-2 border-dashed rounded-md flex flex-col items-center justify-center text-muted-foreground cursor-pointer hover:bg-muted/50 hover:border-primary transition-colors"
                        onClick={() => fileInputRef.current?.click()}
                     >
                        {isUploading ? (
                            <Loader2 className="h-8 w-8 animate-spin" />
                        ) : (
                        <>
                            <Upload className="h-8 w-8 mb-2" />
                            <span className="text-sm text-center">Click to upload</span>
                        </>
                        )}
                     </div>
                 )}
                 <input
                    type="file"
                    ref={fileInputRef}
                    className="hidden"
                    accept="image/png, image/jpeg, image/gif, image/webp"
                    onChange={handleImageUpload}
                    disabled={isUploading}
                />
              </div>
            </CardContent>
          </Card>
        )}
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone. This will permanently delete the image from your gallery.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDeleteImage} disabled={isDeleting}>
              {isDeleting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
      </div>
  );
}
