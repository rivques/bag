# Deploy to Google Cloud Platform
sudo docker build -t bag .
docker tag bag ghcr.io/hackclub/bag/bag:latest
docker push ghcr.io/hackclub/bag/bag:latest