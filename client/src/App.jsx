import React, { useState, useEffect, useMemo } from 'react';
import axios from 'axios';
import Header from './components/Header';
import StepIndicator from './components/StepIndicator';
import StepClientRep from './components/StepClientRep';
import StepVariantSelection from './components/StepVariantSelection';
import StepUnitSnips from './components/StepUnitSnips';
import StepSnipUpload from './components/StepSnipUpload';
import StepAccessoriesSnips from './components/StepAccessoriesSnips';
import StepReviewGenerate from './components/StepReviewGenerate';
import QuotationHistoryModal from './components/QuotationHistoryModal';
import PdfViewerModal from './components/PdfViewerModal';
import LoginPage from './components/LoginPage';
import UserManagementModal from './components/UserManagementModal';
import { AlertCircle, CheckCircle2, FileText, LogOut } from 'lucide-react';
import { usePwa } from './hooks/usePwa';
import { useAutosave } from './hooks/useAutosave';
import { getSyncDraft, saveSyncDraft, saveIndexedDBDraft, loadIndexedDBDraft, clearAllDrafts } from './utils/draftStorage';

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

const DEFAULT_CLIENT_INFO = {
  name: '',
  contact: '',
  location: '',
  date: ''
};

const DEFAULT_REP_INFO = {
  name: '',
  contact: '',
  email: ''
};

const DEFAULT_VARIANT_IDS = [
  'var-surabhi-ll-elite',
  'var-capricoast-matte'
];

const DEFAULT_UNIT_PAGES = [
  {
    id: 'unit-1',
    title: '',
    category: 'Modular Kitchen',
    notes: '',
    file: null,
    previewUrl: null
  }
];

const DEFAULT_ACCESSORY_PAGES = [
  {
    id: 'acc-1',
    title: '',
    category: 'Kitchen Hardware & Baskets',
    notes: '',
    file: null,
    previewUrl: null
  }
];

function getQuotationSignature(payload) {
  if (!payload) return '';
  return JSON.stringify({
    clientInfo: payload.clientInfo,
    repInfo: payload.repInfo,
    selectedVariantIds: payload.selectedVariantIds,
    unitPages: (payload.unitPages || []).map(p => ({
      id: p.id,
      variantId: p.variantId,
      title: p.title,
      category: p.category,
      notes: p.notes,
      fileName: p.file?.name,
      fileSize: p.file?.size,
      previewUrl: p.previewUrl,
      filePath: p.filePath
    })),
    accessoryPages: (payload.accessoryPages || []).map(a => ({
      id: a.id,
      title: a.title,
      category: a.category,
      notes: a.notes,
      fileName: a.file?.name,
      fileSize: a.file?.size,
      previewUrl: a.previewUrl,
      filePath: a.filePath
    })),
    snipFiles: Object.entries(payload.snipFiles || {}).reduce((acc, [vid, list]) => {
      acc[vid] = (Array.isArray(list) ? list : [list]).map(item => ({
        id: item?.id,
        title: item?.title,
        fileName: item?.file?.name,
        fileSize: item?.file?.size,
        previewUrl: item?.previewUrl,
        filePath: item?.filePath
      }));
      return acc;
    }, {})
  });
}

export default function App() {
  // PWA Support (Installation & Offline Status)
  const { isInstallable, isInstalled, isOnline, promptInstall } = usePwa();

  // 1. Read existing autosaved draft synchronously on load
  const initialDraft = useMemo(() => getSyncDraft(), []);
  const [draftBannerDismissed, setDraftBannerDismissed] = useState(false);

  // Authentication State
  const [activeUser, setActiveUser] = useState(() => {
    try {
      const saved = localStorage.getItem('cookscape_active_user');
      return saved ? JSON.parse(saved) : null;
    } catch (e) {
      return null;
    }
  });

  // 2. Initialize wizard state directly from saved draft if available
  const [currentStep, setCurrentStep] = useState(() => initialDraft?.currentStep || 1);
  const [variants, setVariants] = useState(fallbackVariants);
  const [quotations, setQuotations] = useState([]);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);
  const [pdfPreview, setPdfPreview] = useState({ isOpen: false, url: '', title: '' });

  // Form State initialized from autosaved draft!
  // Sanitize legacy draft values if they contain the old hardcoded sample data
  const [clientInfo, setClientInfo] = useState(() => {
    const draft = initialDraft?.clientInfo;
    if (draft && (draft.name === 'Dr. Siddharth & Meera Menon' || draft.name === 'Sample Client')) {
      return DEFAULT_CLIENT_INFO;
    }
    return draft || DEFAULT_CLIENT_INFO;
  });

  const [repInfo, setRepInfo] = useState(() => {
    const draft = initialDraft?.repInfo;
    const isSample = !draft?.name ||
      draft.name === 'Karthik Ramanathan' ||
      draft.name === 'Mr. Abishek' ||
      draft.name === 'Cookscape Representative';

    if (activeUser) {
      if (draft && !isSample && draft.name === activeUser.name) {
        return draft;
      }
      return {
        name: activeUser.name || activeUser.username || '',
        contact: activeUser.contactNumber || activeUser.contact || '',
        email: activeUser.email || ''
      };
    }
    if (isSample) return DEFAULT_REP_INFO;
    return draft || DEFAULT_REP_INFO;
  });

  const [selectedVariantIds, setSelectedVariantIds] = useState(() => initialDraft?.selectedVariantIds || DEFAULT_VARIANT_IDS);
  const [snipFiles, setSnipFiles] = useState(() => initialDraft?.snipFiles || {});
  const [unitPages, setUnitPages] = useState(() => (initialDraft?.unitPages && initialDraft.unitPages.length > 0) ? initialDraft.unitPages : DEFAULT_UNIT_PAGES);
  const [accessoryPages, setAccessoryPages] = useState(() => (initialDraft?.accessoryPages && initialDraft.accessoryPages.length > 0) ? initialDraft.accessoryPages : DEFAULT_ACCESSORY_PAGES);

  const [isGenerating, setIsGenerating] = useState(false);
  const [generationResult, setGenerationResult] = useState(null);
  const [lastGeneratedSnapshot, setLastGeneratedSnapshot] = useState(null);
  const [parentQuotation, setParentQuotation] = useState(null);
  const [errorMessage, setErrorMessage] = useState(null);

  const [isUserManagementOpen, setIsUserManagementOpen] = useState(false);
  const [isLogoutPromptOpen, setIsLogoutPromptOpen] = useState(false);
  const [successToast, setSuccessToast] = useState(null);

  // Re-hydrate any images or file attachments stored in IndexedDB on startup
  useEffect(() => {
    let isCancelled = false;
    loadIndexedDBDraft().then(fullDraft => {
      if (isCancelled || !fullDraft) return;

      if (Array.isArray(fullDraft.unitPages) && fullDraft.unitPages.some(p => p.file || p.previewUrl)) {
        setUnitPages(prev => fullDraft.unitPages.map((saved, idx) => {
          const existing = prev[idx] || {};
          return {
            ...existing,
            ...saved,
            file: saved.file || existing.file || null,
            previewUrl: saved.previewUrl || existing.previewUrl || null
          };
        }));
      }

      if (Array.isArray(fullDraft.accessoryPages) && fullDraft.accessoryPages.some(p => p.file || p.previewUrl)) {
        setAccessoryPages(prev => fullDraft.accessoryPages.map((saved, idx) => {
          const existing = prev[idx] || {};
          return {
            ...existing,
            ...saved,
            file: saved.file || existing.file || null,
            previewUrl: saved.previewUrl || existing.previewUrl || null
          };
        }));
      }

      if (fullDraft.snipFiles && typeof fullDraft.snipFiles === 'object' && Object.keys(fullDraft.snipFiles).length > 0) {
        setSnipFiles(fullDraft.snipFiles);
      }
    }).catch(err => {
      console.warn('Draft rehydration from IndexedDB skipped:', err);
    });

    return () => {
      isCancelled = true;
    };
  }, []);

  const handleStartFresh = () => {
    clearAllDrafts();
    setClientInfo(DEFAULT_CLIENT_INFO);
    setRepInfo({
      name: activeUser?.name || DEFAULT_REP_INFO.name,
      contact: activeUser?.contactNumber || DEFAULT_REP_INFO.contact,
      email: activeUser?.email || DEFAULT_REP_INFO.email
    });
    setSelectedVariantIds(DEFAULT_VARIANT_IDS);
    setUnitPages(DEFAULT_UNIT_PAGES);
    setAccessoryPages(DEFAULT_ACCESSORY_PAGES);
    setSnipFiles({});
    setGenerationResult(null);
    setLastGeneratedSnapshot(null);
    setParentQuotation(null);
    setCurrentStep(1);
    setDraftBannerDismissed(true);
    markAsSaved({
      currentStep: 1,
      clientInfo: DEFAULT_CLIENT_INFO,
      repInfo: DEFAULT_REP_INFO,
      selectedVariantIds: DEFAULT_VARIANT_IDS,
      unitPages: DEFAULT_UNIT_PAGES,
      accessoryPages: DEFAULT_ACCESSORY_PAGES,
      snipFiles: {}
    });
    showToast('Reset form to a fresh quotation.');
  };

  // Prepare serializable draft payload for autosave
  const currentDraftPayload = useMemo(() => ({
    currentStep,
    clientInfo,
    repInfo,
    selectedVariantIds,
    unitPages,
    accessoryPages,
    snipFiles
  }), [currentStep, clientInfo, repInfo, selectedVariantIds, unitPages, accessoryPages, snipFiles]);

  // Track whether any fields have changed since quotation was generated
  const currentSignature = useMemo(() => getQuotationSignature(currentDraftPayload), [currentDraftPayload]);

  const hasChangesSinceGeneration = useMemo(() => {
    if (!lastGeneratedSnapshot) return false;
    return currentSignature !== lastGeneratedSnapshot;
  }, [currentSignature, lastGeneratedSnapshot]);

  // Comprehensive autosave: triggers on edit (300ms debounce), tab switch, window blur, tab close, or 5s timer
  const { saveStatus, lastSavedAt, saveNow, markAsSaved } = useAutosave({
    data: currentDraftPayload,
    intervalMs: 5000,
    debounceMs: 300,
    enabled: !isGenerating,
    onSave: (draftData) => {
      saveSyncDraft(draftData);
      saveIndexedDBDraft(draftData);
    }
  });

  // When active user changes, sync with repInfo & fetch scoped quotations
  useEffect(() => {
    if (activeUser) {
      localStorage.setItem('cookscape_active_user', JSON.stringify(activeUser));
      fetchQuotations(activeUser);
      // Synchronize repInfo with activeUser
      setRepInfo(prev => {
        const isSampleOrEmpty = !prev?.name ||
          prev.name === 'Karthik Ramanathan' ||
          prev.name === 'Mr. Abishek' ||
          prev.name === 'Cookscape Representative';
        if (isSampleOrEmpty || prev.name !== activeUser.name) {
          return {
            name: activeUser.name || activeUser.username || '',
            contact: activeUser.contactNumber || activeUser.contact || '',
            email: activeUser.email || ''
          };
        }
        return prev;
      });
    } else {
      localStorage.removeItem('cookscape_active_user');
      setQuotations([]);
    }
  }, [activeUser]);

  useEffect(() => {
    fetchHealth();
    fetchVariants();
  }, []);

  const showToast = (message) => {
    setSuccessToast(message);
    setTimeout(() => setSuccessToast(null), 5000);
  };

  const fetchHealth = async () => {
    try {
      const res = await axios.get(`${API_BASE}/health`);
      if (res.data) {
        // Backend health verified
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

  const fetchQuotations = async (user = activeUser) => {
    try {
      const params = user ? { userId: user.id, role: user.role } : {};
      const res = await axios.get(`${API_BASE}/quotations`, { params });
      if (res.data && res.data.data) {
        setQuotations(res.data.data);
      }
    } catch (e) {
      console.warn('Quotations fetch failed:', e.message);
    }
  };

  const handleLogin = (user) => {
    setActiveUser(user);
    if (user) {
      // Immediately reflect logged-in user in Designer details
      setRepInfo({
        name: user.name || user.username || '',
        contact: user.contactNumber || user.contact || '',
        email: user.email || ''
      });
    }
    fetchQuotations(user);
  };

  const handleLogout = () => {
    setActiveUser(null);
    setRepInfo(DEFAULT_REP_INFO);
  };

  const handleUserUpdated = (updatedUser) => {
    if (activeUser && (activeUser.id === updatedUser.id || activeUser.username === updatedUser.username)) {
      const merged = { ...activeUser, ...updatedUser };
      setActiveUser(merged);
      localStorage.setItem('cookscape_active_user', JSON.stringify(merged));
      setRepInfo({
        name: merged.name || '',
        contact: merged.contactNumber || merged.contact || '',
        email: merged.email || ''
      });
      showToast(`User details for "${merged.name}" updated.`);
    }
  };

  // Re-edit a past generated quotation
  const handleReEditQuote = (quote) => {
    if (!quote) return;

    // 1. Restore client details
    const c = quote.clientInfo || quote.client || {};
    setClientInfo({
      name: c.name || '',
      contact: c.contactNumber || c.contact || '',
      location: c.location || '',
      email: c.email || '',
      date: c.date || (quote.date ? new Date(quote.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'))
    });

    // 2. Restore representative details
    if (quote.repInfo) {
      setRepInfo({
        name: quote.repInfo.name || (activeUser ? activeUser.name : ''),
        contact: quote.repInfo.contact || (activeUser ? activeUser.contactNumber : ''),
        email: quote.repInfo.email || (activeUser ? activeUser.email : '')
      });
    }

    // 3. Restore selected variants
    if (quote.selectedVariantIds && Array.isArray(quote.selectedVariantIds) && quote.selectedVariantIds.length > 0) {
      setSelectedVariantIds(quote.selectedVariantIds);
    } else if (quote.selectedVariants) {
      const vids = Array.isArray(quote.selectedVariants)
        ? quote.selectedVariants.map(v => (typeof v === 'string' ? v : v.id)).filter(Boolean)
        : [];
      if (vids.length > 0) setSelectedVariantIds(vids);
    }

    // 4. Restore Unit Pages
    if (quote.unitPagesMetadata && Array.isArray(quote.unitPagesMetadata) && quote.unitPagesMetadata.length > 0) {
      setUnitPages(quote.unitPagesMetadata.map((u, i) => ({
        id: u.id || `unit-${i + 1}`,
        variantId: u.variantId || 'all',
        title: u.title || `Unit ${i + 1}`,
        category: u.category || 'Modular Kitchen',
        notes: u.notes || '',
        file: null,
        previewUrl: u.previewUrl || null,
        filePath: u.filePath || null
      })));
    }

    // 5. Restore Accessory Pages
    if (quote.accessoryPagesMetadata && Array.isArray(quote.accessoryPagesMetadata) && quote.accessoryPagesMetadata.length > 0) {
      setAccessoryPages(quote.accessoryPagesMetadata.map((a, i) => ({
        id: a.id || `acc-${i + 1}`,
        title: a.title || `Accessory Page ${i + 1}`,
        category: a.category || 'Hardware Specifications',
        notes: a.notes || '',
        file: null,
        previewUrl: a.previewUrl || null,
        filePath: a.filePath || null
      })));
    }

    // 6. Restore Quotation Snip Files
    if (quote.snipsMetadata && typeof quote.snipsMetadata === 'object') {
      const restoredSnips = {};
      Object.entries(quote.snipsMetadata).forEach(([vid, items]) => {
        restoredSnips[vid] = (Array.isArray(items) ? items : [items]).map((item, idx) => ({
          id: item.id || `snip_${vid}_${idx + 1}`,
          title: item.title || (idx === 0 ? 'Main Quotation' : `Quotation Page ${idx + 1}`),
          file: null,
          previewUrl: typeof item === 'string' ? item : (item.previewUrl || null),
          filePath: item.filePath || null
        }));
      });
      setSnipFiles(restoredSnips);
    }

    // Reset generation state & set up for re-compilation
    setGenerationResult(null);
    setParentQuotation({
      quotationNumber: quote.quotationNumber,
      id: quote.id
    });
    setLastGeneratedSnapshot(getQuotationSignature({
      clientInfo: {
        name: c.name || '',
        contact: c.contactNumber || c.contact || '',
        location: c.location || '',
        email: c.email || '',
        date: c.date || (quote.date ? new Date(quote.date).toLocaleDateString('en-GB') : new Date().toLocaleDateString('en-GB'))
      },
      repInfo: quote.repInfo || DEFAULT_REP_INFO,
      selectedVariantIds: (quote.selectedVariantIds && quote.selectedVariantIds.length > 0)
        ? quote.selectedVariantIds
        : (quote.selectedVariants ? quote.selectedVariants.map(v => (typeof v === 'string' ? v : v.id)).filter(Boolean) : DEFAULT_VARIANT_IDS),
      unitPages: quote.unitPagesMetadata || DEFAULT_UNIT_PAGES,
      accessoryPages: quote.accessoryPagesMetadata || DEFAULT_ACCESSORY_PAGES,
      snipFiles: restoredSnips
    }));
    setCurrentStep(1);
    setIsHistoryOpen(false);

    showToast(`Quotation ${quote.quotationNumber} loaded for editing! Adjust details or snips and compile the new version.`);
  };

  // Admin delete quote
  const handleDeleteQuote = async (quoteId) => {
    try {
      const res = await axios.delete(`${API_BASE}/quotations/${quoteId}`, {
        params: { role: activeUser?.role }
      });
      if (res.data && res.data.success) {
        showToast('Quotation permanently removed from vault.');
        fetchQuotations(activeUser);
      }
    } catch (err) {
      console.error('Delete quotation error:', err);
      setErrorMessage('Failed to delete quotation: ' + (err.response?.data?.error || err.message));
    }
  };

  const handleGenerate = async (engineType = 'node') => {
    setIsGenerating(true);
    setErrorMessage(null);
    setGenerationResult(null);

    try {
      const cleanedClient = {
        ...clientInfo,
        name: (clientInfo.name || '').trim(),
        contact: (clientInfo.contact || '').trim(),
        email: (clientInfo.email || '').trim(),
        location: (clientInfo.location || '').trim(),
        date: (clientInfo.date || '').trim()
      };
      const cleanedRep = {
        ...repInfo,
        name: (repInfo.name || '').trim(),
        contact: (repInfo.contact || '').trim(),
        email: (repInfo.email || '').trim()
      };
      formData.append('clientInfo', JSON.stringify(cleanedClient));
      formData.append('repInfo', JSON.stringify(cleanedRep));
      formData.append('selectedVariantIds', JSON.stringify(selectedVariantIds));
      formData.append('engineType', engineType);
      if (activeUser) {
        formData.append('userId', activeUser.id);
        formData.append('userRole', activeUser.role);
        if (activeUser.bhId) {
          formData.append('bhId', activeUser.bhId);
          formData.append('bhName', activeUser.bhName || '');
        }
      }

      // Append snip images or preserve existing preview URLs on re-edit
      const existingSnips = {};
      const quotationPagesMetadata = {};

      Object.entries(snipFiles).forEach(([variantId, snipsOrFile]) => {
        if (Array.isArray(snipsOrFile)) {
          const filledItems = snipsOrFile.filter(item => item && (item.file || item.previewUrl || item instanceof File));
          filledItems.forEach((item, index) => {
            const file = item?.file || (item instanceof File ? item : null);
            if (file) {
              formData.append(`snip_${variantId}_${index}`, file);
            } else if (item?.previewUrl) {
              if (!existingSnips[variantId]) existingSnips[variantId] = [];
              existingSnips[variantId].push(item.previewUrl);
            }
          });

          if (filledItems.length > 0) {
            quotationPagesMetadata[variantId] = filledItems.map((item, idx) => ({
              id: item.id || `quote_page_${idx + 1}`,
              title: item.title || (idx === 0 ? 'Main Quotation' : `Quotation Page ${idx + 1}`),
              previewUrl: item.previewUrl || null,
              filePath: item.filePath || null
            }));
          }
        } else if (snipsOrFile) {
          const file = snipsOrFile?.file || (snipsOrFile instanceof File ? snipsOrFile : null);
          if (file) {
            formData.append(`snip_${variantId}_0`, file);
          } else if (snipsOrFile?.previewUrl) {
            if (!existingSnips[variantId]) existingSnips[variantId] = [];
            existingSnips[variantId].push(snipsOrFile.previewUrl);
          }
          quotationPagesMetadata[variantId] = [{
            id: snipsOrFile.id || 'quote_page_1',
            title: snipsOrFile.title || 'Main Quotation',
            previewUrl: snipsOrFile.previewUrl || null,
            filePath: snipsOrFile.filePath || null
          }];
        }
      });

      if (Object.keys(existingSnips).length > 0) {
        formData.append('existingSnips', JSON.stringify(existingSnips));
      }
      formData.append('quotationPagesMetadata', JSON.stringify(quotationPagesMetadata));

      // Append unit pages metadata & unit snip files
      formData.append('unitPagesMetadata', JSON.stringify(unitPages.map(p => ({
        id: p.id,
        variantId: p.variantId || 'all',
        title: p.title,
        category: p.category,
        notes: p.notes,
        previewUrl: p.previewUrl,
        filePath: p.filePath
      }))));

      unitPages.forEach(p => {
        if (p.file) {
          formData.append(`unit_snip_${p.id}`, p.file);
        }
      });

      // Append accessory pages metadata & accessory snip files
      formData.append('accessoryPagesMetadata', JSON.stringify(accessoryPages.map(p => ({
        id: p.id,
        title: p.title,
        category: p.category,
        notes: p.notes,
        previewUrl: p.previewUrl,
        filePath: p.filePath
      }))));

      accessoryPages.forEach(p => {
        if (p.file) {
          formData.append(`accessory_snip_${p.id}`, p.file);
        }
      });

      const response = await axios.post(`${API_BASE}/generate-quote`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      if (response.data && response.data.success) {
        const data = response.data.data;
        setGenerationResult(data);
        setParentQuotation({
          quotationNumber: data.quotationNumber,
          id: data.quotationId
        });
        setLastGeneratedSnapshot(getQuotationSignature(currentDraftPayload));

        // Auto trigger browser download of the PPTX presentation
        const pptxUrl = data.pptxDownloadUrl || data.downloadUrl;
        const link = document.createElement('a');
        link.href = pptxUrl;
        link.download = data.pptxFileName || data.fileName;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        fetchQuotations(activeUser);
        clearAllDrafts();

        showToast(`Quotation ${data.quotationNumber} compiled successfully with your latest changes!`);
        return { success: true };
      } else {
        throw new Error(response.data.error || 'Failed to compile quotation.');
      }
    } catch (err) {
      console.error('Generation error:', err);
      let msg = err.response?.data?.error;
      if (!msg) {
        if (err.code === 'ERR_NETWORK' || !err.response) {
          msg = 'Network connection error: Failed to reach backend at ' + API_BASE + '. Please ensure your network/internet is connected and the quotation server is active.';
        } else if (err.response?.status === 413) {
          msg = 'Upload payload too large. The uploaded snip images exceed server limits. Try optimizing image sizes.';
        } else {
          msg = err.message || 'An error occurred while generating exports.';
        }
      }
      setErrorMessage(msg);
      return { success: false, error: msg };
    } finally {
      setIsGenerating(false);
    }
  };

  const handleReset = () => {
    handleStartFresh();
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
        onLogout={() => setIsLogoutPromptOpen(true)}
        onOpenUserManagement={() => setIsUserManagementOpen(true)}
        isInstallable={isInstallable}
        isOnline={isOnline}
        onInstall={promptInstall}
        autosaveStatus={saveStatus}
        lastSavedAt={lastSavedAt}
        onSaveNow={saveNow}
      />

      {/* Main Container */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-3 sm:px-6 lg:px-8 py-4 sm:py-8 space-y-4 sm:space-y-6">
        
        {/* Step Wizard Breadcrumb */}
        <StepIndicator
          currentStep={currentStep}
          onSelectStep={(step) => {
            if (!isGenerating) setCurrentStep(step);
          }}
        />

        {/* Draft Restored Notification Banner */}
        {initialDraft && !draftBannerDismissed && (
          <div className="p-3 sm:p-4 rounded-xl bg-emerald-50 border border-emerald-300 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 text-emerald-950 text-sm animate-fadeIn shadow-xs">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-emerald-100 rounded-lg shrink-0">
                <FileText className="w-5 h-5 text-emerald-700" />
              </div>
              <div>
                <p className="font-bold text-emerald-950">
                  Autosaved draft restored automatically
                  {initialDraft.updatedAt && (
                    <span className="font-normal text-emerald-800 text-xs ml-2">
                      (Last saved {new Date(initialDraft.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })})
                    </span>
                  )}
                </p>
                <p className="text-xs text-emerald-800 mt-0.5">
                  Resumed previous quotation draft for &quot;{clientInfo?.name || 'Client'}&quot;.
                </p>
              </div>
            </div>
            <div className="flex items-center space-x-2 shrink-0 w-full sm:w-auto">
              <button
                type="button"
                onClick={handleStartFresh}
                className="flex-1 sm:flex-none px-3.5 py-1.5 rounded-lg bg-white hover:bg-emerald-100 border border-emerald-300 text-emerald-900 font-semibold text-xs cursor-pointer shadow-2xs transition-colors"
                title="Discard saved draft and start fresh"
              >
                Start Fresh
              </button>
              <button
                type="button"
                onClick={() => setDraftBannerDismissed(true)}
                className="px-3 py-1.5 text-emerald-700 hover:text-emerald-900 font-semibold text-xs cursor-pointer transition-colors"
              >
                Dismiss
              </button>
            </div>
          </div>
        )}

        {/* Success Toast */}
        {successToast && (
          <div className="p-4 rounded-xl bg-emerald-50 border border-emerald-200 flex items-center justify-between text-emerald-800 text-sm animate-fadeIn">
            <div className="flex items-center space-x-2">
              <CheckCircle2 className="w-5 h-5 shrink-0 text-emerald-600" />
              <span>{successToast}</span>
            </div>
            <button
              onClick={() => setSuccessToast(null)}
              className="text-xs font-semibold px-2.5 py-1 rounded bg-emerald-100 hover:bg-emerald-200 text-emerald-900 cursor-pointer"
            >
              Dismiss
            </button>
          </div>
        )}

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
            activeUser={activeUser}
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
            variants={variants}
            selectedVariantIds={selectedVariantIds}
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
          <StepAccessoriesSnips
            accessoryPages={accessoryPages}
            setAccessoryPages={setAccessoryPages}
            onBack={() => setCurrentStep(4)}
            onNext={() => setCurrentStep(6)}
          />
        )}

        {currentStep === 6 && (
          <StepReviewGenerate
            clientInfo={clientInfo}
            repInfo={repInfo}
            variants={variants}
            selectedVariantIds={selectedVariantIds}
            snipFiles={snipFiles}
            unitPages={unitPages}
            accessoryPages={accessoryPages}
            onBack={() => setCurrentStep(5)}
            onGenerate={handleGenerate}
            isGenerating={isGenerating}
            generationResult={generationResult}
            onReset={handleReset}
            onPreviewPdf={(url, title) => setPdfPreview({ isOpen: true, url, title })}
            hasChangesSinceGeneration={hasChangesSinceGeneration}
            parentQuotationNumber={parentQuotation?.quotationNumber}
            onEditStep={(step) => setCurrentStep(step)}
          />
        )}

      </main>

      {/* Upgraded Quotation Vault Modal */}
      <QuotationHistoryModal
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
        quotations={quotations}
        activeUser={activeUser}
        onReEdit={handleReEditQuote}
        onDelete={handleDeleteQuote}
        onPreviewPdf={(url, title) => setPdfPreview({ isOpen: true, url, title })}
      />

      {/* Admin User Management Modal */}
      <UserManagementModal
        isOpen={isUserManagementOpen}
        onClose={() => setIsUserManagementOpen(false)}
        activeUser={activeUser}
        onUserUpdated={handleUserUpdated}
      />

      {/* Live PDF Viewer Modal */}
      <PdfViewerModal
        isOpen={pdfPreview.isOpen}
        onClose={() => setPdfPreview({ ...pdfPreview, isOpen: false })}
        pdfUrl={pdfPreview.url}
        title={pdfPreview.title}
      />

      {/* Logout Confirmation Prompt Modal */}
      {isLogoutPromptOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-900/50 backdrop-blur-xs animate-fadeIn">
          <div className="bg-white w-full max-w-sm rounded-2xl border border-slate-200 shadow-2xl p-6 space-y-4">
            <div className="w-12 h-12 rounded-2xl bg-rose-100 text-rose-600 flex items-center justify-center mx-auto shadow-xs">
              <LogOut className="w-6 h-6" />
            </div>

            <div className="text-center space-y-1.5">
              <h3 className="text-lg font-bold text-slate-900 font-['Outfit']">Sign Out Confirmation</h3>
              <p className="text-xs text-slate-600">
                Are you sure you want to log out of your session as <strong className="text-slate-900">{activeUser?.name || activeUser?.username}</strong>?
              </p>
              <p className="text-[11px] text-emerald-800 bg-emerald-50 border border-emerald-200 rounded-lg py-1 px-2.5 mt-2 font-medium">
                ✓ Your draft quotation is automatically saved.
              </p>
            </div>

            <div className="flex items-center space-x-2.5 pt-2">
              <button
                type="button"
                onClick={() => setIsLogoutPromptOpen(false)}
                className="flex-1 px-4 py-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs transition-colors cursor-pointer"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={() => {
                  setIsLogoutPromptOpen(false);
                  handleLogout();
                }}
                className="flex-1 px-4 py-2.5 rounded-xl bg-rose-600 hover:bg-rose-700 text-white font-bold text-xs transition-colors shadow-sm shadow-rose-600/30 cursor-pointer"
              >
                Yes, Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Footer */}
      <footer className="border-t border-slate-200 py-6 text-center text-xs text-slate-500 bg-white">
        <p>Cookscape Quotation Studio • Master Template Subtraction & Dual Export</p>
      </footer>

    </div>
  );
}
