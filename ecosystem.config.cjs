module.exports = {
  apps: [
    {
      name: 'ilmchi-api',
      cwd: './apps/api',
      script: 'dist/src/main.js',
      instances: 1,
      autorestart: true,
      watch: false,
      max_memory_restart: '800M',
      env_production: {
        NODE_ENV: 'production',
        PORT: 4100,
      },
    },
  ],
};
