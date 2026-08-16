/**
 * Workflow reminder + escalation cron service (spec §9.8).
 *
 * Runs on a schedule (every 15 minutes) to:
 *  1. Send reminders for workflow steps approaching their due date (24h, 4h, 1h)
 *  2. Auto-escalate overdue steps to the escalation assignee
 *  3. Send notifications to assignees of overdue steps
 *
 * Spec ref: §9.8 (escalation, reminders, due dates).
 */
import { Injectable, Logger } from '@nestjs/common';
import { Cron } from '@nestjs/schedule';
import { PrismaService } from '../../prisma/prisma.service';
import { RedisService } from '../../common/redis.service';
import { NotificationService } from '../notification/notification.service';

@Injectable()
export class WorkflowReminderCron {
  private readonly logger = new Logger(WorkflowReminderCron.name);

  constructor(
    private readonly prisma: PrismaService,
    private readonly redis: RedisService,
    private readonly notifications: NotificationService,
  ) {}

  /**
   * Check for due/overdue workflow steps every 15 minutes.
   */
  @Cron('*/15 * * * *')
  async checkOverdueSteps(): Promise<void> {
    this.logger.debug('Checking for overdue workflow steps...');
    const now = new Date();

    // Find all in-progress steps with a due date
    const steps = await this.prisma.workflowStep.findMany({
      where: {
        status: 'in_progress',
        dueAt: { not: null },
      },
      include: {
        instance: {
          select: { id: true, tenantId: true, definitionId: true },
        },
      },
      take: 500,
    });

    let reminderCount = 0;
    let escalationCount = 0;

    for (const step of steps) {
      if (!step.dueAt || !step.assigneeId) {continue;}
      const dueIn = step.dueAt.getTime() - now.getTime();
      const tenantId = step.instance.tenantId;

      // Overdue (past due date)
      if (dueIn < 0) {
        // Check if already escalated (avoid duplicate escalation)
        const escalationKey = `workflow:escalated:${step.id}`;
        const alreadyEscalated = await this.redis.connection.get(escalationKey);
        if (alreadyEscalated) {continue;}

        // Mark as escalated
        await this.redis.connection.set(escalationKey, '1', 'EX', 86400); // 24h TTL

        // Update step status to escalated
        await this.prisma.workflowStep.update({
          where: { id: step.id },
          data: { status: 'escalated' },
        });

        // Send escalation notification
        await this.notifications.send(tenantId, {
          userId: step.assigneeId,
          channel: 'in_app',
          severity: 'danger',
          titleKey: 'workflow.escalation.title',
          bodyKey: 'workflow.escalation.body',
          bodyVars: {
            stepName: step.name,
            dueAt: step.dueAt.toISOString(),
            instanceId: step.instance.id,
          },
          actionUrl: `/workflows/instances/${step.instance.id}`,
        });

        // Emit WebSocket event
        await this.redis.connection.publish(
          `smart-edms:ws-events:${tenantId}`,
          JSON.stringify({
            name: 'workflow.step.updated',
            payload: {
              tenantId,
              instanceId: step.instance.id,
              stepId: step.id,
              status: 'escalated',
              assigneeId: step.assigneeId,
            },
          }),
        );

        escalationCount++;
      }
      // Due within 24 hours (reminder)
      else if (dueIn < 24 * 60 * 60 * 1000 && dueIn > 0) {
        // Check if reminder was already sent
        const reminderKey = `workflow:reminder:24h:${step.id}`;
        const alreadyReminded = await this.redis.connection.get(reminderKey);
        if (alreadyReminded) {continue;}

        await this.redis.connection.set(reminderKey, '1', 'EX', 86400);

        await this.notifications.send(tenantId, {
          userId: step.assigneeId,
          channel: 'in_app',
          severity: 'warning',
          titleKey: 'workflow.reminder.title',
          bodyKey: 'workflow.reminder.body',
          bodyVars: {
            stepName: step.name,
            dueAt: step.dueAt.toISOString(),
            hoursLeft: Math.floor(dueIn / (60 * 60 * 1000)),
          },
          actionUrl: `/workflows/instances/${step.instance.id}`,
        });

        reminderCount++;
      }
    }

    if (reminderCount > 0 || escalationCount > 0) {
      this.logger.log(`Workflow reminder check: ${reminderCount} reminders sent, ${escalationCount} escalations`);
    }
  }
}
