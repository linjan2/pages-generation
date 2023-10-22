<!----
--table-of-contents --number-sections
--variable homelink=true --variable includeHeader=true
--metadata=title:"Virtualization notes"
--metadata=title-meta="virtualization"
--metadata=subtitle:"KVM VMs, containers, Podman, Buildah, Skopeo cheat sheet and notes"
--metadata=description:'KVM VMs, Containers, Podman, Buildah, Skopeo cheat sheet and notes'
-->
# Virtualization tools; VMs, containers, LVM

## libvirt+QEMU

The **KVM** kernel module is a bare-metal hypervisor for kernel-based virtual machines. **QEMU** (Quick Emulator) is a hardware (i.e. devices, storage, memory, CPU, display) emulator and virtualizer that can delegate virtualization to KVM. [**libvirt**](https://libvirt.org/docs.html) is a common virtualization API on top of hypervisor APIs like QEMU/KVM -- and it's used by client tools to manage virtual machines. **libvirtd** is the management daemon that libvirt clients connect to.

Client tools:

- `virsh`: commandline utility for libvirt.
- `virt-manager`: graphical interface utility for libvirt.
- `virt-install`: commandline utility for provisioning virtual machines.
- `virt-viewer`: opens graphical console of a virtual machine.

Check for virtualization support. AMD-V/Intel VT CPU virtualization should be turned on inside BIOS settings.

```sh
# check for virtualization support in CPU cores
grep --extended-regexp --count '(vmx|svm)' /proc/cpuinfo # 1 match per core
lscpu | grep Virtualization # check CPU capability (AMD-V or VT-x)
ls -l /dev/kvm # check if KVM device is present
```

Libvirt stores its application data at `/var/lib/libvirt/` and `${XDG_CONFIG_HOME}/libvirt/` (or `~/.config/libvirt/`). Before installing libvirt, an LVM logical volume can be created and mounted there.

```sh
sudo su -
vgdisplay # list volume groups and available storage; e.g. volume group "vg1"
lvcreate --size 50G --name libvirt vg1  # create volume "libvirt" in volume group "vg1"
mkfs.xfs /dev/vg1/libvirt               # create XFS filesystem on the volume
mkdir -p /var/lib/libvirt               # create mount point directory
# add to filesystem table and mount
echo '/dev/vg1/libvirt  /var/lib/libvirt  xfs  defaults  0 0' >> /etc/fstab
mount --all
exit # exit su
```

Install virtualization tools:

```sh
# on Fedora headless server (without GUI tools)
sudo dnf install qemu-kvm-core libvirt virt-install cockpit-machines guestfs-tools

# on Fedora with GUI tools
sudo dnf group install --with-optional virtualization

# enable and start daemon
sudo systemctl enable --now libvirtd
```

```sh
# optionally enable nested virtualization by adding kvm kernel module arguments.
# edit `options kvm_amd nested=1` or `options kvm_intel nested=1`
sudo vi /etc/modprobe.d/kvm.conf

# add user to virtualization group for management access to qemu
sudo usermod --append --groups libvirt $(id --name --user)
# create user-local configuration for default connection
mkdir -p ${XDG_CONFIG_HOME:-~/.config}/libvirt
echo 'uri_default = "qemu:///system"' >> ${XDG_CONFIG_HOME:-~/.config}/libvirt/libvirt.conf
  # change to "qemu:///session" for user-local libvirt connection
# to change root configuration:
sudo vi /etc/libvirt/libvirt.conf

shutdown now

# validate host virtualization setup
virt-host-validate qemu
systemctl status libvirtd # check that daemon is active
libvirtd --version
virsh version
virsh --connect qemu:///system sysinfo
```

The `libvirt-guests` service is used to suspend virtual machines on system shutdown/suspend and resume them on boot (if virtual machine is set to autostart).

```sh
sudo systemctl enable --now libvirt-guests
sudo vi /etc/sysconfig/libvirt-guests # configuration
```

Running client tools as non-root automatically uses `qemu:///session` connection, which is for local VMs running as the unprivileged user. The GUI `virt-manager` automatically uses `qemu:///system`, which is for local VMs running as root.

Users in group `libvirt` can access root VMs on `qemu:///system`. The default connection can be configured in libvirt.conf. Change `uri_default` in the user configuration to `qemu:///system` to automatically connect to root VMs (like `virt-manager` does).

```sh
# list all VMs on a connection
sudo virsh list --all # as root, connects to system
virsh list --all      # as non-root, connects to uri_default
virsh --connect qemu:///system list --all   # as non-root on system connection
virsh --connect qemu:///session list --all  # as non-root on session connection
  # NOTE: if current user is root, specifying qemu:///session will still use qemu:///system

# check default connection used
virsh uri
sudo virsh uri
LIBVIRT_DEFAULT_URI='qemu:///system' virsh uri
```

```sh
# list supported guest operating systems (for --os-variant)
osinfo-query os
# show XML document of hypervisor capabilities (for --virt-type)
virsh capabilities
# show XML document of domain capabilities
virsh domcapabilities
# inspect image file
qemu-img info myimage.qcow2
```

### VM networks

The default network (named `default` on `qemu:///system`) is created when first requested and it runs in NAT mode. An active socket starts the corresponding service on demand. The bridge interface `virbr0` and a dnsmasq server is created for the internal network. See network XML format: [libvirt.org/formatnetwork.html](https://libvirt.org/formatnetwork.html).

```sh
systemctl status virtnetworkd.service
sudo systemctl enable virtnetworkd.service --now # enable and start internal network
reboot now

ip a # check bridge virbr0
ip route # check route table entry for virbr0
firewall-cmd --get-active-zones # libvirt zone has interface virbr0
sudo firewall-cmd --zone=libvirt --list-all

ps -C dnsmasq -o pid,args # show dnsmasq processes
sudo less /var/lib/libvirt/dnsmasq/default.conf # show generated configuration for default network

# handle networks (assumes qemu:///system)
virsh net-list --all
virsh net-edit default
virsh net-start default
virsh net-autostart default
virsh net-dumpxml default
virsh net-dhcp-leases default # show DHCP leases on default network

# remove default network
virsh net-stop default
virsh net-destroy default
virsh net-undefine default
sudo systemctl disable virtnetworkd.socket --now
```

VMs can instead be connected to another virtual bridge interface that is created separately.

An isolated VM network can also be created and attached to a VM.

```xml
<!-- isolated0.xml -->
<network>
  <name>isolated0</name>
  <uuid>7311c0e4-8905-4c76-9e4d-de567ffffe14</uuid>
  <bridge name='isolatedbr0' stp='on' delay='0'/>
  <mac address='00:16:3e:43:c9:08'/>
  <domain name='isolated0'/>
  <ip address='192.168.1.1' netmask='255.255.255.0'>
    <dhcp>
      <range start='192.168.1.128' end='192.168.1.254'/>
    </dhcp>
  </ip>
</network>
```

Either set the XML fields `<uuid>` and `<mac>` manually or let them be automatically generated by removing them. Automatic MAC addresses get OUI `52:54:00`.

```sh
# generates a UUID
uuidgen
# generates a MAC (with OUI 00:16:3e, Xensource, Inc.)
printf '00:16:3e:%02x:%02x:%02x\n' $(( RANDOM % 128 )) $(( RANDOM % 256 )) $(( RANDOM % 256 ))

virsh net-define isolated0.xml
virsh net-start isolated0
ip -details address show dev isolatedbr0
virsh net-uuid isolatedbr0 # show UUID

# attach network isolated0 to a domain
#   (add --live to affect a running VM and --mac <MAC> to set MAC address)
virsh attach-interface --domain myvm --source isolated0 --type network --model virtio --config
virsh domiflist myvm # show virtual interfaces of VM
# detach network with the VM's interface MAC address
virsh detach-interface --domain myvm --type network --mac '52:54:00:47:2f:eb' --config
```

#### Linux bridge for making VMs visible on LAN

Use `nmcli` to create a bridge for virtual machines that makes them visible on the local area network. When virtual machines are attached to the bridge their MAC addresses should appear in the router's table along with an IP address for each.

The host itself also uses the bridge as the default route to router. A slave connection is created for the physical device connected to the router. The bridge device will receive an IP address from the router DHCP service.

```sh
ip address show # e.g. enp1s0 with IP address
nmcli connection show --active # e.g. "Wired enp1s0"

# create Linux bridge
sudo ip link add br0 type bridge

# create connection for bridge
nmcli connection add \
  connection.id 'bridge-br0' \
  type bridge \
  connection.interface-name br0 \
  connection.autoconnect yes \
  connection.autoconnect-slaves 1 \
  ipv4.method auto ipv6.method auto
# Set spanning tree protocol (STP) on or off
nmcli connection modify bridge-br0 bridge.stp no
nmcli connection modify bridge-br0 bridge.stp yes

# create connection for physical device enp1s0 as bridge slave
nmcli connection add \
  connection.id 'ethernet-enp1s0' \
  type ethernet \
  connection.interface-name enp1s0 \
  connection.autoconnect yes \
  connection.master br0 \
  connection.slave-type bridge

# bring down the current connection of the physical device connected to the router
nmcli connection modify 'Wired enp1s0' autoconnect no # don't activate on startup
nmcli connection down 'Wired enp1s0' # cut internet connection
# bring bridge connections up
nmcli connection up id ethernet-enp1s0
nmcli connection up id bridge-br0

nmcli connection show # check until ethernet-enp1s0 and bridge-br0 are active
ip route # default route should be through br0 to router IP address
curl -vvv ifconfig.me # test internet connection
```

A firewall zone was created for libvirt during its installation. The bridge and physical device should be in the default zone.

```sh
firewall-cmd --get-active-zones # e.g. FedoraServer/FedoraWorkstation and libvirt
sudo firewall-cmd --zone=libvirt --list-all
sudo firewall-cmd --zone=FedoraServer --list-all
# change zone of bridge
nmcli connection modify bridge-br0 connection.zone ZONENAME
```

### Storage pools

Storage is managed in "pools". A default pool is created automatically. See storage pool XML format [libvirt.org/formatstorage.html](https://libvirt.org/formatstorage.html).

```sh
# show XML document of storage pool capabilities
virsh pool-capabilities

# list image pools
virsh pool-list --all --details # shows pool 'default' (on connection qemu:///system)
virsh pool-edit default # open XML document for pool "default"
```

A new storage pool can be created for a specific user. There should already exist SELinux file context policies for `/var/lib/libvirt/` and `/home/[^/]+/\.libvirt(/.*)?` et cetera.

```sh
# show existing SELinux file context policies for libvirt files
sudo semanage fcontext --list | grep libvirt
# add 
sudo semanage fcontext --add --seuser system_u --type virt_image_t "${HOME}/.local/share/libvirt/images(/.*)?"
cat /etc/selinux/targeted/contexts/files/file_contexts.local

# create a storage pool named "user"
virsh pool-define-as --name user --type dir --target ~/.local/share/libvirt/images
virsh pool-start --build user
virsh pool-autostart user
virsh pool-info user

sudo restorecon -RFv ~/.local/share/libvirt/images

virsh pool-destroy --pool user
virsh pool-undefine --pool user
virsh pool-list --all
rm ~/.local/share/libvirt/images/* # remove files manually
```

Create volumes.

```sh
virsh help vol-create-as
virsh vol-list --pool user --details

virsh vol-create-as --pool user --name raw-disk.img --capacity 10G --format raw
virsh vol-info --pool user --vol raw-disk.img
virsh vol-delete --pool user --vol raw-disk.img

virsh vol-create-as --pool user --name qcow2-disk.qcow2 --capacity 10G --format qcow2 --allocation 0 --prealloc-metadata 
virsh vol-info --pool user --vol qcow2-disk.qcow2
virsh vol-delete --pool user --vol qcow2-disk.qcow2

```

```sh
virsh domblklist --details VMNAME
```

```sh
# convert disk to another format
qemu-img convert /path/to/qcow2-disk.qcow2 /path/to/raw-disk.img
```

### Create a VM

Virtual machine ("domain") XML format: [https://libvirt.org/formatdomain.html](https://libvirt.org/formatdomain.html).

Create a VM connected to the a virtual network bridge with `virt-install`.

```sh
virt-install \
  --connect="qemu:///system" \
  --name=fedora37 \
  --vcpus=2 --memory=4096 \
  --os-variant=fedora37 \
  --os-type=linux \
  --cdrom=/var/lib/libvirt/images/Fedora-Workstation-37/Fedora-Workstation-Live-x86-64-37-1.1.iso \
  --import \
  --graphics=vnc,listen=127.0.0.1,port=5901 \
  --noautoconsole \
  --disk='size=16' \
  --network bridge=virbr0

virsh dumpxml fedora37 > vm.xml # save VM as XML configuration
virsh define vm.xml             # create from XML configuration
```

```sh
virsh start fedora37
virsh console fedora37
virsh shutdown fedora37
virsh destroy fedora37 # forcefully shutdown

# top for VMs
virt-top
```

Remove a VM:

```sh
virsh destroy fedora37
virsh undefine --remove-all-storage fedora37
```

### Remote connection

The client tools can connect to a libvirtd daemon running on a remote server. Documentation for connection URIs: [https://libvirt.org/uri.html](https://libvirt.org/uri.html). Documentation for remote support: [https://libvirt.org/remote.html](https://libvirt.org/remote.html).

```sh
# URI format: driver[+transport]://[username@][hostname][:port]/[path][?extraparameters]
virsh --connect 'qemu+ssh://admin@homeserver/system' list --all
virsh --connect 'qemu+ssh://admin@homeserver/session' list --all
virt-manager --connect 'qemu+ssh://admin@homeserver/system' --no-fork
```

The SSH daemon needs to be running on the VM server to use ssh.

```sh
sudo dnf install openssh-server
systemctl enable --now sshd
mkdir ~/.ssh
vi ~/.ssh/authorized_keys # add public key of client user
```

### GPU passthrough

To pass a GPU device to a virtual machine a VFIO stub driver must be loaded. The stub driver stops the nouveau/nvidia/amdgpu driver from claiming the device and a VM can later take control of the device from the stub driver.

Change the kernel parameters to ensure the VFIO driver is preloaded for the GPU (and its associated audio device). Another GPU should be active as the primary GPU on the host machine.

> NOTE: in addition to enabling virtualization in BIOS, there may be another switch to enable PCI passthrough/IOMMU (input/output memory management unit). E.g. `VT-d` (Intel Virtualization Technology for directed I/O) or `AMD-Vi` (AMD I/O Virtualization Technology (IOMMU)).

Check that the GPUs onboard devices are in an isolated IOMMU group. All devices in a group must be passed to the VM. The motherboard's "secondary" GPU slot may not be isolated. In that case, the GPU to passthrough must be inserted in the "primary" PCIe x16 slot.

```sh
sudo su - # become root

# show /sys/kernel/iommu_groups/<group>/devices/<domain>:<bus>:<slot>:<function>
find /sys/kernel/iommu_groups/ -type l | sort --version-sort
# show group of a specific device "0000:07:00.0"
readlink --canonicalize /sys/bus/pci/devices/0000\:07\:00.0/iommu_group/

# show PCI device codes and kernel drivers for each device (search for "VGA")
lspci -nnk | less
# show device codes and names for domain 7 (e.g. devices 00:07:0 00:07:1)
lspci -nn -s 7

sudo virt-host-validate qemu # ensure IOMMU is enabled by kernel
lsmod | grep vfio # check that vfio modules are loaded
dmesg | grep -i IOMMU # check for "DMAR: IOMMU enabled"
# check for errors in dracut services logs
journalctl --since today --unit 'dracut*' --grep 'fatal|error|fail'
```

#### pci-stub with different GPUs

Ensure the pci-stub driver claims the GPU's devices before the host drivers. This can be used when the two GPUs are different and therefore have different device codes (`VENDOR:DEVICE`).

Create a new initramfs/initrd image that assigns the `pci-stub` driver to the GPU's devices. Grubby and Dracut is used below.

```sh
sudo su - # become root

# check that pci-stub is a builtin kernel module
modprobe --show-depends pci-stub # shows: builtin pci_stub
modinfo pci-stub

# append options to Grub boot loader's kernel arguments in GRUB_CMDLINE_LINUX.
#   NOTE: use "amd_iommu=on" instead of "intel_iommu" for AMD CPU
grubby --update-kernel=ALL \
  --args='intel_iommu=on iommu=pt pci-stub.ids=10de:1187,10de:0e0a'

# optionally remove "rhgb" and "quiet" to show system messages after booting
grubby --update-kernel=ALL --remove-args='rhgb quiet'
grubby --info=ALL # show all kernels' settings

# overwrite initramfs/initrd image
dracut --force --kver $(uname -r) --verbose && echo success
ls -lrt /boot/initramfs*

# reboot
shutdown now

# verify command line includes the added options
cat /proc/cmdline
# check that kernel driver in use is "pci-stub" for the GPU's devices
lspci -nnk
```

#### vfio-pci with different GPUs

Ensure the vfio-pci driver claims the GPU's devices before the host drivers. This can be used when the two GPUs are different and therefore have different device codes (`VENDOR:DEVICE`).

Create a new initramfs/initrd image that assigns the `vfio-pci` driver to the GPU's devices. Grubby and Dracut is used below.

```sh
sudo su - # become root

grubby --update-kernel=ALL \
  --args='intel_iommu=on iommu=pt vfio-pci.ids=10de:1187,10de:0e0a rd.driver.pre=vfio-pci'

# or set vfio-pci.ids in module options
echo 'options vfio-pci ids=10de:1187,10de:0e0a' > /etc/modprobe.d/vfio-pci.conf

# check if vfio depends on vfio_virqfd; if it does, add vfio_virqfd to "add_drivers" below
modprobe --show-depends vfio
# create dracut configuration that adds vfio kernel modules to the initramfs
echo 'add_drivers+=" vfio vfio_iommu_type1 vfio_pci "'   > /etc/dracut.conf.d/vfio.conf
# or, ensure early kernel module loading by modprobe
echo 'force_drivers+=" vfio vfio_iommu_type1 vfio_pci "' > /etc/dracut.conf.d/vfio.conf

# overwrite initramfs/initrd image
dracut --force --kver $(uname -r) --verbose && echo success
ls -lrt /boot/initramfs*

# reboot
shutdown now

# verify command line includes the added options
cat /proc/cmdline
# check that kernel driver in use is "vfio-pci" for the GPU's devices
lspci -nnk
```

#### vfio-pci with identical GPUs

Ensure the vfio-pci driver claims the GPU's devices before the host drivers. This can be used when the two GPUs are the same and therefore have the same device codes (`VENDOR:DEVICE`).

Create a new initramfs/initrd image that assigns the `vfio-pci` driver to the GPU's devices. Grubby and Dracut is used below.

```sh
cat > /sbin/vfio-pci-driver-override.sh <<'EOF'
#!/bin/sh
DEVICES='0000:07:00.0 0000:07:00.1'  # GPU's devices to passthrough
for DEVICE in ${DEVICES}
do
  echo 'vfio-pci' > /sys/bus/pci/devices/${DEVICE}/driver_override
done
modprobe -i vfio-pci
EOF
chmod 0755 /sbin/vfio-pci-driver-override.sh

# configure module to run script
echo 'install vfio-pci /sbin/vfio-pci-driver-override.sh' > /etc/modprobe.d/vfio-pci.conf

# configure dracut to include the script in the initramfs
cat > /etc/dracut.conf.d/vfio.conf <<'EOF'
add_drivers+=" vfio vfio_iommu_type1 vfio_pci "
install_items+=" /sbin/vfio-pci-driver-override.sh "
EOF
  # NOTE: install_items should list full paths to any executables used in the script

# overwrite initramfs/initrd image
dracut --force --kver $(uname -r) --verbose && echo success
ls -lrt /boot/initramfs*

# reboot
shutdown now

# verify command line includes the added options
cat /proc/cmdline
# check that kernel driver in use is "vfio-pci" for the GPU's devices
lspci -nnk
```

#### Add a GPU in VM

Attach the GPU's devices to the VM and remove all SPICE components to only get video output to the GPU's monitor. You may need to add the `<address>` elements to GPU devices to ensure they are both added on the same slot with different functions. Set `multifunction="on"` on the graphics device in that case.

```xml
<hostdev mode="subsystem" type="pci" managed="yes">
  <source>
    <address domain="0x0000" bus="0x07" slot="0x00" function="0x0"/>
  </source>
  <address type="pci" domain="0x0000" bus="0x00" slot="0x0a" function="0x0" multifunction="on"/>
</hostdev>

<hostdev mode="subsystem" type="pci" managed="yes">
  <source>
    <address domain="0x0000" bus="0x07" slot="0x00" function="0x1"/>
  </source>
  <address type="pci" domain="0x0000" bus="0x00" slot="0x0a" function="0x1"/>
</hostdev>
```

> NOTE: removing SPICE components removes the device for the windowed display on the host. If there is an element `<audio type="spice">`, change its type to `none` instead of `spice`.

Plug in another pair mouse and keyboard to the physical host and add them as devices to the VM.

```xml
<hostdev mode="subsystem" type="usb" managed="yes">
  <source>
    <vendor id="0x2516"/>
    <product id="0x0141"/>
  </source>
  <address type="usb" bus="0" port="1"/>
</hostdev>

<hostdev mode="subsystem" type="usb" managed="yes">
  <source>
    <vendor id="0x046a"/>
    <product id="0x0001"/>
  </source>
  <address type="usb" bus="0" port="2"/>
</hostdev>
```

Download and install the GPU drivers inside the VM.

- AMD GPU drivers: [https://www.amd.com/en/support](https://www.amd.com/en/support).
- NVIDIA GPU drivers: [https://www.nvidia.co.uk/Download/index.aspx](https://www.nvidia.co.uk/Download/index.aspx).

## Containers

```sh
sudo dnf install podman skopeo buildah
rpm -q slirp4netns # check that slirp4netns is installed
podman info && sudo podman info # display podman system information

podman run docker.io/library/hello-world:latest
podman ps --all
podman inspect --latest
podman rm --latest
podman images
podman rmi docker.io/library/hello-world:latest

# search man pages
man -k containers
```

Rootless containers require [slirp4netns](https://github.com/rootless-containers/slirp4netns) for unprivileged user-mode networking. Rootfull containers run on the default Podman bridge.

Image registry authentication credentials are stored in `${XDG_RUNTIME_DIR}/containers/auth.json` or `~/.config/containers/auth.json`. Podman, Buildah, and Skopeo share credentials.

```sh
podman login quay.io
less ${XDG_RUNTIME_DIR:-~/.config}/containers/auth.json

buildah login --username USERNAME docker.io

podman login --get-login docker.io

skopeo login \
  --tls-verify=false \
  --username USERNAME \
  --password PASSWORD \
  myregistrydomain.com:5000

skopeo logout myregistrydomain.com:5000

# log in to ghcr with token
cat githubtoken.txt | podman login ghcr.io -u USERNAME --password-stdin
```

```sh
# show search registries
podman info --format='{{index .Registries "search"}}'
# search "unqualified-search-registries"
podman search nginx --limit 1000
# search specific registry
podman search docker.io/nginx --filter=is-official=true --format='{{.Name}}'
# show image tags
podman search docker.io/library/nginx:latest --list-tags --limit 1000
```

```sh
# show processes in container: podman top --latest|container [format-descriptors]
podman top --latest
# host user, process ID, commandline, user, group, host user, host group, start time
podman top --latest hpid,pid,args,user,group,huser,hgroup,stime

find /sys/fs/cgroup -name 'libpod-*'  #"*$(podman ps --format '{.ID}')*"

# restore files to default SELinux labels
restorecon -RFv mydir/
```

### Configuration

Each nonroot user stores their images at `~/.local/share/containers/storage/`. Root stores images at `/var/lib/containers/storage/`.

Configuration is at `~/.config/containers/*.conf` if it exists, otherwise at `/etc/containers/*.conf`. See `man 5 containers-registries.conf`.

#### SUBUIDs and SUBGIDs for rootless users

To run containers as a rootless user, the user namespace needs subuid/subgid mappings configured.

```sh
# check ranges of UIDs/GIDs that users are allowed to use (format: user:start:count)
cat /etc/subuid # e.g. bob:100000:65536
cat /etc/subgid # e.g. bob:100000:65536
# to add UID/GID ranges either manually edit above files or run:
sudo usermod --add-subuids FIRST-LAST --add-subgids FIRST-LAST USERNAME
# to delete UID/GID ranges, edit the above files or run:
sudo usermod --del-subuids FIRST-LAST --del-subgids FIRST-LAST USERNAME
# propogate changes to podman to recreate the user namespace
podman system migrate
# show subuid/subgid (two rows, one containing "100000 65536")
podman unshare cat /proc/self/uid_map
podman unshare cat /proc/self/gid_map

# automatic uid/gid selection may also configure automatic sub-ids
# check min/max/count range on subuid/subgid, if defined
grep -E 'SUB_.ID' /etc/login.defs
man 5 login.defs
```

Ranges for different users should not overlap.

#### Capabilities and limits

Container engines read the following configuration files in TOML format.

- `/usr/share/containers/containers.conf`
- `/etc/containers/containers.conf`
- `/etc/containers/containers.conf.d/*.conf`
- `${HOME}/.config/containers/containers.conf`
- `${HOME}/.config/containers/containers.conf.d/*.conf`

### Running containers as systemd services

```sh
# start a container
podman run --name CONTAINER_NAME ...

# generate service file "container-CONTAINER_NAME.service"
podman generate systemd --new --name CONTAINER_NAME --files \
  --env FOO=BAR \
  --restart-policy=always \
  --no-header
mv container-CONTAINER_NAME.service ~/.config/systemd/user/

# reload systemd and enable service
systemctl --user daemon-reload
systemctl --user enable container-CONTAINER_NAME.service
systemctl --user status SERVICE_NAME.service # inactive (dead) until next boot

podman stop CONTAINER_NAME; podman rm CONTAINER_NAME

# spawn a user session at boot
loginctl enable-linger $(id -u)
loginctl show-user $(id -u) # Linger=yes

# view logs
journalctl --user-unit=container-CONTAINER_NAME.service
```

### NodeJS development image

This builds a NodeJS image that stores global packages in a volume. When running, a directory is mounted into the container's home folder; it's SELinux context is changed to `containers_t`.

```sh
# find a NodeJS image to use
podman search registry.access.redhat.com/node
podman search docker.io/library/node --list-tags --limit 10000 | less
```

```sh
podman pull docker://registry.access.redhat.com/ubi9/nodejs-16:1-71
ctr=$(buildah from registry.access.redhat.com/ubi9/nodejs-16:1-71)

# update configuration for interactive use
buildah config \
  --cmd '["/bin/bash", "-il"]' --entrypoint '' \
  --user root:root \
  --env HOME=/root \
  --workingdir /root/app-root/ \
  --env NODE_ENV=development \
  --env NPM_CONFIG_GLOBALCONFIG=/root/node_cache/npmrc \
  --env NPM_CONFIG_USERCONFIG=/root/node_cache/.npmrc \
  --env NPM_CONFIG_PREFIX=/root/node_cache \
  --env NPM_CONFIG_CACHE=/root/node_cache/.npm \
  --env NPM_CONFIG_INIT_MODULE=/root/node_cache/.npm-init.js \
  --env PATH='/root/node_cache/bin:/usr/local/sbin:/usr/local/bin:/usr/sbin:/usr/bin:/sbin:/bin' \
  ${ctr}

# update shell environment
buildah run ${ctr} bash -c 'cat > /etc/profile.d/extra.sh' \
<<<'export PATH=${PATH}:${NPM_CONFIG_PREFIX}/bin
alias ls="ls --color=auto -Ax --group-directories-first -1"
alias cp="cp -v"
alias rm="rm -Iv"'

buildah run ${ctr} ln -sf /usr/bin/python3 /usr/bin/python

buildah commit ${ctr} nodejs:latest
buildah rm ${ctr}

podman volume create node_cache  # will be mounted as cache directory
mkdir --mode=770 mydir           # will be mounted as working directory

# run rootless, as root in container
podman run -ti --name nodejs \
  --user 0:0 \
  -v node_cache:/root/node_cache/ \
  -v ${PWD}/mydir:/root/app-root/:Z \
  --publish 8888:8888 \
  nodejs:latest

podman start -ai nodejs  # re-start container with same state
```

Script to start/restart container for any current directory:

```sh
# set container name from path, with replaced characters
NAME=$(echo ${PWD} | tr '/ ' '_-')

# start or run
if podman logs ${NAME} &>/dev/null
then
  podman start -ai ${NAME}
else
  podman run -ti --name ${NAME} \
    -v node_cache:/root/node_cache \
    -v ${PWD}:/root/app-root/:Z \
    localhost/nodejs:latest
fi
```

### Skopeo

```sh
man 5 containers-transports

# copy local to remote
skopeo copy containers-storage:alpine:latest docker://docker.io/library/alpine:latest
# copy remote to local
skopeo copy docker://docker.io/library/alpine:latest containers-storage:alpine:latest
# copy remote to remote
skopeo copy \
  docker://quay.io/username/myimage:latest \
  docker://quay.io/username/myimage:v1.0.0 \
  --src-creds 'username:password' --dest-creds 'username:password'
  # or --creds='username:password'

# print image configuration
skopeo inspect --config docker://docker.io/library/hello-world:latest
```

## LVM

Components of LVM:

- Physical volume (PV): partition or disk designated for LVM.
- Volume group (VG): a pool of physical volumes.
- Logical volume (LG): a mountable storage device, allocated from a volume group.

A logical volume aggregates devices and partitions to appear as a single mounted storage device. Logical volumes can be extended or reduced in size without reformatting and repartitioning the underlying devices. LVM metadata is written to the physical volumes such that they can be moved and used in another system.

LVM supports physical volumes from either a non-partitioned disk or from a disk partition. Though to avoid other operating systems interpreting the device as free, create a single partition that covers the whole disk and create a physical volume from it.

**Thin volumes** are logical volumes that are "thinly provisioned" and not preallocated -- meaning they have a virtual size that may be larger than the available physical space.

Symbolic links for logical volumes are created at `/dev/VGName/LVName` and `/dev/mapper/VGName-LVName`.

```sh
# list block devices with filesystems and full device paths
lsblk --fs --paths

# LVM2 package is installed (Fedora/RHEL)
rpm -q lvm2
sudo su - # become root

# configuration
lvm dumpconfig
vi /etc/lvm/lvm.conf
```

Below are common commands to manage logical volumes.

```sh
sudo su - # become root

# create physical volumes from devices
pvcreate /dev/vda1
pvcreate /dev/vdb1
pvdisplay; pvs; pvscan # view

# create a volume group with the physical volumes
vgcreate vg1 /dev/vda1 # (multiple physical volumes can be specified directly here)
vgextend vg1 /dev/sdb1 # add second physical volume
vgdisplay; vgs; vgscan # view

# create a logical volume
lvcreate vg1 --size 5G --name lv1 # create "lv1" of size 5GiB
lvresize vg1/lv1 --size +5G --resizefs # increase "lv1" size by 5GiB
lvextend vg1/lv1 --extents +100%FREE --resizefs # extend lv1 to all available space in vg1
lvdisplay; lvs; lvscan # view

# format
mkfs.xfs /dev/vg1/lv1  # as XFS file system (can't be reduced)
mkfs.ext4 /dev/vg1/lv1 # as ext4 file system (can be reduced)
# mount
mkdir -p /mnt/lv1
mount /dev/vg1/lv1 /mnt/lv1
umount /mnt/lv1 # unmount
# update fstab to auto-mount
echo '/dev/mapper/vg1-lv1  /mnt/lv1  xfs  defaults  0 0' >> /etc/fstab
mount --all

blkid /dev/vg1/lv1 # get UUID

# reduce the size by 1 GiB (without --resizefs, resize file system before lvreduce)
lvreduce --size -1G vg1/lv1 --resizefs

# remove a logical volume
lvremove vg1/lv1
# remove a volume group
vgchange --active n vg1 # deactivate first
vgremove vg1
# remove a physical volume
pvmove --verbose /dev/vdb1 # move data away from the physical volume
vgreduce vg1 /dev/vdb1 # remove physical volume from volume group
pvremove /dev/vdb1 # remove the LVM metadata (when there is no logical volume using it)
```

```sh
# instead of --resizefs, resize file system after extending or before reducing
fsadm resize /dev/vg1/lv1 # for ext2/ext3/ext4/ReiserFS/XFS
# alternatively, extend ext2/ext3/ext4 with:
resize2fs /dev/vg1/lv1
```

```sh
# create a snapshot
NAME=lv1-snapshot-$(date +%s)
lvcreate /dev/vg1/lv1 --snapshot --size 1G --name ${NAME}
lvs # snapshot has "Origin" set to "lv1"
# mount snapshot
mkdir -p /mnt/snapshot
mount /dev/vg1/${NAME} /mnt/${NAME}
  # for XFS use: -onouuid,ro,norecovery
  # nouuid: Don't check for double mounted file systems using the file system uuid
  # norecovery: don't replay changes from log for recovery.
umount /mnt/${NAME}
# restore snapshot to overwrite lv1
lvconvert --merge /dev/vg1/${NAME}
# deactivate and then activate
lvchange --activate n /dev/vg1/lv1
lvchange --activate y /dev/vg1/lv1
```

View LVM history in metadata archive:

```sh
vgcfgrestore --list vg1
ls -1 /etc/lvm/archive/
cat /etc/lvm/archive/*

# dry-run restore volume group configuration
vgcfgrestore vg1 --test --file /etc/lvm/archive/vg1_00000-111111111.vg

# set autobackup=no to skip configuration backup
lvextend --autobackup n --extents +100%FREE --resizefs vg1/lv1
  # useful when lv1 is the root partition without free space for backups
```
