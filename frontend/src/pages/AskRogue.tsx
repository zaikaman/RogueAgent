import { useState, useEffect, useRef } from 'react';
import { useAccount } from 'wagmi';
import { useUserTier } from '../hooks/useUserTier';
import { TIERS } from '../constants/tiers';
import { HugeiconsIcon } from '@hugeicons/react';
import { 
  Message01Icon, 
  Loading03Icon
} from '@hugeicons/core-free-icons';
import { Mic, Square, Send, X } from 'lucide-react';
import Vapi from '@vapi-ai/web';
import { toast } from 'sonner';
import { motion, AnimatePresence } from 'framer-motion';

const vapi = new Vapi(import.meta.env.VITE_PUBLIC_VAPI_KEY);

interface Message {
  role: 'user' | 'assistant';
  content: string;
  timestamp: number;
}

export function AskRogue() {
  const { address } = useAccount();
  const { tier } = useUserTier();
  const [messages, setMessages] = useState<Message[]>([
    {
      role: 'assistant',
      content: "Hey there! I'm Rogue, your crypto intelligence assistant. What can I help you with today?",
      timestamp: Date.now()
    }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isCallActive, setIsCallActive] = useState(false);
  const [isSpeaking, setIsSpeaking] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const isSilverOrAbove = tier === TIERS.SILVER || tier === TIERS.GOLD || tier === TIERS.DIAMOND;

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
        setMessages(prev => [
          ...prev, 
          { role: 'user', content: userMessage, timestamp: Date.now() },
          { role: 'assistant', content: `⛔ Custom scans are exclusive to DIAMOND tier users (1,000+ $RGE).\n\nYour current tier: ${tier}`, timestamp: Date.now() }
        ]);
        return;
      }
      
      setInput('');
      setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: Date.now() }]);
      setIsLoading(true);
      
      try {
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

        if (data.success) {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `🔍 ${data.message}`, 
            timestamp: Date.now() 
          }]);
          toast.success(`Scan initiated for ${tokenSymbol.toUpperCase()}`);
        } else {
          setMessages(prev => [...prev, { 
            role: 'assistant', 
            content: `❌ ${data.error}`, 
            timestamp: Date.now() 
          }]);
          toast.error(data.error);
        }
      } catch (error) {
        console.error('Scan error:', error);
        setMessages(prev => [...prev, { 
          role: 'assistant', 
          content: '❌ Failed to process scan request. Please try again.', 
          timestamp: Date.now() 
        }]);
        toast.error('Failed to process scan request');
      } finally {
        setIsLoading(false);
      }
      return;
    }
    
    // Regular chat message
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMessage, timestamp: Date.now() }]);
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
        setMessages(prev => [...prev, { role: 'assistant', content: data.message, timestamp: Date.now() }]);
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
      </div>

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
  );
}
