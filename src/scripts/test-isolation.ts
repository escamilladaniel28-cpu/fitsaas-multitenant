import { initGlobalSchema, createTenantSchema } from '../lib/tenants';
import { query, pool } from '../lib/db';
import { withIdempotency } from '../lib/idempotency';
import { NextResponse } from 'next/server';

async function runTests() {
  console.log('\n=============================================');
  console.log('🧪 EJECUTANDO SUITE DE PRUEBAS DE AISLAMIENTO');
  console.log('=============================================\n');

  try {
    // 1. Init schema
    console.log('[1/4] Inicializando schema global public...');
    await initGlobalSchema();
    console.log('  ✓ Schema public inicializado correctamente.\n');

    // 2. Provision Tenant A & Tenant B
    console.log('[2/4] Creando dos tenants distintos (Tenant A y Tenant B)...');
    const slugA = `test_gym_a_${Date.now()}`;
    const slugB = `test_gym_b_${Date.now()}`;

    const schemaA = await createTenantSchema(slugA, 'Gym Alfa');
    const schemaB = await createTenantSchema(slugB, 'Gym Beta');

    console.log(`  ✓ Tenant A creado: Schema "${schemaA}"`);
    console.log(`  ✓ Tenant B creado: Schema "${schemaB}"\n`);

    // 3. Insert member in Tenant A
    console.log('[3/4] Insertando un socio exclusivamente en Tenant A...');
    await query(
      `INSERT INTO socios (nombre, documento, email, estado) 
       VALUES ('Carlos Alfa', 'DOC-ALFA-001', 'carlos@alfa.com', 'activo');`,
      [],
      schemaA
    );

    // Verify Tenant A can see it
    const sociosInA = await query<{ nombre: string }>(
      `SELECT nombre FROM socios WHERE documento = 'DOC-ALFA-001';`,
      [],
      schemaA
    );
    if (sociosInA.length !== 1) {
      throw new Error('Fallo: No se encontró el socio en Tenant A.');
    }
    console.log('  ✓ Socio encontrado en Tenant A:', sociosInA[0].nombre);

    // Verify Tenant B CANNOT see it (Isolation test)
    const sociosInB = await query<{ nombre: string }>(
      `SELECT nombre FROM socios WHERE documento = 'DOC-ALFA-001';`,
      [],
      schemaB
    );
    if (sociosInB.length !== 0) {
      throw new Error('CRÍTICO: Filtración de datos detectada. Tenant B pudo ver datos de Tenant A.');
    }
    console.log('  ✓ AISLAMIENTO VERIFICADO: Tenant B tiene 0 registros del socio de Tenant A.\n');

    // 4. Test Idempotency
    console.log('[4/4] Probando idempotencia con Idempotency-Key...');
    const testKey = `test-key-${Date.now()}`;
    let executionCounter = 0;

    const dummyHandler = async () => {
      executionCounter++;
      return NextResponse.json({ counter: executionCounter, message: 'Operación ejecutada' }, { status: 201 });
    };

    // First call
    const res1 = await withIdempotency(testKey, '/api/test', undefined, dummyHandler);
    const body1 = await res1.json();

    // Second call with the EXACT SAME KEY
    const res2 = await withIdempotency(testKey, '/api/test', undefined, dummyHandler);
    const body2 = await res2.json();
    const replayHeader = res2.headers.get('X-Idempotent-Replay');

    if (executionCounter !== 1) {
      throw new Error(`Fallo de idempotencia: el handler se ejecutó ${executionCounter} veces en lugar de 1.`);
    }

    if (replayHeader !== 'true' || body1.counter !== body2.counter) {
      throw new Error('Fallo de idempotencia: la respuesta no fue rejugada desde el caché.');
    }

    console.log(`  ✓ Primera llamada: counter = ${body1.counter}`);
    console.log(`  ✓ Segunda llamada: counter = ${body2.counter} (X-Idempotent-Replay: ${replayHeader})`);
    console.log('  ✓ IDEMPOTENCIA VERIFICADA: La lógica se ejecutó exactamente 1 vez.\n');

    console.log('=============================================');
    console.log('🎉 TODAS LAS PRUEBAS AUTOMATIZADAS PASARON CON ÉXITO');
    console.log('=============================================\n');
  } catch (error: any) {
    console.error('\n❌ ERROR EN PRUEBAS:', error.message);
    process.exit(1);
  } finally {
    await pool.end();
  }
}

runTests();
