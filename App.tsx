
import React, { useState, useEffect } from 'react';
import { HashRouter as Router, Routes, Route, Link, useLocation } from 'react-router-dom';
import { Mode } from './types';
import SignToText from './components/SignToText';
import SpeechToSign from './components/SpeechToSign';
import Navigation from './components/Navigation';

const App: React.FC = () => {
  return (
    <Router>
      <div className="min-h-screen flex flex-col bg-slate-50">
        <header className="bg-white border-b border-slate-200 sticky top-0 z-50">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2">
                <div className="w-10 h-10 bg-indigo-600 rounded-xl flex items-center justify-center text-white">
                  <i className="fas fa-hands-asl-interpreting text-xl"></i>
                </div>
                <span className="text-xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 to-violet-600">
                  SignBridge AI
                </span>
              </div>
              <Navigation />
            </div>
          </div>
        </header>

        <main className="flex-1 max-w-7xl mx-auto w-full p-4 sm:p-6 lg:p-8">
          <Routes>
            <Route path="/" element={<SignToText />} />
            <Route path="/speech-to-sign" element={<SpeechToSign />} />
          </Routes>
        </main>

        <footer className="bg-white border-t border-slate-200 py-6">
          <div className="max-w-7xl mx-auto px-4 text-center text-slate-500 text-sm">
            Powered by Gemini 3 Flash & Live API. Bridging worlds through AI.
          </div>
        </footer>
      </div>
    </Router>
  );
};

export default App;
