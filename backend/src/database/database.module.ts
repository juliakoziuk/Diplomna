import { Module } from '@nestjs/common';
import { SequelizeModule } from '@nestjs/sequelize';
import { ConfigModule, ConfigService } from '@nestjs/config';

@Module({
  imports: [
    SequelizeModule.forRootAsync({
      imports: [ConfigModule],
      inject: [ConfigService],
      useFactory: (configService: ConfigService) => ({
        dialect: 'postgres',
        uri: configService.get<string>('DATABASE_URL'),
        // Set DATABASE_SSL=true for hosted Postgres reached over the public internet
        dialectOptions:
          configService.get<string>('DATABASE_SSL') === 'true'
            ? { ssl: { require: true, rejectUnauthorized: false } }
            : {},
        autoLoadModels: true,
        synchronize: false,
        logging: false,
      }),
    }),
  ],
})
export class DatabaseModule {}
