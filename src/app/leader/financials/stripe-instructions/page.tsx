
"use client";

import { ArrowLeft, LifeBuoy, Pointer, Edit, Banknote, ShieldCheck, CheckCircle, Printer } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { useRouter } from "next/navigation";

const Step = ({ icon, title, description }: { icon: React.ReactNode, title: string, description: string }) => (
    <div className="flex items-start gap-4">
        <div className="flex-shrink-0 w-10 h-10 rounded-full bg-primary/10 text-primary flex items-center justify-center mt-1">
            {icon}
        </div>
        <div>
            <h3 className="font-semibold text-lg">{title}</h3>
            <p className="text-muted-foreground">{description}</p>
        </div>
    </div>
);


export default function StripeInstructionsPage() {
    const router = useRouter();

    return (
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="flex justify-between items-center">
                <Button variant="ghost" asChild>
                    <Link href="/leader/financials">
                        <ArrowLeft className="mr-2 h-4 w-4" />
                        Back to Financials
                    </Link>
                </Button>
                <Button variant="outline" onClick={() => window.print()}>
                    <Printer className="mr-2 h-4 w-4" />
                    Print Instructions
                </Button>
            </div>
            
            <div className="text-center">
                <h1 className="text-3xl font-bold tracking-tight font-headline">Connecting Your Stripe Account</h1>
                <p className="mt-2 text-lg text-muted-foreground max-w-2xl mx-auto">
                    Follow these simple steps to securely connect your bank account via Stripe to receive your community revenue payouts.
                </p>
            </div>
            
             <Card>
                <CardHeader>
                    <CardTitle>Step-by-Step Guide</CardTitle>
                </CardHeader>
                <CardContent className="space-y-8">
                   <Step 
                        icon={<Pointer className="h-5 w-5" />} 
                        title="Step 1: Start the Connection" 
                        description="Click the 'Connect with Stripe' button on the Financials page. This will securely redirect you to Stripe's website." 
                    />
                     <Step 
                        icon={<Edit className="h-5 w-5" />} 
                        title="Step 2: Create or Log In to Stripe" 
                        description="If you already have a Stripe account, simply log in. If not, you'll be guided through creating a new, free account." 
                    />
                     <Step 
                        icon={<Banknote className="h-5 w-5" />} 
                        title="Step 3: Provide Your Details" 
                        description="Fill out the required information about yourself and your bank account for payouts. This is a standard identity verification process (KYC)." 
                    />
                     <Step 
                        icon={<ShieldCheck className="h-5 w-5" />} 
                        title="Step 4: Authorize and Redirect" 
                        description="Review your details, authorize the connection to our platform, and you will be automatically redirected back to your Financials dashboard." 
                    />
                    <Step 
                        icon={<CheckCircle className="h-5 w-5" />} 
                        title="Step 5: Confirmation" 
                        description="The status on your Financials page will update to 'Connected & Verified,' confirming that you're ready to receive payouts." 
                    />
                </CardContent>
            </Card>

            <Alert className="bg-blue-50 border-blue-200 dark:bg-blue-900/20 dark:border-blue-700">
                <LifeBuoy className="h-4 w-4 text-blue-600 dark:text-blue-400" />
                <AlertTitle className="text-blue-800 dark:text-blue-300">Why We Use Stripe</AlertTitle>
                <AlertDescription className="text-blue-700 dark:text-blue-400">
                    <p className="mb-2">
                        Your security and trust are our top priorities. We partner with Stripe, a global leader in online payments, to handle all financial aspects. By using Stripe Connect, we ensure that your sensitive financial information (like bank account numbers) is never stored on our servers. It is entered directly into Stripe's PCI-compliant environment, providing the highest level of security for your data.
                    </p>
                    <Button variant="link" asChild className="p-0 h-auto text-blue-600 dark:text-blue-400">
                        <Link href="https://stripe.com/connect" target="_blank" rel="noopener noreferrer">Learn more about Stripe Connect</Link>
                    </Button>
                </AlertDescription>
            </Alert>
        </div>
    )
}

    