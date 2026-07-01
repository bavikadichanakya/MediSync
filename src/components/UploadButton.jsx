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
      const base64String = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onloadend = () => {
          if (reader.result) {
            resolve(reader.result.split(',')[1]);
          } else {
            reject(new Error("Failed to read file"));
          }
        };
        reader.onerror = reject;
        reader.readAsDataURL(file);
      });
        
      // 1. Extract data with Gemini
      const extractedData = await extractDocumentData(base64String, file.type);
      
      // Validate date format (YYYY-MM-DD)
      let recordDate = extractedData.documentDate;
      const dateRegex = /^\d{4}-\d{2}-\d{2}$/;
      if (!recordDate || typeof recordDate !== 'string' || !dateRegex.test(recordDate)) {
        recordDate = new Date().toISOString().split('T')[0];
      }
      
      // 2. Save to Supabase
      const { error } = await supabase.from('medical_records').insert([
        {
          user_id: session.user.id,
          title: file.name,
          record_date: recordDate,
          extracted_data: extractedData
        }
      ]);
      
      if (!error) {
        if (onUploadComplete) onUploadComplete();
      } else {
        console.error("Supabase Error:", error);
        alert(`Error saving record to database: ${error.message}`);
      }
    } catch (err) {
      console.error("Upload Error:", err);
      alert("Failed to process file. Please check the console for details.");
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
