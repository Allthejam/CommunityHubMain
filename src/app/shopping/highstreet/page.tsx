
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
    
    // Enforcement Logic: If no Stripe, the effective delivery type is always Click and Collect
    const canAcceptPayments = !!business.stripeAccountId;
    const deliveryType = canAcceptPayments 
        ? (business.storeSettings?.deliveryType || 'click_and_collect') 
        : 'click_and_collect';

    let deliveryLabel = "In Store Only / Click and Collect";
    if (deliveryType === 'shop_delivery') deliveryLabel = "Shop Delivery / Free Delivery";
    else if (deliveryType === 'local_courier') deliveryLabel = "Local Courier Available";

    const isCourier = business.accountType === 'courier';

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
            <div className="shop-content text-center pb-6">
                <p className="text-sm text-gray-600 line-clamp-3 px-4">{business.shortDescription}</p>
                <div className="px-4">
                    <Button 
                        onClick={() => router.push(`/shopping/store/${business.id}`)} 
                        className="enter-btn"
                    >
                        Enter Store
                    </Button>
                </div>
                {!isCourier && (
                    <p className="text-[10px] font-bold text-slate-400 mt-4 px-4 uppercase tracking-wider leading-tight">
                        {deliveryLabel}
                    </p>
                )}
            </div>
        </div>
    );
};


function HighstreetContent() {
    const { user, isUserLoading } = useUser();
    const db = useFirestore();
    const [activeCommunityId, setActiveCommunityId] = React.useState<string | null>(null);
    
    const [showBackToTop, setShowBackToTop] = React.useState(false);

    const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    React.useEffect(() => {
        if (profileLoading) return;
        const visitedId = sessionStorage.getItem('visitedCommunityId');
        if (visitedId) {
          setActiveCommunityId(visitedId);
        } else if (userProfile?.communityId) {
          setActiveCommunityId(userProfile.communityId);
        } else {
          setActiveCommunityId(null);
        }
      }, [userProfile, profileLoading]);

    const businessesQuery = useMemoFirebase(() => {
        if (!activeCommunityId || !db) return null;
        return query(
            collection(db, "businesses"),
            where("primaryCommunityId", "==", activeCommunityId),
            where("storefrontSubscription", "==", true),
            where("status", "in", ["Approved", "Subscribed"])
        );
    }, [db, activeCommunityId]);
    
    const { data: businesses, isLoading: businessesLoading } = useCollection<any>(businessesQuery);
    
    const loading = isUserLoading || profileLoading || businessesLoading;

    // Snowflake generation effect
    React.useEffect(() => {
        const snowContainer = document.getElementById('snow');
        if (!snowContainer) return;

        while (snowContainer.firstChild) {
            snowContainer.removeChild(snowContainer.firstChild);
        }

        const flakeCount = 50;
        for (let i = 0; i < flakeCount; i++) {
            const flake = document.createElement('div');
            flake.className = 'snowflake';
            const size = Math.random() * 5 + 2 + 'px';
            flake.style.width = size;
            flake.style.height = size;
            flake.style.left = Math.random() * 100 + 'vw';
            flake.style.animationDuration = Math.random() * 3 + 2 + 's';
            flake.style.animationDelay = Math.random() * 5 + 's';
            snowContainer.appendChild(flake);
        }
    }, []);

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

    return (
        <>
            <style jsx global>{`
                .highstreet-page-wrapper {
                    background-color: #f3f4f6;
                    margin: 0;
                    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
                    overflow-x: hidden;
                }

                .snow-container {
                    position: fixed;
                    top: 0;
                    left: 0;
                    width: 100%;
                    height: 100%;
                    pointer-events: none;
                    z-index: 50;
                }

                .snowflake {
                    position: absolute;
                    top: -10px;
                    background: white;
                    border-radius: 50%;
                    opacity: 0.8;
                    animation: fall linear infinite;
                }

                @keyframes fall {
                    0% { transform: translateY(0) rotate(0deg); }
                    100% { transform: translateY(100vh) rotate(360deg); }
                }

                .highstreet-container {
                    position: relative;
                    width: 100%;
                    min-height: 100vh; 
                    display: flex;
                    justify-content: center;
                }

                @media (min-width: 768px) {
                    .highstreet-container {
                        background-color: #9ca3af; 
                        background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='340' height='800' viewBox='0 0 340 800'%3E%3Crect x='70' y='0' width='200' height='800' fill='%232d3748'/%3E%3Cline x1='170' y1='20' x2='170' y2='780' stroke='%23fde047' stroke-width='4' stroke-dasharray='40,60'/%3E%3Ctext x='185' y='180' fill='%23fde047' font-family='Arial, sans-serif' font-weight='bold' font-size='16' transform='rotate(90, 185, 180)' opacity='0.7'%3EBUS STOP%3C/text%3E%3Crect x='172' y='50' width='90' height='300' fill='none' stroke='%23fde047' stroke-width='2' opacity='0.5'/%3E%3Crect x='0' y='0' width='70' height='798' fill='%23edf2f7'/%3E%3Crect x='270' y='0' width='70' height='798' fill='%23edf2f7'/%3E%3Cline x1='70' y1='0' x2='70' y2='800' stroke='%23a0aec0' stroke-width='2'/%3E%3Cline x1='270' y1='0' x2='270' y2='800' stroke='%23a0aec0' stroke-width='2'/%3E%3C/svg%3E");
                        background-repeat: repeat-y;
                        background-position: center top;
                    }
                }

                @media (max-width: 767px) {
                    .highstreet-container { background-color: #f3f4f6; background-image: none; }
                    .street-asset { display: none !important; }
                }

                .street-asset { position: absolute; z-index: 22; pointer-events: none; }

                .shops-grid {
                    display: grid;
                    width: 100%;
                    max-width: 1100px; 
                    z-index: 20;
                    padding: 50px 20px 150px 20px;
                    grid-template-columns: 1fr; 
                }

                @media (min-width: 768px) {
                    .shops-grid { grid-template-columns: 1fr 340px 1fr; }
                    .side-left { align-items: flex-end; padding-top: 50px; }
                    .side-right { align-items: flex-start; padding-top: 50px; }
                }

                .shop-side { display: flex; flex-direction: column; position: relative; gap: 60px; }

                @media (max-width: 767px) {
                    .shop-side { align-items: center; gap: 40px; }
                    .central-road-gap { display: none; }
                }

                .shop-card {
                    background: white;
                    border-radius: 8px; 
                    box-shadow: 0 10px 15px -3px rgba(0, 0, 0, 0.1);
                    border: 1px solid #cbd5e0;
                    width: 100%;
                    max-width: 320px;
                    position: relative;
                    z-index: 30;
                    transition: transform 0.3s ease;
                    overflow: hidden;
                }

                .shop-card:hover { transform: translateY(-8px); }
                .shop-header { padding: 20px 20px 10px 20px; display: flex; align-items: center; gap: 15px; }
                .shop-logo { width: 50px; height: 50px; background: #f7fafc; border-radius: 50%; display: flex; align-items: center; justify-content: center; border: 1px solid #e2e8f0; font-size: 24px; }
                .shop-content { padding: 0 0px 20px 0px; }
                .enter-btn { display: block; width: 100%; background: #2d3748; color: white; text-align: center; padding: 12px; font-weight: 600; text-transform: uppercase; letter-spacing: 0.05em; margin-top: 15px; }
                .enter-btn:hover { background: #1a202c; }
                .enter-btn:disabled { background: #9ca3af; cursor: not-allowed; }

                .divider-line {
                    border: none; 
                    height: 1px; 
                    background-image: linear-gradient(to right, rgba(0, 0, 0, 0), rgba(150, 150, 150, 0.75), rgba(0, 0, 0, 0));
                    margin: 10px 0;
                }

                .streetlight { position: absolute; width: 40px; height: 120px; z-index: 25; top: -40px; }
                .lamp-left { right: -25px; }
                .lamp-right { left: -25px; }
            `}</style>
            <div className="highstreet-page-wrapper">
                <div className="snow-container" id="snow"></div>

                <div className="highstreet-container">
                    <LondonBus />
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
                        className="fixed bottom-8 right-8 h-12 w-12 rounded-full shadow-lg z-50 transition-opacity"
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
