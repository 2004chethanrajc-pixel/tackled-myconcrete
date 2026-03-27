/**
 * Seed: Site Plans
 * Description: Seeds the site_plans table with uploaded site plans
 */

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('site_plans').del();
  
  // Inserts seed entries
  return knex('site_plans').insert([
    {
      id: 8,
      project_id: 'e05ab828-6eef-4c8d-afa3-30db421a6f5a',
      file_path: '/uploads/plans/8545786202-1773386714068-834219237.pdf',
      uploaded_by: 'u2',
      file_name: '8545786202.pdf',
      file_size: 269832,
      uploaded_at: '2026-03-13 07:25:14'
    }
  ]);
};
