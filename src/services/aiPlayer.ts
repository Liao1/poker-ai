import { GameState, Player, PlayerAction, PlayerPersonality, GameAnalysis, AIDecision } from '../types';
import { config } from '../config';

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
              content: `You are a professional poker player AI. Analyze the game state and make strategic decisions.

Current game state information:
- Your hole cards: ${player.cards.map(c => `${c.rank}${c.suit}`).join(' ')}
- Community cards: ${gameState.communityCards.map(c => `${c.rank}${c.suit}`).join(' ')}
- Current pot: ${gameState.pot}
- Current bet to call: ${gameState.currentBet - player.currentBet}
- Your chips: ${player.chips}
- Current phase: ${gameState.currentPhase}
- Your position relative to dealer: ${player.position === gameState.dealerPosition ? 'Dealer' : 
  player.position === gameState.smallBlindPosition ? 'Small Blind' :
  player.position === gameState.bigBlindPosition ? 'Big Blind' :
  `${(player.position - gameState.dealerPosition + gameState.players.length) % gameState.players.length} after dealer`}
- Your personality: ${player.personality}

Make a decision considering:
1. Your position and role (dealer, blinds, etc)
2. Pot odds and implied odds
3. Your hand strength relative to possible opponent hands
4. Previous actions in this round
5. Your assigned personality traits
              
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
