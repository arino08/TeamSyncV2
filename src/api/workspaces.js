import express from 'express';
import { pool } from '../server.js';
import { v4 as uuidv4 } from 'uuid';

const router = express.Router();

// Get all workspaces
router.get('/', async (req, res) => {
  try {
    const [workspaces] = await pool.execute(
      'SELECT w.*, COUNT(wm.user_id) as member_count FROM workspaces w LEFT JOIN workspace_members wm ON w.id = wm.workspace_id GROUP BY w.id'
    );
    res.json({ workspaces });
  } catch (error) {
    console.error('Failed to fetch workspaces:', error);
    res.status(500).json({ error: 'Failed to fetch workspaces' });
  }
});

// Get single workspace
router.get('/:workspaceId', async (req, res) => {
  try {
    res.setHeader('Content-Type', 'application/json');
    const { workspaceId } = req.params;

    console.log('Fetching workspace:', workspaceId);

    const [workspaces] = await pool.execute(
      `SELECT w.*, COUNT(wm.user_id) as member_count
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE w.id = ?
       GROUP BY w.id`,
      [workspaceId]
    );

    console.log('Workspace query result:', workspaces);

    if (workspaces.length === 0) {
      return res.status(404).json({ error: 'Workspace not found' });
    }

    const workspace = workspaces[0];
    console.log('Sending workspace:', workspace);

    return res.json({ workspace });
  } catch (error) {
    console.error('Workspace fetch error:', error);
    return res.status(500).json({ error: 'Failed to fetch workspace' });
  }
});

// Create new workspace
router.post('/', async (req, res) => {
  const { name } = req.body;
  const userId = req.user.id; // Assuming you have auth middleware setting req.user

  console.log('Creating workspace:', { name, userId });

  if (!name) {
    return res.status(400).json({ error: 'Workspace name is required' });
  }

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    const workspaceId = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    console.log('Inserting workspace:', { workspaceId, name, now });

    // Create workspace
    await connection.execute(
      'INSERT INTO workspaces (id, name, created_at, manager_id) VALUES (?, ?, ?, ?)',
      [workspaceId, name, now, userId]
    );

    console.log('Inserting workspace member:', { workspaceId, userId });

    // Add creator as a member with manager role
    await connection.execute(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)',
      [workspaceId, userId, 'manager']
    );

    await connection.commit();

    const [workspaces] = await connection.execute(
      `SELECT w.*, COUNT(wm.user_id) as member_count
       FROM workspaces w
       LEFT JOIN workspace_members wm ON w.id = wm.workspace_id
       WHERE w.id = ?
       GROUP BY w.id`,
      [workspaceId]
    );

    const workspace = workspaces[0];
    console.log('Created workspace:', workspace);

    res.status(201).json({ workspace });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to create workspace:', error);
    res.status(500).json({
      error: 'Failed to create workspace',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

// Add member to workspace
router.post('/:workspaceId/members', async (req, res) => {
  const { workspaceId } = req.params;
  const { email } = req.body;

  try {
    // First find the user by email
    const [users] = await pool.execute(
      'SELECT id FROM auth_users WHERE email = ?',
      [email]
    );

    if (users.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Add user to workspace
    await pool.execute(
      'INSERT INTO workspace_members (workspace_id, user_id, role) VALUES (?, ?, ?)',
      [workspaceId, users[0].id, 'member']
    );

    res.status(201).json({ message: 'Member added successfully' });
  } catch (error) {
    console.error('Failed to add member:', error);
    res.status(500).json({ error: 'Failed to add member' });
  }
});

// Get workspace members
router.get('/:workspaceId/members', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const [members] = await pool.execute(
      `SELECT
        au.id,
        au.email,
        p.name,
        wm.role
      FROM workspace_members wm
      JOIN auth_users au ON wm.user_id = au.id
      JOIN profiles p ON au.id = p.id
      WHERE wm.workspace_id = ?`,
      [workspaceId]
    );

    console.log('Fetched workspace members:', members);
    res.json({ members });
  } catch (error) {
    console.error('Failed to fetch workspace members:', error);
    res.status(500).json({ error: 'Failed to fetch workspace members' });
  }
});

// Endpoint to assign team members to a workspace
// Expects: { workspace_id, user_ids: [array of user IDs] }
router.post('/assign-members', async (req, res) => {
  const { workspace_id, user_ids } = req.body;
  if (!workspace_id || !user_ids || !Array.isArray(user_ids)) {
    return res.status(400).json({ error: 'workspace_id and an array of user_ids are required' });
  }
  try {
    for (const user_id of user_ids) {
      await pool.execute(
        `INSERT INTO workspace_members (workspace_id, user_id, role)
         VALUES (?, ?, 'member')
         ON DUPLICATE KEY UPDATE role = 'member'`,
        [workspace_id, user_id]
      );
    }
    return res.status(200).json({ message: 'Workspace members assigned successfully' });
  } catch (error) {
    console.error('Error assigning workspace members:', error);
    return res.status(500).json({ error: 'Failed to assign workspace members' });
  }
});

// Endpoint to assign a manager to a workspace.
// Expects: { workspace_id, manager_id }
router.post('/assign-manager', async (req, res) => {
  const { workspace_id, manager_id } = req.body;
  if (!workspace_id || !manager_id) {
    return res.status(400).json({ error: 'workspace_id and manager_id are required' });
  }
  try {
    // Update the workspaces table's manager_id.
    await pool.execute(
      `UPDATE workspaces SET manager_id = ? WHERE id = ?`,
      [manager_id, workspace_id]
    );
    // Also update the join table, setting role to 'manager'
    await pool.execute(
      `INSERT INTO workspace_members (workspace_id, user_id, role)
       VALUES (?, ?, 'manager')
       ON DUPLICATE KEY UPDATE role = 'manager'`,
      [workspace_id, manager_id]
    );
    return res.status(200).json({ message: 'Manager assigned successfully' });
  } catch (error) {
    console.error('Error assigning manager:', error);
    return res.status(500).json({ error: 'Failed to assign manager' });
  }
});

// Get tasks for a workspace
router.get('/:workspaceId/tasks', async (req, res) => {
  try {
    const { workspaceId } = req.params;
    const [tasks] = await pool.execute(
      `SELECT wt.*,
        p.name as assignedToName,
        pc.name as createdByName
       FROM workspace_tasks wt
       LEFT JOIN profiles p ON wt.assigned_to = p.id
       LEFT JOIN profiles pc ON wt.created_by = pc.id
       WHERE wt.workspace_id = ?`,
      [workspaceId]
    );
    res.json({ tasks });
  } catch (error) {
    console.error('Failed to fetch tasks:', error);
    res.status(500).json({ error: 'Failed to fetch tasks' });
  }
});

// Create a new task
router.post('/:workspaceId/tasks', async (req, res) => {
  const { workspaceId } = req.params;
  const { title, description, assignedTo } = req.body;
  const createdBy = req.user.id;

  if (!title || !assignedTo) {
    return res.status(400).json({ error: 'Title and assignedTo are required' });
  }

  try {
    const taskId = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    await pool.execute(
      `INSERT INTO workspace_tasks
       (id, workspace_id, title, description, assigned_to, created_by, created_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [taskId, workspaceId, title, description, assignedTo, createdBy, now]
    );

    // Fetch the created task with additional info
    const [tasks] = await pool.execute(
      `SELECT wt.*,
        p.name as assignedToName,
        pc.name as createdByName
       FROM workspace_tasks wt
       LEFT JOIN profiles p ON wt.assigned_to = p.id
       LEFT JOIN profiles pc ON wt.created_by = pc.id
       WHERE wt.id = ?`,
      [taskId]
    );

    res.status(201).json({ task: tasks[0] });
  } catch (error) {
    console.error('Failed to create task:', error);
    res.status(500).json({ error: 'Failed to create task' });
  }
});

// Update task status - fix the endpoint URL
router.patch('/:workspaceId/tasks/:taskId', async (req, res) => {
  const { workspaceId, taskId } = req.params;
  const { status } = req.body;

  if (!status || !['pending', 'in-progress', 'completed'].includes(status)) {
    return res.status(400).json({ error: 'Invalid status' });
  }

  try {
    // First verify the task exists and belongs to the workspace
    const [tasks] = await pool.execute(
      'SELECT * FROM workspace_tasks WHERE id = ? AND workspace_id = ?',
      [taskId, workspaceId]
    );

    if (tasks.length === 0) {
      return res.status(404).json({ error: 'Task not found' });
    }

    await pool.execute(
      'UPDATE workspace_tasks SET status = ? WHERE id = ? AND workspace_id = ?',
      [status, taskId, workspaceId]
    );

    // Fetch updated task with user info
    const [updatedTasks] = await pool.execute(
      `SELECT wt.*,
        p.name as assignedToName,
        pc.name as createdByName
       FROM workspace_tasks wt
       LEFT JOIN profiles p ON wt.assigned_to = p.id
       LEFT JOIN profiles pc ON wt.created_by = pc.id
       WHERE wt.id = ?`,
      [taskId]
    );

    res.json({ task: updatedTasks[0] });
  } catch (error) {
    console.error('Failed to update task:', error);
    res.status(500).json({ error: 'Failed to update task' });
  }
});

export default router;
