provider "aws" {
  region = var.aws_region
}

# VPC Configuration
resource "aws_vpc" "farmaai_vpc" {
  cidr_block           = "10.0.0.0/16"
  enable_dns_hostnames = true
  enable_dns_support   = true

  tags = {
    Name        = "farmaai-production-vpc"
    Environment = "Production"
  }
}

# ECS Cluster
resource "aws_ecs_cluster" "farmaai_cluster" {
  name = "farmaai-production-cluster"

  setting {
    name  = "containerInsights"
    value = "enabled"
  }
}

# RDS PostgreSQL Database
resource "aws_db_instance" "farmaai_db" {
  identifier           = "farmaai-prod-db"
  engine               = "postgres"
  engine_version       = "15.3"
  instance_class       = "db.t4g.medium"
  allocated_storage    = 50
  storage_type         = "gp3"
  username             = var.db_username
  password             = var.db_password
  publicly_accessible  = false
  skip_final_snapshot  = false
  
  tags = {
    Environment = "Production"
  }
}

# ElastiCache Redis
resource "aws_elasticache_cluster" "farmaai_redis" {
  cluster_id           = "farmaai-prod-redis"
  engine               = "redis"
  node_type            = "cache.t4g.micro"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
  port                 = 6379
}

# CloudFront Distribution for Frontend
resource "aws_cloudfront_distribution" "frontend_cdn" {
  # ... Configuración de S3 y OAI
  enabled             = true
  is_ipv6_enabled     = true
  default_root_object = "index.html"
  
  restrictions {
    geo_restriction {
      restriction_type = "none"
    }
  }

  viewer_certificate {
    cloudfront_default_certificate = true
  }
}
