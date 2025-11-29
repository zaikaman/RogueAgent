import { useState, useEffect, useRef, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { useUserTier } from '../hooks/useUserTier';
import { TIERS } from '../constants/tiers';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Message01Icon, 
  Loading03Icon
} from '@hugeicons/core-free-icons';
import { Mic, Square, Send, X, Plus, History, Trash2, MessageSquare, ChevronLeft } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const vapi = new Vapi(import.meta.env.VITE_PUBLIC_VAPI_KEY);

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

interface Conversation {
  id: string;
  title: string;
  messages: Message[];
  createdAt: number;
  updatedAt: number;
}

const STORAGE_KEY = 'rogue-chat-history';
const CURRENT_CONVERSATION_KEY = 'rogue-current-conversation';

const generateId = () => `conv_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;

const getConversationTitle = (messages: Message[]): string => {
  const firstUserMessage = messages.find(m => m.role === 'user');
  if (firstUserMessage) {
    const title = firstUserMessage.content.slice(0, 40);
    return title.length < firstUserMessage.content.length ? `${title}...` : title;
  }
  return 'New Conversation';
};

const loadConversations = (): Conversation[] => {
  try {
    const stored = localStorage.getItem(STORAGE_KEY);
    return stored ? JSON.parse(stored) : [];
  } catch {
    return [];
  }
};

const saveConversations = (conversations: Conversation[]) => {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(conversations));
  } catch (e) {
    console.error('Failed to save conversations:', e);
  }
};

const loadCurrentConversationId = (): string | null => {
  try {
    return localStorage.getItem(CURRENT_CONVERSATION_KEY);
  } catch {
    return null;
  }
};

const saveCurrentConversationId = (id: string | null) => {
  try {
    if (id) {
      localStorage.setItem(CURRENT_CONVERSATION_KEY, id);
    } else {
      localStorage.removeItem(CURRENT_CONVERSATION_KEY);
    }
  } catch (e) {
    console.error('Failed to save current conversation ID:', e);
  }
};

export function AskRogue() {
  const { address } = useAccount();
  const { tier } = useUserTier();
  
  // Conversation state
  const [conversations, setConversations] = useState<Conversation[]>(() => loadConversations());
  const [currentConversationId, setCurrentConversationId] = useState<string | null>(() => loadCurrentConversationId());
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  
  // Use a ref to track current conversation ID for callbacks
  const currentConversationIdRef = useRef(currentConversationId);
  useEffect(() => {
    currentConversationIdRef.current = currentConversationId;
  }, [currentConversationId]);
  
  // Get current conversation or create a new one
  const currentConversation = conversations.find(c => c.id === currentConversationId);
  const messages = currentConversation?.messages || [{
    role: 'assistant' as const,
    content: "Hey there! I'm Rogue, your crypto intelligence assistant. What can I help you with today?",
    timestamp: Date.now()
  }];
  
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSilverOrAbove = tier === TIERS.SILVER || tier === TIERS.GOLD || tier === TIERS.DIAMOND;

  // Save conversations to localStorage whenever they change
  useEffect(() => {
    saveConversations(conversations);
  }, [conversations]);

  // Save current conversation ID whenever it changes
  useEffect(() => {
    saveCurrentConversationId(currentConversationId);
  }, [currentConversationId]);

  const addMessage = useCallback((message: Message) => {
    const convId = currentConversationIdRef.current;
    
    setConversations(prev => {
      const currentConv = convId ? prev.find(c => c.id === convId) : null;
      const currentMessages = currentConv?.messages || [{
        role: 'assistant' as const,
        content: "Hey there! I'm Rogue, your crypto intelligence assistant. What can I help you with today?",
        timestamp: Date.now()
      }];
      
      const newMessages = [...currentMessages, message];
      
      if (convId) {
        // Update existing conversation
        return prev.map(conv => 
          conv.id === convId 
            ? { 
                ...conv, 
                messages: newMessages, 
                updatedAt: Date.now(),
                title: getConversationTitle(newMessages)
              }
            : conv
        );
      } else {
        // Create new conversation
        const newConv: Conversation = {
          id: generateId(),
          title: getConversationTitle(newMessages),
          messages: newMessages,
          createdAt: Date.now(),
          updatedAt: Date.now()
        };
        // Update ref immediately for subsequent calls
        currentConversationIdRef.current = newConv.id;
        setCurrentConversationId(newConv.id);
        return [newConv, ...prev];
      }
    });
  }, []);

  const createNewConversation = () => {
    setCurrentConversationId(null);
    setIsHistoryOpen(false);
    toast.success('Started new conversation');
  };

  const selectConversation = (id: string) => {
    setCurrentConversationId(id);
    setIsHistoryOpen(false);
  };

  const deleteConversation = (id: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setConversations(prev => prev.filter(conv => conv.id !== id));
    if (currentConversationId === id) {
      setCurrentConversationId(null);
    }
    toast.success('Conversation deleted');
  };

  const clearAllHistory = () => {
    setConversations([]);
    setCurrentConversationId(null);
    toast.success('All conversations cleared');
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  useEffect(() => {
    // VAPI Event Listeners
    vapi.on('call-start', () => {
      setIsCallActive(true);
      toast.success('Voice chat connected');
    });

    vapi.on('call-end', () => {
      setIsCallActive(false);
      setIsSpeaking(false);
      toast.info('Voice chat ended');
    });

    vapi.on('speech-start', () => {
      setIsSpeaking(true);
    });

    vapi.on('speech-end', () => {
      setIsSpeaking(false);
    });

    vapi.on('error', (error) => {
      console.error('Vapi error:', error);
      setIsCallActive(false);
      toast.error('Voice chat error occurred');
    });

    return () => {
      vapi.stop();
    };
  }, []);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const handleSendMessage = async () => {
    if (!input.trim() || !address) return;

    const userMessage = input.trim();
    
    // Check if it's a /scan command
    if (userMessage.toLowerCase().startsWith('/scan ')) {
      const tokenSymbol = userMessage.slice(6).trim();
      
      if (!tokenSymbol) {
        toast.error('Please specify a token symbol. Example: /scan SOL');
        return;
      }
      
      // Check if user is DIAMOND tier
      if (tier !== TIERS.DIAMOND) {
        setInput('');
        addMessage({ role: 'user', content: userMessage, timestamp: Date.now() });
        // Small delay to ensure user message is saved first
        setTimeout(() => {
          addMessage({ role: 'assistant', content: `⛔ Custom scans are exclusive to DIAMOND tier users (1,000+ $RGE).\n\nYour current tier: ${tier}`, timestamp: Date.now() });
        }, 50);
        return;
      }
      
      setInput('');
      addMessage({ role: 'user', content: userMessage, timestamp: Date.now() });
      setIsLoading(true);
      
      try {
        // Start the scan (async background job)
        const response = await fetch(`${import.meta.env.VITE_API_URL}/scan`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
          },
          body: JSON.stringify({
            tokenSymbol: tokenSymbol.toUpperCase(),
            walletAddress: address
          }),
        });

        const data = await response.json();

        if (!data.success) {
          addMessage({ 
            role: 'assistant', 
            content: `❌ ${data.error}`, 
            timestamp: Date.now() 
          });
          toast.error(data.error);
          setIsLoading(false);
          return;
        }

        const requestId = data.request_id;
        toast.info(`Scanning ${tokenSymbol.toUpperCase()}... This may take a minute.`);

        // Poll for completion
        const pollInterval = 3000; // 3 seconds
        const maxAttempts = 60; // 3 minutes max
        let attempts = 0;

        const pollForResult = async () => {
          attempts++;
          
          try {
            const statusResponse = await fetch(`${import.meta.env.VITE_API_URL}/scan/status/${requestId}`);
            const statusData = await statusResponse.json();

            if (statusData.status === 'completed') {
              addMessage({ 
                role: 'assistant', 
                content: statusData.message, 
                timestamp: Date.now() 
              });
              toast.success(`Scan complete for ${tokenSymbol.toUpperCase()}`);
              setIsLoading(false);
              return;
            } else if (statusData.status === 'failed') {
              addMessage({ 
                role: 'assistant', 
                content: `❌ ${statusData.error || 'Scan failed. Please try again.'}`, 
                timestamp: Date.now() 
              });
              toast.error('Scan failed');
              setIsLoading(false);
              return;
            } else if (attempts >= maxAttempts) {
              addMessage({ 
                role: 'assistant', 
                content: '⏱️ Scan is taking longer than expected. Please check back later or try again.', 
                timestamp: Date.now() 
              });
              toast.warning('Scan timed out');
              setIsLoading(false);
              return;
            }

            // Still processing, continue polling
            setTimeout(pollForResult, pollInterval);
          } catch (pollError) {
            console.error('Poll error:', pollError);
            if (attempts >= maxAttempts) {
              addMessage({ 
                role: 'assistant', 
                content: '❌ Failed to get scan results. Please try again.', 
                timestamp: Date.now() 
              });
              setIsLoading(false);
            } else {
              setTimeout(pollForResult, pollInterval);
            }
          }
        };

        // Start polling after a short delay
        setTimeout(pollForResult, pollInterval);

      } catch (error) {
        console.error('Scan error:', error);
        addMessage({ 
          role: 'assistant', 
          content: '❌ Failed to process scan request. Please try again.', 
          timestamp: Date.now() 
        });
        toast.error('Failed to process scan request');
        setIsLoading(false);
      }
      return;
    }
    
    // Regular chat message
    setInput('');
    addMessage({ role: 'user', content: userMessage, timestamp: Date.now() });
    setIsLoading(true);

    try {
      const response = await fetch(`${import.meta.env.VITE_API_URL}/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: userMessage,
          context: {
            walletAddress: address,
            tier: tier,
            telegramUserId: null
          },
          history: messages.slice(-10).map(m => ({
            user: m.role === 'user' ? m.content : '',
            assistant: m.role === 'assistant' ? m.content : ''
          }))
        }),
      });

      const data = await response.json();

      if (data.message) {
        addMessage({ role: 'assistant', content: data.message, timestamp: Date.now() });
      } else {
        toast.error('Failed to get response');
      }
    } catch (error) {
      console.error('Chat error:', error);
      toast.error('Failed to send message');
    } finally {
      setIsLoading(false);
    }
  };

  const toggleVoiceChat = async () => {
    if (isCallActive) {
      vapi.stop();
    } else {
      try {
        await vapi.start(import.meta.env.VITE_VAPI_ASSISTANT_ID, {
          variableValues: {
            user_name: address ? `${address.slice(0, 4)}...${address.slice(-4)}` : 'User',
            user_tier: tier
          }
        });
      } catch (error) {
        console.error('Failed to start voice chat:', error);
        toast.error('Failed to start voice chat');
      }
    }
  };

  if (!isSilverOrAbove) {
    return (
      <div className="flex flex-col items-center justify-center h-[60vh] text-center space-y-4">
        <div className="w-16 h-16 rounded-full bg-gray-800 flex items-center justify-center">
          <HugeiconsIcon icon={Message01Icon} className="w-8 h-8 text-gray-500" />
        </div>
        <h2 className="text-2xl font-bold text-white">Access Restricted</h2>
        <p className="text-gray-400 max-w-md">
          Ask Rogue is available exclusively for Silver tier members and above. 
          Upgrade your tier to access this feature.
        </p>
      </div>
    );
  }

  return (
    <div className="h-[calc(100vh-100px)] flex flex-col">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-white tracking-tight flex items-center gap-2">
            <HugeiconsIcon icon={Message01Icon} className="w-6 h-6 text-cyan-500" />
            Ask Rogue
          </h2>
          <p className="text-gray-400 mt-1">Chat with Rogue for real-time insights and analysis.</p>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={createNewConversation}
            className="p-2.5 rounded-lg bg-gray-800 text-gray-400 hover:text-cyan-400 hover:bg-gray-700 border border-gray-700 transition-all flex items-center justify-center"
            title="New Conversation"
          >
            <Plus className="w-5 h-5" />
          </button>
          <button
            onClick={() => setIsHistoryOpen(!isHistoryOpen)}
            className={`p-2.5 rounded-lg transition-all flex items-center justify-center ${
              isHistoryOpen 
                ? 'bg-cyan-600 text-white' 
                : 'bg-gray-800 text-gray-400 hover:text-cyan-400 hover:bg-gray-700 border border-gray-700'
            }`}
            title="Chat History"
          >
            <History className="w-5 h-5" />
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      <div className="flex-1 flex gap-4 overflow-hidden">
        {/* History Sidebar */}
        <AnimatePresence>
          {isHistoryOpen && (
            <motion.div
              initial={{ width: 0, opacity: 0 }}
              animate={{ width: 320, opacity: 1 }}
              exit={{ width: 0, opacity: 0 }}
              transition={{ duration: 0.2 }}
              className="bg-gray-900/80 border border-gray-800 rounded-xl overflow-hidden flex flex-col"
            >
              <div className="p-4 border-b border-gray-800 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <History className="w-4 h-4 text-cyan-500" />
                  <span className="font-semibold text-white text-sm">Chat History</span>
                </div>
                <div className="flex items-center gap-2">
                  {conversations.length > 0 && (
                    <button
                      onClick={clearAllHistory}
                      className="text-xs text-gray-500 hover:text-red-400 transition-colors"
                      title="Clear all history"
                    >
                      Clear all
                    </button>
                  )}
                  <button
                    onClick={() => setIsHistoryOpen(false)}
                    className="p-1 text-gray-400 hover:text-white transition-colors"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                </div>
              </div>
              
              <div className="flex-1 overflow-y-auto custom-scrollbar">
                {conversations.length === 0 ? (
                  <div className="p-4 text-center text-gray-500 text-sm">
                    <MessageSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                    <p>No conversations yet</p>
                    <p className="text-xs mt-1">Start chatting to save history</p>
                  </div>
                ) : (
                  <div className="p-2 space-y-1">
                    {conversations.map((conv) => (
                      <motion.div
                        key={conv.id}
                        initial={{ opacity: 0, x: -20 }}
                        animate={{ opacity: 1, x: 0 }}
                        className={`group p-3 rounded-lg cursor-pointer transition-all ${
                          currentConversationId === conv.id
                            ? 'bg-cyan-600/20 border border-cyan-500/30'
                            : 'hover:bg-gray-800/50 border border-transparent'
                        }`}
                        onClick={() => selectConversation(conv.id)}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div className="flex-1 min-w-0">
                            <p className={`text-sm font-medium truncate ${
                              currentConversationId === conv.id ? 'text-cyan-400' : 'text-gray-200'
                            }`}>
                              {conv.title}
                            </p>
                            <p className="text-xs text-gray-500 mt-1">
                              {new Date(conv.updatedAt).toLocaleDateString(undefined, {
                                month: 'short',
                                day: 'numeric',
                                hour: '2-digit',
                                minute: '2-digit'
                              })}
                            </p>
                          </div>
                          <button
                            onClick={(e) => deleteConversation(conv.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1 text-gray-500 hover:text-red-400 transition-all"
                            title="Delete conversation"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                        <p className="text-xs text-gray-500 mt-1">
                          {conv.messages.length} messages
                        </p>
                      </motion.div>
                    ))}
                  </div>
                )}
              </div>

              <div className="p-3 border-t border-gray-800">
                <button
                  onClick={createNewConversation}
                  className="w-full py-2 px-4 bg-gray-800 hover:bg-gray-700 text-gray-300 rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                >
                  <Plus className="w-4 h-4" />
                  New Conversation
                </button>
              </div>
            </motion.div>
          )}
        </AnimatePresence>

      {/* Chat Area */}
      <div className="flex-1 bg-gray-900/50 border border-gray-800 rounded-xl overflow-hidden flex flex-col relative">
        {/* Voice Status Overlay */}
        <AnimatePresence>
          {isCallActive && (
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-50 bg-gray-900/95 backdrop-blur-xl flex flex-col items-center justify-center"
            >
              <button 
                onClick={toggleVoiceChat}
                className="absolute top-6 right-6 p-2 text-gray-400 hover:text-white transition-colors"
              >
                <X className="w-6 h-6" />
              </button>

              <div className="relative">
                {/* Pulsing Rings */}
                <motion.div 
                  animate={{ 
                    scale: isSpeaking ? [1, 1.2, 1] : 1,
                    opacity: isSpeaking ? [0.5, 0.2, 0.5] : 0.1
                  }}
                  transition={{ repeat: Infinity, duration: 2 }}
                  className="absolute inset-0 bg-cyan-500 rounded-full blur-xl"
                />
                <motion.div 
                  animate={{ 
                    scale: isSpeaking ? [1, 1.5, 1] : 1,
                    opacity: isSpeaking ? [0.3, 0.1, 0.3] : 0.05
                  }}
                  transition={{ repeat: Infinity, duration: 2, delay: 0.2 }}
                  className="absolute inset-0 bg-cyan-400 rounded-full blur-2xl"
                />
                
                {/* Central Orb */}
                <div className={`relative w-32 h-32 rounded-full flex items-center justify-center transition-all duration-500 ${
                  isSpeaking 
                    ? 'bg-gradient-to-br from-cyan-400 to-blue-600 shadow-[0_0_50px_rgba(34,211,238,0.5)]' 
                    : 'bg-gray-800 border border-gray-700'
                }`}>
                  <Mic className={`w-12 h-12 ${isSpeaking ? 'text-white' : 'text-gray-500'}`} />
                </div>
              </div>

              <div className="mt-12 text-center space-y-2">
                <h3 className="text-2xl font-bold text-white tracking-tight">
                  {isSpeaking ? 'Rogue is speaking...' : 'Listening...'}
                </h3>
                <p className="text-gray-400">
                  {isSpeaking ? 'Listen carefully' : 'Go ahead, I\'m listening'}
                </p>
              </div>

              <button
                onClick={toggleVoiceChat}
                className="mt-12 px-8 py-3 bg-red-500/10 hover:bg-red-500/20 text-red-500 border border-red-500/20 rounded-full font-medium transition-all flex items-center gap-2 group"
              >
                <Square className="w-4 h-4 fill-current group-hover:scale-110 transition-transform" />
                End Session
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <div className="flex-1 overflow-y-auto p-4 space-y-4 custom-scrollbar">
          {messages.length === 0 && (
            <div className="h-full flex flex-col items-center justify-center text-gray-500 space-y-4">
              <div className="w-16 h-16 rounded-full bg-gray-800/50 flex items-center justify-center">
                <HugeiconsIcon icon={Message01Icon} className="w-8 h-8 opacity-50" />
              </div>
              <p>Start a conversation with Rogue...</p>
              <div className="flex gap-2">
                <button 
                  onClick={() => { setInput('What are the recent signals?'); }}
                  className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  Recent Signals
                </button>
                <button 
                  onClick={() => { setInput('Any new airdrops?'); }}
                  className="text-xs bg-gray-800 hover:bg-gray-700 px-3 py-1.5 rounded-full transition-colors"
                >
                  Airdrops
                </button>
                {tier === TIERS.DIAMOND && (
                  <button 
                    onClick={() => { setInput('/scan SOL'); }}
                    className="text-xs bg-cyan-800 hover:bg-cyan-700 px-3 py-1.5 rounded-full transition-colors"
                  >
                    Scan SOL
                  </button>
                )}
              </div>
            </div>
          )}
          
          {messages.map((msg, idx) => (
            <div 
              key={idx} 
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div 
                className={`max-w-[80%] rounded-2xl px-4 py-3 ${
                  msg.role === 'user' 
                    ? 'bg-cyan-600 text-white rounded-br-none' 
                    : 'bg-gray-800 text-gray-200 rounded-bl-none border border-gray-700'
                }`}
              >
                <p className="whitespace-pre-wrap text-sm leading-relaxed">{msg.content}</p>
              </div>
            </div>
          ))}
          
          {isLoading && (
            <div className="flex justify-start">
              <div className="bg-gray-800 rounded-2xl rounded-bl-none px-4 py-3 border border-gray-700 flex items-center gap-2">
                <HugeiconsIcon icon={Loading03Icon} className="w-4 h-4 animate-spin text-cyan-500" />
                <span className="text-sm text-gray-400">Thinking...</span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <div className="p-4 bg-gray-900 border-t border-gray-800">
          <div className="flex gap-2">
            <button
              onClick={toggleVoiceChat}
              className={`p-2.5 rounded-lg transition-all duration-300 flex items-center justify-center ${
                isCallActive 
                  ? 'bg-red-500/10 text-red-500 hover:bg-red-500/20 border border-red-500/20 animate-pulse' 
                  : 'bg-gray-800 text-gray-400 hover:text-cyan-400 hover:bg-gray-700 border border-gray-700'
              }`}
              title={isCallActive ? "End Voice Chat" : "Start Voice Chat"}
            >
              <Mic className={`w-5 h-5 ${isCallActive ? 'animate-bounce' : ''}`} />
            </button>
            <input
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && !e.shiftKey && handleSendMessage()}
              placeholder={tier === TIERS.DIAMOND ? "Ask Rogue or use /scan <token>..." : "Ask Rogue about markets, signals, or tokens..."}
              className="flex-1 bg-gray-800 border border-gray-700 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:outline-none focus:border-cyan-500/50 focus:ring-1 focus:ring-cyan-500/50 transition-all"
              disabled={isLoading}
            />
            <button
              onClick={handleSendMessage}
              disabled={isLoading || !input.trim()}
              className="bg-cyan-600 hover:bg-cyan-500 disabled:opacity-50 disabled:cursor-not-allowed text-white px-4 rounded-lg transition-colors flex items-center justify-center"
            >
              <Send className="w-5 h-5" />
            </button>
          </div>
          <p className="text-xs text-gray-500 mt-2 text-center">
            Rogue can make mistakes. Always verify important information.
          </p>
        </div>
      </div>
      </div>
    </div>
  );
}
