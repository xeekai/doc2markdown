
export interface ConversionResult {
  markdown: string;
  metadata: {
    originalName: string;
    wordCount: number;
    estimatedTokens: number;
  };
}

export enum AppStatus {
  IDLE = 'IDLE',
  READING = 'READING',
  CONVERTING = 'CONVERTING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
