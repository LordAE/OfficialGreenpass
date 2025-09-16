import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { MessageSquare, X, Send, Phone, User, MessageCircle, Bot } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { User as UserEntity } from '@/api/entities';
import { ChatSettings } from '@/api/entities';
import { Conversation } from '@/api/entities';
import { Message } from '@/api/entities';

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isAiChatOpen, setIsAiChatOpen] = useState(false);
  const [chatSettings, setChatSettings] = useState(null);
  const [currentUser, setCurrentUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [newMessage, setNewMessage] = useState('');
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      try {
        const [user, settingsList] = await Promise.all([
          UserEntity.me(),
          ChatSettings.list(),
        ]);
        setCurrentUser(user);
        if (settingsList.length > 0) {
          setChatSettings(settingsList[0]);
        }
      } catch (error) {
        console.warn("User not logged in or chat settings not found.");
      }
    };
    fetchInitialData();
  }, []);

  const loadConversation = async () => {
    if (!currentUser) return;
    setLoading(true);
    try {
      let convs = await Conversation.filter({ user_id: currentUser.id });
      let currentConv;
      if (convs.length > 0) {
        currentConv = convs[0];
      } else {
        currentConv = await Conversation.create({
          user_id: currentUser.id,
          role: currentUser.user_type,
          lang: currentUser.settings?.language || 'en',
        });
      }
      setConversation(currentConv);
      const msgs = await Message.filter({ conversation_id: currentConv.id }, 'created_date');
      setMessages(msgs);
    } catch (error) {
      console.error("Failed to load conversation:", error);
    } finally {
      setLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!newMessage.trim() || !conversation) return;
    const text = newMessage;
    setNewMessage('');
    const userMessage = { sender: 'user', text, created_date: new Date().toISOString() };
    setMessages(prev => [...prev, userMessage]);

    try {
      await Message.create({
        conversation_id: conversation.id,
        sender: 'user',
        text: text,
      });
      // Here you would typically call an AI endpoint and get a response.
      // For now, we'll just simulate a response.
      const aiResponseText = "Thanks for your message! An agent will get back to you shortly.";
      const aiMessage = { sender: 'ai', text: aiResponseText, created_date: new Date().toISOString() };
       await Message.create({
        conversation_id: conversation.id,
        sender: 'ai',
        text: aiResponseText,
      });
      setMessages(prev => [...prev, aiMessage]);
    } catch (error) {
      console.error("Failed to send message:", error);
    }
  };

  const toggleMenu = () => {
    setIsOpen(!isOpen);
    if (isAiChatOpen) setIsAiChatOpen(false);
  };

  const toggleAiChat = () => {
    setIsOpen(false);
    if (!isAiChatOpen) {
      loadConversation();
    }
    setIsAiChatOpen(!isAiChatOpen);
  };

  if (!currentUser) {
    return null; // Don't render widget if user is not logged in
  }

  const whatsappLink = chatSettings?.whatsapp_number ? `https://wa.me/${chatSettings.whatsapp_number.replace(/\D/g, '')}` : null;
  const zaloLink = chatSettings?.zalo_number ? `https://zalo.me/${chatSettings.zalo_number.replace(/\D/g, '')}` : null;

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
                <a href={whatsappLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105">
                  <span className="font-semibold text-gray-700 text-sm">Chat on WhatsApp</span>
                  <Phone className="w-8 h-8 text-green-600" />
                </a>
              )}
              {zaloLink && (
                <a href={zaloLink} target="_blank" rel="noopener noreferrer" className="flex items-center gap-3 bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105">
                  <span className="font-semibold text-gray-700 text-sm">Chat on Zalo</span>
                  <MessageCircle className="w-8 h-8 text-blue-600" />
                </a>
              )}
              <button onClick={toggleAiChat} className="flex items-center gap-3 bg-white p-3 rounded-full shadow-lg hover:bg-gray-100 transition-all transform hover:scale-105">
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
            transition={{ type: "spring", stiffness: 300, damping: 30 }}
            className="fixed bottom-40 md:bottom-24 right-4 sm:right-6 w-[calc(100vw-2rem)] sm:w-80 h-96 bg-white rounded-lg shadow-xl flex flex-col z-50"
          >
            <div className="flex items-center justify-between p-4 bg-green-600 text-white rounded-t-lg">
              <h3 className="font-semibold text-base">AI Support Chat</h3>
              <button onClick={() => setIsAiChatOpen(false)} className="text-white hover:text-gray-200 focus:outline-none" aria-label="Close chat">
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="flex-1 p-4 overflow-y-auto space-y-4">
              {loading ? (
                <div className="text-center text-gray-500">Loading chat...</div>
              ) : (
                messages.map((msg, index) => (
                  <div key={index} className={`flex items-end gap-2 ${msg.sender === 'user' ? 'justify-end' : ''}`}>
                    {msg.sender !== 'user' && (
                      <div className="w-8 h-8 rounded-full bg-gray-200 flex items-center justify-center flex-shrink-0">
                        <Bot className="w-5 h-5 text-gray-600" />
                      </div>
                    )}
                    <div className={`px-4 py-2 rounded-2xl max-w-xs ${
                      msg.sender === 'user'
                        ? 'bg-green-600 text-white rounded-br-none'
                        : 'bg-gray-100 text-gray-800 rounded-bl-none'
                    }`}>
                      <p className="text-sm">{msg.text}</p>
                    </div>
                    {msg.sender === 'user' && (
                       <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center flex-shrink-0 text-white font-semibold">
                        {currentUser?.full_name?.charAt(0) || 'U'}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
            <div className="p-4 border-t border-gray-200">
              <div className="flex items-center gap-2">
                <Input
                  type="text"
                  placeholder="Type your message..."
                  value={newMessage}
                  onChange={(e) => setNewMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  className="w-full p-2 border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-green-500 text-sm"
                />
                <Button onClick={handleSendMessage} size="icon" className="bg-green-600 hover:bg-green-700">
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