const packageManagers = ['pnpm', 'yarn', 'npm'];

const runCommands = ['run dev', 'run vite', 'dev', 'vite'];
// makes array like ['pnpm run dev', 'pnpm run vite']
export const PREVIEW_COMMANDS = packageManagers.flatMap((manager) => runCommands.map((cmd) => `${manager} ${cmd}`));

const buildCommands = ['run build', 'build'];
export const BUILD_COMMANDS: string[] = packageManagers.flatMap((manager) =>
  buildCommands.map((cmd) => `${manager} ${cmd}`),
);

console.log(runCommands, buildCommands);
if (!runCommands.length || !buildCommands.length) {
  throw new Error('Commands are not initalized');
}
