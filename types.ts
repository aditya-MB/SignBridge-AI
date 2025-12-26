
export enum Mode {
  SIGN_TO_TEXT = 'SIGN_TO_TEXT',
  SPEECH_TO_SIGN = 'SPEECH_TO_SIGN'
}

export interface TranscriptionItem {
  id: string;
  text: string;
  timestamp: number;
  type: 'user' | 'assistant';
}

export interface SignAnimationData {
  handPositions: {
    left: { x: number; y: number; rotation: number };
    right: { x: number; y: number; rotation: number };
  };
  mouthShape: string;
  gestureDescription: string;
}
