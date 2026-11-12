import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthModule } from './auth/auth.module';
import { join } from 'path';
import { ConfigModule } from '@nestjs/config';
import { ServeStaticModule } from '@nestjs/serve-static';
import { ScheduleModule } from '@nestjs/schedule';
import { DatabaseModule } from './database/database.module';
import { VerifiableSearchModule } from './verifiable-search/verifiable-search.module';
import { BillingModule } from './billing/billing.module';
import { AnchorApiModule } from './anchor-api/anchor-api.module';

@Module({
  imports: [
    // Serves the built frontend. No `serveRoot`: with '/' the library builds the
    // SPA fallback path as '//*', so deep links like /pricing would 404 on refresh.
    ServeStaticModule.forRoot({
      rootPath: join(__dirname, '..', 'public'),
    }),
    ConfigModule.forRoot({
      isGlobal: true,
      envFilePath: ['.env.local', '.env'],
    }),
    DatabaseModule,
    AuthModule,
    ScheduleModule.forRoot(),
    VerifiableSearchModule,
    BillingModule,
    AnchorApiModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
