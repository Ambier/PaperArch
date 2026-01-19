
import React, { useState, useCallback, useRef } from 'react';
import { ConferenceType, AppStep, PaperAnalysis, HistoryItem } from './types';
import { analyzePaper, generateDiagram, refineDiagram } from './services/geminiService';

/**
 * World-class Header Component
 */
const Header = ({ onReset }: { onReset: () => void }) => (
  <header className="bg-white/80 backdrop-blur-xl border-b border-slate-200 py-4 px-8 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center space-x-3 cursor-pointer group" onClick={onReset}>
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-100 group-hover:rotate-6 transition-transform">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M11 4a2 2 0 114 0v1a2 2 0 114 0v3a2 2 0 114 0v6a2 2 0 11-4 0V8a2 2 0 11-4 0V5a2 2 0 11-4 0v3a2 2 0 11-4 0v6a2 2 0 11-4 0V11a2 2 0 11-4 0V8a2 2 0 11-4 0V5a2 2 0 11-4 0v3a2 2 0 11-4 0v6a2 2 0 11-4 0V11a2 2 0 11-4 0V8a2 2 0 11-4 0V5a2 2 0 11-4 0v3a2 2 0 11-4 0v6a2 2 0 11-4 0V21a2 2 0 11-4 0v-6a2 2 0 114 0v3a2 2 0 114 0v6a2 2 0 11-4 0V8a2 2 0 11-4 0V5a2 2 0 11-4 0v3a2 2 0 11-4 0v6a2 2 0 11-4 0V11a2 2 0 11-4 0V8a2 2 0 11-4 0V5a2 2 0 11-4 0v3a2 2 0 11-4 0v6a2 2 0 11-4 0" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 tracking-tight">PaperArch <span className="text-indigo-600">Pro</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Advanced Research Workbench</p>
        </div>
      </div>
      <div className="flex items-center space-x-6">
        <div className="hidden lg:flex items-center space-x-2 px-3 py-1 bg-slate-50 border border-slate-100 rounded-full">
          <div className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></div>
          <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">NANO BANANA ACTIVE</span>
        </div>
        <button onClick={onReset} className="text-sm font-bold text-slate-500 hover:text-indigo-600 transition-colors">Reset</button>
      </div>
    </div>
  </header>
);

/**
 * Step Indicator with Navigation Control
 */
const StepIndicator = ({ step, canNavigate, onNavigate }: { step: AppStep, canNavigate: (s: AppStep) => boolean, onNavigate: (s: AppStep) => void }) => {
  const steps = [
    { id: AppStep.SETUP, label: 'Upload' },
    { id: AppStep.UNDERSTANDING, label: 'Logic' },
    { id: AppStep.GENERATION, label: 'Render' },
    { id: AppStep.REFINEMENT, label: 'Edit' },
  ];

  return (
    <div className="flex items-center justify-center space-x-6 py-10">
      {steps.map((s, idx) => {
        const isActive = step === s.id;
        const isDone = step > s.id;
        const available = canNavigate(s.id);

        return (
          <React.Fragment key={s.id}>
            <button
              onClick={() => available && onNavigate(s.id)}
              disabled={!available}
              className={`group flex flex-col items-center outline-none transition-opacity ${!available ? 'opacity-30 cursor-not-allowed' : 'opacity-100 cursor-pointer'}`}
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-110' :
                isDone ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
              } ${available && !isActive ? 'group-hover:bg-slate-200 group-hover:scale-105' : ''}`}>
                {idx + 1}
              </div>
              <span className={`mt-2 text-xs font-bold uppercase tracking-widest ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>
                {s.label}
              </span>
            </button>
            {idx < steps.length - 1 && (
              <div className={`h-[2px] w-12 rounded-full transition-colors ${isDone ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
            )}
          </React.Fragment>
        );
      })}
    </div>
  );
};

export default function App() {
  const [state, setState] = useState({
    step: AppStep.SETUP,
    loading: false,
    error: null as string | null,
    conference: ConferenceType.ACL,
    analysis: null as PaperAnalysis | null,
    currentImage: null as string | null,
    history: [] as HistoryItem[],
    refinementInput: ''
  });

  const abortControllerRef = useRef<AbortController | null>(null);

  const updateState = (diff: Partial<typeof state>) => setState(prev => ({ ...prev, ...diff }));

  const handleStop = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
      abortControllerRef.current = null;
    }
    updateState({ loading: false, error: 'Operation stopped by user.' });
  }, []);

  const onReset = useCallback(() => {
    handleStop();
    setState({
      step: AppStep.SETUP,
      loading: false,
      error: null,
      conference: ConferenceType.ACL,
      analysis: null,
      currentImage: null,
      history: [],
      refinementInput: ''
    });
  }, [handleStop]);

  const canNavigateTo = (target: AppStep): boolean => {
    if (state.loading) return false;
    if (target === AppStep.SETUP) return true;
    if (target === AppStep.UNDERSTANDING) return !!state.analysis;
    if (target === AppStep.GENERATION) return !!state.currentImage;
    if (target === AppStep.REFINEMENT) return state.history.length > 0;
    return false;
  };

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    
    abortControllerRef.current = new AbortController();
    updateState({ loading: true, error: null });
    
    try {
      const result = await analyzePaper(file, state.conference);
      // Check if aborted manually
      if (!abortControllerRef.current) return;
      updateState({ analysis: result, step: AppStep.UNDERSTANDING });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      updateState({ error: err.message || 'Analysis failed.' });
    } finally {
      updateState({ loading: false });
      abortControllerRef.current = null;
    }
  };

  const handleGenerate = async () => {
    if (!state.analysis) return;
    
    abortControllerRef.current = new AbortController();
    updateState({ loading: true, error: null });
    
    try {
      const img = await generateDiagram(state.analysis.architectureBlueprint);
      if (!abortControllerRef.current) return;
      updateState({ 
        currentImage: img, 
        step: AppStep.GENERATION,
        history: [{ prompt: 'Initial', imageUrl: img, timestamp: Date.now() }]
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      updateState({ error: err.message || 'Rendering failed.' });
    } finally {
      updateState({ loading: false });
      abortControllerRef.current = null;
    }
  };

  const handleRefine = async () => {
    if (!state.currentImage || !state.analysis || !state.refinementInput) return;
    
    abortControllerRef.current = new AbortController();
    updateState({ loading: true, error: null });
    
    try {
      const img = await refineDiagram(state.currentImage, state.refinementInput, state.analysis.architectureBlueprint);
      if (!abortControllerRef.current) return;
      updateState({ 
        currentImage: img, 
        history: [{ prompt: state.refinementInput, imageUrl: img, timestamp: Date.now() }, ...state.history],
        refinementInput: '',
        step: AppStep.REFINEMENT
      });
    } catch (err: any) {
      if (err.name === 'AbortError') return;
      updateState({ error: err.message || 'Refinement failed.' });
    } finally {
      updateState({ loading: false });
      abortControllerRef.current = null;
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <Header onReset={onReset} />
      
      <main className="max-w-5xl mx-auto px-6 pb-32">
        <StepIndicator 
          step={state.step} 
          canNavigate={canNavigateTo} 
          onNavigate={(s) => updateState({ step: s })} 
        />

        {state.error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 text-rose-700 rounded-2xl flex items-center justify-between font-bold animate-in slide-in-from-top-4">
            <div className="flex items-center">
               <svg className="w-5 h-5 mr-3 text-rose-400" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
               {state.error}
            </div>
            <button onClick={() => updateState({ error: null })} className="opacity-40 hover:opacity-100">&times;</button>
          </div>
        )}

        {/* Step 0: Setup */}
        {state.step === AppStep.SETUP && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center py-10 animate-in fade-in duration-700">
            <div className="space-y-10">
              <div className="space-y-4">
                <div className="inline-block px-3 py-1 bg-indigo-50 text-indigo-600 rounded-full text-[10px] font-black uppercase tracking-[0.2em]">Scientific Viz v4.0</div>
                <h2 className="text-5xl font-black text-slate-900 leading-[1.1]">Convert Methodology <br/> to <span className="text-indigo-600">Pure Architecture.</span></h2>
                <p className="text-slate-500 text-lg font-medium leading-relaxed">PaperArch uses Nano Banana for pixel-perfect academic schematics tailored for CCF-A conferences.</p>
              </div>

              <div className="space-y-4">
                <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target Venue Style</h4>
                <div className="grid grid-cols-4 gap-3">
                  {Object.values(ConferenceType).map(c => (
                    <button 
                      key={c}
                      onClick={() => updateState({ conference: c })}
                      className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${
                        state.conference === c ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200 hover:shadow-md'
                      }`}
                    >
                      {c}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <div className="relative group">
               <input type="file" onChange={handleFileUpload} disabled={state.loading} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
               <div className={`p-16 border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all ${
                 state.loading ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 group-hover:border-indigo-400 shadow-2xl shadow-slate-200/40'
               }`}>
                 {state.loading ? (
                    <div className="flex flex-col items-center">
                       <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                       <p className="text-lg font-black text-indigo-900">DECODING PAPER</p>
                       <p className="text-slate-400 font-medium text-sm mt-1">Generating visual strategy...</p>
                       <button 
                         onClick={(e) => { e.stopPropagation(); handleStop(); }}
                         className="mt-8 px-6 py-2 bg-rose-50 text-rose-600 text-xs font-black rounded-full hover:bg-rose-100 transition-colors"
                       >
                         CANCEL ANALYSIS
                       </button>
                    </div>
                 ) : (
                    <>
                       <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                       </div>
                       <p className="text-xl font-black text-slate-900">Upload PDF / Image</p>
                       <p className="text-slate-400 font-bold text-sm mt-2 text-center">We will identify the core components <br/> of your architecture.</p>
                    </>
                 )}
               </div>
            </div>
          </div>
        )}

        {/* Step 1: Understanding */}
        {state.step === AppStep.UNDERSTANDING && state.analysis && (
          <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-2xl shadow-slate-200/30 animate-in zoom-in-95">
             <div className="flex items-center justify-between mb-12">
                <div>
                   <h3 className="text-3xl font-black text-slate-900">{state.analysis.title}</h3>
                   <div className="flex items-center mt-3 space-x-3">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full">{state.conference} SPEC</span>
                      <span className="px-3 py-1 bg-slate-100 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">{state.analysis.layoutStrategy}</span>
                   </div>
                </div>
                {state.loading ? (
                   <button 
                    onClick={handleStop}
                    className="px-8 py-4 bg-slate-900 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl flex items-center hover:bg-rose-600 transition-colors"
                  >
                    STOP GENERATION
                    <div className="w-2 h-2 ml-3 bg-white rounded-full animate-pulse"></div>
                  </button>
                ) : (
                  <button 
                    onClick={handleGenerate}
                    className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-100 hover:bg-indigo-700 transition-all active:scale-95 flex items-center"
                  >
                    Neural Draw
                    <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                  </button>
                )}
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-12 gap-12">
                <div className="lg:col-span-7 space-y-8">
                   <div className="p-8 bg-slate-50 rounded-[2rem] border border-slate-100">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-4">Architecture Summary</h4>
                      <p className="text-slate-700 font-medium leading-relaxed text-lg">{state.analysis.summary}</p>
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Detected Modules</h4>
                      <div className="flex flex-wrap gap-2">
                        {state.analysis.keyComponents.map(k => (
                          <span key={k} className="px-5 py-2 bg-white border border-slate-200 text-slate-800 text-xs font-bold rounded-xl shadow-sm">{k}</span>
                        ))}
                      </div>
                   </div>
                </div>
                <div className="lg:col-span-5 bg-slate-900 rounded-[2.5rem] p-8 shadow-inner font-mono text-[11px] text-indigo-300 leading-relaxed overflow-y-auto max-h-[450px]">
                   <span className="text-slate-500 block mb-4 italic">// Visual Architect Blueprint Generated</span>
                   <div className="whitespace-pre-wrap">{state.analysis.architectureBlueprint}</div>
                </div>
             </div>
          </div>
        )}

        {/* Step 2 & 3: Generation & Refinement */}
        {(state.step === AppStep.GENERATION || state.step === AppStep.REFINEMENT) && state.currentImage && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8 duration-500">
             <div className="bg-white p-8 rounded-[3.5rem] shadow-2xl border border-slate-100 relative group">
                <div className="aspect-[4/3] bg-slate-50 rounded-[2.5rem] flex items-center justify-center overflow-hidden relative shadow-inner border border-slate-50">
                   <img src={state.currentImage} alt="Schematic" className={`max-h-full object-contain ${state.loading ? 'blur-2xl opacity-40' : 'opacity-100'} transition-all duration-700`} />
                   {state.loading && (
                      <div className="absolute inset-0 flex flex-col items-center justify-center bg-white/20 backdrop-blur-sm">
                         <div className="w-14 h-14 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                         <button 
                            onClick={handleStop}
                            className="px-8 py-3 bg-slate-900 text-white rounded-xl font-black text-xs uppercase tracking-widest hover:bg-rose-600 transition-all shadow-2xl"
                         >
                            STOP RENDERING
                         </button>
                      </div>
                   )}
                </div>
                <div className="absolute top-12 right-12 flex flex-col space-y-3 opacity-0 group-hover:opacity-100 transition-opacity">
                   <a href={state.currentImage} download={`Arch_${state.conference}.png`} className="p-4 bg-white/90 backdrop-blur shadow-xl rounded-2xl text-slate-700 hover:text-indigo-600 transition-all hover:scale-110">
                      <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                   </a>
                </div>
             </div>

             <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl border border-white/5 relative">
                <div className="absolute top-0 right-10 -translate-y-1/2 flex space-x-3">
                   {state.history.slice(0, 5).map((h, i) => (
                      <button 
                        key={h.timestamp} 
                        onClick={() => updateState({ currentImage: h.imageUrl, step: AppStep.REFINEMENT })}
                        disabled={state.loading}
                        className={`w-16 h-12 rounded-xl border-2 overflow-hidden transition-all shadow-xl hover:scale-105 ${state.currentImage === h.imageUrl ? 'border-indigo-500 scale-110' : 'border-white/20 opacity-60'}`}
                        title={h.prompt}
                      >
                         <img src={h.imageUrl} className="w-full h-full object-cover" />
                      </button>
                   ))}
                </div>
                
                <div className="flex flex-col md:flex-row items-center space-y-4 md:space-y-0 md:space-x-6">
                   <div className="flex-1 relative w-full">
                      <input 
                        type="text"
                        placeholder="Refine with natural language (e.g., 'Enlarge the Encoder block', 'Use pastel blue palette')"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-6 px-8 text-white font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/20 transition-all placeholder:text-slate-500"
                        value={state.refinementInput}
                        onChange={(e) => updateState({ refinementInput: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                        disabled={state.loading}
                      />
                   </div>
                   {state.loading ? (
                     <button 
                       onClick={handleStop}
                       className="w-full md:w-auto px-12 py-6 bg-rose-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-rose-700 transition-all active:scale-95 flex items-center justify-center"
                     >
                       STOPPING...
                     </button>
                   ) : (
                     <button 
                       onClick={handleRefine}
                       disabled={!state.refinementInput}
                       className="w-full md:w-auto px-12 py-6 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all disabled:opacity-50 active:scale-95"
                     >
                       Apply Logic
                     </button>
                   )}
                </div>
             </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-10 left-1/2 -translate-x-1/2 px-10 py-5 bg-slate-900 shadow-2xl rounded-full border border-white/10 flex items-center space-x-10 z-50">
         <div className="flex items-center space-x-3 border-r border-white/10 pr-10">
            <div className={`w-3 h-3 rounded-full ${state.loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.5)]'}`}></div>
            <span className="text-[10px] font-black text-white uppercase tracking-tighter">{state.loading ? 'Engine Busy' : 'System Ready'}</span>
         </div>
         <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black text-slate-500 uppercase tracking-widest">Venue</span>
            <span className="text-sm font-black text-indigo-400">{state.conference}</span>
         </div>
         <div className="h-4 w-px bg-white/10"></div>
         <div className="text-[10px] font-bold text-slate-500">© 2025 PaperArch OpenSource</div>
      </footer>
    </div>
  );
}
