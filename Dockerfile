FROM --platform=linux/arm64 octave:latest
WORKDIR /golem/work
VOLUME /golem/work
COPY Dockerfile /golem/info/description.txt
COPY Dockerfile /golem/work/info.txt
