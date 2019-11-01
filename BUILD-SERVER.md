# BUILD SERVER

The build server uses a lightweight operating system meant for a docker build farm called RancherOS.

## Install RancherOS

### Prepare cloud-config.yml for RancherOS

Create a gist or pastebin like the below:

```yaml
#cloud-config
ssh_authorized_keys:
  - ssh-rsa … <your workstation's ~/.ssh/id_ed25519.pub>
rancher:
  console: ubuntu
  # https://rancher.com/docs/os/v1.x/en/installation/configuration/switching-consoles/
```

### Boot into RancherOS

1. Download rancheros.iso from (https://rancher.com/docs/os/v1.x/en/installation/running-rancheros/workstation/boot-from-iso/)
2. Use balenaEtcher (https://www.balena.io/etcher/) to make a bootable USB Flash disk.
3. Boot into RancherOS Installer from the flash disk (Enable Legacy Boot)

```bash
# Install RancherOS to Disk: /dev/sda
sudo ros install -t gptsyslinux -c https://bit.ly/ros-cloud-config2 -d /dev/sda -s --append "rancher.autologin=tty1 rancher.autologin=ttyS0”
# Reboot
# Wait for RancherOS to reboot from /dev/sda
ip addr # Note the ip address to SSH into.
```

## Configure RancherOS

SSH into rancher server.

```bash
ssh rancher@<ip address> # From your workstation
```

### Docker-over-TLS on RancherOS

This allows remote docker builds.

```bash
ssh rancher@<ip address> # From your workstation
sudo ros config set rancher.docker.tls true
sudo ros tls gen --server -H rancher.localdomain -H 192.168.20.5
sudo system-docker restart docker
sudo ros tls gen
docker --tlsverify version
exit
scp rancher@<ip address>:~/.docker ~/.docker # From your workstation
```

Done. No reboot is required.

### OpenBalena on RancherOS

openBalena allows automatically updating docker images on embedded devices. It works as a private docker registry and a remote log aggregator.

```bash
git clone https://github.com/balena-io/open-balena.git ~/open-balena

# Restore config & certs (if required)
scp openbalena_config.tar.xz rancher@<ip address>:~ # From your workstation
tar -xvf openbalena_config.tar.xz -C ~/open-balena/config
# Generate new certs (if required)
./scripts/quickstart -U raspi@blockchainzoo.com -P login123 -d raspi.zoobc.org

# Restore database backup (if required)
scp openbalena_db.tar.xz rancher@<ip address>:~ # From your workstation
tar -xvf openbalena_db.tar.xz -C /var/lib/docker/volumes/openbalena_db/_data

# Install Docker-compose
sudo curl -L https://github.com/docker/compose/releases/download/1.24.0/docker-compose-Linux-x86_64 -o /usr/local/bin/docker-compose
sudo chmod +x /usr/local/bin/docker-compose

# Start openBalena
cd ~/open-balena
docker-compose --version
./scripts/compose up -d
```

Add these lines to `/var/lib/rancher/conf/cloud-config.d/user_config.yml`

```yaml
write_files:
  - path: /etc/rc.local
    permissions: '0755'
    owner: root
    content: |
      #!/bin/bash
      ### OpenBalena service
      if [ -f /home/rancher/open-balena/scripts/compose ]; then
        # Install docker-compose
        if [ ! -f /usr/local/bin/docker-compose ]; then
          curl -L https://github.com/docker/compose/releases/download/1.24.0/docker-compose-Linux-x86_64 -o /usr/local/bin/docker-compose
          chmod +x /usr/local/bin/docker-compose
        fi
        # Start docker containers
        wait-for-docker
        sudo -u rancher /home/rancher/open-balena/scripts/compose up -d
      fi
```

Done. Reboot to make sure everything is working.

### BalenaCLI on RancherOS

Installing the balena command line locally would help you manage devices.

## Standalone Zip Package

1. Download the latest zip file from the [balena-cli releases page](https://github.com/balena-io/balena-cli/releases).
   Look for a file name that ends with the word "standalone", for example:
   `balena-cli-v10.13.6-linux-x64-standalone.zip`
   `balena-cli-v10.13.6-macOS-x64-standalone.zip`
   `balena-cli-v10.13.6-windows-x64-standalone.zip`
2. Extract the zip file contents to `/opt/balena-cli`.
3. Add the `balena-cli` folder to the system's `PATH` environment variable.

   ```bash
   cp ~/open-balena/config/certs/root/ca.crt ~/.balena.crt
   cat <<-EOF > ~/.profile
   export PATH="$PATH:/opt/balena-cli"
   export BALENARC_BALENA_URL="raspi.zoobc.org"
   export NODE_EXTRA_CA_CERTS="$HOME/.balena.crt"
   EOF
   ```

   More instructions for:
   [Linux](https://stackoverflow.com/questions/14637979/how-to-permanently-set-path-on-linux-unix) | [macOS](https://www.architectryan.com/2012/10/02/add-to-the-path-on-mac-os-x-mountain-lion/#.Uydjga1dXDg) | [Windows](https://www.computerhope.com/issues/ch000549.htm)

> _If you are using macOS Catalina (10.15), [check this known issue and
> workaround](https://github.com/balena-io/balena-cli/issues/1479)._

### Avahi on RancherOS

Avahi is required for "*.local" name resolution to work correctly. This is required for `balena ssh <uuid>.local` to work.

```bash
ssh rancher@<ip address> # From your workstation
sudo apt update
sudo apt install -y libnss-mdns
cat /etc/nsswitch.conf
# Ensure that mdns4_minimal [NOTFOUND=return] is inserted into hosts
# hosts: files mdns4_minimal [NOTFOUND=return] dns
```

Add these lines to `/var/lib/rancher/conf/cloud-config.d/user_config.yml`

```yaml
rancher:
  services:
    avahi-daemon:
      image: solidnerd/avahi
      labels:
        io.rancher.os.scope: system
        #io.rancher.os.after: network
      volumes:
        - /etc/avahi:/etc/avahi
      restart: always
      net: host
      volumes_from:
        - system-volumes
    avahi-config:
      image: solidnerd/avahi
      labels:
        io.rancher.os.scope: system
      volumes:
        - /etc/avahi:/etc/avahi2
      restart: on-failure
      entrypoint: 'sh'
      command: ['-c', 'sed -i "/enable-dbus=/c\enable-dbus=no" /etc/avahi/avahi-daemon.conf && cp -u /etc/avahi/avahi-daemon.conf /etc/avahi2/avahi-daemon.conf']
write_files:
  - path: /etc/rc.local
    permissions: '0755'
    owner: root
    content: |
      #!/bin/bash
      ### Avahi service
      wait-for-network () {
        while ! curl -o /dev/null -sf https://index.docker.io/; do
          echo "wait for network init (docker.io)"
          sleep 1s
        done
      }
      # https://github.com/rancher/os/issues/2882#issuecomment-532579763
      if [ -z "$(ros service ps | awk '/^avahi-daemon/{print $1}')" ]; then
        wait-for-network
        ros service up avahi-config avahi-daemon
      fi
      ### OpenBalena service
      if [ -f /home/rancher/open-balena/scripts/compose ]; then
        # Install docker-compose
        if [ ! -f /usr/local/bin/docker-compose ]; then
          curl -L https://github.com/docker/compose/releases/download/1.24.0/docker-compose-Linux-x86_64 -o /usr/local/bin/docker-compose
          chmod +x /usr/local/bin/docker-compose
        fi
        # Start docker containers
        wait-for-docker
        sudo -u rancher /home/rancher/open-balena/scripts/compose up -d
      fi
```

Done. Reboot.
