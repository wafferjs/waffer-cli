#!/usr/bin/node

const fs        = require('fs-extra');
const optimist  = require('optimist');
const rimraf    = require('rimraf');
const colors    = require('colors');
const path      = require('path');
const glob      = require('glob');
const waffer    = require('waffer');

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
  console.log('waffer controller <name> # create new controller');
  console.log('waffer export            # export all views into simple html site');
  console.log('waffer help              # display help');
  return;
}

if (argv._[0] === 'new') {
  const dir = argv._.length < 2 ? '.' : argv._[1];

  const src = path.join(__dirname, 'template');
  const dest = path.join(cwd, dir);
  fs.copySync(src, dest, { filter: (src, dest) => {
    console.log('[+] '.green + dest.slice(cwd.length));
    return true;
  } });

  if (dir === '.') {
    console.log('New waffer app created');
    console.log('To start your app use:');
    console.log('waffer --port 8080');
    return;
  }

  console.log(`App ${argv._[1].green} created`);
  console.log('To start your app use:');
  console.log('cd ' + argv._[1]);
  console.log('waffer --port 8080');
  return;
}

if (!fs.existsSync(path.join(cwd, 'views'))) {
  console.error('[!] '.red + 'Not a valid waffer project.');
  return;
}

if (argv._[0] === 'view') {
  if (argv._.length < 2) {
    console.error('[!] '.red + 'Not a valid view name');
    return;
  }

  const dir = argv._[1];

  // view
  var src = path.join(__dirname, 'template/views/index');
  var dest = path.join(cwd, 'views', dir);

  fs.copySync(src, dest, { filter: (src, dest) => {
    console.log('[+] '.green + dest.slice(cwd.length));
    return true;
  } });

  // controller
  var src = path.join(__dirname, 'template/controllers/index');
  var dest = path.join(cwd, 'controllers', dir);

  fs.copySync(src, dest, { filter: (src, dest) => {
    console.log('[+] '.green + dest.slice(cwd.length));
    return true;
  } });

  console.log('View ' + dir.green + ' created.');
  return;
}

if (argv._[0] === 'controller') {
  if (argv._.length < 2) {
    console.error('[!] '.red + 'Not a valid controller name');
    return;
  }

  const dir = argv._[1];
  const src = path.join(__dirname, 'template/controllers/index');
  const dest = path.join(cwd, 'controllers', dir);

  fs.copySync(src, dest, { filter: (src, dest) => {
    console.log('[+] '.green + dest.slice(cwd.length));
    return true;
  } });

  console.log('Controller ' + dir.green + ' created.');
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
