module.exports = {
  apps: [{
    name: 'mapyourmeds-ips',
    script: './bin/www',
    cwd: 'D:/node_apps/mapyourmeds_ips',
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    },
    // --- robustness settings ---
    autorestart: true,                  // restart on any crash
    exp_backoff_restart_delay: 100,     // 100ms, then exponential backoff — avoids tight crash loops hammering the DB
    max_restarts: 50,                   // within min_uptime window before giving up
    min_uptime: '10s',                  // run < 10s = counts as a failed start
    max_memory_restart: '500M',         // proactive restart on memory leak
    // --- logging ---
    error_file: 'D:/node_apps/mapyourmeds_ips/logs/err.log',
    out_file: 'D:/node_apps/mapyourmeds_ips/logs/out.log',
    merge_logs: true,
    time: true                          // timestamps in logs
  }]
};
