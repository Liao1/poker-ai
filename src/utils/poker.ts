import { Card, HandRank } from '../types';

const suits = ['♠', '♣', '♥', '♦'] as const;
const ranks = ['2', '3', '4', '5', '6', '7', '8', '9', '10', 'J', 'Q', 'K', 'A'] as const;

export const createDeck = (): Card[] => {
  const deck: Card[] = [];
  suits.forEach(suit => {
    ranks.forEach((rank, index) => {
      deck.push({
        suit,
        rank,
        value: index + 2 // 2-14 (Ace is 14)
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

export const evaluateHand = (playerCards: Card[], communityCards: Card[]): HandRank => {
  const allCards = [...playerCards, ...communityCards];
  const possibleHands = generateFiveCardCombinations(allCards);
  let bestHand = evaluateFiveCardHand(possibleHands[0]);

  for (let i = 1; i < possibleHands.length; i++) {
    const currentHand = evaluateFiveCardHand(possibleHands[i]);
    if (compareHands(currentHand, bestHand) > 0) {
      bestHand = currentHand;
    }
  }

  return bestHand;
};

const generateFiveCardCombinations = (cards: Card[]): Card[][] => {
  const combinations: Card[][] = [];
  const n = cards.length;
  
  for (let i = 0; i < n - 4; i++) {
    for (let j = i + 1; j < n - 3; j++) {
      for (let k = j + 1; k < n - 2; k++) {
        for (let l = k + 1; l < n - 1; l++) {
          for (let m = l + 1; m < n; m++) {
            combinations.push([cards[i], cards[j], cards[k], cards[l], cards[m]]);
          }
        }
      }
    }
  }
  
  return combinations;
};

const evaluateFiveCardHand = (cards: Card[]): HandRank => {
  if (hasRoyalFlush(cards)) return { rank: 'Royal Flush', value: 10, cards, kickers: [] };
  if (hasStraightFlush(cards)) return { rank: 'Straight Flush', value: 9, cards, kickers: [] };
  const fourKind = hasFourOfAKind(cards);
  if (fourKind) return { rank: 'Four of a Kind', value: 8, cards: fourKind.cards, kickers: fourKind.kickers };
  const fullHouse = hasFullHouse(cards);
  if (fullHouse) return { rank: 'Full House', value: 7, cards: fullHouse.cards, kickers: [] };
  const flush = hasFlush(cards);
  if (flush) return { rank: 'Flush', value: 6, cards: flush, kickers: [] };
  const straight = hasStraight(cards);
  if (straight) return { rank: 'Straight', value: 5, cards: straight, kickers: [] };
  const threeKind = hasThreeOfAKind(cards);
  if (threeKind) return { rank: 'Three of a Kind', value: 4, cards: threeKind.cards, kickers: threeKind.kickers };
  const twoPair = hasTwoPair(cards);
  if (twoPair) return { rank: 'Two Pair', value: 3, cards: twoPair.cards, kickers: twoPair.kickers };
  const onePair = hasOnePair(cards);
  if (onePair) return { rank: 'One Pair', value: 2, cards: onePair.cards, kickers: onePair.kickers };

  return { rank: 'High Card', value: 1, cards: [getHighCard(cards)], kickers: cards.filter(c => c !== getHighCard(cards)) };
};

const hasRoyalFlush = (cards: Card[]): boolean => {
  const straight = hasStraight(cards);
  const flush = hasFlush(cards);
  return Boolean(flush && straight && cards.some(card => card.rank === 'A'));
};

const hasStraightFlush = (cards: Card[]): boolean => {
  const flush = hasFlush(cards);
  const straight = hasStraight(cards);
  return Boolean(flush && straight);
};

const hasFourOfAKind = (cards: Card[]): { cards: Card[]; kickers: Card[] } | null => {
  for (let i = 0; i < cards.length - 3; i++) {
    const matches = cards.filter(c => c.value === cards[i].value);
    if (matches.length === 4) {
      const kickers = cards.filter(c => c.value !== cards[i].value);
      return { cards: matches, kickers };
    }
  }
  return null;
};

const hasFullHouse = (cards: Card[]): { cards: Card[] } | null => {
  const threeKind = hasThreeOfAKind(cards);
  if (!threeKind) return null;

  const remainingCards = cards.filter(c => !threeKind.cards.includes(c));
  const pair = hasOnePair(remainingCards);
  if (!pair) return null;

  return { cards: [...threeKind.cards, ...pair.cards] };
};

const hasFlush = (cards: Card[]): Card[] | null => {
  for (const suit of suits) {
    const flushCards = cards.filter(card => card.suit === suit);
    if (flushCards.length >= 5) {
      return flushCards.sort((a, b) => b.value - a.value).slice(0, 5);
    }
  }
  return null;
};

const hasStraight = (cards: Card[]): Card[] | null => {
  const uniqueValues = Array.from(new Set(cards.map(c => c.value))).sort((a, b) => a - b);
  
  // Check for Ace-low straight (A,2,3,4,5)
  if (uniqueValues.includes(14)) { // Has Ace
    const lowStraight = [2,3,4,5,14];
    if (lowStraight.every(v => uniqueValues.includes(v))) {
      return cards
        .filter(c => lowStraight.includes(c.value))
        .sort((a, b) => lowStraight.indexOf(a.value) - lowStraight.indexOf(b.value));
    }
  }

  // Check for regular straights
  for (let i = 0; i <= uniqueValues.length - 5; i++) {
    if (uniqueValues[i + 4] - uniqueValues[i] === 4) {
      const straightValues = uniqueValues.slice(i, i + 5);
      return cards
        .filter(c => straightValues.includes(c.value))
        .sort((a, b) => a.value - b.value);
    }
  }

  return null;
};

const hasThreeOfAKind = (cards: Card[]): { cards: Card[]; kickers: Card[] } | null => {
  for (let i = 0; i < cards.length - 2; i++) {
    const matches = cards.filter(c => c.value === cards[i].value);
    if (matches.length === 3) {
      const kickers = cards
        .filter(c => c.value !== cards[i].value)
        .sort((a, b) => b.value - a.value)
        .slice(0, 2);
      return { cards: matches, kickers };
    }
  }
  return null;
};

const hasTwoPair = (cards: Card[]): { cards: Card[]; kickers: Card[] } | null => {
  const pairs: Card[][] = [];
  const seen = new Set<number>();

  for (const card of cards) {
    if (!seen.has(card.value)) {
      const matches = cards.filter(c => c.value === card.value);
      if (matches.length === 2) {
        pairs.push(matches);
      }
      seen.add(card.value);
    }
  }

  if (pairs.length >= 2) {
    pairs.sort((a, b) => b[0].value - a[0].value);
    const twoPairCards = [...pairs[0], ...pairs[1]];
    const kickers = cards
      .filter(c => !twoPairCards.includes(c))
      .sort((a, b) => b.value - a.value)
      .slice(0, 1);
    return { cards: twoPairCards, kickers };
  }

  return null;
};

const hasOnePair = (cards: Card[]): { cards: Card[]; kickers: Card[] } | null => {
  for (let i = 0; i < cards.length - 1; i++) {
    const matches = cards.filter(c => c.value === cards[i].value);
    if (matches.length === 2) {
      const kickers = cards
        .filter(c => c.value !== cards[i].value)
        .sort((a, b) => b.value - a.value)
        .slice(0, 3);
      return { cards: matches, kickers };
    }
  }
  return null;
};

const getHighCard = (cards: Card[]): Card => {
  return cards.reduce((highest, current) => 
    current.value > highest.value ? current : highest
  );
};

export const compareHands = (hand1: HandRank, hand2: HandRank): number => {
  // Compare hand ranks first
  if (hand1.value !== hand2.value) {
    return hand1.value - hand2.value;
  }

  // If ranks are equal, compare the main cards of the hand
  const mainCardComparison = compareCards(hand1.cards, hand2.cards);
  if (mainCardComparison !== 0) {
    return mainCardComparison;
  }

  // If main cards are equal, compare kickers
  return compareCards(hand1.kickers, hand2.kickers);
};

const compareCards = (cards1: Card[], cards2: Card[]): number => {
  const values1 = cards1.map(c => c.value).sort((a, b) => b - a);
  const values2 = cards2.map(c => c.value).sort((a, b) => b - a);

  for (let i = 0; i < Math.min(values1.length, values2.length); i++) {
    if (values1[i] !== values2[i]) {
      return values1[i] - values2[i];
    }
  }

  return 0;
};
