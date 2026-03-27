/**
 * Seed: Quotations
 * Description: Seeds the quotations table with project quotations
 */

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('quotations').del();
  
  // Inserts seed entries
  return knex('quotations').insert([
    {
      id: 'a7683ae6-07f6-45a9-bea0-78c7681e0d01',
      project_id: 'c1e63a09-4d34-429c-9b4a-921844d3e52a',
      material_cost: 1223.00,
      labour_cost: 1248.00,
      transport_cost: 84946.00,
      other_cost: 9495.00,
      total_cost: 96912.00,
      advance_amount: 0.00,
      generated_by: 'u7',
      approved: true,
      approved_at: '2026-02-25 04:58:42',
      created_at: '2026-02-25 04:46:26'
    },
    {
      id: 'ec0ccd5d-6ba4-4e26-82ae-c86118f51387',
      project_id: '135b0ded-37a4-4389-94e2-371aba6fc438',
      material_cost: 2.00,
      labour_cost: 5.00,
      transport_cost: 8.00,
      other_cost: 10.00,
      total_cost: 25.00,
      advance_amount: 10.00,
      generated_by: 'u7',
      approved: true,
      approved_at: '2026-02-28 05:27:01',
      created_at: '2026-02-28 05:26:30'
    },
    {
      id: '3763a4c1-5fa9-4eed-bb90-12bae2735c71',
      project_id: '2591b94c-43d1-45e1-8590-6d62c8ba1369',
      material_cost: 2.00,
      labour_cost: 2.00,
      transport_cost: 5.00,
      other_cost: 8.00,
      total_cost: 17.00,
      advance_amount: 10.00,
      generated_by: 'u8',
      approved: true,
      approved_at: '2026-03-03 04:09:14',
      created_at: '2026-03-03 04:08:13'
    },
    {
      id: '429b7807-fc4d-4145-ad55-1a57138849c1',
      project_id: 'bbb02993-b845-4eb3-9fa2-26cd462475d2',
      material_cost: 5.00,
      labour_cost: 5.00,
      transport_cost: 5.00,
      other_cost: 8.00,
      total_cost: 23.00,
      advance_amount: 2.00,
      generated_by: 'u7',
      approved: true,
      approved_at: '2026-02-27 06:32:15',
      created_at: '2026-02-27 06:31:29'
    },
    {
      id: '276d8fce-514d-49de-b636-38f248e29f8f',
      project_id: 'a8a2e8c5-2a1e-4439-8147-395a2669c47d',
      material_cost: 3.00,
      labour_cost: 3.00,
      transport_cost: 3.00,
      other_cost: 2.99,
      total_cost: 11.99,
      advance_amount: 5.00,
      generated_by: 'u8',
      approved: true,
      approved_at: '2026-03-02 07:27:13',
      created_at: '2026-03-02 07:13:07'
    },
    {
      id: 'd4456383-5ff9-46b7-a788-7575ecb3fb28',
      project_id: 'e05ab828-6eef-4c8d-afa3-30db421a6f5a',
      material_cost: 50000.00,
      labour_cost: 10000.00,
      transport_cost: 5000.00,
      other_cost: 2000.00,
      total_cost: 67000.00,
      advance_amount: 20000.00,
      generated_by: 'u7',
      approved: true,
      approved_at: '2026-03-13 08:31:10',
      created_at: '2026-03-13 08:28:25'
    },
    {
      id: '71a154e9-0daa-460d-a89c-ce5a7b4f6568',
      project_id: 'd69b9666-e218-4dc7-9319-93838ab825c5',
      material_cost: 50000.00,
      labour_cost: 30000.00,
      transport_cost: 5000.00,
      other_cost: 5000.00,
      total_cost: 90000.00,
      advance_amount: 30000.00,
      generated_by: 'u7',
      approved: false,
      approved_at: null,
      created_at: '2026-03-12 09:02:13'
    }
  ]);
};
