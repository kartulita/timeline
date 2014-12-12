# Timeline

## Installation

1. `git clone git@github.com:kartulita/timeline` to clone the repository

2. `cd timeline` to enter the repository

3. `git submodule update --init` to download the submodules

## Development

In the root folder of the repository, run `make all` to install dependencies via
npm and build the JS bundle, which is written to `out/bundle.min.js`

## Demonstration

In the root folder of the repository:

1. `cd src/timeline` to enter the timeline project folder

2. `bower install` to install front-end dependencies (e.g. angular, moment)

3. `http-server -p <port>` using Node's http-server, or
`python -m SimpleHTTPServer <port>` using Python's HTTP server.  You can also
run `demos/etv.html` directly in your browser.

4. If using HTTP server, point your browser to the server (presumably,
http://localhost:<port>), enter the `demos` folder and select `etv.html`

**NOTE**: Since we are using the err.ee api from outside the err.ee domain, your
browser will block the XHRs due to CORS.  To disable CORS in chrome or chromium,
launch it with the `--disable-web-security` command-line parameter.  The demos
will not work otherwise.  There is no reliable way to disable CORS in Firefox.
