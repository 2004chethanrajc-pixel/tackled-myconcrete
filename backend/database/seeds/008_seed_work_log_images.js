/**
 * Seed: Work Log Images
 * Description: Seeds the work_log_images table with work log image references
 */

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('work_log_images').del();
  
  // Inserts seed entries
  return knex('work_log_images').insert([
    {
      id: 'c5daa95b-1772-4346-9858-e0cae5d5712b',
      work_log_id: 'e45f66f7-71ee-44b7-916d-e4ce2dbdb101',
      image_path: 'file:///data/user/0/host.exp.exponent/files/worklog_watermarked_1773391486835.jpg'
    },
    {
      id: '0d4393dd-d8f5-4e8d-99d3-c5c57e104a43',
      work_log_id: 'e45f66f7-71ee-44b7-916d-e4ce2dbdb101',
      image_path: '/uploads/worklog-image-1773393013147-0-1773393012533-630102411.jpg'
    },
    {
      id: '6e8e31b0-fc58-4a74-b5ff-e9169c6514fe',
      work_log_id: 'e45f66f7-71ee-44b7-916d-e4ce2dbdb101',
      image_path: '/uploads/worklog-image-1773393048165-0-1773393047544-894863485.jpg'
    },
    {
      id: '35c8ab81-8ddc-4151-9734-e642bbcabb7d',
      work_log_id: 'e45f66f7-71ee-44b7-916d-e4ce2dbdb101',
      image_path: '/uploads/worklog-image-1773393558826-0-1773393558224-548187296.jpg'
    },
    {
      id: '4b79bf5b-546c-4f73-8703-6f11ea3e537a',
      work_log_id: 'e45f66f7-71ee-44b7-916d-e4ce2dbdb101',
      image_path: '/uploads/worklog-image-1773396545340-0-1773396544806-225170697.jpg'
    }
  ]);
};
