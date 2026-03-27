/**
 * Seed: Projects
 * Description: Seeds the projects table with sample project data
 */

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('projects').del();
  
  // Inserts seed entries
  return knex('projects').insert([
    {
      id: 'c1e63a09-4d34-429c-9b4a-921844d3e52a',
      customer_id: '501da61c-3845-4dc3-bddc-c20287630658',
      name: 'Project 123',
      address: 'Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      pm_id: 'u3',
      site_id: 'u5',
      finance_id: 'u7',
      status: 'CLOSED',
      created_at: '2026-02-23 09:52:01',
      updated_at: '2026-02-25 06:23:32'
    },
    {
      id: '135b0ded-37a4-4389-94e2-371aba6fc438',
      customer_id: '501da61c-3845-4dc3-bddc-c20287630658',
      name: 'Bs',
      address: 'Mysore',
      city: 'Mysore',
      state: 'Karnataka',
      pincode: '570001',
      pm_id: 'u4',
      site_id: 'u5',
      finance_id: 'u7',
      status: 'CLOSED',
      created_at: '2026-02-28 05:21:07',
      updated_at: '2026-02-28 06:31:16'
    },
    {
      id: '2591b94c-43d1-45e1-8590-6d62c8ba1369',
      customer_id: '501da61c-3845-4dc3-bddc-c20287630658',
      name: 'Sibi',
      address: 'Male',
      city: 'Male',
      state: 'Maldives',
      pincode: '20026',
      pm_id: 'u3',
      site_id: 'u5',
      finance_id: 'u8',
      status: 'CLOSED',
      created_at: '2026-03-03 04:04:18',
      updated_at: '2026-03-03 04:15:12'
    },
    {
      id: 'bbb02993-b845-4eb3-9fa2-26cd462475d2',
      customer_id: '501da61c-3845-4dc3-bddc-c20287630658',
      name: 'Chethan',
      address: 'Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560078',
      pm_id: 'u3',
      site_id: 'u5',
      finance_id: 'u7',
      status: 'CLOSED',
      created_at: '2026-02-27 05:47:34',
      updated_at: '2026-02-27 06:55:28'
    },
    {
      id: 'a8a2e8c5-2a1e-4439-8147-395a2669c47d',
      customer_id: '501da61c-3845-4dc3-bddc-c20287630658',
      name: 'web project',
      address: 'Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      pm_id: 'u4',
      site_id: 'u5',
      finance_id: 'u8',
      status: 'WORK_STARTED',
      created_at: '2026-03-02 04:56:22',
      updated_at: '2026-03-02 08:25:30'
    },
    {
      id: 'e05ab828-6eef-4c8d-afa3-30db421a6f5a',
      customer_id: '501da61c-3845-4dc3-bddc-c20287630658',
      name: 'Testing last bug fix',
      address: 'Bangalore',
      city: 'Bangalore',
      state: 'Karnataka',
      pincode: '560001',
      pm_id: 'u3',
      site_id: 'u5',
      finance_id: 'u7',
      status: 'WORK_STARTED',
      created_at: '2026-03-13 06:29:03',
      updated_at: '2026-03-13 08:32:51'
    },
    {
      id: 'd69b9666-e218-4dc7-9319-93838ab825c5',
      customer_id: '501da61c-3845-4dc3-bddc-c20287630658',
      name: 'Test Notification Project',
      address: 'Test Address',
      city: 'Test City',
      state: 'Test State',
      pincode: '123456',
      pm_id: 'u3',
      site_id: 'u5',
      finance_id: 'u7',
      status: 'VISIT_DONE',
      created_at: '2026-03-12 08:59:18',
      updated_at: '2026-03-12 09:01:00'
    }
  ]);
};
