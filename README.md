# zoobc-labnet


### Install Balena CLI ###
```sh
sudo apt install g++ make git
curl -o- https://raw.githubusercontent.com/nvm-sh/nvm/v0.34.0/install.sh | bash
nvm install v10
bash
npm install balena-cli -g --production --unsafe-perm
```

### Configuring Balena CLI ###
```sh
wget -O ~/balena-ca.crt https://raw.githubusercontent.com/zoobc/zoobc-labnet/master/balena-ca.crt
echo >> ~/.bashrc
echo 'export NODE_EXTRA_CA_CERTS="$HOME/balena-ca.crt"' >> ~/.bashrc
echo 'balenaUrl: "raspi.zoobc.org"' > ~/.balenarc.yml
```

### Configuring Private Docker registry ###
```sh
sudo mkdir -p /etc/docker/certs.d/registry.raspi.zoobc.org
sudo cp ~/balena-ca.crt /etc/docker/certs.d/registry.raspi.zoobc.org/ca.crt
sudo cp ~/balena-ca.crt /usr/local/share/ca-certificates/ca.crt
sudo update-ca-certificates
sudo systemctl restart docker
docker version
```
### Check Balena CLI ###
```sh
export NODE_EXTRA_CA_CERTS="$HOME/balena-ca.crt"
balena login # Choose Credentials (raspi@blockchainzoo.org:login123)
balena apps
balena devices
```

### Test mDNS (dns-sd/bonjour/avahi) ###
- MacOS: dns-sd is preinstalled
- Ubuntu: avahi-daemon is preinstalled
- Windows 10: mDNS is supported out of the box
- Older Windows versions: Download and install https://support.apple.com/kb/DL999

```sh
dns-sd -G v4 cce2597.local
avahi-resolve-host-name cce2597.local
nslookup cce2597.local
```

### Build & Deploy ###
```sh
git submodule update --init --remote
# OR...
# ln -sf $GOPATH/src/github.com/zoobc/zoobc-core
```

```sh
balena deploy zbcDev --build --logs
```

```sh
# Build without deploy (WARNING: only builds for raspberrypi)
balena build --deviceType raspberrypi3 --arch armv7hf --logs
# More architectures here: https://www.balena.io/docs/reference/base-images/devicetypes/
```

