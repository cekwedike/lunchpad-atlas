import curriculumTemplate, { Curriculum, CurriculumMonth, CurriculumSession } from './curriculum.template';

// Curriculum data generated from docs/resources.md
const curriculum: Curriculum = {
  title: 'LaunchPad Atlas Curriculum',
  description: 'Atlas curriculum with sessions and resources linked from resources.md',
  months: [
    {
      id: 1,
      number: '1',
      title: 'Foundations: Self, Ownership & Communication',
      theme: 'Ownership, Leadership, Communication',
      sessions: [
        {
          sessionNumber: 1,
          title: 'Ownership Mindset & Leadership at Work',
          date: '',
          unlockDate: '',
          resources: [
            {
              id: 'core-article-1',
              type: 'ARTICLE',
              title: '360° Leadership: The Art of Influence Without Authority',
              url: 'https://medium.com/@contact.jitendra07/360-leadership-the-art-of-influence-without-authority-3ace7b3e1a9b',
              isCore: true,
            },
            {
              id: 'core-article-2',
              type: 'ARTICLE',
              title: 'Developing an ownership mindset early in your career',
              url: 'https://www.indeed.com/career-advice/career-development/ownership-mindset',
              isCore: true,
            },
            {
              id: 'core-article-3',
              type: 'ARTICLE',
              title: 'Ownership Mindset',
              url: 'https://www.atlassian.com/blog/leadership/how-leaders-build-ownership-mindset',
              isCore: true,
            },
            {
              id: 'core-video-1',
              type: 'VIDEO',
              title: 'Leadership Vs. Authority | Simon Sinek',
              url: 'https://www.youtube.com/watch?v=pkclW79ZoZU',
              isCore: true,
            },
            {
              id: 'core-video-2',
              type: 'VIDEO',
              title: 'DEVELOP AN OWNERSHIP MINDSET AT WORK',
              url: 'https://youtu.be/ORlTz8lJL7k?si=ugc7Vd76qeRjWMp7',
              isCore: true,
            },
            {
              id: 'optional-article-1',
              type: 'ARTICLE',
              title: 'Building influence without formal power',
              url: 'https://online.hbs.edu/blog/post/influence-without-authority',
              isCore: false,
            },
            {
              id: 'optional-video-1',
              type: 'VIDEO',
              title: 'Leading without authority | Mary Meaney Haynes | TEDxBasel',
              url: 'https://www.youtube.com/watch?v=LZ6EXX3hLLg&pp=ygUhTGVhZGVyc2hpcCBXaXRob3V0IEF1dGhvcml0eSBURUR4',
              isCore: false,
            },
          ],
        },
        {
          sessionNumber: 2,
          title: 'Goal Setting & Time Management',
          date: '',
          unlockDate: '',
          resources: [
            {
              id: 'core-article-4',
              type: 'ARTICLE',
              title: 'SMART goal setting for professionals',
              url: 'https://www.indeed.com/career-advice/career-development/how-to-write-smart-goals',
              isCore: true,
            },
            {
              id: 'core-article-5',
              type: 'ARTICLE',
              title: 'Time management strategies for high-performing employees',
              url: 'https://www.proofhub.com/articles/time-management-strategies',
              isCore: true,
            },
            {
              id: 'core-video-3',
              type: 'VIDEO',
              title: 'SMART Goals (Explained) - Specific, Measurable, Attainable, Realistic, Time-Bound',
              url: 'https://youtu.be/hj7Kw3fDNaw?si=xiWUYxNYgPFG-9yD',
              isCore: true,
            },
            {
              id: 'core-video-4',
              type: 'VIDEO',
              title: 'Brian Tracy on Time Management',
              url: 'https://youtu.be/sJb2qmd5wsk?si=1SOr7s2Xs7CNjqtT',
              isCore: true,
            },
            {
              id: 'optional-article-2',
              type: 'ARTICLE',
              title: 'Deep work, focus, and managing attention in modern workplaces',
              url: 'https://lpsonline.sas.upenn.edu/features/mastering-your-schedule-effective-time-management-strategies-success',
              isCore: false,
            },
            {
              id: 'optional-video-2',
              type: 'VIDEO',
              title: 'How to Build Your Ultimate Productivity System',
              url: 'https://youtu.be/T6hmdrsLQj8?si=smHG7tpcjzRqYfF7',
              isCore: false,
            },
          ],
        },
        // ...additional sessions for Month 1
      ],
    },
    // ...additional months
  ],
};

export default curriculum;
