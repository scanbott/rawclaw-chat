#!/usr/bin/env node

/**
 * RawClaw Chat interactive setup wizard.
 * Collects configuration, writes .env, tests Supabase, creates admin user.
 */

import { createInterface } from 'readline';
import { writeFileSync, existsSync } from 'fs';
import { randomBytes } from 'crypto';
import { createClient } from '@supabase/supabase-js';

const rl = createInterface({ input: process.stdin, output: process.stdout });

function ask(question) {
  return new Promise((resolve) => {
    rl.question(question, (answer) => resolve(answer.trim()));
  });
}

function askSecret(question) {
  return new Promise((resolve) => {
    process.stdout.write(question);
    const stdin = process.stdin;
    const wasRaw = stdin.isRaw;
    if (stdin.isTTY) stdin.setRawMode(true);

    let input = '';
    const onData = (ch) => {
      const c = ch.toString();
      if (c === '\n' || c === '\r') {
        if (stdin.isTTY) stdin.setRawMode(wasRaw || false);
        stdin.removeListener('data', onData);
        process.stdout.write('\n');
        resolve(input.trim());
      } else if (c === '\u007f' || c === '\b') {
        input = input.slice(0, -1);
      } else if (c === '\u0003') {
        process.exit(1);
      } else {
        input += c;
      }
    };
    stdin.on('data', onData);
  });
}

async function main() {
  console.log('');
  console.log('  RawClaw Chat Setup');
  console.log('  ==================');
  console.log('');

  // 1. Company name
  const companyName = await ask('  Company name: ');
  if (!companyName) {
    console.error('  Company name is required.');
    process.exit(1);
  }

  // 2. Supabase URL
  const supabaseUrl = await ask('  Supabase URL (https://xxx.supabase.co): ');
  if (!supabaseUrl) {
    console.error('  Supabase URL is required.');
    process.exit(1);
  }

  // 3. Supabase service key
  const supabaseKey = await askSecret('  Supabase service key: ');
  if (!supabaseKey) {
    console.error('  Supabase service key is required.');
    process.exit(1);
  }

  // 4. Anthropic API key
  const anthropicKey = await askSecret('  Anthropic API key: ');
  if (!anthropicKey) {
    console.error('  Anthropic API key is required.');
    process.exit(1);
  }

  // 5. Admin email
  const adminEmail = await ask('  Admin email: ');
  if (!adminEmail || !adminEmail.includes('@')) {
    console.error('  Valid email is required.');
    process.exit(1);
  }

  // 6. Admin password
  const adminPassword = await askSecret('  Admin password: ');
  if (!adminPassword || adminPassword.length < 8) {
    console.error('  Password must be at least 8 characters.');
    process.exit(1);
  }

  const confirmPassword = await askSecret('  Confirm password: ');
  if (adminPassword !== confirmPassword) {
    console.error('  Passwords do not match.');
    process.exit(1);
  }

  // 7. Generate AUTH_SECRET and write .env
  const authSecret = randomBytes(32).toString('base64');

  const envContent = [
    `# RawClaw Chat Configuration`,
    `# Generated ${new Date().toISOString()}`,
    ``,
    `COMPANY_NAME="${companyName}"`,
    ``,
    `# Supabase`,
    `SUPABASE_URL=${supabaseUrl}`,
    `SUPABASE_SERVICE_KEY=${supabaseKey}`,
    ``,
    `# Anthropic`,
    `ANTHROPIC_API_KEY=${anthropicKey}`,
    ``,
    `# Auth`,
    `AUTH_SECRET=${authSecret}`,
    `APP_URL=http://localhost:3000`,
    ``,
  ].join('\n');

  writeFileSync('.env', envContent);
  console.log('');
  console.log('  [ok] .env file written');

  // 8. Test Supabase connection
  console.log('  [..] Testing Supabase connection...');
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });
    const { error } = await supabase.from('users').select('id').limit(1);
    if (error && !error.message.includes('does not exist')) {
      console.error(`  [!!] Supabase test query failed: ${error.message}`);
      console.error('  Make sure your Supabase project has the required tables.');
      console.error('  Check supabase/ directory for migration files.');
    } else {
      console.log('  [ok] Supabase connection verified');
    }
  } catch (err) {
    console.error(`  [!!] Could not connect to Supabase: ${err.message}`);
  }

  // 9. Create admin user
  console.log('  [..] Creating admin user...');
  try {
    const supabase = createClient(supabaseUrl, supabaseKey, {
      auth: { persistSession: false },
    });

    // Hash password with bcrypt-ts
    const { hash } = await import('bcrypt-ts');
    const passwordHash = await hash(adminPassword, 10);

    const { error } = await supabase.from('users').upsert({
      email: adminEmail,
      password: passwordHash,
      role: 'admin',
      name: companyName + ' Admin',
    }, { onConflict: 'email' });

    if (error) {
      console.error(`  [!!] Failed to create admin: ${error.message}`);
    } else {
      console.log(`  [ok] Admin user created: ${adminEmail}`);
    }
  } catch (err) {
    console.error(`  [!!] Error creating admin: ${err.message}`);
    console.error('  You can create the admin user manually in Supabase.');
  }

  // 10. Done
  console.log('');
  console.log('  ================================');
  console.log('  Setup complete.');
  console.log(`  Company: ${companyName}`);
  console.log(`  Admin:   ${adminEmail}`);
  console.log('  ================================');
  console.log('');

  rl.close();
}

main().catch((err) => {
  console.error('Setup failed:', err.message);
  process.exit(1);
});
