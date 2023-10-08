# pages-generation

```sh
podman build -f minify/Docker minify/ -t IMAGE=ghcr.io/linjan2/js/minify:main
podman build -f minify/Docker minify/ -t IMAGE=ghcr.io/linjan2/js/rollup:main

# bundle into directory pages/
make
```

