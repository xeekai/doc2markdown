
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
  RefreshCw
} from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import * as mammoth from 'mammoth';
import { Prism as SyntaxHighlighter } from 'react-syntax-highlighter';
import { oneLight } from 'react-syntax-highlighter/dist/esm/styles/prism';
import Tesseract from 'tesseract.js';

// Set up PDF.js worker
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
  name: string;
  base64: string;
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
  const [originalHtmlContent, setOriginalHtmlContent] = useState<string | null>(null);
  const [selectedLang, setSelectedLang] = useState('eng');
  const [attachedImages, setAttachedImages] = useState<ImageAsset[]>([]);
  
  // Camera State
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
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
    } catch (err) {
      console.error("Camera error:", err);
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
        const newAsset: ImageAsset = {
          name: `camera-capture-${Date.now()}.png`,
          base64,
          type: 'image/png'
        };
        setAttachedImages(prev => [...prev, newAsset]);
        stopCamera();
      }
    }
  };

  const extractTextFromPdf = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const loadingTask = pdfjsLib.getDocument({ data: arrayBuffer });
    const pdf = await loadingTask.promise;
    let fullText = '';
    for (let i = 1; i <= pdf.numPages; i++) {
      const page = await pdf.getPage(i);
      const textContent = await page.getTextContent();
      let pageText = textContent.items.map((item: any) => item.str).join(' ');
      if (pageText.trim().length < 15) {
        setOcrStatus(`OCR: Scanning Page ${i} (${selectedLang})...`);
        const viewport = page.getViewport({ scale: 2.0 });
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        canvas.height = viewport.height;
        canvas.width = viewport.width;
        if (context) {
          await page.render({ canvasContext: context, viewport }).promise;
          const { data: { text } } = await Tesseract.recognize(canvas, selectedLang);
          pageText = text;
        }
      }
      fullText += `--- Page ${i} ---\n${pageText}\n\n`;
    }
    setOcrStatus('');
    return fullText;
  };

  const extractTextFromDocx = async (arrayBuffer: ArrayBuffer): Promise<string> => {
    const result = await mammoth.extractRawText({ arrayBuffer });
    return result.value;
  };

  const fileToBase64 = (file: File): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.readAsDataURL(file);
      reader.onload = () => resolve(reader.result as string);
      reader.onerror = error => reject(error);
    });
  };

  const handleFiles = async (files: FileList) => {
    if (!files || files.length === 0) return;
    const fileArray = Array.from(files);
    const docFile = fileArray.find(f => {
      const isDocx = f.name.endsWith('.docx');
      const isPdf = f.name.endsWith('.pdf');
      const isHtml = f.name.endsWith('.html') || f.name.endsWith('.htm');
      const isText = f.type.startsWith('text/');
      return isDocx || isPdf || isHtml || isText;
    });
    const imageFiles = fileArray.filter(f => f.type.startsWith('image/'));

    if (!docFile && imageFiles.length > 0) {
      const processedImages = await Promise.all(imageFiles.map(async f => ({ name: f.name, base64: await fileToBase64(f), type: f.type })));
      setAttachedImages(prev => [...prev, ...processedImages]);
      return;
    }

    if (!docFile) {
      setError("Please include at least one document.");
      setStatus(AppStatus.ERROR);
      return;
    }

    setStatus(AppStatus.READING);
    setError(null);

    try {
      let content = '';
      const isPdf = docFile.name.endsWith('.pdf');
      const isDocx = docFile.name.endsWith('.docx');
      const isHtml = docFile.name.endsWith('.html') || docFile.name.endsWith('.htm');
      if (isPdf) content = await extractTextFromPdf(await docFile.arrayBuffer());
      else if (isDocx) content = await extractTextFromDocx(await docFile.arrayBuffer());
      else { content = await docFile.text(); if (isHtml) setOriginalHtmlContent(content); }

      const processedImages = await Promise.all(imageFiles.map(async f => ({ name: f.name, base64: await fileToBase64(f), type: f.type })));
      const allImages = [...attachedImages, ...processedImages];
      if (!content.trim()) throw new Error("No content could be extracted.");

      setStatus(AppStatus.CONVERTING);
      const imageMetadata = allImages.map(img => ({ name: img.name, data: img.base64 }));
      const optimizedMarkdown = await optimizeMarkdownForAI(content, docFile.name, isHtml, imageMetadata);
      setResult({
        markdown: optimizedMarkdown,
        metadata: { originalName: docFile.name, wordCount: optimizedMarkdown.split(/\s+/).length, estimatedTokens: Math.ceil(optimizedMarkdown.length / 4) }
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || "Failed to process documents.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handlePasteSubmit = async () => {
    if (!pastedHtml.trim()) return;
    setStatus(AppStatus.CONVERTING);
    setError(null);
    setOriginalHtmlContent(pastedHtml);
    try {
      const imageMetadata = attachedImages.map(img => ({ name: img.name, data: img.base64 }));
      const optimizedMarkdown = await optimizeMarkdownForAI(pastedHtml, "pasted-content.html", true, imageMetadata);
      setResult({
        markdown: optimizedMarkdown,
        metadata: { originalName: "pasted-content.html", wordCount: optimizedMarkdown.split(/\s+/).length, estimatedTokens: Math.ceil(optimizedMarkdown.length / 4) }
      });
      setStatus(AppStatus.SUCCESS);
    } catch (err: any) {
      setError(err.message || "Failed to process pasted content.");
      setStatus(AppStatus.ERROR);
    }
  };

  const handleDownloadHtml = () => {
    if (!result) return;
    const body = renderMarkdownToHtml(result.markdown);
    const finalHtml = `<!DOCTYPE html><html><head><meta charset="UTF-8"><style>body{font-family:Inter,sans-serif;max-width:800px;margin:40px auto;padding:20px;line-height:1.6}img{max-width:100%;border-radius:12px;margin:2rem 0;box-shadow:0 4px 10px rgba(0,0,0,0.1)}</style></head><body>${body}</body></html>`;
    const blob = new Blob([finalHtml], { type: 'text/html' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a'); a.href = url; a.download = `${result.metadata.originalName.split('.')[0]}_preview.html`; a.click();
    URL.revokeObjectURL(url);
  };

  const handleDownloadPdf = () => {
    if (!result) return;
    const printWindow = window.open('', '_blank');
    if (!printWindow) return;
    printWindow.document.write(`<!DOCTYPE html><html><head><style>body{font-family:Inter,sans-serif;padding:40px}img{max-width:100%}</style></head><body><h1>${result.metadata.originalName}</h1><div>${result.markdown}</div><script>window.onload=()=>window.print();</script></body></html>`);
    printWindow.document.close();
  };

  const reset = () => {
    setStatus(AppStatus.IDLE); setResult(null); setError(null); setPastedHtml(''); setOriginalHtmlContent(null); setOcrStatus(''); setAttachedImages([]);
  };

  const removeImage = (index: number) => { setAttachedImages(prev => prev.filter((_, i) => i !== index)); };

  return (
    <div className="min-h-screen bg-[#fcfdff] text-slate-900 selection:bg-indigo-100 selection:text-indigo-700">
      <div className="max-w-[1400px] mx-auto px-6 py-12 md:py-20 flex flex-col items-center">
        
        <header className="w-full text-center mb-16 animate-in fade-in slide-in-from-top-4 duration-1000">
          <div className="inline-flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-600 px-4 py-1.5 rounded-full text-xs font-bold tracking-wide uppercase mb-6 shadow-sm">
            <Sparkles className="w-3.5 h-3.5" />
            LLM-Ready Context Optimizer
          </div>
          <h1 className="text-5xl font-black text-slate-900 tracking-tight sm:text-6xl mb-6">
            Doc<span className="text-indigo-600">2</span>Markdown
          </h1>
          <p className="text-xl text-slate-500 max-w-2xl mx-auto leading-relaxed font-medium">
            Structural recovery with OCR and image embedding. Perfect for deep AI context.
          </p>
        </header>

        <main className="w-full flex flex-col items-center">
          {status === AppStatus.IDLE && (
            <div className="w-full max-w-2xl space-y-8 animate-in fade-in zoom-in-95 duration-500">
              <div className="flex p-1.5 bg-slate-100 rounded-2xl shadow-inner border border-slate-200">
                <button onClick={() => setInputType('upload')} className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold transition-all duration-300 ${inputType === 'upload' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  <FileUp className="w-4 h-4" /> Drop File
                </button>
                <button onClick={() => setInputType('paste')} className={`flex-1 flex items-center justify-center gap-2.5 py-3 rounded-xl font-bold transition-all duration-300 ${inputType === 'paste' ? 'bg-white shadow-md text-indigo-600' : 'text-slate-500 hover:text-slate-700'}`}>
                  <FileCode className="w-4 h-4" /> Paste HTML
                </button>
              </div>

              <div className="space-y-6">
                {inputType === 'upload' ? (
                  <div className="space-y-4">
                    <div
                      onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                      onDragLeave={(e) => { e.preventDefault(); setIsDragging(false); }}
                      onDrop={(e) => { e.preventDefault(); setIsDragging(false); if (e.dataTransfer.files) handleFiles(e.dataTransfer.files); }}
                      className={`w-full h-80 border-2 border-dashed rounded-[2.5rem] flex flex-col items-center justify-center transition-all duration-500 cursor-pointer group
                        ${isDragging ? 'border-indigo-400 bg-indigo-50/50 scale-[1.02]' : 'border-slate-200 bg-white hover:border-indigo-200 hover:shadow-xl'}`}
                      onClick={() => document.getElementById('fileInput')?.click()}
                    >
                      <input id="fileInput" type="file" className="hidden" multiple accept=".docx,.pdf,.txt,.md,.html,.htm,image/*" onChange={(e) => e.target.files && handleFiles(e.target.files)} />
                      <div className="bg-indigo-600 p-6 rounded-3xl mb-6 text-white shadow-xl group-hover:scale-110 transition-transform duration-500">
                        <FileUp className="w-10 h-10" />
                      </div>
                      <p className="text-2xl font-bold text-slate-800 mb-2">Drop document & images</p>
                      <p className="text-slate-400 text-sm font-semibold">PDF, DOCX, HTML + PNG, JPG, WebP</p>
                    </div>

                    <div className="grid grid-cols-2 gap-4">
                      <button onClick={(e) => { e.stopPropagation(); startCamera(); }} className="flex items-center justify-center gap-3 py-4 bg-white border border-slate-100 rounded-[1.5rem] shadow-sm font-bold text-slate-700 hover:bg-slate-50 transition-all group">
                        <Camera className="w-5 h-5 text-indigo-500 group-hover:scale-110 transition-transform" />
                        Capture from Camera
                      </button>
                      <div className="flex items-center justify-between bg-white p-4 rounded-[1.5rem] border border-slate-100 shadow-sm">
                        <Languages className="w-4 h-4 text-indigo-500" />
                        <select value={selectedLang} onChange={(e) => setSelectedLang(e.target.value)} className="bg-transparent text-sm font-bold text-slate-700 focus:outline-none cursor-pointer">
                          {SUPPORTED_LANGUAGES.map(lang => ( <option key={lang.code} value={lang.code}>{lang.label}</option> ))}
                        </select>
                      </div>
                    </div>

                    {attachedImages.length > 0 && (
                      <div className="bg-white p-5 rounded-[1.5rem] border border-slate-100 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-300">
                        <h3 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4 flex items-center gap-2">
                          <ImageIcon className="w-3.5 h-3.5" /> Attached Assets ({attachedImages.length})
                        </h3>
                        <div className="grid grid-cols-4 gap-3">
                          {attachedImages.map((img, idx) => (
                            <div key={idx} className="relative group aspect-square rounded-xl overflow-hidden border border-slate-100 bg-slate-50">
                              <img src={img.base64} alt={img.name} className="w-full h-full object-cover" />
                              <button onClick={(e) => { e.stopPropagation(); removeImage(idx); }} className="absolute top-1 right-1 bg-white/90 p-1 rounded-md shadow-sm opacity-0 group-hover:opacity-100 transition-opacity">
                                <X className="w-3 h-3 text-red-500" />
                              </button>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                ) : (
                  <div className="bg-white rounded-[2.5rem] border border-slate-200 p-8 shadow-xl">
                    <textarea className="w-full h-72 p-6 rounded-2xl border border-slate-100 bg-slate-50/50 font-mono text-sm focus:ring-2 focus:ring-indigo-500 focus:outline-none mb-6 resize-none" placeholder="Paste your HTML source code here..." value={pastedHtml} onChange={(e) => setPastedHtml(e.target.value)} />
                    <button onClick={handlePasteSubmit} disabled={!pastedHtml.trim()} className="w-full py-5 bg-indigo-600 text-white rounded-2xl font-black text-lg hover:bg-indigo-700 transition-all shadow-xl shadow-indigo-100">Optimize Content</button>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Camera Modal */}
          {showCamera && (
            <div className="fixed inset-0 bg-slate-900/95 z-[100] flex items-center justify-center p-6 backdrop-blur-sm">
              <div className="bg-slate-800 rounded-[2.5rem] w-full max-w-2xl overflow-hidden border border-slate-700 shadow-2xl relative animate-in zoom-in-95 duration-300">
                <div className="aspect-[4/3] bg-black relative">
                  <video ref={videoRef} autoPlay playsInline className="w-full h-full object-cover" />
                  <canvas ref={canvasRef} className="hidden" />
                  <div className="absolute inset-0 pointer-events-none border-[20px] border-slate-900/20" />
                </div>
                <div className="p-8 flex items-center justify-between bg-slate-800">
                  <button onClick={stopCamera} className="p-4 bg-slate-700 text-white rounded-2xl hover:bg-slate-600 transition-colors">
                    <X className="w-6 h-6" />
                  </button>
                  <button onClick={capturePhoto} className="w-20 h-20 bg-white rounded-full flex items-center justify-center group active:scale-95 transition-all shadow-xl shadow-white/10">
                    <div className="w-16 h-16 border-4 border-slate-800 rounded-full bg-white group-hover:bg-slate-50" />
                  </button>
                  <button onClick={() => { stopCamera(); startCamera(); }} className="p-4 bg-slate-700 text-white rounded-2xl hover:bg-slate-600 transition-colors">
                    <RefreshCw className="w-6 h-6" />
                  </button>
                </div>
              </div>
            </div>
          )}

          {(status === AppStatus.READING || status === AppStatus.CONVERTING) && (
            <div className="flex flex-col items-center justify-center p-16 bg-white rounded-[3rem] shadow-2xl border border-slate-50 w-full max-w-2xl text-center">
              <div className="relative mb-8">
                <Loader2 className="w-20 h-20 text-indigo-500 animate-spin" />
                {ocrStatus && <ScanSearch className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-8 h-8 text-indigo-400 animate-bounce" />}
              </div>
              <h2 className="text-3xl font-black text-slate-900 mb-3 tracking-tight">{ocrStatus ? 'Performing OCR' : (status === AppStatus.READING ? 'Reading Files' : 'AI Processing')}</h2>
              <p className="text-slate-500 font-medium">{ocrStatus || (status === AppStatus.CONVERTING ? "Embedding assets and restructuring for AI attention." : "Scanning documents in your browser sandbox.")}</p>
            </div>
          )}

          {status === AppStatus.ERROR && (
            <div className="flex flex-col items-center justify-center p-16 bg-red-50 rounded-[3rem] border border-red-100 w-full max-w-2xl text-center">
              <AlertCircle className="w-12 h-12 text-red-500 mb-8" />
              <h2 className="text-3xl font-black text-red-900 mb-3">Failed</h2>
              <p className="text-red-700/80 font-semibold mb-10">{error}</p>
              <button onClick={reset} className="px-10 py-4 bg-red-600 text-white rounded-2xl font-black shadow-lg">Try Again</button>
            </div>
          )}

          {status === AppStatus.SUCCESS && result && (
            <div className="w-full flex flex-col xl:flex-row gap-10 items-start animate-in fade-in slide-in-from-bottom-10 duration-700">
              <div className="w-full xl:w-72 flex flex-col gap-6 xl:sticky xl:top-8">
                <div className="bg-white p-7 rounded-[2rem] shadow-xl border border-slate-100">
                  <div className="flex items-center gap-3 mb-6">
                    <div className="bg-green-100 p-2 rounded-xl"><CheckCircle className="w-5 h-5 text-green-600" /></div>
                    <h2 className="text-xl font-black text-slate-900 tracking-tight">Ready</h2>
                  </div>
                  <div className="space-y-4 mb-8">
                    <div className="flex justify-between items-center text-xs"><span className="text-slate-400 font-bold uppercase tracking-widest">Source</span><span className="font-bold text-slate-700 truncate max-w-[100px] text-right">{result.metadata.originalName}</span></div>
                    <div className="flex justify-between items-center text-xs"><span className="text-slate-400 font-bold uppercase tracking-widest">Context</span><span className="font-bold text-indigo-600">~{result.metadata.estimatedTokens.toLocaleString()} tokens</span></div>
                  </div>
                  <div className="flex flex-col gap-2.5">
                    <button onClick={() => { navigator.clipboard.writeText(result.markdown); alert("Copied!"); }} className="flex items-center justify-center gap-3 w-full py-3.5 px-4 bg-slate-900 text-white rounded-xl font-bold hover:bg-slate-800 transition-all text-sm"><Copy className="w-4 h-4" /> Copy Context</button>
                    <button onClick={() => { const blob = new Blob([result.markdown], { type: 'text/markdown' }); const url = URL.createObjectURL(blob); const a = document.createElement('a'); a.href = url; a.download = `${result.metadata.originalName.split('.')[0]}.md`; a.click(); URL.revokeObjectURL(url); }} className="flex items-center justify-center gap-3 w-full py-3.5 px-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm"><Download className="w-4 h-4" /> Save .MD</button>
                    <button onClick={handleDownloadHtml} className="flex items-center justify-center gap-3 w-full py-3.5 px-4 bg-white text-slate-700 border border-slate-200 rounded-xl font-bold hover:bg-slate-50 transition-all text-sm"><Globe className="w-4 h-4" /> Save .HTML</button>
                    <button onClick={handleDownloadPdf} className="flex items-center justify-center gap-3 w-full py-3.5 px-4 bg-indigo-600 text-white rounded-xl font-bold hover:bg-indigo-700 transition-all shadow-lg text-sm"><FileText className="w-4 h-4" /> Export PDF</button>
                    <button onClick={reset} className="mt-2 flex items-center justify-center gap-3 w-full py-2 text-slate-400 font-bold text-xs hover:text-red-500 transition-colors"><Trash2 className="w-4 h-4" /> New Conversion</button>
                  </div>
                </div>
              </div>

              <div className="flex-grow flex flex-col lg:flex-row gap-6 h-[80vh] w-full">
                <div className="flex-1 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col min-w-0">
                  <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <div className="flex items-center gap-2"><Code className="w-4 h-4 text-slate-400" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Markdown Source</span></div>
                  </div>
                  <div ref={markdownScrollRef} onScroll={() => handleScroll('markdown')} className="flex-grow overflow-y-auto custom-scrollbar p-0">
                    <SyntaxHighlighter language="markdown" style={oneLight} customStyle={{ padding: '2rem', fontSize: '0.875rem', backgroundColor: 'transparent', margin: 0 }}>{result.markdown}</SyntaxHighlighter>
                  </div>
                </div>

                <div className="flex-1 bg-white rounded-[2rem] shadow-2xl border border-slate-100 overflow-hidden flex flex-col min-w-0">
                  <div className="px-6 py-4 border-b border-slate-50 flex justify-between items-center bg-slate-50/30">
                    <div className="flex items-center gap-2"><Eye className="w-4 h-4 text-indigo-500" /><span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Live HTML Preview</span></div>
                    <div className="px-2 py-0.5 rounded-full bg-indigo-50 text-[9px] font-black text-indigo-600 uppercase">Synchronized</div>
                  </div>
                  <div ref={previewScrollRef} onScroll={() => handleScroll('preview')} className="flex-grow overflow-y-auto custom-scrollbar p-8">
                    <div className="prose-container max-w-none"><div dangerouslySetInnerHTML={{ __html: renderMarkdownToHtml(result.markdown) }} /></div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </main>
      </div>
      <style>{`
        .custom-scrollbar::-webkit-scrollbar { width: 5px; }
        .custom-scrollbar::-webkit-scrollbar-thumb { background: #e2e8f0; border-radius: 20px; }
        .preview-h1 { font-size: 2rem; font-weight: 800; color: #0f172a; margin-bottom: 1.5rem; border-bottom: 2px solid #f1f5f9; padding-bottom: 0.5rem; }
        .preview-h2 { font-size: 1.5rem; font-weight: 700; color: #1e293b; margin-top: 1.5rem; margin-bottom: 1rem; }
        .preview-h3 { font-size: 1.125rem; font-weight: 600; color: #334155; margin-top: 1.25rem; }
        .preview-p { margin-bottom: 1rem; color: #475569; line-height: 1.7; font-size: 0.95rem; }
        .preview-blockquote { border-left: 4px solid #6366f1; background: #f5f3ff; padding: 1rem 1.25rem; margin: 1.5rem 0; border-radius: 0 8px 8px 0; color: #4338ca; }
        .preview-img { max-width: 100%; height: auto; border-radius: 12px; margin: 1.5rem 0; box-shadow: 0 4px 12px -2px rgba(0,0,0,0.1); }
        .preview-ul { list-style-type: disc; margin-left: 1.5rem; margin-bottom: 1rem; }
        .preview-li { margin-bottom: 0.25rem; color: #475569; }
      `}</style>
    </div>
  );
};

export default App;
