
'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductForm } from '@/components/product-form';
import { Loader2, ArrowLeft, Info } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useDoc, useFirestore, useMemoFirebase } from '@/firebase';
import { doc } from 'firebase/firestore';
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert';

const CreateProductPageContent = () => {
    const router = useRouter();
    const searchParams = useSearchParams();
    const businessId = searchParams.get('businessId');
    const db = useFirestore();

    const businessRef = useMemoFirebase(() => {
        if (!businessId || !db) return null;
        return doc(db, 'businesses', businessId as string);
    }, [businessId, db]);

    const { data: business, isLoading } = useDoc(businessRef);

    if (isLoading) {
        return (
            <div className="flex justify-center items-center h-96">
                <Loader2 className="h-8 w-8 animate-spin" />
            </div>
        );
    }

    if (!businessId) {
        return (
            <div className="text-center">
                <h1 className="text-2xl font-bold">Business Not Selected</h1>
                <p className="text-muted-foreground">Please select a business before adding a product.</p>
                <Button asChild variant="link" className="mt-4">
                    <Link href="/business/products">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Products
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
                <h1 className="text-3xl font-bold">Add New Product</h1>
             </div>
            
            {!business?.stripeAccountId && (
                <Alert className="bg-amber-50 border-amber-200">
                    <Info className="h-4 w-4 text-amber-600" />
                    <AlertTitle className="text-amber-800">Catalogue Mode Active</AlertTitle>
                    <AlertDescription className="text-amber-700">
                        You can add products and build your catalogue now! Note that customers won't be able to purchase these items online until you connect a Stripe account on the Storefront page.
                    </AlertDescription>
                </Alert>
            )}

            <ProductForm 
                businessId={businessId} 
                onSave={() => router.push('/business/products')}
            />
        </div>
    );
};


export default function CreateProductPageWrapper() {
    return (
        <React.Suspense fallback={<div className="flex justify-center items-center h-96"><Loader2 className="h-8 w-8 animate-spin" /></div>}>
            <CreateProductPageContent />
        </React.Suspense>
    );
}
