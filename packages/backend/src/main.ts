import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { TimeoutInterceptor } from './common/interceptors/timeout.interceptor';

async function bootstrap() {
  console.log('Starting Memora backend..');
  const app = await NestFactory.create(AppModule);

  app.useGlobalInterceptors(new TimeoutInterceptor(60000));

  app.enableCors();

  await app.listen(process.env.PORT ?? 3000);
}
bootstrap();
