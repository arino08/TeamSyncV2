import express from 'express';
import { pool } from '../server.js';
import { v4 as uuidv4 } from 'uuid'; // Add this import

const router = express.Router();

// Endpoint for creating/assigning a task
router.post('/', async (req, res) => {
  const { workspace_id, assigned_to, title, description, status } = req.body;
  if (!workspace_id || !assigned_to || !title) {
    return res.status(400).json({ error: 'workspace_id, assigned_to, and title are required' });
  }
  try {
    await pool.execute(
      `INSERT INTO tasks (workspace_id, assigned_to, title, description, status) VALUES (?, ?, ?, ?, ?)`,
      [workspace_id, assigned_to, title, description || '', status || 'todo']
    );
    return res.status(201).json({ message: 'Task created successfully' });
  } catch (error) {
    console.error('Error creating task:', error);
    return res.status(500).json({ error: 'Failed to create task' });
  }
});

// Get tasks assigned to user
router.get('/assigned', async (req, res) => {
  const userId = req.user.id;
  const connection = await pool.getConnection();

  try {
    console.log('Fetching tasks for user:', userId);

    // First get tasks without subtasks
    const [tasks] = await connection.execute(
      `SELECT
        wt.*,
        w.name as workspace_name,
        p.name as assignedToName,
        pc.name as createdByName
       FROM workspace_tasks wt
       JOIN workspaces w ON wt.workspace_id = w.id
       LEFT JOIN profiles p ON wt.assigned_to = p.id
       LEFT JOIN profiles pc ON wt.created_by = pc.id
       WHERE wt.assigned_to = ?`,
      [userId]
    );

    // Then get subtasks for each task
    const tasksWithSubtasks = await Promise.all(tasks.map(async (task) => {
      const [subtasks] = await connection.execute(
        `SELECT id, title, status
         FROM subtasks
         WHERE task_id = ?`,
        [task.id]
      );

      return {
        ...task,
        subtasks: subtasks || []
      };
    }));

    console.log('Processed tasks:', tasksWithSubtasks);

    res.json({ tasks: tasksWithSubtasks });
  } catch (error) {
    console.error('Failed to fetch assigned tasks:', error);
    res.status(500).json({
      error: 'Failed to fetch tasks',
      details: error.message,
      stack: process.env.NODE_ENV === 'development' ? error.stack : undefined
    });
  } finally {
    connection.release();
  }
});

// Add subtask
router.post('/:taskId/subtasks', async (req, res) => {
  const { taskId } = req.params;
  const { title } = req.body;

  const connection = await pool.getConnection();
  try {
    await connection.beginTransaction();

    // First verify the task exists
    const [tasks] = await connection.execute(
      'SELECT id FROM workspace_tasks WHERE id = ?',
      [taskId]
    );

    if (tasks.length === 0) {
      await connection.rollback();
      return res.status(404).json({ error: 'Task not found' });
    }

    const subtaskId = uuidv4();
    const now = new Date().toISOString().slice(0, 19).replace('T', ' ');

    console.log('Creating subtask:', { subtaskId, taskId, title });

    await connection.execute(
      'INSERT INTO subtasks (id, task_id, title, created_at) VALUES (?, ?, ?, ?)',
      [subtaskId, taskId, title, now]
    );

    const [subtasks] = await connection.execute(
      'SELECT id, title, status FROM subtasks WHERE id = ?',
      [subtaskId]
    );

    await connection.commit();
    console.log('Created subtask:', subtasks[0]);

    res.status(201).json({ subtask: subtasks[0] });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to create subtask:', error);
    res.status(500).json({
      error: 'Failed to create subtask',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

// Update subtask status and parent task status
router.patch('/:taskId/subtasks/:subtaskId', async (req, res) => {
  const { taskId, subtaskId } = req.params;
  const { status } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    // Update subtask status
    await connection.execute(
      'UPDATE subtasks SET status = ? WHERE id = ? AND task_id = ?',
      [status, subtaskId, taskId]
    );

    // Get all subtasks for this task to determine task status
    const [subtasks] = await connection.execute(
      'SELECT status FROM subtasks WHERE task_id = ?',
      [taskId]
    );

    // Calculate new task status
    let newTaskStatus = 'pending';
    const completedCount = subtasks.filter(s => s.status === 'completed').length;

    if (completedCount === subtasks.length && subtasks.length > 0) {
      newTaskStatus = 'completed';
    } else if (completedCount > 0) {
      newTaskStatus = 'in-progress';
    }

    // Update task status
    await connection.execute(
      'UPDATE workspace_tasks SET status = ? WHERE id = ?',
      [newTaskStatus, taskId]
    );

    await connection.commit();

    // Return updated task and subtask info
    const [updatedTask] = await connection.execute(
      `SELECT wt.*,
        p.name as assignedToName,
        (SELECT JSON_ARRAYAGG(
          JSON_OBJECT(
            'id', s.id,
            'title', s.title,
            'status', s.status
          )
        )
        FROM subtasks s
        WHERE s.task_id = wt.id) as subtasks
       FROM workspace_tasks wt
       LEFT JOIN profiles p ON wt.assigned_to = p.id
       WHERE wt.id = ?`,
      [taskId]
    );

    res.json({
      task: {
        ...updatedTask[0],
        subtasks: JSON.parse(updatedTask[0].subtasks || '[]')
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to update subtask:', error);
    res.status(500).json({ error: 'Failed to update subtask' });
  } finally {
    connection.release();
  }
});

// Update subtask status endpoint - replace the existing route
router.patch('/subtasks/:subtaskId', async (req, res) => {
  const { subtaskId } = req.params;
  const { taskId, status } = req.body;
  const connection = await pool.getConnection();

  try {
    await connection.beginTransaction();

    console.log('Updating subtask:', { subtaskId, taskId, status });

    // Update subtask status
    const [updateResult] = await connection.execute(
      'UPDATE subtasks SET status = ? WHERE id = ? AND task_id = ?',
      [status, subtaskId, taskId]
    );

    if (updateResult.affectedRows === 0) {
      throw new Error('Subtask not found or not associated with task');
    }

    // Get all subtasks for this task
    const [subtasks] = await connection.execute(
      'SELECT status FROM subtasks WHERE task_id = ?',
      [taskId]
    );

    // Calculate new task status
    let newTaskStatus = 'pending';
    const completedCount = subtasks.filter(s => s.status === 'completed').length;

    if (completedCount === subtasks.length && subtasks.length > 0) {
      newTaskStatus = 'completed';
    } else if (completedCount > 0) {
      newTaskStatus = 'in-progress';
    }

    // Update task status
    await connection.execute(
      'UPDATE workspace_tasks SET status = ? WHERE id = ?',
      [newTaskStatus, taskId]
    );

    // Get updated task data
    const [updatedTasks] = await connection.execute(
      `SELECT
        wt.*,
        w.name as workspace_name,
        p.name as assignedToName
       FROM workspace_tasks wt
       JOIN workspaces w ON wt.workspace_id = w.id
       LEFT JOIN profiles p ON wt.assigned_to = p.id
       WHERE wt.id = ?`,
      [taskId]
    );

    // Get updated subtasks separately
    const [updatedSubtasks] = await connection.execute(
      'SELECT id, title, status FROM subtasks WHERE task_id = ?',
      [taskId]
    );

    await connection.commit();

    // Return task with subtasks as a plain object
    res.json({
      task: {
        ...updatedTasks[0],
        subtasks: updatedSubtasks
      }
    });
  } catch (error) {
    await connection.rollback();
    console.error('Failed to update subtask:', error);
    res.status(500).json({
      error: 'Failed to update subtask',
      details: error.message
    });
  } finally {
    connection.release();
  }
});

// Delete subtask
router.delete('/:taskId/subtasks/:subtaskId', async (req, res) => {
  const { taskId, subtaskId } = req.params;

  try {
    await pool.execute(
      'DELETE FROM subtasks WHERE id = ? AND task_id = ?',
      [subtaskId, taskId]
    );

    res.json({ message: 'Subtask deleted successfully' });
  } catch (error) {
    console.error('Failed to delete subtask:', error);
    res.status(500).json({ error: 'Failed to delete subtask' });
  }
});

export default router;
