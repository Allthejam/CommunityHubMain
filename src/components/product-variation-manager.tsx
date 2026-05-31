'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Plus, Trash2 } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { getCombinations } from '@/lib/utils';


export type VariationOption = {
  name: string;
  values: string[];
};

export type ProductConfig = VariationOption[];

export type StockData = {
    [key: string]: { price?: number; stock?: number };
};

interface ProductVariationManagerProps {
  config: ProductConfig;
  stock: StockData;
  onConfigChange: (newConfig: ProductConfig) => void;
  onStockChange: (newStock: StockData) => void;
}

const generateVariantKey = (parts: string[]) => parts.join(' / ');

export function ProductVariationManager({
  config,
  stock,
  onConfigChange,
  onStockChange,
}: ProductVariationManagerProps) {
  
  const safeConfig = Array.isArray(config) ? config : [];

  const handleOptionNameChange = (index: number, name: string) => {
    const newConfig = [...safeConfig];
    if (newConfig[index]) {
      newConfig[index].name = name;
    }
    onConfigChange(newConfig);
  };
  
  const handleOptionValuesChange = (index: number, valuesString: string) => {
    const newConfig = [...safeConfig];
    if (newConfig[index]) {
      // Ensure values are always stored as an array of strings
      newConfig[index].values = valuesString.split(',').map(v => v.trim());
    }
    onConfigChange(newConfig);
  };

  const addOption = () => {
    if (safeConfig.length < 3) {
      onConfigChange([...safeConfig, { name: `Option ${safeConfig.length + 1}`, values: [] }]);
    }
  };

  const removeOption = (index: number) => {
    const newConfig = safeConfig.filter((_, i) => i !== index);
    onConfigChange(newConfig);
  };

  const allCombinations = React.useMemo(() => {
    // Defensively check if safeConfig is an array and if its items are valid
    if (!Array.isArray(safeConfig) || safeConfig.length === 0 || safeConfig.every(c => !c.values || !Array.isArray(c.values) || c.values.every(v => v.trim() === ''))) return [];
    
    // Ensure that c.values is an array before trying to map over it
    const valueArrays = safeConfig.map(c => 
      Array.isArray(c.values) ? c.values.map(v => v.trim()).filter(Boolean) : []
    );
    
    const nonEmptyValueArrays = valueArrays.filter(arr => arr.length > 0);

    if (nonEmptyValueArrays.length === 0) return [];

    return getCombinations(nonEmptyValueArrays);

  }, [safeConfig]);

  const handleStockValueChange = (key: string, field: 'price' | 'stock', value: string) => {
    const numericValue = parseFloat(value);
    if (isNaN(numericValue) && value !== '') return;

    const newStock = JSON.parse(JSON.stringify(stock || {}));
    if (!newStock[key]) newStock[key] = {};
    newStock[key][field] = value === '' ? undefined : numericValue;
    onStockChange(newStock);
  };
  
  return (
    <Card>
      <CardHeader>
        <CardTitle>Product Variations</CardTitle>
        <CardDescription>
          Define up to 3 options for your product. Use comma-separated values for options (e.g., Small, Medium, Large). If you require more please setup a new product.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="setup">
          <TabsList className="grid w-full grid-cols-3">
            <TabsTrigger value="setup">Setup Options</TabsTrigger>
            <TabsTrigger value="variants" disabled={allCombinations.length === 0}>Manage Variants</TabsTrigger>
            <TabsTrigger value="report" disabled={allCombinations.length === 0}>Inventory Report</TabsTrigger>
          </TabsList>
          
          <TabsContent value="setup" className="mt-4 space-y-4">
            {safeConfig.map((option, index) => (
                <div key={index} className="grid grid-cols-1 md:grid-cols-[1fr_2fr_auto] gap-3 items-center p-3 border rounded-lg">
                    <Input
                        placeholder="Option Name (e.g., Size)"
                        value={option.name}
                        onChange={e => handleOptionNameChange(index, e.target.value)}
                    />
                    <Input
                        id={`option-values-${index}`}
                        placeholder="e.g., Small, Medium, Large"
                        value={Array.isArray(option.values) ? option.values.join(', ') : ''}
                        onChange={e => handleOptionValuesChange(index, e.target.value)}
                    />
                    <Button variant="ghost" size="icon" onClick={() => removeOption(index)}><Trash2 className="h-4 w-4 text-destructive"/></Button>
                </div>
            ))}
            {safeConfig.length < 3 && <Button variant="outline" onClick={addOption}><Plus className="mr-2 h-4 w-4"/>Add Option</Button>}
          </TabsContent>

          <TabsContent value="variants" className="mt-4">
            <div className="overflow-x-auto">
                <Table>
                    <TableHeader>
                        <TableRow>
                            {safeConfig.map((option, index) => (
                                <TableHead key={index}>{option.name || `Option ${index + 1}`}</TableHead>
                            ))}
                            <TableHead className="min-w-[150px]">Price (£)</TableHead>
                            <TableHead className="min-w-[150px]">Stock</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allCombinations.map((combo, comboIndex) => {
                            const key = generateVariantKey(combo);
                            const variantData = stock[key] || {};
                            return (
                                <TableRow key={key + comboIndex}>
                                    {combo.map((value, valueIndex) => (
                                        <TableCell key={valueIndex}>{value}</TableCell>
                                    ))}
                                    <TableCell>
                                        <div className="relative">
                                            <span className="absolute left-2 top-1/2 -translate-y-1/2 text-xs text-muted-foreground">£</span>
                                            <Input
                                                type="number"
                                                step="0.01"
                                                className="h-8 pl-5"
                                                placeholder="0.00"
                                                value={variantData.price ?? ''}
                                                onChange={(e) => handleStockValueChange(key, 'price', e.target.value)}
                                            />
                                        </div>
                                    </TableCell>
                                    <TableCell>
                                        <div className="flex items-center gap-1">
                                            <Input
                                                type="number"
                                                className="h-8 text-center"
                                                placeholder="0"
                                                value={variantData.stock ?? ''}
                                                onChange={(e) => handleStockValueChange(key, 'stock', e.target.value)}
                                            />
                                        </div>
                                    </TableCell>
                                </TableRow>
                            );
                        })}
                    </TableBody>
                </Table>
            </div>
          </TabsContent>

          <TabsContent value="report" className="mt-4">
             <ScrollArea className="h-72">
                <Table>
                    <TableHeader>
                        <TableRow>
                            <TableHead>Variant</TableHead>
                            <TableHead>Price</TableHead>
                            <TableHead>Stock</TableHead>
                        </TableRow>
                    </TableHeader>
                    <TableBody>
                        {allCombinations.map((combo, comboIndex) => {
                             const key = generateVariantKey(combo);
                             const variantData = stock[key] || {};
                             return (
                                <TableRow key={key + comboIndex}>
                                    <TableCell>{key}</TableCell>
                                    <TableCell>£{variantData.price?.toFixed(2) || '0.00'}</TableCell>
                                    <TableCell>{variantData.stock || 0}</TableCell>
                                </TableRow>
                             )
                        })}
                    </TableBody>
                </Table>
             </ScrollArea>
          </TabsContent>

        </Tabs>
      </CardContent>
    </Card>
  );
}
