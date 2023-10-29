<!----
--table-of-contents --number-sections
--variable homelink=true --variable includeHeader=true
--metadata=title:"OpenShift"
--metadata=title-meta="openshift"
--metadata=subtitle:"OpenShift cheat sheet, commands, and references"
--metadata=description:'OpenShift cheat sheet, commands, and references'
-->
# OpenShift container platform

External links:

- [Latest OpenShift documentation](https://docs.openshift.com/container-platform/latest/welcome/index.html)
- [Product Documentation for OpenShift Container Platform](https://access.redhat.com/documentation/en-us/openshift_container_platform/)
- [OpenShift mirror - latest clients](https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/latest/)
- [Red Hat Ecosystem Catalog](https://catalog.redhat.com/software/containers/explore)
- [Red Hat issue tracker](https://issues.redhat.com/browse/RFE)
- [Red Hat Developer program GitHub](https://github.com/redhat-developer)
- [Red Hat OpenShift Container Platform Life Cycle Policy](https://access.redhat.com/support/policy/updates/openshift)
- [Support documentation](https://docs.openshift.com/container-platform/latest/support/index.html)
- [Red Hat Communities of Practice](https://github.com/redhat-cop)
- [OpenShift runbooks](https://github.com/openshift/runbooks)
- [Red Hat Learning](https://rol.redhat.com/rol/app/)

## Cluster settings

The cluster version and updates are managed by the cluster version operator (CVO).

```sh
oc get clusteroperator config-operator
oc get config.operator.openshift.io cluster -o yaml
oc get pods -n openshift-config-operator

oc get configmaps,secrets -n openshift-config
oc get configmaps,secrets -n kube-system
```

```sh
# show version and status
oc get clusterversion
oc version # shows client and server Kubernetes version
# get kubernetes version of a specific release (requires podman and access to release image registry)
oc adm release info 4.11.43 -o jsonpath='{.displayVersions.kubernetes.Version}{"\n"}'

# get install-config
oc extract cm/cluster-config-v1 -n kube-system --to=-
oc get infrastructures.config.openshift.io/cluster -o yaml
# get cluster ID (UUID)
oc get clusterversion -o jsonpath='{.items[].spec.clusterID}{"\n"}'
# get infrastructure name (the human friendly cluster ID)
oc get infrastructure/cluster -o jsonpath='{.status.infrastructureName}'

# get KubeAPIServerConfig
oc extract configmap/config -n openshift-kube-apiserver --to=- | jq .

# list cluster configuration resources (like Kubernetes config.k8s.io)
oc api-resources --api-group=config.openshift.io
# use oc-explain on cluster configuration resource
oc explain build.spec --api-version=config.openshift.io/v1

# kubelet.conf file on a node contains KubeletConfiguration
oc debug node/master-0 -- chroot /host cat /etc/kubernetes/kubelet.conf
```

```yaml
apiVersion: config.openshift.io/v1
kind: ClusterVersion
metadata:
  name: version
spec:
  channel: fast-4.11
  clusterID: 7549662b-3347-4975-ac80-1eec3dd80078
  desiredUpdate:
    image: quay.io/openshift-release-dev/ocp-release@sha256:xxx
    version: 4.11.44
  capabilities: # if disabled during installation
    baselineCapabilitySet: vCurrent # or v4.11 or None
    additionalEnabledCapabilities: # after capability is enabled it cannot be disabled
    - openshift-samples # Cluster Samples Operator
    - marketplace # Marketplace Operator
    - baremetal # Cluster Baremetal Operator (CBO)
  upstream: null # OpenShift Update Service host
status:
  availableUpdates:
  - ...
```

Override the management state of cluster version operator's managed components to manually shut them down temporarily.

```sh
# add an override
oc patch clusterversion version --type=json --patch '
- op: replace
  path: /spec/overrides
  value:
  - group: apps
    kind: Deployment
    name: dns-operator
    namespace: openshift-dns-operator
    unmanaged: true'

# shut down dns operator
oc scale deployment/dns-operator --replicas=0 -n openshift-dns-operator

oc patch clusterversion version --type=json --patch \
  '[{"op": "remove", "path": "/spec/overrides"}]'
```

### Machines

```sh
oc get clusteroperator machine-api
oc get pods -n openshift-machine-api

oc get clusteroperator machine-approver
oc get pods -n openshift-cluster-machine-approver

oc get clusteroperator machine-config
oc get pods,deployment,daemonset -n openshift-machine-config-operator
  # controller runs on the master and coordinates updates
  # daemon runs on all nodes to manage its updates
  # server hosts ignition configuration for new nodes
# rendered
oc get pods -n openshift-vsphere-infra # openshift-<provider>-infra
oc get nodes --label-columns=kubernetes.io/hostname,k8s.ovn.org/egress-assignable
oc get machineconfigs,machineconfigpools,containerruntimeconfigs,kubeletconfigs,controllerconfigs
```

```yaml
apiVersion: machine.openshift.io/v1beta1
kind: MachineSet
metadata:
  name: xxx-infra
  namespace: openshift-machine-api
  labels:
    machine.openshift.io/cluster-api-cluster: xxx
spec:
  replicas: 2
  deletePolicy: Oldest
  selector:
    matchLabels:
      machine.openshift.io/cluster-api-cluster: xxx
      machine.openshift.io/cluster-api-machineset: xxx-infra
  template:
    metadata:
      labels:
        machine.openshift.io/cluster-api-cluster: xxx
        machine.openshift.io/cluster-api-machine-role: infra
        machine.openshift.io/cluster-api-machine-type: infra
        machine.openshift.io/cluster-api-machineset: xxx-infra
    spec:
      lifecycleHooks: {}
      metadata:
        labels:
          node-role.kubernetes.io/infra: ''
          k8s.ovn.org/egress-assignable: ''
      providerSpec:
        value:
          apiVersion: vsphereprovider.openshift.io/v1beta1
          credentialsSecret:
            name: vsphere-cloud-credentials
          diskGiB: 120
          kind: VSphereMachineProviderSpec
          memoryMiB: 16392
          metadata:
            creationTimestamp: null
          network:
            devices:
            - networkName: VLAN1234
          numCPUs: 4
          numCoresPerSocket: 2
          snapshot: ""
          template: xxx-rhcos
          userDataSecret:
            name: worker-user-data
          workspace:
            server: vcenter.example.com
            datacenter: DC1
            datastore: DS1
            folder: /DS1/vm/openshift/xxx/
            resourcePool: /DC1/host/DS1/Resources/openshift
      taints:
      - effect: NoSchedule
        key: node-role.kubernetes.io/infra
status:
  availableReplicas: 2
  fullyLabeledReplicas: 2
  observedGeneration: 2
  readyReplicas: 2
  replicas: 2
```

Increase machines in `MachineSets` for IPI installations.

```sh
oc get machinesets,machine -n openshift-machine-api
# increase replicas to 2 (if replicas was 1)
oc scale machineset/xxx-worker --replicas=2 --current-replicas=1 -n openshift-machine-api
```

> In the web console, machine configuration is under "Compute". To increase number of machines, go to Compute > Machine Sets and select "Edit Count".

```yaml
# only one cluster autoscaler per cluster
apiVersion: autoscaling.openshift.io/v1
kind: ClusterAutoscaler
metadata:
  name: default
spec:
  resourceLimits:
    maxNodesTotal: 10
  scaleDown: # waiting when scaling down
    enabled: true
    delayAfterAdd: 10s
    delayAfterDelete: 10s
    delayAfterFailure: 10s
---
# one machine autoscaler per machine set
apiVersion: autoscaling.openshift.io/v1beta1
kind: MachineAutoscaler
metadata:
  name: xxx-worker
  namespace: openshift-machine-api
spec:
  minReplicas: 1
  maxReplicas: 12
  scaleTargetRef:
    apiVersion: machine.openshift.io/v1beta1
    kind: MachineSet
    name: xxx-worker
```

#### Machine configuration

```yaml
apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfigPool
metadata:
  name: worker
spec:
  paused: false # pausing updates
  machineConfigSelector: # select MachineConfigs to apply
    # target single role
    matchLabels:
      machineconfiguration.openshift.io/role: worker
    # target multiple roles
    matchExpressions:
      - key: machineconfiguration.openshift.io/role
      - operator: In
      - values:
        - worker
        - infra
  maxUnavailable: 1 # re-configures at most one node at a time
  # run machine config controller on infra node
  nodeSelector: # select nodes to apply MachineConfigs to
    matchLabels:
      node-role.kubernetes.io/infra: ""

  # automatically updated with targeted MachineConfigs
  configuration:
    name: rendered-worker-<hash> # the applied rendered MachineConfig for this pool
    source:
    - # ...
    - apiVersion: machineconfiguration.openshift.io/v1
      kind: MachineConfig
      name: 99-worker-registries-conf
```

Generate a `MachineConfig` using `butane`.

```yaml
# butane-file.yaml
variant: openshift
version: 4.11.0
metadata:
  name: 99-worker-registries-conf
  labels:
    machineconfiguration.openshift.io/role: worker
storage:
  files:
  - path: /etc/containers/registries.conf.d/99-worker-registries.conf
    mode: 420
    overwrite: true
    contents:
      inline: |
        [[registry]]
          prefix = ""
          location = "quay.io/linda0"
          mirror-by-digest-only = false
          [[registry.mirror]]
            location = "mirror.example.com:5000/linda"
```

```sh
butane butane-file.yaml -o ./machineconfig-99-worker-registries-conf.yaml
```

```yaml
# Generated by Butane; do not edit
apiVersion: machineconfiguration.openshift.io/v1
kind: MachineConfig
metadata:
  name: 99-worker-registries-conf
  labels:
    machineconfiguration.openshift.io/role: worker
spec:
  config:
    ignition:
      version: 3.2.0
    storage:
      files:
      - contents:
          compressions: gzip
          source: data:;base64,<base64>
        mode: 420
        overwrite: true
        path: /etc/containers/registries.conf.d/99-worker-registries.conf
```

> `MachineConfig.spec.config.storage.files.contents.source` is of data URI scheme format. Without compression: `data:text/plain;charset=utf-8;base64,<base64>`. Without base64: `data:text/plain;charset=utf-8,<text>`. Empty: `data:,`.

> Decode gzip file contents:
>
> ```sh
> echo -n '<base64>' | base64 -d | gzip -d
> ```

`MachineConfigPools` generate a new rendered `MachineConfig` by combining the created `MachineConfigs`. Only the latest of the rendered `MachineConfig` is applied.

```sh
# show status of rendered machine configuration for workers
oc get nodes --selector=node-role.kubernetes.io/worker \
  -o custom-columns=\
NAME:.metadata.name,\
'CURRENT:.metadata.annotations.machineconfiguration\.openshift\.io/currentConfig',\
'DESIRED:.metadata.annotations.machineconfiguration\.openshift\.io/desiredConfig',\
'STATE:.metadata.annotations.machineconfiguration\.openshift\.io/state'

# find the last rendered machineconfig (rendered-<pool>-<hash>)
oc get machineconfigpool # shows latest rendered machineconfig name
oc get machineconfig --sort-by=.metadata.creationTimestamp
oc debug node/worker-0 -- chroot /host cat /etc/containers/registries.conf.d/99-worker-registries.conf
```

### Upgrade cluster

[Red Hat OpenShift Container Platform Update Graph](https://access.redhat.com/labs/ocpupgradegraph/update_path/)

[Red Hat Quay openshift-release-dev/ocp-release](https://quay.io/repository/openshift-release-dev/ocp-release?tab=tags)

```sh
# view available updates
oc adm upgrade
# show current cluster release information
oc adm release info
# check which versions can upgrade to 4.11.44
oc adm release info 4.11.44 | grep Upgrades

# upgrade cluster to a version on supported upgrade path
oc adm upgrade --to=4.11.44 # to a version available on current channel
oc adm upgrade --to-latest=true # to newest version available on channel

# extract client tools from new release
oc adm release extract --tools --command=oc

# change update channel (from stable-4.x to stable-4.y to upgrade minor version)
oc adm upgrade channel stable-4.12
# or
oc patch clusterversion version --type="merge" --patch '{"spec":{"channel":"stable-4.12"}}'

# check status that update download is starting (etcd begins updating as soon as files are available)
oc get clusterversion --watch
# wait for cluster operators to begin updating
oc wait co/etcd --for condition=Progressing --timeout 90s
oc wait co/kube-apiserver --for condition=Progressing --timeout 90s
oc wait co/kube-controller-manager --for condition=Progressing --timeout 90s
# watch all cluster operators get updated
oc get clusteroperators --watch
# machine-config is last to update and it restarts the nodes
oc wait co/machine-config --for condition=Progressing=False --timeout 90s
oc get nodes
# wait for completion until nodes are configured
oc get clusterversion --watch
oc wait clusterversion/version --for condition=Progressing=False --timeout 90s

oc logs --tail 200 deployment/cluster-version-operator -n openshift-cluster-version
```

> The cluster version object status may show intermittent errors that can be ignored.

> Upgrade cluster from web console at Administration > Cluster Settings.

> Release information is also available on the mirror site.
>
> ```sh
> VERSION=$(oc get clusterversion/version -o jsonpath='{.spec.desiredUpdate.version}')
> curl "https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/${VERSION}/release.txt"
>
> # release information for latest version of current channel
> CHANNEL=$(oc get clusterversion/version -o jsonpath='{.spec.channel}')
> curl "https://mirror.openshift.com/pub/openshift-v4/x86_64/clients/ocp/${CHANNEL}/release.txt"
> ```

Check `apirequestcounts` to detect deprecated Kubernetes API versions in use. An administrator is required to manually acknowledge updates that remove deprecated API versions. See [Navigating Kubernetes API deprecations and removals](https://access.redhat.com/articles/6955985) and [Deprecated API Migration Guide](https://kubernetes.io/docs/reference/using-api/deprecation-guide/).

```sh
# show resources with the Kubernetes version where they are removed
oc get apirequestcounts | awk '{if(NF==4){print $0}}'

oc get apirequestcounts --sort-by=.status.removedInRelease \
  -o jsonpath='{range .items[?(@.status.removedInRelease!="")]}{.status.removedInRelease}  {.metadata.name}{"\n"}{end}'

# check details of APIRequestCount
oc get apirequestcount cronjobs.v1beta1.batch -o yaml | less

# example of a update acknowledgement (described at upgrade prompt)
oc patch configmap admin-acks -n openshift-config --type=merge \
  --patch '{"data":{"ack-4.11-kube-1.25-api-removals-in-4.12":"true"}}'
```

> Alerts `APIRemovedInNextReleaseInUse` and `APIRemovedInNextEUSReleaseInUse` are fired when deprecated API version in use are detected.

## API server

```sh
oc get clusteroperator kube-apiserver
oc get clusteroperator openshift-apiserver
oc edit apiserver.config.openshift.io cluster

oc get pods -n openshift-kube-apiserver -l app=openshift-kube-apiserver
oc get pods -n openshift-kube-apiserver-operator
oc get pods -n openshift-apiserver
oc get pods -n openshift-apiserver-operator
```

```sh
oc whoami --show-server

oc whoami --show-token
TOKEN=$(oc serviceaccounts get-token SERVICEACCOUNT)

# show all API resources
oc api-resources
oc api-resources --api-group apiserver.openshift.io
```

```yaml
apiVersion: config.openshift.io/v1
kind: APIServer
metadata:
  name: cluster
spec:
  servingCerts:
    namedCertificates:
    - names:
      - api.DOMAIN
      servingCertificate:
        name: custom-api-certificate # TLS Secret in namespace openshift-config
  audit: # audit log policy for API requests
    profile: Default # Default | WriteRequestBodies | AllRequestBodies
  additionalCORSAllowedOrigins: # add CORS headers for clients of API server and OAuth server
  - '(?i)//domain\.example\.com(:|\z)' # golang regular expression
    # (?i) makes the match case-insensitve
    # \z is end of string anchor
```

```yaml
apiVersion: operator.openshift.io/v1
kind: KubeAPIServer
metadata:
  name: cluster
spec:
  observedConfig: ... # sparse config of observed cluster state
---
apiVersion: operator.openshift.io/v1
kind: OpenShiftAPIServer
metadata:
  name: cluster
spec:
  observedConfig: ... # sparse config of observed cluster state
```

Get a certificate for `CN=api.DOMAIN` with the following parameters to `openssl req -reqexts req_api_ext`.

```default
[req_api_ext]
# add intended usages for CA to copy or change
basicConstraints = critical, CA:FALSE
keyUsage         = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName   = @api_alt_names

[api_alt_names]
DNS = api.DOMAIN
```

Create the certificate secret for the API server. Bundle the certificate into the full chain.

```sh
cat cert.crt ca.crt > fullchain.crt # full certificate chain
oc create secret tls custom-api-certificate -n openshift-config \
  --cert=fullchain.crt --key=cert.key

oc patch apiserver/cluster --patch '
spec:
  servingCerts:
    namedCertificates:
    - names:
      - api.DOMAIN
      servingCertificate:
        name: custom-api-certificate'
```

### OAuth

```sh
oc get clusteroperator authentication
oc edit oauth cluster
oc get pods -n openshift-authentication
oc get pods -n openshift-oauth-apiserver # issues OAuth access tokens
```

The authenticator operator provides an authentication server configured with the custom resource `OAuth/cluster`. `Secrets` and `ConfigMaps` referenced in the `OAuth` resource are in the namespace `openshift-config`. The OAuth pods run in namespace `openshift-authentication`.

```yaml
apiVersion: config.openshift.io/v1
kind: OAuth
metadata:
  name: cluster
spec:
  identityProviders:
  - name: <name> # prefix to user name to form identity
    type: <type> # e.g. LDAP or HTPasswd
    mappingMethod: <mapping> # mapping between provider identity and user objects
    <type-specific object> # e.g. ldap or htpasswd
  tokenConfig:
    accessTokenMaxAgeSeconds: 86400 # 24 h (default)
    accessTokenInactivityTimeout: 86400s # 24 h
```

```sh
# after updating OAuth tokenConfig
oc wait co/authentication --for condition=Progressing --timeout 90s
oc rollout status --timeout 60s deployment/oauth-openshift -n openshift-authentication
oc wait co/kube-apiserver --for condition=Progressing --timeout 90s
oc wait co/kube-apiserver --for condition=Progressing=False --timeout 90s
```

OAuth identity provider `mappingMethod` values:

- `claim`: provisions user with the identity user name. Fails if a user with that user name is already mapped to another identity. I.e. you cannot log in with different identity providers. (default)
- `add`: provisions user with the identity user name or creates identity mapping to existing user with that user name. Required when multiple identity providers identify the same set of users and map to the same user names.
- `lookup`: does not automatically provision users or identities -- only looks up an existing identity, user identity mapping, and user. Identities and users must be pre-provisioned.
- `generate`: provisions user with the identity user name or generates unique name if it exists.

> API requests without access token or certificate is performed as the virtual user `system:anonymous` and virtual group `system:unauthenticated`.

```sh
# get OAuth server metadata
oc exec mypod -- curl -k https://openshift.default.svc/.well-known/oauth-authorization-server
```

Delete the `Identity` and `User` resources after deleting a user in the identity provider. Otherwise existing login tokens are still valid.

```sh
oc get identities,users
oc delete identity 'IDENTITY PROVIDER NAME:USERNAME'
oc delete user 'USERNAME'
```

#### HTPasswd identity provider

```yaml
apiVersion: config.openshift.io/v1
kind: OAuth
metadata:
  name: cluster
spec:
  identityProviders:
  - name: HTPasswd local users
    type: HTPasswd
    mappingMethod: claim
    htpasswd:
      fileData:
        name: htpasswd-filedata # secret in openshift-config
```

```sh
# create a htpasswd file
dnf install httpd-tools
htpasswd -n -b user0 password0 # generate password record to stdout
htpasswd -c htpasswd.tmp user1  # creates file and prompts for password
htpasswd -b htpasswd.tmp user2 password2  # argument password
htpasswd -i htpasswd.tmp user3 <<<'password3'  # stdin password
htpasswd -vb htpasswd.tmp user1 password1  # verify username+password
htpasswd -D htpasswd.tmp user1  # delete user
sed -i '$a\' htpasswd.tmp # append newline if missing

# create htpasswd secret (name must match oauth.spec.identityProviders.htpasswd.fileData.name)
oc create secret generic htpasswd-filedata --from-file=htpasswd=htpasswd.tmp -n openshift-config
# output secret to stdout
oc extract secret/generic htpasswd-filedata --keys htpasswd --to=- -n openshift-config

# add new identity provider to list
oc patch OAuth cluster --patch '
- op: add
  path: /spec/identityProviders/-
  value:
    name: HTPasswd local users
    mappingMethod: claim
    type: HTPasswd
    htpasswd:
      fileData:
        name: htpasswd-filedata'

# update the htpasswd secret data
oc set data secret/htpasswd-filedata --from-file htpasswd=htpasswd.tmp -n openshift-config
# wait for OAuth pods to be replaced
oc get pods -n openshift-authentication --watch
# login as a user
oc login -u user1 -p password1
```

#### LDAP identity provider

```yaml
apiVersion: config.openshift.io/v1
kind: OAuth
metadata:
  name: cluster
spec:
  identityProviders:
  - name: LDAP Identity Management
    type: LDAP
    mappingMethod: claim
    ldap:
      attributes:
        email:
        - mail
        id:
        - dn
        name:
        - cn
        preferredUsername:
        - uid
      bindDN: uid=admin,cn=users,cn=accounts,dc=ocp4,dc=example,dc=com
      bindPassword:
        name: ldap-bindpassword
      ca:
        name: ldap-ca
      insecure: false
      url: ldap://idm.example.com/cn=users,cn=accounts,dc=ocp4,dc=example,dc=com?uid
```

```sh
oc create secret generic ldap-bindpassword -n openshift-config \
  --from-literal="bindPassword=${LDAP_ADMIN_PASSWORD}"
oc create configmap ldap-ca -n openshift-config \
  --from-file=ca.crt=ca.crt
```

### Kubeadmin

The virtual user `kubeadmin` is automatically created with the role `cluster-admin`. `kubeadmin` authenticates with its password or X509 certificate. Give the cluster-admin role to another user before deleting `kubeadmin`.

```sh
# create ClusterRoleBinding for cluster-admin user
oc adm policy add-cluster-role-to-user cluster-admin alice \
  --rolebinding-name=cluster-admin-alice

# create cluster-admin group
oc adm groups new cluster-administrators
oc adm groups add-users cluster-administrators alice bob
# create ClusterRoleBinding for cluster-admin group
oc adm policy add-cluster-role-to-group cluster-admin cluster-administrators \
  --rolebinding-name=cluster-administrators

# remove kubeadmin
oc delete secret kubeadmin -n kube-system
```

Recreate the `kubeadmin` user's password with the same hash encryption (`$2a$10$xxx...` bcrypt with cost 10). The kubeadmin password must be at least 23 characters long.

```sh
# encrypt password without username
P="$(htpasswd -b -n -B -C 10 '' fDdBC-bfEdc-Afaee-caBEb)"
P=${P#:} # remove ':' prefix
oc set data secret/kubeadmin -n kube-system --from-literal kubeadmin="${P}"

# if there's an error check authentication logs
oc logs deployment/oauth-openshift -n openshift-authentication | grep kubeadmin
```

### Client certificates

A X.509 client certificate can be used to authenticate against the API server before the certificate expires. It can't be revoked.

```yaml
apiVersion: certificates.k8s.io/v1
kind: CertificateSigningRequest
metadata:
  name: myuser
spec:
  request: >-
    CSR_CONTENT_IN_BASE64
  signerName: kubernetes.io/kube-apiserver-client
  expirationSeconds: 86400 # requested duration of certificate validity
  usages:
  - client auth # required value
```

Generate a certificate signing request where `CN` is the user's name and `O` is the user's group. The user will be in the specified groups even the if `Group` resources don't list the user.

```sh
openssl genrsa -out myuser.key 4096
openssl req -new -key myuser.key -subj "/CN=myuser/O=users/O=test" -out myuser.csr
openssl req -noout -text -in myuser.csr # check csr
cat myuser.csr | base64 -w0 # CSR_CONTENT_IN_BASE64

# create the CertificateSigningRequest
oc create -f certificatesigningrequests-myuser.yaml
oc get certificatesigningrequests myuser
# approve CSR
oc adm certificate approve myuser
# export signed certificate
oc get certificatesigningrequests myuser -o jsonpath='{.status.certificate}' | base64 -d > myuser.crt

touch kubeconfig # file for storing context configuration

# create a user entry in kubeconfig
oc config set-credentials myuser --kubeconfig=kubeconfig \
  --client-key=myuser.key --client-certificate=myuser.crt --embed-certs

# create a cluster entry with API CA certificate in kubeconfig
openssl s_client -showcerts -connect api.DOMAIN:6443 </dev/null \
  | sed -n '/BEGIN CERTIFICATE/,/END CERTIFICATE/p' > ca.crt
oc config set-cluster mycluster --kubeconfig=kubeconfig \
  --server=https://api.DOMAIN:6443 --certificate-authority=ca.crt --embed-certs

# create a context entry in kubeconfig
oc config set-context mycontext --kubeconfig=kubeconfig \
  --cluster=mycluster --user=myuser --namespace=default

oc config use-context mycontext --kubeconfig=kubeconfig
oc whoami --kubeconfig=kubeconfig # myuser
```

```sh
# create an oc alias to use another kubeconfig
. <(echo "function oc
{
  /usr/local/bin/oc --kubeconfig=\"${PWD}/kubeconfig\" \${@}
}")
type oc
oc whoami # myuser
unset -f oc
```

### Service account token

A pod can get an automatic token for the service account mounted to `/var/run/secrets/kubernetes.io/serviceaccount/token`. This token is automatically regenerated by the kubelet before it expires.

```yaml
apiVersion: v1
kind: ServiceAccount
metadata:
  name: example
  namespace: example
automountServiceAccountToken: true
---
apiVersion: v1
kind: Pod
metadata:
  name: example
spec:
  serviceAccount: example
  serviceAccountName: example
  # automatically mount a rotated service account token
  automountServiceAccountToken: true
```

A service account token that doesn't expire can be created using a `Secret`.

```yaml
apiVersion: v1
kind: Secret
type: kubernetes.io/service-account-token
metadata:
  name: example-token
  namespace: example
  annotations:
    kubernetes.io/service-account.name: example
# secret.data is automatically populated with ca.crt, namespace, service-ca.crt, token
```

```sh
# get token
TOKEN="$(oc extract secret/example-token --keys=token --to=-)"
# log in as system:serviceaccount:example:example
oc login --token "${TOKEN}" api.DOMAIN:6443
```

https://documentation.commvault.com/2023e/essential/152653_post_change_kubernetes_cluster_service_account_and_service_account_token_rest_api_operation.html

```json
{
    "prop": {
        "appId": {
            "clientName": "{{kubernetesClientName}}",
            "instanceId": {{instanceId}}
        },
        "virtualServerInfo": {
            "hostName": "{{api-server-endpoint}}",
            "vendor": "KUBERNETES",
            "k8s": {
                "endpointurl": "{{api-server-endpoint}}",
                "secretName": "{{new-service-account}}",
                "secretKey": "{{token-value}}",
                "secretType": "ServiceAccount"
            }
        }
    }
}
```

### REST API

- External API: `$(oc whoami --show-server)/api/v1`
- Internal API:
  - `https://kubernetes.default.svc.cluster.local/api/v1`
  - `https://openshift.default.svc.cluster.local/api/v1`

Automatically mounted files in pods at `/var/run/secrets/kubernetes.io/serviceaccount`: `ca.crt`, `namespace`, `service-ca.crt`, `token`.

```sh
# get endpoints
oc get --raw /
oc get --raw /apis | jq . | less
oc get --raw /apis/user.openshift.io/v1 | jq . | less
oc get --raw /apis/user.openshift.io/v1/users/~ | jq . # get self

# get API swagger
oc get --raw /openapi/v2 > swagger.json

oc get --raw /version
oc get --raw /api/v1/namespaces | jq .

oc exec mypod -- \
sh -c 'curl -sS "https://kubernetes.default.svc.cluster.local/api/v1" \
  -H "Authorization: Bearer $(cat /var/run/secrets/kubernetes.io/serviceaccount/token)" \
  -H "Accept: application/yaml" \
  --cacert /var/run/secrets/kubernetes.io/serviceaccount/ca.crt'

# add cluster role for access to read all resources
oc adm policy add-cluster-role-to-user cluster-reader -z myserviceaccount

# increase log level to 6 to show corresponding HTTP request line
oc get pod --loglevel 6
# increase log level to 9 to show both request and response body
oc create cm example  --loglevel 9
```

If the API doesn't have a certificate signed by a trusted certificate authority, then use `curl --cacert CA_FILE` or `-k / --insecure`. The entire trust chain should be included.

> If the API server certificate hasn't been replaced, the default certificate is signed by `kube-apiserver-lb-signer`.

```sh
# get the API certificate bundle
openssl s_client -showcerts -connect api.DOMAIN:6443 </dev/null \
  | sed -n '/BEGIN CERTIFICATE/,/END CERTIFICATE/p' > ca.pem

# split the API certificate bundle to inspect each part in chain
T=$(mktemp -d)
csplit -s -z -f ${T}/crt- ca.pem '/-----BEGIN CERTIFICATE-----/' '{*}'
for CERT in ${T}/crt-*
do
  openssl x509 -in "${CERT}" -noout -subject -issuer -startdate -enddate -fingerprint -ext subjectAltName
done

# specify trusted chain
curl --cacert ca.pem $(oc whoami --show-server)/api/v1
```

#### Get request token with curl

Depending on the identity provider, a token can be fetched with curl using basic authentication.

```sh
oc get oauthclient openshift-challenging-client

ROUTE=$(oc get route oauth-openshift -n openshift-authentication -o jsonpath='{.spec.host}')
curl -I --get "https://${ROUTE}/oauth/authorize" \
  --data-urlencode 'client_id=openshift-challenging-client' \
  --data-urlencode 'response_type=token' \
  --user "${USER}:${PASSWORD}" \
  --write-out '%header{Location}' \
  | grep -Po '(?<=access_token=)[^&]+(?=&|$)' # extract token from url parameter in Location header
```

## Role-based access control (RBAC)

Some default roles for OpenShift are:

| `ClusterRole` | Description |
|:-----|:------------|
| `cluster-admin` | Superuser access to all cluster resources. |
| `cluster-status` | Get cluster status information. |
| `cluster-reader` | Get cluster resources. |
| `self-provisioner` | Can create new projects with project requests (`oc new-project`). |
| `admin` | Manage all resources in namespace including `RoleBindings`. |
| `edit` | Create, update, and delete application resources in the namespace. Doesn't include for example `LimitRange`, `ResourceQuota`, or `RoleBinding`. |
| `view` | Can view but not edit resources in namespace, excluding `Secrets`. |
| `basic-user` | Read access to the namespace. |

> Service account usernames are: `system:serviceaccount:NAMESPACE:NAME`.

> Service account groups are: `system:serviceaccounts:NAMESPACE`.

> A `ClusterRole` for a `SecurityContextConstraint` is automatically named: `system:openshift:scc:NAME`.

```sh
# list who can perform the specified action on a resource
oc adm policy who-can VERB RESOURCE

# check if the user can read pod logs
oc auth can-i get pods --subresource=log --as system:serviceaccount:example:example-sa

# list users with a specific role
oc get clusterrolebindings,rolebindings --all-namespaces -o json \
  | jq '.items[] | select(.roleRef.name=="registry-viewer") | .subjects'

# create clusterrolebinding
oc adm policy add-cluster-role-to-user ROLE-NAME USERNAME --rolebinding-name BINDING-NAME
# create rolebinding
oc adm policy add-role-to-user ROLE-NAME USERNAME -n NAMESPACE --rolebinding-name BINDING-NAME
# create rolebinding
oc policy add-role-to-user ROLE-NAME USERNAME -n NAMESPACE  --rolebinding-name BINDING-NAME

# remove users from any namespaced rolebindings
oc adm policy remove-user USER... -n NAMESPACE
# remove groups from any namespaced rolebindings
oc adm policy remove-group GROUP... -n NAMESPACE
```

```sh
# create a clusterrole
oc create clusterrole worker-0-reader \
  --verb=get,watch --resource=nodes,nodes/metrics,nodes/spec,nodes/stats --resource-name=worker-0

# create a role
oc create role pod-reader -n NAMESPACE \
  --verb=get,list,watch --resource=pods,pods/status,pods/logs
```

### Security context constraints

OpenShift-provided SCCs:

| SCC | Description |
|:----|:-------------------------------|
| `restricted` | Denies access to all host features and requires pods to be run with a UID, and SELinux context that are allocated to the namespace. |
| `restricted-v2` | Like `restricted`, but requires dropping ALL capabilities, doesn't allow privilege escalation binaries, and defaults the seccomp profile to runtime/default if unset. |
| `anyuid` | Like `restricted`, but pod can run as any user ID available in the container. |
| `nonroot` | Like `restricted`, but pod can run as any non-root user ID available in the container. |
| `nonroot-v2` | Like `restricted-v2`, but pod can run as any non-root user ID available in the container. |
| `hostaccess` | Access to all host namespaces, file systems, and PIDS. |
| `hostmount-anyuid` | Like `restricted`, but allows host mounts and running as any UID. Used by the persistent volume recycler. |
| `hostnetwork` | Allows using host networking and host ports. |
| `hostnetwork-v2` | Like `hostnetwork`, but requires dropping ALL capabilities, doesn't allow privilege escalation binaries, and defaults the seccomp profile to runtime/default if unset. |
| `node-exporter` | Used for the Prometheus node exporter. |
| `privileged` | Access to all privileged and host features and the ability to run as any user, any group, any `fsGroup`, and with any SELinux context. |

```sh
oc get scc -o name

# output YAML for adding a SCC to users or service account
oc adm policy add-scc-to-user SCC (USER... | -z SERVICEACCOUNT)
oc adm policy remove-scc-from-user SCC USER...

oc adm policy add-scc-to-user privileged system:serviceaccount:example:example \
  --dry-run=client -o yaml # show ClusterRole+ClusterRolebinding

# show users and groups with permission to use each SCC
oc get scc -o jsonpath='{range .items[*]}
SCC: {.metadata.name}
Groups: {.groups}
Users: {.users}
{end}'

# show SCC annotation openshift.io/scc=<scc>
oc get pods -o jsonpath='{range .items[*]}{.metadata.name} {.metadata.annotations.openshift\.io/scc}{"\n"}{end}'
# list privileged pods (except build pods)
oc get pods --selector '!openshift.io/build.name' \
  -o jsonpath='{range .items[?(@.metadata.annotations.openshift\.io/scc == "privileged")]}{.metadata.name}{"\n"}{end}'

# show capability relevant state
oc exec POD -- capsh --print
oc exec POD -- ps -o seccomp
oc exec POD -- cat /proc/$$/status | grep -i seccomp
  # Seccomp: 0=SECCOMP_MODE_DISABLED, 1=SECCOMP_MODE_STRICT, 2=SECCOMP_MODE_FILTER

# Linux capabilities documentation
man 7 capabilities
```

> Containers run by CRI-O defaults to having capabilities: `CHOWN`, `DAC_OVERRIDE`, `FOWNER`, `FSETID`, `KILL`, `NET_BIND_SERVICE`, `SETFCAP`, `SETGID`, `SETPCAP`, `SETUID`. Podman additionally adds `SYS_CHROOT`. Docker additionally adds: `AUDIT_WRITE`, `MKNOD`, `NET_RAW`, `CHROOT`.

Example SCC needed to build images with `podman`/`buildah` inside a pod:

```yaml
apiVersion: security.openshift.io/v1
kind: SecurityContextConstraints
metadata:
  name: nonrootbuilder
  annotations:
    kubernetes.io/description: >-
      nonrootbuilder provides all features of the nonroot
      SCC but allows users to run with any non-root UID and multiple namespaces for
      nonroot building of images with podman and buildah
allowHostPorts: false
allowPrivilegeEscalation: true
allowPrivilegedContainer: false
allowedCapabilities: null
defaultAddCapabilities: null
fsGroup:
  type: RunAsAny
groups: []
priority: 5 # higher value is higher priority
readOnlyRootFilesystem: false
requiredDropCapabilities:
- KILL
- MKNOD
runAsUser:
  type: MustRunAs
  uid: 1000
seLinuxContext:
  type: MustRunAs
supplementalGroups:
  type: RunAsAny
users: []
volumes:
- configMap
- downwardAPI
- emptyDir
- persistentVolumeClaim
- projected
- secret
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
spec:
  serviceAccount: example
  serviceAccountName: example
  securityContext:
    seLinuxOptions: # SELinux context
      level: null # s0:c26,c20
    seccompProfile:
      type: RuntimeDefault
    runAsNonRoot: true
    runAsUser: 1001 # UID
    runAsGroup: 1001 # primary GID
    supplementalGroups: # secondary groups
    - 0
    fsGroup: 1001 # set group owner on volumes
    sysctl: # namespaced sysctls
    - name: net.core.somaxconn # max. connection queue for listen()
      value: '1024'
  containers:
  - securityContext:
      privileged: false
      allowPrivilegeEscalation: false
      capabilities:
        drop:
        - ALL
      privileged: false
      runAsNonRoot: true
      seccompProfile:
        type: RuntimeDefault
```

```sh
# check if user in group can create a pod
oc adm policy scc-subject-review -u USERNAME -g GROUP -f pod.yaml

# check if default service account can admit a pod specified in resource.yaml
oc adm policy scc-review -z system:serviceaccount:NAMESPACE:default -f pod.yaml

# set serviceaccount for deployment
oc set serviceaccount deployment/NAME SERVICEACCOUNT

# show prevailing capability and related state
oc exec POD capsh --print
```

### Project self-provisioning template

```sh
# check the ClusterRoleBinding for self-provisioner
oc get clusterrolebinding self-provisioners -o wide
oc describe clusterrole self-provisioner

# if the ClusterRoleBinding has been deleted, recreate it with:
oc adm policy add-cluster-role-to-group self-provisioner system:authenticated:oauth \
  --rolebinding-name self-provisioners
# and annotate to refresh its default values when oauthserver resstarts
oc annotate clusterrolebinding self-provisioners rbac.authorization.kubernetes.io/autoupdate=true
```

To remove self-provisioning of projects, either delete the cluster role binding that grants `self-provisioner` or change its subjects.

```sh
# delete ClusterRoleBinding/self-provisioners
oc adm policy remove-cluster-role-from-group self-provisioner system:authenticated:oauth
# or
oc delete clusterrolebinding self-provisioners

# if the clusterrolebinding should remain modified add annotation to prevent reconciliation
oc annotate clusterrolebinding self-provisioners rbac.authorization.kubernetes.io/autoupdate=false --overwrite
oc patch clusterrolebinding self-provisioners --type=json --patch '[{"op": "remove", "path": "/subjects"}]'

# update the message shown when sending a project request after it's disabled.
oc patch project.config.openshift.io cluster --type=merge --patch \
  '{"spec": {
    "projectRequestTemplate": null,
    "projectRequestMessage": "Self-provisioning of projects is disabled. Creating projects requires cluster-admin."
    }}'
```

```sh
# generate project request template, edit it, create it in openshift-config
oc adm create-bootstrap-project-template -o yaml > project-template.yaml
oc apply -f project-template.yaml -n openshift-config
# specify template name in configuration
oc patch project.config.openshift.io cluster --type=merge --patch \
  '{"spec": {"projectRequestTemplate": {"name": "project-request"}}}'

# wait for pods to be replaced
watch oc get pods -n openshift-apiserver

# create project request
oc new-project NAME --as=user1 --as-group=system:authenticated --as-group=system:authenticated:oauth
oc new-project NAME
```

Create namespace as administrator without template:

```sh
oc adm new-project NAME --admin=user1 --node-selector='' \
  --description='User project' --display-name='NAME'
```

### Role aggregation rule

A cluster role with aggregation rules is automatically populated with the RBAC rules of other cluster roles labeled by the aggregation selector.

```sh
oc create clusterrole example --aggregation-rule='rbac.example.com/aggregate-to-example=true'
oc label clusterrole example-rules-0 rbac.example.com/aggregate-to-example=true
oc label clusterrole example-rules-1 rbac.example.com/aggregate-to-example=true
```

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: example
aggregationRule:
  clusterRoleSelectors:
  - matchLabels:
      rbac.example.com/aggregate-to-example: 'true'
# rules are automatically combined with clusterroles labeled rbac.example.com/aggregate-to-example=true
rules:
- ...
```

```sh
# list cluster roles that use aggregation rule
oc get clusterrole \
  -o jsonpath='{range .items[?(@.aggregationRule)]}{.metadata.name}{"\n"}{end}'

# list cluster roles that are aggregated into admin cluster role
oc get clusterrole --selector rbac.authorization.k8s.io/aggregate-to-admin=true
```

### Grant permission to escalate permissions

A user may only modify RBAC permissions in `Roles`/`ClusterRoles` and `RoleBindings`/`ClusterRoleBindings` resources if the user has the permissions it's trying to set. Unless they have the permissions `escalate` and `bind` on roles, which allows users to grant permissions they do not themselves have.

```yaml
apiVersion: rbac.authorization.k8s.io/v1
kind: ClusterRole
metadata:
  name: permission-escalation
rules:
- apiGroups:
  - rbac.authorization.k8s.io
  resources:
  - roles
  - clusterroles
  verbs:
  - escalate
  - bind
```

A user can be granted the permission to impersonate `system:admin` with the cluster role `sudoer`.

```sh
oc create clusterrolebinding myuser-sudoer --clusterrole=sudoer --user=myuser
oc whoami --as system:admin
oc create clusterrolebinding mygroup-sudoer --clusterrole=sudoer --user=mygroup
oc whoami --as system:admin --as-group mygroup
```

## Integrated image registry

```sh
oc get cluster-operator image-registry
oc edit configs.imageregistry.operator.openshift.io cluster
oc edit image.config.openshift.io cluster
oc get pods -n openshift-image-registry
```

```yaml
apiVersion: imageregistry.operator.openshift.io/v1
kind: Config
metadata:
  name: cluster
spec:
  defaultRoute: true # create public "default-route" in namespace openshift-image-registry
  httpSecret: '...'
  logLevel: Normal
  managementState: Managed
  observedConfig: null
  operatorLogLevel: Normal
  proxy: {}
  readOnly: false
  replicas: 1
  requests:
    read:
      maxWaitInQueue: 0s
    write:
      maxWaitInQueue: 0s
  rolloutStrategy: Recreate
  storage:
    managementState: Unmanaged
    pvc:
      claim: image-registry-storage-block # default PVC in namespace openshift-image-registry
    # --- or ---
    s3:
      bucket: image-registry-us-east-1-ff2c0c858f6b44d0a272c64b1515344a-1234
      region: us-east-1
  unsupportedConfigOverrides: null
  nodeSelector:
    node-role.kubernetes.io/infra: ""
  tolerations:
  - effect: NoSchedule
    key: node-role.kubernetes.io/infra
    operator: Exists
```

```yaml
apiVersion: config.openshift.io/v1
kind: Image
metadata:
  name: cluster
spec:
  externalRegistryHostnames: # hostnames for the default external image registry
    # first item is used in ImageStream.status.publicDockerImageRepository
  - default-route-openshift-image-registry.apps.DOMAIN
  - ...
  allowedRegistriesForImport: # restricts oc-import for normal users
  - mirror.example.com:5000
  registrySources: # container runtime configuration
    # --- either ---
    allowedRegistries:
    - mirror.example.com:5000
    # --- or ---
    blockedRegistries:
    - docker.io
    - registry-1.dockerio
    # ---
    containerRuntimeSearchRegistries: # for CRI-O, not builds or imagestream imports
    - mirror.example.com:5000
    insecureRegistries: []
```

Automatic image pruning is configured in `ImagePruner/cluster`.

```yaml
apiVersion: imageregistry.operator.openshift.io/v1
kind: ImagePruner
metadata:
  name: cluster
spec:
  schedule: 0 0 * * * # 00:00
  suspend: false
  keepTagRevisions: 3 # revisions per tag to keep
  keepYoungerThanDuration: 60m
  successfulJobsHistoryLimit: 3
  failedJobsHistoryLimit: 3
  ignoreInvalidImageReferences: true

  logLevel: Normal
  resources: {}
  affinity: {}
  nodeSelector: {}
  tolerations: []
```

```sh
# manually prune images
oc adm prune images --keep-tag-revisions=5 --keep-younger-than=24h --confirm=true
# redeploy the registry to clear the integrated registry metadata cache
oc rollout restart deployment/image-registry -n openshift-image-registry
```

### Hard prune orphaned image blobs

Orphaned blobs are not referenced by the cluster's etcd and `oc-prune-images` doesn't act on them.

```sh
# set registry to read-only
oc patch config.imageregistry.operator.openshift.io/cluster \
  --patch '{"spec":{"readOnly":true}}' --type=merge

# add system:image-pruner to the service account of the image registry
SA=$(oc get deployment/image-registry -n openshift-image-registry \
  -o jsonpath='{.spec.template.spec.serviceAccountName}')
oc adm policy add-cluster-role-to-user -n openshift-image-registry \
  system:image-pruner -z ${SA} --rolebinding-name image-pruner-image-registry

# dry run hard prune
oc exec deploy/image-registry -n openshift-image-registry \
  -- /bin/sh -c 'REGISTRY_LOG_LEVEL=info /usr/bin/dockerregistry -prune=check'

# perform hard prune
oc exec deploy/image-registry -n openshift-image-registry \
  -- /bin/sh -c '/usr/bin/dockerregistry -prune=delete'

# unset read-only on registry
oc patch config.imageregistry.operator.openshift.io/cluster \
  --patch '{"spec":{"readOnly":false}}' --type=merge

# remove system:image-pruner cluster role binding
oc delete clusterrole image-pruner-image-registry
```

### Add additional trusted registry certificates for builds

```yaml
apiVersion: config.openshift.io/v1
kind: Image
metadata:
  name: cluster
spec:
  additionalTrustedCA: # additional trusted certificates when pushing/pulling images
    name: additional-trusted-ca # ConfigMap in namespace openshift-config
  registrySources:
    insecureRegistries:
    - example.com..5000
```

Either add registry hostname to `insecureRegistries` or add its certificate.

```sh
REGISTRY='example.com..5000' # format is hostname[..port]
# add insecure trust of a registry
oc patch image.config.openshift.io/cluster --type=merge \
  --patch '{"spec":{"registrySources":{"insecureRegistries":["'${REGISTRY}'"]}}}'

# add certificate authorities (CA)
oc create configmap additional-trusted-ca -n openshift-config \
oc set data configmap/additional-trusted-ca -n openshift-config \
  --from-file="example1.com=ca.crt" \
  --from-file="example2.com..5000=ca.crt"

# set configmap name in Image configuration
oc patch image.config.openshift.io/cluster --type=merge \
  --patch '{"spec":{"additionalTrustedCA":{"name":"additional-trusted-ca"}}}'
```

### Enable public registry route

```sh
# enable public registry route
oc patch config.imageregistry cluster \
  --type merge --patch '{"spec":{"defaultRoute":true}}'

oc get route default-route -n openshift-image-registry

oc registry info --public # show public route
oc registry info --internal # show internal service

oc get image.config.openshift.io/cluster \
  -o jsonpath='
  INTERNAL: {.status.internalRegistryHostname}
  EXTERNAL: {.status.externalRegistryHostnames}
'
```

Using public route with Podman:

```sh
ROUTE="$(oc registry info --public)"
# download the *.apps certificate (unless --tls-verify=false)
openssl s_client -showcerts -connect "${ROUTE}:443" < /dev/null \
  | sed -n '/BEGIN CERTIFICATE/,/END CERTIFICATE/p' > ca.crt

# user configuration
mkdir -p "${HOME}/.config/containers/certs.d/${ROUTE}"
mv ca.crt "${HOME}/.config/containers/certs.d/${ROUTE}/"

# system configuration
mkdir -p "/etc/containers/certs.d/${ROUTE}"
mv ca.crt "/etc/containers/certs.d/${ROUTE}/"

# add role to service account within a namespace
oc create serviceaccount registry-sa -n example
oc policy add-role-to-user registry-editor -z registry-sa -n example
podman login "${ROUTE}" --username "$(oc whoami)" \
  --password "$(oc serviceaccounts get-token registry-sa -n example)"

podman push myimage:123 "${ROUTE}/example/myimage:latest"
skopeo inspect "docker://${ROUTE}/example/myimage:latest"
oc describe imagestreamtag myimage:latest -n example  # imagestreamtag was created
skopeo copy "docker://${ROUTE}/example/myimage:latest" containers-storage:localhost/myimage:latest
```

### Image streams

```sh
# import an image every 15 minutes
oc import-image IMAGESTREAM:TAG --from=IMAGE --confirm --scheduled
oc import-image IMAGESTREAM:TAG # re-import tag
oc import-image IMAGESTREAM # re-import all tags

# create another ImageStreamTag (oc tag SOURCE DESTINATION...)
oc tag --source=docker REGISTRY/REPONAME:TAG2 NAMESPACE/IMAGESTREAM:TAG2 --reference-policy=local
oc tag NAMESPACE1/IMAGESTREAM:TAG NAMESPACE2/IMAGESTREAM:TAG --alias # reference another ImageStreamTag
oc tag NAMESPACE1/IMAGESTREAM:TAG NAMESPACE2/IMAGESTREAM:TAG # reference ImageStreamImage
oc tag NAMESPACE/IMAGESTREAM:TAG --delete # delete tag

oc set image-lookup IMAGESTREAM:TAG # set lookupPolicy.local to true
oc set image-lookup --enabled=false IMAGESTREAM:TAG # set lookupPolicy.local to false
oc set image-lookup # list lookup policies for each imagestream in namespace
```

```yaml
apiVersion: v1
kind: ImageStream
metadata:
  name: ubi
  namespace: example
spec:
  lookupPolicy:
    # enable Kubernetes resources in the same namespace to reference imagestreamtags by name
    local: true
  tags:
  - name: "9.2"
    from:
      kind: DockerImage
      name: registry.access.redhat.com/ubi9:9.2
    annotations:
      iconClass: icon-openshift
      openshift.io/display-name: Red Hat Universal Base Image 9
      openshift.io/provider-display-name: Red Hat, Inc.
      tags: base # for Console developer catalog categories
    importPolicy:
      scheduled: true
    referencePolicy:
      type: Local
  - name: latest
    from: # points to other tag (alias)
      kind: ImageStreamTag
      name: "9.2"
      namespace: example
    importPolicy: {}
    referencePolicy:
      type: Source

```

```sh
# re-deploy pods when imagestreamtag updates with a new SHA
oc set triggers deployment/DEPLOYMENT --from-image NAMESPACE/IMAGESTREAM:TAG --containers CONTAINER

oc set triggers deployment/DEPLOYMENT --manual  # pause triggers
oc set triggers deployment/DEPLOYMENT --auto    # resume triggers
oc set triggers deployment/DEPLOYMENT --from-image IMAGESTREAM:TAG --remove  # remove trigger
```

```yaml
apiVersion: apps/v1
kind: Deployment
metadata:
  annotations:
    image.openshift.io/triggers: >-
      [
        {
          "from": {
            "kind":"ImageStreamTag",
            "name":"NAME:TAG"
          },
          "fieldPath":"spec.template.spec.containers[?(@.name==\"CONTAINER\")].image",
          "paused": true
        }
      ]
```

### Image pull secrets

Get images from a Red Hat container registry with a registry service account token created at [https://access.redhat.com/terms-based-registry/](https://access.redhat.com/terms-based-registry).

```json
{
  "auths": {
    "registry.redhat.io": {
      "auth": "<base64>"
    },
    "registry.connect.redhat.com": {
      "auth": "<base64>"
    }
  }
}
```

```sh
# .dockerconfigjson format (kubernetes.io/dockerconfigjson)
oc create secret docker-registry redhat --from-file .dockerconfigjson=auth.json
oc create secret docker-registry redhat --docker-username '1234567|name' --docker-password 'abc'

# old .dockercfg format
oc create secret generic redhat --type=kubernetes.io/dockercfg \
  --from-file=.dockercfg=dockercfg.json

# create imagestream from registry image automatically uses docker secret in namespace
oc import-image NAMESPACE/IMAGESTREAM:TAG --from=registry.redhat.io/REPONAME:TAG --confirm

# --- either ---
# let service account automatically use docker-secret for pods
oc secrets link myserviceaccount redhat --for=pull
oc set serviceaccount myserviceaccount deployment/mydeploy
# --- or ---
# specify pull secret on pod
oc run mypod --image-pull-policy=Always --restart Never \
  --image registry.redhat.io/REPONAME:TAG \
  --overrides='{"spec":{"imagePullSecrets":[{"name":"redhat"}]}}'

# grant serviceaccount imagestream access to other namespace
oc policy add-role-to-user -n NAMESPACE1 \
  image-puller system:serviceaccount:NAMESPACE2:SERVICEACCOUNT
```

## Network

```sh
oc get clusteroperator network
# view cluster SDN configuration
oc edit Network.config.openshift.io cluster
oc get network.operator.openshift.io cluster -o yaml # created based on Network.config/cluster
```

```yaml
apiVersion: operator.openshift.io/v1
kind: Network
metadata:
  name: cluster
spec:
  clusterNetwork: 
  - cidr: 10.128.0.0/14
    hostPrefix: 23
  serviceNetwork: 
  - 172.30.0.0/16
  networkType: OVNKubernetes # or OpenShiftSDN or Kuryr
```

### Ingress controller

`ClusterOperator/ingress` has a default `IngressController` in namespace `openshift-ingress-operator` that serves all routes. Router pods are in the namespace `openshift-ingress` and run on worker nodes.

```sh
oc get clusteroperator ingress
oc edit ingress.config.openshift.io/cluster
oc get ingresscontroller -n openshift-ingress-operator
```

```yaml
apiVersion: config.openshift.io/v1
kind: Ingress
metadata:
  name: cluster
spec:
  domain: apps.DOMAIN # default domain; cannot be modified after installation
  appsDomain: abc.DOMAIN # (optional) default domain for user-created routes (instead of "apps")
```

```yaml
apiVersion: operator.openshift.io/v1
kind: IngressController
metadata:
  name: default
  namespace: openshift-ingress-operator
spec:
  domain: apps.DOMAIN # defaults to ingress.config.openshift.io/cluster .spec.domain
  defaultCertificate:
    name: custom-apps-certificate # TLS Secret in namespace openshift-ingress
  clientTLS:
    clientCA:
      name: ""
    clientCertificatePolicy: ""
  httpEmptyRequestsPolicy: Respond
  httpErrorCodePages:
    name: ""
  replicas: 2
  nodePlacement:
    nodeSelector:
      matchLabels:
        node-role.kubernetes.io/infra: ""
    tolerations:
    - effect: NoSchedule
      key: infra
      value: reserved
    - effect: NoExecute
      key: infra
      value: reserved
    - effect: NoSchedule
      key: node.kubernetes.io/memory-pressure
      operator: Exists
```

Create a custom certificate for application routes (`*.apps.DOMAIN`). The certificate should be for `CN=*.apps.DOMAIN` and `subjectAltName=DNS:*.apps.DOMAIN`. Generate a certificate signing request like below, then get it signed by certificate authority.

```sh
# generate private key
openssl genrsa -out tls.key 2048
# check key
openssl rsa -in tls.key -text -noout

# Create an OpenSSL configuration file for creating the certificate signing request
cat <<<'
HOME = .

[req]
default_bits       = 4096
default_md         = sha512
string_mask        = utf8only
distinguished_name = req_distinguished_name

[req_distinguished_name]
countryName                     = Country Name (2 letter code)
countryName_default             = .
countryName_min                 = 2
countryName_max                 = 2
stateOrProvinceName             = State or Province Name (full name)
stateOrProvinceName_default     = .
localityName                    = Locality Name (eg, city)
localityName_default            = .
0.organizationName              = Organization Name (eg, company)
0.organizationName_default      = .
organizationalUnitName          = Organizational Unit (eg, division)
organizationalUnitName_default  = .
commonName                      = Common Name (e.g. server FQDN or YOUR name)
emailAddress                    = Email Address
emailAddress_max                = 64

[req_apps_ext]
# add intended usages for CA to copy or change
basicConstraints = critical, CA:FALSE
keyUsage         = critical, digitalSignature, keyEncipherment
extendedKeyUsage = serverAuth
subjectAltName   = @apps_alt_names

[apps_alt_names]
DNS = *.apps.DOMAIN
' > req.cnf

# generate certificate signing request with inline ad hoc config
openssl req -new -sha256 \
  -key tls.key \
  -subj "/CN=*.apps.DOMAIN" \
  -config req.cnf -reqexts req_apps_ext \
  -out tls.csr
# check csr
openssl req -noout -text -in tls.csr
```

After getting the signed certificate from a certificate authority, create the TLS secret in namespace `openshift-ingress` and set its name on the ingress controller resource. Bundle the certificate into the full chain.

```sh
cat tls.crt ca.crt > fullchain.crt # full certificate chain
oc create secret tls custom-apps-certificate -n openshift-ingress \
  --cert=fullchain.crt --key=tls.key
oc patch ingresscontroller/default \
  --patch='{"spec":{"defaultCertificate":{"name": "custom-apps-certificate"}}}'
```

The certificate set on `IngressController.spec.defaultCertificate.name` is the default certificate used for edge and reencrypt routes.

> If a custom default certificate is not specified, then the default will be a placeholder TLS secret in namespace `openshift-ingress` named `router-certs-<ingresscontroller-name>` (i.e. `router-certs-default`) that is signed by `secret/router-ca` in namespace `openshift-ingress-operator`. The ingress operator doesn't rotate its own signing certificate nor the default certificates that it generates -- and these placeholder certificates expire after 2 years.

#### Routes and services

Services:

```yaml
# oc create service clusterip mysvc --tcp=8443:8443
# set selector service/mysvc deployment=mydeploy
apiVersion: v1
kind: Service
metadata:
  name: mysvc
spec:
  type: ClusterIP
  ports:
  - name: 443-8443
    protocol: TCP
    port: 8443
    targetPort: 8443
  selector:
    deployment: mydeploy
```

```yaml
# Headless clusterip; creates a SRV record that resolves to all the selected pods
# oc create svc clusterip headless-service --tcp=8443:8443 --clusterip=None
# set selector service/mysvc statefulset=mysts
apiVersion: v1
kind: Service
metadata:
  name: headless-service
spec:
  type: ClusterIP
  clusterIP: None
  ports:
  - name: 8443-8443
    port: 8443
    protocol: TCP
    targetPort: 8443
  selector:
    statefulset: mysts
```

```yaml
# External name; the control plane creates a CNAME record for external name
# oc create svc externalname mysvc --external-name abc123.infra
# set selector service/mysvc deployment=mydeploy
apiVersion: v1
kind: Service
metadata:
  name: mysvc
spec:
  type: ExternalName
  externalName: abc123.infra # https://mysvc:443 goes to https://abc123.infra:443
  selector:
    deployment: mydeploy
```

```yaml
# Node port; opens a port 30000-32767 (by default) on all nodes.
apiVersion: v1
kind: Service
metadata:
  name: mysvc
spec:
  type: NodePort
  ports:
  - name: 8443-8443
    nodePort: 30327 # random on range if not specified
    port: 8443
    protocol: TCP
    targetPort: 8443
  sessionAffinity: None
```

```sh
# check that selector matched pods and created Endpoints
oc describe service mysvc | grep Endpoints
oc get endpoints
```

```sh
# creating Routes
oc expose service/mysvc --port=8443
oc create route edge myroute --service=mysvc --port=8443
oc create route edge myroute --service=mysvc --port=8443 --cert=tls.crt --key=tls.key
oc create route reencrypt myroute --service=mysvc --port=8443 --dest-ca-cert=destca.crt
oc create route reencrypt myroute --service=mysvc --port=8443 --dest-ca-cert=destca.crt \
  --cert=tls.crt --key=tls.key
oc create route passthrough myroute --service=mysvc --port=8443

# extract route hostname
ROUTE="http://$(oc get route myroute --template='{{.spec.host}}'):80"

# show ingress domain for cluster (apps.DOMAIN)
oc get ingresses.config/cluster -o jsonpath='{.spec.domain}'

# redirect HTTP port 80 to HTTPS port 443 (Redirect or None)
oc patch route myroute -p '{"spec":{"tls": {"insecureEdgeTerminationPolicy": "Redirect"}}}'

# load balance two services as 4:1
oc set route-backends myroute mysvc1=4 mysvc2=1
```

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: example
  namespace: example
spec:
  tls:
    termination: edge
    insecureEdgeTerminationPolicy: Redirect # redirect HTTP requests to HTTPS
  port:
    targetPort: 8080 # Number or String (name of service port)
  path: null
  to: # primary service
    kind: Service
    name: svc-a
    weight: 1
  alternateBackends:
  - kind: Service
    name: svc-b
    weight: 1
```

> Reencrypt routes that forward to services with certificates issued by the internal service-ca doesn't need a destination CA certificate (`--dest-ca-cert`).

> TLS key files must not be password protected. Remove the passphrase with:
>
> ```sh
> openssl rsa -in encrypted-tls.key -out tls.key
> ```

> Ensure that container readiness and liveness probes use `scheme: HTTPS` instead of `HTTP` if service certificates were generated such that the containers now use HTTPS traffic.

Route annotations with the format `haproxy.router.openshift.io/KEY=VALUE` override the ingress controller's default options.

```sh
# set server-side timeout on route
oc annotate route myroute haproxy.router.openshift.io/timeout=2s
  # time units: us, ms, s, m, h, d

# set maximum number of connections allowed to a backing pod from a router
oc annotate route myroute haproxy.router.openshift.io/pod-concurrent-connections=100

# whitelist source IP addresses
oc annotate route myroute \
  haproxy.router.openshift.io/ip_whitelist='180.5.61.153 192.168.1.0/24 10.0.0.0/8'
  # max. 61 IP addresses or CIDR ranges

# replace request path that matches Route.spec.path with this value
oc annotate route myroute haproxy.router.openshift.io/rewrite-target='/'
  # this would remove request path prefix that matches Route.spec.path
```

`Ingress` resources will default to using `IngressClass/openshift-default` which generates `Routes`.

```yaml
# oc create ingress myingress-edge 
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myingress-edge
  annotations:
    route.openshift.io/termination: edge # generate edge route
spec:
  rules:
  - host: NAME.apps.example.com # hostname is required
    http:
      paths:
      - pathType: Prefix
        path: "/"
        backend:
          service:
            name: mysvc
            port:
              number: 8443
  tls:
  - {} # use the default certificate
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myingress-passthrough
  annotations:
    route.openshift.io/termination: passthrough # generate passthrough route
spec:
  rules:
  - host: NAME.apps.example.com # hostname is required
    http:
      paths:
      - pathType: ImplementationSpecific
        path: "" # empty
        backend:
          service:
            name: mysvc
            port:
              number: 8443
---
apiVersion: networking.k8s.io/v1
kind: Ingress
metadata:
  name: myingress-reencrypt
  annotations:
    route.openshift.io/termination: reencrypt
    route.openshift.io/destination-ca-certificate-secret: dest-ca-cert # tls.crt
spec:
  rules:
  - host: NAME.apps.example.com # hostname is required
    http:
      paths:
      - path: /
        pathType: Prefix
        backend:
          service:
            name: mysvc
            port:
              number: 8443
  tls:
  - {} # use the default certificate
  # --- or ---
  - hosts:
    - NAME.apps.example.com
    secretName: tls-certificate # tls.key and tls.crt
```

#### Service CA certificates

Generate a service CA certificate for a service's DNS (`<service>.<namespace>.svc[.cluster.local]`). The service CA operator manages automated rotation of certificates.

```sh
# generate service CA certificate into a tls secret
oc annotate service/mysvc service.beta.openshift.io/serving-cert-secret-name=mycert
oc describe secret/mycert # tls.key, tls.crt
oc extract secret/mycert --keys=tls.crt --to=- \
  | openssl x509 -noout -subject -issuer -ext subjectAltName -enddate

# manually rotate
oc delete secret/signing-key -n openshift-service-ca

# check end date oc service-ca siging certificate (automatically rotated)
oc extract secret/signing-key -n openshift-service-ca --keys=tls.crt --to=- \
  | openssl x509 -noout -enddate
```

#### Inject cluster CA bundle

```sh
# generate ConfigMap with cluster CA certificates
oc create configmap cluster-certs
oc label configmap cluster-certs config.openshift.io/inject-trusted-cabundle=true
oc extract configmap/cluster-certs --keys=ca-bundle.crt --to=-

# generate ConfigMap with service CA certificates
oc create configmap service-certs
oc annotate configmap service-certs service.beta.openshift.io/inject-cabundle=true
oc extract configmap/service-certs --keys=service-ca.crt --to=-
```

Mount to path: `/etc/pki/ca-trust/extracted/pem/FILE.pem`.

> The service CA certificate is self-signed for service-ca controller and it's needed to trust the certificates issued using the service annotation `service.beta.openshift.io/serving-cert-secret-name=<secret-name>`.

#### Ingress route sharding

More `IngressController` instances can be created to serve different routes based on selectors (a.k.a. "sharding").

```yaml
apiVersion: operator.openshift.io/v1
kind: IngressController
metadata:
  name: sharded
  namespace: openshift-ingress-operator
spec:
  domain: apps-sharded.DOMAIN
  nodePlacement:
    nodeSelector:
      matchLabels:
        node-role.kubernetes.io/worker: ""
  routeSelector:
    matchLabels: # pod selector
      type: sharded
  namespaceSelector:
    matchLabels:
      type: sharded
```

```sh
# exclude namespaces from default ingress controller
oc patch ingresscontroller/default -n openshift-ingress-operator --patch '
spec:
  namespaceSelector:
    matchExpressions:
    - key: type
      operator: NotIn
      values:
      - sharded'

# alternatively, add label expression on route selector
oc patch ingresscontroller/default -n openshift-ingress-operator \
  --type='merge' \
  --patch '{"spec":{"routeSelector":{"matchExpressions":[{"key":"type","operator":"NotIn","values":["sharded"]}]}}}'
```

Set `.spec.subdomain` to automatically get the correct ingress controller base domain.

```yaml
apiVersion: route.openshift.io/v1
kind: Route
metadata:
  name: test
  namespace: example # namespace becomes part of hostname
  labels:
    type: sharded
spec:
  subdomain: abc # becomes host: abc-example.DOMAIN
# ...
```

### Proxy

```sh
oc edit proxy cluster
```

```yaml
apiVersion: config.openshift.io/v1
kind: Proxy
metadata:
  name: cluster
spec:
  trustedCA: # add *.apps certificate to trust store for proxy
    name: custom-apps-certificate-ca # ConfigMap with ca-bundle.crt in namespace openshift-config
```

Create the certificate configmap for the proxy. Bundle the certificate into the full chain.

```sh
oc create configmap custom-apps-certificate-ca -n openshift-config \
  --from-file ca-bundle.crt=fullchain.crt
```

### DNS

The DNS operator creates the default cluster service network name `cluster.local`. Services' DNS names have the format `NAME.NAMESPACE.svc.cluster.local` and they get two kinds of records: "A records" that resolve to a service name and "SRV records".

```sh
oc get dns.config.openshift.io/cluster -o yaml
oc describe dns.operator/default
oc logs deployment/dns-operator -c dns-operator -n openshift-dns-operator

oc extract cm/dns-default -n openshift-dns --to=-
```

```yaml
apiVersion: config.openshift.io/v1
kind: DNS
metadata:
  name: cluster
spec:
  baseDomain: DOMAIN # example.com
```

```yaml
apiVersion: operator.openshift.io/v1
kind: DNS
metadata:
  name: default
spec:
  logLevel: Normal
  operatorLogLevel: Normal
  cache: # since 4.12
    positiveTTL: 1h 
    negativeTTL: 0.5h10m
  upstreamResolvers:
    policy: Sequential
    upstreams:
    - port: 53
      type: SystemResolvConf
    transportConfig: {}
  # placing DNS operator pods
  nodePlacement:
    nodeSelector:
      node-role.kubernetes.io/worker: ''
    tolerations:
     - effect: NoExecute
       key: dns-only
       operators: Equal
       value: 'yes'
```

```sh
# DNS query
dig -t SRV SERVICE.NAMESPACE.svc.cluster.local
nslookup SERVICE.NAMESPACE.svc.cluster.local
```

### Network policies

Allow incoming traffic to destination `d` from source `s`.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allowed-ingress-s
  namespace: d
spec:
  podSelector: {}
  ingress:
  - from:
    - namespaceSelector:
        matchLabels: # match source namespaces with these labels
          kubernetes.io/metadata.name: source
  policyTypes:
  - Ingress
```

Allow incoming traffic to destination `d` from OpenShift router-pods, apiserver-operator, user workload monitoring.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allow-from-openshift
  namespace: d
spec:
  podSelector: {}
  ingress:
  - from:
    - namespaceSelector:
        matchLabels:
          policy-group.network.openshift.io/ingress: ""
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: openshift-kube-apiserver-operator
      podSelector:
        matchLabels:
          app: kube-apiserver-operator
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: openshift-user-workload-monitoring
      podSelector:
        matchLabels:
          app.kubernetes.io/instance: user-workload
  policyTypes:
  - Ingress
```

Allow incoming traffic to destination `d` from the same namespace.

```yaml
kind: NetworkPolicy
apiVersion: networking.k8s.io/v1
metadata:
  name: allow-same-namespace
  namespace: d
spec:
  podSelector: {}
  ingress:
  - from:
    - podSelector: {}
```

Allow outgoing traffic from source `s` to destination `d`.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allowed-egress-d
  namespace: source
spec:
  podSelector: {}
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: d
  policyTypes:
  - Egress
```

Allow outgoing traffic from source `s` to OpenShift DNS.

```yaml
apiVersion: networking.k8s.io/v1
kind: NetworkPolicy
metadata:
  name: allowed-egress-dns
  namespace: source
spec:
  podSelector: {}
  egress:
  - to:
    - namespaceSelector:
        matchLabels:
          kubernetes.io/metadata.name: openshift-dns
    ports:
    - protocol: TCP
      port: 53
    - protocol: UDP
      port: 53
    - protocol: TCP
      port: 5353
    - protocol: UDP
      port: 5353
  policyTypes:
  - Egress
```

```sh
# test connection to service on service-network
curl -v telnet://172.30.103.29:3306
```

### EgressIP

An egress IP address is equally balanced between available nodes. If a node with an egress IP becomes unavailable its egress IP is automatically reassigned. A node will at most host one the listed egress IPs.

```yaml
apiVersion: k8s.ovn.org/v1
kind: EgressIP
metadata:
  name: example
spec:
  egressIPs:
  - 10.26.2.51
  namespaceSelector:
    matchLabels:
      egressip: example
  podSelector:
    matchLabels:
      egressip: example
```

```sh
# label namespace to match EgressIP selector
oc label namespace/example egressip=example
# label nodes to be assignable
oc label node worker-0 k8s.ovn.org/egress-assignable=''
```

## etcd

```sh
oc get clusteroperator etcd
oc edit etcd.operator.openshift.io cluster
oc get pods -n openshift-etcd-operator
```

### Encrypt etcd data

```sh
# encrypt etcd with AES-CBC with PKCS#7 padding and a 32 byte key
oc patch apiserver/cluster --patch '{"spec": {"encryption": {"type": "aescbc"}}}'

# wait until status Encrypted is True. (other conditions: EncryptionInProgress, EncryptionCompleted)
oc get openshiftapiserver,kubeapiserver \
  -o jsonpath='{range .items[*]}{.status.conditions[?(@.type=="Encrypted")]}{"\n"}'

# decrypt etcd
oc patch apiserver/cluster --patch '{"spec": {"encryption": {"type": "identity"}}}'

# check Encryption condition on OAuth API server (DecryptionInProgress or DecryptionCompleted)
oc get authentication.operator.openshift.io cluster \
  -o jsonpath='{range .status.conditions[?(@.type=="Encrypted")]}{"\n"}'
```

> etcd encryption encrypts values, not keys.

## Console

```sh
oc whoami --show-console

oc get clusteroperator openshift-samples
oc edit console.operator.openshift.io cluster
oc edit console.config.openshift.io cluster

oc get pods -n openshift-console-operator
oc get pods -n openshift-console

oc get configmap console-public -n openshift-config-managed

oc get oauthclient console -o yaml
```

```yaml
apiVersion: operator.openshift.io/v1
kind: Console
metadata:
  name: cluster
spec:
  customization:
    addPage:
      disabledActions:
      - import-from-samples
      - upload-jar
      - project-access
    customProductName: Example
    customLogoFile: # ConfigMap console-custom-logo in namespace openshift-config
      name: console-custom-logo
      key: console-custom-logo.png
    projectAccess: {}
    quickStarts: {}
    developerCatalog:
      categories:
      - id: databases
        label: Databases
        subCategories:
        - id: mariadb
          label: MariaDB
          tags:
          - mariadb
  logLevel: Normal
  managementState: Managed # "Removed" to disable the console
  observedConfig: null
  operatorLogLevel: Normal
  plugins:
  - mce
  - acm # Advanced Cluster Management
  - odf-console # OpenShift Data foundation
  providers: {}
  route:
    hostname: ""
    secret:
      name: ""
  unsupportedConfigOverrides: null
```

```yaml
apiVersion: console.openshift.io/v1
kind: ConsoleLink
metadata:
  name: example
spec:
  applicationMenu:
    section: Example
    imageURL: data:image/png;base64,<base64>
    # --- or ----
    imageURL: https://example.com/favicon.svg
  href: https://example.com
  location: ApplicationMenu
  text: Example link

---

apiVersion: console.openshift.io/v1
kind: ConsoleLink
metadata:
  name: example
spec:
  href: https://example.com
  location: HelpMenu
  text: Example link
```

To disable console, set its management state to `"Removed"`.

```sh
oc patch console cluster --patch '{"spec": {"managementState": "Removed"}}'
```

### Console UI labels and annotations

Available console UI icons: [GitHub openshift/console - catalog-item-icon.tsx](https://github.com/openshift/console/blob/master/frontend/public/components/catalog/catalog-item-icon.tsx).

| Type | Name | Description |
|:---|:------|:---------|
| Label | `app.kubernetes.io/name` | Component name. |
| Label | `app.kubernetes.io/component` | Component type. |
| Label | `app.kubernetes.io/part-of` | Groups components by name. |
| Label | `app.kubernetes.io/instance` | Application name. Set by ArgoCD from `Application` name. |
| Label | `app.openshift.io/runtime` | Component image. |
| Annotation | `app.openshift.io/connects-to` | Arrow to value: `[{"apiVersion: "APIVERSION", "kind": "KIND", "name": "NAME"}]`. |
| Annotation | `app.openshift.io/vcs-uri` | Source URL link. |
| Annotation | `app.openshift.io/vcs-ref` | Source branch, tag or commit SHA. |
| Annotation | `console.alpha.openshift.io/overview-app-route` | The primary route for link. |

Image stream tag annotation `iconClass` displays an image in the developer catalog. The value format is `icon-<name>`.

```yaml
apiVersion: v1
kind: ImageStream
spec:
  tags:
  - annotations:
      iconClass: icon-openshift
      openshift.io/display-name: Example
```

Template annotation `iconClass` displays an image in the developer catalog. The value can be a code from [font-awesome v4](https://fontawesome.com/v4/icons/) (e.g. `fa fa-cube`).

```yaml
apiVersion: template.openshift.io/v1
kind: Template
metadata:
  annotations:
    iconClass: icon-catalog
    openshift.io/display-name: Example
```

## Samples operator

```sh
oc get clusteroperator openshift-samples
oc edit config.samples.operator.openshift.io/cluster
oc get pods -n openshift-cluster-samples-operator
```

Disable samples operator to remove all its managed image streams and templates in the namespace `openshift`.

```yaml
apiVersion: samples.operator.openshift.io/v1
kind: Config
metadata:
  name: cluster
spec:
  architectures:
  - x86_64
  managementState: Removed

  # managementState: Managed
  # samplesRegistry: 'HOST:PORT'
  # skippedTemplates:
  # - sso74-https
  # skippedImageStreams:
  # - jboss-datagrid73-openshift
```

## Resource management

Voluntary pod disruptions are when a pod is terminated by a controller or during a node eviction. Pods are evicted when the node is drained or when the scheduler decides to move pods. Node conditions like memory pressure, disk pressure or PID pressure cause evictions signals.

```sh
# show node metrics
oc adm top node --sort-by=cpu
oc adm top node master-0
oc adm top node --selector 'node-role.kubernetes.io/worker,!node-role.kubernetes.io/infra'

# limit the bandwidth of pods
oc annotate deployment/NAME \
  kubernetes.io/ingress-bandwidth=10M kubernetes.io/egress-bandwidth=10M

# scale down pods behind a service until they receive network traffic
oc idle SERVICE_NAME -n example
oc idle -l app=example -n example # select services by label
```

Nodes are overcommitted when pods' resource requests exceed what's physically available. Node overcommitment is enabled by default.

```sh
# check node kernel settings that overcommit_memory=1 and panic_on_oom=0
oc debug node/NODE -- chroot /host sysctl vm.overcommit_memory vm.panic_on_oom
# disable node overcommitment on node
oc debug node/NODE -- chroot /host sysctl --write vm.overcommit_memory=0

# disable node overcommitment for a namespace
oc annotate namespace NAMESPACE quota.openshift.io/cluster-resource-override-enabled=false
```

### Scheduling

The default platform scheduler (kube-scheduler) assigns pods to nodes based on constraints and best-fit scoring. Pods can be evicted for different reasons. For high availability it's possible to spread pods across failure-domains like nodes, zones, and pod groups. For efficient utilization of resources, pods should declare CPU and memory requirements and limits.

```sh
# cluster-wide Scheduler configuration
oc edit scheduler.config.openshift.io/cluster
oc explain scheduler.spec --api-version config.openshift.io/v1

# pods are in namespace openshift-kube-scheduler
oc get pods -n openshift-kube-scheduler

oc get priorityclasses
```

```yaml
apiVersion: config.openshift.io/v1
kind: Scheduler
metadata:
  name: cluster
spec:
  mastersSchedulable: false # whether to allow master nodes to be schedulable
  policy: # (DEPRECATED), use profile instead
    name: "" # configmap in openshift-config with policy
  profile: LowNodeUtilization
    # LowNodeUtilization := (default) spread pods for low resource usage per node
    # HighNodeUtilization := gather pods for high resource usage per node
    # NoScoring := use quickest scheduling by disabling all score plugins
  defaultNodeSelector: region=restricted # the default annotation value for "openshift.io/node-selector" on namespaces
```

Pods are scheduled onto nodes based on the resource requests (not limits) being available on the node. Therefore, if pods' limits are higher than their requests and higher than the node's capacity then the node becomes overcommitted. Eviction starts when resource consumption increases beyond the pods' requests. Node-pressure evictions consider pods' resource usage relative to their requests when choosing targets; a pod using more than requested is evicted before a pod using less than requested.

A pod's quality of service (QoS) estimates its eviction order based on its resource requests and limits. Quality of service gets set on `pod.status.qosClass`.

- `Guaranteed`: if limit=request for all containers in the pod.
- `Burstable`: if limit>request for any container in the pod.
- `BestEffort`: neither limit or request is set. First to be OOM-killed.

Cluster-critical pods that share nodes with non-critical pods can be given higher pod priority by setting their `pod.spec.priorityClassName` to `system-cluster-critical` or `system-node-critical` (which are `PriorityClasses` provided by default). A pod with a preemption policy of `PreemptLowerPriority` is always scheduled because the preemption logic can evict lower priority pods. The admission controller sets `pod.spec.priority` based on the `pod.spec.priorityClassName`.

- Node-pressure evictions consider pod priority.
- The preemption logic does not consider pod quality of service.
- Pods evicted by preemption are still granted their graceful termination period.
- Pod disruption budgets can be violated by preemption if there are no alternatives.

```yaml
apiVersion: scheduling.k8s.io/v1
kind: PriorityClass
metadata:
  name: high-nonpreempting
description: "High priority that doesn't preempt lower priority pods"
value: 1000000 # higher value means higher priority (0 is default if no global default exists)
globalDefault: false
preemptionPolicy: Never # or PreemptLowerPriority
```

Add a `ResourceQuota` in a namespace to restrict usage of specific priority classes.

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: restrict-priority-class
  namespace: example
spec:
  hard:
    pods: '0'
  scopeSelector:
    matchExpressions:
      - operator : In
        scopeName: PriorityClass
        values:
          - openshift-user-critical
          - system-cluster-critical
          - system-node-critical
```

Manually evict a pod with the eviction API as shown below. A return code of `429 Too Many Requests` is returned when eviction was not allowed -- for example beacuse of a pod disruption budget.

```sh
# evict a pod
oc create --raw /api/v1/namespaces/${NAMESPACE}/pods/${POD}/eviction -f - <<<'
{
  "apiVersion": "policy/v1",
  "kind": "Eviction",
  "metadata": {
    "name": "'${POD}'",
    "namespace": "'${NAMESPACE}'"
  }
}'
# or with curl
curl -i "$(oc whoami --show-server)/api/v1/namespaces/${NAMESPACE}/pods/${POD}/eviction" \
  -H 'Content-type: application/json' --data @eviction.json -H "Authorization: Bearer $(oc whoami -t)"
```

#### Scheduler profiles

A different scheduler can be set on `pod.spec.schedulerName`. Default value is `"default-scheduler"`.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
spec:
  schedulerName: default-scheduler
```

### Node selector

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
spec:
  nodeName: worker-0 # 
  nodeSelector:
    matchLabels:
      example: value
```

```sh
# set default node-selector for all pods in namespace
oc annotate namespace NAMESPACE openshift.io/node-selector=example=value
```

### Taints and tolerations

A node's taint has the specified effect on any pod that doesn't tolerate the taint.

- `NoSchedule`: pods that don't tolerate this taint aren't scheduled on the node.
- `PreferNoSchedule`: pods that don't tolerate this taint aren't scheduled on the node if possible.
- `NoExecute`: pods that don't tolerate this taint aren't scheduled on the node and are evicted if they're already there.

```sh
# taint a node with key=value and effect (NoSchedule | PreferNoSchedule | NoExecute)
oc adm taint nodes foo KEY=VALUE:EFFECT

# taint a node with only key and effect
oc adm taint node infra-0 node-role.kubernetes.io/infra:NoSchedule
# remove the taint
oc adm taint node infra-0 node-role.kubernetes.io/infra:NoSchedule-

# list node taints
oc get node infra-0 -o jsonpath='{range .spec.taints[*]}{}{"\n"}{end}'

# add default tolerations to pods in a namespace
oc patch namespace/NAMESPACE --type=merge \
  --patch '
metadata:
  annotations:
    scheduler.alpha.kubernetes.io/defaultTolerations: >-
      [{
        "effect": "NoSchedule",
        "operator": "Exists",
        "key": "node-role.kubernetes.io/infra"
      }]
'
```

Automatic node taints:

- `node.kubernetes.io/not-ready`: condition `Ready` is `"False"`.
- `node.kubernetes.io/unreachable`: condition `Ready` is `"Unknown"`.
- `node.kubernetes.io/memory-pressure`: condition `MemoryPressure` is `"True"`.
- `node.kubernetes.io/disk-pressure`: condition `DiskPressure` is `"True"`.
- `node.kubernetes.io/pid-pressure`: condition `PIDPressure` is `"True"`.
- `node.kubernetes.io/network-unavailable`: condition `NetworkUnavailable` is `"True"`.
- `node.kubernetes.io/unschedulable`: node is unschedulable (`node.spec.unscheduable: true`).
- `node.cloudprovider.kubernetes.io/uninitialized`: before a cloud-controller-manager initializes the node.

Effects:

- `NoExecute`
- `NoSchedule`
- `PreferNoSchedule`

Pod tolerations:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
spec:
  tolerations:
  # tolerate taint "key1" with value "value1" and effect "NoExecute"
  - key: key1
    operator: Equal
    value: value1
    effect: NoExecute
    tolerationsSeconds: 3600 # only execute for 1h if node is tainted with key1=value1+NoExecute

  # tolerate taints without value
  - effect: NoSchedule
    key: node-role.kubernetes.io/master
    operator: Exists
  - effect: NoExecute
    key: node.kubernetes.io/unreachable
    operator: Exists
    tolerationSeconds: 120
  - effect: NoExecute
    key: node.kubernetes.io/not-ready
    operator: Exists
    tolerationSeconds: 120
  
  # tolerate everything (set on DaemonSets)
  - operator: Exists
```

### Pod affinities

Pod affinities:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  labels:
    app: example
spec:
  affinity:

    podAffinity:

      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          topologyKey: kubernetes.io/hostname # node label to consider pods co-located
          labelSelector: # pod selector
            matchLabels:
              app: example
            matchExpressions:
            - key: app
              operator: In
              values:
              - example
          namespaces: null # use pod's namespace; union with namespaceSelector
          namespaceSelector: {} # use pod's namespace; union with namespaces
      requiredDuringSchedulingIgnoredDuringExecution:
      - topologyKey: kubernetes.io/hostname
        labelSelector:
          matchExpressions: # or matchLabels
          - key: app
            operator: In
            values:
            - example
        namespaces: null # use pod's namespace; union with namespaceSelector
        namespaceSelector: {} # all namespaces

    podAntiAffinity:

      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        podAffinityTerm:
          topologyKey: kubernetes.io/hostname
          labelSelector:
            matchExpressions: # or matchLabels
            - key: app
              operator: In
              values:
              - example
          namespaceSelector: {} # all namespaces
          namespaces: null # pod's namespace

      requiredDuringSchedulingIgnoredDuringExecution:
      - topologyKey: kubernetes.io/hostname
        labelSelector:
          matchExpressions: # or matchLabels
          - key: app
            operator: In
            values:
            - example
        namespaceSelector: {} # all namespaces
        namespaces: null # pod's namespace
        
    
    nodeAffinity:

      preferredDuringSchedulingIgnoredDuringExecution:
      - weight: 100
        preference:
          matchExpressions: # match by node labels
          - key: zone # label key
            operator: In # In|NotIn|Exists|DoesNotExist|Gt|Lt
            values:
            - west
          matchFields: # match by node fields
          - key: metadata.name
            operator: NotIn # In|NotIn|Exists|DoesNotExist|Gt|Lt
            values:
            - worker-0
        
      requiredDuringSchedulingIgnoredDuringExecution:
        nodeSelectorTerms:
        - matchExpressions:
          - key: zone
            operator: NotIn
            values:
            - north
        - matchFields:
          - key: metadata.name
            operator: NotIn
            values:
            - worker-1
```

> `matchExpressions.operator` can be: `In|NotIn|Exists|DoesNotExist|Gt|Lt`.

### Pod topology spread constraint

Pod topology spread constraint:

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  labels:
    app: example
spec:
  topologySpreadConstraints:
  - topologyKey: zone # topology domain is based on node label "zone"
    maxSkew: 1 # maximum difference in pods from the smallest group
    whenUnsatisfiable: DoNotSchedule # or ScheduleAnyway
    labelSelector: # pod selector
      matchLabels:
        app: example
    matchLabelKeys:
    - pod-template-hash # pod label with unique value per Deployment revision
    # fields for whether pod affinities and node taints are honored (default) or ignored
    nodeAffinityPolicy: Honor # or Ignore
    nodeTaintsPolicy: Honor # or Ignore
```

### Resource requests and limits

```sh
# set resources
oc set resources deploy/DEPLOYMENT --requests cpu=50m,memory=10Mi --limits cpu=400m,memory=1Gi
# remove by setting to zero
oc set resources deploy/DEPLOYMENT --requests cpu=0m,memory=0Mi --limits cpu=0m,memory=0Mi

# show pod container metrics (requires metrics operator); sort by "cpu" or "memory"
oc adm top pod --containers --sort-by=cpu --all-namespaces

# get pod quality of service
oc get pod -o jsonpath='{range .items[*]}{.status.qosClass} {.metadata.name}{"\n"}{end}'
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
spec:
  containers:
  - resources:
      requests:
        cpu: 50m
        memory: 100Mi
        ephemeral-storage: 2Gi
      limits:
        cpu: 400m
        memory: 500Mi
        ephemeral-storage: 4Gi
        hugepages-2Mi: 80Mi
```

> A quantity is a string type and must be less than `2^63-1` in magnitude and not have more than 3 decimal places.
>
> Binary units: `Ki | Mi | Gi | Ti | Pi | Ei`
>
> Decimalt units: `m | "" | k | M | G | T | P | E`

Quality of service classes:

- `Guaranteed`: each pod container's memory request equals the memory limit and CPU request equals its CPU limit.
- `Burstable`: at least one pod container has memory or CPU set in request or limit.
- `BestEffort`: memory and CPU limits and requests are not set. The pods are first to be terminated if the system runs out of memory.

An operator can create "Extended Resources" using device plugin daemonsets that a pod can request (e.g. `nvidia.com/gpu`). Extended resources cannot be overcommitted so their request must equal their limit.

```sh
oc get nodes -o jsonpath='{range .items[*]}{.metadata.name}{.status.capacity}{"\n"}{end}'
```

### Limits and quotas

Quotas on namespaces protect against unforeseen spikes in resource usage -- including CPU, memory, storage, etcd-data, and image-data.

Limit range:

```yaml
apiVersion: v1
kind: LimitRange
metadata:
name: example-limits
spec:
  limits:

  - type: Pod # limit on Pod's containers in total
    max:
      memory: 512Mi
      cpu: 500m
    min:
      memory: 32Mi
      cpu: 100m

  - type: Container
    default:
      memory: 512Mi
      cpu: 500m
    defaultRequest:
      memory: 50Mi
      cpu: 100m
    max:
      memory: 2Gi
      cpu: "2"
    min:
      memory: 32Mi
      cpu: 100m
    maxLimitRequestRatio: # max. of limit divided by request
      cpu: "10"

  - type: openshift.io/Image
    max:
      storage: 1Gi # largest image size that can be pushed to internal registry

  - type: openshift.io/ImageStream
    max: # maximum number of tags and versions for an image stream
      openshift.io/image-tags: "10"
      openshift.io/images: "20"

  - type: PersistentVolumeClaim
    min:
      storage: 1Gi
    max:
      storage: 50Gi
```

> Prune images that exceed the size in the limit for `openshift.io/Image`.
>
> ```sh
> oc adm prune images --prune-over-size-limit -n NAMESPACE
> ```

Resource quota:

```sh
oc create quota -h
oc create resourcequota example --hard=requests.cpu=4 --dry-run=client -o yaml
```

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: example
spec:
  scopes: null # all objects in namespace
  hard:
    requests.cpu: "4"
    requests.memory: 8Gi
    limits.cpu: "4"
    limits.memory: 8Gi

    requests.storage: 5Gi
    requests.ephemeral-storage: 120G
    limits.ephemeral-storage: 120G
    # StorageClass quotas for "thin"
    thin.storageclass.storage.k8s.io/request.storage: 2Gi
    thin.storageclass.storage.k8s.io/persistentvolumeclaims: "1"

    pods: "10" # Pods in a non-terminal state (not status Failed or Succeeded)
    configmaps: "10"
    persistentvolumeclaims: "10"
    replicationcontrollers: "10"
    resourcequotas: "10"
    services: "10"
    services.loadbalancers: "10"
    services.nodeports: "10"
    secrets: "10"

    # --- Object count quotas ---
    # count/<resource> or count/<resource>.<group>
    count/persistentvolumeclaims: "10"
    count/services: "10"
    count/secrets: "10"
    count/configmaps: "10"
    count/replicationcontrollers: "10"
    count/deployments.apps: "10"
    count/replicasets.apps: "10"
    count/statefulsets.apps: "10"
    count/jobs.batch: "10"
    count/cronjobs.batch: "10"
```

```yaml
apiVersion: v1
kind: ResourceQuota
metadata:
  name: no-besteffort-pods # i.e. require .spec.containers[0].resources values
spec:
  scopes:
  - BestEffort
  hard:
    pods: '0'
```

Cluster resource quotas define quotas for multiple namespaces.

```sh
oc create clusterresourcequota example \
  --project-label-selector key=value \
  --project-annotation-selector openshift.io/requester=USERNAME \
  --hard pods=10 --hard secrets=20

oc describe clusterquotaresource example

# project admin can view applicable ClusterResourceQuotas
oc describe AppliedClusterResourceQuota
```

```yaml
apiVersion: v1
kind: ClusterResourceQuota
metadata:
  name: example
spec:
  quota: 
    hard:
      pods: "10"
      secrets: "20"
  selector: # selecting more than 100 namespaces affects API server responsiveness
    annotations: 
      openshift.io/requester: USERNAME
    labels:
      key: value
```

### Pod health probes

```sh
# HTTP probe
oc set probe deployment myapp --readiness --get-url=http://:8080/healthz --period=20 # http or https
# TCP probe
oc set probe deployment myapp --liveness --open-tcp=5432 --period=20 --timeout-seconds=1
# command probe
oc set probe deployment myapp --startup --failure-threshold 3 --initial-delay-seconds 60 -- echo ok
```

> When the startup probe has succeeded once the liveness probe will begin testing liveness.

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
spec:
  terminationGracePeriodSeconds: 30 # seconds the pod needs to terminate gracefully after SIGTERM
  containers:
  - readinessProbe: # or livenessProbe or startupProbe
      initialDelaySeconds: 10
      periodSeconds: 10
      successThreshold: 1 # must be 1 for liveness and startup
      failureThreshold: 3
      timeoutSeconds: 1
      # --- either ---
      httpGet:
        path: /healthz
        port: 8080
        scheme: HTTP # or HTTPS
        httpHeaders:
        - name: Accept
          value: application/json
        - name: User-Agent
          value: "" # remove header
      # --- or ---
      tcpSocket:
        port: 5432
      # --- or ---
      exec:
        command: # exit code 0 means healthy
          - echo
          - ok
```

### Pod scaling

```sh
# scale down to 0
oc scale deployment/DEPLOYMENT --replicas=0
# scale up to 1 if replicas=0
oc scale deployment/DEPLOYMENT --replicas=2 --current-replicas=0

oc wait --for=jsonpath='{.status.readyReplicas}'=2 deployment/DEPLOYMENT --timeout=-1s
```

A horizontal pod autoscaler calculates the desired replica count based on CPU metrics and target CPU usage. Horizontal pod autoscalers require pod metrics to be enabled.

```sh
# check if pod metrics are configured by describing instances
oc describe PodMetrics -n openshift-kube-scheduler

# set replicas to at least 2, and at most 5, scale to target 70% of pod requests;
oc autoscale deployment/NAME --max=5 --min=2 --cpu-percent=80 # creates an hpa
oc describe hpa NAME
```

```yaml
apiVersion: autoscaling/v2 # v2 since Kubernetes v1.23 added spec.metrics
kind: HorizontalPodAutoscaler
metadata:
  name: example
  namespace: example
spec:
  scaleTargetRef:
    apiVersion: apps/v1 # apps.openshift.io/v1 for DeploymentConfig
    kind: Deployment # Deployment, DeploymentConfig, StatefulSet, ReplicaSet
    name: example
  maxReplicas: 5
  minReplicas: 2
  # --- either ---
  targetCPUUtilizationPercentage: 80
  # --- or ---
  metrics:
  - # --- either ---
    type: Resource # ContainerResource | External | Object | Pods | Resource
    resource:
      name: cpu
      target:
        # --- either ---
        type: Utilization
        averageUtilization: 80
        # --- or ---
        type: AverageValue
        averageValue: 500m
    # --- or ---
    type: External
    external:
      metric:
        name: kubernetes.kubelet.cpu.usage
        selector:
          matchLabels:
            cluster_name: example
      target:
        averageValue: "50"
        type: AverageValue
```

A pod disruption budget sets constraints on pod evictions for selected pods. This will cause evictions to fail and retry.

```sh
oc create poddisruptionbudget -h
oc create poddisruptionbudget example --dry-run=client -o yaml \
  --selector=deployment=example --min-available=1
```

```yaml
apiVersion: policy/v1
kind: PodDisruptionBudget
metdata:
  name: example
spec:
  selector: # pod selector
    matchLabels:
      deployment: example
  # --- either ---
  minAvailable: 1 # count or percentage (e.g. "20%") of pods that must be available after eviction
  # --- or ---
  maxUnavailable: 1 # count or percentage (e.g. "20%") of pods that can be unavailable after eviction
```

## Operators

```sh
oc get clusteroperator marketplace
oc get catalogsources -n openshift-marketplace
oc get pods -n openshift-marketplace
oc get configmaps,jobs -n openshift-marketplace

# check for errors regarding OLM managed operators
oc logs deployment/olm-operator -n openshift-operator-lifecycle-manager --tail 10 --follow
# check for errors in catalog-operator
oc logs deployment/catalog-operator -n openshift-operator-lifecycle-manager --tail 10 --follow
oc delete pod -n openshift-operator-lifecycle-manager -l app=catalog-operator
```

Operators are custom Kubernetes controllers with custom resources; they can be installed manually or by a manager. Cluster platform operators that come with OpenShift are managed by the Cluster Version Operator (CVO). Optional operators from OperatorHub (an operator registry) are managed by the [Operator Lifecycle Manager (OLM)](https://olm.operatorframework.io). An operator can be installed by simply creating a custom resource definition and deploying its associated controller pod with appropriate RBAC role bindings (usually with Helm charts), but the OLM streamlines the installation, upgrade, and configuration of an operator.

OpenShift has an embedded OperatorHub that the OLM consumes through a catalog. Each catalog comes from an `CatalogSource` resource that references an image containing an index file.

> The OpenShift console shows CVO operators at Administration > Cluster Settings > ClusterOperators. OperatorHub configuration is at Administration > Cluster Settings > Global Configuration > OperatorHub. The operator catalogs are shown at Operators > OperatorHub.

> OperatorHub: [https://operatorhub.io](https://operatorhub.io).

```sh
# list cluster operators
oc get clusteroperators
oc api-resources --api-group=operator.openshift.io
oc api-resources --api-version=operator.openshift.io/v1

# wait for cluster operator status condition
oc wait co/authentication --for condition=Progressing --timeout 90s

# view logs of the OLM pod to check operator installation
oc logs pod/olm-operator-xxxxxxxxx-xxxxx -n openshift-operator-lifecycle-manager
```

The cluster version operator (CVO) installs and upgrades cluster operators by reading files in a release image.

`PackageManifest` objects are created from index files sourced from images referenced in `CatalogSource` objects. Package manifests lists available channels and their available operator versions (CSVs).

```yaml
apiVersion: operators.coreos.com/v1alpha1
kind: CatalogSource
metadata:
  name: example-operators
  namespace: openshift-marketplace
  annotations:
    operatorframework.io/priorityclass: system-cluster-critical
spec:
  # --- image with OLM index file
  image: REGISTRY/REPOSITORY/IMAGE:TAG_OR_SHA
  # ---
  sourceType: grpc
  displayName: Example Operators
  publisher: Example publisher
  icon:
    base64data: ""
    mediatype: ""
  priority: -200
  updateStrategy:
    registryPoll:
      interval: 10m0s
  grpcPodConfig:
    priorityclass: system-cluster-critical # overrides annotation "operatorframework.io/priorityclass"
    nodeSelector:
      node-role.kubernetes.io/infra: ""
    tolerations:
    - key: node-role.kubernetes.io/infra
      operator: Exists
      effect: NoSchedule
```

```sh
oc get packagemanifests --sort-by=.status.catalogSource

# show packagemanifest channels
oc get packagemanifests/NAME \
  -o jsonpath='{range .status.channels[*]}{.name}, CSV: {.currentCSV}{"\n"}{end}[ DEFAULT: {.status.defaultChannel} ]{"\n"}'

# get related images in packagemanifest for a specific channel (e.g. "stable")
oc get packagemanifest NAME \
  -o jsonpath='{range .status.channels[?(.name=="stable")].currentCSVDesc.relatedImages[*]}{}{"\n"}{end}'

# get suggested namespace
oc get packagemanifest NAME \
  -o jsonpath='{.status.channels[?(.name=="stable")].currentCSVDesc.annotations.operatorframework\.io/suggested-namespace}'

# view catalog source pod logs
oc logs -l olm.catalogSource=redhat-operators -n openshift-marketplace
```

> An operator can skip versions when upgrading, allowing multiple versions to upgrade to it directly. CSVs describe allowed previous versions in its "skip range" (e.g. `>=0.1.6 <0.1.13`). If the CVS has a "replaces" list, then the current CSV name must be in the replaces field.

Create an `Subscription` object to install an operator. It's automatically associated with the `OperatorGroup` object in the same namespace. The `Subscription` specifies which channel to subscribe to, which starting version (CSV) to install, whether upgrades are automatic or manual, and operator configuration.

```yaml
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: <name>
  namespace: <namespace>
spec:
  targetNamespaces: # if not installed in all namespaces
  - <namespace>

---

apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: <name>
  namespace: <namespace> 
spec:
  channel: <channel_name> 
  name: <packagemanifest_name> # operator name
  source: <catalog_source> 
  sourceNamespace: <catalog_source_namespace> # openshift-marketplace 
  installPlanApproval: <Automatic_or_Manual>
  # --- don't specify startingCSV to instead get "currentCSV" of package manifest
  # startingCSV: <csv>
  # ---
  config:
    env:
    - name: <string>
      value: "<string>"
    envFrom: 
    - secretRef:
        name: <secret_name>
    volumes: 
    - name: <volume_name>
      configMap:
        name: <configmap_name>
    volumeMounts: 
    - mountPath: <directory_name>
      name: <volume_name>
    resources: 
      requests:
        memory: "64Mi"
        cpu: "250m"
      limits:
        memory: "128Mi"
        cpu: "500m"
    nodeSelector: 
      foo: bar
    tolerations: []
```

> Override the cluster-wide proxy's default `HTTP_PROXY/NO_PROXY` environment variables on operator deployments by setting the environment variables on the `Subscription`.

Operators installed in all namespaces come from subscriptions in the `openshift-operators` namespace, where there is a default `OperatorGroup` that targets all namespaces. Operators installed in a single namespace come from a `Subscription` and its `OperatorGroup` that targets a namespace. The `OperatorGroup` will create create role bindings in its target namespace (or cluster role bindings) for its operators. The operator pods are created in the same namespace as the `Subscription`.

```sh
oc get operatorgroup --all-namespaces
oc get subscriptions.operators.coreos.com --all-namespaces
# list installed operators (cluster service versions)
oc get csv --all-namespaces
# show operator installations
oc get installplan --all-namespaces

# check conditions if operator
oc get operator OPERATOR -o jsonpath='{..conditions}{"\n"}' | jq --slurp [.]

# check for new install plans that are waiting for install approval
oc get ip -A -o=jsonpath='
{range .items[?(@.spec.approved==false)]}
{.metadata.name}: {.metadata.namespace}/{.spec.clusterServiceVersionNames}
{end}'

# start operator upgrade when installPlanApproval is Manual
oc patch installplan install-xxxxx --namespace openshift-operators \
    --type merge --patch '{"spec":{"approved":true}}'
oc wait installplan/install-xxxxx --for condition=Progressing --timeout 90s
oc wait installplan/install-xxxxx --for condition=Installed --timeout 90s
```

Uninstalling an operator means deleting its `ClusterServiceVersion` and `Subscription` and also manually deleting resources created by the operator like custom resource definitions, roles, role bindings, and service accounts.

Refresh a failing subscription by deleting it, its `csv`, and any corresponding failing catalog source job and the job's matching `ConfigMap`.

```sh
CSV=$(oc get subscriptions.operators.coreos.com NAME -o jsonpath='{.status.currentCSV}')
oc delete sub/NAME,csv/${CSV}

# find CRDs from API group (e.g. bitnami.com)
oc api-resources --api-group=bitnami.com

# find CRDs from package manifest
oc get packagemanifest PACKAGEMANIFEST \
  -o jsonpath='{range ..customresourcedefinitions.owned[*]}{.kind} ({.name}){"\n"}{end}'

# find CRDs from cluster service version
oc get csv ${CSV} \
  -o jsonpath='{range .spec.customresourcedefinitions.owned[*]}{.kind} ({.name}){"\n"}{end}'

# show examples
oc get csv ${CSV} \
  -o jsonpath='{.metadata.annotations.alm-examples}'
```

> If an operator is classified as "cluster monitoring workload" (namespace has prefix `openshift-`), then label the operator's namespace with `openshift.io/cluster-monitoring=true`. This adds RBAC privileges to the OpenShift Prometheus service account to scrape metrics in the namespace.

```sh
# check operator catalog source statuses
oc describe subscriptions.operators.coreos.com --all-namespaces
oc describe catalogsources --all-namespaces
oc get pods -n openshift-marketplace # check that pods for catalog sources are running
# check that jobs that update operator bundles are succeeding
oc get jobs -n openshift-marketplace # check that pods for catalog sources are running
```

```sh
# disable all the default hub sources (then add to .spec.sources)
oc patch OperatorHub cluster --type json \
  --patch '[{"op": "add", "path": "/spec/disableAllDefaultSources", "value": true}]'
```

## Storage

```sh
oc get clusteroperator storage
oc edit storage.operator.openshift.io
oc get pods -n openshift-cluster-csi-drivers
oc get pods -n openshift-cluster-storage-operator

oc get pods,pvc,pv -n openshift-storage
oc get clustercsidrivers
oc get storageclasses,volumesnapshotclasses

# OpenShift Data Foundation (ODF)
oc get StorageSystem.odf.openshift.io -n openshift-storage
oc get StorageCluster.ocs.openshift.io -n openshift-storage
oc get CephCluster -n openshift-storage
```

```yaml
apiVersion: operator.openshift.io/v1
kind: Storage
metadata:
  name: cluster
spec:
  logLevel: Normal
  managementState: Managed
  operatorLogLevel: Normal
```

```yaml
# Thin vSphere CSI
apiVersion: storage.k8s.io/v1
kind: StorageClass
metadata:
  name: thin
  annotations:
    storageclass.kubernetes.io/is-default-class: 'true'
parameters:
  diskformat: thin
provisioner: kubernetes.io/vsphere-volume
reclaimPolicy: Delete
volumeBindingMode: Immediate
```

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: example
  namespace: example
spec:
  storageClassName: thin # defaults to default storage class
  accessModes:
  - ReadWriteMany
  volumeMode: Filesystem # or Block
  resources:
    requests:
      storage: 1G
```

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
spec:
  containers:
  - image: IMAGE
    name: container-name
    volumeMounts:
    - name: pvc-volume
      mountPath: /data
    - name: confimap-file-volume
      mountPath: /path/to/file
      subPath: file
    - name: secret-volume
      mountPath: /data
    volumeDevices: # Block volumeModes
    - name: pvc-block-volume
      devicePath: /dev/xvda

  volumes:
  - name: pvc-volume
    persistentVolumeClaim:
      claimName: mypvc
  - name: pvc-block-volume
    persistentVolumeClaim:
      claimName: myblockpvc
  - name: confimap-file-volume
    configMap:
      name: myconfigmap
      defaultMode: 0644 # 420 in decimal
  - name: secret-volume
    secret:
      defaultMode: 420 # 0644 in octal
      secretName: mysecret
```

```sh
# create deployment and set PVC volume
oc create deployment example --image=nginx --replicas=0 -o yaml \
| oc set volume -f - \
  --add --mount-path=/data --name=pvc-volume --type pvc --class-name thin \
  --claim-name=mypvc --claim-size=1G --claim-mode=rwm \
  --dry-run=client -o yaml

# set mount from pvc
oc set volume deployment/DEPLOYMENT --overwrite \
  --add --name pvc-volume --mount-path /data --type pvc --claim-name mypvc

# set mount from secret
oc set volume deployment/DEPLOYMENT \
  --add --name secret-volume --mount-path /data --type secret --secret-name mysecret

# set file mount from configmap
oc set volume deployment/DEPLOYMENT \
  --add --name configmap-file-volume \
  --type configmap --configmap-name myconfigmap \
  --mount-path /path/to/file --sub-path=file
```

```sh
# set timezone from configmap
oc create configmap tz-london --from-file=localtime=/usr/share/zoneinfo/Europe/London
oc set volumes deployment/DEPLOYMENT --add \
  --type=configmap --name=tz --configmap-name=tz-london \
  --mount-path=/etc/localtime --sub-path=localtime

oc logs deployment/DEPLOYMENT --timestamps
oc set env deployment/DEPLOYMENT TZ=Asia/Tokyo
```

Volume access modes:

- RWO, `ReadWriteOnce`: a read-write connection from only one node at any point in time.
- RWX, `ReadWriteMany`: a read-write connection from many nodes at any point in time.
- ROX, `ReadOnlyMany`: a read connection from many nodes at any point in time.
- RWOP, `ReadWriteOncePod`: a read-write connection from only one pod at any point in time.

A multi-attach error occurs when a RWO volume is not unmounted from a crashed node. Force delete the pod on the unavailable node, which deletes the volumes stuck on the node after six minutes.

```sh
oc delete pod NAME --force=true --grace-period=0
```

### Ephemeral storage

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  namespace: example
spec:

  containers:
  - name: container1
    image: example:latest
    command: [ "sleep", $(ARG) ] # referenced environment variable of spec
    args: []
    resources:
      limits:
        memory: 1Gi
      requests:
        ephemeral-storage: 20Gi # node local ephemeral storage

    env:
    - name: ARG
      value: 10m
    - name: POD_IP
      valueFrom:
        fieldRef:
          fieldPath: status.podIP
    - name: NODE_NAME
      valueFrom:
        fieldRef:
          fieldPath: spec.nodeName
    - name: ANNOTATION_VALUE
      valueFrom:
        fieldRef:
          fieldPath: metadata.annotations['<KEY>']
    - name: MEMORY_LIMIT
      valueFrom:
        resourceFieldRef:
          resource: limits.memory # will be in bytes
          containerName: container1
    - name: CONFIGMAP_VALUE
      valueFrom:
        configMapKeyRef:
          name: configmap-name
          key: key-name
          optional: true
    - name: SECRET_VALUE
      valueFrom:
        secretKeyRef:
          name: secret-name
          key: key-name
          optional: false

    envFrom:
    - configMapRef:
        name: configmap-name
        optional: true
      prefix: _
    - secretRef:
        name: secret-name
        optional: false
      prefix: _

    volumeMounts:
    - name: emptydir
      mountPath: /emptydir
    - name: configmap
      mountPath: /configmap
      readOnly: true
    - name: secret
      mountPath: /secret
      readOnly: true
    - name: downwardapi
      mountPath: /downwardapi
    - name: projected
      mountPath: /projected
      readOnly: true
    - name: ephemeral
      mountPath: /ephemeral

  volumes:

  - name: emptydir
    emptyDir: {}

  - name: configmap
    configMap:
      name: configmap-name
    optional: true

  - name: secret
    secret:
      secretName: secret-name
    defaultMode: 0640
    items:
    - key: key-name
      mode: 0640
      path: key-name # map key to this relative path inside the volume

  - name: downwardapi
    downwardAPI:
      defaultMode: 0644
      items:
      - fieldRef:
          fieldPath: metadata.labels # only annotations, labels, name, namespace
        path: labels
        mode: 0644

  - name: projected
    projected:
      defaultMode: 420 # 0644
      sources:
      - configMap:
          name: configmap
          items:
          - key: configmap-file.txt
            path: configmap-file.txt # /projected/configmap
      - secret:
          name: secret
          items:
          - key: secret-file.txt
            path: secret-file.txt # /projected/namespace
            mode: 0644
      - downwardAPI:
          items:
          - fieldRef:
              apiVersion: v1
              fieldPath: metadata.namespace
            path: namespace # /projected/namespace

  - name: ephemeral
    ephemeral:
      # generates PersistentVolumeClaim/<pod_name>-<volume_name> that's deleted with the pod
      volumeClaimTemplate:
        metadata: {}
        spec:
          accessModes: [ "ReadWriteOnce" ]
          storageClassName: null
          resources:
            requests:
              storage: 1Gi
```

### Expand volume

If the volume's storage class has `StorageClass.allowVolumeExpansion=true`, then its requested storage can be increased directly on the `PersistentVolumeClaim`. For file systems to be resized on a node the volume must be mounted in a running pod.

```sh
# increase PVC size
oc patch pvc/mypvc --patch '{"spec":{"resources": {"requests": {"storage":"10Gi"}}}}'
# watch status changes
oc get pvc/mypvc --watch -o jsonpath='{.status}{"\n"}'
# PV is resized
oc get pv "$(oc get pvc/mypvc -o jsonpath='{.spec.volumeName}')"
```

If there's an error when resizing, replace the `PersistentVolumeClaim` with one that has the original size after making the corresponding `PersistentVolume` available to be re-bound (so the data isn't lost).

```sh
# set reclaim policy to Retain and remove claimRef to current PVC
PV="$(oc get pv -o name "$(oc get pvc/mypvc -o jsonpath='{.spec.volumeName}')")"
oc patch ${PV} --patch '{"spec":{"persistentVolumeReclaimPolicy":"Retain", "claimRef":null}}'

# replace PVC with a smaller size and the same .spec.volumeName
oc patch pvc/mypvc --patch '{"spec":{"resources": {"requests": {"storage":"5Gi"}}}}' \
  --dry-run=client -o yaml | oc replace -f -

# restore the PV's reclaim policy
oc patch ${PV} --patch '{"spec":{"persistentVolumeReclaimPolicy":"Delete"}}'
```

### Volume snapshots

```yaml
apiVersion: snapshot.storage.k8s.io/v1
kind: VolumeSnapshot
metadata:
  name: mypvc-snapshot
  namespace: example
spec:
  source:
    persistentVolumeClaimName: mypvc
  volumeSnapshotClassName: snapshot-class # a VolumeSnapshotClass; uses default class if null
```

```sh
oc get volumesnapshotclass
oc get volumesnapshot,volumesnapshotcontents
```

```yaml
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
  name: mypvc # replacing the original with the same name
  namespace: example
spec:
  storageClassName: thin # same as original
  volumeMode: Filesystem # same as original
  dataSource:
    apiGroup: snapshot.storage.k8s.io
    kind: VolumeSnapshot
    name: mypvc-snapshot
  accessModes:
  - ReadWriteOnce # same as original
  resources:
    requests:
      storage: 5Gi # at least as large as original
```

### `StatefulSet`

```sh
# create the headless service
oc create service clusterip ss --tcp=8080 --clusterip=None
oc set selector service/ss app=my-set

# create regular service
oc create service clusterip my-set --tcp=8080  # create regular service
oc set selector service/my-set app=my-set      # set label to match the pods

# from within the cluster, query the SRV records of the stateful set service
dig SRV ss.NAMESPACE.svc.cluster.local
nslookup ss.NAMESPACE.svc.cluster.local
```

```yaml
apiVersion: apps/v1
kind: StatefulSet
metadata:
  name: my-set
  namespace: example
spec:
  serviceName: ss
  replicas: 2
  selector: {matchLabels: {app: my-set}}
  template:
    metadata: {labels: {app: my-set}}
    spec:
      containers:
      - name: container1
        image: stateful-image:latest
        ports:
        - containerPort: 8080
        env:
        - name: POD_NAME
          valueFrom: {fieldRef: {fieldPath: metadata.name}}
        - name: POD_IP
          valueFrom: {fieldRef: {fieldPath: status.podIP} }
        volumeMounts:
        - name: data
          mountPath: /data
  volumeClaimTemplates:
  - metadata:
      name: data
    spec:
      accessModes: [ "ReadWriteOnce" ]
      storageClassName: ""
      resources: {requests: {storage: 1Gi}}
  # Rolling update strategy terminates pods one-by-one in reverse ordinal order
  updateStrategy:
    type: RollingUpdate # OnDelete to not update pods on changes to spec.template
    rollingUpdate:
      # Only pods with ordinals equal to or higher are updated on rollout (default is 0).
      # Pods of the other partition are re-launched with the previous configuration.
      partition: 1
  # Order of pod launch and termination during scaling
  podManagementPolicy: OrderedReady # one-by-one; otherwise "Parallel"
```

## Monitoring

### Alerts and metrics

```sh
oc get clusteroperators monitoring
oc get pods -n openshift-monitoring
oc get pods -n openshift-user-workload-monitoring

# check if any errors with loaded alertmanager.yaml
oc logs sts/alertmanager-main -c alertmanager -n openshift-monitoring

# get all the Prometheus rules
oc extract cm/prometheus-k8s-rulefiles-0 -n openshift-monitoring

oc get AlertmanagerConfig --all-namespace
oc get PrometheusRule --all-namespace
oc get ServiceMonitor --all-namespace
oc get PodMonitor --all-namespace
```

The default local alert manager in the namespace `openshift-monitoring` routes alerts from Prometheus instances.

Create the main cluster monitoring configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: cluster-monitoring-config
  namespace: openshift-monitoring
data:
  config.yaml: |+
    enableUserWorkload: true
    alertmanagerMain:
      volumeClaimTemplate:
        metadata:
          name: alertmanager-claim
        spec:
          storageClassName: thin-csi
          resources:
            requests:
              storage: 26Gi
      nodeSelector: 
        node-role.kubernetes.io/infra: ""
      tolerations:
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoSchedule
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoExecute
    prometheusK8s:
      retention: 10d
      volumeClaimTemplate:
        metadata:
          name: prometheus-claim
        spec:
          storageClassName: thin-csi
          resources:
            requests:
              storage: 26Gi
      nodeSelector:
        node-role.kubernetes.io/infra: ""
      tolerations:
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoSchedule
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoExecute
    prometheusOperator:
      nodeSelector:
        node-role.kubernetes.io/infra: ""
      tolerations:
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoSchedule
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoExecute
    k8sPrometheusAdapter:
      nodeSelector:
        node-role.kubernetes.io/infra: ""
      tolerations:
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoSchedule
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoExecute
    kubeStateMetrics:
      nodeSelector:
        node-role.kubernetes.io/infra: ""
      tolerations:
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoSchedule
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoExecute
    telemeterClient:
      nodeSelector:
        node-role.kubernetes.io/infra: ""
      tolerations:
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoSchedule
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoExecute
    openshiftStateMetrics:
      nodeSelector:
        node-role.kubernetes.io/infra: ""
      tolerations:
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoSchedule
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoExecute
    thanosQuerier:
      nodeSelector:
        node-role.kubernetes.io/infra: ""
      tolerations:
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoSchedule
      - key: node-role.kubernetes.io/infra
        value: reserved
        effect: NoExecute
```

Cluster alert manager configuration:

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: alertmanager-main
  namespace: openshift-monitoring
stringData:
  alertmanager.yaml: |
    global:
      resolve_timeout: 5m
      smtp_from: alerts@example.com
      smtp_smarthost: smtp@example.com:25
      smtp_require_tls: false
      smtp_auth_username: username
      smtp_auth_password: password
    inhibit_rules:
    - equal:
      - namespace
      - alertname
      source_matchers:
      - severity = critical
      target_matchers:
      - severity =~ warning|info
    - equal:
      - namespace
      - alertname
      source_matchers:
      - severity = warning
      target_matchers:
      - severity = info
    receivers:
    - name: Default
    - name: Watchdog
    - name: Critical
    - name: email
      email_configs:
      - to: example@example.com

    route:
      group_by:
      - namespace
      group_interval: 5m
      group_wait: 30s
      receiver: Default
      repeat_interval: 12h
      routes:
      - matchers:
        - alertname = Watchdog
        receiver: Watchdog
      - matchers:
        - severity = critical
        receiver: Critical
      - matchers:
        - service = myapp
        - severity = critical
        receiver: email
```

User workload monitoring configuration:

```yaml
apiVersion: v1
kind: ConfigMap
metadata:
  name: user-workload-monitoring-config
  namespace: openshift-user-workload-monitoring
data:
  config.yaml: |
    prometheus:
      enforcedSampleLimit: 50000
```

Extract current user workload alert manager configuration:

```sh
oc extract secret/alertmanager-user-workload -n openshift-user-workload-monitoring
vi alertmanager.yaml
```

Permit users to monitor their own projects with these roles:

- `monitoring-rules-view`: read access to `PrometheusRule` in a namespace.
- `monitoring-rules-edit`: create, modify, and delete `PrometheusRule` in a namespace.
- `monitoring-edit`: like `monitoring-rules-edit`, but adds permission to manage `ServiceMonitor` and `PodMonitor`.

Additionally:

- `user-workload-monitoring-config-edit`: edit `ConfigMap/user-workload-monitoring-config` in the namespace `openshift-user-workload-monitoring`.
- `alert-routing-edit`: managing `AlertmanagerConfig` resources in namespaces.

### Query alerts

```sh
# get alertmanager API endpoint
API="$(oc get route/alertmanager-main -n openshift-monitoring -o jsonpath='{.spec.host}')"
TOKEN="$(oc sa get-token prometheus-k8s -n openshift-monitoring)"

curl "https://${API}/api/v1/alerts" -H "Authorization: Bearer ${TOKEN}" | jq .
```

### Silence alerts

```sh
# silence all alerts for alertname regex
oc exec -it -n openshift-monitoring -c alertmanager \
  -- amtool silence add --alertmanager.url http://localhost:9093 \
  alertname=~.+ --end="2020-10-15T00:00:00-00:00" --comment "silence all alerts"

# query silences to get IDs
oc exec -ti -n openshift-monitoring -c alertmanager \
  -- amtool silence query --alertmanager.url http://localhost:9093

# delete a silence by ID
oc exec -it -n openshift-monitoring -c alertmanager \
  -- amtool silence expire 9a5cc500-... --alertmanager.url http://localhost:9093
```

### Grafana

```sh
oc create namespace grafana
oc label namespace grafana openshift.io/cluster-monitoring=true
```

```yaml
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: grafana
  namespace: grafana
spec:
  targetNamespaces:
  - grafana
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: grafana
  namespace: grafana
spec:
  channel: v4
  name: grafana-operator
  source: community-operators
  sourceNamespace: openshift-marketplace
```

```yaml
apiVersion: grafana.integreatly.org/v1beta1
kind: Grafana
metadata:
  name: grafana
  labels:
    dashboards: grafana # for instanceSelector in datasources, dashboards, folders
spec:
  route:
    spec: {} # create default route
  config:
    log:
      mode: console
    auth:
      disable_login_form: 'false'
    security:
      admin_user: root
      admin_password: secret
```

### Troubleshooting with CLI

```sh
# node usage statistics
oc adm top nodes
# watch user pods' usage statistics
watch --interval 5 'oc adm top pods --containers --all-namespaces --sort-by=memory | grep -v "^openshift-"'

# list pending pods
oc get pods --all-namespaces --field-selector status.phase=Pending

# observed cluster state
oc get kubeapiserver/cluster \
  -o jsonpath='{range .status.conditions[*]}{.lastTransitionTime} {.status}{"\t"}[{.type}] {.reason}{"\n"}{end}' \
  | sort

# show condition messages from all image stream tags
oc get imagestreams --all-namespaces \
  -o jsonpath='{range .items[?(@..conditions)]}{.metadata.namespace}/{.metadata.name}
  {range .status.tags[*].conditions[*]}{.type}={.status}, {.reason}, {.message}{"\n"}{end}{end}'
```

```sh
oc get nodes
oc get clusteroperators
oc get clusterversion

# show nodes' configured allocated resources
oc get nodes -o=custom-columns=NAME:.metadata.name,CPU:.status.capacity.cpu,CPU_AVAIL:.status.allocatable.cpu,MEM:.status.capacity.memory,MEM_AVAIL:.status.allocatable.memory

# show workers' actually allocated resources
oc describe nodes -l 'node-role.kubernetes.io/worker,!node-role.kubernetes.io/infra' \
  | grep 'Allocated resources:' -A 8

oc cluster-info dump --namespaces example --output-directory=$(mktemp -d)

# view API server logs
oc logs -n openshift-kube-apiserver -l app=openshift-kube-apiserver

# increase CLI command log level
oc <command> --loglevel 10

# show image usage statistics
oc adm top images
oc adm top imagestreams

# APIRequestCounts track requests made to API endpoints
oc get apirequestcounts
oc get apirequestcounts pods.v1
```

```sh
# logs from Systemd units CRI-O and Kubelet (not run as containers)
oc adm node-logs NODE # all journal logs on node
oc adm node-logs --unit crio NODE
oc adm node-logs --unit kubelet NODE
oc adm node-logs --role master --unit NetworkManager.service --tail 100
# view journald logs on masters
oc adm node-logs --role=master --since '-5m' --grep='error'

# view audit logs
oc adm node-logs --role=master --path=oauth-apiserver/audit.log --raw \
  | jq 'select(.user.username == "myusername" and .verb == "delete")'
oc adm node-logs --role=master --path=audit/audit.log
oc adm node-logs --role=master --path=kube-apiserver/audit.log
oc adm node-logs --role=master --path=openshift-apiserver/audit.log --raw \
  | jq --slurp '[.[] | select( .annotations."authorization.k8s.io/decision" != "allow")]'
oc adm node-logs --role=master --path=audit/audit.log --raw \
  | jq --slurp '[.[] | select(.verb=="delete" and .objectRef.resource=="projects")]'

# show openvswitch log file names
oc adm node-logs --role master --path=openvswitch # list log files in /var/log/openvswitch/
oc adm node-logs --role master --path=openvswitch/ovs-vswitchd.log

# list log directories for use with --path=DIR
oc debug node/NODE \
  -- chroot /host find /var/log -maxdepth 1 -type d -execdir basename '{}' ';'

# mark node as unschedulable without evicting
oc adm cordon NODE_NAME

# evict all pods from a node, mark node as unschedulable, and wait for graceful pod termination
oc adm drain NODE_NAME --ignore-daemonsets --force --delete-emptydir-data --disable-eviction
  # --ignore-daemonsets when there are DaemonSet-managed pods on the node.
  # --force when there are unmanaged pods (no controller) on the node.
  # --delete-emptydir-data when there are pods using emptyDir (its data is lost).
  # --disable-eviction when there are PDBs blocking eviction.

# mark node schedulable again
oc adm uncordon NODE_NAME
```

```sh
# prune images
oc adm prune images --keep-tag-revisions=2 --keep-younger-than=60m --confirm
# prune builds
oc adm prune builds --orphans --keep-complete=1 --keep-failed=1 --keep-younger-than=60m --confirm
# prune completed and failed DeploymentConfigs
oc adm prune deployments --confirm
```

```sh
oc debug node/NODE -- chroot /host systemctl list-units --state failed

# use crictl to check logs from daemon containers
oc debug node/NODE -- chroot /host crictl ps -a
oc debug node/NODE -- chroot /host crictl logs <container_id>
oc debug node/NODE -- chroot /host crictl inspectp <pod_id>

# reboot a node
oc debug node/NODE -- chroot /host systemctl reboot
oc wait --for=condition=Ready node/NODE
# shut down a node
oc debug node/NODE -- chroot /host shutdown -h 1
```

```sh
# start a OpenShift tools container as pod
oc debug
oc debug --to-namespace=example --node-name=worker-0
oc debug --to-namespace=example --node-name=worker-0 -- nc -z -v mysvc-example.svc.cluster.local 8080
# start a debug pod based on existing pod's single container and as specific user
oc debug pod/mypod --as-user=1001 --one-container --container=container1

# run a pod temporarily with a specific service account
oc run mypod --image $(oc registry info --internal)/NAMESPACE/IMAGESTREAM:TAG \
  --image-pull-policy=Always --restart Never \
  --env=HTTP_PROXY=http://proxy.example.com --privileged=false --labels=delete-me=yes\
  --overrides='{"spec":{"serviceAccountName":"myserviceaccount","terminationGracePeriodSeconds":0}}' \
  -- sleep 1h
oc rsh mypod # remote shell into container
oc delete pod mypod

# move files/directories to and from pod (oc-cp requires that tar exists in container)
oc cp /tmp/local_file mypod:/tmp/pod_file # or NAMESPACE/mypod:/PATH
oc cp mypod:/tmp/pod_file /tmp/local_file

# copy with rsync
oc rsync ./local/dir/ mypod:/remote/dir
oc rsync mypod:/remote/dir/ ./local/dir

# run commands in pod
oc exec mypod -- ./script.sh
oc exec mypod -- tar cf - /tmp/foo | tar xf - -C /tmp/bar # move as tar archive

# list environment variables
oc set env pod/mypod --list --resolve # list those set on the resource
oc exec mypod -- env
# set HTTP proxy
oc set env deployment/example --overwite=false --containers='example' \
  HTTP_PROXY=http://proxy.example.com:80 http_proxy=http://proxy.example.com:80 \
  HTTPS_PROXY=https://proxy.example.com:443 https_proxy=https://proxy.example.com:443 \
  NO_PROXY=.example.com,svc.cluster.local,localhost,127.0.0.1 \
  no_proxy=.example.com,svc.cluster.local,localhost,127.0.0.1
```

```sh
oc port-forward pod/mypod 8080:7474
oc port-forward service/mysvc 8080:7474 &; P=$!
kill -TERM "${P}"  # or fg and CTRL+c to bring into foreground and exit
```

#### Finalizers

```sh
# find finalizers in a namespace
oc api-resources --verbs=list --namespaced -o name \
  | xargs --max-args=1 oc get --show-kind --ignore-not-found -n NAMESPACE \
  -o jsonpath='{range .items[?(.metadata.finalizers)]}{.kind}/{.metadata.name} : {.metadata.finalizers}{"\n"}{end}'

# remove finalizers (may orphan resources in etcd)
oc patch RESOURCE/NAME --type json \
  --patch='[ { "op": "remove", "path": "/metadata/finalizers" } ]'
oc wait --for=delete RESOURCE/NAME --timeout=60s
```

#### Check etcd

```sh
oc get pods -n openshift-etcd
oc rsh etcd-master01 -n openshift-etcd

etcdctl endpoint health --cluster

etcdctl check perf --load="s" # small
etcdctl check perf --load="m" # medium
etcdctl check perf --load="l" # large



ETCDCTL_API=3 ETCDCTL_CACERT=/etc/kubernetes/pki/etdc/ca.crt \
ETCDCTL_CERT=/etc/kubernetes/pki/etcd/server.ctr \
ETCDCTL_KEY=/etc/kubernetes/pki/etcd/server.key \
etcdctl --endpoints=https://127.0.0.1:2379 get /registry/secrets/default/first
```

```sh
# The performance test etcd-perf reports whether the disk is fast enough to host etcd by comparing the 99th percentile of the fsync metric captured from the run to see if it is less than 10 ms.
#   This test writes 22 MiB of data in blocks of 2300 bytes on the /var/lib/etcd directory.
#   The 99th percentile of the fsync is 6193152 ns, which is equivalent to 6 ms of write latency.
#   The operating system has achieved an average of 328 IOPS during the test.
oc debug node/master01
chroot /host
podman run --volume /var/lib/etcd:var/lib/etcd:Z quay.io/openshift-scale/etcd-perf
```

#### Validate certificates

```sh
# check connection with trusted root.crt
openssl s_client -verifyCAfile root.crt -connect HOST:PORT -servername HOST </dev/null

# get certificate bundle from a host
openssl s_client -showcerts -connect HOST:PORT -servername HOST </dev/null \
  | sed -n '/BEGIN CERTIFICATE/,/END CERTIFICATE/p' > bundle.crt
cat bundle.crt root.crt > fullchain.crt

# check each certificate in chain
T=$(mktemp -d)
csplit --silent --elide-empty-files --prefix ${T}/crt- --digits=2 bundle.crt \
  '/-----BEGIN CERTIFICATE-----/' '{*}'
for CERT in ${T}/crt-*
do
  openssl x509 -noout -in "${CERT}" -subject -issuer
  openssl verify -show_chain -verbose -partial_chain -CAfile bundle.crt "${CERT}"
done
```

```sh
# check the expiration date of the kube-apiserver-to-kubelet-signer CA certificate
oc get secret kube-apiserver-to-kubelet-signer -n openshift-kube-apiserver-operator \
  -o jsonpath='{.metadata.annotations.auth\.openshift\.io/certificate-not-after}{"\n"}'

# check the kubelet client certificate expiration date
oc debug node/MASTER_NODE -- \
  chroot /host openssl x509 -in /var/lib/kubelet/pki/kubelet-client-current.pem -noout -enddate
# check the kubelet server certificate expiration date
oc debug node/MASTER_NODE -- \
  chroot /host openssl x509 -in /var/lib/kubelet/pki/kubelet-server-current.pem -noout -enddate

# approve any pending csr for kubelet certificates
oc get csr \
  -o go-template='{{range .items}}{{if not .status}}{{.metadata.name}}{{"\n"}}{{end}}{{end}}'
oc get csr -o name | xargs oc adm certificate approve
```

#### SSH into nodes

If the API server is not working, SSH into nodes and use CRI-O CLI or `runc` to check containers.

```sh
oc get nodes -L kubernetes.io/hostname
# nodes will be tainted as 'accessed'
ssh -i ~/.ssh/ssh_key core@<node-host> 'crictl info' # run one command
ssh -i ~/.ssh/ssh_key core@<node-host>
crictl info
crictl ps --all | grep machine-config-daemon
runc list
crictl ps --no-trunc # get full container ID for runc
runc ps CONTAINER_FULL_ID # shows processes in container
crictl pods
crictl rmp -f POD_ID
crictl logs CONTAINER_ID
crictl exec -it CONTAINER_ID ps -ef # if container has ps
crictl rm CONTAINER_ID
ls -l /var/log/containers/ # symlinks to container log files

export KUBECONFIG=/var/lib/kubelet/kubeconfig
oc whoami
```

Use `systemctl` to manage services on nodes.

```sh
systemctl list-units --state failed
systemctl status kubelet
sudo systemctl start crio
journalctl -u crio
```

Run `tcpdump` on a container from the node.

```sh
# get the node name and container ID
oc get pod mypod -o jsonpath='{.spec.nodeName} {.status.containerStatuses[*].containerID}'

oc debug node/${NODENAME}
chroot /host
ip a
toolbox # start another container with shell that has more tools

# on node, get the container process ID
chroot /host crictl inspect ${CONTAINER_ID} | grep -i pid
# on node, run a command in container network namespace
nsenter --target ${PID} --net ip a
nsenter -t ${PID} -n tcpdump -nnvv -i eth0 port 8080 -w pod.pcap
```

#### Must-gather

```sh
# gather information with default image and command into ./must-gather.local.<rand>
oc adm must-gather
oc describe imagestream must-gather -n openshift # the default must-gather image

oc adm must-gather --image-stream=openshift/must-gather:latest --dest-dir="/path/to/dir"

oc adm must-gather --run-namespace NAMESPACE \
  --image=registry.redhat.io/container-native-virtualization/cnv-must-gather-rhel9:v4.13.2

# run the audit gather command
oc adm must-gather -- /usr/bin/gather_audit_logs

# create a compressed archive of gathered information
tar -c -v -a -f must-gather.tar.gz must-gather.local.*/
```

> Red Hat provides a set of must-gather images at `registry.redhat.io` for different components.

Gather host network trace:

```sh
oc adm must-gather \
  --dest-dir /tmp/captures \
  --source-dir /tmp/tcpdump/ \
  --image registry.redhat.io/openshift4/network-tools-rhel8:latest \
  --node-selector 'node-role.kubernetes.io/worker' \
  --host-network=true \
  --timeout 30s \
  -- tcpdump -i any \ -w /tmp/tcpdump/%Y-%m-%dT%H:%M:%S.pcap -W 1 -G 300
```

#### Ignore validating webhooks

When the services of validating and mutating admission webhooks are down they will reject pods if `failurePolicy=Fail`.

```yaml
# ./kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

configMapGenerator:
- name: webhook-backup
  namespace: debug # namespace to store configmap
  literals:
  - failurePolicy=Ignore
  files:
  - webhook-backup.json
  options:
    disableNameSuffixHash: true

replacements:
- source:
    kind: ConfigMap
    name: webhook-backup
    namespace: debug
    fieldPath: data.failurePolicy
  targets:
  - select:
      group: admissionregistration.k8s.io
      kind: ValidatingWebhookConfiguration
    reject: # skip those that get conflict errors
    - name: managedclustersetbindingvalidators.admission.cluster.open-cluster-management.io
    - name: managedclustervalidators.admission.cluster.open-cluster-management.io
    - name: manifestworkvalidators.admission.work.open-cluster-management.io
    - name: vmulticlusterobservability.observability.open-cluster-management.io
    - name: multicluster-observability-operator
    - name: multiclusterengines.multicluster.openshift.io
    - name: multus.openshift.io
    - name: ocm-validating-webhook
    - name: validation.csi.vsphere.vmware.com
    - name: vcentral.kb.io-tltfw
    fieldPaths:
    - webhooks.*.failurePolicy

resources:
```

```sh
oc adm new-project debug

# store all validating webhook configurations in a file
oc get validatingwebhookconfiguration -o json > webhook-backup.json

# generate partial resource files for patching
jq --raw-output '
.items[] | {
  apiVersion: .apiVersion,
  kind: .kind,
  metadata: {
    name: .metadata.name
  },
  webhooks: .webhooks
},"\n---\n"
' webhook-backup.json \
  | csplit --silent --elide-empty-files \
    --prefix webhook-patch- --suffix-format='%02d.json' - '/---/' '{*}'

# add to kustomization.yaml resources list
find ./ -name 'webhook-patch-*.json' -execdir printf '- %s\n' '{}' ';' \
  | sort >> kustomization.yaml

# check output
oc kustomize . | less
oc diff -k . --server-side
# apply patch to change failure policies to "Ignore"
oc apply -k . --server-side

# restore webhooks
oc extract configmap/webhook-backup -n debug --keys=webhook-backup.json --to=- | oc apply -f -
```

### Logging

[OpenShift logging - Exported fields](https://docs.openshift.com/container-platform/latest/logging/cluster-logging-exported-fields.html).

The OpenShift Logging operator is installed by a cluster administrator and receives update separately from OpenShift.

Install the Red Hat Elasticsearch operator (or the Loki operator) for the log store.

```sh
oc get sub -n openshift-logging
oc get operatorgroup -n openshift-logging # targetNamespaces: openshift-logging
oc get operator cluster-logging.openshift-logging

oc get pods -n openshift-logging
oc get daemonset/collector -n openshift-logging # sends logs to internal log store
oc get pods -l component=collector -n openshift-logging
oc get pod -l component=elasticsearch -n openshift-logging
oc get cronjob -n openshift-logging # elasticsearch cronjobs

oc get csv -n openshift-logging
# the elastic search operator is copied to all namespaces
oc get csv --all-namespaces | grep 'elasticsearch-operator'
```

```sh
oc logs mypod --since-time '2023-07-09T10:09:53+02:00' --timestamps
oc logs deploy/mydeploy --since 1h --timestamps --all-containers --prefix
oc logs deploy/mydeploy --previous --tail 100
```

```yaml
# ElasticSearch operator
# ----------------------
apiVersion: v1
kind: Namespace
metadata:
  name: openshift-operators-redhat # something other than openshift-operators
  annotations:
    openshift.io/node-selector: ""
  labels:
    # configure the Prometheus Cluster Monitoring stack to scrape metrics
    openshift.io/cluster-monitoring: "true" 
---
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: openshift-operators-redhat
  namespace: openshift-operators-redhat
spec: {}
---
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: elasticsearch-operator
  namespace: openshift-operators-redhat
spec:
  channel: stable-5.1
  installPlanApproval: Automatic
  source: redhat-operators
  sourceNamespace: openshift-marketplace
  name: elasticsearch-operator
```

```yaml
# Logging operator
# ----------------
apiVersion: v1
kind: Namespace
metadata:
  name: cluster-logging
  annotations:
    openshift.io/node-selector: ''
  labels:
    # configure the Prometheus Cluster Monitoring stack to scrape metrics
    openshift.io/cluster-monitoring: 'true'
---
apiVersion: operators.coreos.com/v1
kind: OperatorGroup
metadata:
  name: cluster-logging
  namespace: openshift-logging
spec:
  targetNamespace:
  - openshift-logging
---
kind: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: cluster-logging
  namespace: openshift-logging
spec:
  channel: stable
  name: cluster-logging
  source: redhat-operators
  sourceNamespace: openshift-marketplace
```

```yaml
apiVersion: logging.openshift.io/v1
kind: ClusterLogging
metadata:
  name: instance
  namespace: openshift-logging
spec:
  managementState: Managed
  logStore: # where the logs are stored internally
    retentionPolicy:
      application:
        maxAge: 1d
      infra:
        maxAge: 3d
      audit:
        maxAge: 3d
    type: elasticsearch
    elasticsearch:
      nodeCount: 3
      redundancyPolicy: SingleRedundancy # ZeroRedundancy
      storage:
        storageClassName: block-storage-class-name # StorageClass with block storage
        size: 200G
      # storage: {} # uses emptyDir
  visualization: # UI to view logs, graphs, charts
    type: kibana
    kibana: {}
  collection: # collects logs from the cluster, formats them, and forwards them to the log store
    logs:
      type: fluentd
      fluentd: {}
status:
  # each component's status is added automatically
  collection: {}
  logStore: {}
  visualization: {}
```

> Set `nodeSelector`, `tolerations`, and `resources` on each component.

Since all logs may be forwarded to external log servers, only the collection component is required, but the Elasticsearch operator still needs to be installed. The default Elasticsearch log store and Kibana UI can be removed by removing `logStore` and `visualization` from `ClusterLogging` (keep `collection`). Make sure no `outputRefs` specify `default` in `ClusterLogForwarder`.

Create a `ClusterLogForwarder` instance to forward logs to external log servers.

```yaml
apiVersion: logging.openshift.io/v1
kind: ClusterLogForwarder
metadata:
  name: instance # required name
  namespace: openshift-logging
spec:

  outputs:
  - name: syslog
    type: syslog # requires fluentd instead of vector
    url: tls://syslog.example.com:514 # tls://, udp://, tcp://
    syslog:
      rfc: RFC5424 # RFC3164
      facility: user # the syslog facility (number or case-insensitive keyword)
      severity: debug # the syslog severity (number or case-insensitive keyword)
      payloadKey: message # record field used as payload for syslog message (prevents other parameters)
      addLogSource: true # add namespace_name, pod_name, and container_name elements to the message field of the record
      tag: mytag # record field to use as a tag on the syslog message
      trimPrefix: '' # remove the specified prefix from the tag
      # --- only RFC5424 ---
      appName: myapp # APP-NAME; string that identifies the application that sent the log
      msgID: mymsg # MSGID; string that identifies the type of message
      procID: myproc # PROCID; changing this value indicates a discontinuity in syslog reporting
      # --------------------
    secret: # specify opaque secret in namespace openshift-logging
      name: syslog-secret
      # The key can have the following:
      # - tls.crt, tls.key, passphrase (for tls.key), ca-bundle.crt (to verify output server)
      # - username, password
      # - sasl.enable, sasl.mechanisms, sasl.allow-insecure

  - name: splunk
    type: splunk # requires Logging Operator 5.6 and log collector vector instead of fluentd
    url: http://splunk.hec.example.com:8088
    secret:
      name: splunk-secret # hecToken=<HEC_Token>

  - name: fluentdforward
    url: tls://fluentd.example.com:24224 # tcp://
    type: fluentdForward
    secret:
      name: fluentd-secret
      # - tls.crt, tls.key, ca-bundle.crt
      # - username, password

  - name: elasticsearch
    type: elasticsearch
    url: https://elasticsearch.example.com:9200
    secret:
      name: elasticsearch-secret
      # - tls.crt, tls.key, ca-bundle.crt
      # - username, password

  inputs: 
  - name: my-app-logs
    application:
      namespaces:
      - example
      selector:
        matchLabels: 
          app: example

  pipelines:
  - name: audit-infrastructure-syslog
    inputRefs:
    - audit # audit logs
    - infrastructure # # pods in namespace openshift*, kube*, or default, and journal logs on nodes
    outputRefs:
    - syslog
  - name: application-elasticsearch
    inputRefs:
    - application # container logs that are not infrastructure
    outputRefs:
    - elasticsearch
    labels: # labels added to the logs
      appId: example
```

> Redeploy fluentd pods after creating the `ClusterLogForwarder`.
>
> ```sh
> oc delete pod --selector logging-infra=collector -n openshift-logging
> ```

Unless a `ClusterLogForwarder` is created, infrastructure and applications logs (not audit logs) are forwarded to the internal ElasticSearch log store. To forward everything to internal log store (this isn't secure storage for audit logs):

```yaml
pipelines:
- name: all-to-default
  inputRefs:
  - infrastructure
  - application
  - audit
  outputRefs:
  - default # an implicitly defined output that forwards to internal log store
```

### Filtered CLI output

```sh
# List unhealthy pods (that aren't build-pods) on specific node:
oc get pods --all-namespaces --no-headers \
  --field-selector=status.phase!=Running,status.phase!=Succeeded,spec.nodeName=worker-0 \
  --selector '!openshift.io/build.name'

# watch events
oc get events --watch
# Get events sorted and filtered
oc get events --field-selector type=Warning --sort-by=.lastTimestamp
oc get events --field-selector reason=BackOff --sort-by=.lastTimestamp -A

# customize column output with annotation values for namespaces
oc get namespaces -o custom-columns=\
NAME:.metadata.name,\
'REQUESTER:.metadata.annotations.openshift\.io/requester',\
'DISPLAY-NAME:.metadata.openshift\.io/display-name',\
'DESCRIPTION:.metadata.annotations.openshift\.io/description'

# Get namespaces with the `openshift.io/requester` annotation:
oc get namespace \
  -o jsonpath='{range .items[?(@.metadata.annotations.openshift\.io/requester)]}
  {.metadata.name}, requester={.metadata.annotations.openshift\.io/requester}{end}'

# show nodes with True conditions (e.g. Ready, MemoryPressure, DiskPressure, PIDPressure)
oc get nodes -o jsonpath-file=<(cat <<<'
{range .items[*]}
{.metadata.name}{range .status.conditions[?(@.status=="True")]}
  {.type}{"="}{.status} {.message}{end}
{end}')
```

```sh
# loop lines of input
while read -r JOB
do
  # (-o name outputs RESOURCE/NAME)
  oc get "${JOB}" -n openshift-image-registry -o yaml \
    | grep 'image: ' > "${JOB//\//-}.$(date +%d_%m_%Y-%H_%M_%S-%Z).txt"
done < <(oc get jobs -o name --field-selector 'status.successful==1' -n openshift-image-registry)
```

Filter with go-template:

```sh
oc get events \
  -o template --template '{{range .items}}{{.message}}{{"\n"}}{{end}}' \
  --sort-by=.lastTimestamp

# base64 decode
oc get pod/mypod -o go-template='{{.metadata.annotations.something-in-base64 | base64decode}}' > file

# filter with go-template file
oc get deployments --all-namespaces -o go-template-file=filter.gotemplate
```

```default
# filter.gotemplate; list requests of deployments' containers
{{- range .items -}}
  {{ $name := .metadata.name }}
  {{ $namespace := .metadata.namespace }}
  {{- range .spec.template.spec.containers -}}
    {{$namespace}}{{"/"}}{{$name}} {{": "}}
      {{"requests.cpu:    "}} {{ .resources.requests.cpu }}
      {{"limits.cpu:      "}} {{ .resources.limits.cpu }}
      {{"requests.memory: "}} {{ .resources.requests.memory }}
      {{"limits.memory:   "}} {{ .resources.limits.memory }}
  {{- end -}}
{{- end -}}
```

```default
{{- /*
  Show error and warning events:

    oc get events --all-namespaces --sort-by=.lastTimestamp \
      -o go-template-file=events.gotemplate
*/ -}}

{{- define "event" -}}
  {{- if or (eq .type "Warning") (eq .type "Error") -}}
    {{- println
      .reason "(" .count ")\n"
      .message "\n"
      .involvedObject.namespace "/"
      .involvedObject.kind "/"
      .involvedObject.name "\n"
    -}}
  {{- end -}}
{{- end -}}

{{- block "events" . -}}
  {{- range .items -}}
    {{- template "event" . -}}
  {{- end -}}
{{- end -}}
```

Filter with `jq`:

```default
# filter.jq; select items with status Complete==True
.items[]
| select(
  [
    .status.conditions[]
    | select(
      .type == "Complete"
      and
      .status == "True"
    )
  ]
  | length > 0
)
| .metadata.namespace + "/" + .metadata.name
```

```sh
oc get jobs --all-namespaces -o json | jq --raw-output --from-file filter.jq

# create objects with parts of other objects
oc get cm/example secret/example -n example -o json \
| jq '
{
  apiVersion: "v1",
  kind: "List",
  items: [ .items[] |
    {
      apiVersion: .apiVersion,
      kind: .kind,
      metadata: {
        name: .metadata.name,
        namespace: "another-namespace",
        annotations: {
          copiedFrom: "\(.metadata.namespace)/\(.metadata.name)"
        }
      },
      data: .data
    }
  ]
}' | oc apply -f - --server-side
```

## Jobs

### Pod `initContainers`, side-containers, `postStart`, and `preStop`

```yaml
apiVersion: v1
kind: Pod
metadata:
  name: example
  namespace: example
  annotations:
    oc.kubernetes.io/default-container: shell
    kubectl.kubernetes.io/default-container: shell
spec:
  serviceAccount: sa
  serviceAccountName: sa
  shareProcessNamespace: true
  volumes:
  - name: emptydir
    emptyDir: {}
  - name: configmap
    configMap:
      name: configmap-name

  initContainers:
  - name: init
    image: example:latest
    workingDir: /emptydir
    command: [sh, -c]
    args:
    - |
      # copy content from configmap to writable emptyDir volume
      cp --verbose --recursive --dereference /configmap/* /emptydir
      openssl rand -hex 12 -out seed.txt
    volumeMounts:
    - name: emptydir
      mountPath: /emptydir
    - name: configmap
      mountPath: /configmap

  containers:
  - name: shell
    image: example:latest
    command:
    - sh
    workingDir: /emptydir
    securityContext:
      capabilities:
        add:
        - SYS_PTRACE
    stdin: true
    tty: true
    volumeMounts:
    - name: emptydir
      mountPath: /emptydir

  - name: server
    image: example:latest
    workingDir: /emptydir
    volumeMounts:
    - name: emptydir
      mountPath: /emptydir
    lifecycle:
      postStart: # not guaranteed to execute before the container's entrypoint
        httpGet:
          path: /
          port: 8080
          scheme: HTTP
          httpHeaders:
          - name: Accept
            value: application/json
      preStop:
        exec:
          command:
          - sh
          - -c
          - |-
            kill -TERM -1
```

```sh
# attach to the "shell" side-container
oc attach -it example
echo $$ # show own PID
ps --deselect --pid $$ # who other processes than own PID
# access "/" file system of "server" container's PID
ls /proc/${PID}/root/
# send signal to "server" container
kill -TERM ${PID}
```

### CronJob

[https://crontab.guru](https://crontab.guru)

```sh
oc create cronjob example --image=busybox:latest \
  --schedule='*/1 * * * *' -- curl https://example.com

oc create job example --image=busybox -- curl https://example.com
oc create job --from=cronjob/example example-job
```

Cron schedule format:

```default
.---------------- minute (0 - 59)
|  .------------- hour (0 - 23)
|  |  .---------- day of month (1 - 31)
|  |  |  .------- month (1 - 12)
|  |  |  |  .---- day of week (0 - 6) (Sunday=0)
|  |  |  |  |
*  *  *  *  *
```

`CronJob` that checks certificate expiration dates.

```yaml
apiVersion: batch/v1
kind: CronJob
metadata:
  name: example
spec:
  schedule: "0 8 * * 1" # monday 08:00
  successfulJobsHistoryLimit: 1
  failedJobsHistoryLimit: 1
  concurrencyPolicy: Forbid # skip run if previous hasn't finished
  startingDeadlineSeconds: 30 # failure deadline after the scheduled time
  suspend: false # suspend job generation at scheduled time
  jobTemplate:
    metadata:
      generateName: example-
    spec:
      completions: 1
      parallelism: 1
      backoffLimit: 0
      ttlSecondsAfterFinished: 3600
      template:
        metadata:
          labels:
            job: example
        spec:
          restartPolicy: OnFailure
          serviceAccountName: sa
          serviceAccount: sa
          containers:
          - name: job
            image: tools:latest
            resources: {}
            command:
            - sh
            - -c
            args:
            - |
              openssl verify -show_chain -CAfile /path/to/fullchain.crt /path/to/server.crt
```

### Tekton

#### Event listener

```yaml
apiVersion: tekton.dev/v1beta1
kind: Task
metadata:
  name: noop
spec:
  params:
  - description: revision
    name: buildRevision
    type: string
  - description: url
    name: appGitUrl
    type: string
  - description: My argument
    name: myarg
    type: string
  volumes:
  - emptyDir: {}
    name: dir
  workspaces:
  - name: source
  - name: shared
  steps:
  - name: echo
    image: ubi8:latest
    resources: {}
    volumeMounts:
    - mountPath: /tmp/task
      name: dir
    workingDir: $(workspaces.source.path)
    script: |
      #!/bin/sh
      echo "vhjfahfgj"
      echo myarg = $(params.myarg)
      echo source = $(workspaces.source.path)
      ls -ld $(workspaces.source.path)
```

```yaml
apiVersion: tekton.dev/v1beta1
kind: Pipeline
metadata:
  name: pipeline-simple
spec:
  workspaces:
  - name: shared
  - name: source
  params:
  - name: buildRevision
  - name: appGitUrl
  - name: myarg
  tasks:
  - name: hello
    taskRef:
      name: noop
    params:
    - name: buildRevision
      value: $(params.buildRevision)
    - name: appGitUrl
      value: $(params.appGitUrl)
    - name: myarg
      value: $(params.myarg)
    workspaces:
    - name: source
      workspace: source
    - name: shared
      workspace: shared
```

```yaml
apiVersion: v1
kind: Secret
metadata:
  name: eventlistener-secret
type: Opaque
stringData:
  secretToken: "1234567"
```

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerBinding
metadata:
  name: binding
spec:
  params:
  - name: repourl
    value: $(body.repository.url)
  - name: reponame
    value: $(body.repository.name)
  - name: revision
    value: $(body.head_commit.id)
```

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: TriggerTemplate
metadata:
  name: template
spec:
  params:
  - name: repourl
    description: The git repository url
  - name: reponame
    description: The name of the git repository
  - name: revision
    default: main
    description: The git revision

  resourcetemplates:
  - apiVersion: tekton.dev/v1beta1
    kind: PipelineRun
    metadata:
      generateName: pipeline-$(tt.params.reponame)-
    spec:
      pipelineRef:
        name: pipeline-simple
      serviceAccountName: pipeline
      params:
      - name: appGitUrl
        value: $(tt.params.repourl)
      - name: buildRevision
        value: $(tt.params.revision)
      - name: myarg
        value: 'helloworld'
      workspaces:
      - name: source
        emptyDir: {}
      - name: shared
        volumeClaimTemplate:
          spec:
            accessModes:
            - ReadWriteOnce
            resources:
              requests:
                storage: 500Mi
```

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: Trigger
metadata:
  name: trigger
spec:
  serviceAccountName: pipeline
  interceptors:
    - ref:
        name: cel
      params:
        - name: overlays
          value:
          - key: branch
            expression: "body.ref.split('/')[2]"
  bindings:
  - ref: binding
  template:
    ref: template
```

```yaml
apiVersion: triggers.tekton.dev/v1beta1
kind: EventListener
metadata:
  name: eventlistener
spec:
  serviceAccountName: pipeline
  triggers:
  - triggerRef: trigger
```

## OpenShift Templates

```yaml
apiVersion: template.openshift.io/v1
kind: Template
metadata:
  name: example
  namespace: NAMESPACE
  annotations:
    openshift.io/display-name: "Example template"
    description: >-
      An example.
    openshift.io/long-description: >-
      An example.
    openshift.io/provider-display-name: "Example provider"
    openshift.io/documentation-url: "https://github.com/example/example"
    openshift.io/support-url: "https://example.com"
    tags: "example,quickstart" # catalog categories for Console GUI
    iconClass: icon-apache # one of available icons or font-awesome 4 (e.g. "fa fa-hdd-o")

# message is displayed when this template is instantiated
message: "service/${NAME} ${PORT}-${TARGET_PORT}"

parameters:
- name: PORT
  displayName: port
  description: "Service port"
  value: "8080" # default value (must be string, but can be deferenced with ${{PORT}})
  required: true # can't be empty

- name: TARGET_PORT
  displayName: "targetPort"
  description: "Pod port"
  required: true # can't be empty

- name: NAME
  displayName: "Name"
  description: "The name; it's automatically generated if not specified."
  generate: expression
  from: '[a-zA-Z0-9]{10}' # generator expression
    # [\w] := [a-zA-Z0-9_]
    # [\d] := [0-9]
    # [\a] := [a-zA-Z]
    # [\A] := [~!@#$%\^&*()\-_+={}\[\]\\|<,>.?/"';:`]
    # NOTE: JSON and YAML-double-quoted strings require [\\w] etc.
  required: true

objects:
- apiVersion: v1
  kind: Service
  metadata:
    name: example
  spec:
    type: ClusterIP
    ports:
    - name: ${PORT}-${TARGET_PORT} # dereference is always string
      port: ${{PORT}} # deference as is (Number in this case)
      targetPort: ${{TARGET_PORT}}
    selector:
      app: example
```

```sh
# list parameters of template "example" existing in namespace NAMESPACE
oc process NAMESPACE//example --parameters

# instantiate template "example" existing in namespace NAMESPACE
oc process NAMESPACE//example --param PORT=8080 --param TARGET_PORT=8181 | oc create -f -

# instantiate template from file and parameters from file
cat > parameters.txt <<<$'PORT=8080\nTARGET_PORT=8181'
oc process -f template.yaml --param-file=parameters.txt | oc create -f -
```

Set annotation `template.alpha.openshift.io/wait-for-ready=true` on template objects like `Build`, `BuildConfig`, `Deployment`, `DeploymentConfig`, and `Job` to wait for their readiness or completion. Template instantiation fails if the annotated objects report failure or the timeout of one hour is reached.

## Kustomize

```sh
mkdir -p {base,overlays/overlay1,components/component1}
cat > base/kustomization.yaml <<<$'apiVersion: kustomize.config.k8s.io/v1\nkind: Kustomization'
cat > overlays/overlay1/kustomization.yaml <<<$'apiVersion: kustomize.config.k8s.io/v1\nkind: Kustomization'
cat > components/component1/kustomization.yaml <<<$'apiVersion: kustomize.config.k8s.io/v1alpha1\nkind: Component'
```

```sh
oc kustomize . --load-restrictor=LoadRestrictionsNone
oc apply -k . --load-restrictor=LoadRestrictionsNone
oc apply -k . --dry-run=server --validate=true
# diff local resources with cluster's
oc diff -k .
```

```yaml
# overlays/overlay1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1beta1
kind: Kustomization

resources:
- ../../base
- deployment.yaml

components:
- ../../components/component1

generatorOptions:
  labels:
    generated: 'true'

secretGenerator:
- name: mysecret
  files:
  - file
  envs: # files with KEY=VALUE, one per line
  - secret.env
  options:
  - disableNameSuffixHash: true
    annotations:
      generated: ''
configMapGenerator:
- name: myconfigmap
  literals:
  - file.txt=contents
  files:
  - file2.txt=file2.txt

patches:
- path: deployment-patch.yaml
  options:
  - allowNameChange
- patch: |-
    - op: replace
      path: /spec/paused
      value: true
  target:
    group: apps
    version: v1
    kind: Deployment
    name: frontend
    labelSelector: app.kubernetes.io/part-of=example

images:
- name: image1 # matches deployment.spec.template.spec.containers.name
  newName: registry/image1
  newTag: v1.0
- name: image2
  digest: sha256:0740f5...

replicas:
- name: example
  count: 2
```

```yaml
# components/component1/kustomization.yaml
apiVersion: kustomize.config.k8s.io/v1alpha1
kind: Component

configMapGenerator:
- name: myconfigmap
  literals:
  - file.txt=contents
      continued
  - file3.txt=123
  behavior: merge # add and overwrite items in configmap/myconfigmap from base or overlay
```

## Helm

[Artifact Hub](https://artifacthub.io)

> `CHART := REPO/CHARTNAME | CHARTNAME --repo REPO_URL | .tgz | DIR`.

```sh
# find Helm chart repositories on Artifact Hub
helm search hub --list-repo-url --max-col-width 9999 'search-string'
helm search hub -o yaml 'search-string'

helm repo list
helm repo add openshift-helm-charts https://charts.openshift.io/
helm repo add redhat-cop https://redhat-cop.github.io/helm-charts
helm repo add bitnami https://charts.bitnami.com/bitnami
helm repo remove bitnami
helm repo update
helm search repo
helm search repo --versions # show all versions

# show chart information
helm show chart CHART
helm show values CHART > values.yaml
helm show readme CHART
helm show crds CHART
helm env | grep --perl-regexp --only-matching '(?<=^HELM_REPOSITORY_CONFIG=").*(?=")'
  # ~/.config/helm/repositories.yaml

# download chart .tgz from repo
helm pull redhat-cop/ansible-automation-platform --version 0.0.6 --untar
# download latest chart .tgz from URL
helm pull sealed-secrets --repo https://redhat-cop.github.io/helm-charts

# pull and push OCI charts
helm registry login quay.io/linda0/ # --registry-config config.json
helm pull oci://quay.io/linda0/example --version 1.0.0 --destination ./
helm push example-1.0.0.tgz oci://quay.io/linda0/
helm env | grep -Po '(?<=^HELM_REGISTRY_CONFIG=").*(?=")'
  # ~/.config/helm/registry/config.json
```

```sh
helm install RELEASE_NAME CHART --namespace NAMESPACE --values values.yaml --dry-run --skip-crds
helm list --all-namespace --all # show created releases
helm status RELEASE_NAME
helm uninstall RELEASE_NAME --keep-history
helm history RELEASE_NAME
helm upgrade RELASE_NAME CHART --namespace NAMESPACE --version 1.0.1 --values values.yaml
helm rollback RELEASE_NAME REVISION --namespace NAMESPACE
```

### Create Helm chart

Helm folder structure:

```default
example/
├── .helmignore
├── Chart.yaml
├── values.yaml
├── charts/
└── templates/
    └── tests/
```

```sh
helm create example --starter 'STARTER_NAME' # HELM_DATA_HOME/starters/STARTER_NAME
helm template --namespace example RELEASENAME example # generate files to stdout
helm template --output-dir dir RELEASENAME example # generate files to directory

mkdir package && cd package
helm package ../example # create <CHARTNAME>-<VERSION>.tgz
```

```yaml
apiVersion: v2
name: <CHARTNAME>
description: A Helm chart for <CHARTNAME>
version: 1.0.0
appVersion: 1.0.0
```

Helm charts can be hosted on a web server that serves index.yaml.

```sh
# fetch index (curl -sSOL)
curl --silent --show-error --remote-name --location 'https://url/to/helm-charts/index.yaml'

# add packages in current directory to index
helm repo index . --merge index.yaml --url 'https://url/to/helm-charts'

# upload files
curl -i 'https://url/to/helm-charts/' --upload-file index.yaml \
  --user "username:password"
curl -i 'https://url/to/helm-charts/' --upload-file example-1.0.0.tgz \
  --user "username:password"
curl -i 'https://url/to/helm-charts/' --upload-file example-1.0.0.tgz \
  --user "username:password" -X DELETE # remove file

helm pull example --repo https://url/to/helm-charts --ca-file cert.pem
  # or --insecure-skip-tls-verify
```

### Helm dependencies

```yaml
# requirements.yaml
dependencies:
- name: example
  version: 1.0.0
  repository: https://example.com/charts # must use helm repo add on repository 
  # enable dependency if example.enabled is values.yaml is true or null
  condition: example.enabled
  # enable dependency if tags.defaults=true in values.yaml (multiple items are OR-ed)
  tags:
  - defaults
```

```yaml
# values.yaml
tags:
  defaults: false # disable dependencies with tag "defaults"

example: # dependency values
  enabled: true # enable depedencies with condition example.enabled (overrides tags)
```

```sh
# download chart dependencies as .tgz to charts/
helm dependency update

helm install --set tags.defaults=true --set example.enabled=false
```


### Developer catalog Helm repositories

```sh
oc get helmchartrepositories # https://charts.openshift.io
oc get projecthelmchartrepositories --all-namespaces
oc get helmreleases --all-namespaces
```

Example cluster-wide Helm chart proxy:

```yaml
apiVersion: helm.openshift.io/v1beta1
kind: HelmChartRepository
metadata:
  name: example-helm-repo
spec:
  name: Example Helm Charts
  description: Example Helm Charts
  connectionConfig:
    url: https://example.com/charts
    ca:
      # name of ConfigMap in namespace openshift-config with key "ca-bundle.crt"
      name: helm-chart-ca-bundle
    tlsClientConfig:
      # name of tls Secret in namespace openshift-config with keys tls.crt and tls.key
      name: helm-chart-client-tls
  disabled: false
```

Example namespace-wide Helm chart proxy:

```yaml
apiVersion: helm.openshift.io/v1beta1
kind: ProjectHelmChartRepository
metadata:
  name: example-helm-repo
  namespace: example
spec:
  name: Example Helm Charts
  description: Example Helm Charts
  connectionConfig:
    url: https://example.com/charts
    ca:
      # name of ConfigMap in namespace openshift-config with key "ca-bundle.crt"
      name: helm-chart-ca-bundle
    tlsClientConfig:
      # name of tls Secret in namespace openshift-config with keys tls.crt and tls.key
      name: helm-chart-client-tls
  disabled: false
```

Authenticated users can access to all configured Helm charts, but if `connectionConfig.ca` and `connectionConfig.tlsClientConfig` are used then additional RBAC bindings are required.

```sh
# add RBAC role to access CA ConfigMap
oc create role helm-chart-ca-viewer -n openshift-config \
  --resource=configmaps --resource-name=helm-chart-ca-bundle --verb=get
oc create rolebinding helm-chart-ca-viewers -n openshift-config \
  --role=helm-chart-ca-viewer --group=system:authenticated

# add RBAC role to access tls Secret
oc create role helm-chart-client-tls-viewer -n openshift-config \
  --resource=secrets --resource-name=helm-chart-client-tls --verb=get
oc create rolebinding helm-chart-client-tls-viewers -n openshift-config \
  --role=helm-chart-ca-viewer --group=system:authenticated
```

## Ansible

```sh
sudo dnf install ansible-core
# or
pip install ansible-core
```

```Dockerfile
FROM ansible-runner:latest
ENV \
  RUNNER_PLAYBOOK=playbook.yml \
  PIP_INDEX_URL=https://pypi.example.com/pypi \
  PIP_TRUSTED_HOST=pypi.example.com
USER 0
RUN \
  pip -m install jmespath kubernetes && \
  ansible-galaxy collection install ansible.utils -p /usr/share/ansible/collections && \
  ansible-galaxy collection install kubernetes.core -p /usr/share/ansible/collections
USER 1001
```

> Install offline archive: `ansible-galaxy collection install https://example.com/ansible-utils-2.9.0.tar.gz`.

Ansible runner directory structure:

```default
./
├── env/
│   ├── cmdline
│   ├── envvars
│   └── settings
├── inventory/
│   ├── group_vars/
│   │   ├── all/
│   │   │   ├── vars.yml
│   │   │   └── vault
│   │   └── pods/
│   │       └── vars.yml
│   ├── host_vars/
│   │   └── localhost/
│   │       ├── vars.yml
│   │       └── vault
│   └── inventory.yml
└── project/
    ├── playbook.yml
    ├── templates/
    ├── roles/
    └── tasks/
```

`inventory.yml`:

```yml
all:
  children:
    ungrouped:
      hosts:
        localhost: {}
    pods: {}
```

`cmdline`:

```default
--skip-tags skipme --vault-password-file /path/to/password.txt
```

`envvars`:

```yml
ANSIBLE_VAULT_PASSWORD_FILE: /secrets/vault-password.txt
ANSIBLE_DISPLAY_ARGS_TO_STDOUT: false
ANSIBLE_DISPLAY_SKIPPED_HOSTS: false
```

`settings`:

```yml
idle_timeout: 600
job_timeout: 3600
pexpect_timeout: 10
```

### Ansible vault

```yml
# vars.yml references prefixed variables in vault
username: "{{ vault_username: }}"
password: "{{ vault_password: }}"
```

```yml
# .vault contains plain text secrets and is encrypted to vault
vault_username: user1
vault_password: password1
```

```sh
cd inventory/host_vars/localhost/

# create a vars file with secrets in plain text
echo '
vault_username: user1
vault_password: password1
' > .vault
echo '.vault' > .gitignore # don't commit plain text secrets

# create vars.yml from .vault
sed -E 's/^vault_(.+:).+$/\1 "{{ vault_\1 }}"/g' .vault > vars.yml

# encrypt vault
echo -n '12345678' > /path/to/password.txt
ansible-vault encrypt --output vault \
  --vault-password-file /path/to/password.txt \
  .vault

# decrypt vault to stdout
ansible-vault decrypt --output - \
  --vault-password-file /path/to/password.txt \
  vault
```

## ArgoCD GitOps

```sh
oc get operator openshift-gitops-operator.openshift-operators
oc get argocd --all-namespaces
```

```yaml
apiVersion: operators.coreos.com/v1alpha1
kind: Subscription
metadata:
  name: openshift-gitops-operator
  namespace: openshift-operators
spec:
  channel: stable
  installPlanApproval: Automatic
  name: openshift-gitops-operator
  source: redhat-operators
  sourceNamespace: openshift-marketplace
  config:
    env:
    - name: DISABLE_DEFAULT_ARGOCD_INSTANCE
      value: "true"
    # select namespaces where instances of ArgoCD are cluster-scoped
    - name: ARGOCD_CLUSTER_CONFIG_NAMESPACES
      value:
      - argocd
```

`ArgoCD` instance:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ArgoCD
metadata:
  name: argocd # openshift-gitops by default
  namespace: argocd # openshift-gitops by default
spec:
  tls:
    ca: {}
    initialCerts:
      example.com: |
        -----BEGIN CERTIFICATE----
        ...
  initialSSHKnownHosts:
    excludedefaulthosts: true
    # ssh-keyscan HOST
    keys: |
      github.com ssh-ed25519 AAAAC3Nza...
      [git.server.com]:2022 ssh-ed25519 AAAAC3Nza...
  kustomizeBuildOptions: --load-restrictor=LoadRestrictionsNone
  resourceHealthChecks:
  - group: argoproj.io
    kind: Application
    check: |-
      hs = {}
      hs.status = "Progressing"
      hs.message = ""
      if obj.status ~= nil then
        if obj.status ~= nil then
          hs.status = obj.status.health.status
          if obj.status.status.health.message ~= nil then
            hs.message = obj.status.health.message
          end
        end
      end
      return hs
  nodePlacement:
    nodeSelector:
      node-role.kubernetes.io/infra: ""
    tolerations:
    - key: node-role.kubernetes.io/infra
      operator: Exists
      effect: NoSchedule
  rbac:
    defaultPolicy: role:readonly
    policy: |
      g, system:cluster-admins, role:admin
      g, ocp-admin, role:admin
    scopes: '[groups]'
  repo:
    env:
    - name: SSL_CERT_DIR # required for Helm
      value: /app/config/tls
    - name: XDG_CONFIG_HOME
      value: /.config
    - name: SOPS_AGE_KEY_FILE
      value: /.config/sops/age/keys.txt
    initContainers:
    - args:
      - echo "Installing KSOPS..."; cp -v ksops /custom-tools/;
      command:
      - /bin/sh
      - -c
      image: image-registry.openshift-image-registry.svc:5000/argocd/ksops:v3.0.2
      name: install-ksops
      resources: {}
      volumeMounts:
      - mountPath: /custom-tools
        name: custom-tools
    resources:
      limits:
        cpu: "1"
        memory: 1Gi
      requests:
        cpu: 250m
        memory: 256Mi
    volumeMounts:
    - mountPath: /.config/kustomize/plugin/viaduct.ai/v1/ksops/ksops
      name: custom-tools
      subPath: ksops
    - mountPath: /.config/sops/age/keys.txt
      name: sops-age
      subPath: keys.txt
    volumes:
    - emptyDir: {}
      name: custom-tools
    - name: sops-age
      secret:
        secretName: sops-age
  resourceExclusions: |
    - apiGroups:
      - tekton.dev
      clusters:
      - '*'
      kinds:
      - TaskRun
      - PipelineRun
  server:
    env:
    - name: SSL_CERT_DIR # required for Helm
      value: /app/config/tls
    autoscale:
      enabled: false
    grpc:
      ingress:
        enabled: false
    ingress:
      enabled: false
    resources:
      limits:
        cpu: 500m
        memory: 256Mi
      requests:
        cpu: 125m
        memory: 128Mi
    route:
      enabled: true
    service:
      type: ""
  applicationSet:
    resources:
      limits:
        cpu: "2"
        memory: 1Gi
      requests:
        cpu: 250m
        memory: 512Mi
    webhookServer:
      ingress:
        enabled: false
      route:
        enabled: false
  controller:
    processors: {}
    resources:
      limits:
        cpu: "2"
        memory: 2Gi
      requests:
        cpu: 250m
        memory: 1Gi
    sharding: {}
  grafana:
    enabled: false
    ingress:
      enabled: false
    resources:
      limits:
        cpu: 500m
        memory: 256Mi
      requests:
        cpu: 250m
        memory: 128Mi
    route:
      enabled: false
  ha:
    enabled: false
    resources:
      limits:
        cpu: 500m
        memory: 256Mi
      requests:
        cpu: 250m
        memory: 128Mi
  notifications:
    enabled: false
  prometheus:
    enabled: false
    ingress:
      enabled: false
    route:
      enabled: false
  redis:
    resources:
      limits:
        cpu: 500m
        memory: 256Mi
      requests:
        cpu: 250m
        memory: 128Mi
  sso:
    dex:
      openShiftOAuth: true
      resources:
        limits:
          cpu: 500m
          memory: 256Mi
        requests:
          cpu: 250m
          memory: 128Mi
    provider: dex
```

Unless the service account `<argocd-name>-argocd-application-controller` is granted `cluster-admin`, then each namespace must be labeled with `argocd.argoproj.io/managed-by=<argocd-name>`.

```sh
oc label namespace NAMESPACE argocd.argoproj.io/managed-by=argocd
```

### Application project

```yaml
apiVersion: argoproj.io/v1alpha1
kind: AppProject
metadata:
  name: example
  namespace: argocd
  finalizers:
  - resources-finalizer.argocd.argoproj.io
spec:
  clusterResourceBlacklist:
  - group: '*'
    kind: '*'
  namespaceResourceWhitelist:
  - group: '*'
    kind: '*'
  destinations:
  - namespace: example
    server: https://kubernetes.default.svc
  - namespace: example-*
    server: https://kubernetes.default.svc
  sourceRepos:
  - ssh://gitserver/*

  roles:
  - name: owner
    description: owner
    groups:
    - example
    policies:
    - p, proj:example:owners, projects, get, example, allow
    - p, proj:example:owners, applications, *, example/*, allow
  - name: viewers
    description: viewers
    groups:
    - system:authenticated
    - system:authenticated:oauth
    policies:
    - p, proj:example:viewers, projects,     get,      example,   allow
    - p, proj:example:viewers, applications, get,      example/*, allow
    - p, proj:example:viewers, applications, create,   example/*, deny
    - p, proj:example:viewers, applications, update,   example/*, deny
    - p, proj:example:viewers, applications, delete,   example/*, deny
    - p, proj:example:viewers, applications, sync,     example/*, deny
    - p, proj:example:viewers, applications, override, example/*, deny
```

### Application

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: example
  namespace: argocd
  finalizers:
  - resources-finalizer.argocd.argoproj.io
spec:
  destination:
    namespace: example
    server: https://kubernetes.default.svc
  project: example
  source:
    repoURL: ssh://gitserver/example
    path: overlays/overlay1
    targetRevision: main
  syncPolicy:
    automated:
      allowEmpty: true
      prune: true
      selfHeal: true
    syncOptions:
    - PrunePropagationPolicy=foreground
    - ApplyOutOfSyncOnly=true
    - CreateNamespace=false
    - FailOnSharedResource=true
```

> `PrunePropagationPolicy` sets the propagation policy when deleting resources with owner refernces.
>
> - `foreground`: children are deleted before the parent.
> - `background`: parent is deleted before the children.
> - `orphan`: owner references are ignored.

> `FailOnSharedResource=true` will fail a synchronization when a resource already has the label `app.kubernetes.io/instance` set to another application name.

Helm application:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: Application
metadata:
  name: helm
  namespace: argocd
spec:
  destination:
    namespace: helm
    server: https://kubernetes.default.svc
  project: helm
  sources:
  - chart: postgresql
    repoURL: quay.io/linda0/example
    targetRevision: 12.5.8
    helm:
      valueFiles:
      - $values/values.yaml
  - repoURL: ssh://gitserver/postgresql
    targetRevision: main
    ref: values
  syncPolicy:
    automated:
      allowEmpty: true
      prune: true
      selfHeal: true
    syncOptions:
    - PrunePropagationPolicy=foreground
    - ApplyOutOfSyncOnly=true
    - CreateNamespace=false
    - FailOnSharedResource=true
```

### Application set

List generator:

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: example
  namespace: argocd
spec:
  syncPolicy:
    preserveResourcesOnDeletion: true
  generators:
  - list:
      elements:
      - name: example1
        namespace: example1
        repoURL: ssh://gitserver/example1
        path: /
        targetRevision: main
  template:
    metadata:
      name: 'example-{{name}}'
      labels:
        applicationset: example
    spec:
      destination:
        namespace: '{{namespace}}'
        server: https://kubernetes.default.svc
      project: example
      source:
        repoURL: '{{repoURL}}'
        targetRevision: '{{targetRevision}}'
        path: '{{path}}'
      syncPolicy:
        automated:
          allowEmpty: true
          prune: true
          selfHeal: true
      syncOptions:
      - PrunePropagationPolicy=foreground
      - ApplyOutOfSyncOnly=true
      - CreateNamespace=false
      - FailOnSharedResource=true
```

Git generator that creates one application per directory in the Git repository. It sets destination namespace using directory name.

```yaml
apiVersion: argoproj.io/v1alpha1
kind: ApplicationSet
metadata:
  name: example
  namespace: argocd
spec:
  syncPolicy:
    preserveResourcesOnDeletion: true
  generators:
  - git:
      repoURL: ssh://gitserver/example
      revision: main
      directories:
      - path: directories/*
  template:
    metadata:
      name: 'example-{{path.basenameNormalized}}'
      labels:
        applicationset: example
    spec:
      destination:
        namespace: '{{path.basenameNormalized}}'
        server: https://kubernetes.default.svc
      project: example
      source:
        repoURL: ssh://gitserver/example # same as generator
        targetRevision: main # same as generator
        path: '{{path}}' # the directory of current generator item
      syncPolicy:
        automated:
          allowEmpty: true
          prune: true
          selfHeal: true
      syncOptions:
      - PrunePropagationPolicy=foreground
      - ApplyOutOfSyncOnly=true
      - CreateNamespace=false
      - FailOnSharedResource=true
```

### Sync hook

```yaml
apiVersion: batch/v1
kind: Job
metadata:
  name: example # recreated with same name before hook creation
  #generateName: example- # when new name is needed when creating
  annotations:
    argocd.argoproj.io/hook: PostSync
    argocd.argoproj.io/hook-delete-policy: BeforeHookCreation
  labels:
    app.openshift.io/runtime: other-linux
spec:
  completions: 1
  parallelism: 1
  backoffLimit: 0
  ttlSecondsAfterFinished: 3600
  template:
    metadata:
      labels:
        job: example
    spec:
      restartPolicy: Never
      containers:
      - name: job
        image: example:latest
        resources: {}
```

## Builds

```yaml
apiVersion: config.openshift.io/v1
kind: Build
metadata:
  name: cluster
spec:
  buildDefaults: # defaults for builds
    defaultProxy: # for image pull/push and git-clone
      httpProxy: http://proxy.example.com
      httpProxy: https://proxy.example.com
      noProxy: .example.com,svc.cluster.local,localhost,127.0.0.1
      trustedCA:
        name: proxy-trusted-ca # configmap with key ca-bundle.crt in openshift-config
    env:
    - name: EXAMPLE
      value: example # or valueFrom:
    gitProxy: # for git-clone
      httpProxy: http://proxy.example.com
      httpProxy: https://proxy.example.com
      noProxy: .example.com,svc.cluster.local,localhost,127.0.0.1
      trustedCA:
        name: proxy-trusted-ca # configmap with key ca-bundle.crt in openshift-config
    imageLabels:
    - name: TYPE
      value: UNSET
    resources:
      limits:
        cpu: 500m
        memory: 2Gi
  buildOverrides: # overrides builds
    forcePull: false # disable force pull
    imageLabels: # docker labels set on built images
    - name: CLUSTER
      value: example-0
    nodeSelector:
      runs-builds=true
    tolerations:
    - key: node-role.kubernetes.io/builder
      operator: Exists
      effect: NoSchedule
```

Build run policies (`buildconfig.spec.runPolicy`):

- `Serial`: runs one build at a time in the order they were created.
- `SerialLatestOnly`: runs one build at a time and skips everything up to latest in queue.
- `Parallel`: builds are run in parallel.

Disable access to build strategies by removing rolebindings with `create` on `builds/docker`.

```sh
oc annotate clusterrolebinding system:build-strategy-docker-binding \
  rbac.authorization.kubernetes.io/autoupdate=false --overwrite
oc annotate clusterrolebinding system:build-strategy-source-binding \
  rbac.authorization.kubernetes.io/autoupdate=false --overwrite
oc annotate clusterrolebinding system:build-strategy-jenkinspipeline-binding \
  rbac.authorization.kubernetes.io/autoupdate=false --overwrite

oc adm policy remove-cluster-role-from-group system:build-strategy-docker system:authenticated
oc adm policy remove-cluster-role-from-group system:build-strategy-source system:authenticated
oc adm policy remove-cluster-role-from-group system:build-strategy-jenkinspipeline system:authenticated
oc adm policy remove-cluster-role-from-group system:build-strategy-custom system:authenticated

# list cluster roles that contain any of the strategy resources
oc get clusterrole -o json | jq \
  '.items[] | select(
    .rules[] | .resources
    | contains(["builds/docker"])
      or contains(["builds/source"])
      or contains(["builds/jenkinspipeline"])
    )?
  | .metadata.name'

# list cluster role bindings that contain any of the strategy roles
oc get clusterrolebinding -o json | jq \
  '.items[] | select(
    .roleRef.name=="system:build-strategy-docker"
    or .roleRef.name=="system:build-strategy-source"
    or .roleRef.name=="system:build-strategy-jenkinspipeline"
  )?
  | .metadata.name'
```

### Git build

```sh
# requires image to be a S2I image
oc new-build --name git \
  NAMESPACE/IMAGESTREAM:TAG~ssh://gitserver:2022/example.git#main \
  --source-secret=source-secret --allow-missing-imagestream-tags

# requires access to git repository to generate bc
oc new-build --name git 'https://github.com/example/example.git#main' \
  --strategy=docker --dockerfile 'FROM example:latest' --allow-missing-images \
  --source-secret=source-secret --allow-missing-imagestream-tags
```

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: git
spec:
  output:
    to:
      kind: ImageStreamTag
      name: git:latest
  source:
    dockerfile: |
      FROM example:latest
      COPY ./ ./
    type: Git
    git:
      ref: main
      uri: https://github.com/example/example.git
      # clone through a proxy.
      httpProxy: http://proxy.example.com
      httpsProxy: https://proxy.example.com
      noProxy: .example.com,svc.cluster.local,localhost,127.0.0.1
    contextDir: relative/repo/path/
    sourceSecret:
      name: source-secret
  strategy:
    type: Docker
    dockerStrategy: {}
```

#### Create Git source secret

```sh
# SSH key authentication for SSH repositories
ssh-keygen -N '' -C 'ssh-source-secret' -f ./ssh-source-secret
cat ssh-source-secret.pub # add to repository server
ssh-keyscan github.com gitlab.com > known_hosts
ssh-keyscan -p 2022 gitserver.com >> known_hosts
oc create secret generic ssh-source-secret --type=kubernetes.io/ssh-auth \
  --from-file=ssh-privatekey=ssh-source-secret \
  --from-file=ssh-publickey=ssh-source-secret.pub \
  --from-literal=known_hosts=known_hosts

# SSH key authentication for SSH repositories with .gitconfig
oc create secret generic ssh-source-secret --type=kubernetes.io/ssh-auth \
  --from-file=ssh-privatekey=ssh-source-secret \
  --from-literal=known_hosts=known_hosts \
  --from-file=.gitconfig=.gitconfig

# automatically add sourceSecret on new buildconfigs when repository URL prefix matches
oc annotate secret/ssh-source-secret \
  'build.openshift.io/source-secret-match-uri-1=git://github.com:linjan2/*' \
  'build.openshift.io/source-secret-match-uri-2=ssh://gitserver.com:2022/*'

# basic authentication for HTTPS repositories
oc create secret generic https-source-secret --type=kubernetes.io/basic-auth
  --from-literal=username=USERNAME \
  --from-literal=password=PASSWORD \
  --from-file=ca-cert=ca.crt # fullchain server CA bundle (root last)

# basic authentication for HTTPS repositories with .gitconfig
oc create secret generic https-source-secret-gitconfig --type=kubernetes.io/basic-auth \
  --from-literal=username=USERNAME \
  --from-literal=password=PASSWORD \
  --from-file=ca-cert=ca.crt \
  --from-file=.gitconfig=.gitconfig

# automatically add sourceSecret on new buildconfigs when repository URL prefix matches
oc annotate secret/https-source-secret \
  'build.openshift.io/source-secret-match-uri-1=https://github.com/linjan2/*' \
  'build.openshift.io/source-secret-match-uri-2=https://*.example.com/*'

oc set build-secret --source bc/example https-source-secret
```

> Hack in `.gitconfig` to use personal access token for HTTPS Git repositories hosted on a local Azure server.
>
> ```sh
> BASIC_AUTH="$(echo -n ":${PAT}" | base64 -w0)" # <empty-username>:<personal-access-token>
> git config --file .gitconfig \
>   http.https://azure.local.extraHeader "Authorization: Basic ${BASIC_AUTH}"
> ```
>
> ```default
> [http "https://azure.internal"]
>   extraHeader = Authorization: Basic OjEyMw==
> ```

A build pod clones the git repository outside the build context into `/var/run/secrets/openshift.io/source/`, so a `.gitconfig` file can reference files at that path.

### Binary build

```sh
oc new-build --name binary --binary
oc start-build binary --from-dir=./dir --follow --wait
```

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: binary
  namespace: example
spec:
  output:
    to:
      kind: ImageStreamTag
      name: binary:latest
  source:
    binary: {}
    type: Binary
  strategy:
    type: Docker # expects Dockerfile in uploaded directory
    dockerStrategy:
      dockerfilePath: .
      forcePull: false
  runPolicy: SerialLatestOnly
  successfulBuildsHistoryLimit: 1
  failedBuildsHistoryLimit: 1
  completionDeadlineSeconds: 1800 # 30m
  resources: {}
  nodeSelector:
    key1: value1
```

### Dockerfile inline build

```sh
# additional files from ConfigMap
oc create configmap dockerignore --from-literal=$'.dockerignore=Dockerfile\n.dockerignore'

oc new-build --name dockerfile --dockerfile=- <Dockerfile --allow-missing-images \
  --build-config-map 'dockerignore:.' --build-secret 'secretname:secret-dir'
```

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: dockerfile-inline
  example: example
spec:
  output:
    to:
      kind: ImageStreamTag
      name: dockerfile-inline:latest
  source:
    type: Dockerfile
    dockerfile: |+
      FROM runtime:latest
      ARG EXAMPLE1=abc
      ENV EXAMPLE2
      WORKDIR /
      COPY ./ ./
      USER 1001:0
      CMD ["sleep", "10m"]
    configMaps:
    - configMap:
        name: dockerignore # Dockerfile
      destinationDir: .
    secrets:
    - secret:
        name: secretname
      destinationDir: secret-dir
  strategy:
    type: Docker
    dockerStrategy:
      from: # optional, overrides FROM in Dockerfile
        kind: DockerImage
        name: runtime:latest
      forcePull: false
      noCache: false
      env:
      - name: EXAMPLE1
        valueFrom:
          fieldRef: # of the build pod
            apiVersion: v1
            fieldPath: metadata.namespace
      buildArgs:
      - name: EXAMPLE2
        value: abcdefg # or valueFrom
      volumes:
      - name: vol1
        mounts: # mount point in the build context
        - destinationPath: /path/to/secret
        source:
          type: Secret
          secret:
            secretName: secretname
            optional: true
            defaultMode: 0440
            items:
            - key: item1
              mode: 0444
              path: item1
  runPolicy: SerialLatestOnly
  successfulBuildsHistoryLimit: 1
  failedBuildsHistoryLimit: 1
  resources: {}
  nodeSelector: null
```

> NOTE: volumes in `buildconfig.spec.strategy.*.volumes` can't source secrets or configmaps with the same name. This includes using two volumes from the same secret/configmap with different `items` -- even if the volume names are different. Attempting results in the following error.
>
> ```default
> spec.containers[0].volumeMounts[15].mountPath: Invalid value: "/var/run/openshift.io/volumes/NAME-user-build-volume": must be unique]
> ```

### Chained builds

Create two `BuildConfigs` where the second uses the first's output image as a "source image".

```sh
# create the first bc that produces an image including build tools and assemblies
oc new-build --name stage-1 --dockerfile=- <Dockerfile --allow-missing-images
oc cancel-build stage-1-1

# create the second bc that copies assembly files from the built image stream tag
oc new-build --name stage-2 \
  --source-image=example/stage-1:latest --source-image-path=/path/to/assemblies/.:. \
  --dockerfile - --allow-missing-images --allow-missing-imagestream-tags \
<<<'FROM runtime:latest
COPY app ./
CMD ["app"]'

# stage-2 shoud have an image trigger from stage-1 image
oc set triggers bc/stage-2
# otherwise, set trigger
oc set triggers bc/stage-2 --from-image=example/stage-1:latest

oc start-build stage-1
```

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: stage-2
spec:
  output:
    to:
      kind: ImageStreamTag
      name: stage-2:latest
  source:
    type: Image
    dockerfile: |
      FROM runtime:latest
      COPY app ./
      CMD ["app"]
    images:
    - from:
        kind: ImageStreamTag
        name: test:latest
      paths:
        # copy assemblies to context dir (relative to Dockerfile)
      - destinationDir: .
        sourcePath: /path/to/assemblies/.
  strategy:
    type: Docker
    dockerStrategy: {}
```

### Source-to-image (S2I/STI)

An S2I image contains scripts at `/usr/libexec/s2i/` (or where specified with image labels `io.openshift.s2i.scripts-url`/`io.s2i.scripts-url` or image environment variables `STI_SCRIPTS_URL`/`STI_SCRIPTS_PATH`).

The scripts can be overridden by scripts in the `.s2i/bin/` folder of the source code.

```default
./
├── build.sh
└── .s2i/
    └── bin/
        ├── assemble
        ├── run
        └── save-artifacts
```

```sh
# .s2i/bin/assemble
set -o xtrace
shopt -s dotglob # include files beginning with '.' in pathname expansion

# restore artifacts committed into build image
if [ -d /tmp/artifacts ]
then
  echo '---> Restoring artifacts...'
  mv --verbose /tmp/artifacts/* ./ || :
fi

if [ -d /tmp/src ]
then
  echo '---> Building...'
  mv --verbose /tmp/src/* ./ || :
  ./build.sh --output ./assemblies/
fi
```

```sh
# .s2i/bin/run
echo '---> Running...'
exec ./assemblies/app
```

```sh
# .s2i/bin/save-artifacts
# output artifacts as tar archive to stdout
if [ -d /path/to/artifacts ]; then
  tar -c -C /path/to/artifacts -f - .
fi
```

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: example
spec:
  output:
    to:
      kind: ImageStreamTag
      name: example:latest
    imageLabels:
    - name: io.openshift.s2i.scripts-url
      value: image:///usr/libexec/s2i
    - name: io.openshift.s2i.assemble-user
      value: '1001'
    - name: io.k8s.display-name
      value: Example
    - name: io.k8s.description
      value: Example s2i
    - name: io.openshift.tags
      value: builder,example
  source:
    type: Git
    git:
      uri: ssh://gitserver.com:2022/example.git
      ref: main
  strategy:
    type: Source
    sourceStrategy:
      from:
        kind: ImageStreamTag
        name: s2-ibuilder:latest
        namespace: example
      incremental: true # runs save-artifacts and mounts artifact files back for assemble
      scripts: ''
      env:
      - name: BUILD_LOGLEVEL
        value: '5'
  runPolicy: SerialLatestOnly
  successfulBuildsHistoryLimit: 1
  failedBuildsHistoryLimit: 2
  resources: {}
```

### Build pull/push authentication

When pulling/pushing with image streams, the `builder` serviceaccount needs a rolebinding with `system:image-puller`/`system:image-pusher` in the namespace where the image stream is.

```sh
# let builds in namespace "example" pull from image streams in namespace "source"
oc create rolebinding image-pullers -n source \
  --clusterrole=system:image-puller --serviceaccount=example:builder

# let builds in namespace "example" push to image streams in namespace "destination"
oc create rolebinding image-pushers -n destination \
  --clusterrole=system:image-pusher --serviceaccount=example:builder
```

When pulling/pushing using external image registries, the `BuildConfig` needs a `Secret` set for its pull/push secret fields.

```sh
oc create secret generic registry-secret \
  --from-file=.dockerconfigjson=/path/to/config.json \
  --type=kubernetes.io/dockerconfigjson

oc new-build --name example \
  --dockerfile=- <Dockerfile --allow-missing-images \
  --to-docker --to=docker.io/example/example:latest \
  --push-secret=registry-secret

# set both pull and push secret to Secret "registry-secret"
oc set build-secret --pull --push bc/example registry-secret
```

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
metadata:
  name: example
spec:
  output:
    to:
      kind: DockerImage
      name: docker.io/example/example:latest
    pushSecret:
      name: registry-secret
  source:
    type: Dockerfile
    dockerfile: |
      FROM registry.access.redhat.com/ubi9-minimal:latest
      USER 1001:0
      ENTRYPOINT []
      CMD [ "sleep", "5m" ]
  strategy:
    type: Docker
    dockerStrategy:
      pullSecret:
        name: registry-secret
  mountTrustedCA: true
  runPolicy: SerialLatestOnly
  failedBuildsHistoryLimit: 1
  successfulBuildsHistoryLimit: 1
```

> If `BuildConfig.spec.output` is empty (`null` or `{}`), then the image isn't pushed at the end of the build.

### Build hooks

```sh
# set post build hook
oc set build-hook bc/example --post-commit --command -- ./self-test.sh arg1
oc set build-hook bc/example --post-commit --script './self-test.sh arg1'
```

```yaml
apiVersion: build.openshift.io/v1
kind: BuildConfig
spec:
  postCommit:
    script: ./self-test.sh arg1
    # --- or ---
    command: [./self-test.sh]
    args: [arg1]
```

```sh
oc create secret generic webhook-secret --from-literal="WebHookSecretKey=${SECRET}"

curl $(oc whoami --show-server)/apis/build.openshift.io/v1/namespaces/${NAMESPACE}/buildconfigs/${BUILDCONFIG}/webhooks/${SECRET}/github
  -H "X-GitHub-Event: push" -H "Content-Type: application/json" \
  -k -X POST --data-binary @payload.json \
```

```sh
# set generic start-build webhook
oc set triggers bc/example --from-webhook
oc set triggers bc/example --from-webhook --remove
oc set triggers bc/example --from-webhook-allow-env
# get all generic secrets
oc get bc/example -o jsonpath='{.spec.triggers[*].generic.secret}'

# trigger generic webhook
BUILDCONFIG=example
SECRET=pkT9nMUC5mwraJ9Y4661

# trigger as POST
curl $(oc whoami --show-server)/apis/build.openshift.io/v1/namespaces/$(oc project --short)/buildconfigs/${BUILCONFIG}/webhooks/${SECRET}/generic \
  -X POST

# trigger with env overrides
curl $(oc whoami --show-server)/apis/build.openshift.io/v1/namespaces/$(oc project --short)/buildconfigs/${BUILCONFIG}/webhooks/${SECRET}/generic \
  -X POST -H "Authorization: Bearer $(oc whoami --show-token)" \
  -H 'Content-Type: application/json' --data '{"env":[{"name":"EXAMPLE", "value":"abc"}]}'
```

The webhook secret can be set from a `Secret` resource instead of inline in the `BuildConfig`.

```sh
oc create secret generic bc-webhook --from-literal=WebHookSecretKey=pkT9nMUC5mwraJ9Y4661

oc patch bc/example --type=json --patch '
- op: add
  path: /spec/triggers/-
  value:
    type: Generic
    generic:
      secretReference:
        name: bc-webhook
      allowEnv: true'
```

