/**
 * Seed: Signatures
 * Description: Seeds the signatures table with customer signatures
 */

exports.seed = async function(knex) {
  // Deletes ALL existing entries
  await knex('signatures').del();
  
  // Inserts seed entries
  return knex('signatures').insert([
    {
      id: '577b9fda-3056-4087-9fde-4e8751813682',
      project_id: 'bbb02993-b845-4eb3-9fa2-26cd462475d2',
      customer_id: '501da61c-3845-4dc3-bddc-c20287630658',
      signature_path: 'C:/Users/CHETHAN RAJ C/Desktop/myconcrete_v2/myconcrete_v2/backend/uploads/signatures/signature-1772175328364-906801646.jpeg',
      signature_type: 'uploaded',
      signed_at: '2026-02-27 06:55:28',
      created_at: '2026-02-27 06:55:28'
    },
    {
      id: '531aeb09-4665-4996-99a8-0f485e18a374',
      project_id: '135b0ded-37a4-4389-94e2-371aba6fc438',
      customer_id: '501da61c-3845-4dc3-bddc-c20287630658',
      signature_path: 'uploads/signatures/signature-1772257072807-56669107.png',
      signature_type: 'uploaded',
      signed_at: '2026-02-28 05:37:52',
      created_at: '2026-02-28 05:37:52'
    },
    {
      id: 'd688a303-7709-46ea-a138-6027b3a4d60d',
      project_id: '2591b94c-43d1-45e1-8590-6d62c8ba1369',
      customer_id: '501da61c-3845-4dc3-bddc-c20287630658',
      signature_path: 'uploads/signatures/signature-1772511257675-585809906.png',
      signature_type: 'uploaded',
      signed_at: '2026-03-03 04:14:17',
      created_at: '2026-03-03 04:14:17'
    },
    {
      id: '2e742c36-ef0e-4066-9b1f-ff83ebb00963',
      project_id: 'b7abd319-c61f-4e89-99d3-b9a6d6283762',
      customer_id: '501da61c-3845-4dc3-bddc-c20287630658',
      signature_path: 'uploads/signatures/signature-1773298568773-27114772.png',
      signature_type: 'uploaded',
      signed_at: '2026-03-12 06:56:08',
      created_at: '2026-03-12 06:56:08'
    },
    {
      id: '9d6a504b-6144-4890-9cad-e2e6f5800eed',
      project_id: 'e05ab828-6eef-4c8d-afa3-30db421a6f5a',
      customer_id: '501da61c-3845-4dc3-bddc-c20287630658',
      signature_path: 'uploads/signatures/signature-1773395683822-878080016.png',
      signature_type: 'uploaded',
      signed_at: '2026-03-13 09:54:43',
      created_at: '2026-03-13 09:54:43'
    }
  ]);
};
