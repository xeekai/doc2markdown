
import React, { useState, useRef, useEffect } from 'react';
import { AppStatus, ConversionResult } from './types';
import { optimizeMarkdownForAI } from './services/geminiService';
import { 
  FileUp, 
  FileCode, 
  CheckCircle, 
  AlertCircle, 
  Loader2, 
  Copy, 
  Download, 
  Trash2, 
  FileText, 
  ScanSearch, 
  Languages,
  Sparkles,
  ShieldCheck,
  Image as ImageIcon,
  X,
  Globe,
  Eye,
  Code,
  Camera,
  RefreshCw,
  HardDrive
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { tomorrow as darkStyle } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Tesseract from 'tesseract.js';

pdfjsLib.GlobalWorkerOptions.workerSrc = 'https://esm.sh/pdfjs-dist@4.10.38/build/pdf.worker.min.mjs';

const SUPPORTED_LANGUAGES = [
  { label: 'English', code: 'eng' },
  { label: 'Spanish', code: 'spa' },
  { label: 'French', code: 'fra' },
  { label: 'German', code: 'deu' },
  { label: 'Chinese (Simp)', code: 'chi_sim' },
  { label: 'Japanese', code: 'jpn' },
  { label: 'Portuguese', code: 'por' },
  { label: 'Italian', code: 'ita' },
];

interface ImageAsset {
  id: string;
  name: string;
  base64: string;
  previewUrl: string;
  type: string;
}

const App: React.FC = () => {
  const [status, setStatus] = useState<AppStatus>(AppStatus.IDLE);
  const [ocrStatus, setOcrStatus] = useState<string>('');
  const [result, setResult] = useState<ConversionResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [inputType, setInputType] = useState<'upload' | 'paste'>('upload');
  const [pastedHtml, setPastedHtml] = useState('');
  const [selectedLang, setSelectedLang] = useState('eng');
  const [attachedImages, setAttachedImages] = useState<ImageAsset[]>([]);
  
  const [showCamera, setShowCamera] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  const markdownScrollRef = useRef<HTMLDivElement>(null);
  const previewScrollRef = useRef<HTMLDivElement>(null);
  const isSyncingRef = useRef(false);

  const renderMarkdownToHtml = (md: string) => {
    return md
      .replace(/^# (.*$)/gim, '<h1 class="preview-h1">$1</h1>')
      .replace(/^## (.*$)/gim, '<h2 class="preview-h2">$1</h2>')
      .replace(/^### (.*$)/gim, '<h3 class="preview-h3">$1</h3>')
      .replace(/^\> (.*$)/gim, '<blockquote class="preview-blockquote">$1</blockquote>')
      .replace(/\*\*(.*)\*\*/gim, '<strong>$1</strong>')
      .replace(/\*(.*)\*/gim, '<em>$1</em>')
      .replace(/!\[(.*?)\]\((.*?)\)/gim, '<img alt="$1" src="$2" class="preview-img" />')
      .replace(/\n\n/gim, '</p><p class="preview-p">')
      .replace(/^- (.*$)/gim, '<ul class="preview-ul"><li class="preview-li">$1</li></ul>')
      .replace(/<\/ul>\n<ul class="preview-ul">/gim, '');
  };

  const handleScroll = (source: 'markdown' | 'preview') => {
    if (isSyncingRef.current) return;
    isSyncingRef.current = true;
    const sourceEl = source === 'markdown' ? markdownScrollRef.current : previewScrollRef.current;
    const targetEl = source === 'markdown' ? previewScrollRef.current : markdownScrollRef.current;
    if (sourceEl && targetEl) {
      const percentage = sourceEl.scrollTop / (sourceEl.scrollHeight - sourceEl.clientHeight);
      targetEl.scrollTop = percentage * (targetEl.scrollHeight - targetEl.clientHeight);
    }
    setTimeout(() => { isSyncingRef.current = false; }, 50);
  };

  const startCamera = async () => {
    setShowCamera(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: { facingMode: 'environment' } });
      if (videoRef.current) videoRef.current.srcObject = stream;
    } catch (err) {
      alert("Could not access camera. Please check permissions.");
      setShowCamera(false);
    }
  };

  const stopCamera = () => {
    if (videoRef.current && videoRef.current.srcObject) {
      const tracks = (videoRef.current.srcObject as MediaStream).getTracks();
      tracks.forEach(track => track.stop());
    }
    setShowCamera(false);
  };

  const capturePhoto = () => {
    if (videoRef.current && canvasRef.current) {
      const context = canvasRef.current.getContext('2d');
      if (context) {
        canvasRef.current.width = videoRef.current.videoWidth;
        canvasRef.current.height = videoRef.current.videoHeight;
        context.drawImage(videoRef.current, 0, 0);
        const base64 = canvasRef.current.toDataURL('image/png');
        const id = `img_${Math.random().toString(36).substr(2, 9)}`;
        setAttachedImages(prev => [...prev, {
          id,
          name: `capture_${new Date().getTime()}.png`,
          base64,
          previewUrl: base64,
          type: 'image/png'
        }]);
        stopCamera();
      }
    }
  };

  const handleFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const docFile = fileArray.find(f => 
      f.name.endsWith('.docx') || f.name.endsWith('.pdf') || f.name.endsWith('.html') || f.name.endsWith('.htm') || f.type.startsWith('text/')
    );
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));

    const fileToAsset = async (file: File): Promise<ImageAsset> => {
      return new Promise((resolve) => {
        const reader = new FileReader();
        reader.onload = (e) => {
          const base64 = e.target?.result as string;
          resolve({
            id: `img_${Math.random().toString(36).substr(2, 9)}`,
            name: file.name,
            base64: base64,
            previewUrl: URL.createObjectURL(file),
            type: file.type
          });
        };
        reader.readAsDataURL(file);
      });
    };

    if (!docFile && imageFiles.length > 0) {
      const newAssets = await Promise.all(imageFiles.map(fileToAsset));
      setAttachedImages(prev => [...prev, ...newAssets]);
      return;
    }

    if (!docFile) {
      setError("Document format not recognized.");
      setStatus(AppStatus.ERROR);
      return;
    }

    setStatus(AppStatus.READING);
    setError(null);

    try {
      let content = '';
      if (docFile.name.endsWith('.pdf')) {
        const pdf = await pdfjsLib.getDocument({ data: await docFile.arrayBuffer() }).promise;
        for (let i = 1; i <= pdf.numPages; i++) {
          const page = await pdf.getPage(i);
          const textContent = await page.getTextContent();
          content += textContent.items.map((item: any) => item.str).join(' ') + '\n';
          if (content.length < 50) {
            setOcrStatus(`OCR: Page ${i}...`);
            const viewport = page.getViewport({ scale: 2.0 });
            const canvas = document.createElement('canvas');
            const context = canvas.getContext('2d');
            canvas.height = viewport.height; canvas.width = viewport.width;
            if (context) {
              await page.render({ canvasContext: context, viewport }).promise;
              const { data: { text } } = await Tesseract.recognize(canvas, selectedLang);
              content += text;
            }
          }
        }
      } else if (docFile.name.endsWith('.docx')) {
        content = (await mammoth.extractRawText({ arrayBuffer: await docFile.arrayBuffer() })).value;
      } else {
        content = await docFile.text();
      }

      const newAssets = await Promise.all(imageFiles.map(fileToAsset));
      const allAssets = [...attachedImages, ...newAssets];
      setOcrStatus('');
      setStatus(AppStatus.CONVERTING);
      
      const optimizedMarkdown = await optimizeMarkdownForAI(
        content, 
        docFile.name, 
        docFile.name.endsWith('.html'), 
        allAssets.map(a => ({ name: a.name, data: a.base64 }))
      );

      setResult({
        markdown: optimizedMarkdown,
        metadata: { 
          originalName: docFile.name, 
          wordCount: optimizedMarkdown.split(/\s+/).length, 
          estimatedTokens: Math.ceil(optimizedMarkdown.length / 4) 
        }
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || "Processing failed.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedHtml.trim()) return;
    setStatus(AppStatus.CONVERTING);
    try {
      const optimized = await optimizeMarkdownForAI(
        pastedHtml, 
        "pasted_content.html", 
        true, 
        attachedImages.map(a => ({ name: a.name, data: a.base64 }))
      );
      setResult({
        markdown: optimized,
        metadata: { originalName: "pasted_content.html", wordCount: optimized.split(/\s+/).length, estimatedTokens: Math.ceil(optimized.length / 4) }
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err) {
      setError("Failed to process paste.");
      setStatus(AppStatus.ERROR);
    }
  };

  const reset = () => {
    setStatus(AppStatus.IDLE); setResult(null); setError(null); setPastedHtml(''); setOcrStatus(''); setAttachedImages([]);
  };

  return (
    <div className="min-h-screen pb-12">
      <div className="max-w-[1400px] mx-auto px-6 py-10 flex flex-col items-center">
        
        <header className="w-full flex flex-col items-center mb-16">
          <img 
            src="https://raw.githubusercontent.com/Metropolis-io/branding/main/logos/metropolis-logo-orange.png" 
            alt="Metropolis" 
            className="h-10 mb-8"
            onError={(e) => {
                // Fallback if logo fails to load (the provided URL might need adjusting)
                e.currentTarget.style.display = 'none';
            }}
          />
          <h1 className="font-poppins text-4xl font-extrabold tracking-tight mb-2 text-[#F6F8FA]">
            METROPOLIS <span className="text-[#E66C37]">DOCS</span>
          </h1>
          <p className="text-[#F6F8FA]/60 font-medium max-w-lg text-center">
            Advanced AI-driven structural conversion for the modern context layer.
          </p>
        </header>

        <main className="w-full flex flex-col items-center">
          {status === AppStatus.IDLE && (
            <div className="w-full max-w-4xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex p-1 bg-white/5 rounded-2xl border border-white/10">
                <button onClick={() => setInputType('upload')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${inputType === 'upload' ? 'bg-[#E66C37] text-white' : 'text-white/50 hover:text-white'}`}>
                  <FileUp className="w-4 h-4" /> UPLOAD
                </button>
                <button onClick={() => setInputType('paste')} className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-bold transition-all ${inputType === 'paste' ? 'bg-[#E66C37] text-white' : 'text-white/50 hover:text-white'}`}>
                  <FileCode className="w-4 h-4" /> PASTE HTML
                </button>
              </div>

              {inputType === 'upload' ? (
                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                  <div className="lg:col-span-2 space-y-4">
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
                      className={`w-full h-80 border-2 border-dashed rounded-[2rem] flex flex-col items-center justify-center transition-all cursor-pointer glass-panel group
                        ${isDragging ? 'border-[#E66C37] bg-white/5 scale-[1.01]' : 'border-white/10 hover:border-white/30'}`}
                      onClick={() => document.getElementById('fileInput')?.click()}
                    >
                      <input id="fileInput" type="file" className="hidden" multiple accept=".docx,.pdf,.txt,.md,.html,.htm,image/*" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                      <div className="bg-[#E66C37] p-5 rounded-2xl mb-4 text-white shadow-[0_0_20px_rgba(230,108,55,0.3)] group-hover:scale-110 transition-transform">
                        <FileUp className="w-8 h-8" />
                      </div>
                      <p className="font-poppins text-xl font-bold text-white uppercase tracking-wider">Drop Assets</p>
                      <p className="text-white/40 text-sm font-medium">PDF, Word, or HTML</p>
                    </div>
                  </div>

                  <div className="space-y-6">
                    <div className="glass-panel p-6 rounded-[2rem]">
                      <h3 className="text-[10px] font-black text-white/40 uppercase tracking-[0.2em] mb-4 flex items-center gap-2">
                        <HardDrive className="w-3.5 h-3.5 text-[#24B5DA]" /> REGISTRY
                      </h3>
                      <div className="space-y-3">
                        <button onClick={startCamera} className="w-full flex items-center gap-3 p-4 bg-white/5 border border-white/5 rounded-2xl hover:bg-white/10 hover:border-[#E66C37]/30 transition-all font-bold text-xs text-white/70">
                          <Camera className="w-4 h-4 text-[#E66C37]" /> CAMERA CAPTURE
                        </button>
                        <div className="flex items-center gap-2 p-4 bg-white/5 border border-white/5 rounded-2xl">
                          <Languages className="w-4 h-4 text-[#24B5DA]" />
                          <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)} className="bg-transparent text-xs font-bold text-white/70 w-full focus:outline-none cursor-pointer">
                            {SUPPORTED_LANGUAGES.map(lang => ( <option key={lang.code} value={lang.code}>{lang.label}</option> ))}
                          </select>
                        </div>
                      </div>

                      {attachedImages.length > 0 && (
                        <div className="mt-8">
                          <p className="text-[9px] font-black text-white/30 uppercase tracking-[0.2em] mb-4">ASSETS ({attachedImages.length})</p>
                          <div className="grid grid-cols-3 gap-2">
                            {attachedImages.map((img, idx) => (
                              <div key={img.id} className="relative group aspect-square rounded-xl overflow-hidden border border-white/10 bg-black/20">
                                <img src={img.previewUrl} className="w-full h-full object-cover opacity-60 group-hover:opacity-100 transition-opacity" />
                                <button onClick={() => setAttachedImages(prev => prev.filter((_, i) => i !== idx))} className="absolute top-1 right-1 bg-black/80 p-1 rounded-lg opacity-0 group-hover:opacity-100 transition-all">
                                  <X className="w-3 h-3 text-red-500" />
                                </button>
                              </div>
                            ))}
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="glass-panel rounded-[2rem] p-8 w-full border border-white/10">
                  <textarea className="w-full h-72 p-6 rounded-2xl border border-white/5 bg-black/20 font-mono text-sm text-white/80 focus:ring-1 focus:ring-[#E66C37] focus:outline-none mb-6 resize-none custom-scrollbar" placeholder="Paste HTML content source..." value={pastedHtml} onChange={(e) => setPastedHtml(e.target.value)} />
                  <button onClick={handlePasteSubmit} disabled={!pastedHtml.trim()} className="w-full py-5 bg-[#E66C37] text-white rounded-2xl font-bold text-lg hover:bg-orange-600 transition-all shadow-xl shadow-orange-950/20 uppercase tracking-widest">Process Layer</button>
                </div>
              )}
            </div>
          )}

          {showCamera && (
            <div className="fixed inset-0 bg-black/95 z-[100] flex items-center justify-center p-4 backdrop-blur-xl">
              <div className="bg-[#0E1321] rounded-[2.5rem] w-full max-w-xl overflow-hidden border border-white/10 shadow-2xl relative">
                <video ref={videoRef} autoPlay playsInline className="w-full aspect-[4/3] object-cover bg-black" />
                <canvas ref={canvasRef} className="hidden" />
                <div className="p-8 flex items-center justify-between bg-black/40 absolute bottom-0 left-0 right-0 backdrop-blur-lg">
                  <button onClick={stopCamera} className="p-4 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-colors"><X className="w-6 h-6" /></button>
                  <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full border-4 border-[#0E1321] flex items-center justify-center active:scale-95 transition-all"><div className="w-16 h-16 rounded-full border-2 border-[#0E1321] bg-white" /></button>
                  <button onClick={() => { stopCamera(); startCamera(); }} className="p-4 bg-white/5 border border-white/10 text-white rounded-2xl hover:bg-white/10 transition-colors"><RefreshCw className="w-6 h-6" /></button>
                </div>
              </div>
            </div>
          )}

          {(status === AppStatus.READING || status === AppStatus.CONVERTING) && (
            <div className="flex flex-col items-center justify-center p-16 glass-panel rounded-[3rem] w-full max-w-xl text-center border border-white/10">
              <div className="relative mb-8">
                <div className="w-20 h-20 border-4 border-[#E66C37]/20 border-t-[#E66C37] rounded-full animate-spin" />
                {ocrStatus && <ScanSearch className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-6 h-6 text-[#24B5DA] animate-pulse" />}
              </div>
              <h2 className="font-poppins text-2xl font-black text-white mb-3 tracking-wide">{ocrStatus ? 'OCR SCANNING...' : 'ANALYZING STRUCTURE...'}</h2>
              <p className="text-white/40 text-sm font-medium uppercase tracking-widest">{ocrStatus || 'AI Core is restructuring content mapping.'}</p>
            </div>
          )}

          {status === AppStatus.SUCCESS && result && (
            <div className="w-full flex flex-col xl:flex-row gap-8 items-start animate-in fade-in slide-in-from-bottom-12 duration-700">
              <div className="w-full xl:w-80 flex flex-col gap-6 xl:sticky xl:top-8">
                <div className="glass-panel p-8 rounded-[2.5rem] border border-white/10">
                  <div className="flex items-center gap-3 mb-8">
                    <div className="bg-green-500/20 p-2 rounded-xl"><CheckCircle className="w-5 h-5 text-[#1AAB40]" /></div>
                    <h2 className="font-poppins text-lg font-bold text-white tracking-wide">COMPILED</h2>
                  </div>
                  
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center text-[10px] text-white/40 font-black tracking-widest uppercase">
                        <span>Words</span>
                        <span className="text-white">{result.metadata.wordCount.toLocaleString()}</span>
                    </div>
                    <div className="flex justify-between items-center text-[10px] text-white/40 font-black tracking-widest uppercase">
                        <span>Tokens</span>
                        <span className="text-[#24B5DA]">{result.metadata.estimatedTokens.toLocaleString()}</span>
                    </div>
                  </div>

                  <div className="flex flex-col gap-3">
                    <button onClick={() => { navigator.clipboard.writeText(result.markdown); alert("COPIED TO CLIPBOARD"); }} className="flex items-center justify-center gap-2 w-full py-4 bg-[#F6F8FA] text-[#0E1321] rounded-2xl font-bold hover:bg-white transition-all text-xs uppercase tracking-widest"><Copy className="w-4 h-4" /> Copy Context</button>
                    <button onClick={() => { const blob = new Blob([result.markdown], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${result.metadata.originalName.split('.')[0]}.md`; a.click(); URL.revokeObjectURL(url); }} className="flex items-center justify-center gap-2 w-full py-4 bg-white/5 border border-white/10 text-white rounded-2xl font-bold hover:bg-white/10 transition-all text-xs uppercase tracking-widest"><Download className="w-4 h-4" /> Save .MD</button>
                    <button onClick={reset} className="mt-4 flex items-center justify-center gap-2 w-full py-2 text-white/30 font-black text-[10px] hover:text-[#D64554] transition-colors uppercase tracking-[0.3em]"><Trash2 className="w-3.5 h-3.5" /> Start Over</button>
                  </div>
                </div>
                
                <div className="metropolis-gradient p-8 rounded-[2.5rem] text-white shadow-xl flex items-center gap-4">
                  <ShieldCheck className="w-6 h-6 shrink-0" />
                  <div>
                    <p className="text-[10px] font-black uppercase tracking-widest mb-1">Encrypted Sandbox</p>
                    <p className="text-[10px] text-white/70 leading-relaxed font-medium">Local execution mode active. All data purged on session close.</p>
                  </div>
                </div>
              </div>

              <div className="flex-grow flex flex-col lg:flex-row gap-6 h-[75vh] w-full">
                <div className="flex-1 bg-black/40 rounded-[2.5rem] border border-white/5 overflow-hidden flex flex-col">
                  <div className="px-8 py-4 border-b border-white/5 flex items-center gap-2 bg-white/5">
                    <Code className="w-4 h-4 text-[#24B5DA]" />
                    <span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">MARKDOWN</span>
                  </div>
                  <div ref={markdownScrollRef} onScroll={() => handleScroll('markdown')} className="flex-grow overflow-y-auto custom-scrollbar">
                    <SyntaxHighlighter language="markdown" style={darkStyle} customStyle={{ padding: '2rem', fontSize: '0.85rem', backgroundColor: 'transparent', margin: 0 }}>{result.markdown}</SyntaxHighlighter>
                  </div>
                </div>

                <div className="flex-1 glass-panel rounded-[2.5rem] border border-white/10 overflow-hidden flex flex-col">
                  <div className="px-8 py-4 border-b border-white/10 flex items-center justify-between bg-white/5">
                    <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-[#E66C37]" /><span className="text-[10px] font-black text-white/40 uppercase tracking-[0.3em]">VIEWPORT</span></div>
                  </div>
                  <div ref={previewScrollRef} onScroll={() => handleScroll('preview')} className="flex-grow overflow-y-auto custom-scrollbar p-10 bg-white">
                    <div className="prose-container max-w-none text-slate-800"><div dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(result.markdown) }} /></div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {status === AppStatus.ERROR && (
            <div className="flex flex-col items-center justify-center p-16 glass-panel rounded-[3rem] border border-[#D64554]/20 w-full max-w-xl text-center">
              <AlertCircle className="w-12 h-12 text-[#D64554] mb-6 animate-pulse" />
              <h2 className="font-poppins text-xl font-bold text-white mb-3">EXECUTION INTERRUPTED</h2>
              <p className="text-white/40 text-sm mb-8 font-medium">{error}</p>
              <button onClick={reset} className="px-10 py-4 bg-[#D64554] text-white rounded-2xl font-bold shadow-lg shadow-red-950/20 uppercase tracking-widest text-xs">Re-Attempt</button>
            </div>
          )}
        </main>
      </div>
      <style>{`
        .preview-h1 { font-family: 'Poppins', sans-serif; font-size: 2.2rem; font-weight: 800; color: #0E1321; margin-bottom: 1.5rem; border-bottom: 3px solid #E66C37; padding-bottom: 0.5rem; }
        .preview-h2 { font-family: 'Poppins', sans-serif; font-size: 1.6rem; font-weight: 700; color: #0E1321; margin: 2rem 0 1rem; }
        .preview-p { margin-bottom: 1.2rem; color: #334155; line-height: 1.8; font-size: 1rem; }
        .preview-img { max-width: 100%; border-radius: 16px; margin: 2rem 0; box-shadow: 0 10px 30px rgba(0,0,0,0.15); border: 1px solid #e2e8f0; }
        .preview-blockquote { border-left: 6px solid #E66C37; background: #FFF7F3; padding: 1.5rem; margin: 2rem 0; border-radius: 0 12px 12px 0; color: #7C2D12; font-style: italic; }
        .preview-ul { list-style-type: disc; margin-left: 2rem; margin-bottom: 1.5rem; color: #334155; }
        .preview-li { margin-bottom: 0.5rem; }
        
        .prose-container strong { color: #0E1321; font-weight: 700; }
        .prose-container em { color: #E66C37; }
      `}</style>
    </div>
  );
};

export default App;
