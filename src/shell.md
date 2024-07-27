<!----
--table-of-contents --number-sections
--variable homelink=true --variable includeHeader=true
--metadata=title:"Shell"
--metadata=title-meta="shell"
--metadata=subtitle:"Shell commands and references for Linux and Windows"
--metadata=description:'Shell commands and references for Linux and Windows'
--css spinner.css
-->
# Shell notes

[GNU Bash manual](https://www.gnu.org/software/bash/manual/)

`.bashrc`

```sh
# Source global definitions
if [ -f /etc/bashrc ]; then
  . /etc/bashrc
fi

# If not running interactively, exit
[[ $- =~ i ]] && return

# User specific environment
if ! [[ "$PATH" =~ "$HOME/.local/bin:$HOME/bin:" ]]
then
    PATH="$HOME/.local/bin:$HOME/bin:$PATH"
    PATH="$HOME/bin/scripts:$PATH"
fi
export PATH

# User specific aliases and functions
if [ -d ~/.bashrc.d ]; then
  for rc in ~/.bashrc.d/*; do
    if [ -f "$rc" ]; then
      . "$rc"
    fi
  done
fi

unset rc

# export HISTFILE="${HOME}/.bash_history"
export HISTFILESIZE=10000 # maximum number of lines in the history file
export HISTSIZE=10000     # maximum number of lines in session history
export HISTCONTROL=ignorespace:erasedups

reset=$(tput sgr0)
color=$(tput setaf 6)
export PS1="($?) \[${color}\]\W\[${reset}\] "

alias ls='ls --color=auto -Ax --group-directories-first -1'
alias rm='rm -Iv'
alias cp='cp -v'
alias tree='tree -a -F'
export EDITOR=vim
```

## Bash commands

### Keyboard shortcuts

- `Tab` : Auto complete
- `^i` : Auto complete
- `~ Tab Tab` : List all users
- `^a` : Beginning of line
- `^e` : End of line
- `^f` : Forward one character
- `^b` : Back one character
- `Alt f` : Forward one word
- `Alt b` : Back one word
- `^h` : Delete one character (backwards)
- `^w` : Delete one word (backwards)
- `^u` : Clear to beginning of line
- `^k` : Clear to end of line
- `Alt d` : Remove from character to end of word
- `Alt Backspace` : Remove from character until start of word
- `^y` : Paste from Kill Ring (deleted characters)
- `^t` : Swap cursor with previous character
- `Alt t` : Swap cursor with previous word
- `^p` : Previous line in history
- `^n` : Next line in history
- `^r` : Search backwards in history
- `^l` : Clear screen
- `^o` : Execute command but keep line
- `^z` : Suspend process to background
- `^c` : Kill current process
- `^d` : Exit shell
- `Alt .` : Use last argument of previous command
- `^s` : Suspend command output
- `^q` : Resume command output
- `Alt r` : Revert changes to the line
- `Alt u` : Change word to uppercase
- `Alt l` : Change word to lowercase
- `Alt c` : Capitalize word

### Command shortcuts

- `!!` : Substitutes to last command
- `!*` : Substitutes to last command except its first word
- `!*:p` : Display command of `!*`
- `!x` : Substitutes to most recent command from history that begins with `x`
- `!x:p` : Display command of `!x`
- `!$` : Substitutes to last argument of the previous command
- `!$:p` : Display command of `!$`
- `!^` : Substitutes to first argument of last command
- `^x^y` : Replace `x` with `y`
- `!n` : Repeat nth command in history
- `!n:p` : Display command of `!n:p`
- `fg` : Restore background process to foreground
- `bg` : Continue process in background

## Scripting

Set useful shell options in scripts.

```sh
set -o errtrace # (-E) `trap 'abc' ERR` is triggered on SIGERR in functions/subshells/command substitutions
set -o errexit  # (-e) SIGERR on non-zero exit status of a pipeline
set -o nounset  # (-u) error on unset variables and parameters
set -o pipefail # return status of a pipeline is the last command with a non-zero return status
set -Eeuo pipefail # short version of options above
set -o xtrace   # (-x) display ${PS4} followed by the command and its expanded arguments
set -o noexec   # (-n) read commands but do not execute them (for syntax check)
set -o noglob   # (-f) disable pathname expansion
set -o verbose  # (-v) print shell input lines as they are read

# set xtrace prefix
export PS4='    +\t $BASH_SOURCE:$LINENO: ${FUNCNAME[0]:+${FUNCNAME[0]}:}'

shopt -s inherit_errexit  # command substitution inherits the value of the errexit option
shopt -s expand_aliases   # enable aliases
shopt -s nullglob         # unmatched pathname expansion becomes empty string
shopt -s dotglob          # pathname expansion * also matches files with leading '.'
shopt -u globstar         # pathname expansion ** 
shopt -s extglob          # extended pathname Expansion

shopt # show all with status
shopt extglob # show extglob status
```

Handle error and get exit code when using `errexit`:

```sh
# alt. run ':' with '$?' as argument on error
set -o errexit
{ some_command_that_may_error its_arg && : 0 ; } || : $?
echo $_ # last argument to previous command holds the return code

# alt. disable errexit temporarily
set +o errexit
some_command_that_may_error its_arg
echo $?
set -o errexit

# alt. trap on ERR and let script exit on the triggering exit code
trap 'handle_error' ERR  # call a function on SIGERR
```

Check that input variables are set with the no-op command `:`.

```sh
#! /bin/bash
set -o errexit
set -o nounset
: $1 $EXPECTED_ENV
```

### shebang/hashbang

Writing `!# /path/to/command` as the first line of a shell script sets the interpreter when the script file is executed.

```sh
#!/bin/sh -Eeu
```

Use `!# /usr/bin/env command` to run the interpreter in a modified environment.

```sh
#!/usr/bin/env bash
echo Hello
```

Use `env -S`/`env --split-string=` to interpret multiple parameters in the shebang (instead of as one command).

```sh
#!/usr/bin/env -S AWKPATH=. awk -v OFS=: -f
BEGIN {print 1,2,3}
```

```sh
#!/usr/bin/env -S --unset=PYTHONDEBUG PYTHONWARNINGS=error python
print("Hello")
```

### Display shell variables

```sh
set # display shell variables, environment variables, functions
env # show environment variables
export -p # display exported environment variables

# show readline key bindings and variables (controlling readline run-time behavior)
bind -v
info -n '(bash)Readline Init File Syntax'  # show info on readline settings

declare     # display shell variables, environment variables
declare -p  # print declared variables
declare -F  # only function names
declare -f function_name  # print function definition

# print file and line number where function is declared
shopt -s extdebug
declare -F function_name
shopt -u extdebug

compgen -v  # display shell variables, environment variables
compgen -b  # show all the bash built-ins
compgen -k  # show all the bash keywords
compgen -c  # display all commands
compgen -a  # display aliases
compgen -A function  # show all the bash functions
compgen -bkcaA function  # combine filters
help compgen

type -a command_name     # print available commands with specified name
type -P -a command_name  # prints all paths to the executable

alias -p      # display aliases
alias name    # show alias definition

unset name      # unset variable or function
unalias name    # unset alias
declare +x name # un-export variable
```

### Control structures

```sh
if [ -r ~/.bashrc ]
then
  echo .bashrc is readable
else
  echo .bashrc is not readable
fi

while [ -z "$(pidof command1)" ]; do
  commands
done

while true
do
  command1 && continue  # jump to next iteration
  command2 || break     # exit loop
done

for i in 1 2 3 4 5; do
  command1
done

case ${1} in
  one)
    command1
    command2
    ;;
  2|two)
    command3
    ;;
  three*)
    command4
    ;;
  *)
    command7
    ;;
esac

command1 && command2
command1 || command2
command1 && { success_command || : ; } || failure_command

function func
{
  command1 $@
  return 0
}
func 1 2 3
```

> Function definition syntax alternatives:
>
> ```sh
> function NAME { ; }
> # or
> NAME() { ; }
> ```

Call script argument as function:

```sh
function subcall
{
  return 0
}

if [ $# -eq 0 ]
then
  echo "USAGE: ${0} subcall"
else
  "$@"
fi
```

Call function in subshell:

```sh
function subcall
{
  set -o errexit  # set 'e'
  echo "subcall options: $-"  # contains 'e' and 'u'
  echo ${ABC}     # errors since ABC is unset
}

set -o nounset   # set 'u'; is inherited by subshell
set +o errexit   # unset 'e'; don't SIGERR when subcall errors
( subcall )      # start function in subshell to separate its shell options
echo "main options: $-"   # no 'e' for errexit
```

#### `test`

```sh
man test

[ -f file1.txt -o -f file2.txt ] && echo 'Either (regular) file1.txt or file2.txt exists'

[ -f file1.txt ] || [ -f file2.txt ] && echo 'Either (regular) file1.txt or file2.txt exists'

[ -w file.txt -a -r file.txt ] && echo 'File is both writable and readable'

[ ! -z "${1}" ] && echo 'String is non-zero'

# test with extended regular expression and print the matched string
[[ "${STRING}" =~ ${REGEX} ]] && echo ${BASH_REMATCH[0]}
# capture groups into BASH_REMATCH[] (skip item 0 in array)
[[ "ab12cd" =~ ([^[:digit:]]*)([[:digit:]]+) ]] && echo "${BASH_REMATCH[@]:1}"

# three ways to test for 'i' (interactive) in shell option
[[ $- != *i* ]] && return
[[ $- =~ i ]] && return
[ "${-#*i}" != "$-" ] && return
```

#### Pipe status

```sh
# run commands in a pipe
true | false | true | false
# copy pipe statuses to another array
RET=( "${PIPESTATUS[@]}" )
echo "0: ${RET[0]}"  # 0
echo "1: ${RET[1]}"  # 1
echo "2: ${RET[2]}"  # 0
echo "3: ${RET[3]}"  # 1
```


### Run jobs in parallel

Start processes in background:

```sh
# put single command in background
sleep 1s &

# put block of commands in background
{ sleep 2s; echo '2s done'; } &

# put block of commands with return code in background
{
  sleep 4s ; RET=$?
  echo '4s done'
  (exit $RET)
} &

wait # waits for all background jobs above
```

Run commands in parallel with `xargs`:

```sh
# find Makefiles and execute their default targets in parallel
find . -name Makefile -printf '%h\0' \
  | xargs --null --max-arg=1 --max-procs=4 \
    make --jobs=4 --directory
```

Run commands in parallel with GNU `parallel`:

```sh
sudo dnf install parallel
parallel --citation <<<'will cite' # silence citation notice
man parallel_examples

# run ping in parallel (up to 4)
parallel --max-args=1 --jobs 4 'ping -c 1 {} > /dev/null && echo {}' 2>/dev/null < ipaddresses.txt
# run commands in parallel and show their outputs in order
parallel --max-args=1 --keep-order < commands.txt
# compress files in parallel
parallel gzip '{}' ::: file{1..5}.txt
```

### Parse arguments

```sh
set -o errexit
set -o nounset

while [ $# -gt 0 ]
do
  OPT=${1}

  case ${OPT} in
    -n|--name)
      NAME=${2}
      shift
    ;;
    -l|--level)
      LEVEL=${2}
      shift
    ;;
    *)
      echo unrecognized option ${OPT}
      false
    ;;
  esac
  shift || :
done
```

Seperate options from non-options in argument array:

```sh
ARGS=("${@}")
# format input items as "item1" : "item2" ...
ARGS="${ARGS[@]//*/:\"&\"}"

# extract option items that begin with -
OPTIONS=$(awk -v RS=':' -v ORS=' ' '/^"-/' <<<"${ARGS}")
# extract other items y negating the pattern
OTHER=$(awk -v RS=':' -v ORS=' ' '$0 !~ /^"-/' <<<"${ARGS}")
```

#### Read input

```sh
read -p 'Enter the number: ' NUM
echo Number = ${NUM}

echo 'Are you sure? [y/N] '
read -r ANSWER
case "${ANSWER}" in
  [yY][eE][sS]|[yY])
    # ...
    ;;
  *)
    # ...
    ;;
esac
```

Read lines of input from file:

```sh
while read -r ITEM
do
  echo ${ITEM}
done < <(find . -name '*.html')
```

Use `select` to show a menu of numbered selections.

```sh
PS3='Select a number: '
select VAR in A B C
do
  # VAR contains selection based on entered number; REPLY contains the input
  echo you picked ${VAR} \(REPLY=$REPLY\)
  break # exits select loop
done
if [ $? -eq 1 ]; then echo reply was EOF ; fi
```

### trap

```sh
set -o errexit

# run command on SIGERR
trap 'die' ERR

die()
{
  echo "Failed on line ${BASH_LINENO}"
  exit 1
}

false # run command that fails
```

```sh
# remove file on script exit
FILE=$(mktemp)
trap "/bin/rm -f ${FILE}" TERM QUIT EXIT INT
# remove trap for SIGTERM and SIGINT
trap - TERM INT
# trap all signals
trap 'do_something' $(seq 0 15)
```

## Bash completion

Create a completion function `_example_sh` in a script file.

```sh
function _example_sh()
{
  # current completion word
  local cur=${COMP_WORDS[COMP_CWORD]}
  local COMMANDS='hello world'
  local OPTIONS='-h -H'
  # set array of completion matches based on current word
  case "${cur}" in
    -*)
      # show option word list filtered by current word
      COMPREPLY=( $( compgen -W "${OPTIONS}" -- ${cur} ) )
      ;;
    *)
      # show command word list filtered by current word
      COMPREPLY=( $(compgen -W "${COMMANDS}" -- "${cur}") )
      ;;
  esac
  return 0
}
```

```sh
# source the file with the completion function
. _example_sh
# show completion function
type _example_sh

# register completion function compspec for script "example.sh"
complete -F _example_sh ./example.sh
# get tab completion
./example.sh TAB TAB

# list compspecs
complete -p
```

## Variable substitutions

[Shell parameter expansion](https://www.gnu.org/software/bash/manual/html_node/Shell-Parameter-Expansion.html).

```sh
# remove everything before /
ARG=/path/to/a/b/c
echo ${ARG##*/} # c

ARG=",a,b,c,"
# remove trailing comma
echo ${ARG/%,/}  # ,a,b,c
# remove leading comma
echo ${ARG/#,/}  # a,b,c,
# remove all commas anywhere
echo ${ARG//,/}  # abc

# "capture"; include matched string in substitution with &
shopt -s patsub_replacement   # (set by default)
ARRAY=( 'red' 'green' 'blue' ) # substitution will act on each array element in turn
echo ${ARRAY[@]//*/:&:}       # :red: :green: :blue:
echo ${ARRAY[@]//*/'&'}       # & & &

# get length of array
ARRAY=( 'a' 'b' 'c' )
echo ${#ARRAY[@]} # 3
```

| Expression       | set        | empty        | unset          | Usage      |
|:-----------------|:----------:|:----------:|:----------:|:----------------:|
| `${param:-word}` | `value`    | `word`       | `word`         | Default |
| `${param-word}`  | `value`    | `''`         | `word`         | Default |
| `${param:=word}` | `value`    | `word`       | `word`         | Assign default |
| `${param=word}`  | `value`    | `''`         | `word`         | Assign default |
| `${param:?word}` | `value`    | error `word` | error `word`   | Error missing |
| `${param?word}`  | `value`    | `''`         | error `word`   | Error missing |
| `${param:+word}` | `word`     | `''`         | `''`           | Replace |
| `${param+word}`  | `word`     | `word`       | `''`           | Replace |

| Expression              | Description                 | Example           |
|:--------------------|:--------------------------------|:--------------------------|
| `${param%pattern}`  | Remove smallest suffix pattern match. | `Z='a.b.c'; ${Z%.*}` = `a.b` |
| `${param%%pattern}` | Remove largest suffix pattern match.  | `Z='a.b.c'; ${Z%%.*}` = `a` |
| `${param#pattern}`  | Remove smallest prefix pattern match. | `Z='/a/b/c'; ${Z#?*/}` = `b/c`|
| `${param##pattern}` | Remove largest prefix pattern match.  | `Z='/a/b/c'; ${Z##*/}` = `c` |

| Expression            | Description | Example         |
|:----------------------|:------------------------|:-------------------|
| `${param/pattern/string}`  | Replace first match. | `Z=x23; ${Z/[0-9]/y}` = `xy3` |
| `${param//pattern/string}` | Replace all matches. | `Z=x23; ${Z//?/y}` = `yyy` |
| `${param/#pattern/string}` | Replace first match at beginning. | `Z=33x; ${Z/#3}` = `3x` |
| `${param/%pattern/string}` | Replace first match at end. | `Z=x33; ${Z/%3}` = `x3` |

| Expression              | Description               | Example                    |
|:------------------------|:--------------------------|:---------------------------|
| `${param^pattern}`  | Uppercase first character if match. | `Z=aaa; ${Z^a}` = `Aaa` |
| `${param^^pattern}` | Uppercase every matching character. | `Z=abc; ${Z^^[b-c]}` = `aBC` |
| `${param,pattern}`  | Lowercase first character if match. | `Z=AAA; ${Z,A}` = `aAA` |
| `${param,,pattern}` | Lowercase every matching character. | `Z=ABC; ${Z,,[B-C]}` = `Abc` |

Bash 4.4 introduced `${param@operator}` to transform `param`.

| Expression   | Description              | Example |
|:-------------|:-------------------------|:-------------------|
| `${param@U}` | To uppercase.                          | `Z=abc; ${Z@U}` = `ABC` |
| `${param@u}` | First character to uppercase.          | `Z=abc; ${Z@u}` = `Abc` |
| `${param@L}` | To lowercase.                          | `Z=ABC; ${Z@L}` = `abc` |
| `${param@Q}` | To quoted.                             | `Z=$'\t'; ${Z@Q}` = `\t` |
| `${param@E}` | Expand backslash escapes.              | `Z='\u61'; ${Z@E}` = `a` |
| `${param@P}` | Expand like `PS1` prompt.              | `Z='\s'; ${Z@P}` = `bash` |
| `${param@A}` | Expand to assignment statement.        | `declare -ir Z=1; ${Z@A}` = `declare -ir Z=1` |
| `${param@K}` | Expand array to quoted key-values.     | `Z=(a b); ${Z[@]@K}` = `0 "a" 1 "b"` |
| `${param@k}` | Expand array to word split key-values. | `Z=(a b); ${Z[@]@k}` = `0 a 1 b` |
| `${param@a}` | Expand to parameter attributes.        | `declare -ir Z=1; ${Z@a}` = `ir` |

[Pattern matching](https://www.gnu.org/software/bash/manual/html_node/Pattern-Matching.html). Except `*` and `?`, the patterns below require `shopt -s extglob`. A pattern list is one or more patterns separated by '`|`'.

| Expression            | Description | Example         |
|:----------------------|:------------------------|:-------------------|
| `*` | Any string or null. | `Z=abc; ${Z/*b}` = `c` |
| `?` | Any character. | `Z=abc; ${Z/??}` = `c` |
| `[set]` | Any of the character set. | `Z=abc; ${Z/[b-c]}` = `ac` |
| `[!set]` | Any not of the character set. | `Z=abc; ${Z/[!bc]}` = `bc` |
| `?(list)` | Zero or one patterns. | `Z=a1bc; ${Z/a?(1|2)b}` = `c` |
| `*(list)` | Zero or more patterns. | `Z=axxxbc; ${Z/a*(x)b}` = `c` |
| `+(list)` | One or more patterns. | `Z=abbc; ${Z/a?(b)}` = `c` |
| `@(list)` | Any of the patterns. | `Z=abc; ${Z/a@([a-b]|[b-c])}` = `c` |
| `!(list)` | Not any of the patterns. | `Z=abc; ${Z^^!([ab])}` = `abC` |

### Substring and array indexing

Expand a string/array to a substring/subarray using the syntax below. `start` and `length` are integers; if negative, they must be preceded by space after `:`. The first element has index 0.

- `${VAR:start}`: substring from start to end.
- `${VAR: -start}`: substring from (end-start) to end.
- `${VAR:start:length}`: substring from start to (start+length).
- `${VAR:start: -length}`: substring from start to (end-length).
- `${VAR: -start: -length}`: substring from (end-start) to (end-length).

```sh
STRING='12345'
echo ${STRING:1} # 2345

ARRAY=( 1 2 3 4 5 )
echo ${ARRAY[@]:1} # 2 3 4 5
```

### Arguments whitespace quoting

Use `"$@"` to quote each argument and avoid splitting on every whitespace.

```sh
q() {
  A=( $* )   ; echo ${A[@]@K} # 0 "a" 1 "a" 2 "b" 3 "b"
  A=( $@ )   ; echo ${A[@]@K} # 0 "a" 1 "a" 2 "b" 3 "b"
  A=( "$*" ) ; echo ${A[@]@K} # 0 " a a b b"
  A=( "$@" ) ; echo ${A[@]@K} # 0 " a a " 1 " b b"
}
# two arguments containing whitespace
q '  a  a '    \ \ b\ \ b
```

```sh
# move files to different directories
f() {
  cp "${@:1:1}" /path/for/first/
  cp "${@:2}" /path/for/rest/
}
```

### Substitutions

```sh
# expand sequences
echo {0..9} # 0 1 2 3 4 5 6 7 8 9
echo {a..z} # a b c d ...
echo {a..c}{a..d} # aa ab ac ad ba bb ...
printf '%03d ' {1..100} ; echo # 001 002 003 004 ...
printf '%s, ' 10.1.{1..255}.{1..255} # 10.1.1.1, 10.1.1.2, 10.1.1.3, ...
```

> Alternative to make sequences with `seq`:
>
> ```sh
> # seq [OPTION]... FIRST INCREMENT LAST
> seq --separator=, 0 2 20
> seq --format='%.2f' 0 0.5 4  # increment floating point numbers
> ```

```sh
# make backup file (example.conf.YYYY-MM-dd.bak)
cp example.conf{,.$(date +%F).bak}
```

### envsubst

```sh
echo 'MY_VAR1=${MY_VAR1} and ${MY_VAR2=${MY_VAR2}}' > input.txt
export MY_VAR1=abc
export MY_VAR2=123
envsubst '${MY_VAR} ${MY_VAR2}' < input.txt > output.txt
```

## Pathname expansion (globbing)

Bash interprets unqouted characters `*`, `?`, and `[` as file name patterns and replaces the input with a sorted list of matching file names. `shopt -s extglob` enables the extended pattern syntax using `pattern-list`, where `pattern-list` is one or more patterns separated by `|`.

| Pattern | Match rule |
|:-----------------:|------------------------------------------------------|
| `*` | any substring, including the empty string |
| `**` | any file or directory descending into subdirectories (if `globstar` is enabled) |
| `**/` | any directory descending into subdirectories (if `globstar` is enabled) |
| `?` | any single character |
| `[...]` | any of the enclosed characters (`[abc]`), range (`[a-z]`), or class (`[[:class:]]`) |
| `[^...]` | any character not enclosed (alternatively `[!...]`) |
| `?(pattern-list)` | zero or one occurrence |
| `*(pattern-list)` | zero or more occurrences |
| `+(pattern-list)` | one or more occurrences |
| `@(pattern-list)` | one occurrence |
| `!(pattern-list)` | no occurrence |

```sh
ls *.txt
ls *[^[:alnum:][:punct:]]*
shopt -s extglob
ls !(nothisfile.txt)
ls *!(.txt) # files without .txt extension
ls ?(*/)@(.|..)
```

```sh
# includes filenames beginning with a '.', but . and .. only match explicitly
shopt -s dotglob
# raise error if file glob pattern fails to match
shopt -s failglob
# expands to empty string if pattern fails to match
shopt -s nullglob
```

```sh
shopt -s globstar
ls **.txt
ls ./tmp.**/
```

```sh
shopt -s nocaseglob
ls a*.txt
```

```sh
# remove matching files if they also match pattern in GLOBIGNORE
GLOBIGNORE=*.txt ls *
  # setting GLOBIGNORE enables dotglob
```

## File descriptors

```sh
# open readfile as file descriptor 3 for reading:
exec 3< readfile
cat <&3 # read

# open writefile as file descriptor 4 for writing:
exec 4> writefile
echo -en 'hello\n' >&4 # write

# make file descriptor 5 a copy of file descriptor 0:
exec 5<&0

# close file descriptor 3:
exec 3<&-

# open file descriptor 3 for both reading and writing a file
exec 3<>file ; 
cat <&3 # reads to end
echo 'abcdef' >&3
echo '123456' >&3
exec 3>&-
# or 
{ cat <&3 ; echo -n 'output' >&3 ; } 3<> file

# check open descriptors for current shell
ls -l /proc/$$/fd/
ls -l /proc/$$/fd/3
```

Bash opens a TCP socket to `host:port` when redirecting to `/dev/tcp/host/port`. It opens a UDP socket to `host:port` when redirecting to `/dev/udp/host/port`.

```sh
# send HTTP data over TCP connection and output response
HOSTNAME=www.example.com
PORT=80
RESOURCE=/
{
  echo -e "GET ${RESOURCE} HTTP/1.0\r\nHost: ${HOSTNAME}\r\n\r" >&3
  cat <&3
} 3<> /dev/tcp/${HOSTNAME}/${PORT}
echo $? # 0 if connection was successful
```

## Colors

```sh
# print 256 shell colors with ANSI escape codes
for i in {0..255} ; do echo -en "\e[48;5;${i}m ${i} \e[0m" ; done ; echo
  # 48 for background; 38 is foreground
  # \e[38:5:<i>m  foreground color
  # \e[48:5:<i>m  background color

# print the 8 colors and 8 bright colors as foreground
for i in {30..37} {90..97} ; do echo -en "\e[${i}m ${i} \e[0m"; done; echo
# print the 8 colors and 8 bright colors as background
for i in {40..47} {100..107} ; do echo -en "\e[${i}m ${i} \e[0m"; done; echo

# ANSI escape code text effects (and their off codes)
echo -e '\e[0m' # reset all
echo -e '\e[1m Bold'            '\e[22m'
echo -e '\e[2m Faint'           '\e[22m'
echo -e '\e[3m Italic'          '\e[23m'
echo -e '\e[4m Underline'       '\e[24m'
echo -e '\e[7m Reverse/invert'  '\e[27m'
echo -e '\e[8m Hide'            '\e[28m'
echo -e '\e[9m Strike'          '\e[29m'

# set both bold and color
echo -e '\e[1;31m Hello \e[0m'

# using \x1b instead of \e
echo -e '\x1b[31m Hello \x1b[0m'

# print the 8 tput colors as foreground
for i in {0..7}; do echo -n $(tput setaf ${i}) COLOR ${i} $(tput sgr0); done; echo
# print the 8 tput colors as background
for i in {0..7}; do echo -n $(tput setab ${i}) COLOR ${i} $(tput sgr0); done; echo
```

```sh
# store escape sequence in variable
reset=$(tput sgr0)
color=$(tput setaf 1)
echo ${color} Hello ${reset}
declare -p color  # print the assignment with \E value

# create colored messages in variables
error_msg() { printf "\033[31m%s\033[0m" "${*}"; }
notice_msg() { printf "\033[33m%s\033[0m " "${*}"; }
debug_msg() { printf "\033[30m%s\033[0m " "${*}"; }
LINE_MSG="$(debug_msg '-----')"
echo ${LINE_MSG}
```

```sh
# tput text effects
tput bold;  echo '(bold) Bold';                             tput sgr0 # reset
tput smul;  echo '(smul) Underlined';                       tput rmul # end underline mode
tput rev;   echo '(rev)  Reversed/inverted';                tput sgr0 # reset
tput smso;  echo '(smso) Standout mode, probably inverted'; tput rmso # end standout mode
tput invis; echo '(invis) Invisible mode';                  tput sgr0
```

```sh
# print number of colors in terminal
tput colors
# test if stdout goes to a terminal (and not redirected to a file)
test -t 1 && echo 'stdout is a terminal'
```

## Odds and ends

```sh
# Print bash startup commands with the corresponding script files
# (Updates PS4 output; then run login shell command ':' with xtrace)
PS4='+ $BASH_SOURCE:$FUNCNAME:$LINENO:' bash -lxc : 2>&1

# escape non-printable characters in file with $'' syntax
printf '%q' "$(<file.txt)"

# $_ holds the last argument to the previous simple command
: $(echo 123)
echo $_ # shows: echo 123

# get full path of script
SCRIPT_PATH=$(dirname $(readlink -f ${0}))

# create a temporary directory (with template name)
TEMPDIR=$(mktemp -d --tmpdir="${PWD}" -t script123-XXXXXXXX)

# expand string with backslash-escaped characters replaced as specified by the ANSI C standard
curl example.com --data $'first line\nsecond line'

# character classes in glob patterns
ls [[:digit:]]*   # digits [0-9]
ls [[:lower:]]*   # lowercase letters (locale-specific)
ls [[:upper:]]*   # uppercase letters (locale-specific)
ls [[:alpha:]]*   # uppercase and lowercase letters (locale-specific)
ls [[:alnum:]]*   # digits, uppercase and lowercase letters (locale-specific)
ls [[:blank:]]*   # space and TAB
ls [[:cntrl:]]*   # control characters [\x00-\x7F]
ls [[:graph:]]*   # graphical characters; i.e. not control characters
ls [[:print:]]*   # graphical characters and space
ls [[:punct:]]*   # [-!"#$%&'()*+,./:;<=>?@[]^_`{|}~]
ls [[:space:]]*   # all blank characters: [ \t\n\r\f\v]
ls [[:xdigit:]]*  # hexadecimal digits [0-9A-Fa-f]

ls [!A-C[:lower:]]*  # not letters A, B, C, nor lowercase letters
```

### Emojis and Unicode

[Unicode table sets](https://unicode-table.com/en/sets/)

[emoji-data.txt](http://www.unicode.org/Public/emoji/1.0//emoji-data.txt)

```sh
# output Unicode; \xHH \uHHHH \UHHHHHHHH
echo -e '\x41' '\u2728' '\U1F680' # A ✨ 🚀

# output more Unicode
UNICODE=$(printf '%u\n' 0x1F311)
for (( i=0; i < 8; i++ ))
do
  echo -ne '\U'$( printf '%X' $((UNICODE+i)) ) ' '
done

# convert hexadecimal to decimal
echo $((16#FF))
# convert decimal to hexadecimal
printf '%u\n' 0xFF
```

### Spinner <span class="loading" style="display: inline-block; width: 16px; height: 16px; font-size: 16px; overflow: hidden;" aria-hidden="true"></span>

Show a spinner by printing characters in the background while command runs.

```sh
spin()
{
  while true
  do
    echo -n '\'; echo -en '\010'; sleep 0.2
    echo -n '|'; echo -en '\010'; sleep 0.2
    echo -n '/'; echo -en '\010'; sleep 0.2
    echo -n '-'; echo -en '\010'; sleep 0.2
  done
}
spin &
SPIN_PID=$!
# kill spinner on any signal including exit.
trap "kill -9 ${SPIN_PID}" $(seq 0 15)

sleep 2s # long running work
```

# Linux CLI tools

[Rosetta Stone for UNIX](https://bhami.com/rosetta.html)

```sh
# search the manpages short desciptions for 'net-tools' (apropos)
man -k net-tools
# show one-line manual page descriptions matching 'hostname' (whatis)
man -f hostname
# show search paths for manual pages
manpath

# print date at a specific time zone
TZ='America/Los_Angeles' date +%T
TZ='Etc/GMT0' date +%T
tree /usr/share/zoneinfo/ # show paths valid for TZ
# print seconds since the Epoch (1970-01-01 00:00 UTC) for a specific date
date --date "2022-10-25 00:00:00" +%s
# print now with a format
date +%Y-%m-%d-%T
date --rfc-3339=ns
# print date with offset
date +%T --date='-1 h'
# different options on BSD and macos
date -j -v-1H "+%Y-%m-%d %T"
# convert seconds since Epoch into date string
NOW="$(date +%s)"
date --date "@${NOW}" +%T

# convert numbers from strings
numfmt --from=iec-i 1Ki

# show calendar
cal

# print in columns
echo -en '1\t\t2\t3' | column -t -N "Col1,Col2,Col3"

# time a process
time sleep 5ms
# time a process with date
BEGIN="$(date +%s)"
sleep 2s
END="$(date +%s)"
echo $((${END} - ${BEGIN}))

# timeout a command
timeout 3s sleep 4s # wait at most 3 seconds
[ $? -eq 124 ] && echo 'Timed out'

# show diff side by side
diff --side-by-side --ignore-all-space file1.txt file2.txt
```

```sh
# print filetype of a file with extension
xdg-mime query filetype text.txt
# print the .desktop file of the default application for a filetype
xdg-mime query default text/plain
# set the default .desktop file for a filetype
xdg-mime default code.desktop text/plain
# open a file with default desktop application
xdg-open text.txt
```

## runs jobs in parallel

```sh
# 
sudo dnf install parallel
parallel 

```

## System information

```sh
cat /etc/os-release
uname --all
uname --kernel-release --kernel-version
uname --nodename; hostname
# list initramfs/initrd images
ls -lrt /boot/initramfs*

# system uptime
uptime --pretty

man 5 proc
cat /proc/$$/status  # human-readable /proc/PID/stat and /proc/PID/statm

# show memory usage
top -o +%MEM
free --human
cat /proc/meminfo
cat /proc/${PID}/status | awk '$1 == "VmRSS:" || $1 == "VmHWM:"'
vmstat --unit M  # processes, memory, paging, block IO, traps, disks and cpu statistics
vmstat 4 5  # 4 sec intervals, 5 intervals
vmstat --stats
# show CPU usage
top -o +%CPU
# display IO device and CPU statistics (install sysstat)
iostat --human
iostat -p nvme0n1 # show device statistics

# report file system space usage
df --human-readable --o # print with all output fields
# output selected fields and remove header
df -h --output=source,fstype,itotal,iused,iavail,ipcent,size,used,avail,pcent,file,target \
  | tail --lines=+2
# show only selected file system types, sorted by available size (outputs header separately)
df --type=ext4 --type=vfat --type=btrfs -h --output=target,avail,pcent,size \
  | { read -r HEADER; echo "${HEADER}" ; sort --human-numeric-sort --key=2,2 --reverse ; }
# report file systems where files are -- in SI powers of 1000
df --si --human-readable --print-type /path/to/file1 /path/to/file2

findmnt # show mounted file systems with options
lsblk --output-all
# list block devices
lsblk --fs --paths
lsblk -o NAME,MOUNTPOINTS,FSTYPE,LABEL,FSAVAIL,FSUSE%,UUID --paths

# PCI devices numbers and names
lspci -nnk
```

### `top`

```sh
top -O # list fields
# mebibytes, sorted by memory, non-root
top -E m -e m -o %MEM -U '!0'
```

Interactive commands:

- `h`: show help.
- `f`: set shown fields.
- `W`: write out `toprc` file (path to file is displayed; e.g. `~/.config/procps/toprc`).
- `e`: cycle task memory scale.
- `E`: cycle summary memory scale.
- `c`: toggle between command-line and program name for the `COMMAND` field.
- `x`: toggle highlight of sorted field.
- `z`: toggle colors.
- `Z`: set colors.
- `i`: toggle display of idle processes (0 % CPU since last refresh).

### `journalctl`

```sh
man 7 systemd.journal-fields

systemctl status --type=service
systemctl --all list-unit-files

# check for errors in dracut services logs
journalctl --since today --unit 'dracut*' --grep 'fatal|error|fail'

journalctl --follow --unit NetworkManager.service

journalctl --no-pager --since today --grep 'fail|error|fatal'

journalctl --user-unit=container-CONTAINER_NAME.service

# count error logs per executable
journalctl --no-pager --since today --priority=err --output json \
  | jq '._EXE' \
  | sort \
  | uniq -c \
  | sort --numeric --reverse --key='1,1'
  # syslog log levels:
  # 0=emerg, 1=alert, 2=crit, 3=err, 4=warning, 5=notice, 6=info, 7=debug

# log lines with explanation texts from the message catalog.
journalctl --catalog --pager-end --unit=firewalld

# send journal logs
python3 -c 'from systemd import journal; journal.send("foo\nbar")'
journalctl -n1 -o export
```

### `ps` process information

```sh
PID=$(pidof -s bash) # single pid
PIDS=$(pidof firefox) # one or more pid

# process selection
ps -x  # list all processs owned by own effective UID
ps -ax # list all processes
ps -A  # list all processes
ps -e  # list all processes
ps -A r # list all running processes
ps -A --deselect r # list all non-running processes
ps -C bash # select PID by command; NOTE: commands were max. 15 characters in older versions
ps --pid ${PIDS}  # select by PID
ps --ppid ${PIDS} # select by parent PID
ps --user $(id -u)  # select by effective UID
ps --User $(id -ur)  # select by real UID
ps --group $(id -g)  # select by effective GID
ps --Group $(id -gr) # select by real GID
ps --tty $(tty) # select by tty
# inverse the selection
ps --deselect --user 0 --user 1000
ps --deselect -d # select only session leaders

# output formats
ps -C bash -o pid --no-header # get PID of command
ps --pid ${PID} e -w -w -o args # show environment with unlimited width
ps c --forest # show true command with process trees
ps --context # show SELinux context
ps -f # full-format listing.
ps -F # extra full-format listing.
ps -f k +uid,-ppid,+pid # sort by columns
ps -f --sort user,-ppid,+pid # sort by columns (GNU)
ps -f n # output numeric UID and GID
ps -Z # add SELinux column
ps u # user-oriented format
ps s # signal format
ps v # virtual memory format
ps X # register format
ps --format pid,ppid,args # user-defined column format; short option -o
ps L # list all column format specifiers
ps -o pid,format,state,tname,time,command
ps -o pid,format,tname,time,cmd
ps -o pid,ruser=RealUser -o comm=Command # rename header columns
ps -o pid= -o comm= # remove header of columns
ps -o '%p %y %x %c' # AIX format specifiers
ps -T  # show threads with SPID (thread ID)
ps S --forest # sum resource information of process and its forked children
```

Some format specifiers:

| Header | Normal        | AIX code | Description |
|:-------|:-----------|:----|:------------------------|
| `PID`     | `pid`         | `%p` | process ID |
| `PPID`    | `ppid`        | `%P` | process parent ID |
| `PGID`    | `pgid`/`pgrp` | `%r` | process group ID |
| `S`       | `s`/`state`   |      | process state code, one character |
| `STAT`    | `stat`        |      | process state code, multiple characters |
| `COMMAND` | `command`/`cmd`/`args` | `%a` | command with all its arguments |
| `COMMAND` | `comm`        | `%c` | executable name |
| `EXE`     | `exe`         |      | path to the executable |
| `TIME`    | `time`/`cputime` | `%x` | CPU time in `"[DD-]HH:MM:SS"` format |
| `TIME`    | `cputimes`    |      |  CPU time in seconds |
| `ELAPSED` | `etime`       | `%t` | elapsed time since process start in `[[DD-]hh:]mm:ss` format |
| `ELAPSED` | `etimes`      |      | elapsed time since process start in seconds |
| `STARTED` | `start`/`lstart` |      | time the command started |
| `%CPU`    | `pcpu`/`%cpu` | `%C` | cputime over realtime ratio in "`##.#`" format (percent) |
| `C`       | `c`           |      | cputime over realtime ratio in "`##`" format (percent) |
| `CP`      | `cp`          |      | 1/10 of cputime over realtime ratio (per-mille) |
| `%MEM`    | `pmem`/`%mem` |      | resident set size (rss)/physical memory in percentage |
| `RSS`     | `rss`/`rssize` |      | resident set size; the non-swapped physical memory used in KB |
| `SZ`      | `sz`          |      | physical pages of the core image, including text, data, and stack space |
| `VSZ`     | `vsz`         | `%z` | virtual memory size in KiB |
| `SIZE`    | `size`        |      | virtual size of the process (code+data+stack) and approximate swap space required |
| `DRS`     | `drs`         |      | data resident set size, the physical memory not for executable code |
| `MINFLT`  | `min_flt`     |      | minor page faults that have occurred |
| `MAJFLT`  | `maj_flt`     |      | major page faults that have occurred |
| `GROUP`   | `group`/`egroup` | `%G` | (effective) group name |
| `USER`    | `user`/`uname`/`euser` | `%U` | (effective) user name |
| `UID`     | `uid`         |      | (effective) user ID |
| `GID`     | `gid`         |      | (effective) group ID |
| `RGROUP`  | `rgroup`      | `%g` | real group name |
| `RUSER`   | `ruser`       | `%u` | real user ID |
| `LUID`    | `luid`        |      | login ID |
| `NI`      | `nice`/`ni`   | `%n` | nice value, from 19 (nicest) to -20 |
| `TT`      | `tt`/`tty`    | `%y` | controlling tty (terminal); alt. `tname` |
| `NLWP`    | `nlwp`        |      | number of threads |
| `UNIT`    | `unit`        |      | systemd unit process belongs to |
| `UUNIT`   | `uunit`       |      | systemd user unit process belongs to |
| `LABEL`   | `label`       |      | SELinux security label |
| `CGROUP`  | `cgroup`      |      | control groups |
| `IPCNS`   | `ipcns`       |      | inode number of IPC namespace |
| `NETNS`   | `netns`       |      | inode number of network namespace |
| `MNTNS`   | `mntns`       |      | inode number of mount namespace |
| `PIDNS`   | `pidns`       |      | inode number of process namespace |
| `USERNS`  | `userns`      |      | inode number of user namespace |
| `UTSNS`   | `utsns`       |      | inode number of hostname namespace |

Process state codes (used in `STAT` and `S` column values):

| State | Description         |
|:-----:|:--------------------|
| `D`   | uninterruptible sleep (usually IO) |
| `I`   | Idle kernel thread |
| `R`   | running or runnable (on run queue) |
| `S`   | interruptible sleep (waiting for an event to complete) |
| `T`   | stopped by job control signal |
| `t`   | stopped by debugger during the tracing |
| `W`   | paging (not valid since the 2.6.xx kernel) |
| `X`   | dead (should never be seen) |
| `Z`   | defunct ("zombie") process, terminated but not reaped by its parent |
| `<`   | (BSD) high-priority (not nice to other users) |
| `N`   | (BSD) low-priority (nice to other users) |
| `L`   | (BSD) has pages locked into memory (for real-time and custom IO) |
| `s`   | (BSD) is a session leader |
| `l`   | (BSD) is multi-threaded (using CLONE_THREAD, like NPTL pthreads do) |
| `+`   | (BSD) is in the foreground process group |

```sh
# get PID of a command
PID="$(ps -C ${CMD} -o pid --no-header | tr -dc '[:digit:]')"

# send SIGTERM
kill -TERM ${PID}
kill -s TERM ${PID}
kill -n 15 ${PID}
# show a list of signals
kill -l
```

## Archives and backups

```sh
# backup files
rsync -av ${HOME}/Downloads /run/media/backup/
  # -a is -rlptgoD
  # recursive; preserve symlinks; set same permissions, time, group, owner; recreate device files

# delete files older than 7 days
find /backups/* -mtime +7 -delete
```

Archiving with `tar`:

```sh
# create file.tar from files in 'path/', exclude tar files, follow symlinks, don't descend into directories
tar -c -f file.tar -C path --exclude=*.tar* -h --no-recursion ./*
# list files in archive
tar -tf file.tar

# extract and use archive suffix to determine the compression program
tar -xaf file.tar.gz
# determine file type
file unknownfile
# suffixes:
  # bzip2:    .tar.bz2
  # xz:       .tar.xz
  # lzip      .tar.lz
  # lzma      .tar.lzma
  # lzop:     .tar.lzo
  # gzip:     .tar.gz
  # compress: .tar.Z
  # zstd:     .tar.zst

# create a dated backup archive
tar -zcf backup-$(date +%Y%m%d).tar.gz -C /path/to/files FILE...
```

```sh
# extract 7-Zip
sudo dnf install p7zip
7za x file.7z -ooutput_dir
# extract and untar
7za x -so directory.tar.7z | tar xf -
# extract RAR
sudo dnf install unrar
unrar x -ppassword file.rar output_dir/
```

```sh
# view members
ar tv package.deb
# extract MEMBER
ar x package.deb MEMBER
# extract member to stdout
ar p package.deb MEMBER > MEMBER

# change MEMBER...

cp package.deb package-modified.deb
# insert member with replacement (owner becomes current user)
ar r package-modified.deb MEMBER
```

## crontab

[https://crontab.guru](https://crontab.guru)

```sh
sudo dnf install cronie
crontab -l # display crontab
crontab -e # edit cron table
crontab -ri # remove cron table, with prompt
sudo crontab -e -u username # edit for other user
cat /etc/crontab

# restrict use of crontab tool
echo username1 | sudo tee --append /etc/cron.allow
echo username2 | sudo tee --append /etc/cron.deny
```

Schedule format: `m h d M D command`. Month (`M`) is 1-12. Numerical day-of-week (`D`) is 0-6 with sunday as 0.

- `*`: any value.
- `x-y`: inclusive range.
- `x,y,z`: list of expressions.
- `*/x`: interval of x.

Example schedules:

- Daily at 8:15 and 20:15: `15 8,20 * * *`
- Weekdays every half hour between 9-17: `*/30 9-17 * * 1-5`
- Every 1st of january: `0 0 1 1 *`

Day-of-month and day-of-week only only intersected if using `*/x`, otherwise a union used. I.e. `0 0 1 * 1` runs on the 1st of every month as well as on every monday, while `0 0 */20 * 1` runs every 20th day only if it's a monday.

## moreutils

- `chronic`: runs a command quietly, unless it fails.
- `combine`: combine the lines in two files using boolean operations.
- `errno`: look up errno names and descriptions.
- `ifdata`: get network interface info without parsing ifconfig output.
- `ifne`: run a program if the standard input is not empty.
- `isutf8`: check if a file or standard input is utf-8.
- `lckdo`: execute a program with a lock held.
- `mispipe`: pipe two commands, returning the exit status of the first.
- `parallel`: run multiple jobs at once (contained in moreutils-parallel sub package).
- `pee`: tee standard input to pipes.
- `sponge`: soak up standard input and write to a file.
- `ts`: timestamp standard input.
- `vidir`: edit a directory in your text editor.
- `vipe`: insert a text editor into a pipe.
- `zrun`: automatically uncompress arguments to command.

```sh
sudo dnf install moreutils
```

## File management

```sh
# rename multiple files
rename --no-act --verbose -- STRING REPLACEMENT ./*  # dry run
rename --no-overwrite --verbose -- STRING REPLACEMENT ./*

# show directory sizes
du --summarize --human-readable /path/to/dir
du -hs ./* | sort --human-numeric-sort --key=1,1
```

### `stat`

`stat` shows file metadata in formatted output.

```sh
# access bits, access bits octal, owner user, owner group, bytes size, name, type
stat --format='%A (%a) %U:%g %s %n %F' file
# show mount point
stat --format='%m' file
# file system
stat --format='%T' --file-system file
# show SELinux context
stat --format='%n %C' file
# show update times
stat --printf='Birth:    %w \nAccess:   %x\nModified: %y\nStatus:   %z\n' file
```

### Links

```sh
# create hard link to associate another file name with the same inode
ln file1 file2
ls -i file1 file2
stat file1 file2
rm file1 # file2 remains with inode

# create a symbolic link
ln --symbolic target link
stat target link
```

```sh
ln -s script.sh s
basename "$(readlink -f s)" # script.sh
```

```sh
# link libraries so that name aliases soname when build-linking,
# and soname aliases versioned library when run-linking
ln -s --force lib${NAME}.so.${VERSION} lib${NAME}.so.${SONAME}   # file <- SONAME
ln -s --force lib${NAME}.so.${SONAME} lib${NAME}.so              # SONAME <- NAME
```

### Vim

Useful Vim controls:

```default
'.      " return cursor to last edit
ctrl+o  " move to previous jump position
ctrl+i  " move to next jump position
mX      " set global mark X (using uppercase makes it global)
'X      " go to global mark X (at start of line)
`X      " go to global mark X (at exact cursor position)
:marks  " show marks
ctrl+d  " half-page down
ctrl+u  " half-page up
zz      " center cursor in window
ctrl+e  " scroll down without moving cursor (though it sticks to top)
ctrl+y  " scroll down without moving cursor (though it sticks to bottom)
10|     " move to 10th column

"+P        " paste from system clipboard (use * instead of + for PRIMARY selection)
"+yy       " copy line to system clipboard
:'<,'>"+y  " copy visual selection to system clipboard (or use "+y in visual mode)

" run external command on visual selection (replaces text with output)
:'<,'>!awk -f script.awk
:'<,'>!sort
:'<,'>!column -t -s ','
" run external command on entire file (replaces text with output)
:%!clang-format
:!stat %   " use current file name in command

:read FILE       " insert contents of FILE at cursor
:read !COMMAND   " insert output of COMMAND at cursor

:Lexplore             " open netrw in left pane
:vertical resize -10  " resize window
ctrl+w ctrl+w         " cycle window focus
ctrl+w l              " switch window focus right
ctrl+w h              " switch window focus left
ctrl+w 10>            " increase window width by 10 columns
ctrl+w -10>           " decrease window width by 10 columns
ctrl+w q              " quit window

fx  " go to next character `x` inclusive
tx  " go to next character `x` exclusive
;   " continue forwards to next character `x`
,   " go backwards to previous character `x`

:g/regex  " search and list results with line numbers (go to line n with :n)
ctrl+n  " iterate autocompletions in insert mode
```

In command line mode:

```default
ctrl+r "    " paste from default register
ctrl+r +    " paste from system clipboard
```

#### Indent/de-indent block:

```default
shift+v  " enter visual mode to select a block.
>        " to indent
<        " to de-indent
.        " to repeat
```

#### Re-order lines

```default
dd   " delete and yank each line in the desired final order.
"1P  " paste above from register 1.
.    " repeat while updating register 1 to the next register.

:display " show registers
```

```default
ddkP  " move line up
ddP   " move line down
J     " join line with next line
yyp   " duplicate line

,+10 move +20  " move line from current line + 10 to 20 lines down

J         " join line from below with space separator
r<Enter>  " replace character at cursor with newline
```

#### Insert at multiple lines

```default
ctrl+v  " to enter column visual mode
d       " to delete selection
I       " to insert before selection
A       " to insert after selection
Escape  " to exit visual mode
```

#### Search and replace all matches

```default
" search and replace all (c for confirm)
:%s/PATTERN/REPLACEMENT/gc
```

```default
/search term\c  " search case-insensitive
/search term\C  " search case-sensitive
cgn             " replace to end of search term highlight
n               " next match
.               " repeat the replace action
:noh            " un-highlight search terms
```

```default
" search in selection
/\%Vsearch term
```

#### `${HOME}/.vimrc`

```default
" show current setting value
:set SETTING?

:source ~/.vimrc  " source vimrc file
```

```default
set exrc      " also source .vimrc in current folder
set mouse=    " disable mouse
set list      " show listchars for tabs, trailing, nbsp
set listchars=tab:>>,trail:-,nbsp:+  " characters to show for non-printables
set number relativenumber  " hybrid line numbers (i.e. relative with current line as absolute)
set ignorecase smartcase   " search case-insensitive except when any character is uppercase

set tabstop=4 softtabstop=4 shiftwidth=4 expandtab smarttab  " use spaces instead of tabs
set autoindent         " indent new line as previous line
set formatoptions-=t   " don't auto-wrap text
set formatoptions-=c   " don't auto-wrap comments
set formatoptions-=r   " don't automatically insert comment leader on Enter
set fileencodings=utf-8,latin1  " default file encodings
set scrolloff=999      " keep cursor in the middle of the screen

let g:netrw_banner = 0          " disable banner (toggle with I)
let g:netrw_liststyle = 3       " display as tree
let g:netrw_browse_split = 0    " reuse window when opening files (4 is reuse)
let g:netrw_winsize = 20        " explorer window size percentage

" remap shift+tab to de-indent in insert mode
inoremap <S-Tab> <C-O><<

" auto-save files under home
augroup AUTOSAVE
    autocmd!
    autocmd TextChanged,InsertLeave,FocusLost ~/* if &readonly == 0 && filereadable(bufname('%')) | silent update | endif
augroup END

" remove autosave if environment variable is set
if $VIM_AUTOSAVE=="no"
    au! AUTOSAVE
endif

colorscheme slate
```

> NOTE: the `autocmd` events were not triggered when exiting insert mode with ctrl+c. To quickly exit insert mode, use Alt/Meta key plus a normal mode key (since the terminal sends an Escape first when using Alt/Meta+key).

Additional settings:

```default
" highlight matching parenthesis as bold without coloring
hi MatchParen ctermfg=NONE ctermbg=NONE cterm=bold

set syntax off     " turn off syntax highlighting
set cursorline     " highlight cursor line
set cursorcolumn   " highlight cursor column
set colorcolumn=80 " highlight column 80
set scrolloff=10   " screen lines kept above/below cursor (=999 to keep cursor in middle)

" set status line information
set statusline=%f%=%y\ %{&fileformat}\ %{&fileencoding==\"\"?&encoding:&fileencoding}\ \ L%l:C%c\

" key re-mappings
nnoremap <space> <nop>
let mapleader=" "
set timeoutlen=2000
nnoremap <leader>m :marks<CR>

" auto-complete parentheses
inoremap {<space> {}<left>
inoremap (<space> ()<left>
inoremap [<space> []<left>
inoremap "<space> ""<left>
inoremap '<space> ''<left>
" except when completing manually
inoremap {} {}
inoremap () ()
inoremap [] []
inoremap "" ""
" auto-add closing bracket after enter
inoremap {<CR> {<CR>}<up><CR>

startinsert  " start vim in insertmode (must be last in .vimrc)
```

### setuid/setgid

Add the `setgid` bit to directories so that files created inside it get its group permissions.

```sh
chmod 2775 /path/to/dir
chmod g+s /path/to/dir
```

## Text manipulation

```sh
# display line numbers on a file
cat -n file.txt
nl -ba file.txt
grep -n '^' file.txt
awk '{print NR " " $s}' file.txt

# display file contents in hexadecimal
hexdump -C file  # canonical format
hexdump -v -e '8/1 "%02x "' -e '" |"8/1 "%_p""|""\n"' file  # custom format
od --address-radix=d --format=cz --output-duplicates file
od --address-radix=x --format=x1z --output-duplicates file

# remove repeated whitespaces
echo 'Hello   foo     bar' | tr -s ' ' # Hello foo bar
# remove all whitespace
echo 'Hello   foo     bar' | tr -d ' ' # Hellofoobar
# replace complement of set
echo -n 'Hello/=?.;foo-_/%#"!bar1' | tr -c '[:lower:]' '_' # _ello_____foo_______bar_

# convert \r\n to \n
dos2unix file.txt
dos2unix --info=h *.txt # display file information
```

### Here document

```sh
TEXT=text

tee file <<EOF
Has variable substitution
  ${TEXT}
EOF

tee file <<'EOF'
No variable substituion
  ${TEXT}
EOF
```

Here string:

```sh
tee file <<<"
  ${TEXT}
"
# Single quote escape for variable substitution
tee file <<<'
  '${TEXT}'
'
```

### Multiple output

```sh
tee <file.txt &>/dev/null \
  >(wc --lines) \
  >(grep --count --invert-match '^$')
```

### `grep` regex

```sh
# search without regular expressions
grep --fixed-strings '?+{|()' files
# extended regex interprets ? + { | ( ) without \-escapes
grep --extended-regex '(.*)' files

# specify pattern with --regex option or from file if it begins with -
grep ---regex='-+' --file='file.regex' files

# count non-empty lines
grep --count --invert-match '^$' files

# search in all files except dotfiles/dotdirectories
grep --recursive --ignore-case \
  --exclude='.*' --exclude-dir='.*' \
  ${PATTERN} ./

# perl-compatible regular expressions
man 3 pcre2pattern
```

#### Capture groups

```sh
# non-capturing group
grep -E '(?:123|456)+' file
# backreference with \n
grep -E '\b(\w+)\W+[^\1]+\W+\1\b' file
```

#### Lookaround

```sh
echo ${PATH} | grep --perl-regexp --only-matching '(?<=^|:)[^:]+(?=:|$)'

# extract query parameter value from URL
echo 'https://example.com#abc=123&access_token=XXX&def=456' \
  | grep -Po '(?<=[?&]access_token=)[^&]+(?=&|$)'
```

| Lookaround | Description |
|:---------:|:---------:|
| `pattern(?=pattern)` | positive lookahead; only match if followed by pattern. |
| `pattern(?!pattern)` | negative lookahead; only match if not followed by pattern. |
| `(?<=pattern)pattern` | positive lookbehind; only match if preceded by pattern. |
| `(?<!pattern)pattern` | negative lookbehind; only match if not preceded by pattern. |

> Lookaround patterns must be fixed length; i.e. `*` and `+` and other variable length patterns aren't allowed.

### JSON processing

```sh
# URL-encode
echo -n 'a is b?' | jq --slurp --raw-input --raw-output '@uri'
# HTML-entity-encode
echo -n '&<>"' | jq -sRr @html
# tab-separated values
echo -n '[{"a":"1"},{"a":"2"}]' | jq --raw-output 'map(.a) | @tsv'

# merge two objects
jq -s '.[0] * .[1]' defaults.json overrides.json
```

### XML processing

```sh
xmllint --auto --encode UTF8 --output example.xml  # generate an XML file
xmllint --format --recover example.xml             # format an XML file
xmllint -xpath '/parent/child[1]' example.xml      # first <child>
xmllint -xpath '//*[@id="example"]' example.xml    # any node with attribute value
xmllint -xpath '/parent/child = "a" or /parent/child = "b"' example.xml  # first <child>
```

### `sed`

[https://www.gnu.org/software/sed/manual/sed.html](https://www.gnu.org/software/sed/manual/sed.html)

```sh
# delete comment lines
sed -i '/^#/d' file.txt
# delete non-comment lines
sed -i '/^#/!d' file.txt
# append newline if missing ($ matches EOF)
sed -i '$a\' file.txt
# print every fourth line starting at line 1 (first~step)
sed -n '1~3p' file.txt
# print lines 100-106
sed -n '100,+6p' file.txt
# transliterate letters to numbers
sed 'y/abcdefghij/0123456789/' file.txt
# add carriage return to end of line
sed -i 's/$/\r/' file.txt

# regex
sed -E -n '/^a+b$/p' <<<$'a\nb\naab\n' # aab
sed -E -n '/^[^[:space:]]+$/p' <<<$'\na\n \n\t\n\n' # a
# regex back-reference (print lines where uid=gid)
sed -E -n '/^\w+:x:(\w)+:\1/p' /etc/passwd

# exit 1 if a line starts with 'foo'
sed -n '/^foo/q1' file.txt
```

URL-encoder sed-script:

```sed
# encode.sed
s:%:%25:g
s: :%20:g
s:!:%21:g
s:#:%23:g
s:\$:%24:g
s:&:%26:g
s:':%27:g
s:(:%27:g
s:):%27:g
s:*:%2A:g
s:+:%2B:g
s:,:%2C:g
s:/:%2F:g
s^:^%3A^g
s:;:%3B:g
s:<:%3C:g
s:=:%3D:g
s:>:%3E:g
s:?:%3F:g
s:@:%40:g
s:\[:%5B:g
s:\\:%5C:g
s:]:%5D:g
s:\^:%5E:g
s:{:%7B:g
s:|:%7C:g
s:}:%7D:g
```

```sh
# URL-encode
VALUE='% !#$&()*+,/:;<=>?@[\]^{|}'
sed --file=encode.sed <<<"${VALUE}'"
```

### `find` and `xargs`

```sh
# grep on markdown files (runs: grep file1 file2 ...)
find notes/ -name '*.md' -type f -print0 \
  | xargs --verbose --null grep --fixed-strings --color 'ausearch'

# process files directly in starting point, but not the starting point itself
find . -mindepth 1 -maxdepth 1

# run find only on starting points (which are read from stdin)
ls --zero . | find -files0-from - -maxdepth 0 -regex 'PATTERN'

# skip directories lib and obj
find . '(' -path ./lib -o -path ./obj ')' -a -prune -o -print

# exit after finding a file (implicit -a)
find / -name needle -print -quit

# run make in each folder with a Makefile
find . \
  -name Makefile \
  -execdir make ';'
  # command exit code only affects find-expression; find exits with 0
  # use xargs to exit with error when a commands exits with error

# execute make processes in parallel
find . \
  -name Makefile \
  -printf '%h\0' \
  | xargs --null --max-arg=1 --max-procs=0 \
    make --directory

# exit on first error by returning 255 in command
find . \
  -name Makefile \
  -printf '%h\0' \
  | xargs --null -I '{}' \
    sh -c 'make --directory {} || exit 255'
  # parallel commands (using --max-procs) are waited for to terminate on error

# explain debug options
find -D help
# show diagnostics of exec
find -D exec . -type f -exec ls '{}' ';'

# find processes with a specific files open (LINK -> FILE \n USER TYPE ACCESS KB-SIZE CONTEXT)
sudo find /proc/*/fd/ -ilname '/path/*' -printf '%p -> %l\n  %u %y %a %k %Z\n'
```

## Random character generation

```sh
# shuffle substrings
shuf --repeat --head-count=3 wordlist.txt | tr '\n' '-' | sed 's/-$//' # in-super-monkey
shuf --repeat --head-count=12 --echo {A..Z} {a..z} {0..9} | tr -d '\n' # V1TSiM4QZrpS
shuf --repeat --head-count=12 --input-range=0-99 | tr '\n' ','         # 11,96,98,57,...

# replace entropy pool numbers with printable characters
head /dev/urandom | tr --delete --complement '[:graph:]' | head --bytes=12
head /dev/urandom | LC_ALL=C tr -dc '[:alnum:]!"#$%&'\''()*+,-./:;<=>?@[\]^_`{|}~' | head -c12

# generate a random number with C format specifications (diouxXfeEgGcs)
printf '%d\n' ${RANDOM}
printf '%#04x\n' $(( RANDOM % 256 ))  # 1 byte hexcode, e.g. 0x89

# generate 12 pseudo-random bytes in hexadecimal
openssl rand -hex 12

# generate UUID value
uuidgen
```

## Package managers

### `dnf`, `yum`, `rpm`

[https://dnf.readthedocs.io/en/latest/index.html](https://dnf.readthedocs.io/en/latest/index.html)

[DNF Configuration Reference](https://dnf.readthedocs.io/en/latest/conf_ref.html)

[RPM Fusion - Installing Free and Nonfree Repositories](https://rpmfusion.org/Configuration)

```sh
cat /etc/redhat-release
dnf upgrade --refresh

dnf repolist --all
dnf repolist --enabled --verbose

dnf group list
dnf group info 'Development Tools'
sudo dnf group install 'Development Tools'
sudo dnf group remove 'Development Tools'

dnf list --installed
dnf whatprovides /usr/bin/gzip
dnf list --upgrades [<package-file-spec>...]

dnf history --reverse # show command history
dnf history info
dnf history info 5
dnf history list # latest history ID
dnf history list 101 # specific history ID
dnf history list <package-spec>

dnf repoquery '*-devel'
dnf repoquery PACKAGE_NAME --list
dnf repoquery PACKAGE_NAME --requires

dnf repoquery --queryformat '[%{name}] "%{summary}".\n> %{description}' package
dnf repoquery 'PACKAGENAME' --qf '%{NAME} @%{REPONAME} \t "%{SUMMARY}"\n\tDescription: %{DESCRIPTION}\n\n'

dnf repoquery --userinstalled
```

`/etc/dnf/dnf.conf`:

```default
[main]
gpgcheck=1
installonly_limit=3
clean_requirements_on_remove=True
best=False
skip_if_unavailable=True
fastestmirror=True
max_parallel_downloads=10

cachedir=/dnfcache
install_weak_deps=False
tsflags=nodocs
```

Add package source:

```sh
sudo cat > /etc/yum.repos.d/vscode.repo <<<'
[code]
name=Visual Studio Code
baseurl=https://packages.microsoft.com/yumrepos/vscode
enabled=1
gpgcheck=1
gpgkey=https://packages.microsoft.com/keys/microsoft.asc'

sudo dnf install \
  https://mirrors.rpmfusion.org/free/fedora/rpmfusion-free-release-$(rpm -E %fedora).noarch.rpm +
  https://mirrors.rpmfusion.org/nonfree/fedora/rpmfusion-nonfree-release-$(rpm -E %fedora).noarch.rpm
```

```sh
CACHEDIR=$(mktemp -d --tmpdir=/tmp -t temp-XXXXXXXX) # default is /var/cache/dnf
dnf -y makecache --releasever=31 --setopt=cachedir=${CACHEDIR}
sudo chcon --reference /var/cache/dnf -R ${CACHEDIR}  # SELinux type=rpm_var_cache_t

# remake cache
dnf clean all --setopt=cachedir=${CACHEDIR}
dnf makecache --refresh --setopt=cachedir=${CACHEDIR}

# install with dependencies to temporary directory
INSTALLROOT=$(mktemp -d --tmpdir=/tmp -t temp-XXXXXXXX)
sudo dnf --installroot ${INSTALLROOT} \
  --disablerepo='*' --enablerepo=<repoid> \
  --releasever 31 \
  --setopt=cachedir=${CACHEDIR} \
  --cacheonly \
  --nodocs \
  --setopt=install_weak_deps=False \
  install httpd
```

```sh
rpm --install xmlstarlet-x.x.x-1.i386.rpm
rpm --erase xmlstarlet

rpm --query --list --package package.rpm
rpm --install --nodeps --noplugins --prefix=/path/to/dir/ package.rpm

# extract rpm contents
rpm2cpio php-5.1.4-1.esp1.x86_64.rpm | cpio -idmv
  # -i = extract
  # -d = make directories
  # -m = preserve modification time
  # -v = verbose

# rebuild corrupted database
sudo rpm --rebuilddb
```

```sh
yum --disablerepo='*' --enablerepo='rhel-7-server-rpms'
yum update
yum install -y httpd
yum remove httpd
yum groupinstall 'Development Tools'
yum install pcre pcre-devel zlib zlib-devel openssl openssl-devel
```

```sh
# show update information summary
yum updateinfo
yum updateinfo list --security
yum updateinfo RHSA-2018:1453
yum update --security
yum update --security --sec-severity=Critical,Important
yum update --advisory RHSA-2018:1318 # updates to latest version that contains fix
yum update-minimal --advisory RHSA-2018:1318 # updates to exact version that contains fix

yum updateinfo list --cve CVE-2018-1111
yum update --cve CVE-2018-1111
yum update-minimal --cve CVE-2018-1111
```

### `apt`, `apt-get`, `dpkg`

```sh
apt-get clean
apt-get update
apt-get -u upgrade --assume-no
apt-get upgrade
apt-get dist-upgrade

apt-get install build-essential
apt-get install libpcre3 libpcre3-dev zlib1g zlib1g-dev libssl-dev

apt-cache search 'search text'
apt-cache depends package # list package dependencies
apt-cache pkgnames
apt-cache show package

apt-get upgrade package2
apt-get remove package1
apt-get purge package2
apt-get --purge remove package2

# remove packages that were automatically installed
apt-get autoremove
apt-get --purge autoremove

# don't upgrade these packages without intervention
apt-mark hold package1 package2

cat /etc/apt/sources.list
cat /etc/apt/sources.list.d/*.list
sudo apt update # update sources

add-apt-repository ppa:certbot/certbot
```

```sh
dpkg -l # list installed
dpkg --info package
dpkg -L package # list package files of installed package
dpkg --contents file.deb # list package files of archive
dpkg -S /path/to/file # show which package provides a file

dpkg --install file.deb
dpkg --remove package
dpkg --purge package
```

```sh
# extract .deb package
ar x package.deb
dpkg -x package.deb /tmp
```

### `pacman`

```sh
sudo pacman -Syy # refresh
sudo pacman -Syu # update
sudo pacman -Rsn # remove
sudo packer -Ss  # search
```

# Windows CLI tools

[Everything you wanted to know about variable substitution in strings](https://learn.microsoft.com/en-us/powershell/scripting/learn/deep-dives/everything-about-string-substitutions?view=powershell-7.3)

```powershell
$values = @(
  "foo"
  "bar"
)
'Hello, {0} {1}.' -f $values # Hello, foo bar


# find and replace tokens
$templatelist = @{
  A = 'a'
  B = 'b'
  C = 'c'
}
$letter = Get-Content -Path file.txt -RAW
foreach( $token in $templatelist.GetEnumerator() )
{
  $pattern = '%{0}%' -f $token.key
  $letter = $letter -replace $pattern, $token.Value
}
```
