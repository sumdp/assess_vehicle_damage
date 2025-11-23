'use client';

import { useState } from 'react';
import ClaimForm, { ClaimData } from '@/components/ClaimForm';
import ImageUploader, { UploadedImage } from '@/components/ImageUploader';
import DamageAssessment, { AssessmentResult } from '@/components/DamageAssessment';
import AgentReview, { FinalAssessment } from '@/components/AgentReview';
import ClaimConfirmation from '@/components/ClaimConfirmation';

type WorkflowStep = 'claim-form' | 'upload' | 'assessment' | 'review' | 'confirmation';
type AIMode = 'live' | 'simulated';

export default function Home() {
  const [currentStep, setCurrentStep] = useState<WorkflowStep>('claim-form');
  const [claimData, setClaimData] = useState<ClaimData | null>(null);
  const [images, setImages] = useState<UploadedImage[]>([]);
  const [assessment, setAssessment] = useState<AssessmentResult | null>(null);
  const [finalAssessment, setFinalAssessment] = useState<FinalAssessment | null>(null);
  const [aiMode, setAIMode] = useState<AIMode>('live');

  const steps: { key: WorkflowStep; label: string }[] = [
    { key: 'claim-form', label: 'Claim Info' },
    { key: 'upload', label: 'Upload Photos' },
    { key: 'assessment', label: 'AI Assessment' },
    { key: 'review', label: 'Review' },
    { key: 'confirmation', label: 'Complete' },
  ];

  const currentStepIndex = steps.findIndex((s) => s.key === currentStep);

  const handleClaimSubmit = (data: ClaimData) => {
    setClaimData(data);
    setCurrentStep('upload');
  };

  const handleImagesUploaded = (uploadedImages: UploadedImage[]) => {
    setImages(uploadedImages);
    setCurrentStep('assessment');
  };

  const handleAssessmentComplete = (result: AssessmentResult) => {
    setAssessment(result);
    setCurrentStep('review');
  };

  const handleApproval = (final: FinalAssessment) => {
    setFinalAssessment(final);
    setCurrentStep('confirmation');
  };

  const handleNewClaim = () => {
    // Clean up image previews
    images.forEach((img) => URL.revokeObjectURL(img.preview));

    // Reset all state
    setClaimData(null);
    setImages([]);
    setAssessment(null);
    setFinalAssessment(null);
    setCurrentStep('claim-form');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="text-2xl">🚗</div>
              <div>
                <h1 className="font-semibold text-lg">ClaimAssist AI</h1>
                <p className="text-sm text-gray-500">Intelligent Damage Assessment</p>
              </div>
            </div>
            {/* AI Mode Toggle */}
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-sm">
                <span className={aiMode === 'simulated' ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                  Test
                </span>
                <button
                  onClick={() => setAIMode(aiMode === 'live' ? 'simulated' : 'live')}
                  className={`relative w-12 h-6 rounded-full transition-colors ${
                    aiMode === 'live' ? 'bg-green-500' : 'bg-gray-300'
                  }`}
                  title={aiMode === 'live' ? 'Using Live AI API' : 'Using Simulated Responses'}
                >
                  <div
                    className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                      aiMode === 'live' ? 'translate-x-7' : 'translate-x-1'
                    }`}
                  />
                </button>
                <span className={aiMode === 'live' ? 'text-gray-900 font-medium' : 'text-gray-400'}>
                  Live
                </span>
              </div>
              {aiMode === 'simulated' && (
                <span className="text-xs bg-amber-100 text-amber-700 px-2 py-1 rounded">
                  Demo Mode
                </span>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Progress Steps */}
      <div className="bg-white border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            {steps.map((step, index) => (
              <div key={step.key} className="flex items-center">
                <div className="flex flex-col items-center">
                  <div
                    className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      index < currentStepIndex
                        ? 'bg-green-500 text-white'
                        : index === currentStepIndex
                        ? 'bg-blue-600 text-white'
                        : 'bg-gray-200 text-gray-500'
                    }`}
                  >
                    {index < currentStepIndex ? '✓' : index + 1}
                  </div>
                  <span
                    className={`text-xs mt-1 ${
                      index === currentStepIndex ? 'text-blue-600 font-medium' : 'text-gray-500'
                    }`}
                  >
                    {step.label}
                  </span>
                </div>
                {index < steps.length - 1 && (
                  <div
                    className={`w-12 md:w-24 h-0.5 mx-2 ${
                      index < currentStepIndex ? 'bg-green-500' : 'bg-gray-200'
                    }`}
                  />
                )}
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white rounded-lg shadow-sm border p-6">
          {currentStep === 'claim-form' && (
            <ClaimForm onSubmit={handleClaimSubmit} />
          )}

          {currentStep === 'upload' && (
            <ImageUploader
              onImagesUploaded={handleImagesUploaded}
              onBack={() => setCurrentStep('claim-form')}
            />
          )}

          {currentStep === 'assessment' && claimData && (
            <DamageAssessment
              claimData={claimData}
              images={images}
              onContinue={handleAssessmentComplete}
              onBack={() => setCurrentStep('upload')}
              mode={aiMode}
            />
          )}

          {currentStep === 'review' && claimData && assessment && (
            <AgentReview
              claimData={claimData}
              images={images}
              assessment={assessment}
              onApprove={handleApproval}
              onBack={() => setCurrentStep('assessment')}
            />
          )}

          {currentStep === 'confirmation' && claimData && finalAssessment && (
            <ClaimConfirmation
              claimData={claimData}
              finalAssessment={finalAssessment}
              onNewClaim={handleNewClaim}
            />
          )}
        </div>
      </main>

      {/* Footer */}
      <footer className="border-t bg-white mt-auto">
        <div className="max-w-4xl mx-auto px-4 py-4 text-center text-sm text-gray-500">
          ClaimAssist AI - Prototype Demo | AI-Powered Insurance Claims Assessment
        </div>
      </footer>
    </div>
  );
}
