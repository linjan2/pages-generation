<!----
--table-of-contents --number-sections
--variable homelink=true --variable includeHeader=true
--metadata=title:"Linux"
--metadata=title-meta="linux"
--metadata=subtitle:"Linux cheat sheet and various notes"
--metadata=description:'Linux cheat sheet and various notes'
-->
# Linux

## Verifying file authenticity

> The checksum file format contains multiple lines of:
> - a checksum
> - a space
> - either:
>   - a space for text data
>   - a `*` for binary data
> - filename 
>
> ```default
> input     ::= checksum space space|"*" data filename
> data      ::= text|binary
> filename  ::= text
> ```
>
> Note: There is no difference between binary mode and text mode on GNU systems.

```sh
sha256sum --check --strict --ignore-missing - <<'EOF'
8bc6a1b9deaed2586d726fc62d4bee9c1bfc5a30b96c1c4cff7edd15225a11a2  node-v18.7.0-linux-x64.tar.xz
8bc6a1b9deaed2586d726fc62d4bee9c1bfc5a30b96c1c4cff7edd15225a11a2  node-v18.7.0-linux-x64.tar.xz
EOF



# GPG detached signature (.sig)
curl -O https://nodejs.org/dist/vx.y.z/SHASUMS256.txt.sig
gpg --keyserver hkps://keys.openpgp.org --recv-keys DD8F2338BAE7501E3DD5AC78C273792F7D83545D
gpg --verify SHASUMS256.txt.sig SHASUMS256.txt

# .asc?
curl -O https://nodejs.org/dist/v18.7.0/SHASUMS256.txt.asc
```

## Package managers

### dnf/yum

### rpm

Import repository keys:

```sh
rpm --import https://repository.nixys.ru/repository/gpg/public.gpg.key
```


### apt/deb

```sh
apt install dirmngr gnupg apt-transport-https ca-certificates

apt-key adv --fetch-keys https://repository.nixys.ru/repository/gpg/public.gpg.key

echo "deb [arch=amd64] https://repository.nixys.ru/repository/deb-stretch/ stretch main" > /etc/apt/sources.list.d/repository.nixys.ru.list

apt-get update && DEBIAN_FRONTEND=noninteractive apt-get -y install \
    fakeroot \
    && rm -rf /var/lib/apt/lists/*

apt-get -yqq purge 'my-package'
```

```sh
export DEBIAN_FRONTEND=noninteractive
apt-get -yq install packagename
rm -rf /var/lib/apt/lists/*

```


## Write Linux ISO image to USB drive

```sh
lsblk # find USB device on filesystem mounts

sudo ddrescue -f -v os.iso /dev/sdx

```

## Makefiles



## Camera tethering on Linux

```sh
sudo dnf install gphoto2

cat ~/.gphoto/settings
gphoto2 --list-config
gphoto2 --get-config shutterspeed
gphoto2 --get-config capturetarget

gphoto2 --auto-detect
gphoto2 --summary
gphoto2 --list-files
gphoto2 --get-all-files
```

`gphoto-hook.sh`:

```sh
#!/bin/sh
case "${ACTION}" in
  start)
  ;;
  download)
    echo "Downloaded image ${PWD}/${ACTION}"
  ;;
esac
```

```sh
# tether and capture on camera shoot
gphoto2 --capture-tethered --hook-script=./gphoto-hook.sh

# save on SD card:
gphoto2 --capture-image
# save on SD card, download to computer, then delete from camera
gphoto2 --capture-image-and-download --filename %Y%m%d%H%M%S.arw
# only use camera RAM for storing images (not SD card)
gphoto2 --set-config capturetarget=0


# if multiple devices are detected use --camera
gphoto2 --auto-detect
gphoto2 --trigger-capture --camera='Sony Alpha-A6000'
```

## Prometheus monitoring

https://prometheus.io/docs/prometheus/latest/configuration/configuration/#file_sd_config

https://opensource.com/article/21/7/run-prometheus-home-container

https://github.com/slok/grafterm

https://github.com/nalbury/promql-cli

https://github.com/containers/prometheus-podman-exporter


Install Prometheus as container based systemd-service.

```sh
podman pull quay.io/prometheus/prometheus:latest
```

Configuration file:

```yaml
# prometheus.yml

```

### Telegraf data source.

```ini
# Publish all metrics to /metrics for Prometheus to scrape
[[outputs.prometheus_client]]
  # Address to listen on
  listen = ":9273"

  # Expiration interval for each metric. 0 == no expiration
  expiration_interval = "60s"
```

```ini
[[outputs.file]]
  files = ["stdout"]
  use_batch_format = true

  ## Include the metric timestamp on each sample.
  prometheus_export_timestamp = false

  ## Sort prometheus metric families and metric samples.  Useful for
  ## debugging.
  prometheus_sort_metrics = false

  ## Output string fields as metric labels; when false string fields are
  ## discarded.
  prometheus_string_as_label = false

  ## Encode metrics without HELP metadata. This helps reduce the payload
  ## size.
  prometheus_compact_encoding = false

  ## Data format to output.
  ## Each data format has its own unique set of configuration options, read
  ## more about them here:
  ##   https://github.com/influxdata/telegraf/blob/master/docs/DATA_FORMATS_INPUT.md
  data_format = "prometheus"
```

## Ansible

[How to automate simple tasks on Linux using Ansible](https://computingforgeeks.com/how-to-automate-simple-repetitive-tasks-using-ansible/)

```sh
ssh-keygen -lf ~/.ssh/known_hosts # show fingerprints in public key file
ssh-keygen -R example -f ~/.ssh/known_hosts # remove keys of hostname example
ssh-copy-id -i id.pub user@example
w --from --ip-addr
vi /etc/ssh/sshd_config
systemctl reload sshd.service
```

```
PermitRootLogin prohibit-password
```

## Server

- DNS name server
- FTP server
- Web server
- File and storage server (CIFS, SMB, NFS, iSCSI, iSER, iSNS network storage server)
- Windows file server
- Mail server (IMAP or SMTP)
- Network file system client
- DHCP, Kerberos and NIS network server
- Secret vault
- IDP, Keycloak, OpenID Connect
- Automatic ISO installation server
- package repositories
- letsencrypt
