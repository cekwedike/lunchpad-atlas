import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ResourcesService } from './resources.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceQueryDto } from './dto/resource.dto';

@Controller('resources')
@UseGuards(JwtAuthGuard)
export class ResourcesController {
  constructor(private resourcesService: ResourcesService) {}

  @Get()
  getResources(@Request() req, @Query() query: ResourceQueryDto) {
    return this.resourcesService.getResources(req.user.id, query);
  }

  @Get(':id')
  getResourceById(@Param('id') id: string, @Request() req) {
    return this.resourcesService.getResourceById(id, req.user.id);
  }

  @Post(':id/complete')
  markComplete(@Param('id') id: string, @Request() req) {
    return this.resourcesService.markComplete(id, req.user.id);
  }
}
