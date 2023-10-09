<!----
--table-of-contents --number-sections
--variable homelink=true --variable includeHeader=true
--metadata=title:"Git"
--metadata=title-meta="git"
--metadata=subtitle:"Git cheat sheet and notes"
--metadata=description:'Git cheat sheet and notes'
-->


# Git

```sh
git status --short --branch --untracked-files=all
git log --oneline --decorate --all --graph
git log --oneline --decorate --reflog --graph # view orphaned commits
```

```sh
git remote add origin git@github.com:linjan2/example.git
git fetch --all
git rebase origin/main
```

Move working tree onto other commits:

```sh
# detach HEAD to not affect branch ref
git checkout --detach HEAD
# move HEAD to a commit while keeping working tree
git reset --soft ${REF}
# or move HEAD while discarding working tree
git reset --hard ${REF}
# attach HEAD to current
git checkout ${REF}
```

Overwrite file in working tree from a source commit:

```sh
git checkout ${REF} -- file
git checkout ${REF} --patch -- file
```



```sh
# show patch from working tree to the index
git diff -- files...
# show patch from the working tree to a commit
git diff ${REF} -- files...
# show patch from the index to a commit
git diff --staged ${REF} -- files...
# show patch from one commit to another commit
git diff ${REF1} ${REF2} -- files...
# show patch from one file to another
git diff --no-index file1 file2

# use patch files
git diff ${REF1} ${REF2} -- files... > diff.patch
git apply diff.patch
```


## Git helper script

Bash script:

```sh
set -o nounset
set -o errexit
set -o noglob

CMD=${1:-status}

case ${CMD} in
  status) git status --short --branch --untracked-files=all ${2:-.} ;;
  +)      git add --patch -- ${@:2} ;;
  ++)     git add -- ${@:2} ;;
  -)      git reset --patch HEAD -- ${@:2} ;;
  --)     git reset HEAD -- ${@:2} ;;
  ---)    git rm --cached -r -- ${@:2} ;;
            # diff between index or commits; adds -- before file(s)
  diff)   git diff ${2/INDEX/--staged} ${3} ${4:+-- ${4} ${5:-}} ;;
            # log ancestors of $2
  log)    git log --graph ${2:-HEAD} --format='%C(auto)%h %s; %C(yellow)%ar %C(auto)%an %D' ;;
            # log descendants of $2
  map)    git log --oneline --decorate --graph --boundary --all --ancestry-path ${2:-HEAD}.. ;;
            # log descandants of $2, including orphans in reflog
  map!)   git log --oneline --decorate --graph --boundary --reflog --ancestry-path ${2:-HEAD}.. ;;
  snap)   git commit -m "${2}" ;;
  edit)   git rebase --interactive ${2:-HEAD}^ ;;
            # detach, move with working tree; -q for quiet about detaching
  move)   git checkout -q --detach HEAD && git reset --soft ${2} ;;
  attach) git checkout -q ${2} ;;
  reset)  git reset --hard ${2} ;;
            # restore a file from commit or index
  get)    git checkout --patch ${2/INDEX} -- ${3} ${@:4} ;;
  get!)   git checkout ${2/INDEX} -- ${3} ${@:4} ;;
  !)      git tag ${2} ${3:-HEAD} ;;
  -!)     git tag -d ${@:2} ;;
  branch) git branch ${@:2} && git checkout ${@:2} ;;
  root)   git rev-parse --show-toplevel ;;
  *)      echo "unrecognized command '${CMD}'" ;;
esac
```

Windows batch script:

```bat
@echo off
setlocal

  :: one extra space is appended to ARGV
set ARGV=%* 
set CMD=%1
  :: removes command from arguments
call set ARGV=%%ARGV:%CMD% =%%

if "%CMD%"==""            (git status --short --branch --untracked-files=all .) ^
else if "%CMD%"=="status" (git status --short --branch %ARGV%) ^
else if "%CMD%"=="+"      (git add --patch -- %ARGV%) ^
else if "%CMD%"=="++"     (git add -- %ARGV%) ^
else if "%CMD%"=="-"      (git reset HEAD --patch -- %ARGV%) ^
else if "%CMD%"=="--"     (git reset HEAD -- %ARGV%) ^
else if "%CMD%"=="---"    (git rm --cached -r -- %ARGV%) ^
else if "%CMD%"=="diff"   (call git diff %2 %3 -- %4 %5) ^
else if "%CMD%"=="log"    (^
    git log --graph %ARGV% --format="%%C(auto)%%h %%s; %%C(yellow)%%ar %%C(auto)%%an %%D") ^
else if "%CMD%"=="map"    (^
    if "%~2"=="" (git log --oneline --decorate --graph --boundary --all
        --ancestry-path HEAD..) ^
    else (git log --oneline --decorate --graph --boundary --all --ancestry-path %2..)) ^
else if "%CMD%"=="map!"   (^
    if "%~2"=="" (git log --oneline --decorate --graph --boundary --reflog
        --ancestry-path HEAD..) ^
    else (git log --oneline --decorate --graph --boundary --reflog --ancestry-path %2..)) ^
else if "%CMD%"=="snap"   (git commit -m %2) ^
else if "%CMD%"=="edit"   (if "%~2"=="" (git rebase --interactive HEAD~2) ^
                           else (git rebase --interactive %2~2)) ^
else if "%CMD%"=="move"   (git checkout -q --detach HEAD && git reset --soft %2) ^
else if "%CMD%"=="attach" (git checkout -q %2) ^
else if "%CMD%"=="get"    (^
    if "%~3"=="" (exit /b 1) ^
    else (if "%~2"=="INDEX" (git checkout --patch -- %ARGV:INDEX =%) ^
          else (call git checkout --patch %2 -- %%ARGV:%2 =%%))) ^
else if "%CMD%"=="!"      (git tag %2 %3) ^
else if "%CMD%"=="-!"     (git tag -d %2) ^
else if "%CMD%"=="branch" (git branch %2 && git checkout %2) ^
else echo. unrecognized command '%CMD%'

exit /b

endlocal
```
