'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { ClaimData } from './ClaimForm';
import { UploadedImage } from './ImageUploader';

interface DamageAssessmentProps {
  claimData: ClaimData;
  images: UploadedImage[];
  onContinue: (assessment: AssessmentResult) => void;
  onBack: () => void;
  mode: 'live' | 'simulated';
}

export interface DamageItem {
  area: string;
  type: string;
  severity: 'Minor' | 'Moderate' | 'Severe';
  estimatedCost: number;
  confidence: number;
}

export interface AssessmentResult {
  claimId: string;
  overallSeverity: 'None' | 'Minor' | 'Moderate' | 'Severe';
  hasDamage: boolean;
  damages: DamageItem[];
  totalEstimate: number;
  laborHours: number;
  partsRequired: string[];
  aiConfidence: number;
  recommendations: string[];
  processingTime: number;
  summary?: string;
  humanAssisted?: boolean;
  // Manual override data
  manualOverrides?: ManualOverride[];
  overrideNotes?: string;
}

export interface ManualOverride {
  damageIndex: number;
  originalCost: number;
  adjustedCost: number;
  reason: string;
}

interface DamageMarker {
  x: number; // percentage
  y: number; // percentage
  imageIndex: number;
  description?: string;
}

// Confidence threshold for requesting human input
const LOW_CONFIDENCE_THRESHOLD = 70;

// Supported image formats for Claude Vision API
const SUPPORTED_FORMATS = ['image/jpeg', 'image/png', 'image/gif', 'image/webp'];

// Convert image to a supported format using canvas
async function convertToSupportedFormat(file: File): Promise<{ blob: Blob; mediaType: string }> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      const canvas = document.createElement('canvas');
      canvas.width = img.naturalWidth;
      canvas.height = img.naturalHeight;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        reject(new Error('Failed to get canvas context'));
        return;
      }
      ctx.drawImage(img, 0, 0);
      canvas.toBlob(
        (blob) => {
          if (blob) {
            resolve({ blob, mediaType: 'image/jpeg' });
          } else {
            reject(new Error('Failed to convert image'));
          }
        },
        'image/jpeg',
        0.92
      );
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Failed to load image'));
    };

    img.src = url;
  });
}

// Convert file to base64, converting unsupported formats if needed
async function fileToBase64(file: File): Promise<{ base64: string; mediaType: string }> {
  let targetFile: Blob = file;
  let mediaType = file.type || 'image/jpeg';

  if (!SUPPORTED_FORMATS.includes(mediaType)) {
    console.log(`Converting ${mediaType} to JPEG for API compatibility`);
    const converted = await convertToSupportedFormat(file);
    targetFile = converted.blob;
    mediaType = converted.mediaType;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => {
      const result = reader.result as string;
      const base64 = result.split(',')[1];
      resolve({ base64, mediaType });
    };
    reader.onerror = reject;
    reader.readAsDataURL(targetFile);
  });
}

// Generate mock assessment with configurable parameters
function generateMockAssessment(
  claimData: ClaimData,
  imageCount: number,
  overrideConfidence?: number,
  overrideSeverity?: 'Minor' | 'Moderate' | 'Severe',
  hasDamageOverride?: boolean
): AssessmentResult {
  const damageTypes = [
    { area: 'Front Bumper', type: 'Dent', severity: 'Moderate' as const, baseCost: 450 },
    { area: 'Hood', type: 'Scratch', severity: 'Minor' as const, baseCost: 280 },
    { area: 'Front Left Fender', type: 'Crumple damage', severity: 'Severe' as const, baseCost: 1200 },
    { area: 'Headlight Assembly', type: 'Cracked lens', severity: 'Moderate' as const, baseCost: 650 },
    { area: 'Grille', type: 'Broken', severity: 'Minor' as const, baseCost: 180 },
  ];

  // If hasDamageOverride is false, return no damage
  if (hasDamageOverride === false) {
    return {
      claimId: `CLM-${Date.now().toString(36).toUpperCase()}`,
      hasDamage: false,
      overallSeverity: 'None',
      damages: [],
      totalEstimate: 0,
      laborHours: 0,
      partsRequired: [],
      aiConfidence: overrideConfidence ?? 85,
      recommendations: ['No visible damage detected', 'Consider requesting additional photos if damage was reported'],
      processingTime: 2.3,
      summary: '[Simulated] No damage detected in uploaded images',
    };
  }

  const numDamages = Math.min(Math.max(2, imageCount), damageTypes.length);
  let selectedDamages = damageTypes
    .sort(() => Math.random() - 0.5)
    .slice(0, numDamages)
    .map((d) => ({
      ...d,
      severity: overrideSeverity || d.severity,
      estimatedCost: d.baseCost + Math.floor(Math.random() * 200),
      confidence: overrideConfidence ?? (75 + Math.floor(Math.random() * 20)),
    }));

  // Apply severity override to all damages if provided
  if (overrideSeverity) {
    const costMultiplier = overrideSeverity === 'Severe' ? 1.5 : overrideSeverity === 'Minor' ? 0.6 : 1;
    selectedDamages = selectedDamages.map(d => ({
      ...d,
      severity: overrideSeverity,
      estimatedCost: Math.round(d.estimatedCost * costMultiplier),
    }));
  }

  const totalEstimate = selectedDamages.reduce((sum, d) => sum + d.estimatedCost, 0);
  const laborHours = Math.ceil(totalEstimate / 150);

  const overallSeverity = overrideSeverity ||
    (selectedDamages.some(d => d.severity === 'Severe') ? 'Severe' :
    selectedDamages.some(d => d.severity === 'Moderate') ? 'Moderate' : 'Minor');

  const partsRequired = selectedDamages
    .filter((d) => d.severity !== 'Minor')
    .map((d) => `${d.area} replacement/repair`);

  const avgConfidence = overrideConfidence ??
    Math.floor(selectedDamages.reduce((sum, d) => sum + d.confidence, 0) / selectedDamages.length);

  return {
    claimId: `CLM-${Date.now().toString(36).toUpperCase()}`,
    hasDamage: true,
    overallSeverity,
    damages: selectedDamages,
    totalEstimate: totalEstimate + laborHours * 85,
    laborHours,
    partsRequired,
    aiConfidence: avgConfidence,
    recommendations: [
      avgConfidence < LOW_CONFIDENCE_THRESHOLD
        ? 'Low confidence assessment - human review recommended'
        : overallSeverity === 'Severe'
        ? 'Recommend in-person inspection before authorization'
        : 'Damage consistent with reported incident',
      totalEstimate > 2000
        ? 'Estimate exceeds $2,000 threshold - senior adjuster review required'
        : 'Within standard authorization limits',
      'All repairs should be performed at certified body shop',
    ],
    processingTime: 2.3 + Math.random() * 1.5,
    summary: '[Simulated] Demo mode - using simulated assessment data',
  };
}

// Test Mode Controls Component
function TestModeControls({
  confidence,
  setConfidence,
  severity,
  setSeverity,
  hasDamage,
  setHasDamage,
}: {
  confidence: number;
  setConfidence: (v: number) => void;
  severity: 'Minor' | 'Moderate' | 'Severe';
  setSeverity: (v: 'Minor' | 'Moderate' | 'Severe') => void;
  hasDamage: boolean;
  setHasDamage: (v: boolean) => void;
}) {
  return (
    <div className="bg-amber-50 border border-amber-200 rounded-lg p-4 mb-6">
      <div className="flex items-center gap-2 mb-3">
        <span className="text-amber-600">🧪</span>
        <span className="font-medium text-amber-800">Test Mode Controls</span>
      </div>

      <div className="space-y-4">
        {/* Has Damage Toggle */}
        <div className="flex items-center justify-between">
          <label className="text-sm text-gray-700">Damage Detected</label>
          <button
            onClick={() => setHasDamage(!hasDamage)}
            className={`relative w-12 h-6 rounded-full transition-colors ${
              hasDamage ? 'bg-red-500' : 'bg-gray-300'
            }`}
          >
            <div
              className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                hasDamage ? 'translate-x-7' : 'translate-x-1'
              }`}
            />
          </button>
        </div>

        {hasDamage && (
          <>
            {/* Confidence Slider */}
            <div>
              <div className="flex justify-between text-sm mb-1">
                <label className="text-gray-700">AI Confidence</label>
                <span className={`font-medium ${confidence < LOW_CONFIDENCE_THRESHOLD ? 'text-amber-600' : 'text-green-600'}`}>
                  {confidence}%
                  {confidence < LOW_CONFIDENCE_THRESHOLD && ' (triggers human input)'}
                </span>
              </div>
              <input
                type="range"
                min="30"
                max="99"
                value={confidence}
                onChange={(e) => setConfidence(parseInt(e.target.value))}
                className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
              />
              <div className="flex justify-between text-xs text-gray-500 mt-1">
                <span>Low (30%)</span>
                <span className="text-amber-500">Threshold ({LOW_CONFIDENCE_THRESHOLD}%)</span>
                <span>High (99%)</span>
              </div>
            </div>

            {/* Severity Selector */}
            <div>
              <label className="text-sm text-gray-700 block mb-2">Damage Severity</label>
              <div className="flex gap-2">
                {(['Minor', 'Moderate', 'Severe'] as const).map((sev) => (
                  <button
                    key={sev}
                    onClick={() => setSeverity(sev)}
                    className={`flex-1 py-2 px-3 rounded-md text-sm font-medium transition-colors ${
                      severity === sev
                        ? sev === 'Minor'
                          ? 'bg-green-500 text-white'
                          : sev === 'Moderate'
                          ? 'bg-yellow-500 text-white'
                          : 'bg-red-500 text-white'
                        : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
                    }`}
                  >
                    {sev}
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
}

// Human Feedback Component - for marking damage on images
function HumanFeedbackRequest({
  images,
  markers,
  setMarkers,
  onSubmit,
  onSkip,
}: {
  images: UploadedImage[];
  markers: DamageMarker[];
  setMarkers: (markers: DamageMarker[]) => void;
  onSubmit: () => void;
  onSkip: () => void;
}) {
  const [selectedImageIndex, setSelectedImageIndex] = useState(0);
  const imageContainerRef = useRef<HTMLDivElement>(null);

  const handleImageClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!imageContainerRef.current) return;

    const rect = imageContainerRef.current.getBoundingClientRect();
    const x = ((e.clientX - rect.left) / rect.width) * 100;
    const y = ((e.clientY - rect.top) / rect.height) * 100;

    const newMarker: DamageMarker = {
      x,
      y,
      imageIndex: selectedImageIndex,
    };

    setMarkers([...markers, newMarker]);
  };

  const removeMarker = (index: number) => {
    setMarkers(markers.filter((_, i) => i !== index));
  };

  const currentImageMarkers = markers.filter((m) => m.imageIndex === selectedImageIndex);

  return (
    <div className="space-y-6">
      <div className="bg-amber-50 border border-amber-200 rounded-lg p-4">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-2xl">🔍</span>
          <h3 className="font-semibold text-amber-800">Human Input Requested</h3>
        </div>
        <p className="text-amber-700 text-sm">
          The AI assessment has low confidence. Please click on the image(s) to mark where you see damage.
          This will help improve the assessment accuracy.
        </p>
      </div>

      {/* Image Selector */}
      {images.length > 1 && (
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <button
              key={index}
              onClick={() => setSelectedImageIndex(index)}
              className={`relative flex-shrink-0 rounded-lg overflow-hidden border-2 transition-all ${
                selectedImageIndex === index ? 'border-blue-500' : 'border-transparent'
              }`}
            >
              <img
                src={img.preview}
                alt={`Photo ${index + 1}`}
                className="h-16 w-24 object-cover"
              />
              {markers.filter((m) => m.imageIndex === index).length > 0 && (
                <span className="absolute top-1 right-1 bg-red-500 text-white text-xs rounded-full w-5 h-5 flex items-center justify-center">
                  {markers.filter((m) => m.imageIndex === index).length}
                </span>
              )}
            </button>
          ))}
        </div>
      )}

      {/* Interactive Image */}
      <div
        ref={imageContainerRef}
        onClick={handleImageClick}
        className="relative cursor-crosshair rounded-lg overflow-hidden border-2 border-dashed border-gray-300 hover:border-blue-400 transition-colors"
      >
        <img
          src={images[selectedImageIndex].preview}
          alt="Click to mark damage"
          className="w-full max-h-96 object-contain bg-gray-100"
        />

        {/* Markers */}
        {currentImageMarkers.map((marker, index) => {
          const globalIndex = markers.findIndex(
            (m) => m.x === marker.x && m.y === marker.y && m.imageIndex === marker.imageIndex
          );
          return (
            <div
              key={index}
              className="absolute transform -translate-x-1/2 -translate-y-1/2 group"
              style={{ left: `${marker.x}%`, top: `${marker.y}%` }}
            >
              <div className="w-8 h-8 bg-red-500 rounded-full border-2 border-white shadow-lg flex items-center justify-center text-white text-sm font-bold animate-pulse">
                {globalIndex + 1}
              </div>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  removeMarker(globalIndex);
                }}
                className="absolute -top-1 -right-1 w-5 h-5 bg-gray-800 text-white rounded-full text-xs opacity-0 group-hover:opacity-100 transition-opacity"
              >
                ×
              </button>
            </div>
          );
        })}

        {/* Click instruction overlay */}
        {currentImageMarkers.length === 0 && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/20 pointer-events-none">
            <span className="bg-white/90 px-4 py-2 rounded-lg text-gray-700 text-sm font-medium">
              Click to mark damage locations
            </span>
          </div>
        )}
      </div>

      {/* Marker count */}
      <div className="text-sm text-gray-600">
        {markers.length > 0 ? (
          <span className="text-green-600 font-medium">
            ✓ {markers.length} damage location{markers.length !== 1 ? 's' : ''} marked
          </span>
        ) : (
          <span>No damage locations marked yet</span>
        )}
      </div>

      {/* Actions */}
      <div className="flex gap-4">
        <button
          onClick={onSkip}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          Skip (Use AI Assessment)
        </button>
        <button
          onClick={onSubmit}
          disabled={markers.length === 0}
          className={`flex-1 py-3 px-4 rounded-md font-medium transition-colors ${
            markers.length > 0
              ? 'bg-blue-600 text-white hover:bg-blue-700'
              : 'bg-gray-300 text-gray-500 cursor-not-allowed'
          }`}
        >
          Submit & Re-analyze ({markers.length} marker{markers.length !== 1 ? 's' : ''})
        </button>
      </div>
    </div>
  );
}

export default function DamageAssessment({ claimData, images, onContinue, onBack, mode }: DamageAssessmentProps) {
  const [isAnalyzing, setIsAnalyzing] = useState(false);
  const [progress, setProgress] = useState(0);
  const [statusMessage, setStatusMessage] = useState('Preparing images...');
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [error, setError] = useState<string | null>(null);

  // Human feedback state
  const [needsHumanInput, setNeedsHumanInput] = useState(false);
  const [damageMarkers, setDamageMarkers] = useState<DamageMarker[]>([]);

  // Manual override state
  const [overrideEnabled, setOverrideEnabled] = useState<Record<number, boolean>>({});
  const [adjustedCosts, setAdjustedCosts] = useState<Record<number, number>>({});
  const [overrideReasons, setOverrideReasons] = useState<Record<number, string>>({});
  const [overrideNotes, setOverrideNotes] = useState('');

  // Test mode controls
  const [testConfidence, setTestConfidence] = useState(85);
  const [testSeverity, setTestSeverity] = useState<'Minor' | 'Moderate' | 'Severe'>('Moderate');
  const [testHasDamage, setTestHasDamage] = useState(true);
  const [showTestControls, setShowTestControls] = useState(true);
  const [hasStartedAnalysis, setHasStartedAnalysis] = useState(false);

  const analyzeImages = useCallback(async (humanMarkers?: DamageMarker[]) => {
    const startTime = Date.now();
    setIsAnalyzing(true);
    setNeedsHumanInput(false);
    setProgress(0);

    // If in simulated mode, use mock data with test controls
    if (mode === 'simulated') {
      setStatusMessage('Running simulated analysis...');
      setProgress(30);

      await new Promise(resolve => setTimeout(resolve, 1500));
      setProgress(70);

      await new Promise(resolve => setTimeout(resolve, 800));
      setProgress(100);

      const mockResult = generateMockAssessment(
        claimData,
        images.length,
        testConfidence,
        testSeverity,
        testHasDamage
      );
      mockResult.processingTime = (Date.now() - startTime) / 1000;

      // If human markers were provided, boost confidence and mark as human-assisted
      if (humanMarkers && humanMarkers.length > 0) {
        mockResult.aiConfidence = Math.min(95, mockResult.aiConfidence + 15);
        mockResult.humanAssisted = true;
        mockResult.summary = `[Simulated] Human-assisted assessment with ${humanMarkers.length} marked location(s)`;
      }

      // Check if we need human input (low confidence and no markers provided yet)
      if (mockResult.aiConfidence < LOW_CONFIDENCE_THRESHOLD && !humanMarkers && mockResult.hasDamage) {
        setAssessment(mockResult);
        setNeedsHumanInput(true);
        setIsAnalyzing(false);
        return;
      }

      setAssessment(mockResult);
      setIsAnalyzing(false);
      return;
    }

    // Live mode - call the real API
    try {
      setStatusMessage('Converting images...');
      setProgress(10);

      const imageData = await Promise.all(
        images.map((img) => fileToBase64(img.file))
      );

      setStatusMessage('Sending to AI for analysis...');
      setProgress(30);

      // Include human markers in the request if provided
      const requestBody: Record<string, unknown> = {
        images: imageData,
        vehicleInfo: {
          make: claimData.vehicleMake,
          model: claimData.vehicleModel,
          year: claimData.vehicleYear,
        },
      };

      if (humanMarkers && humanMarkers.length > 0) {
        requestBody.humanMarkers = humanMarkers;
      }

      const response = await fetch('/api/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(requestBody),
      });

      setProgress(70);
      setStatusMessage('Processing AI response...');

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Analysis failed');
      }

      const result = await response.json();
      setProgress(90);

      const processingTime = (Date.now() - startTime) / 1000;

      const assessmentResult: AssessmentResult = {
        claimId: `CLM-${Date.now().toString(36).toUpperCase()}`,
        hasDamage: result.hasDamage,
        overallSeverity: result.overallSeverity || 'None',
        damages: result.damages || [],
        totalEstimate: result.totalEstimate || 0,
        laborHours: result.laborHours || 0,
        partsRequired: result.partsRequired || [],
        aiConfidence: result.aiConfidence || 0,
        recommendations: result.recommendations || [],
        processingTime,
        summary: result.summary,
        humanAssisted: humanMarkers && humanMarkers.length > 0,
      };

      setProgress(100);

      // Check if we need human input (low confidence and no markers provided yet)
      if (assessmentResult.aiConfidence < LOW_CONFIDENCE_THRESHOLD && !humanMarkers && assessmentResult.hasDamage) {
        setAssessment(assessmentResult);
        setNeedsHumanInput(true);
        setIsAnalyzing(false);
        return;
      }

      setAssessment(assessmentResult);
      setIsAnalyzing(false);

    } catch (err) {
      console.error('Analysis error:', err);
      setError(err instanceof Error ? err.message : 'Analysis failed');

      setStatusMessage('Falling back to simulated assessment...');
      setTimeout(() => {
        const mockResult = generateMockAssessment(claimData, images.length);
        mockResult.summary = `[API Error] ${err instanceof Error ? err.message : 'Unknown error'} - using simulated data`;
        setAssessment(mockResult);
        setIsAnalyzing(false);
      }, 1000);
    }
  }, [images, claimData, mode, testConfidence, testSeverity, testHasDamage]);

  const handleStartAnalysis = () => {
    setHasStartedAnalysis(true);
    setShowTestControls(false);
    analyzeImages();
  };

  const handleHumanFeedbackSubmit = () => {
    analyzeImages(damageMarkers);
  };

  const handleSkipHumanFeedback = () => {
    setNeedsHumanInput(false);
  };

  // Progress animation for visual feedback
  useEffect(() => {
    if (!isAnalyzing) return;

    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev < 25) return prev + 2;
        if (prev < 65) return prev + 0.5;
        if (prev < 85) return prev + 0.3;
        return prev;
      });
    }, 100);

    return () => clearInterval(interval);
  }, [isAnalyzing]);

  const severityColor = {
    None: 'bg-gray-100 text-gray-800',
    Minor: 'bg-green-100 text-green-800',
    Moderate: 'bg-yellow-100 text-yellow-800',
    Severe: 'bg-red-100 text-red-800',
  };

  // Confidence color helper
  const getConfidenceColor = (confidence: number) => {
    if (confidence >= 85) return 'text-green-600 bg-green-100';
    if (confidence >= 70) return 'text-blue-600 bg-blue-100';
    if (confidence >= 50) return 'text-amber-600 bg-amber-100';
    return 'text-red-600 bg-red-100';
  };

  // Calculate adjusted total
  const getAdjustedTotal = () => {
    if (!assessment) return 0;
    let total = 0;
    assessment.damages.forEach((damage, index) => {
      if (overrideEnabled[index] && adjustedCosts[index] !== undefined) {
        total += adjustedCosts[index];
      } else {
        total += damage.estimatedCost;
      }
    });
    return total + (assessment.laborHours * 85);
  };

  // Check if any overrides are active
  const hasActiveOverrides = Object.values(overrideEnabled).some(v => v);

  // Handle continue with override data
  const handleContinueWithOverrides = () => {
    if (!assessment) return;

    const manualOverrides: ManualOverride[] = [];
    assessment.damages.forEach((damage, index) => {
      if (overrideEnabled[index] && adjustedCosts[index] !== undefined) {
        manualOverrides.push({
          damageIndex: index,
          originalCost: damage.estimatedCost,
          adjustedCost: adjustedCosts[index],
          reason: overrideReasons[index] || 'Manual adjustment',
        });
      }
    });

    const updatedAssessment: AssessmentResult = {
      ...assessment,
      totalEstimate: getAdjustedTotal(),
      manualOverrides: manualOverrides.length > 0 ? manualOverrides : undefined,
      overrideNotes: overrideNotes.trim() || undefined,
    };

    onContinue(updatedAssessment);
  };

  // Initial state - show test controls (in test mode) and start button
  if (!hasStartedAnalysis && !isAnalyzing && !assessment) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Damage Assessment</h2>
          <p className="text-gray-700 text-sm">
            Ready to analyze {images.length} uploaded image{images.length !== 1 ? 's' : ''} for vehicle damage.
          </p>
        </div>

        {/* Test Mode Controls */}
        {mode === 'simulated' && showTestControls && (
          <TestModeControls
            confidence={testConfidence}
            setConfidence={setTestConfidence}
            severity={testSeverity}
            setSeverity={setTestSeverity}
            hasDamage={testHasDamage}
            setHasDamage={setTestHasDamage}
          />
        )}

        {/* Image Preview */}
        <div className="flex gap-2 overflow-x-auto pb-2">
          {images.map((img, index) => (
            <img
              key={index}
              src={img.preview}
              alt={`Upload ${index + 1}`}
              className="h-24 w-32 object-cover rounded-lg border"
            />
          ))}
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Back
          </button>
          <button
            onClick={handleStartAnalysis}
            className="flex-1 bg-blue-600 text-white py-3 px-4 rounded-md hover:bg-blue-700 transition-colors font-medium"
          >
            Start Analysis
          </button>
        </div>
      </div>
    );
  }

  // Analyzing state
  if (isAnalyzing) {
    return (
      <div className="text-center py-12">
        <div className="animate-pulse mb-6">
          <div className="text-6xl mb-4">🔍</div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">AI Analyzing Damage</h2>
          <p className="text-gray-700">Processing {images.length} image{images.length !== 1 ? 's' : ''}...</p>
        </div>
        <div className="max-w-md mx-auto">
          <div className="bg-gray-200 rounded-full h-3 mb-2">
            <div
              className="bg-blue-600 h-3 rounded-full transition-all duration-300"
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <p className="text-sm text-gray-700 mt-2">{statusMessage}</p>
          {error && (
            <p className="text-sm text-amber-600 mt-2">
              Note: {error}. Using fallback assessment.
            </p>
          )}
        </div>
      </div>
    );
  }

  // Human feedback request state
  if (needsHumanInput && assessment) {
    return (
      <HumanFeedbackRequest
        images={images}
        markers={damageMarkers}
        setMarkers={setDamageMarkers}
        onSubmit={handleHumanFeedbackSubmit}
        onSkip={handleSkipHumanFeedback}
      />
    );
  }

  if (!assessment) return null;

  // No damage detected view
  if (!assessment.hasDamage || assessment.damages.length === 0) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <div className="text-6xl mb-4">✅</div>
          <h2 className="text-2xl font-semibold text-green-700 mb-2">No Damage Detected</h2>
          <p className="text-gray-700 max-w-md mx-auto">
            {assessment.summary || 'The AI analysis did not identify any visible damage to the vehicle in the uploaded images.'}
          </p>
        </div>

        <div className="bg-green-50 border border-green-200 rounded-lg p-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <span className="text-green-600">🤖</span>
              <span className="font-medium text-gray-900">AI Confidence Score</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-24 bg-green-200 rounded-full h-2">
                <div
                  className="bg-green-600 h-2 rounded-full"
                  style={{ width: `${assessment.aiConfidence}%` }}
                />
              </div>
              <span className="font-semibold text-green-700">{assessment.aiConfidence}%</span>
            </div>
          </div>
          <p className="text-sm text-green-700 mt-1">
            Processed in {assessment.processingTime.toFixed(1)}s
          </p>
        </div>

        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-3">AI Recommendations</h3>
          <ul className="space-y-2">
            {assessment.recommendations.length > 0 ? (
              assessment.recommendations.map((rec, index) => (
                <li key={index} className="flex items-start gap-2 text-sm text-gray-800">
                  <span className="text-green-500">→</span>
                  <span>{rec}</span>
                </li>
              ))
            ) : (
              <>
                <li className="flex items-start gap-2 text-sm text-gray-800">
                  <span className="text-green-500">→</span>
                  <span>Vehicle appears to be in good condition</span>
                </li>
                <li className="flex items-start gap-2 text-sm text-gray-800">
                  <span className="text-green-500">→</span>
                  <span>Consider requesting additional photos if damage was reported</span>
                </li>
              </>
            )}
          </ul>
        </div>

        <div className="flex gap-4">
          <button
            onClick={onBack}
            className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
          >
            Upload Different Photos
          </button>
          <button
            onClick={() => onContinue(assessment)}
            className="flex-1 bg-green-600 text-white py-3 px-4 rounded-md hover:bg-green-700 transition-colors font-medium"
          >
            Proceed to Review
          </button>
        </div>
      </div>
    );
  }

  // Damage detected view
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-xl font-semibold text-gray-900">AI Damage Assessment</h2>
          <p className="text-gray-600 text-sm">Claim ID: {assessment.claimId}</p>
        </div>
        <div className="flex items-center gap-2">
          {assessment.humanAssisted && (
            <span className="px-2 py-1 rounded-full text-xs font-medium bg-blue-100 text-blue-800">
              Human Assisted
            </span>
          )}
          <div className={`px-3 py-1 rounded-full text-sm font-medium ${severityColor[assessment.overallSeverity]}`}>
            {assessment.overallSeverity} Damage
          </div>
        </div>
      </div>

      {/* Summary */}
      {assessment.summary && (
        <div className="bg-gray-50 border rounded-lg p-4">
          <p className="text-gray-800">{assessment.summary}</p>
        </div>
      )}

      {/* AI Confidence Banner */}
      <div className={`border rounded-lg p-4 ${
        assessment.aiConfidence < LOW_CONFIDENCE_THRESHOLD
          ? 'bg-amber-50 border-amber-200'
          : 'bg-blue-50 border-blue-200'
      }`}>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className={assessment.aiConfidence < LOW_CONFIDENCE_THRESHOLD ? 'text-amber-600' : 'text-blue-600'}>
              🤖
            </span>
            <span className="font-medium text-gray-900">AI Confidence Score</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-24 rounded-full h-2 ${
              assessment.aiConfidence < LOW_CONFIDENCE_THRESHOLD ? 'bg-amber-200' : 'bg-blue-200'
            }`}>
              <div
                className={`h-2 rounded-full ${
                  assessment.aiConfidence < LOW_CONFIDENCE_THRESHOLD ? 'bg-amber-500' : 'bg-blue-600'
                }`}
                style={{ width: `${assessment.aiConfidence}%` }}
              />
            </div>
            <span className={`font-semibold ${
              assessment.aiConfidence < LOW_CONFIDENCE_THRESHOLD ? 'text-amber-700' : 'text-blue-700'
            }`}>
              {assessment.aiConfidence}%
            </span>
          </div>
        </div>
        <p className={`text-sm mt-1 ${
          assessment.aiConfidence < LOW_CONFIDENCE_THRESHOLD ? 'text-amber-700' : 'text-blue-700'
        }`}>
          Processed in {assessment.processingTime.toFixed(1)}s • Based on {images.length} uploaded image{images.length !== 1 ? 's' : ''}
          {assessment.humanAssisted && ' • Enhanced with human input'}
        </p>
      </div>

      {/* Damage Breakdown with Confidence & Manual Override */}
      <div className="border rounded-lg overflow-hidden">
        <div className="bg-gray-50 px-4 py-3 border-b flex items-center justify-between">
          <h3 className="font-medium text-gray-900">Damage Breakdown</h3>
          <span className="text-xs text-gray-500">Click override to adjust costs</span>
        </div>
        <div className="divide-y">
          {assessment.damages.map((damage, index) => (
            <div key={index} className="px-4 py-4">
              {/* Main damage row */}
              <div className="flex items-start justify-between mb-2">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-1">
                    <p className="font-medium text-gray-900">{damage.area}</p>
                    <span className={`text-xs px-2 py-0.5 rounded ${severityColor[damage.severity]}`}>
                      {damage.severity}
                    </span>
                  </div>
                  <p className="text-sm text-gray-600">{damage.type}</p>

                  {/* Confidence indicator */}
                  <div className="flex items-center gap-2 mt-2">
                    <span className="text-xs text-gray-500">AI Confidence:</span>
                    <div className="flex items-center gap-1">
                      <div className="w-16 bg-gray-200 rounded-full h-1.5">
                        <div
                          className={`h-1.5 rounded-full ${
                            damage.confidence >= 85 ? 'bg-green-500' :
                            damage.confidence >= 70 ? 'bg-blue-500' :
                            damage.confidence >= 50 ? 'bg-amber-500' : 'bg-red-500'
                          }`}
                          style={{ width: `${damage.confidence}%` }}
                        />
                      </div>
                      <span className={`text-xs font-medium px-1.5 py-0.5 rounded ${getConfidenceColor(damage.confidence)}`}>
                        {damage.confidence}%
                      </span>
                    </div>
                  </div>
                </div>

                {/* Cost display */}
                <div className="text-right">
                  {overrideEnabled[index] ? (
                    <div className="space-y-1">
                      <p className="text-sm text-gray-400 line-through">${damage.estimatedCost.toLocaleString()}</p>
                      <p className="font-semibold text-orange-600">
                        ${(adjustedCosts[index] ?? damage.estimatedCost).toLocaleString()}
                      </p>
                    </div>
                  ) : (
                    <p className="font-semibold text-gray-900">${damage.estimatedCost.toLocaleString()}</p>
                  )}
                </div>
              </div>

              {/* Manual Override Toggle */}
              <div className="mt-3 pt-3 border-t border-dashed">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={overrideEnabled[index] || false}
                    onChange={(e) => {
                      setOverrideEnabled(prev => ({ ...prev, [index]: e.target.checked }));
                      if (e.target.checked && adjustedCosts[index] === undefined) {
                        setAdjustedCosts(prev => ({ ...prev, [index]: damage.estimatedCost }));
                      }
                    }}
                    className="w-4 h-4 text-orange-500 rounded border-gray-300 focus:ring-orange-500"
                  />
                  <span className="text-sm text-gray-700">Manual Override</span>
                </label>

                {/* Override inputs - shown when enabled */}
                {overrideEnabled[index] && (
                  <div className="mt-3 pl-6 space-y-3">
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Adjusted Cost ($)</label>
                      <input
                        type="number"
                        value={adjustedCosts[index] ?? damage.estimatedCost}
                        onChange={(e) => setAdjustedCosts(prev => ({
                          ...prev,
                          [index]: parseInt(e.target.value) || 0
                        }))}
                        className="w-32 px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                        min="0"
                      />
                    </div>
                    <div>
                      <label className="block text-xs text-gray-500 mb-1">Reason for adjustment</label>
                      <input
                        type="text"
                        value={overrideReasons[index] || ''}
                        onChange={(e) => setOverrideReasons(prev => ({ ...prev, [index]: e.target.value }))}
                        placeholder="e.g., Part price updated, Additional damage found..."
                        className="w-full px-3 py-1.5 text-sm border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent"
                      />
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}
          {assessment.laborHours > 0 && (
            <div className="px-4 py-3 flex items-center justify-between bg-gray-50">
              <div>
                <p className="font-medium text-gray-900">Labor</p>
                <p className="text-sm text-gray-600">{assessment.laborHours} hours @ $85/hr</p>
              </div>
              <p className="font-semibold text-gray-900">${(assessment.laborHours * 85).toLocaleString()}</p>
            </div>
          )}
        </div>
        <div className="px-4 py-4 bg-gray-100 flex justify-between items-center">
          <div>
            <span className="text-lg font-semibold text-gray-900">Total Estimate</span>
            {hasActiveOverrides && (
              <span className="ml-2 text-xs bg-orange-100 text-orange-700 px-2 py-0.5 rounded">
                Adjusted
              </span>
            )}
          </div>
          <div className="text-right">
            {hasActiveOverrides && (
              <p className="text-sm text-gray-400 line-through">${assessment.totalEstimate.toLocaleString()}</p>
            )}
            <span className={`text-2xl font-bold ${hasActiveOverrides ? 'text-orange-600' : 'text-blue-600'}`}>
              ${getAdjustedTotal().toLocaleString()}
            </span>
          </div>
        </div>
      </div>

      {/* Agent Override Notes - shown when any override is active */}
      {hasActiveOverrides && (
        <div className="border border-orange-200 bg-orange-50 rounded-lg p-4">
          <label className="block font-medium text-orange-800 mb-2">
            Agent Notes for Manual Adjustments
          </label>
          <textarea
            value={overrideNotes}
            onChange={(e) => setOverrideNotes(e.target.value)}
            placeholder="Explain the reasoning for manual cost adjustments..."
            rows={3}
            className="w-full px-3 py-2 text-sm border border-orange-300 rounded-md focus:outline-none focus:ring-2 focus:ring-orange-500 focus:border-transparent bg-white"
          />
          <p className="text-xs text-orange-600 mt-1">
            These notes will be attached to the assessment for audit purposes.
          </p>
        </div>
      )}

      {/* Recommendations */}
      <div className="border rounded-lg p-4">
        <h3 className="font-medium text-gray-900 mb-3">AI Recommendations</h3>
        <ul className="space-y-2">
          {assessment.recommendations.map((rec, index) => (
            <li key={index} className="flex items-start gap-2 text-sm text-gray-800">
              <span className="text-blue-500">→</span>
              <span>{rec}</span>
            </li>
          ))}
        </ul>
      </div>

      {/* Parts Required */}
      {assessment.partsRequired.length > 0 && (
        <div className="border rounded-lg p-4">
          <h3 className="font-medium text-gray-900 mb-2">Parts Required</h3>
          <div className="flex flex-wrap gap-2">
            {assessment.partsRequired.map((part, index) => (
              <span key={index} className="bg-gray-100 text-gray-800 px-3 py-1 rounded-full text-sm">
                {part}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex gap-4">
        <button
          onClick={onBack}
          className="flex-1 bg-gray-200 text-gray-700 py-3 px-4 rounded-md hover:bg-gray-300 transition-colors font-medium"
        >
          Back
        </button>
        <button
          onClick={handleContinueWithOverrides}
          className={`flex-1 py-3 px-4 rounded-md transition-colors font-medium ${
            hasActiveOverrides
              ? 'bg-orange-600 text-white hover:bg-orange-700'
              : 'bg-blue-600 text-white hover:bg-blue-700'
          }`}
        >
          {hasActiveOverrides ? 'Review with Adjustments' : 'Review & Approve'}
        </button>
      </div>
    </div>
  );
}
