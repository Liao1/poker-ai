import React, { useState, useEffect } from 'react';

interface BetSliderProps {
  minBet: number;
  maxBet: number;
  currentBet: number;
  onBetConfirm: (amount: number) => void;
  onCancel: () => void;
}

export const BetSlider: React.FC<BetSliderProps> = ({
  minBet,
  maxBet,
  currentBet,
  onBetConfirm,
  onCancel
}) => {
  const [betAmount, setBetAmount] = useState(minBet);
  const [customAmount, setCustomAmount] = useState('');

  useEffect(() => {
    setBetAmount(minBet);
    setCustomAmount(minBet.toString());
  }, [minBet]);

  const handleSliderChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value);
    setBetAmount(value);
    setCustomAmount(value.toString());
  };

  const handleCustomAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value;
    setCustomAmount(value);
    const numValue = parseInt(value);
    if (!isNaN(numValue) && numValue >= minBet && numValue <= maxBet) {
      setBetAmount(numValue);
    }
  };

  const handleConfirm = () => {
    const amount = parseInt(customAmount);
    if (!isNaN(amount) && amount >= minBet && amount <= maxBet) {
      onBetConfirm(amount);
    }
  };

  const presetBets = [
    { label: 'Min', value: minBet },
    { label: 'Pot', value: currentBet * 2 },
    { label: 'Max', value: maxBet }
  ];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4">
      <div className="bg-white rounded-lg shadow-xl p-6 w-full max-w-md">
        <h3 className="text-lg font-bold mb-4">Raise Amount</h3>
        
        <div className="mb-6">
          <input
            type="range"
            min={minBet}
            max={maxBet}
            value={betAmount}
            onChange={handleSliderChange}
            className="w-full h-2 bg-blue-100 rounded-lg appearance-none cursor-pointer"
          />
          <div className="flex justify-between text-sm text-gray-600 mt-1">
            <span>{minBet}</span>
            <span>{maxBet}</span>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          {presetBets.map((preset) => (
            <button
              key={preset.label}
              onClick={() => {
                setBetAmount(preset.value);
                setCustomAmount(preset.value.toString());
              }}
              className="flex-1 py-2 px-4 text-sm bg-gray-100 hover:bg-gray-200 rounded-md transition-colors"
            >
              {preset.label} ({preset.value})
            </button>
          ))}
        </div>

        <div className="mb-6">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Custom Amount
          </label>
          <input
            type="number"
            value={customAmount}
            onChange={handleCustomAmountChange}
            min={minBet}
            max={maxBet}
            className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
        </div>

        <div className="flex gap-4">
          <button
            onClick={onCancel}
            className="flex-1 py-2 px-4 bg-gray-500 text-white rounded-md hover:bg-gray-600 transition-colors"
          >
            Cancel
          </button>
          <button
            onClick={handleConfirm}
            disabled={isNaN(parseInt(customAmount)) || parseInt(customAmount) < minBet || parseInt(customAmount) > maxBet}
            className="flex-1 py-2 px-4 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Raise to {customAmount}
          </button>
        </div>
      </div>
    </div>
  );
};
