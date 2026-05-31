

"use client";

import * as React from "react";
import { format, isWithinInterval } from "date-fns";
import { DateRange } from "react-day-picker";
import {
    ChevronDown,
    Newspaper,
    FilterX,
    Calendar as CalendarIcon,
    ArrowRight,
    Loader2,
    LayoutGrid,
    List,
} from "lucide-react";

import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { cn } from "@/lib/utils";
import Image from "next/image";
import { Badge } from "@/components/ui/badge";
import Link from "next/link";
import { collection, onSnapshot, query, where, doc } from "firebase/firestore";
import { useUser, useFirestore, useDoc, useCollection, useMemoFirebase } from "@/firebase";

export type NewsStory = {
    id: string;
    title: string;
    author: string;
    category: string;
    image?: string;
    dataAiHint?: string;
    date: { toDate: () => Date };
};

const NewsCard = ({ story }: { story: NewsStory }) => (
    <Card className="flex flex-col overflow-hidden">
        <CardHeader className="p-0">
            <div className="relative w-full aspect-square bg-muted">
                <Image
                    src={story.image || 'https://picsum.photos/seed/news/600/400'}
                    alt={story.title}
                    fill
                    className="object-cover"
                    data-ai-hint={story.dataAiHint || 'news article'}
                />
            </div>
        </CardHeader>
        <CardContent className="p-4 flex-grow">
            <h3 className="font-semibold text-base line-clamp-2">{story.title}</h3>
        </CardContent>
        <CardFooter className="p-4 pt-0 mt-auto">
            <Button asChild size="sm" className="w-full">
                <Link href={`/news/${story.id}`}>
                    Read More
                </Link>
            </Button>
        </CardFooter>
    </Card>
);

const NewsRow = ({ story }: { story: NewsStory }) => (
    <Card className="flex items-center p-4">
        <div className="relative h-16 w-16 flex-shrink-0 mr-4 rounded-md overflow-hidden">
            <Image
                src={story.image || 'https://picsum.photos/seed/news-list/400'}
                alt={story.title}
                fill
                className="object-cover"
                data-ai-hint={story.dataAiHint || "news article"}
            />
        </div>
        <div className="flex-1">
            <h3 className="font-semibold">{story.title}</h3>
            <p className="text-sm text-muted-foreground">{story.author} - {format(story.date.toDate(), "PPP")}</p>
        </div>
        <Button asChild variant="secondary" size="sm" className="ml-4">
            <Link href={`/news/${story.id}`}>Read More</Link>
        </Button>
    </Card>
);


export default function NewsPage() {
    const { user, isUserLoading: authLoading } = useUser();
    const db = useFirestore();

    const userProfileRef = useMemoFirebase(() => (user && db ? doc(db, 'users', user.uid) : null), [user, db]);
    const { data: userProfile, isLoading: profileLoading } = useDoc(userProfileRef);

    const newsQuery = useMemoFirebase(() => {
        if (!userProfile?.communityId || !db) return null;
        return query(
            collection(db, "news"),
            where("communityId", "==", userProfile.communityId),
            where("status", "==", "Published")
        );
    }, [db, userProfile?.communityId]);

    const { data: newsData, isLoading: newsLoading } = useCollection<NewsStory>(newsQuery);
    
    const loading = authLoading || profileLoading || newsLoading;

    const [view, setView] = React.useState('grid');
    const [titleFilter, setTitleFilter] = React.useState("");
    const [authorFilter, setAuthorFilter] = React.useState<string[]>([]);
    const [categoryFilter, setCategoryFilter] = React.useState<string[]>([]);
    const [date, setDate] = React.useState<DateRange | undefined>();


    const filteredData = React.useMemo(() => {
        if (!newsData) return [];
        return newsData.filter(story => {
            if (titleFilter && !story.title.toLowerCase().includes(titleFilter.toLowerCase())) {
                return false;
            }
            if (authorFilter.length > 0 && !authorFilter.includes(story.author)) {
                return false;
            }
            if (categoryFilter.length > 0 && !categoryFilter.includes(story.category)) {
                return false;
            }
            if (date?.from && story.date) {
                const storyDate = story.date.toDate();
                const toDate = date.to || date.from; // If only one date is picked, use it as start and end
                if (!isWithinInterval(storyDate, { start: date.from, end: toDate })) {
                    return false;
                }
            }
            return true;
        });
    }, [titleFilter, authorFilter, categoryFilter, date, newsData]);

    const authors = React.useMemo(() => Array.from(new Set(newsData?.map(story => story.author) || [])).filter(Boolean), [newsData]);
    const categories = React.useMemo(() => Array.from(new Set(newsData?.map(story => story.category) || [])).filter(Boolean), [newsData]);

    const isFiltered = titleFilter || authorFilter.length > 0 || categoryFilter.length > 0 || date;

    const resetFilters = () => {
        setTitleFilter("");
        setAuthorFilter([]);
        setCategoryFilter([]);
        setDate(undefined);
    };

    return (
        <div className="space-y-8">
            <div>
                <h1 className="text-3xl font-bold tracking-tight font-headline flex items-center gap-2">
                    <Newspaper className="h-8 w-8 text-primary" />
                    Community News
                </h1>
                <p className="text-muted-foreground">
                    The latest news and updates from your community.
                </p>
            </div>
            
            <Card>
                <CardHeader>
                    <div className="flex flex-col sm:flex-row items-start sm:items-center gap-4 justify-between">
                        <div className="flex flex-wrap items-center gap-2">
                            <Input
                                placeholder="Filter by title..."
                                value={titleFilter}
                                onChange={(event) => setTitleFilter(event.target.value)}
                                className="max-w-xs"
                            />
                            {authors.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            Author ({authorFilter.length > 0 ? authorFilter.length : 'All'})
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {authors.map(author => (
                                            <DropdownMenuCheckboxItem
                                                key={author}
                                                checked={authorFilter.includes(author)}
                                                onCheckedChange={() => {
                                                    setAuthorFilter(prev => 
                                                        prev.includes(author) 
                                                            ? prev.filter(item => item !== author) 
                                                            : [...prev, author]
                                                    );
                                                }}
                                            >
                                                {author}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            {categories.length > 0 && (
                                <DropdownMenu>
                                    <DropdownMenuTrigger asChild>
                                        <Button variant="outline">
                                            Category ({categoryFilter.length > 0 ? categoryFilter.length : 'All'})
                                            <ChevronDown className="ml-2 h-4 w-4" />
                                        </Button>
                                    </DropdownMenuTrigger>
                                    <DropdownMenuContent>
                                        {categories.map(category => (
                                            <DropdownMenuCheckboxItem
                                                key={category}
                                                checked={categoryFilter.includes(category)}
                                                onCheckedChange={() => {
                                                    setCategoryFilter(prev => 
                                                        prev.includes(category) 
                                                            ? prev.filter(item => item !== category) 
                                                            : [...prev, category]
                                                    );
                                                }}
                                            >
                                                {category}
                                            </DropdownMenuCheckboxItem>
                                        ))}
                                    </DropdownMenuContent>
                                </DropdownMenu>
                            )}
                            <Popover>
                                <PopoverTrigger asChild>
                                <Button
                                    id="date"
                                    variant={"outline"}
                                    className={cn(
                                    "w-[260px] justify-start text-left font-normal",
                                    !date && "text-muted-foreground"
                                    )}
                                >
                                    <CalendarIcon className="mr-2 h-4 w-4" />
                                    {date?.from ? (
                                    date.to ? (
                                        <>
                                        {format(date.from, "LLL dd, y")} -{" "}
                                        {format(date.to, "LLL dd, y")}
                                        </>
                                    ) : (
                                        format(date.from, "LLL dd, y")
                                    )
                                    ) : (
                                    <span>Pick a date range</span>
                                    )}
                                </Button>
                                </PopoverTrigger>
                                <PopoverContent className="w-auto p-0" align="start">
                                <Calendar
                                    initialFocus
                                    mode="range"
                                    defaultMonth={date?.from}
                                    selected={date}
                                    onSelect={setDate}
                                    numberOfMonths={2}
                                />
                                </PopoverContent>
                            </Popover>
                            {isFiltered && (
                                <Button
                                    variant="ghost"
                                    onClick={resetFilters}
                                >
                                    Reset
                                    <FilterX className="ml-2 h-4 w-4" />
                                </Button>
                            )}
                        </div>
                        <div className="flex items-center gap-1 rounded-md bg-muted p-1">
                            <Button variant={view === 'grid' ? 'default' : 'ghost'} size="sm" onClick={() => setView('grid')}>
                                <LayoutGrid className="h-5 w-5" />
                                <span className="hidden sm:inline ml-2">Grid</span>
                            </Button>
                            <Button variant={view === 'list' ? 'default' : 'ghost'} size="sm" onClick={() => setView('list')}>
                                <List className="h-5 w-5" />
                                <span className="hidden sm:inline ml-2">List</span>
                            </Button>
                        </div>
                    </div>
                </CardHeader>
                <CardContent>
                    {loading ? (
                        <div className="flex justify-center items-center h-64">
                            <Loader2 className="h-8 w-8 animate-spin" />
                        </div>
                    ) : filteredData.length > 0 ? (
                         view === 'grid' ? (
                            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6">
                                {filteredData.map((story) => <NewsCard key={story.id} story={story} />)}
                            </div>
                        ) : (
                            <div className="space-y-4">
                                {filteredData.map((story) => <NewsRow key={story.id} story={story} />)}
                            </div>
                        )
                    ) : (
                        <div className="h-48 flex flex-col items-center justify-center text-center">
                            <h3 className="text-xl font-semibold">No Stories Found</h3>
                            <p className="text-muted-foreground mt-2">Try adjusting your filters or check back later.</p>
                            {isFiltered && <Button variant="outline" className="mt-4" onClick={resetFilters}>Clear All Filters</Button>}
                        </div>
                    )}
                </CardContent>
            </Card>
        </div>
    );
}
