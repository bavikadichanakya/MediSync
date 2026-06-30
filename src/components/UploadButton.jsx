import React, { useRef, useState } from 'react';
import { UploadCloud, Activity } from 'lucide-react';
import { supabase } from '../lib/supabaseClient';
import { extractDocumentData } from '../lib/aiService';
import BorderGlow from './BorderGlow';
import ClickSpark from './ClickSpark';

export default function UploadButton({ session, onUploadComplete }) {
  const [isUploading, setIsUploading] = useState(false);
  const fileInputRef = useRef(null);

  const handleFileUpload = async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    
    setIsUploading(true);
    
    try {
      const reader = new FileReader();
      reader.onloadend = async () => {
        const base64String = reader.result.split(',')[1];
        
        // 1. Extract data with Gemini
        const extractedData = await extractDocumentData(base64String, file.type);
        
        // 2. Save to Supabase
        const { error } = await supabase.from('medical_records').insert([
          {
            user_id: session.user.id,
            title: file.name,
            record_date: extractedData.documentDate || new Date().toISOString().split('T')[0],
            extracted_data: extractedData
          }
        ]);
        
        if (!error) {
          if (onUploadComplete) onUploadComplete();
        } else {
          console.error(error);
          alert("Error saving record to database.");
        }
      };
      reader.readAsDataURL(file);
    } catch (err) {
      console.error(err);
      alert("Failed to extract data. Check your API key and file format.");
    } finally {
      setIsUploading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  return (
    <div>
      <input 
        type="file" 
        accept="image/*,application/pdf" 
        ref={fileInputRef}
        onChange={handleFileUpload} 
        style={{ display: 'none' }} 
      />

      <ClickSpark>
        <BorderGlow>
          <button 
            className="btn-secondary"
            onClick={() => fileInputRef.current?.click()}
            disabled={isUploading}
          >
            {isUploading ? (
              <><Activity className="animate-spin" size={18} /> Processing AI...</>
            ) : (
              <><UploadCloud size={18} /> Upload Record</>
            )}
          </button>
        </BorderGlow>
      </ClickSpark>
    </div>
  );
}
