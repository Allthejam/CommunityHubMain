'use client';

import * as React from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import * as z from 'zod';
import { Button } from '@/components/ui/button';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
  FormDescription,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Trash2, Upload, Percent, BadgePercent, Truck, DollarSign, Search, Youtube } from 'lucide-react';
import { saveProductAction, deleteProductImageAction, uploadProductImageAction } from '@/lib/actions/productActions';
import Image from 'next/image';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Checkbox } from './ui/checkbox';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardFooter, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Separator } from './ui/separator';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from './ui/collapsible';
import { DateRangePicker } from './ui/date-range-picker';
import { Switch } from './ui/switch';
import { RadioGroup, RadioGroupItem } from './ui/radio-group';
import { Alert, AlertDescription, AlertTitle } from './ui/alert';
import { RichTextEditor } from './rich-text-editor';
import { ProductVariationManager } from './product-variation-manager';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { DatePicker } from './ui/date-picker';
import { getShoppingCategories, type ShoppingCategory } from '@/lib/actions/dropdownActions';

const MAX_IMAGES = 4;
const MAX_FILE_SIZE_MB = 2;

const productFormSchema = z.object({
  name: z.string().min(3, 'Product name must be at least 3 characters.'),
  slug: z.string().optional(),
  description: z.string().min(10, 'Description is too short.'),
  price: z.coerce.number().optional(),
  stock: z.coerce.number().int().optional(),
  status: z.enum(['online', 'offline']).default('online'),
  outOfStockAction: z.enum(['deny', 'allow']).optional(),
  images: z.array(z.object({
    url: z.string(),
    path: z.string(),
    description: z.string().optional(),
  })).max(MAX_IMAGES, `You can upload a maximum of ${MAX_IMAGES} images.`).optional(),
  videoUrl: z.string().url("Please enter a valid URL.").optional().or(z.literal('')),
  audience: z.string().min(1, { message: "Target audience selection is required." }),
  gender: z.string().optional(),
  category: z.string().optional(),
  subcategory: z.string().optional(),
  brand: z.string().optional(),
  referenceNumber: z.string().optional(),
  mpn: z.string().optional(),
  upc: z.string().optional(),
  ean: z.string().optional(),
  isbn: z.string().optional(),
  onSale: z.boolean().optional(),
  discountType: z.enum(['amount', 'percentage']).optional(),
  salePrice: z.coerce.number().optional(),
  discountValue: z.coerce.number().optional(),
  showOriginalPrice: z.boolean().optional(),
  saleDateRange: z.object({ from: z.date().optional(), to: z.date().optional() }).optional(),
  metaTitle: z.string().max(70, 'Meta title should be 70 characters or less.').optional(),
  metaDescription: z.string().max(160, 'Meta description should be 160 characters or less.').optional(),
  hasVariations: z.boolean().optional(),
  variationsConfig: z.any().optional(),
  variationsStock: z.any().optional(),
  tags: z.string().optional(),
}).superRefine((data, ctx) => {
    if (!data.hasVariations) {
        if (data.price === undefined || data.price === null || data.price <= 0) {
            ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['price'],
                message: 'Price must be a positive number for products without variations.',
            });
        }
        if (data.stock === undefined || data.stock === null || data.stock < 0) {
             ctx.addIssue({
                code: z.ZodIssueCode.custom,
                path: ['stock'],
                message: 'Stock is required and must be non-negative for products without variations.',
            });
        }
    }
});


type ProductFormValues = z.infer<typeof productFormSchema>;

type ProductFormProps = {
  businessId: string | null;
  product?: any | null;
  onSave: () => void;
};

type ImageObject = {
    url: string;
    path: string;
    description?: string;
};

const audienceItems = [
    { id: 'all', label: 'Suitable for All Ages' },
    { id: 'adults', label: 'Adults (21+)' },
    { id: 'children', label: 'Children (Under 21)' },
];

const genderItems = [
    { id: 'all', label: 'All Genders' },
    { id: 'male', label: 'Male' },
    { id: 'female', label: 'Female' },
    { id: 'other', label: 'Other' },
];

const slugify = (text: string) => {
    if (!text) return '';
    return text
      .toLowerCase()
      .replace(/\s+/g, '-')
      .replace(/[^\w-]+/g, '');
};

export function ProductForm({ businessId, product, onSave }: ProductFormProps) {
  const { toast } = useToast();
  const [isSubmitting, setIsSubmitting] = React.useState(false);
  const [isUploading, setIsUploading] = React.useState(false);
  const [isAdvancedOpen, setIsAdvancedOpen] = React.useState(false);
  const db = useFirestore();

  const [categories, setCategories] = React.useState<ShoppingCategory[]>([]);
  const [loadingCategories, setLoadingCategories] = React.useState(true);

  const [showOtherCategory, setShowOtherCategory] = React.useState(false);
  const [customCategory, setCustomCategory] = React.useState('');

  React.useEffect(() => {
    const fetchCategories = async () => {
        setLoadingCategories(true);
        const fetchedCategories = await getShoppingCategories();
        setCategories(fetchedCategories);
        setLoadingCategories(false);
    };
    fetchCategories();
  }, []);

  const variationDocRef = useMemoFirebase(() => 
      (db && businessId && product?.id) ? doc(db, `businesses/${businessId}/products/${product.id}/product_data/variations`) : null
  , [db, businessId, product?.id]);

  const { data: firestoreVariationData, isLoading: variationsLoading } = useDoc(variationDocRef);


  const form = useForm<ProductFormValues>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
          name: '',
          slug: '',
          description: '',
          price: undefined,
          stock: undefined,
          status: 'online',
          images: [],
          videoUrl: '',
          audience: 'all',
          gender: 'all',
          category: '',
          subcategory: '',
          tags: '',
          brand: '',
          referenceNumber: '',
          mpn: '',
          upc: '',
          ean: '',
          isbn: '',
          onSale: false,
          discountType: 'amount',
          showOriginalPrice: true,
          outOfStockAction: 'deny',
          saleDateRange: { from: undefined, to: undefined },
          hasVariations: false,
          variationsConfig: [],
          variationsStock: {},
    }
  });

  React.useEffect(() => {
    if (product && categories.length > 0) {
        const imagesSource = product.images || [];
        const mappedImages = imagesSource.map((img: any) => {
            if (typeof img === 'string') {
                return { url: img, path: '', description: '' };
            }
            return {
                url: img.url || '',
                path: img.path || '',
                description: img.description || '',
            };
        }).filter((img: any) => img.url);

        const initialCategory = product.category || '';
        const categoryExists = categories.some(cat => cat.name === initialCategory);
        
        if (initialCategory && !categoryExists) {
            setShowOtherCategory(true);
            setCustomCategory(initialCategory);
        }

        form.reset({
            ...product,
            price: product.price ?? undefined,
            stock: product.stock ?? undefined,
            images: mappedImages,
            tags: Array.isArray(product.tags) ? product.tags.join(', ') : product.tags || '',
            gender: product.gender || 'all',
            audience: product.audience || 'all',
            saleDateRange: {
                from: product.saleStartDate?.toDate ? product.saleStartDate.toDate() : undefined,
                to: product.saleEndDate?.toDate ? product.saleEndDate.toDate() : undefined,
            },
            status: product.status || 'online',
            onSale: product.onSale || false,
            showOriginalPrice: product.showOriginalPrice ?? true,
            discountType: product.discountType || 'amount',
            hasVariations: product.hasVariations || false,
            category: categoryExists ? initialCategory : 'Other',
        });
    }
    if (firestoreVariationData) {
        form.setValue('variationsConfig', firestoreVariationData.config || []);
        form.setValue('variationsStock', firestoreVariationData.stock || {});
    }

  }, [product, firestoreVariationData, form, categories]);

  const onSaleValue = form.watch('onSale');
  const discountType = form.watch('discountType');
  const metaTitle = form.watch('metaTitle');
  const productName = form.watch('name');
  const metaDescription = form.watch('metaDescription');
  const hasVariations = form.watch('hasVariations');
  const images = form.watch('images') || [];
  const selectedCategory = form.watch('category');
  
  const subCategoryOptions = React.useMemo(() => {
    if (!selectedCategory || !categories) return [];
    const mainCategory = categories.find(cat => cat.name === selectedCategory);
    return mainCategory?.subcategories || [];
  }, [selectedCategory, categories]);

 const handleImageUpload = async (event: React.ChangeEvent<HTMLInputElement>) => {
    const files = event.target.files;
    if (!files || !businessId) return;

    const currentImages = form.getValues('images') || [];
    if (currentImages.length >= MAX_IMAGES) {
        toast({ title: 'Image limit reached', description: `You can only upload a maximum of ${MAX_IMAGES} images.` });
        return;
    }

    setIsUploading(true);
    const file = files[0];

    try {
        const reader = new FileReader();
        reader.readAsDataURL(file);
        const base64Data = await new Promise<string>((resolve, reject) => {
            reader.onload = () => resolve(reader.result as string);
            reader.onerror = (error) => reject(error);
        });
        
        const path = `products/${businessId}/${product?.id || Date.now()}/${file.name}`;
        const result = await uploadProductImageAction({ base64Data, path });

        if (result.success && result.url && result.path) {
            const newImage = { url: result.url, path: result.path, description: '' };
            form.setValue('images', [...currentImages, newImage]);
            toast({ title: 'Image Uploaded' });
        } else {
            throw new Error(result.error);
        }
    } catch (error: any) {
        toast({ title: 'Upload Failed', description: error.message, variant: 'destructive' });
    } finally {
        setIsUploading(false);
        if (event.target) event.target.value = '';
    }
  };

  const removeImage = async (index: number) => {
    const imageToRemove = images[index];
    if (!imageToRemove) return;

    const newImages = images.filter((_, i) => i !== index);
    form.setValue('images', newImages);

    try {
        if (imageToRemove.path) {
            await deleteProductImageAction({ path: imageToRemove.path });
            toast({ title: 'Image Removed' });
        }
    } catch (error: any) {
        console.error("Error deleting image from storage:", error);
        form.setValue('images', images);
        toast({ title: 'Error', description: 'Could not delete image from storage.', variant: 'destructive' });
    }
  };
  
  const handleImageDescriptionChange = (index: number, description: string) => {
    const newImages = [...images];
    newImages[index].description = description;
    form.setValue('images', newImages);
  }
  
   const handleCategoryChange = (value: string) => {
    form.setValue('category', value);
    if (value === 'Other') {
        setShowOtherCategory(true);
    } else {
        setShowOtherCategory(false);
        setCustomCategory('');
    }
  };

  async function onSubmit(data: ProductFormValues) {
    if (!businessId) {
      toast({ title: 'Error', description: 'Business not selected.', variant: 'destructive' });
      return;
    }
    setIsSubmitting(true);
    const finalCategory = data.category === 'Other' ? customCategory : data.category;

    const result = await saveProductAction({
      businessId,
      productData: { ...data, category: finalCategory },
      productId: product?.id,
    });
    setIsSubmitting(false);

    if (result.success) {
      toast({ title: 'Success', description: `Product ${product ? 'updated' : 'created'}.` });
      if (!product) {
        onSave();
      }
    } else {
      toast({ title: 'Error', description: result.error, variant: 'destructive' });
    }
  }

  return (
    <Form {...form}>
      <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-6">
        <Card>
            <CardContent className="pt-6 space-y-6">
                <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-start">
                    <FormField
                        control={form.control}
                        name="name"
                        render={({ field }) => (
                            <FormItem className="md:col-span-2">
                                <FormLabel>Product Name *</FormLabel>
                                <FormControl>
                                    <Input {...field} onChange={(e) => {
                                        field.onChange(e);
                                        form.setValue('slug', slugify(e.target.value));
                                    }} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="slug"
                        render={({ field }) => (
                            <FormItem>
                                <FormLabel>URL Slug</FormLabel>
                                <FormControl>
                                    <Input {...field} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                     <FormField
                        control={form.control}
                        name="category"
                        render={({ field }) => (
                        <FormItem>
                            <FormLabel>Category</FormLabel>
                            <Select onValueChange={handleCategoryChange} value={field.value || ''} disabled={loadingCategories}>
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={loadingCategories ? "Loading..." : "Select a category"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {categories.map(cat => (
                                        <SelectItem key={cat.id} value={cat.name}>{cat.name}</SelectItem>
                                    ))}
                                    <SelectItem value="Other">Other...</SelectItem>
                                </SelectContent>
                            </Select>
                            {showOtherCategory && (
                                <Input 
                                    className="mt-2"
                                    placeholder="Enter custom category"
                                    value={customCategory}
                                    onChange={e => setCustomCategory(e.target.value)}
                                />
                            )}
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="subcategory"
                        render={({ field }) => (
                            <FormItem>
                            <FormLabel>Sub-Category</FormLabel>
                            <Select
                                onValueChange={field.onChange}
                                value={field.value || ''}
                                disabled={!selectedCategory || subCategoryOptions.length === 0}
                            >
                                <FormControl>
                                <SelectTrigger>
                                    <SelectValue placeholder={!selectedCategory ? "Select a main category first" : "Select a sub-category"} />
                                </SelectTrigger>
                                </FormControl>
                                <SelectContent>
                                    {subCategoryOptions.map(subCat => (
                                        <SelectItem key={subCat.id} value={subCat.name}>{subCat.name}</SelectItem>
                                    ))}
                                </SelectContent>
                            </Select>
                            <FormMessage />
                            </FormItem>
                        )}
                    />
                </div>

                <FormField
                control={form.control}
                name="description"
                render={({ field }) => (
                    <FormItem>
                    <FormLabel>Description *</FormLabel>
                    <FormControl>
                        <RichTextEditor {...field} />
                    </FormControl>
                    <FormMessage />
                    </FormItem>
                )}
                />
                 <FormField
                  control={form.control}
                  name="tags"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel>Product Tags</FormLabel>
                      <FormControl>
                        <Input placeholder="e.g. handmade, sustainable, gift" {...field} value={field.value || ''}/>
                      </FormControl>
                      <FormDescription>
                        Comma-separated tags to help customers find this product.
                      </FormDescription>
                      <FormMessage />
                    </FormItem>
                  )}
                />

                <FormField
                    control={form.control}
                    name="hasVariations"
                    render={({ field }) => (
                        <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                            <div className="space-y-0.5">
                                <FormLabel className="text-base">This product has variations</FormLabel>
                                <FormDescription>
                                Enable if your product comes in different sizes, colors, etc.
                                </FormDescription>
                            </div>
                            <FormControl>
                                <Switch
                                checked={field.value}
                                onCheckedChange={field.onChange}
                                />
                            </FormControl>
                        </FormItem>
                    )}
                />
                {!hasVariations ? (
                    <div className="grid grid-cols-2 gap-4">
                        <FormField
                            control={form.control}
                            name="price"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Price (£) *</FormLabel>
                                <FormControl>
                                <Input type="number" step="0.01" {...field} value={field.value ?? ''}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                        <FormField
                            control={form.control}
                            name="stock"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Stock Quantity *</FormLabel>
                                <FormControl>
                                <Input type="number" {...field} value={field.value ?? ''}/>
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </div>
                ) : (
                    <div className='border-l-4 border-primary pl-4'>
                        <p className="text-sm text-muted-foreground mb-4">
                            Since this product has variations, the base price and stock fields are disabled. Manage price and stock for each variant below.
                        </p>
                         <ProductVariationManager
                            config={form.getValues('variationsConfig') || []}
                            stock={form.getValues('variationsStock') || {}}
                            onConfigChange={(newConfig) => form.setValue('variationsConfig', newConfig)}
                            onStockChange={(newStock) => form.setValue('variationsStock', newStock)}
                         />
                    </div>
                )}
                
                 <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 items-center">
                    <FormField
                        control={form.control}
                        name="outOfStockAction"
                        render={({ field }) => (
                            <FormItem className="space-y-3">
                            <FormLabel>When out of stock</FormLabel>
                            <FormControl>
                                <RadioGroup
                                onValueChange={field.onChange}
                                defaultValue={field.value}
                                className="flex items-center gap-4"
                                >
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="deny" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Deny orders</FormLabel>
                                </FormItem>
                                <FormItem className="flex items-center space-x-2 space-y-0">
                                    <FormControl>
                                    <RadioGroupItem value="allow" />
                                    </FormControl>
                                    <FormLabel className="font-normal">Allow orders</FormLabel>
                                </FormItem>
                                </RadioGroup>
                            </FormControl>
                            </FormItem>
                        )}
                    />
                    <Alert>
                        <DollarSign className="h-4 w-4" />
                        <AlertDescription>
                            All prices must be inclusive of VAT.
                        </AlertDescription>
                    </Alert>
                </div>
                
                 <FormField
                  control={form.control}
                  name="onSale"
                  render={({ field }) => (
                    <FormItem className="flex flex-row items-center justify-between rounded-lg border p-4">
                      <div className="space-y-0.5">
                        <FormLabel className="text-base flex items-center gap-2"><BadgePercent/> Put Item On Sale</FormLabel>
                        <FormDescription>
                          Enable to set a temporary sale price and duration for this product.
                        </FormDescription>
                      </div>
                      <FormControl>
                        <Switch
                          checked={field.value}
                          onCheckedChange={field.onChange}
                          disabled={hasVariations}
                        />
                      </FormControl>
                    </FormItem>
                  )}
                />
                
                {onSaleValue && !hasVariations && (
                     <Card className="bg-muted/50 p-4 space-y-4">
                        <FormField
                            control={form.control}
                            name="discountType"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                    <FormLabel>Discount Type</FormLabel>
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={field.onChange}
                                        defaultValue={field.value}
                                        className="flex items-center gap-4"
                                        >
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="amount" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Fixed Amount (£)</FormLabel>
                                        </FormItem>
                                        <FormItem className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                            <RadioGroupItem value="percentage" />
                                            </FormControl>
                                            <FormLabel className="font-normal">Percentage (%)</FormLabel>
                                        </FormItem>
                                        </RadioGroup>
                                    </FormControl>
                                </FormItem>
                            )}
                        />

                         <div className="grid md:grid-cols-2 gap-4">
                            {discountType === 'amount' ? (
                                <FormField
                                    control={form.control}
                                    name="salePrice"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Sale Price (£)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="0.01" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            ) : (
                                 <FormField
                                    control={form.control}
                                    name="discountValue"
                                    render={({ field }) => (
                                    <FormItem>
                                        <FormLabel>Discount (%)</FormLabel>
                                        <FormControl>
                                            <Input type="number" step="1" min="1" max="100" {...field} value={field.value ?? ''} />
                                        </FormControl>
                                        <FormMessage />
                                    </FormItem>
                                    )}
                                />
                            )}

                             <FormField
                                control={form.control}
                                name="showOriginalPrice"
                                render={({ field }) => (
                                <FormItem className="flex flex-row items-center justify-between rounded-lg border bg-background p-4 mt-2">
                                    <div className="space-y-0.5">
                                        <FormLabel>Show Original Price</FormLabel>
                                        <FormDescription className="text-xs">Display the original price with a strikethrough.</FormDescription>
                                    </div>
                                    <FormControl>
                                        <Switch
                                            checked={field.value}
                                            onCheckedChange={field.onChange}
                                        />
                                    </FormControl>
                                </FormItem>
                                )}
                            />
                         </div>
                        <FormField
                            control={form.control}
                            name="saleDateRange"
                            render={({ field }) => (
                            <FormItem>
                                <FormLabel>Sale Duration</FormLabel>
                                <FormControl>
                                    <DateRangePicker date={field.value} onDateChange={(range) => field.onChange(range)} />
                                </FormControl>
                                <FormMessage />
                            </FormItem>
                            )}
                        />
                    </Card>
                )}

                <div className="space-y-2">
                    <FormLabel>Product Images (up to {MAX_IMAGES})</FormLabel>
                    <FormDescription>The first image will be the main display image. Max file size: {MAX_FILE_SIZE_MB}MB per image.</FormDescription>
                    <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                        {images.map((image, index) => (
                            <div key={index} className="space-y-2">
                                <div className="relative aspect-square">
                                    {image.url && <Image src={image.url} alt={`Preview ${index}`} fill className="rounded-md object-cover border"/>}
                                    <Button type="button" size="icon" variant="destructive" className="absolute -top-2 -right-2 h-6 w-6" onClick={() => removeImage(index)}>
                                        <Trash2 className="h-3 w-3" />
                                    </Button>
                                </div>
                                <Input 
                                  placeholder="Image description..." 
                                  defaultValue={image.description || ''} 
                                  onChange={(e) => handleImageDescriptionChange(index, e.target.value)}
                                  className="h-8 text-xs"
                                />
                            </div>
                        ))}
                        {images.length < MAX_IMAGES && (
                            <Label htmlFor="image-upload" className="aspect-square border-2 border-dashed rounded-md flex flex-col items-center justify-center text-muted-foreground hover:border-primary hover:text-primary cursor-pointer transition-colors">
                                {isUploading ? <Loader2 className="h-8 w-8 animate-spin" /> : <Upload className="h-8 w-8"/>}
                                <span className="text-xs text-center mt-1">Upload Image(s)</span>
                            </Label>
                        )}
                    </div>
                    <Input 
                        id="image-upload" 
                        type="file"
                        onChange={handleImageUpload} 
                        accept="image/*"
                        className="hidden"
                        disabled={images.length >= MAX_IMAGES || isUploading}
                    />
                    <FormMessage>{form.formState.errors.images?.message}</FormMessage>
                </div>
                 <FormField
                  control={form.control}
                  name="videoUrl"
                  render={({ field }) => (
                    <FormItem>
                      <FormLabel className="flex items-center gap-2"><Youtube className="h-5 w-5" /> Product Video (Optional)</FormLabel>
                       <FormDescription>Add a link to a YouTube video for your product.</FormDescription>
                      <FormControl>
                        <Input placeholder="https://www.youtube.com/watch?v=..." {...field} value={field.value || ''} />
                      </FormControl>
                      <FormMessage />
                    </FormItem>
                  )}
                />
                
                <Separator />
                
                <Collapsible open={isAdvancedOpen} onOpenChange={setIsAdvancedOpen}>
                    <CollapsibleTrigger asChild>
                         <Button variant="link" className="p-0 h-auto text-sm">
                            {isAdvancedOpen ? 'Hide advanced options...' : 'Show advanced options...'}
                        </Button>
                    </CollapsibleTrigger>
                    <CollapsibleContent className="space-y-6 pt-4">

                        <FormField
                            control={form.control}
                            name="audience"
                            render={({ field }) => (
                                <FormItem className="space-y-3">
                                <FormLabel>Target Audience *</FormLabel>
                                <FormControl>
                                    <RadioGroup
                                    onValueChange={field.onChange}
                                    value={field.value}
                                    className="flex flex-col space-y-1"
                                    >
                                    {audienceItems.map((item) => (
                                        <FormItem key={item.id} className="flex items-center space-x-3 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value={item.id} />
                                            </FormControl>
                                            <FormLabel className="font-normal">
                                                {item.label}
                                            </FormLabel>
                                        </FormItem>
                                    ))}
                                    </RadioGroup>
                                </FormControl>
                                <FormDescription>This is a required field for legal and safety compliance.</FormDescription>
                                <FormMessage />
                                </FormItem>
                            )}
                        />
                        <div className="grid grid-cols-2 gap-4">
                             <FormField
                                control={form.control}
                                name="gender"
                                render={({ field }) => (
                                    <FormItem>
                                    <FormLabel>Target Gender</FormLabel>
                                    <FormDescription>Specify the gender this product is intended for.</FormDescription>
                                    <FormControl>
                                        <RadioGroup
                                        onValueChange={field.onChange}
                                        value={field.value}
                                        className="space-y-2 pt-2"
                                        >
                                        {genderItems.map((item) => (
                                            <FormItem key={item.id} className="flex items-center space-x-2 space-y-0">
                                            <FormControl>
                                                <RadioGroupItem value={item.id} />
                                            </FormControl>
                                            <FormLabel className="font-normal text-sm">{item.label}</FormLabel>
                                            </FormItem>
                                        ))}
                                        </RadioGroup>
                                    </FormControl>
                                    <FormMessage />
                                    </FormItem>
                                )}
                            />
                        </div>
                        
                        <Separator />
                        
                        <div className="grid grid-cols-2 gap-4">
                            <FormField
                                control={form.control}
                                name="brand"
                                render={({ field }) => (
                                <FormItem>
                                    <FormLabel>Brand</FormLabel>
                                    <FormControl>
                                    <Input placeholder="e.g., Apple, Nike" {...field} value={field.value || ''}/>
                                    </FormControl>
                                    <FormMessage />
                                </FormItem>
                                )}
                            />
                        </div>

                         <Separator />

                        <Collapsible>
                            <CollapsibleTrigger asChild>
                                <Button variant="link" className="p-0 h-auto text-sm">More identifier options...</Button>
                            </CollapsibleTrigger>
                            <CollapsibleContent className="space-y-6 pt-4">
                                <h3 className="text-lg font-medium">Product Identifiers</h3>
                                <p className="text-sm text-muted-foreground">Optional identifiers for tracking and inventory.</p>
                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <FormField control={form.control} name="referenceNumber" render={({ field }) => (<FormItem><FormLabel>Reference #</FormLabel><FormControl><Input {...field} value={field.value || ''}/></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="mpn" render={({ field }) => (<FormItem><FormLabel>MPN</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="upc" render={({ field }) => (<FormItem><FormLabel>UPC</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="ean" render={({ field }) => (<FormItem><FormLabel>EAN-13 / JAN</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                                    <FormField control={form.control} name="isbn" render={({ field }) => (<FormItem><FormLabel>ISBN</FormLabel><FormControl><Input {...field} value={field.value || ''} /></FormControl></FormItem>)} />
                                </div>
                            </CollapsibleContent>
                        </Collapsible>
                    </CollapsibleContent>
                </Collapsible>
                
                <Separator />

                <Card>
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2"><Search className="h-5 w-5" /> Search engine optimization</CardTitle>
                    <CardDescription>
                      Improve your ranking and how your product page will appear in search engines results.
                    </CardDescription>
                  </CardHeader>
                  <CardContent className="space-y-6">
                    <div className="p-4 border rounded-lg bg-muted/50">
                        <p className="text-blue-800 dark:text-blue-400 text-lg font-medium group-hover:underline truncate">{metaTitle || productName || 'Product Page Title'}</p>
                        <p className="text-green-700 dark:text-green-400 text-sm">https://my-community-hub.co.uk/shopping/store/{businessId}?productId={product?.id || '[ID]'}</p>
                        <p className="text-sm text-muted-foreground mt-1 line-clamp-2">{metaDescription || 'Your compelling meta description will appear here, helping you attract more customers from search results.'}</p>
                    </div>

                    <FormField
                        control={form.control}
                        name="metaTitle"
                        render={({ field }) => (
                        <FormItem>
                            <div className="flex justify-between items-center">
                                <FormLabel>Meta title</FormLabel>
                                <span className="text-xs text-muted-foreground">{field.value?.length || 0} / 70</span>
                            </div>
                            <FormControl>
                            <Input placeholder="Public title for the product page..." {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                     <FormField
                        control={form.control}
                        name="metaDescription"
                        render={({ field }) => (
                        <FormItem>
                             <div className="flex justify-between items-center">
                                <FormLabel>Meta description</FormLabel>
                                <span className="text-xs text-muted-foreground">{field.value?.length || 0} / 160</span>
                            </div>
                            <FormControl>
                                <Textarea className="min-h-[80px]" placeholder="This description will appear in search engines..." {...field} value={field.value || ''} />
                            </FormControl>
                            <FormMessage />
                        </FormItem>
                        )}
                    />
                  </CardContent>
                </Card>

            </CardContent>
            <CardFooter>
                <Button type="submit" disabled={isSubmitting}>
                    {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    {product ? 'Save Changes' : 'Create Product'}
                </Button>
            </CardFooter>
        </Card>
      </form>
    </Form>
  );
}
