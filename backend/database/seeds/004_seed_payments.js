/**
 * Seed: Payments
 * Description: Seeds the payments table with payment records
 */

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('payments').del();
  
  // Inserts seed entries - Sample data (add more as needed from your dump)
  return knex('payments').insert([
    {
      id: '96ea59ac-2ffc-4eaf-bccf-734b845d28ef',
      project_id: 'e05ab828-6eef-4c8d-afa3-30db421a6f5a',
      payment_type: 'advance',
      amount: 20000.00,
      payment_method: 'cash',
      transaction_id: null,
      description: 'Advance payment',
      is_verified: true,
      verified_by: 'u7',
      verified_at: '2026-03-13 08:32:01',
      created_at: '2026-03-13 08:31:23'
    },
    {
      id: 'c26a2a04-ace6-42a7-bbc6-b3fe34111983',
      project_id: '135b0ded-37a4-4389-94e2-371aba6fc438',
      payment_type: 'advance',
      amount: 10.00,
      payment_method: 'cash',
      transaction_id: null,
      description: 'Advance payment',
      is_verified: true,
      verified_by: 'u7',
      verified_at: '2026-02-28 05:27:30',
      created_at: '2026-02-28 05:27:12'
    },
    {
      id: 'f7d4e3ee-5e1e-406b-822e-dd5b118cde66',
      project_id: '135b0ded-37a4-4389-94e2-371aba6fc438',
      payment_type: 'final',
      amount: 15.00,
      payment_method: 'cash',
      transaction_id: null,
      description: 'Final payment',
      is_verified: true,
      verified_by: 'u7',
      verified_at: '2026-02-28 06:10:26',
      created_at: '2026-02-28 06:10:02'
    },
    {
      id: '71a65b61-3484-47db-829f-37d91f94ed54',
      project_id: 'bbb02993-b845-4eb3-9fa2-26cd462475d2',
      payment_type: 'advance',
      amount: 2.00,
      payment_method: 'cash',
      transaction_id: null,
      description: 'Advance payment',
      is_verified: true,
      verified_by: 'u7',
      verified_at: '2026-02-27 06:46:01',
      created_at: '2026-02-27 06:32:30'
    },
    {
      id: '92b110fa-a2cb-4c2c-b60d-edfeeae4877c',
      project_id: 'a8a2e8c5-2a1e-4439-8147-395a2669c47d',
      payment_type: 'advance',
      amount: 5.00,
      payment_method: 'cash',
      transaction_id: null,
      description: 'Advance payment',
      is_verified: true,
      verified_by: 'u8',
      verified_at: '2026-03-02 08:22:48',
      created_at: '2026-03-02 07:27:30'
    },
    {
      id: 'f380728a-224c-44cd-b02b-0ca0451e1c79',
      project_id: '2591b94c-43d1-45e1-8590-6d62c8ba1369',
      payment_type: 'final',
      amount: 7.00,
      payment_method: 'cash',
      transaction_id: null,
      description: 'Final payment',
      is_verified: true,
      verified_by: 'u8',
      verified_at: '2026-03-03 04:15:12',
      created_at: '2026-03-03 04:14:30'
    }
  ]);
};
