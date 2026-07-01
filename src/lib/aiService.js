import { GoogleGenAI } from '@google/genai';

// We initialize the API key inside functions to ensure env vars are loaded.
const getAiClient = () => {
  const apiKey = import.meta.env.VITE_GEMINI_API_KEY;
  if (!apiKey) {
    console.error("Missing VITE_GEMINI_API_KEY in environment variables.");
    throw new Error("Missing Gemini API Key");
  }
  return new GoogleGenAI({ apiKey });
};

/**
 * Extracts structured medical data from a base64 image (lab report, prescription, etc.)
 * Detects anomalies automatically by comparing values to reference ranges.
 * 
 * @param {string} base64Data The base64 string of the image (without the data:image/png;base64, prefix)
 * @param {string} mimeType The mime type (e.g. 'image/png', 'image/jpeg')
 * @returns {Promise<Object>} The extracted JSON structure
 */
export async function extractDocumentData(base64Data, mimeType) {
  const prompt = `
You are a highly intelligent medical data extraction assistant.
Analyze the following image (which may be a lab report, prescription, or pharmacy receipt).
Extract the key data into a structured JSON format.

Required JSON Structure:
{
  "documentType": "Lab Report" | "Prescription" | "Receipt" | "Other",
  "documentDate": "YYYY-MM-DD" (if found, otherwise null),
  "provider": "Hospital or Clinic Name",
  "data": [
    // For lab reports:
    {
      "testName": "e.g. Hemoglobin",
      "value": "14.2",
      "unit": "g/dL",
      "referenceRange": "13.8-17.2",
      "isAbnormal": false // SET THIS TO TRUE IF THE VALUE IS OUTSIDE THE REFERENCE RANGE
    },
    // For prescriptions:
    {
      "medication": "Name",
      "dosage": "Amount",
      "morning": true, // true if taken in morning, else false
      "afternoon": false, // true if taken in afternoon, else false
      "night": true, // true if taken at night, else false
      "foodInstructions": "Before food or After food or empty if unspecified",
      "duration": "e.g. 5 days"
    }
  ],
  "summary": "A brief 1-2 sentence summary of this document."
}

Ensure the output is ONLY valid JSON, without any markdown formatting wrappers like \`\`\`json.
Carefully check numerical values against reference ranges and flag "isAbnormal": true if they are outside the normal limits.
`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: [
        { role: 'user', parts: [
          { text: prompt },
          { inlineData: { data: base64Data, mimeType: mimeType } }
        ]}
      ],
      config: { temperature: 0.1 }
    });

    let text = response.text;
    
    // Clean up potential markdown formatting
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error extracting document data via Gemini:", error);
    throw error;
  }
}

/**
 * Chats with the user, using their medical records as context.
 * 
 * @param {string} query The user's question
 * @param {Array} records The user's chronological medical records
 * @param {string} targetLanguage The requested response language
 * @param {boolean} isOrganizer Whether this is called from the AI Organizer
 * @returns {Promise<string>} The synthesized answer
 */
export async function chatWithRecords(query, records, targetLanguage = 'English', isOrganizer = false, userLocation = null) {
  const context = records.map(r => `
---
ID: ${r.id}
Record Date: ${r.record_date}
Title: ${r.title}
Data: ${JSON.stringify(r.extracted_data)}
---
  `).join('\n');

  const baseInstructions = isOrganizer
    ? `You are MediSync Brain (Organizer). Your primary role is to answer questions specifically about the user's uploaded medical records and history.
If the query is a general medical question NOT related to their records, politely remind the user that this specific chat is for analyzing their reports, and they can use the global AI Chatbot for general queries.`
    : `You are MediSync, an intelligent, empathetic proactive health assistant.
You have access to the user's chronological medical records below.
${userLocation ? `\nUSER'S CURRENT LOCATION: ${userLocation}\n` : ''}
IMPORTANT INSTRUCTION FOR SYMPTOM ANALYSIS:
If the user describes experiencing symptoms (e.g., "I have yellow eyes and fever", "My stomach hurts"), you MUST act as an AI Symptom Analyzer.
Cross-reference their symptoms with the provided medical records (past reports, existing diseases, age, etc.).
You MUST reply strictly in the following structured format when symptoms are presented:

**Possible causes**
- [Cause 1]
- [Cause 2]

**Recommended Doctor**
[Specialist Name, e.g. Gastroenterologist]

**Urgency**
[Low / Medium / High]

**Emergency level**
[e.g. Please seek medical care today.]

**Recommended Hospitals & Clinics**
If the user needs a doctor or hospital visit, you MUST recommend 3-5 of the nearest hospitals and clinics to their provided CURRENT LOCATION that explicitly have online appointment booking facilities. DO NOT recommend small clinics or hospitals that do not support online booking.
Use this EXACT format on a new line:
[HOSPITAL|Hospital/Clinic Name|Distance in km (e.g. 1.2 km)|Number of stars 1-5|Booking URL|Latitude|Longitude|Short Review Summary]
Example: [HOSPITAL|Apollo Hospitals|4 km|5|https://www.askapollo.com|17.4165|78.4382|"Excellent facilities and highly experienced doctors."]
Example: [HOSPITAL|Yashoda Hospitals|5.2 km|4|https://www.yashodahospitals.com/|17.4265|78.4482|"Very good care but long waiting times."]

If the query is a general medical question (e.g. "what to do if we catch cold", "what is diabetes"), answer it using your general medical knowledge as a helpful, empathetic health assistant. 
If the query is specifically about the user's past records and the answer is not found in the provided records, politely say you don't have that information.`;

  const prompt = `
${baseInstructions}

When citing values from records, mention the date of the record.

CRITICAL LANGUAGE INSTRUCTION:
You MUST respond strictly in the following language: ${targetLanguage}.
Do not use English unless the requested language is English. Translate all medical terms accurately into ${targetLanguage}.

USER RECORDS:
${context}

USER QUERY:
${query}
`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.3 }
    });
    
    return response.text;
  } catch (error) {
    console.error("Error generating chat response:", error);
    throw error;
  }
}

/**
 * Generates speech from text using the Sarvam AI API.
 * 
 * @param {string} text The text to synthesize
 * @param {string} languageCode The language code (e.g., 'hi-IN', 'te-IN')
 * @returns {Promise<string>} Base64 audio string
 */
export async function generateSpeech(text, languageCode) {
  const apiKey = import.meta.env.VITE_SARVAM_API_KEY;
  if (!apiKey) {
    throw new Error("Missing VITE_SARVAM_API_KEY in environment variables.");
  }

  // Fallback to English if no target language is provided or supported
  const targetCode = languageCode || 'en-IN';

  try {
    const response = await fetch('https://api.sarvam.ai/text-to-speech', {
      method: 'POST',
      headers: {
        'api-subscription-key': apiKey,
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        inputs: [text],
        target_language_code: targetCode,
        speaker: "meera",
        pitch: 0,
        pace: 1.0,
        loudness: 1.5,
        speech_sample_rate: 8000,
        enable_preprocessing: true,
        model: "bulbul:v1"
      })
    });

    if (!response.ok) {
      const errText = await response.text();
      console.error("Sarvam API Error:", errText);
      throw new Error("Failed to generate speech");
    }

    const data = await response.json();
    return data.audios[0]; // Base64 string
  } catch (error) {
    console.error("Error generating speech:", error);
    throw error;
  }
}

/**
 * Generates an AI Health Summary based on the user's profile and medical records.
 * 
 * @param {Object} profile The user's profile data
 * @param {Array} records The user's medical records
 * @returns {Promise<Object>} The structured health summary
 */
export async function generateHealthSummary(profile, records) {
  const recordsContext = records.map(r => `
---
Record Date: ${r.record_date}
Title: ${r.title}
Data: ${JSON.stringify(r.extracted_data)}
---
  `).join('\n');

  const prompt = `You are a medical AI assistant. Analyze the user's profile and medical records to generate a holistic health summary.

User Profile:
Age: ${profile.age}
Gender: ${profile.gender}
Existing Diseases: ${profile.existing_diseases}
Allergies: ${profile.allergies}

Medical Records:
${recordsContext}

Return ONLY a valid JSON object strictly matching this schema. Do not output any markdown wrappers (no \`\`\`json).
{
  "score": (Number from 0-100 indicating overall health score),
  "status": (String, e.g., "Good", "Needs Attention", "Excellent"),
  "improving": [(Array of strings of things improving or stable, e.g. "Cholesterol", "Weight")],
  "monitoring": [(Array of strings of things to monitor or improve, e.g. "Vitamin D", "HDL")],
  "nextTest": (String, Suggested next test, e.g., "Lipid Profile"),
  "specialist": (String, Recommended specialist, e.g., "General Physician")
}`;

  try {
    const ai = getAiClient();
    const response = await ai.models.generateContent({
      model: 'gemini-2.5-flash',
      contents: prompt,
      config: { temperature: 0.1 }
    });
    
    let text = response.text;
    text = text.replace(/```json/g, '').replace(/```/g, '').trim();
    
    return JSON.parse(text);
  } catch (error) {
    console.error("Error generating health summary:", error);
    throw error;
  }
}
