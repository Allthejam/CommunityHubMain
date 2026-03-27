
'use client';

import { Logo } from "@/components/icons";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from "@/components/ui/accordion";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from "@/components/ui/dialog";
import { LifeBuoy, Users, Facebook, Twitter, Linkedin, Mail, Printer } from "lucide-react";
import { LegalDocumentDisplay } from "@/components/legal-document-display";
import { ScrollArea } from "@/components/ui/scroll-area";
import React, { useEffect, useState } from "react";

const WhatsAppIcon = (props: React.SVGProps<SVGSVGElement>) => (
    <svg xmlns="http://www.w3.org/2000/svg" width="24" height="24" viewBox="0 0 24 24" fill="currentColor" {...props}>
        <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.5-.669-.51-.173-.008-.371-.008-.57-.008-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.626.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
    </svg>
);


export default function Footer() {
    const pathname = usePathname();
    const isChatPage = pathname === '/chat' || pathname === '/leader/chat' || pathname === '/admin/chat';

    const [pageUrl, setPageUrl] = useState('');
    const [pageTitle, setPageTitle] = useState('');
    const [isClient, setIsClient] = useState(false);

    useEffect(() => {
        setPageUrl(window.location.href);
        setPageTitle(document.title);
        setIsClient(true);
    }, [pathname]);

    const handleShare = (platform: 'facebook' | 'twitter' | 'linkedin' | 'whatsapp') => {
        if (!pageUrl) return;

        const text = `Check out this page from Community Hub: ${pageTitle}`;
        let shareUrl = '';

        switch (platform) {
            case 'facebook':
                shareUrl = `https://www.facebook.com/sharer/sharer.php?u=${encodeURIComponent(pageUrl)}`;
                break;
            case 'twitter':
                shareUrl = `https://twitter.com/intent/tweet?url=${encodeURIComponent(pageUrl)}&text=${encodeURIComponent(text)}`;
                break;
            case 'linkedin':
                shareUrl = `https://www.linkedin.com/shareArticle?mini=true&url=${encodeURIComponent(pageUrl)}&title=${encodeURIComponent(pageTitle)}&summary=${encodeURIComponent(text)}`;
                break;
            case 'whatsapp':
                shareUrl = `https://wa.me/?text=${encodeURIComponent(text + ' - ' + pageUrl)}`;
                break;
        }

        window.open(shareUrl, '_blank', 'noopener,noreferrer');
    };

    const footerContent = (
        <div className="container mx-auto px-4 md:px-6">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-8 text-center md:text-left">
                <div className="col-span-1 lg:col-span-2 flex flex-col items-center md:items-start">
                <Link href="/" className="flex items-center space-x-2 mb-4">
                    <Users className="h-8 w-8 text-primary" />
                    <div>
                        <span className="font-bold text-xl block leading-none">Community Hub</span>
                        <span className="text-xs text-muted-foreground block leading-none">Home Page</span>
                    </div>
                </Link>
                <p className="text-sm text-muted-foreground">Connecting local communities, one hub at a time.</p>
                <div className="flex items-center gap-2 mt-4">
                    <Button variant="ghost" size="icon" onClick={() => handleShare('facebook')} aria-label="Facebook">
                        <Facebook className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleShare('twitter')} aria-label="X">
                        <Twitter className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleShare('linkedin')} aria-label="LinkedIn">
                        <Linkedin className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => handleShare('whatsapp')} aria-label="WhatsApp">
                        <WhatsAppIcon className="h-5 w-5" />
                    </Button>
                    <Button variant="ghost" size="icon" asChild>
                        <a href={`mailto:?subject=Check%20out%20Community%20Hub&body=I%20found%20this%20page%20and%20thought%20you%20might%20be%20interested:%20${pageUrl}`} aria-label="Email">
                            <Mail className="h-5 w-5" />
                        </a>
                    </Button>
                    <Button variant="ghost" size="icon" onClick={() => window.print()} aria-label="Print Page">
                        <Printer className="h-5 w-5" />
                    </Button>
                </div>
                </div>
                
                <div>
                <h4 className="font-semibold mb-4">Community</h4>
                <nav className="flex flex-col space-y-2">
                    <Link href="#" className="text-sm hover:underline text-muted-foreground">Find a Community</Link>
                    <Link href="/events" className="text-sm hover:underline text-muted-foreground">Events</Link>
                    <Link href="/directory" className="text-sm hover:underline text-muted-foreground">Local Businesses</Link>
                    <Link href="/whatson" className="text-sm hover:underline text-muted-foreground">What's On</Link>
                </nav>
                </div>

                <div>
                <h4 className="font-semibold mb-4">Company</h4>
                <nav className="flex flex-col space-y-2">
                    <Link href="/about" className="text-sm hover:underline text-muted-foreground">About Us</Link>
                    <Link href="/careers" className="text-sm hover:underline text-muted-foreground">Careers</Link>
                    <Link href="/get-the-app" className="text-sm hover:underline text-muted-foreground">Get the App</Link>
                    {isClient ? (
                        <Dialog>
                            <DialogTrigger asChild>
                                <button className="text-sm hover:underline text-muted-foreground text-center md:text-left">Contact Us</button>
                            </DialogTrigger>
                            <DialogContent className="sm:max-w-md">
                                <DialogHeader className="items-center text-center">
                                    <div className="p-3 bg-primary/10 rounded-full inline-block mb-4">
                                        <LifeBuoy className="h-10 w-10 text-primary" />
                                    </div>
                                    <DialogTitle className="text-2xl">Contact Us</DialogTitle>
                                    <DialogDescription className="text-base text-muted-foreground !mt-4">
                                        The best way to get in touch is by using the tools available on the platform.
                                    </DialogDescription>
                                </DialogHeader>
                                <div className="py-4 text-center text-muted-foreground">
                                    <p>You can use the <Link href="/report-issue" className="text-primary font-semibold hover:underline">Report an Issue</Link> page for specific problems or general feedback about the platform. For community-specific inquiries, please use the messaging options available within your community hub.</p>
                                </div>
                            </DialogContent>
                        </Dialog>
                    ) : (
                        <span className="text-sm text-muted-foreground text-center md:text-left">Contact Us</span>
                    )}
                </nav>
                </div>

                <div>
                <h4 className="font-semibold mb-4">Legal</h4>
                <nav className="flex flex-col space-y-2">
                    <Link href="#" className="text-sm hover:underline text-muted-foreground">Guidelines</Link>
                    <Link href="#" className="text-sm hover:underline text-muted-foreground">Privacy Policy</Link>
                    {isClient ? (
                        <Dialog>
                            <DialogTrigger asChild>
                                <button className="text-sm hover:underline text-muted-foreground">Cookie Policy</button>
                            </DialogTrigger>
                            <DialogContent className="max-w-2xl grid grid-rows-[auto,1fr,auto] p-0 max-h-[85vh]">
                                <DialogHeader className="p-6 pb-2 border-b">
                                    <DialogTitle>Cookie Policy</DialogTitle>
                                </DialogHeader>
                                <ScrollArea className="h-full">
                                    <div className="p-6">
                                        <LegalDocumentDisplay documentId="gl69YQPK3JJ0RNXWhQUg" />
                                    </div>
                                </ScrollArea>
                                <DialogFooter className="p-6 pt-4 border-t">
                                    <DialogClose asChild>
                                        <Button type="button">Close</Button>
                                    </DialogClose>
                                </DialogFooter>
                            </DialogContent>
                        </Dialog>
                    ) : (
                        <span className="text-sm text-muted-foreground">Cookie Policy</span>
                    )}
                </nav>
                </div>
            </div>
            <div className="mt-8 pt-8 border-t border-border flex flex-col md:flex-row justify-between items-center text-sm text-muted-foreground">
                <p className="order-2 md:order-1 mt-4 md:mt-0">&copy; {isClient ? new Date().getFullYear() : ''} Community Hub. All rights reserved.</p>
                 <div className="order-1 md:order-2 flex flex-col sm:flex-row items-center gap-x-4 gap-y-2">
                    <Link href="/police-liaison/apply" className="font-semibold text-primary hover:underline">Police Liaison Application</Link>
                    <Link href="/broadcast-access" className="font-semibold text-destructive hover:underline">National Emergency Broadcast Access</Link>
                </div>
            </div>
        </div>
    );

    if (isChatPage) {
        return (
            <footer className={cn("bg-secondary text-secondary-foreground border-t")}>
                <Accordion type="single" collapsible className="w-full">
                    <AccordionItem value="footer" className="border-b-0">
                        <AccordionTrigger className="container mx-auto px-4 md:px-6 py-4 font-semibold text-sm hover:no-underline">
                            View Footer Links & Information
                        </AccordionTrigger>
                        <AccordionContent className="py-12 md:py-16 bg-background/50">
                            {footerContent}
                        </AccordionContent>
                    </AccordionItem>
                </Accordion>
            </footer>
        );
    }
    
    return (
        <footer className="bg-secondary text-secondary-foreground py-12 md:py-16 border-t">
            {footerContent}
        </footer>
    )
}
