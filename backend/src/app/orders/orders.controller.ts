import {
  Body,
  Controller,
  Get,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from '@nestjs/common';

import { User } from 'src/common/decorators/user.decorator';
import type { UserInfo } from 'src/common/decorators/user.decorator';
import { Roles } from 'src/common/guards/access-control/roles.decorator';
import { ParseParamsPaginationPipe } from 'src/common/pipes/parse-params-pagination.pipe';
import { CheckoutDto, PreviewCheckoutDto } from './dto/checkout.dto';
import { UpdateOrderStatusDto } from './dto/update-order-status.dto';
import { GetOrdersPaginationDto } from './dto/get-order.dto';
import { OrdersService } from './orders.service';

@Controller('orders')
export class OrdersController {
  constructor(private readonly ordersService: OrdersService) {}

  @Post('preview')
  @Roles('client')
  preview(@Body() dto: PreviewCheckoutDto, @User() user: UserInfo) {
    return this.ordersService.previewCheckout(user.userID, dto);
  }

  @Post('checkout')
  @Roles('client')
  checkout(@Body() dto: CheckoutDto, @User() user: UserInfo) {
    return this.ordersService.checkout(user.userID, dto);
  }

  @Get('mine')
  @Roles('client')
  mine(@User() user: UserInfo) {
    return this.ordersService.listMine(user.userID);
  }

  @Get('admin/all')
  @Roles('admin')
  all(
    @Query(new ParseParamsPaginationPipe()) query: GetOrdersPaginationDto,
    @User() user: UserInfo,
  ) {
    return this.ordersService.listAll(query, user);
  }

  @Get(':id')
  @Roles('client', 'admin')
  get(@Param('id', ParseUUIDPipe) id: string, @User() user: UserInfo) {
    return this.ordersService.getById(id, user);
  }

  @Patch(':id/status')
  @Roles('client', 'admin')
  updateStatus(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() dto: UpdateOrderStatusDto,
    @User() user: UserInfo,
  ) {
    return this.ordersService.updateStatus(id, dto, user);
  }
}
