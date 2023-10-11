<!----
--table-of-contents --number-sections
--variable homelink=true --variable includeHeader=true
--metadata=title:"Nginx"
--metadata=title-meta="nginx"
--metadata=subtitle:"Nginx server cheat sheet and notes"
--metadata=description:'Nginx server cheat sheet and notes'
-->
# Nginx configuration

## nginx.conf

```nginx
worker_processes  1;
error_log error.log info;

events {
  worker_connections  1024;
}

http {
  # override file paths
  client_body_temp_path /usr/local/nginx/client_body_temp;
  proxy_temp_path /usr/local/nginx/proxy_temp;
  fastcgi_temp_path /usr/local/nginx/fastcgi_temp;
  uwsgi_temp_path /usr/local/nginx/uwsgi_temp;
  scgi_temp_path /usr/local/nginx/scgi_temp;

  default_type  application/octet-stream;
  # include mime.types;
  types {
    text/html                   html htm shtml;
    text/css                    css;
    application/javascript      js;
    application/wasm            wasm;
    text/plain                  txt;
    image/svg+xml               svg svgz;
    image/gif                   gif;
    image/jpeg                  jpeg jpg;
    image/png                   png;
    image/tiff                  tif tiff;
    image/x-icon                ico;
    image/x-ms-bmp              bmp;
    font/woff                   woff;
    font/woff2                  woff2;
    application/json            json;
    application/zip             zip;
    audio/mpeg                  mp3;
    audio/ogg                   ogg;
    audio/x-m4a                 m4a;
    video/mp4                   mp4;
    video/mpeg                  mpeg mpg;
    video/quicktime             mov;
    video/webm                  webm;
  }

  gzip on;
  gzip_disable "msie6";
  gzip_disable "MSIE [1-6]\.";
  gzip_proxied any;
  gzip_http_version 1.1;
  gzip_min_length 500;
  gzip_comp_level 9;
  gzip_types  text/plain text/css text/xml text/javascript;
              application/json application/javascript
              application/xml application/xml+rss application/atom+xml;

  client_max_body_size 10m;

  log_format format '[$time_local] "$request" $status $remote_addr:$remote_port -> SERVER:$server_name:$server_port
    DURATION=$request_time / RECEIVED=$request_length;BODY=$content_length;Content-Length=$http_content_length; / SENT=$bytes_sent;BODY=$body_bytes_sent
    HEADERS= Host: "$http_host" Origin: "$http_origin" User-Agent: "$http_user_agent" X-header: "$http_x_header"';
  access_log access.log format;

  sendfile on;
  tcp_nopush on;
  #keepalive_timeout  0;
  keepalive_timeout 65;
  underscores_in_headers on;
  server_tokens off;
  etag off;
  add_header X-XSS-Protection '1; mode=block';

  # whitelist cross-origin servers
  #   - default to same origin
  #   - allow HTTP/HTTPS example.com:8080
  #   - set * for all other HTTPS domains
  map $http_origin $allowed_origin {
    default                     "$scheme://$hostname:$server_port";
    "http://example.com:8080"     $http_origin;
    "https://example.com:8080"    $http_origin;
    "~^https://.+"              "*";
  }

  root html;

  server {
    set $root html;
    listen 8080 default_server;
    listen [::]:8080 default_server;
    server_name _;

    error_page 500 502 503 504  /50x.html;
    location = /50x.html {
      root html;
    }
    error_page 400 404  @notfound;
    location @notfound {
      return 404 'Not found\n';
    }

    # index index.html;

    location / {
      # Preflighted requests
      if ($request_method = 'OPTIONS') {
        add_header 'Access-Control-Allow-Origin' $allowed_origin;
        # Allow cookies
        add_header 'Access-Control-Allow-Credentials' 'true';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        # Custom headers and headers various browsers *should* be OK with but aren't
        add_header 'Access-Control-Allow-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type';
        # Tell client that this pre-flight info is valid for 20 days
        add_header 'Access-Control-Max-Age' 1728000;
        # add_header 'Content-Type' 'text/plain charset=UTF-8';
        # add_header 'Content-Length' 0;
        return 204;
      }
      if ($request_method = 'POST') {
        add_header 'Access-Control-Allow-Origin' $allowed_origin;
        add_header 'Access-Control-Allow-Credentials' 'true';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type';
      }
      if ($request_method = 'GET') {
        add_header 'Access-Control-Allow-Origin' $allowed_origin;
        add_header 'Access-Control-Allow-Credentials' 'true';
        add_header 'Access-Control-Allow-Methods' 'GET, POST, OPTIONS';
        add_header 'Access-Control-Allow-Headers' 'DNT,X-CustomHeader,Keep-Alive,User-Agent,X-Requested-With,If-Modified-Since,Cache-Control,Content-Type';
      }

      try_files $uri $uri/ =404;
    }

    location /app/ {
      alias $root/app_files/;
    }

    # include other conf-files (at server-level)
    include other.conf;
  }
}
```

### SSL

Configuration generator: [moz://a SSL Configuration Generator](https://ssl-config.mozilla.org/)

```nginx
http {
  server {
    listen 8443 ssl http2;
    listen [::]:8443 ssl http2;
    server_name localhost;

    ssl_certificate         cert.pem; # server certificate + intermediates
    ssl_certificate_key     certkey.pem;
    ssl_trusted_certificate rootca.pem; # intermediates + CA for OCSP stapling

    ssl_stapling on;
    ssl_stapling_verify on;

    # ssl_session_cache shared:SSL:1m;
    ssl_session_cache shared:MozSSL:10m;
    ssl_session_timeout 1d;
    ssl_session_tickets off;
    ssl_dhparam ffdhe2048.txt;

    # general-purpose servers with a variety of clients
    ssl_protocols TLSv1.2 TLSv1.3;
    ssl_ciphers ECDHE-ECDSA-AES128-GCM-SHA256:ECDHE-RSA-AES128-GCM-SHA256:ECDHE-ECDSA-AES256-GCM-SHA384:ECDHE-RSA-AES256-GCM-SHA384:ECDHE-ECDSA-CHACHA20-POLY1305:ECDHE-RSA-CHACHA20-POLY1305:DHE-RSA-AES128-GCM-SHA256:DHE-RSA-AES256-GCM-SHA384;
    ssl_prefer_server_ciphers off;

    # HSTS (ngx_http_headers_module is required) (63072000 seconds)
    add_header Strict-Transport-Security "max-age=63072000" always;

    # configures name servers to resolve upstream servers
    resolver 127.0.0.1:53;

    location / {
      root   html;
      index  index.html index.htm;
    }
  }

  # redirect HTTP to HTTPS
  server {
    listen 8000;
    listen [::]:8000;
    server_name localhost
    location / {
      return 301 https://$server_name:8443$request_uri;
    }
  }
}
```

Put relative-path files in `conf/`-directory. The certificate files must be bundled with intermediate CAs.

```sh
curl -sSLO https://ssl-config.mozilla.org/ffdhe2048.txt
cat cert.pem intermediate.pem > cert.pem # add server first
cat intermediate.pem rootca.pem > rootca.pem
mv ffdhe2048.txt cert.pem certkey.pem rootca.pem ${INSTALLDIR}/conf/
```

### Redirect to home page

```nginx
http {
  server {
    root /var/www/html;
    index index.html;

    location / {
      try_files $uri $uri/ @default;
    }
    location @default {
      return 301 http://www.example.com;
    }
  }
}
```

### Upload files

```nginx
# requires building with --with-http_dav_module
server {
  listen 8888;
  server_name upload;
  set $root html;

  # PUT file in $root/upload/FILENAME
  location ~ "/upload/([0-9a-zA-Z-./]*)$" {
    alias $root/uploaddir/$1; # write file to this directory

    dav_methods PUT DELETE MKCOL COPY MOVE;
    client_body_temp_path tmp;
    client_body_in_file_only on;
    client_body_buffer_size 128k;
    client_max_body_size 100M;
    create_full_put_path on;
    dav_access user:rw group:rw all:r;
    min_delete_depth 2;
  }
}
```

```sh
cat > local.txt <<<'hello'
curl -v --upload-file local.txt http://localhost:8888/upload/remote.txt -H 'Host: upload'

curl http://localhost:8888/upload/remote.txt -H 'Host: upload'
```

### Proxy

[`ngx_http_proxy_module`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html).

Minimal example:

```nginx
server {
  listen 8080;
  server_name proxy.example.com;

  location / {
    # proxy to value in Host header with URI
    proxy_pass $scheme://$host$request_uri;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $server_name;
    proxy_set_header X-Real-IP $remote_addr;
    resolver 127.0.0.1;
  }
}
```

```sh
# access example.com:8080 through proxy
curl -i --proxy http://proxy.example.com:8080 http://example.com:8080
```

Proxying to upstream servers.

> On startup, Nginx resolves and caches DNS records for all literal host names in its configuration file. To ensure re-resolution, set the [`resolver`](http://nginx.org/en/docs/http/ngx_http_core_module.html#resolver) and use a variable for the host name in `proxy_pass`. The DNS answer is then cached using its TTL (unless overridden by `resolver` option `valid=time`).

```nginx
upstream backend_servers {
  server server1:8001;
  server server2:8001;
}

server {
  listen 8080;
  server_name proxy.example.com;

  location / {
    resolver 127.0.0.1:53 [::1]:5353;
    resolver_timeout 30s;

    proxy_pass http://backend_servers$request_uri;
    proxy_set_header Host $host;
    proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
    proxy_set_header X-Forwarded-Host $server_name;
    proxy_set_header X-Real-IP $remote_addr;
    proxy_set_header Origin '';
    proxy_set_header X-Forwarded-Proto \$scheme;

    proxy_pass_request_headers on;
    proxy_set_body $request_body_file;
    proxy_redirect off;

    proxy_http_version 1.1;
    proxy_set_header Upgrade \$http_upgrade;
    proxy_set_header Connection "upgrade";

    proxy_redirect off;
    proxy_buffering off;
    proxy_buffer_size 128k;
    proxy_buffers 100 128k;

    proxy_next_upstream error timeout http_500 http_502 http_503 http_504;
    proxy_connect_timeout 5s;
    proxy_read_timeout 30s;
    proxy_send_timeout 30s;
  }

  location /x/ {
    # trailing / means '/x/path' proxies to '/path'
    proxy_pass http://127.0.0.1:8080/;
  }
}
```

```nginx
server {

    
    # No trailing slash
    set $upstream_endpoint http://service-999999.eu-west-2.elb.amazonaws.com;
    location /test/ {
        # 
        rewrite ^/test/(.*) /$1 break;
        proxy_pass $upstream_endpoint;
    }

    location /test/ {
        # trailing / means '/test/path' proxies to '/path'
        proxy_pass http://127.0.0.1:80/;
    }

    # re-resolve http(s)://Host (port number 80?)
    location ~ / {
        resolver 8.8.8.8;
        set $origin_server "$scheme://$host";
        proxy_pass $origin_server;
    }
}

location /tuxedo/
    {
      auth_request /authorize/;
      auth_request_set $len $upstream_http_content_length;
      add_header X-len2 '- $len -' always;

      proxy_pass http://127.0.0.1:8889/$len$uri;
      # alias /var/nginx/html/mock/;
      # error_page 405 =200 $uri;
    }
    
    location /authorize/
    {
      proxy_pass http://backend:8080/tuxedo/sakVKAdmKontr;
      proxy_method POST;
      proxy_pass_request_body off;
      proxy_set_body '{"kontext":{"funktion":1001,"slag":[],"kunder":[],"organisationsenhet":[]}}';
      proxy_pass_request_headers on;
      proxy_set_header BODY-PARSE-TYPE 'SERVICEFRAMEWORK';
    }
```

### Mock API

```nginx
# set server_name to direct according to Host-header/SNI-name
server {
  listen 8888 default_server;
  listen [::]:8888 default_server;
  server_name localhost $hostname "";
  location / {
    return 200 '{"hello":"world"}';
  }
}
server {
  listen 8888;
  listen [::]:8888;
  server_name test;
  default_type 'application/json';
  set $root html;

  location / {
    try_files $uri $uri/ =404;
  }
  error_page 404 @404;
  location @404 {
      return 404 '{"response": "The requested URL was not found on this server"}';
  }

  location = /health {
    access_log off;
    return 200;
  }

  # remove periods from codes (e.g. ab90.0 => ab900)
  location ~ ^/api/codes/ {
    rewrite (.+)\.(.+) $1$2;
  }
  location /api/codes/ {
    alias $root/codes-; # rewrite to look for file codes-XXX
    try_files $uri @empty_reply;
  }
  location @empty_reply {
    return 200 '{}'; # return empty if file wasn't found
  }

  # read file based on URI parameters "?code=X&text=Y"
  location ^~ /api/codes2 {
    rewrite ^ /api/codes2/$arg_code-$arg_text;
  }

  location ~ ^.*,.*$ {
    rewrite '(.*),(.*)' $1-$2; # replace , with -
  }
  location ~ ^.*\+.*$ {
    rewrite '(.*)\+(.*)' $1_$2; # replace + with _
  }
}
```

### Rate limiting

Modules [`http_limit_req_module`](https://nginx.org/en/docs/http/ngx_http_limit_req_module.html) and [`http_limit_conn_module`](https://nginx.org/en/docs/http/ngx_http_limit_conn_module.html).

```nginx
http {
  # limit each IP address to 10 requests/second
  limit_req_zone $binary_remote_addr zone=iplimit:10m rate=10r/s;
  # limit requests to a server
  limit_req_zone $sever_name zone=serverlimit:10m rate=10r/s;

  limit_req_status 429;
  limit_req_log_level error;
  limit_req_dry_run off;

  server {
    server_name example;
    # allow 10 excessive requests and handle them without delay
    limit_req zone=iplimit burst=10 nodelay;
    # allow 10 excessive requests; handle 5 without delay then delay 5 to match rate
    limit_req zone=serverlimit burst=10 delay=5;
  }
}
```

### Content cache

There is a cache setting for each module:

- [ngx_http_proxy_module `proxy_cache`](https://nginx.org/en/docs/http/ngx_http_proxy_module.html#proxy_cache)
- [ngx_http_fastcgi_module `fastcgi_cache`](https://nginx.org/en/docs/http/ngx_http_fastcgi_module.html#fastcgi_cache)
- [ngx_http_scgi_module `scgi_cache`](https://nginx.org/en/docs/http/ngx_http_scgi_module.html#scgi_cache)
- [ngx_http_uwsgi_module `uwsgi_cache`](https://nginx.org/en/docs/http/ngx_http_uwsgi_module.html#uwsgi_cache)

```nginx
http {
  proxy_cache_path /var/cache/cache keys_zone=mycache:10m inactive=60m;
  proxy_cache_path /var/nginx/cache levels=1:2 keys_zone=one:10m;

  location / {
    proxy_pass http://localhost:8080;
    proxy_cache mycache:
    add_header X-Cache $upstream_cache_status;
  }

  fastcgi_cache_path /var/cache/nginx levels=1:2 keys_zone=CACHEZONE:10m; inactive=60m max_size=40m;
  fastcgi_cache_key "$scheme$request_method$host$request_uri";

  fastcgi_cache_bypass $cookie_nocache $arg_nocache$arg_comment;
  fastcgi_cache_bypass $http_pragma    $http_authorization;

}
```

## Build from source

```sh
# download nginx source
curl -sSL https://nginx.org/download/nginx-1.22.1.tar.gz | tar -xzf -

# download build-tools
sudo dnf install -y --setopt=install_weak_deps=False gcc binutils make
  # pcre-devel for ngx_http_rewrite_module
  # zlib-devel for ngx_http_gzip_static_module

# either install openssl-devel, pcre-devel, and zlib-devel
sudo dnf install -y --setopt=install_weak_deps=False openssl-devel pcre-devel zlib-devel
# or download sources and use --with-prce/openssl/zlib
curl -sSL https://www.zlib.net/zlib-1.2.13.tar.gz | tar -xzf -
curl -sSL https://github.com/PCRE2Project/pcre2/releases/download/pcre2-10.40/pcre2-10.40.tar.gz | tar -xzf -
curl -sSL https://www.openssl.org/source/openssl-3.0.7.tar.gz | tar -xzf -

{ cd nginx-1.22.1; ./configure --help; } # view configuration options
# edit the nginx.conf to not listen on privileged port 80
sed -E -i 's/listen +80;/listen 8080;/' nginx-1.22.1/conf/nginx.conf

# run the helper script
./nginx.sh configure
./nginx.sh build
./nginx.sh install
./nginx.sh run
```

To build with zlib use `--without-http_gzip_module`. To build without PCRE use `--without-http_rewrite_module`.

Helper script `nginx.sh`:

```sh
#!/bin/sh

set -o nounset
set -o errexit

pushd "$(dirname $(readlink -f ${0}))" > /dev/null
INSTALLDIR=${INSTALLDIR:-${PWD}/installdir}
BUILDDIR=${PWD}/builddir
mkdir -p ${BUILDDIR} 2>/dev/null || :

function configure
{
  PREFIX='.'
  pushd nginx-1.22.1 > /dev/null && \
  ./configure \
    --build=custom-build \
    --with-cc-opt='-O2 -fPIE -fstack-protector-strong -Wformat -Werror=format-security -Wdate-time -D_FORTIFY_SOURCE=2 -Wno-deprecated-declarations -Wno-pointer-to-int-cast -Wno-unused-function' \
    --with-ld-opt="-Wl,-Bsymbolic-functions -fPIE -pie -Wl,-z,relro -Wl,-z,now -Wl,-z,origin,-rpath='\$\$ORIGIN',--disable-new-dtags" \
    --with-debug \
    --builddir=${BUILDDIR} \
    --with-zlib=../zlib-1.2.13 --with-zlib-opt='-fPIE -pie -Wl,-z,relro -Wl,-z,now' \
    --with-pcre=../pcre2-10.40 --with-pcre-opt='-fPIE -pie -Wl,-z,relro -Wl,-z,now' \
    --with-openssl=../openssl-3.0.7 \
    \
    --prefix=${PREFIX} \
    --sbin-path=${PREFIX} \
    --conf-path=${PREFIX}/conf/nginx.conf \
    --pid-path=${PREFIX}/nginx.pid \
    --lock-path=${PREFIX}/lock \
    --modules-path=${PREFIX}/modules \
    --error-log-path=${PREFIX}/error.log \
    --http-log-path=${PREFIX}/access.log \
    --http-client-body-temp-path=${PREFIX}/tmp/client_body \
    --http-proxy-temp-path=${PREFIX}/tmp/proxy \
    --http-fastcgi-temp-path=${PREFIX}/tmp/fastcgi \
    --http-uwsgi-temp-path=${PREFIX}/tmp/uwsgi \
    --http-scgi-temp-path=${PREFIX}/tmp/scgi \
    --user=$(id -u) \
    --group=$(id -g) \
    \
    --with-http_ssl_module \
    --with-http_v2_module \
    --with-http_gzip_static_module \
    --with-http_dav_module \
    --with-http_stub_status_module
  popd > /dev/null
}
function build
{
  pushd nginx-1.22.1 > /dev/null
  make build
}
function install
{
  mkdir -p ${INSTALLDIR}/{conf,lock,modules,tmp} 2>/dev/null || :
  cp -v ${BUILDDIR}/nginx ${INSTALLDIR}/
  cp -vr nginx-1.22.1/conf ${INSTALLDIR}/
  cp -vr nginx-1.22.1/html ${INSTALLDIR}/
}
function run
{
  pushd ${INSTALLDIR}
  ./nginx -g "daemon off; error_log stderr info;" $@
}
function reload
{
  cp confs/*.conf ${INSTALLDIR}/conf/
  cp -r public/* ${INSTALLDIR}/html/
  kill -s HUP $(cat ${INSTALLDIR}/nginx.pid)
}

if [ $# -eq 0 ]
then
  echo "USAGE: ${0} configure | build | install | run | reload"
else
  "$@"
fi
```

## `ngx_http_perl_module`

[https://nginx.org/en/docs/http/ngx_http_perl_module.html](https://nginx.org/en/docs/http/ngx_http_perl_module.html)

```nginx
http {
  perl_modules /opt/app-root/etc/perl;
  perl_require Version.pm;
  perl_set $perl_version Version::installed;
}
```

```nginx
upstream fastcgi_backend {
    server 127.0.0.1:9000;

    keepalive 8;
}

server {
    ...

    location /fastcgi/ {
        fastcgi_pass fastcgi_backend;
        fastcgi_keep_conn on;
        ...
    }
}
```

