import { Body, Controller, Get, Post, Query } from '@nestjs/common';

import { User } from 'src/common/decorators/user.decorator';
import type { UserInfo } from 'src/common/decorators/user.decorator';
import {
  AdminRoles,
  Roles,
} from 'src/common/guards/access-control/roles.decorator';
import { CustomerReportQueryDto } from './dto/customer-report.dto';
import { AnalyticsReportQueryDto } from './dto/analytics-report.dto';
import { ReconciliationQueryDto } from './dto/reconciliation-query.dto';
import { UpdateFinanceConfigDto } from './dto/finance-config.dto';
import { ReportsService } from './reports.service';

@Controller()
export class ReportsController {
  constructor(private readonly reportsService: ReportsService) {}

  @Get('admin/reports/finance-config')
  @Roles('admin')
  @AdminRoles('SUPER_ADMIN')
  getFinanceConfig() {
    return {
      current: this.reportsService.getCurrentFinanceConfig(),
      history: this.reportsService.getFinanceConfigHistory(),
    };
  }

  @Post('admin/reports/finance-config')
  @Roles('admin')
  @AdminRoles('SUPER_ADMIN')
  updateFinanceConfig(@Body() dto: UpdateFinanceConfigDto) {
    return this.reportsService.saveNewFinanceConfig({
      ...dto,
      note: dto.note ?? undefined,
    });
  }

  @Get('admin/reports/analytics')
  @Roles('admin')
  @AdminRoles('SUPER_ADMIN')
  adminAnalytics(@Query() query: AnalyticsReportQueryDto) {
    return this.reportsService.analyticsOverview(query);
  }

  @Get('admin/reports/reconciliation')
  @Roles('admin')
  @AdminRoles('SUPER_ADMIN')
  reconciliation(@Query() query: ReconciliationQueryDto) {
    return this.reportsService.reconciliation(query);
  }

  @Get('admin/reports/customers')
  @Roles('admin')
  adminCustomers(
    @Query() query: CustomerReportQueryDto,
    @User() user: UserInfo,
  ) {
    return this.reportsService.customerReport(user, query);
  }

  @Get('admin/reports/customer-analytics')
  @Roles('admin', 'employee')
  customerAnalytics(
    @Query()
    query: {
      page?: number;
      itemPerPage?: number;
      search?: string;
      ageGroup?: string;
    },
  ) {
    return this.reportsService.customerDemographicsAndPreferences(query);
  }

  @Get('vendor/reports/customers')
  @Roles('vendor')
  vendorCustomers(
    @Query() query: CustomerReportQueryDto,
    @User() user: UserInfo,
  ) {
    return this.reportsService.customerReport(user, query);
  }
}
