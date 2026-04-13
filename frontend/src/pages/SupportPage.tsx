import { useState, useRef, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { Send, Bot, User, CheckCircle, ChevronDown, Flag, Headphones, FileText, AlertCircle } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';

const FAQS = [
  { question: "How do I reset my password?", answer: "To reset your password, click on 'Settings' in the sidebar and navigate to 'Account'. You'll see a password reset option there. Alternatively, use the 'Forgot Password' link on the login screen." },
  { question: "How does the ML sorting work?", answer: "Our Recommendation Engine uses a hybrid TF-IDF and KNN algorithm to track your interactions, analyze your weak skill areas, and automatically pull courses and topics you need to review to reach your Career Goal." },
  { question: "My Schedule isn't syncing properly", answer: "If your daily schedule appears empty, ensure you have set your 'Career Goal' during onboarding. The system relies on this to populate your roadmap. Try logging out and logging back in." },
  { question: "Billing issues and refunds", answer: "All our plans come with a 14-day money-back guarantee. If you'd like a refund, please open a ticket with the Support team via the form, and our finance department will process it." }
];

export function SupportPage({ userId }: { userId: string }) {
  const [openFaq, setOpenFaq] = useState<number | null>(null);

  // Chat State
  const [messages, setMessages] = useState<{ role: 'user' | 'model', content: string }[]>([
    { role: 'model', content: 'Hi there! I am the LearnGo AI Support Agent. How can I help you today?' }
  ]);
  const [inputMessage, setInputMessage] = useState("");
  const [isTyping, setIsTyping] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  // Escalation State
  const [isEscalated, setIsEscalated] = useState(false);
  
  // Ticket Form State
  const [ticketCategory, setTicketCategory] = useState("Technical Issue");
  const [ticketSubject, setTicketSubject] = useState("");
  const [ticketDesc, setTicketDesc] = useState("");
  const [ticketSubmitting, setTicketSubmitting] = useState(false);
  const [ticketSuccess, setTicketSuccess] = useState(false);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isTyping]);

  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isTyping) return;
    
    const userText = inputMessage;
    const newHistory = [...messages, { role: 'user' as const, content: userText }];
    setMessages(newHistory);
    setInputMessage("");
    setIsTyping(true);

    try {
      // Send chat history to backend
      const res = await fetch("http://localhost:5000/api/support-chat", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          // Send JWT token if we had one extracted from session, simple implementation below
        },
        body: JSON.stringify({
          message: userText,
          history: messages.map(m => ({ role: m.role, content: m.content }))
        })
      });

      const data = await res.json();
      if (data.status === 'success') {
        setMessages([...newHistory, { role: 'model', content: data.reply }]);
      } else {
        setMessages([...newHistory, { role: 'model', content: "I'm having trouble connecting to our servers right now. Please Escalate to a Human." }]);
      }
    } catch (e) {
      setMessages([...newHistory, { role: 'model', content: "Network error occurred. Please try again or create a ticket." }]);
    } finally {
      setIsTyping(false);
    }
  };

  const handleSubmitTicket = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ticketSubject.trim() || !ticketDesc.trim()) return;
    setTicketSubmitting(true);

    try {
      const { error } = await supabase.from('support_tickets').insert({
        user_id: userId,
        category: ticketCategory,
        subject: ticketSubject,
        description: ticketDesc,
      });
      
      if (error) throw error;
      setTicketSuccess(true);
    } catch (err: any) {
      alert("Failed to submit ticket: " + err.message);
    } finally {
      setTicketSubmitting(false);
    }
  };

  return (
    <div style={{ padding: '32px 40px', height: '100dvh', overflowY: 'auto' }}>
      {/* ── HEADER ──────────────────────────────────────────────────────── */}
      <motion.div initial={{ y: -20, opacity: 0 }} animate={{ y: 0, opacity: 1 }} style={{ marginBottom: 40, textAlign: 'center' }}>
        <h1 style={{ fontSize: 32, fontWeight: 800, color: 'var(--primary)', letterSpacing: '-0.02em', marginBottom: 12 }}>
          How can we help you today?
        </h1>
        <p style={{ fontSize: 16, color: 'var(--on-surface-variant)', maxWidth: 600, margin: '0 auto', lineHeight: 1.6 }}>
          Search our knowledge base, chat with our instant AI assistant, or escalate to a human agent.
        </p>

        <div style={{ position: 'relative', maxWidth: 500, margin: '24px auto 0' }}>
          <input 
            type="text" 
            placeholder="Search for answers..."
            style={{
              width: '100%', padding: '16px 20px', paddingRight: 48,
              borderRadius: 30, border: '1.5px solid var(--outline-variant)',
              fontSize: 16, outline: 'none', background: 'var(--surface-base)'
            }}
          />
          <div style={{
            position: 'absolute', right: 16, top: '50%', transform: 'translateY(-50%)',
            background: 'var(--primary)', color: '#fff', padding: 8, borderRadius: '50%',
            cursor: 'pointer', display: 'flex', alignItems: 'center', justifyContent: 'center'
          }}>
            <Send size={14} />
          </div>
        </div>
      </motion.div>

      {/* ── TWO COLUMN GRID ─────────────────────────────────────────────── */}
      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(300px, 1fr) minmax(350px, 1fr)', gap: 32, maxWidth: 1100, margin: '0 auto' }}>
        
        {/* ── LEFT: FAQS ────────────────────────────────────────────────── */}
        <motion.div initial={{ x: -20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.1 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <FileText size={20} color="var(--primary)" /> Frequently Asked Questions
          </h2>
          
          <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
            {FAQS.map((faq, idx) => (
              <motion.div 
                key={idx}
                layout
                style={{
                  background: 'var(--surface)', borderRadius: 16,
                  border: '1px solid var(--outline-variant)', overflow: 'hidden'
                }}
              >
                <button
                  onClick={() => setOpenFaq(openFaq === idx ? null : idx)}
                  style={{
                    width: '100%', padding: '16px 20px', display: 'flex', justifyContent: 'space-between',
                    alignItems: 'center', background: 'transparent', border: 'none',
                    fontWeight: 600, fontSize: 15, color: '#111', cursor: 'pointer', textAlign: 'left'
                  }}
                >
                  {faq.question}
                  <motion.div animate={{ rotate: openFaq === idx ? 180 : 0 }}>
                    <ChevronDown size={18} color="var(--primary)" />
                  </motion.div>
                </button>
                <AnimatePresence>
                  {openFaq === idx && (
                    <motion.div
                      initial={{ height: 0, opacity: 0 }}
                      animate={{ height: 'auto', opacity: 1 }}
                      exit={{ height: 0, opacity: 0 }}
                      style={{ overflow: 'hidden' }}
                    >
                      <div style={{ padding: '0 20px 16px', color: 'var(--on-surface-variant)', fontSize: 14, lineHeight: 1.6 }}>
                        {faq.answer}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ))}
          </div>
        </motion.div>

        {/* ── RIGHT: SUPPORT CHAT / ESCALATION FORM ─────────────────────── */}
        <motion.div initial={{ x: 20, opacity: 0 }} animate={{ x: 0, opacity: 1 }} transition={{ delay: 0.2 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 20, display: 'flex', alignItems: 'center', gap: 8 }}>
            <Headphones size={20} color="var(--primary)" /> Support Desk
          </h2>
          
          <motion.div 
            layout 
            style={{
              background: 'var(--surface)', borderRadius: 24, boxShadow: '0 10px 40px rgba(0,0,0,0.05)',
              border: '1.5px solid var(--outline-variant)', overflow: 'hidden',
              display: 'flex', flexDirection: 'column', height: 500
            }}
          >
            <AnimatePresence mode="wait">

              {/* ── CHAT UI ── */}
              {!isEscalated && (
                <motion.div key="chat" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ padding: '16px 20px', borderBottom: '1px solid var(--outline-variant)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#FAFAFA' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <div style={{ width: 8, height: 8, background: '#4CAF50', borderRadius: '50%' }} />
                      <span style={{ fontWeight: 600, fontSize: 14 }}>AI Assistant Online</span>
                    </div>
                    <button 
                      onClick={() => setIsEscalated(true)}
                      style={{
                        fontSize: 12, fontWeight: 600, color: '#C53030', display: 'flex', alignItems: 'center', gap: 4,
                        padding: '6px 12px', background: '#FFF5F5', borderRadius: 20, border: 'none', cursor: 'pointer'
                      }}
                    >
                      <Flag size={12} /> Escalate to Human
                    </button>
                  </div>
                  
                  <div ref={scrollRef} style={{ flex: 1, padding: 20, overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: 16 }}>
                    {messages.map((msg, idx) => (
                      <div key={idx} style={{
                        display: 'flex', gap: 12, flexDirection: msg.role === 'user' ? 'row-reverse' : 'row'
                      }}>
                        <div style={{
                          width: 32, height: 32, borderRadius: '50%', flexShrink: 0,
                          background: msg.role === 'user' ? 'var(--primary-container)' : 'var(--primary)',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', color: msg.role === 'user' ? 'var(--primary)' : '#fff'
                        }}>
                          {msg.role === 'user' ? <User size={16} /> : <Bot size={16} />}
                        </div>
                        <div style={{
                          background: msg.role === 'user' ? '#fff' : '#F4F6F8',
                          border: msg.role === 'user' ? '1px solid var(--outline-variant)' : 'none',
                          padding: '12px 16px', borderRadius: 16, fontSize: 14, lineHeight: 1.5,
                          maxWidth: '75%', color: '#111'
                        }}>
                          {msg.content}
                        </div>
                      </div>
                    ))}
                    {isTyping && (
                      <div style={{ display: 'flex', gap: 12 }}>
                         <div style={{ width: 32, height: 32, borderRadius: '50%', background: 'var(--primary)', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#fff' }}>
                          <Bot size={16} />
                        </div>
                        <div style={{ padding: '12px 16px', borderRadius: 16, background: '#F4F6F8', display: 'flex', alignItems: 'center', gap: 4 }}>
                           <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF' }} />
                           <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.2 }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF' }} />
                           <motion.span animate={{ opacity: [0.4, 1, 0.4] }} transition={{ duration: 1.5, repeat: Infinity, delay: 0.4 }} style={{ width: 6, height: 6, borderRadius: '50%', background: '#9CA3AF' }} />
                        </div>
                      </div>
                    )}
                  </div>

                  <div style={{ padding: 16, borderTop: '1px solid var(--outline-variant)' }}>
                    <div style={{ display: 'flex', gap: 8 }}>
                      <input 
                        type="text"
                        value={inputMessage}
                        onChange={e => setInputMessage(e.target.value)}
                        onKeyDown={e => e.key === 'Enter' && handleSendMessage()}
                        placeholder="Type your message..."
                        style={{
                          flex: 1, padding: '12px 16px', borderRadius: 20, border: '1px solid var(--outline-variant)',
                          fontSize: 14, outline: 'none'
                        }}
                      />
                      <button 
                        onClick={handleSendMessage}
                        style={{
                          width: 44, height: 44, borderRadius: '50%', border: 'none',
                          background: 'var(--primary)', color: '#fff',
                          display: 'flex', alignItems: 'center', justifyContent: 'center', cursor: 'pointer'
                        }}
                      >
                        <Send size={18} />
                      </button>
                    </div>
                  </div>
                </motion.div>
              )}

              {/* ── ESCALATION / TICKET FORM UI ── */}
              {isEscalated && !ticketSuccess && (
                <motion.div key="form" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} style={{ padding: 24, display: 'flex', flexDirection: 'column', height: '100%' }}>
                  <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                       <AlertCircle size={20} color="#C53030" />
                       <span style={{ fontWeight: 700, fontSize: 18 }}>Submit Support Ticket</span>
                    </div>
                    <button 
                      onClick={() => setIsEscalated(false)}
                      style={{ background: 'transparent', border: 'none', color: 'var(--on-surface-variant)', fontSize: 12, cursor: 'pointer', textDecoration: 'underline' }}
                    >
                      Back to AI Chat
                    </button>
                  </div>
                  
                  <form onSubmit={handleSubmitTicket} style={{ display: 'flex', flexDirection: 'column', gap: 16, flex: 1 }}>
                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>Issue Category</label>
                      <select 
                        value={ticketCategory}
                        onChange={e => setTicketCategory(e.target.value)}
                        style={{ padding: '12px', borderRadius: 12, border: '1px solid var(--outline-variant)', fontSize: 14, outline: 'none' }}
                      >
                        <option>Technical Issue</option>
                        <option>Curriculum / Grades</option>
                        <option>Billing & Subscriptions</option>
                        <option>Account Settings</option>
                      </select>
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>Subject</label>
                      <input 
                        type="text" placeholder="Briefly describe the issue" required
                        value={ticketSubject} onChange={e => setTicketSubject(e.target.value)}
                        style={{ padding: '12px', borderRadius: 12, border: '1px solid var(--outline-variant)', fontSize: 14, outline: 'none' }}
                      />
                    </div>

                    <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flex: 1 }}>
                      <label style={{ fontSize: 13, fontWeight: 600 }}>Description</label>
                      <textarea 
                        placeholder="Provide any relevant details, error codes, or steps to reproduce." required
                        value={ticketDesc} onChange={e => setTicketDesc(e.target.value)}
                        style={{ padding: '12px', borderRadius: 12, border: '1px solid var(--outline-variant)', fontSize: 14, outline: 'none', resize: 'none', flex: 1 }}
                      />
                    </div>

                    <button 
                      type="submit"
                      disabled={ticketSubmitting}
                      style={{
                        padding: '14px', borderRadius: 12, border: 'none', background: '#C53030', color: '#fff', 
                        fontWeight: 700, fontSize: 15, cursor: ticketSubmitting ? 'not-allowed' : 'pointer',
                        opacity: ticketSubmitting ? 0.7 : 1, transition: 'all 0.2s', marginTop: 'auto'
                      }}
                    >
                      {ticketSubmitting ? 'Submitting...' : 'Submit Priority Ticket'}
                    </button>
                  </form>
                </motion.div>
              )}

              {/* ── TICKET SUCCESS UI ── */}
              {isEscalated && ticketSuccess && (
                <motion.div key="success" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} style={{ padding: 32, display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', height: '100%', textAlign: 'center' }}>
                  <motion.div initial={{ scale: 0 }} animate={{ scale: 1 }} transition={{ type: 'spring', delay: 0.1 }}>
                    <CheckCircle size={64} color="var(--primary)" style={{ marginBottom: 20 }} />
                  </motion.div>
                  <h3 style={{ fontSize: 22, fontWeight: 700, color: 'var(--primary)', marginBottom: 8 }}>Ticket Received!</h3>
                  <p style={{ color: 'var(--on-surface-variant)', fontSize: 14, lineHeight: 1.6, marginBottom: 24 }}>
                    Our human support team has been notified. We will review your issue and respond via email within 24 hours.
                  </p>
                  <button 
                    onClick={() => { setIsEscalated(false); setTicketSuccess(false); setTicketSubject(""); setTicketDesc(""); }}
                    style={{ padding: '10px 20px', borderRadius: 20, border: '1px solid var(--primary)', background: 'transparent', color: 'var(--primary)', fontWeight: 600, cursor: 'pointer' }}
                  >
                    Return to Support Desk
                  </button>
                </motion.div>
              )}

            </AnimatePresence>
          </motion.div>

        </motion.div>
      </div>

    </div>
  );
}
