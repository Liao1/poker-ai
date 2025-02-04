// Allow importing of image files
declare module '*.png' {
  const content: string;
  export default content;
}

declare module '*.jpg' {
  const content: string;
  export default content;
}

declare module '*.svg' {
  const content: string;
  export default content;
}

declare module '*.gif' {
  const content: string;
  export default content;
}

// Allow importing of style files
declare module '*.css' {
  const content: { [className: string]: string };
  export default content;
}

declare module '*.scss' {
  const content: { [className: string]: string };
  export default content;
}

// Environment variables
declare namespace NodeJS {
  interface ProcessEnv {
    NODE_ENV: 'development' | 'production' | 'test';
    REACT_APP_OPENAI_API_KEY?: string;
    PUBLIC_URL: string;
  }
}

// Custom type declarations for the poker game
declare type Suit = '♠' | '♣' | '♥' | '♦';
declare type Rank = '2' | '3' | '4' | '5' | '6' | '7' | '8' | '9' | '10' | '11' | '12' | '13' | '14';
declare type PlayerPersonality = 'aggressive' | 'conservative' | 'balanced' | 'unpredictable' | 'mathematical';

// Extend Window interface for any global variables we might need
declare interface Window {
  __REDUX_DEVTOOLS_EXTENSION_COMPOSE__?: any;
}
