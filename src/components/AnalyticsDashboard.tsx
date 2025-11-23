'use client';

import { useState, useEffect } from 'react';
import { getFeedbackStats, FeedbackEntry } from '@/lib/feedbackLoop';

interface AnalyticsDashboardProps {
  onClose: () => void;
}

// Simulated aggregate stats - in production would come from a database
const mockStats = {
  // Time period
  period: 'Last 30 Days',

  // Volume metrics
  totalClaims: 1247,
  claimsThisWeek: 312,

  // Efficiency Metrics (5.1)
  avgProcessingTime: 2.7, // minutes (target < 3)
  baselineProcessingTime: 32, // minutes
  automationRate: 87, // % (target 85%)
  costPerClaimReduction: 63, // % (target 60%)

  // Accuracy Metrics (5.2)
  estimateAccuracy: 91, // % within ±15% of shop quote (target 90%)
  componentDetectionAccuracy: 96, // % precision (target 95%)
  agentOverrideRate: 12, // % requiring significant adjustment (target < 15%)

  // Business Impact (5.3)
  customerSatisfactionImprovement: 24, // % improvement (target +20%)
  claimsVolumeCapacityIncrease: 215, // % increase per agent (target +200%)

  // Human-AI Interaction Breakdown
  automatedProcessing: 84, // High confidence ≥85% (expected 85%)
  agentAssisted: 13, // Medium confidence 70-85% (expected 12%)
  manualEscalation: 3, // Low confidence <70% (expected 3%)

  // Override details
  overrideReasons: [
    { reason: 'Part price adjustment', count: 89, percent: 42 },
    { reason: 'Additional damage found', count: 51, percent: 24 },
    { reason: 'Severity reclassification', count: 38, percent: 18 },
    { reason: 'Labor hours adjustment', count: 34, percent: 16 },
  ],

  // Accuracy trend (last 6 weeks)
  accuracyTrend: [
    { week: 'W1', accuracy: 86 },
    { week: 'W2', accuracy: 88 },
    { week: 'W3', accuracy: 89 },
    { week: 'W4', accuracy: 90 },
    { week: 'W5', accuracy: 91 },
    { week: 'W6', accuracy: 91 },
  ],

  // Processing time trend
  processingTimeTrend: [
    { week: 'W1', time: 3.8 },
    { week: 'W2', time: 3.4 },
    { week: 'W3', time: 3.1 },
    { week: 'W4', time: 2.9 },
    { week: 'W5', time: 2.8 },
    { week: 'W6', time: 2.7 },
  ],
};

// Metric card component
function MetricCard({
  label,
  value,
  unit,
  target,
  baseline,
  isGood,
  description
}: {
  label: string;
  value: number | string;
  unit?: string;
  target?: string;
  baseline?: string;
  isGood?: boolean;
  description?: string;
}) {
  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="text-xs text-gray-500 uppercase tracking-wide mb-1">{label}</div>
      <div className="flex items-baseline gap-1">
        <span className={`text-2xl font-bold ${isGood ? 'text-green-600' : 'text-gray-900'}`}>
          {value}
        </span>
        {unit && <span className="text-gray-500 text-sm">{unit}</span>}
      </div>
      {target && (
        <div className="text-xs text-gray-500 mt-1">
          Target: {target}
          {isGood && <span className="text-green-600 ml-1">✓</span>}
        </div>
      )}
      {baseline && (
        <div className="text-xs text-gray-400">
          Baseline: {baseline}
        </div>
      )}
      {description && (
        <div className="text-xs text-gray-500 mt-1">{description}</div>
      )}
    </div>
  );
}

// Progress bar component
function ProgressBar({ value, max = 100, color = 'blue' }: { value: number; max?: number; color?: string }) {
  const colorClasses: Record<string, string> = {
    blue: 'bg-blue-500',
    green: 'bg-green-500',
    amber: 'bg-amber-500',
    red: 'bg-red-500',
    indigo: 'bg-indigo-500',
  };

  return (
    <div className="w-full bg-gray-200 rounded-full h-2">
      <div
        className={`h-2 rounded-full ${colorClasses[color]}`}
        style={{ width: `${Math.min((value / max) * 100, 100)}%` }}
      />
    </div>
  );
}

// Simple bar chart for trends
function TrendChart({ data, dataKey, label, target }: {
  data: Array<{ week: string; [key: string]: number | string }>;
  dataKey: string;
  label: string;
  target?: number;
}) {
  const values = data.map(d => Number(d[dataKey]));
  const max = Math.max(...values) * 1.2;

  return (
    <div className="bg-white rounded-lg border p-4">
      <div className="text-sm font-medium text-gray-900 mb-3">{label}</div>
      <div className="flex items-end gap-2 h-24">
        {data.map((item, index) => (
          <div key={index} className="flex-1 flex flex-col items-center gap-1">
            <div className="w-full bg-gray-100 rounded-t relative" style={{ height: '80px' }}>
              <div
                className="absolute bottom-0 w-full bg-indigo-500 rounded-t transition-all"
                style={{ height: `${(Number(item[dataKey]) / max) * 100}%` }}
              />
              {target && (
                <div
                  className="absolute w-full border-t-2 border-dashed border-green-500"
                  style={{ bottom: `${(target / max) * 100}%` }}
                />
              )}
            </div>
            <span className="text-xs text-gray-500">{item.week}</span>
          </div>
        ))}
      </div>
      {target && (
        <div className="flex items-center gap-2 mt-2 text-xs text-gray-500">
          <div className="w-4 border-t-2 border-dashed border-green-500" />
          <span>Target</span>
        </div>
      )}
    </div>
  );
}

export default function AnalyticsDashboard({ onClose }: AnalyticsDashboardProps) {
  const [activeTab, setActiveTab] = useState<'overview' | 'accuracy' | 'workflow' | 'feedback'>('overview');
  const [feedbackStats, setFeedbackStats] = useState<ReturnType<typeof getFeedbackStats> | null>(null);

  // Load feedback stats on mount and when tab changes
  useEffect(() => {
    if (activeTab === 'feedback') {
      setFeedbackStats(getFeedbackStats());
    }
  }, [activeTab]);

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <div className="bg-gray-50 rounded-xl shadow-2xl w-full max-w-5xl max-h-[90vh] overflow-hidden flex flex-col">
        {/* Header */}
        <div className="bg-slate-800 text-white px-6 py-4 flex items-center justify-between">
          <div>
            <h2 className="text-xl font-semibold">AI Workflow Performance Analytics</h2>
            <p className="text-slate-400 text-sm">{mockStats.period} • {mockStats.totalClaims.toLocaleString()} claims processed</p>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-white transition-colors p-2"
          >
            <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        {/* Tabs */}
        <div className="bg-white border-b px-6">
          <div className="flex gap-6">
            {[
              { key: 'overview', label: 'Performance Overview' },
              { key: 'accuracy', label: 'Accuracy Metrics' },
              { key: 'workflow', label: 'Human-AI Workflow' },
              { key: 'feedback', label: 'Feedback Loop' },
            ].map(tab => (
              <button
                key={tab.key}
                onClick={() => setActiveTab(tab.key as typeof activeTab)}
                className={`py-3 border-b-2 text-sm font-medium transition-colors ${
                  activeTab === tab.key
                    ? 'border-indigo-600 text-indigo-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto p-6">
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* Key Performance Summary */}
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-green-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-green-800">All Targets Met</h3>
                    <p className="text-sm text-green-700">The AI workflow is performing above target across all key metrics</p>
                  </div>
                </div>
              </div>

              {/* Efficiency Metrics */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Efficiency Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MetricCard
                    label="Avg Processing Time"
                    value={mockStats.avgProcessingTime}
                    unit="min"
                    target="< 3 min"
                    baseline={`${mockStats.baselineProcessingTime} min`}
                    isGood={mockStats.avgProcessingTime < 3}
                    description={`${Math.round((1 - mockStats.avgProcessingTime / mockStats.baselineProcessingTime) * 100)}% faster than manual`}
                  />
                  <MetricCard
                    label="Automation Rate"
                    value={mockStats.automationRate}
                    unit="%"
                    target="85%"
                    isGood={mockStats.automationRate >= 85}
                    description="Claims with minimal agent intervention"
                  />
                  <MetricCard
                    label="Cost Reduction"
                    value={mockStats.costPerClaimReduction}
                    unit="%"
                    target="60%"
                    isGood={mockStats.costPerClaimReduction >= 60}
                    description="Processing cost per claim"
                  />
                </div>
              </div>

              {/* Business Impact */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Business Impact
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <MetricCard
                    label="Customer Satisfaction"
                    value={`+${mockStats.customerSatisfactionImprovement}`}
                    unit="%"
                    target="+20%"
                    isGood={mockStats.customerSatisfactionImprovement >= 20}
                    description="Improvement in claim experience ratings"
                  />
                  <MetricCard
                    label="Claims Capacity"
                    value={`+${mockStats.claimsVolumeCapacityIncrease}`}
                    unit="%"
                    target="+200%"
                    isGood={mockStats.claimsVolumeCapacityIncrease >= 200}
                    description="Claims processed per agent"
                  />
                </div>
              </div>

              {/* Processing Time Trend */}
              <TrendChart
                data={mockStats.processingTimeTrend}
                dataKey="time"
                label="Processing Time Trend (minutes)"
                target={3}
              />
            </div>
          )}

          {activeTab === 'accuracy' && (
            <div className="space-y-6">
              {/* Accuracy Metrics */}
              <div>
                <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                  Accuracy Metrics
                </h3>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                  <MetricCard
                    label="Estimate Accuracy"
                    value={mockStats.estimateAccuracy}
                    unit="%"
                    target="90%"
                    isGood={mockStats.estimateAccuracy >= 90}
                    description="Within ±15% of final shop quote"
                  />
                  <MetricCard
                    label="Component Detection"
                    value={mockStats.componentDetectionAccuracy}
                    unit="%"
                    target="95%"
                    isGood={mockStats.componentDetectionAccuracy >= 95}
                    description="Precision for damaged parts identification"
                  />
                  <MetricCard
                    label="Agent Override Rate"
                    value={mockStats.agentOverrideRate}
                    unit="%"
                    target="< 15%"
                    isGood={mockStats.agentOverrideRate < 15}
                    description="Estimates requiring significant adjustment"
                  />
                </div>
              </div>

              {/* Accuracy Trend */}
              <TrendChart
                data={mockStats.accuracyTrend}
                dataKey="accuracy"
                label="Estimate Accuracy Trend (%)"
                target={90}
              />

              {/* Override Breakdown */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Agent Override Reasons</h3>
                <div className="space-y-3">
                  {mockStats.overrideReasons.map((item, index) => (
                    <div key={index}>
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-700">{item.reason}</span>
                        <span className="text-gray-500">{item.count} ({item.percent}%)</span>
                      </div>
                      <ProgressBar value={item.percent} color="indigo" />
                    </div>
                  ))}
                </div>
                <p className="text-xs text-gray-500 mt-4">
                  Agent overrides help improve the AI model. Each correction is logged for continuous learning.
                </p>
              </div>
            </div>
          )}

          {activeTab === 'workflow' && (
            <div className="space-y-6">
              {/* Human-AI Interaction Model */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Human-AI Interaction Breakdown</h3>

                <div className="space-y-4">
                  {/* Automated Processing */}
                  <div className="flex items-center gap-4">
                    <div className="w-32 text-sm">
                      <div className="font-medium text-green-700">Automated</div>
                      <div className="text-xs text-gray-500">≥85% confidence</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">15-second agent review</span>
                        <span className="font-medium">{mockStats.automatedProcessing}%</span>
                      </div>
                      <ProgressBar value={mockStats.automatedProcessing} color="green" />
                    </div>
                    <div className="text-xs text-gray-500 w-20 text-right">
                      Expected: 85%
                    </div>
                  </div>

                  {/* Agent-Assisted */}
                  <div className="flex items-center gap-4">
                    <div className="w-32 text-sm">
                      <div className="font-medium text-amber-700">Agent-Assisted</div>
                      <div className="text-xs text-gray-500">70-85% confidence</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Agent reviews and adjusts</span>
                        <span className="font-medium">{mockStats.agentAssisted}%</span>
                      </div>
                      <ProgressBar value={mockStats.agentAssisted} max={20} color="amber" />
                    </div>
                    <div className="text-xs text-gray-500 w-20 text-right">
                      Expected: 12%
                    </div>
                  </div>

                  {/* Manual Escalation */}
                  <div className="flex items-center gap-4">
                    <div className="w-32 text-sm">
                      <div className="font-medium text-red-700">Manual Review</div>
                      <div className="text-xs text-gray-500">&lt;70% confidence</div>
                    </div>
                    <div className="flex-1">
                      <div className="flex justify-between text-sm mb-1">
                        <span className="text-gray-600">Full manual processing</span>
                        <span className="font-medium">{mockStats.manualEscalation}%</span>
                      </div>
                      <ProgressBar value={mockStats.manualEscalation} max={10} color="red" />
                    </div>
                    <div className="text-xs text-gray-500 w-20 text-right">
                      Expected: 3%
                    </div>
                  </div>
                </div>
              </div>

              {/* Workflow Visualization */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">Supervised Automation Workflow</h3>

                <div className="flex items-center justify-between gap-2 text-center">
                  {/* Step 1 */}
                  <div className="flex-1">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-xs font-medium text-gray-900">Photo Upload</div>
                    <div className="text-xs text-gray-500">Damage images</div>
                  </div>

                  <div className="text-gray-300">→</div>

                  {/* Step 2 */}
                  <div className="flex-1">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div className="text-xs font-medium text-gray-900">AI Analysis</div>
                    <div className="text-xs text-gray-500">~2.7 min avg</div>
                  </div>

                  <div className="text-gray-300">→</div>

                  {/* Step 3 */}
                  <div className="flex-1">
                    <div className="w-12 h-12 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
                      </svg>
                    </div>
                    <div className="text-xs font-medium text-gray-900">Confidence Check</div>
                    <div className="text-xs text-gray-500">Route decision</div>
                  </div>

                  <div className="text-gray-300">→</div>

                  {/* Step 4 */}
                  <div className="flex-1">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                    </div>
                    <div className="text-xs font-medium text-gray-900">Agent Review</div>
                    <div className="text-xs text-gray-500">Approve/Adjust</div>
                  </div>

                  <div className="text-gray-300">→</div>

                  {/* Step 5 */}
                  <div className="flex-1">
                    <div className="w-12 h-12 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <svg className="w-6 h-6 text-green-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                    </div>
                    <div className="text-xs font-medium text-gray-900">Complete</div>
                    <div className="text-xs text-gray-500">Estimate sent</div>
                  </div>
                </div>
              </div>

              {/* Agent Empowerment */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <h3 className="text-sm font-semibold text-blue-800 mb-3">Agent Empowerment Features</h3>
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="flex items-center gap-2 text-blue-700">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Override any AI decision with documented reasoning</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Add components missed by AI</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Adjust severity classifications</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Manually input costs for rare/custom parts</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>Flag images for model improvement</span>
                  </div>
                  <div className="flex items-center gap-2 text-blue-700">
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                    </svg>
                    <span>All corrections logged for model retraining</span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'feedback' && (
            <div className="space-y-6">
              {/* Feedback Loop Explanation */}
              <div className="bg-gradient-to-r from-purple-50 to-indigo-50 border border-purple-200 rounded-xl p-4">
                <div className="flex items-center gap-3 mb-3">
                  <div className="w-10 h-10 bg-purple-100 rounded-full flex items-center justify-center">
                    <svg className="w-5 h-5 text-purple-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                  </div>
                  <div>
                    <h3 className="font-semibold text-purple-800">Continuous Learning Pipeline</h3>
                    <p className="text-sm text-purple-700">Agent corrections feed back into model improvement</p>
                  </div>
                </div>
                <p className="text-sm text-purple-700">
                  When agents override AI decisions, that data is captured and used to retrain the model.
                  This creates a virtuous cycle where the AI learns from human expertise and improves over time.
                </p>
              </div>

              {/* Session Feedback Stats */}
              {feedbackStats && feedbackStats.totalAssessments > 0 ? (
                <>
                  {/* Current Session Stats */}
                  <div>
                    <h3 className="text-sm font-semibold text-gray-700 uppercase tracking-wide mb-3">
                      Current Session Feedback
                    </h3>
                    <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                      <MetricCard
                        label="Assessments Recorded"
                        value={feedbackStats.totalAssessments}
                        description="Claims processed this session"
                      />
                      <MetricCard
                        label="Auto-Approval Rate"
                        value={feedbackStats.autoApprovedRate.toFixed(0)}
                        unit="%"
                        isGood={feedbackStats.autoApprovedRate >= 80}
                        description="High confidence claims"
                      />
                      <MetricCard
                        label="Override Rate"
                        value={feedbackStats.overrideRate.toFixed(0)}
                        unit="%"
                        isGood={feedbackStats.overrideRate < 20}
                        description="Agent adjustments made"
                      />
                      <MetricCard
                        label="Confidence Calibration"
                        value={feedbackStats.confidenceCalibration.toFixed(0)}
                        unit="%"
                        isGood={feedbackStats.confidenceCalibration >= 80}
                        description="AI confidence accuracy"
                      />
                    </div>
                  </div>

                  {/* Interaction Type Breakdown */}
                  <div className="bg-white rounded-lg border p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Interaction Type Distribution</h3>
                    <div className="space-y-3">
                      {Object.entries(feedbackStats.byInteractionType).map(([type, count]) => {
                        const percent = (count / feedbackStats.totalAssessments) * 100;
                        const labels: Record<string, { label: string; color: string }> = {
                          auto_approved: { label: 'Auto-Approved (High Confidence)', color: 'green' },
                          quick_approved: { label: 'Quick Approved', color: 'blue' },
                          agent_reviewed: { label: 'Agent Reviewed', color: 'amber' },
                          rejected: { label: 'Rejected', color: 'red' },
                        };
                        const info = labels[type] || { label: type, color: 'gray' };
                        return (
                          <div key={type}>
                            <div className="flex justify-between text-sm mb-1">
                              <span className="text-gray-700">{info.label}</span>
                              <span className="text-gray-500">{count} ({percent.toFixed(0)}%)</span>
                            </div>
                            <ProgressBar value={percent} color={info.color} />
                          </div>
                        );
                      })}
                    </div>
                  </div>

                  {/* Recent Feedback Entries */}
                  <div className="bg-white rounded-lg border p-4">
                    <h3 className="text-sm font-semibold text-gray-700 mb-4">Recent Feedback Entries</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-sm">
                        <thead>
                          <tr className="border-b text-left text-gray-500">
                            <th className="pb-2 font-medium">Claim ID</th>
                            <th className="pb-2 font-medium">Type</th>
                            <th className="pb-2 font-medium">AI Estimate</th>
                            <th className="pb-2 font-medium">Final</th>
                            <th className="pb-2 font-medium">Delta</th>
                            <th className="pb-2 font-medium">Override</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {feedbackStats.recentFeedback.map((entry: FeedbackEntry) => (
                            <tr key={entry.id} className="text-gray-700">
                              <td className="py-2 font-mono text-xs">{entry.claimId}</td>
                              <td className="py-2">
                                <span className={`text-xs px-2 py-0.5 rounded ${
                                  entry.interactionType === 'auto_approved' ? 'bg-green-100 text-green-700' :
                                  entry.interactionType === 'agent_reviewed' ? 'bg-amber-100 text-amber-700' :
                                  'bg-gray-100 text-gray-700'
                                }`}>
                                  {entry.interactionType.replace('_', ' ')}
                                </span>
                              </td>
                              <td className="py-2">${entry.aiAssessment.totalEstimate.toLocaleString()}</td>
                              <td className="py-2">${entry.agentModifications.finalTotal.toLocaleString()}</td>
                              <td className="py-2">
                                <span className={
                                  entry.metrics.estimateAccuracyDelta > 0 ? 'text-red-600' :
                                  entry.metrics.estimateAccuracyDelta < 0 ? 'text-green-600' :
                                  'text-gray-500'
                                }>
                                  {entry.metrics.estimateAccuracyDelta > 0 ? '+' : ''}
                                  {entry.metrics.estimateAccuracyDelta.toFixed(1)}%
                                </span>
                              </td>
                              <td className="py-2">
                                {entry.metrics.wasOverridden ? (
                                  <span className="text-amber-600">Yes</span>
                                ) : (
                                  <span className="text-green-600">No</span>
                                )}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </>
              ) : (
                <div className="bg-white rounded-lg border p-8 text-center">
                  <div className="w-16 h-16 bg-gray-100 rounded-full flex items-center justify-center mx-auto mb-4">
                    <svg className="w-8 h-8 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                  </div>
                  <h3 className="text-lg font-medium text-gray-900 mb-2">No Feedback Data Yet</h3>
                  <p className="text-gray-600 max-w-md mx-auto">
                    Process some claims to see feedback loop data. Each approved or reviewed claim
                    generates learning data that helps improve the AI model.
                  </p>
                </div>
              )}

              {/* How It Works */}
              <div className="bg-white rounded-lg border p-4">
                <h3 className="text-sm font-semibold text-gray-700 mb-4">How the Feedback Loop Works</h3>
                <div className="grid grid-cols-4 gap-4 text-center">
                  <div>
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-indigo-600 font-bold">1</span>
                    </div>
                    <p className="text-xs text-gray-600">AI generates damage assessment</p>
                  </div>
                  <div>
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-indigo-600 font-bold">2</span>
                    </div>
                    <p className="text-xs text-gray-600">Agent reviews and makes corrections</p>
                  </div>
                  <div>
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-indigo-600 font-bold">3</span>
                    </div>
                    <p className="text-xs text-gray-600">Corrections logged with reasons</p>
                  </div>
                  <div>
                    <div className="w-10 h-10 bg-indigo-100 rounded-full flex items-center justify-center mx-auto mb-2">
                      <span className="text-indigo-600 font-bold">4</span>
                    </div>
                    <p className="text-xs text-gray-600">Data used for model retraining</p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="bg-white border-t px-6 py-3 flex justify-between items-center">
          <p className="text-xs text-gray-500">
            Data refreshed hourly • Last update: {new Date().toLocaleTimeString()}
          </p>
          <button
            onClick={onClose}
            className="px-4 py-2 bg-slate-800 text-white rounded-lg text-sm font-medium hover:bg-slate-700 transition-colors"
          >
            Close Dashboard
          </button>
        </div>
      </div>
    </div>
  );
}
