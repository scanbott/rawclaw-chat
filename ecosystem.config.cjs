module.exports = {
  apps: [{
    name: 'rawclaw-chat',
    script: 'node_modules/.bin/next',
    args: 'start -p 3000',
    cwd: __dirname,
    env: {
      NODE_ENV: 'production',
      PORT: 3000
    }
  }]
};
