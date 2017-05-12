/*

stderr: the input device is not a TTY.  If you are using mintty, try prefixing the command with 'winpty'

child process exited with code 0

*/

const path = require('path');
const fs = require('fs');
const yargs = require('yargs');
const childProcess = require('child_process');
const chalk = require('chalk');

const { argv } = yargs
  .usage('Usage: $0 [options]')
  .demandOption(['dir'])
  .alias('d', 'dir')
  .alias('s', 'script')
  .alias('w', 'watch')
  .describe('d', 'repertoire de base du projet (celui qui contient sources)')
  .describe('s', 'chemin complet du script a executer')
  .describe('w', 'chemin complet du repertoire à watcher')
  .help('h')
  .alias('h', 'help');

const dir = argv.dir || './';

const defaultScriptName = 'run-sync.ps1';

const scriptPath = path.normalize(argv.script ? argv.script : path.resolve(dir, defaultScriptName));

const watchPath = path.normalize(argv.watch ? argv.watch : path.resolve(dir, 'sources'));

const debounceTime = argv.debounce || 500;

console.log('----------------------------');
console.log('watching :', chalk.blue(watchPath));
console.log('script :', chalk.blue(scriptPath));
console.log('----------------------------');

const debounce = (fn, delay) => {
  let timer = null;

  return () => {
    const args = arguments;

    clearTimeout(timer);
    timer = setTimeout(() => {
      fn(args);
    }, delay);
  };
};

let busy = false;

const spawnDockerCommand = () => {
  if (busy) {
    return;
  }

  busy = true;

  const powershellScript = childProcess.spawn('powershell.exe', [`./${path.basename(scriptPath)}`], {
    cwd: path.dirname(scriptPath)
  });

  powershellScript.stdout.on('data', data => {
    console.log(`${data}`);
  });

  powershellScript.stderr.on('data', data => {
    console.log(chalk.red(`stderr: ${data}`));
  });

  powershellScript.on('close', code => {
    const chalkFunc = code === 0 ? chalk.green : chalk.red;

    busy = false;

    console.log(chalkFunc(`child process exited with code ${code}`));
  });
};

fs.watch(
  watchPath,
  {
    recursive: true
  },
  debounce(spawnDockerCommand, debounceTime)
);

spawnDockerCommand();
