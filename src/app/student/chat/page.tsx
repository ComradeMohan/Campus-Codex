
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
} from 'firebase/firestore';
import type { UserProfile, Chat, ChatMessage } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MessageSquare, Users, AlertTriangle, ArrowLeft, Bell, BellOff, Circle, Plus, Share2, Trash2, Copy, Users2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';
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
}) => {
  return (
    <>
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare /> Chats
        </h2>
        <div className='flex items-center gap-1'>
            <Button variant="ghost" size="icon" title="Create a new group chat" onClick={onCreateGroup}>
                <Plus className="h-5 w-5"/>
            </Button>
            {isMobile && <SheetClose asChild><Button variant="ghost" size="icon" onClick={onCloseSidebar}><ArrowLeft/></Button></SheetClose>}
        </div>
      </div>
      <ScrollArea className="flex-1">
        {isLoadingUsers ? (
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
              !userProfile?.collegeId && <p className="p-4 text-sm text-muted-foreground text-center">No other users found in your college.</p>
            )}
          </ul>
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

const WelcomeScreen: React.FC = () => {
  return (
    <div className="flex flex-col h-full items-center justify-center text-center p-4">
      <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-2xl font-semibold">Select a conversation</h3>
      <p className="text-muted-foreground">Choose someone from the list to start chatting, or create a new group.</p>
    </div>
  );
};

export default function StudentChatPage() {
  const { userProfile, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const router = useRouter();
  const searchParams = useSearchParams();
  const isMobile = useIsMobile();
  
  const [allUsers, setAllUsers] = useState<UserProfile[]>([]);
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

  useEffect(() => {
    if (!userProfile?.collegeId || !userProfile.uid) return;
    
    setIsLoadingUsers(true);
    const usersRef = collection(db, 'users');
    const usersQuery = query(
        usersRef, 
        where('collegeId', '==', userProfile.collegeId),
        where('uid', '!=', userProfile.uid)
    );
    getDocs(usersQuery).then((querySnapshot) => {
      const fetchedUsers = querySnapshot.docs.map(doc => doc.data() as UserProfile);
      setAllUsers(fetchedUsers);
    }).catch(error => {
        console.error("Error fetching users: ", error);
        toast({ title: "Error", description: "Could not fetch users for chat.", variant: "destructive" });
    }).finally(() => setIsLoadingUsers(false));

    const chatsRef = collection(db, 'chats');
    const chatsQuery = query(chatsRef, where('participants', 'array-contains', userProfile.uid));
    const unsubscribeChats = onSnapshot(chatsQuery, (snapshot) => {
        const userChats = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() } as Chat));
        setChats(userChats);
    }, (error) => {
        console.error("Error fetching chats:", error);
        toast({ title: "Error", description: "Could not load chat data.", variant: "destructive" });
    });

    return () => unsubscribeChats();
  }, [userProfile?.collegeId, userProfile?.uid, toast]);


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

    const oneOnOneChats = allUsers.map(user => {
        const chatId = [userProfile.uid, user.uid].sort().join('_');
        const chatData = chats.find(c => c.id === chatId);
        return {
            id: chatId,
            type: 'user' as const,
            name: user.fullName,
            lastMessage: chatData?.lastMessage,
            updatedAt: chatData?.updatedAt as Timestamp,
            isUnread: chatData ? calculateUnread(chatData) : false,
            user,
        };
    });

    const groupChats = chats
        .filter(chat => chat.isGroupChat && chat.ownerId && chat.id !== userProfile.collegeId)
        .map(chat => {
            return {
                id: chat.id,
                type: 'group' as const,
                name: chat.name || 'Unnamed Group',
                lastMessage: chat.lastMessage,
                updatedAt: chat.updatedAt as Timestamp,
                isUnread: calculateUnread(chat),
                ownerId: chat.ownerId,
            };
        });

    const combined = [...oneOnOneChats, ...groupChats];
    
    return combined.sort((a, b) => {
        const timeA = a.updatedAt?.toMillis() || 0;
        const timeB = b.updatedAt?.toMillis() || 0;
        return timeB - timeA;
    });
  }, [allUsers, chats, userProfile]);

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
                newChatData = { ...newChatData, isGroupChat: true, name: "General College Chat" };
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
                <Button variant="ghost" size="icon"><Users/></Button>
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
              ) : <h3 className="font-semibold">Chat</h3>}
              <Button asChild variant="outline" size="icon" className="ml-auto h-8 w-8">
                <Link href="/student/dashboard"><ArrowLeft/></Link>
              </Button>
            </header>
            <main className="flex-1 flex flex-col overflow-hidden">
              {activeChat && userProfile ? (
                <ChatWindow
                  activeChat={activeChat} userProfile={userProfile} messages={messages} isLoadingMessages={isLoadingMessages}
                  isMobile={isMobile} handleToggleMute={handleToggleMute} handleShareGroup={handleShareGroup} handleDeleteGroup={handleDeleteGroup}
                  newMessage={newMessage} setNewMessage={setNewMessage} handleSendMessage={handleSendMessage} isSending={isSending}
                />
              ) : <WelcomeScreen />}
            </main>
          </div>
          <SheetContent side="left" className="p-0 flex flex-col w-[85vw] max-w-[320px]">
            <UserList
              userProfile={userProfile} isLoadingUsers={isLoadingUsers} sortedChats={sortedChats}
              generalChatData={generalChatData} isGeneralChatUnread={isGeneralChatUnread}
              handleSelectChat={handleSelectChat} activeChat={activeChat} isMobile={isMobile}
              onCloseSidebar={() => setIsSidebarOpen(false)} onCreateGroup={() => setIsCreateGroupOpen(true)}
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
