
"use client";

import * as React from "react";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  List,
  ListOrdered,
  Heading2,
  Quote,
  Palette,
  Pilcrow,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
} from "lucide-react";
import { Toggle } from "@/components/ui/toggle";
import { Separator } from "@/components/ui/separator";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "./ui/button";
import { Label } from "@/components/ui/label";

type RichTextEditorProps = {
  value: string;
  onChange: (value: string) => void;
  placeholder?: string;
  hideHeading?: boolean;
  hideQuote?: boolean;
  hideFontSize?: boolean;
  hideColor?: boolean;
};

const PREDEFINED_COLORS = [
  "#000000", "#444444", "#666666", "#999999", "#CCCCCC", "#EEEEEE", "#FFFFFF",
  "#FF0000", "#FF9900", "#FFFF00", "#00FF00", "#00FFFF", "#0000FF", "#9900FF", "#FF00FF",
  "hsl(var(--primary))", "hsl(var(--secondary-foreground))", "hsl(var(--destructive))", "hsl(var(--accent-foreground))",
];

export function RichTextEditor({ 
    value, 
    onChange, 
    placeholder,
    hideHeading = false,
    hideQuote = false,
    hideFontSize = false,
    hideColor = false,
}: RichTextEditorProps) {
  const editorRef = React.useRef<HTMLDivElement>(null);
  const [color, setColor] = React.useState("#000000");

  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    onChange(e.currentTarget.innerHTML);
  };
  
  const handleCommand = (command: string, value?: string) => {
    document.execCommand(command, false, value);
    editorRef.current?.focus();
  };

  const handleColorChange = (newColor: string) => {
    setColor(newColor);
    handleCommand("foreColor", newColor);
  };
  
  React.useEffect(() => {
    if (editorRef.current && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value]);

  return (
    <div className="w-full rounded-md border border-input bg-background focus-within:outline-none focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <div className="p-2 border-b flex flex-wrap items-center gap-1">
        <Toggle size="sm" onPressedChange={() => handleCommand("bold")}>
          <Bold className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => handleCommand("italic")}>
          <Italic className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => handleCommand("underline")}>
          <Underline className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => handleCommand("strikeThrough")}>
          <Strikethrough className="h-4 w-4" />
        </Toggle>
        
        {!hideFontSize && !hideColor && <Separator orientation="vertical" className="h-6 mx-1" />}
        
        {!hideFontSize && (
            <Select onValueChange={(size) => handleCommand("fontSize", size)}>
                <SelectTrigger className="w-auto h-9 text-xs px-2.5">
                    <SelectValue placeholder="Font Size" />
                </SelectTrigger>
                <SelectContent>
                    <SelectItem value="1">Smallest</SelectItem>
                    <SelectItem value="2">Small</SelectItem>
                    <SelectItem value="3">Normal</SelectItem>
                    <SelectItem value="4">Medium</SelectItem>
                    <SelectItem value="5">Large</SelectItem>
                    <SelectItem value="6">Extra Large</SelectItem>
                    <SelectItem value="7">Largest</SelectItem>
                </SelectContent>
            </Select>
        )}

        {!hideColor && (
            <Popover>
                <PopoverTrigger asChild>
                    <Button variant="outline" size="sm" className="h-9 w-10 p-0">
                        <Palette className="h-4 w-4" />
                    </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-4 space-y-2">
                    <div className="grid grid-cols-8 gap-2">
                        {PREDEFINED_COLORS.map(c => (
                            <button
                                key={c}
                                onClick={() => handleColorChange(c)}
                                className="h-6 w-6 rounded-full border"
                                style={{ backgroundColor: c }}
                                aria-label={`Color ${c}`}
                            />
                        ))}
                    </div>
                    <div className="flex items-center gap-2">
                        <Label htmlFor="custom-color" className="text-xs">Custom</Label>
                        <Input 
                            id="custom-color"
                            type="color" 
                            className="w-24 h-8 p-1 border-0 cursor-pointer" 
                            value={color}
                            onChange={(e) => handleColorChange(e.target.value)}
                        />
                    </div>
                </PopoverContent>
            </Popover>
        )}

        {(!hideHeading || !hideQuote) && <Separator orientation="vertical" className="h-6 mx-1" />}

        {!hideHeading && (
            <Toggle size="sm" onPressedChange={() => handleCommand("formatBlock", "<H2>")}>
            <Heading2 className="h-4 w-4" />
            </Toggle>
        )}
        {!hideQuote && (
            <Toggle size="sm" onPressedChange={() => handleCommand("formatBlock", "<blockquote>")}>
            <Quote className="h-4 w-4" />
            </Toggle>
        )}
        <Separator orientation="vertical" className="h-6 mx-1" />
        <Toggle size="sm" onPressedChange={() => handleCommand("insertUnorderedList")}>
          <List className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => handleCommand("insertOrderedList")}>
          <ListOrdered className="h-4 w-4" />
        </Toggle>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <Toggle size="sm" onPressedChange={() => handleCommand("justifyLeft")}>
            <AlignLeft className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => handleCommand("justifyCenter")}>
            <AlignCenter className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => handleCommand("justifyRight")}>
            <AlignRight className="h-4 w-4" />
        </Toggle>
        <Toggle size="sm" onPressedChange={() => handleCommand("justifyFull")}>
            <AlignJustify className="h-4 w-4" />
        </Toggle>
      </div>
      <div
        ref={editorRef}
        contentEditable
        onInput={handleInput}
        data-placeholder={placeholder}
        className="min-h-[100px] w-full p-3 text-base ring-offset-background placeholder:text-muted-foreground prose dark:prose-invert max-w-none empty:before:content-[attr(data-placeholder)] empty:before:text-muted-foreground empty:before:float-left empty:before:pointer-events-none"
      />
    </div>
  );
}
