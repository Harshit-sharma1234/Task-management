import { createClient } from '@supabase/supabase-js';
import dotenv from 'dotenv';
import path from 'path';

dotenv.config({ path: '.env.local' });

const supabase = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL,
  process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY
);

async function seed() {
  // Get first project
  const { data: projects } = await supabase.from('projects').select('id, name').limit(2);
  // Get first user
  const { data: users } = await supabase.from('users').select('id').limit(2);

  if (!projects || projects.length === 0 || !users || users.length === 0) {
    console.error('Missing projects or users to seed tickets.');
    return;
  }

  const projectId1 = projects[0].id;
  const projectName1 = projects[0].name;
  const projectId2 = projects[1]?.id || projectId1;
  const projectName2 = projects[1]?.name || projectName1;
  const userId = users[0].id;

  const demoTickets = [
    {
      title: 'Update Date Picker Format from DD/MM/YYYY to MM/DD/YYYY',
      description: 'The client requested to change the date format across all forms.',
      status: 'In Progress',
      priority: 'High',
      project_id: projectId1,
      created_by: userId,
      assignee_id: userId
    },
    {
      title: 'AI Order Management System (Multi-Channel) – Feasibility Analysis & Approach',
      description: 'Analyze how to integrate orders from multiple channels into a single AI-driven system.',
      status: 'In Progress',
      priority: 'Medium',
      project_id: projectId1,
      created_by: userId,
      assignee_id: userId
    },
    {
      title: 'Improve Typography & CTA Scaling for Mobile with Responsive Style Controls',
      description: 'Optimize the look and feel on mobile devices.',
      status: 'In Progress',
      priority: 'Low',
      project_id: projectId2,
      created_by: userId,
      assignee_id: userId
    }
  ];

  const { data, error } = await supabase.from('tickets').insert(demoTickets).select();
  if (error) {
    console.error('Error seeding tickets:', error);
  } else {
    console.log('Successfully seeded tickets:', data.length);
  }
}

seed();
