// lab-system/config/awsConfig.js

// Import the required AWS SDK clients
const { EC2Client } = require('@aws-sdk/client-ec2');
const { S3Client } = require('@aws-sdk/client-s3');
const { ECSClient } = require('@aws-sdk/client-ecs');
const { DynamoDBClient } = require('@aws-sdk/client-dynamodb');
const { RDSClient } = require('@aws-sdk/client-rds');

// AWS Configuration
const REGION = 'ap-south-1'; // specify your AWS region

// Initialize clients with region
const ec2Client = new EC2Client({ region: REGION });
const s3Client = new S3Client({ region: REGION });
const ecsClient = new ECSClient({ region: REGION });
const dynamoDBClient = new DynamoDBClient({ region: REGION });
const rdsClient = new RDSClient({ region: REGION });

// Export clients for use in other parts of the application
module.exports = {
  ec2Client,
  s3Client,
  ecsClient,
  dynamoDBClient,
  rdsClient
};
