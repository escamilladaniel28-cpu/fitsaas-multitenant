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

    // Registrar tenants en public.tenants para obtener sus UUIDs reales
    const tenantRowA = await query<{ id: string }>(
      `INSERT INTO public.tenants (name, slug, schema_name) VALUES ('Gym Alfa', $1, $2) RETURNING id;`,
      [slugA, schemaA]
    );
    const tenantRowB = await query<{ id: string }>(
      `INSERT INTO public.tenants (name, slug, schema_name) VALUES ('Gym Beta', $1, $2) RETURNING id;`,
      [slugB, schemaB]
    );
    const tenantIdA = tenantRowA[0].id;
    const tenantIdB = tenantRowB[0].id;

    console.log(`  ✓ Tenant A creado: ID "${tenantIdA}", Schema "${schemaA}"`);
    console.log(`  ✓ Tenant B creado: ID "${tenantIdB}", Schema "${schemaB}"\n`);

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

    // 4. Test Idempotency & Cross-Tenant Scoping (P0.2)
    console.log('[4/4] Probando idempotencia y aislamiento cross-tenant de Idempotency-Key...');
    const testKey = `test-key-${Date.now()}`;
    const dummyPayloadA = { socio: 'Alfa', plan: 'Gold' };
    const dummyPayloadB = { socio: 'Beta', plan: 'Silver' };
    const dummyPayloadA_Modified = { socio: 'Alfa Modificado', plan: 'Gold' };

    // 4.1 Tenant A con testKey
    const resA = await withIdempotency(testKey, '/api/socios', tenantIdA, dummyPayloadA, async () => {
      return NextResponse.json({ tenant: 'Alfa', created: true }, { status: 201 });
    });
    const bodyA = await resA.json();

    // 4.2 Tenant B con la MISMA testKey (Prueba de fuga cross-tenant)
    const resB = await withIdempotency(testKey, '/api/socios', tenantIdB, dummyPayloadB, async () => {
      return NextResponse.json({ tenant: 'Beta', created: true }, { status: 201 });
    });
    const bodyB = await resB.json();

    if (bodyA.tenant !== 'Alfa' || bodyB.tenant !== 'Beta') {
      throw new Error('CRÍTICO: Fuga de idempotencia detectada. Tenant B recibió la respuesta de Tenant A.');
    }
    console.log('  ✓ AISLAMIENTO DE IDEMPOTENCIA VERIFICADO: Tenant A y Tenant B tienen respuestas independientes con la misma key.');

    // 4.3 Tenant A repite la petición con el mismo payload (Replay en caché)
    const resAReplay = await withIdempotency(testKey, '/api/socios', tenantIdA, dummyPayloadA, async () => {
      throw new Error('Fallo: No debió ejecutarse el handler en un replay idempotente');
    });
    if (resAReplay.headers.get('X-Idempotent-Replay') !== 'true') {
      throw new Error('Fallo: No se encontró el header X-Idempotent-Replay: true.');
    }
    console.log('  ✓ REPLAY VERIFICADO: Se rejugó la respuesta en caché para Tenant A (X-Idempotent-Replay: true).');

    // 4.4 Tenant A reutiliza la key con diferente payload -> HTTP 422 idempotency_key_reused
    const resAConflict = await withIdempotency(testKey, '/api/socios', tenantIdA, dummyPayloadA_Modified, async () => {
      return NextResponse.json({ ok: true }, { status: 201 });
    });
    if (resAConflict.status !== 422) {
      throw new Error(`Fallo: Se esperaba HTTP 422 por reutilización de key con payload diferente, se obtuvo ${resAConflict.status}`);
    }
    const conflictBody = await resAConflict.json();
    if (conflictBody.error !== 'idempotency_key_reused') {
      throw new Error(`Fallo: Se esperaba error "idempotency_key_reused", se obtuvo "${conflictBody.error}"`);
    }
    console.log('  ✓ DETECCIÓN DE REUTILIZACIÓN VERIFICADA: HTTP 422 idempotency_key_reused al cambiar payload.\n');

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
