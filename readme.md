# pages-generation

```sh
podman build -f minify/Docker -t IMAGE=ghcr.io/linjan2/js/minify:main minify/
podman build -f rollup/Docker -t IMAGE=ghcr.io/linjan2/js/rollup:main rollup/

# bundle into directory pages/
make
make -f Makefile.apps
```

