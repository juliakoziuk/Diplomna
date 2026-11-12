import { config as loadEnv } from 'dotenv';
// .env.local (git-ignored) holds payment keys and wins over the committed .env
loadEnv({ path: ['.env.local', '.env'] });
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import * as cookieParser from 'cookie-parser';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';

import { BadRequestException, ValidationPipe } from '@nestjs/common';

async function bootstrap() {
  // rawBody: Stripe webhook signatures are computed over the exact bytes sent
  const app = await NestFactory.create(AppModule, { rawBody: true });
  app.enableCors({
    origin: ['http://localhost:5173', 'http://localhost:5174'],
    credentials: true,
    // all headers that client are allowed to use
    allowedHeaders: [
      'Accept',
      'Authorization',
      'Content-Type',
      'X-Requested-With',
    ],
    methods: ['GET', 'PUT', 'POST', 'DELETE', 'OPTIONS'],
  });
  app.use(cookieParser());
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      exceptionFactory: (errors) => {
        const formattedErrors = errors.reduce((accumulator, error) => {
          accumulator[error.property] = Object.values(error.constraints).join(
            ', ',
          );
          return accumulator;
        }, {});

        throw new BadRequestException(formattedErrors);
      },
    }),
  );

  // OpenAPI docs: UI at /docs, raw spec at /docs-json
  const openApi = new DocumentBuilder()
    .setTitle('AnchorProof API')
    .setDescription(
      'Anchor document hashes on a public ledger and get Merkle receipts, plus verifiable vector search. ' +
        'Two ways to authenticate: an API key (`Authorization: Bearer ap_test_…`) for the public Anchor API, ' +
        'and the httpOnly session cookie from POST /auth/login for the cabinet endpoints.',
    )
    .setVersion('1.0')
    .addBearerAuth(
      { type: 'http', scheme: 'bearer', description: 'API key created in the cabinet, e.g. ap_test_1a2b…' },
      'api-key',
    )
    .addCookieAuth('access_token', { type: 'apiKey', in: 'cookie', description: 'Set by POST /auth/login' }, 'session')
    .build();
  SwaggerModule.setup('docs', app, SwaggerModule.createDocument(app, openApi), {
    swaggerOptions: { persistAuthorization: true },
  });

  await app.listen(3000);
}
bootstrap();
