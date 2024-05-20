# gnuoctave/build-octave

# Please follow docker best practices
# https://docs.docker.com/engine/userguide/eng-image/dockerfile_best-practices/

# Docker images to build GNU Octave <https://www.octave.org>.


#FROM  ubuntu:22.04
#LABEL maintainer="Kai T. Ohlhus <k.ohlhus@gmail.com>"
FROM   debian:bookworm-slim
LABEL  maintainer="GooseBerry"

ENV LAST_UPDATED=2024-05-19


# Install security updates and required packages.

RUN apt-get --yes update  && \
    apt-get --yes upgrade && \
    DEBIAN_FRONTEND="noninteractive" \
    apt-get --no-install-recommends --yes install \
      curl \
      gperf \
      gzip \
      info \
      less \
      locales \
      openssh-client \
      perl \
      sudo \
      tar \
      unzip \
      wget \
      zip                        && \
    apt-get --yes clean          && \
    apt-get --yes autoremove     && \
    rm -Rf /var/lib/apt/lists/*

# Original list of packages
#    apt-get --no-install-recommends --yes install \
#      autoconf \
#      automake \
#      bison \
#      build-essential \
#      clang \
#      cmake \
#      curl \
#      dbus \
#      epstool \
#      fig2dev \
#      flex \
#      fonts-noto-cjk \
#      fonts-noto-color-emoji \
#      fonts-noto-mono \
#      g++ \
#      gcc \
#      gfortran \
#      git \
#      gnuplot \
#      gperf \
#      gzip \
#      icoutils \
#      info \
#      less \
#      libcurl4-gnutls-dev \
#      libfftw3-dev \
#      libfltk1.3-dev \
#      libfontconfig1-dev \
#      libfreetype6-dev \
#      libgl1-mesa-dev \
#      libgl2ps-dev \
#      libgmp-dev \
#      libgnutls28-dev \
#      libgpgme-dev \
#      libgraphicsmagick++1-dev \
#      libhdf5-dev \
#      libmpfr-dev \
#      libosmesa6-dev \
#      libpcre3-dev \
#      libqhull-dev \
#      libqscintilla2-qt5-dev \
#      libqt5opengl5-dev \
#      libreadline-dev \
#      librsvg2-bin \
#      libseccomp-dev \
#      libsndfile1-dev \
#      libssl-dev \
#      libtool \
#      libxft-dev \
#      locales \
#      lpr \
#      lzip \
#      make \
#      mercurial \
#      openjdk-11-jdk \
#      openssh-client \
#      perl \
#      pkg-config \
#      portaudio19-dev \
#      pstoedit \
#      python3-pip \
#      qtbase5-dev \
#      qttools5-dev \
#      qttools5-dev-tools \
#      ssh-askpass \
#      sudo \
#      tar \
#      texinfo \
#      texlive-latex-extra \
#      unzip \
#      wget \
#      xvfb \
#      zlib1g-dev \
#      zip                        && \
#    pip3 install --upgrade --no-cache-dir \
#      pip                           \
#      sympy                      && \
#

RUN echo "en_US.UTF-8 UTF-8" > /etc/locale.gen && \
    locale-gen


# Configure environment

ENV SHELL=/bin/bash \
    LC_ALL=en_US.UTF-8 \
    LANG=en_US.UTF-8 \
    LANGUAGE=en_US.UTF-8 \
    JAVA_HOME=/usr/lib/jvm/java-11-openjdk-amd64


# Install OpenBLAS

#RUN OPENBLAS_VERSION=0.3.25 && \
#    mkdir -p /tmp/build     && \
#    cd       /tmp/build     && \
#    wget -q "https://github.com/xianyi/OpenBLAS/archive/v${OPENBLAS_VERSION}.tar.gz" && \
#    tar -xf    v${OPENBLAS_VERSION}.tar.gz  && \
#    cd OpenBLAS-${OPENBLAS_VERSION}         && \
#    make -j8             \
#      BINARY=64          \
#      INTERFACE64=1      \
#      DYNAMIC_ARCH=1     \
#      DYNAMIC_OLDER=1    \
#      CONSISTENT_FPCSR=1 \
#      USE_THREAD=1       \
#      USE_OPENMP=1       \
#      NUM_THREADS=256 && \
#    make install         \
#      PREFIX=/usr     && \
#    rm -rf /tmp/build


# Install SuiteSparse

#RUN SUITE_SPARSE_VERSION=5.10.1 && \
#    mkdir -p /tmp/build         && \
#    cd       /tmp/build         && \
#    wget -q "https://github.com/DrTimothyAldenDavis/SuiteSparse/archive/v${SUITE_SPARSE_VERSION}.tar.gz"  && \
#    tar -xf       v${SUITE_SPARSE_VERSION}.tar.gz  && \
#    cd SuiteSparse-${SUITE_SPARSE_VERSION}         && \
#    export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/tmp/build/SuiteSparse-'"${SUITE_SPARSE_VERSION}"'/lib  && \
#    make library                               \
#      LAPACK=                                  \
#      BLAS=-lopenblas                          \
#      UMFPACK_CONFIG=-D'LONGBLAS=long'         \
#      CHOLMOD_CONFIG=-D'LONGBLAS=long'         \
#      LDFLAGS='-L/tmp/build/SuiteSparse-'"${SUITE_SPARSE_VERSION}"'/lib'  && \
#    make install                               \
#      INSTALL=/usr                             \
#      INSTALL_INCLUDE=/usr/include/suitesparse \
#      INSTALL_DOC=/tmp/build/doc               \
#      LAPACK=                                  \
#      BLAS=-lopenblas                          \
#      LDFLAGS='-L/tmp/build/SuiteSparse-'"${SUITE_SPARSE_VERSION}"'/lib'  && \
#    rm -rf /tmp/build


# Install ARPACK NG

#RUN ARPACK_NG_VERSION=3.9.1 && \
#    mkdir -p /tmp/build     && \
#    cd       /tmp/build     && \
#    wget -q "https://github.com/opencollab/arpack-ng/archive/${ARPACK_NG_VERSION}.tar.gz" && \
#    tar -xf      ${ARPACK_NG_VERSION}.tar.gz  && \
#    cd arpack-ng-${ARPACK_NG_VERSION}         && \
#    ./bootstrap                 && \
#    ./configure                    \
#      --prefix=/usr                \
#      --libdir=/usr/lib            \
#      --with-blas='-lopenblas'     \
#      --with-lapack=''             \
#      INTERFACE64=1                \
#      LT_SYS_LIBRARY_PATH=/usr/lib \
#      LDFLAGS='-L/usr/lib'      && \
#    make -j8                    && \
#    export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/lib  && \
#    make check    && \
#    make install  && \
#    rm -rf /tmp/build
#

# Install QRUPDATE

#RUN QRUPDATE_VERSION=1.1.2 && \
#    mkdir -p /tmp/build    && \
#    cd       /tmp/build    && \
#    wget -q "http://downloads.sourceforge.net/project/qrupdate/qrupdate/1.2/qrupdate-${QRUPDATE_VERSION}.tar.gz"  && \
#    tar -xf qrupdate-${QRUPDATE_VERSION}.tar.gz       && \
#    cd      qrupdate-${QRUPDATE_VERSION}              && \
#    make lib                                             \
#      PREFIX=/usr                                        \
#      LAPACK=""                                          \
#      BLAS="-lopenblas"                                  \
#      FFLAGS="-L/usr/lib -fdefault-integer-8"         && \
#    export LD_LIBRARY_PATH=$LD_LIBRARY_PATH:/usr/lib  && \
#    make test                                            \
#      PREFIX=/usr                                        \
#      LAPACK=""                                          \
#      BLAS="-lopenblas"                                  \
#      FFLAGS="-L/usr/lib -fdefault-integer-8 -fallow-argument-mismatch" && \
#    make install                                         \
#      PREFIX=/usr                                        \
#      LAPACK=""                                          \
#      BLAS="-lopenblas"                                  \
#      FFLAGS="-L/usr/lib -fdefault-integer-8"         && \
#    rm -rf /tmp/build


# Install GLPK

#RUN GLPK_VERSION=5.0     && \
#    mkdir -p /tmp/build  && \
#    cd       /tmp/build  && \
#    wget -q "https://ftp.gnu.org/gnu/glpk/glpk-${GLPK_VERSION}.tar.gz"  && \
#    tar -xf glpk-${GLPK_VERSION}.tar.gz  && \
#    cd      glpk-${GLPK_VERSION}         && \
#    ./configure             \
#      --with-gmp            \
#      --prefix=/usr         \
#      --libdir=/usr/lib  && \
#    make -j8             && \
#    make check           && \
#    make install         && \
#    rm -rf /tmp/build


# Install Sundials

#RUN SUNDIALS_VERSION=6.6.2  && \
#    mkdir -p /tmp/build     && \
#    cd       /tmp/build     && \
#    wget -q "https://github.com/LLNL/sundials/releases/download/v${SUNDIALS_VERSION}/sundials-${SUNDIALS_VERSION}.tar.gz" && \
#    tar -xf sundials-${SUNDIALS_VERSION}.tar.gz  && \
#    cd      sundials-${SUNDIALS_VERSION}         && \
#    mkdir build  && \
#    cd    build  && \
#    cmake                                          \
#      -DEXAMPLES_ENABLE_C=OFF                      \
#      -DENABLE_KLU=ON                              \
#      -DKLU_INCLUDE_DIR=/usr/include/suitesparse   \
#      -DKLU_LIBRARY_DIR=/usr/lib                   \
#      -DBUILD_ARKODE=OFF                           \
#      -DBUILD_CVODE=OFF                            \
#      -DBUILD_CVODES=OFF                           \
#      -DBUILD_IDA=ON                               \
#      -DBUILD_IDAS=OFF                             \
#      -DBUILD_KINSOL=OFF                           \
#      -DBUILD_CPODES=OFF                           \
#      -DCMAKE_INSTALL_PREFIX=/usr                  \
#      ..              && \
#    make -j8          && \
#    make install      && \
#    rm -rf /tmp/build


# Install RapidJSON header library

#RUN mkdir -p /tmp/build      && \
#    cd       /tmp/build      && \
#    wget -q "https://github.com/Tencent/rapidjson/archive/refs/heads/master.tar.gz" && \
#    tar -xf master.tar.gz    && \
#    cp -R rapidjson-master/include/rapidjson /usr/include && \
#    rm -rf /tmp/build


# Set Octave 64-bit build options

#ENV OCTAVE_CONFIGURE_ARGS="--prefix=/usr --enable-64 --with-blas='-lopenblas'" \
#    F77_INTEGER_8_FLAG="-fdefault-integer-8"
# gnuoctave/octave

# Please follow docker best practices
# https://docs.docker.com/engine/userguide/eng-image/dockerfile_best-practices/

# Docker images to build GNU Octave <https://www.octave.org>.

#ARG OCTAVE_VERSION_MAJOR
#FROM  gnuoctave/octave-build:${OCTAVE_VERSION_MAJOR}
#LABEL maintainer="Kai T. Ohlhus <k.ohlhus@gmail.com>"

#ENV LAST_UPDATED=2023-11-19


# Update builder image with latest security updates
#RUN apt-get --yes update  && \
#    apt-get --yes upgrade && \
#    apt-get --yes clean          && \
#    apt-get --yes autoremove     && \
#    rm -Rf /var/lib/apt/lists/*

# Removed
#    pip3 install --upgrade --no-cache-dir \
#      pip                           \
#      sympy                         \
#      || true                    && \
#

# Install Octave
#ARG OCTAVE_VERSION
#ARG GNU_MIRROR=https://ftpmirror.gnu.org/octave
#RUN mkdir -p /tmp/build  \
#    && cd    /tmp/build  \
#    && wget -q "${GNU_MIRROR}/octave-${OCTAVE_VERSION}.tar.gz"  \
#    && tar -xf octave-${OCTAVE_VERSION}.tar.gz     \
#    && cd      octave-${OCTAVE_VERSION}            \
#    && ./configure    ${OCTAVE_CONFIGURE_ARGS}     \
#          F77_INTEGER_8_FLAG=${F77_INTEGER_8_FLAG} \
#    && make -j8      \
#    && make install  \
#    && rm -rf /tmp/build

# Newly added, just get packages from debian repo
RUN apt-get --yes update && \
    apt-get --yes upgrade && \
    apt-get --yes install octave octave-parallel && \
    apt-get --yes clean          && \
    apt-get --yes autoremove     && \
    rm -Rf /var/lib/apt/lists/*

#WORKDIR /workdir

#CMD ["octave-cli"]

# To allow SSH via VPN
#FROM alpine:latest
#RUN apk add --no-cache --update bash openssh iproute2 tcpdump net-tools screen
RUN apt-get --yes update && \
    apt-get --yes upgrade && \
    apt-get --yes install openssh net-tools screen && \
    apt-get --yes clean          && \
    apt-get --yes autoremove     && \
    rm -Rf /var/lib/apt/lists/*
RUN echo "UseDNS no" >> /etc/ssh/sshd_config && \
    echo "PermitRootLogin yes" >> /etc/ssh/sshd_config && \
    echo "PasswordAuthentication yes" >> /etc/ssh/sshd_config

#FROM gnuoctave/octave:latest
WORKDIR /golem/work
VOLUME /golem/work
COPY Dockerfile /golem/info/description.txt
COPY Dockerfile /golem/work/info.txt
