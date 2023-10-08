
.PHONY: default clean

MINIFY := minify/run.sh
ROLLUP := rollup/run.sh

OUTPUT_DIR ?= pages

TARGETS := $(patsubst src/%.md,$(OUTPUT_DIR)/%.html,$(wildcard src/*.md))
TARGETS += $(patsubst src/css/%.css,$(OUTPUT_DIR)/%.css,$(wildcard src/css/*.css))

# avoid deleting intermediate non-minified HTML files
#.NOTINTERMEDIATE: $(patsubst src/%.md,html/%.html,$(wildcard src/*.md))

default: $(TARGETS)

PANDOC_OPTIONS := '/^<!--/ , /-->$$/ {sub("<!--","",$$1); sub("-->","",$$NF); print}'

html/%.html: src/%.md .pandoc/defaults.yaml
	pandoc "$<" --output "$@" --defaults .pandoc/defaults.yaml $(shell awk $(PANDOC_OPTIONS) "$<")

$(OUTPUT_DIR)/%.html: html/%.html
	$(MINIFY) "$<" > "$@"

$(OUTPUT_DIR)/%.css: src/css/%.css
	$(MINIFY) "$<" > "$@"



$(OUTPUT_DIR)/%/index.js: src/apps/%/
	@mkdir -p $(dir $@)
	$(ROLLUP) $(wildcard $(dir $<)*) > "$@"


clean:
	@rm --verbose --recursive --force $(OUTPUT_DIR)/*.{html,js,css}
	@rm --verbose --recursive --force $(OUTPUT_DIR)/*/*.js


# ---

$(TARGETS): $(wildcard .pandoc/templates/*)
$(OUTPUT_DIR)/index.html: $(OUTPUT_DIR)/index/index.js src/html/index-head.html src/html/index-after.html

