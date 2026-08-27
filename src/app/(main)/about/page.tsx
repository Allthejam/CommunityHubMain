import { type Metadata } from 'next';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { 
    Users, 
    Building2, 
    Crown, 
    Megaphone, 
    Siren, 
    Activity, 
    HeartHandshake, 
    Briefcase, 
    Search, 
    Calendar, 
    Telescope, 
    FileText, 
    Smartphone, 
    SquareArrowUp, 
    MoreVertical, 
    ShieldCheck, 
    ShoppingCart, 
    Store, 
    Zap, 
    Truck, 
    Shield, 
    ShieldAlert,
    MessagesSquare,
    Radio,
    Globe,
    Compass,
    MapPin,
    Layers,
    Navigation,
    Info,
    CheckCircle2,
    Sparkles,
    Flame,
    Waves,
    Droplets
} from "lucide-react";

import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";

export const metadata: Metadata = {
  title: "About Community Hub | Rebuilding Local Communities",
  description: "Learn about Community Hub's mission to reconnect and enrich local communities with Regional Networks, Geofenced Maps, Broadcast Systems, Emergency Resilience, and local commerce.",
  openGraph: {
    title: "About Community Hub | Rebuilding Local Communities",
    description: "Learn how Community Hub is transforming local engagement, supporting small businesses, and empowering regional networks and community leaders.",
    images: [
        {
            url: '/images/about/hero.jpg',
            width: 1200,
            height: 630,
            alt: 'A vibrant community event outdoors',
        }
    ]
  },
  twitter: {
    card: 'summary_large_image',
    title: 'About Community Hub | Rebuilding Local Communities',
    description: "Learn how Community Hub is transforming local engagement, supporting small businesses, and empowering regional networks and community leaders.",
    images: ['/images/about/hero.jpg'],
  }
};

const mainFeatures = [
    {
        icon: <Radio className="h-6 w-6 text-indigo-600 dark:text-indigo-400" />,
        title: "Regional Networks & Broadcasts",
        description: "Connect regional authorities and councils across multiple local hubs. Send verified broadcast announcements and non-dismissible alerts across an entire region."
    },
    {
        icon: <Compass className="h-6 w-6 text-emerald-600 dark:text-emerald-400" />,
        title: "Interactive Geofenced Maps",
        description: "Explore precise digital boundary maps for every community. Receive automatic welcome notifications when traveling into mapped community boundaries."
    },
    {
        icon: <ShieldAlert className="h-6 w-6 text-red-500" />,
        title: "Emergency & Civil Resilience Engine",
        description: "A statutory multi-hazard emergency management platform with real-time failover routing, live amber/red threat alert broadcasts, official situation noticeboards, and volunteer asset rosters."
    },
    {
        icon: <MapPin className="h-6 w-6 text-blue-600 dark:text-blue-400" />,
        title: "Live GPS & Location Detection",
        description: "Instantly detect local community hubs near you using live mobile device GPS, manual postcode lookup, or town search."
    },
    {
        icon: <Users className="h-6 w-6 text-primary" />,
        title: "Connect Your Community",
        description: "A central digital town square for local news, events, noticeboards, and community discussions, strengthening neighborhood bonds."
    },
    {
        icon: <Building2 className="h-6 w-6 text-primary" />,
        title: "Support Local Businesses",
        description: "Provide an affordable, dedicated platform for local shops to advertise, post annual events, and connect directly with nearby residents."
    },
    {
        icon: <Crown className="h-6 w-6 text-amber-500" />,
        title: "Empower Community Leaders",
        description: "Local leaders earn a 40% revenue share from advertising subscriptions, funding local projects or creating a sustainable business."
    },
    {
        icon: <Store className="h-6 w-6 text-primary" />,
        title: "Virtual High Street",
        description: "Stroll down a digital high street, browse local storefronts, buy goods, and support independent town traders from home."
    },
    {
        icon: <Truck className="h-6 w-6 text-primary" />,
        title: "Community Courier Service",
        description: "Local couriers deliver Virtual High Street purchases straight from local business doors to nearby resident doorsteps."
    }
];

const keyFeaturesList = [
    { icon: <Radio className="h-5 w-5 text-indigo-500" />, title: "Regional Broadcast System", description: "Regional authorities can broadcast announcements and alerts across every local hub within their jurisdiction." },
    { icon: <ShieldAlert className="h-5 w-5 text-red-500" />, title: "Community Emergency Action Plan (CEAP)", description: "Event-driven disaster protocols across Wildfire, Flood, Grid Outages, Water Shortages, and Civil Defence with failover refuges and verified situation bulletins." },
    { icon: <Compass className="h-5 w-5 text-emerald-500" />, title: "Geofence Entry Detection", description: "Get notified when entering mapped community boundaries and switch views seamlessly." },
    { icon: <MapPin className="h-5 w-5 text-blue-500" />, title: "Live GPS & Wi-Fi Triangulation", description: "Locate hubs instantly with mobile GPS or address/postcode lookup." },
    { icon: <FileText className="h-5 w-5 text-primary" />, title: "What's On Guide", description: "Real-time guide to local news, attractions, events, and community activities." },
    { icon: <Calendar className="h-5 w-5 text-primary" />, title: "Local Events Calendar", description: "Discover upcoming events and sync them directly to your device calendar." },
    { icon: <Building2 className="h-5 w-5 text-primary" />, title: "Local Business Directory", description: "Explore verified local shops, services, and annual business showcases." },
    { icon: <HeartHandshake className="h-5 w-5 text-emerald-500" />, title: "Resilience Volunteer & Asset Registry", description: "Register local 4x4 vehicles, diesel generators, chainsaws, and licensed radio operators ready to deploy during extreme weather." },
    { icon: <Briefcase className="h-5 w-5 text-primary" />, title: "Local Jobs Board", description: "Connect local employers with nearby jobseekers." },
    { icon: <Truck className="h-5 w-5 text-primary" />, title: "Community Courier Network", description: "Dedicated local delivery from high street shops to resident doorsteps." },
    { icon: <Shield className="h-5 w-5 text-primary" />, title: "Police Liaison Channel", description: "Direct line between designated community liaisons and local law enforcement." },
    { icon: <MessagesSquare className="h-5 w-5 text-primary" />, title: "Community Chat", description: "Private and group messaging kept local, secure, and relevant." },
    { icon: <Users className="h-5 w-5 text-primary" />, title: "Community Reporter System", description: "Local residents volunteer to report on sports, culture, and neighborhood news." },
    { icon: <Search className="h-5 w-5 text-primary" />, title: "Lost & Found Board", description: "Reunite neighbors with lost pets and items quickly." },
    { icon: <Telescope className="h-5 w-5 text-primary" />, title: "Digital Tourist Guide", description: "A comprehensive digital guide for visitors discovering local landmarks." },
    { icon: <Crown className="h-5 w-5 text-amber-500" />, title: "40%+ Community Revenue Share", description: "40% to 60%+ of advertising revenue returns directly to community leaders." },
    { icon: <Activity className="h-5 w-5 text-primary" />, title: "AI Moderation & Assistance", description: "Context-aware AI moderation keeps hub interactions safe and clean." },
];

export default function AboutPage() {
    return (
        <div className="space-y-16 py-12 max-w-7xl mx-auto px-4">
            
            {/* Hero Section */}
            <section className="text-center space-y-6">
                <div className="flex justify-center">
                    <Badge variant="outline" className="px-4 py-1.5 bg-primary/5 text-primary border-primary/20 text-xs font-semibold rounded-full gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        Next-Generation Community Platform
                    </Badge>
                </div>
                <h1 className="text-4xl md:text-6xl font-bold tracking-tight font-headline max-w-4xl mx-auto leading-tight">
                    Rebuilding Local Communities, Regional Networks & High Streets
                </h1>
                <p className="max-w-3xl mx-auto text-lg text-muted-foreground leading-relaxed">
                    Community Hub is an all-in-one digital platform designed to reconnect residents, empower local businesses, enable regional council broadcasts, manage emergency resilience, and map out neighborhoods through interactive geofencing.
                </p>
                <div className="flex flex-wrap justify-center gap-4 pt-2">
                    <Button asChild size="lg" className="font-semibold shadow-md">
                        <Link href="/signup">Join or Create a Community Hub</Link>
                    </Button>
                    <Button asChild variant="outline" size="lg" className="font-semibold">
                        <Link href="/communities">Explore Community Map</Link>
                    </Button>
                </div>
            </section>

            {/* Main Hero Image */}
            <div className="relative w-full h-80 sm:h-[420px] rounded-3xl overflow-hidden shadow-2xl border">
                <Image 
                    src="/images/about/hero.jpg" 
                    alt="Vibrant local community street festival with market stalls" 
                    fill 
                    className="object-cover" 
                    priority 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6 sm:p-10">
                    <div className="text-white space-y-1">
                        <h3 className="text-xl sm:text-2xl font-bold">Hyper-Local Connection & Regional Reach</h3>
                        <p className="text-xs sm:text-sm text-slate-200">Bringing residents, local councils, emergency teams, and high street traders into one unified digital square.</p>
                    </div>
                </div>
            </div>

            {/* Mission Section */}
            <section className="text-center space-y-8">
                <div className="space-y-3">
                    <h2 className="text-3xl font-bold font-headline">Our Platform Capabilities</h2>
                    <p className="max-w-3xl mx-auto text-muted-foreground">
                        From individual neighborhood noticeboards to regional network broadcasts, emergency resilience planning, and GPS geofence mapping, our platform provides the complete digital infrastructure for local life.
                    </p>
                </div>

                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6 text-left">
                    {mainFeatures.map(feature => (
                        <Card key={feature.title} className="hover:border-primary/50 transition-all duration-200 shadow-sm bg-card/60 backdrop-blur-md">
                            <CardHeader className="flex flex-row items-start gap-4 pb-2">
                                <div className="p-2.5 rounded-xl bg-primary/5 border border-primary/10 shrink-0">
                                    {feature.icon}
                                </div>
                                <CardTitle className="text-base font-bold pt-1">{feature.title}</CardTitle>
                            </CardHeader>
                            <CardContent>
                                <p className="text-muted-foreground text-xs leading-relaxed">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <Separator />

            {/* Section 1: Regional Networks & Broadcast System */}
            <section className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-5">
                    <Badge variant="outline" className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-xs font-semibold gap-1.5">
                        <Radio className="h-3.5 w-3.5 text-indigo-600" />
                        Regional Networks
                    </Badge>
                    <h2 className="text-3xl font-bold font-headline leading-tight">
                        Regional Networks & Multi-Hub Broadcast System
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        We empower <strong>Regional Authorities, Local Councils, and District Organizations</strong> to claim oversight over entire geographic regions containing multiple local community hubs.
                    </p>
                    <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                            <span><strong>Multi-Community Broadcasts:</strong> Issue verified regional updates, public notices, and announcements that reach every local community hub within your authority boundary simultaneously.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                            <span><strong>Emergency Alert Channels:</strong> High-priority, non-dismissible alerts for critical weather, safety warnings, or road closures delivered instantly to residents&apos; screens.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-indigo-600 shrink-0 mt-0.5" />
                            <span><strong>Regional Jurisdiction Boundaries:</strong> Visualize regional coverage borders overlaid cleanly on top of local community maps.</span>
                        </div>
                    </div>
                    <div className="pt-2">
                        <Button asChild className="bg-indigo-600 hover:bg-indigo-700 text-white font-semibold">
                            <Link href="/regional-networks">Explore Regional Networks Directory</Link>
                        </Button>
                    </div>
                </div>
                <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-xl border">
                    <Image 
                        src="/images/about/regional.jpg" 
                        alt="Regional Network map dashboard with broadcast alerts" 
                        fill 
                        className="object-cover" 
                    />
                </div>
            </section>

            <Separator />

            {/* Section 2: Geofencing Maps & GPS Location */}
            <section className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-xl border order-2 lg:order-1">
                    <Image 
                        src="/images/about/geofencing.jpg" 
                        alt="Interactive geofencing map with community boundaries and GPS pin" 
                        fill 
                        className="object-cover" 
                    />
                </div>
                <div className="space-y-5 order-1 lg:order-2">
                    <Badge variant="outline" className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs font-semibold gap-1.5">
                        <Compass className="h-3.5 w-3.5 text-emerald-600" />
                        Spatial Technology
                    </Badge>
                    <h2 className="text-3xl font-bold font-headline leading-tight">
                        Interactive Geofencing & Live GPS Detection
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Every mapped community has custom GeoJSON boundary polygon coordinates drawn directly by local leaders. When residents travel across town borders, our geofencing engine works in real-time.
                    </p>
                    <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Automatic Entry Alerts:</strong> Cross into a mapped community and receive an instant prompt: <em>&ldquo;Welcome to [Community Name]! Would you like to view local updates?&rdquo;</em></span>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Live GPS & Address Search:</strong> Tap <em>Live GPS / Wi-Fi</em> to position the map on your exact coordinates, or search any UK town or postcode directly.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Clear Transparency:</strong> Built-in caveats clarify when Wi-Fi IP routing places users at distant data centers, guiding users to mobile GPS or manual town search for 100% accuracy.</span>
                        </div>
                    </div>
                    <div className="pt-2">
                        <Button asChild variant="outline" className="font-semibold border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50">
                            <Link href="/communities">Try the Geofenced Map</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <Separator />

            {/* Section 3: Virtual High Street */}
            <section className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-5">
                    <Badge variant="outline" className="px-3 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs font-semibold gap-1.5">
                        <Store className="h-3.5 w-3.5 text-amber-600" />
                        Local Commerce
                    </Badge>
                    <h2 className="text-3xl font-bold font-headline leading-tight">
                        The Digital High Street: Local Shopping & Delivery
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Global online marketplaces often leave independent town shops behind. Our Virtual High Street brings local storefronts online, allowing residents to browse local products, order from town traders, and support independent businesses.
                    </p>
                    <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <span><strong>Direct High Street Storefronts:</strong> Local shops can display products, offer online purchasing, and publish annual sales events.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <span><strong>Community Courier Delivery:</strong> Dedicated local couriers pick up orders from high street shops and deliver them straight to nearby homes.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
                            <span><strong>40% Local Revenue Return:</strong> Profits from local business subscriptions return directly to community leaders to reinvest in the local area.</span>
                        </div>
                    </div>
                    <div className="pt-2">
                        <Button asChild size="lg" className="font-semibold">
                            <Link href="/shopping">Explore Virtual High Street</Link>
                        </Button>
                    </div>
                </div>
                <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-xl border">
                    <Image 
                        src="/images/about/highstreet.jpg" 
                        alt="Digital High Street with local shops and shopping app interface" 
                        fill 
                        className="object-cover" 
                    />
                </div>
            </section>

            <Separator />

            {/* Section 4: Emergency & Civil Resilience Engine */}
            <section className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-xl border order-2 lg:order-1">
                    <Image 
                        src="/images/about/emergency.jpg" 
                        alt="Community Emergency Resilience operations center with failover maps and volunteer coordination" 
                        fill 
                        className="object-cover" 
                    />
                </div>
                <div className="space-y-5 order-1 lg:order-2">
                    <Badge variant="outline" className="px-3 py-1 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 text-xs font-semibold gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                        Civil Contingencies & Resilience
                    </Badge>
                    <h2 className="text-3xl font-bold font-headline leading-tight">
                        Statutory Emergency Planning & Real-Time Incident Response
                    </h2>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        When extreme weather, power cuts, wildfires, or flooding strike, rural and urban communities need clear, coordinated action. Community Hub equips local councils and community leaders with a living <strong>Statutory Emergency Action Plan</strong> and dynamic crisis command tools.
                    </p>
                    <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <span><strong>Dynamic Infrastructure Failovers:</strong> If primary command posts, warm spaces, or escape routes become compromised, leaders can divert residents to secondary failovers in real time.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <span><strong>One-Way Verified Situation Noticeboard:</strong> Cut through open chat noise and rumors with direct, authoritative bulletins pinned to public screens during amber and red alerts.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-red-600 shrink-0 mt-0.5" />
                            <span><strong>Volunteer Skills & Equipment Mobilisation:</strong> Maintain an active inventory of local 4x4s, portable generators, chainsaws, water bowsers, and off-grid radio mesh operators ready to respond.</span>
                        </div>
                    </div>
                    <div className="pt-2 flex items-center gap-3 flex-wrap">
                        <Button asChild size="lg" className="bg-red-600 hover:bg-red-700 text-white font-semibold shadow-md">
                            <Link href="/leader/emergency-plan">Leader Emergency Console</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="font-semibold">
                            <Link href="/communities">Explore Community Hubs</Link>
                        </Button>
                    </div>
                </div>
            </section>

            <Separator />

            {/* Complete Key Features Grid */}
            <section className="space-y-8">
                <div className="text-center space-y-3">
                    <h2 className="text-3xl font-bold font-headline">Comprehensive Platform Feature Set</h2>
                    <p className="max-w-3xl mx-auto text-muted-foreground text-sm">
                        Community Hub packs an unprecedented array of local tools into a single, intuitive application.
                    </p>
                </div>
                
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
                    {keyFeaturesList.map(feature => (
                        <Card key={feature.title} className="text-left flex flex-col hover:border-primary/40 transition-colors bg-card/60">
                           <CardHeader className="flex-grow pb-2">
                                <div className="flex items-center gap-3">
                                    <div className="p-2 rounded-lg bg-primary/5 border border-primary/10">
                                        {feature.icon}
                                    </div>
                                    <CardTitle className="text-base font-semibold">{feature.title}</CardTitle>
                                </div>
                            </CardHeader>
                            <CardContent>
                                <p className="text-xs text-muted-foreground leading-relaxed">{feature.description}</p>
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <Separator />

            {/* Security & Private Hubs Section */}
            <section className="grid lg:grid-cols-2 gap-12 items-center">
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        <h2 className="text-3xl font-bold font-headline">Security, Privacy & Private Hubs</h2>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Your safety and data privacy are foundational. Built on Google&apos;s enterprise infrastructure, Community Hub uses role-based access control, AI-driven content moderation, and encrypted database rules to protect every user.
                    </p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        Need an unlisted, confidential space? We offer <strong>Exclusive Private Hubs</strong> perfect for clubs, sports teams, associations, and professional groups. Private hubs do not appear in public searches.
                    </p>
                    <Button asChild size="lg">
                        <Link href="/report-issue?tab=platform&subject=Request%20a%20Private%20Hub">Request a Private Hub</Link>
                    </Button>
                </div>
                <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-xl border">
                    <Image 
                        src="/images/about/security.jpg" 
                        alt="Security and role-based encryption concept" 
                        fill 
                        className="object-cover" 
                    />
                </div>
            </section>

            {/* Progressive Web App Installation Guide */}
            <section className="space-y-8 text-center pt-8 border-t">
                <div className="flex items-center justify-center gap-4">
                    <Separator className="w-1/4" />
                    <Smartphone className="h-8 w-8 text-primary" />
                    <Separator className="w-1/4" />
                </div>
                <h2 className="text-3xl font-bold font-headline">Install The App On Your Device</h2>
                <p className="text-muted-foreground max-w-3xl mx-auto text-sm">
                    No app store downloads required! Community Hub is a Progressive Web App (PWA) that installs directly from your web browser for an instant app experience with push notifications.
                </p>
                <div className="grid md:grid-cols-2 gap-6 text-left max-w-4xl mx-auto">
                     <Card className="bg-card/80">
                        <CardHeader>
                            <CardTitle className="text-lg">On iOS (iPhone / iPad)</CardTitle>
                            <p className="text-xs text-muted-foreground">Using Safari Browser:</p>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs text-muted-foreground">
                            <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                                <li>Open <span className="font-semibold text-foreground">my-community-hub.co.uk</span> in Safari.</li>
                                <li>Tap the <span className="font-semibold text-foreground">&apos;Share&apos;</span> button (<SquareArrowUp className="inline-block h-3.5 w-3.5 -mt-0.5 mx-0.5" />) in the bottom toolbar.</li>
                                <li>Scroll down and tap <span className="font-semibold text-foreground">&apos;Add to Home Screen&apos;</span>.</li>
                                <li>Tap <span className="font-semibold text-foreground">&apos;Add&apos;</span> in the top-right corner.</li>
                            </ol>
                            <p className="text-[11px] font-semibold text-amber-700 dark:text-amber-300 pt-2 border-t">Note: iOS requires adding to Home Screen to enable push notifications.</p>
                        </CardContent>
                    </Card>

                     <Card className="bg-card/80">
                        <CardHeader>
                            <CardTitle className="text-lg">On Android</CardTitle>
                             <p className="text-xs text-muted-foreground">Using Chrome Browser:</p>
                        </CardHeader>
                        <CardContent className="space-y-3 text-xs text-muted-foreground">
                             <ol className="list-decimal list-inside space-y-2 leading-relaxed">
                                <li>Open <span className="font-semibold text-foreground">my-community-hub.co.uk</span> in Chrome.</li>
                                <li>Tap the <span className="font-semibold text-foreground">&ldquo;Add to Home Screen&rdquo;</span> banner if prompted.</li>
                                <li>Or tap the three-dot menu (<MoreVertical className="inline-block h-3.5 w-3.5 -mt-0.5 mx-0.5" />) in top right.</li>
                                <li>Tap <span className="font-semibold text-foreground">&apos;Install app&apos;</span> or <span className="font-semibold text-foreground">&apos;Add to Home Screen&apos;</span>.</li>
                            </ol>
                        </CardContent>
                    </Card>
                </div>
            </section>
                
            {/* Direct Action Shortcuts Guide */}
            <section className="space-y-6 text-center pt-8 border-t">
                <div className="flex items-center justify-center gap-4">
                    <Separator className="w-1/4" />
                    <Zap className="h-8 w-8 text-primary" />
                    <Separator className="w-1/4" />
                </div>

                <h2 className="text-3xl font-bold font-headline">Direct Action Shortcuts</h2>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                    Touch and hold our App icon on your mobile home screen to instantly open key shortcuts like <strong>Community Feed</strong>, <strong>Virtual High Street</strong>, or <strong>Community Chat</strong> without navigating through menus.
                </p>
            </section>

            <div className="text-xs text-muted-foreground pt-8 text-left border-t">
                Last major update: 22/08/2026
            </div>
        </div>
    );
}
