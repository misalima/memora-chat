import React, { useState, useEffect, useRef } from 'react';
import { getConversations, getMessages, sendMessage } from '../../services/chat/chatService';
import { logout, getCurrentUser } from '../../services/auth/authService';

interface Message {
    id: string;
    role: string;
    content: string;
    createdAt: string;
}

interface Conversation {
    id: string;
    title: string;
    lastMessage: string | null;
}

const ChatPage: React.FC = () => {
    const [conversations, setConversations] = useState<Conversation[]>([]);
    const [currentConversation, setCurrentConversation] = useState<string | null>(null);
    const [messagesCache, setMessagesCache] = useState<Record<string, Message[]>>({});
    const [messages, setMessages] = useState<Message[]>([]);
    const [inputMessage, setInputMessage] = useState('');
    const [loading, setLoading] = useState(false);
    const [sending, setSending] = useState(false);
    const messagesEndRef = useRef<HTMLDivElement>(null);
    const user = getCurrentUser();

    useEffect(() => {
        loadConversations();
    }, []);

    useEffect(() => {
        if (currentConversation) {
            if (messagesCache[currentConversation]) {
                setMessages(messagesCache[currentConversation]);
            } else {
                loadMessages(currentConversation);
            }
        } else {
            setMessages([]);
        }
    }, [currentConversation]);

    useEffect(() => {
        scrollToBottom();
    }, [messages]);

    const scrollToBottom = () => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    };

    const loadConversations = async () => {
        setLoading(true);
        try {
            const data = await getConversations();
            setConversations(data);
            if (data.length > 0 && !currentConversation) {
                setCurrentConversation(data[0].id);
            }
        } catch (error) {
            console.error('Error loading conversations:', error);
        } finally {
            setLoading(false);
        }
    };

    const loadMessages = async (conversationId: string) => {
        if (messagesCache[conversationId]) {
            setMessages(messagesCache[conversationId]);
            return;
        }
        setLoading(true);
        try {
            const data = await getMessages(conversationId);
            setMessages(data.messages);
            setMessagesCache(prev => ({
                ...prev,
                [conversationId]: data.messages
            }));

        } catch (error) {
            console.error('Error loading messages:', error);
        } finally {
            setLoading(false);
        }
    };

    const handleSendMessage = async (e: React.FormEvent<HTMLFormElement>) => {
        e.preventDefault();
        if (!inputMessage.trim() || sending) return;

        setSending(true);
        const messageContent = inputMessage;
        setInputMessage('');

        try {
            const response = await sendMessage({
                content: messageContent,
                conversationId: currentConversation || undefined,
            });

            if (!response) {
                throw new Error('Resposta vazia do servidor');
            }

            const userMessage = {
                id: `temp-${Date.now()}`, // ID temporário
                role: 'user',
                content: messageContent, // Conteúdo que o usuário digitou
                createdAt: new Date().toISOString()
            };

            const newMessage = {
                id: response.id,
                role: 'assistant',
                content: response.content,
                createdAt: response.createdAt
            };
            const conversationId = response.conversationId;

            if (!conversationId) {
                throw new Error('ID da conversa não encontrado');
            }

            if (!newMessage) {
                throw new Error('Mensagem não encontrada na resposta');
            }

            if (!newMessage.id || !newMessage.role || !newMessage.content) {
                console.error('Formato inválido da mensagem:', newMessage);
                throw new Error('Formato da mensagem inválido');
            }

            if (response.conversationId) {
                setMessagesCache(prev => ({
                    ...prev,
                    [conversationId]: [
                        ...(prev[conversationId] || []).filter(msg => msg !== undefined),
                        userMessage, 
                        newMessage
                    ]
                }));
            }

            setMessages(prev => [
                ...prev.filter(msg => msg !== undefined),
                userMessage,
                newMessage
            ]);

            if (!currentConversation) {
                setCurrentConversation(response.conversationId);
                await loadConversations();
            }
        } catch (error) {
            console.error('Error sending message:', error);
            setInputMessage(messageContent);
        } finally {
            setSending(false);
        }
    };

    const handleNewConversation = async () => {
        setCurrentConversation(null);
        setMessages([]);
    };

    return (
        <div className="flex h-screen bg-gray-100">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r flex flex-col">
                <div className="p-4 border-b">
                    <div className="flex justify-between items-center">
                        <h1 className="text-xl font-bold text-gray-800">Memora</h1>
                        <button
                            onClick={logout}
                            className="text-sm text-red-600 hover:text-red-800"
                        >
                            Sair
                        </button>
                    </div>
                    <p className="text-sm text-gray-500 mt-1">
                        Olá, {user?.firstName}!
                    </p>
                </div>

                <button
                    onClick={handleNewConversation}
                    className="m-4 bg-indigo-600 text-white py-2 px-4 rounded-lg hover:bg-indigo-700 transition"
                >
                    + Nova Conversa
                </button>

                <div className="flex-1 overflow-y-auto">
                    {loading && !conversations.length ? (
                        <div className="text-center text-gray-500 mt-4">Carregando...</div>
                    ) : (
                        conversations.map((conv) => (
                            <div
                                key={conv.id}
                                onClick={() => setCurrentConversation(conv.id)}
                                className={`p-4 cursor-pointer hover:bg-gray-50 transition border-b ${currentConversation === conv.id ? 'bg-indigo-50 border-l-4 border-l-indigo-600' : ''
                                    }`}
                            >
                                <div className="font-medium text-gray-800 truncate">
                                    {conv.title || 'Nova conversa'}
                                </div>
                                {conv.lastMessage && (
                                    <div className="text-sm text-gray-500 truncate mt-1">
                                        {conv.lastMessage}
                                    </div>
                                )}
                            </div>
                        ))
                    )}
                </div>
            </div>

            {/* Chat Area */}
            <div className="flex-1 flex flex-col">
                {/* Header */}
                <div className="bg-white border-b p-4">
                    <h2 className="text-lg font-semibold text-gray-800">
                        {currentConversation
                            ? conversations.find(c => c.id === currentConversation)?.title || 'Conversa'
                            : 'Nova Conversa'}
                    </h2>
                </div>

                {/* Messages */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4">
                    {loading && !messages.length ? (
                        <div className="text-center text-gray-500">Carregando mensagens...</div>
                    ) : messages.length === 0 ? (
                        <div className="text-center text-gray-500 mt-10">
                            <p>Envie uma mensagem para começar!</p>
                            <p className="text-sm mt-2">O Memora lembra do contexto da conversa.</p>
                        </div>
                    ) : (
                        messages.map((msg) => (
                            <div
                                key={msg.id}
                                className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                            >
                                <div
                                    className={`max-w-[70%] rounded-lg px-4 py-2 ${msg.role === 'user'
                                        ? 'bg-indigo-600 text-white'
                                        : 'bg-white text-gray-800 border'
                                        }`}
                                >
                                    <p className="whitespace-pre-wrap">{msg.content}</p>
                                    <div
                                        className={`text-xs mt-1 ${msg.role === 'user' ? 'text-indigo-200' : 'text-gray-400'
                                            }`}
                                    >
                                        {new Date(msg.createdAt).toLocaleTimeString()}
                                    </div>
                                </div>
                            </div>
                        ))
                    )}
                    {sending && (
                        <div className="flex justify-start">
                            <div className="bg-white border rounded-lg px-4 py-2 text-gray-400">
                                Digitando...
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input */}
                <form onSubmit={handleSendMessage} className="p-4 bg-white border-t">
                    <div className="flex space-x-2">
                        <input
                            type="text"
                            value={inputMessage}
                            onChange={(e) => setInputMessage(e.target.value)}
                            placeholder="Digite sua mensagem..."
                            disabled={sending}
                            className="flex-1 px-4 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-indigo-500"
                        />
                        <button
                            type="submit"
                            disabled={sending || !inputMessage.trim()}
                            className="px-6 py-2 bg-indigo-600 text-white rounded-lg hover:bg-indigo-700 disabled:opacity-50 disabled:cursor-not-allowed transition"
                        >
                            Enviar
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ChatPage;