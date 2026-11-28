'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import Image from "next/image";
import Link from "next/link";
import { 
    Users, 
    Building2, 
    Crown, 
    ShieldAlert, 
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
    Store, 
    Zap, 
    Truck, 
    Shield, 
    MessagesSquare, 
    Radio, 
    Compass, 
    MapPin, 
    CheckCircle2, 
    Sparkles,
    Globe,
    ArrowUpDown,
    ArrowRight,
    CloudSun,
    Construction,
    GraduationCap,
    BarChart3,
    Bed,
    BookOpen,
    ShoppingBag,
    Bus,
    Sun
} from "lucide-react";
import { Separator } from "@/components/ui/separator";
import { Badge } from "@/components/ui/badge";
import {
    DEFAULT_ABOUT_SEO_DATA,
    type AboutSectionKey,
    type AboutSeoData,
} from "@/lib/seo/about-seo-defaults";
import {
    SeoEditPencil,
    SeoHeading,
    SeoManagerBar,
    SeoMetaEditorDialog,
    SeoSectionEditorDialog,
    useIsSeoManager,
} from "@/components/about/seo-editor-controls";

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
    { icon: <Sun className="h-5 w-5 text-amber-500" />, title: "7:30 AM Daily Morning Briefing", description: "One daily morning bulletin combining weather, 30-mile roadworks, school closures, 5-day holiday countdowns, and leader notices (auto-clears after 20 hours)." },
    { icon: <CloudSun className="h-5 w-5 text-sky-500" />, title: "Live Weather & Storm Warnings", description: "Boundary and town-centre-pinned forecasts with Met Office & storm alerts tailored to your community." },
    { icon: <Construction className="h-5 w-5 text-amber-500" />, title: "30-Mile Roadworks & Travel Hub", description: "Live trunk and local roadworks within 30 miles (via Scottish Road Works Register & local popup hazard reports), plus bus, rail, and taxi links." },
    { icon: <GraduationCap className="h-5 w-5 text-indigo-500" />, title: "School Closures & Term Dates", description: "Instant push & bell alerts from leaders or authorised school staff, auto-cleaning single-day closures, and editable local & public holiday calendars." },
    { icon: <Radio className="h-5 w-5 text-indigo-500" />, title: "Regional Broadcast System", description: "Regional authorities and National Parks can broadcast announcements and alerts across every local hub within their jurisdiction." },
    { icon: <ShieldAlert className="h-5 w-5 text-red-500" />, title: "Community Emergency Action Plan (CEAP)", description: "Event-driven disaster protocols across Wildfire, Flood, Grid Outages, Water Shortages, and Civil Defence with failover refuges and verified situation bulletins." },
    { icon: <Compass className="h-5 w-5 text-emerald-500" />, title: "Geofence & Town Centre Pin", description: "Leaders draw custom GeoJSON community boundaries and can set a High Street centre pin for pinpoint weather and 30-mile travel alerts." },
    { icon: <MapPin className="h-5 w-5 text-blue-500" />, title: "Live GPS & Wi-Fi Triangulation", description: "Locate hubs instantly with mobile GPS or address/postcode lookup." },
    { icon: <FileText className="h-5 w-5 text-primary" />, title: "Local News & What's On Guides", description: "Dedicated In Town and Around & Surrounding Area guides alongside local news stories, opening hours, and Google Maps links." },
    { icon: <Calendar className="h-5 w-5 text-primary" />, title: "Local Events Calendar", description: "Discover live and upcoming events with start times, recurring schedules, and one-click .ics / Google Calendar export." },
    { icon: <BarChart3 className="h-5 w-5 text-emerald-600" />, title: "Community Polls & Petitions", description: "Community-scoped consultations and local campaigns with live voting, expiry tracking, and transparent results." },
    { icon: <Building2 className="h-5 w-5 text-primary" />, title: "Local Business Directory", description: "Explore verified local shops, trades, and annual business showcases." },
    { icon: <Globe className="h-5 w-5 text-emerald-500" />, title: "Public Directory & Google SEO", description: "Open-access public business directory with Schema.org JSON-LD indexing, 10-line table pagination, custom sorting, and verified partner badges." },
    { icon: <Bed className="h-5 w-5 text-teal-500" />, title: "Accommodation & Guestbook", description: "Showcase local hotels, B&Bs, and holiday stays alongside a resident & visitor guestbook with star ratings and photos." },
    { icon: <HeartHandshake className="h-5 w-5 text-emerald-500" />, title: "Local Charities & Resilience Assets", description: "Spotlight local charities alongside a resilience volunteer roster of 4x4s, generators, and licensed radio operators." },
    { icon: <ShoppingBag className="h-5 w-5 text-amber-600" />, title: "Virtual High Street & Buy/Swap/Sell", description: "Shop local storefronts with courier delivery, plus neighbour-to-neighbour Buy, Swap & Sell and Lost & Found boards." },
    { icon: <Briefcase className="h-5 w-5 text-primary" />, title: "Local Jobs Board", description: "Connect local employers with nearby jobseekers across full-time, part-time, and seasonal roles." },
    { icon: <Truck className="h-5 w-5 text-primary" />, title: "Community Courier Network", description: "Dedicated local delivery from high street shops to resident doorsteps." },
    { icon: <Shield className="h-5 w-5 text-primary" />, title: "Police Liaison Channel", description: "Direct line between designated community liaisons and local law enforcement." },
    { icon: <MessagesSquare className="h-5 w-5 text-primary" />, title: "Community Chat & Reporters", description: "Secure local messaging and volunteer Community Reporters covering sports, culture, and neighbourhood news." },
    { icon: <Crown className="h-5 w-5 text-amber-500" />, title: "40%+ Community Revenue Share", description: "40% to 60%+ of advertising revenue returns directly to community leaders." },
    { icon: <Activity className="h-5 w-5 text-primary" />, title: "AI Moderation & Assistance", description: "Context-aware AI moderation keeps hub interactions safe and clean." },
];

const homeShowcasePillars = [
    {
        badge: "Daily Essentials",
        title: "Weather, Travel & School Alerts",
        color: "border-t-4 border-t-sky-500",
        items: [
            { name: "Welcome & Live Weather Strip", page: "/communities & /emergency", desc: "Real-time local weather, storm warnings, and visitor shortcuts anchored to your community boundary or Town Centre Pin." },
            { name: "Local Travel & 30-Mile Roadworks", page: "/travel", desc: "Live trunk & local road closures within 30 miles, resident-reported popup hazards, plus bus timetables, rail departures, and taxis." },
            { name: "Local School Closures & Term Dates", page: "Home Noticeboard & Council Links", desc: "Instant closure alerts from leaders or authorised school staff, auto-clearing 1-day snow/power notices, and editable holiday calendars." },
            { name: "Emergency & Announcement Banners", page: "/emergency", desc: "High-priority verified alerts and emergency resilience bulletins delivered straight to residents." },
        ],
    },
    {
        badge: "Civic Voice & Regional",
        title: "News, Polls, Petitions & Oversight",
        color: "border-t-4 border-t-emerald-500",
        items: [
            { name: "Local News", page: "/news", desc: "Trusted hyper-local stories, council updates, and community reporting with full article views." },
            { name: "Have Your Say! (Polls)", page: "/polls", desc: "Community-specific consultations with live voting, automatic expiry handling, and results archives." },
            { name: "Petitions & Campaigns", page: "/petitions", desc: "Rally local support for town improvements and track signatures on the full Petitions page." },
            { name: "Regional Networks", page: "/regional & /communities", desc: "Connects local hubs with Councils and National Parks for targeted regional broadcasts and map visibility." },
        ],
    },
    {
        badge: "Things To Do & Stays",
        title: "Events, What's On & Visitor Life",
        color: "border-t-4 border-t-amber-500",
        items: [
            { name: "Live & Upcoming Events", page: "/events", desc: "Today’s happenings and upcoming calendar events with start times, recurring schedules, and .ics / Google Calendar export." },
            { name: "What's On (In Town & Around)", page: "/whatson", desc: "Dedicated local and surrounding-area guides with opening hours, contact details, and Google Maps links." },
            { name: "Accommodation", page: "/accommodation", desc: "Local hotels, B&Bs, cabins, and holiday stays for visitors exploring your area." },
            { name: "Community Guestbook", page: "/guestbook", desc: "Digital visitor book where locals and travellers share reviews, star ratings, and photos." },
        ],
    },
    {
        badge: "Local Economy & Neighbours",
        title: "High Street, Jobs, Charities & Boards",
        color: "border-t-4 border-t-indigo-500",
        items: [
            { name: "From Your Highstreet & Businesses", page: "/businesses & /shopping", desc: "Local business showcases, community adverts, and Virtual High Street storefronts." },
            { name: "Local Shopping & Jobs", page: "/shopping & /jobs", desc: "Browse products from independent shops and explore local full-time, part-time, and seasonal vacancies." },
            { name: "Support Local Charities", page: "/charities", desc: "Highlights local charities and voluntary groups with direct links to donate or volunteer." },
            { name: "Lost & Found / Buy, Swap & Sell", page: "/marketplace", desc: "Practical neighbour-to-neighbour boards for reuniting lost items and trading locally without spam." },
        ],
    },
];

export function AboutContent({ initialSeoData }: { initialSeoData?: AboutSeoData }) {
    const [seoData, setSeoData] = React.useState<AboutSeoData>(
        initialSeoData || DEFAULT_ABOUT_SEO_DATA
    );
    const { isSeoManager } = useIsSeoManager();
    const [showPencils, setShowPencils] = React.useState(true);
    const [metaDialogOpen, setMetaDialogOpen] = React.useState(false);
    const [editingSection, setEditingSection] = React.useState<{
        key: AboutSectionKey;
        label: string;
    } | null>(null);

    const canEdit = isSeoManager && showPencils;
    const { sections, meta } = seoData;
    const sectionBoxClass = canEdit
        ? "relative rounded-2xl p-3 sm:p-4 -m-3 sm:-m-4 border border-dashed border-amber-500/40 hover:border-amber-500/80 transition-colors"
        : "relative";

    return (
        <div className="space-y-16 py-12 max-w-7xl mx-auto px-4">
            {isSeoManager && (
                <SeoManagerBar
                    seoData={seoData}
                    showPencils={showPencils}
                    onTogglePencils={() => setShowPencils((prev) => !prev)}
                    onOpenMetaEditor={() => setMetaDialogOpen(true)}
                />
            )}
            
            {/* Hero Section */}
            <section className={`text-center space-y-6 ${sectionBoxClass}`}>
                {canEdit && (
                    <div className="flex justify-end">
                        <SeoEditPencil
                            label="Hero"
                            tagHint={sections.hero.headingTag}
                            onClick={() => setEditingSection({ key: 'hero', label: 'Hero Section' })}
                        />
                    </div>
                )}
                <div className="flex justify-center">
                    <Badge variant="outline" className="px-4 py-1.5 bg-primary/5 text-primary border-primary/20 text-xs font-semibold rounded-full gap-2">
                        <Sparkles className="h-3.5 w-3.5 text-primary" />
                        {sections.hero.badge}
                    </Badge>
                </div>
                <SeoHeading
                    tag={sections.hero.headingTag}
                    className="text-4xl md:text-6xl font-bold tracking-tight font-headline max-w-4xl mx-auto leading-tight"
                >
                    {sections.hero.heading}
                </SeoHeading>
                <p className="max-w-3xl mx-auto text-lg text-muted-foreground leading-relaxed">
                    {sections.hero.description}
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
            <div className={`relative w-full h-80 sm:h-[420px] rounded-3xl overflow-hidden shadow-2xl border ${canEdit ? 'ring-2 ring-amber-500/60 ring-offset-2' : ''}`}>
                {canEdit && (
                    <div className="absolute top-3 right-3 z-20">
                        <SeoEditPencil
                            label="Hero Image & Caption"
                            tagHint={sections.heroBanner.headingTag}
                            onClick={() => setEditingSection({ key: 'heroBanner', label: 'Hero Image & Banner Caption' })}
                        />
                    </div>
                )}
                <Image 
                    src={sections.heroBanner.imageUrl || "/images/about/hero.jpg"} 
                    alt={sections.heroBanner.imageAlt || "Vibrant local community street festival with market stalls"} 
                    title={sections.heroBanner.imageTitle}
                    fill 
                    className="object-cover" 
                    priority 
                />
                <div className="absolute inset-0 bg-gradient-to-t from-black/70 via-black/20 to-transparent flex items-end p-6 sm:p-10">
                    <div className="text-white space-y-1">
                        <SeoHeading tag={sections.heroBanner.headingTag} className="text-xl sm:text-2xl font-bold">
                            {sections.heroBanner.heading}
                        </SeoHeading>
                        <p className="text-xs sm:text-sm text-slate-200">{sections.heroBanner.description}</p>
                    </div>
                </div>
            </div>

            {/* Mission Section */}
            <section className={`text-center space-y-8 ${sectionBoxClass}`}>
                {canEdit && (
                    <div className="flex justify-end">
                        <SeoEditPencil
                            label="Capabilities"
                            tagHint={sections.mission.headingTag}
                            onClick={() => setEditingSection({ key: 'mission', label: 'Platform Capabilities' })}
                        />
                    </div>
                )}
                <div className="space-y-3">
                    <SeoHeading tag={sections.mission.headingTag} className="text-3xl font-bold font-headline">
                        {sections.mission.heading}
                    </SeoHeading>
                    <p className="max-w-3xl mx-auto text-muted-foreground">
                        {sections.mission.description}
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
            <section className={`grid lg:grid-cols-2 gap-12 items-center ${sectionBoxClass}`}>
                {canEdit && (
                    <div className="lg:col-span-2 flex justify-end -mb-8">
                        <SeoEditPencil
                            label="Regional Networks"
                            tagHint={sections.regionalNetworks.headingTag}
                            onClick={() => setEditingSection({ key: 'regionalNetworks', label: 'Regional Networks Section' })}
                        />
                    </div>
                )}
                <div className="space-y-5">
                    <Badge variant="outline" className="px-3 py-1 bg-indigo-50 dark:bg-indigo-950/50 text-indigo-700 dark:text-indigo-300 border-indigo-200 dark:border-indigo-800 text-xs font-semibold gap-1.5">
                        <Radio className="h-3.5 w-3.5 text-indigo-600" />
                        {sections.regionalNetworks.badge}
                    </Badge>
                    <SeoHeading tag={sections.regionalNetworks.headingTag} className="text-3xl font-bold font-headline leading-tight">
                        {sections.regionalNetworks.heading}
                    </SeoHeading>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {sections.regionalNetworks.description}
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
                        src={sections.regionalNetworks.imageUrl || "/images/about/regional.jpg"} 
                        alt={sections.regionalNetworks.imageAlt || "Regional Network map dashboard with broadcast alerts"} 
                        title={sections.regionalNetworks.imageTitle}
                        fill 
                        className="object-cover" 
                    />
                </div>
            </section>

            <Separator />

            {/* Section 2: Geofencing Maps & GPS Location */}
            <section className={`grid lg:grid-cols-2 gap-12 items-center ${sectionBoxClass}`}>
                {canEdit && (
                    <div className="lg:col-span-2 flex justify-end -mb-8">
                        <SeoEditPencil
                            label="Geofencing & GPS"
                            tagHint={sections.geofencing.headingTag}
                            onClick={() => setEditingSection({ key: 'geofencing', label: 'Geofencing & GPS Section' })}
                        />
                    </div>
                )}
                <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-xl border order-2 lg:order-1">
                    <Image 
                        src={sections.geofencing.imageUrl || "/images/about/geofencing.jpg"} 
                        alt={sections.geofencing.imageAlt || "Interactive geofencing map with community boundaries and GPS pin"} 
                        title={sections.geofencing.imageTitle}
                        fill 
                        className="object-cover" 
                    />
                </div>
                <div className="space-y-5 order-1 lg:order-2">
                    <Badge variant="outline" className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs font-semibold gap-1.5">
                        <Compass className="h-3.5 w-3.5 text-emerald-600" />
                        {sections.geofencing.badge}
                    </Badge>
                    <SeoHeading tag={sections.geofencing.headingTag} className="text-3xl font-bold font-headline leading-tight">
                        {sections.geofencing.heading}
                    </SeoHeading>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {sections.geofencing.description}
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
            <section className={`grid lg:grid-cols-2 gap-12 items-center ${sectionBoxClass}`}>
                {canEdit && (
                    <div className="lg:col-span-2 flex justify-end -mb-8">
                        <SeoEditPencil
                            label="Virtual High Street"
                            tagHint={sections.highStreet.headingTag}
                            onClick={() => setEditingSection({ key: 'highStreet', label: 'Virtual High Street Section' })}
                        />
                    </div>
                )}
                <div className="space-y-5">
                    <Badge variant="outline" className="px-3 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs font-semibold gap-1.5">
                        <Store className="h-3.5 w-3.5 text-amber-600" />
                        {sections.highStreet.badge}
                    </Badge>
                    <SeoHeading tag={sections.highStreet.headingTag} className="text-3xl font-bold font-headline leading-tight">
                        {sections.highStreet.heading}
                    </SeoHeading>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {sections.highStreet.description}
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
                        src={sections.highStreet.imageUrl || "/images/about/highstreet.jpg"} 
                        alt={sections.highStreet.imageAlt || "Digital High Street with local shops and shopping app interface"} 
                        title={sections.highStreet.imageTitle}
                        fill 
                        className="object-cover" 
                    />
                </div>
            </section>

            <Separator />

            {/* Section 4: Emergency & Civil Resilience Engine */}
            <section className={`grid lg:grid-cols-2 gap-12 items-center ${sectionBoxClass}`}>
                {canEdit && (
                    <div className="lg:col-span-2 flex justify-end -mb-8">
                        <SeoEditPencil
                            label="Emergency Resilience"
                            tagHint={sections.resilience.headingTag}
                            onClick={() => setEditingSection({ key: 'resilience', label: 'Emergency Resilience Section' })}
                        />
                    </div>
                )}
                <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-xl border order-2 lg:order-1">
                    <Image 
                        src={sections.resilience.imageUrl || "/images/about/emergency.jpg"} 
                        alt={sections.resilience.imageAlt || "Community Emergency Resilience operations center with failover maps and volunteer coordination"} 
                        title={sections.resilience.imageTitle}
                        fill 
                        className="object-cover" 
                    />
                </div>
                <div className="space-y-5 order-1 lg:order-2">
                    <Badge variant="outline" className="px-3 py-1 bg-red-50 dark:bg-red-950/50 text-red-700 dark:text-red-300 border-red-200 dark:border-red-800 text-xs font-semibold gap-1.5">
                        <ShieldAlert className="h-3.5 w-3.5 text-red-600" />
                        {sections.resilience.badge}
                    </Badge>
                    <SeoHeading tag={sections.resilience.headingTag} className="text-3xl font-bold font-headline leading-tight">
                        {sections.resilience.heading}
                    </SeoHeading>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {sections.resilience.description}
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

            {/* Section 4b: Local Travel, Buses, Trains, Taxis & 30-Mile Roadworks */}
            {(() => {
                const localTravel = sections.localTravel || DEFAULT_ABOUT_SEO_DATA.sections.localTravel;
                return (
                <section className={`grid lg:grid-cols-2 gap-12 items-center ${sectionBoxClass}`}>
                    {canEdit && (
                        <div className="lg:col-span-2 flex justify-end -mb-8">
                            <SeoEditPencil
                                label="Local Travel"
                                tagHint={localTravel.headingTag}
                                onClick={() => setEditingSection({ key: 'localTravel', label: 'Local Travel & Transport Section' })}
                            />
                        </div>
                    )}
                    <div className="space-y-5">
                        <Badge variant="outline" className="px-3 py-1 bg-sky-50 dark:bg-sky-950/50 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-xs font-semibold gap-1.5">
                            <Bus className="h-3.5 w-3.5 text-sky-600" />
                            {localTravel.badge}
                        </Badge>
                        <SeoHeading tag={localTravel.headingTag} className="text-3xl font-bold font-headline leading-tight">
                            {localTravel.heading}
                        </SeoHeading>
                        <p className="text-muted-foreground leading-relaxed">
                            {localTravel.description}
                        </p>
                        <div className="space-y-2.5 text-sm">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                                <span><strong>Buses, Trains &amp; Live Trackers:</strong> View primary local bus routes, timetable links, and nearest rail station departures without hunting across operator websites.</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                                <span><strong>Local Taxis, Community Transport &amp; EV Charging:</strong> Instant tap-to-call local taxi firms, accessible community transport, and nearby EV charging points.</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-sky-600 shrink-0 mt-0.5" />
                                <span><strong>30-Mile Roadworks &amp; Popup Hazard Alerts:</strong> Official trunk and council roadworks within 30 miles combined with resident-reported closures like fallen trees or temporary lights.</span>
                            </div>
                        </div>
                        <div className="pt-2 flex items-center gap-3 flex-wrap">
                            <Button asChild size="lg" className="bg-sky-600 hover:bg-sky-700 text-white font-semibold shadow-md">
                                <Link href="/travel">Open Local Travel Guide</Link>
                            </Button>
                        </div>
                    </div>
                    <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-xl border">
                        <Image
                            src={localTravel.imageUrl || "/images/about/travel.svg"}
                            alt={localTravel.imageAlt || "Small town transport hub with local bus, train platform, taxi, and digital travel board"}
                            title={localTravel.imageTitle}
                            fill
                            className="object-cover"
                        />
                    </div>
                </section>
                );
            })()}

            <Separator />

            {/* Section 4c: 7:30 AM Daily Morning Briefing & Leader Notices */}
            {(() => {
                const dailyBriefing = sections.dailyBriefing || DEFAULT_ABOUT_SEO_DATA.sections.dailyBriefing;
                return (
                <section className={`grid lg:grid-cols-2 gap-12 items-center ${sectionBoxClass}`}>
                    {canEdit && (
                        <div className="lg:col-span-2 flex justify-end -mb-8">
                            <SeoEditPencil
                                label="Daily Briefing"
                                tagHint={dailyBriefing.headingTag}
                                onClick={() => setEditingSection({ key: 'dailyBriefing', label: 'Daily Morning Briefing Section' })}
                            />
                        </div>
                    )}
                    <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-xl border order-2 lg:order-1">
                        <Image
                            src={dailyBriefing.imageUrl || "/images/about/daily-briefing.svg"}
                            alt={dailyBriefing.imageAlt || "Morning Bulletin card showing leader notices, weather, 30-mile roadworks, and school countdowns"}
                            title={dailyBriefing.imageTitle}
                            fill
                            className="object-cover"
                        />
                    </div>
                    <div className="space-y-5 order-1 lg:order-2">
                        <Badge variant="outline" className="px-3 py-1 bg-amber-50 dark:bg-amber-950/50 text-amber-700 dark:text-amber-300 border-amber-200 dark:border-amber-800 text-xs font-semibold gap-1.5">
                            <Sun className="h-3.5 w-3.5 text-amber-500" />
                            {dailyBriefing.badge}
                        </Badge>
                        <SeoHeading tag={dailyBriefing.headingTag} className="text-3xl font-bold font-headline leading-tight">
                            {dailyBriefing.heading}
                        </SeoHeading>
                        <p className="text-muted-foreground leading-relaxed">
                            {dailyBriefing.description}
                        </p>
                        <div className="space-y-2.5 text-sm">
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                <span><strong>Personalised Morning Bulletin Popup:</strong> Opens with a greeting for each resident and links straight to Weather, 30-Mile Roadworks, and School Closures.</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                <span><strong>Leader Daily Briefing Notices:</strong> Leaders can schedule everyday reminders (like a 7pm council meeting or hall event) from the Back Office without firing an urgent broadcast.</span>
                            </div>
                            <div className="flex items-start gap-3">
                                <CheckCircle2 className="h-5 w-5 text-amber-500 shrink-0 mt-0.5" />
                                <span><strong>20-Hour Auto-Cleanup &amp; Full User Control:</strong> Daily briefings auto-delete after 20 hours, and residents can toggle Weather, Roadworks, School Alerts, or the 7:30 AM Briefing anytime in Settings.</span>
                            </div>
                        </div>
                        <div className="pt-2 flex items-center gap-3 flex-wrap">
                            <Button asChild size="lg" className="bg-amber-500 hover:bg-amber-600 text-slate-950 font-semibold shadow-md">
                                <Link href="/settings">Manage Notification Settings</Link>
                            </Button>
                        </div>
                    </div>
                </section>
                );
            })()}

            <Separator />

            {/* Section 5: Public Business Directory & Google Search Indexing */}
            <section className={`grid lg:grid-cols-2 gap-12 items-center ${sectionBoxClass}`}>
                {canEdit && (
                    <div className="lg:col-span-2 flex justify-end -mb-8">
                        <SeoEditPencil
                            label="Public Directory"
                            tagHint={sections.publicDirectory.headingTag}
                            onClick={() => setEditingSection({ key: 'publicDirectory', label: 'Public Business Directory Section' })}
                        />
                    </div>
                )}
                <div className="space-y-5">
                    <Badge variant="outline" className="px-3 py-1 bg-emerald-50 dark:bg-emerald-950/50 text-emerald-700 dark:text-emerald-300 border-emerald-200 dark:border-emerald-800 text-xs font-semibold gap-1.5">
                        <Globe className="h-3.5 w-3.5 text-emerald-600" />
                        {sections.publicDirectory.badge}
                    </Badge>
                    <SeoHeading tag={sections.publicDirectory.headingTag} className="text-3xl font-bold font-headline leading-tight">
                        {sections.publicDirectory.heading}
                    </SeoHeading>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {sections.publicDirectory.description}
                    </p>
                    <div className="space-y-3 text-sm text-muted-foreground">
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Zero-Friction Visitor Experience:</strong> Residents, visitors, and tourists can browse local shops, trades, stays, and dining schedules without downloading an app or registering an account. Includes a responsive card grid and a 10-line desktop table with instant sorting (A–Z, newest, active partners).</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Structured Google Schema Markup:</strong> Every business profile is dynamically structured with <code>LocalBusiness</code> JSON-LD metadata for rich search engine snippets, local SEO discovery, and Google Maps visibility.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Community Couriers Reserved for Residents:</strong> While all public businesses are viewable by anyone, local community couriers remain safely accessible only to authenticated residents of that community.</span>
                        </div>
                        <div className="flex items-start gap-3">
                            <CheckCircle2 className="h-5 w-5 text-emerald-600 shrink-0 mt-0.5" />
                            <span><strong>Up to 80% Community Reinvestment:</strong> Subscription and advertising revenues flow back into local community funds to support village hall repairs, defibrillators, local resilience, and seasonal events.</span>
                        </div>
                    </div>
                    <div className="pt-2 flex items-center gap-3 flex-wrap">
                        <Button asChild size="lg" className="bg-emerald-600 hover:bg-emerald-700 text-white font-semibold shadow-md">
                            <Link href="/public-directory">Explore Public Directory</Link>
                        </Button>
                        <Button asChild variant="outline" size="lg" className="font-semibold border-emerald-300 dark:border-emerald-800 hover:bg-emerald-50 dark:hover:bg-emerald-950/50">
                            <Link href="/directory/advertise">Why Advertise With Us?</Link>
                        </Button>
                    </div>
                </div>

                {/* Interactive Visual Graphic / Directory Preview Card */}
                <div className="relative rounded-2xl border bg-gradient-to-br from-emerald-500/5 via-card to-background p-5 sm:p-6 shadow-xl space-y-4">
                    {/* Header Mock */}
                    <div className="flex items-center justify-between border-b pb-3.5">
                        <div className="flex items-center gap-2">
                            <div className="p-2 rounded-lg bg-emerald-600 text-white shadow-sm">
                                <Store className="h-4 w-4" />
                            </div>
                            <div>
                                <h4 className="text-sm font-semibold leading-tight">Public Directory Showcase</h4>
                                <p className="text-[11px] text-muted-foreground">Indexed for Google Search &bull; No Login Required</p>
                            </div>
                        </div>
                        <Badge className="bg-emerald-100 text-emerald-800 dark:bg-emerald-950 dark:text-emerald-300 text-[10px] font-semibold border border-emerald-300/40">
                            Live &amp; Searchable
                        </Badge>
                    </div>

                    {/* Search & Filter Mock */}
                    <div className="space-y-2">
                        <div className="flex items-center gap-2 bg-muted/60 border rounded-lg px-3 py-2 text-xs text-muted-foreground">
                            <Search className="h-3.5 w-3.5 text-muted-foreground shrink-0" />
                            <span className="truncate">Search local trades, restaurants, services...</span>
                            <span className="ml-auto text-[10px] bg-background border px-1.5 py-0.5 rounded font-mono">10-Line Rule</span>
                        </div>
                        <div className="flex items-center gap-1.5 overflow-x-auto text-[11px] pt-0.5">
                            <span className="bg-emerald-600 text-white px-2 py-0.5 rounded-full font-medium">All (Live)</span>
                            <span className="bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Local Businesses</span>
                            <span className="bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Featured Ads</span>
                            <span className="bg-muted px-2 py-0.5 rounded-full text-muted-foreground">Valued Partners</span>
                        </div>
                    </div>

                    {/* Mock Listing Rows / Cards */}
                    <div className="space-y-2.5">
                        <div className="p-3 rounded-xl border bg-card/90 shadow-sm hover:border-emerald-500/40 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-xs">Cairngorm Artisan Bakery &amp; Coffee</span>
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-emerald-50 text-emerald-700 border-emerald-200">Valued Partner</Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Fresh sourdough, organic coffee, seasonal bakery hampers</p>
                                </div>
                                <span className="text-[10px] font-semibold text-emerald-600 shrink-0">Open Now</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/40">
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-emerald-600" /> High Street Hub</span>
                                <span className="flex items-center gap-1"><Sparkles className="h-3 w-3 text-amber-500" /> Google LocalBusiness Schema</span>
                            </div>
                        </div>

                        <div className="p-3 rounded-xl border bg-card/90 shadow-sm hover:border-emerald-500/40 transition-colors">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="flex items-center gap-1.5 flex-wrap">
                                        <span className="font-semibold text-xs">Grampian Plumbing &amp; Renewable Heating</span>
                                        <Badge variant="outline" className="text-[9px] px-1.5 py-0 bg-primary/10 text-primary border-primary/20">Local Business</Badge>
                                    </div>
                                    <p className="text-[11px] text-muted-foreground mt-0.5">Certified heat pumps, emergency callouts, bathroom installation</p>
                                </div>
                                <span className="text-[10px] font-semibold text-emerald-600 shrink-0">Active</span>
                            </div>
                            <div className="flex items-center gap-3 text-[10px] text-muted-foreground mt-2 pt-2 border-t border-border/40">
                                <span className="flex items-center gap-1"><MapPin className="h-3 w-3 text-emerald-600" /> Regional Network</span>
                                <span className="flex items-center gap-1"><ArrowUpDown className="h-3 w-3 text-blue-500" /> Instant A-Z / Newest Sort</span>
                            </div>
                        </div>
                    </div>

                    {/* Footer Info Strip */}
                    <div className="pt-1 flex items-center justify-between text-[11px] text-muted-foreground">
                        <span className="flex items-center gap-1 text-emerald-700 dark:text-emerald-400 font-medium">
                            <CheckCircle2 className="h-3.5 w-3.5" /> 60%&ndash;80% Revenue Reinvested in Community
                        </span>
                        <Link href="/public-directory" className="text-primary hover:underline font-semibold flex items-center gap-1">
                            Browse All <ArrowRight className="h-3 w-3" />
                        </Link>
                    </div>
                </div>
            </section>

            <Separator />

            {/* Inside Your Town's Home Page & Full Pages Showcase */}
            <section className="space-y-8">
                <div className="text-center space-y-3">
                    <Badge variant="outline" className="px-3 py-1 bg-sky-50 dark:bg-sky-950/40 text-sky-700 dark:text-sky-300 border-sky-200 dark:border-sky-800 text-xs font-semibold gap-1.5">
                        <Sparkles className="h-3.5 w-3.5 text-sky-600" />
                        Your Town’s Digital Front Page
                    </Badge>
                    <h2 className="text-3xl font-bold font-headline">
                        Every Home Page Card &amp; Dedicated Page Explained
                    </h2>
                    <p className="max-w-3xl mx-auto text-muted-foreground text-sm">
                        Each community hub combines live daily essentials, civic engagement, local events, and high-street commerce on one home feed — with dedicated pages for deeper exploration.
                    </p>
                </div>

                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                    {homeShowcasePillars.map((pillar) => (
                        <Card key={pillar.title} className={`${pillar.color} shadow-sm bg-card/70`}>
                            <CardHeader className="pb-3">
                                <Badge variant="secondary" className="w-fit text-[10px] uppercase tracking-wider font-bold mb-1">
                                    {pillar.badge}
                                </Badge>
                                <CardTitle className="text-xl font-bold">{pillar.title}</CardTitle>
                            </CardHeader>
                            <CardContent className="space-y-3">
                                {pillar.items.map((item) => (
                                    <div key={item.name} className="rounded-lg border bg-background/70 p-3 space-y-1">
                                        <div className="flex items-center justify-between gap-2 flex-wrap">
                                            <span className="font-semibold text-sm text-foreground">{item.name}</span>
                                            <Badge variant="outline" className="text-[10px] font-mono">
                                                {item.page}
                                            </Badge>
                                        </div>
                                        <p className="text-xs text-muted-foreground leading-relaxed">{item.desc}</p>
                                    </div>
                                ))}
                            </CardContent>
                        </Card>
                    ))}
                </div>
            </section>

            <Separator />

            {/* Complete Key Features Grid */}
            <section className={`space-y-8 ${sectionBoxClass}`}>
                {canEdit && (
                    <div className="flex justify-end -mb-4">
                        <SeoEditPencil
                            label="Feature Set"
                            tagHint={sections.features.headingTag}
                            onClick={() => setEditingSection({ key: 'features', label: 'Comprehensive Feature Set' })}
                        />
                    </div>
                )}
                <div className="text-center space-y-3">
                    <SeoHeading tag={sections.features.headingTag} className="text-3xl font-bold font-headline">
                        {sections.features.heading}
                    </SeoHeading>
                    <p className="max-w-3xl mx-auto text-muted-foreground text-sm">
                        {sections.features.description}
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
            <section className={`grid lg:grid-cols-2 gap-12 items-center ${sectionBoxClass}`}>
                {canEdit && (
                    <div className="lg:col-span-2 flex justify-end -mb-8">
                        <SeoEditPencil
                            label="Security & Privacy"
                            tagHint={sections.security.headingTag}
                            onClick={() => setEditingSection({ key: 'security', label: 'Security & Private Hubs Section' })}
                        />
                    </div>
                )}
                <div className="space-y-5">
                    <div className="flex items-center gap-3">
                        <ShieldCheck className="h-8 w-8 text-primary" />
                        <SeoHeading tag={sections.security.headingTag} className="text-3xl font-bold font-headline">
                            {sections.security.heading}
                        </SeoHeading>
                    </div>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {sections.security.description}
                    </p>
                    <p className="text-muted-foreground text-sm leading-relaxed">
                        {sections.security.secondaryDescription}
                    </p>
                    <Button asChild size="lg">
                        <Link href="/report-issue?tab=platform&subject=Request%20a%20Private%20Hub">Request a Private Hub</Link>
                    </Button>
                </div>
                <div className="relative w-full h-80 sm:h-96 rounded-2xl overflow-hidden shadow-xl border">
                    <Image 
                        src={sections.security.imageUrl || "/images/about/security.jpg"} 
                        alt={sections.security.imageAlt || "Security and role-based encryption concept"} 
                        title={sections.security.imageTitle}
                        fill 
                        className="object-cover" 
                    />
                </div>
            </section>

            {/* Progressive Web App Installation Guide */}
            <section className={`space-y-8 text-center pt-8 border-t ${sectionBoxClass}`}>
                {canEdit && (
                    <div className="flex justify-end -mb-4">
                        <SeoEditPencil
                            label="Install App"
                            tagHint={sections.installApp.headingTag}
                            onClick={() => setEditingSection({ key: 'installApp', label: 'Install App Section' })}
                        />
                    </div>
                )}
                <div className="flex items-center justify-center gap-4">
                    <Separator className="w-1/4" />
                    <Smartphone className="h-8 w-8 text-primary" />
                    <Separator className="w-1/4" />
                </div>
                <SeoHeading tag={sections.installApp.headingTag} className="text-3xl font-bold font-headline">
                    {sections.installApp.heading}
                </SeoHeading>
                <p className="text-muted-foreground max-w-3xl mx-auto text-sm">
                    {sections.installApp.description}
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
            <section className={`space-y-6 text-center pt-8 border-t ${sectionBoxClass}`}>
                {canEdit && (
                    <div className="flex justify-end -mb-4">
                        <SeoEditPencil
                            label="Direct Shortcuts"
                            tagHint={sections.shortcuts.headingTag}
                            onClick={() => setEditingSection({ key: 'shortcuts', label: 'Direct Action Shortcuts' })}
                        />
                    </div>
                )}
                <div className="flex items-center justify-center gap-4">
                    <Separator className="w-1/4" />
                    <Zap className="h-8 w-8 text-primary" />
                    <Separator className="w-1/4" />
                </div>

                <SeoHeading tag={sections.shortcuts.headingTag} className="text-3xl font-bold font-headline">
                    {sections.shortcuts.heading}
                </SeoHeading>
                <p className="text-sm text-muted-foreground max-w-2xl mx-auto">
                    {sections.shortcuts.description}
                </p>
            </section>

            <div className="text-xs text-muted-foreground pt-8 text-left border-t flex items-center justify-between flex-wrap gap-2">
                <span>Last major update: {meta.lastUpdatedLabel}</span>
                {canEdit && (
                    <SeoEditPencil
                        label="Page Meta & Last Updated"
                        onClick={() => setMetaDialogOpen(true)}
                    />
                )}
            </div>

            {isSeoManager && (
                <>
                    <SeoMetaEditorDialog
                        open={metaDialogOpen}
                        onOpenChange={setMetaDialogOpen}
                        meta={meta}
                        onSaved={(updated) => setSeoData(updated)}
                    />
                    <SeoSectionEditorDialog
                        open={Boolean(editingSection)}
                        onOpenChange={(open) => {
                            if (!open) setEditingSection(null);
                        }}
                        sectionKey={editingSection?.key || null}
                        sectionLabel={editingSection?.label || ''}
                        sectionData={editingSection ? sections[editingSection.key] : null}
                        onSaved={(updated) => setSeoData(updated)}
                    />
                </>
            )}
        </div>
    );
}
