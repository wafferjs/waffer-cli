#!/usr/bin/node

const uglify    = require('uglify-es')
const fs        = require('fs-extra')
const optimist  = require('optimist')
const prompts   = require('prompts')
const _         = require('lodash')
const waffer    = require('waffer')
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
  const src = path.join(__dirname, 'template/components/component');
  const dest = path.join(cwd, wd, 'components', name);

  copyEjs(src, dest, { name });
}

const copyTemplate = dir => {
  const src = path.join(__dirname, 'template');
  const dest = path.join(cwd, dir);

  copy(src, dest, (src, dest) => {
    return !~dest.indexOf('/components/component') && copyFilter(src, dest);
  })

  newComponent('main', dir);
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

  const parse = async (file, next = function () {}, exporting = false, options = {}) => {
    const ext = '.' + file.split('.').slice(-1)[0];
    const parser = server.parser(ext);

    return { ext, ...await parser.parse(file, exporting, options) }
  }

  (async _ => {
    const views = fs.readdirSync(path.join(cwd, 'views'));
    views.unshift(views.splice(views.indexOf('index'), 1)[0]);

    try {
      await fs.remove(argv._[1] || 'html')
    } catch (e) {}

    await fs.ensureDir(argv._[1] || 'html');

    // vue
    await fs.writeFile(path.join(cwd, 'html', 'vue.js'), await fs.readFile(path.join(__dirname, 'node_modules/vue/dist/vue.min.js')))
    console.log('[+] '.green + 'html/vue.js');

    // components
    const componentjs  = {}
    const componentcss = []
    for (let c of glob.sync(path.join(cwd, 'components', '*'))) {
      // style
      // component
      const name = c.substr(cwd.length + 12)
      const component = `${await fs.readFile(path.join(c, 'component.js'))}`

      await (async _ => {
        const { content } = await parse(path.join(c, 'template.pug'), true)
        componentjs[name + '.js'] = component.replace(new RegExp(`#template-${name}`, 'g'), `${content}`)
      })()

      await (async _ => {
        const { content } = await parse(path.join(c, 'style.styl'), true, { compress: true })
        componentcss.push(content)
      })()
    }

    const { code, error } = uglify.minify(componentjs, { toplevel: true })
    await fs.writeFileSync(path.join(cwd, 'html', 'components.js'), code)
    if (error) {
      console.error(error)
      console.log('[-] '.red + 'html/components.js');
    } else {
      console.log('[+] '.green + 'html/components.js');
    }

    await fs.writeFileSync(path.join(cwd, 'html', 'components.css'), componentcss.join(''))


    // static files
    const static = path.join(cwd, 'static', '**');
    for (let s of glob.sync(static, { dot: true })) {
      const p = path.join(cwd, 'html', s.substring(static.length - 3));

      if (fs.statSync(s).isDirectory()) {
        await fs.ensureDir(p);
        continue;
      }

      const { content, ext } = await parse(s, true);

      if (content) {
        let d = p.split('.');
        d.pop();
        d.push(ext.substr(1));
        await fs.writeFile(d.join('.'), content);
        console.log('[+] '.green + d.join('.').substr(cwd.length + 1));
      }
    }

    for (let view of views) {
      const dir = path.join(cwd, 'views', view);

      // index of view
      const index = path.join(dir, 'index.pug');
      const { content, ext } = await parse(index, true);

      if (content) {
        const file = path.join(cwd, 'html', view + ext);
        await fs.writeFile(file, content);
        console.log('[+] '.green + file.substr(cwd.length + 1));
      }

      // make script dir
      const dest = path.join(cwd, 'html', view);
      const public = glob.sync(dir + '/**').filter(f => !f.endsWith('.pug'));

      if (public.length > 0) {
        await fs.ensureDir(dest);
      }

      // public files
      for (let s of public) {
        const p = path.join(dest, s.substring(dir.length));

        if (fs.statSync(s).isDirectory()) {
          await fs.ensureDir(p);
          continue;
        }

        const { content, ext } = await parse(s, true)

        if (content) {
          let d = p.split('.');
          d.pop();
          d.push(ext.substr(1));
          await fs.writeFile(d.join('.'), content);
          console.log('[+] '.green + d.join('.').substr(cwd.length + 1));
        }
      }

      process.once('exit', e => console.log('Project exported into html/'));
    }
  })()


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
