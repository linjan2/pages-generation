
.PHONY: default clean

MINIFY := minify/run.sh
ROLLUP := rollup/run.sh

OUTPUT_DIR ?= pages

TARGETS := $(patsubst src/%.md,$(OUTPUT_DIR)/%.html,$(wildcard src/*.md))
TARGETS += $(patsubst src/css/%.css,$(OUTPUT_DIR)/%.css,$(wildcard src/css/*.css))

# avoid deleting intermediate non-minified HTML files
#.NOTINTERMEDIATE: $(patsubst src/%.md,html/%.html,$(wildcard src/*.md))

default: $(TARGETS)

PANDOC_OPTIONS := '/^<!----/ , /-->/ {sub("<!----$$","",$$1); sub("-->","",$$NF); print}'

html/%.html: src/%.md .pandoc/defaults.yaml
	pandoc "$<" --output "$@" --defaults .pandoc/defaults.yaml $(shell awk $(PANDOC_OPTIONS) "$<")

$(OUTPUT_DIR)/%.html: html/%.html
	$(MINIFY) "$<" > "$@"

$(OUTPUT_DIR)/%.css: src/css/%.css
	$(MINIFY) "$<" > "$@"


$(TARGETS): $(wildcard .pandoc/templates/*) .pandoc/custom.theme


# ---

clean:
	@rm --verbose --recursive $(TARGETS)

