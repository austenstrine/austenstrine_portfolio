# AWS and CI/CD Notes (Nest + Next + Docker)

## Recommended AWS Target

- Frontend: S3 + CloudFront or Amplify Hosting
- API: ECS Fargate or Lambda (Nest on Lambda via adapter)
- PostgreSQL: RDS PostgreSQL
- Redis: ElastiCache Redis
- OpenSearch: Amazon OpenSearch Service

Because you mentioned AWS nodes, ECS Fargate is typically the closest fit for long-running Node services.

## Suggested Deployment Pattern

1. Build and test in GitHub Actions.
2. Build Docker images for API and web.
3. Push images to ECR.
4. Deploy ECS services with updated image tags.
5. Run Prisma migrations during deployment pipeline.

## GitHub Actions Enhancements to Add Next

- Add matrix job for API/web test separation.
- Add ECR login and image push.
- Add deployment job with environment protections.
- Add manual production approval gate.

## Secrets You Will Need

- AWS_ACCESS_KEY_ID
- AWS_SECRET_ACCESS_KEY
- AWS_REGION
- ECR_REPOSITORY_API
- ECR_REPOSITORY_WEB
- DATABASE_URL (or SSM/Secrets Manager reference)
- REDIS_URL
- OPENSEARCH_NODE

## Interview Talking Points

- Why ECS Fargate instead of EC2 for this stack
- How migrations are handled safely in CI/CD
- How health checks and rolling deploys reduce downtime
- How Redis and OpenSearch complement PostgreSQL
