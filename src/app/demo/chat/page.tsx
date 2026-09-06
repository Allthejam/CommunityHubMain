'use client';

import * as React from 'react';
import {
  Send,
  Bot,
  User,
  Search,
  Sparkles,
  Smile,
  Paperclip,
  CheckCheck,
  Circle,
  MessageSquare,
  HelpCircle,
  Building2,
  Users,
  Store,
  Calendar,
  ShoppingBag,
  HeartHandshake,
  Briefcase,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { cn } from '@/lib/utils';
import { format } from 'date-fns';

type ChatMessage = {
  id: string;
  sender: 'user' | 'bot' | 'contact';
  senderName: string;
  text: string;
  timestamp: string;
  avatar?: string;
};

type Conversation = {
  id: string;
  name: string;
  role: string;
  avatar: string;
  type: 'ai' | 'neighbor' | 'business' | 'group';
  status: string;
  isOnline: boolean;
  unread: number;
  lastMessage: string;
  messages: ChatMessage[];
  suggestions?: string[];
};

const INITIAL_CONVERSATIONS: Conversation[] = [
  {
    id: 'ai-assistant',
    name: 'Hub AI Assistant',
    role: 'Interactive Community Guide',
    avatar: '',
    type: 'ai',
    status: 'Always online • AI Powered',
    isOnline: true,
    unread: 1,
    lastMessage: '👋 Welcome to Oakridge Hub! Ask me anything about the app or community.',
    suggestions: [
      'How do I post a community event?',
      'Tell me about Oakridge & DemoVille',
      'How does the Marketplace work?',
      'Where can I find local Charities?',
      'What features does the Hub app offer?',
    ],
    messages: [
      {
        id: 'msg-ai-1',
        sender: 'bot',
        senderName: 'Hub AI Assistant',
        text: '👋 Hello and welcome to the Oakridge & DemoVille Community Hub!\n\nI am your interactive AI assistant. I can help you discover local businesses, find upcoming events, post to the marketplace, connect with charities, and explore how the Hub APP works. What would you like to explore today?',
        timestamp: 'Just now',
      },
    ],
  },
  {
    id: 'sarah-volunteer',
    name: 'Sarah Jenkins',
    role: 'Oakridge Community Volunteer',
    avatar: 'https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=120&auto=format&fit=crop&q=80',
    type: 'neighbor',
    status: 'Active in Oakridge',
    isOnline: true,
    unread: 1,
    lastMessage: 'Hi neighbor! Are you coming to the Community Park clean-up on Saturday?',
    suggestions: [
      'Yes, what time does it start?',
      'What should I bring along?',
      'Where are we meeting?',
    ],
    messages: [
      {
        id: 'msg-sarah-1',
        sender: 'contact',
        senderName: 'Sarah Jenkins',
        text: 'Hi neighbor! Welcome to the new Oakridge Hub chat! 😊 Are you coming along to the Community Park clean-up this Saturday?',
        timestamp: '10:15 AM',
      },
    ],
  },
  {
    id: 'callum-bakery',
    name: 'Callum Stewart',
    role: 'Oakridge Artisan Bakery',
    avatar: 'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=120&auto=format&fit=crop&q=80',
    type: 'business',
    status: 'Open Today 7am - 4pm',
    isOnline: true,
    unread: 0,
    lastMessage: 'Our fresh sourdough and morning croissants are ready daily at 7 AM!',
    suggestions: [
      'Do you offer gluten-free bread?',
      'Can I place an advance order for collection?',
      'Are you on the High Street directory?',
    ],
    messages: [
      {
        id: 'msg-callum-1',
        sender: 'contact',
        senderName: 'Callum Stewart',
        text: 'Hello from Oakridge Artisan Bakery! 🥐 Thanks for visiting our listing on the High Street directory. Fresh sourdough and pastries are available every morning!',
        timestamp: 'Yesterday',
      },
    ],
  },
  {
    id: 'town-lounge',
    name: 'Oakridge Town Lounge',
    role: 'Public Community Channel (142 members)',
    avatar: '',
    type: 'group',
    status: '142 members online',
    isOnline: true,
    unread: 0,
    lastMessage: 'Fiona: Reminder that the Village Hall farmers market is this Sunday!',
    suggestions: [
      'Good morning everyone!',
      'Does anyone know if the library is open today?',
      'Looking forward to the weekend market!',
    ],
    messages: [
      {
        id: 'msg-group-1',
        sender: 'contact',
        senderName: 'Fiona Macleod (Leader)',
        text: '📢 Friendly reminder to all residents: The Sunday Farmers Market is on this weekend from 10 AM at the Village Hall square. See you all there!',
        timestamp: '9:00 AM',
      },
      {
        id: 'msg-group-2',
        sender: 'contact',
        senderName: 'Morag Campbell',
        text: 'Thanks Fiona! I will be bringing home-made jams and fresh honey from the orchard. 🍯',
        timestamp: '9:24 AM',
      },
    ],
  },
];

export default function DemoChatPage() {
  const [conversations, setConversations] = React.useState<Conversation[]>(INITIAL_CONVERSATIONS);
  const [activeConvId, setActiveConvId] = React.useState<string>('ai-assistant');
  const [inputMessage, setInputMessage] = React.useState('');
  const [isTyping, setIsTyping] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');
  const messagesContainerRef = React.useRef<HTMLDivElement>(null);

  const activeConversation = React.useMemo(
    () => conversations.find((c) => c.id === activeConvId) || conversations[0],
    [conversations, activeConvId]
  );

  const scrollToBottom = (behavior: ScrollBehavior = 'smooth') => {
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTo({
        top: messagesContainerRef.current.scrollHeight,
        behavior,
      });
    }
  };

  React.useEffect(() => {
    scrollToBottom(activeConversation?.messages?.length <= 2 ? 'auto' : 'smooth');
  }, [activeConversation?.messages?.length, isTyping, activeConvId]);

  const generateAIResponse = (userText: string): string => {
    const lower = userText.toLowerCase();

    if (lower.includes('event') || lower.includes("what's on") || lower.includes('what is on')) {
      return `📅 **Events & What's On in Oakridge**:\n\nYou can view and post events by navigating to the **Events** tab in the main menu! The hub supports both one-off and annual recurring events (like our annual Highland Summer Fair). Local businesses and residents can publish community events with custom images and dates.`;
    }

    if (lower.includes('market') || lower.includes('buy') || lower.includes('sell') || lower.includes('swap') || lower.includes('item')) {
      return `🛍️ **Marketplace & Local Trading**:\n\nThe **Marketplace** lets community members list items *For Sale*, *To Swap*, *Free*, or *Looking For*. In demo mode, you can post items directly and they will appear instantly in the tabs!`;
    }

    if (lower.includes('charit') || lower.includes('donate') || lower.includes('volunteer')) {
      return `🤝 **Local Charities & Good Causes**:\n\nOur **Charities** section showcases registered community non-profits and volunteer initiatives. You can apply for a charity listing or support existing local campaigns directly through the app!`;
    }

    if (lower.includes('job') || lower.includes('career') || lower.includes('work') || lower.includes('hiring')) {
      return `💼 **Local Employment Hub**:\n\nThe **Jobs & Careers** board allows local employers to post job vacancies and community members to create talent profiles. All listings run for 28 days to keep opportunities fresh and relevant!`;
    }

    if (lower.includes('lost') || lower.includes('found') || lower.includes('pet') || lower.includes('keys')) {
      return `🔍 **Lost & Found Hub**:\n\nDid you misplace something in town? The **Lost & Found** page lets you post notices for lost pets, keys, or items, or report items you've found to reconnect them with their owners.`;
    }

    if (lower.includes('leader') || lower.includes('admin') || lower.includes('back office') || lower.includes('dashboard')) {
      return `🏛️ **Leaders Back Office**:\n\nCommunity Leaders have access to a dedicated dashboard to moderate content, configure emergency alerts, manage community settings, and publish official announcements for Oakridge & DemoVille!`;
    }

    if (lower.includes('oakridge') || lower.includes('demoville') || lower.includes('about')) {
      return `🌲 **About Oakridge & DemoVille**:\n\nOakridge is our vibrant flagship showcase community! Nestled in scenic river valleys, it features local artisan shops, active community groups, regular village markets, and a connected neighborhood network.`;
    }

    if (lower.includes('hello') || lower.includes('hi') || lower.includes('hey') || lower.includes('help')) {
      return `👋 Hello! How can I assist you with the Community Hub app today? Feel free to ask about events, businesses, marketplace listings, or how to navigate the portal!`;
    }

    return `✨ Thanks for your message! The Oakridge Community Hub is designed to keep neighbors connected, support local businesses, and centralize everything happening in town. Is there a specific feature you'd like to test (Events, Marketplace, Charities, or Jobs)?`;
  };

  const generateNeighborResponse = (userText: string): string => {
    const lower = userText.toLowerCase();
    if (lower.includes('time') || lower.includes('when')) {
      return `We're meeting at 10:00 AM sharp by the community gazebo! We should be wrapped up around 1:00 PM with tea and biscuits afterwards. ☕`;
    }
    if (lower.includes('bring') || lower.includes('tools')) {
      return `Just bring some sturdy gardening gloves if you have them! We'll provide garbage bags, litter pickers, and trowels. 😊`;
    }
    if (lower.includes('where') || lower.includes('location')) {
      return `Right by the North Gate of Oakridge Riverside Park. You can't miss the bright gazebo!`;
    }
    return `That sounds wonderful! Looking forward to catching up with everyone from the neighborhood on Saturday!`;
  };

  const generateBusinessResponse = (userText: string): string => {
    const lower = userText.toLowerCase();
    if (lower.includes('gluten') || lower.includes('allergy')) {
      return `Yes! We bake gluten-free seeded loaves on Tuesdays and Fridays, and we also have delicious almond flour pastries available daily!`;
    }
    if (lower.includes('order') || lower.includes('collection') || lower.includes('reserve')) {
      return `Absolutely! You can message us right here with your order details and preferred collection time, and we'll have it boxed and ready for you at the counter.`;
    }
    return `Thank you for supporting local businesses in Oakridge! Pop by anytime between 7 AM and 4 PM—we'd love to say hello in person! 🥐`;
  };

  const generateGroupResponse = (userText: string): string => {
    const responses = [
      `Marcus: That's great to hear! See you all around the village square.`,
      `Alastair: Great initiative. Let's keep Oakridge looking beautiful!`,
      `Morag: Absolutely, the community spirit this week has been fantastic!`,
    ];
    return responses[Math.floor(Math.random() * responses.length)];
  };

  const handleSendMessage = (textToSend?: string) => {
    const messageContent = (textToSend || inputMessage).trim();
    if (!messageContent) return;

    const userMessage: ChatMessage = {
      id: `user-msg-${Date.now()}`,
      sender: 'user',
      senderName: 'You (Demo Resident)',
      text: messageContent,
      timestamp: format(new Date(), 'h:mm a'),
    };

    // Update active conversation with user message
    setConversations((prev) =>
      prev.map((c) => {
        if (c.id === activeConvId) {
          return {
            ...c,
            lastMessage: `You: ${messageContent}`,
            messages: [...c.messages, userMessage],
          };
        }
        return c;
      })
    );

    setInputMessage('');
    setIsTyping(true);

    // Simulate smart reply
    setTimeout(() => {
      let replyText = '';
      if (activeConversation.type === 'ai') {
        replyText = generateAIResponse(messageContent);
      } else if (activeConversation.type === 'neighbor') {
        replyText = generateNeighborResponse(messageContent);
      } else if (activeConversation.type === 'business') {
        replyText = generateBusinessResponse(messageContent);
      } else {
        replyText = generateGroupResponse(messageContent);
      }

      const replyMessage: ChatMessage = {
        id: `reply-msg-${Date.now()}`,
        sender: activeConversation.type === 'ai' ? 'bot' : 'contact',
        senderName: activeConversation.name,
        text: replyText,
        timestamp: format(new Date(), 'h:mm a'),
        avatar: activeConversation.avatar,
      };

      setConversations((prev) =>
        prev.map((c) => {
          if (c.id === activeConvId) {
            return {
              ...c,
              lastMessage: replyText.split('\n')[0].replace(/[*#]/g, ''),
              messages: [...c.messages, replyMessage],
            };
          }
          return c;
        })
      );
      setIsTyping(false);
    }, 700);
  };

  const filteredConversations = conversations.filter(
    (c) =>
      c.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
      c.role.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="flex flex-col h-[calc(100vh-7rem)] min-h-[580px] space-y-3">
      {/* Sleek Top Bar */}
      <div className="flex items-center justify-between px-4 py-2.5 rounded-2xl bg-gradient-to-r from-blue-600/10 via-indigo-600/10 to-purple-600/10 border border-blue-500/20 backdrop-blur-md shrink-0">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-blue-600/15 border border-blue-500/30 flex items-center justify-center text-blue-600 dark:text-blue-400">
            <Sparkles className="h-4 w-4" />
          </div>
          <div>
            <h1 className="text-base sm:text-lg font-bold tracking-tight font-headline flex items-center gap-2">
              <span className="bg-gradient-to-r from-blue-600 via-indigo-600 to-purple-600 dark:from-blue-400 dark:via-indigo-400 dark:to-purple-400 bg-clip-text text-transparent">
                Community Messenger & AI Concierge
              </span>
            </h1>
            <p className="text-xs text-muted-foreground hidden sm:block">
              Interactive chat with local Oakridge residents & Hub AI Assistant
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Badge variant="outline" className="px-2.5 py-1 bg-background/80 text-xs gap-1.5 border-blue-500/30">
            <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse" />
            Live Demo
          </Badge>
        </div>
      </div>

      {/* Main Chat Grid - fills full screen height down to the bottom */}
      <div className="flex-1 grid grid-cols-1 lg:grid-cols-12 gap-0 rounded-2xl border bg-card shadow-sm overflow-hidden min-h-0">
        {/* Sidebar: Conversation List */}
        <div className="lg:col-span-4 border-r flex flex-col h-full bg-muted/20 min-h-0 overflow-hidden">
          <div className="p-4 border-b space-y-3 shrink-0">
            <div className="flex items-center justify-between">
              <h2 className="text-base font-bold flex items-center gap-2">
                <MessageSquare className="h-4 w-4 text-blue-600" />
                Conversations
              </h2>
              <Badge variant="secondary" className="text-xs">
                {conversations.length} Active
              </Badge>
            </div>
            <div className="relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search chats..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-background/80"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-0 overscroll-contain p-2 space-y-1">
            {filteredConversations.map((conv) => {
              const isActive = conv.id === activeConvId;
              return (
                <button
                  key={conv.id}
                  onClick={() => setActiveConvId(conv.id)}
                  className={cn(
                    'w-full text-left p-3 rounded-xl transition-all flex items-start gap-3 relative group',
                    isActive
                      ? 'bg-primary/10 text-primary border border-primary/20 shadow-xs'
                      : 'hover:bg-muted/60 text-foreground'
                  )}
                >
                  <div className="relative shrink-0">
                    <Avatar className="h-11 w-11 border shadow-xs">
                      {conv.avatar ? (
                        <AvatarImage src={conv.avatar} alt={conv.name} />
                      ) : conv.type === 'ai' ? (
                        <div className="h-full w-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                          <Bot className="h-6 w-6" />
                        </div>
                      ) : conv.type === 'group' ? (
                        <div className="h-full w-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white">
                          <Users className="h-5 w-5" />
                        </div>
                      ) : (
                        <AvatarFallback className="bg-primary/10 text-primary font-bold">
                          {conv.name.charAt(0)}
                        </AvatarFallback>
                      )}
                    </Avatar>
                    {conv.isOnline && (
                      <span className="absolute bottom-0 right-0 h-3 w-3 rounded-full bg-emerald-500 ring-2 ring-background" />
                    )}
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-1 mb-0.5">
                      <span className={cn('text-sm font-semibold truncate', isActive && 'text-primary')}>
                        {conv.name}
                      </span>
                      {conv.type === 'ai' && (
                        <Badge className="text-[10px] px-1.5 py-0 bg-blue-500/15 text-blue-600 dark:text-blue-400 border-blue-500/30 hover:bg-blue-500/20">
                          AI Bot
                        </Badge>
                      )}
                    </div>
                    <p className="text-xs text-muted-foreground truncate">{conv.role}</p>
                    <p className="text-xs text-muted-foreground/80 truncate mt-1">
                      {conv.lastMessage}
                    </p>
                  </div>
                </button>
              );
            })}
          </div>
        </div>

        {/* Main Chat Area */}
        <div className="lg:col-span-8 flex flex-col h-full bg-background min-h-0 overflow-hidden">
          {/* Active Chat Header */}
          <div className="p-4 border-b flex items-center justify-between bg-card/60 backdrop-blur-md shrink-0">
            <div className="flex items-center gap-3">
              <Avatar className="h-10 w-10 border shadow-xs">
                {activeConversation.avatar ? (
                  <AvatarImage src={activeConversation.avatar} alt={activeConversation.name} />
                ) : activeConversation.type === 'ai' ? (
                  <div className="h-full w-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white">
                    <Bot className="h-5 w-5" />
                  </div>
                ) : activeConversation.type === 'group' ? (
                  <div className="h-full w-full bg-gradient-to-tr from-purple-600 to-pink-600 flex items-center justify-center text-white">
                    <Users className="h-5 w-5" />
                  </div>
                ) : (
                  <AvatarFallback className="bg-primary/10 text-primary font-bold">
                    {activeConversation.name.charAt(0)}
                  </AvatarFallback>
                )}
              </Avatar>
              <div>
                <div className="flex items-center gap-2">
                  <h3 className="text-sm font-bold">{activeConversation.name}</h3>
                  {activeConversation.type === 'ai' && (
                    <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-500/30 bg-blue-500/10">
                      Interactive AI
                    </Badge>
                  )}
                </div>
                <p className="text-xs text-muted-foreground flex items-center gap-1.5">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-500" />
                  {activeConversation.status}
                </p>
              </div>
            </div>

            <div className="flex items-center gap-2 text-xs text-muted-foreground">
              <span>Oakridge Hub Channel</span>
            </div>
          </div>

          {/* Messages Area */}
          <div ref={messagesContainerRef} className="flex-1 overflow-y-auto min-h-0 p-4 md:p-6 bg-muted/5 overscroll-contain space-y-4">
            <div className="space-y-4 max-w-3xl mx-auto">
              {activeConversation.messages.map((msg) => {
                const isMe = msg.sender === 'user';
                return (
                  <div
                    key={msg.id}
                    className={cn('flex items-end gap-2.5', isMe ? 'justify-end' : 'justify-start')}
                  >
                    {!isMe && (
                      <Avatar className="h-8 w-8 border shrink-0">
                        {activeConversation.avatar ? (
                          <AvatarImage src={activeConversation.avatar} alt={msg.senderName} />
                        ) : activeConversation.type === 'ai' ? (
                          <div className="h-full w-full bg-gradient-to-tr from-blue-600 to-indigo-600 flex items-center justify-center text-white text-xs">
                            <Bot className="h-4 w-4" />
                          </div>
                        ) : (
                          <AvatarFallback className="text-xs font-semibold">
                            {msg.senderName.charAt(0)}
                          </AvatarFallback>
                        )}
                      </Avatar>
                    )}

                    <div
                      className={cn(
                        'max-w-[80%] sm:max-w-[70%] rounded-2xl p-3.5 shadow-xs text-sm leading-relaxed whitespace-pre-line',
                        isMe
                          ? 'bg-blue-600 text-white rounded-br-xs'
                          : 'bg-card border text-card-foreground rounded-bl-xs'
                      )}
                    >
                      {!isMe && activeConversation.type === 'group' && (
                        <p className="text-[11px] font-bold text-primary mb-1">{msg.senderName}</p>
                      )}
                      <p>{msg.text}</p>
                      <div
                        className={cn(
                          'text-[10px] mt-1.5 flex items-center justify-end gap-1',
                          isMe ? 'text-blue-100/80' : 'text-muted-foreground'
                        )}
                      >
                        <span>{msg.timestamp}</span>
                        {isMe && <CheckCheck className="h-3 w-3" />}
                      </div>
                    </div>
                  </div>
                );
              })}

              {isTyping && (
                <div className="flex items-center gap-2 text-muted-foreground text-xs py-2">
                  <Avatar className="h-7 w-7 border">
                    <div className="h-full w-full bg-blue-600/10 text-blue-600 flex items-center justify-center">
                      <Bot className="h-3.5 w-3.5" />
                    </div>
                  </Avatar>
                  <div className="flex items-center gap-1.5 bg-muted/60 px-3 py-2 rounded-full">
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '0ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '150ms' }} />
                    <span className="h-1.5 w-1.5 rounded-full bg-blue-600 animate-bounce" style={{ animationDelay: '300ms' }} />
                    <span className="ml-1 text-[11px] font-medium">{activeConversation.name} is typing...</span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Suggested Quick Prompt Chips */}
          {activeConversation.suggestions && activeConversation.suggestions.length > 0 && (
            <div className="px-4 py-2 border-t bg-muted/10 overflow-x-auto flex items-center gap-2 no-scrollbar shrink-0">
              <span className="text-[11px] font-semibold text-muted-foreground shrink-0 flex items-center gap-1">
                <Sparkles className="h-3 w-3 text-blue-600" />
                Try asking:
              </span>
              {activeConversation.suggestions.map((s, idx) => (
                <Button
                  key={idx}
                  variant="outline"
                  size="sm"
                  onClick={() => handleSendMessage(s)}
                  className="h-7 text-xs px-2.5 py-0 shrink-0 rounded-full border-blue-500/20 hover:bg-blue-500/10 hover:text-blue-600 transition-colors"
                >
                  {s}
                </Button>
              ))}
            </div>
          )}

          {/* Input Bar */}
          <div className="p-4 border-t bg-card flex items-center gap-2 shrink-0">
            <Button variant="ghost" size="icon" className="shrink-0 text-muted-foreground hover:text-foreground">
              <Paperclip className="h-4 w-4" />
            </Button>
            <Input
              placeholder={`Message ${activeConversation.name}...`}
              value={inputMessage}
              onChange={(e) => setInputMessage(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault();
                  handleSendMessage();
                }
              }}
              className="flex-1 bg-muted/20 text-sm focus-visible:ring-blue-500"
            />
            <Button
              onClick={() => handleSendMessage()}
              disabled={!inputMessage.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white shrink-0 gap-1.5"
            >
              <Send className="h-4 w-4" />
              <span className="hidden sm:inline">Send</span>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}
