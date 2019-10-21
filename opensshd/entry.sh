#!/bin/sh

# prepare data dir
if [ ! -d "/data/ssh" ]; then
	mkdir -p /data/ssh
fi

if [ ! -f "/data/ssh/ssh_host_ed25519_key" ]; then
	# generate fresh ed25519 key
	ssh-keygen -f /data/ssh/ssh_host_ed25519_key -N '' -t ed25519
fi
if [ ! -f "/data/ssh/ssh_host_rsa_key" ]; then
	# generate fresh rsa key
	ssh-keygen -f /data/ssh/ssh_host_rsa_key -N '' -t rsa
fi
if [ ! -f "/data/ssh/ssh_host_dsa_key" ]; then
	# generate fresh dsa key
	ssh-keygen -f /data/ssh/ssh_host_dsa_key -N '' -t dsa
fi

if [ ! -f "/etc/ssh/ssh_host_ed25519_key" ]; then
	ln -sf /data/ssh/ssh_host_ed25519_key /etc/ssh/ssh_host_ed25519_key
fi
if [ ! -f "/etc/ssh/ssh_host_rsa_key" ]; then
	ln -sf /data/ssh/ssh_host_rsa_key /etc/ssh/ssh_host_rsa_key
fi
if [ ! -f "/etc/ssh/ssh_host_dsa_key" ]; then
	ln -sf /data/ssh/ssh_host_dsa_key /etc/ssh/ssh_host_dsa_key
fi

# prepare run dir
if [ ! -d "/var/run/sshd" ]; then
	mkdir -p /var/run/sshd
fi

#exec "$@" -h "/data/ssh/ssh_host_ed25519_key" -h "/data/ssh/ssh_host_rsa_key" -h "/data/ssh/ssh_host_dsa_key"
exec "$@"
