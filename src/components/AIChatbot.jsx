import React, { useState, useRef, useEffect } from 'react';
import { MessageCircle, X, Send, Mic, MicOff, Clock, Trash2 } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { chatWithRecords, generateSpeech } from '../lib/aiService';
import BorderGlow from './BorderGlow';
import ClickSpark from './ClickSpark';
import StarryBackground from './StarryBackground';
import HospitalMap from './HospitalMap';
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
  const [userLocation, setUserLocation] = useState(null);
  
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
    if (typeof window !== 'undefined' && 'geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(async (position) => {
        const { latitude, longitude } = position.coords;
        try {
          const res = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${latitude}&lon=${longitude}`);
          const data = await res.json();
          if (data && data.address) {
            const city = data.address.city || data.address.town || data.address.village || data.address.county;
            setUserLocation(city ? `${city} (Lat: ${latitude}, Lng: ${longitude})` : `Lat: ${latitude}, Lng: ${longitude}`);
          }
        } catch (e) {
          setUserLocation(`Lat: ${latitude}, Lng: ${longitude}`);
        }
      }, (error) => {
        console.warn("Geolocation denied or error:", error);
      });
    }
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
    const lines = text.split('\n');
    const hospitalArray = [];
    const elements = [];

    lines.forEach((line, i) => {
      // Support both the old format and the new format gracefully
      const hospitalMatch = line.match(/\[HOSPITAL\|(.*?)\|(.*?)\|(.*?)\|(.*?)(\|(.*?)\|(.*?)\|(.*?)?)?\]/);
      if (hospitalMatch) {
        const name = hospitalMatch[1];
        const distance = hospitalMatch[2];
        const stars = parseInt(hospitalMatch[3]) || 5;
        const url = hospitalMatch[4];
        
        // If we have lat/lng from the new prompt format
        if (hospitalMatch[6] && hospitalMatch[7]) {
          hospitalArray.push({
            name, distance, stars, url,
            lat: parseFloat(hospitalMatch[6]),
            lng: parseFloat(hospitalMatch[7]),
            reviewSummary: hospitalMatch[8] ? hospitalMatch[8].replace(/^"|"$/g, '') : "A highly rated hospital."
          });
        } else {
          // Fallback to text card for old format
          elements.push(
            <div key={`hosp-${i}`} className="hospital-card-text-only" style={{ background: 'var(--bg-surface)', padding: '10px', borderRadius: '8px', marginBottom: '10px', border: '1px solid rgba(255,255,255,0.1)' }}>
              <h4 style={{ margin: '0 0 5px 0' }}>{name}</h4>
              <p style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{distance} | {stars} Stars</p>
              <a href={url} target="_blank" rel="noopener noreferrer" style={{ background: 'var(--accent-primary)', color: 'white', padding: '5px 10px', borderRadius: '5px', textDecoration: 'none', fontSize: '0.85rem' }}>Book Appointment</a>
            </div>
          );
        }
      } else {
        const parts = line.split(/(\*\*.*?\*\*)/g);
        elements.push(
          <React.Fragment key={i}>
            {parts.map((part, j) => {
              if (part.startsWith('**') && part.endsWith('**')) {
                return <strong key={j} style={{ color: '#fbbf24' }}>{part.slice(2, -2)}</strong>;
              }
              return part;
            })}
            {i !== lines.length - 1 && <br />}
          </React.Fragment>
        );
      }
    });

    if (hospitalArray.length > 0) {
      elements.push(<HospitalMap key="hospital-map" hospitals={hospitalArray} />);
    }

    return elements;
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
      const answer = await chatWithRecords(userMsg, records || [], selectedLanguage.value, false, userLocation);
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
      console.error("Chat error:", err);
      let errorMessage = 'Sorry, I encountered an error connecting to the brain.';
      if (err.status === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.includes('quota'))) {
        errorMessage = 'Sorry, the AI quota has been exceeded. Please try again later.';
      }
      setMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
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
