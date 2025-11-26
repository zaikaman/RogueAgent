import dotenv from 'dotenv';
dotenv.config();

import crypto from 'crypto';
import { createClient } from '@supabase/supabase-js';

const ENCRYPTION_KEY = process.env.FUTURES_ENCRYPTION_KEY || 'rogue-futures-encryption-key-32';

async function test() {
  const sb = createClient(process.env.SUPABASE_URL!, process.env.SUPABASE_SERVICE_KEY!);
  
  const { data } = await sb
    .from('futures_api_keys')
    .select('encrypted_api_key')
    .eq('user_wallet_address', '0x46cC04De981E603958e4612f877D72427c5b6544')
    .single();

  if (!data) {
    console.log('No data found');
    return;
  }

  const enc = data.encrypted_api_key;
  console.log('Encrypted format:', enc.substring(0, 40) + '...');
  
  const [ivHex, encrypted] = enc.split(':');
  console.log('IV length:', ivHex.length);
  console.log('Encrypted length:', encrypted.length);
  
  const iv = Buffer.from(ivHex, 'hex');
  const key = crypto.scryptSync(ENCRYPTION_KEY, 'salt', 32);
  
  console.log('Key:', key.toString('hex').substring(0, 20) + '...');
  
  try {
    const decipher = crypto.createDecipheriv('aes-256-cbc', key, iv);
    let dec = decipher.update(encrypted, 'hex', 'utf8');
    dec += decipher.final('utf8');
    console.log('Decrypted PK starts with:', dec.substring(0, 4));
    console.log('Decrypted PK length:', dec.length);
  } catch (e: any) {
    console.log('Decryption error:', e.message);
  }
}

test();
