'use strict';

/**
 * Dev utility: print all registered API routes. Helps verify the surface
 * matches the consumer contract. Run: node scripts/list-routes.js
 *
 * Walks the datasync + core router groups directly (known /api mount + known
 * controller-segment mounts) so paths are exact rather than reverse-engineered
 * from Express layer regexps.
 */

function routePaths(router) {
  const out = [];
  (router.stack || []).forEach((l) => {
    if (l.route) {
      const methods = Object.keys(l.route.methods)
        .filter((k) => l.route.methods[k])
        .map((s) => s.toUpperCase())
        .join(',');
      out.push({ methods, path: l.route.path });
    }
  });
  return out;
}

function dump(groupName, groupRouter, base) {
  console.log(`\n=== ${groupName} (mounted at ${base}) ===`);
  let count = 0;
  (groupRouter.stack || []).forEach((layer) => {
    if (layer.name === 'router' && layer.handle && layer.handle.stack) {
      // We can't easily read the mount segment from the regexp; rely on the
      // index module's known structure instead (see note below).
      routePaths(layer.handle).forEach((r) => {
        console.log(`  ${r.methods.padEnd(6)} ${base}/<controller>${r.path}`);
        count++;
      });
    } else if (layer.route) {
      const methods = Object.keys(layer.route.methods).filter((k) => layer.route.methods[k]).map((s) => s.toUpperCase()).join(',');
      console.log(`  ${methods.padEnd(6)} ${base}${layer.route.path}`);
      count++;
    }
  });
  console.log(`  (${count} handlers)`);
}

// Load and print per-controller routers explicitly for exact paths.
const controllers = {
  Account: require('../routes/datasync/account'),
  Facility: require('../routes/datasync/facility'),
  GetDataByID: require('../routes/datasync/getDataById'),
  TaskManagement: require('../routes/datasync/taskManagement'),
  PrescriptionData: require('../routes/datasync/prescriptionData'),
  Cycle: require('../routes/datasync/cycle'),
  RefillRequestData: require('../routes/datasync/refillRequestData'),
  MedSheet: require('../routes/datasync/medSheet'),
  DrugReceive: require('../routes/datasync/drugReceive'),
};

let total = 0;
console.log('=== /api datasync routes ===');
Object.entries(controllers).forEach(([name, r]) => {
  routePaths(r).forEach((rt) => {
    const p = rt.path === '/' ? '' : rt.path;
    console.log(`  ${rt.methods.padEnd(6)} /api/${name}${p}`);
    total++;
  });
});
console.log(`\nTotal datasync handlers: ${total}`);
