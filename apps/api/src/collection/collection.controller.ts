import {
  Controller,
  Get,
  Post,
  Put,
  Delete,
  Param,
  Query,
  Body,
  UseGuards
} from '@nestjs/common';
import { CollectionService } from './collection.service';
import { Collection } from './entities/collection.entity';
import { CreateCollectionDto } from './dto/create-collection.dto';
import { UpdateCollectionDto } from './dto/update-collection.dto';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { CurrentUser } from '../auth/decorators/current-user.decorator';
import { User } from '../user/entities/user.entity';
import {
  ApiTags,
  ApiBearerAuth,
  ApiOperation,
  ApiResponse
} from '@nestjs/swagger';
import { Public } from '../auth/decorators/public.decorator';

@ApiTags('collection')
@Controller('collection')
@UseGuards(JwtAuthGuard)
@ApiBearerAuth()
export class CollectionController {
  constructor(private readonly collectionService: CollectionService) {}

  @Get()
  @Public()
  @ApiOperation({ summary: 'Récupérer toutes les collections publiques' })
  @ApiResponse({
    status: 200,
    description: 'Liste des collections',
    type: [Collection]
  })
  findAll() {
    return this.collectionService.findAll();
  }

  @Get('paginated')
  @Public()
  @ApiOperation({ summary: 'Récupérer les collections avec pagination' })
  @ApiResponse({ status: 200, description: 'Collections paginées' })
  async findAllPaginated(
    @Query('page') page: number,
    @Query('limit') limit: number
  ) {
    return this.collectionService.findAllPaginated(page, limit);
  }

  @Get('user/:userId')
  @Public()
  @ApiOperation({ summary: "Récupérer les collections d'un utilisateur" })
  @ApiResponse({
    status: 200,
    description: "Collections de l'utilisateur",
    type: [Collection]
  })
  async findByUserId(@Param('userId') userId: string) {
    return this.collectionService.findByUserId(userId);
  }

  @Get(':id/items')
  @Public()
  @ApiOperation({ summary: 'Récupérer les items d\'une collection avec pagination et recherche' })
  @ApiResponse({
    status: 200,
    description: 'Items de la collection paginés',
  })
  @ApiResponse({ status: 404, description: 'Collection non trouvée' })
  async findCollectionItems(
    @Param('id') id: string,
    @Query('page') page?: string,
    @Query('limit') limit?: string,
    @Query('search') search?: string,
    @Query('sortBy') sortBy?: string,
    @Query('sortOrder') sortOrder?: 'ASC' | 'DESC'
  ) {
    const pageNumber = page ? parseInt(page, 10) : 1;
    const limitNumber = limit ? parseInt(limit, 10) : 10;
    return this.collectionService.findCollectionItemsPaginated(
      id,
      pageNumber,
      limitNumber,
      search,
      sortBy,
      sortOrder
    );
  }

  @Get(':id')
  @Public()
  @ApiOperation({ summary: 'Récupérer une collection par son ID' })
  @ApiResponse({
    status: 200,
    description: 'Collection trouvée',
    type: Collection
  })
  @ApiResponse({ status: 404, description: 'Collection non trouvée' })
  async findOneById(@Param('id') id: string): Promise<Collection> {
    return this.collectionService.findOneById(id);
  }

  @Post()
  @ApiOperation({ summary: 'Créer une nouvelle collection' })
  @ApiResponse({
    status: 201,
    description: 'Collection créée',
    type: Collection
  })
  async create(
    @Body() createCollectionDto: CreateCollectionDto,
    @CurrentUser() user: User
  ): Promise<Collection> {
    createCollectionDto.userId = user.id;
    return this.collectionService.create(createCollectionDto);
  }

  @Put(':id')
  @ApiOperation({ summary: 'Mettre à jour une collection' })
  @ApiResponse({
    status: 200,
    description: 'Collection mise à jour',
    type: Collection
  })
  @ApiResponse({ status: 404, description: 'Collection non trouvée' })
  @ApiResponse({
    status: 403,
    description: 'Non autorisé à modifier cette collection'
  })
  async update(
    @Param('id') id: string,
    @Body() updateCollectionDto: UpdateCollectionDto,
    @CurrentUser() user: User
  ): Promise<Collection> {
    return await this.collectionService.update(
      id,
      updateCollectionDto,
      user.id
    );
  }

  @Delete(':id')
  @ApiOperation({ summary: 'Supprimer une collection' })
  @ApiResponse({ status: 200, description: 'Collection supprimée' })
  @ApiResponse({ status: 404, description: 'Collection non trouvée' })
  @ApiResponse({
    status: 403,
    description: 'Non autorisé à supprimer cette collection'
  })
  async delete(
    @Param('id') id: string,
    @CurrentUser() user: User
  ): Promise<{ message: string }> {
    await this.collectionService.delete(id, user.id);
    return { message: 'Collection supprimée avec succès' };
  }

  @Get('my/collections')
  @ApiOperation({
    summary: "Récupérer les collections de l'utilisateur connecté"
  })
  @ApiResponse({
    status: 200,
    description: "Collections de l'utilisateur",
    type: [Collection]
  })
  async getMyCollections(@CurrentUser() user: User): Promise<Collection[]> {
    return this.collectionService.findByUserId(user.id.toString());
  }
}
