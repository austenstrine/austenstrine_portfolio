import './load-env';
import { ValidationPipe } from '@nestjs/common';
import { NestFactory } from '@nestjs/core';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import cookieParser from 'cookie-parser';
import { AppModule } from './app.module';

async function bootstrap() {
	const isProduction = process.env.NODE_ENV === 'production';
	const webUrl = process.env.WEB_URL?.trim();

	if(isProduction && !webUrl) {
		throw new Error('WEB_URL is required when NODE_ENV=production (CORS fail-closed).');
	}

	const app = await NestFactory.create(AppModule, { rawBody: true });

	// Nest sits behind nginx locally and on live. Without this, req.ip is the
	// proxy hop for every client, so ThrottlerGuard shares one bucket site-wide
	// and seller rapid-nav / Load more can starve /auth/me into a fake sign-out.
	const trustProxy = process.env.TRUST_PROXY?.trim();
	app.getHttpAdapter().getInstance().set(
		'trust proxy',
		trustProxy === undefined || trustProxy === ''
			? 1
			: trustProxy === 'true'
				? true
				: Number(trustProxy) || 1,
	);

	app.setGlobalPrefix('api');
	app.enableCors({
		origin: webUrl ?? 'http://localhost:3000',
		credentials: true,
	});
	app.use(cookieParser());
	app.useGlobalPipes(
		new ValidationPipe({
			whitelist: true,
			forbidNonWhitelisted: true,
			transform: true,
		}),
	);

	// Production stays off. Non-prod on unless ENABLE_SWAGGER=false.
	const enableSwagger =
		!isProduction
		&& process.env.ENABLE_SWAGGER !== 'false';

	if(enableSwagger) {
		const config = new DocumentBuilder()
			.setTitle('Portfolio API')
			.setDescription('Portfolio backend with NestJS, Prisma, Redis, and OpenSearch')
			.setVersion('1.0.0')
			.build();

		const document = SwaggerModule.createDocument(app, config);
		SwaggerModule.setup('api/docs', app, document);
	}

	const port = Number(process.env.PORT ?? 4000);
	await app.listen(port);
}

bootstrap();
