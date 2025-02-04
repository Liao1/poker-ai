import { Card } from '../types';

const suits = ['♠', '♣', '♥', '♦'] as const;
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  suits.forEach(suit => {
    ranks.forEach((rank, index) => {
      deck.push({
        suit,
        rank,
        value: index + 2, // 2-14 (Ace is 14)
        roundHistory: [] // Initialize roundHistory as an empty array
      });
    });
  });
  return shuffle(deck);
};

export const shuffle = (array: Card[]): Card[] => {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
};

export const evaluateHand = (playerCards: Card[], communityCards: Card[]): { rank: string; value: number } => {
  const cards = [...playerCards, ...communityCards];
  
  // Check for each hand type in descending order of value
  if (hasRoyalFlush(cards)) return { rank: 'Royal Flush', value: 10 };
  if (hasStraightFlush(cards)) return { rank: 'Straight Flush', value: 9 };
  if (hasFourOfAKind(cards)) return { rank: 'Four of a Kind', value: 8 };
  if (hasFullHouse(cards)) return { rank: 'Full House', value: 7 };
  if (hasFlush(cards)) return { rank: 'Flush', value: 6 };
  if (hasStraight(cards)) return { rank: 'Straight', value: 5 };
  if (hasThreeOfAKind(cards)) return { rank: 'Three of a Kind', value: 4 };
  if (hasTwoPair(cards)) return { rank: 'Two Pair', value: 3 };
  if (hasOnePair(cards)) return { rank: 'One Pair', value: 2 };
  
  return { rank: 'High Card', value: 1 };
};

export const compareHands = (hand1: Card[], hand2: Card[], communityCards: Card[]): number => {
  const eval1 = evaluateHand(hand1, communityCards);
  const eval2 = evaluateHand(hand2, communityCards);
  
  if (eval1.value > eval2.value) return 1;
  if (eval1.value < eval2.value) return -1;
  
  // If same hand type, compare high cards
  return compareHighCards(hand1, hand2);
};

// Helper functions for hand evaluation
const hasRoyalFlush = (cards: Card[]): boolean => {
  const flush = hasFlush(cards);
  const straight = hasStraight(cards);
  return flush && straight && cards.some(card => card.rank === 'A');
};

const hasStraightFlush = (cards: Card[]): boolean => {
  return hasFlush(cards) && hasStraight(cards);
};

const hasFourOfAKind = (cards: Card[]): boolean => {
  const values = cards.map(card => card.value);
  return new Set(values).size <= cards.length - 3;
};

const hasFullHouse = (cards: Card[]): boolean => {
  const values = cards.map(card => card.value);
  const valueCounts = new Map<number, number>();
  values.forEach(value => {
    valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
  });
  return Array.from(valueCounts.values()).includes(3) && Array.from(valueCounts.values()).includes(2);
};

const hasFlush = (cards: Card[]): boolean => {
  return new Set(cards.map(card => card.suit)).size === 1;
};

const hasStraight = (cards: Card[]): boolean => {
  const values = Array.from(new Set(cards.map(card => card.value))).sort((a, b) => a - b);
  return values.some((value, index) => 
    index <= values.length - 5 && 
    values.slice(index, index + 5).every((v, i) => i === 0 || v === values[index + i - 1] + 1)
  );
};

const hasThreeOfAKind = (cards: Card[]): boolean => {
  const values = cards.map(card => card.value);
  const valueCounts = new Map<number, number>();
  values.forEach(value => {
    valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
  });
  return Array.from(valueCounts.values()).includes(3);
};

const hasTwoPair = (cards: Card[]): boolean => {
  const values = cards.map(card => card.value);
  const valueCounts = new Map<number, number>();
  values.forEach(value => {
    valueCounts.set(value, (valueCounts.get(value) || 0) + 1);
  });
  return Array.from(valueCounts.values()).filter(count => count === 2).length >= 2;
};

const hasOnePair = (cards: Card[]): boolean => {
  const values = cards.map(card => card.value);
  return new Set(values).size <= cards.length - 1;
};

const compareHighCards = (hand1: Card[], hand2: Card[]): number => {
  const values1 = hand1.map(card => card.value).sort((a, b) => b - a);
  const values2 = hand2.map(card => card.value).sort((a, b) => b - a);
  
  for (let i = 0; i < values1.length; i++) {
    if (values1[i] > values2[i]) return 1;
    if (values1[i] < values2[i]) return -1;
  }
  
  return 0;
};
