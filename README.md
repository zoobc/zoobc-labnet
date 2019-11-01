# zoobc-labnet

## List Devices via mDNS

mDNS is used for discovering devices on the local network by their hostname. Please ensure it is working on your machine.

- MacOS: dns-sd is preinstalled
- Linux: Ensure avahi-daemon & libnss-mdns is preinstalled
- Windows 10: mDNS is supported out of the box
- Older Windows versions: Download and install https://support.apple.com/kb/DL999

*MacOS:*

```sh
dns-sd -B _ssh._tcp
#dns-sd -B _ssh._tcp | awk '{ print $7 ".local" }'
dns-sd -G v4v6 ae1c71f.local
```

*Linux:*

```sh
sudo apt install -y libnss-mdns
cat /etc/nsswitch.conf
# Ensure that mdns4_minimal [NOTFOUND=return] is inserted into `hosts:` after `file`
# hosts: files mdns4_minimal [NOTFOUND=return] dns

avahi-browse _ssh._tcp
avahi-resolve-host-name ae1c71f.local
```

*Windows:*

```sh
nslookup ae1c71f.local
```

## Connect to Device

```sh
ssh root@0ab8085.local
ls /data/zoobc-core
stop main # Stop main node
start main # Start main node
stop n2 # Stop n2 node
start n2 # Start n2 node
stop n3 # Stop n3 node
start n3 # Start n3 node
```

## Sync configuration to device

```sh
# Single device
export RSYNC_RSH='ssh -p 22222'
rsync -av zoobc-core/resource_cluster/ root@0ab8085.local:/docker/volumes/2_resin-data/_data/zoobc-core/
#rsync -av --delete zoobc-core/resource_cluster/ root@0ab8085.local:/docker/volumes/2_resin-data/_data/zoobc-core/

# All devices
export RSYNC_RSH='ssh -p 22 -o StrictHostKeyChecking=no'
balena devices | awk '{print $2}' | tail -n +2 | xargs -I{} rsync -av resource_cluster/ root@{}.local:/data/zoobc-core/
#balena devices | awk '{print $2}' | tail -n +2 | xargs -I{} rsync -av --delete resource_cluster/ root@{}.local:/data/zoobc-core/
```

## Reset & Restart nodes

```sh
balena devices | awk '{print $2}' | tail -n +2 | xargs -I{} ssh -o StrictHostKeyChecking=no root@{}.local "source .profile && stop main && rm -rf /data/zoobc-core/main && cat /data/zoobc-core/config_main.toml && start main"
balena devices | awk '{print $2}' | tail -n +2 | xargs -I{} ssh -o StrictHostKeyChecking=no root@{}.local "source .profile && stop n2 && rm -rf /data/zoobc-core/n2 && cat /data/zoobc-core/config_n2.toml && start n2"
```

## Install Balena CLI

Note: Balena CLI is only required for device bootstrapping, and fetching remote logs.

- *Windows or Mac:*

  Run installer from https://github.com/balena-io/balena-cli/blob/master/INSTALL.md

- *Linux:*
  (Also applies to Mac or Windows with no admin-level access)

  1. Download the latest zip file from the [balena-cli releases page](https://github.com/balena-io/balena-cli/releases).
    Look for a file name that ends with the word "standalone", for example:
    `balena-cli-v10.13.6-linux-x64-standalone.zip`
    `balena-cli-v10.13.6-macOS-x64-standalone.zip`
    `balena-cli-v10.13.6-windows-x64-standalone.zip`
  2. Extract the zip file contents to `/opt/balena-cli`.
  3. Add the `balena-cli` folder to the system's `PATH` environment variable.

    ```bash
    cat <<-EOF >> ~/.bash_profile
    export PATH="$PATH:/opt/balena-cli"
    EOF
    ```

    See PATH instructions for: [Linux](https://stackoverflow.com/questions/14637979/how-to-permanently-set-path-on-linux-unix) | [macOS](https://www.architectryan.com/2012/10/02/add-to-the-path-on-mac-os-x-mountain-lion/#.Uydjga1dXDg) | [Windows](https://www.computerhope.com/issues/ch000549.htm)

  > _If you are using macOS Catalina (10.15), [check this known issue and
  > workaround](https://github.com/balena-io/balena-cli/issues/1479)._

- *Other OS:*

  ```sh
  sudo apt install g++ make git
  curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
  nvm install v10
  bash
  npm install balena-cli -g --production --unsafe-perm
  ```

## Configuring Balena CLI

Configure balena-cli to point towards the local openBalena instance (instead of the balena cloud).

If you would like to use the free balena cloud service, you can skip this step.

```sh
wget -O ~/.balena.crt https://raw.githubusercontent.com/zoobc/zoobc-labnet/master/balena-ca.crt
#echo 'balenaUrl: "raspi.zoobc.org"' > ~/.balenarc.yml
cat <<-EOF >> ~/.bash_profile
  export BALENARC_BALENA_URL="raspi.zoobc.org"
  export NODE_EXTRA_CA_CERTS="$HOME/.balena.crt"
  EOF
```

### Configuring Private Docker registry

Note: Only required if building new docker images locally, instead of using the build server.

Allows docker daemon to connect to the local docker registry (instead of dockerhub).

```sh
sudo mkdir -p /etc/docker/certs.d/registry.raspi.zoobc.org
sudo cp ~/balena-ca.crt /etc/docker/certs.d/registry.raspi.zoobc.org/ca.crt
#sudo cp ~/balena-ca.crt /usr/local/share/ca-certificates/ca.crt && sudo update-ca-certificates
sudo systemctl restart docker
docker version
```

### List Devices via Balena CLI

```sh
export BALENARC_BALENA_URL="raspi.zoobc.org"
export NODE_EXTRA_CA_CERTS="$HOME/balena-ca.crt"
balena login # Choose Credentials (raspi@blockchainzoo.com:login123)
balena devices
balena devices | tail -n +2 | awk '{ print $2 ".local" }'
```

## Build & Deploy

### Build & Deploy on Remote Docker Daemon

```sh
git clone https://github.com/zoobc/zoobc-labnet.git
cd zoobc-labnet
./deploy.sh
```

### Build & Deploy on Local Workstation

```sh
git pull
git submodule update --init --remote
balena apps
balena deploy zbcDev --build --logs
```

### Build locally without Deploying

```sh
# Build without deploy (for raspberrypi3)
balena build --deviceType raspberrypi3 --arch armv7hf --logs
# Build without deploy (for intel)
balena build --deviceType intel-nuc --arch amd64 --logs
# More architectures here: https://www.balena.io/docs/reference/base-images/devicetypes/
```

## Deploy new Embedded device

Download a development image for your embedded device from here:
https://www.balena.io/os/#download

```sh
balena apps
balena os configure ~/Downloads/balenaos.img --app zbcDev
```

Use balenaEtcher (https://www.balena.io/etcher/) to flash `balena.img` to an SD-card or Boot Flashdisk.

We will be supporting standalone non-managed devices in the future (if you do not want to use the free balena cloud or openBalena service).

## Deploy new Build server

See [BUILD-SERVER.md](./BUILD-SERVER.md) for instructions.
