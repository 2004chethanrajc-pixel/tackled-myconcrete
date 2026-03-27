/**
 * Seed: Site Reports
 * Description: Seeds the site_reports table with site inspection reports
 */

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('site_reports').del();
  
  // Inserts seed entries
  return knex('site_reports').insert([
    {
      id: '0214fb23-ff0f-489c-8775-f8a2ef899629',
      project_id: 'c1e63a09-4d34-429c-9b4a-921844d3e52a',
      total_floors: 2,
      dimensions: '30*40',
      images: JSON.stringify(['/uploads/report-image-1771992970259-0-1771992972179-416072032.jpeg']),
      remarks: 'I want that and this',
      approval_status: 'pending',
      created_at: '2026-02-25 04:16:12'
    },
    {
      id: 'cca0a271-9212-474d-b643-f04d0074ad02',
      project_id: 'bbb02993-b845-4eb3-9fa2-26cd462475d2',
      total_floors: 1,
      dimensions: '2',
      images: JSON.stringify(['/uploads/report-image-1772172878199-0-1772172878088-306374507.jpeg']),
      remarks: null,
      approval_status: 'pending',
      created_at: '2026-02-27 06:14:38'
    },
    {
      id: '44c3bdde-1fa0-4ef6-bf69-da16ec4bac70',
      project_id: '135b0ded-37a4-4389-94e2-371aba6fc438',
      total_floors: 646,
      dimensions: 'Sbhz',
      images: JSON.stringify(['/uploads/report-image-1772256361145-0-1772256360868-840575484.jpeg']),
      remarks: null,
      approval_status: 'pending',
      created_at: '2026-02-28 05:26:01'
    },
    {
      id: '7acb2b4c-ebd1-465b-968d-674224092b58',
      project_id: 'a8a2e8c5-2a1e-4439-8147-395a2669c47d',
      total_floors: 2,
      dimensions: '20 30',
      images: JSON.stringify(['/uploads/report-image-1772427623002-0-1772427623271-703081842.jpeg']),
      remarks: 'I want this and that and this',
      approval_status: 'pending',
      created_at: '2026-03-02 05:00:23'
    },
    {
      id: '3c2556f6-bfb0-4395-a5d0-05c06516dcd7',
      project_id: '2591b94c-43d1-45e1-8590-6d62c8ba1369',
      total_floors: 5,
      dimensions: 'Dhdh',
      images: JSON.stringify(['/uploads/report-image-1772510801414-0-1772510801094-492153820.jpeg']),
      remarks: 'Bhdd',
      approval_status: 'pending',
      created_at: '2026-03-03 04:06:41'
    },
    {
      id: '6e534f8c-adab-4eaa-b816-ee7b28da6f0c',
      project_id: 'd69b9666-e218-4dc7-9319-93838ab825c5',
      total_floors: 2,
      dimensions: '30x40',
      images: JSON.stringify(['test1.jpg', 'test2.jpg']),
      remarks: 'Test report',
      approval_status: 'pending',
      created_at: '2026-03-12 09:01:18'
    },
    {
      id: '339ada58-31d5-411e-b665-86609364ef3e',
      project_id: 'e05ab828-6eef-4c8d-afa3-30db421a6f5a',
      total_floors: 3,
      dimensions: '60*50',
      images: JSON.stringify(['/uploads/report-image-1773390316848-0-1773390316149-705873506.jpg']),
      remarks: 'Done done done',
      approval_status: 'pending',
      created_at: '2026-03-13 08:25:16'
    }
  ]);
};
