const { ecsClient } = require('../config/awsConfig');
const { RunTaskCommand, DescribeTasksCommand } = require('@aws-sdk/client-ecs');
const { EC2Client, DescribeSubnetsCommand } = require('@aws-sdk/client-ec2');

class ECSLabProvisioner {
  constructor(ecsClient, ec2Client) {
    this.ecsClient = ecsClient;
    this.ec2Client = ec2Client;
  }

  async getSubnets() {
    try {
      const data = await this.ec2Client.send(new DescribeSubnetsCommand({}));
      return data.Subnets
        .filter(subnet => subnet.State === 'available')
        .map(subnet => subnet.SubnetId)
        .slice(0, 2);
    } catch (error) {
      console.error('Error fetching subnets:', error);
      throw error;
    }
  }

  async provisionEcsLab(cpu, ram, setupScript) {
    try {
      const subnets = await this.getSubnets();

      const params = {
        cluster: process.env.ECS_CLUSTER_NAME || 'devcluster',
        taskDefinition: process.env.ECS_TASK_DEFINITION || 'arn:aws:ecs:ap-south-1:294371756294:task-definition/lab:1',
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
            }
          ],
          taskRoleArn: process.env.ECS_TASK_ROLE_ARN || 'arn:aws:iam::294371756294:role/ecsTaskExecutionRole',
        },
        enableExecuteCommand: true,
      };

      const data = await this.ecsClient.send(new RunTaskCommand(params));

      if (!data.tasks || data.tasks.length === 0) {
        throw new Error('No tasks were created');
      }

      // Wait for task to be in RUNNING state
      const taskId = data.tasks[0].taskArn;
      // await this.waitForTaskRunning(taskId);

      console.log('ECS task provisioned:', taskId);
      return taskId;
    } catch (err) {
      console.error('Error provisioning ECS task:', err);
      throw err;
    }
  }

}


module.exports = new ECSLabProvisioner(ecsClient, new EC2Client({ region: process.env.AWS_REGION || 'ap-south-1' }));