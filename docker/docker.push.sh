#!/bin/bash

VERSION=latest
DOCKER_REGISTRY=peejayaccts

#start local docker registry
docker run -d -p 5000:5000 --name registry --restart=always registry:2
#docker push $DOCKER_REGISTRY/sms-api:$VERSION 
#docker push $DOCKER_REGISTRY/email-api:$VERSION 
#docker push $DOCKER_REGISTRY/fb-api:$VERSION 

#docker push $DOCKER_REGISTRY/sms-subscriber:$VERSION
docker push $DOCKER_REGISTRY/email-subscriber:$VERSION
#docker push $DOCKER_REGISTRY/fb-subscriber:$VERSION

#stop local docker registry
#docker container stop registry && docker container rm -v registry