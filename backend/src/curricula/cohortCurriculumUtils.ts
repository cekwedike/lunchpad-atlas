// This file provides utility functions for managing cohort-specific curriculum files.
import { promises as fs } from 'fs';
import { join } from 'path';
import curriculumTemplate, { Curriculum } from '../../../shared/curriculum.template';
import curriculum from '../../../shared/curriculum';

export async function createCohortCurriculum(cohortId: string): Promise<void> {
  const cohortCurriculum: Curriculum = {
    ...curriculum,
    title: `Curriculum for Cohort ${cohortId}`,
  };
  const filePath = join(__dirname, `../../curricula/curriculum.${cohortId}.json`);
  await fs.mkdir(join(__dirname, '../../curricula'), { recursive: true });
  await fs.writeFile(filePath, JSON.stringify(cohortCurriculum, null, 2), 'utf-8');
}

export async function getCohortCurriculum(cohortId: string): Promise<Curriculum | null> {
  const filePath = join(__dirname, `../../curricula/curriculum.${cohortId}.json`);
  try {
    const data = await fs.readFile(filePath, 'utf-8');
    return JSON.parse(data);
  } catch (err) {
    return null;
  }
}

export async function updateCohortCurriculum(cohortId: string, curriculum: Curriculum): Promise<void> {
  const filePath = join(__dirname, `../../curricula/curriculum.${cohortId}.json`);
  await fs.writeFile(filePath, JSON.stringify(curriculum, null, 2), 'utf-8');
}
