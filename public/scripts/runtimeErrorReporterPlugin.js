// runtimeErrorReporterPlugin.js
import fs from 'fs';
import path from 'path';

export function runtimeErrorReporterPlugin(options = {}) {
  const scriptPath = options.scriptPath || path.resolve(process.cwd(), 'runtimeErrorReporterScript.js');
  return {
    name: 'inject-runtime-error-reporter',
    transformIndexHtml(html) {
      const script = fs.readFileSync(scriptPath, 'utf-8');
      return html.replace(
        '</head>',
        `<script>${script}</script></head>`
      );
    },
    configureServer(server) {
      server.middlewares.use('/__runtime_error__', (req, res) => {
        let data = '';
        req.on('data', chunk => (data += chunk));
        req.on('end', () => {
          console.error('[Runtime Error]', data);
          res.statusCode = 200;
          res.end('ok');
        });
      });
    },
  };
}
