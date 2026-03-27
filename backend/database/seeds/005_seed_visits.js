/**
 * Seed: Visits
 * Description: Seeds the visits table with site visit schedules
 */

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('visits').del();
  
  // Inserts seed entries
  return knex('visits').insert([
    {
      id: 'f9251558-7ca5-4a8c-9d23-56b7c126a796',
      project_id: 'c1e63a09-4d34-429c-9b4a-921844d3e52a',
      site_id: 'u5',
      visit_date: '2026-02-28',
      visit_time: '03:00:00',
      status: 'completed',
      rejection_reason: null,
      rejection_description: null,
      rejected_by: null,
      rejected_at: null,
      created_at: '2026-02-23 11:20:46'
    },
    {
      id: '5161dc22-f66d-4122-901e-e267b1204ba3',
      project_id: 'bbb02993-b845-4eb3-9fa2-26cd462475d2',
      site_id: 'u5',
      visit_date: '2026-02-28',
      visit_time: '10:00:00',
      status: 'completed',
      rejection_reason: null,
      rejection_description: null,
      rejected_by: null,
      rejected_at: null,
      created_at: '2026-02-27 05:47:34'
    },
    {
      id: '9b73b0c6-5193-4083-9bc0-371b990059ad',
      project_id: 'bbb02993-b845-4eb3-9fa2-26cd462475d2',
      site_id: 'u5',
      visit_date: '2026-02-28',
      visit_time: '10:30:00',
      status: 'completed',
      rejection_reason: null,
      rejection_description: null,
      rejected_by: null,
      rejected_at: null,
      created_at: '2026-02-27 05:54:20'
    },
    {
      id: '514cc016-af57-4829-b490-c409eacf084d',
      project_id: '135b0ded-37a4-4389-94e2-371aba6fc438',
      site_id: 'u5',
      visit_date: '2026-02-28',
      visit_time: '10:53:00',
      status: 'completed',
      rejection_reason: null,
      rejection_description: null,
      rejected_by: null,
      rejected_at: null,
      created_at: '2026-02-28 05:23:11'
    },
    {
      id: '1155c986-9fdf-419a-9eee-fd513e781314',
      project_id: 'a8a2e8c5-2a1e-4439-8147-395a2669c47d',
      site_id: 'u5',
      visit_date: '2026-03-02',
      visit_time: '10:27:00',
      status: 'completed',
      rejection_reason: null,
      rejection_description: null,
      rejected_by: null,
      rejected_at: null,
      created_at: '2026-03-02 04:58:02'
    },
    {
      id: 'f4ea3a80-2910-401b-9295-2a52da2c5ae5',
      project_id: '2591b94c-43d1-45e1-8590-6d62c8ba1369',
      site_id: 'u5',
      visit_date: '2026-03-03',
      visit_time: '09:34:00',
      status: 'completed',
      rejection_reason: null,
      rejection_description: null,
      rejected_by: null,
      rejected_at: null,
      created_at: '2026-03-03 04:04:29'
    },
    {
      id: 'ced1b901-4851-4c0f-a351-d4f6fcc8d815',
      project_id: 'd69b9666-e218-4dc7-9319-93838ab825c5',
      site_id: 'u5',
      visit_date: '2024-12-15',
      visit_time: '10:00:00',
      status: 'completed',
      rejection_reason: null,
      rejection_description: null,
      rejected_by: null,
      rejected_at: null,
      created_at: '2026-03-12 09:00:35'
    },
    {
      id: 'b0add329-acbd-4286-b49a-1630c66e50ca',
      project_id: 'e05ab828-6eef-4c8d-afa3-30db421a6f5a',
      site_id: 'u5',
      visit_date: '2026-03-13',
      visit_time: '12:56:00',
      status: 'rejected',
      rejection_reason: 'Shedule to tomorrow',
      rejection_description: 'Tommorow can be done',
      rejected_by: 'u5',
      rejected_at: '2026-03-13 07:46:08',
      created_at: '2026-03-13 07:26:50'
    },
    {
      id: '9122e7ce-1d58-47d9-bedf-2578967f8b73',
      project_id: 'e05ab828-6eef-4c8d-afa3-30db421a6f5a',
      site_id: 'u5',
      visit_date: '2026-03-14',
      visit_time: '13:18:00',
      status: 'rejected',
      rejection_reason: 'Ek dm dm',
      rejection_description: 'Amm ek en en',
      rejected_by: 'u5',
      rejected_at: '2026-03-13 08:17:47',
      created_at: '2026-03-13 07:48:52'
    },
    {
      id: '783ba5fd-e719-46c9-ab74-ce5fa878f8f6',
      project_id: 'e05ab828-6eef-4c8d-afa3-30db421a6f5a',
      site_id: 'u5',
      visit_date: '2026-03-13',
      visit_time: '13:48:00',
      status: 'rejected',
      rejection_reason: 'En dm dm',
      rejection_description: 'All well all all dm',
      rejected_by: 'u5',
      rejected_at: '2026-03-13 08:20:50',
      created_at: '2026-03-13 08:18:45'
    },
    {
      id: '81b77185-8fa1-49e1-988a-72e43662c4e0',
      project_id: 'e05ab828-6eef-4c8d-afa3-30db421a6f5a',
      site_id: 'u5',
      visit_date: '2026-03-16',
      visit_time: '13:51:00',
      status: 'rejected',
      rejection_reason: 'Final rejection to check notification',
      rejection_description: 'Final rejection to check notification',
      rejected_by: 'u5',
      rejected_at: '2026-03-13 08:22:43',
      created_at: '2026-03-13 08:21:28'
    },
    {
      id: 'b8ad40bc-9787-4fe0-b585-5fa8db8e93b3',
      project_id: 'e05ab828-6eef-4c8d-afa3-30db421a6f5a',
      site_id: 'u5',
      visit_date: '2026-04-01',
      visit_time: '01:00:00',
      status: 'completed',
      rejection_reason: null,
      rejection_description: null,
      rejected_by: null,
      rejected_at: null,
      created_at: '2026-03-13 08:23:38'
    }
  ]);
};
