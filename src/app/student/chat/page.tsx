
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
} from 'firebase/firestore';
import type { UserProfile, Chat, ChatMessage } from '@/types';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Loader2, Send, MessageSquare, Users, AlertTriangle, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import { formatDistanceToNowStrict } from 'date-fns';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';
import { useIsMobile } from '@/hooks/use-mobile';
import { Sheet, SheetContent, SheetTrigger, SheetClose } from '@/components/ui/sheet';

export default function StudentChatPage() {
  const { userProfile } = useAuth();
  const { toast } = useToast();
  const isMobile = useIsMobile();
  
  const [users, setUsers] = useState<UserProfile[]>([]);
  const [selectedUser, setSelectedUser] = useState<UserProfile | null>(null);
  const [activeChatId, setActiveChatId] = useState<string | null>(null);
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

  // Fetch all users in the same college
  useEffect(() => {
    if (!userProfile?.collegeId) return;
    setIsLoadingUsers(true);
    const usersRef = collection(db, 'users');
    const q = query(
        usersRef, 
        where('collegeId', '==', userProfile.collegeId),
        where('uid', '!=', userProfile.uid) // Exclude self
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

  // Subscribe to messages for the active chat
  useEffect(() => {
    if (!activeChatId) return;

    setIsLoadingMessages(true);
    const messagesRef = collection(db, 'chats', activeChatId, 'messages');
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
  }, [activeChatId, toast]);

  const handleSelectUser = (user: UserProfile) => {
    if (!userProfile) return;
    setSelectedUser(user);
    const chatId = [userProfile.uid, user.uid].sort().join('_');
    setActiveChatId(chatId);
    if(isMobile) setIsSidebarOpen(false);
  };
  
  const getInitials = (name: string = '') => {
    return name.split(' ').map((n) => n[0]).join('').toUpperCase();
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !userProfile || !selectedUser || !activeChatId) return;
    setIsSending(true);

    const messageData: Omit<ChatMessage, 'id' | 'createdAt'> = {
        chatId: activeChatId,
        senderId: userProfile.uid,
        senderName: userProfile.fullName,
        text: newMessage.trim(),
    };
    
    const chatDocRef = doc(db, 'chats', activeChatId);
    const messagesCollectionRef = collection(chatDocRef, 'messages');

    try {
        const chatDocSnap = await getDoc(chatDocRef);
        
        const batch = writeBatch(db);
        
        const newMessageRef = doc(messagesCollectionRef);
        batch.set(newMessageRef, {
            ...messageData,
            createdAt: serverTimestamp(),
        });

        const chatDataUpdate: Partial<Chat> = {
            participantNames: {
                [userProfile.uid]: userProfile.fullName,
                [selectedUser.uid]: selectedUser.fullName,
            },
            lastMessage: {
                text: newMessage.trim(),
                timestamp: serverTimestamp(),
                senderId: userProfile.uid,
            },
            updatedAt: serverTimestamp(),
        };

        if (!chatDocSnap.exists()) {
            const newChatData: Omit<Chat, 'id'> = {
                participants: [userProfile.uid, selectedUser.uid],
                createdAt: serverTimestamp(),
                ...chatDataUpdate,
            };
             batch.set(chatDocRef, newChatData);
        } else {
             batch.update(chatDocRef, chatDataUpdate);
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

  const UserList = () => (
    <>
      <div className="p-4 border-b flex justify-between items-center">
        <h2 className="text-xl font-semibold flex items-center gap-2">
          <Users /> Contacts
        </h2>
        {isMobile && <SheetClose asChild><Button variant="ghost" size="icon"><ArrowLeft/></Button></SheetClose>}
      </div>
      <ScrollArea className="flex-1">
        {isLoadingUsers ? (
          <div className="p-4 flex justify-center"><Loader2 className="h-6 w-6 animate-spin" /></div>
        ) : users.length > 0 ? (
          <ul>
            {users.map(user => (
              <li key={user.uid}>
                <button
                  onClick={() => handleSelectUser(user)}
                  className={cn(
                    "w-full text-left p-3 hover:bg-muted transition-colors flex items-center gap-3",
                    selectedUser?.uid === user.uid && "bg-muted"
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
            ))}
          </ul>
        ) : (
          <p className="p-4 text-sm text-muted-foreground text-center">No other users found in your college to chat with.</p>
        )}
      </ScrollArea>
    </>
  );

  return (
    <div className={cn("flex h-[calc(100vh-10rem)] border rounded-lg bg-card", isMobile && "h-[calc(100vh-6rem)]")}>
      {isMobile ? (
        <Sheet open={isSidebarOpen} onOpenChange={setIsSidebarOpen}>
          <div className="w-full flex flex-col">
            <header className="p-2 border-b flex items-center gap-2">
                <SheetTrigger asChild>
                    <Button variant="ghost" size="icon"><Users/></Button>
                </SheetTrigger>
                {selectedUser ? (
                    <>
                        <Avatar className="h-9 w-9">
                            <AvatarImage src={undefined} alt={selectedUser.fullName} />
                            <AvatarFallback>{getInitials(selectedUser.fullName)}</AvatarFallback>
                        </Avatar>
                        <div>
                            <h3 className="font-semibold text-sm">{selectedUser.fullName}</h3>
                            <p className="text-xs text-muted-foreground capitalize">{selectedUser.role}</p>
                        </div>
                    </>
                ) : <h3 className="font-semibold">Chat</h3>}
                 <Button asChild variant="outline" size="icon" className="ml-auto h-8 w-8">
                   <Link href="/student/dashboard"><ArrowLeft/></Link>
                </Button>
            </header>
            <main className="flex-1 flex flex-col">
                {selectedUser ? <ChatWindow /> : <WelcomeScreen />}
            </main>
          </div>
          <SheetContent side="left" className="p-0 flex flex-col w-[85vw] max-w-[320px]">
            <UserList/>
          </SheetContent>
        </Sheet>
      ) : (
        <>
            <aside className="w-1/3 border-r flex flex-col">
                <UserList />
            </aside>
            <main className="w-2/3 flex flex-col">
                {selectedUser ? <ChatWindow /> : <WelcomeScreen />}
            </main>
        </>
      )}
    </div>
  );

  function WelcomeScreen() {
      return (
        <div className="flex flex-col h-full items-center justify-center text-center p-4">
            <MessageSquare className="h-16 w-16 text-muted-foreground mb-4" />
            <h3 className="text-2xl font-semibold">Select a conversation</h3>
            <p className="text-muted-foreground">Choose someone from the list to start chatting.</p>
        </div>
      )
  }

  function ChatWindow() {
      return (
          <>
            {!isMobile && (
                 <header className="p-4 border-b flex items-center gap-3">
                    <Avatar>
                        <AvatarImage src={undefined} alt={selectedUser!.fullName} />
                        <AvatarFallback>{getInitials(selectedUser!.fullName)}</AvatarFallback>
                    </Avatar>
                    <div>
                        <h3 className="font-semibold">{selectedUser!.fullName}</h3>
                        <p className="text-sm text-muted-foreground capitalize">{selectedUser!.role}</p>
                    </div>
                </header>
            )}
            
            <ScrollArea className="flex-1 p-4 bg-muted/20">
              <div className="space-y-4">
              {isLoadingMessages ? (
                  <div className="flex justify-center p-8"><Loader2 className="h-8 w-8 animate-spin"/></div>
              ) : messages.length === 0 ? (
                 <p className="text-center text-sm text-muted-foreground py-8">No messages yet. Start the conversation!</p>
              ) : (
                messages.map((msg, index) => (
                  <div
                    key={msg.id}
                    className={cn("flex items-end gap-2", msg.senderId === userProfile?.uid ? "justify-end" : "justify-start")}
                  >
                     {msg.senderId !== userProfile?.uid && (
                        <Avatar className="h-8 w-8">
                            <AvatarImage src={undefined} alt={msg.senderName} />
                            <AvatarFallback>{getInitials(msg.senderName)}</AvatarFallback>
                        </Avatar>
                     )}
                    <div className={cn(
                        "p-3 rounded-lg max-w-xs md:max-w-md", 
                        msg.senderId === userProfile?.uid ? "bg-primary text-primary-foreground" : "bg-card border"
                     )}>
                      <p className="text-sm break-words">{msg.text}</p>
                      <p className={cn("text-xs mt-1 text-right",  msg.senderId === userProfile?.uid ? "text-primary-foreground/70" : "text-muted-foreground")}>
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
      )
  }
}
