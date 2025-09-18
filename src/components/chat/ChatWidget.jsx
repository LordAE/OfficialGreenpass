import React, { useEffect, useRef, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Phone, MessageCircle, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { User as UserEntity, ChatSettings, Conversation, Message } from '@/api/entities';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [chatSettings, setChatSettings] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  const listRef = useRef(null);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [user, settingsList] = await Promise.all([UserEntity.me(), ChatSettings.list()]);
        setCurrentUser(user);
        if (Array.isArray(settingsList) && settingsList.length > 0) {
          setChatSettings(settingsList[0]);
        }
      } catch {
        // user not logged in or settings missing — ignore for widget
      }
    };
    fetchInitialData();
  }, []);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      if (listRef.current) {
        listRef.current.scrollTo({
          top: listRef.current.scrollHeight,
          behavior: 'smooth',
        });
      }
    });
  };

  const loadConversation = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      const convs = await Conversation.filter(
        { user_id: currentUser.id, status: 'open' },
        '-created_date',
        1
      );
      let currentConv = convs && convs[0];
      if (!currentConv) {
        currentConv = await Conversation.create({
          user_id: currentUser.id,
          role: currentUser.user_type,
          lang: (currentUser.settings && currentUser.settings.language) || 'en',
          status: 'open',
          channel: 'in_app',
          last_activity: new Date().toISOString(),
        });
      }
      setConversation(currentConv);

      const msgs = await Message.filter(
        { conversation_id: currentConv.id },
        'created_date'
      );
      setMessages(msgs || []);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to load conversation:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    const text = newMessage.trim();
    if (!text || !conversation || loading) return;

    setNewMessage('');
    const localUserMsg = {
      id: 'local-' + Date.now(),
      sender: 'user',
      text,
      created_date: new Date().toISOString(),
    };
    setMessages((prev) => [...prev, localUserMsg]);
    scrollToBottom();

    try {
      const created = await Message.create({
        conversation_id: conversation.id,
        sender: 'user',
        text,
      });

      // Simulated AI reply (replace with your AI integration)
      const aiText = 'Thanks for your message! An agent will get back to you shortly.';
      const createdAI = await Message.create({
        conversation_id: conversation.id,
        sender: 'ai',
        text: aiText,
      });

      setMessages((prev) => [
        ...prev.filter((m) => m.id !== localUserMsg.id),
        created || localUserMsg,
        createdAI,
      ]);
      scrollToBottom();
    } catch (err) {
      console.error('Failed to send message:', err);
    }
  };

  const toggleMenu = () => {
    setIsOpen((v) => !v);
    if (isAiChatOpen) setIsAiChatOpen(false);
  };

  const toggleAiChat = async () => {
    setIsOpen(false);
    if (!isAiChatOpen) {
      await loadConversation();
    }
    setIsAiChatOpen((v) => !v);
  };

  if (!currentUser) return null; // hide when not logged in

  const whatsappLink = chatSettings && chatSettings.whatsapp_number
    ? `https://wa.me/${String(chatSettings.whatsapp_number).replace(/\D/g, '')}`
    : null;

  const zaloLink = chatSettings && chatSettings.zalo_number
    ? `https://zalo.me/${String(chatSettings.zalo_number).replace(/\D/g, '')}`
    : null;

  return (
    <>
      <div className="fixed bottom-24 md:bottom-8 right-4 sm:right-6 z-50">
        <AnimatePresence>
          {isOpen && (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 20 }}
              className="flex flex-col items-end space-y-3 mb-4"
            >
              {whatsappLink && (
                <a
                  href={whatsappLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105"
                >
                  <span className="font-semibold text-gray-700 text-sm">Chat on WhatsApp</span>
                  <Phone className="w-8 h-8 text-green-600" />
                </a>
              )}
              {zaloLink && (
                <a
                  href={zaloLink}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-3 bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105"
                >
                  <span className="font-semibold text-gray-700 text-sm">Chat on Zalo</span>
                  <MessageCircle className="w-8 h-8 text-blue-600" />
                </a>
              )}
              <button
                onClick={toggleAiChat}
                className="flex items-center gap-3 bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105"
              >
                <span className="font-semibold text-gray-700 text-sm">AI Support Chat</span>
                <div className="w-8 h-8 rounded-full bg-gradient-to-br from-green-500 to-blue-500 flex items-center justify-center">
                  <MessageSquare className="w-5 h-5 text-white" />
                </div>
              </button>
            </motion.div>
          )}
        </AnimatePresence>

        <motion.button
          whileHover={{ scale: 1.1 }}
          whileTap={{ scale: 0.9 }}
          onClick={toggleMenu}
          className="bg-green-600 text-white p-4 rounded-full shadow-lg hover:bg-green-700 focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-offset-2"
          aria-label="Open chat menu"
        >
          {isOpen || isAiChatOpen ? <X className="h-6 w-6" /> : <MessageSquare className="h-6 w-6" />}
        </motion.button>
      </div>

      <AnimatePresence>
        {isAiChatOpen && (
          <motion.div
            initial={{ opacity: 0, y: 50, scale: 0.8 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 50, scale: 0.8 }}
            transition={{ type: 'spring', stiffness: 300, damping: 30 }}
            className="fixed bottom-40 md:bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-80 h-96 bg-white rounded-lg shadow-xl flex flex-col z-50"
          >
            <div className="flex items-center justify-between p-4 bg-green-600 text-white rounded-t-lg">
              <h3 className="font-semibold text-base">AI Support Chat</h3>
              <button
                onClick={() => setIsAiChatOpen(false)}
                className="text-white hover:text-gray-200 focus:outline-none"
                aria-label="Close chat"
              >
                <X className="h-5 w-5" />
              </button>
            </div>

            <div ref={listRef} className="flex-1 p-4 overflow-y-auto space-y-4">
              {loading ? (
                <div className="text-center text-gray-500">Loading chat...</div>
              ) : (
                messages.map((msg, idx) => {
                  const isUser = msg.sender === 'user';
                  return (
                    <div
                      key={msg.id || msg.created_date || idx}
                      className={`flex items-end gap-2 ${isUser ? 'justify-end' : ''}`}
                    >
                      {!isUser && (
                        <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                          <Bot className="w-5 h-5 text-gray-600" />
                        </div>
                      )}
                      <div
                        className={`px-4 py-2 rounded-2xl max-w-xs ${
                          isUser
                            ? 'bg-green-600 text-white rounded-br-none'
                            : 'bg-gray-100 text-gray-800 rounded-bl-none'
                        }`}
                      >
                        <p className="text-sm">{msg.text}</p>
                      </div>
                      {isUser && (
                        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-semibold">
                          {(currentUser && currentUser.full_name && currentUser.full_name.charAt(0)) || 'U'}
                        </div>
                      )}
                    </div>
                  );
                })
              )}
            </div>

            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyDown={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="w-full p-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                  disabled={loading}
                />
                <Button
                  onClick={handleSendMessage}
                  size="icon"
                  className="bg-green-600 hover:bg-green-700"
                  disabled={!newMessage.trim() || loading || !conversation}
                >
                  <Send className="w-4 h-4" />
                </Button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
};

export default ChatWidget;
