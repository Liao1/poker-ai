import React, { useState } from 'react';
import { useDispatch } from 'react-redux';
import { initializeGame } from '../store/gameSlice';

interface SetupScreenProps {
  onComplete: () => void;
}

export const SetupScreen: React.FC<SetupScreenProps> = ({ onComplete }) => {
  const [apiKey, setApiKey] = useState('');
  const [playerCount, setPlayerCount] = useState(3); // Default to 3 AI players + 1 human
  const [error, setError] = useState<string | null>(null);
  const dispatch = useDispatch();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!apiKey.trim()) {
      setError('Please enter your OpenAI API key');
      return;
    }

    try {
      // Store API key in localStorage
      localStorage.setItem('openai_api_key', apiKey);

      // Initialize game with selected number of players
      dispatch(initializeGame({
        playerCount: playerCount + 1, // +1 for human player
        startingChips: 400,
        smallBlind: 1,
        bigBlind: 2
      }));

      // Notify parent that setup is complete
      onComplete();
    } catch (err) {
      setError('Failed to initialize game. Please try again.');
    }
  };

  return (
    <div className="min-h-screen bg-gray-900 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-8 max-w-md w-full">
        <h1 className="text-3xl font-bold text-gray-800 mb-6 text-center">
          AI Poker Setup
        </h1>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              OpenAI API Key
            </label>
            <input
              type="password"
              value={apiKey}
              onChange={(e) => setApiKey(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              placeholder="sk-..."
            />
          </div>

          <div>
            <label className="block text-gray-700 text-sm font-bold mb-2">
              Number of AI Players
            </label>
            <div className="flex items-center space-x-4">
              <input
                type="range"
                min="1"
                max="7"
                value={playerCount}
                onChange={(e) => setPlayerCount(parseInt(e.target.value))}
                className="flex-grow"
              />
              <span className="text-gray-700 font-bold">{playerCount}</span>
            </div>
            <p className="mt-1 text-sm text-gray-500">
              You + {playerCount} AI players = {playerCount + 1} total players
            </p>
          </div>

          {error && (
            <div className="text-red-500 text-sm">{error}</div>
          )}

          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-2 px-4 rounded-md hover:bg-blue-700 transition-colors"
          >
            Start Game
          </button>
        </form>

        <div className="mt-6 text-sm text-gray-500">
          <p>Game Rules:</p>
          <ul className="list-disc list-inside mt-2 space-y-1">
            <li>Each player starts with 400 chips</li>
            <li>Small blind: 1 chip</li>
            <li>Big blind: 2 chips</li>
            <li>Each AI player has a unique personality and playing style</li>
            <li>Game ends when a player loses all chips</li>
          </ul>
        </div>
      </div>
    </div>
  );
};
