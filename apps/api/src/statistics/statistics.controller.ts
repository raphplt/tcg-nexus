import {
  Body,
  Controller,
  Delete,
  Get,
  Param,
  ParseIntPipe,
  Patch,
  Post,
} from "@nestjs/common";
import { ApiOperation, ApiParam, ApiResponse, ApiTags } from "@nestjs/swagger";
import { CreateStatisticDto } from "./dto/create-statistic.dto";
import { UpdateStatisticDto } from "./dto/update-statistic.dto";
import { StatisticsService } from "./statistics.service";

/**
 * Controller managing match performance statistics.
 */
@ApiTags("statistics")
@Controller("statistics")
export class StatisticsController {
  constructor(private readonly statisticsService: StatisticsService) {}

  /**
   * Records a new player match statistic.
   *
   * @param createStatisticDto - Statistic details.
   * @returns Created statistic record.
   */
  @Post()
  @ApiOperation({ summary: "Record player match performance statistics" })
  @ApiResponse({
    status: 201,
    description: "Statistics successfully recorded.",
  })
  create(@Body() createStatisticDto: CreateStatisticDto) {
    return this.statisticsService.create(createStatisticDto);
  }

  /**
   * Retrieves all recorded match statistics.
   *
   * @returns List of statistics records.
   */
  @Get()
  @ApiOperation({ summary: "Retrieve all player match statistics" })
  @ApiResponse({ status: 200, description: "List of match statistics." })
  findAll() {
    return this.statisticsService.findAll();
  }

  /**
   * Retrieves specific match statistics by ID.
   *
   * @param id - Statistic identifier.
   * @returns Matching statistic record.
   */
  @Get(":id")
  @ApiOperation({ summary: "Retrieve match statistics by ID" })
  @ApiParam({ name: "id", description: "Statistic identifier", example: 1 })
  @ApiResponse({ status: 200, description: "Matching statistic record." })
  findOne(@Param("id") id: string) {
    return this.statisticsService.findOne(+id);
  }

  /**
   * Updates existing match statistics by ID.
   *
   * @param id - Statistic identifier.
   * @param updateStatisticDto - Fields to update.
   * @returns Updated statistic record.
   */
  @Patch(":id")
  @ApiOperation({ summary: "Update match statistics by ID" })
  @ApiParam({ name: "id", description: "Statistic identifier", example: 1 })
  @ApiResponse({ status: 200, description: "Updated statistic record." })
  update(
    @Param("id") id: string,
    @Body() updateStatisticDto: UpdateStatisticDto,
  ) {
    return this.statisticsService.update(+id, updateStatisticDto);
  }

  /**
   * Deletes a match statistic entry by ID.
   *
   * @param id - Statistic identifier.
   * @returns Deletion outcome.
   */
  @Delete(":id")
  @ApiOperation({ summary: "Delete a match statistic entry by ID" })
  @ApiParam({ name: "id", description: "Statistic identifier", example: 1 })
  @ApiResponse({ status: 200, description: "Statistic successfully deleted." })
  remove(@Param("id") id: string) {
    return this.statisticsService.remove(+id);
  }
}
