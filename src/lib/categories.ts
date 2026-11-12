export const businessCategories = [
    { value: 'accounting', label: 'Accounting' },
    { value: 'automotive', label: 'Automotive' },
    { value: 'beauty-salon', label: 'Beauty Salon' },
    { value: 'bike-shop', label: 'Bike Shop' },
    { value: 'bookstore', label: 'Bookstore' },
    { value: 'cafes', label: 'Cafes'},
    { value: 'charity', label: 'Charity' },
    { value: 'clothing', label: 'Clothing' },
    { value: 'community-group', label: 'Community Group' },
    { value: 'courier', label: 'Courier' },
    { value: 'electronics', label: 'Electronics' },
    { value: 'entertainment', label: 'Entertainment' },
    { value: 'fitness', label: 'Fitness' },
    { value: 'florist', label: 'Florist' },
    { value: 'food', label: 'Food & Drink' },
    { value: 'furniture', label: 'Furniture' },
    { value: 'housing-association', label: 'Housing Association' },
    { value: 'jewellery', label: 'Jewellery' },
    { value: 'music-store', label: 'Music Store' },
    { value: 'optician', label: 'Optician' },
    { value: 'outdoors', label: 'Outdoors' },
    { value: 'pet-services', label: 'Pet Services' },
    { value: 'photography', label: 'Photography' },
    { value: 'professional-services', label: 'Professional Services' },
    { value: 'restaurants', label: 'Restaurants'},
    { value: 'shopping', label: 'Shopping' },
    { value: 'shoe-store', label: 'Shoe Store' },
    { value: 'stationery', label: 'Stationery' },
    { value: 'toys-hobbies', label: 'Toys & Hobbies' },
    { value: 'other', label: 'Other' },
];

export const accommodationCategories = [
    { value: 'Stays & Lodging', label: 'Stays & Lodging' },
    { value: 'stays-lodging', label: 'Stays & Lodging' },
    { value: 'hotel', label: 'Hotel' },
    { value: 'guest-house', label: 'Guest House' },
    { value: 'b-and-b', label: 'B&B' },
    { value: 'holiday-home', label: 'Holiday Home' },
    { value: 'caravan-park', label: 'Caravan Park' },
    { value: 'camping-site', label: 'Camping Site' },
    { value: 'glamping', label: 'Glamping' },
    { value: 'short-stay', label: 'Short Stay' },
    { value: 'airbnb', label: 'Airbnb' },
    { value: 'accommodation', label: 'Accommodation' },
    { value: 'other-stay', label: 'Other Stays' },
];

export const isAccommodationCategory = (category?: string | null): boolean => {
    if (!category) return false;
    const lower = category.toLowerCase().trim();
    return (
        lower.includes('stay') ||
        lower.includes('lodg') ||
        lower.includes('hotel') ||
        lower.includes('b&b') ||
        lower.includes('b-and-b') ||
        lower.includes('guest') ||
        lower.includes('campsite') ||
        lower.includes('camping') ||
        lower.includes('caravan') ||
        lower.includes('glamping') ||
        lower.includes('holiday') ||
        lower.includes('airbnb') ||
        lower.includes('accommodation') ||
        accommodationCategories.some(c => c.value.toLowerCase() === lower || c.label.toLowerCase() === lower)
    );
};
