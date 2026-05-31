'use client';

import * as React from 'react';
import { useUser, useDoc, useMemoFirebase, useFirestore } from '@/firebase';
import { doc, collection, getDocs, query, where, documentId, getDoc } from 'firebase/firestore';
import { updateUserCartAction } from '@/lib/actions/userActions';
import { useDebouncedCallback } from 'use-debounce';

// Defines the shape of a product that can be added to the cart
export type Product = {
  id: string;
  name: string;
  price: number;
  image?: string;
  store: string;
  onSale?: boolean;
  discountType?: 'amount' | 'percentage';
  salePrice?: number;
  discountValue?: number;
  businessId: string;
};

// Extends Product with quantity for items within the cart
export type CartItem = Product & {
  quantity: number;
};

// Defines the shape of the context provided to consumers
type CartContextType = {
  cartItems: CartItem[];
  addItem: (product: Product, quantity?: number) => void;
  removeItem: (productId: string) => void;
  updateQuantity: (productId: string, quantity: number) => void;
  clearCart: () => void;
  cartCount: number;
  totalPrice: number;
  totalDeliveryFee: number;
};

// Create the context with an undefined default value
const CartContext = React.createContext<CartContextType | undefined>(undefined);

// CartProvider component to wrap the application and provide cart state
export function CartProvider({ children }: { children: React.ReactNode }) {
  const [cartItems, setCartItems] = React.useState<CartItem[]>([]);
  const { user } = useUser();
  const db = useFirestore();
  const [deliveryCosts, setDeliveryCosts] = React.useState<Record<string, number>>({});
  const [globalCourierFee, setGlobalCourierFee] = React.useState(0);
  const [isCourierInCart, setIsCourierInCart] = React.useState(false);

  const userProfileRef = useMemoFirebase(() => (user ? doc(db, 'users', user.uid) : null), [user, db]);
  const { data: userProfile } = useDoc(userProfileRef);

  // Debounced function to save cart to Firestore
  const debouncedSaveCart = useDebouncedCallback(async (userId: string, newCart: { productId: string; quantity: number, businessId: string }[]) => {
    await updateUserCartAction({ userId, cart: newCart });
  }, 1000); // Save after 1 second of inactivity


  // Effect to load cart from Firestore on user login
  React.useEffect(() => {
    const hydrateCart = async () => {
        if (!db || !userProfile?.cart || userProfile.cart.length === 0) {
            setCartItems([]);
            return;
        }

        const dbCart = userProfile.cart as { productId: string; quantity: number, businessId?: string }[];
        const productIds = dbCart.map(item => item.productId.split('::')[0]);

        if (productIds.length === 0) {
            setCartItems([]);
            return;
        }
        
        try {
            // Fetch all businesses to get their products
            const businessesSnapshot = await getDocs(collection(db, 'businesses'));
            const productPromises: Promise<any[]>[] = [];
            const variationPromises: Promise<any[]>[] = [];

            businessesSnapshot.forEach(businessDoc => {
                const productsRef = collection(db, `businesses/${businessDoc.id}/products`);
                const q = query(productsRef, where(documentId(), 'in', productIds));
                productPromises.push(
                    getDocs(q).then(productSnapshot =>
                        productSnapshot.docs.map(doc => {
                             const productData = { ...doc.data(), id: doc.id, businessName: businessDoc.data().businessName, businessId: businessDoc.id };
                             // If it has variations, we need to fetch that data too
                             if (productData.hasVariations) {
                                const variationsRef = doc.ref.collection('product_data').doc('variations');
                                variationPromises.push(
                                    getDoc(variationsRef).then(varSnap => ({
                                        productId: doc.id,
                                        ...varSnap.data()
                                    }))
                                );
                             }
                             return productData;
                        })
                    )
                );
            });

            const productArrays = await Promise.all(productPromises);
            const variationArrays = await Promise.all(variationPromises);
            const allProducts = productArrays.flat();

            const productsMap = new Map(allProducts.map(p => [p.id, p]));
            const variationsMap = new Map(variationArrays.map(v => [v.productId, v]));

            const hydratedCart: CartItem[] = dbCart
                .map(item => {
                    const idParts = item.productId.split('::');
                    const baseProductId = idParts[0];
                    const productDetails = productsMap.get(baseProductId);
                    if (!productDetails) return null;
                    
                    let finalPrice = productDetails.price;
                    let finalName = productDetails.name;

                    if (productDetails.hasVariations && idParts.length > 1) {
                         const variationData = variationsMap.get(baseProductId);
                         const variantKey = idParts.slice(1).join(' / ');
                         const variantInfo = variationData?.stock?.[variantKey];
                         if (variantInfo) {
                             finalPrice = variantInfo.price || finalPrice;
                             finalName = `${productDetails.name} - ${variantKey}`;
                         }
                    } else if (productDetails.onSale) {
                        if (productDetails.discountType === 'percentage' && productDetails.discountValue) {
                            finalPrice = productDetails.price * (1 - productDetails.discountValue / 100);
                        } else if (productDetails.discountType === 'amount' && productDetails.salePrice) {
                            finalPrice = productDetails.salePrice;
                        }
                    }

                    return {
                        ...productDetails,
                        id: item.productId, // Use the full composite ID
                        name: finalName,
                        price: finalPrice,
                        image: productDetails.images?.[0]?.url,
                        store: productDetails.businessName || 'Local Store',
                        quantity: item.quantity,
                        businessId: productDetails.businessId,
                    };
                })
                .filter((item): item is CartItem => item !== null);

            setCartItems(hydratedCart);

        } catch (error) {
            console.error("Error hydrating cart from Firestore:", error);
            setCartItems([]); // Clear cart on error to prevent inconsistent state
        }
    };

    hydrateCart();
  }, [userProfile?.cart, db]);

  // Effect to save cart to Firestore when it changes
  React.useEffect(() => {
    if (user) {
      const cartToSave = cartItems.map(item => ({ productId: item.id, quantity: item.quantity, businessId: item.businessId }));
      debouncedSaveCart(user.uid, cartToSave);
    }
  }, [cartItems, user, debouncedSaveCart]);

  const uniqueBusinessIds = React.useMemo(() => {
    return [...new Set(cartItems.map(item => item.businessId))];
  }, [cartItems]);

  React.useEffect(() => {
    if (uniqueBusinessIds.length === 0) {
        setDeliveryCosts({});
        setGlobalCourierFee(0);
        setIsCourierInCart(false);
        return;
    }

    const fetchDeliveryCosts = async () => {
        if (!db || !userProfile?.communityId) {
            setDeliveryCosts({});
            setGlobalCourierFee(0);
            setIsCourierInCart(false);
            return;
        }

        // Fetch community fee once
        const communityRef = doc(db, 'communities', userProfile.communityId);
        const communitySnap = await getDoc(communityRef);
        const courierFee = communitySnap.exists() ? (communitySnap.data()?.courierDeliveryFee || 0) : 0;
        setGlobalCourierFee(courierFee);

        let courierInCart = false;
        const newCosts: Record<string, number> = {};
        for (const businessId of uniqueBusinessIds) {
            const businessRef = doc(db, 'businesses', businessId);
            const businessSnap = await getDoc(businessRef);
            if (businessSnap.exists()) {
                const businessData = businessSnap.data();
                const settings = businessData.storeSettings;
                const canAcceptPayments = !!businessData.stripeAccountId;

                // Effective delivery logic
                const deliveryType = canAcceptPayments ? (settings?.deliveryType || 'click_and_collect') : 'click_and_collect';

                if (deliveryType === 'local_courier') {
                    courierInCart = true;
                    newCosts[businessId] = 0; // Handled globally
                } else if (settings?.deliveryAvailable && settings.deliveryType === 'flat_rate' && settings.deliveryPrice > 0) {
                    newCosts[businessId] = settings.deliveryPrice;
                } else {
                    newCosts[businessId] = 0;
                }
            }
        }
        setIsCourierInCart(courierInCart);
        setDeliveryCosts(newCosts);
    };

    fetchDeliveryCosts();
  }, [uniqueBusinessIds, db, userProfile?.communityId]);


  const addItem = React.useCallback((product: Product, quantity = 1) => {
    setCartItems(prevItems => {
        const existingItem = prevItems.find(item => item.id === product.id);

        if (existingItem) {
            return prevItems.map(item =>
                item.id === product.id ? { ...item, quantity: item.quantity + quantity } : item
            );
        } else {
            return [...prevItems, { ...product, quantity }];
        }
    });
  }, []);

  // Function to remove an item from the cart
  const removeItem = React.useCallback((productId: string) => {
    setCartItems(prevItems => prevItems.filter(item => item.id !== productId));
  }, []);

  // Function to update the quantity of an item
  const updateQuantity = React.useCallback((productId: string, quantity: number) => {
    if (quantity < 1) {
      // If quantity is less than 1, remove the item
      removeItem(productId);
      return;
    }
    setCartItems(prevItems =>
      prevItems.map(item =>
        item.id === productId ? { ...item, quantity } : item
      )
    );
  }, [removeItem]);

  // Function to clear the entire cart
  const clearCart = React.useCallback(() => {
    setCartItems([]);
    if (user) {
        // Immediately clear the cart in Firestore, don't wait for debounce
        updateUserCartAction({ userId: user.uid, cart: [] });
    }
  }, [user]);

  // Memoized calculation for the total number of items in the cart
  const cartCount = React.useMemo(() => {
    return cartItems.reduce((count, item) => count + item.quantity, 0);
  }, [cartItems]);

  // Memoized calculation for the total price of all items in the cart
  const totalPrice = React.useMemo(() => {
    return cartItems.reduce((total, item) => total + item.price * item.quantity, 0);
  }, [cartItems]);

  const totalDeliveryFee = React.useMemo(() => {
    const perStoreTotal = Object.values(deliveryCosts).reduce((sum, cost) => sum + cost, 0);
    return perStoreTotal + (isCourierInCart ? globalCourierFee : 0);
  }, [deliveryCosts, isCourierInCart, globalCourierFee]);

  // The value provided to consumers of the context
  const value = React.useMemo(() => ({
    cartItems,
    addItem,
    removeItem,
    updateQuantity,
    clearCart,
    cartCount,
    totalPrice,
    totalDeliveryFee,
  }), [cartItems, addItem, removeItem, updateQuantity, clearCart, cartCount, totalPrice, totalDeliveryFee]);

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

// Custom hook to use the CartContext
export function useCart() {
  const context = React.useContext(CartContext);
  if (context === undefined) {
    throw new Error('useCart must be used within a CartProvider');
  }
  return context;
}
