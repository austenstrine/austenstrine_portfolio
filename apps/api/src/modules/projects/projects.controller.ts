import { Body, Controller, Get, Post, UseGuards } from '@nestjs/common';
import { ApiTags } from '@nestjs/swagger';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CreateProjectDto } from './dto/create-project.dto';
import { ProjectsService } from './projects.service';

@ApiTags('projects')
@Controller('projects')
export class ProjectsController {
	constructor(private readonly projectsService: ProjectsService) {}

	@Get()
	list() {
		return this.projectsService.list();
	}

	@Post()
	@UseGuards(JwtAuthGuard)
	create(@Body() payload: CreateProjectDto) {
		return this.projectsService.create(payload);
	}
}
