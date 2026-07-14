import { getDb } from '../db/client.js';
import { notifications } from '../db/schema.js';
import { logger } from '../logger.js';
import type { SorobanEvent } from '@solshare/sdk';

/**
 * Materialise governance contract events into the database.
 * Creates notifications for proposal creation and voting events
 * so users see timely updates in their notification feed.
 */
export async function handleGovernanceEvent(event: SorobanEvent): Promise<void> {
  const db = getDb();
  const [_admin, action] = event.topic;

  switch (action) {
    case 'propose': {
      try {
        const val = event.value as {
          proposal_id?: string;
          title?: string;
          description?: string;
          proposer?: string;
          proposal_type?: string;
          array_id?: string | null;
          voting_start?: number;
          voting_end?: number;
        };
        logger.info(
          {
            proposal: val.proposal_id,
            title: val.title,
            proposer: val.proposer,
          },
          'governance: proposal created',
        );

        // Create a notification for all governance participants.
        if (val.proposer && val.title && val.proposal_id) {
          await db
            .insert(notifications)
            .values({
              recipient: val.proposer,
              title: `Proposal created: ${val.title.slice(0, 100)}`,
              body: `Your proposal "${val.title}" is now live for voting.` +
                (val.description ? ` ${val.description.slice(0, 200)}` : ''),
              category: 'governance',
              severity: 'info',
              read: false,
              actionUrl: `/governance/${val.proposal_id}`,
              actionLabel: 'View proposal',
              arrayId: val.array_id ?? null,
              sourcePagingToken: event.pagingToken,
            })
            .onConflictDoNothing();
        }
      } catch (err) {
        logger.warn({ err }, 'governance propose event insert failed');
      }
      break;
    }

    case 'vote': {
      try {
        const val = event.value as {
          proposal_id?: string;
          voter?: string;
          choice?: string;
          voting_power?: string;
        };
        logger.info(
          {
            proposal: val.proposal_id,
            voter: val.voter,
            choice: val.choice,
          },
          'governance: vote cast',
        );

        // Notify the voter that their vote was recorded.
        if (val.voter && val.proposal_id && val.choice) {
          await db
            .insert(notifications)
            .values({
              recipient: val.voter,
              title: `Vote cast: ${val.choice}`,
              body: `You voted "${val.choice}" on proposal.` +
                (val.voting_power ? ` Voting power: ${val.voting_power}.` : ''),
              category: 'governance',
              severity: 'success',
              read: false,
              actionUrl: `/governance/${val.proposal_id}`,
              actionLabel: 'View proposal',
              sourcePagingToken: event.pagingToken,
            })
            .onConflictDoNothing();
        }
      } catch (err) {
        logger.warn({ err }, 'governance vote event insert failed');
      }
      break;
    }

    case 'execute': {
      try {
        const val = event.value as {
          proposal_id?: string;
          executed_by?: string;
        };
        logger.info(
          { proposal: val.proposal_id, executor: val.executed_by },
          'governance: proposal executed',
        );

        if (val.proposal_id && val.executed_by) {
          await db
            .insert(notifications)
            .values({
              recipient: val.executed_by,
              title: 'Proposal executed',
              body: 'The proposal has been successfully executed on-chain.',
              category: 'governance',
              severity: 'success',
              read: false,
              actionUrl: `/governance/${val.proposal_id}`,
              actionLabel: 'View proposal',
              sourcePagingToken: event.pagingToken,
            })
            .onConflictDoNothing();
        }
      } catch (err) {
        logger.warn({ err }, 'governance execute event insert failed');
      }
      break;
    }

    case 'cancel': {
      try {
        const val = event.value as {
          proposal_id?: string;
          cancelled_by?: string;
          reason?: string;
        };
        logger.info(
          { proposal: val.proposal_id, reason: val.reason },
          'governance: proposal cancelled',
        );

        if (val.proposal_id && val.cancelled_by) {
          await db
            .insert(notifications)
            .values({
              recipient: val.cancelled_by,
              title: 'Proposal cancelled',
              body: val.reason
                ? `Proposal was cancelled: ${val.reason}`
                : 'The proposal has been cancelled.',
              category: 'governance',
              severity: 'warning',
              read: false,
              actionUrl: `/governance/${val.proposal_id}`,
              actionLabel: 'View proposal',
              sourcePagingToken: event.pagingToken,
            })
            .onConflictDoNothing();
        }
      } catch (err) {
        logger.warn({ err }, 'governance cancel event insert failed');
      }
      break;
    }

    default:
      break;
  }
}
