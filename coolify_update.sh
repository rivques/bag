# Deploy to Google Cloud Platform
sudo docker build -t bag .
docker tag bag rivqueshc/bag:latest
docker push rivqueshc/bag:latest
echo "PUSHED! Now go to Coolify and hit Deploy on bag-api."
echo "If you just ran out of storage space thgen run \"sudo docker system prune -a -f\"."
