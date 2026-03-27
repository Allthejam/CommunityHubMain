

'use client';

import * as React from 'react';
import { useUser, useFirestore, useCollection, useMemoFirebase, useDoc } from '@/firebase';
import { collection, query, where, doc } from 'firebase/firestore';
import { Loader2, ArrowUp, Heart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { updateUserBusinessFavouritesAction } from '@/lib/actions/userActions';

const Streetlight = ({ side }: { side: 'left' | 'right' }) => (
    <div className={`streetlight street-asset ${side === 'left' ? 'lamp-left' : 'lamp-right'}`}>
        <svg width="40" height="120" viewBox="0 0 40 120"><rect x="18" y="20" width="4" height="100" fill="#1f2937" /><circle cx="20" cy="15" r="8" fill="#fef08a" /></svg>
    </div>
);

const LondonBus = () => (
     <div className="street-asset hidden md:block" style={{ top: '450px', left: '50%', transform: 'translateX(-50%)' }}>
        <svg width="50" height="100" viewBox="0 0 50 100">
            <rect x="5" y="5" width="40" height="90" rx="5" fill="#c53030" />
            <rect x="8" y="10" width="34" height="15" fill="#bee3f8" rx="2" />
            <rect x="10" y="85" width="30" height="5" fill="#2d3748" />
        </svg>
    </div>
);

const ShopCard = ({ business, side, user, userProfile }: { business: any, side: 'left' | 'right', user: any, userProfile: any }) => {
    const router = useRouter();
    const { toast } = useToast();

    const isFavourited = React.useMemo(() => 
        userProfile?.favouriteBusinesses?.includes(business.id) || false
    , [userProfile, business.id]);

    const handleFavouriteClick = async (e: React.MouseEvent) => {
        e.stopPropagation();
        if (!user) {
            toast({ title: "Please sign in", description: "You need to be logged in to add favourites.", variant: "destructive" });
            return;
        }

        const result = await updateUserBusinessFavouritesAction({
            userId: user.uid,
            businessId: business.id,
            isFavourited: isFavourited,
        });

        if (result.success) {
            toast({
                title: isFavourited ? "Removed from Favourites" : "Added to Favourites",
            });
        } else {
            toast({ title: "Error", description: result.error, variant: "destructive" });
        }
    };
    
    const canAcceptPayments = !!business.stripeAccountId;


    return (
        <div className="shop-card">
            {user && (
                <Button 
                    variant="ghost" 
                    size="icon" 
                    className="absolute top-2 right-2 h-8 w-8 z-40 bg-white/50 backdrop-blur-sm hover:bg-white/70"
                    onClick={handleFavouriteClick}
                >
                    <Heart className={cn("h-5 w-5 text-red-500", isFavourited && "fill-current")} />
                </Button>
            )}
            <Streetlight side={side} />
            <div className="shop-header">
                <div className="shop-logo">
                    {business.logoImage ? <Image src={business.logoImage} alt={`${business.businessName} logo`} width={50} height={50} className="object-contain" /> : business.businessName.charAt(0)}
                </div>
                <h3 className="font-bold text-lg">{business.businessName}</h3>
            </div>
            <hr className="divider-line" />
            <div className="shop-content">
                <p className="text-sm text-gray-600 line-clamp-3">{business.shortDescription}</p>
                <Button 
                    onClick={() => canAcceptPayments && router.push(`/shopping/store/${business.id}`)} 
                    className="enter-btn"
                    disabled={!canAcceptPayments}
                >
                    {canAcceptPayments ? 'Enter Store' : 'Not Accepting Payments'}
                </Button>
            </div>
        </div>
    );
};


const AnimatedTraffic = () => {
    // We will render a few purely CSS animated cars going down the central road lane.
    return (
        <div className="traffic-lane">
            <div className="vehicle car-1">
                <svg width="24" height="42" viewBox="0 0 24 42" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="20" height="38" rx="4" fill="#3182CE"/>
                    <rect x="4" y="10" width="16" height="8" rx="1" fill="#1A202C" opacity="0.6"/>
                    <rect x="4" y="26" width="16" height="8" rx="1" fill="#1A202C" opacity="0.6"/>
                    <rect x="4" y="2" width="4" height="3" fill="#FBD38D"/>
                    <rect x="16" y="2" width="4" height="3" fill="#FBD38D"/>
                </svg>
            </div>
            <div className="vehicle car-2 hidden md:block">
                <svg width="24" height="46" viewBox="0 0 24 46" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="20" height="42" rx="4" fill="#E53E3E"/>
                    <rect x="4" y="10" width="16" height="10" rx="1" fill="#1A202C" opacity="0.6"/>
                    <rect x="4" y="26" width="16" height="12" rx="1" fill="#1A202C" opacity="0.6"/>
                    <rect x="4" y="2" width="4" height="3" fill="#FBD38D"/>
                    <rect x="16" y="2" width="4" height="3" fill="#FBD38D"/>
                </svg>
            </div>
            <div className="vehicle car-3">
                <svg width="24" height="40" viewBox="0 0 24 40" fill="none" xmlns="http://www.w3.org/2000/svg">
                    <rect x="2" y="2" width="20" height="36" rx="4" fill="#38A169"/>
                    <rect x="4" y="8" width="16" height="8" rx="1" fill="#1A202C" opacity="0.6"/>
                    <rect x="4" y="24" width="16" height="8" rx="1" fill="#1A202C" opacity="0.6"/>
                    <rect x="3" y="2" width="5" height="4" fill="#FBD38D"/>
                    <rect x="16" y="2" width="5" height="4" fill="#FBD38D"/>
                </svg>
            </div>
        </div>
    );
};

const AnimatedPedestrians = () => {
    return (
        <div className="pedestrian-lane">
            <div className="pedestrian p-1"><div className="head"></div><div className="body"></div></div>
            <div className="pedestrian p-2"><div className="head"></div><div className="body"></div></div>
            <div className="pedestrian p-3 hidden md:block"><div className="head"></div><div className="body"></div></div>
            <div className="pedestrian p-4"><div className="head"></div><div className="body"></div></div>
            <div className="pedestrian p-5 hidden md:block"><div className="head"></div><div className="body"></div></div>
        </div>
    );
};

function HighstreetContent() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    
    const [showBackToTop, setShowBackToTop] = React.useState(false);
    const [hasMounted, setHasMounted] = React.useState(false);

    React.useEffect(() => {
        setHasMounted(true);
    }, []);

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const communityProfileRef = useMemoFirebase(() => {
        if (!userProfile?.communityId || !db) return null;
        return doc(db, 'community_profiles', userProfile.communityId);
    }, [db, userProfile?.communityId]);
    const { data: communityProfile, isLoading: communityProfileLoading } = useDoc(communityProfileRef);

    const businessesQuery = useMemoFirebase(() => {
        if (!userProfile?.communityId || !db) return null;
        return query(
            collection(db, "businesses"),
            where("primaryCommunityId", "==", userProfile.communityId),
            where("storefrontSubscription", "==", true),
            where("status", "in", ["Approved", "Subscribed"])
        );
    }, [db, userProfile?.communityId]);
    
    const { data: businesses, isLoading: businessesLoading } = useCollection<any>(businessesQuery);
    
    const loading = isUserLoading || profileLoading || businessesLoading || communityProfileLoading;

    const effect = communityProfile?.highstreetEffect || 'none';
    const lighting = communityProfile?.highstreetLighting || 'auto';
    
    const [isNight, setIsNight] = React.useState(false);

    React.useEffect(() => {
        if (lighting === 'night') {
            setIsNight(true);
        } else if (lighting === 'day') {
            setIsNight(false);
        } else {
            const hour = new Date().getHours();
            setIsNight(hour < 6 || hour >= 18);
        }
    }, [lighting]);

    // Snowflake and falling effects generator
    React.useEffect(() => {
        const fxContainer = document.getElementById('highstreet-fx');
        if (!fxContainer) return;

        while (fxContainer.firstChild) {
            fxContainer.removeChild(fxContainer.firstChild);
        }

        if (effect === 'none') return;

        const count = effect === 'snow' ? 50 : 30; // Fewer items for leaf/pumpkin
        
        for (let i = 0; i < count; i++) {
            const el = document.createElement('div');
            el.className = 'fx-particle';
            
            if (effect === 'halloween') {
                el.innerText = '🎃';
                el.style.fontSize = Math.random() * 10 + 10 + 'px';
            } else if (effect === 'summer') {
                el.innerText = '☀️';
                el.style.fontSize = Math.random() * 8 + 10 + 'px';
                el.style.opacity = '0.4';
            } else {
                // Snow
                el.style.background = 'white';
                const size = Math.random() * 5 + 2 + 'px';
                el.style.width = size;
                el.style.height = size;
                el.style.borderRadius = '50%';
                el.style.opacity = '0.8';
            }

            el.style.left = Math.random() * 100 + 'vw';
            el.style.animationDuration = Math.random() * (effect === 'snow' ? 3 : 5) + 2 + 's';
            el.style.animationDelay = Math.random() * 5 + 's';
            fxContainer.appendChild(el);
        }
    }, [effect]);

    // Scroll to top button effect
    React.useEffect(() => {
        const handleScroll = () => {
            if (window.scrollY > 300) {
                setShowBackToTop(true);
            } else {
                setShowBackToTop(false);
            }
        };
        window.addEventListener('scroll', handleScroll);
        return () => window.removeEventListener('scroll', handleScroll);
    }, []);

    const scrollToTop = () => {
        window.scrollTo({ top: 0, behavior: 'smooth' });
    };
    
    const leftSideBusinesses = businesses?.filter((_, index) => index % 2 === 0) || [];
    const rightSideBusinesses = businesses?.filter((_, index) => index % 2 !== 0) || [];

    if (!hasMounted) {
        return (
            <div className="flex justify-center items-center h-screen bg-gray-100">
                <Loader2 className="animate-spin h-12 w-12 text-primary" />
            </div>
        );
    }

    return (
        <>
            <style jsx global>{`
                .highstreet-page-wrapper {
                    background-color: #f3f4f6;
                    margin: 0;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    overflow-x: hidden;
                    position: relative;
                    z-index: 1;
                }

                .highstreet-page-wrapper .fx-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 10;
                }

                .highstreet-page-wrapper .fx-particle {
                    position: absolute;
                    top: -20px;
                    animation: fall linear infinite;
                    pointer-events: none;
                }

                @keyframes fall {
                    0% { transform: translateY(0) rotate(0deg); }
                    100% { transform: translateY(100vh) rotate(360deg); }
                }

                .highstreet-page-wrapper .highstreet-container {
                    position: relative;
                    width: 100%;
                    min-height: 100vh; 
                    display: flex;
                    justify-content: center;
                }

                @media (min-width: 768px) {
                    .highstreet-page-wrapper .highstreet-container.theme-day {
                        background-color: #9ca3af; 
                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='340' height='800' viewBox='0 0 340 800'%3E%3Crect x='70' y='0' width='200' height='800' fill='%232d3748'/%3E%3Cline x1='170' y1='20' x2='170' y2='780' stroke='%23fde047' stroke-width='4' stroke-dasharray='40,60'/%3E%3Ctext x='185' y='180' fill='%23fde047' font-family='Arial, sans-serif' font-weight='bold' font-size='16' transform='rotate(90, 185, 180)' opacity='0.7'%3EBUS STOP%3C/text%3E%3Crect x='172' y='50' width='90' height='300' fill='none' stroke='%23fde047' stroke-width='2' opacity='0.5'/%3E%3Crect x='0' y='0' width='70' height='798' fill='%23edf2f7'/%3E%3Crect x='270' y='0' width='70' height='798' fill='%23edf2f7'/%3E%3Cline x1='70' y1='0' x2='70' y2='800' stroke='%23a0aec0' stroke-width='2'/%3E%3Cline x1='270' y1='0' x2='270' y2='800' stroke='%23a0aec0' stroke-width='2'/%3E%3C/svg%3E");
                        background-repeat: repeat-y;
                        background-position: center top;
                        transition: background-color 1s ease;
                    }

                    .highstreet-page-wrapper .highstreet-container.theme-night {
                        background-color: #1a202c; /* darker background color for night */
                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='340' height='800' viewBox='0 0 340 800'%3E%3Crect x='70' y='0' width='200' height='800' fill='%231f2937'/%3E%3Cline x1='170' y1='20' x2='170' y2='780' stroke='%23d97706' stroke-width='4' stroke-dasharray='40,60'/%3E%3Ctext x='185' y='180' fill='%23d97706' font-family='Arial, sans-serif' font-weight='bold' font-size='16' transform='rotate(90, 185, 180)' opacity='0.3'%3EBUS STOP%3C/text%3E%3Crect x='172' y='50' width='90' height='300' fill='none' stroke='%23d97706' stroke-width='2' opacity='0.2'/%3E%3Crect x='0' y='0' width='70' height='798' fill='%23374151'/%3E%3Crect x='270' y='0' width='70' height='798' fill='%23374151'/%3E%3Cline x1='70' y1='0' x2='70' y2='800' stroke='%234b5563' stroke-width='2'/%3E%3Cline x1='270' y1='0' x2='270' y2='800' stroke='%234b5563' stroke-width='2'/%3E%3C/svg%3E");
                        background-repeat: repeat-y;
                        background-position: center top;
                        transition: background-color 1s ease;
                    }
                }

                @media (max-width: 767px) {
                    .highstreet-page-wrapper .highstreet-container { background-color: #f3f4f6; background-image: none; }
                    .highstreet-page-wrapper .highstreet-container.theme-night { background-color: #1f2937; }
                    .highstreet-page-wrapper .street-asset { display: none !important; }
                }

                .highstreet-page-wrapper .street-asset { position: absolute; z-index: 7; pointer-events: none; }

                .highstreet-page-wrapper .shops-grid {
                    display: grid;
                    width: 100%;
                    max-width: 1100px; 
                    z-index: 5;
                    padding: 50px 20px 150px 20px;
                    grid-template-columns: 1fr; 
                }

                @media (min-width: 768px) {
                    .highstreet-page-wrapper .shops-grid { grid-template-columns: 1fr 340px 1fr; }
                    .highstreet-page-wrapper .side-left { align-items: flex-end; padding-top: 50px; }
                    .highstreet-page-wrapper .side-right { align-items: flex-start; padding-top: 50px; }
                }

                .highstreet-page-wrapper .shop-side { display: flex; flex-direction: column; position: relative; gap: 60px; }

                @media (max-width: 767px) {
                    .highstreet-page-wrapper .shop-side { align-items: center; gap: 40px; }
                    .highstreet-page-wrapper .central-road-gap { display: none; }
                }

                .highstreet-page-wrapper .shop-card {
                    background: white;
                    border-radius: 8px; 
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    border: 1px solid #cbd5e0;
                    width: 100%;
                    max-width: 320px;
                    position: relative;
                    z-index: 15;
                    transition: transform 0.3s ease, background-color 0.5s ease;
                    overflow: hidden;
                }

                .highstreet-page-wrapper.wrapper-night .shop-card {
                    background: #111827;
                    border-color: #374151;
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.5);
                    color: #fff;
                }

                .highstreet-page-wrapper.wrapper-night .streetlight .glow-pool { opacity: 1; }

                /* Animated Traffic */
                .highstreet-page-wrapper .traffic-lane {
                    position: absolute;
                    top: 0; left: 0; width: 100%; height: 100%;
                    overflow: hidden; pointer-events: none; z-index: 2;
                }
                .highstreet-page-wrapper .vehicle { position: absolute; left: calc(50% - 12px); top: -100px; }
                .highstreet-page-wrapper .car-1 { animation: drive-down 12s linear infinite; animation-delay: 2s; }
                .highstreet-page-wrapper .car-2 { animation: drive-down 18s linear infinite; animation-delay: 8s; margin-left: -40px; }
                .highstreet-page-wrapper .car-3 { animation: drive-down 15s linear infinite; animation-delay: 15s; margin-left: 40px; }
                
                @keyframes drive-down {
                    0% { top: -100px; }
                    100% { top: 100%; }
                }

                /* Animated Pedestrians */
                .highstreet-page-wrapper .pedestrian-lane {
                    position: absolute; top: 0; left: 0; width: 100%; height: 100%;
                    overflow: hidden; pointer-events: none; z-index: 4;
                }
                .highstreet-page-wrapper .pedestrian { position: absolute; }
                .highstreet-page-wrapper .pedestrian .head { width: 8px; height: 8px; background: #4a5568; border-radius: 50%; margin: 0 auto; }
                .highstreet-page-wrapper .pedestrian .body { width: 14px; height: 10px; background: #2d3748; border-radius: 4px; margin-top: 2px; }
                
                .highstreet-page-wrapper.wrapper-night .pedestrian .head, .highstreet-page-wrapper.wrapper-night .pedestrian .body { background: #1a202c; opacity: 0.5; }

                .highstreet-page-wrapper .p-1 { left: calc(50% - 90px); animation: walk-down 30s linear infinite; animation-delay: 0s; }
                .highstreet-page-wrapper .p-2 { left: calc(50% + 75px); animation: walk-up 40s linear infinite; animation-delay: 5s; }
                .highstreet-page-wrapper .p-3 { left: calc(50% - 110px); animation: walk-down 35s linear infinite; animation-delay: 15s; }
                .highstreet-page-wrapper .p-4 { left: calc(50% + 95px); animation: walk-up 45s linear infinite; animation-delay: 12s; }
                .highstreet-page-wrapper .p-5 { left: calc(50% - 80px); animation: walk-down 25s linear infinite; animation-delay: 22s; }

                @keyframes walk-down {
                    0% { top: -50px; }
                    100% { top: 100%; }
                }
                @keyframes walk-up {
                    0% { top: 100%; }
                    100% { top: -50px; }
                }

                .highstreet-page-wrapper .shop-card:hover { transform: translateY(-8px); }
                .highstreet-page-wrapper .shop-header { padding: 20px 20px 10px 20px; display: flex; align-items: center; gap: 15px; }
                .highstreet-page-wrapper .shop-logo { width: 50px; height: 50px; background: #f7fafc; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; font-size: 24px; position: relative; z-index: 16;}
                .highstreet-page-wrapper .shop-content { padding: 0 20px 20px 20px; }
                .highstreet-page-wrapper .enter-btn { display: block; width: 100%; background: #2d3748; color: white; text-align: center; padding: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 15px; }
                .highstreet-page-wrapper .enter-btn:hover { background: #1a202c; }
                .highstreet-page-wrapper .enter-btn:disabled { background: #9ca3af; cursor: not-allowed; }

                .highstreet-page-wrapper .divider-line {
                    border: none; 
                    height: 1px; 
                    background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(150, 150, 150, 0.75), rgba(0, 0, 0, 0));
                    margin: 10px 0;
                }

                .highstreet-page-wrapper .streetlight { position: absolute; width: 40px; height: 120px; z-index: 12; top: -40px; }
                .highstreet-page-wrapper .lamp-left { right: -25px; }
                .highstreet-page-wrapper .lamp-right { left: -25px; }
            `}</style>
            <div className={`highstreet-page-wrapper ${isNight ? 'wrapper-night' : ''}`}>
                <div className="fx-container" id="highstreet-fx"></div>

                <div className={`highstreet-container ${isNight ? 'theme-night' : 'theme-day'}`}>
                    <LondonBus />
                    <AnimatedTraffic />
                    <AnimatedPedestrians />
                    {loading ? (
                        <div className="flex justify-center items-center h-screen">
                            <Loader2 className="animate-spin h-12 w-12 text-white z-50" />
                        </div>
                    ) : (
                        <div className="shops-grid">
                            <div className="shop-side side-left">
                                {leftSideBusinesses.map((biz) => (
                                    <ShopCard key={biz.id} business={biz} side="left" user={user} userProfile={userProfile} />
                                ))}
                            </div>
                            <div className="central-road-gap"></div>
                            <div className="shop-side side-right">
                                {rightSideBusinesses.map((biz) => (
                                    <ShopCard key={biz.id} business={biz} side="right" user={user} userProfile={userProfile} />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {showBackToTop && (
                    <Button 
                        onClick={scrollToTop}
                        className="fixed bottom-8 right-8 h-12 w-12 rounded-full shadow-lg z-50"
                        size="icon"
                    >
                        <ArrowUp className="h-6 w-6" />
                    </Button>
                )}
            </div>
        </>
    );
}



export default function HighstreetPage() {
    return (
        <HighstreetContent />
    );
}
