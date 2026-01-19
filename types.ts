
export enum ConferenceType {
  ACL = 'ACL',
  EMNLP = 'EMNLP',
  KDD = 'KDD',
  ICML = 'ICML',
  NEURIPS = 'NeurIPS',
  CVPR = 'CVPR',
  ICCV = 'ICCV',
  AAAI = 'AAAI'
}

export enum AppStep {
  SETUP = 0,
  UNDERSTANDING = 1,
  GENERATION = 2,
  REFINEMENT = 3
}

export interface PaperAnalysis {
  title: string;
  summary: string;
  layoutStrategy: string;
  architectureBlueprint: string;
  keyComponents: string[];
}

export interface HistoryItem {
  prompt: string;
  imageUrl: string;
  timestamp: number;
}
