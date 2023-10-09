<!----
--table-of-contents --number-sections
--variable homelink=true --variable includeHeader=true
--metadata=title:"Mac"
--metadata=title-meta="mac"
--metadata=subtitle:"Mac cheat sheet and various notes"
--metadata=description:'Mac cheat sheet and various notes'
-->
# Mac CLI

## Zsh

Mac uses `zsh`.

```zsh
# ~/.zshrc
if [ -z ${PATH} -o ! -z "${PATH##*${HOME}/bin:*}" ]
then
    export PATH=${HOME}/bin:${PATH}
    export PATH=${HOME}/go/bin:${PATH}
fi

if [ ! -z ${SSH_CONNECTION} ]
then
  export PROMPT='%m %~ '
else
  export PROMPT='%(?.%F{8}%?.%F{9}%?)%f %F{8}%0~%f '
  export RPROMPT='%F{8}%*%f'
fi

export HISTFILE=${HOME}/.zsh_history
export HISTSIZE=10000
export SAVEHIST=10000
setopt HIST_IGNORE_DUPS
setopt HIST_IGNORE_SPACE
setopt SHARE_HISTORY
setopt INTERACTIVE_COMMENTS

alias ls='ls -A --color=always'
alias rm='rm -I'
alias py=". ${HOME}/bin/py3venv/bin/activate && echo -n \"\${VIRTUAL_ENV} : (run 'deactivate' to exit) : \" && python -V && pip list"

export EDITOR=vim

if [ -z "${FPATH}" -o ! -z "${FPATH##*$(brew --prefix)/share/zsh/site-functions}*" ]
then
    FPATH="$(brew --prefix)/share/zsh/site-functions:${FPATH}"
fi

autoload -Uz compinit && compinit
```

Check extended file attributes. Downloaded files are in quarantine.

```sh
ls -l@ # show extended attributes

xattr -l file # lists the names of all xattrs.
xattr -p com.apple.quarantine file # print attribute value
xattr -w attr_name attr_value file # sets xattr attr_name to attr_value.
xattr -d attr_name file # deletes xattr attr_name.
xattr -c file # deletes all xattrs.
xattr -h # prints help

xattr -d com.apple.quarantine file
# -r for recursive
find ~/Downloads -xattrname com.apple.quarantine -exec xattr -r -d com.apple.quarantine {} \;
```

If process is killed immediately when executing, check Console.app for Crash Report like `EXC_BAD_ACCESS (SIGKILL (Code Signature Invalid))`. The executable can be signed ad hoc with `codesign`.

```sh
codesign --verify ./oc
codesign --verbose --display ./oc
# sign ad hoc executable
codesign -s - oc
# or
codesign --force -s - oc
# list installed certificates
security find-identity -p basic -v
```

```sh
defaults read com.apple.Terminal CopyAttributesProfile com.apple.Terminal.attributes
# disable quarantine
defaults write com.apple.LaunchServices LSQuarantine -bool false
# set locale
defaults write -g AppleLocale en_US
```

```sh
# create and mount a 479 MB HFS+ volume ramdisk
diskutil erasevolume HFS+ ramDisk500mb $(hdiutil attach -nomount ram://980000)
# run chrome with the ramdisk as user-data-dir
open a 'Google Chrome Canary' --args --user-data-dir=/Volumes/ramDisk500mb
```

## Homebrew

[https://brew.sh](https://brew.sh)

```sh
brew help
brew analytics off

brew doctor

brew install PACKAGE
brew outdated
brew update PACKAGE
brew update # update brew
brew list
brew casks
brew uninstall PACKAGE
brew deps PACKAGE
brew uninstall --ignore-dependencies PACKAGE
brew autoremove
brew autoremove --dry-run
brew cleanup --prune=all

brew search TEXT
brew search /REGEX/
```

```sh
# ~/.zprofile
eval "$(/opt/homebrew/bin/brew shellenv)"
```

## Podman

[Using podman-machine on MacOS (Apple silicon and x86_64)](https://github.com/containers/podman/blob/main/docs/tutorials/mac_experimental.md)

```sh
brew install podman
podman machine init
podman machine start
podman machine list
podman machine ssh
podman machine stop podman-machine-default
podman machine rm podman-machine-default
podman info

# only vfs with bud (dockerfile) command can be used on VM
podman pull registry.access.redhat.com/ubi8/buildah:latest
# install buildah on VM with rpm-ostree instead
podman machine ssh # ssh to VM
sudo rpm-ostree status
sudo rpm-ostree install buildah # install, then reboot VM

# switch to rootful mode
podman machine set --rootful

# after autoload -U compinit && compinit
podman completion -f $(brew --prefix)/share/zsh/site-functions/_podman zsh
cat ~/.ssh/podman-machine-default.pub

# auth.json is stored on host machine at ~/.config/containers/auth.json
podman login --get-login docker.io
```

## Python

```sh
python3 -m venv --prompt 'py3' ${HOME}/bin/py3venv
. ${HOME}/bin/py3venv/bin/activate
eco ${VIRTUAL_ENV}  # path to venv
python -V
pip list --outdated
pip install --upgrade pip
pip install --upgrade setuptools

pip config debug # list configuration files and their settings
pip config list -v # almost the same
pip cache dir # show cache dir (it's not in venv)
pip config --site set command.option value # configure virtual environment
deactivate
```


```sh
pip freeze --all # output requirements file to stdout containing currently installed packages
pip list --not-required # list installed packages that aren't dependencies
pip list --outdated
pip show --files PACKAGE # list files of package

pip install -r requirements.txt
pip install /path/to/files # install from local path
pip install -e /path/to/files # install from local path as editable
pip install ./downloads/SomeProject-1.0.4.tar.gz
pip install -e 'git+ssh://git.repo/some_pkg.git@master' # specify ref after @
pip install -e 'git+https://git.repo/some_pkg.git#egg=project_name&subdirectory=pkg_dir' # specify package name and subdirectory
pip install -e 'git+file:///home/user/projects/MyProject'
pip install --index-url http://my.package.repo/simple/ SomeProject

pip uninstall PACKAGE
pip uninstall -r requirements.txt

pip check # verify installed packages have compatible dependencies
```

Use `pip download` to download packages for other systems.
https://pip.pypa.io/en/latest/cli/pip_download/

```sh
python -m pip download --no-index --find-links=/tmp/wheelhouse -d /tmp/otherwheelhouse SomePackage

python -m pip download \
  --only-binary=:all: \
  --platform linux_x86_64 \
  --python-version 3 \
  --implementation cp \
  --abi cp34m \
  SomePackage
```

## Compiling

```sh
# install command line tools
xcode-select --install
```

The `otool` command shows which dynamic libraries (dylibs) are required by a binary.

```sh
otool -L a.out
```

[`lldb`](https://wiki.lazarus.freepascal.org/lldb) is the Xcode (macOS) default debugger.

### Objective-C

The .tbd files are "text-based dylib" stub libraries/definition, that provide a more compact version of the stub libraries for use in the SDK. This file contains some meta information like:

- .dylib location
- symbols (class's properties, methods)
- architecture
- platform


```sh
exec clang -Os -o littlemis -fmodules littlemis.m -lmis
exec clang -Os -o ct_little -fmodules littlect.m ./libmis.tbd
```

```sh
#!/bin/sh
set -e
clang -Os -target arm64-apple-ios12.0 -Wall \
  -isysroot "$(xcrun --sdk iphoneos --show-sdk-path)" \
  -o who_let_the_dogs_out \
  who_let_the_dogs_out.c \
  -framework IOKit

/usr/bin/codesign --force \
  --sign 52F754C59CFAC59BC5794F5A3B523EFE0667D7EB \
  --timestamp=none \
  --entitlements real.entitlements \
  who_let_the_dogs_out
```

```sh
clang -target arm64e-apple-macosx10.15.0 -isysroot macOSArm.sdk hello.c
swiftc -target arm64e-apple-macosx10.15.0 -sdk macOSArm.sdk -v hello.swift
```

