import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, Clock, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { chatWithRecords, generateSpeech } from '../lib/aiService';
import BorderGlow from './BorderGlow';
import ClickSpark from './ClickSpark';
import StarryBackground from './StarryBackground';
import './AIChatbot.css';

const LANGUAGES = [
  { label: 'English', value: 'English', code: 'en-IN' },
  { label: 'Hindi', value: 'Hindi', code: 'hi-IN' },
  { label: 'Telugu', value: 'Telugu', code: 'te-IN' },
  { label: 'Tamil', value: 'Tamil', code: 'ta-IN' },
  { label: 'Malayalam', value: 'Malayalam', code: 'ml-IN' }
];

export default function AIChatbot({ session }) {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([{ role: 'assistant', content: 'Hi! Ask me anything about your health records or describe your symptoms for analysis.' }]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [isListening, setIsListening] = useState(false);
  const [isVoiceInput, setIsVoiceInput] = useState(false);
  const [selectedLanguage, setSelectedLanguage] = useState(LANGUAGES[0]);
  const [isPlayingAudio, setIsPlayingAudio] = useState(false);
  const [showHistory, setShowHistory] = useState(false);
  const [chatHistory, setChatHistory] = useState([]);
  
  const messagesEndRef = useRef(null);
  const recognitionRef = useRef(null);
  const audioRef = useRef(null);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
      if (SpeechRecognition) {
        recognitionRef.current = new SpeechRecognition();
        recognitionRef.current.continuous = false;
        recognitionRef.current.interimResults = false;

        recognitionRef.current.onresult = (event) => {
          const transcript = event.results[0][0].transcript;
          setInput(prev => prev ? `${prev} ${transcript}` : transcript);
          setIsVoiceInput(true);
        };

        recognitionRef.current.onerror = (event) => {
          console.error("Speech recognition error", event.error);
          setIsListening(false);
        };

        recognitionRef.current.onend = () => {
          setIsListening(false);
        };
      }
    }
    
    return () => {
      if (recognitionRef.current) {
        recognitionRef.current.stop();
      }
    };
  }, []);

  useEffect(() => {
    if (typeof window !== 'undefined') {
      const saved = localStorage.getItem('medisync_chat_history');
      if (saved) {
        try {
          setChatHistory(JSON.parse(saved));
        } catch(e) {}
      }
    }
  }, []);

  const handleClose = () => {
    if (messages.length > 1) {
      const historyItem = {
        date: new Date().toLocaleString(),
        messages: [...messages]
      };
      const updatedHistory = [historyItem, ...chatHistory];
      setChatHistory(updatedHistory);
      localStorage.setItem('medisync_chat_history', JSON.stringify(updatedHistory));
    }
    setMessages([{ role: 'assistant', content: 'Hi! Ask me anything about your health records or describe your symptoms for analysis.' }]);
    setIsOpen(false);
    setShowHistory(false);
  };

  const clearHistory = () => {
    setChatHistory([]);
    localStorage.removeItem('medisync_chat_history');
  };

  const loadHistorySession = (index) => {
    const sessionToLoad = chatHistory[index];
    setMessages(sessionToLoad.messages);
    
    // Remove it from history so it doesn't duplicate when closed again
    const updatedHistory = [...chatHistory];
    updatedHistory.splice(index, 1);
    setChatHistory(updatedHistory);
    localStorage.setItem('medisync_chat_history', JSON.stringify(updatedHistory));
    
    setShowHistory(false);
  };

  const toggleListening = () => {
    if (isListening) {
      recognitionRef.current?.stop();
      setIsListening(false);
    } else {
      if (recognitionRef.current) {
        try {
          recognitionRef.current.start();
          setIsListening(true);
        } catch (e) {
          console.error(e);
        }
      }
    }
  };

  const formatMessage = (text) => {
    return text.split('\n').map((line, i) => {
      // Check for hospital tag
      const hospitalMatch = line.match(/\[HOSPITAL\|(.*?)\|(.*?)\|(.*?)\|(.*?)\]/);
      if (hospitalMatch) {
        const [_, name, distance, stars, link] = hospitalMatch;
        const starNum = parseInt(stars) || 5;
        const renderStars = () => {
          let starStr = '';
          for (let s = 0; s < 5; s++) {
            starStr += s < starNum ? '★' : '☆';
          }
          return starStr;
        };
        
        return (
          <div key={i} className="hospital-card">
            <div className="hospital-details">
              <h4>{name}</h4>
              <div className="hospital-meta">
                <span className="distance">{distance}</span>
                <span className="stars">{renderStars()}</span>
              </div>
            </div>
            <a href={link} target="_blank" rel="noopener noreferrer" className="book-btn">
              Book Appointment
            </a>
          </div>
        );
      }

      const parts = line.split(/(\*\*.*?\*\*)/g);
      return (
        <React.Fragment key={i}>
          {parts.map((part, j) => {
            if (part.startsWith('**') && part.endsWith('**')) {
              return <strong key={j} style={{ color: '#fbbf24' }}>{part.slice(2, -2)}</strong>;
            }
            return part;
          })}
          {i !== text.split('\n').length - 1 && <br />}
        </React.Fragment>
      );
    });
  };

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!input.trim()) return;

    const userMsg = input.trim();
    const wasVoice = isVoiceInput;
    setInput('');
    setIsVoiceInput(false);
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const { data: records } = await supabase.from('medical_records').select('*');
      const answer = await chatWithRecords(userMsg, records || [], selectedLanguage.value);
      setMessages(prev => [...prev, { role: 'assistant', content: answer }]);
      // Auto-play audio response via Sarvam TTS ONLY if input was by voice
      if (wasVoice) {
        try {
          const audioBase64 = await generateSpeech(answer, selectedLanguage.code);
          if (audioBase64 && audioRef.current) {
            audioRef.current.src = `data:audio/wav;base64,${audioBase64}`;
            audioRef.current.play();
            setIsPlayingAudio(true);
            audioRef.current.onended = () => setIsPlayingAudio(false);
          }
        } catch (ttsErr) {
          console.warn("Text-to-speech not available or failed:", ttsErr);
        }
      }
      
    } catch (err) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Sorry, I encountered an error connecting to the brain.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className={`ai-chatbot ${isOpen ? 'open' : ''}`}>
      {!isOpen && (
        <div className="chat-toggle-container" style={{ position: 'relative' }}>
          <div className="chat-prompt-bubble">
            How can I help you?
          </div>
          <ClickSpark style={{ display: 'flex', borderRadius: '50%' }}>
            <BorderGlow style={{ borderRadius: '50%' }}>
              <button className="chat-toggle" onClick={() => setIsOpen(true)} style={{ margin: 0, padding: 0 }}>
                <svg viewBox="0 0 100 100" width="36" height="36" xmlns="http://www.w3.org/2000/svg">
                  {/* Ears */}
                  <path d="M 22,55 a 10,10 0 0 0 -10,10 v 10 a 10,10 0 0 0 10,10" fill="#111111" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" />
                  <path d="M 78,55 a 10,10 0 0 1 10,10 v 10 a 10,10 0 0 1 -10,10" fill="#111111" stroke="#fbbf24" strokeWidth="6" strokeLinecap="round" />
                  
                  {/* Face */}
                  <circle cx="50" cy="60" r="28" fill="#111111" stroke="#fbbf24" strokeWidth="6" />
                  
                  {/* Visor */}
                  <rect x="32" y="52" width="36" height="18" rx="3" fill="#fbbf24" stroke="#fbbf24" strokeWidth="6" />
                  
                  {/* Eyes */}
                  <path d="M 40,62 a 4,4 0 0 1 8,0" fill="none" stroke="#111111" strokeWidth="5" strokeLinecap="round" />
                  <path d="M 52,62 a 4,4 0 0 1 8,0" fill="none" stroke="#111111" strokeWidth="5" strokeLinecap="round" />
                  
                  {/* Nurse Cap */}
                  <path d="M 26,35 Q 50,15 74,35 L 70,48 L 30,48 Z" fill="#111111" stroke="#fbbf24" strokeWidth="6" strokeLinejoin="round" />
                  
                  {/* Cross */}
                  <path d="M 46,26 h 8 v 5 h 5 v 8 h -5 v 5 h -8 v -5 h -5 v -8 h 5 z" fill="#fbbf24" stroke="#fbbf24" strokeWidth="2" strokeLinejoin="round" />
                </svg>
              </button>
            </BorderGlow>
          </ClickSpark>
        </div>
      )}
      
      {isOpen && (
        <div className="chat-window">
          <StarryBackground />
          <audio ref={audioRef} style={{ display: 'none' }} />
          <div className="chat-header">
            <h3 className="medisync-logo">MediSync</h3>
            <div className="chat-header-actions">
              <select 
                className="language-selector"
                value={selectedLanguage.code}
                onChange={(e) => {
                  const lang = LANGUAGES.find(l => l.code === e.target.value);
                  setSelectedLanguage(lang);
                }}
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>
              <button onClick={() => setShowHistory(!showHistory)} title="Chat History" className={showHistory ? 'active' : ''}>
                <Clock size={20}/>
              </button>
              <button onClick={handleClose}><X size={20}/></button>
            </div>
          </div>
          
          {showHistory ? (
            <div className="history-view">
              <div className="history-header">
                <h4>Past Conversations</h4>
                {chatHistory.length > 0 && (
                  <button onClick={clearHistory} className="clear-history-btn" title="Clear History">
                    <Trash2 size={16} />
                  </button>
                )}
              </div>
              <div className="history-list">
                {chatHistory.length === 0 ? (
                  <div className="empty-history">No past conversations found.</div>
                ) : (
                  chatHistory.map((session, idx) => {
                    const firstUserMsg = session.messages.find(m => m.role === 'user');
                    return (
                      <div key={idx} className="history-session" onClick={() => loadHistorySession(idx)} style={{ cursor: 'pointer' }}>
                        <div className="history-date">{session.date}</div>
                        <div className="history-summary">
                          {firstUserMsg ? firstUserMsg.content : "No questions asked"}
                        </div>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          ) : (
            <>
              <div className="chat-disclaimer">
                ⚠️ AI can make mistakes, always consult a doctor.
              </div>
              <div className="chat-messages">
                {messages.map((msg, i) => (
                  <div key={i} className={`message ${msg.role}`}>
                    {formatMessage(msg.content)}
                  </div>
                ))}
                {isLoading && <div className="message assistant typing">Thinking...</div>}
                {isPlayingAudio && <div className="message assistant typing" style={{ color: '#fbbf24' }}>Speaking... 🔊</div>}
                <div ref={messagesEndRef} />
              </div>
              <form className="chat-input" onSubmit={handleSend}>
                <button 
                  type="button" 
                  className={`mic-btn ${isListening ? 'listening' : ''}`}
                  onClick={toggleListening}
                  disabled={isLoading || !recognitionRef.current}
                  title={recognitionRef.current ? "Use voice input" : "Voice input not supported"}
                >
                  {isListening ? <MicOff size={18} /> : <Mic size={18} />}
                </button>
                <input 
                  type="text" 
                  placeholder="Ask about your records..." 
                  value={input}
                  onChange={e => {
                    setInput(e.target.value);
                    setIsVoiceInput(false);
                  }}
                  disabled={isLoading}
                />
                <button type="submit" className="send-btn" disabled={isLoading || !input.trim()}>
                  <Send size={18}/>
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </div>
  );
}
