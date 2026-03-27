'use client';

import * as React from 'react';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { ProductForm } from '@/components/product-form';
import { Loader2, ArrowLeft, ShieldAlert } from 'lucide-react';
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
    
    if (!business?.stripeAccountId) {
        return (
            <div className="space-y-4">
                 <Button asChild variant="ghost" className="mb-4">
                    <Link href="/business/storefront">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Storefront
                    </Link>
                </Button>
                <Alert variant="destructive">
                    <ShieldAlert className="h-4 w-4" />
                    <AlertTitle>Action Required</AlertTitle>
                    <AlertDescription>
                        You must connect a Stripe account to this business before you can create products. Please go to your storefront to set up payments.
                    </AlertDescription>
                </Alert>
            </div>
        )
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
