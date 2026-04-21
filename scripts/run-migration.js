#!/usr/bin/env node

/**
 * Script pour exécuter les migrations Supabase
 * Usage: node scripts/run-migration.js
 * 
 * Assurez-vous que les variables d'environnement sont définies:
 * - SUPABASE_URL
 * - SUPABASE_SERVICE_ROLE_KEY
 */

const fs = require('fs');
const path = require('path');
const https = require('https');

const SUPABASE_URL = process.env.SUPABASE_URL;
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
  console.error('[ERROR] Variables d\'environnement manquantes:');
  console.error('- SUPABASE_URL:', SUPABASE_URL ? '✓' : '✗');
  console.error('- SUPABASE_SERVICE_ROLE_KEY:', SUPABASE_SERVICE_ROLE_KEY ? '✓' : '✗');
  process.exit(1);
}

async function executeSql(sql) {
  return new Promise((resolve, reject) => {
    const url = new URL(`${SUPABASE_URL}/rest/v1/rpc/exec_sql`, SUPABASE_URL);
    
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
        'apikey': SUPABASE_SERVICE_ROLE_KEY,
      },
    };

    const req = https.request(SUPABASE_URL.replace('https://', ''), options, (res) => {
      let data = '';
      res.on('data', (chunk) => { data += chunk; });
      res.on('end', () => {
        if (res.statusCode === 200 || res.statusCode === 201) {
          resolve(data);
        } else {
          reject(new Error(`HTTP ${res.statusCode}: ${data}`));
        }
      });
    });

    req.on('error', reject);
    req.write(JSON.stringify({ query: sql }));
    req.end();
  });
}

// Meilleure approche : utiliser pg directement
async function runMigrationWithPg() {
  try {
    const { createClient } = require('@supabase/supabase-js');
    
    const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);
    
    // Lire le fichier de migration
    const migrationPath = path.join(__dirname, '002_align_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('[INFO] Exécution du script SQL...');
    
    // Diviser en statements individuels
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s.length > 0 && !s.startsWith('--'));
    
    console.log(`[INFO] ${statements.length} statements à exécuter`);
    
    // Exécuter chaque statement
    for (let i = 0; i < statements.length; i++) {
      const stmt = statements[i] + ';';
      console.log(`[${i + 1}/${statements.length}] Exécution...`);
      
      try {
        const { error } = await supabase.rpc('exec_sql', { query: stmt });
        if (error) {
          console.error(`[ERREUR] Statement ${i + 1}: ${error.message}`);
        } else {
          console.log(`[✓] Statement ${i + 1} exécuté`);
        }
      } catch (err) {
        console.error(`[ERREUR] Statement ${i + 1}: ${err.message}`);
      }
    }
    
    console.log('[✓] Migration terminée!');
  } catch (err) {
    console.error('[ERREUR]', err.message);
    process.exit(1);
  }
}

// Exécuter avec un client postgres directement
async function runMigrationDirect() {
  try {
    // Essayer d'utiliser pg pour une connexion directe
    const { Pool } = require('pg');
    
    const connectionString = `postgresql://${new URL(SUPABASE_URL).hostname}`;
    
    const pool = new Pool({
      connectionString,
      sslmode: 'require',
      password: SUPABASE_SERVICE_ROLE_KEY,
    });
    
    const client = await pool.connect();
    
    try {
      const migrationPath = path.join(__dirname, '002_align_schema.sql');
      const sql = fs.readFileSync(migrationPath, 'utf-8');
      
      console.log('[INFO] Exécution de la migration SQL...');
      
      await client.query(sql);
      
      console.log('[✓] Migration exécutée avec succès!');
    } finally {
      client.release();
      await pool.end();
    }
  } catch (err) {
    console.error('[ERREUR]', err.message);
    process.exit(1);
  }
}

// Exécuter via l'API Supabase
async function runMigrationViaAPI() {
  try {
    const migrationPath = path.join(__dirname, '002_align_schema.sql');
    const sql = fs.readFileSync(migrationPath, 'utf-8');
    
    console.log('[INFO] Envoi de la migration à Supabase...');
    
    const url = `${SUPABASE_URL}/functions/v1/execute-sql`;
    
    // Pour cela, il faudrait une fonction serverless Supabase
    console.log('[INFO] Utilisation de l\'API Supabase SQL');
    
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${SUPABASE_SERVICE_ROLE_KEY}`,
      },
      body: JSON.stringify({ sql }),
    });
    
    if (!response.ok) {
      throw new Error(`${response.status}: ${await response.text()}`);
    }
    
    const result = await response.json();
    console.log('[✓] Migration exécutée:', result);
  } catch (err) {
    console.error('[ERREUR]', err.message);
    process.exit(1);
  }
}

console.log('[*] Script de migration Supabase');
console.log('');
console.log('Pour exécuter les migrations, vous pouvez:');
console.log('1. Copier/coller le contenu de 002_align_schema.sql dans l\'éditeur SQL Supabase');
console.log('2. Utiliser psql avec: psql -h db.XXX.supabase.co -U postgres < scripts/002_align_schema.sql');
console.log('');
console.log('Chemin du script:', path.join(__dirname, '002_align_schema.sql'));
