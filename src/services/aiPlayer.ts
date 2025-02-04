import { GameState, Player, PlayerAction, PlayerPersonality, GameAnalysis, AIDecision } from '../types';
import { config } from '../config';
import { calculatePotOdds } from '../utils/betting';

export class AIPlayerService {
  private apiKey: string;

  constructor() {
    this.apiKey = config.openai.apiKey || '';
    if (!this.apiKey) {
      console.error('OpenAI API key is not configured. AI players will fold by default.');
    }
  }

  async getDecision(
    player: Player,
    gameState: GameState,
    roundHistory: string[]
  ): Promise<AIDecision> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are a professional poker player AI. Analyze the game state and make strategic decisions following Texas Hold'em rules.

Game Information:
1. Your Hand:
   - Hole cards: ${player.cards.map(c => `${c.rank}${c.suit}`).join(' ')}

2. Community Cards:
   - Flop: ${gameState.communityCards.slice(0, 3).map(c => `${c.rank}${c.suit}`).join(' ')}
   - Turn: ${gameState.communityCards[3] ? `${gameState.communityCards[3].rank}${gameState.communityCards[3].suit}` : 'Not dealt'}
   - River: ${gameState.communityCards[4] ? `${gameState.communityCards[4].rank}${gameState.communityCards[4].suit}` : 'Not dealt'}

3. Betting Information:
   - Current pot: ${gameState.pot}
   - Current bet to call: ${gameState.currentBet - player.currentBet}
   - Your chips: ${player.chips}
   - Minimum raise: ${gameState.minRaise}

4. Position and Phase:
   - Current phase: ${gameState.currentPhase}
   - Your position: ${player.position === gameState.dealerPosition ? 'Dealer' : 
     player.position === gameState.smallBlindPosition ? 'Small Blind' :
     player.position === gameState.bigBlindPosition ? 'Big Blind' :
     `${(player.position - gameState.dealerPosition + gameState.players.length) % gameState.players.length} after dealer`}
   - Active players: ${gameState.activePlayersInRound.length}

5. Action History:
${roundHistory.map((action, i) => `   ${i + 1}. ${action}`).join('\n')}

6. Player Information:
   - Your personality: ${player.personality}
   - Last raise by: ${gameState.lastRaisePlayerId || 'none'}
   - Betting round complete: ${gameState.bettingRoundComplete}

Betting Rules:
1. You cannot raise if betting round is complete (all active players have matched the current bet)
2. Minimum raise must be at least the size of the previous raise
3. You can only check if there's no bet to call
4. You can always fold
5. Going all-in is allowed with any amount of chips

Position Strategy:
- Early position (first to act): Play tight, only strong hands
- Middle position: Moderately aggressive with good hands
- Late position (dealer or close): More aggressive, can play more hands
- Blinds: Defend with reasonable hands when facing raises

Make a decision considering:
1. Position and betting rules
2. Pot odds (${calculatePotOdds(player, gameState).toFixed(1)}%) and implied odds
3. Hand strength and potential
4. Previous actions and player patterns
5. Stack sizes and betting patterns
6. Your assigned personality traits

Output must be valid JSON with:
{
  "actionType": "fold" | "check" | "call" | "raise",
  "amount": number (required if actionType is "raise"),
  "reasoning": "brief explanation of decision"
}`
            },
            {
              role: 'user',
              content: JSON.stringify({
                player,
                gameState,
                roundHistory,
                personality: player.personality
              })
            }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      const decision = JSON.parse(data.choices[0].message.content);
      console.log(`AI ${player.name} decision:`, decision.reasoning);
      
      return {
        actionType: decision.actionType as PlayerAction,
        amount: decision.amount
      };
    } catch (error) {
      console.error('Error getting AI decision:', error);
      // Default to folding if there's an error
      return { actionType: 'fold' };
    }
  }

  async analyzeGame(roundHistory: string[]): Promise<GameAnalysis> {
    try {
      const response = await fetch('https://api.openai.com/v1/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${this.apiKey}`
        },
        body: JSON.stringify({
          model: 'gpt-4',
          messages: [
            {
              role: 'system',
              content: `You are a professional poker coach. Analyze the game history and provide detailed feedback. Output should be in JSON format with 'overview' (string), 'keyDecisions' (array of {action, analysis}), 'improvements' (array of strings), and 'rating' (number 1-5).`
            },
            {
              role: 'user',
              content: JSON.stringify({ roundHistory })
            }
          ],
          temperature: 0.7
        })
      });

      const data = await response.json();
      return JSON.parse(data.choices[0].message.content);
    } catch (error) {
      console.error('Error analyzing game:', error);
      // Return a default analysis if there's an error
      return {
        overview: 'Unable to analyze the game due to an error.',
        keyDecisions: [],
        improvements: ['Try again in the next round.'],
        rating: 3
      };
    }
  }

  // Helper method to generate different AI personalities
  getPersonality(): PlayerPersonality {
    const personalities: PlayerPersonality[] = [
      'aggressive',
      'conservative',
      'balanced',
      'unpredictable',
      'mathematical'
    ];
    return personalities[Math.floor(Math.random() * personalities.length)];
  }

  // Helper method to adjust decision making based on personality
  private adjustForPersonality(
    baseDecision: AIDecision,
    personality: PlayerPersonality,
    gameState: GameState
  ): AIDecision {
    switch (personality) {
      case 'aggressive':
        if (baseDecision.actionType === 'call' && Math.random() > 0.6) {
          return { actionType: 'raise', amount: gameState.currentBet * 3 };
        }
        break;
      case 'conservative':
        if (baseDecision.actionType === 'raise' && Math.random() > 0.7) {
          return { actionType: 'call' };
        }
        break;
      case 'unpredictable':
        if (Math.random() > 0.8) {
          const actions: PlayerAction[] = ['fold', 'check', 'call', 'raise'];
          return {
            actionType: actions[Math.floor(Math.random() * actions.length)],
            amount: baseDecision.amount
          };
        }
        break;
      case 'mathematical':
        // Could implement pot odds calculations here
        break;
    }
    return baseDecision;
  }
}
