import { Module } from '@nestjs/common';
import { CurriculaController } from './curricula.controller';

@Module({
  controllers: [CurriculaController],
})
export class CurriculaModule {}
