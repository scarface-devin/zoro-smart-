import type { FastifyInstance } from 'fastify';
import { z } from 'zod';
import { getClient } from '../lib/stellar.js';
import type { HolderYield } from '@solshare/shared';

const params = z.object({
  distributor: z.string().min(2),
  holder: z.string().min(2),
});

export async function yieldRoutes(app: FastifyInstance) {
  app.get<{ Params: { distributor: string; holder: string } }>(
    '/yield/:distributor/:holder',
    async (request, reply) => {
      const parse = params.safeParse(request.params);
      if (!parse.success) {
        return reply.code(400).send({ error: { code: 'BAD_REQUEST', message: parse.error.message } });
      }
      const { holder } = parse.data;
      const client = getClient();
      const claimable = await client.yieldDistributor.claimable(holder).catch(() => '0');
      const yps = await client.yieldDistributor.yieldPerShare().catch(() => '0');
      const resp: HolderYield = {
        holder,
        distributorId: parse.data.distributor,
        shares: '0',
        claimable,
        paidYieldPerShare: '0',
        globalYieldPerShare: yps,
      };
      return resp;
    },
  );
}
