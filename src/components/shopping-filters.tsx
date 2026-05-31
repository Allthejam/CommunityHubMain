'use client';

import * as React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from "./ui/card";
import { Label } from "./ui/label";
import { RadioGroup, RadioGroupItem } from "./ui/radio-group";
import { Separator } from "./ui/separator";
import { Button } from './ui/button';
import { FilterX } from 'lucide-react';

export type ShoppingFiltersState = {
  deals: string;
  delivery: string;
  price: string;
  availability: string;
};

interface ShoppingFiltersProps {
    filters: ShoppingFiltersState;
    onFilterChange: <K extends keyof ShoppingFiltersState>(key: K, value: ShoppingFiltersState[K]) => void;
    onReset: () => void;
    className?: string;
}

export function ShoppingFilters({ filters, onFilterChange, onReset, className }: ShoppingFiltersProps) {
    if (!filters) return null;
    const isFiltered = filters.deals !== 'all-deals' || filters.delivery !== 'all' || filters.price !== 'all-price' || filters.availability !== 'in-stock';
    
    return (
        <Card className={className}>
            <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Filter Products</CardTitle>
                {isFiltered && (
                    <Button variant="ghost" size="sm" onClick={onReset}>
                        Reset <FilterX className="ml-2 h-4 w-4" />
                    </Button>
                )}
            </CardHeader>
            <CardContent className="space-y-6">
                <div className="space-y-3">
                    <Label className="font-semibold">Deals & Discounts</Label>
                    <RadioGroup value={filters.deals} onValueChange={(value) => onFilterChange('deals', value)} className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all-deals" id="all-deals" />
                            <Label htmlFor="all-deals" className="font-normal">All</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all-discounts" id="all-discounts" />
                            <Label htmlFor="all-discounts" className="font-normal">All Discounts</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="todays-deals" id="todays-deals" />
                            <Label htmlFor="todays-deals" className="font-normal">Today's Deals</Label>
                        </div>
                    </RadioGroup>
                </div>
                <Separator />
                 <div className="space-y-3">
                    <Label className="font-semibold">Delivery options</Label>
                    <RadioGroup value={filters.delivery} onValueChange={(value) => onFilterChange('delivery', value)} className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all" id="all" />
                            <Label htmlFor="all" className="font-normal">All</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="offers-delivery" id="offers-delivery" />
                            <Label htmlFor="offers-delivery" className="font-normal">Offers delivery</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="instore_only" id="instore_only" />
                            <Label htmlFor="instore_only" className="font-normal">In-Store Only</Label>
                        </div>
                    </RadioGroup>
                </div>
                <Separator />
                <div className="space-y-3">
                    <Label className="font-semibold">Price</Label>
                    <RadioGroup value={filters.price} onValueChange={(value) => onFilterChange('price', value)} className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all-price" id="all-price" />
                            <Label htmlFor="all-price" className="font-normal">All</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="under-25" id="under-25" />
                            <Label htmlFor="under-25" className="font-normal">Under £25</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="under-50" id="under-50" />
                            <Label htmlFor="under-50" className="font-normal">Under £50</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="under-100" id="under-100" />
                            <Label htmlFor="under-100" className="font-normal">Under £100</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="under-200" id="under-200" />
                            <Label htmlFor="under-200" className="font-normal">Under £200</Label>
                        </div>
                    </RadioGroup>
                </div>
                 <Separator />
                 <div className="space-y-3">
                    <Label className="font-semibold">Availability</Label>
                    <RadioGroup value={filters.availability} onValueChange={(value) => onFilterChange('availability', value)} className="space-y-2">
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="all-stock" id="all-stock" />
                            <Label htmlFor="all-stock" className="font-normal">All</Label>
                        </div>
                        <div className="flex items-center space-x-2">
                            <RadioGroupItem value="in-stock" id="in-stock" />
                            <Label htmlFor="in-stock" className="font-normal">In Stock Only</Label>
                        </div>
                         <div className="flex items-center space-x-2">
                            <RadioGroupItem value="include-out-of-stock" id="include-out-of-stock" />
                            <Label htmlFor="include-out-of-stock" className="font-normal">Include Out of Stock</Label>
                        </div>
                    </RadioGroup>
                </div>
            </CardContent>
        </Card>
    )
}