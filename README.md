## Usage

#### Help
```sh
$ waffer help

waffer                   # start application
       --port <port>     # app port
       --session         # use session
       --db <mongo url>  # mongodb connection
       --prod            # start in production mode
       --debug           # start in debug mode
waffer new [<dir>]       # initialize waffer project
waffer view <name>       # create new view
waffer controller <name> # create new controller
waffer export            # export all views into simple html site
waffer help              # display help
```

#### Creating new project
```sh
# Create new project in current directory
$ waffer new

# Create new project in specified directory
$ waffer new my-website
```

#### Creating new views
```sh
$ waffer view my-view
```

#### Creating new controllers
```sh
$ waffer controller my-controller
```

#### Exporting website to html
```sh
$ waffer export
```

#### Serving content
```sh
# At random port
waffer

# At desired port
waffer --port 3000
```
