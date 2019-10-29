#!/bin/sh
docker volume create prometheus-data || true
sudo chmod 777 /var/lib/docker/volumes/prometheus-data/_data
sudo cp -u ./targets.json /var/lib/docker/volumes/prometheus-data/_data/
if [ ! -f /var/lib/docker/volumes/prometheus-data/_data/prometheus.yml ]; then
  sudo cp ./prometheus.yml /var/lib/docker/volumes/prometheus-data/_data/
fi
sudo nano /var/lib/docker/volumes/prometheus-data/_data/prometheus.yml
docker run -d --restart=always --name=prometheus -p 9090:9090 -v prometheus-data:/prometheus prom/prometheus --config.file=/prometheus/prometheus.yml
