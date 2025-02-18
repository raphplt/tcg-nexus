import { Module } from '@nestjs/common';
import { TypeOrmModule } from '@nestjs/typeorm';
import { UserModule } from './user/user.module';
import { ConfigModule } from '@nestjs/config';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { User } from './user/entities/user.entity';
import { TcgDexModule } from './tcg-dex/tcg-dex.module';

@Module({
  imports: [
    ConfigModule.forRoot(),
    TypeOrmModule.forRoot({
      type: 'mysql',
      host: 'localhost',
      port: 8889,
      username: 'root',
      password: 'root',
      database: 'TcgNexus',
      autoLoadEntities: true,
      entities: [User],
      synchronize: true,
    }),
    UserModule,
    TcgDexModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
