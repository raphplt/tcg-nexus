import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  Patch,
  Post,
  Query,
  UseGuards,
} from "@nestjs/common";
import { ApiBearerAuth, ApiTags } from "@nestjs/swagger";
import { Public } from "../auth/decorators/public.decorator";
import { Roles } from "../auth/decorators/roles.decorator";
import { JwtAuthGuard } from "../auth/guards/jwt-auth.guard";
import { RolesGuard } from "../auth/guards/roles.guard";
import { UserRole } from "../common/enums/user";
import { CreateSealedProductDto } from "./dto/create-sealed-product.dto";
import { SealedProductFilterDto } from "./dto/sealed-product-filter.dto";
import { UpdateSealedProductDto } from "./dto/update-sealed-product.dto";
import { SealedProductService } from "./sealed-product.service";

@ApiTags("sealed-products")
@Controller("sealed-products")
export class SealedProductController {
  constructor(private readonly sealedProductService: SealedProductService) {}

  @Get()
  @Public()
  findAll(@Query() filter: SealedProductFilterDto) {
    return this.sealedProductService.findAll(filter);
  }

  @Get("paginated")
  @Public()
  findAllPaginated(@Query() filter: SealedProductFilterDto) {
    return this.sealedProductService.findAllPaginated(filter);
  }

  @Get(":id")
  @Public()
  findOne(@Param("id") id: string) {
    return this.sealedProductService.findOne(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Post()
  create(@Body() dto: CreateSealedProductDto) {
    return this.sealedProductService.create(dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Patch(":id")
  update(@Param("id") id: string, @Body() dto: UpdateSealedProductDto) {
    return this.sealedProductService.update(id, dto);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN, UserRole.MODERATOR)
  @Delete(":id")
  remove(@Param("id") id: string) {
    return this.sealedProductService.remove(id);
  }

  @UseGuards(JwtAuthGuard, RolesGuard)
  @ApiBearerAuth()
  @Roles(UserRole.ADMIN)
  @Post("seed")
  seed() {
    return this.sealedProductService.seedFromJson();
  }
}
