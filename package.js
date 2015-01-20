Package.describe({
  name: 'benhohner:pseudoauth',
  summary: 'Anonymous and pseudonymous-first-come-first-serve authentication by token.',
  version: '0.1.1',
  git: ' /* Fill me in! */ '
});

Package.onUse(function (api) {
  api.versionsFrom('1.0.2.1');
  
  api.use('mongo', ['client', 'server']);
  api.use('blaze', 'client', {weak: true});
  api.export('Pseudoauth');
  
  api.addFiles('pseudoauth_common.js', ['server', 'client'])
  api.addFiles('pseudoauth_server.js', 'server');
  api.addFiles('pseudoauth_client.js', 'client')
});
