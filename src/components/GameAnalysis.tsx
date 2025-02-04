import React, { useState, useEffect } from 'react';
import { GameAnalysis as GameAnalysisType } from '../types';
import { AIPlayerService } from '../services/aiPlayer';
import { config } from '../config';

interface GameAnalysisProps {
  roundHistory: string[];
  onClose: () => void;
}

const aiService = new AIPlayerService();

export const GameAnalysis: React.FC<GameAnalysisProps> = ({
  roundHistory,
  onClose
}) => {
  const [analysis, setAnalysis] = useState<GameAnalysisType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const getAnalysis = async () => {
      try {
        const result = await aiService.analyzeGame(roundHistory);
        setAnalysis(result);
      } catch (err) {
        setError('Failed to analyze the game. Please try again.');
      } finally {
        setLoading(false);
      }
    };

    getAnalysis();
  }, [roundHistory]);

  if (loading) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
          <div className="flex flex-col items-center">
            <div className="loading-spinner mb-4" />
            <p className="text-gray-600">Analyzing your gameplay...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
        <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
          <div className="text-center">
            <h3 className="text-xl font-bold text-red-600 mb-2">Analysis Error</h3>
            <p className="text-gray-600 mb-4">{error}</p>
            <button
              onClick={onClose}
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 max-w-2xl w-full">
        <h2 className="text-2xl font-bold mb-6">Round Analysis</h2>

        {/* Performance Rating */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-2">
            <span className="font-medium">Performance Rating</span>
            <div className="flex items-center">
              {[1, 2, 3, 4, 5].map((star) => (
                <svg
                  key={star}
                  className={`w-6 h-6 ${
                    star <= analysis.rating
                      ? 'text-yellow-400'
                      : 'text-gray-300'
                  }`}
                  fill="currentColor"
                  viewBox="0 0 20 20"
                >
                  <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                </svg>
              ))}
            </div>
          </div>
        </div>

        {/* Overview */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Overview</h3>
          <p className="text-gray-700">{analysis.overview}</p>
        </div>

        {/* Key Decisions */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Key Decisions</h3>
          <div className="space-y-4">
            {analysis.keyDecisions.map((decision, index) => (
              <div
                key={index}
                className="bg-gray-50 p-4 rounded-lg border border-gray-200"
              >
                <div className="font-medium text-gray-800 mb-1">
                  {decision.action}
                </div>
                <div className="text-gray-600 text-sm">
                  {decision.analysis}
                </div>
              </div>
            ))}
          </div>
        </div>

        {/* Improvements */}
        <div className="mb-6">
          <h3 className="text-lg font-semibold mb-2">Areas for Improvement</h3>
          <ul className="list-disc list-inside space-y-2">
            {analysis.improvements.map((improvement, index) => (
              <li key={index} className="text-gray-700">
                {improvement}
              </li>
            ))}
          </ul>
        </div>

        <div className="flex justify-end">
          <button
            onClick={onClose}
            className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
          >
            Continue to Next Round
          </button>
        </div>
      </div>
    </div>
  );
};
