import React, { useState, useRef, useEffect } from 'react';
import { UploadCloud, FileText, Activity, AlertCircle, Save, ScanLine, CheckCircle, MessageCircle, Send, X } from 'lucide-react';
import { extractDocumentData, chatWithRecords } from '../../lib/aiService';
import { supabase } from '../../lib/supabaseClient';
import BorderGlow from '../BorderGlow';
import ClickSpark from '../ClickSpark';

export default function AIOrganizerView({ session }) {
  const [file, setFile] = useState(null);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isScanning, setIsScanning] = useState(false);
  const [extractedData, setExtractedData] = useState(null);
  const [isSaving, setIsSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const fileInputRef = useRef(null);

  // Inline Chat State
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [chatMessages, setChatMessages] = useState([{ role: 'assistant', content: 'Ask me anything about this report or compare it with past ones!' }]);
  const [chatInput, setChatInput] = useState('');
  const [isChatLoading, setIsChatLoading] = useState(false);
  const chatMessagesEndRef = useRef(null);

  const scrollToBottom = () => {
    chatMessagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    if (isChatOpen) scrollToBottom();
  }, [chatMessages, isChatOpen]);

  const formatMessage = (text) => {
    return text.split('\n').map((line, i) => {
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

  const handleSendChat = async (e) => {
    e.preventDefault();
    if (!chatInput.trim()) return;

    const userMsg = chatInput.trim();
    setChatInput('');
    setChatMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsChatLoading(true);

    try {
      // Fetch all historical records
      const { data: records } = await supabase.from('medical_records').select('*');
      
      // Combine with the currently extracted (unsaved) data for context if available
      const allRecords = [...(records || [])];
      
      if (extractedData) {
        allRecords.push({
          title: extractedData.fileName || 'Current Uploaded Record',
          record_date: extractedData.documentDate || new Date().toISOString().split('T')[0],
          extracted_data: extractedData
        });
      }
      
      const answer = await chatWithRecords(userMsg, allRecords, 'English', true);
      setChatMessages(prev => [...prev, { role: 'assistant', content: answer }]);
    } catch (err) {
      console.error("Chat error:", err);
      let errorMessage = 'Sorry, I encountered an error connecting to the brain.';
      if (err.status === 429 || (err.message && err.message.includes('429')) || (err.message && err.message.includes('quota'))) {
        errorMessage = 'Sorry, the AI quota has been exceeded. Please try again later.';
      }
      setChatMessages(prev => [...prev, { role: 'assistant', content: errorMessage }]);
    } finally {
      setIsChatLoading(false);
    }
  };

  const handleFileSelect = async (e) => {
    const selectedFile = e.target.files[0];
    if (!selectedFile) return;
    
    setFile(selectedFile);
    
    // Create preview for UI
    const reader = new FileReader();
    reader.onloadend = () => {
      setPreviewUrl(reader.result);
      // Automatically start scanning once file is loaded
      startExtraction(reader.result.split(',')[1], selectedFile.type, selectedFile.name);
    };
    reader.readAsDataURL(selectedFile);
  };

  const startExtraction = async (base64String, mimeType, fileName) => {
    setIsScanning(true);
    setExtractedData(null);
    setSaveSuccess(false);

    try {
      const data = await extractDocumentData(base64String, mimeType);
      // attach fileName to the result to save it later
      data.fileName = fileName;
      setExtractedData(data);
    } catch (error) {
      console.error(error);
      alert("Failed to analyze the document. Please try again.");
      setFile(null);
      setPreviewUrl(null);
    } finally {
      setIsScanning(false);
    }
  };

  const handleSaveToTimeline = async () => {
    if (!extractedData) return;
    setIsSaving(true);

    try {
      const { error } = await supabase.from('medical_records').insert([
        {
          user_id: session.user.id,
          title: extractedData.fileName || 'Uploaded Record',
          record_date: extractedData.documentDate || new Date().toISOString().split('T')[0],
          extracted_data: extractedData
        }
      ]);

      if (!error) {
        setSaveSuccess(true);
        setTimeout(() => {
          // Reset to initial state after showing success
          setFile(null);
          setPreviewUrl(null);
          setExtractedData(null);
          setSaveSuccess(false);
        }, 3000);
      } else {
        console.error(error);
        alert("Error saving record to database.");
      }
    } catch (err) {
      console.error(err);
      alert("An error occurred while saving.");
    } finally {
      setIsSaving(false);
    }
  };

  const resetUpload = () => {
    setFile(null);
    setPreviewUrl(null);
    setExtractedData(null);
    setSaveSuccess(false);
    setIsChatOpen(false);
    setChatMessages([{ role: 'assistant', content: 'Ask me anything about this report or compare it with past ones!' }]);
  };

  return (
    <div className="view-container ai-organizer-view">
      <div className="view-header">
        <h2><Activity className="icon-pulse" /> AI Record Organizer</h2>
        <p className="view-subtitle">Upload medical reports, and let AI extract the structured data instantly.</p>
      </div>

      <div className="organizer-content">
        {/* Always Visible Ask AI Section */}
        <div style={{ marginBottom: isChatOpen ? '2rem' : '3rem' }}>
          <BorderGlow className="full-width" fillOpacity={0}>
            <button 
              className="btn-secondary full-width flex-center" 
              onClick={() => setIsChatOpen(!isChatOpen)}
            >
              {isChatOpen ? <><X size={18} /> Close Chat</> : <><MessageCircle size={18} /> Results ready when you are. Ask AI</>}
            </button>
          </BorderGlow>
        </div>

        {/* Inline AI Chat Window */}
        {isChatOpen && (
          <div className="inline-ai-chat" style={{ marginBottom: '3rem' }}>
            <div className="inline-chat-header">
              <h4>MediSync Brain (Organizer)</h4>
              <p className="text-muted text-xs">Querying your entire medical history {extractedData ? '+ this report' : ''}</p>
            </div>
            <div className="inline-chat-messages">
              {chatMessages.map((msg, i) => (
                <div key={i} className={`message ${msg.role}`}>
                  {formatMessage(msg.content)}
                </div>
              ))}
              {isChatLoading && <div className="message assistant typing">Thinking...</div>}
              <div ref={chatMessagesEndRef} />
            </div>
            <form className="inline-chat-input" onSubmit={handleSendChat}>
              <input 
                type="text" 
                placeholder="e.g. Compare my last 3 reports..." 
                value={chatInput}
                onChange={e => setChatInput(e.target.value)}
                disabled={isChatLoading}
              />
              <button type="submit" disabled={isChatLoading || !chatInput.trim()}>
                <Send size={16}/>
              </button>
            </form>
          </div>
        )}

        {!file && !extractedData && !isScanning && (
          <div 
            className="upload-dropzone" 
            onClick={() => fileInputRef.current?.click()}
          >
            <div className="dropzone-inner">
              <UploadCloud size={48} className="text-primary mb-4" />
              <h3>Drag & Drop or Click to Upload</h3>
              <p>Supports PDF, Image, Lab Reports, Prescriptions, MRI, CT Scans</p>
              <ClickSpark className="mt-6 mx-auto">
                <BorderGlow>
                  <button className="btn-primary" style={{ margin: 0 }}>Select File</button>
                </BorderGlow>
              </ClickSpark>
            </div>
            <input 
              type="file" 
              accept="image/*,application/pdf" 
              ref={fileInputRef}
              onChange={handleFileSelect} 
              style={{ display: 'none' }} 
            />
          </div>
        )}

        {(isScanning || file) && !extractedData && (
          <div className="scanning-container">
            <div className="document-preview-wrapper">
              <div className="scan-line"></div>
              {file.type.startsWith('image/') ? (
                <img src={previewUrl} alt="Document preview" className="document-preview-img" />
              ) : (
                <div className="pdf-preview-placeholder">
                  <FileText size={64} />
                  <p>{file.name}</p>
                </div>
              )}
            </div>
            <div className="scanning-status">
              <ScanLine className="animate-spin text-primary" size={24} />
              <h3>AI is analyzing your document...</h3>
              <p>Extracting values like Cholesterol, HDL, Sugar, and mapping reference ranges.</p>
            </div>
          </div>
        )}

        {extractedData && (
          <div className="extracted-results-container">
            <div className="results-header">
              <div className="success-badge">
                <CheckCircle size={18} /> Analysis Complete
              </div>
              <button className="btn-secondary" onClick={resetUpload}>Analyze Another File</button>
            </div>

            <div className="structured-data-card">
              <div className="card-header">
                <div>
                  <h3>{extractedData.documentType || 'Medical Report'}</h3>
                  <p className="text-muted">{extractedData.documentDate || 'Date Not Found'}</p>
                </div>
                {extractedData.provider && (
                  <div className="provider-tag">{extractedData.provider}</div>
                )}
              </div>

              {extractedData.summary && (
                <div className="ai-summary">
                  <p><strong>AI Summary:</strong> {extractedData.summary}</p>
                </div>
              )}

              <div className="data-table">
                <div className="table-header">
                  <span>Parameter</span>
                  <span>Value</span>
                  <span>Reference Range</span>
                </div>
                
                {extractedData.data && extractedData.data.map((item, idx) => (
                  <div key={idx} className={`table-row ${item.isAbnormal ? 'abnormal-row' : ''}`}>
                    <span className="param-name">
                      {item.testName || item.medication}
                    </span>
                    <span className="param-value">
                      {item.value || item.dosage} {item.unit || item.frequency}
                      {item.isAbnormal && <AlertCircle size={14} className="alert-icon text-red" />}
                    </span>
                    <span className="param-range text-muted">
                      {item.referenceRange || '-'}
                    </span>
                  </div>
                ))}
              </div>

              <div className="results-actions">
                <ClickSpark className="full-width">
                  <BorderGlow className="full-width">
                    <button 
                      className={`btn-primary full-width flex-center ${saveSuccess ? 'success-btn' : ''}`} 
                      onClick={handleSaveToTimeline}
                      disabled={isSaving || saveSuccess}
                    >
                      {isSaving ? 'Saving...' : 
                       saveSuccess ? <><CheckCircle size={18} /> Saved to Timeline!</> : 
                       <><Save size={18} /> Save to Timeline</>}
                    </button>
                  </BorderGlow>
                </ClickSpark>
                <p className="helper-text mt-4 text-center">Instead of storing PDFs, MediSync stores these structured values.</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
