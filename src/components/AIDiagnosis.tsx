import { useState, useRef, ChangeEvent } from 'react';
import { Sparkles, X, Camera, Send, BrainCircuit, Loader2 } from 'lucide-react';
import { motion } from 'motion/react';
import { GoogleGenAI } from '@google/genai';

export default function AIDiagnosis({ onClose }: { onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<string | null>(null);
  const [prompt, setPrompt] = useState('');
  const [image, setImage] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleAIAction = async () => {
    if (!prompt) return;
    setLoading(true);
    try {
      const ai = new GoogleGenAI({ apiKey: process.env.GEMINI_API_KEY as string });
      
      const contents = [];
      if (image) {
          contents.push({
              inlineData: {
                  mimeType: 'image/jpeg',
                  data: image.split(',')[1]
              }
          });
      }
      contents.push({ text: `Analyze this smartphone issue professionally in Bahasa Indonesia: ${prompt}. Provide suspected component failure, estimated repair difficulty (1-10), and estimated spare parts needed.` });

      const response = await ai.models.generateContent({
        model: "gemini-3-flash-preview",
        contents: { parts: contents as any },
      });

      setResult(response.text);
    } catch (error) {
      console.error(error);
      setResult("Koneksi Inti AI gagal. Silakan periksa konektivitas Anda.");
    } finally {
      setLoading(false);
    }
  };

  const handleImageUpload = (e: ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const reader = new FileReader();
      reader.onloadend = () => {
        setImage(reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div 
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
        onClick={onClose}
        className="absolute inset-0 bg-slate-950/80 backdrop-blur-md"
      />
      <motion.div 
        initial={{ opacity: 0, scale: 0.95, y: 30 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 30 }}
        className="relative w-full max-w-3xl bg-slate-900 border border-slate-800 rounded-3xl shadow-2xl overflow-hidden"
      >
        <div className="p-6 bg-gradient-to-r from-blue-600/20 to-indigo-600/20 border-b border-white/5 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-blue-600 rounded-lg shadow-lg shadow-blue-500/20">
              <Sparkles className="w-5 h-5 text-white" />
            </div>
            <div>
              <h2 className="text-xl font-bold text-white">Diagnosa Kerusakan AI</h2>
              <p className="text-[10px] text-blue-400 font-black uppercase tracking-tighter">Gemini Intelligence Core v3</p>
            </div>
          </div>
          <button onClick={onClose} className="p-2 hover:bg-white/5 rounded-full text-slate-400">
            <X className="w-6 h-6" />
          </button>
        </div>

        <div className="p-8 space-y-8">
          {!result ? (
            <div className="space-y-6">
              <div className="flex gap-4">
                <div 
                  onClick={() => fileInputRef.current?.click()}
                  className="w-48 h-48 rounded-2xl border-2 border-dashed border-slate-700 bg-slate-800/50 flex flex-col items-center justify-center gap-2 cursor-pointer hover:border-blue-500/50 transition-all overflow-hidden relative group"
                >
                  {image ? (
                    <img src={image} className="w-full h-full object-cover" />
                  ) : (
                    <>
                      <Camera className="w-8 h-8 text-slate-500 italic" />
                      <span className="text-xs font-bold text-slate-500">Ambil Gambar</span>
                    </>
                  )}
                  <input ref={fileInputRef} type="file" hidden accept="image/*" onChange={handleImageUpload} />
                </div>
                <div className="flex-1 flex flex-col">
                  <label className="text-[10px] font-black text-slate-500 uppercase mb-2 tracking-widest">Deskripsi Gejala</label>
                  <textarea 
                    value={prompt}
                    onChange={e => setPrompt(e.target.value)}
                    placeholder="cth., layar iPhone 13 berkedip hijau, sentuhan tersendat setelah terkena air..."
                    className="flex-1 p-4 bg-slate-800/50 border border-slate-700 rounded-2xl text-white outline-none focus:ring-2 focus:ring-blue-500/50 transition-all resize-none font-medium"
                  />
                </div>
              </div>
              <button
                disabled={loading || !prompt}
                onClick={handleAIAction}
                className="w-full py-4 bg-blue-600 hover:bg-blue-700 disabled:opacity-50 text-white font-black uppercase tracking-widest rounded-2xl shadow-xl shadow-blue-600/20 flex items-center justify-center gap-2 transition-all active:scale-98"
              >
                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <BrainCircuit className="w-5 h-5" />}
                Analisa Kerusakan
              </button>
            </div>
          ) : (
            <div className="space-y-6">
              <div className="p-6 bg-slate-800/50 border border-slate-700 rounded-2xl animate-in fade-in slide-in-from-bottom-2">
                <div className="flex items-center gap-2 mb-4 text-blue-400 font-bold">
                  <Sparkles className="w-4 h-4" />
                  <span>Hasil Diagnosa</span>
                </div>
                <div className="prose prose-invert max-w-none text-slate-300 whitespace-pre-wrap font-medium">
                  {result}
                </div>
              </div>
              <button 
                onClick={() => setResult(null)}
                className="w-full py-3 bg-slate-800 hover:bg-slate-700 text-white font-bold rounded-xl transition-all"
              >
                Diagnosa Baru
              </button>
            </div>
          )}
        </div>
      </motion.div>
    </div>
  );
}
