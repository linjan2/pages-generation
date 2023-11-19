<!----
--table-of-contents --number-sections
--variable homelink=true --variable includeHeader=true
--metadata=title:"Python"
--metadata=title-meta="python"
--metadata=subtitle:"Python cheat sheet and notes"
--metadata=description:'Python cheat sheet and notes'
-->
# Python notes

## Virtual environment

```py
# create python virtual environment
/usr/bin/python3.11 -m venv --prompt '3.11.3' /path/to/venv-3.11.3
# enter virtual environment
. /path/to/venv-3.11.3/bin/activate
echo ${VIRTUAL_ENV}  # path to venv
python -V
pip -V

# upgrade pip
pip install --upgrade pip
# list the active configuration (site in /path/to/venv-3.11.3/pip.conf)
pip config debug
pip config list -v
# configure virtual environment ("site")
pip config --site list
pip config --site get command.option
pip config --site set command.option value
pip config --site unset command.option

# exit virtual environment
deactivate
```

## Cheat sheet

```sh
# Start HTTP server on port 9000 and share the current directory
python -m http.server 9001
# in python2
python -m SimpleHTTPServer 9001
```

```py
help(print) # show help page on functions
help("ensurepip") # show help page on modules
dir() # print names in the current scope
dir(obj) # print module/object attributes
locals() # returns a dictionary containing the current scope's local variables
vars() # same as locals()
vars(obj) # obj.__dict__
type(obj) # return the type of object
isinstance(obj, class_or_tuple) # return whether an object is an instance or subclass of class
issubclass(cls, class_or_tuple) # return whether a type/class is an instance or subclass of class
```

```py
# shallow merge lists
l1 = [1,2]
l2 = [2,3]
print( [*l1, *l2] ) # [1, 2, 2, 3]

# splice first item to end of list
l = [1,2,3,4]
print( [*l[1:], l[0]] ) # [2, 3, 4, 1]

# shallow merge dictionaries
d1 = {'a':'A', 'b': 'B'}
d2 = {'b':'BBB'} # second dictionary overwrites 'b'
print( {**d1, **d2} ) # {'a': 'A', 'b': 'BBB'}

# shallow merge dictionaries since Python 3.9
print( d1 | d2 ) # {'a': 'A', 'b': 'BBB'}
```

```py
# multiple assignment
a, b = 1, 2
(a, b) = (1, 2)
a, = (0,1), # trailing comma makes single item tuple; a=(0,1)
[a] = [(0,1)] # instead of trailing comma; a=(0,1)
a,b, (x, y, z) = (-1,-2, (1, 2, 3))
a, b = [1, 2]
[a, b] = 1, 2
a, *rest = [1,2,3] # a=1, rest=[2,3]
a, b = "AB" # a='A'; b='B'
a, b, c = "A,B,C".split(',')
_, a, b = sys.argv
a,b = b,a # swap
```

```py
# avoid creating global variables
def main():
    x=1
# module name when invoked directly instead of imported
if __name__ == "__main__": main()
```

```py
t1 = type(True)
t2 = int
assert issubclass(t1, t2), f"{t1!r} is not subclass of {t2!r}"

obj = print
t3 = type(print)
assert isinstance(obj, t3), f"{obj!r} is not instance of {t3!r}"
```

### Keyword arguments

Function that takes any number of arguments and an optional keyword argument:

```py
def f(*mytuple, other=999):
    print(*mytuple, other) # unpack tuple into arguments

f(1,2, other=3)   # 1 2 3
f(1,2)            # 1 2 999
```

Function that requires keyword arguments for every parameter after `*`:

```py
def f(pos1, *, arg1, arg2):
    pass

f(1, arg1=2 ,arg2=3) # OK
f(1, 2 ,3) # TypeError: f() takes 1 positional argument but 3 were given
```

Function that takes any keyword as argument (received as a dictionary):

```py
def f(**kwargs):
    print( ", ".join(
        f"{key}: {value}" for key, value in kwargs.items()
    ) )

f(name="Bob", hat="Black") # name: Bob, hat: Black

# unpack dictionary into keyword arguments
args = { "name": "Alice", "hat": "grey" }
f(**args) # name: Alice, hat: grey
```

### Loops

```py
# iterate over numbers
for i in range(5): # range(stop)
    print(i, end=' ') # 0 1 2 3 4
for i in range(0, 5, 1): # range(start, stop[, step])
    print(i, end=' ') # 0 1 2 3 4

# enumerate index+value
for i,val in enumerate(['a','b']): # enumerate(iterable, start=0)
    print(i, val, sep=':', end=' ') # 0:a 1:b

# enumerate two iterables (ends at shortest)
for x,y in zip( [1,2],['1','2','3'] ):
    print(x, y, sep=':', end=' ') # 1:1 2:2

# dictionary comprehension
for k,v in {'a': 'A', 'b': 'B'}.items():
    print(k, v, sep=':', end=' ') # a:A b:B
```

### List comprehension / dictionary comprehension

The syntax, where `K` and `V` are expressions and `if conditional` is optional, is:

- `generator = ( V for v in iterable if conditional )`
- `new_list = [ V for v in iterable if conditional ]`
- `new_dict = { K: V for k,v in iterable if conditional }`

```py
# generator
for i in (n for n in [1,2,3] if n % 2 == 1):
    print(i, end=' ') # 1 3

# list comprehension
print( [ v*2 for v in [1,2,3] ] ) # [2, 4, 6]

# dictionary comprehension
d = {'a': 'A', 'b': 'B'}
new_dict = { k+'!':v+'!' for k,v in d.items() if v!='B'}
print(new_dict) # {'a!': 'A!'}
```

```py
if any(
    n == 3
    for n in [1,2,3]
  ):
  print("List contained 3")

if all(
    n < 10
    for n in [1,2,3]
  ):
  print("List contained only numbers less than 10")
```

### Lambda expressions

```py
for i in map(lambda v: v.encode(encoding="utf-32"), ["a", "A"]):
    print(i)  # b'\xff\xfe\x00\x00a\x00\x00\x00'
              # b'\xff\xfe\x00\x00A\x00\x00\x00'

for i in filter(lambda v: abs(v)==v, [-1, 0, 1]):
    print(i, end=' ') # 0 1
```

```py
# using operators module instead of lambdas
from operator import itemgetter,attrgetter,methodcaller
sorted_list = sorted( [[1,1],[0,0]], key=itemgetter(1) ) # get index or key
sorted_list = sorted( [{'a':2}, {'a':1}], key=attrgetter("a") ) # get property
sorted_list = sorted( ["Bob","Alice"], key=methodcaller("casefold") ) # call method
```

### Decorators

[https://peps.python.org/pep-0318/#examples](https://peps.python.org/pep-0318/#examples).

A function decorator overrides the decorated function. The decorator receives the function as an argument. The inner wrapper function uses `*args` to pack any positional arguments and `**kwargs` to pack any keyword arguments.

Decorate the inner wrapper function with `@functools.wraps` to assign attributes (like `__name__` and `__doc__`) from the wrapped function.

```py
import functools

def dummy_decorator(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        return func(*args, **kwargs)
    return wrapper

@dummy_decorator
def f(): pass # f = dummy_decorator(f)
```

A decorator with parameters is called with the arguments and it should return an outer wrapper function. The returned outer wrapper is then called with the decorated function. The returned inner wrapper function overwrites the decorated function.

```py
import functools

def dummy_decorator(a=1):
    def wrapper_outer(func):
        @functools.wraps(func)
        def wrapper(*args, **kwargs):
            return func(*args, **kwargs)
        return wrapper
    return wrapper_outer

@dummy_decorator(a=5)
def g(): pass # g = (dummy_decorator(a))(g)
```

Alternatively, use [partial](https://docs.python.org/3/library/functools.html#functools.partial) to return itself with different arguments. When the decorator is called the second time it will be passed the decorated function along with the additional arguments given to `partial`.

```py
def dummy_decorator(func=None, *, a=1):
    # func will be None when decorator is used with arguments.
    if func is None:
        # return a function that wraps this function with additional arguments.
        # when dummy_decorator is called the second time, func will be the decorated function.
        return functools.partial(dummy_decorator, a=a)

    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        print(func.__name__, f"a={a}")
        return func(*args, **kwargs)
    return wrapper

@dummy_decorator
def f(): pass
f() # f a=1
@dummy_decorator(a=5)
def g(): pass
g() # g a=5
```

Any function that accepts a function argument can be used as a decorator. It should return a function to overwrite the decorated one, but it isn't required.

```py
d = dict()

def register(func):
    d[func.__name__] = func
    return func # if not returned here, the function becomes None

@register
def f(arg):
    print(f"Hello, {arg}")

d["f"]("World") # call f
```

```py
import atexit
# atexit.register returns the function itself after registering as exit handler.
# arguments can't be passed with this decorator.
@atexit.register
def f():
    print("atexit")
f() # still callable; also runs at exit
```

### Cache decorator

Cache decorator stores values from previous function calls. `@cache` memoizes all calls (same as `lru_cache(maxsize=None)`). `@lru_cache` stores only the least recently used up to a maximum size.

```py
from functools import cache, lru_cache

# @cache
@lru_cache(maxsize=5)
def fib(n):
    if n <= 1:
        return n
    return fib(n-1) + fib(n-2)

for i in range(400):
    print(i, fib(i))
print("done")
```

### Debug decorator

```py
import sys
import functools

def debug(func):
    @functools.wraps(func)
    def wrapper(*args, **kwargs):
        try:
            print(f"{ func.__name__ }({ args }, { kwargs.items() })", file=sys.stderr)
            value = func(*args, **kwargs)
            print(f"{ func.__name__ } returned { value }", file=sys.stderr)
            return value
        except Exception as e:
            print(f"Exception in {func.__name__}: {e}", file=sys.stderr)
            raise
    return wrapper

@debug
def f(*args, **kwargs):
    raise Exception('a', 'b')
f(1,2,3, x=5)
```

### Stateful class decorator

Use `functools.update_wrapper` to update the `__call__` method as a wrapper that looks like the decorated function.

```py
import functools

class C:
    def __init__(self, func):
        functools.update_wrapper(self, func)
        self.func = func
        self.counter = 0

    # the wrapper around the decorated function
    def __call__(self, *args, **kwargs):
        self.counter += 1
        print(f"{self.counter}")
        return self.func(*args, **kwargs)

@C
def f(): pass
f() # 1
f() # 2

```

## Pip

Search packages at [https://pypi.org/](https://pypi.org/).

```sh
# configure repository "python.repo"
pip config set global.trusted-host python.repo
pip config set global.index https://python.repo/repository/a/b
pip config set global.index-url https://python.repo/repository/a/b

# temporarily override configuration
pip install requests --config-settings 
```

```sh
pip list # list installed packages
pip list --not-required # list installed packages that aren't dependencies
pip list --outdated
pip show --files PACKAGE # list files of package

pip install requests==2.28.2 # install specific version (with dependencies)
pip show requests
# install with requirements
cat <<<'requests==2.28.2' > requirements.txt
pip install --requirement requirements.txt
# install with constraints
cat <<<'urllib3>=1.26.0' > constraints.txt
pip install --constraint constraints.txt requests

pip check # verify installed packages have compatible dependencies

# output requirements file to stdout containing currently installed packages
pip freeze requests
pip freeze --all

pip uninstall PACKAGE # uninstall package (not its dependencies)
pip uninstall --requirement <(pip freeze PACKAGE) # shallow uninstall of package
pip install pip-autoremove
pip-autoremove --list # list unused dependencies
pip-autoremove --leaves # list packages not used by other packages
pip-autoremove PACKAGE # uninstall package and its dependencies

pip install /path/to/files # install from local path
pip install -e /path/to/files # install from local path as editable
pip install ./downloads/SomeProject-1.0.4.tar.gz
pip install -e 'git+ssh://git.repo/some_pkg.git@master' # specify ref after @
pip install -e 'git+https://git.repo/some_pkg.git#egg=project_name&subdirectory=pkg_dir'
pip install -e 'git+file:///home/user/projects/MyProject'
pip install --index-url http://my.package.repo/simple/ SomeProject
```

Use `pip download` to download packages for other systems. [pip.pypa.io/en/latest/cli/pip_download/](https://pip.pypa.io/en/latest/cli/pip_download/).

## Delegate to Python 2 or 3 module implementations

Module file structure:

```default
mymodule/
├── A.py
├── __init__.py
├── py2/
│   ├── A.py
│   └── __init__.py
└── py3/
    ├── a.py
    └── __init__.py
```

```sh
# runs different implementations depending on Python version
python2 -c 'from mymodule import A; print(A.f())'  # prints: py2 f
python3 -c 'from mymodule import A; print(A.f())'  # prints: py3 f
```

```py
# File: mymodule/__init__.py
__all__ = ["A"]
```

```py
# File: mymodule/A.py
import sys
if sys.version_info >= (3,):
    from .py3.a import f as f
else:
    from .py2.A import f as f
```

```py
# File: mymodule/py2/A.py
def f():
    return "py2 f"
```

```py
# File: mymodule/py3/a.py
def f():
    return "py3 f"
```

## JSON/YAML pretty print

Create a file `yamljson.py` in `$PATH` with the following code.

```py
#!/usr/bin/python
import sys
import os
import yaml
import json

# get name of invoking command
cmd = os.path.basename(sys.argv[0])

# convert from stdin based on invoking command
if cmd=="jy":
    yaml.safe_dump(json.load(sys.stdin), stream=sys.stdout, indent=2)
elif cmd=="yj":
    json.dump(yaml.safe_load(sys.stdin), fp=sys.stdout, indent=2)
elif cmd=="yy":
    yaml.safe_dump(yaml.safe_load(sys.stdin), stream=sys.stdout, indent=2)
elif cmd=="jj":
    json.dump(json.load(sys.stdin), fp=sys.stdout, indent=2)
else:
    print("ERROR: invoked as '", cmd, "'")
    print("FIX: ln -s jy|yj|yy|jj " + cmd)
```

Create symbolic links in the same directory to match the conditions on the value in `argv[0]`.

```sh
ln -s yamljson.py yj # converts YAML to pretty JSON
ln -s yamljson.py jy # converts JSON to pretty YAML
ln -s yamljson.py yy # converts YAML to pretty YAML
ln -s yamljson.py jj # converts JSON To pretty JSON

# usage (JSON to YAML)
echo '{"abc": true}' | jy
```

## String formatting

Conversions:

- `!r` converts with `repr(object)` which creates a printable representation.
- `!s` converts with `str(object)` which creates a string version of object.
- `!a` converts with `ascii(object)` which create a printable representation with escaped non-ASCII characters.

### String interpolation (f-strings)

```py
first = "Hello"
second = "World"
f"{first}, {second}" # Hello, World
```

```py
# print as key value
f"{first=}, {second = }" # first='Hello', second = 'World'

# call __format__() on argument
f"{1.0/3.0:.2f}" # 0.33
f"{datetime.datetime.utcnow():%Y-%m-%d}" # 2023-02-08
```

### Template strings

[https://docs.python.org/3/library/string.html#template-strings](https://docs.python.org/3/library/string.html#template-strings)

```py
from string import Template
template = "$first, $second"
Template(template).substitute( first="Hello", second="World")
```

### `str.format`

[https://docs.python.org/3/library/string.html#formatstrings](https://docs.python.org/3/library/string.html#formatstrings).

```py
"Hello, {}".format("World")
"{first}, {second}".format(first="Hello", second="World")
```


### `printf`-style

[https://docs.python.org/3/library/stdtypes.html?highlight=sprintf#printf-style-string-formatting](https://docs.python.org/3/library/stdtypes.html?highlight=sprintf#printf-style-string-formatting).

Syntax is `format % values`, where `format` contains `%(KEY)type-specifier` and `values` is a dictionary with matching key names.

```py
"%(first)s, %(second)s" % {"first": "Hello", "second": "World"}
```

## Performance counter

```py
import time

def do_work():
    time.sleep(1.0)

start = time.perf_counter()
do_work()
end = time.perf_counter()
delta = end - start

print( f"{do_work.__name__!r} took {delta:.4f} seconds" )
```

```py
import cProfile
import pstats

with cProfile.Profile() as pr:
    do_work()

stats = pstats.Stats(pr)
stats.sort_stats(pstats.SortKey.TIME)
stats.print_stats()
stats.dump_stats(filename="stats.prof")
```
