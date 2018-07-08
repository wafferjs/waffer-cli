#!/usr/bin/node

const uglify    = require('uglify-es')
const fs        = require('fs-extra')
const optimist  = require('optimist')
const prompts   = require('prompts')
const _         = require('lodash')
const colors    = require('colors')
const path      = require('path')
const glob      = require('glob')

const { argv } = optimist;

const cwd = process.cwd();

if (argv._[0] === 'help') {
  console.log('waffer                   # start application');
  console.log('       --port <port>     # app port');
  console.log('       --session         # use session');
  console.log('       --db <mongo url>  # mongodb connection');
  console.log('       --prod            # start in production mode');
  console.log('       --debug           # start in debug mode');
  console.log('waffer new [<dir>]       # initialize waffer project');
  console.log('waffer view <name>       # create new view');
  console.log('waffer component <name>  # create new component');
  console.log('waffer controller <name> # create new controller');
  console.log('waffer help              # display help');

  process.exit()
}

const copyFilter = (src, dest) => {
    const file = dest.slice(cwd.length + 1);

    if (~file.indexOf('.')) {
      console.log('[+] '.green + file);
    }

    return true;
}

const copy = (src, dest, filter = copyFilter) => {
  fs.copySync(src, dest, { filter });
}

const copyEjsDir = (src, dest, data = {}, filter = copyFilter) => {
  const files = glob.sync(path.join(src, '*'));

  fs.ensureDirSync(dest);

  for (let file of files) {
    const dfile = path.join(dest, path.relative(src, file).slice(0, -4))
    if (file.endsWith('.ejs')) {
      try {
        const content = fs.readFileSync(file);
        const parsed = _.template(content)(data);
        fs.writeFileSync(dfile, parsed);
        console.log('[+] '.green + dfile.slice(cwd.length + 1));
      } catch (e) {
        console.error(e)
        console.log('[-] '.red + dfile.slice(cwd.length + 1));
      }

      continue;
    }

    // simply copy
  }
}

const copyEjs = (src, dest, data = {}, filter = copyFilter) => {

  const nfile = path.relative(path.join(__dirname, 'template'), src).slice(0, -4)
  const dfile = path.join(dest.slice(0, -nfile.length-4), nfile)

  if (src.endsWith('.ejs')) {
    try {
      const content = fs.readFileSync(src);
      const parsed = _.template(content)(data);

      fs.writeFileSync(dfile, parsed);
      console.log('[+] '.green + dfile.slice(cwd.length + 1));
    } catch (e) {
      console.error(e)
      console.log('[-] '.red + dfile.slice(cwd.length + 1));
    }
  }
}

const newView = dir => {
  const src = path.join(__dirname, 'template/views/index');
  const dest = path.join(cwd, 'views', dir);

  copy(src, dest);
  newController(dir);
}

const newController = dir => {
  const src = path.join(__dirname, 'template/controllers/index');
  const dest = path.join(cwd, 'controllers', dir);

  copy(src, dest);
}

const newComponent = (dir, wd = '/') => {
  const name = _.kebabCase(dir);
  const src = path.join(__dirname, 'template/assets/components/component');
  const dest = path.join(cwd, wd, 'assets', 'components', name);

  copyEjsDir(src, dest, { name });
}

const copyTemplate = dir => {
  const src = path.join(__dirname, 'template');
  const dest = path.join(cwd, dir);

  copy(src, dest, (src, dest) => {
    if (~dest.indexOf('/assets/components/component')) return false

    if (dest.endsWith('.ejs')) {
      copyEjs(src, dest, { name: dir })
      return false
    }
    copyFilter(src, dest);
    return true
  })
}

const getArgs = async (questions = []) => {
  const res = [];

  for (let i of [...Array(questions.length).keys()]) {
    if (argv._[1 + i]) {
      res.push(argv._[i + 1]);
      continue
    }

    const question = Object.assign({}, questions[i], { name: 'answer' });
    const { answer } = await prompts(question);
    res.push(answer);
  }

  if (questions.length === 1) return res[0];

  return res;
}

if (argv._[0] === 'new') {
  (async _ => {
    const dir = await getArgs([ 'Name your project' ])
    copyTemplate(dir);

    const { spawn } = require('child_process')
    const cwd = path.join(process.cwd(), dir)

    try {
      spawn('yarn', [], {
        cwd,
        stdio: 'inherit',
      })
    } catch (e) {
      spawn('npm', [ 'install' ], {
        cwd,
        stdio: 'inherit',
      })
    }

  })()

  return
}

if (!fs.existsSync(path.join(cwd, 'views'))) {
  console.error('[!] '.red + 'Not a valid waffer project.');
  return
}

if (argv._[0] === 'view') {
  (async () => {
    const dir = await getArgs([ 'Name your view' ])
    newView(dir);
    console.log('View ' + dir.green + ' created.');
    process.exit()
  })()

}

if (argv._[0] === 'controller') {
  (async () => {
    const dir = await getArgs([ 'Name your controller' ])
    newController(dir);
    console.log('Controller ' + dir.green + ' created.');
  })()

  return
}

if (argv._[0] === 'component') {
  (async () => {
    const dir = await getArgs([ 'Name your component' ])
    newComponent(dir);
    console.log('Component ' + dir.green + ' created.');
  })()

  return
}

const prod = !!argv.prod;
const debug = !!argv.debug;


const waffer = require(path.join(process.cwd(), 'node_modules', 'waffer'))
const server = waffer({ prod, debug });

// session
if (argv.session) {
  const secret = typeof argv.session === 'string' ? argv.session : 'I like waffles';

  // server.app.register(require('fastify-cookie'));
  // server.app.register(require('fastify-session'), { secret });
}

// production
if (prod) {
  // security headers
  // server.app.register(require('fastify-helmet'), { hidePoweredBy: { setTo: `waffer ${waffer.version}` } });

  // compression
  // server.app.register(require('fastify-compress'));
} else {
  server.log.warn('Runnin in development mode.')
}

// database
if (typeof argv.db === 'string') {
  // server.app.register(require('fastify-mongodb'), { url: argv.db })
}

server.listen(argv.port);
