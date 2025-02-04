import React from 'react';
import { Card } from '../types';

interface PlayingCardProps {
  card?: Card;
  isHidden?: boolean;
  isHighlighted?: boolean;
  scale?: number;
}

export const PlayingCard: React.FC<PlayingCardProps> = ({
  card,
  isHidden = false,
  isHighlighted = false,
  scale = 1
}) => {
  const baseClasses = `
    relative
    w-16 h-24
    rounded-lg
    font-bold
    flex items-center justify-center
    transform transition-all duration-300
    ${isHighlighted ? 'ring-2 ring-yellow-400' : ''}
  `;

  const cardStyles = {
    transform: `scale(${scale})`,
    transformOrigin: 'center'
  };

  if (!card) {
    return (
      <div
        className={`${baseClasses} bg-gray-200`}
        style={cardStyles}
      >
        ❓
      </div>
    );
  }

  if (isHidden) {
    return (
      <div
        className={`${baseClasses} bg-blue-600 text-white border-2 border-white`}
        style={cardStyles}
      >
        <div className="absolute inset-0 flex items-center justify-center">
          <div className="transform -rotate-45">
            🎮
          </div>
        </div>
      </div>
    );
  }

  const { suit, rank } = card;
  const isRed = suit === '♥' || suit === '♦';
  const displayRank = rank === '10' ? '10' : rank.charAt(0);

  return (
    <div
      className={`
        ${baseClasses}
        bg-white
        border border-gray-300
        ${isRed ? 'text-red-600' : 'text-black'}
      `}
      style={cardStyles}
    >
      {/* Top-left rank and suit */}
      <div className="absolute top-1 left-1 text-sm leading-none">
        {displayRank}
        <div>{suit}</div>
      </div>

      {/* Center rank and suit */}
      <div className="text-xl">
        {suit}
      </div>

      {/* Bottom-right rank and suit (inverted) */}
      <div className="absolute bottom-1 right-1 text-sm leading-none rotate-180">
        {displayRank}
        <div>{suit}</div>
      </div>

      {/* Animation overlay */}
      <div className="absolute inset-0 bg-white opacity-0 hover:opacity-10 transition-opacity duration-200 rounded-lg" />
    </div>
  );
};

// Hand of cards component
interface CardHandProps {
  cards: Card[];
  isHidden?: boolean;
  isActive?: boolean;
}

export const CardHand: React.FC<CardHandProps> = ({
  cards,
  isHidden = false,
  isActive = false
}) => {
  return (
    <div className={`
      flex -space-x-4 
      ${isActive ? 'animate-pulse' : ''}
    `}>
      {cards.map((card, index) => (
        <div
          key={index}
          className="transform transition-transform duration-300 hover:translate-y--2"
          style={{
            zIndex: index,
            animation: `dealCard 0.3s ease-out ${index * 0.1}s forwards`
          }}
        >
          <PlayingCard
            card={card}
            isHidden={isHidden}
            scale={0.9}
          />
        </div>
      ))}
    </div>
  );
};
