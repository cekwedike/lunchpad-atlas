import { Controller, Post, Param, Get, Body, Put } from '@nestjs/common';
import { createCohortCurriculum, getCohortCurriculum, updateCohortCurriculum } from './cohortCurriculumUtils';
import type { Curriculum } from '../../../shared/curriculum.template';

@Controller('curricula')
export class CurriculaController {
  @Post(':cohortId')
  async create(@Param('cohortId') cohortId: string) {
    await createCohortCurriculum(cohortId);
    return { message: 'Curriculum created', cohortId };
  }

  @Get(':cohortId')
  async get(@Param('cohortId') cohortId: string) {
    const curriculum = await getCohortCurriculum(cohortId);
    if (!curriculum) {
      return { message: 'Curriculum not found', cohortId };
    }
    return curriculum;
  }

  @Put(':cohortId')
  async update(@Param('cohortId') cohortId: string, @Body() curriculum: Curriculum) {
    await updateCohortCurriculum(cohortId, curriculum);
    return { message: 'Curriculum updated', cohortId };
  }
}
