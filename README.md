# zoobc-labnet

## List Devices via mDNS
mDNS is used for discovering devices on the local network by their hostname. Please ensure it is working on your machine.

- MacOS: dns-sd is preinstalled
- Ubuntu: avahi-daemon is preinstalled
- Windows 10: mDNS is supported out of the box
- Older Windows versions: Download and install https://support.apple.com/kb/DL999

MacOS:
```sh
dns-sd -B _ssh._tcp
#dns-sd -B _ssh._tcp | awk '{ print $7 ".local" }'
dns-sd -G v4v6 ae1c71f.local
```

Linux:
```sh
avahi-browse --resolve _ssh._tcp
avahi-resolve-host-name ae1c71f.local
```

Windows:
```sh
nslookup ae1c71f.local
```
## Connect to Device
```sh
ssh root@0ab8085.local
ls /data/zoobc-core
stop main # Start main node
start main # Stop main node
restart main # Restart main node
restart n2 # Restart n2 node
restart n2 # Restart n3 node
```

## Sync data to device
```sh
export RSYNC_RSH='ssh -p 22222'
rsync -av zoobc-core/resource/ root@0ab8085.local:/docker/volumes/2_resin-data/_data/zoobc-core/
rsync -av --delete zoobc-core/resource/ root@0ab8085.local:/docker/volumes/2_resin-data/_data/zoobc-core/
```

## Install Balena CLI
Note: Balena CLI is only required for device bootstrapping, and checking logs remotely.

- Windows or Mac: https://github.com/balena-io/balena-cli/blob/master/INSTALL.md
- Linux: Build using the commands below
```sh
sudo apt install g++ make git
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
nvm install v10
bash
npm install balena-cli -g --production --unsafe-perm
```

## Configuring Balena CLI
Configure balena-cli to point towards the local openBalena instance (instead of the cloud).

```sh
wget -O ~/balena-ca.crt https://raw.githubusercontent.com/zoobc/zoobc-labnet/master/balena-ca.crt
echo >> ~/.bashrc
echo 'export NODE_EXTRA_CA_CERTS="$HOME/balena-ca.crt"' >> ~/.bashrc
echo 'balenaUrl: "raspi.zoobc.org"' > ~/.balenarc.yml
```

### Configuring Private Docker registry
Note: Only required if building new docker images.
Allows docker to connect to the local docker registry (instead of dockerhub).

```sh
sudo mkdir -p /etc/docker/certs.d/registry.raspi.zoobc.org
sudo cp ~/balena-ca.crt /etc/docker/certs.d/registry.raspi.zoobc.org/ca.crt
#sudo cp ~/balena-ca.crt /usr/local/share/ca-certificates/ca.crt
#sudo update-ca-certificates
sudo systemctl restart docker
docker version
```

### List Devices via Balena CLI ###
```sh
export NODE_EXTRA_CA_CERTS="$HOME/balena-ca.crt"
balena login # Choose Credentials (raspi@blockchainzoo.com:login123)
balena devices
balena devices | tail -n +2 | awk '{ print $2 ".local" }'
```

## Build & Deploy
```sh
git submodule update --init --remote
balena apps
balena deploy zbcDev --build --logs
```

### Build without Deploying
```sh
# Build without deploy (for raspberrypi3)
balena build --deviceType raspberrypi3 --arch armv7hf --logs
# Build without deploy (for intel)
balena build --deviceType intel-nuc --arch amd64 --logs
# More architectures here: https://www.balena.io/docs/reference/base-images/devicetypes/
```

