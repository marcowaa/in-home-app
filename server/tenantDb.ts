import { drizzle, NodePgDatabase } from "drizzle-orm/node-postgres";
import pg from "pg";
import bcrypt from "bcrypt";
import { eq, sql as dsql } from "drizzle-orm";
import * as schema from "@shared/schema";
import { pool as mainPool } from "./db";

const { Pool } = pg;

// Cache tenant pools and storage instances
const tenantPools: Map<string, pg.Pool> = new Map();
const tenantDbs: Map<string, NodePgDatabase<typeof schema>> = new Map();

/**
 * Get the base connection URL without the database name
 */
function getBaseUrl(): string {
  const url = process.env.DATABASE_URL!;
  // Remove the database name from the URL
  // postgresql://user@host:port/dbname -> postgresql://user@host:port
  const lastSlash = url.lastIndexOf("/");
  return url.substring(0, lastSlash);
}

/**
 * Generate a unique database name for a tenant
 */
export function generateDbName(username: string): string {
  const clean = username.replace(/[^a-zA-Z0-9]/g, "").toLowerCase();
  const suffix = Date.now().toString(36);
  return `tenant_${clean}_${suffix}`;
}

/**
 * Get or create a connection pool for a tenant database
 */
export function getTenantPool(dbName: string): pg.Pool {
  if (tenantPools.has(dbName)) {
    return tenantPools.get(dbName)!;
  }
  const baseUrl = getBaseUrl();
  const connectionString = `${baseUrl}/${dbName}`;
  const pool = new Pool({ connectionString, max: 5 });
  tenantPools.set(dbName, pool);
  return pool;
}

/**
 * Get a drizzle DB instance for a tenant
 */
export function getTenantDb(dbName: string): NodePgDatabase<typeof schema> {
  if (tenantDbs.has(dbName)) {
    return tenantDbs.get(dbName)!;
  }
  const pool = getTenantPool(dbName);
  const db = drizzle(pool, { schema });
  tenantDbs.set(dbName, db);
  return db;
}

/**
 * Create a new PostgreSQL database for a tenant
 */
export async function createTenantDatabase(dbName: string): Promise<void> {
  const client = await mainPool.connect();
  try {
    // Create the database
    await client.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    client.release();
  }
}

/**
 * Initialize schema and default data in a tenant database
 */
export async function initializeTenantDatabase(dbName: string, adminUsername: string, adminPassword: string): Promise<void> {
  const pool = getTenantPool(dbName);
  const client = await pool.connect();

  try {
    // Create all tables using raw SQL (matching the schema exactly)
    await client.query(`
      CREATE EXTENSION IF NOT EXISTS "pgcrypto";

      CREATE TABLE IF NOT EXISTS admin_users (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS delivery_drivers (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        username TEXT NOT NULL UNIQUE,
        password TEXT NOT NULL,
        name TEXT NOT NULL,
        phone TEXT,
        whatsapp_phone TEXT,
        verification_code TEXT,
        is_verified BOOLEAN DEFAULT false,
        is_active BOOLEAN DEFAULT true,
        is_available BOOLEAN DEFAULT true,
        latitude DECIMAL(10, 7),
        longitude DECIMAL(10, 7),
        wallet_balance DECIMAL(10, 2) DEFAULT 0,
        total_earnings DECIMAL(10, 2) DEFAULT 0,
        completed_orders INTEGER DEFAULT 0,
        profile_image TEXT,
        governorate TEXT,
        city TEXT,
        village TEXT,
        id_verified BOOLEAN DEFAULT false,
        criminal_record_verified BOOLEAN DEFAULT false,
        national_id_image TEXT,
        national_id_image_back TEXT,
        criminal_record_image TEXT,
        criminal_record_image_back TEXT,
        max_weight DECIMAL(6, 2),
        vehicle_type TEXT,
        fully_verified BOOLEAN DEFAULT false,
        referral_code TEXT UNIQUE,
        referred_by TEXT,
        average_rating DECIMAL(3, 2) DEFAULT 0,
        total_ratings INTEGER DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payment_methods (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        name_en TEXT,
        type TEXT NOT NULL,
        account_number TEXT,
        instructions TEXT,
        qr_code TEXT,
        icon TEXT,
        is_active BOOLEAN DEFAULT true,
        sort_order INTEGER DEFAULT 0
      );

      CREATE TABLE IF NOT EXISTS orders (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        order_number TEXT NOT NULL UNIQUE,
        customer_name TEXT NOT NULL,
        customer_phone TEXT NOT NULL,
        customer_address TEXT NOT NULL,
        governorate TEXT,
        city TEXT,
        village TEXT,
        notes TEXT,
        total DECIMAL(10, 2) NOT NULL,
        shipping_cost DECIMAL(10, 2) DEFAULT 0,
        payment_method TEXT NOT NULL,
        payment_proof TEXT,
        status TEXT DEFAULT 'pending',
        tracking_code TEXT UNIQUE,
        delivery_code TEXT,
        driver_id VARCHAR REFERENCES delivery_drivers(id),
        driver_name TEXT,
        driver_commission DECIMAL(10, 2) DEFAULT 0,
        weight DECIMAL(6, 2),
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        store_name TEXT DEFAULT 'نظام المندوبين',
        store_name_en TEXT DEFAULT 'Driver System',
        site_title TEXT DEFAULT 'متجر أناقة - أزياء نسائية فاخرة',
        site_description TEXT DEFAULT 'متجر أناقة للأزياء النسائية الفاخرة',
        currency TEXT DEFAULT 'ج.م',
        logo TEXT,
        app_icon TEXT,
        favicon TEXT,
        primary_color TEXT DEFAULT '#ec4899',
        admin_dashboard_background TEXT,
        admin_sidebar_background TEXT,
        admin_login_background TEXT,
        driver_dashboard_background TEXT,
        default_shipping_cost DECIMAL(10, 2) DEFAULT 0,
        commission_type TEXT DEFAULT 'percentage',
        commission_value DECIMAL(10, 2) DEFAULT 10,
        whatsapp_number TEXT,
        require_shipping_cost BOOLEAN DEFAULT false,
        driver_commission_base DECIMAL(5, 2) DEFAULT 5,
        driver_commission_verified_id DECIMAL(5, 2) DEFAULT 8,
        driver_commission_verified_criminal DECIMAL(5, 2) DEFAULT 12,
        referral_bonus_amount DECIMAL(10, 2) DEFAULT 50,
        created_at TIMESTAMP DEFAULT NOW(),
        updated_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS driver_notifications (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id VARCHAR NOT NULL REFERENCES delivery_drivers(id),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS order_driver_assignments (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        order_id VARCHAR NOT NULL REFERENCES orders(id),
        driver_id VARCHAR NOT NULL REFERENCES delivery_drivers(id),
        status TEXT DEFAULT 'pending',
        responded_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS driver_wallet_transactions (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id VARCHAR NOT NULL REFERENCES delivery_drivers(id),
        amount DECIMAL(10, 2) NOT NULL,
        type TEXT NOT NULL,
        description TEXT,
        reference_id TEXT,
        balance_after DECIMAL(10, 2),
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS driver_withdrawal_requests (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id VARCHAR NOT NULL REFERENCES delivery_drivers(id),
        amount DECIMAL(10, 2) NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        account_number TEXT,
        admin_notes TEXT,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS driver_deposit_requests (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id VARCHAR NOT NULL REFERENCES delivery_drivers(id),
        amount DECIMAL(10, 2) NOT NULL,
        status TEXT DEFAULT 'pending',
        payment_method TEXT,
        payment_proof TEXT,
        admin_notes TEXT,
        processed_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS admin_notifications (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        title TEXT NOT NULL,
        message TEXT NOT NULL,
        type TEXT DEFAULT 'info',
        is_read BOOLEAN DEFAULT false,
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS driver_ratings (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        driver_id VARCHAR NOT NULL REFERENCES delivery_drivers(id),
        order_id VARCHAR REFERENCES orders(id),
        rating INTEGER NOT NULL,
        comment TEXT,
        customer_name TEXT,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS driver_referrals (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        referrer_id VARCHAR NOT NULL REFERENCES delivery_drivers(id),
        referred_id VARCHAR NOT NULL REFERENCES delivery_drivers(id),
        status TEXT DEFAULT 'pending',
        bonus_amount DECIMAL(10, 2) DEFAULT 0,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS api_keys (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        api_key TEXT NOT NULL UNIQUE,
        secret_key TEXT NOT NULL,
        permissions JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        ip_whitelist JSONB DEFAULT '[]',
        rate_limit INTEGER DEFAULT 100,
        total_requests INTEGER DEFAULT 0,
        last_used_at TIMESTAMP,
        expires_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS webhooks (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        name TEXT NOT NULL,
        url TEXT NOT NULL,
        secret TEXT NOT NULL,
        events JSONB DEFAULT '[]',
        is_active BOOLEAN DEFAULT true,
        max_retries INTEGER DEFAULT 3,
        consecutive_failures INTEGER DEFAULT 0,
        last_triggered_at TIMESTAMP,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS api_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        api_key_id VARCHAR REFERENCES api_keys(id),
        method TEXT NOT NULL,
        path TEXT NOT NULL,
        status_code INTEGER NOT NULL,
        request_body JSONB,
        response_body JSONB,
        ip_address TEXT,
        duration INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS webhook_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        webhook_id VARCHAR NOT NULL REFERENCES webhooks(id),
        event TEXT NOT NULL,
        url TEXT NOT NULL,
        request_body JSONB,
        response_status INTEGER,
        response_body TEXT,
        success BOOLEAN DEFAULT false,
        error TEXT,
        duration INTEGER,
        created_at TIMESTAMP DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS operation_logs (
        id VARCHAR PRIMARY KEY DEFAULT gen_random_uuid(),
        type TEXT NOT NULL,
        driver_id VARCHAR REFERENCES delivery_drivers(id),
        driver_name TEXT,
        order_id VARCHAR,
        order_number TEXT,
        customer_name TEXT,
        customer_phone TEXT,
        amount DECIMAL(10, 2),
        description TEXT NOT NULL,
        status TEXT DEFAULT 'completed',
        metadata JSONB,
        created_at TIMESTAMP DEFAULT NOW()
      );
    `);

    // Create default admin
    const hashedPassword = await bcrypt.hash(adminPassword, 10);
    await client.query(
      `INSERT INTO admin_users (id, username, password) VALUES (gen_random_uuid(), $1, $2) ON CONFLICT (username) DO UPDATE SET password = $2`,
      [adminUsername, hashedPassword]
    );

    // Create default settings
    await client.query(`
      INSERT INTO app_settings (id, store_name, store_name_en, currency, commission_type, commission_value)
      VALUES (gen_random_uuid(), 'نظام المندوبين', 'Driver System', 'ج.م', 'percentage', 10)
      ON CONFLICT DO NOTHING
    `);

  } finally {
    client.release();
  }
}

/**
 * Drop a tenant database
 */
export async function dropTenantDatabase(dbName: string): Promise<void> {
  // Close the pool first if it exists
  if (tenantPools.has(dbName)) {
    await tenantPools.get(dbName)!.end();
    tenantPools.delete(dbName);
    tenantDbs.delete(dbName);
  }

  const client = await mainPool.connect();
  try {
    // Terminate connections to the database
    await client.query(`
      SELECT pg_terminate_backend(pid) 
      FROM pg_stat_activity 
      WHERE datname = $1 AND pid <> pg_backend_pid()
    `, [dbName]);
    // Drop the database
    await client.query(`DROP DATABASE IF EXISTS "${dbName}"`);
  } finally {
    client.release();
  }
}

/**
 * Close a tenant pool (for when deactivating)
 */
export async function closeTenantPool(dbName: string): Promise<void> {
  if (tenantPools.has(dbName)) {
    await tenantPools.get(dbName)!.end();
    tenantPools.delete(dbName);
    tenantDbs.delete(dbName);
  }
}
