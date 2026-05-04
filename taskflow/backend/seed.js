const bcrypt = require('bcryptjs');
const { init, run, get, all } = require('./models/db');

(async () => {
  console.log('🌱 Seeding database...');
  await init();
  const hash = (pw) => bcrypt.hashSync(pw, 10);

  const users = [
    ['Admin User', 'admin@demo.com', hash('demo123'), 'admin'],
    ['Alice Johnson', 'member@demo.com', hash('demo123'), 'member'],
    ['Bob Smith', 'bob@demo.com', hash('demo123'), 'member'],
    ['Carol White', 'carol@demo.com', hash('demo123'), 'member'],
  ];
  for (const [name, email, password, role] of users) {
    const exists = await get('SELECT id FROM users WHERE email = ?', [email]);
    if (!exists) await run('INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)', [name, email, password, role]);
  }
  console.log('✅ Users created');

  const adminId = (await get('SELECT id FROM users WHERE email = ?', ['admin@demo.com'])).id;
  const aliceId = (await get('SELECT id FROM users WHERE email = ?', ['member@demo.com'])).id;
  const bobId   = (await get('SELECT id FROM users WHERE email = ?', ['bob@demo.com'])).id;
  const carolId = (await get('SELECT id FROM users WHERE email = ?', ['carol@demo.com'])).id;

  const existingProjects = await all('SELECT id FROM projects');
  if (existingProjects.length === 0) {
    const p1 = (await run('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)', ['Website Redesign', 'Complete overhaul of company website', adminId])).lastInsertRowid;
    const p2 = (await run('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)', ['Mobile App v2.0', 'Major feature release for iOS and Android', aliceId])).lastInsertRowid;
    const p3 = (await run('INSERT INTO projects (name, description, owner_id) VALUES (?, ?, ?)', ['Q2 Marketing Campaign', 'Social media and content marketing', adminId])).lastInsertRowid;

    for (const [pid, uid, role] of [[p1,adminId,'admin'],[p1,aliceId,'member'],[p1,bobId,'member'],[p2,aliceId,'admin'],[p2,carolId,'member'],[p2,adminId,'member'],[p3,adminId,'admin'],[p3,carolId,'member'],[p3,bobId,'member']])
      await run('INSERT OR IGNORE INTO project_members (project_id, user_id, role) VALUES (?, ?, ?)', [pid, uid, role]);

    const d = (n) => { const dt = new Date(); dt.setDate(dt.getDate()+n); return dt.toISOString().split('T')[0]; };
    const tasks = [
      ['Design homepage mockup', 'Figma designs for the new homepage', p1, aliceId, adminId, 'done', 'high', d(-5)],
      ['Set up React project', 'Bootstrap with routing and state', p1, bobId, adminId, 'done', 'medium', d(-3)],
      ['Implement navigation', 'Responsive nav with mobile menu', p1, aliceId, adminId, 'in_progress', 'high', d(2)],
      ['Build hero section', 'Animated hero with CTA buttons', p1, bobId, adminId, 'in_progress', 'medium', d(3)],
      ['Write SEO meta tags', 'Add meta tags and Open Graph', p1, null, adminId, 'todo', 'low', d(7)],
      ['Performance audit', 'Run Lighthouse audit and fix issues', p1, aliceId, adminId, 'todo', 'urgent', d(-2)],
      ['Deploy to staging', 'Set up Railway deployment pipeline', p1, bobId, adminId, 'review', 'high', d(1)],
      ['User authentication flow', 'JWT auth with refresh tokens', p2, carolId, aliceId, 'done', 'urgent', d(-7)],
      ['Push notifications', 'Firebase FCM integration', p2, carolId, aliceId, 'in_progress', 'high', d(4)],
      ['Offline mode support', 'Cache critical data', p2, aliceId, aliceId, 'todo', 'medium', d(10)],
      ['Beta testing setup', 'TestFlight and Google Play beta', p2, carolId, aliceId, 'review', 'high', d(-1)],
      ['Content calendar Q2', 'Plan 3 months of social content', p3, carolId, adminId, 'done', 'high', d(-10)],
      ['Design social templates', 'Canva templates for all platforms', p3, bobId, adminId, 'in_progress', 'medium', d(5)],
      ['Email campaign copy', '5-email drip sequence for launch', p3, carolId, adminId, 'todo', 'high', d(6)],
    ];
    for (const [title, desc, pid, asgn, cby, status, priority, due] of tasks)
      await run('INSERT INTO tasks (title, description, project_id, assigned_to, created_by, status, priority, due_date) VALUES (?, ?, ?, ?, ?, ?, ?, ?)', [title, desc, pid, asgn, cby, status, priority, due]);
    console.log('✅ Projects, members & tasks created');
  } else {
    console.log('ℹ️  Projects already exist, skipping');
  }
  console.log('\n🎉 Done! Demo accounts:');
  console.log('  Admin:  admin@demo.com / demo123');
  console.log('  Member: member@demo.com / demo123');
  process.exit(0);
})();
