"use client"

import * as React from "react"
import { 
    Bold, Italic, Underline, List, ListOrdered, Heading1, Heading2, Heading3, 
    Quote, Link as LinkIcon, Pilcrow, AlignLeft, AlignCenter, 
    AlignRight, Image as ImageIcon, Minus, Undo, Redo, 
    ChevronDown, Palette, Strikethrough
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"
import { Separator } from "./ui/separator"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

type RichTextEditorProps = {
  value: string
  onChange: (value: string) => void
  placeholder?: string
}

const ToolbarButton = ({
  onClick,
  children,
  isActive,
}: {
  onClick: (e: React.MouseEvent<HTMLButtonElement>) => void
  children: React.ReactNode
  isActive?: boolean
}) => (
  <Button
    type="button"
    variant={isActive ? "secondary" : "ghost"}
    size="sm"
    className="h-8 w-8 p-0"
    onMouseDown={onClick} // Use onMouseDown to prevent the editor from losing focus
  >
    {children}
  </Button>
);

export function RichTextEditor({ 
    value, 
    onChange, 
    placeholder,
}: RichTextEditorProps) {
  
  const editorRef = React.useRef<HTMLDivElement>(null);
  const colorInputRef = React.useRef<HTMLInputElement>(null);
  const [isMounted, setIsMounted] = React.useState(false);

  React.useEffect(() => {
      setIsMounted(true);
  }, []);

  const format = (command: string, value: string | null = null) => {
    document.execCommand(command, false, value);
    if (editorRef.current) {
        onChange(editorRef.current.innerHTML);
        editorRef.current.focus();
    }
  };
  
  const handleInput = (e: React.FormEvent<HTMLDivElement>) => {
    if (editorRef.current) {
      onChange(editorRef.current.innerHTML);
    }
  };

  const handlePaste = (e: React.ClipboardEvent<HTMLDivElement>) => {
    // Attempt to get HTML content to preserve formatting (bullet points, headings, etc.)
    const html = e.clipboardData.getData('text/html');
    
    if (html) {
      e.preventDefault();
      // insertHTML allows the browser to handle the formatted content
      format('insertHTML', html);
    } else {
      // Fallback to plain text behavior if HTML is not available
      e.preventDefault();
      const text = e.clipboardData.getData('text/plain');
      
      // Sanitize the text by escaping HTML characters to prevent XSS
      const sanitizedText = text.replace(/</g, "&lt;").replace(/>/g, "&gt;");

      // Convert newlines to paragraph tags for proper formatting
      const htmlToInsert = sanitizedText
          .split('\n')
          .map(line => line.trim() === '' ? '<p><br></p>' : `<p>${line}</p>`)
          .join('');
      
      format('insertHTML', htmlToInsert);
    }
  };

  const handleClick = (e: React.MouseEvent<HTMLButtonElement>, command: string, value: string | null = null) => {
      e.preventDefault();
      format(command, value);
  }

  React.useEffect(() => {
    if (editorRef.current && isMounted && value !== editorRef.current.innerHTML) {
      editorRef.current.innerHTML = value;
    }
  }, [value, isMounted]);
  
  const handleColorChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.preventDefault();
    format('foreColor', e.target.value);
  }

  if (!isMounted) {
      return (
          <textarea
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            className="min-h-[150px] w-full rounded-md border border-input bg-background px-3 py-2 text-base ring-offset-background placeholder:text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 md:text-sm"
          />
      );
  }

  return (
    <div className="rounded-md border border-input bg-background ring-offset-background focus-within:ring-2 focus-within:ring-ring focus-within:ring-offset-2">
      <div className="p-2 border-b flex items-center gap-1 flex-wrap">
        <ToolbarButton onClick={(e) => handleClick(e, 'undo')}><Undo className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={(e) => handleClick(e, 'redo')}><Redo className="h-4 w-4" /></ToolbarButton>
        <Separator orientation="vertical" className="h-6 mx-1" />
        
        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-auto px-3">
                Text Style
                <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => format('formatBlock', 'p')}>
                    <Pilcrow className="mr-2 h-4 w-4" />
                    <span>Paragraph</span>
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => format('formatBlock', 'h1')}>
                    <Heading1 className="mr-2 h-4 w-4" />
                    <span>Heading 1</span>
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => format('formatBlock', 'h2')}>
                    <Heading2 className="mr-2 h-4 w-4" />
                    <span>Heading 2</span>
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => format('formatBlock', 'h3')}>
                    <Heading3 className="mr-2 h-4 w-4" />
                    <span>Heading 3</span>
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => format('formatBlock', 'blockquote')}>
                    <Quote className="mr-2 h-4 w-4" />
                    <span>Quote</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <DropdownMenu>
            <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="h-8 w-auto px-3">
                Font Size
                <ChevronDown className="ml-2 h-4 w-4" />
                </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => format('fontSize', '2')}>
                    <span>Small</span>
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => format('fontSize', '3')}>
                    <span>Normal</span>
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => format('fontSize', '5')}>
                    <span>Large</span>
                </DropdownMenuItem>
                <DropdownMenuItem onMouseDown={(e) => e.preventDefault()} onClick={() => format('fontSize', '7')}>
                    <span>Huge</span>
                </DropdownMenuItem>
            </DropdownMenuContent>
        </DropdownMenu>

        <Separator orientation="vertical" className="h-6 mx-1" />

        <ToolbarButton onClick={(e) => handleClick(e, 'bold')}><Bold className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={(e) => handleClick(e, 'italic')}><Italic className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={(e) => handleClick(e, 'underline')}><Underline className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={(e) => handleClick(e, 'strikeThrough')}><Strikethrough className="h-4 w-4" /></ToolbarButton>
         <div className="relative">
            <ToolbarButton onClick={(e) => { e.preventDefault(); colorInputRef.current?.click(); }}>
                <Palette className="h-4 w-4" />
            </ToolbarButton>
            <input
                type="color"
                ref={colorInputRef}
                className="absolute top-0 left-0 w-full h-full opacity-0 cursor-pointer"
                onChange={handleColorChange}
            />
        </div>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <ToolbarButton onClick={(e) => handleClick(e, 'insertUnorderedList')}><List className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={(e) => handleClick(e, 'insertOrderedList')}><ListOrdered className="h-4 w-4" /></ToolbarButton>
        <Separator orientation="vertical" className="h-6 mx-1" />
        <ToolbarButton onClick={(e) => {
            e.preventDefault();
            const url = window.prompt('Enter the URL');
            if (url) format('createLink', url);
        }}><LinkIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={(e) => {
            e.preventDefault();
            const url = window.prompt('Enter the image URL');
            if (url) format('insertImage', url);
        }}><ImageIcon className="h-4 w-4" /></ToolbarButton>
        <ToolbarButton onClick={(e) => handleClick(e, 'insertHorizontalRule')}><Minus className="h-4 w-4" /></ToolbarButton>
      </div>
      <div
        ref={editorRef}
        contentEditable
        dir="auto"
        onInput={handleInput}
        onPaste={handlePaste}
        data-placeholder={placeholder}
        className={cn(
          "min-h-[150px] w-full p-3 text-base md:text-sm max-w-none focus:outline-none prose prose-sm dark:prose-invert",
          !value && "before:content-[attr(data-placeholder)] before:text-muted-foreground before:pointer-events-none"
        )}
      />
    </div>
  );
}