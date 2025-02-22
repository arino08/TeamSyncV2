import crypto from 'crypto';
import { pool } from '../server.js';
import { v4 as uuidv4 } from 'uuid'; // Add uuid dependency

export async function hashPassword(password) {
    const salt = crypto.randomBytes(16).toString('hex');
    const hash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return { hash, salt };
}

export async function verifyPassword(password, hash, salt) {
    const verifyHash = crypto.pbkdf2Sync(password, salt, 1000, 64, 'sha512').toString('hex');
    return hash === verifyHash;
}

export async function createUser(email, password, name) {
    const { hash, salt } = await hashPassword(password);
    const id = uuidv4();  // Generate a new UUID in-app
    const connection = await pool.getConnection();
    try {
        await connection.beginTransaction();

        // Insert into profiles first with the generated id.
        await connection.execute(
            'INSERT INTO profiles (id, name, role) VALUES (?, ?, ?)',
            [id, name || email.split('@')[0], 'member']
        );

        // Then insert into auth_users using the same id.
        await connection.execute(
            'INSERT INTO auth_users (id, email, password_hash, salt) VALUES (?, ?, ?, ?)',
            [id, email, hash, salt]
        );

        await connection.commit();
        return id;
    } catch (error) {
        await connection.rollback();
        throw error;
    } finally {
        connection.release();
    }
}

export async function login(email, password) {
    const [users] = await pool.execute(
        `SELECT
            a.id,
            a.email,
            a.password_hash,
            a.salt,
            p.name,
            p.role AS user_role
         FROM auth_users a
         JOIN profiles p ON a.id = p.id
         WHERE a.email = ?`,
        [email]
    );

    if (users.length === 0) {
        return null;
    }

    const user = users[0];
    const isValid = await verifyPassword(password, user.password_hash, user.salt);

    if (!isValid) {
        return null;
    }

    return {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.user_role  // use the aliased role field
    };
}

export async function getUserById(userId) {
    console.log('Getting user by ID:', userId); // Debug log
    const [users] = await pool.execute(
        `SELECT
            a.id,
            a.email,
            p.name,
            p.role AS user_role
         FROM auth_users a
         JOIN profiles p ON a.id = p.id
         WHERE a.id = ?`,
        [userId]
    );
    const user = users[0] || null;
    console.log('Raw user data from DB:', user);
    if (user) {
        const cleanUser = {
            id: user.id,
            email: user.email,
            name: user.name,
            role: user.user_role  // assign from the aliased column
        };
        console.log('Cleaned user object:', cleanUser);
        return cleanUser;
    }
    return null;
}
