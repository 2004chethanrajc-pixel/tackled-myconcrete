/**
 * Seed: Work Logs
 * Description: Seeds the work_logs table with work progress logs
 */

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('work_logs').del();
  
  // Inserts seed entries
  return knex('work_logs').insert([
    {
      id: '3c1a46a8-1318-4c9f-98ad-73a5fa85f390',
      project_id: 'c1e63a09-4d34-429c-9b4a-921844d3e52a',
      floor_number: 2,
      description: 'Competed',
      created_by: 'u5',
      created_at: '2026-02-25 05:29:17'
    },
    {
      id: '7e4470e1-ed5f-4b27-993b-baaeb44bdf91',
      project_id: 'a8a2e8c5-2a1e-4439-8147-395a2669c47d',
      floor_number: 2,
      description: 'Completed',
      created_by: 'u5',
      created_at: '2026-03-02 08:37:25'
    },
    {
      id: '6229f955-7946-4ba8-9fe0-8966ca7e7532',
      project_id: '2591b94c-43d1-45e1-8590-6d62c8ba1369',
      floor_number: 5686,
      description: 'Completed',
      created_by: 'u5',
      created_at: '2026-03-03 04:12:29'
    },
    {
      id: 'e45f66f7-71ee-44b7-916d-e4ce2dbdb101',
      project_id: 'e05ab828-6eef-4c8d-afa3-30db421a6f5a',
      floor_number: 1,
      description: 'Testing bug',
      created_by: 'u5',
      created_at: '2026-03-13 08:33:23'
    }
  ]);
};
