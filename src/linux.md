<!----
--table-of-contents --number-sections
--variable homelink=true --variable includeHeader=true
--metadata=title:"Linux"
--metadata=title-meta="linux"
--metadata=subtitle:"Linux cheat sheet and various notes"
--metadata=description:'Linux cheat sheet and various notes'
-->
# Linux

- Boot process
  - GRUB2, grubby
  - UEFI Secure Boot and Trusted Execution
  - kernels
  - reset passwords
  - backup and recovery
  - disk partitioning
  - Time synchronization
  - Network boot; iPXE, PXE, https://docs.fogproject.org/en/latest/
  - drivers management
- Software management
  - package management and repositories
  - Verifying file authenticity
  - installing X
  - shared libraries
  - core dumps, gdb, strace, ptrace
- Services
  - Systemd
  - Quadlet
  - sshd
  - screen
  - OpenLDAP
  - Kerberos
  - DNS, DHCP
  - Nginx Reverse proxy
  - Apache WSGI
- Storage
  - Write Linux ISO image to USB drive
  - file systems, mounting
  - lvm, ZFS RAID, iSCSI, GlusterFS, disk encryption
  - databases
  - luks Encrypted file systems
- Monitoring
  - syslog, rsyslogd
  - sending logs to Splunk
  - SELinux, audit logs
  - Prometheus + Grafana
  - OpenSearch
  - Wazuh
  - System Activity Reports
- Automation
  - Puppet, facter

## Write Linux ISO image to USB drive

```sh
lsblk # find USB device on filesystem mounts

sudo ddrescue -f -v os.iso /dev/sdx

```

## dotfiles

```sh
python -V
python -m venv ~/.bin/venv3.11.6
{ cd ~/.bin ; ln -s venv3.11.6 venv ; }
. ~/.bin/venv/bin/activate
pip install ansible-core ansible-vault
```

```yaml
# playbook.yml
```

```sh

```

## Certificates

### Fedora / RHEL / CentOS / Oracle Linux

```sh
# copy PEM or DER file certificate bundles
# either lower priority /usr
cp cert.pem /usr/share/pki/ca-trust-source/anchors/
# or higher priority /etc
cp cert.pem /etc/pki/ca-trust/source/anchors/
update-ca-trust
```

### Debian/Ubuntu

```sh
apt-get -y install ca-certificates --no-install-recommends

# copy non-bundled PEM certificates with file extension `.crt`
sudo cp ca.pem /usr/local/share/ca-certificates/ca.crt
sudo update-ca-certificates # updates certificates in /etc/ssl/certs
```

### letsencrypt

## Package managers

### dnf/yum/rpm

```sh
dnf repoquery --querytags # list query tags
dnf --quiet repoquery --installed --queryformat='%{name} %{evr} %{from_repo} %{arch}'
dnf --quiet repoquery --installed --queryformat='---
description        = %{description}
evr                = %{evr}
from_repo          = %{from_repo}
group              = %{group}
installsize        = %{installsize}
installtime        = %{installtime}
license            = %{license}
name               = %{name}
obsoletes          = %{obsoletes}
packager           = %{packager}
provides           = %{provides}
reason             = %{reason}
recommends         = %{recommends}
release            = %{release}
repoid             = %{repoid}
reponame           = %{reponame}
requires           = %{requires}
size               = %{size}
source_debug_name  = %{source_debug_name}
source_name        = %{source_name}
sourcerpm          = %{sourcerpm}
suggests           = %{suggests}
summary            = %{summary}
supplements        = %{supplements}
url                = %{url}
vendor             = %{vendor}
version            = %{version}
'
```

#### Import repository keys

```sh
rpm --import https://repository.nixys.ru/repository/gpg/public.gpg.key
```


### apt/deb

```sh
apt install dirmngr gnupg apt-transport-https ca-certificates

apt-key adv --fetch-keys https://repository.nixys.ru/repository/gpg/public.gpg.key

echo "deb [arch=amd64] https://repository.nixys.ru/repository/deb-stretch/ stretch main" > /etc/apt/sources.list.d/repository.nixys.ru.list

sudo add-apt-repository ppa:redislabs/redis
sudo apt-get update
sudo apt-get install redis

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

```yml
- name: Ensure packages are installed
  ansible.builtin.apt:
    name: "{{ item }}"
    update_cache: true
    cache_valid_time: 3600 # don't "apt-get update" within 1h
  loop:
    - htop
    - ngrep
    - vim
```

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

## GPG key

```sh
# see available entropy
cat /proc/sys/kernel/random/entropy_avail
# generate entropy
find / > /dev/null
```

## Suckless

## Makefiles

## CMake

## Core dumps

```sh
# sysctl(8) parameter kernel.core_pattern.
cat /usr/lib/sysctl.d/50-coredump.conf
cat /proc/sys/kernel/core_pattern
ls -lrt /path/to/core/files/

file /path/to/core/files/corefile

gdb -batch -ex 'bt' /path/to/binary /path/to/core/files/corefile
```

> Core dumps can be written to the journal or saved as a file. In both cases, they can be retrieved for further processing, for example in gdb(1). See coredumpctl(1), in particular the list and debug verbs.

```sh
man systemd-coredump
man 5 core
vi /usr/lib/tmpfiles.d/systemd.conf
vi /etc/systemd/coredump.conf
ls /var/lib/systemd/coredump/

coredumpctl
journalctl MESSAGE_ID=fc2e22bc6ee647b6b90729ab34a250b1 -o verbose
```

```sh
pgrep -l myprogram
sudo gdb -p ${PID}
  # gcore myprogram.dump
  # exit
strings myprogram.dump | grep 'abc'

```

```sh
# run python with CAP_NET_RAW
sudo -E capsh --caps="cap_setpcap,cap_setuid,cap_setgid+ep cap_net_raw+eip" --keep=1 --user="$USER" --addamb="cap_net_raw" -- -c /usr/bin/python3

# run GDB with CAP_SYS_PTRACE
sudo -E capsh --caps="cap_setpcap,cap_setuid,cap_setgid+ep cap_sys_ptrace+eip" --keep=1 --user="$USER" --addamb="cap_sys_ptrace" --shell=/usr/bin/gdb -- -p <pid>
```

## SSH

```sh
ssh-keygen -lf ~/.ssh/known_hosts # show fingerprints in public key file
ssh-keygen -R example -f ~/.ssh/known_hosts # remove keys of hostname example
ssh-copy-id -i id.pub user@example
w --from --ip-addr
vi /etc/ssh/sshd_config
systemctl reload sshd.service
```

```default
PermitRootLogin prohibit-password
```

## screen

Run `screen` on remote system to manage sessions there.

```sh
sudo dnf install screen

screen # create session
  # crtl+a d  : detach
  # ctrl+d    : exit
  # ctrl+a ?  : show keybindings
  # ctrl+a :  : command mode
  # ctrl+c    : create display
  # ctrl+n    : next display
  # ctrl+p    : previous display
  # ctrl-a *  : list displays
  # ctrl-a s  : split horizontally
  # ctrl-a |  : split vertically
  # ctrl+Tab  : switch split
screen -list # list sessions
screen -r # resume session
screen -d  # detach a session

# run long running command in detached mode (keep alive afterwards with shell)
screen -dm bash -c 'mysql -u root db_name < backup.sql; exec sh'
```

Show progress bar with `pv`.

```sh
sudo dnf install pv
pv backup.sql | mysql -u root db_name
  # 1.69GiB 6:33:38 [41.5kB/s] [==============>          ] 58% ETA 4:45:03
```

User configuration is at: `${HOME}/.screenrc`. See example in `/etc/screenrc`.

## Install X

### xfreerdp



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

# if multiple devices are detected use --camera
gphoto2 --auto-detect
gphoto2 --trigger-capture --camera='Sony Alpha-A6000'

# save on SD card:
gphoto2 --capture-image
# save on SD card, download to computer, then delete from camera
gphoto2 --capture-image-and-download --filename %Y%m%d%H%M%S.arw
# only use camera RAM for storing images (not SD card)
gphoto2 --set-config capturetarget=0
```
