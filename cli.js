#!/usr/bin/node

const fs        = require('fs-extra');
const optimist  = require('optimist');
const prompts   = require('prompts');
const _         = require('lodash');
const waffer    = require('waffer');
const rimraf    = require('rimraf');
const colors    = require('colors');
const path      = require('path');
const glob      = require('glob');

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
  console.log('waffer export            # export all views into simple html site');
  console.log('waffer help              # display help');
  return;
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

const copyEjs = (src, dest, data = {}, filter = copyFilter) => {
  const files = glob.sync(path.join(src, '*'));

  fs.ensureDirSync(dest);
  
  for (let file of files) {
    const dfile = path.join(dest, path.relative(src, file).slice(0, -4))
    if (file.endsWith('.ejs')) {
      try {
        const content = fs.readFileSync(file);
        const parsed = _.template(content)(data);
        fs.writeFileSync(dfile, parsed);
        console.log('[+] '.green + dfile);
      } catch (e) {
        console.error(e)
        console.log('[-] '.red + dfile);
      }

      continue;
    }

    // simply copy
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

const newComponent = dir => {
  const name = _.kebabCase(dir);
  const src = path.join(__dirname, 'template/components/component');
  const dest = path.join(cwd, 'components', name);

  copyEjs(src, dest, { name });
}

const copyTemplate = dir => {
  const src = path.join(__dirname, 'template');
  const dest = path.join(cwd, dir);

  copy(src, dest, (src, dest) => {
    return !~dest.indexOf('/components/component') && copyFilter(src, dest);
  })

  newComponent('main');
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
  return (async _ => {
    const dir = await getArgs([ 'Name your project' ])
    copyTemplate(dir);

    if (dir === '.') {
      console.log('New waffer app created');
      console.log('To start your app use:');
      console.log('waffer --port 8080');
      return;
    }

    console.log(`App ${dir.green} created`);
    console.log('To start your app use:');
    console.log('cd ' + dir);
    console.log('waffer --port 8080');
  })()
  return;
}

if (!fs.existsSync(path.join(cwd, 'views'))) {
  console.error('[!] '.red + 'Not a valid waffer project.');
  return;
}

if (argv._[0] === 'view') {
  (async () => {
    const dir = await getArgs([ 'Name your view' ])
    newView(dir);
    console.log('View ' + dir.green + ' created.');
  })()

  return;
}

if (argv._[0] === 'controller') {
  (async () => {
    const dir = await getArgs([ 'Name your controller' ])
    newController(dir);
    console.log('Controller ' + dir.green + ' created.');
  })()

  return;
}

if (argv._[0] === 'component') {
  (async () => {
    const dir = await getArgs([ 'Name your component' ])
    newComponent(dir);
    console.log('Component ' + dir.green + ' created.');
  })()

  return;
}

const prod = !!argv.prod;
const debug = !!argv.debug;

const server = waffer({ prod, debug });

if (argv._[0] === 'export') {

  const parse = (file, next = function () {}, exporting = false, options = {}) => {
    const ext = '.' + file.split('.').slice(-1)[0];
    const parser = server.parser(ext);

    parser.parse(file, (err, content) => {
      next(err, content, parser.ext || ext)
    }, exporting, options)
  }

  const views = fs.readdirSync(path.join(cwd, 'views'));
  views.unshift(views.splice(views.indexOf('index'), 1)[0]);

  try {
    rimraf.sync(argv._[1] || 'html');
  } catch (e) {}

  fs.mkdirSync(argv._[1] || 'html');

  // static files
  const static = path.join(cwd, 'static', '**');
  for (let s of glob.sync(static, { dot: true })) {
    const p = path.join(cwd, 'html', s.substring(static.length - 3));

    if (fs.statSync(s).isDirectory()) {
      fs.ensureDirSync(p);
      console.log('[+] '.green + p);
      continue;
    }

    parse(s, (err, contentOrBuf, ext) => {
      console.log(err)
      if (err) {
        console.error(err);
      }

      if (contentOrBuf) {
        let d = p.split('.');
        d.pop();
        d.push(ext.substr(1));
        fs.writeFileSync(d.join('.'), contentOrBuf);
        console.log('[+] '.green + d.join('.'));
      }
    }, true);
  }
  for (let view of views) {
    const dir = path.join(cwd, 'views', view);

    // index of view
    const index = path.join(dir, 'index.pug');
    parse(index, (err, contentOrBuf, ext) => {
      if (err && !~`${err}`.indexOf('no such file')) {
        console.error(err);
      }

      console.log(view)
      if (contentOrBuf) {
        const file = path.join(cwd, 'html', view + ext);
        fs.writeFileSync(file, contentOrBuf);
        console.log('[+] '.green + file);
      }
    }, true);

    // make script dir
    const dest = path.join(cwd, 'html', view);
    const public = glob.sync(dir + '/**').filter(f => !f.endsWith('.pug'));

    if (public.length > 0) {
      fs.ensureDirSync(dest);
      console.log('[+] '.green + dest);
    }

    // public files
    for (let s of public) {
      const p = path.join(dest, s.substring(dir.length));

      if (fs.statSync(s).isDirectory()) {
        fs.ensureDirSync(p);
        console.log('[+] '.green + p);
        continue;
      }

      parse(s, (err, contentOrBuf, ext) => {
        if (err) {
          console.error(err);
        }

        if (contentOrBuf) {
          let d = p.split('.');
          d.pop();
          d.push(ext.substr(1));
          fs.writeFileSync(d.join('.'), contentOrBuf);
          console.log('[+] '.green + d.join('.'));
        }
      }, true);
    }

    process.once('exit', e => console.log('Project exported into html/'));
  }


  return;
}

// session
if (argv.session) {
  const secret = typeof argv.session === 'string' ? argv.session : 'I like waffles';

  server.app.register(require('fastify-cookie'));
  server.app.register(require('fastify-session'), { secret });
}

// production
if (prod) {
  // security headers
  server.app.register(require('fastify-helmet'), { hidePoweredBy: { setTo: `waffer ${waffer.version}` } });

  // compression
  server.app.register(require('fastify-compress'));
} else {
  server.app.log.warn('Runnin in development mode.')
}

// database
if (typeof argv.db === 'string') {
  server.app.register(require('fastify-mongodb'), { url: argv.db })
}

server.listen(argv.port);
