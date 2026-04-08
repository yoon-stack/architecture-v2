import { useState, useRef, useEffect } from 'react';
import { useAtom, useAtomValue, useSetAtom } from 'jotai';
import { Button } from '@/components/common/ui/button';
import {
  chatListAtom,
  activeChatIdAtom,
  chatCollapsedAtom,
  chatWidthAtom,
  agentsPanelOpenAtom,
} from '@/store/atoms';
import type { Chat, ChatMessage } from '@/store/types';
import { cn } from '@/lib/utils';

function AgentsPanel() {
  const [chatList, setChatList] = useAtom(chatListAtom);
  const [activeChatId, setActiveChatId] = useAtom(activeChatIdAtom);
  const [agentsPanelOpen, setAgentsPanelOpen] = useAtom(agentsPanelOpenAtom);
  const [hoveredId, setHoveredId] = useState<string | null>(null);

  const handleNewChat = () => {
    const id = `c${Date.now()}`;
    const newChat: Chat = { id, name: `Chat ${chatList.length + 1}`, timeAgo: 'now', date: new Date().toLocaleDateString(), messages: [] };
    setChatList((prev) => [...prev, newChat]);
    setActiveChatId(id);
  };

  const handleDeleteChat = (id: string) => {
    setChatList((prev) => {
      const next = prev.filter((c) => c.id !== id);
      if (activeChatId === id && next.length > 0) setActiveChatId(next[0].id);
      return next;
    });
  };

  return (
    <div
      className="flex flex-col flex-shrink-0 overflow-hidden transition-[width] duration-300 bg-[#F7F7F7]"
      style={{ width: agentsPanelOpen ? 200 : 0, paddingTop: agentsPanelOpen ? 10 : 0, paddingRight: agentsPanelOpen ? 10 : 0, paddingBottom: agentsPanelOpen ? 20 : 0 }}
    >
      <div className="flex justify-end flex-shrink-0 mb-2.5">
        <Button variant="ghost" size="icon-sm" onClick={() => setAgentsPanelOpen(false)} title="Close Agents panel">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
            <path d="M5.08789 8.728C5.08789 7.77365 5.86154 7 6.81589 7H17.1839C18.1382 7 18.9119 7.77365 18.9119 8.728V14.776C18.9119 15.7303 18.1382 16.504 17.1839 16.504H6.81589C5.86154 16.504 5.08789 15.7303 5.08789 14.776V8.728Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
            <path d="M17 8H15C14.4477 8 14 8.44772 14 9V14.5C14 15.0523 14.4477 15.5 15 15.5H17C17.5523 15.5 18 15.0523 18 14.5V9C18 8.44772 17.5523 8 17 8Z" fill="currentColor" fillOpacity="0.7" />
          </svg>
        </Button>
      </div>

      <div className="flex-shrink-0 mb-5 flex flex-col gap-1 min-w-0">
        <button
          onClick={handleNewChat}
          className="bg-[#fbfbfb] border border-gray-200 rounded-md px-3.5 py-2 text-[12px] font-medium text-gray-900 cursor-pointer text-center hover:bg-gray-50"
        >
          New Agent
        </button>
        <div className="border border-gray-200 rounded-md px-3.5 py-2 text-[12px] font-medium text-gray-400">
          Search Agents...
        </div>
      </div>

      <div className="text-[12px] font-medium text-gray-400 mb-2 flex-shrink-0">Agents</div>

      <div className="flex-1 overflow-y-auto flex flex-col gap-1.5 min-w-0">
        {chatList.map((chat) => (
          <div
            key={chat.id}
            onClick={() => setActiveChatId(chat.id)}
            onMouseEnter={() => setHoveredId(chat.id)}
            onMouseLeave={() => setHoveredId(null)}
            className={cn(
              'rounded-md px-1.5 cursor-pointer min-w-0',
              chat.id === activeChatId ? 'bg-gray-200' : hoveredId === chat.id ? 'bg-gray-100' : ''
            )}
          >
            <div className="flex flex-col gap-1 py-2 px-1">
              <div className="flex justify-between items-center">
                <span className="text-[12px] font-medium text-gray-900 truncate">{chat.name}</span>
                {hoveredId === chat.id ? (
                  <span
                    className="text-[11px] text-red-500 cursor-pointer flex-shrink-0 ml-1 hover:text-red-700"
                    onClick={(e) => { e.stopPropagation(); handleDeleteChat(chat.id); }}
                  >
                    Delete
                  </span>
                ) : (
                  <span className="text-[10px] text-gray-400 flex-shrink-0 ml-2">{chat.timeAgo}</span>
                )}
              </div>
              <span className="text-[10px] text-gray-400">{chat.date}</span>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}

export function AIChatPanel() {
  const [chatList, setChatList] = useAtom(chatListAtom);
  const [activeChatId, setActiveChatId] = useAtom(activeChatIdAtom);
  const setChatCollapsed = useSetAtom(chatCollapsedAtom);
  const chatWidth = useAtomValue(chatWidthAtom);
  const [agentsPanelOpen, setAgentsPanelOpen] = useAtom(agentsPanelOpenAtom);

  const [input, setInput] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLTextAreaElement>(null);

  const activeChat = chatList.find((c) => c.id === activeChatId);
  const messages = activeChat?.messages || [];

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isTyping]);

  const handleSend = () => {
    const text = input.trim();
    if (!text) return;
    const userMsg: ChatMessage = { role: 'user', content: text, time: new Date() };
    setChatList((prev) =>
      prev.map((c) => c.id === activeChatId ? { ...c, messages: [...c.messages, userMsg] } : c)
    );
    setInput('');
    setIsTyping(true);
    setTimeout(() => {
      setIsTyping(false);
      const aiMsg: ChatMessage = {
        role: 'ai',
        content: "I'm Flow AI \u2014 this is a prototype response. I can help you analyze interfaces, requirements, and system architecture.",
        time: new Date(),
      };
      setChatList((prev) =>
        prev.map((c) => c.id === activeChatId ? { ...c, messages: [...c.messages, aiMsg] } : c)
      );
    }, 1200);
  };

  const handleNewChat = () => {
    const id = `c${Date.now()}`;
    const newChat: Chat = { id, name: `Chat ${chatList.length + 1}`, timeAgo: 'now', date: new Date().toLocaleDateString(), messages: [] };
    setChatList((prev) => [...prev, newChat]);
    setActiveChatId(id);
  };

  const ChatTabs = () => (
    <div className="flex items-center flex-shrink-0 w-full">
      <div className="flex items-center gap-0.5 flex-1 min-w-0 overflow-x-auto scrollbar-none">
        {chatList.map((chat) => (
          <div
            key={chat.id}
            onClick={() => setActiveChatId(chat.id)}
            className={cn(
              'rounded-md px-2 py-1 text-[12px] font-medium text-gray-900 whitespace-nowrap cursor-pointer flex-shrink-0 truncate max-w-[120px]',
              chat.id === activeChatId ? 'bg-gray-200' : 'bg-white hover:bg-gray-50'
            )}
          >
            {chat.name}
          </div>
        ))}
      </div>
      <button
        onClick={handleNewChat}
        className="w-6 h-6 flex items-center justify-center cursor-pointer flex-shrink-0"
      >
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
          <path d="M12 8.4V15.6M8.4 12H15.6" stroke="#151414" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
      </button>
    </div>
  );

  const InputArea = ({ maxH = 140 }: { maxH?: number }) => (
    <div
      className="border border-gray-200 rounded-md flex flex-col justify-between flex-shrink-0 overflow-hidden"
      style={{ maxHeight: maxH, flex: 1 }}
    >
      <textarea
        ref={inputRef}
        value={input}
        onChange={(e) => setInput(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSend(); }
        }}
        placeholder="Plan, leave comment, or tag @flow"
        rows={2}
        className="w-full px-2 pt-2 pb-1 border-none bg-transparent text-[12px] text-gray-900 resize-none outline-none leading-relaxed flex-1 placeholder:text-gray-400"
      />
      <div className="flex items-center justify-between px-2 pb-2">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="none" className="cursor-pointer">
          <path d="M16.174 11.7034L11.9467 15.9307C10.7962 17.0812 9.07061 17.2171 7.89752 16.044C6.74694 14.8934 6.89648 13.2266 8.06957 12.0535L12.8215 7.30159C13.5487 6.57432 14.7196 6.57431 15.4468 7.30158C16.1741 8.02885 16.1741 9.19969 15.4468 9.92696L10.6115 14.7623C10.249 15.1248 9.66131 15.1248 9.29882 14.7623C8.93633 14.3998 8.93633 13.8121 9.29882 13.4496L13.6095 9.1389" stroke="#C1C1C1" strokeWidth="1.2" strokeLinecap="round" />
        </svg>
        <button onClick={handleSend} className={cn('w-6 h-6 flex items-center justify-center', input.trim() ? 'cursor-pointer' : 'cursor-default')}>
          <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
            <rect width="24" height="24" rx="6" fill="#E4E4E4" />
            <path d="M7.8 11.2L12 7.2M12 7.2L16.2 11.2M12 7.2V16.8" stroke="black" strokeWidth="1.2" strokeLinecap="round" strokeLinejoin="round" />
          </svg>
        </button>
      </div>
    </div>
  );

  return (
    <div className="flex flex-shrink-0">
      {agentsPanelOpen && <AgentsPanel />}
      <div
        className="bg-[#F7F7F7] flex flex-col gap-2.5 flex-shrink-0 overflow-hidden p-2.5"
        style={{ width: chatWidth }}
      >
        {/* Header */}
        <div className="flex items-center justify-between flex-shrink-0 px-2">
          <div className="flex items-center gap-2.5">
            <svg width="24" height="24" viewBox="0 0 24 24" fill="none">
              <path fillRule="evenodd" clipRule="evenodd" d="M1.69 0.02C0.84 0.13 0.27 1 0.05 2.5C-0.03 3.06-0.01 4.73 0.07 5.5C0.28 7.33 0.69 9.29 1.22 11.04C1.54 12.07 1.52 12 1.47 12.17C0.76 14.4 0.3 16.49 0.07 18.54C-0.01 19.32-0.03 20.96 0.05 21.51C0.23 22.78 0.65 23.57 1.31 23.88C1.53 23.99 1.6 24 1.94 24C2.56 24 3.12 23.76 3.91 23.16C4.28 22.88 5.27 21.91 5.79 21.32L6.19 20.87L6.8 21.48C8.14 22.82 9.32 23.53 10.82 23.91C11.04 23.96 11.28 23.98 12 23.98C12.86 23.98 12.92 23.98 13.34 23.87C14.74 23.5 15.91 22.77 17.22 21.46L17.83 20.87C17.91 21.01 18.75 21.91 19.2 22.35C20.43 23.55 21.21 24 22.08 24C22.42 24 22.47 23.99 22.73 23.86C23.37 23.54 23.77 22.77 23.95 21.51C24.02 21.02 24.02 19.37 23.95 18.72C23.73 16.67 23.29 14.56 22.66 12.56C22.57 12.29 22.5 12.04 22.5 12.01C22.5 11.98 22.57 11.73 22.66 11.45C23.29 9.46 23.73 7.35 23.95 5.3C24.02 4.65 24.02 2.99 23.95 2.5C23.77 1.27 23.36 0.47 22.76 0.16C22.5 0.03 22.35 0 21.99 0.01C21.23 0.02 20.33 0.55 19.2 1.66L18.36 3.14C17.82 2.87 17.54 2.87 17.2 2.54C16.34 1.67 15.62 1.13 14.78 0.7C13.8 0.2 13.01 0.01 12 0.01C11.33 0.01 10.81 0.09 10.18 0.3C9.01 0.69 7.95 1.39 6.8 2.53L6.19 3.14L5.79 2.69C5.28 2.11 4.28 1.14 3.9 0.85C3.44 0.49 2.98 0.24 2.62 0.12C2.23 0 2.01-0.02 1.69 0.02Z" fill="black" />
            </svg>
            <span className="text-[14px] font-medium text-gray-900 whitespace-nowrap">Flow AI Agent</span>
          </div>
          <div className="flex items-center gap-1">
            <Button variant="ghost" size="icon-sm" onClick={() => setChatCollapsed(true)} title="Collapse AI chat">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
                <path d="M11.3348 6.70351C11.5634 6.08581 12.4371 6.08581 12.6656 6.70351L13.8033 9.77799C13.8752 9.97219 14.0283 10.1253 14.2225 10.1972L17.297 11.3348C17.9147 11.5634 17.9147 12.4371 17.297 12.6656L14.2225 13.8033C14.0283 13.8752 13.8752 14.0283 13.8033 14.2225L12.6656 17.297C12.4371 17.9147 11.5634 17.9147 11.3348 17.297L10.1972 14.2225C10.1253 14.0283 9.97219 13.8752 9.77799 13.8033L6.70351 12.6656C6.08581 12.4371 6.08581 11.5634 6.70351 11.3348L9.77799 10.1972C9.97219 10.1253 10.1253 9.97219 10.1972 9.77799L11.3348 6.70351Z" stroke="#151414" strokeWidth="1.2" strokeLinejoin="round" />
              </svg>
            </Button>
            {!agentsPanelOpen && (
              <Button variant="ghost" size="icon-sm" onClick={() => setAgentsPanelOpen(true)} title="Toggle Agents panel">
                <svg width="18" height="18" viewBox="0 0 24 24" fill="none">
                  <path d="M5.09 8.73C5.09 7.77 5.86 7 6.82 7H17.18C18.14 7 18.91 7.77 18.91 8.73V14.78C18.91 15.73 18.14 16.5 17.18 16.5H6.82C5.86 16.5 5.09 15.73 5.09 14.78V8.73Z" stroke="currentColor" strokeLinecap="round" strokeLinejoin="round" />
                  <path d="M17 8H15C14.45 8 14 8.45 14 9V14.5C14 15.05 14.45 15.5 15 15.5H17C17.55 15.5 18 15.05 18 14.5V9C18 8.45 17.55 8 17 8Z" fill="currentColor" fillOpacity="0.7" />
                </svg>
              </Button>
            )}
          </div>
        </div>

        {/* White card */}
        <div className="bg-white rounded-xl flex-1 flex flex-col gap-2 p-2.5 min-h-0 min-w-0 overflow-hidden border border-gray-200">
          {messages.length === 0 ? (
            <div className="flex-1 flex flex-col gap-2 min-h-0 min-w-0">
              <ChatTabs />
              <InputArea maxH={140} />
              <div className="flex-1" />
            </div>
          ) : (
            <>
              <div className="flex-1 flex flex-col gap-2 min-h-0 min-w-0 overflow-y-auto">
                <ChatTabs />
                {messages.map((msg, i) =>
                  msg.role === 'user' ? (
                    <div key={i} className="border border-gray-200 rounded-md px-2 py-1.5 max-h-[140px] overflow-auto flex-shrink-0">
                      <div className="text-[12px] font-medium text-gray-900 leading-relaxed break-words">{msg.content}</div>
                    </div>
                  ) : (
                    <div key={i} className="px-1 flex-shrink-0">
                      <div className="text-[12px] font-medium text-black leading-[17px] break-words">{msg.content}</div>
                    </div>
                  )
                )}
                {isTyping && (
                  <div className="px-1 flex-shrink-0">
                    <div className="flex gap-1 pt-1">
                      {[0, 1, 2].map((j) => (
                        <div
                          key={j}
                          className="w-[5px] h-[5px] rounded-full bg-gray-400 animate-pulse"
                          style={{ animationDelay: `${j * 200}ms` }}
                        />
                      ))}
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
              <InputArea maxH={100} />
            </>
          )}
        </div>
      </div>
    </div>
  );
}
