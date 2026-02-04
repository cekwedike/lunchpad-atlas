import { Controller, Get, Post, Param, Query, UseGuards, Request } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { ResourcesService } from './resources.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { ResourceFilterDto } from './dto/resource.dto';

@ApiTags('resources')
@Controller('resources')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
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
