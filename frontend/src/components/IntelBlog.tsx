import { useState } from 'react';
import { ScrollArea } from './ui/scroll-area';
import { Badge } from './ui/badge';
import { Calendar01Icon, Share01Icon, Tick01Icon } from '@hugeicons/core-free-icons';
import { HugeiconsIcon } from '@hugeicons/react';
import { toast } from 'sonner';

interface IntelBlogProps {
  title?: string;
  content: string;
  date?: string;
  imageUrl?: string;
}

export function IntelBlog({ title = "Market Intelligence Report", content, date, imageUrl }: IntelBlogProps) {
  const [copied, setCopied] = useState(false);

  const handleShare = () => {
    navigator.clipboard.writeText(window.location.href);
    setCopied(true);
    toast.success("Link copied to clipboard", {
      description: "You can now share this intelligence report with your network.",
      duration: 3000,
    });
    setTimeout(() => setCopied(false), 2000);
  };

  // Simple markdown-ish parser for now since we don't have a library
  // We'll handle headers (#), bold (**), and paragraphs
  const renderContent = (text: string) => {
    if (!text) return null;
    
    return text.split('\n').map((line, i) => {
      // Headers
      if (line.startsWith('### ')) {
        return <h3 key={i} className="text-xl font-bold text-cyan-400 mt-6 mb-3">{line.replace('### ', '')}</h3>;
      }
      if (line.startsWith('## ')) {
        return <h2 key={i} className="text-2xl font-bold text-white mt-8 mb-4 border-b border-gray-800 pb-2">{line.replace('## ', '')}</h2>;
      }
      if (line.startsWith('# ')) {
        return <h1 key={i} className="text-3xl font-bold text-white mt-8 mb-6">{line.replace('# ', '')}</h1>;
      }
      
      // Lists
      if (line.trim().startsWith('- ')) {
        return (
          <div key={i} className="flex items-start gap-2 mb-2 ml-4">
            <div className="w-1.5 h-1.5 rounded-full bg-cyan-500 mt-2 shrink-0" />
            <p className="text-gray-300 leading-relaxed">
              {parseInline(line.replace('- ', ''))}
            </p>
          </div>
        );
      }

      // Empty lines
      if (line.trim() === '') {
        return <div key={i} className="h-4" />;
      }

      // Regular paragraphs
      return (
        <p key={i} className="text-gray-300 leading-relaxed mb-2">
          {parseInline(line)}
        </p>
      );
    });
  };

  // Helper to handle bold text (**text**)
  const parseInline = (text: string) => {
    const parts = text.split(/(\*\*.*?\*\*)/g);
    return parts.map((part, i) => {
      if (part.startsWith('**') && part.endsWith('**')) {
        return <strong key={i} className="text-cyan-200 font-semibold">{part.slice(2, -2)}</strong>;
      }
      return part;
    });
  };

  return (
    <div className="bg-gray-950 border border-gray-800 rounded-xl overflow-hidden flex flex-col h-[600px]">
      {imageUrl && (
        <div className="w-full h-64 relative shrink-0">
            <img src={imageUrl} alt={title} className="w-full h-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-gray-950 to-transparent" />
        </div>
      )}
      <div className="p-6 border-b border-gray-800 bg-gray-900/30 flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-3">
            <Badge variant="outline" className="bg-cyan-950/30 text-cyan-400 border-cyan-800">
              ALPHA REPORT
            </Badge>
            {date && (
              <div className="flex items-center gap-1 text-xs text-gray-500">
                <HugeiconsIcon icon={Calendar01Icon} className="w-3 h-3" />
                {date}
              </div>
            )}
          </div>
          <h1 className="text-2xl font-bold text-white tracking-tight">{title}</h1>
        </div>
        <button 
          onClick={handleShare}
          className="p-2 hover:bg-gray-800 rounded-lg transition-colors text-gray-400 hover:text-white"
          title="Copy link"
        >
          {copied ? (
            <HugeiconsIcon icon={Tick01Icon} className="w-5 h-5 text-green-500" />
          ) : (
            <HugeiconsIcon icon={Share01Icon} className="w-5 h-5" />
          )}
        </button>
      </div>
      
      <ScrollArea className="flex-1 p-8">
        <div className="max-w-3xl mx-auto font-sans">
          {renderContent(content)}
        </div>
      </ScrollArea>
    </div>
  );
}
