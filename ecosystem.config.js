module.exports = {
  apps: [
    {
      name: 'hexo-dashboard',
      script: 'node_modules/.bin/next',
      args: 'start -p 4000 -H 127.0.0.1',
      cwd: __dirname,
      instances: 1,
      exec_mode: 'fork',
      autorestart: true,
      watch: false,
      max_memory_restart: '512M',
      env: {
        NODE_ENV: 'production',
        NEXT_PUBLIC_BASE_PATH: '/proxy/hexo',
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss',
      error_file: 'logs/error.log',
      out_file: 'logs/out.log',
      merge_logs: true,
    },
  ],
};
