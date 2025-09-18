import React, { useState, useEffect, useRef } from "react";
import { User, Conversation, Message, FAQ } from "@/api/entities";
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
  Headphones,
  Globe,
  Minimize2,
  Maximize2,
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
        if (!user) return;
        setCurrentUser(user);

        // Load existing conversation or create when needed
        let existing = [];
        try {
          existing = await Conversation.filter(
            { user_id: user.id, status: "open" },
            "-created_date",
            1
          );
        } catch (e) {
          console.error("Conversation query error:", e);
        }

        if (Array.isArray(existing) && existing.length > 0) {
          const conv = existing[0];
          setConversation(conv);
          setLanguage(conv?.lang || "en");
          await loadMessages(conv.id);
        }

        await loadQuickActions(user.user_type);
      } catch (error) {
        console.error("Chat initialization error:", error);
      }
    };

    if (isOpen) initChat();
  }, [isOpen]);

  const loadMessages = async (conversationId) => {
    try {
      const msgs = await Message.filter(
        { conversation_id: conversationId },
        "created_date"
      );
      setMessages(Array.isArray(msgs) ? msgs : []);
      scrollToBottom();
    } catch (error) {
      console.error("Error loading messages:", error);
    }
  };

  const loadQuickActions = async (userType) => {
    try {
      const actions = {
        student: [
          { id: "reservations", label: "Reservations", icon: "🎫" },
          { id: "payments", label: "Payments", icon: "💳" },
          { id: "visa", label: "Visa Status", icon: "📋" },
          { id: "tutors", label: "Find Tutors", icon: "👩‍🏫" },
        ],
        agent: [
          { id: "commissions", label: "Commissions", icon: "💰" },
          { id: "students", label: "My Students", icon: "👥" },
          { id: "verification", label: "Verification", icon: "✅" },
        ],
        tutor: [
          { id: "earnings", label: "Earnings", icon: "💵" },
          { id: "schedule", label: "Schedule", icon: "📅" },
          { id: "students", label: "Students", icon: "🎓" },
        ],
        vendor: [
          { id: "orders", label: "Orders", icon: "📦" },
          { id: "services", label: "My Services", icon: "🛍️" },
          { id: "payouts", label: "Payouts", icon: "💸" },
        ],
      };
      setQuickActions(actions[userType] || actions.student);
    } catch (error) {
      console.error("Error loading quick actions:", error);
    }
  };

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
    }, 50);
  };

  const createOrGetConversation = async () => {
    if (conversation) return conversation;
    if (!currentUser) return null;

    const newConv = await Conversation.create({
      user_id: currentUser.id,
      role: currentUser.user_type,
      lang: language,
      channel: "in_app",
      status: "open",
      last_activity: new Date().toISOString(),
      escalation_count: 0,
    });

    setConversation(newConv);

    const welcomeText =
      language === "vi"
        ? "Xin chào! Tôi là trợ lý AI của GreenPass. Tôi có thể giúp bạn về đặt chỗ, thanh toán, visa và nhiều vấn đề khác. Bạn có thể chuyển ngôn ngữ bất cứ lúc nào bằng cách nói 'Tiếng Việt' hoặc 'English'."
        : "Hi! I'm GreenPass AI Assistant. I can help you with reservations, payments, visa questions, and more. You can switch languages anytime by saying 'Vietnamese' or 'English'.";

    await addMessage(newConv.id, "ai", welcomeText);
    return newConv;
  };

  const addMessage = async (conversationId, sender, text, meta = null, actions = null) => {
    const message = await Message.create({
      conversation_id: conversationId,
      sender,
      text,
      meta,
      actions: Array.isArray(actions) ? actions : [],
    });

    setMessages((prev) => [...prev, message]);
    scrollToBottom();
    return message;
  };

  // Accept optional override text to avoid stale input issues
  const handleSendMessage = async (overrideText) => {
    const text = typeof overrideText === "string" ? overrideText : inputText;
    if (!text.trim() || isTyping) return;

    const conv = await createOrGetConversation();
    if (!conv) return;

    await addMessage(conv.id, "user", text);

    if (!overrideText) setInputText("");
    setIsTyping(true);

    try {
      const lower = text.toLowerCase();

      // Language switch
      if (lower.includes("vietnamese") || lower.includes("tiếng việt")) {
        setLanguage("vi");
        await addMessage(conv.id, "ai", "Đã chuyển sang tiếng Việt. Tôi có thể giúp gì cho bạn?");
        try {
          await Conversation.update(conv.id, { lang: "vi" });
          setConversation((c) => (c ? { ...c, lang: "vi" } : c));
        } catch {}
        setIsTyping(false);
        return;
      }
      if (lower.includes("english")) {
        setLanguage("en");
        await addMessage(conv.id, "ai", "Switched to English. How can I help you?");
        try {
          await Conversation.update(conv.id, { lang: "en" });
          setConversation((c) => (c ? { ...c, lang: "en" } : c));
        } catch {}
        setIsTyping(false);
        return;
      }

      // Escalation triggers
      const escalationTriggers = [
        "talk to human",
        "speak to agent",
        "human support",
        "complaint",
        "refund",
        "payment failed",
        "visa rejected",
      ];
      if (escalationTriggers.some((t) => lower.includes(t))) {
        await handleEscalation(conv.id);
        setIsTyping(false);
        return;
      }

      // FAQ first
      const faqResponse = await findFAQMatch(text);
      if (faqResponse) {
        await addMessage(
          conv.id,
          "ai",
          faqResponse.answer,
          { confidence: faqResponse.confidence, answer_type: "faq", source_id: faqResponse.faq_id },
          faqResponse.actions
        );
        setIsTyping(false);
        return;
      }

      // AI fallback
      const aiResponse = await getAIResponse(text, currentUser);
      await addMessage(
        conv.id,
        "ai",
        aiResponse.text,
        { confidence: aiResponse.confidence, answer_type: "ai" },
        aiResponse.actions
      );
    } catch (error) {
      console.error("Error processing message:", error);
      const errorText =
        language === "vi"
          ? "Xin lỗi, có lỗi xảy ra. Bạn có muốn tôi kết nối với hỗ trợ khách hàng không?"
          : "Sorry, there was an error. Would you like me to connect you with human support?";
      await addMessage(conv.id, "ai", errorText, null, [
        { type: "escalate", label: language === "vi" ? "Kết nối hỗ trợ" : "Contact Support" },
      ]);
    } finally {
      setIsTyping(false);
    }
  };

  const findFAQMatch = async (query) => {
    try {
      const faqsRaw = await FAQ.filter({ lang: language });
      const faqs = Array.isArray(faqsRaw) ? faqsRaw : [];

      const keywords = query.toLowerCase().split(/\s+/).filter(Boolean);
      let bestMatch = null;
      let bestScore = 0;

      faqs.forEach((faq) => {
        const tagsText = Array.isArray(faq?.tags) ? faq.tags.join(" ") : "";
        const faqText = `${faq?.title || ""} ${faq?.body || ""} ${tagsText}`.toLowerCase();
        const score = keywords.reduce((acc, k) => acc + (faqText.includes(k) ? 1 : 0), 0);
        if (score > bestScore && score > 0) {
          bestScore = score;
          bestMatch = faq;
        }
      });

      if (bestMatch && bestScore >= 2) {
        const actions = [];
        if (bestMatch.category === "reservations") {
          actions.push({
            type: "link",
            label: language === "vi" ? "Xem đặt chỗ" : "View Reservations",
            url: "/reservations",
          });
        } else if (bestMatch.category === "payments") {
          actions.push({
            type: "link",
            label: language === "vi" ? "Thanh toán" : "Make Payment",
            url: "/payments",
          });
        }
        return {
          answer: bestMatch.body,
          confidence: keywords.length ? bestScore / keywords.length : 0,
          faq_id: bestMatch.id,
          actions,
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
You are GreenPass AI Assistant helping ${user?.user_type || "user"}s with study abroad questions.
User query: "${query}"
Language: ${language === "vi" ? "Vietnamese" : "English"}

Provide a helpful, concise response. If you're not confident, suggest connecting with human support.
Keep responses under 200 words.
${language === "vi" ? "Respond in Vietnamese." : "Respond in English."}
      `.trim();

      const response = await InvokeLLM({
        prompt,
        add_context_from_internet: false,
      });

      return {
        text:
          response ||
          (language === "vi"
            ? "Tôi cần thêm thông tin để trả lời câu hỏi này. Bạn có muốn tôi kết nối với hỗ trợ khách hàng không?"
            : "I need more information to answer this question. Would you like me to connect you with human support?"),
        confidence: 0.7,
        actions: [
          {
            type: "escalate",
            label: language === "vi" ? "Kết nối hỗ trợ" : "Contact Support",
          },
        ],
      };
    } catch (error) {
      console.error("AI response error:", error);
      return {
        text:
          language === "vi"
            ? "Xin lỗi, tôi không thể trả lời câu hỏi này. Hãy để tôi kết nối bạn với hỗ trợ khách hàng."
            : "Sorry, I can't answer this question. Let me connect you with human support.",
        confidence: 0.3,
        actions: [
          {
            type: "escalate",
            label: language === "vi" ? "Kết nối hỗ trợ" : "Contact Support",
          },
        ],
      };
    }
  };

  const handleEscalation = async (conversationId) => {
    if (!conversationId) return;
    const ticket = `#GP-${Date.now()}`;
    const escalationText =
      language === "vi"
        ? `Tôi sẽ kết nối bạn với đội ngũ hỗ trợ của GreenPass. Một chuyên viên sẽ phản hồi trong vòng 60 phút. Số ticket: ${ticket}`
        : `I'll connect you with GreenPass support team. An advisor will respond within 60 minutes. Ticket ${ticket}`;

    await addMessage(conversationId, "ai", escalationText);

    try {
      const newCount = (conversation?.escalation_count || 0) + 1;
      await Conversation.update(conversationId, {
        status: "handed_off",
        escalation_count: newCount,
        last_activity: new Date().toISOString(),
      });
      setConversation((c) => (c ? { ...c, status: "handed_off", escalation_count: newCount } : c));
    } catch (e) {
      console.error("Failed to update conversation on escalation:", e);
    }
  };

  const handleQuickAction = async (action) => {
    if (isTyping) return;
    const conv = await createOrGetConversation();
    if (!conv) return;

    const actionQueries = {
      reservations: language === "vi" ? "Tình trạng đặt chỗ của tôi" : "My reservation status",
      payments: language === "vi" ? "Cách thanh toán học phí" : "How to pay tuition",
      visa: language === "vi" ? "Tình trạng visa của tôi" : "My visa status",
      tutors: language === "vi" ? "Cách đặt giáo viên" : "How to book tutors",
      commissions: language === "vi" ? "Hoa hồng của tôi" : "My commissions",
      students: language === "vi" ? "Học sinh của tôi" : "My students",
      earnings: language === "vi" ? "Thu nhập của tôi" : "My earnings",
      schedule: language === "vi" ? "Lịch dạy của tôi" : "My teaching schedule",
      services: language === "vi" ? "Dịch vụ của tôi" : "My services",
      orders: language === "vi" ? "Đơn hàng của tôi" : "My orders",
      payouts: language === "vi" ? "Yêu cầu thanh toán" : "Payout request",
      verification: language === "vi" ? "Xác minh tài khoản" : "Account verification",
    };

    const query = actionQueries[action.id];
    if (query) {
      await handleSendMessage(query); // pass text directly to avoid stale state
    }
  };

  const MessageBubble = ({ message }) => {
    const isAI = message.sender === "ai";
    const isSupport = message.sender === "support";

    return (
      <div className={`flex ${isAI || isSupport ? "justify-start" : "justify-end"} mb-4`}>
        <div
          className={`max-w-xs lg:max-w-md px-4 py-2 rounded-lg ${
            isAI
              ? "bg-blue-100 text-blue-900"
              : isSupport
              ? "bg-green-100 text-green-900"
              : "bg-emerald-500 text-white"
          }`}
        >
          {(isAI || isSupport) && (
            <div className="flex items-center gap-2 mb-1">
              {isAI ? <Bot className="w-4 h-4" /> : <Headphones className="w-4 h-4" />}
              <span className="text-xs font-medium">{isAI ? "GreenPass AI" : "Support Team"}</span>
            </div>
          )}
          <p className="text-sm whitespace-pre-wrap">{message.text}</p>

          {Array.isArray(message.actions) && message.actions.length > 0 && (
            <div className="flex gap-2 mt-2 flex-wrap">
              {message.actions.map((action, idx) => (
                <Button
                  key={idx}
                  size="sm"
                  variant="outline"
                  onClick={() => {
                    if (action.type === "escalate") {
                      handleEscalation(conversation?.id);
                    } else if (action.url) {
                      window.open(action.url, "_blank", "noopener,noreferrer");
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
    <Card
      className={`fixed bottom-6 right-6 w-96 bg-white shadow-2xl z-50 transition-all duration-300 ${
        isMinimized ? "h-16" : "h-96"
      }`}
    >
      <CardHeader className="bg-gradient-to-r from-emerald-500 to-blue-500 text-white p-4 rounded-t-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <MessageCircle className="w-5 h-5" />
            <h3 className="font-semibold">GreenPass Support</h3>
            <Badge variant="secondary" className="text-xs bg-white/20">
              {conversation?.status === "handed_off" ? "Human Support" : "AI Assistant"}
            </Badge>
          </div>
          <div className="flex items-center gap-2">
            <Button
              size="sm"
              variant="ghost"
              onClick={async () => {
                const newLang = language === "en" ? "vi" : "en";
                setLanguage(newLang);
                if (conversation?.id) {
                  try {
                    await Conversation.update(conversation.id, { lang: newLang });
                    setConversation((c) => (c ? { ...c, lang: newLang } : c));
                  } catch (e) {
                    console.warn("Failed to persist language:", e);
                  }
                }
              }}
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
                {language === "vi" ? "Câu hỏi thường gặp:" : "Quick help:"}
              </p>
              <div className="flex flex-wrap gap-2">
                {quickActions.map((action) => (
                  <Button
                    key={action.id}
                    size="sm"
                    variant="outline"
                    onClick={() => handleQuickAction(action)}
                    className="text-xs"
                    disabled={isTyping || !currentUser}
                  >
                    {action.icon} {action.label}
                  </Button>
                ))}
              </div>
            </div>
          )}

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.map((m) => (
              <MessageBubble key={m.id} message={m} />
            ))}
            {isTyping && (
              <div className="flex justify-start mb-4">
                <div className="bg-gray-100 px-4 py-2 rounded-lg">
                  <div className="flex space-x-1">
                    <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.1s" }}
                    />
                    <div
                      className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"
                      style={{ animationDelay: "0.2s" }}
                    />
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
                onKeyDown={(e) => e.key === "Enter" && handleSendMessage()}
                placeholder={language === "vi" ? "Nhập câu hỏi..." : "Type your question..."}
                disabled={isTyping}
              />
              <Button onClick={() => handleSendMessage()} disabled={!inputText.trim() || isTyping} size="sm">
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
