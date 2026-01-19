
import React, { useState, useCallback } from 'react';
import { ConferenceType, AppStep, PaperAnalysis, HistoryItem } from './types';
import { analyzePaper, generateDiagram, refineDiagram } from './services/geminiService';

/** 
 * Modular components to keep the codebase maintainable 
 */

const Header = ({ onReset }: { onReset: () => void }) => (
  <header className="bg-white/80 backdrop-blur-md border-b border-slate-200 py-4 px-8 sticky top-0 z-50">
    <div className="max-w-7xl mx-auto flex items-center justify-between">
      <div className="flex items-center space-x-3 cursor-pointer group" onClick={onReset}>
        <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center shadow-lg shadow-indigo-200 group-hover:rotate-6 transition-transform">
          <svg className="w-6 h-6 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
          </svg>
        </div>
        <div>
          <h1 className="text-xl font-black text-slate-900 leading-tight">PaperArch <span className="text-indigo-600">Architect</span></h1>
          <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Open Source Research Workbench</p>
        </div>
      </div>
      <div className="flex items-center space-x-6 text-sm">
        <nav className="hidden md:flex items-center space-x-6">
          <a href="https://github.com" className="text-slate-500 hover:text-indigo-600 font-bold transition-colors">Docs</a>
          <a href="https://github.com" className="text-slate-500 hover:text-indigo-600 font-bold transition-colors">API</a>
        </nav>
        <div className="h-6 w-px bg-slate-200"></div>
        <button onClick={onReset} className="px-4 py-2 text-slate-600 hover:bg-slate-50 rounded-lg font-bold transition-all">New Project</button>
      </div>
    </div>
  </header>
);

const StepIndicator = ({ step, onNavigate }: { step: AppStep, onNavigate: (s: AppStep) => void }) => {
  const items = [
    { id: AppStep.SETUP, label: 'Setup' },
    { id: AppStep.UNDERSTANDING, label: 'Analyze' },
    { id: AppStep.GENERATION, label: 'Neural Draw' },
    { id: AppStep.REFINEMENT, label: 'Refine' },
  ];

  return (
    <div className="flex items-center justify-center space-x-6 py-12">
      {items.map((item, idx) => {
        const isActive = step === item.id;
        const isDone = step > item.id;
        return (
          <React.Fragment key={item.id}>
            <button 
              onClick={() => onNavigate(item.id)}
              className="flex flex-col items-center group outline-none"
            >
              <div className={`w-12 h-12 rounded-2xl flex items-center justify-center text-sm font-black transition-all ${
                isActive ? 'bg-indigo-600 text-white shadow-xl shadow-indigo-100 scale-110' : 
                isDone ? 'bg-indigo-50 text-indigo-600' : 'bg-slate-100 text-slate-400'
              }`}>
                {idx + 1}
              </div>
              <span className={`mt-2 text-xs font-bold ${isActive ? 'text-indigo-600' : 'text-slate-400'}`}>{item.label}</span>
            </button>
            {idx < items.length - 1 && (
              <div className={`h-[2px] w-12 rounded-full ${isDone ? 'bg-indigo-600' : 'bg-slate-200'}`}></div>
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

  const updateState = (diff: Partial<typeof state>) => setState(prev => ({ ...prev, ...diff }));

  const onReset = useCallback(() => {
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
  }, []);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    updateState({ loading: true, error: null });
    try {
      const result = await analyzePaper(file, state.conference);
      updateState({ analysis: result, step: AppStep.UNDERSTANDING });
    } catch (err: any) {
      updateState({ error: err.message });
    } finally {
      updateState({ loading: false });
    }
  };

  const handleGenerate = async () => {
    if (!state.analysis) return;
    updateState({ loading: true, error: null });
    try {
      const img = await generateDiagram(state.analysis.architectureBlueprint);
      updateState({ 
        currentImage: img, 
        step: AppStep.GENERATION,
        history: [{ prompt: 'Initial', imageUrl: img, timestamp: Date.now() }]
      });
    } catch (err: any) {
      updateState({ error: err.message });
    } finally {
      updateState({ loading: false });
    }
  };

  const handleRefine = async () => {
    if (!state.currentImage || !state.analysis || !state.refinementInput) return;
    updateState({ loading: true, error: null });
    try {
      const img = await refineDiagram(state.currentImage, state.refinementInput, state.analysis.architectureBlueprint);
      updateState({ 
        currentImage: img, 
        history: [{ prompt: state.refinementInput, imageUrl: img, timestamp: Date.now() }, ...state.history],
        refinementInput: ''
      });
    } catch (err: any) {
      updateState({ error: err.message });
    } finally {
      updateState({ loading: false });
    }
  };

  return (
    <div className="min-h-screen bg-[#FDFDFF]">
      <Header onReset={onReset} />
      
      <main className="max-w-6xl mx-auto px-8">
        <StepIndicator step={state.step} onNavigate={(s) => updateState({ step: s })} />

        {state.error && (
          <div className="mb-8 p-4 bg-rose-50 border border-rose-100 text-rose-600 rounded-2xl flex items-center justify-between font-bold animate-in slide-in-from-top-4">
            <div className="flex items-center">
               <svg className="w-5 h-5 mr-3" fill="currentColor" viewBox="0 0 20 20"><path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd"/></svg>
               {state.error}
            </div>
            <button onClick={() => updateState({ error: null })} className="opacity-60 hover:opacity-100">&times;</button>
          </div>
        )}

        {state.step === AppStep.SETUP && (
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 items-center pt-8 animate-in fade-in duration-700">
            <div className="space-y-8">
              <div className="space-y-4">
                <span className="text-indigo-600 font-black text-xs tracking-[0.3em] uppercase">Laboratory Mode</span>
                <h2 className="text-5xl font-black text-slate-900 leading-[1.1]">Design your next <br/> <span className="text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600">Architectural Masterpiece.</span></h2>
                <p className="text-slate-500 text-lg font-medium leading-relaxed max-w-lg">PaperArch bridges the gap between methodology text and professional schematics using specialized LLM chains.</p>
              </div>

              <div className="grid grid-cols-4 gap-3">
                {Object.values(ConferenceType).map(c => (
                  <button 
                    key={c}
                    onClick={() => updateState({ conference: c })}
                    className={`py-3 rounded-xl text-xs font-black transition-all border-2 ${
                      state.conference === c ? 'bg-indigo-600 border-indigo-600 text-white shadow-xl shadow-indigo-100' : 'bg-white border-slate-100 text-slate-400 hover:border-slate-200'
                    }`}
                  >
                    {c}
                  </button>
                ))}
              </div>
            </div>

            <div className="relative group">
               <input type="file" onChange={handleFileUpload} className="absolute inset-0 opacity-0 cursor-pointer z-10" />
               <div className={`p-16 border-2 border-dashed rounded-[3rem] flex flex-col items-center justify-center transition-all ${
                 state.loading ? 'bg-slate-50 border-slate-200' : 'bg-white border-slate-200 group-hover:border-indigo-400 shadow-2xl shadow-slate-200/50'
               }`}>
                 {state.loading ? (
                    <div className="flex flex-col items-center">
                       <div className="w-16 h-16 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin mb-6"></div>
                       <p className="text-lg font-black text-indigo-900">ARCHITECT ANALYZING</p>
                       <p className="text-slate-400 font-medium text-sm mt-1">Deep parsing logical structures...</p>
                    </div>
                 ) : (
                    <>
                       <div className="w-20 h-20 bg-indigo-50 text-indigo-600 rounded-3xl flex items-center justify-center mb-6 group-hover:scale-110 group-hover:rotate-3 transition-transform">
                          <svg className="w-10 h-10" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" /></svg>
                       </div>
                       <p className="text-xl font-black text-slate-900">Drop Paper Content</p>
                       <p className="text-slate-400 font-bold text-sm mt-2">Support PDF, Image or Plain Text</p>
                    </>
                 )}
               </div>
            </div>
          </div>
        )}

        {state.step === AppStep.UNDERSTANDING && state.analysis && (
          <div className="bg-white rounded-[3rem] p-12 border border-slate-100 shadow-2xl shadow-slate-200/50 animate-in zoom-in-95">
             <div className="flex items-center justify-between mb-12">
                <div>
                   <h3 className="text-3xl font-black text-slate-900">{state.analysis.title}</h3>
                   <div className="flex items-center mt-3 space-x-3">
                      <span className="px-3 py-1 bg-indigo-50 text-indigo-600 text-[10px] font-black uppercase tracking-widest rounded-full">{state.conference} Spec</span>
                      <span className="px-3 py-1 bg-slate-50 text-slate-500 text-[10px] font-black uppercase tracking-widest rounded-full">{state.analysis.layoutStrategy}</span>
                   </div>
                </div>
                <button 
                  onClick={handleGenerate}
                  disabled={state.loading}
                  className="px-8 py-4 bg-indigo-600 text-white rounded-2xl font-black text-sm uppercase tracking-widest shadow-xl shadow-indigo-200 hover:bg-indigo-700 transition-all flex items-center"
                >
                  {state.loading ? 'Rendering...' : 'Neural Render'}
                  <svg className="w-5 h-5 ml-3" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" /></svg>
                </button>
             </div>

             <div className="grid grid-cols-1 lg:grid-cols-2 gap-12">
                <div className="space-y-8">
                   <div className="p-6 bg-slate-50 rounded-3xl">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Executive Abstract</h4>
                      <p className="text-slate-600 font-medium leading-relaxed">{state.analysis.summary}</p>
                   </div>
                   <div className="space-y-4">
                      <h4 className="text-xs font-black text-slate-400 uppercase tracking-widest">Identified Nodes</h4>
                      <div className="flex flex-wrap gap-2">
                        {state.analysis.keyComponents.map(k => (
                          <span key={k} className="px-4 py-2 bg-white border border-slate-200 text-slate-700 text-xs font-bold rounded-xl shadow-sm">{k}</span>
                        ))}
                      </div>
                   </div>
                </div>
                <div className="bg-slate-900 rounded-[2rem] p-6 shadow-inner font-mono text-[11px] text-indigo-300 leading-relaxed overflow-y-auto max-h-[400px]">
                   <span className="text-slate-500 block mb-4">// Visual Blueprint Generated</span>
                   {state.analysis.architectureBlueprint}
                </div>
             </div>
          </div>
        )}

        {(state.step === AppStep.GENERATION || state.step === AppStep.REFINEMENT) && state.currentImage && (
          <div className="space-y-8 animate-in slide-in-from-bottom-8">
             <div className="bg-white p-6 rounded-[3rem] shadow-2xl border border-slate-100">
                <div className="aspect-[4/3] bg-slate-50 rounded-[2.5rem] flex items-center justify-center overflow-hidden relative shadow-inner">
                   <img src={state.currentImage} alt="Neural Schematic" className={`max-h-full object-contain ${state.loading ? 'blur-xl opacity-30' : 'opacity-100'} transition-all duration-700`} />
                   {state.loading && (
                      <div className="absolute inset-0 flex items-center justify-center bg-white/20">
                         <div className="w-12 h-12 border-4 border-indigo-600 border-t-transparent rounded-full animate-spin"></div>
                      </div>
                   )}
                </div>
             </div>

             <div className="bg-slate-900 p-10 rounded-[3rem] shadow-2xl relative">
                <div className="absolute top-0 right-10 -translate-y-1/2 flex space-x-3">
                   {state.history.slice(0, 4).map((h, i) => (
                      <button 
                        key={h.timestamp} 
                        onClick={() => updateState({ currentImage: h.imageUrl })}
                        className="w-16 h-12 rounded-xl border-2 border-white/20 overflow-hidden hover:border-indigo-400 transition-all shadow-xl"
                      >
                         <img src={h.imageUrl} className="w-full h-full object-cover" />
                      </button>
                   ))}
                </div>
                
                <div className="flex items-center space-x-6">
                   <div className="flex-1 relative">
                      <input 
                        type="text"
                        placeholder="Natural Language Refinement (e.g., 'Make the attention module wider', 'Change to pastel orange')"
                        className="w-full bg-white/5 border border-white/10 rounded-2xl py-5 px-8 text-white font-medium focus:outline-none focus:ring-2 focus:ring-indigo-500/30 transition-all"
                        value={state.refinementInput}
                        onChange={(e) => updateState({ refinementInput: e.target.value })}
                        onKeyDown={(e) => e.key === 'Enter' && handleRefine()}
                      />
                   </div>
                   <button 
                     onClick={handleRefine}
                     disabled={state.loading || !state.refinementInput}
                     className="px-10 py-5 bg-white text-slate-900 rounded-2xl font-black text-sm uppercase tracking-widest hover:bg-indigo-50 transition-all"
                   >
                     Apply Logic
                   </button>
                </div>
             </div>
          </div>
        )}
      </main>

      <footer className="fixed bottom-8 left-1/2 -translate-x-1/2 px-8 py-4 bg-white/80 backdrop-blur-xl border border-slate-200 rounded-full shadow-2xl flex items-center space-x-8 z-50">
         <div className="flex items-center space-x-3 border-r border-slate-200 pr-8">
            <div className={`w-3 h-3 rounded-full ${state.loading ? 'bg-amber-400 animate-pulse' : 'bg-emerald-500 shadow-[0_0_8px_rgba(16,185,129,0.4)]'}`}></div>
            <span className="text-xs font-black text-slate-900 tracking-tighter uppercase">{state.loading ? 'Engine Busy' : 'Neural Core Ready'}</span>
         </div>
         <div className="flex items-center space-x-2">
            <span className="text-[10px] font-black text-slate-400 uppercase tracking-widest">Target</span>
            <span className="text-sm font-black text-indigo-600">{state.conference}</span>
         </div>
         {state.currentImage && (
           <div className="pl-8 border-l border-slate-200">
              <a 
                href={state.currentImage} 
                download={`Schematic_${state.conference}.png`}
                className="flex items-center space-x-2 text-slate-900 hover:text-indigo-600 font-black text-xs uppercase transition-colors"
              >
                 <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a2 2 0 002 2h12a2 2 0 002-2v-1m-4-4l-4 4m0 0l-4-4m4 4V4" /></svg>
                 <span>Export PDF</span>
              </a>
           </div>
         )}
      </footer>
    </div>
  );
}
