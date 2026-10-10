import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Header from './components/Header';
import StepIndicator from './components/StepIndicator';
import StepClientRep from './components/StepClientRep';
import StepVariantSelection from './components/StepVariantSelection';
import StepUnitSnips from './components/StepUnitSnips';
import StepSnipUpload from './components/StepSnipUpload';
import StepReviewGenerate from './components/StepReviewGenerate';
import QuotationHistoryModal from './components/QuotationHistoryModal';
import PdfViewerModal from './components/PdfViewerModal';
import LoginPage from './components/LoginPage';
import { AlertCircle } from 'lucide-react';

const API_BASE = '/api';

const fallbackVariants = [
  {
    id: 'var-surabhi-ll-elite',
    name: 'SURABHI - LL ELITE',
    category: 'Premium Marine Interior',
    description: 'High-end Marine Ply BWR construction with frosty white carcass and solid laminate finish.',
    specs: {
      carcassMaterial: 'Marine Ply, BSL - BWR / Prelam Aqua Shield MDF-R',
      carcassFinish: 'Frosty White',
      shutterFinish: 'Laminate Solid Colors, Prelam Aqua Shield-MDF-Clr-BSL',
      hardware: 'Dual Switch EBCO, Tyrox Nickel Brush handles',
      warranty: '10 Years Warranty'
    },
    slideIndices: [7, 8, 9],
    isDefault: true
  },
  {
    id: 'var-capricoast-matte',
    name: 'CAPRICOAST MATTE',
    category: 'Ultra Matte Contemporary',
    description: 'Greenply BWP 710 Grade carcass with ultra-smooth matte laminate shutters and Ebco fittings.',
    specs: {
      carcassMaterial: 'GREENPLY BWP 710 Grade',
      carcassFinish: 'Frosty White / Grey Linum',
      shutterFinish: 'Matte Finish Laminate (Catch / New Mica)',
      hardware: 'EBCO Soft-Close Hinges, CNR Sliding Tracks, Hettich/Blum',
      warranty: '12 Years Warranty'
    },
    slideIndices: [10, 11, 12],
    isDefault: true
  },
  {
    id: 'var-capricost-glossy',
    name: 'CAPRICOST GLOSSY',
    category: 'High Gloss Elegance',
    description: 'High-density moisture-resistant boards with reflective high-gloss finish and precision edge-banding.',
    specs: {
      carcassMaterial: 'GREENPLY BWP 710 Grade',
      carcassFinish: 'Frosty White',
      shutterFinish: 'GLOSSY Finish Laminate (HGL)',
      hardware: 'EBCO 12kg Hinges, CNR 2-way track, BLUM/HETTICH',
      warranty: '12 Years Warranty'
    },
    slideIndices: [13, 14, 15],
    isDefault: false
  },
  {
    id: 'var-elegant-surabhi',
    name: 'ELEGANT SURABHI',
    category: 'Architectural Grade Luxury',
    description: 'BWP 710 Gurjan Ply with super matte 1mm branded laminate and Grade 1 soft-closing hardware.',
    specs: {
      carcassMaterial: 'GREENPLY BWP 710 Grade with both side Laminate',
      carcassFinish: 'Premium Frosty Linum',
      shutterFinish: 'SUPER Matte Finish Laminate - 1mm (Merino LAM SF)',
      hardware: 'HETTICH | EBCO Soft-Close, Anabond Hot Melt Bonding',
      warranty: '15 Years Warranty'
    },
    slideIndices: [16, 17, 18],
    isDefault: false
  },
  {
    id: 'var-4x-tuff-gloss',
    name: '4X TUFF GLOSS',
    category: 'Scratch & Stain Proof Signature',
    description: 'Engineered Merino MR+ / Royal Touche gloss shutters with anti-scratch and anti-stain shield.',
    specs: {
      carcassMaterial: 'GREENPLY BWP 710 Grade',
      carcassFinish: 'Frosty White Deluxe',
      shutterFinish: 'GLOSSY - SCRATCH & STAIN PROOF (Merino MR+)',
      hardware: 'Grade 1 Soft closing, HETTICH Kitchen Accessories',
      warranty: '15 Years Warranty'
    },
    slideIndices: [19, 20, 21],
    isDefault: false
  }
];

export default function App() {
  // Authentication State
  const [activeUser, setActiveUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cookscape_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  const [currentStep, setCurrentStep] = useState(1);
  const [variants, setVariants] = useState(fallbackVariants);
  const [quotations, setQuotations] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState({ isOpen: false, url: '', title: '' });

  // Form State
  const [clientInfo, setClientInfo] = useState({
    name: 'Mr. Aravindan',
    contact: '7418414780',
    location: 'Individual Villa Adyar',
    date: '10/10/2026'
  });

  const [repInfo, setRepInfo] = useState({
    name: 'Mr. Abishek',
    contact: '93611 84787',
    email: 'designs.cookscape@gmail.com'
  });

  const [selectedVariantIds, setSelectedVariantIds] = useState([
    'var-surabhi-ll-elite',
    'var-capricoast-matte'
  ]);

  const [snipFiles, setSnipFiles] = useState({});
  const [unitPages, setUnitPages] = useState([
    {
      id: 'unit-1',
      title: 'Unit 1 - Modular Kitchen',
      category: 'Modular Kitchen',
      notes: '',
      file: null,
      previewUrl: null
    }
  ]);
  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  // When active user changes, sync with repInfo
  useEffect(() => {
    if (activeUser) {
      setRepInfo({
        name: activeUser.name,
        contact: activeUser.contact,
        email: activeUser.email
      });
      localStorage.setItem('cookscape_active_user', JSON.stringify(activeUser));
    } else {
      localStorage.removeItem('cookscape_active_user');
    }
  }, [activeUser]);

  useEffect(() => {
    fetchHealth();
    fetchVariants();
    fetchQuotations();
  }, []);

  const fetchHealth = async () => {
    try {
      const res = await axios.get(`${API_BASE}/health`);
      if (res.data) {
        setIsPostgresConnected(res.data.postgresConnected);
      }
    } catch (e) {
      console.warn('Backend health check error:', e.message);
    }
  };

  const fetchVariants = async () => {
    try {
      const res = await axios.get(`${API_BASE}/variants`);
      if (res.data && res.data.data && res.data.data.length > 0) {
        setVariants(res.data.data);
      }
    } catch (e) {
      console.warn('Using default template variants fallback:', e.message);
    }
  };

  const fetchQuotations = async () => {
    try {
      const res = await axios.get(`${API_BASE}/quotations`);
      if (res.data && res.data.data) {
        setQuotations(res.data.data);
      }
    } catch (e) {
      console.warn('Quotations fetch failed:', e.message);
    }
  };

  const handleLogin = (user) => {
    setActiveUser(user);
  };

  const handleLogout = () => {
    setActiveUser(null);
  };

  const handleGenerate = async (engineType = 'node') => {
    setIsGenerating(true);
    setErrorMessage(null);
    setGenerationResult(null);

    try {
      const formData = new FormData();
      formData.append('clientInfo', JSON.stringify(clientInfo));
      formData.append('repInfo', JSON.stringify(repInfo));
      formData.append('selectedVariantIds', JSON.stringify(selectedVariantIds));
      formData.append('engineType', engineType);

      // Append snip images
      Object.entries(snipFiles).forEach(([variantId, file]) => {
        if (file) {
          formData.append(`snip_${variantId}`, file);
        }
      });

      // Append unit pages metadata & unit snip files
      formData.append('unitPagesMetadata', JSON.stringify(unitPages.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        notes: p.notes
      }))));

      unitPages.forEach(p => {
        if (p.file) {
          formData.append(`unit_snip_${p.id}`, p.file);
        }
      });

      const response = await axios.post(`${API_BASE}/generate-quote`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data && response.data.success) {
        const data = response.data.data;
        setGenerationResult(data);

        // Auto trigger browser download of the PPTX presentation
        const pptxUrl = data.pptxDownloadUrl || data.downloadUrl;
        const link = document.createElement('a');
        link.href = pptxUrl;
        link.download = data.pptxFileName || data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        fetchQuotations();

        return { success: true };
      } else {
        throw new Error(response.data.error || 'Failed to compile quotation.');
      }
    } catch (err) {
      console.error('Generation error:', err);
      const msg = err.response?.data?.error || err.message || 'An error occurred while generating exports.';
      setErrorMessage(msg);
      return { success: false, error: msg };
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    setGenerationResult(null);
    setCurrentStep(1);
  };

  // If not logged in, render LoginPage
  if (!activeUser) {
    return <LoginPage onLogin={handleLogin} />;
  }

  return (
    <div className="min-h-screen flex flex-col bg-slate-50 text-slate-800">
      
      {/* Top Header */}
      <Header
        onOpenHistory={() => setIsHistoryOpen(true)}
        historyCount={quotations.length}
        activeUser={activeUser}
        onLogout={handleLogout}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        
        {/* Step Wizard Breadcrumb */}
        <StepIndicator
          currentStep={currentStep}
          onSelectStep={(step) => {
            if (!isGenerating) setCurrentStep(step);
          }}
        />

        {/* Global Error Banner */}
        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-50 border border-rose-200 flex items-center justify-between text-rose-700 text-sm animate-fadeIn">
            <div className="flex items-center space-x-2">
              <AlertCircle className="w-5 h-5 shrink-0 text-rose-600" />
              <span>{errorMessage}</span>
            </div>
            <button
              onClick={() => setErrorMessage(null)}
              className="text-xs font-semibold px-2.5 py-1 rounded bg-rose-100 hover:bg-rose-200 text-rose-800"
            >
              Dismiss
            </button>
          </div>
        )}

        {/* Step Content */}
        {currentStep === 1 && (
          <StepClientRep
            clientInfo={clientInfo}
            setClientInfo={setClientInfo}
            repInfo={repInfo}
            setRepInfo={setRepInfo}
            onNext={() => setCurrentStep(2)}
          />
        )}

        {currentStep === 2 && (
          <StepVariantSelection
            variants={variants}
            selectedVariantIds={selectedVariantIds}
            setSelectedVariantIds={setSelectedVariantIds}
            onBack={() => setCurrentStep(1)}
            onNext={() => setCurrentStep(3)}
          />
        )}

        {currentStep === 3 && (
          <StepUnitSnips
            unitPages={unitPages}
            setUnitPages={setUnitPages}
            onBack={() => setCurrentStep(2)}
            onNext={() => setCurrentStep(4)}
          />
        )}

        {currentStep === 4 && (
          <StepSnipUpload
            variants={variants}
            selectedVariantIds={selectedVariantIds}
            snipFiles={snipFiles}
            setSnipFiles={setSnipFiles}
            onBack={() => setCurrentStep(3)}
            onNext={() => setCurrentStep(5)}
          />
        )}

        {currentStep === 5 && (
          <StepReviewGenerate
            clientInfo={clientInfo}
            repInfo={repInfo}
            variants={variants}
            selectedVariantIds={selectedVariantIds}
            snipFiles={snipFiles}
            unitPages={unitPages}
            onBack={() => setCurrentStep(4)}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            generationResult={generationResult}
            onReset={handleReset}
            onPreviewPdf={(url, title) => setPdfPreview({ isOpen: true, url, title })}
          />
        )}

      </main>

      {/* Upgraded Quotation Vault Modal */}
      <QuotationHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        quotations={quotations}
        onPreviewPdf={(url, title) => setPdfPreview({ isOpen: true, url, title })}
      />

      {/* Live PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={pdfPreview.isOpen}
        onClose={() => setPdfPreview({ ...pdfPreview, isOpen: false })}
        pdfUrl={pdfPreview.url}
        title={pdfPreview.title}
      />

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        <p>Cookscape Quotation Studio • Master Template Subtraction & Dual Export</p>
      </footer>

    </div>
  );
}
