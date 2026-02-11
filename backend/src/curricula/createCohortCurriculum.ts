import curriculumTemplate, { Curriculum } from '../../../shared/curriculum.template';
import { promises as fs } from 'fs';
import { join } from 'path';

// Utility to create a cohort-specific curriculum file
export async function createCohortCurriculum(cohortId: string): Promise<void> {
  const curriculum: Curriculum = {
    ...curriculumTemplate,
    title: `Curriculum for Cohort ${cohortId}`,
    months: [], // Optionally, prepopulate months/sessions/resources
  };

  const filePath = join(__dirname, '../../curricula', `curriculum.${cohortId}.json`);
  await fs.mkdir(join(__dirname, '../../curricula'), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(curriculum, null, 2), 'utf-8');
}

// Example usage (to be called on cohort creation)
// await createCohortCurriculum('cohort123');
