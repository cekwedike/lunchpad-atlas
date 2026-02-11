// Curriculum template for LaunchPad Atlas
// This file defines the structure for sessions and resources per cohort.

export interface CurriculumSession {
  sessionNumber: number;
  title: string;
  date: string;
  unlockDate: string;
  resources: Array<{
    id: string;
    type: 'VIDEO' | 'ARTICLE' | 'EXERCISE' | 'QUIZ';
    title: string;
    description?: string;
    url: string;
    isCore: boolean;
    pointValue?: number;
    estimatedMinutes?: number;
    order?: number;
  }>;
}

export interface CurriculumMonth {
  id: number;
  number: string;
  title: string;
  theme: string;
  sessions: CurriculumSession[];
}

export interface Curriculum {
  title: string;
  description: string;
  months: CurriculumMonth[];
}

// Example template (empty months/sessions)
const curriculumTemplate: Curriculum = {
  title: 'LaunchPad Atlas Curriculum',
  description: 'Define your curriculum structure here.',
  months: [],
};

export default curriculumTemplate;
