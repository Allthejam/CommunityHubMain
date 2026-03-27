
import { type Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { Users, Building2, Crown, Megaphone, Siren, Activity, HeartHandshake, Briefcase, Search, Calendar, Telescope, FileText, Smartphone, SquareArrowUp, MoreVertical, ShieldCheck, ShoppingCart, Store, Zap } from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { PlaceHolderImages } from '@/lib/placeholder-images';

export const metadata: Metadata = {
  title: "About Community Hub | Rebuilding Local Communities",
  description: "Learn about Community Hub's mission to reconnect and enrich local communities by providing an all-in-one platform for residents, businesses, and leaders.",
  openGraph: {
    title: "About Community Hub | Rebuilding Local Communities",
    description: "Learn how Community Hub is transforming local engagement, supporting small businesses, and empowering community leaders.",
    images: [
        {
            url: 'https://i.postimg.cc/Bnf3rtsn/about-us-2.jpg',
            width: 1200,
            height: 630,
            alt: 'A vibrant community event outdoors',
        }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Community Hub | Rebuilding Local Communities',
    description: "Learn how Community Hub is transforming local engagement, supporting small businesses, and empowering community leaders.",
    images: ['https://i.postimg.cc/Bnf3rtsn/about-us-2.jpg'],
  }
};

const features = [
    {
        icon: <Users className="h-6 w-6 text-primary" />,
        title: "Connect Your Community",
        description: "Create a central, digital town square for news, events, discussions, and local business discovery, strengthening community bonds."
    },
    {
        icon: <Building2 className="h-6 w-6 text-primary" />,
        title: "Support Local Businesses",
        description: "Provide an affordable, dedicated platform for local businesses to advertise, post events, and connect directly with their customers."
    },
    {
        icon: <Crown className="h-6 w-6 text-primary" />,
        title: "Empower Community Leaders",
        description: "Offer a unique opportunity for local leaders to generate revenue through a 40% profit share, funding community projects or creating a local business."
    },
    {
        icon: <ShoppingCart className="h-6 w-6 text-primary" />,
        title: "Launch a Local Storefront",
        description: "Enable businesses to sell products directly to community members through a simple, integrated e-commerce platform."
    },
    {
        icon: <Store className="h-6 w-6 text-primary" />,
        title: "Explore the Virtual Highstreet",
        description: "Take a stroll down a digital highstreet, browse local shops, and discover unique products without leaving your home."
    },
    {
        icon: <HeartHandshake className="h-6 w-6 text-primary" />,
        title: "Boost the Local Economy",
        description: "Every purchase made through the app directly supports local entrepreneurs, keeping money within the community."
    },
    {
        icon: <Megaphone className="h-6 w-6 text-primary" />,
        title: "Powerful Communication",
        description: "Enable leaders to send standard announcements to their entire community, ensuring everyone stays informed about important updates."
    },
    {
        icon: <Siren className="h-6 w-6 text-primary" />,
        title: "Emergency Broadcast System",
        description: "Provide verified government and emergency services with a high-priority channel to deliver critical, non-dismissible alerts to targeted regions or the entire nation."
    },
    {
        icon: <Activity className="h-6 w-6 text-primary" />,
        title: "Dynamic & Engaging",
        description: "Keep your community hub vibrant with dedicated sections for local news, job boards, lost & found, and a 'What's On' guide to local attractions."
    }
];

const keyFeatures = [
    { icon: <FileText className="h-6 w-6 text-primary" />, title: "What's On Page", description: "A dedicated page with real-time information on local events, news, and activities." },
    { icon: <Calendar className="h-6 w-6 text-primary" />, title: "Local Events Page", description: "A dedicated page with real-time information on local events upcoming throughout the year, easily shared to your personal calendar." },
    { icon: <Building2 className="h-6 w-6 text-primary" />, title: "Local Business Listings", description: "A dedicated page for all local businesses to list their business and place advertising as well as publish 1 company event per year." },
    { icon: <Briefcase className="h-6 w-6 text-primary" />, title: "Local Jobs", description: "A jobs board connecting local employers with job seekers." },
    { icon: <Siren className="h-6 w-6 text-primary" />, title: "Emergency Broadcasts", description: "A critical system for receiving urgent alerts from local authorities." },
    { icon: <Users className="h-6 w-6 text-primary" />, title: "Community Reporter System", description: "A way for local residents to volunteer and report on local news and sports." },
    { icon: <Search className="h-6 w-6 text-primary" />, title: "A Lost and Found", description: "Dedicated options to post lost items and found items directly to the local community." },
    { icon: <Calendar className="h-6 w-6 text-primary" />, title: "Your Personal Diary", description: "You can add your own events and set reminders to stay organised." },
    { icon: <Telescope className="h-6 w-6 text-primary" />, title: "Tourist Information", description: "The app doubles as a digital guide to local attractions and events." },
    { icon: <Users className="h-6 w-6 text-primary" />, title: "Community Visiting", description: "The ability to visit other communities using the app and see what's on in their areas as well as messages and announcements." },
    { icon: <HeartHandshake className="h-6 w-6 text-primary" />, title: "Community-Driven Donations", description: "Profits from advertising are shared directly back to the local community that set up the community group, at a 40% profit share." },
    { icon: <Activity className="h-6 w-6 text-primary" />, title: "AI Assistant", description: "A helpful AI assistant that provides immediate, context-aware assistance and filters out keywords and images shared in the APP." },
];

export default function AboutPage() {

    const getImage = (id: string) => PlaceHolderImages.find(img => img.id === id);

    const communityEventImage = getImage('about-us-community-event');
    const appOnPhoneImage = getImage('about-us-app-on-phone');
    const touristInfoImage = getImage('about-us-tourist-info');
    const privateHubImage = getImage('about-us-private-hub');
    const highStreetImage = getImage('about-us-high-street');
    const iosInstructionsImage = getImage('about-us-ios-instructions');
    const androidInstructionsImage = getImage('about-us-android-instructions');
    const shortcutsImage = getImage('about-us-shortcuts');


    return (
        <div className="space-y-16 py-12">
            
            <section className="text-center">
                <h1 className="text-4xl md:text-5xl font-bold tracking-tight font-headline">
                    Rebuilding Communities, One Hub at a Time
                </h1>
                <p className="mt-4 max-w-3xl mx-auto text-lg text-muted-foreground">
                    Your Community Hub is a powerful, all-in-one platform designed to reconnect, empower, and enrich local communities by bringing residents, businesses, and leaders together.
                </p>
                <div className="mt-8 flex justify-center">
                    <Button asChild size="lg">
                        <Link href="/signup">Join or Create a Hub</Link>
                    </Button>
                </div>
            </section>

            <div className="relative w-full h-96 rounded-lg overflow-hidden shadow-lg">
                {communityEventImage && (
                    <Image 
                        src={communityEventImage.imageUrl} 
                        alt={communityEventImage.description}
                        fill
                        className="object-cover"
                        data-ai-hint={communityEventImage.imageHint}
                        priority
                    />
                )}
                 <div className="absolute inset-0 bg-gradient-to-t from-black/60 to-transparent" />
            </div>

            <section className="text-center">
                <h2 className="text-3xl font-bold font-headline">Our Mission: What We Do</h2>
                 <p className="mt-2 max-w-3xl mx-auto text-muted-foreground">
                    We provide the digital infrastructure for communities to thrive. From sharing local news to promoting small businesses and enabling critical alerts, our platform is the backbone of a connected and resilient community.
                </p>
                <div className="mt-8 grid md:grid-cols-2 lg:grid-cols-3 gap-8">
                    {features.map(feature => (
                        <Card key={feature.title} className="text-left">
                            <CardHeader className="flex flex-row items-center gap-4">
                                {feature.icon}
                                <CardTitle className="text-lg">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-sm">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <section className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold font-headline">A New Era of Community Connection</h2>
                    <p className="text-muted-foreground">Discover how our community-driven app transforms how local residents connect, work, and stay informed, offering a powerful alternative to traditional social media.</p>
                    <p className="text-muted-foreground">Unlike sprawling social media platforms, this app is dedicated to fostering a strong, local ecosystem. It aims to put the community first by providing features that directly benefit residents and local businesses. The platform is designed to be a one-stop shop for everything happening nearby, from news and events to job opportunities and emergency alerts.</p>
                    <p className="text-muted-foreground">A key feature is the app's commitment to supporting the local economy. It offers a dedicated space for local businesses and attractions to promote themselves, helping residents discover and support the shops, restaurants, and services that make their community unique.</p>
                    <p className="text-muted-foreground">Safety is also a top priority. The app features a critical Emergency Broadcast System, allowing local authorities to quickly and effectively communicate with residents during an emergency. This system provides a reliable and direct channel for crucial alerts, keeping everyone safe and informed when it matters most.</p>
                </div>
                <div className="relative w-full h-96 rounded-lg overflow-hidden shadow-lg">
                    {appOnPhoneImage && (
                        <Image src={appOnPhoneImage.imageUrl} alt={appOnPhoneImage.description} fill className="object-cover" data-ai-hint={appOnPhoneImage.imageHint} />
                    )}
                </div>
            </section>
            
            <section>
                <h2 className="text-3xl font-bold font-headline text-center">Key Features at a Glance</h2>
                 <p className="mt-2 max-w-3xl mx-auto text-muted-foreground text-center">
                    The My Community App packs a wide range of powerful features into a simple, easy-to-use platform. Here are just a few of the things you'll find inside:
                </p>
                <div className="mt-8 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                    {keyFeatures.map(feature => (
                        <Card key={feature.title} className="text-left flex flex-col">
                           <CardHeader className="flex-grow">
                                <div className="flex items-center gap-4">
                                    {feature.icon}
                                    <CardTitle className="text-lg">{feature.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-sm text-muted-foreground">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

             <section className="grid md:grid-cols-2 gap-12 items-center">
                 <div className="relative w-full h-96 rounded-lg overflow-hidden shadow-lg">
                    {touristInfoImage && (
                        <Image src={touristInfoImage.imageUrl} alt={touristInfoImage.description} fill className="object-cover" data-ai-hint={touristInfoImage.imageHint} />
                    )}
                </div>
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold font-headline">Your Digital Tourist Information Centre in Your Pocket</h2>
                    <p className="text-muted-foreground">The My Community App is the next best thing to a truly interactive tourist information centre. It is a comprehensive digital guide to your local area, designed to help you, and visitors discover and experience everything your community has to offer. The app's "What's On" page provides real-time information about events, local news, and activities, ensuring you're always in the know about the latest happenings.</p>
                    <p className="text-muted-foreground">Whether you're looking for a local farmers' market, a charity event, or a one-off festival, the app makes it effortless to find what you're looking for. The content is curated and updated by the community leaders themselves, guaranteeing it's accurate and hyper-local.</p>
                </div>
            </section>
            
            <Separator />

            <section className="grid md:grid-cols-2 gap-12 items-center">
                <div className="space-y-4">
                    <div className="flex items-center gap-4">
                        <ShieldCheck className="h-10 w-10 text-primary" />
                        <h2 className="text-3xl font-bold font-headline">Exclusive Private Hubs</h2>
                    </div>
                    <p className="text-muted-foreground">
                        In addition to public community hubs, we offer private, invitation-only spaces perfect for professional organizations, associations, clubs, and any group requiring its own confidential digital environment.
                    </p>
                    <p className="text-muted-foreground">
                        These hubs are not discoverable through public search and ensure your conversations and content remain secure. To get started, create a personal account and then contact platform administration to request your private hub.
                    </p>
                    <Button asChild size="lg">
                        <Link href="/report-issue?tab=platform&subject=Request%20a%20Private%20Hub">Request a Private Hub</Link>
                    </Button>
                </div>
                 <div className="relative w-full h-80 rounded-lg overflow-hidden shadow-lg">
                    {privateHubImage && (
                        <Image src={privateHubImage.imageUrl} alt={privateHubImage.description} fill className="object-cover" data-ai-hint={privateHubImage.imageHint} />
                    )}
                </div>
            </section>

            <Separator />

            <section className="grid md:grid-cols-2 gap-12 items-center">
                <div className="relative w-full h-96 rounded-lg overflow-hidden shadow-lg">
                    {highStreetImage && (
                        <Image src={highStreetImage.imageUrl} alt={highStreetImage.description} fill className="object-cover object-bottom" data-ai-hint={highStreetImage.imageHint} />
                    )}
                </div>
                <div className="space-y-4">
                    <h2 className="text-3xl font-bold font-headline">The Digital High Street: Local Shopping, Reimagined</h2>
                    <p className="text-muted-foreground">In an age of global marketplaces, the unique character of local shops can get lost. We're bringing the high street back to the forefront with a dedicated, community-centric shopping experience.</p>
                    <p className="text-muted-foreground">Our Virtual High Street provides a central place for residents to discover, browse, and support the independent businesses that make their community special. It's a global shopping experience with a powerful local focus, ensuring that every purchase contributes directly to the local economy.</p>
                    <p className="text-muted-foreground">For business owners, it’s a direct line to your most passionate customers—your neighbours. For shoppers, it’s a way to find unique products and services while investing in the place you call home.</p>
                    <Button asChild size="lg">
                        <Link href="/shopping">Explore the High Street</Link>
                    </Button>
                </div>
            </section>

            <section className="space-y-8 text-center">
                <div className="flex items-center justify-center gap-4">
                    <Separator className="w-1/4" />
                    <Smartphone className="h-8 w-8 text-primary" />
                    <Separator className="w-1/4" />
                </div>
                <h2 className="text-3xl font-bold font-headline">Get The App</h2>
                <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
                    How to Install the App on Your Device
                </p>
                <p className="max-w-3xl mx-auto text-muted-foreground">
                    Forget the app stores! Our app is a Progressive Web App (PWA), which means you can install it directly from your web browser for a seamless, app-like experience.
                </p>
                <div className="grid md:grid-cols-2 gap-8 text-left">
                     <Card>
                        <CardHeader>
                            <CardTitle>On iOS (iPhone/iPad)</CardTitle>
                            <p className="text-sm text-muted-foreground">Using the Safari browser:</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                            <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                <li>Open the app's website in Safari.</li>
                                <li>Tap the 'Share' button (<SquareArrowUp className="inline-block h-4 w-4 -mt-1 mx-1" />) in the toolbar.</li>
                                <li>Scroll down and tap <span className="font-semibold">'Add to Home Screen'</span>.</li>
                                <li>A preview will appear. You can change the name if you like, then tap 'Add'.</li>
                            </ol>
                            <p className="text-sm font-semibold pt-2 border-t">Important: To receive push notifications on iOS, you must add the app to your Home Screen.</p>
                        </CardContent>
                    </Card>
                     <Card>
                        <CardHeader>
                            <CardTitle>On Android</CardTitle>
                             <p className="text-sm text-muted-foreground">Using the Chrome browser:</p>
                        </CardHeader>
                        <CardContent className="space-y-4">
                             <ol className="list-decimal list-inside space-y-2 text-muted-foreground">
                                <li>Open the app's website in Chrome.</li>
                                <li>A small banner may appear asking you to "Add to Home Screen" or "Install." Tap it.</li>
                                <li>If no banner appears, tap the three-dot menu (<MoreVertical className="inline-block h-4 w-4 -mt-1 mx-1" />) in the top-right corner.</li>
                                <li>Tap <span className="font-semibold">'Install app'</span> or <span className="font-semibold">'Add to Home Screen'</span>.</li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>
                 <Card className="mt-8 bg-secondary/50">
                    <CardContent className="p-4 grid grid-cols-2 gap-4 justify-items-center">
                        <div className="relative h-64 sm:h-80 w-full">
                            {iosInstructionsImage && (
                                <Image
                                    src={iosInstructionsImage.imageUrl}
                                    alt={iosInstructionsImage.description}
                                    fill
                                    style={{objectFit: 'contain'}}
                                    data-ai-hint={iosInstructionsImage.imageHint}
                                />
                            )}
                        </div>
                        <div className="relative h-64 sm:h-80 w-full">
                             {androidInstructionsImage && (
                                 <Image
                                    src={androidInstructionsImage.imageUrl}
                                    alt={androidInstructionsImage.description}
                                    fill
                                    style={{objectFit: 'contain'}}
                                    data-ai-hint={androidInstructionsImage.imageHint}
                                />
                             )}
                        </div>
                    </CardContent>
                </Card>
                
                <Separator className="!my-16" />

                <div className="relative h-64 sm:h-80 w-full max-w-sm mx-auto">
                    {shortcutsImage && (
                        <Image
                            src={shortcutsImage.imageUrl}
                            alt={shortcutsImage.description}
                            fill
                            style={{objectFit: 'contain'}}
                            data-ai-hint={shortcutsImage.imageHint}
                        />
                    )}
                </div>

                <div className="flex items-center justify-center gap-4">
                    <Separator className="w-1/4" />
                    <Zap className="h-8 w-8 text-primary" />
                    <Separator className="w-1/4" />
                </div>

                <h2 className="text-3xl font-bold font-headline">Direct Action Shortcuts</h2>
                <p className="text-lg text-muted-foreground max-w-3xl mx-auto">
                    Stop digging through menus. Start doing. Conventional apps make you open them, wait for a splash screen, and then find your way to where you want to be. Our App is built differently. We’ve designed it with Direct Action Shortcuts so you can get exactly where you need to go in half the time.
                </p>

                <Card className="text-left max-w-2xl mx-auto">
                    <CardHeader>
                        <CardTitle>How to use it:</CardTitle>
                    </CardHeader>
                    <CardContent>
                        <ol className="list-decimal list-inside space-y-4 text-lg">
                            <li><span className="font-semibold text-foreground">Long-Press:</span> <span className="text-muted-foreground">Touch and hold our App icon on your home screen.</span></li>
                            <li><span className="font-semibold text-foreground">Select:</span> <span className="text-muted-foreground">A menu will instantly appear.</span></li>
                            <li><span className="font-semibold text-foreground">Go:</span> <span className="text-muted-foreground">Tap Community Feed, The Highstreet, or Community Chat to jump straight into the action.</span></li>
                        </ol>
                    </CardContent>
                </Card>

            </section>
        </div>
    );
}
