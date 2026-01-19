
import React, { useState } from 'react';
import { ConferenceType, AppStep, PaperAnalysis, HistoryItem } from './types';
import { analyzePaper, generateDiagram, refineDiagram } from './services/geminiService';

// --- Sub-components ---

const StepIndicator: React.FC<{ 
  currentStep: AppStep, 
  onStepClick: (step: AppStep) => void,
  canNavigateTo: (step: AppStep) => boolean 
}> = ({ currentStep, onStepClick, canNavigateTo }) => {
  const steps = [
    { label: 'Setup', id: AppStep.SETUP },
    { label: 'Analyze', id: AppStep.UNDERSTANDING },
    { label: 'Generate', id: AppStep.GENERATION },
    { label: 'Refine', id: AppStep.REFINEMENT },
  ];

  return (
    <div className="flex items-center justify-center space-x-4 mb-8">
      {steps.map((s, idx) => {
        const isAccessible = canNavigateTo(s.id);
        const isActive = currentStep === s.id;
        const isCompleted = currentStep > s.id;

        return (
          <React.Fragment key={s.id}>
            <button 
              onClick={() => isAccessible && onStepClick(s.id)}
              disabled={!isAccessible}
              className={`flex flex-col items-center group transition-all outline-none ${!isAccessible ? 'cursor-not-allowed opacity-50' : 'cursor-pointer'}`}
            >
              <div className={`w-10 h-10 rounded-full flex items-center justify-center text-sm font-bold transition-all transform ${
                isActive 
                  ? 'bg-indigo-600 text-white scale-110 shadow-lg shadow-indigo-200' 
                  : isCompleted 
                    ? 'bg-indigo-100 text-indigo-600' 
                    : 'bg-gray-200 text-gray-500'
              } ${isAccessible && !isActive ? 'group-hover:bg-indigo-200 group-hover:scale-105' : ''}`}>
                {idx + 1}
              </div>
              <span className={`text-xs mt-1 font-medium transition-colors ${
                isActive ? 'text-indigo-600 font-bold' : isCompleted ? 'text-indigo-400' : 'text-gray-400'
              }`}>
                {s.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div className={`h-0.5 w-12 transition-colors ${currentStep > s.id ? 'bg-indigo-600' : 'bg-gray-200'}`} />
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function App() {
  const [step, setStep] = useState<AppStep>(AppStep.SETUP);
  const [conference, setConference] = useState<ConferenceType>(ConferenceType.ACL);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [analysis, setAnalysis] = useState<PaperAnalysis | null>(null);
  const [currentImage, setCurrentImage] = useState<string | null>(null);
  const [refinementInput, setRefinementInput] = useState('');
  const [history, setHistory] = useState<HistoryItem[]>([]);

  const canNavigateTo = (targetStep: AppStep): boolean => {
    if (loading) return false;
    if (targetStep === AppStep.SETUP) return true;
    if (targetStep === AppStep.UNDERSTANDING) return !!analysis;
    if (targetStep === AppStep.GENERATION) return !!currentImage;
    if (targetStep === AppStep.REFINEMENT) return !!currentImage && history.length > 0;
    return false;
  };

  const handleStepClick = (targetStep: AppStep) => {
    if (canNavigateTo(targetStep)) {
      setStep(targetStep);
      setError(null);
    }
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    setError(null);
    try {
      const result = await analyzePaper(file, conference);
      setAnalysis(result);
      setStep(AppStep.UNDERSTANDING);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to analyze paper.');
    } finally {
      setLoading(false);
    }
  };

  const handleGenerate = async () => {
    if (!analysis) return;
    setLoading(true);
    setError(null);
    try {
      const imageUrl = await generateDiagram(analysis.architectureBlueprint);
      setCurrentImage(imageUrl);
      setHistory([{ prompt: 'Initial Generation', imageUrl, timestamp: Date.now() }]);
      setStep(AppStep.GENERATION);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to generate diagram.');
    } finally {
      setLoading(false);
    }
  };

  const handleRefine = async () => {
    if (!currentImage || !refinementInput || !analysis) return;
    setLoading(true);
    setError(null);
    try {
      const newImageUrl = await refineDiagram(currentImage, refinementInput, analysis.architectureBlueprint);
      setCurrentImage(newImageUrl);
      setHistory(prev => [{ prompt: refinementInput, imageUrl: newImageUrl, timestamp: Date.now() }, ...prev]);
      setRefinementInput('');
      setStep(AppStep.REFINEMENT);
    } catch (err: any) {
      console.error(err);
      setError(err.message || 'Failed to refine diagram.');
    } finally {
      setLoading(false);
    }
  };

  const reset = () => {
    setStep(AppStep.SETUP);
    setAnalysis(null);
    setCurrentImage(null);
    setHistory([]);
    setError(null);
  };

  return (
    <div className="min-h-screen pb-20">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 py-4 px-6 mb-8 sticky top-0 z-10">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <div className="flex items-center space-x-2 cursor-pointer" onClick={reset}>
            <div className="w-8 h-8 bg-indigo-600 rounded-lg flex items-center justify-center">
              <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
              </svg>
            </div>
            <h1 className="text-xl font-bold text-gray-900 tracking-tight">PaperArch <span className="text-indigo-600">Architect</span></h1>
          </div>
          <div className="flex items-center space-x-4">
            <button onClick={reset} className="text-sm text-gray-500 hover:text-indigo-600 font-medium">Reset</button>
            <div className="h-6 w-px bg-gray-200"></div>
            <div className="text-xs text-gray-400 font-mono">GEMINI-3 PRO + NANO BANANA</div>
          </div>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-6">
        <StepIndicator 
          currentStep={step} 
          onStepClick={handleStepClick}
          canNavigateTo={canNavigateTo}
        />

        {error && (
          <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-xl mb-6 flex items-center justify-between shadow-sm">
            <div className="flex items-center">
              <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7 4a1 1 0 11-2 0 1 1 0 012 0zm-1-9a1 1 0 00-1 1v4a1 1 0 102 0V6a1 1 0 00-1-1z" clipRule="evenodd" /></svg>
              <span className="text-sm font-medium">{error}</span>
            </div>
            <button onClick={() => setError(null)} className="text-red-400 hover:text-red-600">
              <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" /></svg>
            </button>
          </div>
        )}

        {/* --- Step 0: Setup --- */}
        {step === AppStep.SETUP && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 step-transition">
            <div className="mb-8 text-center">
              <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-bold tracking-widest uppercase mb-4 border border-indigo-100">AI VISUAL ARCHITECT</div>
              <h2 className="text-3xl font-extrabold text-gray-900 mb-2">Transform Research into Visuals</h2>
              <p className="text-gray-500 max-w-md mx-auto">Upload your methodology section and let our AI Visual Architect design a professional schematic for you.</p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-700">1. Select Target Venue</label>
                <div className="grid grid-cols-3 gap-2">
                  {Object.values(ConferenceType).map((type) => (
                    <button
                      key={type}
                      onClick={() => setConference(type)}
                      className={`py-2 px-3 rounded-lg text-xs font-bold border transition-all ${
                        conference === type
                          ? 'bg-indigo-600 border-indigo-600 text-white shadow-md shadow-indigo-100 scale-105'
                          : 'bg-white border-gray-200 text-gray-600 hover:border-indigo-200'
                      }`}
                    >
                      {type}
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-4">
                <label className="block text-sm font-bold text-gray-700">2. Upload Paper Content</label>
                <div className="relative group">
                  <input
                    type="file"
                    accept="application/pdf,image/*"
                    onChange={handleFileUpload}
                    disabled={loading}
                    className="absolute inset-0 w-full h-full opacity-0 cursor-pointer z-10"
                  />
                  <div className={`border-2 border-dashed rounded-xl p-8 flex flex-col items-center justify-center transition-all ${
                    loading ? 'bg-gray-50 border-gray-200' : 'group-hover:bg-indigo-50 group-hover:border-indigo-300 border-gray-200 shadow-inner'
                  }`}>
                    {loading ? (
                      <div className="flex flex-col items-center">
                        <div className="w-10 h-10 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-4"></div>
                        <p className="text-sm text-indigo-600 font-bold">ARCHITECT ANALYZING...</p>
                        <p className="text-xs text-gray-400 mt-1 italic">Determining layout strategy...</p>
                      </div>
                    ) : (
                      <>
                        <div className="w-14 h-14 bg-indigo-50 rounded-2xl flex items-center justify-center mb-4 group-hover:rotate-6 transition-transform">
                          <svg className="w-7 h-7 text-indigo-600" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" /></svg>
                        </div>
                        <p className="text-sm font-bold text-gray-900 mb-1">Click or Drag PDF/Image</p>
                        <p className="text-[10px] text-gray-400 font-medium text-center">Methodology or Architecture pages yield best results.</p>
                      </>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* --- Step 1: Understanding --- */}
        {step === AppStep.UNDERSTANDING && analysis && (
          <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100 step-transition animate-in fade-in slide-in-from-bottom-4 duration-500">
            <div className="flex items-center justify-between mb-8 pb-6 border-b border-gray-50">
               <div>
                  <h2 className="text-2xl font-black text-gray-900 leading-tight">Architecture Decoded</h2>
                  <p className="text-sm text-gray-500 font-medium">Visual Architect strategy confirmed for {conference}.</p>
               </div>
               <div className="flex items-center space-x-2">
                  <div className="bg-green-50 text-green-700 text-[10px] font-bold px-3 py-1 rounded-full border border-green-100">READY TO DRAW</div>
               </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-12 gap-8">
              <div className="lg:col-span-7 space-y-6">
                <div>
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Paper Concept</h3>
                  <p className="text-xl font-bold text-gray-800 mb-2">{analysis.title}</p>
                  <p className="text-sm text-gray-600 leading-relaxed bg-gray-50 p-4 rounded-xl border border-gray-100">{analysis.summary}</p>
                </div>
                
                <div>
                   <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest mb-3">Selected Layout Strategy</h3>
                   <div className="flex items-center space-x-3 bg-indigo-50 p-4 rounded-xl border border-indigo-100">
                      <div className="w-10 h-10 bg-indigo-600 rounded-lg flex items-center justify-center shrink-0">
                         <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 5a1 1 0 011-1h14a1 1 0 011 1v2a1 1 0 01-1 1H5a1 1 0 01-1-1V5zM4 13a1 1 0 011-1h6a1 1 0 011 1v6a1 1 0 01-1 1H5a1 1 0 01-1-1v-6zM16 13a1 1 0 011-1h2a1 1 0 011 1v6a1 1 0 01-1 1h-2a1 1 0 01-1-1v-6z" /></svg>
                      </div>
                      <div>
                         <p className="text-sm font-black text-indigo-900">{analysis.layoutStrategy}</p>
                         <p className="text-xs text-indigo-600 opacity-80 font-medium">Optimized for scientific spatial reasoning.</p>
                      </div>
                   </div>
                </div>
              </div>
              
              <div className="lg:col-span-5 space-y-6">
                <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-800 shadow-xl">
                  <div className="bg-slate-800 px-4 py-2 flex items-center justify-between border-b border-slate-700">
                    <span className="text-[10px] font-bold text-slate-400 font-mono">GOLDEN_SCHEMA.md</span>
                    <div className="flex space-x-1">
                      <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                      <div className="w-2 h-2 rounded-full bg-slate-600"></div>
                    </div>
                  </div>
                  <div className="p-4 max-h-[250px] overflow-y-auto">
                    <pre className="text-[11px] text-green-400 font-mono leading-relaxed whitespace-pre-wrap selection:bg-green-900 selection:text-white">
                      {analysis.architectureBlueprint}
                    </pre>
                  </div>
                </div>

                <div className="space-y-3">
                  <h3 className="text-[10px] font-black text-gray-400 uppercase tracking-widest">Key Zones</h3>
                  <div className="flex flex-wrap gap-2">
                    {analysis.keyComponents.map((comp, idx) => (
                      <span key={idx} className="bg-white border border-gray-200 px-3 py-1 rounded-full text-[11px] font-bold text-gray-700 shadow-sm">
                        {comp}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            </div>

            <div className="mt-10 pt-8 border-t border-gray-100 flex justify-end">
              <button
                onClick={handleGenerate}
                disabled={loading}
                className={`px-10 py-4 bg-indigo-600 text-white rounded-xl font-black text-sm uppercase tracking-wider flex items-center shadow-2xl shadow-indigo-200 hover:bg-indigo-700 transition-all active:scale-95 ${
                  loading ? 'opacity-70 cursor-not-allowed' : ''
                }`}
              >
                {loading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin mr-3"></div>
                    Executing Blueprint...
                  </>
                ) : (
                  <>
                    Initialize Nano Banana Draw
                    <svg className="w-4 h-4 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" /></svg>
                  </>
                )}
              </button>
            </div>
          </div>
        )}

        {/* --- Step 2 & 3: Generation & Refinement --- */}
        {(step === AppStep.GENERATION || step === AppStep.REFINEMENT) && currentImage && (
          <div className="space-y-6 animate-in zoom-in-95 duration-500">
            <div className="bg-white p-4 rounded-[2rem] shadow-2xl border border-gray-100 overflow-hidden relative group">
              <div className="absolute top-6 right-6 flex space-x-3 opacity-0 group-hover:opacity-100 transition-all translate-y-2 group-hover:translate-y-0 z-10">
                <button 
                  onClick={() => window.open(currentImage, '_blank')}
                  className="p-3 bg-white/95 backdrop-blur rounded-xl shadow-xl border border-gray-100 text-gray-600 hover:text-indigo-600 transition-colors"
                  title="View Fullscreen"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" /></svg>
                </button>
                <a 
                  href={currentImage} 
                  download={`Arch_${conference}_${Date.now()}.png`}
                  className="p-3 bg-white/95 backdrop-blur rounded-xl shadow-xl border border-gray-100 text-gray-600 hover:text-indigo-600 transition-colors"
                  title="Download Schematic"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </a>
              </div>
              
              <div className="aspect-[4/3] bg-gray-50 rounded-[1.5rem] flex items-center justify-center overflow-hidden border border-gray-100 shadow-inner relative">
                <img 
                  src={currentImage} 
                  alt="Architecture Diagram" 
                  className={`max-w-full max-h-full object-contain ${loading ? 'opacity-30 blur-md' : 'opacity-100'} transition-all duration-700 ease-out`}
                />
                
                {loading && (
                  <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/40 backdrop-blur-[2px]">
                    <div className="relative">
                       <div className="w-16 h-16 border-4 border-indigo-100 rounded-full"></div>
                       <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin absolute top-0 left-0"></div>
                    </div>
                    <p className="mt-6 text-xl font-black text-indigo-900 tracking-tight">Refining Pixel Logic...</p>
                    <p className="text-sm text-indigo-600/60 font-medium">Applying architectural adjustments</p>
                  </div>
                )}
              </div>
            </div>

            {/* Refinement Interface */}
            <div className="bg-white p-8 rounded-2xl shadow-sm border border-gray-100">
              <div className="flex flex-col space-y-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <div className="w-10 h-10 bg-indigo-50 text-indigo-600 rounded-xl flex items-center justify-center">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" /></svg>
                    </div>
                    <div>
                      <h3 className="text-lg font-bold text-gray-900">Fine-tune Architecture</h3>
                      <p className="text-xs text-gray-500 font-medium">Instruct the AI to adjust specific visual components.</p>
                    </div>
                  </div>
                </div>
                
                <div className="relative group">
                  <textarea
                    rows={2}
                    placeholder="E.g., 'Increase the width of the Attention block', 'Make the arrows thicker', 'Change palette to Pastel Blue'..."
                    className="w-full bg-gray-50 border border-gray-200 rounded-2xl p-6 text-sm font-medium focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 outline-none transition-all disabled:opacity-50 placeholder:text-gray-400"
                    value={refinementInput}
                    onChange={(e) => setRefinementInput(e.target.value)}
                    disabled={loading}
                  />
                  <div className="absolute bottom-4 right-4 flex items-center space-x-2">
                    <button
                      onClick={handleRefine}
                      disabled={loading || !refinementInput.trim()}
                      className={`px-6 py-2 bg-indigo-600 text-white rounded-xl text-xs font-black uppercase tracking-widest shadow-lg shadow-indigo-100 hover:bg-indigo-700 transition-all disabled:opacity-50 disabled:bg-gray-400 disabled:shadow-none active:scale-95`}
                    >
                      Refine
                    </button>
                  </div>
                </div>
              </div>
            </div>

            {/* History Tracker */}
            {history.length > 1 && (
              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-gray-400 uppercase tracking-widest px-2">Architectural Iterations</h4>
                <div className="flex space-x-4 overflow-x-auto pb-4 scrollbar-hide px-2">
                  {history.map((item, idx) => (
                    <button
                      key={item.timestamp}
                      onClick={() => setCurrentImage(item.imageUrl)}
                      className={`flex-shrink-0 w-40 h-28 bg-white rounded-2xl border-2 overflow-hidden transition-all relative ${
                        currentImage === item.imageUrl 
                        ? 'border-indigo-600 ring-4 ring-indigo-500/10 scale-105 z-10' 
                        : 'border-gray-100 opacity-60 hover:opacity-100 hover:border-indigo-200'
                      }`}
                    >
                      <img src={item.imageUrl} alt="History" className="w-full h-full object-cover" />
                      <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/60 to-transparent p-2">
                         <p className="text-[8px] text-white font-bold truncate">{item.prompt}</p>
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* Persistent Status Bar */}
      <div className="fixed bottom-8 left-1/2 -translate-x-1/2 z-30">
        <div className="bg-slate-900/95 backdrop-blur-xl px-8 py-4 rounded-3xl shadow-2xl border border-white/10 flex items-center space-x-8">
          <div className="flex items-center space-x-3">
            <div className={`w-2.5 h-2.5 rounded-full ${loading ? 'bg-amber-400 animate-pulse shadow-[0_0_8px_rgba(251,191,36,0.6)]' : 'bg-green-500 shadow-[0_0_8px_rgba(34,197,94,0.6)]'}`}></div>
            <div className="flex flex-col">
              <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Architect Status</span>
              <span className="text-xs font-bold text-white tracking-tight">{loading ? 'Processing Physics...' : 'System Idle'}</span>
            </div>
          </div>
          
          <div className="h-8 w-px bg-slate-800"></div>
          
          <div className="flex flex-col">
            <span className="text-[9px] font-black text-slate-500 uppercase tracking-widest leading-none mb-1">Selected Venue</span>
            <span className="text-xs font-bold text-indigo-400 tracking-tight">{conference}</span>
          </div>

          {currentImage && (
            <>
              <div className="h-8 w-px bg-slate-800"></div>
              <button 
                onClick={() => {
                  const link = document.createElement('a');
                  link.href = currentImage;
                  link.download = `Schema_${conference}.png`;
                  link.click();
                }}
                className="flex items-center space-x-2 text-white hover:text-indigo-400 transition-colors"
              >
                <div className="bg-white/10 p-1.5 rounded-lg">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                </div>
                <span className="text-xs font-black uppercase tracking-wider">Export PDF/PNG</span>
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
