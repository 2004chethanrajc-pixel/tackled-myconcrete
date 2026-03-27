/**
 * Seed: Push Tokens
 * Description: Seeds the push_tokens table with device push notification tokens
 */

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('push_tokens').del();
  
  // Inserts seed entries
  return knex('push_tokens').insert([
    {
      id: 'd47ddf2e-12db-418a-a32e-b97e36e8591c',
      user_id: 'u2',
      push_token: 'ExponentPushToken[test123]',
      device_type: 'android',
      created_at: '2026-03-12 06:49:53',
      updated_at: '2026-03-12 06:49:53'
    },
    {
      id: 'bdad3af3-989b-4d39-984e-5a67f5b20644',
      user_id: 'u3',
      push_token: 'ExponentPushToken[g1BHB_P2v2YjUPmJcTh2a9]',
      device_type: 'android',
      created_at: '2026-03-12 08:45:18',
      updated_at: '2026-03-12 08:45:18'
    },
    {
      id: '596794a2-bf04-4826-9e09-e990cc69b846',
      user_id: 'u1',
      push_token: 'ExponentPushToken[eXp4wkHnLj7uOvaV66I8ig]',
      device_type: 'android',
      created_at: '2026-03-12 11:32:55',
      updated_at: '2026-03-12 11:32:55'
    },
    {
      id: 'a58e9ad4-25bb-422e-b017-1b2bc3f08791',
      user_id: 'u5',
      push_token: 'ExponentPushToken[SwosS7NxzeejWwYpApP0Um]',
      device_type: 'android',
      created_at: '2026-03-13 09:45:30',
      updated_at: '2026-03-13 10:11:58'
    }
  ]);
};
