
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
  limit,
  setDoc,
  updateDoc,
  writeBatch,
  getDoc,
  FieldValue,
} from 'firebase/firestore';
import type { UserProfile, Chat, ChatMessage } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MessageSquare, Users, AlertTriangle, ArrowLeft, Bell, BellOff } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';

interface ActiveChat {
  id: string; // The document ID for the chat
  name: string; // The display name for the chat header
  type: 'group' | 'user';
  user?: UserProfile; // The other user in a 1-on-1 chat
}

const getInitials = (name: string = ''): string => {
  return name.split(' ').map((n) => n[0]).join('').toUpperCase();
};

// --- Child Components ---

interface UserListProps {
  userProfile: UserProfile | null;
  isLoadingUsers: boolean;
  users: UserProfile[];
  handleSelectChat: (chat: ActiveChat) => void;
  activeChat: ActiveChat | null;
  isMobile: boolean;
  onCloseSidebar?: () => void;
}

const UserList: React.FC<UserListProps> = ({ userProfile, isLoadingUsers, users, handleSelectChat, activeChat, isMobile, onCloseSidebar }) => {
  return (
    <>
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <MessageSquare /> Chats
        </h2>
        {isMobile && <SheetClose asChild><Button variant="ghost" size="icon" onClick={onCloseSidebar}><ArrowLeft/></Button></SheetClose>}
      </div>
      <ScrollArea className="flex-1">
        {isLoadingUsers ? (
          <div className="p-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : (
          <ul>
            {userProfile?.collegeId && (
              <li>
                <button
                  onClick={() => handleSelectChat({ id: userProfile.collegeId!, name: 'General College Chat', type: 'group' })}
                  className={cn(
                    "w-full text-left p-3 hover:bg-muted transition-colors flex items-center gap-3",
                    activeChat?.type === 'group' && "bg-muted"
                  )}
                >
                  <Avatar className="h-10 w-10 bg-primary text-primary-foreground flex items-center justify-center">
                    <Users className="h-5 w-5"/>
                  </Avatar>
                  <div className="flex-1 min-w-0">
                    <p className="font-semibold truncate">General College Chat</p>
                    <p className="text-xs text-muted-foreground">All members of your college</p>
                  </div>
                </button>
              </li>
            )}
            {users.length > 0 ? (
              users.map(user => (
                <li key={user.uid}>
                  <button
                    onClick={() => handleSelectChat({ id: [userProfile!.uid, user.uid].sort().join('_'), name: user.fullName, type: 'user', user })}
                    className={cn(
                      "w-full text-left p-3 hover:bg-muted transition-colors flex items-center gap-3",
                      activeChat?.type === 'user' && activeChat.user?.uid === user.uid && "bg-muted"
                    )}
                  >
                    <Avatar className="h-10 w-10">
                      <AvatarImage src={undefined} alt={user.fullName} data-ai-hint="person face" />
                      <AvatarFallback>{getInitials(user.fullName)}</AvatarFallback>
                    </Avatar>
                    <div className="flex-1 min-w-0">
                      <p className="font-semibold truncate">{user.fullName}</p>
                      <p className="text-xs text-muted-foreground capitalize">{user.role}</p>
                    </div>
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


const WelcomeScreen: React.FC = () => {
  return (
    <div className="flex flex-col h-full items-center justify-center text-center p-4">
      <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
      <h3 className="text-2xl font-semibold">Select a conversation</h3>
      <p className="text-muted-foreground">Choose someone from the list to start chatting.</p>
    </div>
  );
};

interface ChatWindowProps {
  activeChat: ActiveChat;
  userProfile: UserProfile;
  messages: ChatMessage[];
  isLoadingMessages: boolean;
  isMobile: boolean;
  handleToggleMute: () => void;
  newMessage: string;
  setNewMessage: (value: string) => void;
  handleSendMessage: () => void;
  isSending: boolean;
  messageEndRef: React.RefObject<HTMLDivElement>;
}

const ChatWindow: React.FC<ChatWindowProps> = ({
  activeChat,
  userProfile,
  messages,
  isLoadingMessages,
  isMobile,
  handleToggleMute,
  newMessage,
  setNewMessage,
  handleSendMessage,
  isSending,
  messageEndRef,
}) => {
  const isMuted = userProfile?.chatNotificationSettings?.[activeChat.id] === false;

  return (
    <>
      {!isMobile && (
        <header className="p-4 border-b flex items-center gap-3">
          <Avatar className="h-10 w-10">
            {activeChat.type === 'group' ? (
              <div className="h-full w-full bg-primary text-primary-foreground flex items-center justify-center"><Users className="h-5 w-5"/></div>
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
          {activeChat.type === 'group' && (
            <Button variant="ghost" size="icon" className="ml-auto" onClick={handleToggleMute} title={isMuted ? "Unmute Notifications" : "Mute Notifications"}>
              {isMuted ? <BellOff className="h-5 w-5"/> : <Bell className="h-5 w-5"/>}
            </Button>
          )}
        </header>
      )}
      <ScrollArea className="flex-1 p-4 bg-muted/20">
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
          <div ref={messageEndRef} />
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


// --- Main Page Component ---
export default function StudentChatPage() {
  const { userProfile, refreshUserProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [activeChat, setActiveChat] = useState<ActiveChat | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [newMessage, setNewMessage] = useState('');
  
  const [isLoadingUsers, setIsLoadingUsers] = useState(true);
  const [isLoadingMessages, setIsLoadingMessages] = useState(false);
  const [isSending, setIsSending] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(false);

  const messageEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    messageEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  useEffect(() => {
    if (!userProfile?.collegeId) return;
    setIsLoadingUsers(true);
    const usersRef = collection(db, 'users');
    const q = query(
        usersRef, 
        where('collegeId', '==', userProfile.collegeId),
        where('uid', '!=', userProfile.uid)
    );
    getDocs(q).then((querySnapshot) => {
      const fetchedUsers = querySnapshot.docs.map(doc => doc.data() as UserProfile);
      setUsers(fetchedUsers.sort((a,b) => a.role.localeCompare(b.role) || a.fullName.localeCompare(b.fullName)));
      setIsLoadingUsers(false);
    }).catch(error => {
        console.error("Error fetching users: ", error);
        toast({ title: "Error", description: "Could not fetch users for chat.", variant: "destructive" });
        setIsLoadingUsers(false);
    });
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

  const handleSelectChat = (chat: ActiveChat) => {
    setActiveChat(chat);
    if (isMobile) setIsSidebarOpen(false);
  };
  
  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userProfile || !activeChat) return;
    setIsSending(true);

    const messageData: Omit<ChatMessage, 'id' | 'createdAt'> = {
        chatId: activeChat.id,
        senderId: userProfile.uid,
        senderName: userProfile.fullName,
        text: newMessage.trim(),
    };
    
    const chatDocRef = doc(db, 'chats', activeChat.id);
    const messagesCollectionRef = collection(chatDocRef, 'messages');

    try {
        const chatDocSnap = await getDoc(chatDocRef);
        const batch = writeBatch(db);
        
        const newMessageRef = doc(messagesCollectionRef);
        batch.set(newMessageRef, { ...messageData, createdAt: serverTimestamp() });

        const lastMessageUpdate = {
            text: newMessage.trim(),
            timestamp: serverTimestamp(),
            senderId: userProfile.uid,
        };

        if (!chatDocSnap.exists()) {
            let newChatData: Omit<Chat, 'id'> = {
                createdAt: serverTimestamp(),
                updatedAt: serverTimestamp(),
                lastMessage: lastMessageUpdate,
                participantNames: {},
                participants: [],
            };

            if (activeChat.type === 'group' && userProfile.collegeId) {
                newChatData = {
                    ...newChatData,
                    isGroupChat: true,
                    collegeId: userProfile.collegeId,
                    name: activeChat.name,
                    description: 'College-wide general chat for study-related discussions.'
                };
            } else if (activeChat.type === 'user' && activeChat.user) {
                 newChatData = {
                    ...newChatData,
                    isGroupChat: false,
                    participants: [userProfile.uid, activeChat.user.uid],
                    participantNames: {
                        [userProfile.uid]: userProfile.fullName,
                        [activeChat.user.uid]: activeChat.user.fullName,
                    },
                 };
            }
            batch.set(chatDocRef, newChatData);
        } else {
            batch.update(chatDocRef, { lastMessage: lastMessageUpdate, updatedAt: serverTimestamp() });
        }
        
        await batch.commit();
        setNewMessage('');
    } catch(error) {
        console.error("Error sending message:", error);
        toast({ title: "Error", description: "Message could not be sent.", variant: "destructive" });
    } finally {
        setIsSending(false);
    }
  };

  const handleToggleMute = async () => {
    if (!userProfile || !activeChat || activeChat.type !== 'group') return;
    const isCurrentlyMuted = userProfile.chatNotificationSettings?.[activeChat.id] === false;
    const newMutedState = !isCurrentlyMuted;

    const userDocRef = doc(db, 'users', userProfile.uid);
    try {
        await updateDoc(userDocRef, {
            [`chatNotificationSettings.${activeChat.id}`]: newMutedState ? false : true // false for muted, true for notify
        });
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

  return (
    <div className={cn("flex h-[calc(100vh-10rem)] border rounded-lg bg-card", isMobile && "h-[calc(100vh-6rem)]")}>
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
                    {activeChat.type === 'group' ? (
                      <div className="h-full w-full bg-primary text-primary-foreground flex items-center justify-center"><Users className="h-5 w-5"/></div>
                    ) : (
                      <>
                        <AvatarImage src={undefined} alt={activeChat.name} />
                        <AvatarFallback>{getInitials(activeChat.name)}</AvatarFallback>
                      </>
                    )}
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
            <main className="flex-1 flex flex-col">
              {activeChat && userProfile ? (
                <ChatWindow
                  activeChat={activeChat}
                  userProfile={userProfile}
                  messages={messages}
                  isLoadingMessages={isLoadingMessages}
                  isMobile={isMobile}
                  handleToggleMute={handleToggleMute}
                  newMessage={newMessage}
                  setNewMessage={setNewMessage}
                  handleSendMessage={handleSendMessage}
                  isSending={isSending}
                  messageEndRef={messageEndRef}
                />
              ) : <WelcomeScreen />}
            </main>
          </div>
          <SheetContent side="left" className="p-0 flex flex-col w-[85vw] max-w-[320px]">
            <UserList
              userProfile={userProfile}
              isLoadingUsers={isLoadingUsers}
              users={users}
              handleSelectChat={handleSelectChat}
              activeChat={activeChat}
              isMobile={isMobile}
              onCloseSidebar={() => setIsSidebarOpen(false)}
            />
          </SheetContent>
        </Sheet>
      ) : (
        <>
          <aside className="w-1/3 border-r flex flex-col">
            <UserList
              userProfile={userProfile}
              isLoadingUsers={isLoadingUsers}
              users={users}
              handleSelectChat={handleSelectChat}
              activeChat={activeChat}
              isMobile={isMobile}
            />
          </aside>
          <main className="w-2/3 flex flex-col">
            {activeChat && userProfile ? (
              <ChatWindow
                activeChat={activeChat}
                userProfile={userProfile}
                messages={messages}
                isLoadingMessages={isLoadingMessages}
                isMobile={isMobile}
                handleToggleMute={handleToggleMute}
                newMessage={newMessage}
                setNewMessage={setNewMessage}
                handleSendMessage={handleSendMessage}
                isSending={isSending}
                messageEndRef={messageEndRef}
              />
            ) : <WelcomeScreen />}
          </main>
        </>
      )}
    </div>
  );
}
