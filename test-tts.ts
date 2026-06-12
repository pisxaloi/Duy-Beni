import { GoogleGenAI, Modality } from "@google/genai";

async function test() {
  try {
    const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY });
    const response = await ai.models.generateContent({
      model: "gemini-3.1-flash-tts-preview",
      contents: [{ parts: [{ text: `Evet, adımı ancak fısıltıyla almaya cesaret edebileceğiniz o Seti.` }] }],
      config: {
        responseModalities: ["AUDIO" as any], // let's try with "AUDIO"
        speechConfig: {
          voiceConfig: { prebuiltVoiceConfig: { voiceName: 'Kore' } },
        },
      },
    });
    console.log(JSON.stringify(response, null, 2));
  } catch(e) {
    console.error(e);
  }
}
test();
