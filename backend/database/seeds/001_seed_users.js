/**
 * Seed: Users
 * Description: Seeds the users table with initial user data
 */

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('users').del();
  
  // Inserts seed entries
  return knex('users').insert([
    {
      id: 'u1',
      name: 'Super Admin',
      email: 'super@mc.com',
      phone: '9000000001',
      password: '$2b$10$FFhjalp0xkLQcKPXgTb5..kh6zFFulX0RSOXRC8/tSmeaWr4zQIdu',
      role: 'super_admin',
      is_active: true,
      created_at: '2026-02-23 06:59:00',
      date_of_joining: '2024-01-01',
      date_of_birth: '1990-01-15',
      current_address: '123 Admin Street, Tech Park',
      permanent_address: '123 Permanent Admin Street, Hometown',
      city: 'Bangalore'
    },
    {
      id: 'u2',
      name: 'Main Admin',
      email: 'admin@mc.com',
      phone: '9000000002',
      password: '$2b$10$FFhjalp0xkLQcKPXgTb5..kh6zFFulX0RSOXRC8/tSmeaWr4zQIdu',
      role: 'admin',
      is_active: true,
      created_at: '2026-02-23 06:59:00'
    },
    {
      id: 'u3',
      name: 'PM Arjun',
      email: 'pm1@mc.com',
      phone: '9000000003',
      password: '$2b$10$FFhjalp0xkLQcKPXgTb5..kh6zFFulX0RSOXRC8/tSmeaWr4zQIdu',
      role: 'project_manager',
      is_active: true,
      created_at: '2026-02-23 06:59:00'
    },
    {
      id: 'u4',
      name: 'PM Ravi',
      email: 'pm2@mc.com',
      phone: '9000000004',
      password: '$2b$10$FFhjalp0xkLQcKPXgTb5..kh6zFFulX0RSOXRC8/tSmeaWr4zQIdu',
      role: 'project_manager',
      is_active: false,
      created_at: '2026-02-23 06:59:00'
    },
    {
      id: 'u5',
      name: 'Site Manoj',
      email: 'site1@mc.com',
      phone: '9000000005',
      password: '$2b$10$FFhjalp0xkLQcKPXgTb5..kh6zFFulX0RSOXRC8/tSmeaWr4zQIdu',
      role: 'site_incharge',
      is_active: true,
      created_at: '2026-02-23 06:59:00'
    },
    {
      id: 'u6',
      name: 'Site Kiran',
      email: 'site2@mc.com',
      phone: '9000000006',
      password: '$2b$10$FFhjalp0xkLQcKPXgTb5..kh6zFFulX0RSOXRC8/tSmeaWr4zQIdu',
      role: 'site_incharge',
      is_active: false,
      created_at: '2026-02-23 06:59:00'
    },
    {
      id: 'u7',
      name: 'Finance Meera',
      email: 'finance1@mc.com',
      phone: '9000000007',
      password: '$2b$10$FFhjalp0xkLQcKPXgTb5..kh6zFFulX0RSOXRC8/tSmeaWr4zQIdu',
      role: 'finance',
      is_active: true,
      created_at: '2026-02-23 06:59:00'
    },
    {
      id: 'u8',
      name: 'Finance Nisha',
      email: 'finance2@mc.com',
      phone: '9000000008',
      password: '$2b$10$FFhjalp0xkLQcKPXgTb5..kh6zFFulX0RSOXRC8/tSmeaWr4zQIdu',
      role: 'finance',
      is_active: false,
      created_at: '2026-02-23 06:59:00'
    },
    {
      id: 'u9',
      name: 'Customer Raj',
      email: 'cust1@mc.com',
      phone: '9000000009',
      password: 'hashed_pass',
      role: 'customer',
      is_active: true,
      created_at: '2026-02-23 06:59:00'
    },
    {
      id: 'u10',
      name: 'Customer Amit',
      email: 'cust2@mc.com',
      phone: '9000000010',
      password: '$2b$10$FFhjalp0xkLQcKPXgTb5..kh6zFFulX0RSOXRC8/tSmeaWr4zQIdu',
      role: 'customer',
      is_active: true,
      created_at: '2026-02-23 06:59:00'
    },
    {
      id: 'u11',
      name: 'Customer Vikram',
      email: 'cust3@mc.com',
      phone: '9000000011',
      password: 'hashed_pass',
      role: 'customer',
      is_active: false,
      created_at: '2026-02-23 06:59:00'
    },
    {
      id: 'u12',
      name: 'Customer Suresh',
      email: 'cust4@mc.com',
      phone: '9000000012',
      password: 'hashed_pass',
      role: 'customer',
      is_active: false,
      created_at: '2026-02-23 06:59:00'
    },
    {
      id: '501da61c-3845-4dc3-bddc-c20287630658',
      name: 'Sibi',
      email: 'sibi@male.com',
      phone: '1234567890',
      password: '$2b$10$GAuPAGgpD/2xomhsoGtT..GcyYK6kICUYDUpm51nsDvE4ZZGt7eaW',
      role: 'customer',
      is_active: true,
      created_at: '2026-02-23 09:25:28'
    },
    {
      id: '758104ad-8d77-4c8f-ad72-f66a992a4f8f',
      name: 'chethan',
      email: 'chethan@mc.com',
      phone: '2234567890',
      password: '$2b$10$vAKdr/P7lT7jRHrj7DhDt.DdxvbScc85ruIPdVSOSry8iJC97qIPu',
      role: 'admin',
      is_active: true,
      created_at: '2026-03-02 09:06:50'
    },
    {
      id: '82280bf4-651d-43d9-8022-43988252741c',
      name: 'Chethan Raj C',
      email: '2004chethanrajc@gmail.com',
      phone: '8792078322',
      password: '$2b$10$NqmaXbVixOzP/gJlSQH5hOKbh0WziE9ENtN3H2aJB1TWNoqBJGCMi',
      role: 'admin',
      is_active: false,
      created_at: '2026-02-23 09:22:28'
    },
    {
      id: '8eb70f63-2401-4d83-98af-36a8e2b6c0a8',
      name: 'Bsbx',
      email: 'dhdhc@mc.com',
      phone: '1234583598',
      password: '$2b$10$D5L0IsrOiQuyz6V45ZOwrusp.EkIVilsWYU2y.9swW/lilJMNYGVq',
      role: 'super_admin',
      is_active: true,
      created_at: '2026-03-02 09:24:19'
    },
    {
      id: 'e6b7ad6e-4e96-473c-ab7c-36e5ee978bf0',
      name: 'chethan',
      email: 'superchethan@mc.com',
      phone: '3234567890',
      password: '$2b$10$74KAUe5EaSs8YMck0ja38uqQalJda2LvBqJByOPmpqEtmamKeMwOy',
      role: 'super_admin',
      is_active: true,
      created_at: '2026-03-02 09:17:53'
    },
    {
      id: 'fcf8accb-21b2-46f2-8f08-a31ab4cb026e',
      name: 'annappa',
      email: 'annappa@admin.com',
      phone: '779977997799',
      password: '$2b$10$fnAzZIicZh/GJpI1kOjnwOBYcI9C.rBkHirrBLCLk6WxkfaJ8wOfq',
      role: 'admin',
      is_active: true,
      created_at: '2026-03-13 04:52:01'
    },
    {
      id: '10fb3610-39ec-4004-badf-af023fdd9412',
      name: 'Annappa',
      email: 'annappa@super.com',
      phone: '9977997799',
      password: '$2b$10$YvXmUKDHb1ouz/Gx0FbetuwJLtXWbP31y70S/oZwV9E4P401Ukx52',
      role: 'super_admin',
      is_active: true,
      created_at: '2026-03-13 04:57:12'
    }
  ]);
};
