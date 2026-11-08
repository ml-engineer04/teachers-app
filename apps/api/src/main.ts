import { NestFactory } from '@nestjs/core';
import { ValidationPipe } from '@nestjs/common';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import helmet from 'helmet';
import { AppModule } from './app.module';

async function bootstrap() {
  const app = await NestFactory.create(AppModule);

  // Security Headers via Helmet
  app.use(helmet());

  // CORS Configuration (Strict origin policy with mobile & admin portal support)
  app.enableCors({
    origin: (origin, callback) => {
      // Allow non-browser requests (mobile apps, Postman, server-to-server)
      if (!origin) return callback(null, true);

      const allowedOrigins = [
        'http://localhost:5173',
        'http://localhost:4000',
        'http://localhost:8081',
        'http://127.0.0.1:5173',
        'http://127.0.0.1:4000',
        'http://127.0.0.1:8081',
        process.env.ADMIN_PANEL_URL,
        process.env.API_BASE_URL,
      ].filter(Boolean);

      if (allowedOrigins.some((allowed) => allowed && origin.startsWith(allowed as string))) {
        return callback(null, true);
      }

      // Allow local development subnet
      if (process.env.NODE_ENV !== 'production') {
        return callback(null, true);
      }

      return callback(new Error('Not allowed by CORS'));
    },
    methods: 'GET,HEAD,PUT,PATCH,POST,DELETE,OPTIONS',
    credentials: true,
  });

  // Global Input Validation & Transformation
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      transform: true,
      forbidNonWhitelisted: true,
    }),
  );

  // OpenAPI / Swagger Documentation (§2 Spec)
  const config = new DocumentBuilder()
    .setTitle('SmartTeacherBook API')
    .setDescription('REST API for SmartTeacherBook Mobile App and Admin Web Panel')
    .setVersion('1.0.0')
    .addBearerAuth(
      {
        type: 'http',
        scheme: 'bearer',
        bearerFormat: 'JWT',
        name: 'Authorization',
        description: 'Enter JWT Access Token',
        in: 'header',
      },
      'JWT-auth',
    )
    .build();

  const document = SwaggerModule.createDocument(app, config);
  SwaggerModule.setup('api/docs', app, document);

  const port = process.env.PORT || 4000;
  await app.listen(port);
  console.log(`🚀 SmartTeacherBook API is running on http://localhost:${port}`);
  console.log(`📚 Swagger documentation available at http://localhost:${port}/api/docs`);
}

bootstrap();
