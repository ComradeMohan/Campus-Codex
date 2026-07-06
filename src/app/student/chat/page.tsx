
'use client';

import React, { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { db } from '@/lib/firebase';
import {
  collection,
  query,
  where,
  getDocs,
  doc,
  onSnapshot,
  addDoc,
  serverTimestamp,
  orderBy,
  updateDoc,
  writeBatch,
  getDoc,
  FieldValue,
  Timestamp,
  arrayUnion,
  deleteDoc,
  limit,
} from 'firebase/firestore';
import type { UserProfile, Chat, ChatMessage } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MessageSquare, Users, AlertTriangle, ArrowLeft, Bell, BellOff, Circle, Plus, Share2, Trash2, Copy, Users2, Search, X } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetClose, SheetTitle } from '@/components/ui/sheet';
import { useSearchParams, useRouter } from 'next/navigation';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
  DialogTrigger,
} from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter as AlertDialogFooterComponent, AlertDialogHeader as AlertDialogHeaderComponent, AlertDialogTitle as AlertDialogTitleComponent, AlertDialogTrigger as AlertDialogTriggerComponent } from '@/components/ui/alert-dialog';
import { moderateChatMessage } from '@/ai/flows/chat-moderator';


const getInitials = (name: string = ''): string => {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
};

interface UserListProps {
  userProfile: UserProfile | null;
  isLoadingUsers: boolean;
  sortedChats: DisplayableChat[];
  handleSelectChat: (chat: ActiveChat) => void;
  activeChat: ActiveChat | null;
  generalChatData: Chat | undefined;
  isGeneralChatUnread: boolean;
  isMobile: boolean;
  onCloseSidebar?: () => void;
  onCreateGroup: () => void;
  // Search fields
  showSearchInput: boolean;
  setShowSearchInput: (val: boolean) => void;
  searchQuery: string;
  setSearchQuery: (val: string) => void;
  searchResults: UserProfile[];
  isSearchingUsers: boolean;
  handleSelectSearchUser: (user: UserProfile) => void;
}

interface DisplayableChat {
    id: string;
    type: 'user' | 'group' | 'general';
    name: string;
    lastMessage?: Chat['lastMessage'];
    updatedAt?: Timestamp;
    isUnread: boolean;
    // User-specific
    user?: UserProfile;
    // Group-specific
    ownerId?: string;
}

interface ActiveChat {
  id: string; 
  name: string;
  type: 'group' | 'user' | 'general';
  user?: UserProfile; 
  ownerId?: string;
}

const UserList: React.FC<UserListProps> = ({ 
    userProfile, 
    isLoadingUsers, 
    sortedChats, 
    handleSelectChat, 
    activeChat, 
    generalChatData,
    isGeneralChatUnread,
    isMobile, 
    onCloseSidebar,
    onCreateGroup,
    showSearchInput,
    setShowSearchInput,
    searchQuery,
    setSearchQuery,
    searchResults,
    isSearchingUsers,
    handleSelectSearchUser,
}) => {
  return (
    <>
      {showSearchInput ? (
        <div className="p-3 border-b flex items-center gap-2">
          <Input
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search student or instructor..."
            className="h-9 text-xs"
            autoFocus
          />
          <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={() => { setShowSearchInput(false); setSearchQuery(''); }} title="Close search">
            <X className="h-4 w-4"/>
          </Button>
          {isMobile && onCloseSidebar && (
            <Button variant="ghost" size="icon" className="h-9 w-9 shrink-0" onClick={onCloseSidebar}>
              <ArrowLeft className="h-4 w-4"/>
            </Button>
          )}
        </div>
      ) : (
        <div className="p-4 border-b flex justify-between items-center">
          <h2 className="text-xl font-semibold flex items-center gap-2">
            <MessageSquare /> Chats
          </h2>
          <div className='flex items-center gap-1'>
              <Button variant="ghost" size="icon" title="Search users" onClick={() => setShowSearchInput(true)}>
                  <Search className="h-5 w-5"/>
              </Button>
              <Button variant="ghost" size="icon" title="Create a new group chat" onClick={onCreateGroup}>
                  <Plus className="h-5 w-5"/>
              </Button>
              {isMobile && onCloseSidebar && (
                <Button variant="ghost" size="icon" onClick={onCloseSidebar}>
                  <ArrowLeft className="h-5 w-5"/>
                </Button>
              )}
          </div>
        </div>
      )}
      
      <ScrollArea className="flex-1">
        {showSearchInput ? (
          <div className="space-y-1">
            {!searchQuery.trim() ? (
              <div className="p-8 text-center text-xs text-muted-foreground">
                <Search className="h-8 w-8 mx-auto mb-2 text-muted-foreground/40 animate-pulse" />
                <p>Type a name to search people in your college.</p>
              </div>
            ) : (
              <>
                <p className="px-4 py-2 text-[10px] font-bold uppercase tracking-wider text-muted-foreground font-mono">Search Results</p>
                {isSearchingUsers ? (
                  <div className="p-4 flex justify-center"><Loader2 className="h-5 w-5 animate-spin text-primary" /></div>
                ) : searchResults.length > 0 ? (
                  <ul className="divide-y divide-border/20">
                    {searchResults.map((user) => (
                      <li key={user.uid}>
                        <button
                          onClick={() => handleSelectSearchUser(user)}
                          className="w-full text-left p-3 hover:bg-muted transition-colors flex items-center gap-3"
                        >
                          <Avatar className="h-10 w-10">
                            <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                          </Avatar>
                          <div className="flex-1 min-w-0">
                            <p className="font-semibold truncate text-sm">{user.fullName}</p>
                            <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                          </div>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="p-4 text-xs text-muted-foreground text-center">No users found matching &ldquo;{searchQuery}&rdquo;</p>
                )}
              </>
            )}
          </div>
        ) : (
          isLoadingUsers ? (
            <div className="p-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
          ) : (
            <ul>
              {userProfile?.collegeId && (
                <li>
                  <button
                    onClick={() => handleSelectChat({ id: userProfile.collegeId!, name: 'General College Chat', type: 'general' })}
                    className={cn(
                      "w-full text-left p-3 hover:bg-muted transition-colors flex items-center gap-3",
                      activeChat?.type === 'general' && "bg-muted"
                    )}
                  >
                    <Avatar className="h-10 w-10 bg-primary text-primary-foreground flex items-center justify-center">
                      <Users className="h-5 w-5"/>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <div className="flex justify-between items-center">
                        <p className={cn("font-semibold truncate", isGeneralChatUnread && "font-bold")}>General College Chat</p>
                        {generalChatData?.lastMessage?.timestamp && (
                          <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                            {formatDistanceToNowStrict((generalChatData.lastMessage.timestamp as Timestamp).toDate(), { addSuffix: true })}
                          </p>
                        )}
                      </div>
                      <p className={cn("text-xs text-muted-foreground truncate", isGeneralChatUnread && "font-semibold text-foreground")}>
                        {generalChatData?.lastMessage?.text || "All members of your college"}
                      </p>
                    </div>
                    {isGeneralChatUnread && (
                       <Circle className="h-2.5 w-2.5 fill-primary text-primary flex-shrink-0" />
                    )}
                  </button>
                </li>
              )}
              {sortedChats.length > 0 ? (
                sortedChats.map((chat) => (
                  <li key={chat.id}>
                    <button
                      onClick={() => handleSelectChat(chat)}
                      className={cn(
                        "w-full text-left p-3 hover:bg-muted transition-colors flex items-center gap-3",
                        activeChat?.id === chat.id && "bg-muted"
                      )}
                    >
                      <Avatar className="h-10 w-10">
                        {chat.type === 'user' && chat.user ? (
                          <>
                             <AvatarImage src={undefined} alt={chat.name} data-ai-hint="person face" />
                             <AvatarFallback>{getInitials(chat.name)}</AvatarFallback>
                          </>
                        ) : (
                          <div className="h-full w-full bg-secondary text-secondary-foreground flex items-center justify-center"><Users2 className="h-5 w-5"/></div>
                        )}
                      </Avatar>
                      <div className="flex-1 min-w-0">
                        <div className="flex justify-between items-center">
                          <p className={cn("font-semibold truncate", chat.isUnread && "font-bold")}>{chat.name}</p>
                          {chat.updatedAt && (
                            <p className="text-xs text-muted-foreground flex-shrink-0 ml-2">
                              {formatDistanceToNowStrict(chat.updatedAt.toDate(), { addSuffix: true })}
                            </p>
                          )}
                        </div>
                        <p className={cn("text-xs text-muted-foreground truncate", chat.isUnread && "font-semibold text-foreground")}>
                          {chat.lastMessage?.text || `Chat with ${chat.type === 'user' ? chat.user?.role : 'group'}`}
                        </p>
                      </div>
                      {chat.isUnread && (
                        <Circle className="h-2.5 w-2.5 fill-primary text-primary flex-shrink-0" />
                      )}
                    </button>
                  </li>
                ))
              ) : (
                !userProfile?.collegeId && <p className="p-4 text-sm text-muted-foreground text-center">No active chats found.</p>
              )}
            </ul>
          )
        )}
      </ScrollArea>
    </>
  );
};

interface ChatWindowProps {
  activeChat: ActiveChat;
  userProfile: UserProfile;
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  isMobile: boolean;
  handleToggleMute: () => void;
  handleShareGroup: () => void;
  handleDeleteGroup: () => void;
  newMessage: string;
  setNewMessage: (value: string) => void;
  handleSendMessage: () => void;
  isSending: boolean;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  activeChat,
  userProfile,
  messages,
  isLoadingMessages,
  isMobile,
  handleToggleMute,
  handleShareGroup,
  handleDeleteGroup,
  newMessage,
  setNewMessage,
  handleSendMessage,
  isSending,
}) => {
  const isMuted = userProfile?.chatNotificationSettings?.[activeChat.id] === false;
  const isOwner = activeChat.type === 'group' && activeChat.ownerId === userProfile.uid;
  const scrollAreaRef = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    const viewport = scrollAreaRef.current?.querySelector<HTMLDivElement>('[data-radix-scroll-area-viewport]');
    if (viewport) {
      setTimeout(() => {
        if (viewport) {
            viewport.scrollTop = viewport.scrollHeight;
        }
      }, 50);
    }
  }, [messages, activeChat]);

  return (
    <>
      {!isMobile && (
        <header className="p-4 border-b flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {activeChat.type === 'general' ? (
                <div className="h-full w-full bg-primary text-primary-foreground flex items-center justify-center"><Users className="h-5 w-5"/></div>
            ) : activeChat.type === 'group' ? (
                <div className="h-full w-full bg-secondary text-secondary-foreground flex items-center justify-center"><Users2 className="h-5 w-5"/></div>
            ) : (
              <>
                <AvatarImage src={undefined} alt={activeChat.name} />
                <AvatarFallback>{getInitials(activeChat.name)}</AvatarFallback>
              </>
            )}
          </Avatar>
          <div>
            <h3 className="font-semibold">{activeChat.name}</h3>
            {activeChat.type === 'user' ? (
              <p className="text-sm text-muted-foreground capitalize">{activeChat.user?.role}</p>
            ) : (
              <p className="text-sm text-muted-foreground">Study-related discussion only. Be respectful.</p>
            )}
          </div>
          <div className='ml-auto flex items-center gap-1'>
            {isOwner && (
                <>
                    <Button variant="ghost" size="icon" onClick={handleShareGroup} title="Share Invite Link">
                        <Share2 className="h-5 w-5 text-blue-500"/>
                    </Button>
                    <AlertDialog>
                        <AlertDialogTriggerComponent asChild>
                            <Button variant="ghost" size="icon" title="Delete Group">
                                <Trash2 className="h-5 w-5 text-destructive"/>
                            </Button>
                        </AlertDialogTriggerComponent>
                        <AlertDialogContent>
                            <AlertDialogHeaderComponent>
                                <AlertDialogTitleComponent>Are you sure you want to delete this group?</AlertDialogTitleComponent>
                                <AlertDialogDescription>
                                    This action cannot be undone. This will permanently delete the group and all its messages for everyone.
                                </AlertDialogDescription>
                            </AlertDialogHeaderComponent>
                            <AlertDialogFooterComponent>
                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                <AlertDialogAction onClick={handleDeleteGroup}>Delete</AlertDialogAction>
                            </AlertDialogFooterComponent>
                        </AlertDialogContent>
                    </AlertDialog>
                </>
            )}
            {activeChat.type === 'general' && (
                <Button variant="ghost" size="icon" onClick={handleToggleMute} title={isMuted ? "Unmute Notifications" : "Mute Notifications"}>
                {isMuted ? <BellOff className="h-5 w-5"/> : <Bell className="h-5 w-5"/>}
                </Button>
            )}
          </div>
        </header>
      )}
      <ScrollArea ref={scrollAreaRef} className="flex-1 p-4 bg-muted/20">
        <div className="space-y-4">
          {isLoadingMessages ? (
            <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
          ) : messages.length === 0 ? (
            <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</p>
          ) : (
            messages.map((msg) => (
              <div
                key={msg.id}
                className={cn("flex items-end gap-2", msg.senderId === userProfile.uid ? "justify-end" : "justify-start")}
              >
                {msg.senderId !== userProfile.uid && (
                  <Avatar className="h-8 w-8">
                    <AvatarImage src={undefined} alt={msg.senderName} />
                    <AvatarFallback>{getInitials(msg.senderName)}</AvatarFallback>
                  </Avatar>
                )}
                <div className={cn(
                  "p-3 rounded-lg max-w-xs md:max-w-md", 
                  msg.senderId === userProfile.uid ? "bg-primary text-primary-foreground" : "bg-card border"
                )}>
                  <p className="text-sm break-words">{msg.text}</p>
                  <p className={cn("text-xs mt-1 text-right", msg.senderId === userProfile.uid ? "text-primary-foreground/70" : "text-muted-foreground")}>
                    {msg.createdAt ? formatDistanceToNowStrict((msg.createdAt as any).toDate(), { addSuffix: true }) : ''}
                  </p>
                </div>
              </div>
            ))
          )}
        </div>
      </ScrollArea>
      <div className="p-2 md:p-4 border-t bg-card">
        <form
          onSubmit={(e) => { e.preventDefault(); handleSendMessage(); }}
          className="flex items-center gap-2"
        >
          <Input
            value={newMessage}
            onChange={(e) => setNewMessage(e.target.value)}
            placeholder="Type a message..."
            autoComplete="off"
            disabled={isSending}
          />
          <Button type="submit" disabled={isSending || !newMessage.trim()}>
            {isSending && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
            <Send className="h-4 w-4" />
          </Button>
        </form>
      </div>
    </>
  );
};

interface WelcomeScreenProps {
  onOpenChats?: () => void;
  isMobile?: boolean;
}

const WelcomeScreen: React.FC<WelcomeScreenProps> = ({ onOpenChats, isMobile }) => {
  return (
    <div className="flex flex-col h-full items-center justify-center text-center p-6 space-y-4 max-w-sm mx-auto">
      <div className="p-4 rounded-full bg-primary/10 text-primary w-fit mx-auto">
        <MessageSquare className="h-10 w-10" />
      </div>
      <div className="space-y-1.5">
        <h3 className="text-xl font-bold text-foreground">Select a conversation</h3>
        <p className="text-xs text-muted-foreground leading-relaxed font-sans">
          Choose someone from the chats list to start learning together, or lookup new students and instructors.
        </p>
      </div>
      {isMobile && onOpenChats && (
        <Button onClick={onOpenChats} className="w-full gap-2 bg-primary hover:bg-primary/95 text-white font-bold rounded-xl py-5 shadow-lg shadow-primary/20 hover:scale-[1.01] active:scale-[0.99] transition-all">
          <Users className="h-4 w-4"/> View Conversations
        </Button>
      )}
    </div>
  );
};

export default function StudentChatPage() {
  const { userProfile, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  
  // Search and debounce states
  const [showSearchInput, setShowSearchInput] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<UserProfile[]>([]);
  const [isSearchingUsers, setIsSearchingUsers] = useState(false);
  const [activeChatProfiles, setActiveChatProfiles] = useState<{ [uid: string]: UserProfile }>({});

  const [chats, setChats] = useState<Chat[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  
  const [isCreateGroupOpen, setIsCreateGroupOpen] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [isCreatingGroup, setIsCreatingGroup] = useState(false);

  useEffect(() => {
    const joinGroupId = searchParams.get('joinGroup');
    if (joinGroupId && userProfile) {
      const joinGroup = async () => {
        const chatDocRef = doc(db, 'chats', joinGroupId);
        try {
          const chatDoc = await getDoc(chatDocRef);
          if (!chatDoc.exists() || !chatDoc.data()?.isGroupChat) {
            toast({ title: "Invalid Link", description: "The group you are trying to join does not exist.", variant: "destructive" });
            return;
          }
          await updateDoc(chatDocRef, {
            participants: arrayUnion(userProfile.uid)
          });
          toast({ title: "Group Joined!", description: `You have been added to "${chatDoc.data()?.name}".` });
          setActiveChat({ id: joinGroupId, name: chatDoc.data()?.name || 'Group', type: 'group' });
        } catch (error) {
          console.error("Error joining group:", error);
          toast({ title: "Error", description: "Could not join the group.", variant: "destructive" });
        } finally {
          router.replace('/student/chat', { scroll: false });
        }
      };
      joinGroup();
    }
  }, [searchParams, userProfile, router, toast]);

  // Subscribe to active chats
  useEffect(() => {
    if (!userProfile?.collegeId || !userProfile.uid) return;
    
    setIsLoadingUsers(true);
    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(chatsRef, where('participants', 'array-contains', userProfile.uid));
    const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
        const userChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
        setChats(userChats);
        setIsLoadingUsers(false);
    }, (error) => {
        console.error("Error fetching chats:", error);
        toast({ title: "Error", description: "Could not load chat data.", variant: "destructive" });
        setIsLoadingUsers(false);
    });

    return () => unsubscribeChats();
  }, [userProfile?.collegeId, userProfile?.uid, toast]);

  // Fetch profiles for users in active chats
  useEffect(() => {
    if (!userProfile?.uid || chats.length === 0) return;
    
    const otherUserUids = chats
      .filter(c => !c.isGroupChat)
      .map(c => c.participants.find(id => id !== userProfile.uid))
      .filter((uid): uid is string => !!uid);
      
    if (otherUserUids.length === 0) return;
    
    const uidsToFetch = otherUserUids.filter(uid => !activeChatProfiles[uid]);
    if (uidsToFetch.length === 0) return;
    
    const fetchProfiles = async () => {
      try {
        const usersRef = collection(db, 'users');
        const chunks: string[][] = [];
        for (let i = 0; i < uidsToFetch.length; i += 30) {
          chunks.push(uidsToFetch.slice(i, i + 30));
        }
        
        const newProfiles: { [uid: string]: UserProfile } = {};
        for (const chunk of chunks) {
          const q = query(usersRef, where('uid', 'in', chunk));
          const snap = await getDocs(q);
          snap.docs.forEach(docSnap => {
            const u = docSnap.data() as UserProfile;
            newProfiles[u.uid] = u;
          });
        }
        
        setActiveChatProfiles(prev => ({ ...prev, ...newProfiles }));
      } catch (err) {
        console.error("Error fetching active chat user profiles:", err);
      }
    };
    
    fetchProfiles();
  }, [chats, userProfile?.uid, activeChatProfiles]);

  // Debounced search logic for looking up new users
  useEffect(() => {
    if (!searchQuery.trim() || !userProfile?.collegeId) {
      setSearchResults([]);
      return;
    }

    setIsSearchingUsers(true);
    const delayDebounce = setTimeout(async () => {
      try {
        const queryText = searchQuery.trim();
        const usersRef = collection(db, 'users');
        const q = query(
          usersRef,
          where('collegeId', '==', userProfile.collegeId),
          orderBy('fullName'),
          where('fullName', '>=', queryText),
          where('fullName', '<=', queryText + '\uf8ff'),
          limit(20)
        );
        
        const querySnapshot = await getDocs(q);
        const fetched = querySnapshot.docs
          .map(doc => doc.data() as UserProfile)
          .filter(u => u.uid !== userProfile.uid); // Exclude self
          
        setSearchResults(fetched);
      } catch (err) {
        console.error("Error searching users:", err);
      } finally {
        setIsSearchingUsers(false);
      }
    }, 500); // 500ms delay debouncing effect

    return () => clearTimeout(delayDebounce);
  }, [searchQuery, userProfile?.collegeId, userProfile?.uid]);

  const handleSelectSearchUser = (user: UserProfile) => {
    const chatId = [userProfile.uid, user.uid].sort().join('_');
    setActiveChatProfiles(prev => ({ ...prev, [user.uid]: user }));
    
    handleSelectChat({
      id: chatId,
      name: user.fullName,
      type: 'user',
      user
    });
    
    setShowSearchInput(false);
    setSearchQuery('');
    setSearchResults([]);
  };

  useEffect(() => {
    if (!activeChat?.id) {
      setMessages([]);
      return;
    };

    setIsLoadingMessages(true);
    const messagesRef = collection(db, 'chats', activeChat.id, 'messages');
    const q = query(messagesRef, orderBy('createdAt', 'asc'));

    const unsubscribe = onSnapshot(q, (querySnapshot) => {
      const fetchedMessages = querySnapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as ChatMessage));
      setMessages(fetchedMessages);
      setIsLoadingMessages(false);
    }, (error) => {
        console.error("Error fetching messages:", error);
        toast({ title: "Error", description: "Could not load messages.", variant: "destructive" });
        setIsLoadingMessages(false);
    });

    return () => unsubscribe();
  }, [activeChat?.id, toast]);
  
  const sortedChats = React.useMemo<DisplayableChat[]>(() => {
    if (!userProfile) return [];

    const calculateUnread = (chat: Chat) => {
        if (!chat?.updatedAt) return false;
        if (chat.lastMessage?.senderId === userProfile.uid) return false;
        const lastMessageTimestamp = (chat.updatedAt as Timestamp).toMillis();
        const userLastSeenTimestamp = (chat.lastSeen?.[userProfile.uid] as Timestamp)?.toMillis();
        if (!userLastSeenTimestamp) return true;
        return lastMessageTimestamp > userLastSeenTimestamp;
    }

    const activeChatsList = chats
        .filter(chat => chat.id !== userProfile.collegeId) // exclude general chat
        .map(chat => {
            if (chat.isGroupChat) {
                return {
                    id: chat.id,
                    type: 'group' as const,
                    name: chat.name || 'Unnamed Group',
                    lastMessage: chat.lastMessage,
                    updatedAt: chat.updatedAt as Timestamp,
                    isUnread: calculateUnread(chat),
                    ownerId: chat.ownerId,
                };
            } else {
                const otherUserUid = chat.participants.find(id => id !== userProfile.uid);
                const otherUser = otherUserUid ? activeChatProfiles[otherUserUid] : undefined;
                return {
                    id: chat.id,
                    type: 'user' as const,
                    name: otherUser?.fullName || 'Loading...',
                    lastMessage: chat.lastMessage,
                    updatedAt: chat.updatedAt as Timestamp,
                    isUnread: calculateUnread(chat),
                    user: otherUser,
                };
            }
        });

    return activeChatsList.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis() || 0;
        const timeB = b.updatedAt?.toMillis() || 0;
        return timeB - timeA;
    });
  }, [chats, userProfile, activeChatProfiles]);

  const generalChatData = React.useMemo(() => {
    return chats.find(c => c.id === userProfile?.collegeId);
  }, [chats, userProfile?.collegeId]);

  const isGeneralChatUnread = React.useMemo(() => {
    if (!userProfile || !generalChatData?.updatedAt) return false;
    if (generalChatData.lastMessage?.senderId === userProfile.uid) return false;
    const lastMessageTimestamp = (generalChatData.updatedAt as Timestamp).toMillis();
    const userLastSeenTimestamp = (generalChatData.lastSeen?.[userProfile.uid] as Timestamp)?.toMillis();
    if (!userLastSeenTimestamp) return true;
    return lastMessageTimestamp > userLastSeenTimestamp;
  }, [generalChatData, userProfile]);

  const handleSelectChat = async (chat: ActiveChat) => {
    setActiveChat(chat);
    if (isMobile) setIsSidebarOpen(false);
    if (userProfile?.uid && chat.id) {
        const chatDocRef = doc(db, 'chats', chat.id);
        try {
            const docSnap = await getDoc(chatDocRef);
            if (docSnap.exists()) {
                await updateDoc(chatDocRef, { [`lastSeen.${userProfile.uid}`]: serverTimestamp() });
            }
        } catch (err) {
            console.error("Error marking chat as read:", err);
        }
    }
  };
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userProfile || !activeChat) return;

    const sentMessageText = newMessage.trim();
    setIsSending(true);
    setNewMessage(''); // Optimistically clear the input

    const messageData: Omit<ChatMessage, 'id' | 'createdAt'> = {
        chatId: activeChat.id,
        senderId: userProfile.uid,
        senderName: userProfile.fullName,
        text: sentMessageText,
    };
    const chatDocRef = doc(db, 'chats', activeChat.id);
    const messagesCollectionRef = collection(chatDocRef, 'messages');
    
    try {
        const chatDocSnap = await getDoc(chatDocRef);
        const batch = writeBatch(db);
        const newMessageRef = doc(messagesCollectionRef);
        batch.set(newMessageRef, { ...messageData, createdAt: serverTimestamp() });
        const lastMessageUpdate = { text: sentMessageText, timestamp: serverTimestamp(), senderId: userProfile.uid };
        const lastSeenUpdate = { [`lastSeen.${userProfile.uid}`]: serverTimestamp() };
        
        let chatTopicForModeration = 'a one-on-one student chat';

        if (!chatDocSnap.exists()) {
            let newChatData: Omit<Chat, 'id'> = { createdAt: serverTimestamp(), updatedAt: serverTimestamp(), lastMessage: lastMessageUpdate, lastSeen: { [userProfile.uid]: serverTimestamp() }, participants: [], collegeId: userProfile.collegeId };
            if (activeChat.type === 'user' && activeChat.user) {
                 newChatData = { ...newChatData, isGroupChat: false, participants: [userProfile.uid, activeChat.user.uid] };
            } else if (activeChat.type === 'group') {
                newChatData = { ...newChatData, isGroupChat: true, participants: [userProfile.uid], name: activeChat.name, ownerId: activeChat.ownerId };
                chatTopicForModeration = activeChat.name;
            } else if (activeChat.type === 'general') {
                // General Chat: add first sender to participants so rules allow access
                newChatData = { ...newChatData, isGroupChat: true, name: "General College Chat", participants: [userProfile.uid] };
                chatTopicForModeration = "General College Chat for study-related topics";
            }
            batch.set(chatDocRef, newChatData);
        } else {
            if (activeChat.type === 'group') chatTopicForModeration = activeChat.name;
            if (activeChat.type === 'general') chatTopicForModeration = "General College Chat for study-related topics";
            batch.update(chatDocRef, { lastMessage: lastMessageUpdate, updatedAt: serverTimestamp(), ...lastSeenUpdate });
        }
        await batch.commit();

        // --- AI Moderation Call ---
        if (activeChat.type === 'group' || activeChat.type === 'general') {
            (async () => {
                try {
                    const moderationResult = await moderateChatMessage({
                        messageText: sentMessageText,
                        chatTopic: chatTopicForModeration,
                    });

                    if (moderationResult.isOffTopic || moderationResult.isViolation) {
                        toast({
                            title: 'Message Flagged for Review',
                            description: `Reason: ${moderationResult.reason}. Your message may be removed by a moderator if it violates community guidelines.`,
                            variant: 'destructive',
                            duration: 8000
                        });
                        // In a real app, a Cloud Function would listen for new messages,
                        // run this check, and delete the message document from Firestore if it's flagged.
                        // Example: await deleteDoc(newMessageRef);
                    }
                } catch (moderationError) {
                    console.warn("AI Moderation call failed:", moderationError);
                    // Fail silently, don't block the user experience if moderation fails.
                }
            })();
        }

    } catch(error) {
        console.error("Error sending message:", error);
        toast({ title: "Error", description: "Message could not be sent.", variant: "destructive" });
        setNewMessage(sentMessageText); // Restore user's text on failure
    } finally {
        setIsSending(false);
    }
  };

  const handleToggleMute = async () => {
    if (!userProfile || !activeChat || activeChat.type !== 'general') return;
    const isCurrentlyMuted = userProfile.chatNotificationSettings?.[activeChat.id] === false;
    const newMutedState = !isCurrentlyMuted;
    const userDocRef = doc(db, 'users', userProfile.uid);
    try {
        await updateDoc(userDocRef, { [`chatNotificationSettings.${activeChat.id}`]: !newMutedState });
        await refreshUserProfile();
        toast({
            title: newMutedState ? 'Chat Muted' : 'Notifications Enabled',
            description: `You will ${newMutedState ? 'no longer' : 'now'} receive notifications for this chat.`,
        });
    } catch (error) {
        console.error("Error updating notification settings:", error);
        toast({ title: "Error", description: "Could not update notification settings.", variant: "destructive" });
    }
  };
  
  const handleCreateGroup = async () => {
    if (!newGroupName.trim() || !userProfile) return;
    setIsCreatingGroup(true);
    try {
      const chatsCollectionRef = collection(db, 'chats');
      const newGroupData = {
        name: newGroupName.trim(),
        isGroupChat: true,
        ownerId: userProfile.uid,
        participants: [userProfile.uid],
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
        collegeId: userProfile.collegeId,
      };
      const newDocRef = await addDoc(chatsCollectionRef, newGroupData);
      const inviteLink = `${window.location.origin}/student/chat?joinGroup=${newDocRef.id}`;
      navigator.clipboard.writeText(inviteLink);
      toast({
        title: 'Group Created!',
        description: 'Invitation link copied to your clipboard.',
      });
      setIsCreateGroupOpen(false);
      setNewGroupName('');
    } catch (error) {
      console.error("Error creating group:", error);
      toast({ title: 'Error', description: 'Failed to create group.', variant: 'destructive' });
    } finally {
      setIsCreatingGroup(false);
    }
  };

  const handleShareGroup = () => {
    if (!activeChat || activeChat.type !== 'group') return;
    const inviteLink = `${window.location.origin}/student/chat?joinGroup=${activeChat.id}`;
    navigator.clipboard.writeText(inviteLink);
    toast({ title: "Invite Link Copied!", description: "Share this link with other students in your college."});
  };

  const handleDeleteGroup = async () => {
    if (!activeChat || activeChat.type !== 'group' || !userProfile || activeChat.ownerId !== userProfile.uid) {
        toast({ title: 'Error', description: 'You are not the owner of this group.', variant: 'destructive'});
        return;
    }
    try {
        await deleteDoc(doc(db, 'chats', activeChat.id));
        toast({ title: 'Group Deleted', description: `Group "${activeChat.name}" has been deleted.`});
        setActiveChat(null);
    } catch (error) {
        console.error("Error deleting group:", error);
        toast({ title: 'Error', description: 'Failed to delete group.', variant: 'destructive'});
    }
  };

  return (
    <>
    <div className={cn("flex h-[calc(100vh-10rem)] border rounded-lg bg-card overflow-hidden", isMobile && "h-[calc(100vh-6rem)]")}>
      {isMobile ? (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <div className="w-full flex flex-col">
            <header className="p-2 border-b flex items-center gap-2">
              <SheetTrigger asChild>
                <Button variant="outline" size="sm" className="gap-1.5 border-border/60 hover:bg-primary/5 hover:text-primary rounded-xl px-3 font-semibold text-xs h-9">
                  <Users className="h-4 w-4 text-primary" /> Active Chats
                </Button>
              </SheetTrigger>
              {activeChat ? (
                <>
                  <Avatar className="h-9 w-9">
                    {activeChat.type === 'general' ? <div className="h-full w-full bg-primary text-primary-foreground flex items-center justify-center"><Users className="h-5 w-5"/></div>
                    : activeChat.type === 'group' ? <div className="h-full w-full bg-secondary text-secondary-foreground flex items-center justify-center"><Users2 className="h-5 w-5"/></div>
                    : <><AvatarImage src={undefined} alt={activeChat.name} /><AvatarFallback>{getInitials(activeChat.name)}</AvatarFallback></>
                    }
                  </Avatar>
                  <div>
                    <h3 className="font-semibold text-sm">{activeChat.name}</h3>
                    {activeChat.type === 'user' && <p className="text-xs text-muted-foreground capitalize">{activeChat.user?.role}</p>}
                  </div>
                </>
              ) : <h3 className="font-semibold text-sm ml-1 text-muted-foreground">Select Chat</h3>}
              <Button asChild variant="outline" size="icon" className="ml-auto h-8 w-8">
                <Link href="/student/dashboard"><ArrowLeft className="h-4 w-4"/></Link>
              </Button>
            </header>
            <main className="flex-1 flex flex-col overflow-hidden">
              {activeChat && userProfile ? (
                <ChatWindow
                  activeChat={activeChat} userProfile={userProfile} messages={messages} isLoadingMessages={isLoadingMessages}
                  isMobile={isMobile} handleToggleMute={handleToggleMute} handleShareGroup={handleShareGroup} handleDeleteGroup={handleDeleteGroup}
                  newMessage={newMessage} setNewMessage={setNewMessage} handleSendMessage={handleSendMessage} isSending={isSending}
                />
              ) : <WelcomeScreen isMobile={isMobile} onOpenChats={() => setIsSidebarOpen(true)} />}
            </main>
          </div>
          <SheetContent side="left" className="p-0 flex flex-col w-[85vw] max-w-[320px]">
            <SheetTitle className="sr-only">Chat Conversations Drawer</SheetTitle>
            <UserList
              userProfile={userProfile} isLoadingUsers={isLoadingUsers} sortedChats={sortedChats}
              generalChatData={generalChatData} isGeneralChatUnread={isGeneralChatUnread}
              handleSelectChat={handleSelectChat} activeChat={activeChat} isMobile={isMobile}
              onCloseSidebar={() => setIsSidebarOpen(false)} onCreateGroup={() => setIsCreateGroupOpen(true)}
              showSearchInput={showSearchInput} setShowSearchInput={setShowSearchInput}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              searchResults={searchResults} isSearchingUsers={isSearchingUsers}
              handleSelectSearchUser={handleSelectSearchUser}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <>
          <aside className="w-1/3 border-r flex flex-col">
            <UserList
              userProfile={userProfile} isLoadingUsers={isLoadingUsers} sortedChats={sortedChats}
              generalChatData={generalChatData} isGeneralChatUnread={isGeneralChatUnread}
              handleSelectChat={handleSelectChat} activeChat={activeChat} isMobile={isMobile}
              onCreateGroup={() => setIsCreateGroupOpen(true)}
              showSearchInput={showSearchInput} setShowSearchInput={setShowSearchInput}
              searchQuery={searchQuery} setSearchQuery={setSearchQuery}
              searchResults={searchResults} isSearchingUsers={isSearchingUsers}
              handleSelectSearchUser={handleSelectSearchUser}
            />
          </aside>
          <main className="w-2/3 flex flex-col overflow-hidden">
            {activeChat && userProfile ? (
              <ChatWindow
                activeChat={activeChat} userProfile={userProfile} messages={messages} isLoadingMessages={isLoadingMessages}
                isMobile={isMobile} handleToggleMute={handleToggleMute} handleShareGroup={handleShareGroup} handleDeleteGroup={handleDeleteGroup}
                newMessage={newMessage} setNewMessage={setNewMessage} handleSendMessage={handleSendMessage} isSending={isSending}
              />
            ) : <WelcomeScreen />}
          </main>
        </>
      )}
    </div>
     <Dialog open={isCreateGroupOpen} onOpenChange={setIsCreateGroupOpen}>
        <DialogContent>
            <DialogHeader>
                <DialogTitle>Create New Group</DialogTitle>
                <DialogDescription>
                    Give your new study group a name. You can share the invite link after creation.
                </DialogDescription>
            </DialogHeader>
            <div className="py-4">
                <Label htmlFor="group-name" className="text-right">
                    Group Name
                </Label>
                <Input
                    id="group-name"
                    value={newGroupName}
                    onChange={(e) => setNewGroupName(e.target.value)}
                    className="col-span-3 mt-2"
                    placeholder="e.g., Data Structures Study Group"
                />
            </div>
            <DialogFooter>
                <DialogClose asChild><Button type="button" variant="outline">Cancel</Button></DialogClose>
                <Button onClick={handleCreateGroup} disabled={isCreatingGroup || !newGroupName.trim()}>
                    {isCreatingGroup && <Loader2 className="mr-2 h-4 w-4 animate-spin"/>}
                    Create Group
                </Button>
            </DialogFooter>
        </DialogContent>
    </Dialog>
    </>
  );
}
