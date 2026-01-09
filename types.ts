
export interface ConversionResult {
  markdown: string;
  metadata: {
    originalName: string;
    wordCount: number;
    estimatedTokens: number;
  };
}

export interface BatchItem {
  id: string;
  file: File;
  status: 'pending' | 'processing' | 'completed' | 'error';
  result?: ConversionResult;
  error?: string;
}

export enum AppStatus {
  IDLE = 'IDLE',
  READING = 'READING',
  BATCH_PROCESSING = 'BATCH_PROCESSING',
  SUCCESS = 'SUCCESS',
  ERROR = 'ERROR'
}
