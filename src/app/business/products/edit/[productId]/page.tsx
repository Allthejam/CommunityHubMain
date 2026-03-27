
"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter, useParams, useSearchParams } from "next/navigation";
import { ProductForm } from "@/components/product-form";
import { useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Loader2, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { ProductVariationManager } from "@/components/product-variation-manager";
import { useToast } from "@/hooks/use-toast";

const EditProductPage = () => {
    const router = useRouter();
    const params = useParams();
    const searchParams = useSearchParams();
    const { toast } = useToast();

    const productId = params.productId as string;
    const businessId = searchParams.get('businessId');
    const db = useFirestore();

    const productRef = useMemoFirebase(() => {
        if (!businessId || !productId || !db) return null;
        return doc(db, `businesses/${businessId}/products/${productId}`);
    }, [businessId, productId, db]);

    const { data: product, isLoading } = useDoc(productRef);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }
    
    if (!product) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">Product Not Found</h1>
                <p className="text-muted-foreground">The product you are trying to edit does not exist.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/business/products">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Products
                    </Link>
                </Button>
            </div>
        );
    }

    return (
        <div className="space-y-8">
             <div>
                <Button asChild variant="ghost" className="mb-4">
                    <Link href="/business/products">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to All Products
                    </Link>
                </Button>
                <h1 className="text-3xl font-bold">Edit Product</h1>
             </div>
            <ProductForm 
                businessId={businessId} 
                product={product} 
                onSave={() => {
                    toast({
                        title: "Product Saved",
                        description: "Your changes have been saved successfully.",
                    });
                }}
            />
        </div>
    );
};

export default function EditProductPageWrapper() {
    return (
        <React.Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <EditProductPage />
        </React.Suspense>
    );
}
