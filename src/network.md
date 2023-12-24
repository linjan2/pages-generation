<!----
--table-of-contents --number-sections
--variable homelink=true --variable includeHeader=true
--metadata=title:"Network"
--metadata=title-meta="network"
--metadata=subtitle:"Network commands and references for Linux and Windows"
--metadata=description:'Network commands and references for Linux and Windows'
-->
# Network configuration and troubleshooting

[https://httpbin.org](https://httpbin.org)

## Cheat sheets

```sh
# get your external IP address
curl ifconfig.me
curl https://icanhazip.com
wget -O - -q https://checkip.amazonaws.com

# Generate MAC address (three different formats)
printf '00:16:3e:%02x:%02x:%02x\n' $(( RANDOM % 128 )) $(( RANDOM % 256 )) $(( RANDOM % 256 ))
  # 00:16:3e:46:a0:5e
printf '00-16-3e-%02x-%02x-%02x\n' $(( RANDOM % 128 )) $(( RANDOM % 256 )) $(( RANDOM % 256 ))
  # 00-16-3e-56-a4-98
printf '0016.3e%02x.%02x%02x\n' $(( RANDOM % 128 )) $(( RANDOM % 256 )) $(( RANDOM % 256 ))
  # 0016.3e3d.fdd7

# pretty format JSON
curl -Ls https://myserver/v2/_api | python -m json.tool

# send tar files (unencrypted)
tar -czf - /path/to/dir | nc HOST 5555    # on sending host
nc --verbose --listen 5555 | tar -xzvf -  # on receiving host

# send device block data (unencrypted)
dd bs=4M if=/dev/sda | gzip --stdout | nc HOST 5555    # on sending host
nc -l 5555 | gzip --decompress | dd bs=4M of=/dev/sdb  # on receiving host

# send data encrypted
echo hello | openssl aes-256-cbc -pbkdf2 -iter 100000 -salt -pass pass:pa55word \
  | nc host 5555 # on sending host
nc -l 5555 | openssl aes-256-cbc -d -pbkdf2 -iter 100000 -salt -pass pass:pa55word # on receiving host

# create HTTP server
python -m http.server 9000        # python 3
python -m SimpleHTTPServer 9000   # python 2

# create an HTTP proxy server on http://localhost:8888
nc --listen --proxy-type http localhost 8888
curl --proxy http://localhost:8888 https://example.com
# create an HTTPS proxy server on https://localhost:8888
nc --listen --proxy-type http --ssl --ssl-cert=cert.pem --ssl-key=certkey.pem localhost 8888
curl --proxy https://localhost:8443 --proxy-insecure https://icanhazip.com

# Enable HTTP proxy in shell
export http_proxy=http://foo:bar@202.54.1.1:3128/
# Use the same for HTTPS
export https_proxy=${http_proxy}
export HTTPS_PROXY=${http_proxy}
```

### Windows

```bat
:: show all interface settings
ipconfig /all

:: display ARP cache
arp -a
arp -d 192.168.0.4 # delete ARP cache entry

:: set DHCP on device "Ethernet"
netsh interface ip set address "Ethernet" dhcp

route print
::        destination        mask          gateway          interface
route add 192.168.100.0 mask 255.255.255.0 192.168.100.1 if 2
```

```powershell
$MyPat = 'yourPAT'
$B64Pat = [Convert]::ToBase64String([System.Text.Encoding]::UTF8.GetBytes("`:$MyPat"))

Resolve-DnsName -Name example.com -Type A -Server 8.8.8.8
```

[Test-NetConnection](https://learn.microsoft.com/en-us/previous-versions/windows/powershell-scripting/dn372891(v=wps.630))

```powershell
# ping test
tnc 8.8.8.8
tnc 8.8.8.8 -port 443
Test-NetConnection -ComputerName example.com -Port 80 -InformationLevel Detailed

# traceroute
tnc 8.8.8.8 -traceroute -hops 3

# poor man's port scan
$ports = "22","23","80","443","8080"
foreach ($port in $ports) {
  $t = new-object system.net.sockets.tcpclient -argumentlist "192.168.0.100",$port
  if ($t.connected) {
    write-host 'TCP port' $port
  }
  $u = new-object system.net.sockets.udpclient -argumentlist "192.168.0.100",$port
  if ($u.connected) {
    write-host 'UDP port' $port
  }
}
```

### OSI model

|   | OSI           | TCP/IP      | Examples |
|:-:|:--------------|:------------|:---------|
| L7 | Application   | Application |  HTTP, FTP, Telnet, NTP, LDAP, DNS, DHCP, RIP, SIP, SMTP, SSH, TLS/SSL  |
| L6 | Presentation  | -||-        | -||- |
| L5 | Session       | -||-        | -||- |
| L4 | Transport     | Transport   | TCP, UDP |
| L3 | Network       | Internet    | IPv4, IPv6, ICMP, ARP, IGMP, IPsec |
| L2 | Data link     | Link        | MAC, PPP, NDP, ARP, Ethernet (10 Base T), Wi-Fi (802.11), DOCSIS, Tunnels |
| L1 | Physical      | -||-        | -||- |

## Subnetting

```sh
# get info on network spaces
ipcalc 10.0.0.0/8
  # Network:        10.0.0.0/8
  # Netmask:        255.0.0.0 = 8
  # Broadcast:      10.255.255.255

  # Address space:  Private Use
  # HostMin:        10.0.0.1
  # HostMax:        10.255.255.254
  # Hosts/Net:      16777214
ipcalc --all-info 172.16.0.0 255.240.0.0
ipcalc --all-info fe80::/8

# split /20-network (4094 hosts) into multiple /24-networks (254 hosts)
ipcalc 192.168.0.0/20 -S 24

# print the networks that cover an address range
while read -r ITEM
do
  echo "---------[ ${ITEM} ]---------"
  ipcalc --addresses --minaddr --maxaddr ${ITEM}
done < <(ipcalc --deaggregate=192.168.87.0-192.168.110.255 --no-decorate)
```

The Internet Assigned Numbers Authority (IANA) has reserved the following three blocks of the IP address space for private internets:

| Range                         | CIDR Notation   | Default Subnet Mask | Number of hosts      |
|:-----------------------------:|:---------------:|:-------------------:|:--------------------:|
| 10.0.0.0 - 10.255.255.255     | 10.0.0.0/8      | 255.0.0.0           | 16,777,216 (24 bits) |
| 172.16.0.0 - 172.31.255.255   | 172.16.0.0/12   | 255.240.0.0         | 1,048,576 (20 bits)  |
| 192.168.0.0 - 192.168.255.255 | 192.168.0.0/16  | 255.255.0.0         | 65,536 (16 bits)     |

## SSH

```sh
# generate SSH key with comment, file name, no passphrase
ssh-keygen -t rsa -b 4096  -C 'admin@home' -f ~/.ssh/id_rsa-admin-homeserver -N ''
cat ~/.ssh/id_rsa-admin-homeserver.pub

ssh -v user@example.com # verbose
ssh -o StrictHostKeyChecking=false -i ~/.ssh/host_key -p 22 user@example.com
ssh \
  -o UserKnownHostsFile=/tmp/known_hosts \
  -o PreferredAuthentications=passwords \
  -F ~/.ssh/config2 \
  user@example.com

ssh-keyscan -p 22 -t rsa example.com >> ~/.ssh/known_hosts

# copy ~/.ssh/id_rsa.pub to /user/home/.ssh/authorized_keys
ssh-copy-id user@example.com

scp whateverfile user@example.com:/home/user/
scp user@example.com:/home/user/whateverfile ./

# listing of known hosts
ssh-keygen -lv -f ~/.ssh/known_hosts

# send data encrypted with SSH
tar -C /path/to/dir -czf - * | ssh user@example.com 'tar -C /path/to/dir -xzvf -'

man ssh_config
man sshd_config
```

`~/.ssh/config`:

```default
ServerAliveInterval 15

Host homeserver
  HostName 192.168.0.150
  Port 22
  User admin
  IdentityFile ~/.ssh/admin-homeserver
  KeepAlive yes
```

### SSH server

`/etc/ssh/sshd_config`:

```default
Port 2777                   # change SSH port from 22

PermitRootLogin no          # disable logging in as root
MaxAuthTries 1              # limit the authentication attempts for login session
LoginGraceTime 2            # limit the authentication time (in seconds)

# disable unused authentication methods
PasswordAuthentication no   # disable logging in with password instead of key
PermitEmptyPasswords no     # disable empty passwords
ChallengeResponseAuthentication no
KerberosAuthentication no
GSSAPIAuthentication no

X11Forwarding no          # disable remote graphical applications over SSH connection
PermitUserEnvironment no  # disallow clients to pass custom environment variables
  # NOTE: also remove any AcceptEnv options

# Allow SSH tunneling
AllowAgentForwarding yes
AllowTcpForwarding yes
PermitTunnel yes
GatewayPorts yes # bind remote port-forwards to server's localhost address
  # set to "clientspecified" to bind them to server's wildcard address

AllowUsers admin *@172.16.0.0/20
AllowGroups sshgroup

ClientAliveInterval 300   # send an alive message to the client at five minute interval
ClientAliveCountMax 2     # disconnect after 2 alive message

# trusted CA certificate for client signed keys
TrustedUserCAKeys /etc/ssh/trusted-user-ca-keys.pem
```

```sh
# validate sshd_config
sudo sshd -t

service ssh restart
systemctl reload sshd
```

A user's authorized keys are in file `~/.ssh/authorized_keys`.

```sh
ssh-copy-id -i id_rsa -p 22 -o PreferredAuthentications=passwords username@server.example.com
  # dry-run with -n
```

> `authorized_keys` file format:
>
> ```default
> ssh-rsa AAAB...
> no-agent-forwarding,no-X11-forwarding ssh-rsa AAAB...
> restrict,X11-forwarding ssh-rsa AAAB...
>```

### SSH proxying

```sh
# connect to target through jumphost
ssh -J user@jumphost.com user@target.com

# local port-forward localhost:12345 through forwarder to target.com:5000
ssh -L 12345:target.com:5000 -N user@forwarder.com

# remote port-forward forwarder:12345 through localhost to target.com:5000
ssh -R 12345:target.com:5000 -N user@forwarder.com
  # sshd_config GatewayPorts sets how server binds the remote port.
  # GatewayPorts yes : remote port is bound to server's localhost address.
  #   -R localhost:12345:target.com:5000
  # GatewayPorts clientspecified : remote port is bound to server's wildcard address.
  #   -R *:12345:target.com.5000

# start local SOCKS server for port-forwarding through bastion.com
ssh -D 127.0.0.1:1080 -N user@bastion.com

# start remote SOCKS server for connections forwarded from forwarder.com:1080
ssh -R 1080 -N user@forwarder.com
```

```default
# -J jumphost
Host target
  Hostname target.com
  User user
  ProxyJump user@jumphost.com

# -L local port-forward
Host lforward
  Hostname forwarder.com
  User user
  LocalForward 12345 target.com:5000
  SessionType none # -N

# -R remote port-forward
Host rforward
  Hostname forwarder.com
  User user
  RemoteForward 12345 target.com:5000
  SessionType none # -N

# -D SOCKS server
Host socks-bastion
  Hostname bastion.com
  User user
  DynamicForward 1080
  SessionType none # -N

# -R SOCKS server
Host socks-rforward
  Hostname forwarder.com
  User user
  RemoteForward 1080
  SessionType none # -N
  # only permit listed targets
  PermitRemoteOpen allowed1:* allowed2:443
```

The jump host can be configured with its own host entry.

```default
Host jumphost
  Hostname jumphost.com
  Port 22
  User user
  IdentityFile ~/.ssh/ed25519

Host target
  Hostname target.com
  User user
  ProxyJump jumphost
```

### sshfs

Mount file system with `sshfs`.

```sh
sudo dnf install fuse-sshfs
sudo apt install sshfs

mkdir /mnt/mountpoint

sshfs -o idmap=user user@example:/home/user/mountpoint /mnt/mountpoint
ls /mnt/mountpoint

# unmounting FUSE mount (use `umount` on OS X and FreeBSD for bind mounts)
fusermount3 -u /mnt/mountpoint/
```

## OpenSSL commands

```sh
# show all information
openssl version -a

# get server certificate
openssl s_client -showcerts -connect example:443 </dev/null 2>/dev/null \
  | sed -n '/BEGIN CERTIFICATE/,/END CERTIFICATE/p'
  # alternatively: | awk '/BEGIN CERTIFICATE/,/END CERTIFICATE/ { print $0 }'

# check expiration dates
openssl s_client -showcerts -connect example:443 2>/dev/null < /dev/null | openssl x509 -noout -dates
# set the TLS SNI (server name indication) if different from connect host
openssl s_client -showcerts -connect example:443 -servername theservername < /dev/null

# view certificate as text
openssl x509 -in certificate.crt -noout -text
# check SSL key MD5 hash
openssl rsa -noout -modulus -in server.key | openssl md5
# get serial
openssl x509 -in cert.pem -noout -serial

# convert a DER-formatted certificate to PEM-format
openssl x509 -in cert.der -out cert.pem -outform PEM -inform DER
# convert a PEM-formatted certificate to DER-format
openssl rsa -in cert.pem -out cert.der -inform PEM -outform DER

# convert a PEM-formatted certificate to PKCS#12-format
openssl pkcs12 -export -in cert.pem -out cert.p12 -nokeys
# convert a PKCS#12-formatted certificate to PEM-format
openssl pkcs12 -in cert.p12 -out cert.pem

# export key from PKCS#12 (not certificate); provide passphrase
openssl pkcs12 -in file.p12 -out key.pem -nocerts -passin 'pass:123'

# remove password protection on private key
openssl rsa -in password_protected_tls.key -out tls.key

# generate a private key with passphrase from different sources ("BEGIN PRIVATE KEY" PKCS#8)
man 1 openssl-passphrase-options
man 1 openssl-genpkey
# from literal
openssl genpkey -algorithm RSA -out private.pem -outform PEM -pass 'pass:123'
# from environment variable
PASS=123 openssl genpkey -algorithm RSA -out private.pem -outform PEM -pass 'env:PASS' 
# from file (first line)
openssl genpkey -algorithm RSA -out private.pem -outform PEM -pass 'file:pass'         
# from file descriptor
openssl genpkey -algorithm RSA -out private.pem -outform PEM -pass 'fd:3' 3<<<'123'    
# from standard input
openssl genpkey -algorithm RSA -out private.pem -outform PEM -pass 'stdin' <<<'123'    

# set random source ("BEGIN RSA PRIVATE KEY" PKCS#1)
openssl genrsa \
  -rand /proc/apm:/proc/cpuinfo:/proc/dma:/proc/filesystems:/proc/interrupts:/proc/ioports:/proc/pci:/proc/rtc:/proc/uptime \
  2048 > private.pem 2> /dev/null

# generate a public RSA key from private key
openssl rsa -in private.pem -pubout -out public.pem -outform PEM

# create a hex-encoded message digest of a file
openssl dgst -md5 -hex file.txt
openssl md5 file.txt # same as previous

# hash a password with SHA-512
openssl passwd -6 'password' # (generated salt)
openssl passwd -6 -stdin -salt gWV6TvRu2SEb9MP4 <<<'password'
  # format: $<ID>$<SALT>$<BASE64-DIGEST>
  # example: $6$gWV6TvRu2SEb9MP4$QOmzZ//JlA...

# sign a file using SHA-256 with binary file output
openssl dgst -sha256 -sign private.pem -out signature.sign file.txt
openssl sha256 -sign private.pem -out signature.sign file.txt # same as previous
# verify signature with public key
openssl dgst -sha256 -verify public.pem -signature signature.sign file.txt

# SHA256-hash a key and then base64-encode it
openssl dgst -sha256 -binary public.der | openssl base64

# generate public key of format "ssh-rsa AAAA..." from private OpenSSH format
ssh-keygen -y -f private.pem > id_rsa.pub

# generate 8 pseudo-random bytes, encoded in base64
openssl rand -base64 8
```

OpenSSL generally only uses the first certificate in a certificate bundle, so a CA bundle must be split into separate files.

```sh
# count number of certificates in bundle
grep -E 'BEGIN.* CERTIFICATE' cert.pem | wc -l

# split into separate files
csplit -s -z -f crt- cert.pem '/-----BEGIN CERTIFICATE-----/' '{*}'
for CERT in crt-*
do
  openssl x509 -in "${CERT}" -noout -subject -issuer -startdate -enddate -fingerprint -ext subjectAltName
done
```

### Installing certificates

```sh
# rhel & fedora
sudo cp mycert.pem /etc/pki/ca-trust/source/anchors/
sudo update-ca-trust

# ubuntu; store with extension .crt
sudo cp mycert.pem /usr/share/ca-certificates/mycert.crt
sudo update-ca-certificates
```

Add certificates to Java trust store (certificate file must only contain one certificate):

```sh
# add to a Java keystore
keytool -import -noprompt -keystore certs -file cert.pem -storepass 123 -alias service-cert

# add root CA to Java bundle
keytool -import -noprompt -cacerts -file cert.pem -storepass 123 -alias "service-cert"
```

### Generating certificates with OpenSSL

Create a certificate authority certificate and sign a server certificate for localhost.

```sh
# generate self-signed root CA certificate
openssl genrsa -aes256 -out rootcakey.pem 4096
openssl req -x509 -new -noenc -key rootcakey.pem -sha256 -subj "/CN=ROOTCA" -days 10000 -out rootca.pem
  # -noenc replaced -nodes since OpenSSL 3.0 (to not encrypt private keys)

# create CSR for host
openssl genrsa -out certkey.pem 2048
openssl req -new -sha256 \
  -key certkey.pem \
  -subj "/C=SE/O=My Org/CN=$(hostname)" \
  -reqexts SAN \
  -config <(cat /etc/pki/tls/openssl.cnf \
    <(echo -e "\n[SAN]\nsubjectAltName=DNS.1:*.$(hostname),DNS.2:localhost,IP:127.0.0.1")) \
  -out cert.csr

# create certificate issued by root CA
openssl x509 -req -sha256 -days 365 \
  -in cert.csr -out cert.pem \
  -CA rootca.pem -CAkey rootcakey.pem -CAcreateserial \
  -copy_extensions copy \
  -extfile <(echo 'extendedKeyUsage = serverAuth')

# view certificate
openssl x509 -text -noout -in cert.pem
```

Calculate days until a specific target expiration date.

```sh
TARGET='2026-06-01'
cal "${TARGET}"
START="$(date +%s)"
END="$(date +%s --date ${TARGET})"
DAYS="$(( 1 + (${END} - ${START}) / (3600*24) ))"

echo "There are ${DAYS} days between $(date --date @${START} +%F) and ${TARGET}"
```

#### Create CA root

- [RFC 5280 Internet X.509 Public Key Infrastructure Certificate and Certificate Revocation List (CRL) Profile](https://www.rfc-editor.org/rfc/rfc5280)
- [RFC 4158 Internet X.509 Public Key Infrastructure: Certification Path Building](https://www.rfc-editor.org/rfc/rfc4158)

```sh
# X509 V3 certificate extension configuration format
man x509v3_config
```

A root CA issues a certificate to an intermediate CA. The intermediate CA issues certificates to a server host and a client host.

Two different OpenSSL configuration files are used (or three if counting the default `/etc/ssl/openssl.cnf`). One for the req command and one for the ca command. Different configuation sections are selected depending on which certificate is being created.

```sh
# Setup working directory
umask 0077 # create new files as u=rwX
mkdir workingdir
cd workingdir
mkdir caroot ca server client caroot/certsdir ca/certsdir
touch caroot/index.txt ca/index.txt       # create index file for root CA and CA
openssl rand -hex 16 > caroot/serial.txt  # create initial serial for root CA's certificates
openssl rand -hex 16 > ca/serial.txt      # create initial serial for CA's certificates


# create private keys
openssl genrsa -aes256 -out caroot/caroot.key.pem 4096 # prompts for passphrase
openssl genrsa -aes256 -out ca/ca.key.pem         4096 # prompts for passphrase
openssl genrsa         -out server/server.key.pem 2048 # no password
openssl genrsa         -out client/client.key.pem 2048 # no password

openssl rsa -in caroot/caroot.key.pem -text -noout
openssl rsa -in server/server.key.pem -text -noout


# create CSRs for root CA, CA, server, and client
openssl req -new -key caroot/caroot.key.pem -out caroot/caroot.csr -config req.cnf -reqexts req_caroot_ext -subj '/C=SE/O=Test/CN=CAROOT'
openssl req -new -key ca/ca.key.pem         -out ca/ca.csr         -config req.cnf -reqexts req_ca_ext     -subj '/C=SE/O=Test/CN=CA1'
openssl req -new -key server/server.key.pem -out server/server.csr -config req.cnf -reqexts req_server_ext -subj '/C=SE/O=Test/CN=server.example.com'
openssl req -new -key client/client.key.pem -out client/client.csr -config req.cnf -reqexts req_client_ext -subj '/C=SE/O=Test/CN=client.example.com/emailAddress=client@example.com'

# view CSRs
openssl req -noout -text -in caroot/caroot.csr
openssl req -noout -text -in ca/ca.csr
openssl req -noout -text -in server/server.csr
openssl req -noout -text -in client/client.csr


# self-sign root CA
pushd caroot  # sign caroot CSR from caroot directory
openssl ca -selfsign -config ../ca.cnf \
  -keyfile caroot.key.pem \
  -policy ca_policy_match -extensions ca_caroot_ext -days 3650 -notext \
  -in caroot.csr -out caroot.crt.pem
# view certificate
openssl x509 -text -noout -in caroot.crt.pem  # as text
openssl x509 -subject -issuer -noout -in caroot.crt.pem  # only subject and issuer
popd

# sign CA CSR with root CA
pushd caroot  # sign ca CSR from caroot directory
openssl ca -config ../ca.cnf \
  -cert caroot.crt.pem -keyfile caroot.key.pem \
  -policy ca_policy_match -extensions ca_ca_ext -days 400 -notext \
  -in ../ca/ca.csr -out ../ca/ca.crt.pem
# view certificate
openssl x509 -text -noout -in ../ca/ca.crt.pem  # as text
openssl x509 -subject -issuer -noout -in ../ca/ca.crt.pem  # only subject and issuer
popd

# sign server CSR with CA
pushd ca  # sign server CSR from ca directory
openssl ca -config ../ca.cnf \
  -cert ca.crt.pem -keyfile ca.key.pem \
  -policy ca_policy_anything -extensions ca_server_ext -days 365 -notext \
  -in ../server/server.csr -out ../server/server.crt.pem
# view certificate
openssl x509 -text -noout -in ../server/server.crt.pem  # as text
openssl x509 -subject -issuer -noout -in ../server/server.crt.pem  # only subject and issuer
popd

# sign client CSR with CA
pushd ca # sign client CSR from ca directory
openssl ca -config ../ca.cnf \
  -cert ca.crt.pem -keyfile ca.key.pem \
  -policy ca_policy_anything -extensions ca_client_ext -days 365 -notext \
  -in ../client/client.csr -out ../client/client.crt.pem
# view certificate
openssl x509 -text -noout -in ../client/client.crt.pem  # as text
openssl x509 -subject -issuer -noout -in ../client/client.crt.pem  # only subject and issuer
popd


# bundle certificates (with server certificate first)
cat ca/ca.crt.pem caroot/caroot.crt.pem                       > ca-chain.crt.pem
cat server/server.crt.pem ca/ca.crt.pem                       > server/chain.crt.pem
cat server/server.crt.pem ca/ca.crt.pem caroot/caroot.crt.pem > server/full-chain.crt.pem
cat client/client.crt.pem ca/ca.crt.pem                       > client/chain.crt.pem
cat client/client.crt.pem ca/ca.crt.pem caroot/caroot.crt.pem > client/full-chain.crt.pem

# verify CA certificates
openssl verify -CAfile caroot/caroot.crt.pem caroot/caroot.crt.pem
openssl verify -CAfile caroot/caroot.crt.pem ca/ca.crt.pem

# verify endpoint certificates with full CA-chain
openssl verify -CAfile ca-chain.crt.pem server/server.crt.pem
openssl verify -CAfile ca-chain.crt.pem client/client.crt.pem

# verify partial chain upto issuing CA (not root CA)
openssl verify -CAfile ca/ca.crt.pem             -show_chain -partial_chain server/server.crt.pem
openssl verify -CAfile ca/ca.crt.pem             -show_chain -partial_chain client/client.crt.pem
openssl verify -CAfile server/full-chain.crt.pem -show_chain                server/server.crt.pem
openssl verify -CAfile client/full-chain.crt.pem -show_chain                client/client.crt.pem
```

The `ca.cnf` file used for `openssl ca`:

```ini
#
# Configuration for using ca
#
HOME = .

####################################################################
[ ca ]
default_ca        = CA_default

[CA_default]
#default_days      = 365
default_crl_days  = 30
default_md        = sha512       # Use public key default MD
preserve          = yes           # Keep passed DN ordering and don't ignore fields missing in policy
#x509_extensions   =              # The extensions to add to the signed certificate
email_in_dn       = no            # Don't concat the email in the DN
copy_extensions   = copy          # Required to copy SANs from CSR to cert
base_dir          = .
#certificate       =
#private_key       =
#certs             =
new_certs_dir     = ${base_dir}/certsdir     # Output location for new certs after signing
database          = ${base_dir}/index.txt    # Database index file
serial            = ${base_dir}/serial.txt   # File with the next serial number to use (in hex)
unique_subject    = no                       # no means allow generation of duplicate subject certificates
#policy            =                         # how similar the request should look to the CA certificate
crlnumber         = ${base_dir}/crlnumber    # the current crl number; must be commented out to leave a V1 CRL
name_opt          = ca_default               # Subject Name options; certificate details shown for signing confirmation
cert_opt          = ca_default               # Certificate field options; certificate details shown for signing confirmation


####################################################################
#
# Select a policy section with: -policy SECTION
#
[ ca_policy_match ]
countryName            = match
stateOrProvinceName    = optional
localityName           = optional
organizationName       = match
organizationalUnitName = optional
commonName             = supplied
emailAddress           = optional

[ ca_policy_anything ]
countryName             = optional
stateOrProvinceName     = optional
localityName            = optional
organizationName        = optional
organizationalUnitName  = optional
commonName              = supplied
emailAddress            = optional

####################################################################
#
# Select an extensions section with: -extensions SECTION
# With copy_extensions=copy, x509_extensions for ca copies or overrides CSR extensions for req
#
[ ca_caroot_ext ]
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always,issuer:always
basicConstraints       = critical, CA:true
keyUsage               = critical, keyCertSign, cRLSign

[ ca_ca_ext ]
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid:always,issuer:always
basicConstraints       = critical, CA:true, pathlen:0
keyUsage               = critical, keyCertSign, cRLSign

[ ca_server_ext ]
basicConstraints       = CA:FALSE
nsCertType             = server
nsComment              = "OpenSSL Generated Server Certificate"
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid, issuer:always
keyUsage               = digitalSignature, nonRepudiation, keyEncipherment
extendedKeyUsage       = serverAuth, clientAuth

[ ca_client_ext ]
basicConstraints       = CA:FALSE
nsCertType             = client, email
nsComment              = "OpenSSL Generated Client Certificate"
subjectKeyIdentifier   = hash
authorityKeyIdentifier = keyid, issuer:always
keyUsage               = digitalSignature, nonRepudiation, keyEncipherment
extendedKeyUsage       = clientAuth
```

The `req.cnf` file used for `openssl req`:

```ini
#
# Configuration for using req
#
HOME = .

####################################################################
[ req ]
default_bits       = 4096   # 2048 for server and 4096 for CA
default_md         = sha512
#default_keyfile    =
#req_extensions     = # add CA or server extension fields: -reqexts SECTION
string_mask        = utf8only
distinguished_name = req_distinguished_name
attributes         = req_attributes

[ req_attributes ]
challengePassword              =
challengePassword_min          = 12
challengePassword_max          = 40

####################################################################
[ req_distinguished_name ]
# Describe the Subject
# Short names:
#   C=countryName
#   ST=stateOrProvinceName
#   L=localityName
#   O=organizationName
#   OU=organizationalUnitName
#   CN=commonName
#   emailAddress
# Enter '.' to leave the field empty.
countryName                     = Country Name (2 letter code)
countryName_default             = SE
countryName_min                 = 2
countryName_max                 = 2
stateOrProvinceName             = State or Province Name (full name)
stateOrProvinceName_default     = .
localityName                    = Locality Name (eg, city)
localityName_default            = .
0.organizationName              = Organization Name (eg, company)
0.organizationName_default      = Test
organizationalUnitName          = Organizational Unit (eg, division)
organizationalUnitName_default  = .
commonName                      = Common Name (e.g. server FQDN or YOUR name)
emailAddress                    = Email Address
emailAddress_max                = 64

####################################################################
#
# Extensions to CSR; these are added or overridden to certificate by ca-command when using copy_extensions=copy in ca
# Select an extensions section with: -reqexts SECTION
#
[ req_caroot_ext ]
subjectKeyIdentifier   = hash
basicConstraints       = critical, CA:true
keyUsage               = critical, keyCertSign, cRLSign

[ req_ca_ext ]
subjectKeyIdentifier   = hash
basicConstraints       = critical, CA:true, pathlen:0
keyUsage               = critical, keyCertSign, cRLSign

[req_server_ext]
basicConstraints = CA:FALSE
keyUsage         = digitalSignature, nonRepudiation, keyEncipherment
extendedKeyUsage = serverAuth, clientAuth
subjectAltName = @alt_names
[alt_names]
IP.1 = 127.0.0.1
DNS.1 = localhost
DNS.2 = *.example.com
DNS.3 = example.com

[req_client_ext]
basicConstraints = CA:FALSE
keyUsage         = digitalSignature, nonRepudiation, keyEncipherment
extendedKeyUsage = clientAuth
subjectAltName   = email:copy
```

## GPG

```sh
# create key with passphrase
gpg --gen-key
  # prompts to create USER-ID from real name and email
  # prompts for key passphrase
gpg --full-generate-key
  # set name as 'Full Name (comment) <EMAIL>'
  # example: 'Alice Bobsson (dev1) <alice@example.com>'
  # the KEY_ID is generated like 'DCE35944' (last 4 hex of fingerprint)
  # The key fingerprint is the hash of the public key
  # Creates a public key and private/signing key. Private key is signed

gpg --detach-sign file.txt

# create signature in file.txt.sig
umask 0077
# prefix command with space to ignore in history log
export HISTCONTROL=ignorespace:erasedups
 echo '12345' > passphrase.txt # create file with key's passphrase
gpg --batch --detach-sign --passphrase-fd 0 file.txt < passphrase.txt
shred --remove=unlink passphrase.txt
```

Compute the checksum on Linux:

```sh
# fetch key
gpg --keyserver pgpkeys.mit.edu --recv-key 59C4703E
gpg --fingerprint 59C4703E # inspect

# verify .asc detached signature against file
gpg --verify file.tar.gz.asc file.tar.gz
```

Compute the checksum on Windows:

```powershell
Certutil -hashfile "/path/to/file" SHA1
Certutil -hashfile "/path/to/file" SHA256
Certutil -hashfile "/path/to/file" SHA512
Certutil -hashfile "/path/to/file" MD5

Get-FileHash "/path/to/file" -Algorithm SHA1
Get-FileHash "/path/to/file" -Algorithm SHA256
Get-FileHash "/path/to/file" -Algorithm SHA512
Get-FileHash "/path/to/file" -Algorithm MD5
```

## Network client tools

```sh
ping -i 2 -c 3 example.com # 2 second interval, 3 times
ping6 -I eth1 fe80::117:21ff:feda:a425 # IPv6 ping on specific device eth1

# telnet to test connectivity
curl -vL telnet://example:80

# ask for MAC address for an IP address
arping 192.168.0.1 -I eth0

# show opened sockets
lsof -i:21
sudo lsof -i:7000 # port 7000
sudo lsof -u user1 -a -i:8085 # both user and port
sudo lsof -u ^root -a -i:8085 # not root and port
lsof -u ^root -P -i TCP -i UDP # not root, and TCP or UDP interfaces
lsof -i -P -n

# trace system calls "open", "socket", "ioctl", "open" for a command
strace -e trace=open,socket,ioctl nginx
```

Bash handles redirections to `/dev/tcp/host/port` and `/dev/udp/host/port` by opening TCP/UDP sockets to the specified host and port.

```sh
# check open connections
for FD in /dev/tcp/10.124.50.{1,2,3,4}/{80,443,8080,8443}
do
  { echo -n '' > ${FD} && echo "${FD} is open" ; } 2>/dev/null
done

# send HTTP data over TCP connection and output response
HOSTNAME=www.example.com
PORT=80
RESOURCE=/
{
  echo -e "GET ${RESOURCE} HTTP/1.0\r\nHost: ${HOSTNAME}\r\n\r" >&3
  cat <&3
} 3<> /dev/tcp/${HOSTNAME}/${PORT}
echo $? # 0 if connection was successful

# connect and wait for data to be read
cat </dev/tcp/localhost/8080
```

Measure tansfer and bandwidth of upload from client to server.

```sh
# server (defaults: port 5001; TCP window size 128 KByte)
iperf -s

# client (defaults: port 5001; TCP window size 45 KByte)
iperf -c 192.168.0.20
```

### curl

```sh
curl --trace-ascii trace.txt http://example.com/
curl --trace-ascii trace.txt --trace-time -O http://example.com/
curl --head http://example.com/
curl --user user:password --upload-file file http://example.com/upload --next --user user:password http://example.com/results.html

# use personal access token
curl -u :${PAT} https://example.com   # (uses: Authorization: Basic Base64(':'+PAT))
curl -H 'Authorization: Bearer ${PAT}' https://example.com

# concatenates all --data and send application/x-www-form-urlencoded
curl http://example.com --data-urlencode "field1=value1" --data-urlencode "field2=value2"
curl http://example.com --form field1=@localfilename --form field2=value2
```

```sh
# use request headers and payload from files
curl \
  -H @headers.txt \
  --data @payload.json \
  https://example.com

# dump response headers and payload to files
curl --dump-header /tmp/headers.txt --remote-name --output-dir /tmp --no-clobber https://example.com

curl --config - <<EOF
# --- fetch from two URLs ---
url = "https://example.com"
remote-name-all
output-dir example
create-dirs
no-clobber
user-agent = "superagent/1.0"
next
url = "example.com/docs/manpage.html"
referer = "http://nowhereatall.example.com/"
EOF
```

#### curl proxy

```sh
# set proxy with environment variables (with credentials)
export http_proxy=http://username:password@proxy.com:8080
export HTTP_PROXY=http://username:password@proxy.com:8080
export https_proxy=http://username:password@proxy.com:8080
export HTTPS_PROXY=http://username:password@proxy.com:8080
export no_proxy=localhost,127.0.0.1,.somedomain.com
export NO_PROXY=localhost,127.0.0.1,.somedomain.com
# set proxy inline
curl --proxy 'http://proxy.com' 'http://example.com'
# bypass proxy environment variables
curl --noproxy '*' 'http://example.com'
```

Use a SOCKS pre-proxy to tunnel traffic through a bastion host. The HTTP(S) proxy is then accessed from the bastion. The final target host is accessed through the proxy.

```sh
# start local SOCKS server for port-forwarding through bastion
ssh -D localhost:1080 bastion.example.com
# use the SOCKS server as preproxy
curl --preproxy socks5h://localhost:1080 -x http://proxy.example.com https://www.example.com
  # or socks:// socks4:// socks4a:// socks5:// socks5h://
  # 'h' in protocol scheme will look up hostnames via proxy
```

#### curl formatted output

```sh
# print formatted output
curl -s -o /dev/null -w "@curl-format.txt" http://example.com
```

`curl-format.txt`:

```txt
time_namelookup:      %{time_namelookup}\n
time_connect:         %{time_connect}\n
time_appconnect:      %{time_appconnect}\n
time_pretransfer:     %{time_pretransfer}\n
time_redirect:        %{time_redirect}\n
time_starttransfer:   %{time_starttransfer}\n
----------\n
time_total:           %{time_total}\n
```

### traceroute

```sh
traceroute www.apple.com # UDP
sudo traceroute -I www.apple.com # ICMP
```

```default
traceroute to www.apple.com (23.46.180.139), 30 hops max, 60 byte packets
1 192.168.1.1 (192.168.1.1) 0.225 ms 0.273 ms 0.283 ms
2 10.10.0.1 (10.10.0.1) 11.046 ms 11.938 ms 16.645 ms
3 pool.hargray.net (64.202.123.123) 28.169 ms 22.060 ms 21.785 ms
4 10ge14-8.core1.atl1.he.net (216.66.49.77) 22.552 ms 22.391 ms 19.566 ms
5 atx-brdr-01.inet.qwest.net (63.146.26.69) 23.189 ms 21.705 ms 21.952 ms
6 a23-46-180-139.deploy.static.akamaitechnologies.com (23.46.180.139) 21.116 ms 21.365 ms 19.497 ms
```

### netcat (nc)

Netcat's default port, if -p it is not specified, is 31337.

```sh
# Connect to port 80:
nc www.google.com 80

# report connection status
nc -z --verbose 10.10.8.8 22

# Listen on TCP port 1234
nc -v -k -l 1234, UDP port: nc -v -k -ul 1234
# Allow/deny: --allow 192.168.0.0/24, --deny 10.0.0.0/8

# Transfer file:
cat file.txt | nc -v -l -p 5555 # sender
nc host 5555 > file_copy.txt # receiver

# Remote shell:
nc --verbose --listen --exec /bin/bash 31337 --max-conns 3 --allow 192.168.0.0/24 # server
nc host, telnet host 31337 # client

# Reverse telnet:
nc -vv -l # Computer with public IP
nc -v public_host -e /bin/bash # Computer behind firewall

# run a server
nc -l -p 8080
# run client that sends to server
echo 'hello' | nc 10.128.54.212 8080

# port scanning; -z to not send any data
nc -z -v 10.10.8.8 20-80
# 
echo "EXIT" | nc 10.10.8.8 22

# Create an HTTP proxy server on localhost port 8888
nc --listen --proxy-type http localhost 8888
```

### nmap

[Nmap Reference Guide](https://nmap.org/book/man.html)

```sh
# scan for open ports (most common ports 22, 80, 442, 8080 et cetera)
nmap -F 192.168.0.20

# Check provided SSLv3/TLS ciphers
nmap -sV --script ssl-enum-ciphers -p 443 example.com
```

### tcpdump

Put NIC in promiscuous mode to sniff traffic.

```sh
sudo -E capsh --caps="cap_setpcap,cap_setuid,cap_setgid+ep cap_net_raw+eip" --keep=1 --user="$USER" --addamb="cap_net_raw" -- -c /usr/sbin/tcpdump -i eth0 -A -n port 80

# sniff net but ignore IP which is your remote session
tcpdump -n host not XXX.XXX.XXX.XXX | less

# network sniffer on a physical device
tcpdump -nnei enp1s0 -vvv

# show traffic on bridge interface
tcpdump -qnni br0
```

### ss

```sh
# dump socket statistics
ss --tcp --udp --listening --processes --numeric # -tulpn
# check open ports
ss --threads --all --numeric
```

## Configuration

[/proc/sys/net/ipv4/* Variables](https://www.kernel.org/doc/Documentation/networking/ip-sysctl.txt)

```sh
# Ethernet PCI device information
lspci | grep -i eth

# show device driver
ethtool -i enp1s0
# show network hardware configuration
lshw -class network

# show WiFi device capabilities
iw dev wlp8s0 info # by interface name
iw phy phy0 info # by physical device name

sysctl --all --pattern '^net.' # show all net configuration (under /proc/sys/net/)
sysctl net.ipv4.ip_forward # or: sysctl net/ipv4/ip_forward
# temporary change
sudo sysctl -w net.ipv4.ip_forward=1
# or
echo 1 | sudo tee /proc/sys/net/ipv4/ip_forward # allow forwarding of packets
# permanent change with configuration files (or /etc/sysctl.d/99-sysctl.conf)
echo 'net.ipv4.ip_forward = 1' | sudo tee --append /etc/sysctl.conf
# or
echo 'net.ipv4.ip_forward = 1' | sudo tee --append /etc/sysctl.d/99-sysctl.conf
sudo sysctl -p # reload configuration

# load kernel module at boot (systemd-modules-load.service)
echo 'br_netfilter' | sudo tee --append /etc/modules-load.d/myconf.conf

# show network time synchronization status (when the ntpd or chronyd daemon is running)
ntpstat

# query network driver/firmware version and hardware settings
ethtool -i enp6s0
```

### NetworkManager

https://docs.oracle.com/en/operating-systems/oracle-linux/8/network/network-ConfiguringtheSystemsNetwork.html#ol-netconf-nic

```sh
systemctl status NetworkManager.service
journalctl --follow --unit NetworkManager.service

nmcli general status
nmcli device status
nmcli connection show
nmcli radio wifi # WiFi status
nmcli general logging # list log lovel and domains
nmcli general log level DEBUG domains CORE,ETHER,IP # log debug for domains
nmcli general log level INFO domains DEFAULT # restore default logging level

man 8 NetworkManager
man 7 nmcli-examples
man 5 nm-settings-nmcli # description of settings
man 5 NetworkManager.conf

# show all relevant fields
nmcli connection show myconn
# print specific fields
nmcli --fields     ip4.address,ip4.dns,ip4.gateway connection show myconn
nmcli --get-values ip4.address,ip4.dns,ip4.gateway connection show myconn
nmcli -p -f general,wifi-properties device show wlan0

# connect to WiFi access point
nmcli radio wifi on
nmcli device wifi list # show access points (SSIDs)
nmcli device wifi connect "${SSID}" password "${PASSWORD}"
nmcli --ask device wifi connect "${SSID}" # prompts for password
# show wifi password
nmcli --show-secrets --fields 802-11-wireless-security.psk connection show 'My WiFi connection'
nmcli device wifi show-password
```

```sh
# edit connection settings with interactive prompt
nmcli connection edit myconn
nmcli> print
nmcli> describe autoconnect
nmcli> set ipv4.method auto
nmcli> verify
nmcli> set ipv4.method manual
nmcli> set ipv4.ip 192.168.1.123/24
nmcli> set ipv4.gateway 192.168.1.1
nmcli> set ipv4.dns 8.8.8.8 8.8.4.4
nmcli> goto connection
nmcli> print
nmcli> save
nmcli> quit
```

The ifcfg-formatted files in `/etc/sysconfig/network-scripts/` are deprecated in favor for NetworkManager's INI-formatted files in `/etc/NetworkManager/system-connections/`. Print filename paths: `nmcli --get-values filename connection show`.

```sh
man 5 NetworkManager.conf
sudo vi /etc/NetworkManager/NetworkManager.conf
cat /etc/NetworkManager/conf.d/*
nmcli general reload conf

# override DNS servers provided by DHCP (max. 3 servers)
nmcli connection modify myconn ipv4.method auto # auto for DHCP, else manual
nmcli connection modify myconn ipv4.dns '8.8.8.8 8.8.4.4' ipv4.ignore-auto-dns true
nmcli connection down myconn
nmcli connection up myconn
cat /etc/resolv.conf

# configure a static route for 192.168.122.0/24 subnet to gateway 10.10.10.1 through enp1s0
nmcli connection modify enp1s0 +ipv4.routes "192.168.122.0/24 10.10.10.1"

# set firewalld zone for connection's interface
nmcli connection modify myconn connection.zone ZONE_NAME
nmcli connection modify myconn connection.zone '' # unset to add to default zone
# or, edit INI file settings and reload
sudo vi /etc/NetworkManager/system-connections/myconn.nmconnection # [connection]\nzone=trusted
nmcli connection reload
```

### `ip`

Changes made with `ip` are not persisted after a system restart.

The commands `ifconfig`, `arp`, and `route` are deprecated. However, the new tools in iproute2 are not available on MacOS. `ip -Version` should show "iproute2".

| net-tools        | iproute2 |
|:-----------------|:-----------------|
| `arp -a` | `ip neigh` |
| `arp -v` | `ip -s neigh` |
| `arp -s 192.168.1.1 1:2:3:4:5:6` | `ip neigh add 192.168.1.1 lladdr 1:2:3:4:5:6 dev eth1` |
| `arp -i eth1 -d 192.168.1.1` | `ip neigh del 192.168.1.1 dev eth1` |
| `ifconfig -a` | `ip addr` |
| `ifconfig eth0 down` | `ip link set eth0 down` |
| `ifconfig eth0 up` | `ip link set eth0 up` |
| `ifconfig eth0 192.168.1.1` | `ip addr add 192.168.1.1/24 dev eth0` |
| `ifconfig eth0 netmask 255.255.255.0` | `ip addr add 192.168.1.1/24 dev eth0` |
| `ifconfig eth0 mtu 9000` | `ip link set eth0 mtu 9000` |
| `ifconfig eth0:0 192.168.1.2` | `ip addr add 192.168.1.2/24 dev eth0` |
| `netstat` | `ss` |
| `netstat -neopa` | `ss -neopa` |
| `netstat -g` | `ip maddr` |
| `route` | `ip route` |
| `route add -net 192.168.1.0 netmask 255.255.255.0 dev eth0` | `ip route add 192.168.1.0/24 dev eth0` |
| `route add default gw 192.168.1.1` | `ip route add default via 192.168.1.1` |


```sh
alias ip='ip -c=auto'
ip -brief link show
ip -brief address show
ip -details addr # -d,--details
ip link show dev
ip link show type bridge
ip -d link ls

ip route show # show Linux kernel routing table
  # Example:
  #   default via 192.168.0.1 dev enp6s0 proto dhcp src 192.168.0.145 metric 100
  #   192.168.1.0/24 dev enp6s0 proto kernel scope link src 192.168.0.145
  # Means:
  #   the default route is via interface enp6s0.
  #   packets from 192.168.0.145 to network 192.168.1.0/24 are sent through the device enp6s0.
ip route get 192.168.1.5 # display the route taken for IP 192.168.1.5
ip address show to 192.168.0.0/24
ip neigh show # shows the MAC addresses of devices
  # REACHABLE signifies a valid, reachable entry until the timeout expires
  # PERMANENT signifies an everlasting entry that only an administrator can remove
  # STALE signifies a valid, yet unreachable entry; to check its state, the kernel checks it at the first transmission
  # DELAY signifies that the kernel is still waiting for validation from the stale entry
ip -stats neigh flush 192.168.10.5 # flush ARP entry

# flush IP addresses on eth4
ip -statistics -statistics address flush dev eth4 scope global

# enter network namespace
ip netns exec ns0 bash
```

```sh
ip link set enp6s0 up # ip link set dev em1 up
ip link set enp6s0 down # ip link set dev em1 down
ip link set enp6s0 mtu 9000
ip link set enp6s0 promisc on # enable promiscous mode to accept packets for other MAC addresses
ip link set br0 address 56:84:7a:fe:97:99 # change MAC address

# manually add default route for all addresses via the gateway 192.168.0.1 on device br0
ip route del default
ip route add default via 192.168.0.1 dev br0 # set router IP address as gateway through br0

# configure a static route for 192.168.122.0/24 subnet to gateway 10.10.10.1 through enp1s0
ip route del 192.168.122.0/24
ip route add 192.168.122.0/24 via 10.0.0.1 dev enp1s0

# add multiple IP addresses on interface (first is primary address)
ip address add 192.168.2.223/24 dev enp1s0
ip address add 192.168.4.223/24 dev enp1s0
# remove IP addresses
ip address delete 192.168.4.223/24 dev enp1s0
ip address flush dev enp1s0 # removes all IP addresses
```

When removing a primary IPv4 address, the next secondary IPv4 address is only promoted to primary if either `net.ipv4.conf.enp1s0.promote_secondaries=1` or `net.ipv4.conf.default.promote_secondaries=1`. Otherwise, removing the primary removes non-primaries as well. Secondary IPv6 addresses are always promoted to primary if a primary address is deleted.

### sysctl

```sh
# configure privileged ports temporarily
sudo sysctl -w net.ipv4.ip_unprivileged_port_start=80
# permanently
echo 'net.ipv4.ip_unprivileged_port_start=80' | sudo tee --append /etc/sysctl.conf
sysctl -p
# or in subfolder
echo "net.ipv4.ip_forward = 1" | sudo tee /etc/sysctl.d/90-ipforward.conf
sysctl -p /etc/sysctl.d/90-ipforward.conf
```

### Linux bridges

```sh
# check status of bridge Linux module (and related modules)
lsmod | grep bridge
  # they are automatically inserted when creating a bridge
rmmod bridge # remove bridge module

ip link show master br0     # display port configuration for bridge
bridge link show            # display port configuration for all bridges
bridge fdb show -statistics # display known Ethernet addresses on a link (forwarding table)
bridge vlan show -details   # display VLAN filter table
bridge monitor all          # display link, fdb, vlan, mdb state changes continuously
```

```sh
# create two veth pairs
ip link add veth00 type veth peer name veth01 # create veth00-veth01
ip link add veth10 type veth peer name veth11 # create veth10-veth11

# create bridge
ip link add br0 type bridge

# add one of the pairs to bridge
ip link set dev veth00 master br0
ip link set dev veth10 master br0

# create network namespaces
ip netns add ns0
ip netns add ns1
# add one of the pairs to namespace
ip link set veth01 netns ns0
ip link set veth11 netns ns1

# bring them up
ip link set br0 up
ip link set veth00 up
ip link set veth10 up
ip netns exec ns0 ip link set veth01 up
ip netns exec ns1 ip link set veth11 up

# set static IP adresses in the namespaces
ip netns exec ns0 ip addr add dev veth01 192.168.56.1/24
ip netns exec ns1 ip addr add dev veth11 192.168.56.2/24

# ping from namespace
ip netns exec ns0 ip link show
ip netns exec ns0 ip route show
ip netns exec ns0 ping -c 1 192.168.56.2

# set STP
ip link set br0 type bridge stp_state 1
s
# remove interface from bridge
ip link set dev veth00 nomaster
```

```sh
# create connection for bridge interface "br0"
nmcli connection add \
  connection.id 'bridge-br0' \
  type bridge \
  connection.interface-name br0 \
  connection.autoconnect yes \
  connection.autoconnect-slaves 1 \
  ipv4.method auto ipv6.method auto

# create an ethernet bridge slave connection for interface "enp1s0"
nmcli connection add \
  connection.id 'ethernet-enp1s0' \
  type ethernet \
  connection.interface-name enp1s0 \
  connection.autoconnect yes \
  connection.master br0 \
  connection.slave-type bridge
# or, change existing connection
nmcli connection modify ethernet-enp1s0 master bridge-br0 slave-type bridge

nmcli connection up id ethernet-enp1s0
nmcli connection up id bridge-br0

nmcli connection monitor id bridge-br0 # prints a line whenever the specified connection changes
nmcli device show # bridge should have an IP4 address and gateway and DNS
```

### VLANs

VLANs are an isolation technique for running multiple networks on the same interface and MAC address. The parent interface multiplexes using the VLAN ID field of the ethernet frame. The VLAN ID defaults to 0 for "untagged" traffic and is max. 4094.

The VLAN interface tags packets with the VLAN ID as they pass through and removes tags of returning packets. Create a VLAN interface on top of another "parent" interface.

```sh
# add VLAN connection with static IP address
nmcli connection add type vlan con-name vlan10-enp1s0 \
  ifname vlan10 \
  vlan.parent enp1s0 \
  vlan.id 10 \
  ipv4.addresses '192.168.10.1/24' \
  ipv4.gateway '192.168.10.254' \
  ipv4.dns '192.168.10.253' \
  ipv4.method manual
```


### Firewalls

```sh
# check if firewall dropped
dmesg | grep DROPPED
grep DROPPED /var/log/kern.log

# drop all incoming ICMP (ping) packets
echo 1 | sudo tee /proc/sys/net/ipv4/icmp_echo_ignore_all
```

#### `firewalld`

```sh
man -k firewalld
man firewalld.zones
sudo systemctl enable --now firewalld

# disable firewalld service
systemctl stop firewalld
systemctl disable firewalld
systemctl mask firewalld

# enable firewalld logging
firewall-cmd --set-log-denied=all # off, all, unicast, broadcast, multicast
  # or, set LogDenied=all in /etc/firewalld/firewalld.conf and reload
firewall-cmd --get-log-denied # print current log setting
# show logs (either of)
journalctl --catalog --pager-end --unit=firewalld
dmesg | grep -i REJECT
journalctl --output json-pretty
```

##### Configure firewall rules

```sh
firewall-cmd --zone=public --add-port=5308/tcp --permanent
systemctl reload firewalld
firewall-cmd --reload

firewall-cmd --list-all
firewall-cmd --get-default-zone
firewall-cmd --get-active-zones
firewall-cmd --list-all-zones

sudo cat /etc/firewalld/firewalld.conf
sudo ls /etc/firewalld/zones/

iptables --version
iptables --list --numeric --verbose # FirewallBackend=iptables
nft list ruleset # FirewallBackend=nftables

# output corresponding nftables command
iptables-translate -A INPUT -p tcp --dport 22222 -j REJECT
```

```sh
# Set up IP FORWARDing and Masquerading
firewall-cmd --permanent --zone=public --add-masquerade
firewall-cmd --permanent --zone=internal --add-source=192.168.10.0/24
# or use a "direct" iptables configuration:
# firewall-cmd --permanent --direct --passthrough ipv4 -t nat -I POSTROUTING -o eth0 -j MASQUERADE -s 192.168.10.0/24
# Add services offered by the gateway. E.g. if the gateway is acting as a DHCP server and web server:
firewall-cmd --permanent --zone=internal --add-service=dhcp
firewall-cmd --permanent --zone=internal --add-service=http
firewall-cmd --reload

echo 1 > /proc/sys/net/ipv4/ip_forward    # Enables packet forwarding by kernel

# allow ftp in default zone
firewall-cmd --permanent --add-service=ftp
# allow ssh in default zone
firewall-cmd --permanent --add-service=ssh
# allow udp in default zone
firewall-cmd --permanent --add-port=udp
# block a network
firewall-cmd --permanent --add-source=172.30.50.0/24 --zone=block

# allow masquerade
firewall-cmd --permanent --direct --add-rule ipv4 nat POSTROUTING 0 -o eth1 -j MASQUERADE
# allow inside going out
firewall-cmd --permanent --direct --add-rule ipv4 filter FORWARD 0 -i eth1 -o eth0 -j ACCEPT
# allow outside coming in
firewall-cmd --permanent --direct --add-rule ipv4 filter FORWARD 0 -i eth0 -o eth1 -m state --state RELATED,ESTABLISHED -j ACCEPT
```

NetworkManager adds interfaces to firewalld zones with the `connection.zone` field. Deprecated ifcfg files in `/etc/sysconfig/network-scripts/` used `ZONE=name` option to set the zone.

### Container network configuration

When rootless, Podman uses [slirp4netns](https://github.com/rootless-containers/slirp4netns). When run as root, Podman creates a bridge and adds interfaces to it.

```sh
podman network create test-net
podman network ls
podman network inspect test-net

podman container run -d --name mycontainer \
  -p 8080:80 -p 10000:10000/udp --net test-net --ip=10.89.0.5 myimage:tag
podman container inspect mycontainer | grep IPAddress
podman port mycontainer

podman network rm test-net
podman network prune # remove all unused networks

podman network create --subnet 10.99.0.0/30 small-net
  # network address: 10.99.0.0
  # broadcast address: 10.99.0.3
  # available addresses: 10.99.0.1 - 10.99.0.2
  # gateway: 10.99.0.1

# enter network namespace for non-root containers
podman unshare --rootless-cni ip address show
```

## DNS

- [RFC 1033 - DOMAIN ADMINISTRATORS OPERATIONS GUIDE](https://www.rfc-editor.org/rfc/rfc1033.html)
- [RFC 1034 - DOMAIN NAMES - CONCEPTS AND FACILITIES](https://www.rfc-editor.org/rfc/rfc1034.html)
- [RFC 1035 - DOMAIN NAMES - IMPLEMENTATION AND SPECIFICATION](https://www.rfc-editor.org/rfc/rfc1035)
- [RFC 2782 - A DNS RR for specifying the location of services (DNS SRV)](https://www.rfc-editor.org/rfc/rfc2782)

```sh
hostname # show the system's host name
hostname --all-ip-addresses # show all network addresses (except loopback and IPv6 link-local addresses)
hostname --all-fqdns # show the system's FQDNs (i.e. hostname.domain)
dnsdomainname # show the system's DNS domain name

cat /etc/hostname # show static hostname
hostnamectl hostname host.example.com # set static hostname
hostnamectl status
```

```sh
cat /etc/hosts # local hostname resolution
cat /etc/resolv.conf # DNS resolver lookups
cat /etc/nsswitch.conf
getent ahosts host.example.com # Name Service Switch (NSS) entry
getent ahostsv4 $(hostname) # IPv4 for local server
dig -4 +short host.example.com
host -v -t ANY host.example.com
ipcalc --lookup-host host.example.com --no-decorate --ipv6
nslookup host.example.com

# reverse DNS
dig +short -x 192.168.0.123
ipcalc --hostname 192.168.0.123 --no-decorate
# multiple reverse DNS
for i in 192.168.0.{1..254}; do echo -e "$i\n$(dig +short -x $i)"; done
# get reverse DNS name for network
ipcalc --reverse-dns 192.168.0.0/24

# query record type
dig -t A host.example.com
dig -t SRV host.example.com
host -t SOA host.example.com
host -v -t CNAME host.example.com # alias
```

```sh
# get public IP
curl -s https://icanhazip.com
wget -O - -q https://checkip.amazonaws.com
dig +short myip.opendns.com @resolver1.opendns.com
curl https://myipv4.p1.opendns.com/get_my_ip
```

```sh
# interactive nslookup
nslookup
> set type=mx
> gmail.com
>
> set type=a
> gmail-smtp-in.l.google.com
>
> exit
```

Most common types of DNS Records:

| Type   | Description |
|:------:|:------------------------------------------------------------|
| `A`    | *Address*. The record with the IPv4 address of a domain.
| `AAAA` | *Address*. The record with the IPv6 address for a domain.
| `CNAME`| *Canonical name*. Forwards one domain or subdomain to another domain.
| `MX`   | *Mail exchange*. Directs mail to an email server.
| `TXT`  | *Text*. Stores text notes in the record without specific formatting.
| `NS`   | *Name server*. Stores the authoritative name server for a DNS entry; i.e. where the actual DNS record is. This should not be a CNAME.
| `SOA`  | *Start of authority*. Stores information about a domain or zone such as the administrator's email address, when the domain was last updated, and how long the server should wait between refreshes.
| `SRV`  | *Service*. Specifies a port for specific services.
| `PTR`  | *Pointer*. A reverse-lookup of A and AAAA records -- mapping IP addresses to domain names.

### CloudFlare CNAME flattening

A "root record" is the naked domain without any subdomain; e.g. example.com instead of www.example.com. The DNS RFC dictates that a record with a CNAME cannot have any other records. However, a CNAME record is needed to redirect to load-balancers's domain names -- blocking the use of other records for the domain.

CloudFlare's "CNAME flattening" translates a root record CNAME to A records by recurse-querying the CNAME chain until an A record is found. A root query then resolves into IP addresses, goes through load-balancers, and allows the root record to have more than a CNAME record.

### Textual expression of resource records (RR)

```default
<owner> <class> <ttl> TXT "<attribute name>=<attribute value>"
host.widgets.com   IN   TXT   "printer=lpr5"
sam.widgets.com    IN   TXT   "favorite drink=orange juice"
```

## HTTP codes

| Code | Name | Description |
|:----:|:-----|:-----------------------|
| 100 | Continue | Everything so far is OK and that the client should continue with the request or ignore it if it is already finished. |
| 101 | Switching Protocols | The client has asked the server to change protocols and the server has agreed to do so. |
| 102 | Processing | The server has received and is processing the request, but that it does not have a final response yet. |
| 103 | Early Hints | Used to return some response headers before final HTTP message. |
| 200 | OK | Successful request. |
| 201 | Created | The server acknowledged the created resource. |
| 202 | Accepted | The client's request has been received but the server is still processing it. |
| 203 | Non-Authoritative Information | The response that the server sent to the client is not the same as it was when the server sent it. |
| 204 | No Content | There is no content to send for this request |
| 205 | Reset Content | Tells the user agent to reset the document which sent this request. |
| 206 | Partial Content | This response code is used when the range-header is sent from the client to request only part of a resource. |
| 207 | Multi-Status | Conveys information about multiple resources, for situations where multiple status codes might be appropriate. |
| 208 | Already Reported | The members of a DAV binding have already been enumerated in a preceding part of the multi-status response. |
| 226 | IM Used | IM is a specific extension of the HTTP protocol. The extension allows a HTTP server to send diffs (changes) of resources to clients. |
| 300 | Multiple Choices | The request has more than one possible response. The user agent should choose one. |
| 301 | Moved Permanently | The URL of the requested resource has been changed permanently. The new URL is given in the response. |
| 302 | Found | This response code means that the URI of requested resource has been changed temporarily |
| 303 | See Other | The server sent this response to direct the client to get the requested resource at another URI with a GET request. |
| 304 | Not Modified | It tells the client that the response has not been modified, so the client can continue to use the same cached version of the response. |
| 305 | Use Proxy | Defined in a previous version of the HTTP specification to indicate that a requested response must be accessed by a proxy. (discontinued) |
| 307 | Temporary Redirect | The server sends this response to direct the client to get the requested resource at another URI with same method that was used in the prior request. |
| 308 | Permanent Redirect | This means that the resource is now permanently located at another URI, specified by the Location: HTTP Response header. |
| 400 | Bad Request | The server could not understand the request |
| 401 | Unauthorized | The client didn't authenticate himself.  |
| 402 | Payment Required | This response code is reserved for future use. The initial aim for creating this code was using it for digital payment systems, however this status code is used very rarely and no standard convention exists. |
| 403 | Forbidden | The client does not have access rights to the content |
| 404 | Not Found | The server can not find the requested resource |
| 405 | Method Not Allowed | The request method is known by the server but is not supported by the target resource |
| 406 | Not Acceptable | The reponse doesn't conforms to the creteria given by the client |
| 407 | Proxy Authentication Required | This is similar to 401 Unauthorized but authentication is needed to be done by a proxy. |
| 408 | Request Timeout | This response is sent on an idle connection by some servers, even without any previous request by the client. |
| 409 | Conflict | This response is sent when a request conflicts with the current state of the server. |
| 410 | Gone | This response is sent when the requested content has been permanently deleted from server, with no forwarding address. |
| 411 | Length Required | Server rejected the request because the Content-Length header field is not defined and the server requires it. |
| 412 | Precondition Failed | Access to the target resource has been denied. |
| 413 | Payload Too Large | Request entity is larger than limits defined by server. |
| 414 | Request-URI Too Long | The URI requested by the client is longer than the server is willing to interpret. |
| 415 | Unsupported Media Type | The media format is not supported by the server. |
| 416 | Requested Range Not Satisfiable | The range specified by the Range header field in the request cannot be fulfilled. |
| 417 | Expectation Failed | the expectation indicated by the Expect request header field cannot be met by the server. |
| 418 | I'm a teapot | The server refuses the attempt to brew coffee with a teapot. |
| 421 | Misdirected Request | The request was directed at a server that is not able to produce a response. |
| 422 | Unprocessable Entity | The request was well-formed but was unable to be followed due to semantic errors. |
| 423 | Locked | The resource that is being accessed is locked. |
| 424 | Failed Dependency | The request failed due to failure of a previous request. |
| 426 | Upgrade Required | The server refuses to perform the request using the current protocol but might be willing to do so after the client upgrades to a different protocol. |
| 428 | Precondition Required | This response is intended to prevent the 'lost update' problem, where a client GETs a resource's state, modifies it and PUTs it back to the server, when meanwhile a third party has modified the state on the server, leading to a conflict. |
| 429 | Too Many Requests | The user has sent too many requests in a given amount of time |
| 431 | Request Header Fields Too Large | The server is can't process the request because its header fields are too large. |
| 444 | Connection Closed Without Response | The connection opened, but no data was written. |
| 451 | Unavailable For Legal Reasons | The user agent requested a resource that cannot legally be provided (such as a web page censored by a government) |
| 499 | Client Closed Request | The client closed the connection, despite the server was processing the request already. |
| 500 | Internal Server Error | The server has encountered a situation it does not know how to handle. |
| 501 | Not Implemented | The request method is not supported by the server and cannot be handled. |
| 502 | Bad Gateway | This error response means that the server, while working as a gateway to get a response needed to handle the request, got an invalid response. |
| 503 | Service Unavailable | The server is not ready to handle the request. |
| 504 | Gateway Timeout | This error response is given when the server is acting as a gateway and cannot get a response in time. |
| 505 | HTTP Version Not Supported | The HTTP version used in the request is not supported by the server. |
| 506 | Variant Also Negotiates | the chosen variant resource is configured to engage in transparent content negotiation itself, and is therefore not a proper end point in the negotiation process. |
| 507 | Insufficient Storage | The method could not be performed on the resource because the server is unable to store the representation needed to successfully complete the request. |
| 508 | Loop Detected | The server detected an infinite loop while processing the request. |
| 510 | Not Extended | Further extensions to the request are required for the server to fulfill it. |
| 511 | Network Authentication Required | Indicates that the client needs to authenticate to gain network access. |
| 599 | Network Connect Timeout Error | The connection timed out due to a overloaded server, a hardware error or a infrastructure error. |

