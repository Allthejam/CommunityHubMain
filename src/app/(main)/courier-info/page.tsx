
'use client';

import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Truck, Star, ArrowRight, ArrowLeft, Percent, Shield } from "lucide-react";
import Link from "next/link";

export default function CourierInfoPage() {
    return (
        <div className="max-w-4xl mx-auto py-12 px-4 space-y-8">
            <Button asChild variant="ghost" className="mb-4">
                <Link href="/home">
                    <ArrowLeft className="mr-2 h-4 w-4" />
                    Back to Home
                </Link>
            </Button>
            <div className="text-center">
                <div className="inline-block p-4 bg-primary/10 rounded-full mb-4">
                    <Truck className="h-12 w-12 text-primary" />
                </div>
                <h1 className="text-4xl font-bold font-headline">Become Your Community's Courier</h1>
                <p className="mt-4 text-lg text-muted-foreground max-w-3xl mx-auto">
                    Take the wheel and become an essential part of your local economy by handling deliveries for the Virtual Highstreet.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <CardTitle>What is the Community Courier?</CardTitle>
                    <CardDescription>
                        Each community has one official courier responsible for all local deliveries from businesses on the platform. It's a unique opportunity to run your own delivery service with a built-in customer base.
                    </CardDescription>
                </CardHeader>
                <CardContent className="space-y-6">
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-green-100 text-green-600 flex items-center justify-center mt-1">
                            <Star className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Your Own Business Profile, Free!</h3>
                            <p className="text-sm text-muted-foreground">As the appointed courier, you receive a full-featured business profile on the platform, complete with a storefront, completely free of charge for as long as you hold the position.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-100 text-blue-600 flex items-center justify-center mt-1">
                            <Truck className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Earn From Every Delivery</h3>
                            <p className="text-sm text-muted-foreground">You set your own delivery fees within the platform. Every time a resident places an order that includes local delivery, you get the job and the fee, providing a steady income stream.</p>
                        </div>
                    </div>
                    <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-indigo-100 text-indigo-600 flex items-center justify-center mt-1">
                            <Percent className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Share in Community Success</h3>
                            <p className="text-sm text-muted-foreground">To help with running costs like fuel and postage, you'll receive a 40% share of all storefront subscription fees from businesses in your community. This provides a bonus income stream on top of your delivery fees.</p>
                        </div>
                    </div>
                     <div className="flex items-start gap-4">
                        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-amber-100 text-amber-600 flex items-center justify-center mt-1">
                            <Shield className="h-5 w-5" />
                        </div>
                        <div>
                            <h3 className="font-semibold">Community-Approved, Independently Run</h3>
                            <p className="text-sm text-muted-foreground">Your application will be reviewed and approved by your Community Leader, who provides general oversight. However, you operate your courier service as your own independent business, giving you full control over your work.</p>
                        </div>
                    </div>
                </CardContent>
                <CardFooter>
                    <p className="text-xs text-muted-foreground">This is an exclusive position. Only one courier can be appointed per community. Applications are reviewed by the Community Leader.</p>
                </CardFooter>
            </Card>

             <div className="text-center">
                 <Button size="lg" asChild>
                    <Link href="/courier/apply">
                        Apply Now <ArrowRight className="ml-2 h-4 w-4" />
                    </Link>
                </Button>
            </div>
        </div>
    );
}
