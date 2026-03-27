
'use client';

import * as React from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { Loader2 } from "lucide-react";
import { useToast } from "@/hooks/use-toast";
import { Badge } from './ui/badge';

type Colour = {
    name: string;
    hex: string;
};

export type ProductConfig = {
    categories: string[];
    sizes: string[];
    colours: Colour[];
};

export type StockData = {
    [category: string]: {
        [size: string]: {
            [colour: string]: number;
        };
    };
};

interface ProductVariationManagerProps {
  config: ProductConfig;
  stock: StockData;
  onConfigChange: (newConfig: ProductConfig) => void;
  onStockChange: (newStock: StockData) => void;
}

const colourMap: { [key: string]: string } = {
    "black": "#000000", "white": "#ffffff", "navy": "#1e3a8a", "grey": "#94a3b8",
    "red": "#ef4444", "blue": "#3b82f6", "green": "#22c55e", "yellow": "#eab308"
};

export function ProductVariationManager({ config, stock, onConfigChange, onStockChange }: ProductVariationManagerProps) {
    const { toast } = useToast();

    const [currentCat, setCurrentCat] = React.useState<string>('');
    const [currentSize, setCurrentSize] = React.useState<string>('');

    const [catInput, setCatInput] = React.useState(config.categories.join(', '));
    const [sizeInput, setSizeInput] = React.useState(config.sizes.join(', '));
    const [colourInput, setColourInput] = React.useState(config.colours.map(c => c.name).join(', '));
    
    const [reportSearch, setReportSearch] = React.useState('');

    React.useEffect(() => {
        if (config) {
            setCatInput(config.categories?.join(', ') || '');
            setSizeInput(config.sizes?.join(', ') || '');
            setColourInput(config.colours?.map((c: Colour) => c.name).join(', ') || '');
            if (!currentCat && config.categories?.[0]) {
                setCurrentCat(config.categories[0]);
            }
            if (!currentSize && config.sizes?.[0]) {
                setCurrentSize(config.sizes[0]);
            }
        }
    }, [config, currentCat, currentSize]);

    const configureProduct = () => {
        const categories = catInput.split(',').map(s => s.trim()).filter(Boolean);
        const sizes = sizeInput.split(',').map(s => s.trim()).filter(Boolean);
        const colours = colourInput.split(',').map(c => {
            const name = c.trim();
            return { name, hex: colourMap[name.toLowerCase()] || "#cbd5e1" };
        }).filter(c => c.name);

        const newConfig = { categories, sizes, colours };
        onConfigChange(newConfig);
        setCurrentCat(categories[0] || '');
        setCurrentSize(sizes[0] || '');
        toast({ title: "Configuration Applied", description: "Variation options have been updated. Remember to save the product." });
    };

    const updateQty = (colourName: string, change: number) => {
        onStockChange({
            ...stock,
            [currentCat]: {
                ...stock[currentCat],
                [currentSize]: {
                    ...stock[currentCat]?.[currentSize],
                    [colourName]: Math.max(0, (stock[currentCat]?.[currentSize]?.[colourName] || 0) + change)
                }
            }
        });
    };
    
    const catData = stock[currentCat] || {};
    const sizeData = catData[currentSize] || {};
    const total = Object.values(sizeData).reduce((a, b) => a + b, 0);

    const fullInventory = React.useMemo(() => {
        let allData: {cat: string; size: string; col: string; qty: number}[] = [];
         (config.categories || []).forEach(cat => {
            (config.sizes || []).forEach(size => {
                (config.colours || []).forEach(col => {
                    const qty = (stock[cat]?.[size]?.[col.name]) || 0;
                    if (!reportSearch || cat.toLowerCase().includes(reportSearch) || size.toLowerCase().includes(reportSearch) || col.name.toLowerCase().includes(reportSearch)) {
                        allData.push({ cat, size, col: col.name, qty });
                    }
                });
            });
        });
        return allData;
    }, [config, stock, reportSearch]);


    return (
        <Card>
            <CardHeader>
                <CardTitle>Product Variation Manager</CardTitle>
                <CardDescription>Define attributes like size and color, then manage stock for each unique combination.</CardDescription>
            </CardHeader>
            <CardContent>
                <Tabs defaultValue="manage">
                    <TabsList className="mb-4">
                        <TabsTrigger value="manage">Stock Management</TabsTrigger>
                        <TabsTrigger value="setup">Setup</TabsTrigger>
                        <TabsTrigger value="report">Inventory Report</TabsTrigger>
                    </TabsList>
                    <TabsContent value="manage">
                        <div className="border rounded-lg p-3 md:p-4 flex flex-col md:flex-row items-center gap-4">
                            <div className="w-full md:w-auto space-y-4">
                                <div>
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Category</Label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {(config.categories || []).map(cat => (
                                            <Button key={cat} size="sm" variant={cat === currentCat ? 'default' : 'outline'} onClick={() => setCurrentCat(cat)}>{cat}</Button>
                                        ))}
                                    </div>
                                </div>
                                 <div>
                                    <Label className="text-xs font-bold uppercase text-muted-foreground">Size</Label>
                                    <div className="flex flex-wrap gap-1 mt-1">
                                        {(config.sizes || []).map(size => (
                                            <Button key={size} size="sm" variant={size === currentSize ? 'default' : 'outline'} onClick={() => setCurrentSize(size)}>{size}</Button>
                                        ))}
                                    </div>
                                </div>
                            </div>
                            <div className="hidden md:block w-px h-16 bg-border mx-4"></div>
                            <div className="flex-1 grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3">
                                {(config.colours || []).map(colour => {
                                    const qty = sizeData[colour.name] || 0;
                                    return (
                                        <div key={colour.name} className="border rounded-md p-2 flex flex-col items-center gap-2">
                                            <div className="flex items-center gap-2">
                                                <span className="h-3 w-3 rounded-full border" style={{ backgroundColor: colour.hex }}></span>
                                                <span className="text-xs font-bold">{colour.name}</span>
                                            </div>
                                            <div className="flex items-center gap-1">
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQty(colour.name, -1)}>−</Button>
                                                <span className="font-bold text-sm w-8 text-center">{qty}</span>
                                                <Button size="icon" variant="ghost" className="h-6 w-6" onClick={() => updateQty(colour.name, 1)}>+</Button>
                                            </div>
                                            {qty === 0 ? <Badge variant="destructive" className="text-xs">Out</Badge> : qty < 5 ? <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low</Badge> : null}
                                        </div>
                                    )
                                })}
                            </div>
                             <div className="hidden md:block w-px h-16 bg-border mx-4"></div>
                            <div className="flex flex-col items-center gap-2">
                                <p className="text-xs font-bold text-muted-foreground">TOTAL</p>
                                <p className="text-2xl font-bold">{total}</p>
                            </div>
                        </div>
                    </TabsContent>
                    <TabsContent value="setup">
                        <div className="border border-dashed p-4 rounded-lg space-y-4">
                            <div className="grid gap-2">
                                <Label htmlFor="setup-cats">Categories (comma-separated)</Label>
                                <Input type="text" id="setup-cats" value={catInput} onChange={e => setCatInput(e.target.value)} />
                            </div>
                            <div className="grid gap-2">
                                <Label htmlFor="setup-sizes">Sizes (comma-separated)</Label>
                                <Input type="text" id="setup-sizes" value={sizeInput} onChange={e => setSizeInput(e.target.value)} />
                            </div>
                             <div className="grid gap-2">
                                <Label htmlFor="setup-colours">Colours (comma-separated)</Label>
                                <Input type="text" id="setup-colours" value={colourInput} onChange={e => setColourInput(e.target.value)} />
                            </div>
                            <Button onClick={configureProduct}>Apply Setup</Button>
                        </div>
                    </TabsContent>
                    <TabsContent value="report">
                         <div className="p-4 border rounded-lg">
                            <div className="flex justify-between items-center mb-4">
                                <h3 className="font-semibold">Inventory Report</h3>
                                <Input type="text" placeholder="Filter..." className="max-w-xs" value={reportSearch} onChange={e => setReportSearch(e.target.value)}/>
                            </div>
                            <Table>
                                <TableHeader>
                                <TableRow>
                                    <TableHead>Category</TableHead>
                                    <TableHead>Size</TableHead>
                                    <TableHead>Colour</TableHead>
                                    <TableHead>Stock Level</TableHead>
                                    <TableHead>Status</TableHead>
                                </TableRow>
                                </TableHeader>
                                <TableBody>
                                    {fullInventory.map((item, index) => (
                                        <TableRow key={index}>
                                            <TableCell>{item.cat}</TableCell>
                                            <TableCell>{item.size}</TableCell>
                                            <TableCell>{item.col}</TableCell>
                                            <TableCell>{item.qty}</TableCell>
                                            <TableCell>
                                                {item.qty === 0 ? <Badge variant="destructive">Out of Stock</Badge> : item.qty < 5 ? <Badge variant="secondary" className="bg-yellow-100 text-yellow-800">Low Stock</Badge> : <Badge variant="secondary" className="bg-green-100 text-green-800">In Stock</Badge>}
                                            </TableCell>
                                        </TableRow>
                                    ))}
                                </TableBody>
                            </Table>
                         </div>
                    </TabsContent>
                </Tabs>
            </CardContent>
        </Card>
    );
}
