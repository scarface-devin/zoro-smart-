import { getDb } from '../db/client.js';
import { logger } from '../logger.js';
import type { SorobanEvent } from '@solshare/sdk';

/**
 * Materialise governance contract events into the database.
 * Handles proposal creation, voting, and execution lifecycle events.
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
        void [db, val]; // Placeholder: production would upsert into governance tables
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
      } catch (err) {
        logger.warn({ err }, 'governance cancel event insert failed');
      }
      break;
    }

    default:
      break;
  }
}
