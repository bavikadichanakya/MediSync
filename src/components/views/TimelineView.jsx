import React, { useState, useEffect } from 'react';
import { Calendar, AlertCircle, ChevronDown, ChevronUp, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import { chatWithRecords } from '../../lib/aiService';
import UploadButton from '../UploadButton';

export default function TimelineView({ session }) {
  const [records, setRecords] = useState([]);
  const [expandedRecord, setExpandedRecord] = useState(null);
  const [medicineQuery, setMedicineQuery] = useState('');
  const [filteredIds, setFilteredIds] = useState(null);
  const [isSearching, setIsSearching] = useState(false);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    const { data, error } = await supabase
      .from('medical_records')
      .select('*')
      .order('record_date', { ascending: false });
    if (!error && data) setRecords(data);
  };

  const toggleRecord = (id) => {
    setExpandedRecord(prev => (prev === id ? null : id));
  };

  // Filter records if a search is active
  const displayedRecords = filteredIds 
    ? records.filter(r => filteredIds.includes(r.id))
    : records;

  // Group records by year
  const groupedRecords = displayedRecords.reduce((acc, record) => {
    const year = new Date(record.record_date).getFullYear().toString();
    if (!acc[year]) acc[year] = [];
    acc[year].push(record);
    return acc;
  }, {});

  const currentYear = new Date().getFullYear().toString();

  const handleAiSearch = async (e) => {
    e.preventDefault();
    if (!medicineQuery.trim()) {
      setFilteredIds(null);
      return;
    }
    setIsSearching(true);
    try {
      const prompt = `Which of the following medical records mention, prescribe, or refer to the medicine or condition: "${medicineQuery}"? 
      Please return ONLY a valid JSON array containing the exact string IDs of the matching records (e.g. ["id1", "id2"]).
      If there are no matches, return exactly []. Do not output any markdown formatting or other text.`;
      
      const answer = await chatWithRecords(prompt, records, 'English', false);
      const cleanAnswer = answer.replace(/```json/g, '').replace(/```/g, '').trim();
      const ids = JSON.parse(cleanAnswer);
      if (Array.isArray(ids)) {
        setFilteredIds(ids);
      } else {
        setFilteredIds([]);
      }
    } catch (err) {
      console.error(err);
      alert("Error searching records. Please try again.");
    } finally {
      setIsSearching(false);
    }
  };

  const clearSearch = () => {
    setMedicineQuery('');
    setFilteredIds(null);
  };

  return (
    <div className="dashboard-view timeline-view">
      <div className="view-header">
        <h2>Your Health Timeline</h2>
        <UploadButton session={session} onUploadComplete={fetchRecords} />
      </div>

      <div className="timeline-container">
        <div className="ai-appointment-finder" style={{ padding: '1.5rem', marginBottom: '2rem' }}>
          <form onSubmit={handleAiSearch} className="ai-search-form">
            <input 
              type="text" 
              placeholder="AI Medicine History Search (e.g., Paracetamol, back pain)..." 
              value={medicineQuery} 
              onChange={e => setMedicineQuery(e.target.value)} 
              disabled={isSearching}
            />
            <button type="submit" className="btn-primary" disabled={isSearching || !medicineQuery.trim()}>
              {isSearching ? 'Searching...' : 'Search History'}
            </button>
            {filteredIds !== null && (
              <button type="button" className="btn-secondary" onClick={clearSearch} disabled={isSearching}>
                Clear
              </button>
            )}
          </form>
        </div>

        {Object.keys(groupedRecords).length === 0 && filteredIds === null && (
          <p className="empty-state">No records found. Upload a report to begin your timeline.</p>
        )}

        {Object.keys(groupedRecords).length === 0 && filteredIds !== null && (
          <p className="empty-state">No records found matching "{medicineQuery}".</p>
        )}

        {Object.keys(groupedRecords)
          .sort((a, b) => b - a)
          .map((year) => (
            <div key={year} className="timeline-year-group">
              <div className="year-marker">
                <span>{year === currentYear ? 'Today' : year}</span>
              </div>

              {groupedRecords[year].map((record) => {
                const isExpanded = expandedRecord === record.id;
                const hasAbnormal = record.extracted_data?.data?.some(d => d.isAbnormal);

                return (
                  <div key={record.id} className="timeline-item">
                    <div className="timeline-marker"></div>
                    
                    <div 
                      className={`timeline-content interactive-card ${isExpanded ? 'expanded' : ''}`}
                      onClick={() => toggleRecord(record.id)}
                    >
                      {/* Compact Header (Always visible) */}
                      <div className="card-compact-header">
                        <div className="compact-left">
                          <div className="timeline-date">
                            <Calendar size={14} /> {record.record_date}
                          </div>
                          <h3 className="timeline-title">
                            <FileText size={18} className="text-muted mr-2" style={{display: 'inline-block', verticalAlign: 'text-bottom', marginRight: '8px'}} />
                            {record.title}
                          </h3>
                        </div>
                        <div className="compact-right">
                          {hasAbnormal && !isExpanded && (
                            <span className="abnormal-badge">
                              <AlertCircle size={14} /> Abnormal Findings
                            </span>
                          )}
                          <div className="expand-icon">
                            {isExpanded ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                          </div>
                        </div>
                      </div>

                      {/* Expanded Content */}
                      {isExpanded && record.extracted_data && (
                        <div className="extracted-data-expanded">
                          {record.extracted_data.summary && (
                            <div className="instant-summary">
                              <p><strong>Instant Summary:</strong> {record.extracted_data.summary}</p>
                            </div>
                          )}
                          
                          {record.extracted_data.data && record.extracted_data.data.length > 0 && (
                            <div className="data-table mt-4">
                              <div className="table-header">
                                <span>Parameter</span>
                                <span>Value</span>
                                <span>Reference Range</span>
                              </div>
                              
                              {record.extracted_data.data.map((item, idx) => (
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
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          ))}
      </div>
    </div>
  );
}
