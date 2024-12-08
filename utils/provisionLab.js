const { ecsClient } = require('../config/awsConfig');
const { RunTaskCommand } = require('@aws-sdk/client-ecs');
const { EC2Client, DescribeSubnetsCommand } = require('@aws-sdk/client-ec2');

async function getSubnets() {
  const ec2Client = new EC2Client({ region: 'ap-south-1' });
  const data = await ec2Client.send(new DescribeSubnetsCommand({}));
  return data.Subnets.map(subnet => subnet.SubnetId);
}

async function provisionEcsLab(cpu, ram, setupScript) {
  const subnets = await getSubnets(); // Dynamically fetch subnets
  const params = {
    cluster: 'devcluster',
    taskDefinition: 'arn:aws:ecs:ap-south-1:294371756294:task-definition/lab:1',
    count: 1,
    launchType: 'FARGATE',
    networkConfiguration: {
      awsvpcConfiguration: {
        subnets: subnets,
        assignPublicIp: 'ENABLED',
      },
    },
    overrides: {
      containerOverrides: [
        {
          name: 'ubuntu',
          environment: [
            { name: 'CPU', value: cpu.toString() },
            { name: 'RAM', value: ram.toString() },
          ],
          essential: true,
          command: ["tail", "-f", "/dev/null"],
        },
        
      ],
      taskRoleArn: 'arn:aws:iam::294371756294:role/ecsTaskExecutionRole', // Add the correct role here
    },
    enableExecuteCommand: true, // Enable Execute Command here
  };

  try {
    const data = await ecsClient.send(new RunTaskCommand(params));
    console.log('ECS task provisioned:', data.tasks[0].taskArn);
    return data.tasks[0].taskArn;
  } catch (err) {
    console.error('Error provisioning ECS task:', err);
    throw err;
  }
}

module.exports = { provisionEcsLab };
