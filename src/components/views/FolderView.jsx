import React, { useState, useEffect } from 'react';
import { Folder, ArrowLeft, Calendar, FileText } from 'lucide-react';
import { supabase } from '../../lib/supabaseClient';
import UploadButton from '../UploadButton';

export default function FolderView({ session }) {
  const [records, setRecords] = useState([]);
  const [activeFolder, setActiveFolder] = useState(null);

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    const { data } = await supabase.from('medical_records').select('*').order('record_date', { ascending: false });
    if (data) setRecords(data);
  };

  // Group by document type
  const folders = records.reduce((acc, record) => {
    const type = record.extracted_data?.documentType || 'Uncategorized';
    if (!acc[type]) acc[type] = [];
    acc[type].push(record);
    return acc;
  }, {});

  if (activeFolder) {
    return (
      <div className="dashboard-view folder-view">
        <div className="view-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
            <button className="btn-outline" onClick={() => setActiveFolder(null)}>
              <ArrowLeft size={18}/> Back
            </button>
            <h2>{activeFolder}</h2>
          </div>
          <UploadButton session={session} onUploadComplete={fetchRecords} />
        </div>
        
        <div className="folder-contents-list">
          {folders[activeFolder].map(record => (
            <div key={record.id} className="document-card">
              <div className="doc-icon"><FileText size={24}/></div>
              <div className="doc-info">
                <h3>{record.title}</h3>
                <p><Calendar size={14}/> {record.record_date}</p>
              </div>
              <button className="btn-secondary" onClick={() => alert("Detailed view coming soon!")}>View</button>
            </div>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-view folder-view">
      <div className="view-header">
        <h2>Document Folders</h2>
        <UploadButton session={session} onUploadComplete={fetchRecords} />
      </div>
      <div className="folder-grid">
        {Object.keys(folders).map(type => (
          <div key={type} className="folder-card" onClick={() => setActiveFolder(type)}>
            <div className="folder-icon"><Folder size={32} /></div>
            <h3>{type}</h3>
            <p>{folders[type].length} documents</p>
          </div>
        ))}
        {records.length === 0 && <p className="empty-state">No records found.</p>}
      </div>
    </div>
  );
}
