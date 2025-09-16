import React, { useState, useEffect, useRef } from "react";
import { User } from "@/api/entities";
import { Conversation } from "@/api/entities";
import { Message } from "@/api/entities";
import { FAQ } from "@/api/entities";
import { InvokeLLM } from "@/api/integrations";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader } from "@/components/ui/card";
import { 
  MessageCircle, 
  X, 
  Send, 
  Bot, 
  User as UserIcon,
  Headphones,
  Globe,
  Minimize2,
  Maximize2
} from "lucide-react";

const ChatWidget = () => {
  const [isOpen, setIsOpen] = useState(false);
  const [isMinimized, setIsMinimized] = useState(false);
  const [currentUser, setCurrentUser] = useState(null);
  const [conversation, setConversation] = useState(null);
  const [messages, setMessages] = useState([]);
  const [inputText, setInputText] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const [language, setLanguage] = useState("en");
  const [quickActions, setQuickActions] = useState([]);
  const messagesEndRef = useRef(null);

  useEffect(() => {
    const initChat = async () => {
      try {
        const user = await User.me();
        setCurrentUser(user);
        
        // Load existing conversation or create new one
        const existingConversations = await Conversation.filter({ 
          user_id: user.id, 
          status: 'open' 
        }, '-created_date', 1);
        
        if (existingConversations.length > 0) {
          const conv = existingConversations[0];
          setConversation(conv);
          setLanguage(conv.lang);
          await loadMessages(conv.id);
        }
        
        // Load quick actions based on user role
        await loadQuickActions(user.user_type);
      } catch (error) {
        console.error("Chat initialization error:", error);
      }
    };
    
    if (isOpen) {
      initChat();
    }
  }, [isOpen]);

  const loadMessages = async (conversationId) => {
    try {
      const msgs = await Message.filter({ conversation_id: conversationId }, 'created_date');
      setMessages(msgs);
      scrollToBottom();
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const loadQuickActions = async (userType) => {
    try {
      const actions = {
        student: [
          { id: 'reservations', label: 'Reservations', icon: '🎫' },
          { id: 'payments', label: 'Payments', icon: '💳' },
          { id: 'visa', label: 'Visa Status', icon: '📋' },
          { id: 'tutors', label: 'Find Tutors', icon: '👩‍🏫' }
        ],
        agent: [
          { id: 'commissions', label: 'Commissions', icon: '💰' },
          { id: 'students', label: 'My Students', icon: '👥' },
          { id: 'verification', label: 'Verification', icon: '✅' }
        ],
        tutor: [
          { id: 'earnings', label: 'Earnings', icon: '💵' },
          { id: 'schedule', label: 'Schedule', icon: '📅' },
          { id: 'students', label: 'Students', icon: '🎓' }
        ],
        vendor: [
          { id: 'orders', label: 'Orders', icon: '📦' },
          { id: 'services', label: 'My Services', icon: '🛍️' },
          { id: 'payouts', label: 'Payouts', icon: '💸' }
        ]
      };
      
      setQuickActions(actions[userType] || actions.student);
    } catch (error) {
      console.error("Error loading quick actions:", error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 100);
  };

  const createOrGetConversation = async () => {
    if (conversation) return conversation;
    
    const newConv = await Conversation.create({
      user_id: currentUser.id,
      role: currentUser.user_type,
      lang: language,
      channel: 'in_app',
      status: 'open',
      last_activity: new Date().toISOString()
    });
    
    setConversation(newConv);
    
    // Send welcome message
    const welcomeText = language === 'vi' 
      ? "Xin chào! Tôi là trợ lý AI của GreenPass. Tôi có thể giúp bạn về đặt chỗ, thanh toán, visa và nhiều vấn đề khác. Bạn có thể chuyển ngôn ngữ bất cứ lúc nào bằng cách nói 'Tiếng Việt' hoặc 'English'."
      : "Hi! I'm GreenPass AI Assistant. I can help you with reservations, payments, visa questions, and more. You can switch languages anytime by saying 'Vietnamese' or 'English'.";
    
    await addMessage(newConv.id, 'ai', welcomeText);
    return newConv;
  };

  const addMessage = async (conversationId, sender, text, meta = null, actions = null) => {
    const message = await Message.create({
      conversation_id: conversationId,
      sender,
      text,
      meta,
      actions: actions || []
    });
    
    setMessages(prev => [...prev, message]);
    scrollToBottom();
    return message;
  };

  const handleSendMessage = async () => {
    if (!inputText.trim() || isTyping) return;
    
    const conv = await createOrGetConversation();
    await addMessage(conv.id, 'user', inputText);
    
    const userMessage = inputText;
    setInputText("");
    setIsTyping(true);
    
    try {
      // Check for language switch
      if (userMessage.toLowerCase().includes('vietnamese') || userMessage.toLowerCase().includes('tiếng việt')) {
        setLanguage('vi');
        await addMessage(conv.id, 'ai', "Đã chuyển sang tiếng Việt. Tôi có thể giúp gì cho bạn?");
        setIsTyping(false);
        return;
      }
      
      if (userMessage.toLowerCase().includes('english')) {
        setLanguage('en');
        await addMessage(conv.id, 'ai', "Switched to English. How can I help you?");
        setIsTyping(false);
        return;
      }
      
      // Check for escalation triggers
      const escalationTriggers = [
        'talk to human', 'speak to agent', 'human support', 
        'complaint', 'refund', 'payment failed', 'visa rejected'
      ];
      
      if (escalationTriggers.some(trigger => userMessage.toLowerCase().includes(trigger))) {
        await handleEscalation(conv.id, userMessage);
        setIsTyping(false);
        return;
      }
      
      // Try to find FAQ match first
      const faqResponse = await findFAQMatch(userMessage);
      if (faqResponse) {
        await addMessage(conv.id, 'ai', faqResponse.answer, 
          { confidence: faqResponse.confidence, answer_type: 'faq', source_id: faqResponse.faq_id },
          faqResponse.actions
        );
        setIsTyping(false);
        return;
      }
      
      // Use AI for more complex queries
      const aiResponse = await getAIResponse(userMessage, currentUser);
      await addMessage(conv.id, 'ai', aiResponse.text, 
        { confidence: aiResponse.confidence, answer_type: 'ai' },
        aiResponse.actions
      );
      
    } catch (error) {
      console.error("Error processing message:", error);
      const errorText = language === 'vi' 
        ? "Xin lỗi, có lỗi xảy ra. Bạn có muốn tôi kết nối với hỗ trợ khách hàng không?"
        : "Sorry, there was an error. Would you like me to connect you with human support?";
      
      await addMessage(conv.id, 'ai', errorText, null, [
        { type: 'escalate', label: language === 'vi' ? 'Kết nối hỗ trợ' : 'Contact Support' }
      ]);
    }
    
    setIsTyping(false);
  };

  const findFAQMatch = async (query) => {
    try {
      const faqs = await FAQ.filter({ lang: language });
      
      // Simple keyword matching (in production, use semantic search)
      const keywords = query.toLowerCase().split(' ');
      let bestMatch = null;
      let bestScore = 0;
      
      faqs.forEach(faq => {
        const faqText = (faq.title + ' ' + faq.body + ' ' + faq.tags.join(' ')).toLowerCase();
        const score = keywords.reduce((acc, keyword) => {
          return acc + (faqText.includes(keyword) ? 1 : 0);
        }, 0);
        
        if (score > bestScore && score > 0) {
          bestScore = score;
          bestMatch = faq;
        }
      });
      
      if (bestMatch && bestScore >= 2) {
        const actions = [];
        
        // Add contextual actions based on FAQ category
        if (bestMatch.category === 'reservations') {
          actions.push({ 
            type: 'link', 
            label: language === 'vi' ? 'Xem đặt chỗ' : 'View Reservations',
            url: '/reservations' 
          });
        } else if (bestMatch.category === 'payments') {
          actions.push({ 
            type: 'link', 
            label: language === 'vi' ? 'Thanh toán' : 'Make Payment',
            url: '/payments' 
          });
        }
        
        return {
          answer: bestMatch.body,
          confidence: bestScore / keywords.length,
          faq_id: bestMatch.id,
          actions
        };
      }
      
      return null;
    } catch (error) {
      console.error("FAQ search error:", error);
      return null;
    }
  };

  const getAIResponse = async (query, user) => {
    try {
      const prompt = `
        You are GreenPass AI Assistant helping ${user.user_type}s with study abroad questions.
        User query: "${query}"
        Language: ${language === 'vi' ? 'Vietnamese' : 'English'}
        
        Provide a helpful, concise response. If you're not confident, suggest connecting with human support.
        Keep responses under 200 words.
        ${language === 'vi' ? 'Respond in Vietnamese.' : 'Respond in English.'}
      `;
      
      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: false
      });
      
      return {
        text: response || (language === 'vi' ? 
          "Tôi cần thêm thông tin để trả lời câu hỏi này. Bạn có muốn tôi kết nối với hỗ trợ khách hàng không?" :
          "I need more information to answer this question. Would you like me to connect you with human support?"
        ),
        confidence: 0.7,
        actions: [{
          type: 'escalate',
          label: language === 'vi' ? 'Kết nối hỗ trợ' : 'Contact Support'
        }]
      };
    } catch (error) {
      console.error("AI response error:", error);
      return {
        text: language === 'vi' ? 
          "Xin lỗi, tôi không thể trả lời câu hỏi này. Hãy để tôi kết nối bạn với hỗ trợ khách hàng." :
          "Sorry, I can't answer this question. Let me connect you with human support.",
        confidence: 0.3,
        actions: [{
          type: 'escalate',
          label: language === 'vi' ? 'Kết nối hỗ trợ' : 'Contact Support'
        }]
      };
    }
  };

  const handleEscalation = async (conversationId, userMessage) => {
    // In production, this would create a support ticket and notify agents
    const escalationText = language === 'vi' ?
      "Tôi sẽ kết nối bạn với đội ngũ hỗ trợ của GreenPass. Một chuyên viên sẽ phản hồi trong vòng 60 phút. Số ticket: #GP-" + Date.now() :
      "I'll connect you with GreenPass support team. An advisor will respond within 60 minutes. Ticket #GP-" + Date.now();
    
    await addMessage(conversationId, 'ai', escalationText);
    
    // Update conversation status
    await Conversation.update(conversationId, { 
      status: 'handed_off',
      escalation_count: conversation.escalation_count + 1 
    });
  };

  const handleQuickAction = async (action) => {
    const conv = await createOrGetConversation();
    
    const actionQueries = {
      reservations: language === 'vi' ? 'Tình trạng đặt chỗ của tôi' : 'My reservation status',
      payments: language === 'vi' ? 'Cách thanh toán học phí' : 'How to pay tuition',
      visa: language === 'vi' ? 'Tình trạng visa của tôi' : 'My visa status',
      tutors: language === 'vi' ? 'Cách đặt giáo viên' : 'How to book tutors',
      commissions: language === 'vi' ? 'Hoa hồng của tôi' : 'My commissions',
      students: language === 'vi' ? 'Học sinh của tôi' : 'My students',
      earnings: language === 'vi' ? 'Thu nhập của tôi' : 'My earnings',
      schedule: language === 'vi' ? 'Lịch dạy của tôi' : 'My teaching schedule'
    };
    
    const query = actionQueries[action.id];
    if (query) {
      setInputText(query);
      handleSendMessage();
    }
  };

  const MessageBubble = ({ message }) => {
    const isAI = message.sender === 'ai';
    const isSupport = message.sender === 'support';
    
    return (
      <div className={`flex ${isAI || isSupport ? 'justify-start' : 'justify-end'} mb-4`}>
        <div className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
          isAI ? 'bg-blue-100 text-blue-900' :
          isSupport ? 'bg-green-100 text-green-900' :
          'bg-emerald-500 text-white'
        }`}>
          {(isAI || isSupport) && (
            <div className="flex items-center gap-2 mb-1">
              {isAI ? <Bot className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
              <span className="text-xs font-medium">
                {isAI ? 'GreenPass AI' : 'Support Team'}
              </span>
            </div>
          )}
          <p className="text-sm">{message.text}</p>
          
          {message.actions && message.actions.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {message.actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (action.type === 'escalate') {
                      handleEscalation(conversation.id, 'User requested human support');
                    } else if (action.url) {
                      window.open(action.url, '_blank');
                    }
                  }}
                  className="text-xs"
                >
                  {action.label}
                </Button>
              ))}
            </div>
          )}
        </div>
      </div>
    );
  };

  if (!isOpen) {
    return (
      <Button
        onClick={() => setIsOpen(true)}
        className="fixed bottom-6 right-6 w-14 h-14 rounded-full bg-gradient-to-r from-emerald-500 to-blue-500 text-white shadow-lg hover:shadow-xl transition-all duration-300 z-50"
      >
        <MessageCircle className="w-6 h-6" />
      </Button>
    );
  }

  return (
    <Card className={`fixed bottom-6 right-6 w-96 bg-white shadow-2xl z-50 transition-all duration-300 ${
      isMinimized ? 'h-16' : 'h-96'
    }`}>
      <CardHeader className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h3 className="font-semibold">GreenPass Support</h3>
            <Badge variant="secondary" className="text-xs bg-white/20">
              {conversation?.status === 'handed_off' ? 'Human Support' : 'AI Assistant'}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setLanguage(language === 'en' ? 'vi' : 'en')}
              className="text-white hover:bg-white/20 p-1"
            >
              <Globe className="w-4 h-4" />
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsMinimized(!isMinimized)}
              className="text-white hover:bg-white/20 p-1"
            >
              {isMinimized ? <Maximize2 className="w-4 h-4" /> : <Minimize2 className="w-4 h-4" />}
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => setIsOpen(false)}
              className="text-white hover:bg-white/20 p-1"
            >
              <X className="w-4 h-4" />
            </Button>
          </div>
        </div>
      </CardHeader>
      
      {!isMinimized && (
        <CardContent className="p-0 flex flex-col h-80">
          {/* Quick Actions */}
          {messages.length === 0 && (
            <div className="p-4 border-b">
              <p className="text-sm text-gray-600 mb-3">
                {language === 'vi' ? 'Câu hỏi thường gặp:' : 'Quick help:'}
              </p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map(action => (
                  <Button
                    key={action.id}
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickAction(action)}
                    className="text-xs"
                  >
                    {action.icon} {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}
          
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((message) => (
              <MessageBubble key={message.id} message={message} />
            ))}
            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 px-4 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
                  </div>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
          
          {/* Input */}
          <div className="p-4 border-t">
            <div className="flex gap-2">
              <Input
                value={inputText}
                onChange={(e) => setInputText(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                placeholder={language === 'vi' ? 'Nhập câu hỏi...' : 'Type your question...'}
                disabled={isTyping}
              />
              <Button
                onClick={handleSendMessage}
                disabled={!inputText.trim() || isTyping}
                size="sm"
              >
                <Send className="w-4 h-4" />
              </Button>
            </div>
          </div>
        </CardContent>
      )}
    </Card>
  );
};

export default ChatWidget;