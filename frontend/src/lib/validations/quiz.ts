import { z } from 'zod';

export const quizSubmissionSchema = z.object({
  answers: z.record(z.string(), z.string()).refine(
    (answers) => Object.keys(answers).length > 0,
    {
      message: 'At least one answer is required',
    }
  ),
});

export type QuizSubmissionInput = z.infer<typeof quizSubmissionSchema>;
