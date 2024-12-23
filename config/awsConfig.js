const { ECSClient } = require('@aws-sdk/client-ecs');
const { SSMClient } = require('@aws-sdk/client-ssm');

const REGION = process.env.AWS_REGION || 'ap-south-1';

// Create clients with region and optional credentials
const ecsClient = new ECSClient({ 
  region: REGION,
});

const ssmClient = new SSMClient({ 
  region: REGION 
});

// Export clients as an object
module.exports = {
  ecsClient,
  ssmClient
};