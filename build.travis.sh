#!/bin/bash
if [[ $TRAVIS_COMMIT_MESSAGE == *"[skip build]"* ]]
then
	echo "Skipping build stage"
	# We simply pull existing version instead of really build it
	# Indeed we cannot really skip the build otherwise the deploy step will fail due to missing artefacts
	docker pull kalisio/kapp
fi

source env.travis.sh
docker-compose -f docker-compose.yml up -d
docker cp kapp:/opt/kapp/dist dist
docker login -u="$DOCKER_USER" -p="$DOCKER_PASSWORD"
docker tag kalisio/kapp kalisio/kapp:${FLAVOR}
docker push kalisio/kapp:${FLAVOR}

